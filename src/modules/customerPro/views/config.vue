<template>
	<div class="view-my">
		<el-tabs type="border-card">
			<el-tab-pane label="绑定微信">
				<el-form :model="basicForm" label-width="auto" style="max-width: 600px">
					<div v-if="isAdmin">
						<el-form-item label="公众号订阅链接">
							<el-input
								v-model="basicForm.wpSubscribeUrl"
								placeholder="格式：http://移动端域名/#/pages/index/wxSubscribe<"
							/>
							<span style="color: #ea4300; font-size: 14px"
								>格式：http://移动端域名/#/pages/index/wxSubscribe</span
							>
						</el-form-item>

						<el-form-item label="公众号消息推送">
							<el-switch
								v-model="basicForm.pushWp"
								inline-prompt
								active-text="推送"
								inactive-text="禁止"
								:active-value="pushWp.active"
								:inactive-value="pushWp.inactive"
							/>
						</el-form-item>
					</div>

					<el-form-item label="接收线索分配" v-if="!isAdmin">
						<el-switch
							v-model="basicForm.publishStatus"
							inline-prompt
							active-text="接收"
							inactive-text="禁止"
							:active-value="pushWp.active"
							:inactive-value="pushWp.inactive"
						/>
					</el-form-item>
				</el-form>

				<el-card style="max-width: 600px">
					<template #header>
						<div style="max-width: 800px">
							<div style="padding: 10px; color: #ea4300">
								扫码绑定公众号，接收通知
							</div>

							<el-steps direction="vertical" :active="4" :space="30">
								<el-step>
									<template #title>
										<span style="font-size: 14px">
											先在“基础设置-公众号管理-配置-基础设置-公众号”中配置好公众号相关参数；
										</span>
									</template>
								</el-step>
								<el-step>
									<template #title>
										<span style="font-size: 14px">
											在“基础设置-公众号管理-消息模版”中添加已在公众号后台审核通过的消息模版；
										</span>
									</template>
								</el-step>
								<el-step>
									<template #title>
										<span style="font-size: 14px"> 关注该公众号； </span>
									</template>
								</el-step>
								<el-step>
									<template #title>
										<span style="font-size: 14px">
											扫码绑定微信。 取消关注公众号后无法再接收到微信通知；
										</span>
									</template>
								</el-step>
							</el-steps>
						</div>
					</template>

					<div
						style="
							padding: 5px;
							display: flex;
							flex-direction: row;
							justify-content: space-around;
							align-items: center;
						"
					>
						<!-- <el-image style="width: 180px; height: 180px" :src="url" fit="fill" /> -->

						<vue-qr
							id="payQR"
							v-if="basicForm.wpSubscribeUrl"
							:text="basicForm.wpSubscribeUrl"
							:size="248"
							colorDark="#f76707"
							colorLight="#ffffff"
							:logoSrc="logo"
						/>

						<el-result
							icon="success"
							title="成功绑定"
							v-if="!isAdmin && userInfo?.notify"
						>
						</el-result>
						<el-result
							icon="info"
							title="请扫码绑定"
							v-if="!isAdmin && !userInfo?.notify"
						>
						</el-result>
					</div>
				</el-card>
			</el-tab-pane>
		</el-tabs>

		<el-form-item style="margin-top: 30px">
			<el-button type="primary" :disabled="loading" @click="save">保存修改</el-button>
		</el-form-item>
	</div>
</template>
<script lang="ts" name="customer_pro-setting" setup>
import { useCool } from "/@/cool";
import { useBase } from "/$/base";
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import vueQr from "vue-qr/src/packages/vue-qr.vue";

const { service } = useCool();
const { user } = useBase();
const userInfo = ref();
const isAdmin = ref(false);
const loading = ref(false); // 保存状态
const basicForm: any = ref({}); // 表单数据
const logo = ref("/customer_pro/mpico.png");
const pushWp = reactive({
	active: 1,
	inactive: 0
});

// 获取资料
const getForm = async () => {
	basicForm.value = await service.customer_pro.config.info({ id: 1 });
};

// 保存
const save = () => {
	console.log("basicForm", basicForm.value);

	loading.value = true;
	service.customer_pro.config
		.update({
			id: 1,
			...basicForm.value
		})
		.then(() => {
			ElMessage.success("更新成功");
		})
		.catch((e) => {
			ElMessage.error(e.message);
		})
		.finally(() => {
			loading.value = false;
			getForm();
		});
};

// 获取账号信息
const getUserInfo = async () => {
	userInfo.value = await service.customer_pro.comm.person();
	isAdmin.value = userInfo.value.roleIds.split(",").includes("1");
	console.log("isAdmin", isAdmin.value);
};

onMounted(async () => {
	await getUserInfo();
	console.log("userInfo", userInfo.value);
	getForm();
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
