<template>
	<cl-view-group ref="ViewGroup" :title="listTitle">
		<template #left
			><app-group
				:groups="appGroups"
				:loading="groupsLoading"
				:error="groupsError"
				:selected-app-id="query.appId"
				:selected-package="query.packageName"
				:selected-platform="query.platform"
				:unassigned="query.unassigned"
				@select="selectApp"
				@refresh="refresh"
		/></template>
		<template #right>
			<div class="app-update-page">
				<div class="toolbar">
					<el-input
						v-model="query.keyword"
						placeholder="搜索版本、文件名或标题"
						clearable
						@keyup.enter="search"
						@clear="search"
					/>
					<el-select
						v-model="query.status"
						placeholder="全部状态"
						clearable
						@change="search"
					>
						<el-option label="草稿" value="draft" />
						<el-option label="已上传" value="uploaded" />
						<el-option label="已发布" value="published" />
						<el-option label="已撤回" value="withdrawn" />
					</el-select>
					<el-button @click="refresh">刷新</el-button>
					<el-button
						v-if="canOperate('version', 'save')"
						type="primary"
						@click="openCreate"
						>上传新版本</el-button
					>
				</div>

				<div class="version-table">
					<el-table v-loading="loading" :data="rows" height="100%" border stripe>
						<el-table-column prop="platform" label="平台" width="90">
							<template #default="{ row }">{{
								platformLabel(row.platform)
							}}</template>
						</el-table-column>
						<el-table-column
							prop="package_name"
							label="应用标识"
							min-width="230"
							show-overflow-tooltip
						/>
						<el-table-column prop="version_name" label="版本" min-width="110" />
						<el-table-column prop="version_code" label="versionCode" width="120" />
						<el-table-column
							prop="update_title"
							label="更新标题"
							min-width="180"
							show-overflow-tooltip
						/>
						<el-table-column label="发布时间" min-width="165">
							<template #default="{ row }">{{
								formatDateTime(row.publish_time ?? row.publishTime)
							}}</template>
						</el-table-column>
						<el-table-column label="升级方式" min-width="220">
							<template #default="{ row }">
								<template v-if="row.platform === 'android'">
									<template v-if="row.storage_type === 'url'">
										<a
											:href="row.download_url"
											target="_blank"
											rel="noopener noreferrer"
											>外部 APK 下载链接</a
										>
									</template>
									<template v-else>
										<div>{{ row.apk_file_name || "APK 未上传" }}</div>
										<small v-if="row.apk_file_size">{{
											formatSize(row.apk_file_size)
										}}</small>
									</template>
								</template>
								<a v-else :href="row.store_url" target="_blank" rel="noopener">{{
									row.store_url
								}}</a>
							</template>
						</el-table-column>
						<el-table-column label="存储" width="90">
							<template #default="{ row }">{{
								storageLabel(row.storage_type)
							}}</template>
						</el-table-column>
						<el-table-column label="状态" width="100">
							<template #default="{ row }">
								<el-tag :type="statusType(row.status)">{{
									statusLabel(row.status)
								}}</el-tag>
							</template>
						</el-table-column>
						<el-table-column prop="download_count" label="下载次数" width="100" />
						<el-table-column label="操作" fixed="right" width="280">
							<template #default="{ row }">
								<el-button
									link
									type="primary"
									:disabled="
										(row.status === 'published' &&
											row.storage_type !== 'url') ||
										saving ||
										!!actionId
									"
									v-if="canOperate('version', 'save')"
									@click="openEdit(row)"
									>编辑</el-button
								>
								<el-button
									v-if="
										row.platform === 'android' &&
										(row.status === 'uploaded' || row.status === 'withdrawn') &&
										canOperate('version', 'publish')
									"
									link
									:disabled="!!actionId || saving"
									type="success"
									@click="publish(row)"
									>发布</el-button
								>
								<el-button
									v-if="
										row.platform !== 'android' &&
										(row.status === 'draft' || row.status === 'withdrawn') &&
										canOperate('version', 'publish')
									"
									link
									:disabled="!!actionId || saving"
									type="success"
									@click="publish(row)"
									>发布</el-button
								>
								<el-button
									v-if="
										row.status === 'published' &&
										canOperate('version', 'revoke')
									"
									link
									:disabled="!!actionId || saving"
									type="warning"
									@click="revoke(row)"
									>撤回</el-button
								>
								<el-button
									v-if="
										row.status !== 'published' &&
										canOperate('version', 'delete')
									"
									link
									:disabled="!!actionId || saving"
									type="danger"
									@click="remove(row)"
									>删除</el-button
								>
							</template>
						</el-table-column>
					</el-table>
				</div>
				<div class="pagination">
					<el-pagination
						v-model:current-page="query.page"
						v-model:page-size="query.size"
						:total="total"
						:page-sizes="[10, 20, 50]"
						layout="total, sizes, prev, pager, next"
						@current-change="load"
						@size-change="search"
					/>
				</div>

				<el-dialog
					v-model="dialogVisible"
					:title="
						form.id && form.status === 'published' && form.storageType === 'url'
							? '修改下载链接'
							: form.id
							? '编辑版本'
							: '新增版本'
					"
					width="min(680px, 94vw)"
					:close-on-click-modal="!saving"
					:close-on-press-escape="!saving"
					:show-close="!saving"
					destroy-on-close
				>
					<el-form :model="form" label-width="150px" :disabled="saving">
						<el-form-item label="所属 App" prop="packageName" required>
							<el-select
								v-model="formAppId"
								filterable
								placeholder="请选择所属 App"
								:loading="groupsLoading"
								:disabled="!!form.id"
								@change="setFormGroup"
								style="width: 100%"
							>
								<el-option
									v-for="group in appGroups.filter(
										(g) => !g.unassigned && g.platforms.length
									)"
									:key="group.id"
									:label="group.name"
									:value="group.id"
								/>
							</el-select>
							<div
								v-if="!appGroups.some((g) => !g.unassigned && g.platforms.length)"
								class="existing-file-tip"
							>
								请先添加 App 和至少一个平台。
							</div>
						</el-form-item>
						<el-form-item label="发布平台" prop="platform" required
							><el-select
								v-model="form.platform"
								:disabled="!!form.id"
								style="width: 100%"
								@change="setFormPlatform"
								><el-option
									v-for="app in selectedFormGroup?.platforms || []"
									:key="app.platform"
									:label="`${platformLabel(app.platform)} · ${app.packageName}`"
									:value="app.platform" /></el-select
						></el-form-item>
						<el-form-item
							v-if="form.platform === 'android' && form.downloadMode === 'apk'"
							label="签名校验"
							><div class="existing-file-tip">
								每个 App 独立校验首次上传 APK 的签名证书。新 App 请使用其正式签名。
							</div></el-form-item
						>
						<el-form-item label="平台"
							><el-input :model-value="platformLabel(form.platform)" disabled
						/></el-form-item>
						<el-form-item label="versionName" prop="versionName" required
							><el-input
								v-model="form.versionName"
								:disabled="
									(!!form.id && !!form.apkFileName) || form.status === 'published'
								"
						/></el-form-item>
						<el-form-item label="versionCode" prop="versionCode" required
							><el-input-number
								v-model="form.versionCode"
								:min="1"
								:disabled="
									(!!form.id && !!form.apkFileName) || form.status === 'published'
								"
						/></el-form-item>
						<el-form-item label="更新标题" prop="updateTitle" required
							><el-input
								v-model="form.updateTitle"
								:disabled="form.status === 'published'"
						/></el-form-item>
						<el-form-item label="更新内容" prop="updateContent" required
							><el-input
								v-model="form.updateContent"
								:disabled="form.status === 'published'"
								type="textarea"
								:rows="5"
						/></el-form-item>
						<el-form-item label="强制更新"
							><el-switch
								v-model="form.forceUpdate"
								:disabled="form.status === 'published'"
								:active-value="1"
								:inactive-value="0"
						/></el-form-item>
						<el-form-item label="最低支持 versionCode"
							><el-input-number
								v-model="form.minSupportedVersionCode"
								:disabled="form.status === 'published'"
								:min="0"
						/></el-form-item>
						<el-form-item label="计划发布时间"
							><el-date-picker
								v-model="form.publishTime"
								:disabled="form.status === 'published'"
								type="datetime"
								value-format="YYYY-MM-DD HH:mm:ss"
								clearable
						/></el-form-item>
						<el-form-item
							v-if="form.platform !== 'android'"
							label="应用市场链接"
							required
						>
							<el-input
								v-model="form.storeUrl"
								:disabled="!!form.id && form.status === 'published'"
								maxlength="1024"
								placeholder="请输入对应平台的 HTTPS 官方应用市场链接"
							/>
						</el-form-item>
						<el-form-item v-else label="下载方式" required>
							<el-radio-group
								v-model="form.downloadMode"
								:disabled="!!form.id && form.status === 'published'"
								@change="changeDownloadMode"
							>
								<el-radio value="apk">上传 APK</el-radio>
								<el-radio value="url">输入下载链接</el-radio>
							</el-radio-group>
							<div v-if="form.id" class="existing-file-tip">
								<template v-if="form.apkFileName && form.downloadMode === 'apk'">
									切换为外链后，当前 APK 将停用，App 签名校验记录保留；切回 APK
									方式需重新上传。
								</template>
								<template v-else-if="form.status === 'published'">
									已发布外链版本仅可修改下载链接。
								</template>
								<template v-else> 尚未上传 APK，可以切换下载方式。 </template>
							</div>
						</el-form-item>
						<el-form-item
							v-if="form.platform === 'android' && form.downloadMode === 'url'"
							label="APK 下载链接"
							required
						>
							<el-input
								v-model="form.downloadUrl"
								maxlength="1024"
								placeholder="请输入可直接下载 APK 的 HTTPS 地址"
							/>
							<div class="existing-file-tip">
								需使用 HTTPS；发布后用户将通过此链接下载 APK。
							</div>
						</el-form-item>
						<el-form-item v-else-if="form.platform === 'android'" label="APK文件">
							<div v-if="form.apkFileName && !selectedFile" class="existing-file-tip">
								当前已上传：{{ form.apkFileName }}（{{
									formatSize(form.apkFileSize)
								}}，{{ storageLabel(form.storageType) }}）
							</div>
							<input
								ref="fileInput"
								type="file"
								:disabled="saving || !canOperate('version', 'upload')"
								accept=".apk,application/vnd.android.package-archive"
								@change="chooseFile"
							/>
							<div v-if="selectedFile" class="file-tip">
								{{ selectedFile.name }}（{{ formatSize(selectedFile.size) }}）
							</div>
							<div v-if="uploadProgress > 0" class="upload-progress">
								<el-progress :percentage="uploadProgress" />
							</div>
						</el-form-item>
					</el-form>
					<template #footer>
						<el-button :disabled="saving" @click="dialogVisible = false"
							>取消</el-button
						>
						<el-button
							v-if="
								form.status !== 'published' &&
								canOperate('version', 'save') &&
								canOperate('version', 'publish')
							"
							:disabled="saving || !canPublishForm"
							:loading="saving && publishingAfterSave"
							type="success"
							@click="save(true)"
							>保存并发布</el-button
						>
						<el-button type="primary" :loading="saving" @click="save(false)">{{
							form.id && form.status === "published" && form.storageType === "url"
								? "保存下载链接"
								: `保存${selectedFile ? "并上传" : ""}`
						}}</el-button>
					</template>
				</el-dialog>
			</div>
		</template>
	</cl-view-group>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { request } from "/@/cool/service/request";
