<template>
	<div class="cl-upload-panel" @dragover="onDragover" @drop="onDrop">
		<cl-view-group ref="ViewGroup" title="全部文件">
			<template #left>
				<item-category />
			</template>

			<template #right>
				<div class="cl-upload-panel__right" ref="Content">
					<!-- 操作栏 -->
					<div class="cl-upload-panel__header">
						<el-button @click="refresh({ page: 1 })">刷新</el-button>

						<div v-if="!trash && (selectable || can('add'))">
							<cl-upload
								ref="Upload"
								type="file"
								:show-file-list="false"
								:limit="limit"
								:limit-upload="false"
								:accept="accept"
								multiple
								@success="onSuccess"
								@upload="onUpload"
							>
								<el-button type="primary">点击上传</el-button>
							</cl-upload>
						</div>

						<el-button
							v-if="!selectable && !trash && can('sync')"
							:loading="syncing"
							@click="syncHistory"
							>同步历史文件</el-button
						>
						<el-button v-if="!selectable" @click="toggleTrash">{{
							trash ? "返回文件库" : "回收站"
						}}</el-button>
						<el-button
							v-if="trash && can('restore')"
							:disabled="!selection.length"
							:loading="deleting"
							type="primary"
							@click="restore()"
							>恢复选中文件</el-button
						>
						<template v-if="!selectable && !trash && can('delete')">
							<el-button
								type="danger"
								:disabled="selection.length == 0"
								:loading="deleting"
								@click="remove()"
								>移入回收站</el-button
							>
						</template>
					</div>

					<div class="cl-upload-panel__filters">
						<el-input
							v-model="keyword"
							placeholder="搜索文件名"
							clearable
							@keyup.enter="refresh({ page: 1 })"
							@clear="refresh({ page: 1 })"
						/>
						<el-select
							v-if="!accept"
							v-model="kind"
							placeholder="全部类型"
							clearable
							@change="refresh({ page: 1 })"
						>
							<el-option
								v-for="item in kinds"
								:key="item.value"
								:label="item.label"
								:value="item.value"
							/>
						</el-select>
						<el-button @click="refresh({ page: 1 })">查询</el-button>
						<span class="file-count">共 {{ pagination.total }} 个文件</span>
					</div>
					<el-alert
						v-if="syncMessage"
						class="sync-message"
						:title="syncMessage"
						:closable="false"
						type="info"
					/>
					<!-- 文件区域 -->
					<el-scrollbar class="cl-upload-panel__file" v-loading="loading">
						<el-alert
							v-if="loadError"
							:title="loadError"
							type="error"
							:closable="false"
							show-icon
						>
							<el-button text @click="refresh({ page: 1 })">重新加载</el-button>
						</el-alert>
						<div v-infinite-scroll="loadmore" :infinite-scroll-immediate="false">
							<!-- 文件列表 -->
							<template v-if="list.length > 0">
								<div
									class="list"
									:class="{
										'is-mini': browser.isMini
									}"
								>
									<div
										class="item"
										v-for="item in list"
										:key="item.uid || item.id || item.url"
									>
										<item-file
											:data="item"
											:list="list"
											:trash="trash"
											:can-remove="!selectable && can('delete')"
											:can-restore="can('restore')"
											@restore="restore"
											@select="select"
											@remove="remove"
										/>
									</div>
								</div>
							</template>

							<!-- 空态 -->
							<div v-else class="empty">
								<el-icon class="el-icon--upload">
									<upload-filled />
								</el-icon>
								<p>
									{{
										trash ? "回收站暂无文件" : "暂无文件，可上传或同步历史文件"
									}}
								</p>
							</div>
						</div>
					</el-scrollbar>
				</div>
			</template>
		</cl-view-group>
	</div>
</template>

