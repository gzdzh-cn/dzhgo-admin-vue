<template>
	<div class="app-group">
		<div class="head">
			<div class="heading">
				<span>App 分类</span>
				<small>{{ filtered.length }} 个分类</small>
			</div>
			<el-button
				v-if="canManageApp('save')"
				type="success"
				bg
				size="small"
				:disabled="busy"
				@click="edit()"
				>添加 App</el-button
			>
		</div>
		<div class="search">
			<el-input v-model="keyword" placeholder="搜索 App、应用标识或平台" clearable />
		</div>
		<el-alert v-if="error" :title="error" type="warning" :closable="false" show-icon />
		<el-button v-if="error" link type="primary" @click="$emit('refresh')">重试加载</el-button>
		<div class="list" v-loading="loading">
			<el-scrollbar>
				<ul class="app-list">
					<li
						class="app-row all-row"
						:class="{ 'is-active': !selectedAppId && !selectedPackage && !unassigned }"
						@click="$emit('select', undefined)"
					>
						<div class="row-copy">
							<strong>全部 App</strong>
							<small>查看所有版本</small>
						</div>
						<el-icon v-if="!selectedAppId && !selectedPackage && !unassigned"
							><arrow-right-bold
						/></el-icon>
					</li>
					<li
						v-for="group in filtered"
						:key="group.id || 'unassigned'"
						class="app-row"
						:class="{
							'is-active': group.unassigned ? unassigned : selectedAppId === group.id,
							'is-unassigned': group.unassigned
						}"
						@click="
							$emit(
								'select',
								group.unassigned ? { unassigned: true } : { appId: group.id }
							)
						"
					>
						<div class="row-copy">
							<strong>{{ group.name }}</strong>
							<div class="platform-summary">
								<el-tag
									v-for="platform in group.platforms"
									:key="`${platform.platform}/${platform.packageName}`"
									size="small"
									effect="plain"
									>{{ platformLabel(platform.platform) }}</el-tag
								>
								<span v-if="!group.platforms.length" class="empty-platform"
									>未配置平台</span
								>
							</div>
						</div>
						<div v-if="!group.unassigned" class="row-actions" @click.stop>
							<el-button
								v-if="
									canManageApp('save') ||
									canManageApp('move') ||
									canManageApp('delete')
								"
								link
								size="small"
								:disabled="busy"
								@click="edit(group)"
								>{{ canManageApp("save") ? "编辑" : "平台管理" }}</el-button
							>
							<el-button
								v-if="canManageApp('delete')"
								link
								size="small"
								:disabled="busy || !!group.platforms.length"
								@click="removeGroup(group)"
								>删除</el-button
							>
						</div>
						<el-button
							v-if="group.unassigned && canManageApp('move')"
							link
							size="small"
							:disabled="busy"
							@click.stop="manageUnassigned"
							>归属</el-button
						>
						<el-icon v-if="group.unassigned ? unassigned : selectedAppId === group.id"
							><arrow-right-bold
						/></el-icon>
					</li>
					<el-empty
						v-if="!loading && !filtered.length"
						:image-size="70"
						description="暂无 App"
					/>
				</ul>
			</el-scrollbar>
		</div>
		<el-dialog
			v-model="visible"
			:title="editing ? (canManageApp('save') ? '编辑 App' : 'App 平台管理') : '添加 App'"
			width="min(560px,94vw)"
			:close-on-click-modal="!busy"
			:close-on-press-escape="!busy"
			:show-close="!busy"
			append-to-body
		>
			<el-form label-width="100px" :disabled="busy"
				><el-form-item v-if="editing && form.id" label="App ID"
					><el-input :model-value="form.id" readonly>
						<template #append><el-button @click="copyAppId">复制</el-button></template>
					</el-input>
				</el-form-item>
				<el-form-item v-if="editing && form.id" label="下载页配置"
					><div class="download-config-hint">
						将此 ID 填入 <code>app-download.html</code> 的
						<code>DOWNLOAD_PAGE_CONFIG.appId</code>。
					</div></el-form-item
				><el-form-item label="App 名称" required
					><el-input
						v-model="form.name"
						:disabled="!canManageApp('save')"
						maxlength="128"
						placeholder="请输入 App 名称"
				/></el-form-item>
				<div v-if="form.platforms.length" class="platform-section-title">已配置平台</div>
				<div
					v-for="(platform, index) in form.platforms"
					:key="index"
					class="platform-form-row"
				>
					<el-form-item label="平台"
						><el-select
							v-model="platform.platform"
							:disabled="platform.fixed || !canManageApp('save')"
							style="width: 100%"
							><el-option label="Android" value="android" /><el-option
								label="iOS"
								value="ios" /><el-option
								label="鸿蒙"
								value="harmonyos" /></el-select></el-form-item
					><el-form-item :label="identityLabel(platform.platform)"
						><el-input
							v-model="platform.packageName"
							:disabled="platform.fixed || !canManageApp('save')"
							maxlength="255"
							:placeholder="identityPlaceholder(platform.platform)" /></el-form-item
					><el-button
						v-if="!platform.fixed && canManageApp('save')"
						link
						type="danger"
						@click="form.platforms.splice(index, 1)"
						>移除</el-button
					><el-button
						v-else-if="canManageApp('move')"
						link
						type="primary"
						@click="moveGroupPlatform(platform, index)"
						>归入其他 App</el-button
					><el-button
						v-if="platform.fixed && canManageApp('delete')"
						link
						type="danger"
						@click="removeGroupPlatform(platform, index)"
						>删除</el-button
					>
				</div>
				<el-button
					v-if="canManageApp('save') && form.platforms.length < 3"
					link
					type="primary"
					@click="
						form.platforms.push({
							platform: nextPlatform,
							packageName: '',
							fixed: false
						})
					"
					>添加平台</el-button
				> </el-form
			><template #footer
				><el-button :disabled="busy" @click="visible = false">{{
					canManageApp("save") ? "取消" : "关闭"
				}}</el-button
				><el-button v-if="canManageApp('save')" type="primary" :loading="busy" @click="save"
					>保存</el-button
				></template
			>
		</el-dialog>
		<el-dialog v-model="moveVisible" title="归入 App" width="min(440px,94vw)" append-to-body>
			<el-select
				v-if="choosingUnassigned"
				v-model="unassignedIdentity"
				placeholder="选择待归属平台"
				style="width: 100%; margin-bottom: 12px"
			>
				<el-option
					v-for="app in unassignedApps"
					:key="`${app.platform}/${app.packageName}`"
					:label="`${platformLabel(app.platform)} · ${app.packageName}`"
					:value="`${app.platform}/${app.packageName}`"
				/>
			</el-select>
			<el-select v-model="targetAppId" placeholder="选择目标 App" style="width: 100%"
				><el-option
					v-for="group in groups.filter((x) => !x.unassigned && x.id !== moving?.appId)"
					:key="group.id"
					:label="group.name"
					:value="group.id" /></el-select
			><template #footer
				><el-button @click="moveVisible = false">取消</el-button
				><el-button type="primary" :loading="busy" @click="confirmMove"
					>确认归入</el-button
				></template
			></el-dialog
		>
	</div>
