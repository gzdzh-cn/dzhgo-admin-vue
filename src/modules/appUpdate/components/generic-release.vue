<template>
	<el-dialog
		v-model="visible"
		title="桌面／其他平台版本"
		width="min(760px,94vw)"
		append-to-body
		:close-on-click-modal="!busy"
		:close-on-press-escape="!busy"
		:show-close="!busy"
	>
		<el-alert
			title="先保存草稿并上传全部安装包，再正式发布。其他平台查询和下载均需访问密码。"
			type="info"
			:closable="false"
		/>
		<el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
		<el-form label-width="110px" :disabled="busy || published">
			<el-form-item label="应用平台" required
				><el-select
					v-model="identity"
					:disabled="!!form.id"
					style="width: 100%"
					@change="selectProfile"
					><el-option
						v-for="app in genericApps"
						:key="appIdentity(app)"
						:label="`${app.appName || app.name} · ${platformLabel(app.platform)}`"
						:value="appIdentity(app)" /></el-select
			></el-form-item>
			<el-form-item label="版本号" required
				><el-input
					v-model="form.versionName"
					:disabled="!!form.id"
					placeholder="例如 1.0.12"
			/></el-form-item>
			<el-form-item label="版本代码" required
				><el-input-number
					v-model="form.versionCode"
					:min="1"
					:step="1"
					:precision="0"
					:disabled="!!form.id"
			/></el-form-item>
			<el-form-item label="更新标题" required
				><el-input v-model="form.updateTitle" maxlength="255"
			/></el-form-item>
			<el-form-item label="更新说明" required
				><el-input v-model="form.updateContent" type="textarea" :rows="4"
			/></el-form-item>
			<el-form-item label="CMS 升级清单"
				><div style="width: 100%">
					<input
						type="file"
						accept="application/json,.json"
						@change="readManifest"
					/><el-input
						v-model="form.releaseManifest"
						type="textarea"
						:rows="3"
						placeholder="CMS 填入 cms-upgrade.json；普通桌面版本可留空"
					/></div
			></el-form-item>
			<el-form-item label="已上传资产"
				><div style="width: 100%">
					<el-empty v-if="!assets.length" description="暂无资产" :image-size="40" />
					<div v-for="asset in assets" :key="String(asset.id)" class="asset">
						<strong>{{ asset.name }}</strong
						><span>{{ asset.size }} 字节 · {{ asset.os }} {{ asset.arch }}</span
						><small>SHA-256: {{ asset.sha256 }}</small>
					</div>
				</div></el-form-item
			>
			<el-form-item v-if="!published && canOperate('version', 'upload')" label="添加安装包"
				><input
					type="file"
					multiple
					accept=".tar.gz,.zip,.exe,.msi,.dmg,.pkg,.deb,.rpm,.appimage"
					@change="chooseFiles"
			/></el-form-item>
			<el-form-item v-for="(item, index) in files" :key="index" :label="`待上传 ${index + 1}`"
				><div class="pending">
					<span>{{ item.file.name }}</span
					><template v-if="form.platform === 'desktop'"
						><el-select v-model="item.os" placeholder="操作系统"
							><el-option label="Windows" value="windows" /><el-option
								label="macOS"
								value="darwin" /><el-option
								label="Linux"
								value="linux" /></el-select
						><el-select v-model="item.arch" placeholder="架构"
							><el-option label="x86_64" value="x86_64" /><el-option
								label="ARM64"
								value="aarch64" /></el-select></template
					><el-button link type="danger" @click="files.splice(index, 1)">移除</el-button>
				</div></el-form-item
			>
			<el-progress v-if="busy && progress" :percentage="progress" />
		</el-form>
		<template #footer
			><el-button :disabled="busy" @click="visible = false">关闭</el-button
			><el-button
				v-if="!published && canOperate('version', 'save')"
				:loading="busy"
				@click="save(false)"
				>保存草稿并上传</el-button
			><el-button
				v-if="
					!published && canOperate('version', 'save') && canOperate('version', 'publish')
				"
				type="primary"
				:loading="busy"
				@click="save(true)"
				>正式发布</el-button
			></template
		>
	</el-dialog>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { request } from "/@/cool/service/request";
import { apiUrl, appIdentity, canOperate, platformLabel, type AppOption } from "../service";
const props = defineProps<{ apps: AppOption[] }>();
const emit = defineEmits<{ (event: "changed"): void }>();
const visible = ref(false),
	busy = ref(false),
	error = ref(""),
	identity = ref(""),
	progress = ref(0);
const genericApps = computed(() =>
	props.apps.filter((a) => ["desktop", "other"].includes(a.platform) && a.appId)
);
const form = reactive({
	id: "",
	platform: "",
	packageName: "",
	versionName: "",
	versionCode: 1,
	updateTitle: "",
	updateContent: "",
	releaseManifest: "",
	status: "draft"
});
const published = computed(() => form.status === "published");
const assets = ref<any[]>([]),
	files = ref<Array<{ file: File; os: string; arch: string }>>([]);
