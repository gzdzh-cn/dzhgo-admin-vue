<template>
	<el-button
		v-if="canManageApp('save') || canManageApp('move') || canManageApp('delete')"
		@click="visible = true"
		>应用管理</el-button
	>
	<el-dialog v-model="visible" title="应用登记与平台管理" width="min(720px, 94vw)" append-to-body>
		<el-alert
			title="登记应用即可接收统计，无需上传版本。iOS 与鸿蒙由应用市场更新，本后台仅提供统计。"
			type="info"
			:closable="false"
			show-icon
		/>
		<app-group
			:groups="groups"
			:loading="loading || false"
			:error="error || ''"
			selected-app-id=""
			selected-package=""
			selected-platform=""
			:unassigned="false"
			@refresh="$emit('refresh')"
		/>
	</el-dialog>
</template>
<script setup lang="ts">
import { ref } from "vue";
import AppGroup from "./app-group.vue";
import { canManageApp } from "../service";
import type { AppGroupOption } from "../service";
defineProps<{ groups: AppGroupOption[]; loading?: boolean; error?: string }>();
defineEmits<{ (event: "refresh"): void }>();
const visible = ref(false);
</script>
