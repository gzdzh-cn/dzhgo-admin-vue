export const proxy = {
	"/dev": {
		target: "http://127.0.0.1:8200",
		changeOrigin: true,
		rewrite: (path: string) => path.replace(/^\/dev/, "")
	},

	"/prod": {
		target: "",
		changeOrigin: true,
		rewrite: (path: string) => path.replace(/^\/prod/, "/api")
	},
	"/dzhimg": {
		target: "http://127.0.0.1:8200",
		changeOrigin: true,
		rewrite: (path: string) => path.replace(/^\/dzhimg/, "")
	}
};