</template>
<script lang="ts" setup>
import { computed, reactive, ref } from "vue";
import { ArrowRightBold } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { request } from "/@/cool/service/request";
import {
	apiUrl,
	canManageApp,
	platformLabel,
	type AppGroupOption,
	type AppOption
} from "../service";
const props = defineProps<{
	groups: AppGroupOption[];
	loading: boolean;
	error: string;
	selectedAppId: string;
	selectedPackage: string;
	selectedPlatform: string;
	unassigned: boolean;
}>();
const emit = defineEmits<{
	(
		event: "select",
		choice?: { appId?: string; packageName?: string; platform?: string; unassigned?: boolean }
	): void;
	(event: "refresh"): void;
}>();
const keyword = ref("");
const filtered = computed(() =>
	props.groups.filter((g) =>
		`${g.name} ${g.platforms
			.map((p) => `${p.packageName} ${platformLabel(p.platform)}`)
			.join(" ")}`
			.toLowerCase()
			.includes(keyword.value.trim().toLowerCase())
	)
);
const visible = ref(false),
	editing = ref(false),
	busy = ref(false),
	moveVisible = ref(false),
	targetAppId = ref("");
const form = reactive({
	id: "",
	name: "",
	platforms: [] as Array<{ platform: string; packageName: string; fixed: boolean }>
});
const moving = ref<AppOption>();
const unassignedIdentity = ref("");
const choosingUnassigned = ref(false);
const movingFormIndex = ref<number>();
const unassignedApps = computed(
	() => props.groups.find((group) => group.unassigned)?.platforms || []
);
const nextPlatform = computed(
	() =>
		["android", "ios", "harmonyos"].find(
			(p) => !form.platforms.some((x) => x.platform === p)
		) || "android"
);
function edit(group?: AppGroupOption) {
	editing.value = !!group;
	Object.assign(form, {
		id: group?.id || "",
		name: group?.name || "",
		platforms:
			group?.platforms.map((p) => ({
				platform: p.platform,
				packageName: p.packageName,
				fixed: true
			})) || []
	});
	visible.value = true;
}
function identityLabel(platform: string) {
	return platform === "ios" ? "Bundle ID" : platform === "harmonyos" ? "bundleName" : "包名";
}
function identityPlaceholder(platform: string) {
	return `请输入${identityLabel(platform)}`;
}
async function save() {
	if (busy.value) return;
	const name = form.name.trim();
	if (!name) {
		ElMessage.warning("请输入 App 名称");
		return;
	}
	const platforms = form.platforms
		.filter((p) => p.packageName.trim())
		.map((p) => ({ platform: p.platform, packageName: p.packageName.trim() }));
	if (
		platforms.some((p) => !p.packageName) ||
		new Set(platforms.map((p) => p.platform)).size !== platforms.length
	) {
		ElMessage.warning("每个平台只能配置一个有效应用标识");
		return;
	}
	busy.value = true;
	try {
		await request({
			url: apiUrl("app/group/save"),
			method: "POST",
			data: { id: form.id, name, platforms }
		});
		visible.value = false;
		ElMessage.success("App 已保存");
		emit("refresh");
	} catch (e: any) {
		ElMessage.error(e?.message || "保存 App 失败");
	} finally {
		busy.value = false;
	}
}
async function copyAppId() {
	if (!form.id) return;
	try {
		await navigator.clipboard.writeText(form.id);
		ElMessage.success("App ID 已复制");
	} catch {
		const input = document.createElement("textarea");
		input.value = form.id;
		input.style.position = "fixed";
		input.style.opacity = "0";
		document.body.append(input);
		input.select();
		const copied = document.execCommand("copy");
		input.remove();
		if (copied) ElMessage.success("App ID 已复制");
		else ElMessage.error("复制失败，请手动选择 App ID");
	}
}
async function removeGroup(group: AppGroupOption) {
	try {
		await ElMessageBox.confirm(`确定删除空 App「${group.name}」？`, "删除 App", {
			type: "warning"
		});
		busy.value = true;
		await request({ url: apiUrl("app/group/delete"), method: "POST", data: { id: group.id } });
		ElMessage.success("App 已删除");
		if (props.selectedAppId === group.id) emit("select", undefined);
		emit("refresh");
	} catch (e: any) {
		if (e !== "cancel" && e !== "close") ElMessage.error(e?.message || "删除 App 失败");
	} finally {
		busy.value = false;
	}
}
async function removePlatform(app: AppOption): Promise<boolean> {
	try {
		await ElMessageBox.confirm(
			`确定删除 ${platformLabel(app.platform)} 平台档案（${
				app.packageName
			}）？有业务历史时无法删除。`,
			"删除平台",
			{ type: "warning" }
		);
		busy.value = true;
		await request({
			url: apiUrl("app/delete"),
			method: "POST",
			data: { packageName: app.packageName, platform: app.platform }
		});
		ElMessage.success("平台已删除");
		if (props.selectedPackage === app.packageName && props.selectedPlatform === app.platform)
			emit("select", undefined);
		emit("refresh");
		return true;
	} catch (e: any) {
		if (e !== "cancel" && e !== "close") ElMessage.error(e?.message || "删除平台失败");
		return false;
	} finally {
		busy.value = false;
	}
}
function move(app: AppOption, index?: number) {
	choosingUnassigned.value = false;
	moving.value = app;
	movingFormIndex.value = index;
	targetAppId.value = "";
	moveVisible.value = true;
}
function manageUnassigned() {
	const first = unassignedApps.value[0];
	if (!first) return;
	choosingUnassigned.value = true;
	unassignedIdentity.value = `${first.platform}/${first.packageName}`;
	moving.value = first;
	movingFormIndex.value = undefined;
	targetAppId.value = "";
	moveVisible.value = true;
}
async function confirmMove() {
	if (choosingUnassigned.value) {
		moving.value = unassignedApps.value.find(
			(app) => `${app.platform}/${app.packageName}` === unassignedIdentity.value
		);
	}
	if (!moving.value || !targetAppId.value) return;
	busy.value = true;
	try {
		await request({
			url: apiUrl("app/platform/move"),
			method: "POST",
			data: {
				packageName: moving.value.packageName,
				platform: moving.value.platform,
				appId: targetAppId.value
			}
		});
		moveVisible.value = false;
		ElMessage.success("平台已归入 App");
		if (movingFormIndex.value !== undefined) form.platforms.splice(movingFormIndex.value, 1);
		if (
			props.selectedPackage === moving.value.packageName &&
			props.selectedPlatform === moving.value.platform
		)
			emit("select", undefined);
		emit("refresh");
	} catch (e: any) {
		ElMessage.error(e?.message || "归入 App 失败");
	} finally {
		busy.value = false;
	}
}
function moveGroupPlatform(platform: (typeof form.platforms)[number], index: number) {
	const app = props.groups
		.flatMap((group) => group.platforms)
		.find(
			(item) =>
				item.platform === platform.platform && item.packageName === platform.packageName
		);
	if (app) move(app, index);
}
async function removeGroupPlatform(platform: (typeof form.platforms)[number], index: number) {
	const app = props.groups
		.flatMap((group) => group.platforms)
		.find(
			(item) =>
				item.platform === platform.platform && item.packageName === platform.packageName
		);
	if (app && (await removePlatform(app))) form.platforms.splice(index, 1);
}
</script>
<style scoped lang="scss">
.app-group {
	height: 100%;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	min-height: 0;
}
.download-config-hint {
	color: var(--el-text-color-secondary);
	line-height: 1.6;
	font-size: 13px;
}
.head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 40px;
	flex-shrink: 0;
	padding: 0 10px;
	font-size: 14px;
}
.heading {
	display: flex;
	align-items: baseline;
	gap: 8px;
	font-weight: 600;
}
.heading small {
	color: var(--el-text-color-secondary);
	font-size: 12px;
	font-weight: 400;
}
.search {
	padding: 0 10px 10px;
}
.list {
	flex: 1;
	min-height: 0;
	padding: 0 10px;
}
.app-list {
	padding: 0;
	margin: 0;
}
.app-row {
	list-style: none;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	gap: 8px;
	min-height: 62px;
	margin: 0 0 7px;
	padding: 9px 10px;
	border: 1px solid var(--el-border-color-lighter);
	border-radius: 7px;
	color: var(--el-text-color-primary);
	background: var(--el-bg-color);
	cursor: pointer;
	transition: background-color 0.15s ease, border-color 0.15s ease;
}
.app-row:hover {
	border-color: var(--el-color-primary-light-5);
	background: var(--el-fill-color-light);
}
.app-row.is-active {
	border-color: var(--el-color-primary-light-5);
	background: var(--el-color-primary-light-9);
	color: var(--el-color-primary);
}
.all-row {
	min-height: 54px;
}
.row-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.row-copy strong {
	font-size: 13px;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.row-copy > small,
.empty-platform {
	color: var(--el-text-color-secondary);
	font-size: 12px;
}
.platform-summary {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}
.platform-summary :deep(.el-tag) {
	height: 21px;
	padding: 0 6px;
	font-size: 11px;
}
.row-actions {
	display: flex;
	flex-shrink: 0;
}
.row-actions :deep(.el-button + .el-button) {
	margin-left: 2px;
}
.platform-section-title {
	margin: 2px 0 12px 100px;
	color: var(--el-text-color-secondary);
	font-size: 12px;
}
.platform-form-row {
	display: grid;
	grid-template-columns: 1fr 1.5fr auto;
	align-items: center;
	gap: 8px;
	margin-bottom: 8px;
	padding: 12px 10px 2px 0;
	border-top: 1px solid var(--el-border-color-lighter);
}
.platform-form-row :deep(.el-form-item) {
	margin-bottom: 10px;
}
.platform-form-row :deep(.el-form-item__label) {
	width: 78px !important;
}
@media (max-width: 560px) {
	.platform-form-row {
		grid-template-columns: 1fr;
	}
	.platform-form-row > .el-button {
		justify-self: start;
	}
	.app-row {
		padding: 9px 8px;
	}
	.row-actions :deep(.el-button) {
		padding: 4px;
	}
}
</style>