import { useRoute } from "vue-router";
import { apiUrl, canOperate, platformLabel, useAppOptions, useAppGroups } from "../service";
import AppGroup from "../components/app-group.vue";
import ClViewGroup from "/$/base/components/view/group.vue";
const ViewGroup = ref<InstanceType<typeof ClViewGroup>>();

const { appOptions, optionsError, loadAppOptions } = useAppOptions("version");
const { appGroups, groupsError, groupsLoading, loadAppGroups } = useAppGroups("version");
const formAppId = ref("");
const selectedFormGroup = computed(() => appGroups.value.find((g) => g.id === formAppId.value));
const rows = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const actionId = ref("");
const dialogVisible = ref(false);
const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File>();
const uploadProgress = ref(0);
const publishingAfterSave = ref(false);
const query = reactive({
	page: 1,
	size: 20,
	keyword: "",
	status: "",
	packageName: "",
	platform: "",
	appId: "",
	unassigned: false
});
const selectedApp = computed(() =>
	appOptions.value.find(
		(app) => app.packageName === query.packageName && app.platform === query.platform
	)
);
const listTitle = computed(() =>
	query.packageName
		? `版本列表（${selectedApp.value?.name || query.packageName}）`
		: query.appId
		? `版本列表（${appGroups.value.find((g) => g.id === query.appId)?.name || "App"}）`
		: query.unassigned
		? "版本列表（未归属）"
		: "版本列表（全部 App）"
);
function selectApp(choice?: {
	appId?: string;
	packageName?: string;
	platform?: string;
	unassigned?: boolean;
}) {
	query.packageName = choice?.packageName || "";
	query.platform = choice?.platform || "";
	query.appId = choice?.appId || "";
	query.unassigned = !!choice?.unassigned;
	ViewGroup.value?.select(choice);
	search();
}
async function refreshApps() {
	await Promise.all([loadAppOptions(), loadAppGroups()]);
}
const emptyForm = () => ({
	id: "",
	packageName: query.packageName,
	platform: query.platform || "",
	versionName: "",
	versionCode: 1,
	updateTitle: "",
	updateContent: "",
	forceUpdate: 0,
	minSupportedVersionCode: 0,
	publishTime: "",
	status: "draft",
	apkFileName: "",
	apkFileSize: 0,
	storageType: "",
	downloadMode: "apk",
	downloadUrl: "",
	storeUrl: ""
});
const form = reactive<any>(emptyForm());
const canPublishForm = computed(() => {
	if (form.platform !== "android") return !!String(form.storeUrl || "").trim();
	if (form.downloadMode === "url") return !!String(form.downloadUrl || "").trim();
	return !!selectedFile.value || !!form.apkFileName;
});
const route = useRoute();
let loadGeneration = 0;
async function load() {
	const current = ++loadGeneration;
	loading.value = true;
	rows.value = [];
	total.value = 0;
	try {
		const data: any = await request({
			url: apiUrl("version/page"),
			method: "POST",
			data: { ...query }
		});
		if (current !== loadGeneration) return;
		rows.value = data?.list || [];
		total.value = data?.pagination?.total || 0;
	} catch (error: any) {
		if (current === loadGeneration) ElMessage.error(error?.message || "加载版本失败");
	} finally {
		if (current === loadGeneration) loading.value = false;
	}
}
function search() {
	query.page = 1;
	void load();
}
async function refresh() {
	await Promise.all([load(), refreshApps()]);
}
function resetForm(value?: any) {
	Object.assign(
		form,
		emptyForm(),
		value
			? {
					id: String(value.id),
					packageName: value.package_name,
					platform: value.platform,
					versionName: value.version_name,
					versionCode: Number(value.version_code),
					updateTitle: value.update_title,
					updateContent: value.update_content,
					forceUpdate: Number(value.force_update),
					minSupportedVersionCode: Number(value.min_supported_version_code),
					publishTime: value.publish_time,
					status: value.status,
					apkFileName: value.apk_file_name,
					apkFileSize: Number(value.apk_file_size),
					storageType: value.storage_type,
					downloadMode: value.storage_type === "url" ? "url" : "apk",
					downloadUrl: value.storage_type === "url" ? value.download_url || "" : "",
					storeUrl: value.store_url || ""
			  }
			: {}
	);
	const profile = appOptions.value.find(
		(a) => a.packageName === form.packageName && a.platform === form.platform
	);
	formAppId.value = profile?.appId || query.appId || "";
	selectedFile.value = undefined;
	uploadProgress.value = 0;
	if (fileInput.value) fileInput.value.value = "";
}
function focusFormVersion() {
	query.packageName = form.packageName;
	query.platform = form.platform;
	const owner = appOptions.value.find(
		(a) => a.packageName === form.packageName && a.platform === form.platform
	);
	query.appId = owner?.appId || "";
	query.unassigned = false;
	query.page = 1;
	ViewGroup.value?.select({
		packageName: form.packageName,
		platform: form.platform,
		appId: query.appId
	});
}
function setFormGroup(id: string) {
	const group = appGroups.value.find((g) => g.id === id);
	const app = group?.platforms[0];
	if (app) {
		form.platform = app.platform;
		setFormPlatform(app.platform);
	}
}
function setFormPlatform(platform: string) {
	const app = selectedFormGroup.value?.platforms.find((item) => item.platform === platform);
	if (app) {
		form.packageName = app.packageName;
		form.platform = platform;
		form.storeUrl = "";
		form.downloadMode = "apk";
		form.downloadUrl = "";
		selectedFile.value = undefined;
		uploadProgress.value = 0;
		if (fileInput.value) fileInput.value.value = "";
	}
}
function openCreate() {
	if (saving.value) return;
	if (!appGroups.value.some((g) => !g.unassigned && g.platforms.length)) {
		ElMessage.warning(optionsError.value || "请先在左侧添加 App 平台");
		return;
	}
	resetForm();
	dialogVisible.value = true;
}
function openEdit(row: any) {
	if (saving.value) return;
	resetForm(row);
	dialogVisible.value = true;
}
function chooseFile(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (
		file &&
		(!file.name.toLowerCase().endsWith(".apk") || file.size <= 0 || file.size > 1024 ** 3)
	) {
		ElMessage.warning("请选择不超过 1 GiB 的非空 APK 文件");
		input.value = "";
		selectedFile.value = undefined;
		return;
	}
	selectedFile.value = file;
}
function changeDownloadMode(mode: string) {
	selectedFile.value = undefined;
	if (fileInput.value) fileInput.value.value = "";
	if (mode === "apk") form.downloadUrl = "";
	else uploadProgress.value = 0;
}
async function save(publishAfterSave = false) {
	if (saving.value) return;
	form.packageName = String(form.packageName || "").trim();
	if (
		!form.packageName ||
		form.packageName.length > 255 ||
		!form.versionName?.trim() ||
		!Number.isSafeInteger(form.versionCode) ||
		form.versionCode < 1 ||
		!form.updateTitle?.trim() ||
		!form.updateContent?.trim()
	) {
		ElMessage.warning("请选择所属 App，完整填写版本号、标题和更新内容，版本代码须为正整数");
		return;
	}
	if (!Number.isSafeInteger(form.minSupportedVersionCode) || form.minSupportedVersionCode < 0) {
		ElMessage.warning("最低支持版本须为非负整数");
		return;
	}
	if (form.platform !== "android" && !/^https:\/\//i.test(String(form.storeUrl || "").trim())) {
		ElMessage.warning("请输入 HTTPS 应用市场链接");
		return;
	}
	if (form.platform === "android" && form.downloadMode === "url") {
		try {
			const download = new URL(String(form.downloadUrl || "").trim());
			if (
				download.protocol !== "https:" ||
				!download.hostname ||
				download.username ||
				download.password
			) {
				throw new Error();
			}
		} catch {
			ElMessage.warning("请输入有效的 HTTPS APK 下载链接");
			return;
		}
	}
	if (!form.id) {
		const selectedProfile = appOptions.value.find(
			(app) => app.packageName === form.packageName && app.platform === form.platform
		);
		if (!formAppId.value || selectedProfile?.appId !== formAppId.value) {
			ElMessage.warning("请选择所属 App 及其平台");
			return;
		}
	}
	if (publishAfterSave) {
		try {
			await ElMessageBox.confirm(
				`${form.packageName} / ${form.versionName}：保存后立即发布，确认继续吗？`,
				"确认发布",
				{ type: "warning", confirmButtonText: "保存并发布", cancelButtonText: "取消" }
			);
		} catch {
			return;
		}
	}
	if (form.id && form.downloadMode === "url" && form.storageType !== "url" && form.apkFileName) {
		try {
			await ElMessageBox.confirm(
				"切换后当前已上传 APK 将不再用于该版本，但 App 签名校验记录会保留；如需恢复 APK 方式，需要重新上传。是否继续？",
				"确认切换下载方式",
				{ type: "warning", confirmButtonText: "继续切换", cancelButtonText: "取消" }
			);
		} catch {
			return;
		}
	}
	saving.value = true;
	publishingAfterSave.value = publishAfterSave;
	let savedId = "";
	const hadSelectedFile = !!selectedFile.value;
	try {
		const previousStorageType = form.storageType;
		const { downloadMode, ...payload } = form;
		const saved: any = await request({
			url: apiUrl("version/save"),
			method: "POST",
			data: {
				...payload,
				downloadMode: form.platform === "android" ? downloadMode : "",
				downloadUrl:
					form.platform === "android" && downloadMode === "url"
						? form.downloadUrl.trim()
						: ""
			}
		});
		const id = String(saved?.id || saved);
		savedId = id;
		// Retain the saved draft if APK upload fails; retry must not create another version.
		form.id = id;
		if (form.platform === "android") {
			if (downloadMode === "url") {
				form.storageType = "url";
				form.apkFileName = "";
				form.apkFileSize = 0;
				if (form.status === "draft") form.status = "uploaded";
			} else if (previousStorageType === "url") {
				form.storageType = "local";
				form.downloadUrl = "";
				form.apkFileName = "";
				form.apkFileSize = 0;
				form.status = "draft";
			}
		}
		if (
			form.platform === "android" &&
			form.downloadMode === "apk" &&
			selectedFile.value &&
			canOperate("version", "upload")
		) {
			const body = new FormData();
			body.append("file", selectedFile.value);
			const uploaded: any = await request({
				url: `${apiUrl("version/upload")}?id=${encodeURIComponent(id)}`,
				method: "POST",
				data: body,
				headers: { "Content-Type": "multipart/form-data" },
				onUploadProgress: (event: any) => {
					if (event.total)
						uploadProgress.value = Math.round((event.loaded * 100) / event.total);
				}
			});
			form.apkFileName = uploaded?.fileName || selectedFile.value.name;
			form.apkFileSize = Number(uploaded?.fileSize || selectedFile.value.size);
			form.storageType = uploaded?.storageType || "local";
			form.status = "uploaded";
			selectedFile.value = undefined;
			if (fileInput.value) fileInput.value.value = "";
		}
		if (publishAfterSave) {
			await request({
				url: apiUrl("version/publish"),
				method: "POST",
				data: { id }
			});
			form.status = "published";
		}
		ElMessage.success(
			publishAfterSave
				? "版本已保存并发布"
				: form.downloadMode === "url"
				? "版本和下载链接已保存"
				: hadSelectedFile
				? "版本和 APK 已保存"
				: "版本已保存"
		);
		dialogVisible.value = false;
		focusFormVersion();
		await refresh();
	} catch (error: any) {
		ElMessage.error(error?.message || "保存失败");
		if (savedId) {
			focusFormVersion();
			await load();
		}
		await loadAppOptions();
	} finally {
		saving.value = false;
		publishingAfterSave.value = false;
	}
}
async function action(row: any, endpoint: string, message: string) {
	if (actionId.value) return;
	actionId.value = String(row.id);
	try {
		await ElMessageBox.confirm(
			`${row.package_name} / ${row.version_name}：${message}`,
			"操作确认",
			{ type: "warning" }
		);
		await request({
			url: apiUrl(`version/${endpoint}`),
			method: "POST",
			data: { id: String(row.id) }
		});
		ElMessage.success("操作成功");
		await refresh();
	} catch (error: any) {
		if (error !== "cancel" && error !== "close") ElMessage.error(error?.message || "操作失败");
	} finally {
		actionId.value = "";
	}
}
function publish(row: any) {
	return action(row, "publish", "确定发布这个版本吗？发布后不能直接修改版本信息和下载来源。");
}
function revoke(row: any) {
	return action(row, "revoke", "确定撤回这个版本吗？");
}
function remove(row: any) {
	return action(row, "delete", "确定删除这个版本吗？已发布版本需要先撤回。");
}
function statusLabel(value: string) {
	return (
		({ draft: "草稿", uploaded: "已上传", published: "已发布", withdrawn: "已撤回" } as any)[
			value
		] || value
	);
}
function statusType(value: string) {
	return (
		({ draft: "info", uploaded: "warning", published: "success", withdrawn: "danger" } as any)[
			value
		] || "info"
	);
}
function storageLabel(value: string) {
	return (
		({ local: "本机", oss: "OSS", qiniu: "七牛云", url: "外链" } as any)[value] || value || "-"
	);
}
function formatDateTime(value: any) {
	return value ? String(value).replace("T", " ").slice(0, 19) : "-";
}
function formatSize(size: number) {
	if (!size) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	let index = 0;
	let value = size;
	while (value >= 1024 && index < units.length - 1) {
		value /= 1024;
		index++;
	}
	return `${value.toFixed(index ? 2 : 0)} ${units[index]}`;
}
onMounted(async () => {
	await refresh();
	if (route.path.endsWith("/new") && canOperate("version", "save")) openCreate();
});
</script>

<style scoped>
.app-update-page {
	padding: 10px;
	background: var(--el-bg-color);
	height: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
	box-sizing: border-box;
}
.toolbar {
	display: flex;
	gap: 10px;
	margin-bottom: 16px;
	flex-wrap: wrap;
}
.toolbar .el-input {
	width: 260px;
}
.toolbar .el-select {
	width: 140px;
}
.version-table {
	flex: 1;
	min-height: 180px;
}
.pagination {
	overflow-x: auto;
	flex-shrink: 0;
}
:deep(.cl-view-group__right-head > span) {
	max-width: calc(100% - 100px);
	text-overflow: ellipsis;
}
@media (max-width: 768px) {
	.toolbar {
		gap: 8px;
	}
	.toolbar .el-input {
		width: 100%;
	}
}

.app-update-page > .el-alert {
	margin-bottom: 12px;
}
.app-update-page .el-pagination {
	justify-content: flex-end;
	margin-top: 16px;
}
.file-tip {
	color: var(--el-text-color-secondary);
	margin-top: 8px;
}
.upload-progress {
	width: 260px;
	margin-top: 8px;
}
.existing-file-tip {
	color: var(--el-text-color-secondary);
	margin-bottom: 8px;
	line-height: 1.6;
}
</style>
