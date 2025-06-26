<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新按钮 -->
			<cl-refresh-btn />
			<!-- 新增按钮 -->
			<!-- <cl-add-btn /> -->
			<!-- 删除按钮 -->
			<cl-multi-delete-btn />

			<el-button plain @click="toggleRowExpansion()" style="margin-right: 10px">
				{{ isExtend ? "全部收起" : "全部展开" }}
			</el-button>
			<el-button
				plain
				@click="openExcelDialog()"
				style="margin-right: 10px"
				v-if="service.customer_pro.clues_filter._permission.excel"
			>
				导出Excel
			</el-button>
			<el-button
				type="warning"
				:disabled="Table?.selection.length == 0"
				@click="openDistribute"
				v-permission="service.customer_pro.clues_filter._permission.distribute"
				>分配</el-button
			>

			<cl-flex1 />

			<el-button type="info" text bg :icon="Search" v-show="searchStatus">
				正在搜索中
			</el-button>
			<!-- 高级按钮 -->
			<cl-adv-btn />
			<!-- 关键字搜索 -->
			<cl-search-key />
		</cl-row>

		<cl-row>
			<!-- 数据表格 -->
			<cl-table
				ref="Table"
				:border="false"
				:default-expand-all="true"
				:row-class-name="tableRowClassName"
			>
				<template #column-detail="{ scope }">
					<div style="padding: 0 30px">
						<p v-if="isAdmin">唯一码: {{ scope.row?.id }}</p>
						<p>guestId: {{ scope.row?.guestId }}</p>
						<p v-if="scope.row?.source_from == 1 && scope.row?.createdName">
							创建者: {{ scope.row?.createdName }}
						</p>
						<p>账户: {{ scope.row?.account_name }}</p>
						<p>来源: {{ sourceFormatter(scope.row?.source_from) }}</p>
						<p>IP归属地: {{ scope.row?.guestIpInfo }}</p>
						<p>
							创建时间:
							{{ scope.row?.createTime }}
						</p>
						<p v-if="scope.row?.remark">备注: {{ scope.row?.remark }}</p>
						<p>过滤原因: {{ scope.row?.filterRemark }}</p>
					</div>
				</template>
				<template #slot-op="{ scope }">
					<div
						style="
							display: flex;
							flex-direction: row;
							flex-wrap: wrap;
							align-items: center;
							gap: 12px;
						"
					>
						<el-button text bg type="info" @click="openFollow(scope.row)"
							>跟进</el-button
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

		<!-- 项目分配 -->
		<cl-form ref="DistributeFormRef">
			<template #slot-project_id="{ scope }">
				<el-select v-model="scope.project_id" @change="projectChange">
					<el-option
						v-for="item in projectList"
						:key="item.value"
						:label="item.name"
						:value="item.id"
					/>
				</el-select>
			</template>

			<template #slot-group_id="{ scope }">
				<el-select v-model="scope.group_id" @change="groupChange">
					<el-option
						v-for="item in groupList"
						:key="item.value"
						:label="item.name"
						:value="item.id"
					/>
				</el-select>
			</template>

			<template #slot-services_id="{ scope }">
				<el-select v-model="scope.services_id">
					<el-option
						v-for="item in kfList"
						:key="item.value"
						:label="item.name"
						:value="item.userId"
					/>
				</el-select>
			</template>
		</cl-form>

		<!-- 跟进弹窗 -->
		<cl-dialog title="跟进" v-model="visible">
			<sub-follow ref="FollowRef" :id="cluesId" :status="cluesStatus" @cancel="cancel" />
		</cl-dialog>

		<!-- 高级搜索 -->
		<cl-adv-search ref="AdvSearch" />
		<cl-dialog title="导出Excel" v-model="openExcel">
			<div class="exportBox">
				<el-button plain @click="toexcel(true)" style="margin-right: 10px">
					导出当前页
				</el-button>
				<el-button
					plain
					@click="toexcel(false)"
					style="margin-right: 10px"
					v-loading.fullscreen.lock="fullscreenLoading"
				>
					导出全部
				</el-button>
			</div>
			<div class="excel-table">
				<excel-down ref="excelDownRef" :clues_status="clues_status" :isAdmin="isAdmin" />
			</div>
		</cl-dialog>
	</cl-crud>
