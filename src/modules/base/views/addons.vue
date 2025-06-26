<template>
	<cl-crud ref="Crud">
		<div style="padding: 10px 10px 0px 20px; display: flex; flex-wrap: wrap; row-gap: 10px">
			<!-- 刷新按钮 -->
			<cl-refresh-btn />
			<!-- 新增按钮 -->
			<cl-add-btn />
			<!-- 删除按钮 -->
			<cl-multi-delete-btn />
			<!-- 关键字搜索 -->
			<cl-search-key style="margin-left: 10px" />
			<cl-flex1 />

			<el-button type="success" @click="typeOpen">插件类型</el-button>
		</div>

		<div class="divider"></div>

		<cl-row>
			<div class="fileter">
				<div class="filter-title">
					<span>分类：</span>
				</div>
				<div class="filter-name">
					<el-button
						@click="getList(null, null)"
						class="f-btn"
						:class="{ active: !activeIndex }"
						>全部</el-button
					>
					<el-button
						class="f-btn"
						:class="{ active: activeIndex == 'hasInstall' }"
						@click="getList(null, 'hasInstall')"
						>已安装</el-button
					>
					<el-button
						class="f-btn"
						:class="{ active: activeIndex == item.id }"
						v-for="(item, index) in typeList"
						:key="index"
						@click="getList(item.id)"
					>
						{{ item.name }}
					</el-button>
				</div>
			</div>
		</cl-row>

		<cl-row>
			<!-- 数据表格 -->
			<cl-table ref="Table" :border="false">
				<template #slot-op="{ scope }">
					<div class="table-op">
						<el-button
							type="warning"
							text
							bg
							v-if="
								!scope.row.isInstall &&
								service.base.sys.addons._permission.installUpdateStatus
							"
							@click="installUpdateStatus(scope.row, true)"
							>安装</el-button
						>
						<el-button
							type="danger"
							text
							bg
							v-if="
								scope.row.isInstall &&
								service.base.sys.addons._permission.installUpdateStatus
							"
							@click="installUpdateStatus(scope.row, false)"
							>卸载</el-button
						>
						<el-button
							type="info"
							text
							bg
							@click="lineUpdateStatus(scope.row, true)"
							v-if="
								!scope.row.isShow &&
								service.base.sys.addons._permission.lineUpdateStatus
							"
							>上架</el-button
						>
						<el-button
							type="info"
							text
							bg
							@click="lineUpdateStatus(scope.row, false)"
							v-if="
								scope.row.isShow &&
								service.base.sys.addons._permission.lineUpdateStatus
							"
							>下架</el-button
						>
						<el-button
							type="primary"
							text
							bg
							@click="Upsert?.edit(scope.row)"
							v-if="service.base.sys.addons._permission.update"
							>编辑</el-button
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

		<ElDrawer v-model="typesShow" title="插件类型" direction="rtl" size="40%">
			<AddonsTypes />
		</ElDrawer>
	</cl-crud>
</template>

<script lang="ts" name="base-addons" setup>
import { useCrud, useTable, useUpsert } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { ElDrawer, ElMessage } from "element-plus";
import AddonsTypes from "./components/addons/types.vue";
import { ref } from "vue";

const { service } = useCool();
console.log("perm", service.base.sys.addons._permission);

const typeList = ref<any>([]);
const addonsList = ref<any>([]);

const getValue = () => {
	const map = {
		name: "张三"
	};

	function setV(obj: any) {
		obj.name = "李四";
	}

	setV(map);

	console.log("map", map);
};

getValue();

// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		{
			label: "标题",
			prop: "name",
			required: true,
			component: { name: "el-input" }
		},
		{
			label: "插件",
			prop: "menuId",
			required: true,
			component: {
				name: "el-select",
				options: [],
				props: {
					onChange: (v) => {
						const addon = addonsList.value.find((item: any) => item.id == v);
						Upsert.value?.setForm("name", addon.name);
					}
				}
			}
		},
		{
			label: "类别",
			prop: "typeId",
			required: true,
			component: {
				name: "el-select",
				options: [],
				props: {}
			}
		},
		{
			label: "备注",
			prop: "remark",
			component: { name: "el-input", props: { type: "textarea", rows: 4 } }
		},
		{
			label: "排序",
			prop: "orderNum",
			value: 99,
			required: true,
			component: { name: "el-input-number", props: { min: 0 } }
		}
	],
	async onOpen(data) {
		// 插件
		service.base.sys.menu.list({ addons: true }).then((res) => {
			addonsList.value = res;
			Upsert.value?.setOptions(
				"menuId",
				res.map((e) => {
					return {
						label: e.name || "",
						value: e.id
					};
				})
			);
		});

		// 类别
		Upsert.value?.setOptions(
			"typeId",
			typeList.value.map((e) => {
				return {
					label: e.name || "",
					value: e.id
				};
			})
		);
	}
});

// cl-table 配置
const Table = useTable({
	columns: [
		{ type: "selection" },
		{ label: "标题", prop: "name" },
		{ label: "类别", prop: "typeName" },
		{ label: "描述", prop: "remark", showOverflowTooltip: true },
		{ label: "排序", prop: "orderNum" },
		{ type: "op", buttons: ["slot-op"] }
	]
});

// cl-crud 配置
const Crud = useCrud(
	{
		service: service.base.sys.addons,
		async onRefresh(params, { render }) {
			const { list, pagination } = await service.base.sys.addons.page(params);
			// 渲染数据
			render(list, pagination);

			typeList.value = await service.base.sys.addonsTypes.list();
		}
	},
	(app) => {
		app.refresh({ typeId: typeId.value, type: type.value });
	}
);

// 打开插件类型
const typesShow = ref(false);
const typeOpen = () => {
	typesShow.value = true;
};

//获取列表
const activeIndex = ref();
const typeId = ref();
const type = ref();
const getList = (tid: any, t?: any) => {
	if (t) {
		activeIndex.value = "hasInstall";
		typeId.value = null;
		type.value = t;
	}
	if (tid) {
		activeIndex.value = tid;
		typeId.value = tid;
		type.value = null;
	}
	if (!t && !tid) {
		activeIndex.value = null;
		typeId.value = null;
		type.value = null;
	}

	Crud.value?.refresh({ typeId: tid, type: t });
};

// 安装卸载
const installUpdateStatus = (item: any, active: boolean) => {
	service.base.sys.addons
		.installUpdateStatus({ id: item.menuId, active })
		.then((res) => {
			Crud.value?.refresh();
			ElMessage.success(active ? "安装成功" : "卸载成功");
		})
		.catch((e) => {
			ElMessage.error(e.message);
		});
};

// 上下架
const lineUpdateStatus = (item: any, active: boolean) => {
	service.base.sys.addons
		.lineUpdateStatus({ id: item.menuId, active })
		.then((res) => {
			Crud.value?.refresh();
			ElMessage.success(active ? "上架成功" : "下架成功");
		})
		.catch((e) => {
			ElMessage.error(e.message);
		});
};
</script>

<style lang="scss" scoped>
.f-btn:hover {
	color: #fff;
	background-color: var(--el-color-info-light-5);
	border-color: var(--el-color-info-light-5);
}
.active {
	color: #fff;
	background-color: var(--el-color-info-light-5);
}
.fileter {
	display: flex;
	align-items: center;
	padding: 0 30px;
	.filter-title {
		width: 50px;
		span {
			color: #333;
			font-weight: 400;
			font-size: 14px;
		}
	}
	.filter-name {
		span {
			color: #666;
			font-size: 14px;
		}
	}
	.active {
		span {
			color: var(--el-color-primary);
			font-weight: 400;
			font-size: 14px;
		}
	}
}
</style>
