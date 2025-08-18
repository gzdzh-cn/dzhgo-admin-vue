import { ElDialog } from "element-plus";
import { defineComponent, ref, computed } from "vue";
import { BellFilled } from "@element-plus/icons-vue";
import { useCrud, useTable, useUpsert } from "@cool-vue/crud";
import "./index.scss";
import { service } from "/@/cool";

export default defineComponent({
	name: "cl-notice",

	props: {},

	emits: ["update:modelValue", "change"],

	setup(props, { emit }) {
		// 弹窗显示状态
		const dialogVisible = ref(false);

		// 模拟消息数据
		const messageList = ref([
			{
				id: 1,
				title: "系统通知",
				content: "欢迎使用管理系统",
				time: "2024-01-15 10:30:00",
				read: false,
				type: "系统"
			},
			{
				id: 2,
				title: "任务提醒",
				content: "您有一个新的任务待处理",
				time: "2024-01-15 09:15:00",
				read: true,
				type: "任务"
			},
			{
				id: 3,
				title: "系统更新",
				content: "系统将在今晚进行维护更新",
				time: "2024-01-14 16:45:00",
				read: false,
				type: "系统"
			},
			{
				id: 4,
				title: "审批通知",
				content: "您的请假申请已通过审批",
				time: "2024-01-14 14:20:00",
				read: true,
				type: "审批"
			},
			{
				id: 5,
				title: "会议提醒",
				content: "下午3点有项目进度会议",
				time: "2024-01-14 11:00:00",
				read: false,
				type: "会议"
			},
			{
				id: 6,
				title: "数据备份",
				content: "系统数据备份已完成",
				time: "2024-01-14 08:30:00",
				read: true,
				type: "系统"
			},
			{
				id: 7,
				title: "新用户注册",
				content: "有新用户注册，请及时审核",
				time: "2024-01-13 17:45:00",
				read: false,
				type: "用户"
			},
			{
				id: 8,
				title: "系统维护",
				content: "系统将于明日凌晨2-4点进行维护",
				time: "2024-01-13 15:20:00",
				read: false,
				type: "系统"
			},
			{
				id: 9,
				title: "工作汇报",
				content: "请提交本周工作总结",
				time: "2024-01-13 10:00:00",
				read: true,
				type: "工作"
			},
			{
				id: 10,
				title: "安全提醒",
				content: "请及时修改密码，确保账户安全",
				time: "2024-01-12 16:30:00",
				read: false,
				type: "安全"
			},
			{
				id: 11,
				title: "培训通知",
				content: "新功能使用培训将于本周五举行",
				time: "2024-01-12 14:15:00",
				read: false,
				type: "培训"
			}
		]);

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
		const unreadCount = computed(() => {
			return messageList.value.filter((item) => !item.read).length;
		});

		// cl-upsert 配置
		const Upsert = useUpsert({
			items: [
				{ label: "标题", prop: "title", component: { name: "el-input" } },
				{
					label: "内容",
					prop: "content",
					component: { name: "el-input", props: { type: "textarea", rows: 4 } }
				},
				{
					label: "类型",
					prop: "type",
					component: {
						name: "el-select",
						options: [
							{ label: "系统", value: "系统" },
							{ label: "任务", value: "任务" },
							{ label: "审批", value: "审批" },
							{ label: "会议", value: "会议" },
							{ label: "用户", value: "用户" },
							{ label: "工作", value: "工作" },
							{ label: "安全", value: "安全" },
							{ label: "培训", value: "培训" }
						]
					}
				},
				{
					label: "状态",
					prop: "read",
					value: false,
					component: {
						name: "el-switch",
						props: {
							activeValue: true,
							inactiveValue: false,
							activeText: "已读",
							inactiveText: "未读",
							inlinePrompt: true
						}
					}
				}
			]
		});

		// cl-table 配置
		const Table = useTable({
			columns: [
				{ type: "selection" },
				{
					label: "类型",
					prop: "type",
					width: 60,
					align: "center"
				},
				{
					label: "标题",
					prop: "title",
					minWidth: 80
				},
				{
					label: "内容",
					prop: "content",
					minWidth: 200,
					showOverflowTooltip: true
				},
				{
					label: "时间",
					prop: "time",
					align: "center"
				},

				{ type: "op", buttons: ["info", "edit", "delete"] }
			]
		});

		// 注意：Table 变量通过 cl-table ref="Table" 被引用

		// cl-crud 配置
		const Crud = useCrud(
			{
				service: service.base.sys.notice
			},
			(app) => {
				console.log("Crud 初始化完成，开始刷新");
				app.refresh();
			}
		);

		return () => {
			return (
				<>
					<div class="cl-notice__icon" onClick={open}>
						<el-badge value={unreadCount.value || 0}>
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
						class="notice-dialog"
					>
						<div style={{ height: "600px", maxHeight: "80vh" }}>
							<cl-crud ref={Crud}>
								<cl-row>
									<cl-refresh-btn />
									{/* <cl-add-btn /> */}
									<cl-multi-delete-btn />
									<cl-flex1 />
									<cl-search-key />
								</cl-row>

								<cl-row>
									<cl-table ref={Table} />
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