</template>

<script lang="ts" name="customer_pro-clues_filter" setup>
import { useCrud, useForm, useTable, useUpsert, useAdvSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useBase } from "/$/base";
import { useDict } from "/$/dict";
import { onMounted, ref, watch } from "vue";
import { ElMessage, TabsPaneContext, ElLoading } from "element-plus";
import { Search } from "@element-plus/icons-vue";
import SubFollow from "../components/clues/subFollow.vue";
import excelDown from "../components/clues/excelDown.vue";

const { dict } = useDict();
const { service } = useCool();
const { user } = useBase();
const projectList = ref(); // 项目列表
const searchData = ref(); //搜索条件
const openExcel = ref(false); //打开导出弹窗
const searchStatus = ref(false); // 搜索状态
const cluesId = ref(); //线索id
const cluesStatus = ref(3); //线索状态
const isExtend = ref(true); //展开
const clues_status = ref(3);
const serviceGroup = ref(); // 客服组

// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		() => {
			return {
				label: "53标识",
				prop: "guest_id",
				span: 12,
				hidden: Upsert.value?.mode == "add",
				component: { name: "el-input", props: { disabled: true } }
			};
		},
		() => {
			return {
				label: "项目",
				prop: "project_id",
				span: 12,
				required: true,
				component: { name: "el-select", props: { disabled: Upsert.value?.mode !== "add" } }
			};
		},
		() => {
			return {
				label: "IP",
				prop: "ip",
				span: 12,
				hidden: Upsert.value?.mode == "add",
				component: { name: "el-input", props: { disabled: true } }
			};
		},
		() => {
			return {
				label: "IP归属地",
				prop: "guest_ip_info",
				span: 12,
				hidden: Upsert.value?.mode == "add",
				component: { name: "el-input", props: { disabled: true } }
			};
		},
		{
			label: "姓名",
			prop: "name",
			span: 12,
			component: { name: "el-input" }
		},
		{
			label: "来源",
			prop: "source_from",
			span: 12,
			required: true,
			component: { name: "el-select" }
		},

		{ label: "关键字", prop: "keywords", span: 12, component: { name: "el-input" } },

		{ label: "手机号", prop: "mobile", span: 12, component: { name: "el-input" } },
		{ label: "微信号", prop: "wechat", span: 12, component: { name: "el-input" } },

		{ label: "学历", prop: "education", span: 12, component: { name: "el-select" } },
		{ label: "毕业院校", prop: "graduated_school", span: 12, component: { name: "el-input" } },

		{ label: "意向院校", prop: "school_id", span: 12, component: { name: "slot-school_id" } },
		{ label: "意向专业", prop: "majors_id", span: 12, component: { name: "slot-majors_id" } },

		{ label: "报读类型", prop: "majors_type", span: 12, component: { name: "el-select" } },
		{ label: "报读层次", prop: "degree_id", span: 12, component: { name: "el-select" } },

		{ label: "户口类型", prop: "household_type", span: 12, component: { name: "el-select" } },
		{ label: "户籍地址", prop: "household_address", span: 12, component: { name: "el-input" } },

		{
			label: "线索等级",
			prop: "level",
			span: 12,
			component: {
				name: "el-select",
				options: []
			}
		},
		{
			label: "性别",
			prop: "gender",
			span: 12,
			component: {
				name: "el-select"
			}
		},
		{
			label: "紧急联系人电话",
			prop: "emergency_mobile",
			props: {
				labelWidth: "130px"
			},
			span: 12,
			component: { name: "el-input" }
		},
		{
			label: "备注",
			prop: "remark",
			component: { name: "el-input", props: { type: "textarea", rows: 4 } }
		}
	],
	async onOpen(data) {
		// 学校列表
		getSchoolList();

		// 项目
		const projectList = await service.customer_pro.project.list();
		Upsert.value?.setOptions(
			"project_id",
			projectList.map((e) => {
				return {
					label: e.name,
					value: e.id
				};
			})
		);

		// 报读类型
		const majorsTypeList = await service.customer_pro.readtypes.list();
		Upsert.value?.setOptions(
			"majors_type",
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
			"degree_id",
			degreeList.map((e) => {
				return {
					label: e.name,
					value: e.id
				};
			})
		);

		// 户口性质
		Upsert.value?.setOptions("household_type", [
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
		Upsert.value?.setOptions("level", dict.get("cluesLevel").value);

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
	}
});

