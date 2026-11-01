<template>
	<div class="crash-page">
		<el-alert
			v-if="optionsError || groupsError"
			:title="optionsError || groupsError"
			type="warning"
			:closable="false"
			show-icon
		/>
		<el-alert
			title="无需发布版本即可接收崩溃；匿名设备也会记录崩溃；班刻仅补报异常类型与脱敏代码堆栈，不包含异常消息及排班内容。"
			type="info"
			:closable="false"
			show-icon
		/>
		<div class="toolbar">
			<app-management
				:groups="appGroups"
				:loading="groupsLoading"
				:error="groupsError"
				@refresh="refreshManagedApps"
			/>
			<el-select
				v-model="appChoice"
				class="app-selector"
				placeholder="全部 App"
				clearable
				filterable
				:loading="optionsLoading"
				@change="changeApp"
			>
				<el-option label="全部 App" value="" />
				<el-option
					v-for="group in appGroups.filter((g) => !g.unassigned)"
					:key="`group:${group.id}`"
					:label="`App · ${group.name}`"
					:value="`group:${group.id}`"
				/>
				<el-option
					v-if="appGroups.some((g) => g.unassigned)"
					label="未归属"
					value="unassigned"
				/>
				<el-option
					v-for="app in appOptions"
					:key="appIdentity(app)"
					:label="`${platformLabel(app.platform)} · ${app.name || app.packageName}（${
						app.packageName
					}）`"
					:value="appIdentity(app)"
				/>
			</el-select>
			<el-select v-model="query.anonymous" placeholder="上报身份" clearable @change="search">
				<el-option label="全部身份" value="" /><el-option
					label="匿名设备"
					value="true"
				/><el-option label="会员设备" value="false" />
			</el-select>
			<el-input-number
				v-model="query.versionCode"
				:min="0"
				:precision="0"
				placeholder="版本代码，0为全部"
				@change="search"
			/>
			<el-input
				v-model="query.keyword"
				placeholder="异常、机型或页面关键字"
				clearable
				@keyup.enter="search"
				@clear="search"
			/>
			<el-input
				v-model="query.brand"
				placeholder="品牌"
				clearable
				@keyup.enter="search"
				@clear="search"
			/>
			<el-input
				v-model="query.model"
				placeholder="机型"
				clearable
				@keyup.enter="search"
				@clear="search"
			/>
			<el-input
				v-model="query.exceptionType"
				placeholder="异常类型"
				clearable
				@keyup.enter="search"
				@clear="search"
			/>
			<el-select
				v-model="query.updateState"
				placeholder="升级状态"
				clearable
				@change="search"
			>
				<el-option label="安装失败" value="install_failed" />
				<el-option label="安装器已打开" value="installer_opened" />
				<el-option label="等待安装权限" value="waiting_install_permission" />
			</el-select>
			<el-date-picker
				v-model="dateRange"
				type="daterange"
				value-format="YYYY-MM-DD"
				start-placeholder="开始日期"
				end-placeholder="结束日期"
				@change="search"
			/>
			<el-button @click="refresh">刷新</el-button>
		</div>

		<el-table v-loading="loading" :data="rows" border stripe>
			<el-table-column prop="platform" label="平台" width="90" />
			<el-table-column
				prop="package_name"
				label="应用标识"
				min-width="230"
				show-overflow-tooltip
			/>
			<el-table-column prop="crash_time" label="发生时间" width="170" />
			<el-table-column label="App版本" width="125"
				><template #default="{ row }"
					>{{ text(row.version_name, "-") }} / {{ row.version_code || 0 }}</template
				></el-table-column
			>
			<el-table-column label="上报身份" width="110"
				><template #default="{ row }">{{
					row.user_id ? "会员设备" : "匿名设备"
				}}</template></el-table-column
			>
			<el-table-column label="设备" min-width="170"
				><template #default="{ row }"
					>{{ text(row.device_brand) }} {{ text(row.device_model) }}</template
				></el-table-column
			>
			<el-table-column label="系统版本" width="120"
				><template #default="{ row }">{{
					text(row.os_version, row.android_version)
				}}</template></el-table-column
			>
			<el-table-column
				prop="exception_type"
				label="异常类型"
				min-width="190"
				show-overflow-tooltip
			/>
			<el-table-column
				prop="exception_message"
				label="异常摘要"
				min-width="240"
				show-overflow-tooltip
			/>
			<el-table-column
				prop="current_page"
				label="当前页面"
				min-width="150"
				show-overflow-tooltip
			/>
			<el-table-column label="升级状态" width="140"
				><template #default="{ row }">{{
					stateLabel(row.update_state)
				}}</template></el-table-column
			>
			<el-table-column label="操作" width="130" fixed="right">
				<template #default="{ row }">
					<el-button
						v-if="canOperate('crash', 'info')"
						link
						type="primary"
						:disabled="detailLoading"
						@click="showInfo(row)"
						>详情</el-button
					>
					<el-button
						v-if="canOperate('crash', 'delete')"
						link
						type="danger"
						:disabled="!!deleteId"
						@click="remove(row)"
						>删除</el-button
					>
				</template>
			</el-table-column>
		</el-table>
		<el-pagination
			v-model:current-page="query.page"
			v-model:page-size="query.size"
			:total="total"
			:page-sizes="[10, 20, 50]"
			layout="total, sizes, prev, pager, next"
			@current-change="load"
			@size-change="search"
		/>

		<el-dialog
			v-model="detailVisible"
			title="崩溃详情"
			width="min(820px, 94vw)"
			destroy-on-close
		>
			<el-descriptions :column="2" border>
				<el-descriptions-item label="上报身份">{{
					detail.user_id ? "会员设备" : "匿名设备"
				}}</el-descriptions-item>
				<el-descriptions-item label="设备标识哈希">{{
					detail.device_id || "-"
				}}</el-descriptions-item>
				<el-descriptions-item label="平台">{{
					detail.platform || "-"
				}}</el-descriptions-item>
				<el-descriptions-item label="应用标识">{{
					detail.package_name || "-"
				}}</el-descriptions-item>
				<el-descriptions-item label="发生时间">{{
					detail.crash_time || "-"
				}}</el-descriptions-item>
				<el-descriptions-item label="上报时间">{{
					detail.createTime || "-"
				}}</el-descriptions-item>
				<el-descriptions-item label="版本"
					>{{ text(detail.version_name, "-") }} /
					{{ detail.version_code || 0 }}</el-descriptions-item
				>
				<el-descriptions-item label="设备"
					>{{ text(detail.device_brand) }}
					{{ text(detail.device_model) }}</el-descriptions-item
				>
				<el-descriptions-item label="系统版本">{{
					detail.os_version || detail.android_version || "-"
				}}</el-descriptions-item>
				<el-descriptions-item label="网络">{{
					detail.network_type || "-"
				}}</el-descriptions-item>
				<el-descriptions-item label="当前页面">{{
					detail.current_page || "-"
				}}</el-descriptions-item>
				<el-descriptions-item label="目标版本">{{
					detail.update_version_code || "-"
				}}</el-descriptions-item>
				<el-descriptions-item label="升级状态">{{
					stateLabel(detail.update_state)
				}}</el-descriptions-item>
				<el-descriptions-item label="异常类型" :span="2">{{
					detail.exception_type || "-"
				}}</el-descriptions-item>
				<el-descriptions-item label="异常信息" :span="2">{{
					detail.exception_message || "-"
				}}</el-descriptions-item>
			</el-descriptions>
			<div class="stack-title">完整堆栈</div>
			<pre class="stack">{{ detail.stack_trace || "无堆栈信息" }}</pre>
		</el-dialog>
	</div>
</template>

<script lang="ts" setup>
import AppManagement from "../components/app-management.vue";
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { request } from "/@/cool/service/request";
import {
	apiUrl,
	appIdentity,
	canOperate,
	platformLabel,
	useAppOptions,
	useAppGroups
} from "../service";
async function refreshManagedApps() {
	await Promise.all([loadAppOptions(), loadAppGroups()]);
	await load();
}
const { appOptions, optionsError, optionsLoading, loadAppOptions } = useAppOptions("crash");
const { appGroups, groupsError, groupsLoading, loadAppGroups } = useAppGroups("crash");
const rows = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const detailVisible = ref(false);
const detail = ref<any>({});
const detailLoading = ref(false);
const deleteId = ref("");
const dateRange = ref<string[]>([]);
const query = reactive({
	anonymous: "",
	page: 1,
	size: 20,
	keyword: "",
	packageName: "",
	platform: "",
	appId: "",
	unassigned: false,
	versionCode: 0,
	brand: "",
	model: "",
	exceptionType: "",
	updateState: "",
	startTime: "",
	endTime: ""
});
let loadGeneration = 0;
let detailGeneration = 0;
const appChoice = ref("");
function text(...values: any[]) {
	for (const value of values) {
		const valueText = String(value ?? "").trim();
		if (valueText && valueText !== "undefined" && valueText !== "null") return valueText;
	}
	return "-";
}
function stateLabel(value: string) {
	return (
		(
			{
				install_failed: "安装失败",
				installer_opened: "安装器已打开",
				waiting_install_permission: "等待安装权限",
				install_start: "开始安装"
			} as any
		)[value] ||
		value ||
		"-"
	);
}
async function load() {
	const current = ++loadGeneration;
	loading.value = true;
	rows.value = [];
	total.value = 0;
	try {
		const result: any = await request({
			url: apiUrl("crash/page"),
			method: "POST",
			data: {
				...query,
				startTime: dateRange.value?.[0] ? `${dateRange.value[0]} 00:00:00` : "",
				endTime: dateRange.value?.[1] ? `${dateRange.value[1]} 23:59:59` : ""
			}
		});
		if (current !== loadGeneration) return;
		rows.value = result?.list || [];
		total.value = result?.pagination?.total || 0;
	} catch (error: any) {
		if (current === loadGeneration) ElMessage.error(error?.message || "加载崩溃日志失败");
	} finally {
		if (current === loadGeneration) loading.value = false;
	}
}
function search() {
	query.page = 1;
	detailGeneration++;
	detailLoading.value = false;
	detailVisible.value = false;
	void load();
}
function changeApp(choice = appChoice.value) {
	if (choice === "unassigned") {
		query.packageName = "";
		query.platform = "";
		query.appId = "";
		query.unassigned = true;
		search();
		return;
	}
	if (choice.startsWith("group:")) {
		query.packageName = "";
		query.platform = "";
		query.appId = choice.slice(6);
		query.unassigned = false;
		search();
		return;
	}
	const app = appOptions.value.find((item) => appIdentity(item) === choice);
	query.packageName = app?.packageName || "";
	query.platform = app?.platform || "";
	query.appId = app?.appId || "";
	query.unassigned = false;
	search();
}
async function refresh() {
	await Promise.all([load(), loadAppOptions(), loadAppGroups()]);
}
async function showInfo(row: any) {
	const current = ++detailGeneration;
	detailLoading.value = true;
	try {
		const result: any = await request({
			url: apiUrl("crash/info"),
			method: "GET",
			params: { id: String(row.id) }
		});
		if (current !== detailGeneration) return;
		detail.value = result || {};
		detailVisible.value = true;
	} catch (error: any) {
		if (current === detailGeneration) ElMessage.error(error?.message || "读取详情失败");
	} finally {
		if (current === detailGeneration) detailLoading.value = false;
	}
}
async function remove(row: any) {
	if (deleteId.value) return;
	deleteId.value = String(row.id);
	try {
		await ElMessageBox.confirm(`确定删除 ${row.package_name} 的这条崩溃日志吗？`, "操作确认", {
			type: "warning"
		});
		await request({
			url: apiUrl("crash/delete"),
			method: "POST",
			data: { id: String(row.id) }
		});
		ElMessage.success("已删除");
		await refresh();
	} catch (error: any) {
		if (error !== "cancel" && error !== "close") ElMessage.error(error?.message || "删除失败");
	} finally {
		deleteId.value = "";
	}
}
onMounted(refresh);
</script>

<style scoped>
.crash-page {
	padding: 20px;
	min-height: 100%;
	box-sizing: border-box;
	background: var(--el-bg-color);
}
.toolbar {
	display: flex;
	gap: 10px;
	flex-wrap: wrap;
	margin-bottom: 16px;
}
.toolbar .el-input {
	width: 180px;
}
.toolbar .el-select {
	width: 160px;
}
.toolbar .app-selector {
	width: 290px;
}
.crash-page > .el-alert {
	margin-bottom: 12px;
}
.crash-page :deep(.el-descriptions__content) {
	overflow-wrap: anywhere;
}
.crash-page .el-pagination {
	justify-content: flex-end;
	margin-top: 16px;
}
.stack-title {
	margin: 18px 0 8px;
	font-weight: 600;
}
.stack {
	max-height: 360px;
	overflow: auto;
	padding: 14px;
	margin: 0;
	color: var(--el-text-color-primary);
	background: var(--el-fill-color-light);
	white-space: pre-wrap;
	word-break: break-word;
	border-radius: 4px;
}
</style>
