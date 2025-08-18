import {
	ElDialog,
	ElTable,
	ElTableColumn,
	ElPagination,
	ElTag,
	ElButton,
	ElMessageBox,
	ElMessage
} from "element-plus";
import { defineComponent, ref, computed, h, onMounted, onUnmounted } from "vue";
import { Service } from "@element-plus/icons-vue";
import "./index.scss";
import { useCool } from "/@/cool";

export default defineComponent({
	name: "cl-feedback2",

	props: {},

	emits: ["update:modelValue", "change"],

	setup(props, { emit, expose }) {
		const { service } = useCool();

		// 弹窗显示状态
		const dialogVisible = ref(false);

		// 分页配置
		const currentPage = ref(1);
		const pageSize = ref(10);

		const feedbackList = ref<any[]>([]);
		const total = ref(0);

		// 打开工单弹窗
		const open = async () => {
			console.log("open");
			dialogVisible.value = true;
			emit("change", true);
			getFeedbackList();
		};

		const getFeedbackList = async () => {
			try {
				const { list, pagination } = await service.base.sys.feedback.page({
					page: currentPage.value,
					pageSize: pageSize.value
				});

				feedbackList.value = list || [];
				total.value = pagination?.total || 0;
			} catch (error) {
				console.error("获取工单列表失败:", error);
				feedbackList.value = [];
				total.value = 0;
			}
		};

		// 关闭弹窗
		const closeDialog = () => {
			dialogVisible.value = false;
		};

		// 处理工单
		const handleFeedback = (row: any) => {
			const isHandled = row.status === 1 || row.status === true;
			if (isHandled) {
				return;
			}

			service.base.sys.feedback
				.update({
					id: row.id,
					status: 1
				})
				.then(() => {
					getFeedbackList();
				})
				.catch((error) => {
					console.error("处理工单失败:", error);
				});
		};

		// 删除工单
		const deleteFeedback = async (row: any) => {
			try {
				await ElMessageBox.confirm(`确定要删除工单"${row.title}"吗？`, "确认删除", {
					confirmButtonText: "确定",
					cancelButtonText: "取消",
					type: "warning"
				});

				// 调用删除API
				await service.base.sys.feedback.delete({
					ids: [row.id]
				});

				ElMessage.success("删除成功");

				// 重新获取工单列表
				await getFeedbackList();
			} catch (error) {
				if (error !== "cancel") {
					console.error("删除工单失败:", error);
					ElMessage.error("删除失败");
				}
			}
		};

		// 获取未处理工单数量
		const unhandledCount = computed(() => {
			if (!feedbackList.value || !Array.isArray(feedbackList.value)) {
				return "";
			}

			const unhandledItems = feedbackList.value.filter((item: any) => {
				// 如果status为undefined或null，认为是未处理
				const isHandled = item.status === 1 || item.status === true;

				return !isHandled;
			});

			return unhandledItems.length || "";
		});

		// 分页后的数据
		const paginatedData = computed(() => {
			if (!feedbackList.value || !Array.isArray(feedbackList.value)) {
				return [];
			}
			const start = (currentPage.value - 1) * pageSize.value;
			const end = start + pageSize.value;
			return feedbackList.value.slice(start, end);
		});

		// 格式化时间
		const formatTime = (createTime: string) => {
			return createTime;
		};

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
			return typeMap[type] || { type: "info", color: "#909399" };
		};

		// 获取工单优先级标签样式
		const getPriorityTag = (priority: number) => {
			const priorityMap: Record<
				number,
				{
					type: "success" | "info" | "warning" | "danger";
					text: string;
				}
			> = {
				1: { type: "info", text: "低" },
				2: { type: "success", text: "中" },
				3: { type: "warning", text: "高" },
				4: { type: "danger", text: "紧急" }
			};
			return priorityMap[priority] || { type: "info", text: "未知" };
		};

		// 暴露方法给父组件
		expose({
			getFeedbackList
		});

		// 组件挂载时自动获取工单列表
		onMounted(async () => {
			getFeedbackList();
		});

		// 组件卸载时清理资源
		onUnmounted(() => {
			// sseManager.cleanup();
		});

		return () => {
			return (
				<>
					<div class="cl-feedback__icon" onClick={open}>
						<el-badge value={unhandledCount.value}>
							<el-icon size={15}>
								<Service />
							</el-icon>
						</el-badge>
					</div>

					<ElDialog
						modelValue={dialogVisible.value}
						onUpdate:modelValue={closeDialog}
						title="工单管理"
						width="1200px"
						destroyOnClose
					>
						<div class="feedback-table-container">
							<ElTable
								data={paginatedData.value}
								style={{ width: "100%" }}
								size="small"
								onRow-click={handleFeedback}
								rowClassName={({ row }: any) => {
									const isHandled = row.status === 1 || row.status === true;
									return isHandled ? "handled-row" : "unhandled-row";
								}}
							>
								<ElTableColumn
									prop="type"
									label="类型"
									width={100}
									align="center"
									v-slots={{
										default: ({ row }: any) => {
											const tag = getTypeTag(row.type);
											const getTypeName = (type: string) => {
												const typeMap: Record<string, string> = {
													bug: "Bug反馈",
													feature: "功能建议",
													question: "问题咨询",
													suggestion: "改进建议",
													complaint: "投诉建议",
													praise: "表扬反馈"
												};
												return typeMap[type] || type;
											};
											return (
												<ElTag size="small" type={tag.type}>
													{getTypeName(row.type)}
												</ElTag>
											);
										}
									}}
								/>
								<ElTableColumn
									prop="priority"
									label="优先级"
									width={80}
									align="center"
									v-slots={{
										default: ({ row }: any) => {
											const priority = getPriorityTag(row.priority);
											return (
												<ElTag size="small" type={priority.type}>
													{priority.text}
												</ElTag>
											);
										}
									}}
								/>
								<ElTableColumn
									prop="title"
									label="标题"
									minWidth={150}
									v-slots={{
										default: ({ row }: any) => {
											const isHandled =
												row.status === 1 || row.status === true;
											return (
												<div class="feedback-title-cell">
													{row.title}
													{!isHandled && (
														<span class="unhandled-dot"></span>
													)}
												</div>
											);
										}
									}}
								/>
								<ElTableColumn
									prop="content"
									label="内容"
									minWidth={200}
									showOverflowTooltip
								/>
								<ElTableColumn
									prop="contact"
									label="联系方式"
									width={120}
									align="center"
								/>
								<ElTableColumn
									prop="createTime"
									label="提交时间"
									width={150}
									align="center"
									v-slots={{
										default: ({ row }: any) => formatTime(row.createTime)
									}}
								/>
								<ElTableColumn
									prop="status"
									label="状态"
									width={80}
									align="center"
									v-slots={{
										default: ({ row }: any) => {
											const isHandled =
												row.status === 1 || row.status === true;
											return (
												<ElTag
													size="small"
													type={isHandled ? "success" : "danger"}
												>
													{isHandled ? "已处理" : "未处理"}
												</ElTag>
											);
										}
									}}
								/>
								{(() => {
									const permissions = service.base.sys.feedback._permission;
									const hasAnyPermission =
										permissions?.update ||
										permissions?.add ||
										permissions?.delete;

									if (!hasAnyPermission) {
										return null;
									}

									return (
										<ElTableColumn
											label="操作"
											width={120}
											align="center"
											v-slots={{
												default: ({ row }: any) => {
													const isHandled =
														row.status === 1 || row.status === true;
													return (
														<div class="feedback-actions">
															{!isHandled && permissions?.update && (
																<ElButton
																	type="primary"
																	size="small"
																	onClick={(e: Event) => {
																		e.stopPropagation();
																		handleFeedback(row);
																	}}
																>
																	处理
																</ElButton>
															)}
															{permissions?.delete && (
																<ElButton
																	type="danger"
																	size="small"
																	onClick={(e: Event) => {
																		e.stopPropagation();
																		deleteFeedback(row);
																	}}
																>
																	删除
																</ElButton>
															)}
														</div>
													);
												}
											}}
										/>
									);
								})()}
							</ElTable>

							<div class="pagination-container">
								<div class="pagination-container">
									{h(ElPagination, {
										"current-page": currentPage.value,
										"page-size": pageSize.value,
										onCurrentChange: (val: number) => (currentPage.value = val),
										onSizeChange: (val: number) => (pageSize.value = val),
										total: total.value,
										layout: "total, sizes, prev, pager, next, jumper",
										background: true
									})}
								</div>
							</div>
						</div>
					</ElDialog>
				</>
			);
		};
	}
});
