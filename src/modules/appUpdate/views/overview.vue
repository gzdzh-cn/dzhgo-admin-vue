<template>
	<div class="overview-page">
		<el-alert
			v-if="requestErrors.length"
			class="overview-error"
			type="warning"
			:closable="false"
			show-icon
		>
			<template #title>部分统计接口加载失败：{{ requestErrors.join("、") }}</template>
			<el-button size="small" :loading="loading" @click="refresh">重试加载</el-button>
		</el-alert>
		<el-alert
			v-if="optionsError || groupsError"
			:title="optionsError || groupsError"
			type="warning"
			:closable="false"
			show-icon
		/>
		<el-alert
			v-if="!loading && !optionsLoading && !optionsError && !appOptions.length"
			title="暂无 App 档案。请通过“应用管理”登记名称、平台和应用标识；无需上传版本即可接收统计。"
			type="info"
			:closable="false"
			show-icon
		/>
		<el-alert
			v-if="!loading && summaryReady && displayNumber(summary.totalDevices) === 0"
			:title="
				displayNumber(summary.reportedDevices) === 0
					? '尚未收到此 App 的设备上报。请确认新版 App 已安装、统计已开启，且后台已部署统计接口。仅检查更新不会产生设备记录。'
					: '当前筛选条件下没有设备，请清除版本、品牌、机型或在线筛选后重试。'
			"
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
			<el-select v-model="filters.range" @change="changeFilters"
				><el-option label="今日" value="today" /><el-option
					label="近7天"
					value="7d" /><el-option label="近30天" value="30d" /><el-option
					label="近90天"
					value="90d"
			/></el-select>
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
			<el-select
				v-model="filters.versionCode"
				placeholder="版本代码"
				:disabled="!filters.packageName"
				clearable
				@change="changeFilters"
			>
				<el-option label="全部版本" :value="0" />
				<el-option
					v-for="item in versionOptions"
					:key="item.value"
					:label="item.label"
					:value="item.value"
				/>
			</el-select>
			<el-select
				v-model="filters.brand"
				placeholder="品牌"
				clearable
				filterable
				@change="changeFilters"
			>
				<el-option v-for="item in brandOptions" :key="item" :label="item" :value="item" />
			</el-select>
			<el-select
				v-model="filters.model"
				placeholder="机型"
				clearable
				filterable
				@change="changeFilters"
			>
				<el-option v-for="item in modelOptions" :key="item" :label="item" :value="item" />
			</el-select>
			<el-select v-model="filters.online" placeholder="在线状态" @change="changeFilters">
				<el-option label="全部" value="all" />
				<el-option label="在线" value="true" />
				<el-option label="离线" value="false" />
			</el-select>
			<el-button type="primary" :loading="loading" @click="refresh">刷新</el-button>
		</div>

		<div class="scope-tip">
			{{ filters.packageName || "全部 App" }}：设备按 App
			与设备标识去重统计；iOS/鸿蒙不提供市场最新版基准。后台版本、待升级、覆盖率及 APK
			指标仅适用于 Android。 最近上报：{{
				summaryReady ? displayText(summary.lastReportedAt, "暂无上报") : "暂不可用"
			}}。 活跃趋势按北京时间自然日去重，自接入新版后累积，历史未上报日期不补造。
		</div>
		<div class="cards" v-loading="loading">
			<div v-for="item in cards" :key="item.key" class="stat-card">
				<div class="stat-label">{{ item.label }}</div>
				<div class="stat-value">{{ summaryReady ? item.value : "—" }}</div>
				<div class="stat-tip">{{ item.tip }}</div>
			</div>
		</div>
		<div class="charts">
			<div class="chart-card">
				<div class="chart-title">每日活跃设备趋势（北京时间）</div>
				<div ref="activeChart" class="chart" />
			</div>
			<div class="chart-card">
				<div class="chart-title">APK下载趋势（仅 Android）</div>
				<div v-if="!metricAvailable(summary, 'downloads')">
					不适用：{{ metricReason(summary, "downloads") }}
				</div>
				<div
					v-show="metricAvailable(summary, 'downloads')"
					ref="downloadChart"
					class="chart"
				/>
			</div>
			<div class="chart-card">
				<div class="chart-title">历史市场打开事件</div>
				<div ref="storeChart" class="chart" />
			</div>
			<div class="chart-card">
				<div class="chart-title">品牌分布</div>
				<div ref="brandChart" class="chart" />
			</div>
			<div class="chart-card">
				<div class="chart-title">机型分布</div>
				<div ref="modelChart" class="chart" />
			</div>
			<div class="chart-card">
				<div class="chart-title">App版本分布</div>
				<div ref="versionChart" class="chart" />
			</div>
		</div>
		<div class="funnel-card">
			<div class="chart-title">更新事件（下载阶段仅 Android）</div>
			<div class="funnel">
				<div v-for="item in funnelItems" :key="item.key" class="funnel-item">
					<span>{{ item.label }}</span
					><b>{{ item.value }}</b>
				</div>
			</div>
		</div>
		<div class="device-card">
			<div class="section-title">实时设备 <small>每10秒刷新</small></div>
			<el-table v-loading="deviceLoading" :data="devices" border stripe>
				<el-table-column label="状态" width="75"
					><template #default="{ row }"
						><el-tag
							:type="
								displayNumber(row.is_online ?? row.isOnline) === 1
									? 'success'
									: 'info'
							"
							>{{
								displayNumber(row.is_online ?? row.isOnline) === 1 ? "在线" : "离线"
							}}</el-tag
						></template
					></el-table-column
				>
				<el-table-column label="平台" width="90"
					><template #default="{ row }">{{
						platformLabel(displayText(row.platform))
					}}</template></el-table-column
				>
				<el-table-column
					prop="package_name"
					label="应用标识"
					min-width="230"
					show-overflow-tooltip
				/>
				<el-table-column label="用户" min-width="150"
					><template #default="{ row }">{{
						displayText(row.user_name, row.userName, row.USER_NAME, "匿名设备")
					}}</template></el-table-column
				>
				<el-table-column label="品牌/机型" min-width="220">
					<template #default="{ row }">
						<el-tooltip effect="dark" placement="top-start">
							<template #content
								><div class="device-detail-tooltip">
									{{ deviceDetail(row) }}
								</div></template
							>
							<div class="device-model-cell">
								<div>{{ rawDeviceName(row) || "未知机型" }}</div>
								<small v-if="deviceCodes(row)">{{ deviceCodes(row) }}</small>
							</div>
						</el-tooltip>
					</template>
				</el-table-column>
				<el-table-column label="IP" min-width="145"
					><template #default="{ row }">{{
						displayText(row.ip_address, row.ipAddress, row.IP_ADDRESS, "-")
					}}</template></el-table-column
				>
				<el-table-column label="IP地区" min-width="120"
					><template #default="{ row }">{{
						displayText(row.ip_region, row.ipRegion, row.IP_REGION, "-")
					}}</template></el-table-column
				>
				<el-table-column label="App版本" width="110"
					><template #default="{ row }">{{
						displayText(row.version_name, row.versionName, row.VERSION_NAME, "-")
					}}</template></el-table-column
				>
				<el-table-column label="系统版本" width="120"
					><template #default="{ row }">{{
						displayText(row.os_version, row.osVersion, row.OS_VERSION, "-")
					}}</template></el-table-column
				>
				<el-table-column label="电量" width="90"
					><template #default="{ row }">{{
						displayNumber(row.battery ?? row.BATTERY, -1) >= 0
							? `${displayNumber(row.battery ?? row.BATTERY)}%`
							: "-"
					}}</template></el-table-column
				>
				<el-table-column label="网络" width="100"
					><template #default="{ row }">{{
						displayText(row.network_type, row.networkType, row.NETWORK_TYPE, "-")
					}}</template></el-table-column
				>
				<el-table-column label="最后心跳" min-width="165"
					><template #default="{ row }">{{
						displayText(row.last_seen_at, row.lastSeenAt, row.LAST_SEEN_AT, "-")
					}}</template></el-table-column
				>
			</el-table>
			<el-pagination
				v-model:current-page="devicePage.page"
				v-model:page-size="devicePage.size"
				:total="deviceTotal"
				:page-sizes="[10, 20, 50]"
				layout="total, sizes, prev, pager, next"
				@current-change="changeDevicePage"
				@size-change="changeDeviceSize"
			/>
		</div>
	</div>
