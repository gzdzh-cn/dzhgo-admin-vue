<template>
	<cl-view-group ref="ViewGroup">
		<template #left>
			<category @refresh="refresh" :model-id="modelId" :type-id="typeId" />
		</template>

		<template #right>
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
					<cl-table ref="Table" row-key="id" @row-click="onRowClick">
						<template #slot-btn="{ scope }">
							<el-button
								text
								bg
								type="success"
								v-permission="service.dzh3164.graphic_data.permission.add"
								@click="append(scope.row)"
								>新增</el-button
							>
						</template>
					</cl-table>
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
	</cl-view-group>
</template>

<script lang="ts" name="dzh3164-graphic_data" setup>
import { useCrud, useTable, useUpsert } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useViewGroup } from "/$/base";
import Category from "../components/category.vue";

const { service } = useCool();
const { ViewGroup } = useViewGroup();
const modelId = "7";
const typeId = "graphic";
// cl-upsert 配置
const Upsert = useUpsert({
	dialog: {
		width: "600px"
	},
	props: {
		labelWidth: "100px"
	},
	items: [
		{ label: "xdata", prop: "xdata", required: true, component: { name: "el-input" } },
		{ label: "ydata", prop: "ydata", required: true, component: { name: "el-input" } }
	],
	onSubmit(data, { next }) {
		next({
			...data,
			category_id: ViewGroup.value?.selected?.id,
			model_id: modelId,
			type_id: typeId
		});
	}
});

// cl-table 配置
const Table = useTable({
	contextMenu: [
		"refresh",
		(row) => {
			return {
				label: "新增",
				hidden: !service.dzh3164.graphic_data._permission?.add,
				callback(done) {
					append(row);
					done();
				}
			};
		},
		"edit",
		"delete",
		"order-asc",
		"order-desc"
	],
	columns: [
		{ type: "selection" },
		{ label: "栏目", prop: "category" },
		{ label: "xdata", prop: "xdata" },
		{ label: "ydata", prop: "ydata" },
		{ label: "创建时间", prop: "createTime" },
		{
			type: "op",
			width: 250,
			buttons: ["slot-btn", "edit", "delete"]
		}
	]
});

// cl-crud 配置
const Crud = useCrud({
	service: service.dzh3164.graphic_data,
	async onRefresh(params, { next, render }) {
		const { list, pagination } = await next(params);
		render(list, pagination);
	}
});

// 刷新
function refresh(params?: any) {
	Crud.value?.refresh(params);
}

// 行点击展开
function onRowClick(row: any, column: any) {
	if (column?.property && row.children) {
		Table.value?.toggleRowExpansion(row);
	}
}

// 追加子集
function append(row: any) {
	Crud.value?.rowAppend({
		parentId: row.id,
		orderNum: 1
	});
}
</script>
