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
			<cl-table ref="Table" :border="false" />
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

<script lang="ts" name="customer_pro-majors" setup>
import { useCrud, useTable, useUpsert } from "@cool-vue/crud";
import { useCool } from "/@/cool";

const { service } = useCool();

// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		{ label: "名称", prop: "name", required: true, component: { name: "el-input" } },
		{
			label: "院校",
			prop: "school_id",
			span: 12,
			required: true,
			component: {
				name: "el-select",
				options: []
			}
		},
		{
			label: "定位金",
			prop: "amount",
			span: 12,
			value: 0,
			component: { name: "el-input-number", props: { min: 0, precision: 2 } }
		},
		{
			label: "招生人数",
			prop: "planned_numbers",
			span: 12,
			value: 0,
			component: { name: "el-input-number", props: { min: 0 } }
		},
		{
			label: "报名人数",
			prop: "registered_numbers",
			span: 12,
			value: 0,
			component: { name: "el-input-number", props: { min: 0 } }
		},
		{
			label: "备注",
			prop: "remark",
			component: { name: "el-input", props: { type: "textarea", rows: 4 } }
		},
		{
			label: "状态",
			prop: "status",
			value: 1,
			component: {
				name: "cl-switch",
				props: {
					activeValue: 1,
					inactiveValue: 0,
					activeText: "开启",
					inactiveText: "关闭",
					inlinePrompt: true
				}
			}
		}
	],
	async onOpen() {
		const schoolList = await service.customer_pro.school.list();
		Upsert.value?.setOptions(
			"school_id",
			schoolList.map((e) => {
				return {
					label: e.name,
					value: e.id
				};
			})
		);
	}
});

// cl-table 配置
const Table = useTable({
	columns: [
		{ type: "selection" },
		{ label: "名称", prop: "name" },
		{ label: "院校", prop: "schoolName" },
		{ label: "定位金", prop: "amount" },
		{ label: "招生人数", prop: "planned_numbers" },
		{ label: "报名人数", prop: "registered_numbers" },
		{
			label: "备注",
			prop: "remark",
			minWidth: 150,
			showOverflowTooltip: true
		},
		{
			label: "状态",
			prop: "status",
			component: {
				name: "cl-switch",
				props: {
					activeValue: 1,
					inactiveValue: 0,
					activeText: "开启",
					inactiveText: "关闭",
					inlinePrompt: true
				}
			}
		},
		{ label: "创建时间", prop: "createTime" },
		{ type: "op", buttons: ["edit", "delete"] }
	]
});

// cl-crud 配置
const Crud = useCrud(
	{
		service: service.customer_pro.majors
	},
	(app) => {
		app.refresh();
	}
);
</script>
