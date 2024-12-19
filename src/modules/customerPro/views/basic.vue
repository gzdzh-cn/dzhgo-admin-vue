<template>
	<div class="view-my">
		<el-tabs type="border-card">
			<el-tab-pane label="基础配置">
				<div style="margin: 0 auto">
					<cl-form ref="configFormRef" :inner="true">
						<template #slot-projectAllGroup="{ scope }">
							<el-switch
								v-model="scope.projectAllGroup"
								:active-value="switchV.active"
								:inactiv-value="switchV.inactiv"
								active-text="可分配"
								inactive-text="禁止"
								inline-prompt
								style="width: 80px"
							/>
							<span style="padding-left: 10px; color: #ff6b6b"
								>设置客服列表里面的成员是否可以分配线索给同项目内的其他组别成员</span
							>
						</template>
						<template #slot-projectMultiManger="{ scope }">
							<el-switch
								v-model="scope.projectMultiManger"
								:active-value="switchV.active"
								:inactiv-value="switchV.inactiv"
								active-text="多个"
								inactive-text="单个"
								inline-prompt
								style="width: 80px"
							/>
							<span style="padding-left: 10px; color: #ff6b6b"
								>设置项目管理，每个项目是否可以添加多个项目管理员</span
							>
						</template>
					</cl-form>
				</div>
			</el-tab-pane>
		</el-tabs>

		<!-- <el-form-item style="margin-top: 30px">
			<el-button type="primary" :disabled="loading" @click="save">保存修改</el-button>
		</el-form-item> -->
	</div>
</template>
<script lang="ts" name="base-setting" setup>
import { useCool } from "/@/cool";
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElLoading } from "element-plus";
import { useForm } from "@cool-vue/crud";

interface Contact {
	contactName: string;
	imgUrl: string;
}

const { service } = useCool();
const payType = ref([1, 2]);
const basicForm: any = ref({}); // 表单数据
const switchV = reactive({
	active: 1,
	inactiv: 0
});

const configFormRef = useForm();
const configFormOpen = async () => {
	const basic = await service.customer_pro.basic.info({ id: 1 });
	configFormRef.value?.open({
		title: "基础配置",
		items: [
			{
				label: "分配其他组员",
				prop: "projectAllGroup",
				component: {
					name: "slot-projectAllGroup",
					props: {}
				}
			},
			{
				label: "多个项目主管",
				prop: "projectMultiManger",
				component: {
					name: "slot-projectMultiManger",
					props: {}
				}
			},
			{
				label: "分配方式",
				prop: "allotType",
				value: 1,
				component: {
					name: "el-select",
					options: [
						{
							label: "不分配",
							value: 0
						},
						{
							label: "按顺序分配",
							value: 1
						},
						{
							label: "随机分配",
							value: 2
						}
					]
				}
			},
			{
				label: "分配列表",
				prop: "allotServicesNames",
				component: { name: "el-input", props: { disabled: true } }
			},
			{
				label: "下次分配",
				prop: "userName",
				component: { name: "el-input", props: { disabled: true } }
			}
		],
		form: {
			...basic
		},
		on: {
			async open() {},
			submit(data, { close, done }) {
				service.customer_pro.basic.update({ ...data }).then(() => {
					done();
					// close();
					configFormOpen();
					ElMessage.success("保存成功");
				});
			}
		},
		op: {
			buttons: ["save"]
		}
	});
};

// 获取资料
const getInfo = async () => {
	basicForm.value = await service.customer_pro.basic.info({ id: 1 });
};
// 保存状态
const loading = ref(false);
const loadingPage = ref();

// 保存
const save = () => {
	loading.value = false;
	service.customer_pro.basic
		.update({
			id: 1,
			...basicForm.value
		})
		.then(() => {
			ElMessage.success("更新成功");
		});
};

onMounted(() => {
	// getInfo();
	configFormOpen();
});
</script>
<style lang="scss" scoped>
.cl-form__footer {
	justify-content: flex-start !important;
}
</style>

<style lang="scss">
.view-my {
	background-color: var(--el-bg-color);
	// height: 100%;
	padding: 20px;
	box-sizing: border-box;

	.el-form {
		width: 100%;
		max-width: 100%;
	}

	.box-con {
		width: 100%;
		padding-bottom: 50px;

		.box-list {
			width: 100%;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: flex-start;

			.box-item {
				width: 200px;
				margin-right: 20px;

				.box-col {
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
				}

				.avatar {
					width: 100%;
				}
			}
		}

		.add {
			width: 100%;
			text-align: center;
			font-size: 30px;
		}
	}

	.title {
		margin-bottom: 30px;
		font-size: 15px;
	}
}

.el-textarea__inner {
	min-height: 100px;
}

.avatar-uploader {
	margin-top: 20px;
	margin-bottom: 20px;
}

.avatar-uploader .el-upload {
	border: 1px dashed var(--el-border-color);
	border-radius: 6px;
	cursor: pointer;
	position: relative;
	overflow: hidden;
	transition: var(--el-transition-duration-fast);
}

.avatar-uploader .el-upload:hover {
	border-color: var(--el-color-primary);
}

.el-icon.avatar-uploader-icon {
	font-size: 28px;
	color: #8c939d;
	width: 178px;
	height: 178px;
	text-align: center;
}
</style>
