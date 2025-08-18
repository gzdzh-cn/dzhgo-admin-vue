<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新按钮 -->
			<cl-refresh-btn />
			<!-- 新增按钮 -->
			<cl-add-btn />
			<!-- 删除按钮 -->
			<cl-multi-delete-btn />
			<cl-flex1 />
			<!-- 高级按钮 -->
			<el-button type="info" text bg :icon="Search" v-show="searchStatus">
				正在搜索中
			</el-button>
			<cl-adv-btn />
			<!-- 关键字搜索 -->
			<cl-search-key />
		</cl-row>

		<cl-row>
			<!-- 数据表格 -->
			<cl-table ref="Table"> </cl-table>
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<!-- 分页控件 -->
			<cl-pagination />
		</cl-row>

		<!-- 新增、编辑 -->
		<cl-upsert ref="Upsert" />

		<!-- 高级搜索 -->
		<cl-adv-search ref="AdvSearch" />
	</cl-crud>
</template>

<script lang="ts" name="customer_pro-restore" setup>
import { Search } from "@element-plus/icons-vue";
import { useCrud, useTable, useUpsert, useAdvSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { ref, computed } from "vue";
import { useDict } from "/$/dict";
import { addTypeToDictOptions, STATUS_TYPE_MAPPING } from "../utils/dict-helper";

const { dict } = useDict();
const { service } = useCool();

// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		{ label: "53标识", prop: "guestId", component: { name: "el-input" } },
		{ label: "关键字", prop: "keywords", component: { name: "el-input" } },
		{
			label: "状态",
			prop: "status",
			value: 0,
			component: {
				name: "el-switch",
				props: {
					activeValue: 1,
					inactiveValue: 0,
					activeText: "已推送",
					inactiveText: "未推送",
					inlinePrompt: true
				}
			}
		},
		{
			label: "原文内容",
			prop: "remark",
			component: { name: "el-input", props: { type: "textarea", rows: 20 } }
		}
	]
});

// cl-table 配置
const Table = useTable({
	columns: [
		{ type: "selection" },
		{ label: "53标识", prop: "guestId" },
		{
			label: "类型",
			prop: "type",
			dict: {
				text: true,
				options: dict.get("cluesType").value
			}
		},
		{ label: "关键字", prop: "keywords" },
		() => {
			return {
				label: "状态",
				prop: "status",
				dict: {
					options: restoreStatusOptions.value
				}
			};
		},
		{ label: "创建时间", prop: "createTime", width: 160 },
		{ type: "op", buttons: ["edit", "delete"] }
	]
});

// cl-crud 配置
const Crud = useCrud(
	{
		service: service.customer_pro.restore
	},
	(app) => {
		app.refresh();
	}
);

// 处理restoreStatus字典数据，添加type字段
const restoreStatusOptions = computed(() => {
	const options = dict.get("restoreStatus").value;
	return addTypeToDictOptions(options, STATUS_TYPE_MAPPING.ENABLE_DISABLE);
});

// 是否是管理员
// const isAdmin = ref(false);
const searchStatus = ref(false); // 搜索状态
// 时间选择器起始
const defaultTime = new Date();
const shortcuts = [
	{
		text: "最近一天",
		value: () => {
			const end = new Date();
			end.setHours(0, 0, 0, 0);
			const start = new Date();
			start.setDate(start.getDate() - 1);
			start.setHours(0, 0, 0, 0);
			return [start, end];
		}
	},
	{
		text: "最近一周",
		value: () => {
			const end = new Date();
			end.setHours(0, 0, 0, 0);
			const start = new Date();
			start.setDate(start.getDate() - 7);
			start.setHours(0, 0, 0, 0);
			return [start, end];
		}
	},
	{
		text: "最近一个月",
		value: () => {
			const end = new Date();
			end.setHours(0, 0, 0, 0);
			const start = new Date();
			start.setMonth(start.getMonth() - 1);
			start.setHours(0, 0, 0, 0);
			return [start, end];
		}
	},
	{
		text: "最近三个月",
		value: () => {
			const end = new Date();
			end.setHours(0, 0, 0, 0);
			const start = new Date();
			start.setMonth(start.getMonth() - 3);
			start.setHours(0, 0, 0, 0);
			return [start, end];
		}
	}
];
// 高级搜索
const AdvSearch = useAdvSearch({
	items: [
		{
			label: "线索类别",
			prop: "cluesType",
			component: {
				name: "el-select",
				props: {
					clearable: true
				},
				options: dict.get("cluesType").value
			}
		},
		{
			label: "状态",
			prop: "status",
			component: {
				name: "el-select",
				props: {
					clearable: true
				},
				options: dict.get("restoreStatus").value
			}
		},
		{
			label: "创建时间",
			prop: "datetimerange",
			component: {
				name: "el-date-picker",
				props: {
					type: "datetimerange",
					shortcuts: shortcuts,
					startPlaceholder: "开始日期",
					endPlaceholder: "结束日期",
					defaultTime: defaultTime,
					value: "YYYY-MM-DD HH:mm",
					valueFormat: "YYYY-MM-DD HH:mm",
					timeFormat: "HH:mm"
				}
			}
		}
	],
	op: ["reset", "close", "search"],
	onSearch(data, { next, close }) {
		next(data);
		searchStatus.value = false;
		searchStatus.value = Object.values(data).some((value) => {
			if (value) return true;
		});
	}
});
</script>
