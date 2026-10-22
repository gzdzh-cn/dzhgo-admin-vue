import { ref } from "vue";
import { config } from "/@/cool";
import { request } from "/@/cool/service/request";
import { checkPerm } from "/$/base/common/permission";

export type AppScope = "overview" | "version" | "crash";
export interface AppOption {
	id?: string;
	appId?: string;
	appName?: string;
	name?: string;
	packageName: string;
	platform: string;
}
export interface AppGroupOption {
	id?: string;
	name: string;
	platforms: AppOption[];
	unassigned?: boolean;
}
export const platformLabel = (platform: string) =>
	(({ android: "Android", ios: "iOS", harmonyos: "鸿蒙" } as Record<string, string>)[platform] ||
	platform);
export const appIdentity = (app: Pick<AppOption, "packageName" | "platform">) =>
	JSON.stringify([app.platform, app.packageName]);
export const apiUrl = (path: string) => `${config.baseUrl}/admin/app_update/${path}`;
export function canOperate(scope: AppScope, action: string) {
	return checkPerm({
		or: [
			`app_update:${scope}:${action}`,
			...(scope === "crash" ? [] : [`app_update:${scope}:list`])
		]
	});
}
export function canManageApp(action: "save" | "delete" | "move") {
	const extended =
		action === "save" ? "group:save" : action === "delete" ? "group:delete" : "platform:move";
	return checkPerm({ or: [`app_update:app:${action}`, `app_update:app:${extended}`] });
}
export function useAppOptions(scope: AppScope) {
	const appOptions = ref<AppOption[]>([]);
	const optionsError = ref("");
	const optionsLoading = ref(false);
	let generation = 0;
	async function loadAppOptions() {
		const current = ++generation;
		optionsLoading.value = true;
		try {
			const result = (await request({
				url: apiUrl(`${scope}/apps`),
				method: "GET"
			})) as unknown as AppOption[];
			if (current !== generation) return;
			if (!Array.isArray(result)) throw new Error("App 列表响应格式错误");
			appOptions.value = result.filter(
				(item) =>
					item.packageName && ["android", "ios", "harmonyos"].includes(item.platform)
			);
			optionsError.value = "";
		} catch (error: any) {
			if (current === generation)
				optionsError.value = error?.message || "加载 App 列表失败，请刷新重试";
		} finally {
			if (current === generation) optionsLoading.value = false;
		}
	}
	return { appOptions, optionsError, optionsLoading, loadAppOptions };
}

export function useAppGroups(scope: AppScope) {
	const appGroups = ref<AppGroupOption[]>([]);
	const groupsError = ref("");
	const groupsLoading = ref(false);
	let generation = 0;
	async function loadAppGroups() {
		const current = ++generation;
		groupsLoading.value = true;
		try {
			const result = (await request({
				url: apiUrl(`${scope}/apps`),
				method: "GET",
				params: { view: "tree" }
			})) as unknown as AppGroupOption[];
			if (current !== generation) return;
			if (!Array.isArray(result)) throw new Error("App 分类响应格式错误");
			appGroups.value = result;
			groupsError.value = "";
		} catch (error: any) {
			if (current === generation)
				groupsError.value = error?.message || "加载 App 分类失败，请刷新重试";
		} finally {
			if (current === generation) groupsLoading.value = false;
		}
	}
	return { appGroups, groupsError, groupsLoading, loadAppGroups };
}
