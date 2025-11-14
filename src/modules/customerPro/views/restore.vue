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
			<!-- 高级按钮 -->
			<el-button type="info" text bg :icon="Search" v-show="searchStatus">
				正在搜索中
			</el-button>
			<cl-adv-btn />
			<!-- 关键字搜索 -->
			<cl-search-key />
		</cl-row>

		<cl-row>
			<!-- 数据表格 -->
			<cl-table ref="Table"> </cl-table>
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<!-- 分页控件 -->
			<cl-pagination />
		</cl-row>

		<!-- 新增、编辑 -->
		<cl-upsert ref="Upsert">
			<template #slot-school_id="{ scope }">
				<!-- 学校 -->
				<el-select v-model="scope.school_id" @change="schoolChange">
					<el-option
						v-for="item in schoolList"
						:key="item.value"
						:label="item.name"
						:value="item.id"
					/>
				</el-select>
			</template>

			<!-- 专业 -->
			<template #slot-majors_id="{ scope }">
				<el-select v-model="scope.majors_id">
					<el-option
						v-for="item in majorsList"
						:key="item.value"
						:label="item.name"
						:value="item.id"
					/>
				</el-select>
			</template>
		</cl-upsert>

		<!-- 高级搜索 -->
		<cl-adv-search ref="AdvSearch" />
	</cl-crud>
</template>

