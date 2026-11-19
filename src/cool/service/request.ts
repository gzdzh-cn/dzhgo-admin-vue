import axios from "axios";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { ElMessage } from "element-plus";
import { endsWith } from "lodash-es";
import { isDev, config } from "/@/cool";
import { storage } from "/@/cool/utils";
import { useBase } from "/$/base";
import { router } from "../router";
import {
	ensurePrivateFiles,
	isPrivateFileAuthError,
	mapPrivateFiles
} from "/$/upload/private-files";

declare module "axios" {
	// Keep Axios's original generic when merging its configuration type.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
	interface AxiosRequestConfig<D = any> {
		handleErrorLocally?: boolean;
	}
}

const request = axios.create({
	timeout: 30000,
	withCredentials: false
});

NProgress.configure({
	showSpinner: true
});

// 请求队列
let queue: Array<{ resume: (token: string) => void; reject: (error: any) => void }> = [];

// 是否刷新中
let isRefreshing = false;
let privateFileWarning = false;
let privateFileAuthHandled = false;

function clearLocalSession() {
	useBase().user.clear();
	router.clear();
	router.push("/login");
}

async function preparePrivateFiles(req: any, token: string) {
	try {
		await ensurePrivateFiles(token, config.baseUrl);
		privateFileWarning = false;
		privateFileAuthHandled = false;
	} catch (error) {
		if (isPrivateFileAuthError(error)) {
			if (!privateFileAuthHandled) {
				privateFileAuthHandled = true;
				ElMessage.warning("登录状态已更新，请重新登录");
				// Clear only this browser. Global logout would revoke other devices.
				clearLocalSession();
			}
			throw error;
		}
		if (!privateFileWarning) ElMessage.warning("私有文件访问暂不可用，请稍后刷新重试");
		privateFileWarning = true;
	}
	req.data = mapPrivateFiles(req.data, true);
	req.params = mapPrivateFiles(req.params, true);
	return req;
}

// 请求
request.interceptors.request.use(
	async (req: any) => {
		const { user } = useBase();

		if (req.url) {
			// 请求进度条
			if (!config.ignore.NProgress.some((e) => req.url?.includes(e))) {
				NProgress.start();
			}
		}

		// 请求信息
		if (isDev) {
			console.group(req.url);
			console.log("method:", req.method);
			console.table("data:", req.method == "get" ? req.params : req.data);
			console.groupEnd();
		}

		// 验证 token
		if (user.token) {
			// 请求标识
			if (req.headers) {
				req.headers["Authorization"] = user.token;
			}

			// if (req.url?.includes("refreshToken")) {
			// 	return req;
			// }
			// 忽略
			if (["eps", "refreshToken"].some((e) => endsWith(req.url, e))) {
				return req;
			}

			// 判断 token 是否过期
			if (storage.isExpired("token")) {
				// 判断 refreshToken 是否过期
				if (storage.isExpired("refreshToken")) {
					ElMessage.warning("登录已过期，请重新登录");
					clearLocalSession();
					throw new Error("登录已过期，请重新登录");
				}
				// 是否在刷新中
				if (!isRefreshing) {
					isRefreshing = true;
					user.refreshToken()
						.then((token: string) => {
							const waiting = queue;
							queue = [];
							isRefreshing = false;
							waiting.forEach((entry) => entry.resume(token));
						})
						.catch((error: any) => {
							const waiting = queue;
							queue = [];
							isRefreshing = false;
							waiting.forEach((entry) => entry.reject(error));
						});
				}

				return new Promise((resolve, reject) => {
					// 继续请求
					queue.push({
						resume: (token) => {
							// 重新设置 token
							if (req.headers) {
								req.headers["Authorization"] = token;
							}
							resolve(preparePrivateFiles(req, token));
						},
						reject
					});
				});
			}
		}

		return user.token ? preparePrivateFiles(req, user.token) : req;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// 响应
request.interceptors.response.use(
	(res) => {
		NProgress.done();

		if (!res?.data) {
			return res;
		}

		const { code, data, message } = res.data;

		if (!code) {
			return res.data;
		}

		switch (code) {
			case 1000:
				return mapPrivateFiles(data);
			default:
				return Promise.reject({ code, message });
		}
	},
	async (error) => {
		NProgress.done();

		if (error.response) {
			const { status, config } = error.response;
			if (status == 401) {
				clearLocalSession();
			} else if (config.handleErrorLocally) {
				// Opt-in pages keep partial results and offer an inline retry.
				// Do not expose raw server response bodies (which may contain SQL).
				return Promise.reject({ code: status, message: error.message });
			} else {
				if (isDev) {
					ElMessage.error(`${config.url} ${status}`);
				} else {
					switch (status) {
						case 403:
							router.push("/403");
							break;

						case 500:
							router.push("/500");
							break;

						case 502:
							router.push("/502");
							break;
					}
				}
			}
		}

		return Promise.reject({ message: error.message });
	}
);

export { request };
