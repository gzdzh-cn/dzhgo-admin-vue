<template>
	<div class="category" v-loading="loading">
		<div class="head">
			<span>类型</span>
			<el-button
				type="success"
				bg
				size="small"
				v-permission="service.dzh3164.category.permission.add"
				@click="edit()"
				>添加</el-button
			>
		</div>

		<div class="list">
			<el-scrollbar>
				<ul>
					<li
						v-for="(item, index) in list"
						:key="index"
						class="item"
						:class="{
							'is-active': ViewGroup?.selected?.id == item.id
						}"
						@click="rowClick(item)"
						@contextmenu="
							(e) => {
								onContextMenu(e, item);
							}
						"
					>
						<span>{{ item.title }}</span>
						<el-icon v-show="ViewGroup?.selected?.id == item.id"
							><arrow-right-bold
						/></el-icon>
					</li>

					<el-empty v-if="list.length == 0" :image-size="80" />
				</ul>
			</el-scrollbar>
		</div>

		<!-- 表单 -->
		<cl-form ref="Form"></cl-form>
	</div>
</template>

<script lang="ts" setup>
import { ContextMenu, useForm } from "@cool-vue/crud";
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, ref } from "vue";
import { useCool } from "/@/cool";
import { ArrowRightBold } from "@element-plus/icons-vue";
import { checkPerm, useViewGroup } from "/$/base";

const emit = defineEmits(["refresh"]);
const props = defineProps({
	modelId: {
		type: String,
		default: "1"
	},
	typeId: {
		type: String,
		default: "new"
	}
});
const { service } = useCool();
const { ViewGroup } = useViewGroup();
const Form = useForm();

// 列表
const list = ref<any[]>([]);

// 加载状态
const loading = ref(false);

// 刷新
async function refresh() {
	loading.value = true;

	await service.dzh3164.category
		.list({ order: "createTime", sort: "asc", model_id: props.modelId, type_id: props.typeId })
		.then((res) => {
			list.value = res;

			if (!ViewGroup.value?.selected) {
				rowClick();
			}
		});

	loading.value = false;
}

// 选择
function rowClick(item?: any) {
	if (!item) {
		item = list.value[0];
	}

	if (item) {
		emit("refresh", {
			category_id: item.id,
			model_id: props.modelId,
			type_id: props.typeId,
			page: 1
		});

		ViewGroup.value?.select(item);
		ViewGroup.value?.setTitle(`线索汇聚（${item.title}）`);
	}
}

// 编辑
function edit(item?: any) {
	Form.value?.open({
		title: item ? "编辑栏目" : "添加栏目",
		width: "500px",
		props: {
			labelWidth: "100px"
		},
		items: [
			{
				label: "栏目",
				prop: "title",
				component: {
					name: "el-input",
					props: {
						maxlength: 20,
						placeholder: "请输入栏目名称"
					}
				},
				required: true
			},
			{
				label: "key名称",
				prop: "key_name",
				component: {
					name: "el-input",
					props: {
						maxlength: 20,
						placeholder: "请输入key名称"
					}
				},
				required: true
			}
		],
		form: {
			...item,
			model_id: props.modelId,
			type_id: props.typeId
		},
		on: {
			submit(data, { close, done }) {
				service.dzh3164.category[item ? "update" : "add"](data)
					.then(() => {
						ElMessage.success("保存成功");
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

// 右键
function onContextMenu(e: any, item: any) {
	ContextMenu.open(e, {
		hover: {
			target: "item"
		},
		list: [
			{
				label: "编辑",
				hidden: !checkPerm(service.dzh3164.category.permission.update),
				callback(done) {
					done();
					edit(item);
				}
			},
			{
				label: "删除",
				hidden: !checkPerm(service.dzh3164.category.permission.delete),
				callback(done) {
					done();

					ElMessageBox.confirm("是否要删除该类型？", "提示", {
						type: "warning"
					})
						.then(() => {
							service.dzh3164.category
								.delete({
									ids: [item.id]
								})
								.then(async () => {
									ElMessage.success("删除成功");

									// 刷新列表
									await refresh();

									// 删除当前
									if (ViewGroup.value?.selected?.id == item.id) {
										rowClick();
									}
								})
								.catch((err) => {
									ElMessage.error(err.message);
								});
						})
						.catch(() => null);
				}
			}
		]
	});
}

onMounted(() => {
	refresh();
});
</script>

<style lang="scss" scoped>
.category {
	height: 100%;
	width: 100%;
	box-sizing: border-box;
	white-space: nowrap;

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 40px;
		font-size: 14px;
		padding: 0 10px;
	}

	.list {
		height: calc(100% - 40px);
		padding: 0 10px;
		box-sizing: border-box;

		ul {
			height: 100%;

			li {
				display: flex;
				align-items: center;
				list-style: none;
				box-sizing: border-box;
				padding: 10px 35px 10px 10px;
				cursor: pointer;
				font-size: 13px;
				margin-bottom: 10px;
				border-radius: 3px;
				color: #666;
				position: relative;
				background-color: #f7f7f7;

				.el-icon {
					position: absolute;
					right: 10px !important;
				}

				&.is-active {
					background-color: var(--color-primary);
					color: #fff;
				}

				&:hover {
					opacity: 0.8;
				}
			}

			&::after {
				display: block;
				content: "";
				height: 1px;
			}
		}
	}
}
</style>
