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
			<!-- 关键字搜索 -->
			<cl-search-key />
		</cl-row>

		<cl-row>
			<!-- 数据表格 -->
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<!-- 分页控件 -->
			<cl-pagination />
		</cl-row>

		<!-- 新增、编辑 -->
		<cl-upsert ref="Upsert" />
	</cl-crud>
</template>

<script lang="ts" name="customer_pro-clues_track" setup>
import { useCrud, useTable, useUpsert } from "@cool-vue/crud";
import { useCool } from "/@/cool";

const { service } = useCool();

// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		{ label: "线索ID", prop: "clues_id", component: { name: "el-input" } },
		{ label: "操作人", prop: "user_id", component: { name: "el-input" } },
		{ label: "类型", prop: "type", component: { name: "el-radio-group", options: [] } },
		{
			label: "备注",
			prop: "remark",
			component: { name: "el-input", props: { type: "textarea", rows: 4 } }
		},
		{
			label: "排序",
			prop: "orderNum",
			component: { name: "el-input-number", props: { min: 0 } },
			required: true
		},
		{ label: "状态", prop: "status", component: { name: "el-switch" } }
	]
});

// cl-table 配置
const Table = useTable({
	columns: [
		{ type: "selection" },
		{ label: "id", prop: "id" },
		{ label: "创建时间", prop: "createTime" },
		{ label: "更新时间", prop: "updateTime" },
		{ label: "线索ID", prop: "clues_id" },
		{ label: "操作人", prop: "user_id" },
		{ label: "类型", prop: "type", dict: [] },
		{ label: "备注", prop: "remark", showOverflowTooltip: true },
		{ label: "排序", prop: "orderNum" },
		{ label: "状态", prop: "status", component: { name: "cl-switch" } },
		{ type: "op", buttons: ["edit", "delete"] }
	]
});

// cl-crud 配置
const Crud = useCrud(
	{
		service: service.customer_pro.clues_track
	},
	(app) => {
		app.refresh();
	}
);
</script>
