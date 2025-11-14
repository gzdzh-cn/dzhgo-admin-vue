<template>
	<div class="view-my">
		<el-tabs type="border-card">
			<el-tab-pane label="基本参数">
				<el-form
					class="card-form"
					label-width="160px"
					:model="basicForm"
					:disabled="loading"
				>
					<el-form-item label="选题内容">
						<el-input
							v-model="basicForm.topic_planning"
							placeholder="请填写选题内容"
							:rows="8"
							type="textarea"
							clearable
						/>
					</el-form-item>
				</el-form>
			</el-tab-pane>
		</el-tabs>

		<el-form-item style="margin-top: 30px">
			<el-button type="primary" :disabled="loading" @click="save">保存修改</el-button>
		</el-form-item>
	</div>
</template>
<script lang="ts" name="base-setting" setup>
import { useCool } from "/@/cool";
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";

const { service } = useCool();

const basicForm: any = ref({}); // 表单数据

// 获取资料
const getConfig = async () => {
	basicForm.value = await service.dzh3164.config.info({ id: 1 });
};
// 保存状态
const loading = ref(false);

// 保存
const save = () => {
	loading.value = false;
	service.dzh3164.config
		.update({
			id: 1,
			...basicForm.value
		})
		.then(() => {
			ElMessage.success("更新成功");
		});
};

onMounted(() => {
	getConfig();
});
</script>
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