// cl-table 配置
const Table = useTable({
	columns: [
		{ type: "selection" },
		() => {
			return {
				label: "#",
				type: "expand",
				prop: "detail"
			};
		},
		{
			label: "序号",
			prop: "id",
			width: 100,
			formatter(row, column, value, index) {
				if (row.id > 67114) {
					return row.serialId;
				} else {
					return row.id;
				}
			}
		},

		{ label: "项目", prop: "project_name" },
		{
			label: "姓名",
			prop: "name",
			width: 150
		},

		{ label: "手机号", prop: "mobile" },
		{ label: "微信号", prop: "wechat" },
		{ label: "关键词", prop: "keywords" },

		{ type: "op", width: 160, buttons: ["slot-op"] }
	]
});

// cl-crud 配置
const Crud = useCrud(
	{
		service: service.customer_pro.clues_filter,
		async onRefresh(params, { render }) {
			searchData.value = params;
			params.status = 3;
			const { list, pagination } = await service.customer_pro.clues_filter.page(params);
			render(list, pagination);
		}
	},
	(app) => {
		app.refresh();
	}
);

// 刷新
const refresh = (params?: any) => {
	Crud.value?.refresh(params);
};

// 来源
const sourceFormatter = (v: string) => {
	switch (v) {
		case "1":
			return "手动录入";
		case "2":
			return "百度";
		case "3":
			return "抖音";
		case "4":
			return "53客服";
		case "5":
			return "小红书";
		default:
			break;
	}
};
// 展开按钮
const toggleRowExpansion = () => {
	isExtend.value = !isExtend.value;
	Table.value?.data.map((item: any) => {
		Table.value?.toggleRowExpansion(item, isExtend.value);
	});
};

// 跟进弹窗
const visible = ref(false);
const openFollow = (row: any) => {
	cluesId.value = row.id;
	cluesStatus.value = row.status;
	visible.value = true;
};
// 取消
const cancel = () => {
	visible.value = false;
	refresh();
};

