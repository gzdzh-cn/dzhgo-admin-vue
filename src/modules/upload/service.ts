import { service } from "/@/cool";

// Built-in file management is also used by production bundles whose generated
// EPS snapshot predates the space controllers. Keep its API contract explicit.
export function spaceRequest(scope: "info" | "type", action: string, data: any) {
	return service.request({
		url: `/admin/space/${scope}/${action}`,
		method: "POST",
		data,
		handleErrorLocally: true
	});
}
