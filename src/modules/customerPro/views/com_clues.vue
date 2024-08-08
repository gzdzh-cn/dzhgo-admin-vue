<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新按钮 -->
			<cl-refresh-btn />

			<!-- 删除按钮 -->
			<cl-multi-delete-btn />

			<el-button
				type="warning"
				:disabled="Table?.selection.length == 0"
				@click="openDistribute"
				v-permission="service.customer_pro.comClues._permission.distribute"
				>分配</el-button
			>

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
			<cl-table ref="Table">
				<template #column-detail="{ scope }">
					<div style="padding: 0 30px">
						<p v-if="scope.row?.userName">创建者: {{ scope.row?.userName }}</p>
						<p v-if="scope.row?.ocean_time">公海时间: {{ scope.row?.ocean_time }}</p>
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
						@click="edit(scope.row, 'info')"
						v-permission="service.customer_pro.comClues._permission.info"
						>查看</el-button
					>
					<el-button
						text
						bg
						type="warning"
						@click="openTracks(scope.row)"
						v-permission="service.customer_pro.comClues._permission.getTrackList"
						>轨迹</el-button
					>

					<el-popconfirm title="确定认领该线索吗?" @confirm="claim(scope.row)">
						<template #reference>
							<el-button
								text
								bg
								type="info"
								v-permission="service.customer_pro.comClues._permission.claimClues"
								>认领</el-button
							>
						</template>
					</el-popconfirm>
				</template>
			</cl-table>
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<!-- 分页控件 -->
			<cl-pagination />
		</cl-row>

		<!-- 新增、编辑 -->
		<cl-upsert ref="Upsert"> </cl-upsert>

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
						:value="item.id"
					/>
				</el-select>
			</template>
		</cl-form>

		<!-- 轨迹弹窗 -->
		<cl-dialog title="轨迹" v-model="trackVisible">
			<sub-track ref="TrackRef" :id="cluesId" />
			<template #footer>
				<div class="dialog-footer">
					<el-button @click="trackVisible = false">关闭</el-button>
				</div>
			</template>
		</cl-dialog>
	</cl-crud>
</template>

<script lang="ts" name="customer_pro-comclues" setup>
import { useCrud, useTable, useUpsert, useForm } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { ElMessage, TabsPaneContext } from "element-plus";
import { ref } from "vue";
import SubTrack from "../components/clues/subTrack.vue";

const { service } = useCool();
const activeName = ref("all"); //默认标签
const cluesId = ref(); //线索id
const projectList = ref(); // 项目列表

// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		() => {
			return {
				label: "姓名",
				prop: "name",
				span: 12,
				component: { name: "el-input" }
			};
		},
		{ label: "来源", prop: "source_from", span: 12, component: { name: "el-select" } },

		{ label: "手机号", prop: "mobile", span: 12, component: { name: "el-input" } },
		{ label: "微信号", prop: "wechat", span: 12, component: { name: "el-input" } },
		{
			label: "状态",
			prop: "status",
			value: 0,
			component: {
				name: "cl-switch",
				props: {
					activeValue: 1,
					inactiveValue: 0,
					activeText: "成交",
					inactiveText: "未成交",
					inlinePrompt: true
				}
			}
		}
	],
	async onOpen(data) {
		if (data.source_from != 1) {
			data.name = (data?.city ? data?.city : "") + (data?.guest_id ? data?.guest_id : "");
		}

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

		// 学校
		const schoolList = await service.customer_pro.school.list();
		Upsert.value?.setOptions(
			"school_id",
			schoolList.map((e) => {
				return {
					label: e.name,
					value: e.id
				};
			})
		);

		// 专业
		const majorsList = await service.customer_pro.majors.list();
		Upsert.value?.setOptions(
			"majors_id",
			majorsList.map((e) => {
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
				value: 0
			},
			{
				label: "男",
				value: 1
			},
			{
				label: "女",
				value: 2
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
	},
	onOpened(data) {}
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

		{ label: "项目", prop: "project_name" },
		{
			label: "姓名",
			prop: "name",
			width: 150,
			formatter(row) {
				if (row.source_from == 1) {
					return row.name;
				} else if (row.city) {
					return row.city + row.guest_id;
				} else {
					return row.guest_id;
				}
			}
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

		{
			label: "状态",
			prop: "status"
		},
		{ label: "创建时间", prop: "createTime" },
		{ type: "op", width: 300, buttons: ["slot-op"] }
	]
});

// cl-crud 配置
const Crud = useCrud(
	{
		service: service.customer_pro.comClues,
		async onRefresh(params, { next, render }) {
			params.oceanTime = true;
			const { list, pagination } = await next(params);
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

// 切换类型
const handleClick = (tab: TabsPaneContext) => {
	refresh({ followType: tab.index });
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

// 编辑
const edit = (row: any, type: string) => {
	if (type == "info") {
		Crud.value?.rowInfo(row);
	} else if (type == "edit") {
		Crud.value?.rowEdit(row);
	}
};

// 认领
const claim = (row: any) => {
	service.customer_pro.clues
		.claimClues({ cluesId: row.id })
		.then((r) => {
			ElMessage.success("认领成功");
			refresh();
		})
		.catch((e) => {
			ElMessage.error(e.message);
		});
};

// 轨迹弹窗
const trackVisible = ref(false);
const openTracks = (row: any) => {
	cluesId.value = row.id;
	trackVisible.value = true;
};
</script>