</template>

<script lang="ts" setup>
import AppManagement from "../components/app-management.vue";
import {
	computed,
	nextTick,
	onActivated,
	onBeforeUnmount,
	onDeactivated,
	onMounted,
	reactive,
	ref
} from "vue";
import * as echarts from "echarts";
import { request } from "/@/cool/service/request";
import { apiUrl, appIdentity, platformLabel, useAppOptions, useAppGroups } from "../service";
async function refreshManagedApps() {
	await Promise.all([loadAppOptions(), loadAppGroups()]);
	await refresh();
}
const { appOptions, optionsError, optionsLoading, loadAppOptions } = useAppOptions("overview");
const { appGroups, groupsError, groupsLoading, loadAppGroups } = useAppGroups("overview");
const filters = reactive({
	range: "7d",
	packageName: "",
	platform: "",
	appId: "",
	unassigned: false,
	versionCode: 0,
	brand: "",
	model: "",
	online: "all"
});
const brandOptions = ref<string[]>([]);
const modelOptions = ref<string[]>([]);
const versionOptions = ref<{ label: string; value: number }[]>([]);
const loading = ref(false);
const deviceLoading = ref(false);
const summary = ref<any>({});
const summaryReady = ref(false);
const devices = ref<any[]>([]);
const deviceTotal = ref(0);
const funnel = ref<any>({});
const requestErrors = ref<string[]>([]);
const devicePage = reactive({ page: 1, size: 20 });
const activeChart = ref<HTMLElement>();
const downloadChart = ref<HTMLElement>();
const storeChart = ref<HTMLElement>();
const appChoice = ref("");
const brandChart = ref<HTMLElement>();
const modelChart = ref<HTMLElement>();
const versionChart = ref<HTMLElement>();
let charts: echarts.ECharts[] = [];
let timer: number | undefined;
let overviewGeneration = 0;
let deviceGeneration = 0;
let active = false;
let lastOptionsRefresh = 0;
function displayText(...values: any[]) {
	for (const value of values) {
		if (value === undefined || value === null) continue;
		const text = String(value).trim();
		if (text && !["undefined", "null", "nan"].includes(text.toLowerCase())) return text;
	}
	return "";
}
function displayNumber(value: any, fallback = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}
const deviceMarketingAliases: Record<string, string> = {
	"OPPO PCDM10": "OPPO Reno Z（全网通版）"
};
function rawDeviceName(row: any) {
	return displayText(
		row?.device_full,
		row?.deviceFull,
		row?.DEVICE_FULL,
		displayText(row?.device_brand, row?.deviceBrand, row?.brand) +
			" " +
			displayText(row?.device_model, row?.deviceModel, row?.model)
	);
}
function deviceFullName(row: any) {
	const raw = rawDeviceName(row);
	const alias = deviceMarketingAliases[raw.replace(/\s+/g, " ").trim().toUpperCase()];
	return alias || raw || "未知机型";
}
function deviceCodes(row: any) {
	const product = displayText(row?.device_product, row?.deviceProduct, row?.DEVICE_PRODUCT);
	const code = displayText(row?.device_code, row?.deviceCode, row?.DEVICE_CODE);
	const values = [product && `产品 ${product}`, code && `设备 ${code}`].filter(Boolean);
	return values.join(" · ");
}
function deviceDetail(row: any) {
	const raw = rawDeviceName(row);
	const marketed = deviceFullName(row);
	const values = [
		marketed,
		raw && marketed !== raw ? `原始型号 ${raw}` : "",
		deviceCodes(row),
		row?.os_name || row?.osName ? `系统 ${displayText(row?.os_name, row?.osName)}` : "",
		row?.os_version || row?.osVersion
			? `版本 ${displayText(row?.os_version, row?.osVersion)}`
			: ""
	].filter(Boolean);
	return values.join("\n");
}
function metricAvailable(data: any, key: string): boolean {
	return data?.metricAvailability?.[key]?.available === true;
}
function metricReason(data: any, key: string): string {
	return data?.metricAvailability?.[key]?.reason || "指标适用状态尚未返回";
}
function metricValue(data: any, key: string, value: any): any {
	const state = data?.metricAvailability?.[key];
	return !state ? "暂不可用" : state.available ? value : "不适用";
}
const cards = computed(() => [
	{
		key: "total",
		label: "设备总数",
		value: displayNumber(summary.value.totalDevices),
		tip: "同一 App 按设备标识去重"
	},
	{
		key: "online",
		label: "实时在线",
		value: displayNumber(summary.value.onlineDevices),
		tip: "90秒内有心跳"
	},
	{
		key: "active",
		label: "近24小时活跃",
		value: displayNumber(summary.value.active24hDevices),
		tip: "最近一天"
	},
	{
		key: "version",
		label: "Android 后台最新版本",
		value: metricValue(
			summary.value,
			"latestVersion",
			displayText(summary.value.latestVersion, "-")
		),
		tip: metricAvailable(summary.value, "latestVersion")
			? `Code ${displayNumber(summary.value.latestVersionCode)}`
			: metricReason(summary.value, "latestVersion")
	},
	{
		key: "coverage",
		label: "最新版本覆盖率",
		value: metricValue(
			summary.value,
			"latestCoverage",
			`${displayNumber(summary.value.latestCoverage).toFixed(1)}%`
		),
		tip: metricAvailable(summary.value, "latestCoverage")
			? "仅 Android：有后台版本基准的24小时活跃设备"
			: metricReason(summary.value, "latestCoverage")
	},
	{
		key: "pending",
		label: "待升级设备",
		value: metricValue(
			summary.value,
			"pendingUpgrade",
			displayNumber(summary.value.pendingUpgrade)
		),
		tip: metricAvailable(summary.value, "pendingUpgrade")
			? "仅 Android：低于所属 App 后台版本"
			: metricReason(summary.value, "pendingUpgrade")
	},
	{
		key: "low",
		label: "低于最低版本",
		value: metricValue(
			summary.value,
			"belowMinimum",
			displayNumber(summary.value.belowMinimum)
		),
		tip: metricAvailable(summary.value, "belowMinimum")
			? "仅 Android：所属 App 最低支持版本"
			: metricReason(summary.value, "belowMinimum")
	},
	{
		key: "download",
		label: "APK下载",
		value: metricValue(summary.value, "downloads", displayNumber(summary.value.downloads)),
		tip: metricAvailable(summary.value, "downloads")
			? "仅 Android APK 下载统计"
			: metricReason(summary.value, "downloads")
	},
	{
		key: "store",
		label: "历史市场打开",
		value: displayNumber(summary.value.storeOpens),
		tip: "仅实际记录的事件；官方更新弹窗不等于市场跳转"
	},
	{
		key: "success",
		label: "观测到版本升级",
		value: displayNumber(summary.value.upgradeSuccess),
		tip: "快照版本代码升高；不能证明市场下载安装过程"
	},
	{
		key: "failed",
		label: "升级失败",
		value: metricValue(
			summary.value,
			"upgradeFailed",
			displayNumber(summary.value.upgradeFailed)
		),
		tip: metricAvailable(summary.value, "upgradeFailed")
			? "仅 Android 安装失败事件"
			: metricReason(summary.value, "upgradeFailed")
	}
]);
const funnelItems = computed(() => [
	{ key: "check", label: "检查更新", value: displayNumber(funnel.value.check) },
	{ key: "available", label: "发现新版本", value: displayNumber(funnel.value.update_available) },
	{
		key: "start",
		label: "开始下载",
		value: metricValue(
			funnel.value,
			"download_start",
			displayNumber(funnel.value.download_start)
		)
	},
	{
		key: "download",
		label: "APK下载成功",
		value: metricValue(
			funnel.value,
			"download_success",
			displayNumber(funnel.value.download_success)
		)
	},
	{ key: "store", label: "历史市场打开", value: displayNumber(funnel.value.store_open) },
	{ key: "install", label: "观测到版本升级", value: displayNumber(funnel.value.install_success) }
]);
function queryParams(source = filters) {
	return { ...source, online: source.online === "all" ? "" : source.online };
}
function rowsOf(value: any) {
	return Array.isArray(value?.list) ? value.list : [];
}
function changeApp(choice = appChoice.value) {
	if (choice === "unassigned") {
		filters.appId = "";
		filters.packageName = "";
		filters.platform = "";
		filters.unassigned = true;
		filters.versionCode = 0;
		changeFilters();
		return;
	}
	if (choice.startsWith("group:")) {
		filters.appId = choice.slice(6);
		filters.packageName = "";
		filters.platform = "";
		filters.unassigned = false;
		filters.versionCode = 0;
		filters.brand = "";
		filters.model = "";
		filters.online = "all";
		changeFilters();
		return;
	}
	const app = appOptions.value.find((item) => appIdentity(item) === choice);
	filters.packageName = app?.packageName || "";
	filters.platform = app?.platform || "";
	filters.appId = app?.appId || "";
	filters.unassigned = false;
	filters.versionCode = 0;
	filters.brand = "";
	filters.model = "";
	filters.online = "all";
	brandOptions.value = [];
	modelOptions.value = [];
	versionOptions.value = [];
	changeFilters();
}
function changeFilters() {
	devicePage.page = 1;
	summary.value = {};
	summaryReady.value = false;
	funnel.value = {};
	devices.value = [];
	deviceTotal.value = 0;
	charts.forEach((chart) => chart.clear());
	void loadAll();
}
function changeDeviceSize() {
	devicePage.page = 1;
	void loadDevices();
}
function changeDevicePage() {
	void loadDevices();
}
function statisticsError(error: any): string {
	const message = String(error?.message || "");
	if (
		error?.code === 403 ||
		error?.response?.status === 403 ||
		/权限|无权|forbidden/i.test(message)
	) {
		return "无权访问，请检查统计权限";
	}
	if (/Illegal mix of collations|Error 1267/i.test(message)) {
		return "数据库排序规则不兼容，请更新后台后重试";
	}
	if (Number(error?.code) >= 500) return "统计服务暂不可用，请稍后重试";
	return message || "加载失败";
}
async function loadDevices(source = filters) {
	const snapshot = queryParams(source);
	const current = ++deviceGeneration;
	deviceLoading.value = true;
	try {
		const payload: any = await request({
			url: apiUrl("overview/device/page"),
			handleErrorLocally: true,
			method: "POST",
			data: { ...snapshot, page: devicePage.page, size: devicePage.size }
		});
		if (current !== deviceGeneration) return;
		devices.value = rowsOf(payload);
		deviceTotal.value = displayNumber(payload?.pagination?.total);
	} catch (error: any) {
		if (current !== deviceGeneration) return;
		devices.value = [];
		deviceTotal.value = 0;
		requestErrors.value = [
			...new Set([...requestErrors.value, `设备列表：${statisticsError(error)}`])
		];
	} finally {
		if (current === deviceGeneration) deviceLoading.value = false;
	}
}
async function refresh() {
	await loadAll(true);
}
async function loadAll(refreshOptions = false) {
	const current = ++overviewGeneration;
	++deviceGeneration;
	const snapshot = { ...filters };
	loading.value = true;
	requestErrors.value = [];
	const errors: string[] = [];
	const get = async (name: string, source = snapshot) => {
		try {
			return (await request({
				url: apiUrl(`overview/${name}`),
				handleErrorLocally: true,
				method: "GET",
				params: queryParams(source)
			})) as any;
		} catch (error: any) {
			const labels: Record<string, string> = {
				summary: "统计摘要",
				trend: "活跃趋势",
				"brand-distribution": "品牌分布",
				"model-distribution": "机型分布",
				"version-distribution": "版本分布",
				"update-funnel": "升级漏斗"
			};
			errors.push(`${labels[name] || name}：${statisticsError(error)}`);
			return null;
		}
	};
	const optionFilters = { ...snapshot, versionCode: 0, brand: "", model: "", online: "all" };
	try {
		const refreshApps = refreshOptions || Date.now() - lastOptionsRefresh > 60000;
		const results = await Promise.all([
			get("summary"),
			get("trend"),
			get("brand-distribution"),
			get("model-distribution"),
			get("version-distribution"),
			get("update-funnel"),
			get("brand-distribution", optionFilters),
			get("model-distribution", optionFilters),
			snapshot.packageName
				? get("version-distribution", optionFilters)
				: Promise.resolve(null),
			refreshApps ? Promise.all([loadAppOptions(), loadAppGroups()]) : Promise.resolve()
		]);
		if (current !== overviewGeneration) return;
		if (refreshApps && !optionsError.value) lastOptionsRefresh = Date.now();
		const [
			stats,
			trend,
			brands,
			models,
			versions,
			events,
			optionBrands,
			optionModels,
			optionVersions
		] = results;
		summary.value = stats || {};
		summaryReady.value = stats !== null;
		funnel.value = events || {};
		requestErrors.value = [...new Set(errors)];
		brandOptions.value = [
			...new Set(
				rowsOf(optionBrands)
					.map((item: any) => displayText(item.name))
					.filter(Boolean)
			)
		] as string[];
		modelOptions.value = [
			...new Set(
				rowsOf(optionModels)
					.map((item: any) => displayText(item.model))
					.filter(Boolean)
			)
		] as string[];
		versionOptions.value = rowsOf(optionVersions)
			.map((item: any) => ({
				value: Number(item.code),
				label: `${item.name || "未知版本"}（Code ${item.code}）`
			}))
			.filter((item: any) => item.value > 0);
		await nextTick();
		if (current !== overviewGeneration) return;
		draw(trend || {}, rowsOf(brands), rowsOf(models), rowsOf(versions));
		await loadDevices(snapshot);
	} finally {
		if (current === overviewGeneration) loading.value = false;
	}
}
function baseChart(el: HTMLElement | undefined) {
	if (!el) return undefined;
	const chart = echarts.init(el);
	charts.push(chart);
	return chart;
}
function draw(trend: any, brands: any[], models: any[], versions: any[]) {
	charts.forEach((c) => c.dispose());
	charts = [];
	const active = baseChart(activeChart.value);
	const downloads = baseChart(downloadChart.value);
	const store = baseChart(storeChart.value);
	const brand = baseChart(brandChart.value);
	const model = baseChart(modelChart.value);
	const version = baseChart(versionChart.value);
	const activeRows = trend.active || [];
	const downloadRows = trend.downloads || [];
	const storeRows = trend.storeOpens || [];
	active?.setOption({
		tooltip: { trigger: "axis" },
		xAxis: { type: "category", data: activeRows.map((x: any) => displayText(x.date, "-")) },
		yAxis: { type: "value" },
		series: [
			{
				type: "line",
				smooth: true,
				data: activeRows.map((x: any) => displayNumber(x.value)),
				areaStyle: {}
			}
		]
	});
	downloads?.setOption({
		tooltip: { trigger: "axis" },
		xAxis: { type: "category", data: downloadRows.map((x: any) => displayText(x.date, "-")) },
		yAxis: { type: "value" },
		series: [{ type: "bar", data: downloadRows.map((x: any) => displayNumber(x.value)) }]
	});
	store?.setOption({
		tooltip: { trigger: "axis" },
		xAxis: { type: "category", data: storeRows.map((x: any) => displayText(x.date, "-")) },
		yAxis: { type: "value", minInterval: 1 },
		series: [{ type: "bar", data: storeRows.map((x: any) => displayNumber(x.value)) }]
	});
	brand?.setOption({
		tooltip: { trigger: "item" },
		series: [
			{
				type: "pie",
				radius: ["35%", "70%"],
				data: brands.map((x) => ({
					name: displayText(x.name, x.brand, x.device_brand, "未知"),
					value: displayNumber(x.value)
				}))
			}
		]
	});
	model?.setOption({
		tooltip: { trigger: "axis" },
		xAxis: {
			type: "category",
			data: models.map((x) =>
				displayText(
					x.name,
					x.brand && x.model ? `${x.brand} ${x.model}` : "",
					x.model,
					x.device_model,
					"未知"
				)
			),
			axisLabel: { rotate: 25 }
		},
		yAxis: { type: "value" },
		series: [{ type: "bar", data: models.map((x) => displayNumber(x.value)) }]
	});
	version?.setOption({
		tooltip: { trigger: "axis" },
		xAxis: {
			type: "category",
			data: versions.map(
				(x) =>
					`${filters.packageName ? "" : `${x.packageName} · `}${displayText(
						`${platformLabel(x.platform)} ${x.name || "未知版本"}`,
						"未知"
					)} (${x.code})`
			)
		},
		yAxis: { type: "value" },
		series: [{ type: "bar", data: versions.map((x) => displayNumber(x.value)) }]
	});
}
function resize() {
	charts.forEach((chart) => chart.resize());
}
function start() {
	if (active) return;
	active = true;
	void loadAll(true);
	timer = window.setInterval(() => {
		if (!loading.value) void loadAll();
	}, 10000);
	window.addEventListener("resize", resize);
}
function stop() {
	active = false;
	overviewGeneration++;
	deviceGeneration++;
	loading.value = false;
	deviceLoading.value = false;
	if (timer) window.clearInterval(timer);
	timer = undefined;
	window.removeEventListener("resize", resize);
}
onMounted(start);
onActivated(start);
onDeactivated(stop);
onBeforeUnmount(() => {
	stop();
	charts.forEach((chart) => chart.dispose());
});
</script>