<script lang="ts" name="customer_pro-restore" setup>
import { Search } from "@element-plus/icons-vue";
import { useCrud, useTable, useUpsert, useAdvSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { ref, computed } from "vue";
import { useDict } from "/$/dict";
import { addTypeToDictOptions, STATUS_TYPE_MAPPING } from "/@/dzh";
import { ElMessage } from "element-plus";
import { useBase } from "/$/base";

const { dict } = useDict();
const { service } = useCool();
const { user } = useBase();
const isAdmin = ref(user.info.roleIds?.split(",").includes("1") || false);
// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		() => {
			return {
				label: "53标识",
				prop: "guestId",
				span: 12,
				hidden: (options: { scope: any }) => {
					return (
						Upsert.value?.mode == "add" ||
						(Upsert.value?.mode == "update" && options.scope.type !== "customer")
					);
				},
				component: { name: "el-input", props: { disabled: true } }
			};
		},

		() => {
			return {
				label: "IP",
				prop: "ip",
				span: 12,
				hidden: (options: { scope: any }) => {
					return (
						Upsert.value?.mode == "add" ||
						(Upsert.value?.mode == "update" && options.scope.type !== "customer")
					);
				},
				component: { name: "el-input", props: { disabled: true } }
			};
		},
		() => {
			return {
				label: "IP归属地",
				prop: "guestIpInfo",
				span: 12,
				hidden: (options: { scope: any }) => {
					return (
						Upsert.value?.mode == "add" ||
						(Upsert.value?.mode == "update" && options.scope.type !== "customer")
					);
				},
				component: { name: "el-input", props: { disabled: true } }
			};
		},
		{
			label: "姓名",
			prop: "name",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "customer";
			},
			component: { name: "el-input" }
		},
		() => {
			return {
				label: "来源",
				prop: "source_from",
				span: 12,
				hidden: (options: { scope: any }) => {
					return Upsert.value?.mode == "update" && options.scope.type == "talk_info";
				},
				required: true,
				value: Upsert.value?.mode == "add" ? "6" : "",
				component: { name: "el-select", props: { disabled: true } }
			};
		},

		{
			label: "关键字",
			prop: "keywords",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type == "talk_info";
			},
			component: { name: "el-input" }
		},

		{
			label: "手机号",
			prop: "mobile",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type == "talk_info";
			},
			component: { name: "el-input" }
		},
		{
			label: "微信号",
			prop: "wechat",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type == "talk_info";
			},
			component: { name: "el-input" }
		},
		{
			label: "学历",
			prop: "education",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "resource";
			},
			component: { name: "el-select" }
		},
		{
			label: "毕业院校",
			prop: "graduatedSchool",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "resource";
			},
			component: { name: "el-input" }
		},

		{
			label: "意向院校",
			prop: "schoolId",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "resource";
			},
			component: { name: "slot-school_id" }
		},
		{
			label: "意向专业",
			prop: "majorsId",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "resource";
			},
			component: { name: "slot-majors_id" }
		},

		{
			label: "报读类型",
			prop: "majorsType",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "resource";
			},
			component: { name: "el-select" }
		},
		{
			label: "报读层次",
			prop: "degreeId",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "resource";
			},
			component: { name: "el-select" }
		},

		{
			label: "户口类型",
			prop: "householdType",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "resource";
			},
			component: { name: "el-select" }
		},
		{
			label: "户籍地址",
			prop: "householdAddress",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "resource";
			},
			component: { name: "el-input" }
		},
		{
			label: "线索等级",
			prop: "level",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "resource";
			},
			component: {
				name: "el-select",
				options: []
			}
		},
		{
			label: "性别",
			prop: "gender",
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "resource";
			},
			component: {
				name: "el-select"
			}
		},
		{
			label: "紧急联系人电话",
			prop: "emergencyMobile",
			props: {
				labelWidth: "130px"
			},
			span: 12,
			hidden: (options: { scope: any }) => {
				return Upsert.value?.mode == "update" && options.scope.type !== "resource";
			},
			component: { name: "el-input" }
		},
		// 状态
		{
			label: "状态",
			prop: "status",
			span: 12,
			hidden: () => {
				return Upsert.value?.mode == "add";
			},
			component: {
				name: "el-switch",
				props: {
					activeValue: 1,
					inactiveValue: 0,
					inlinePrompt: true,
					inactiveText: "不推送",
					activeText: "推送",
					style: "width: 80px"
				}
			}
		},
		() => {
			return {
				label: "原始数据",
				prop: "remark",
				hidden: () => {
					return Upsert.value?.mode == "add";
				},
				component: { name: "el-input", props: { type: "textarea", rows: 4 } }
			};
		}
	],
	onOpen(data) {
		if (Upsert.value?.mode == "add") {
			data.type = "resource";
		}
	},

	async onOpened(data) {
		console.log("data?.type == 'customer'", data.type);

		if (data.type == "resource") {
			data.source_from = "6";
		}
		if (data.type == "customer") {
			data.source_from = "4";
		}

		if (
			Upsert.value?.mode == "add" ||
			(Upsert.value?.mode == "update" && data.type !== "talk_info")
		) {
			// 学校列表
			getSchoolList();

			// 报读类型
			const majorsTypeList = await service.customer_pro.readtypes.list();
			Upsert.value?.setOptions(
				"majorsType",
				majorsTypeList.map((e) => {
					return {
						label: e.name,
						value: e.id
					};
				})
			);

			// 报读层次
			const degreeList = await service.customer_pro.readdegree.list();
			Upsert.value?.setOptions(
				"degreeId",
				degreeList.map((e) => {
					return {
						label: e.name,
						value: e.id
					};
				})
			);

			// 户口性质
			Upsert.value?.setOptions("householdType", [
				{
					label: "城镇",
					value: "1"
				},
				{
					label: "农村",
					value: "2"
				}
			]);

			// 线索级别
			const levelOptions = dict.get("cluesLevel");
			Upsert.value?.setOptions(
				"level",
				levelOptions.value.filter((item) => item.value != null)
			);

			// 性别
			Upsert.value?.setOptions("gender", [
				{
					label: "保密",
					value: "0"
				},
				{
					label: "男",
					value: "1"
				},
				{
					label: "女",
					value: "2"
				}
			]);

			// 来源
			Upsert.value?.setOptions("source_from", [
				{
					label: "手动录入",
					value: "1"
				},
				{
					label: "百度",
					value: "2"
				},
				{
					label: "抖音",
					value: "3"
				},
				{
					label: "53客服",
					value: "4"
				},
				{
					label: "小红书",
					value: "5"
				},
				{
					label: "线索资源",
					value: "6"
				}
			]);

			// 学历
			Upsert.value?.setOptions("education", [
				{
					label: "未知",
					value: "1"
				},
				{
					label: "初中",
					value: "2"
				},
				{
					label: "高中/中专/中技",
					value: "3"
				},
				{
					label: "大专/高技",
					value: "4"
				},
				{
					label: "本科",
					value: "5"
				}
			]);

			if (data.type == "customer") {
				data.source_from = "4";
			}

			if (data.remark && typeof data.remark === "string") {
				try {
					const parsedData = JSON.parse(data.remark);
					if (parsedData.guest_ip) {
						(data as any).ip = parsedData.guest_ip;
						(data as any).guestIpInfo = parsedData.guest_ip_info;
					}
					// 姓名：guest_name -> name
					if (parsedData.guest_name) {
						(data as any).name = parsedData.guest_name;
					}

					// 手机号合并：mobile, mobile2, mobile3 -> mobile（逗号分隔）
					const mergedMobiles = [
						parsedData.mobile,
						parsedData.mobile2,
						parsedData.mobile3
					]
						.filter((v: any) => !!v)
						.join(",");
					if (mergedMobiles) {
						(data as any).mobile = mergedMobiles;
					}

					// 微信号：wechat -> wechat
					if (parsedData.wechat) {
						// (data as any).wechat = parsedData.wechat;
					}

					if (data.type == "resource") {
						// 把 remark 表格的其他字段解析到 data
						Object.assign(data, parsedData);
					}
				} catch (error) {
					console.error("解析JSON数据失败:", error);
				}
			}
		}
	},

	onSubmit(data, { next, done }) {
		// 只有 type 是 resource 时才允许保存
		if (data.type !== "resource") {
			ElMessage.error("只有线索资源可以保存");
			done();
			return;
		}

		const dataJson = {
			guest_ip: data.ip,
			guest_ip_info: data.guestIpInfo
		};
		// 提取除 ip 和 guestIpInfo 外的其他字段
		const { ip, guestIpInfo, remark, ...rest } = data;
		// dataJson合并到 rest
		next({
			id: data.id,
			type: "resource",
			keywords: data.keywords,
			status: data.status,
			remark: JSON.stringify({ ...dataJson, ...rest })
		});
	}
});

