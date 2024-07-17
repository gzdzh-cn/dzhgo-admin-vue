<template>
	<el-config-provider :locale="zhCn">
		<router-view />
	</el-config-provider>
</template>

<script lang="ts" setup>
import { ElConfigProvider } from "element-plus";
import zhCn from "element-plus/lib/locale/lang/zh-cn";
</script>

<style lang="scss">
.dzh_popover {
	min-width: 80px !important;
}
.divider {
	width: 100%;
	height: 1px;
	margin: 15px 0;
	border-top: 1px dashed #e9e9e9;
}
</style>
