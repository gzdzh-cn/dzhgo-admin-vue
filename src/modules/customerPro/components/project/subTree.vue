<template>
	<div class="dept-tree">
		<div class="dept-tree__header">
			<div>项目类型</div>

			<el-button
				size="small"
				@click="add"
				:icon="Plus"
				circle
				v-if="service.customer_pro.project._permission.add"
			/>
			<el-button
				size="small"
				@click="edit"
				:icon="Edit"
				circle
				v-if="service.customer_pro.project._permission.update"
			/>
		</div>

		<div class="dept-tree__container" @contextmenu.stop.prevent="onContextMenu">
			<el-scrollbar>
				<el-tree
					v-loading="loading"
					node-key="id"
					default-expand-all
					:data="list"
					:props="{
						label: 'name'
					}"
					:draggable="isDrag"
					:allow-drag="allowDrag"
					:allow-drop="allowDrop"
					:expand-on-click-node="false"
					@node-contextmenu="onContextMenu"
				>
					<template #default="{ node, data }">
						<div class="dept-tree__node">
							<span
								class="dept-tree__node-label"
								:class="{
									'is-active': data.id == ViewGroup?.selected?.id
								}"
								@click="rowClick(data)"
								>{{ node.label }}
							</span>
							<span
								v-if="browser.isMini"
								class="dept-tree__node-icon"
								@click="onContextMenu($event, data, node)"
							>
								<el-icon>
									<more-filled />
								</el-icon>
							</span>
						</div>
					</template>
				</el-tree>
			</el-scrollbar>
		</div>

		<cl-form ref="Form" />
	</div>
</template>

<script lang="ts" name="dept-tree" setup>
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useCool } from "/@/cool";
import { ContextMenu, useForm } from "@cool-vue/crud";
import { MoreFilled } from "@element-plus/icons-vue";
import { checkPerm, useViewGroup } from "/$/base";
import { deepTree, revDeepTree } from "/@/cool/utils";
import { Plus, Edit } from "@element-plus/icons-vue";
const props = defineProps({
	drag: {
		type: Boolean,
		default: true
	},
	level: {
		type: Number,
		default: 99
	},
	orderInfo: Object
});

const emit = defineEmits(["refresh"]);

const { service, browser } = useCool();
const { ViewGroup } = useViewGroup();
const Form = useForm();
const userMap = ref<{ [key: string]: string }>({});

// 树形列表
const list = ref<any[]>([
	{
		name: "全部",
		value: "all"
	}
]);

// 加载中
const loading = ref(false);

// 是否能拖动
const isDrag = ref(false);

// 允许托的规则
function allowDrag({ data }: any) {
	return data.parentId;
}

// 允许放的规则
function allowDrop(_: any, dropNode: any) {
	return dropNode.data.parentId;
}

// 刷新
async function refresh() {
	loading.value = true;
	isDrag.value = false;

	await service.customer_pro.project.list().then((res) => {
		list.value = deepTree(res);
		// if (!ViewGroup.value?.selected) {
		rowClick();
		// }
	});

	loading.value = false;
}

// 获取 ids
function rowClick(item?: any) {
	if (!item) {
		item = list.value[0];
	}

	if (item) {
		const ids = item.children ? revDeepTree(item.children).map((e) => e.id) : [];
		ids.unshift(item.id);

		// 刷新列表
		emit("refresh", { page: 1, projectIds: ids });

		// 选择
		ViewGroup.value?.select(item);
		ViewGroup.value?.setTitle(
			`${item.name} - 客服组列表 ${
				item.projectUserId ? "-【项目主管：" + item.projectUserName + "】" : ""
			}`
		);
	}
}

// 编辑
function rowEdit(item: any) {
	const method = item.id ? "update" : "add";
	Form.value?.open({
		title: `${method == "add" ? "新增" : "编辑"}项目`,
		width: "550px",
		props: {
			labelWidth: "100px"
		},
		items: [
			{
				label: "项目名称",
				prop: "name",
				component: {
					name: "el-input"
				},
				required: true
			},
			{
				label: "项目主管",
				prop: "projectUserId",
				component: {
					name: "el-select",
					options: []
				}
			},
			{
				label: "排序",
				prop: "orderNum",
				value: 99,
				component: {
					name: "el-input-number",
					props: {
						"controls-position": "right",
						min: 0,
						max: 100
					}
				}
			}
		],
		form: {
			...item
		},
		on: {
			async open(data) {
				if (method == "update") {
					// Form.value?.setProps("parentId", { disabled: true });
					if (Form.value?.getForm("projectUserId")) {
						Form.value?.setProps("projectUserId", { disabled: true });
					}
				}

				const kfList = await service.customer_pro.kf.getList({
					roleId: "1815245038695747584",
					userId: data.projectUserId,
					mode: method,
					type: "project"
				});
				Form.value?.setOptions(
					"projectUserId",
					kfList.map((e: { name: any; id: any }) => {
						userMap.value[e.id] = e.name;
						return {
							label: e.name,
							value: e.id
						};
					})
				);
			},
			submit(data, { done, close }) {
				service.customer_pro.project[method]({
					id: item.id,
					projectUserId: data.projectUserId,
					name: data.name,
					orderNum: data.orderNum,
					userName: userMap.value[data.projectUserId]
				})
					.then(() => {
						ElMessage.success(
							`${method == "add" ? "新增" : "编辑"}项目 “${data.name}” 成功`
						);
						close();
						refresh();
					})
					.catch((err) => {
						ElMessage.error(err.message);
						done();
					});
			}
		}
	});
}

