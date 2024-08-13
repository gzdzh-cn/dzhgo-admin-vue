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
				type="warning"
				:disabled="Table?.selection.length == 0"
				@click="openDistribute"
				v-permission="service.customer_pro.clues._permission.distribute"
				>分配</el-button
			>

			<!-- <cl-export-btn
				:columns="Table?.columns"
				:data="onExportData"
				:disabled="Table?.selection.length == 0"
			/> -->

			<cl-flex1 />
			<!-- 关键字搜索 -->
			<cl-search-key />
		</cl-row>

		<cl-row>
			<div style="padding: 10px 0 0 0">
				<el-tabs v-model="activeName" type="card" @tab-click="handleClick">
					<el-tab-pane label="全部" name="all"> </el-tab-pane>
					<el-tab-pane label="待跟进" name="followUp"> </el-tab-pane>
					<el-tab-pane label="电话访谈" name="phone"> </el-tab-pane>
					<el-tab-pane label="微信沟通" name="wx"> </el-tab-pane>
					<el-tab-pane label="视频参观" name="video"> </el-tab-pane>
					<el-tab-pane label="预约参观" name="book"> </el-tab-pane>
					<el-tab-pane label="已参观" name="has"> </el-tab-pane>
				</el-tabs>
			</div>

			<!-- 数据表格 -->
			<cl-table ref="Table" :border="false">
				<template #column-detail="{ scope }">
					<div style="padding: 0 30px">
						<p v-if="scope.row?.userName">创建者: {{ scope.row?.userName }}</p>
						<p>账户: {{ scope.row?.account_name }}</p>
						<p v-if="scope.row?.keywords">关键字: {{ scope.row?.keywords }}</p>
						<p>
							最后跟进时间:
							{{
								scope.row?.last_followup_time
									? scope.row?.last_followup_time
									: scope.row?.createTime
							}}
						</p>
						<p>备注: {{ scope.row?.remark }}</p>
					</div>
				</template>

				<template #column-status="{ scope }">
					<span style="color: #d83b01" v-if="scope.row.status == 0"> 未成交 </span>
					<span style="color: #00b294" v-if="scope.row.status == 1"> 已成交 </span>
				</template>

				<template #slot-op="{ scope }">
					<el-button
						text
						bg
						type="primary"
						@click="edit(scope.row)"
						v-if="
							scope.row.status == 0 && service.customer_pro.clues._permission.update
						"
						>编辑</el-button
					>
					<el-button
						text
						bg
						type="primary"
						@click="edit(scope.row)"
						v-if="scope.row.status == 1 && service.customer_pro.clues._permission.info"
						>查看</el-button
					>
					<el-button text bg type="info" @click="openFollow(scope.row)">跟进</el-button>
					<el-button
						text
						bg
						type="warning"
						@click="openTracks(scope.row)"
						v-permission="service.customer_pro.clues._permission.getTrackList"
						>轨迹</el-button
					>
					<el-button
						text
						bg
						type="success"
						@click="openOrderAdd(scope.row)"
						v-if="scope.row.status == 0"
						v-permission="service.customer_pro.order._permission.add"
						>成交</el-button
					>
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
			<template #slot-school_id="{ scope }">
				<el-select v-model="scope.school_id" @change="schoolChange">
					<el-option
						v-for="item in schoolList"
						:key="item.value"
						:label="item.name"
						:value="item.id"
					/>
				</el-select>
			</template>

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
			<template #footer>
				<div class="dialog-footer">
					<el-popconfirm title="确定放入公海吗?" @confirm="pushCommonClause">
						<template #reference>
							<el-button
								type="warning"
								v-if="
									cluesStatus == 0 &&
									service.customer_pro.clues._permission.pushCommonClause
								"
							>
								放入公海
							</el-button>
						</template>
					</el-popconfirm>
					<el-button @click="visible = false">取消</el-button>
					<el-button
						type="success"
						@click="followSave"
						v-if="cluesStatus == 0 && service.customer_pro.clues._permission.followAdd"
					>
						保存
					</el-button>
				</div>
			</template>
		</cl-dialog>

		<!-- 轨迹弹窗 -->
		<cl-dialog title="轨迹" v-model="trackVisible">
			<sub-track ref="TrackRef" :id="cluesId" />
			<template #footer>
				<div class="dialog-footer">
					<el-button @click="trackVisible = false">关闭</el-button>
				</div>
			</template>
		</cl-dialog>

		<!-- 成交弹窗 -->
		<cl-form ref="OrderFormRef">
			<template #slot-school_id="{ scope }">
				<el-select v-model="scope.school_id" @change="schoolChange">
					<el-option
						v-for="item in schoolList"
						:key="item.value"
						:label="item.name"
						:value="item.id"
					/>
				</el-select>
			</template>

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
		</cl-form>
	</cl-crud>
