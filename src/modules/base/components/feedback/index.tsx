import { ElDialog } from "element-plus";
import { defineComponent, ref } from "vue";
import { Service } from "@element-plus/icons-vue";
import { useCrud, useTable, useUpsert } from "@cool-vue/crud";
import "./index.scss";
import { useCool } from "/@/cool";
import { useDict } from "/$/dict";
import { useBase } from "/$/base";

export default defineComponent({
	name: "cl-feedback",

	props: {},

	emits: ["update:modelValue", "change"],

	setup(props, { emit, expose }) {
		const { service } = useCool();
		const { dict } = useDict();
		const { user } = useBase();

		// 立即设置管理员状态
		const isAdmin = ref(user.info.roleIds?.split(",").includes("1") || false);

		// 弹窗显示状态
		const dialogVisible = ref(false);
		const feType = ref(dict.get("feType"));
		// 获取工单类型标签样式
		const getTypeTag = (type: string) => {
			const typeMap: Record<
				string,
				{
					type: "success" | "info" | "warning" | "danger";
					color: string;
				}
			> = {
				bug: { type: "danger", color: "#f56c6c" },
				feature: { type: "success", color: "#67c23a" },
				question: { type: "info", color: "#909399" },
				suggestion: { type: "warning", color: "#e6a23c" },
				complaint: { type: "danger", color: "#f56c6c" },
				praise: { type: "success", color: "#67c23a" }
			};

			// 从 feType 中获取标签文本
			const typeLabel = feType.value.find((t) => t.value === type)?.label || type;

			return {
				...(typeMap[type] || { type: "info", color: "#909399" }),
				label: typeLabel
			};
		};

		const priorityList = ref(dict.get("priority"));

		// 获取工单优先级标签样式
		const getPriorityTag = (priority: number) => {
			const priorityMap: Record<
				number,
				{
					type: "success" | "info" | "warning" | "danger";
					text: string;
				}
			> = {
				1: {
					type: "info",
					text: priorityList.value.find((p) => p.value === 1)?.label || "低"
				},
				2: {
					type: "success",
					text: priorityList.value.find((p) => p.value === 2)?.label || "中"
				},
				3: {
					type: "warning",
					text: priorityList.value.find((p) => p.value === 3)?.label || "高"
				},
				4: {
					type: "danger",
					text: priorityList.value.find((p) => p.value === 4)?.label || "紧急"
				}
			};
			return priorityMap[priority] || { type: "info", text: "未知" };
		};

		// 打开通知弹窗
		const open = () => {
			dialogVisible.value = true;
			emit("change", true);
		};

		// 关闭弹窗
		const closeDialog = () => {
			dialogVisible.value = false;
		};

		// 获取未读消息数量
		const unreadCount = ref(0);

		// cl-upsert 配置
		const Upsert = useUpsert({
			items: [
				{
					label: "标题",
					prop: "title",
					span: 12,
					component: { name: "el-input" }
				},
				{
					label: "处理进度",
					prop: "process",
					span: 12,
					hidden: () => {
						return Upsert.value?.mode == "add";
					},

					component: {
						name: "el-select",
						options: dict.get("process")?.value || []
					}
				},
				{
					label: "类型",
					prop: "feType",
					span: 12,
					component: {
						name: "el-select",
						options: dict.get("feType").value
					}
				},
				{
					label: "优先级",
					prop: "priority",
					span: 12,
					component: {
						name: "el-select",
						options: dict.get("priority").value
					}
				},
				{
					label: "图片",
					prop: "img",
					component: {
						name: "cl-upload",
						props: {
							type: "image",
							multiple: true,
							showFileList: true,
							draggable: true
						}
					}
				},
				{
					label: "内容",
					prop: "remark",
					component: {
						name: "cl-editor-quill",
						props: {
							height: 200
						}
					}
				}
			]
		});
		const Table = useTable({
			columns: [
				{ type: "selection" },
				{
					label: "用户",
					prop: "userName",
					width: 120,
					align: "center",
					hidden: !isAdmin.value
				},
				{
					label: "类型",
					prop: "feType",
					width: 100,
					align: "center",
					dict: {
						options: dict.get("feType").value
					}
				},
				{
					label: "优先级",
					prop: "priority",
					width: 100,
					align: "center",
					dict: {
						text: true,
						options: dict.get("priority").value
					}
				},
				{
					label: "处理进度",
					prop: "process",
					width: 100,
					align: "center",
					dict: {
						text: true,
						options: dict.get("process").value
					}
				},
				{
					label: "标题",
					prop: "title",
					minWidth: 80
				},
				{
					label: "内容",
					prop: "remark",
					minWidth: 200,
					formatter: (row: any) => {
						// 去除html标签
						return row.remark.replace(/<[^>]*>?/g, "");
					},
					showOverflowTooltip: true
				},
				{
					label: "提交时间",
					prop: "createTime",
					align: "center"
				},
				{ type: "op", buttons: ["info", "edit", "delete"] }
			]
		});

		// cl-crud 配置
		const Crud = useCrud(
			{
				service: service.base.sys.feedback
			},
			(app) => {
				app.refresh();
			}
		);

		expose({
			open
		});

		return () => {
			return (
				<>
					<div class="cl-notice__icon" onClick={open}>
						<el-badge value={unreadCount.value || ""}>
							<el-icon size={15}>
								<Service />
							</el-icon>
						</el-badge>
					</div>

					<ElDialog
						modelValue={dialogVisible.value}
						onUpdate:modelValue={closeDialog}
						title="工单反馈"
						width="1200px"
						destroyOnClose
						class="notice-dialog"
					>
						<div style={{ height: "600px", maxHeight: "80vh" }}>
							<cl-crud ref={Crud}>
								<cl-row>
									<cl-refresh-btn />
									<cl-add-btn />
									<cl-multi-delete-btn />
									<cl-flex1 />
									<cl-search-key />
								</cl-row>

								<cl-row>
									<cl-table ref={Table}>
										{{
											"column-feType": ({ scope }: any) => {
												const typeInfo = getTypeTag(scope.row.feType);
												return (
													<el-tag size="small" type={typeInfo.type}>
														{typeInfo.label}
													</el-tag>
												);
											},
											"column-priority": ({ scope }: any) => {
												const priority = getPriorityTag(scope.row.priority);
												return (
													<el-tag size="small" type={priority.type}>
														{priority.text}
													</el-tag>
												);
											},
											"column-process": ({ scope }: any) => {
												const status = scope.row.process;
												let statusText = "";
												let statusType:
													| "success"
													| "info"
													| "warning"
													| "danger" = "info";

												// 根据状态值设置显示文本和标签类型
												switch (status) {
													case "1":
														statusText = "未处理";
														statusType = "danger";
														break;
													case "2":
														statusText = "已处理";
														statusType = "success";
														break;
													case "3":
														statusText = "处理中";
														statusType = "warning";
														break;
													default:
														statusText = "未知";
														statusType = "info";
												}

												return (
													<el-tag size="small" type={statusType}>
														{statusText}
													</el-tag>
												);
											}
										}}
									</cl-table>
								</cl-row>

								<cl-row>
									<cl-flex1 />
									<cl-pagination />
								</cl-row>

								<cl-upsert ref={Upsert} />
							</cl-crud>
						</div>
					</ElDialog>
				</>
			);
		};
	}
});