// 分配表单打开
const DistributeFormRef = useForm(); //分配表单
const openDistribute = async () => {
	groupList.value = [];
	DistributeFormRef.value?.setForm("group_id", null);
	kfList.value = [];
	DistributeFormRef.value?.setForm("services_id", null);

	projectList.value = await service.customer_pro.project.list();
	const ids = Crud.value?.selection.map((e) => {
		return e.id;
	});

	// const item: any = [];
	DistributeFormRef.value?.open({
		title: `分配`,
		items: [
			{
				label: "项目",
				prop: "project_id",
				component: {
					name: "slot-project_id"
				},
				required: true
			},
			{
				label: "客服组",
				prop: "group_id",
				component: {
					name: "slot-group_id"
				},
				required: true
			},
			{
				label: "接收人",
				prop: "services_id",
				component: {
					name: "slot-services_id"
				},
				required: true
			}
		],

		on: {
			async open() {},
			submit(data, { done, close }) {
				service.customer_pro.clues_filter
					.distribute({
						ids: ids,
						servicesId: data.services_id
					})
					.then(() => {
						ElMessage.success("分配完成");
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
};

// 项目id
const projectId = ref();
// 项目id改变
const projectChange = (v: any) => {
	groupList.value = [];
	DistributeFormRef.value?.setForm("group_id", null);
	kfList.value = [];
	DistributeFormRef.value?.setForm("services_id", null);
	projectId.value = v;
	getGroupList(v);
};

// 组别id改变
const groupChange = (v: any) => {
	kfList.value = [];
	DistributeFormRef.value?.setForm("services_id", null);
	getKfList(v, projectId.value);
};

// 客服组列表
const groupList = ref();
const getGroupList = async (projectId: string) => {
	groupList.value = await service.customer_pro.project_group.list({ projectId });
};

// 客服人员列表
const kfList = ref();
const getKfList = async (groupId: string, projectId: string) => {
	kfList.value = await service.customer_pro.kf.list({ groupId, projectId });
};

// table行颜色
const tableRowClassName = () => {
	return "rowColor";
};
// 打开弹窗
const openExcelDialog = () => {
	openExcel.value = true;
};
const fullscreenLoading = ref(false);
const excelDownRef = ref();
// 导出excel
const toexcel = async (isCurrent: boolean) => {
	const loading = ElLoading.service({
		lock: true,
		text: "Loading",
		background: "rgba(0, 0, 0, 0.7)"
	});
	const result = await service.customer_pro.clues.excel({
		...searchData.value,
		isCurrentPage: isCurrent
	});

	loading.close();

	if (result.status == 1) {
		ElMessage.warning(result.msg);
	} else {
		ElMessage.success("导出任务已启动，请等待完成");
		excelDownRef.value.refresh();
	}

	return;
};
watch(
	() => openExcel.value,
	(val) => {
		if (!val) {
			console.log("停止任务");
			excelDownRef.value.stopInterval();
		}
	}
);
// 时间选择器起始
const defaultTime = new Date();
// 高级搜索
const AdvSearch = useAdvSearch({
	items: [
		// {
		// 	label: "线索等级",
		// 	prop: "levelStatus",
		// 	component: {
		// 		name: "el-select",
		// 		props: {
		// 			clearable: true
		// 		},
		// 		options: dict.get("cluesLevel")
		// 	}
		// },
		() => {
			return {
				label: "来源",
				prop: "sourceStatus",
				component: {
					name: "el-select",
					props: {
						clearable: true
					},
					options: () => {
						let option = [
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
							}
						];

						if (isAdmin.value) {
							option.push({
								label: "测试数据",
								value: "-1"
							});
						}

						return option;
					}
				}
			};
		},
		() => {
			return {
				label: "客服组",
				prop: "serviceGroup",
				component: {
					name: "el-select",
					props: {
						clearable: true
					},
					options: serviceGroup.value
				}
			};
		},
		{
			label: "时间",
			prop: "datetimerange",
			component: {
				name: "el-date-picker",
				props: {
					type: "datetimerange",
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
	onSearch(data, { next, close }) {
		next(data);
		searchStatus.value = false;
		searchStatus.value = Object.values(data).some((value) => {
			if (value) return true;
		});
	}
});

const userInfo = ref();
// 是否是管理员
const isAdmin = ref(false);
const getUserInfo = async () => {
	userInfo.value = await service.customer_pro.comm.person();
	isAdmin.value = user.info.roleIds.split(",").includes("1");
};

// 客服组
const getServiceGroup = async () => {
	const list = await service.customer_pro.project_group.list();
	serviceGroup.value = list.map((item) => {
		return {
			label: item.name,
			value: item.id
		};
	});
};

onMounted(async () => {
	await getUserInfo();
	await getServiceGroup();
});
</script>

<style lang="scss" scoped>
.dialog-footer {
	display: inline-flex;
	flex-direction: row;
	gap: 10px;
}
// 表格表头的背景色;
:deep(.el-table .rowColor) {
	background: #f0f0f1;
}

:deep(.el-pagination) {
	width: 100%;
	justify-content: end;
}
.el-button + .el-button {
	margin-left: 0;
}

.exportBox {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
}
.excel-table {
	height: 600px;
}
</style>
