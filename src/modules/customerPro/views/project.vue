<template>
	<cl-view-group ref="ViewGroup" leftWidth="260px">
		<template #left>
			<sub-tree ref="subTree" @refresh="refresh" />
		</template>
		<template #right>
			<cl-crud ref="Crud">
				<cl-row>
					<cl-refresh-btn />
					<cl-add-btn />
					<cl-multi-delete-btn />
					<el-button
						v-permission="service.customer_pro.project_group.permission.move"
						type="success"
						:disabled="Table?.selection.length == 0"
						@click="toMove()"
						>转移</el-button
					>
					<cl-flex1 />
					<cl-search-key placeholder="搜索客服组名称" />
				</cl-row>

				<cl-row>
					<cl-table ref="Table" :border="false">
						<template #slot-add="{ scope }">
							<el-button
								text
								bg
								type="info"
								@click="openKf(scope.row)"
								v-if="service.customer_pro.kf._permission.list"
								>客服列表</el-button
							>
						</template>
					</cl-table>
				</cl-row>

				<cl-row>
					<cl-flex1 />
					<cl-pagination />
				</cl-row>

				<!-- 新增、编辑 -->
				<cl-upsert ref="Upsert" />

				<!-- 移动 -->
				<dept-move :ref="setRefs('deptMove')" />

				<!-- 客服人员列表 -->
				<el-drawer v-model="drawerKf" title="客服人员" direction="rtl" size="80%">
					<sub-kf :key="callKey" :groupId="groupId" :projectId="projectId" />
				</el-drawer>
			</cl-crud>
		</template>
	</cl-view-group>
</template>

<script lang="ts" name="customer_pro-project" setup>
import { useCrud, useTable, useUpsert } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useViewGroup } from "/$/base";
import { ElDrawer, ElMessageBox } from "element-plus";
import SubTree from "../components/project/subTree.vue";
import SubKf from "../components/project/subKf.vue";
import DeptMove from "../components/project/move.vue";
import { ref, watch } from "vue";

const { service, refs, setRefs } = useCool();
const { ViewGroup } = useViewGroup();
const callKey = ref(0); //重新渲染子组件
const groupId = ref(); //组别id
const projectId = ref(); //项目id
const subTree = ref(); //子组件

// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		{ label: "客服组名称", prop: "name", required: true, component: { name: "el-input" } },
		{ label: "项目", prop: "projectId", required: true, component: { name: "el-select" } },
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
		const projectList = await service.customer_pro.project.list();
		if (projectList.length == 0) {
			ElMessageBox.alert("请先到左侧栏目：院校管理 >> 项目管理，添加项目", "警告", {
				confirmButtonText: "OK",
				callback: () => {
					Upsert.value?.close();
				}
			});
			return;
		}
		Upsert.value?.setOptions(
			"projectId",
			projectList.map((e) => {
				return {
					label: e.name,
					value: e.id
				};
			})
		);

		if (ViewGroup.value?.selected?.id) {
			Upsert.value?.setForm("projectId", ViewGroup.value?.selected?.id);
		}
	}
});

// cl-table 配置
const Table = useTable({
	columns: [
		{ type: "selection" },
		{ label: "客服组名称", prop: "name" },

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
		{
			label: "备注",
			prop: "remark",
			minWidth: 150,
			showOverflowTooltip: true
		},
		{ label: "创建时间", prop: "createTime" },
		{ type: "op", width: 220, buttons: ["edit", "slot-add"] }
	]
});

// cl-crud 配置
const Crud = useCrud({
	service: service.customer_pro.project_group
});

// 刷新
function refresh(params?: any) {
	Crud.value?.refresh(params);
}

// 移动成员
async function toMove(item?: any) {
	let ids = [];

	if (item) {
		ids = [item.id];
	} else {
		ids = Table.value?.selection.map((e) => e.id) || [];
	}

	refs.deptMove.open(ids);
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

// 打开客服人员列表
const drawerKf = ref(false);
const openKf = (row: any) => {
	drawerKf.value = true;
	callKey.value++;
	groupId.value = row.id;
	projectId.value = row.projectId;
};

watch(drawerKf, (v) => {
	if (!drawerKf.value) {
		subTree.value.refresh();
	}
});
</script>
