import axios from "axios";

const readPath = "/private/file/read";
type Policy = {
	enabled: boolean;
	host?: string;
	store?: string;
	expiresAt: number;
	readPath: string;
};

let policy: Policy | undefined;
let activeToken = "";
let pending: Promise<void> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let apiBase = "";
let generation = 0;
let clearing: Promise<void> | undefined;
const originals = new Map<string, string>();
let retryAfter = 0;
let failedToken = "";

function validKey(key: string) {
	return (
		key.length <= 1024 &&
		/^uploads\/[0-9]{8}\//.test(key) &&
		!/[\\%?#\x00-\x1f\x7f]/.test(key) &&
		key.split("/").every((segment) => segment && segment !== "." && segment !== "..")
	);
}

function encodedKey(key: string) {
	return encodeURIComponent(key).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`);
}

function convertUrl(value: string, restore: boolean): string {
	if (restore) {
		const original = originals.get(value);
		if (original) return original;
		if (!/^(?:\/[A-Za-z0-9_-]+)*\/private\/file\/read\?/.test(value)) return value;
		const prefix = `${apiBase}${readPath}?store=${policy?.store}&key=`;
		if (policy?.enabled && policy.host && policy.store && value.startsWith(prefix)) {
			try {
				const key = decodeURIComponent(value.slice(prefix.length));
				if (validKey(key) && value === prefix + encodedKey(key))
					return `https://${policy.host}/${key.split("/").map(encodedKey).join("/")}`;
			} catch {
				/* Invalid identities must not be persisted. */
			}
		}
		throw new Error("文件存储配置已变更，无法还原附件地址；请保留输入并重新读取附件后保存");
	}
	if (!policy?.enabled || !policy.host || !policy.store) return value;
	try {
		const url = new URL(value);
		if (
			!/^https?:$/.test(url.protocol) ||
			url.host !== policy.host ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		)
			return value;
		const key = decodeURIComponent(url.pathname.slice(1));
		if (!validKey(key)) return value;
		const result = `${apiBase}${readPath}?store=${policy.store}&key=${encodedKey(key)}`;
		originals.set(result, value);
		return result;
	} catch {
		return value;
	}
}

function convertText(value: string, restore: boolean): string {
	// Exact resource values and comma-separated lists are common form fields.
	// Do not rewrite arbitrary prose, nested redirect URLs or third-party links.
	if (!value.includes("<"))
		return value
			.split(/,(?=(?:https?:\/\/|(?:\/[A-Za-z0-9_-]+)*\/private\/file\/read\?))/)
			.map((item) => convertUrl(item, restore))
			.join(",");
	return value.replace(
		/\b(src|href|poster)\s*=\s*(["'])(.*?)\2/gi,
		(match, attribute, quote, url) => {
			const original = url.replace(/&amp;/g, "&");
			const converted = convertUrl(original, restore);
			return converted === original
				? match
				: `${attribute}=${quote}${converted.replace(/&/g, "&amp;")}${quote}`;
		}
	);
}

export function mapPrivateFiles<T>(data: T, restore = false): T {
	if (typeof data === "string") return convertText(data, restore) as T;
	if (Array.isArray(data)) return data.map((item) => mapPrivateFiles(item, restore)) as T;
	if (data && Object.getPrototypeOf(data) === Object.prototype) {
		return Object.fromEntries(
			Object.entries(data).map(([key, value]) => [key, mapPrivateFiles(value, restore)])
		) as T;
	}
	return data;
}

export async function ensurePrivateFiles(token: string, base: string): Promise<void> {
	if (!token) return;
	if (clearing) await clearing;
	if (token === activeToken && policy && policy.expiresAt * 1000 > Date.now() + 60000) return;
	while (pending) {
		await pending;
		if (token === activeToken) return;
	}
	if (failedToken === token && Date.now() < retryAfter) throw new Error("文件会话稍后重试");
	const current = generation;
	pending = (async () => {
		const response = await axios.post(
			`${base}/private/file/session`,
			{},
			{
				headers: { Authorization: token, "X-Private-File-Prefix": base },
				withCredentials: true,
				timeout: 2500
			}
		);
		if (response.data?.code !== 1000 || response.data?.data?.readPath !== readPath)
			throw new Error("私有文件会话建立失败");
		if (current !== generation) return;
		policy = response.data.data;
		activeToken = token;
		retryAfter = 0;
		failedToken = "";
		apiBase = base;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			if (current === generation && activeToken === token) {
				ensurePrivateFiles(token, base).catch(() => null);
			}
		}, Math.max(1000, policy!.expiresAt * 1000 - Date.now() - 45000));
	})();
	try {
		await pending;
	} catch (error) {
		retryAfter = Date.now() + 30000;
		failedToken = token;
		throw error;
	} finally {
		pending = undefined;
	}
}

export async function clearPrivateFiles(base: string): Promise<void> {
	generation++;
	activeToken = "";
	policy = undefined;
	if (timer) clearTimeout(timer);
	timer = undefined;
	clearing = (async () => {
		// Revoke after any earlier session response has set its cookie, so a
		// late request cannot silently recreate the browser's logged-out session.
		if (pending) await pending.catch(() => null);
		await axios.post(
			`${base}/private/file/logout`,
			{},
			{ headers: { "X-Private-File-Prefix": base }, withCredentials: true, timeout: 10000 }
		);
	})();
	try {
		await clearing;
	} finally {
		clearing = undefined;
	}
}
