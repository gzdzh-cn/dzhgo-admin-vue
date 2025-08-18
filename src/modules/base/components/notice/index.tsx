import {
	ElDialog,
	ElTable,
	ElTableColumn,
	ElPagination,
	ElTag,
	ElButton,
	ElMessageBox,
	ElMessage,
	ElSelect,
	ElOption,
	ElInput
} from "element-plus";
import { defineComponent, ref, computed, h, onMounted, onUnmounted } from "vue";
import { BellFilled } from "@element-plus/icons-vue";
import "./index.scss";
import { useCool } from "/@/cool";
import dev from "/@/cool/config/dev";

export default defineComponent({
	name: "cl-notice",

	props: {},

	emits: ["update:modelValue", "change"],

	setup(props, { emit, expose }) {
		const { service } = useCool();

		// 弹窗显示状态
		const dialogVisible = ref(false);

		// 分页配置
		const currentPage = ref(1);
		const pageSize = ref(10);

		const messageList = ref<any[]>([]);
		const total = ref(0);
		const totalNoRead = ref(0);
		const selectedRows = ref<any[]>([]);
		// 打开通知弹窗
		const open = async () => {
			dialogVisible.value = true;
			emit("change", true);
			getMessageList();
		};

		const getMessageList = async () => {
			try {
				console.log("发送分页参数:", {
					page: currentPage.value,
					pageSize: pageSize.value,
					noType: noType.value,
					keyWord: keyWord.value
				});
				const { list, pagination } = await service.base.sys.notice.page({
					page: currentPage.value,
					size: pageSize.value,
					noType: noType.value,
					keyWord: keyWord.value
				});

				messageList.value = list || [];
				currentPageData.value = list || [];
				total.value = pagination?.total || 0;
				totalNoRead.value = (pagination as any)?.totalNoRead || 0;
				console.log("获取到数据:", { list: list?.length, total: total.value });
			} catch (error) {
				console.error("获取消息列表失败:", error);
				messageList.value = [];
				total.value = 0;
			}
		};

		// 关闭弹窗
		const closeDialog = () => {
			dialogVisible.value = false;
		};

		// 标记消息为已读
		const markAsRead = (row: any) => {
			const isRead = row.status === 1 || row.status === true;
			if (isRead) {
				return;
			}

			service.base.sys.notice
				.update({
					id: row.id,
					status: 1
				})
				.then(() => {
					getMessageList();
				})
				.catch((error) => {
					console.error("标记消息为已读失败:", error);
				});
		};

		// 删除消息
		const deleteMessage = async (row: any) => {
			try {
				await ElMessageBox.confirm(`确定要删除消息"${row.title}"吗？`, "确认删除", {
					confirmButtonText: "确定",
					cancelButtonText: "取消",
					type: "warning"
				});

				// 调用删除API
				await service.base.sys.notice.delete({
					ids: [row.id]
				});

				ElMessage.success("删除成功");

				// 重新获取消息列表
				await getMessageList();
			} catch (error) {
				if (error !== "cancel") {
					console.error("删除消息失败:", error);
					ElMessage.error("删除失败");
				}
			}
		};

		// 获取未读消息数量
		const unreadCount = computed(() => {
			if (!messageList.value || !Array.isArray(messageList.value)) {
				return "";
			}
			const unreadItems = totalNoRead.value;

			return unreadItems || "";
		});

		// 当前页的数据（直接使用API返回的数据）
		const currentPageData = ref<any[]>([]);

		// 查询条件
		const noType = ref<string>("");
		const keyWord = ref("");

		// 线索类型选项（可按实际后端字典替换）
		const noTypeOptions = [
			{ label: "全部", value: "" },
			{ label: "系统", value: "sys" },
			{ label: "任务", value: "task" },
			{ label: "审批", value: "approval" },
			{ label: "会议", value: "meeting" },
			{ label: "用户", value: "user" },
			{ label: "工作", value: "work" },
			{ label: "安全", value: "safe" },
			{ label: "培训", value: "train" }
		];

		// 触发搜索
		const handleSearch = () => {
			currentPage.value = 1;
			getMessageList();
		};

		// 一键已阅
		const noticeReadAll = async () => {
			try {
				// 确认弹窗
				await ElMessageBox.confirm("确定要将所有未读消息标记为已读吗？", "确认操作", {
					confirmButtonText: "确定",
					cancelButtonText: "取消",
					type: "warning"
				});

				// 执行标记已读操作
				await service.base.sys.notice.noticeReadAll();

				// 成功提醒
				ElMessage.success("所有消息已标记为已读");

				// 刷新数据
				getMessageList();
			} catch (error) {
				if (error !== "cancel") {
					// 如果不是取消操作，显示错误信息
					console.error("标记已读失败:", error);
					ElMessage.error("操作失败，请重试");
				}
			}
		};

		// 处理选择变化
		const handleSelectionChange = (selection: any[]) => {
			selectedRows.value = selection;
		};

		// 批量删除
		const batchDelete = async (ids: string[]) => {
			try {
				// 确认弹窗
				await ElMessageBox.confirm(
					`确定要删除选中的 ${ids.length} 条消息吗？`,
					"确认删除",
					{
						confirmButtonText: "确定",
						cancelButtonText: "取消",
						type: "warning"
					}
				);

				// 执行删除操作
				await service.base.sys.notice.delete({
					ids: ids
				});

				// 成功提醒
				ElMessage.success(`成功删除 ${ids.length} 条消息`);

				// 刷新数据
				getMessageList();
			} catch (error) {
				if (error !== "cancel") {
					console.error("批量删除失败:", error);
					ElMessage.error("删除失败，请重试");
				}
			}
		};
		const permissions = computed(() => {
			return service.base.sys.notice._permission;
		});

		// 格式化时间
		const formatTime = (createTime: string) => {
			return createTime;
		};

		// 获取消息类型标签样式
		const getTypeTag = (noType: string) => {
			const typeMap: Record<
				string,
				{
					noType: "success" | "info" | "warning" | "danger";
					color: string;
				}
			> = {
				sys: { noType: "info", color: "#909399" },
				task: { noType: "success", color: "#67c23a" },
				approval: { noType: "warning", color: "#e6a23c" },
				meeting: { noType: "info", color: "#909399" },
				user: { noType: "success", color: "#67c23a" },
				work: { noType: "warning", color: "#e6a23c" },
				safe: { noType: "danger", color: "#f56c6c" },
				train: { noType: "info", color: "#909399" }
			};
			return typeMap[noType] || { noType: "info", color: "#909399" };
		};

		// SSE连接管理
		const sseManager = {
			connectionID: "",
			heartbeatTimer: null as number | null,
			eventSource: null as EventSource | null,
			isConnecting: false,

			createConnection() {
				// 防止重复连接
				if (this.isConnecting || this.eventSource) {
					return this.eventSource;
				}

				this.isConnecting = true;
				this.eventSource = new EventSource(`${dev.baseUrl}/admin/base/open/noticeSse`);

				this.eventSource.onopen = () => {
					console.log("SSE连接已建立");
					this.isConnecting = false;
				};

				this.eventSource.onerror = () => {
					console.log("SSE连接错误，尝试重连...");
					this.isConnecting = false;
					this.cleanup();
					// 只有在非主动断开的情况下才自动重连
					if (!this.connectionID) {
						setTimeout(() => this.createConnection(), 5000);
					}
				};

				this.eventSource.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						console.log("SSE收到消息:", data);

						if (data.status === "connected") {
							this.connectionID = data.connectionID || "";
							console.log("连接ID:", this.connectionID);
							// this.startHeartbeat();
						}
					} catch (error) {
						console.error("解析SSE数据失败:", error);
					}
				};

				return this.eventSource;
			},

			startHeartbeat() {
				// 清理之前的心跳
				if (this.heartbeatTimer) {
					clearInterval(this.heartbeatTimer);
				}

				// 启动新的心跳
				this.heartbeatTimer = setInterval(() => {
					this.sendHeartbeat();
				}, 10000);
			},

			// 发送心跳
			sendHeartbeat() {
				try {
					if (
						this.connectionID &&
						service &&
						service.base &&
						service.base.open &&
						service.base.open.noticeSseChecked
					) {
						service.base.open
							.noticeSseChecked({
								connectionID: this.connectionID
							})
							.then((res: any) => {
								if (res.status === "Disconnect") {
									console.log("Disconnect,重连");
									this.connectionID = "";
									sseManager.cleanup();
									setTimeout(() => startNoticeSse(), 1000);
								}
								console.log("发送心跳成功:", res);
							});
					}
				} catch (error) {
					console.error("发送心跳失败:", error);
				}
			},

			cleanup() {
				if (this.heartbeatTimer) {
					clearInterval(this.heartbeatTimer);
					this.heartbeatTimer = null;
				}
				if (this.eventSource) {
					this.eventSource.close();
					this.eventSource = null;
				}
				this.isConnecting = false;
			}
		};

		const startNoticeSse = async () => {
			const sse = sseManager.createConnection();

			// 在连接建立后获取消息列表
			if (sse) {
				// 移除之前的事件监听器，避免重复
				sse.removeEventListener("message", handleMessage);
				sse.addEventListener("message", handleMessage);
			}
		};

		// 消息处理函数
		const handleMessage = (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data);
				if (data.status === "connected") {
					getMessageList();
				}
			} catch (error) {
				console.error("解析消息失败:", error);
			}
		};

		const taskSetTime = () => {
			// 设置定时器，每分钟获取一次数据
			setInterval(() => {
				getMessageList();
			}, 1000 * 60 * 1); //1分钟获取一次
		};

		// 暴露方法给父组件
		expose({
			getMessageList,
			open
		});

		// 组件挂载时自动获取消息列表
		onMounted(async () => {
			getMessageList();

			// 启动定时任务
			taskSetTime();
		});

		// 组件卸载时清理资源
		onUnmounted(() => {
			// sseManager.cleanup();
		});

		return () => {
			return (
				<>
					<div class="cl-notice__icon" onClick={open}>
						<el-badge value={unreadCount.value}>
							<el-icon size={15}>
								<BellFilled />
							</el-icon>
						</el-badge>
					</div>

					<ElDialog
						modelValue={dialogVisible.value}
						onUpdate:modelValue={closeDialog}
						title="消息通知"
						width="1000px"
						destroyOnClose
					>
						<div class="message-table-container">
							<div style={{ marginBottom: "16px", textAlign: "right" }}>
								{/* 查询条件：线索类型 + 关键字 + 搜索按钮 */}
								<div
									style={{
										display: "inline-flex",
										gap: "8px",
										marginRight: "12px",
										verticalAlign: "middle",
										alignItems: "center"
									}}
								>
									<ElSelect
										placeholder="类型"
										modelValue={noType.value as any}
										onUpdate:modelValue={(val: any) => (noType.value = val)}
										size="small"
										clearable
										style={{ width: "80px" }}
									>
										{noTypeOptions.map((opt) => (
											<ElOption label={opt.label} value={opt.value as any} />
										))}
									</ElSelect>
									<ElInput
										placeholder="关键词"
										modelValue={keyWord.value}
										onUpdate:modelValue={(val: string) => (keyWord.value = val)}
										clearable
										size="small"
										onKeydown={(e) => {
											if ((e as KeyboardEvent).key === "Enter") {
												handleSearch();
											}
										}}
										style={{ width: "120px" }}
									/>
									<ElButton type="primary" size="small" onClick={handleSearch}>
										搜索
									</ElButton>
								</div>

								{permissions.value?.delete ? (
									<ElButton
										type="danger"
										size="small"
										onClick={() => {
											if (selectedRows.value.length === 0) {
												ElMessage.warning("请先选择要删除的消息");
												return;
											}
											const ids = selectedRows.value.map(
												(item: any) => item.id
											);
											batchDelete(ids);
										}}
										style={{ marginRight: "10px" }}
										disabled={selectedRows.value.length === 0}
									>
										批量删除 ({selectedRows.value.length})
									</ElButton>
								) : null}
								{permissions.value?.noticeReadAll ? (
									<ElButton
										type="primary"
										size="small"
										onClick={noticeReadAll}
										disabled={
											unreadCount.value === 0 || unreadCount.value === ""
										}
									>
										一键已阅
										{Number(unreadCount.value) > 0
											? ` (${unreadCount.value})`
											: ""}
									</ElButton>
								) : null}
							</div>
							<ElTable
								data={messageList.value}
								style={{ width: "100%" }}
								size="small"
								onRow-click={markAsRead}
								onSelection-change={handleSelectionChange}
								rowClassName={({ row }: any) => {
									const isRead = row.status === 1 || row.status === true;
									return isRead ? "read-row" : "unread-row";
								}}
							>
								<ElTableColumn type="selection" width={55} />
								<ElTableColumn
									prop="noType"
									label="类型"
									width={80}
									align="center"
									v-slots={{
										default: ({ row }: any) => {
											const tag = getTypeTag(row.noType);
											const getTypeName = (noType: string) => {
												const typeMap: Record<string, string> = {
													sys: "系统",
													task: "任务",
													approval: "审批",
													meeting: "会议",
													user: "用户",
													work: "工作",
													safe: "安全",
													train: "培训"
												};
												return typeMap[noType] || noType;
											};
											return (
												<ElTag size="small" type={tag.noType}>
													{getTypeName(row.noType)}
												</ElTag>
											);
										}
									}}
								/>
								<ElTableColumn
									prop="title"
									label="标题"
									width={80}
									v-slots={{
										default: ({ row }: any) => {
											const isRead = row.status === 1 || row.status === true;
											return (
												<div class="message-title-cell">
													{row.title}
													{!isRead && <span class="unread-dot"></span>}
												</div>
											);
										}
									}}
								/>
								<ElTableColumn
									prop="remark"
									label="内容"
									minWidth={200}
									showOverflowTooltip
									v-slots={{
										default: ({ row }: any) => {
											// 安全地过滤 HTML 标签
											const content = row.remark || "";
											if (typeof content === "string") {
												return content.replace(/<[^>]*>?/g, "");
											}
											return content;
										}
									}}
								/>
								<ElTableColumn
									prop="createTime"
									label="时间"
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
											const isRead = row.status === 1 || row.status === true;
											return (
												<ElTag
													size="small"
													type={isRead ? "success" : "danger"}
												>
													{isRead ? "已读" : "未读"}
												</ElTag>
											);
										}
									}}
								/>
								{(() => {
									if (!permissions.value?.delete) {
										return null;
									}

									return (
										<ElTableColumn
											label="操作"
											width={100}
											align="center"
											v-slots={{
												default: ({ row }: any) => {
													if (!permissions.value?.delete) {
														return null;
													}
													return (
														<ElButton
															type="danger"
															size="small"
															onClick={(e: Event) => {
																e.stopPropagation();
																deleteMessage(row);
															}}
														>
															删除
														</ElButton>
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
										onCurrentChange: (val: number) => {
											console.log("页码切换:", val);
											currentPage.value = val;
											// 确保参数更新后再请求数据
											setTimeout(() => getMessageList(), 0);
										},
										onSizeChange: (val: number) => {
											console.log("每页条数切换:", val);
											pageSize.value = val;
											currentPage.value = 1;
											// 确保参数更新后再请求数据
											setTimeout(() => getMessageList(), 0);
										},
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
