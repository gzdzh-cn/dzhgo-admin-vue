<template>
	<el-tabs v-model="activeName" type="border-card" @tab-click="handleClick">
		<el-tab-pane label="创建记录" name="order">
			<el-divider content-position="left">基本信息</el-divider>
			<div style="min-height: 100px; height: 400px">
				<div style="height: 110px">
					<cl-crud ref="Crud">
						<cl-row>
							<!-- 数据表格 -->
							<cl-table ref="Table" />
						</cl-row>
					</cl-crud>
				</div>

				<el-divider content-position="left" v-if="status == 0">创建记录</el-divider>

				<el-form
					style="margin-top: 55px"
					ref="formRef"
					:model="form"
					:rules="rules"
					:inline="true"
					label-width="auto"
					v-if="status == 0 && service.customer_pro.clues._permission.followAdd"
				>
					<el-form-item label="跟进方式" prop="followType" style="width: 45%">
						<el-cascader
							v-model="form.followType"
							:options="followOptions"
							@change="handleChange"
							:props="followProps"
							clearable
							placeholder="选择跟进方式"
						/>
					</el-form-item>
					<el-form-item label="下次跟进" prop="nextFollowupTime" style="width: 45%">
						<el-date-picker
							v-model="form.nextFollowupTime"
							type="datetime"
							:default-time="defaultTime"
							value-format="YYYY-MM-DD HH:mm"
							time-format="HH:mm"
							:disabled-date="disabledDate"
							placeholder="选择跟进时间"
						/>
					</el-form-item>
					<el-form-item label="跟进内容" prop="remark" style="width: 100%">
						<el-input
							v-model="form.remark"
							type="textarea"
							:autosize="{ minRows: 4, maxRows: 8 }"
							placeholder="填写跟进内容"
						/>
					</el-form-item>
				</el-form>
			</div>
		</el-tab-pane>

		<el-tab-pane
			label="跟进记录"
			name="follow"
			v-if="service.customer_pro.clues._permission.followList"
		>
			<el-divider content-position="left">进度</el-divider>
			<div style="min-height: 100px; height: 400px; overflow: auto">
				<div style="min-height: 100px">
					<el-steps
						:active="flolowContent.length"
						direction="vertical"
						finish-status=""
						v-if="flolowContent"
					>
						<el-step
							:icon="Edit"
							style="margin: 0 0 10px 0"
							v-for="(item, index) in flolowContent"
							:key="index"
						>
							<template #title>
								<h4>{{ item.followTypeName }}</h4>
							</template>
							<template #description>
								<div style="">
									<p style="font-weight: 400">
										{{ item.remark }}
									</p>
									<p style="font-weight: 200">
										下次跟进时间：{{ item.nextFollowupTime }}
									</p>
									<p style="font-weight: 200">
										添加时间： {{ item.createTime }}「{{ item.userName }}」
									</p>
								</div>
							</template>
						</el-step>
					</el-steps>
				</div>
			</div>
		</el-tab-pane>

		<el-tab-pane
			label="聊天记录"
			name="talk"
			v-if="service.customer_pro.clues._permission.chatContentList"
		>
			<el-divider content-position="left">聊天记录</el-divider>
			<el-tabs tab-position="left" style="height: 500px">
				<el-tab-pane
					v-for="(chatContent, index) in chatContentList"
					:key="index"
					:label="`版本${chatContent.chatContentVersion}`"
				>
					<div style="min-height: 100px; height: 500px; overflow: auto">
						<el-steps
							v-if="chatContent && chatContent?.chat_content"
							:active="strToJson(chatContent?.chat_content).length"
							direction="vertical"
						>
							<el-step
								:icon="
									strToJson(chatContent?.chat_content).msg_type == 'g'
										? UserFilled
										: ChatLineRound
								"
								style="margin: 0 0 10px 0"
								v-for="(item, index) in strToJson(chatContent?.chat_content)"
								:key="index"
							>
								<template #title>
									<h4>
										{{ item.msg_type == "g" ? "访客" : item.worker_name }}
									</h4>
								</template>
								<template #description>
									<div style="">
										<template v-if="item.msg?.includes('[IMG]')">
											<div
												v-for="(v, index) in extractImgTags(item.msg)"
												:key="index"
											>
												<img :src="v" style="width: 100px" />
											</div>
										</template>
										<template v-else>
											<p style="font-weight: 400">
												<span v-html="item.msg"></span>
											</p>
										</template>

										<p style="font-weight: 200">
											{{
												dayjs(item.msg_time, "YYYYMMDDHHmmss").format(
													"YYYY-MM-DD HH:mm:ss"
												)
											}}
										</p>
									</div>
								</template>
							</el-step>
						</el-steps>
					</div>
				</el-tab-pane>
			</el-tabs>
		</el-tab-pane>
	</el-tabs>
</template>

<script lang="ts" name="customeer_pro-subFollow" setup>
import { useCool } from "/@/cool";
import { onMounted, reactive, ref } from "vue";
import { useCrud, useTable } from "@cool-vue/crud";
import { dayjs, ElMessage, FormInstance } from "element-plus";
import { Edit, ChatLineRound, UserFilled } from "@element-plus/icons-vue";