</template>

<script lang="ts" name="customer_pro-clues" setup>
import { useCrud, useForm, useTable, useUpsert } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { ElMessage, TabsPaneContext } from "element-plus";
import { ref } from "vue";
import SubFollow from "../components/clues/subFollow.vue";
import SubTrack from "../components/clues/subTrack.vue";

const { service } = useCool();

const FollowRef = ref(); //跟进
const activeName = ref("all"); //默认标签
const cluesId = ref(); //线索id
const cluesStatus = ref(0); //线索状态
const projectList = ref(); // 项目列表

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
		{ label: "来源", prop: "source_from", span: 12, component: { name: "el-select" } },

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
		Upsert.value?.setOptions("level", [
			{
				label: "无意向",
				value: "0"
			},
			{
				label: "无效",
				value: "1"
			},
			{
				label: "有意向",
				value: "2"
			}
		]);

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

		{ label: "53标识", prop: "guest_id" },
		{ label: "项目", prop: "project_name" },
		{
			label: "姓名",
			prop: "name",
			width: 150
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
		},
		{ label: "客服", prop: "services_name" },
		{ label: "ip归属地", prop: "guest_ip_info" },

		{
			label: "状态",
			prop: "status"
			// formatter(row, column, value, index) {
			// 	switch (value) {
			// 		case 0:
			// 			return "未成交";

			// 		case 1:
			// 			return "成交";
			// 	}
			// }
		},
		{ label: "创建时间", prop: "createTime" },
		{ type: "op", width: 300, buttons: ["slot-op"] }
	]
});

// cl-crud 配置
const Crud = useCrud(
	{
		service: service.customer_pro.clues
	},
	(app) => {
		app.refresh();
	}
);

// 刷新
const refresh = (params?: any) => {
	Crud.value?.refresh(params);
};

// 导出
const onExportData = async (params: any) => {
	return Table.value?.selection;
};

// 切换类型
const handleClick = (tab: TabsPaneContext) => {
	refresh({ followType: tab.index });
};

// 编辑
const edit = (row: any) => {
	if (row.status == 0) {
		Crud.value?.rowEdit(row);
	} else {
		Crud.value?.rowInfo(row);
	}
};

// 轨迹弹窗
const trackVisible = ref(false);
const openTracks = (row: any) => {
	cluesId.value = row.id;
	trackVisible.value = true;
};

// 跟进弹窗
const visible = ref(false);
const openFollow = (row: any) => {
	cluesId.value = row.id;
	cluesStatus.value = row.status;
	visible.value = true;
};

// 保存跟进
const followSave = () => {
	FollowRef.value.sub();
};

// 取消
const cancel = () => {
	visible.value = false;
	refresh();
};

// 保存到公海
const pushCommonClause = () => {
	FollowRef.value.pushCommonClause();
	refresh();
};