function selectProfile() {
	const app = genericApps.value.find((a) => appIdentity(a) === identity.value);
	if (app) {
		form.platform = app.platform;
		form.packageName = app.packageName;
	}
}
async function reload() {
	const row: any = await request({
		url: apiUrl("version/info"),
		method: "GET",
		params: { id: form.id }
	});
	Object.assign(form, {
		id: String(row.id),
		platform: row.platform,
		packageName: row.package_name,
		versionName: row.version_name,
		versionCode: Number(row.version_code),
		updateTitle: row.update_title,
		updateContent: row.update_content,
		releaseManifest: row.release_manifest || "",
		status: row.status
	});
	assets.value = row.assets || [];
	identity.value = appIdentity(form);
}
async function open(row?: any) {
	if (busy.value) return;
	error.value = "";
	files.value = [];
	assets.value = [];
	Object.assign(form, {
		id: "",
		platform: "",
		packageName: "",
		versionName: "",
		versionCode: 1,
		updateTitle: "",
		updateContent: "",
		releaseManifest: "",
		status: "draft"
	});
	identity.value = genericApps.value[0] ? appIdentity(genericApps.value[0]) : "";
	selectProfile();
	visible.value = true;
	if (row) {
		busy.value = true;
		form.id = String(row.id);
		try {
			await reload();
		} catch (e: any) {
			error.value = e?.message || "读取版本失败";
		} finally {
			busy.value = false;
		}
	}
}
async function readManifest(event: Event) {
	const input = event.target as HTMLInputElement,
		file = input.files?.[0];
	if (!file) return;
	try {
		if (file.size > 8 * 1024 * 1024) throw new Error("清单不能超过8MB");
		const text = await file.text();
		JSON.parse(text);
		form.releaseManifest = text;
	} catch (e: any) {
		error.value = e?.message || "清单无效";
	} finally {
		input.value = "";
	}
}
function chooseFiles(event: Event) {
	const input = event.target as HTMLInputElement;
	for (const file of Array.from(input.files || [])) {
		if (file.size < 1 || file.size > 90 * 1024 * 1024) {
			error.value = "安装包须为1字节至90MB";
			continue;
		}
		if (
			assets.value.some((a) => a.name === file.name) ||
			files.value.some((a) => a.file.name === file.name)
		) {
			error.value = "不允许重复文件名";
			continue;
		}
		files.value.push({ file, os: "", arch: "" });
	}
	input.value = "";
}
async function save(publish: boolean) {
	if (busy.value) return;
	if (
		!form.packageName ||
		!/^\d+\.\d+\.\d+$/.test(form.versionName) ||
		!Number.isSafeInteger(form.versionCode) ||
		!form.updateTitle.trim() ||
		!form.updateContent.trim()
	) {
		error.value = "请选择应用平台，填写有效版本、标题和更新说明";
		return;
	}
	if (form.platform === "desktop" && files.value.some((f) => !f.os || !f.arch)) {
		error.value = "请为每个桌面安装包选择操作系统和架构";
		return;
	}
	if (files.value.length && !canOperate("version", "upload")) {
		error.value = "缺少上传权限";
		return;
	}
	if (publish) {
		try {
			await ElMessageBox.confirm(
				`确认正式发布 ${form.versionName}？资产与清单将核验后对外提供。`,
				"正式发布",
				{ type: "warning" }
			);
		} catch {
			return;
		}
	}
	busy.value = true;
	error.value = "";
	progress.value = 0;
	try {
		const id: any = await request({
			url: apiUrl("version/save"),
			method: "POST",
			data: { ...form }
		});
		form.id = String(id);
		while (files.value.length) {
			const item = files.value[0],
				body = new FormData();
			body.append("file", item.file);
			body.append("id", form.id);
			body.append("os", item.os);
			body.append("arch", item.arch);
			await request({
				url: apiUrl("version/upload"),
				method: "POST",
				data: body,
				timeout: 600000,
				onUploadProgress: (event: any) => {
					if (event.total)
						progress.value = Math.round((event.loaded * 100) / event.total);
				}
			});
			files.value.shift();
		}
		if (publish)
			await request({
				url: apiUrl("version/publish"),
				method: "POST",
				data: { id: form.id }
			});
		await reload();
		emit("changed");
		ElMessage.success(publish ? "版本已正式发布" : "草稿和安装包已保存");
	} catch (e: any) {
		error.value = e?.message || "保存或上传失败，已保存的草稿会保留，可重试";
		emit("changed");
	} finally {
		busy.value = false;
		progress.value = 0;
	}
}
defineExpose({ open });
</script>
<style scoped>
.asset {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin-bottom: 10px;
	word-break: break-all;
}
.asset small {
	color: var(--el-text-color-secondary);
}
.pending {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}
.pending span {
	width: 100%;
	word-break: break-all;
}
.pending .el-select {
	width: 150px;
}
</style>