const props = defineProps({
	id: String,
	status: Number
});
interface RuleForm {
	followType: string[];
	nextFollowupTime: string;
	remark: string;
}
const emit = defineEmits(["cancel"]);
const { service } = useCool();
interface ChatContent {
	company_id?: string;
	id6d?: string;
	msg?: string;
	msg_time?: string;
	msg_type?: string;
	new_type?: string;
	talk_id?: string;
	worker_id?: string;
	worker_name?: string;
}
interface Chat {
	id?: string;
	clues_id?: string;
	guest_id?: string;
	chat_content: string;
	chatContentVersion?: number;
}
// 聊天记录
const chatContentList = ref<Chat[]>([]);

interface FlolowContent {
	followTypeName?: string;
	nextFollowupTime?: string;
	createTime?: string;
	userName?: string;
	remark?: string;
}
const flolowContent = ref<FlolowContent[]>([]);

// 时间选择器起始
const defaultTime = new Date();
//禁用当前日期之前的日期
function disabledDate(time: { getTime: () => number }) {
	//Date.now()是javascript中的内置函数，它返回自1970年1月1日00:00:00 UTC以来经过的毫秒数。
	return time.getTime() < Date.now() - 8.64e7;
}
// cl-table 配置
const Table = useTable({
	columns: [
		{
			label: "姓名",
			prop: "name",
			width: 250
		},

		{ label: "手机号", prop: "mobile" },
		{ label: "微信号", prop: "wechat" },
		{
			label: "来源",
			prop: "source_from",
			dict: [
				{
					label: "手动录入",
					value: 1
				},
				{
					label: "百度",
					value: 2
				},
				{
					label: "抖音",
					value: 3
				},
				{
					label: "53客服",
					value: 4
				},
				{
					label: "小红书",
					value: 5
				}
			]
		}
	]
});

// cl-crud 配置
const Crud = useCrud({
	service: service.customer_pro.clues,
	async onRefresh(params, { render }) {
		const list: any = await service.customer_pro.clues.list({ id: params.id });

		// 获取跟进记录
		if (service.customer_pro.clues._permission.followList) {
			flolowContent.value = await service.customer_pro.clues.followList({
				cluesId: params.id
			});
		}

		// 获取53客服聊天记录
		if (service.customer_pro.clues._permission.chatContentList) {
			chatContentList.value = await service.customer_pro.clues.chatContentList({
				cluesId: params.id
			});
		}

		// 渲染数据
		render(list);
	}
});
// 标签
const activeName = ref("order");
const handleClick = () => {};

const formRef = ref<FormInstance>();
const form = reactive<RuleForm>({
	followType: [],
	nextFollowupTime: "",
	remark: ""
});

// 表格规则
const rules = reactive({
	followType: [{ required: true, message: "选择跟进方式", trigger: "change" }],
	nextFollowupTime: [
		{
			required: true,
			message: "选择下次跟进时间",
			trigger: "change"
		}
	],
	remark: [
		{
			required: true,
			message: "填写备注",
			trigger: "change"
		}
	]
});

// 跟进类型鼠标停留效果
const followProps = {
	expandTrigger: "hover" as const
};

// 跟进方式类型
const followOptions = ref([
	{
		label: "电话访谈",
		value: "2",
		children: [
			{
				label: "无人接听",
				value: "21"
			},
			{
				label: "拒接",
				value: "22"
			},
			{
				label: "已接通",
				value: "23"
			}
		]
	},
	{
		label: "微信沟通",
		value: "3",
		children: [
			{
				label: "待通过",
				value: "31"
			},
			{
				label: "拒绝通过",
				value: "32"
			},
			{
				label: "已通过",
				value: "33"
			}
		]
	},
	{
		label: "视频参观",
		value: "4"
	},
	{
		label: "预约参观",
		value: "5"
	},
	{
		label: "已参观",
		value: "6"
	}
]);

// 跟进方式改变
const handleChange = (e: any) => {
	console.log("handleChange", e);
};

// 跟进方式提交
const sub = async () => {
	if (!formRef.value) return;
	await formRef.value?.validate((valid, fields) => {
		if (valid) {
			service.customer_pro.clues
				.followAdd({
					cluesId: props.id,
					...form
				})
				.then((r) => {
					ElMessage.success("保存成功");
					emit("cancel");
				})
				.finally(() => {});
		} else {
			console.log("error submit!", fields);
			ElMessage.error("错误" + fields);
		}
	});
};

// 放入公海
const pushCommonClause = () => {
	service.customer_pro.clues.pushCommonClause({ cluesId: props.id });
	ElMessage.success("保存成功");
	emit("cancel");
};

// 取图片地址
const extractImgTags = (content: any) => {
	const regex = /\[IMG\](.*?)\[\/IMG\]/g;
	let matches;
	const results = [];

	while ((matches = regex.exec(content)) !== null) {
		const strArr = matches[1].split("?");
		results.push(strArr[0]);
	}

	return results;
};

// 转json对象
const strToJson = (str: string) => {
	if (str) {
		return JSON.parse(str);
	}
};

onMounted(() => {
	Crud.value?.refresh({ id: props.id });
});

defineExpose({
	sub,
	pushCommonClause
});
</script>