// 线索成交
const OrderFormRef = useForm(); //成交表单
const openOrderAdd = async (row: any) => {
	cluesId.value = row.id;
	const cluesOne = await service.customer_pro.clues.info({ id: cluesId.value });
	OrderFormRef.value?.open({
		title: "线索成交",
		items: [
			{
				type: "tabs",
				props: {
					labels: [
						{
							label: "基础信息",
							value: "base"
						},
						{
							label: "个人信息",
							value: "person"
						},
						{
							label: "收款信息",
							value: "financial"
						}
					]
				}
			},
			{
				label: "学生名称",
				prop: "name",
				span: 8,
				component: {
					name: "el-input"
				},
				required: true,
				group: "base"
			},
			{
				label: "学生电话",
				prop: "mobile",
				span: 8,
				component: {
					name: "el-input"
				},
				required: true,
				group: "base"
			},
			{
				label: "接待人员",
				prop: "receiver",
				span: 8,
				component: {
					name: "el-input"
				},
				required: true,
				group: "base"
			},

			{
				label: "身份证",
				prop: "idcard_number",
				span: 8,
				component: {
					name: "el-input"
				},
				required: true,
				group: "base"
			},
			{
				label: "性别",
				prop: "gender",
				span: 8,
				component: {
					name: "el-select",
					options: [
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
					]
				},
				required: true,
				group: "base"
			},
			{
				label: "意向院校",
				prop: "school_id",
				span: 8,
				component: { name: "slot-school_id" }
			},
			{
				label: "意向专业",
				prop: "majors_id",
				span: 8,
				component: { name: "slot-majors_id" }
			},
			{
				label: "报读类型",
				prop: "majors_type",
				span: 8,
				component: {
					name: "el-select",
					options: []
				},
				required: true,
				group: "base"
			},
			{
				label: "报读层次",
				prop: "degree_id",
				span: 8,
				component: {
					name: "el-select",
					options: []
				},
				required: true,
				group: "base"
			},

			{
				label: "通讯地址",
				prop: "address",
				span: 24,
				component: {
					name: "el-input"
				},
				group: "person"
			},
			{
				label: "紧急联系人",
				prop: "emergency_contact",
				span: 12,
				component: {
					name: "el-input"
				},
				group: "person"
			},

			{
				label: "紧急联系人电话",
				prop: "emergency_mobile",
				props: {
					labelWidth: "130px"
				},
				span: 12,
				component: {
					name: "el-input"
				},
				group: "person"
			},
			{
				label: "微信",
				prop: "wechat",
				span: 8,
				component: {
					name: "el-input"
				},
				group: "person"
			},
			{
				label: "民族",
				prop: "nation",
				span: 8,
				component: {
					name: "el-input"
				},
				group: "person"
			},
			{
				label: "籍贯",
				prop: "native_place",
				span: 8,
				component: {
					name: "el-input"
				},
				group: "person"
			},

			{
				label: "政治面貌",
				prop: "politics_status",
				span: 8,
				component: {
					name: "el-input"
				},
				group: "person"
			},
			{
				label: "户口性质",
				prop: "household_type",
				span: 8,
				component: {
					name: "el-select"
				},
				group: "person"
			},
			{
				label: "户口所在地",
				prop: "household_address",
				span: 8,
				component: {
					name: "el-input"
				},
				group: "person"
			},

			{
				label: "是否应届",
				prop: "freshman",
				span: 8,
				component: {
					name: "el-input"
				},
				group: "person"
			},
			{
				label: "当前学历",
				prop: "education",
				span: 8,
				component: {
					name: "el-select"
				},
				group: "person"
			},
			{
				label: "毕业学校",
				prop: "graduated_school",
				span: 8,
				component: {
					name: "el-input"
				},
				group: "person"
			},

			{
				label: "毕业时间",
				prop: "graduated_date",
				span: 8,
				component: {
					name: "el-input"
				},
				group: "person"
			},
			{
				label: "备注",
				prop: "remark",
				span: 24,
				component: {
					name: "el-input",
					props: {
						type: "textarea",
						rows: 4
					}
				},
				group: "base"
			},

			{
				label: "校方收定位金",
				prop: "school_payment",
				span: 8,
				value: 0.0,
				component: {
					name: "el-input-number",
					props: {
						precision: 2,
						step: 0.1
					}
				},
				group: "financial"
			},
			{
				label: "自收定位金",
				prop: "teams_payment",
				span: 8,
				value: 0.0,
				component: {
					name: "el-input-number",
					props: {
						precision: 2,
						step: 0.1
					}
				},
				group: "financial"
			},
			{
				label: "支付编号",
				prop: "serial",
				span: 8,
				component: {
					name: "el-input"
				},
				group: "financial"
			},
			{
				label: "缴费凭证",
				prop: "voucher",
				span: 8,
				component: {
					name: "cl-upload"
				},
				group: "financial"
			}
		],
		form: {
			...cluesOne
		},
		on: {
			async open() {
				// 学校列表
				getSchoolList();

				// 报读类型
				const majorsTypeList = await service.customer_pro.readtypes.list();
				OrderFormRef.value?.setOptions(
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
				OrderFormRef.value?.setOptions(
					"degree_id",
					degreeList.map((e) => {
						return {
							label: e.name,
							value: e.id
						};
					})
				);

				// 户口性质
				OrderFormRef.value?.setOptions("household_type", [
					{
						label: "城镇",
						value: "1"
					},
					{
						label: "农村",
						value: "2"
					}
				]);

				// 学历
				OrderFormRef.value?.setOptions("education", [
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
			},
			submit(data, { close, done }) {
				data.clues_id = cluesId.value;
				data.services_id = row.services_id;
				data.project_id = row.project_id;
				service.customer_pro.order.add({ ...data }).then((r) => {
					close();
					refresh();
				});
			}
		}
	});
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
				service.customer_pro.clues
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
	Upsert.value?.setForm("majors_id", null);
	getMajorList(v);
};

// 专业列表
const getMajorList = async (v: any) => {
	majorsList.value = await service.customer_pro.majors.list({ schoolId: v });
};
</script>
