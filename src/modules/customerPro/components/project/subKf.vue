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
			<cl-table ref="Table" :border="false">
				<template #column-name="{ scope }">
					<span v-if="scope.row.role == 1">
						{{ scope.row.name }}
					</span>

					<span v-if="scope.row.role == 2">
						{{ scope.row.name }} - <span style="color: #e74c3c"> 【组主管】 </span>
					</span>

					<span v-if="scope.row.role == 3">
						{{ scope.row.name }} - <span style="color: #e74c3c"> 【项目主管】 </span>
					</span>
				</template>

				<template #slot-set_Gadmin="{ scope }">
					<div v-if="service.customer_pro.kf._permission.setProjectRole">
						<el-button
							text
							plain
							type="warning"
							v-if="scope.row.role == 1"
							@click="setRole(scope.row, true, 2)"
							>设为组主管</el-button
						>
						<el-button
							text
							plain
							type="info"
							v-if="scope.row.role == 2"
							@click="setRole(scope.row, false, 2)"
							>取消组主管</el-button
						>
					</div>
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

<script lang="ts" name="subkf" setup>
import { useCrud, useTable, useUpsert } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { ElMessage } from "element-plus";
import { ref } from "vue";

const { service } = useCool();

const props = defineProps({
	groupId: String,
	projectId: String
});

const userMap = ref<{ [key: string]: string }>({});

// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		{
			label: "客服名称",
			prop: "userId",
			required: true,
			component: { name: "el-select" }
		},
		{
			label: "备注",
			prop: "remark",
			component: { name: "el-input", props: { type: "textarea", rows: 4 } }
		},
		{
			label: "推送",
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
	async onOpen(data) {
		if (Upsert.value?.mode == "update") {
			Upsert.value?.setProps("userId", {
				disabled: true
			});
		} else {
			Upsert.value?.setProps("userId", {
				disabled: false
			});
		}

		Upsert.value?.setOptions("userId", []);
		const kfList = await service.customer_pro.kf.getList({
			roleId: "1815245038695747584",
			userId: data.userId,
			mode: Upsert.value?.mode,
			type: "group"
		});
		Upsert.value?.setOptions(
			"userId",
			kfList.map((e: { name: string; id: string }) => {
				userMap.value[e.id] = e.name;
				return {
					label: e.name,
					value: e.id
				};
			})
		);
	},
	onSubmit(data, { next }) {
		let form: any = {
			groupId: props.groupId,
			projectId: props.projectId,
			name: userMap.value[data.userId]
		};

		next({
			...data,
			...form
		});
	}
});

// cl-table 配置
const Table = useTable({
	columns: [
		{ type: "selection" },
		{
			label: "客服名称",
			prop: "name"
		},
		{
			label: "推送",
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
		{
			label: "备注",
			prop: "remark",
			minWidth: 150,
			showOverflowTooltip: true
		},
		{ label: "创建时间", prop: "createTime" },
		{ type: "op", width: 400, buttons: ["edit", "slot-set_Gadmin"] }
	]
});

// cl-crud 配置
const Crud = useCrud(
	{
		service: service.customer_pro.kf,
		async onRefresh(params, { next, render }) {
			params.projectId = props.projectId;
			params.groupId = props.groupId;
			const { list, pagination } = await next(params);
			render(list, pagination);
		}
	},
	(app) => {
		app.refresh();
	}
);

// 设置主管，action是1未添加主管，是0为取消主管， type是1为组主管，2为项目主管
const setRole = (row: any, action: boolean, type: number) => {
	service.customer_pro.kf
		.setProjectRole({
			action,
			role: type,
			id: row.id,
			userId: row.userId,
			projectId: row.projectId,
			groupId: row.groupId,
			type: "group"
		})
		.then((res) => {
			ElMessage.success("设置成功");
			Crud.value?.refresh();
		})
		.catch((e) => {
			ElMessage.error(e.message);
		});
};
</script>