<script lang="ts" setup name="cl-upload-panel">
import { onBeforeUnmount, provide, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { UploadFilled } from "@element-plus/icons-vue";
import { spaceRequest } from "../service";
import { useCool } from "/@/cool";
import { checkPerm } from "/$/base/common/permission";
import { useViewGroup } from "/$/base";
import ItemCategory from "./items/category.vue";
import ItemFile from "./items/file.vue";

const props = defineProps({
	limit: {
		type: Number,
		default: 99
	},
	accept: String,
	selectable: Boolean
});

const emit = defineEmits(["selection-change"]);

const { browser } = useCool();
const { ViewGroup } = useViewGroup();

// cl-upload
const Upload = ref();

// 右侧内容
const Content = ref();

// 是否加载中
const loading = ref(false);
const loadError = ref("");
const deleting = ref(false);
let requestGeneration = 0;
const trash = ref(false);
const keyword = ref("");
const kind = ref("");
const syncing = ref(false);
const syncMessage = ref("");
let disposed = false;
onBeforeUnmount(() => {
	disposed = true;
	++requestGeneration;
});
const kinds = [
	{ label: "图片", value: "image" },
	{ label: "视频", value: "video" },
	{ label: "音频", value: "audio" },
	{ label: "文件", value: "file" }
];
const can = (action: string) => checkPerm(`space:info:${action}`);
const fileRequest = (action: string, data: any) => spaceRequest("info", action, data);
function toggleTrash() {
	trash.value = !trash.value;
	refresh({ page: 1 });
}
async function syncHistory() {
	if (syncing.value) return;
	syncing.value = true;
	syncMessage.value = "正在读取当前存储的历史上传文件…";
	let cursor = "",
		storage = "",
		count = 0;
	try {
		while (!disposed) {
			const res = await fileRequest("sync", { cursor, storage });
			count += res.indexed;
			syncMessage.value = `已核对 ${count} 个文件，重复记录会自动跳过，回收站文件不会恢复`;
			if (res.done) break;
			if (!res.cursor || res.cursor === cursor) throw new Error("同步游标未推进，请重试");
			cursor = res.cursor;
			storage = res.storage;
		}
		if (!disposed) {
			syncMessage.value = `同步完成，已核对 ${count} 个文件`;
			await refresh({ page: 1 });
		}
	} catch (err: any) {
		if (!disposed) {
			syncMessage.value = `同步中断，已核对 ${count} 个文件，可重新同步`;
			ElMessage.error(err?.message || "同步失败，请重试");
		}
	} finally {
		syncing.value = false;
	}
}
async function restore(item?: Eps.SpaceInfoEntity) {
	if (deleting.value) return;
	const ids = item ? [item.id] : selection.value.map((e) => e.id);
	if (!ids.length) return;
	deleting.value = true;
	try {
		await fileRequest("restore", { ids });
		ElMessage.success("文件已恢复");
		await refresh({ page: 1 });
	} catch (err: any) {
		ElMessage.error(err?.message || "恢复失败，请重试");
	} finally {
		deleting.value = false;
	}
}

// 已选列表
const selection = ref<Eps.SpaceInfoEntity[]>([]);

// 文件列表
const list = ref<Eps.SpaceInfoEntity[]>([]);

// 分页信息
const pagination = reactive({
	page: 1,
	size: 50,
	total: 0
});

// 清空选择
function clear() {
	selection.value = [];
}

// 上传成功
function onSuccess(data: any) {
	if (props.selectable && !can("add")) {
		data.id = data.uid;
		return;
	}
	fileRequest("add", {
		classifyId: ViewGroup.value?.selected?.id,
		...data
	})
		.then((res) => {
			data.id = res.id;
			if (res.trashed) {
				list.value = list.value.filter((e) => e !== data);
				ElMessage.warning("该文件在回收站中，请先恢复");
			}
		})
		.catch((err) => {
			data.error = "文件已上传，但登记失败，请同步历史文件";
			ElMessage.error(err.message);
		});
}

// 上传时
function onUpload(data: any) {
	list.value.unshift(data);
}

// 请求参数
const reqParams = {
	page: 1
};

// 刷新列表
async function refresh(params?: any) {
	// Preserve direct upload in business selectors without file-library read permission.
	if (!can("page")) {
		loadError.value = "未授权浏览文件库，可直接上传本次使用的文件";
		return;
	}
	// 清空选择
	clear();

	// 合并参数
	Object.assign(reqParams, {
		...pagination,
		...params,
		type: props.accept?.split("/")[0] || kind.value,
		keyWord: keyword.value,
		trash: trash.value
	});

	const current = ++requestGeneration;
	const requestParams = { ...reqParams };
	loading.value = true;
	loadError.value = "";
	try {
		const res = await fileRequest("page", requestParams);
		if (current !== requestGeneration || disposed) return;
		Object.assign(pagination, res.pagination);
		if (requestParams.page == 1) list.value = [];
		list.value.push(...res.list);
	} catch (err: any) {
		if (current === requestGeneration)
			loadError.value = err?.message || "文件列表加载失败，请重试";
	} finally {
		if (current === requestGeneration) loading.value = false;
	}
}

// 选择
function select(item: Eps.SpaceInfoEntity) {
	if (!item.id || item.error) return;
	const index = selection.value.findIndex((e) => e.id === item.id);

	if (index >= 0) {
		selection.value.splice(index, 1);
	} else {
		if (props.limit == 1) {
			selection.value = [item];
		} else {
			if (selection.value.length < props.limit) {
				selection.value.push(item);
			}
		}
	}
}

// 删除选中
async function remove(item?: Eps.SpaceInfoEntity) {
	if (deleting.value || trash.value || !can("delete")) return;
	const ids = (item ? [item.id] : selection.value.map((e) => e.id)).filter(Boolean);
	if (!ids.length) return;
	try {
		await ElMessageBox.confirm(
			"将选中文件移入回收站？原文件及业务引用保留，可随时恢复。",
			"提示",
			{ type: "warning" }
		);
	} catch {
		return;
	}
	if (deleting.value) return;
	deleting.value = true;
	try {
		await fileRequest("delete", { ids });
		ids.forEach((id) => {
			[list.value, selection.value].forEach((items) => {
				const index = items.findIndex((e) => e.id === id);
				if (index >= 0) items.splice(index, 1);
			});
		});
		pagination.total = Math.max(0, pagination.total - ids.length);
		ElMessage.success("已移入回收站");
	} catch (err: any) {
		ElMessage.error(err?.message || "移入回收站失败，请重试");
	} finally {
		deleting.value = false;
	}
}

// 监听选择
watch(
	selection,
	(val) => {
		emit("selection-change", val);
	},
	{
		deep: true
	}
);

// 加载更多
function loadmore() {
	if (
		!loading.value &&
		!loadError.value &&
		list.value.length &&
		list.value.length < pagination.total
	) {
		refresh({
			page: pagination.page + 1
		});
	}
}

function onDragover(e: any) {
	e.preventDefault();
}

function onDrop(e: any) {
	e.preventDefault();
	if (trash.value || (!props.selectable && !can("add"))) return;

	Array.from(e.dataTransfer.files as FileList).forEach((f: File, i: number) => {
		setTimeout(() => {
			Upload.value.upload(f);
		}, i * 10);
	});
}

provide("space", {
	selection,
	refresh,
	loading,
	list
});

defineExpose({
	selection,
	clear,
	refresh
});
</script>

<style lang="scss">
.cl-upload-panel {
	height: 100%;
	user-select: none;

	&__right {
		height: 100%;
		width: 100%;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	&__header {
		display: flex;
		align-items: center;
		min-height: 50px;
		flex-wrap: wrap;
		gap: 8px;
		padding: 8px 10px;
		box-sizing: border-box;
		.el-button + .el-button {
			margin-left: 0;
		}
	}

	&__filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 0 10px 10px;
		align-items: center;
		.el-input {
			width: 220px;
			max-width: 100%;
		}
		.el-select {
			width: 120px;
		}
		.file-count {
			font-size: 13px;
			color: var(--el-text-color-secondary);
		}
	}
	.sync-message {
		flex-shrink: 0;
	}
	&__file {
		flex: 1;
		min-height: 0;
		padding: 0 10px;
		box-sizing: border-box;
		position: relative;

		.list {
			display: flex;
			flex-wrap: wrap;

			.item {
				height: 0;
				min-height: 140px;
				min-width: 140px;
				width: calc(12.5% - 10px);
				padding-top: calc(12.5% - 10px);
				margin: 0 10px 10px 0;
				position: relative;
				box-sizing: border-box;
			}

			&.is-mini {
				.item {
					width: calc(50% - 10px);
				}
			}
		}

		.empty {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			margin: auto;
			height: 180px;
			width: 360px;
			max-width: 80%;
			border-radius: 5px;
			border: 1px dashed var(--el-border-color);
			box-sizing: border-box;
			cursor: pointer;

			&:hover {
				border-color: var(--color-primary);
			}

			i {
				font-size: 67px;
				color: #c0c4cc;
			}

			p {
				font-size: 14px;
				margin-top: 15px;
				color: #999;
			}
		}
	}

	&__footer {
		padding: 9px 0;
	}
}
</style>
