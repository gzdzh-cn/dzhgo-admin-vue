<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新按钮 -->
			<cl-refresh-btn />
			<!-- 新增按钮 -->
			<cl-add-btn />
			<!-- 删除按钮 -->
			<cl-multi-delete-btn />
			<el-button
				v-permission="service.customer_pro.project_group.permission.move"
				type="success"
				:disabled="Table?.selection.length == 0"
				@click="toMove()"
				>转移</el-button
			>

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
		<cl-upsert ref="Upsert">
			<!-- slot-cluesRule -->
			<template #slot-cluesRule="{ scope }">
				<div class="rule">
					<el-checkbox-group v-model="scope.checkWeekList">
						<template v-for="(item, index) in weeks" :key="index">
							<el-checkbox :label="item" :value="item" />
						</template>
					</el-checkbox-group>
					<div>
						<div>
							<span>每天数量：</span>
							<el-input-number v-model="scope.receivedCluesNum" />
						</div>
						<span class="warning">注意：默认 0 是不限制</span>
					</div>
				</div>
			</template>
		</cl-upsert>

		<!-- 移动 -->
		<kf-move :ref="setRefs('kfMove')" />
	</cl-crud>
</template>

<script lang="ts" name="subkf" setup>
import { useCrud, useTable, useUpsert } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { ElMessage } from "element-plus";
import { ref } from "vue";
import KfMove from "./kfMove.vue";

const { service, refs, setRefs } = useCool();

const props = defineProps({
	groupId: String,
	projectId: String
});

const userMap = ref<{ [key: string]: string }>({});
const weeks = ref(["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]);

// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		{
			label: "客服名称",
			prop: "userId",
			required: true,
			hidden() {
				return Upsert.value?.mode == "update";
			},
			component: { name: "el-select" }
		},
		{
			label: "线索规则",
			prop: "cluesRule",
			component: { name: "slot-cluesRule" }
		},
		{
			label: "选中星期",
			prop: "checkWeekList",
			hook: {
				bind: (value) => {
					const weekMap: Record<string, string> = {
						"1": "星期一",
						"2": "星期二",
						"3": "星期三",
						"4": "星期四",
						"5": "星期五",
						"6": "星期六",
						"7": "星期日"
					};
					return (
						value &&
						value
							.split(",")
							.map(Number)
							.filter(Boolean)
							.map((num: number) => weekMap[num.toString()])
					);
				},
				submit: (value) => {
					const weekMap: Record<string, string> = {
						星期一: "1",
						星期二: "2",
						星期三: "3",
						星期四: "4",
						星期五: "5",
						星期六: "6",
						星期日: "7"
					};
					return value.map((name: string) => weekMap[name]).join(",");
				}
			},
			value: "1,2,3,4,5,6,7"
		},
		{
			label: "接收数量",
			prop: "receivedCluesNum",
			value: 10
		},
		{
			label: "备注",
			prop: "remark",
			component: { name: "el-input", props: { type: "textarea", rows: 4 } }
		},
		{
			label: "推送",
			prop: "status",
			value: 0,
			hidden() {
				return Upsert.value?.mode == "update";
			},
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
		Upsert.value?.setOptions("userId", []);
		const kfList = await service.customer_pro.kf.getList({
			roleId: "1815245038695747584",
			userId: data.userId,
			mode: Upsert.value?.mode,
			type: "group"
		});
		Upsert.value?.setOptions(
			"userId",
			kfList.map((e: { name: any; id: any }) => {
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
			label: "每天上限",
			prop: "receivedCluesNum",
			formatter(row) {
				return row.receivedCluesNum == 0 ? "不限制" : row.receivedCluesNum;
			}
		},
		{ label: "今天总数", prop: "hasReceive" },
		{
			label: "接收推送",
			prop: "status",
			width: 160,
			component: {
				name: "cl-switch",
				props: {
					activeValue: 1,
					inactiveValue: 0,
					activeText: "接收",
					inactiveText: "禁用",
					inlinePrompt: true
				}
			}
		},
		// {
		// 	label: "备注",
		// 	prop: "remark",
		// 	minWidth: 150,
		// 	showOverflowTooltip: true
		// },
		{ label: "创建时间", prop: "createTime", width: 160 },
		{ type: "op", width: 200, buttons: ["edit", "slot-set_Gadmin"] }
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
		.then(() => {
			ElMessage.success("设置成功");
			Crud.value?.refresh();
		})
		.catch((e) => {
			ElMessage.error(e.message);
		});
};

// 移动成员
async function toMove(item?: any) {
	let ids = [];

	if (item) {
		ids = [item.id];
	} else {
		ids = Table.value?.selection.map((e) => e.id) || [];
	}

	refs.kfMove.open(ids);
}
</script>

<style lang="scss" scoped>
.rule {
	display: flex;
	flex-direction: column;
	justify-content: center;
}
.warning {
	padding: 0 10px;
	color: #d05a5a;
}
</style>