// 删除
function rowDel(item: any) {
	async function del(f: boolean) {
		await service.customer_pro.project
			.delete({
				ids: [item.id],
				deleteUser: f
			})
			.then(() => {
				// 删除当前
				if (ViewGroup.value?.selected?.id == item.id) {
					rowClick();
				}

				if (f) {
					ElMessage.success("删除成功");
				} else {
					ElMessageBox.confirm(
						`“${item.name}” 项目的组别已成功转移到 “${item.parentName}” 项目。`,
						"删除成功"
					);
				}
			});

		refresh();
	}

	ElMessageBox.confirm(`该操作会删除 “${item.name}” 项目的所有组别，是否确认？`, "提示", {
		type: "warning",
		confirmButtonText: "直接删除",
		cancelButtonText: "保留组别",
		distinguishCancelAndClose: true
	})
		.then(() => {
			del(true);
		})
		.catch((action) => {
			if (action == "cancel") {
				del(false);
			}
		});
}

// 排序
// function treeOrder(f: boolean) {
// 	if (f) {
// 		ElMessageBox.confirm("项目架构已发生改变，是否保存？", "提示", {
// 			type: "warning"
// 		})
// 			.then(async () => {
// 				const ids: any[] = [];

// 				function deep(list: any[], pid: any) {
// 					list.forEach((e) => {
// 						e.parentId = pid;
// 						ids.push(e);

// 						if (e.children && isArray(e.children)) {
// 							deep(e.children, e.id);
// 						}
// 					});
// 				}

// 				deep(list.value, null);

// 				await service.customer_pro.project
// 					.order(
// 						ids.map((e, i) => {
// 							return {
// 								id: e.id,
// 								parentId: e.parentId,
// 								orderNum: i
// 							};
// 						})
// 					)
// 					.then(() => {
// 						ElMessage.success("更新排序成功");
// 					})
// 					.catch((err) => {
// 						ElMessage.error(err.message);
// 					});

// 				refresh();
// 				isDrag.value = false;
// 			})
// 			.catch(() => null);
// 	} else {
// 		refresh();
// 	}
// }

// 右键菜单
function onContextMenu(e: any, d?: any, n?: any) {
	if (!d) {
		d = list.value[0] || {};
	}

	// 权限
	const perm = service.customer_pro.project.permission;
	const kfPerm = service.customer_pro.kf.permission;

	ContextMenu.open(e, {
		list: [
			{
				label: "新增项目",
				hidden: (n && n.level >= props.level) || !checkPerm(perm.add),
				callback(done) {
					rowEdit({
						name: "",
						parentName: d.name,
						parentId: d.id
					});
					done();
				}
			},
			{
				label: "编辑项目",
				hidden: !checkPerm(perm.update),
				callback(done) {
					rowEdit(d);
					done();
				}
			},
			{
				label: "删除项目",
				hidden: !checkPerm(perm.delete),
				callback(done) {
					rowDel(d);
					done();
				}
			},
			{
				label: "删除项目主管",
				hidden: !checkPerm(kfPerm.setProjectRole),
				callback(done) {
					setProjectRole(d);
					done();
				}
			}
		]
	});
}

function add() {
	rowEdit({
		name: "",
		parentName: undefined,
		parentId: undefined
	});
}

function edit() {
	const item = ViewGroup.value?.selected;
	console.log(item);
	rowEdit(item);
}

const setProjectRole = (item: any) => {
	service.customer_pro.project
		.delProjectRole({
			action: false,
			id: item.id
		})
		.then((res) => {
			ElMessage.success("删除成功");
			refresh();
		})
		.catch((e) => {
			ElMessage.error(e.message);
		});
};

onMounted(function () {
	refresh();
});

defineExpose({
	refresh
});
</script>

<style lang="scss" scoped>
.dept-tree {
	height: 100%;
	width: 100%;

	:deep(.el-tree-node__label) {
		display: block;
		height: 100%;
		width: 100%;
	}

	&__header {
		display: flex;
		align-items: center;
		height: 40px;
		padding: 0 10px;
		letter-spacing: 1px;
		position: relative;

		div {
			font-size: 14px;
			flex: 1;
			white-space: nowrap;
		}

		i {
			font-size: 18px;
			cursor: pointer;
		}
	}

	&__op {
		display: flex;

		li {
			display: flex;
			justify-content: center;
			align-items: center;
			list-style: none;
			margin-left: 5px;
			padding: 5px;
			cursor: pointer;

			&:not(.no):hover {
				background-color: #eee;
			}
		}
	}

	&__container {
		height: calc(100% - 40px);

		:deep(.el-tree-node__content) {
			height: 36px;
			margin: 0 5px;
		}
	}

	&__node {
		display: flex;
		align-items: center;
		height: 100%;
		width: 100%;
		box-sizing: border-box;

		&-label {
			display: flex;
			align-items: center;
			flex: 1;
			height: 100%;
			font-size: 14px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;

			&.is-active {
				color: var(--color-primary);
				font-weight: bold;
			}
			.mark {
				font-size: xx-small;
				color: #e87a90;
				padding: 0 3px;
			}
		}

		&-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			background-color: #eee;
			height: 26px;
			width: 26px;
			text-align: center;
			margin-right: 5px;
			border-radius: 5px;
		}
	}
}
</style>