<style scoped>
.overview-page {
	min-height: 100%;
	padding: 20px;
	box-sizing: border-box;
	background: var(--el-bg-color-page);
}
.overview-error,
.overview-page > .el-alert {
	margin-bottom: 12px;
}
.scope-tip {
	color: var(--el-text-color-secondary);
	margin-bottom: 14px;
	font-size: 13px;
	line-height: 1.7;
	overflow-wrap: anywhere;
}
.toolbar {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	margin-bottom: 16px;
}
.toolbar .el-input {
	width: 190px;
}
.toolbar .el-select {
	width: 130px;
}
.toolbar .app-selector {
	width: 290px;
}
.toolbar .el-input-number {
	width: 130px;
}
.cards {
	display: grid;
	grid-template-columns: repeat(5, minmax(150px, 1fr));
	gap: 12px;
	margin-bottom: 16px;
}
.stat-card,
.chart-card,
.funnel-card,
.device-card {
	background: var(--el-bg-color);
	border: 1px solid var(--el-border-color-lighter);
	border-radius: 8px;
}
.stat-card {
	padding: 16px;
	min-height: 90px;
}
.stat-label {
	color: var(--el-text-color-secondary);
	font-size: 13px;
}
.stat-value {
	margin: 8px 0 4px;
	font-size: 26px;
	font-weight: 600;
	color: var(--el-color-primary);
}
.stat-tip {
	color: var(--el-text-color-placeholder);
	font-size: 12px;
}
.charts {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16px;
}
.chart-card {
	padding: 14px;
}
.chart-title,
.section-title {
	font-size: 15px;
	font-weight: 600;
	color: var(--el-text-color-primary);
}
.chart {
	height: 260px;
}
.funnel-card,
.device-card {
	margin-top: 16px;
	padding: 16px;
}
.funnel {
	display: flex;
	gap: 12px;
	margin-top: 14px;
}
.funnel-item {
	flex: 1;
	padding: 13px;
	background: var(--el-fill-color-light);
	border-radius: 6px;
	text-align: center;
}
.funnel-item span {
	display: block;
	color: var(--el-text-color-secondary);
	font-size: 13px;
}
.funnel-item b {
	display: block;
	margin-top: 7px;
	color: var(--el-color-primary);
	font-size: 22px;
}
.section-title small {
	margin-left: 8px;
	color: var(--el-text-color-placeholder);
	font-size: 12px;
	font-weight: normal;
}
.device-card .el-pagination {
	justify-content: flex-end;
	margin-top: 16px;
}
.device-model-cell {
	line-height: 1.45;
	white-space: normal;
	word-break: break-word;
}
.device-model-cell small {
	color: var(--el-text-color-secondary);
	font-size: 11px;
}
.device-detail-tooltip {
	white-space: pre-line;
	line-height: 1.7;
}
@media (max-width: 1100px) {
	.cards {
		grid-template-columns: repeat(3, minmax(150px, 1fr));
	}
}
@media (max-width: 700px) {
	.cards,
	.charts {
		grid-template-columns: 1fr;
	}
	.funnel {
		flex-wrap: wrap;
	}
	.funnel-item {
		min-width: 120px;
	}
	.overview-page {
		padding: 12px;
	}
}
</style>