// cl-table 配置
const Table = useTable({
	columns: [
		{ type: "selection" },
		{
			label: "创建者",
			prop: "createdName",
			hidden: !isAdmin.value
		},
		{
			label: "类型",
			prop: "type",
			width: 250,
			dict: {
				text: true,
				options: dict.get("cluesType")
			},
			formatter(row) {
				const v = dict.get("cluesType").value.find((item) => item.value == row.type);
				return `${row.guestId ? row.guestId + ": " : ""} ${v?.label}`;
			}
		},
		{ label: "关键字", prop: "keywords" },
		() => {
			return {
				label: "状态",
				prop: "status",
				dict: {
					options: restoreStatusOptions
				}
			};
		},
		{ label: "创建时间", prop: "createTime", width: 160 },
		{ type: "op", buttons: ["edit", "delete"] }
	]
});

// cl-crud 配置
const Crud = useCrud(
	{
		service: service.customer_pro.restore
	},
	(app) => {
		app.refresh();
	}
);

// 学校列表
const schoolList = ref();
const majorsList = ref();
const getSchoolList = async () => {
	schoolList.value = await service.customer_pro.school.list();
	if (Upsert.value?.mode != "add") {
		getMajorList(schoolList.value[0].id);
	}
};

// 学校改变
const schoolChange = async (v: any) => {
	majorsList.value = [];
	getMajorList(v);
};

// 专业列表
const getMajorList = async (v: any) => {
	majorsList.value = await service.customer_pro.majors.list({ schoolId: v });
};

// 处理restoreStatus字典数据，添加type字段（兜底空数组）
const restoreStatusOptions = computed(() => {
	const options = dict.get("restoreStatus").value || [];
	return addTypeToDictOptions(options, STATUS_TYPE_MAPPING.ENABLE_DISABLE);
});

// 是否是管理员
// const isAdmin = ref(false);
const searchStatus = ref(false); // 搜索状态
// 时间选择器起始
const defaultTime = new Date();
const shortcuts = [
	{
		text: "最近一天",
		value: () => {
			const end = new Date();
			end.setHours(0, 0, 0, 0);
			const start = new Date();
			start.setDate(start.getDate() - 1);
			start.setHours(0, 0, 0, 0);
			return [start, end];
		}
	},
	{
		text: "最近一周",
		value: () => {
			const end = new Date();
			end.setHours(0, 0, 0, 0);
			const start = new Date();
			start.setDate(start.getDate() - 7);
			start.setHours(0, 0, 0, 0);
			return [start, end];
		}
	},
	{
		text: "最近一个月",
		value: () => {
			const end = new Date();
			end.setHours(0, 0, 0, 0);
			const start = new Date();
			start.setMonth(start.getMonth() - 1);
			start.setHours(0, 0, 0, 0);
			return [start, end];
		}
	},
	{
		text: "最近三个月",
		value: () => {
			const end = new Date();
			end.setHours(0, 0, 0, 0);
			const start = new Date();
			start.setMonth(start.getMonth() - 3);
			start.setHours(0, 0, 0, 0);
			return [start, end];
		}
	}
];
// 高级搜索
const AdvSearch = useAdvSearch({
	items: [
		{
			label: "线索类别",
			prop: "cluesType",
			component: {
				name: "el-select",
				props: {
					clearable: true
				},
				options: dict.get("cluesType")
			}
		},

		{
			label: "创建时间",
			prop: "datetimerange",
			component: {
				name: "el-date-picker",
				props: {
					type: "datetimerange",
					shortcuts: shortcuts,
					startPlaceholder: "开始日期",
					endPlaceholder: "结束日期",
					defaultTime: defaultTime,
					value: "YYYY-MM-DD HH:mm",
					valueFormat: "YYYY-MM-DD HH:mm",
					timeFormat: "HH:mm"
				}
			}
		}
	],
	op: ["reset", "close", "search"],
	onSearch(data, { next }) {
		next(data);
		searchStatus.value = false;
		searchStatus.value = Object.values(data).some((value) => {
			if (value) return true;
		});
	}
});
</script>
