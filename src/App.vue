<template>
	<el-config-provider>
		<router-view />
	</el-config-provider>
</template>

<script lang="ts" setup>
import { ElConfigProvider } from "element-plus";

import { onMounted } from "vue";
import { useCool } from "/@/cool";

const { service } = useCool();

let siteName = "管理系统";
const getSetting = async () => {
	const result = await service.base.open.getSetting();
	if (result.siteName) {
		siteName = result.siteName;
	}
	if (result.logo) {
		document.querySelector("link[rel='icon']").href = result.logo;
	}
	window.document.title = siteName;
};

onMounted(() => {
	getSetting();
});
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
