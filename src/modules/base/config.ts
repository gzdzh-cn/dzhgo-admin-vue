import { ModuleConfig, config, useCool } from "/@/cool";
import { useStore } from "./store";

import "./static/css/index.scss";

export default (): ModuleConfig => {
	return {
		order: 99,
		components: Object.values(import.meta.glob("./components/**/*.{vue,tsx}")),
		views: [
			{
				path: "/my/info",
				meta: {
					label: "个人中心"
				},
				component: () => import("./views/info.vue")
			}
		],
		pages: [
			{
				path: "/login",
				component: () => import("./pages/login/index.vue")
			},
			{
				path: "/401",
				meta: {
					process: false
				},
				component: () => import("./pages/error/401.vue")
			},
			{
				path: "/403",
				meta: {
					process: false
				},
				component: () => import("./pages/error/403.vue")
			},
			{
				path: "/404",
				meta: {
					process: false
				},
				component: () => import("./pages/error/404.vue")
			},
			{
				path: "/500",
				meta: {
					process: false
				},
				component: () => import("./pages/error/500.vue")
			},
			{
				path: "/502",
				meta: {
					process: false
				},
				component: () => import("./pages/error/502.vue")
			}
		],
		async install() {
			// 设置标题
			// document.title = config.app.name;
		},
		async onLoad() {
			const { user, menu, app, setting } = useStore();

			const res = await setting.get();
			// 设置标题
			if (res.value?.siteName) {
				document.title = res.value?.siteName;
			} else {
				document.title = config.app.name;
			}

			// 设置logo
			if (res.value?.logo) {
				document.querySelector("link[rel='icon']").href = res.value?.logo;
			} else {
				document.querySelector("link[rel='icon']").href = config.app.logo;
			}

			// token 事件
			async function hasToken(cb: () => Promise<any> | void) {
				if (cb) {
					app.addEvent("hasToken", cb);

					if (user.token) {
						await cb();
					}
				}
			}

			await hasToken(async () => {
				// 获取用户信息
				user.get();
				// 获取菜单权限
				await menu.get();
			});

			return {
				hasToken
			};
		}
	};
};
