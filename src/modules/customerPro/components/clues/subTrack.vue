<template>
	<div style="min-height: 100px; height: 400px; overflow: auto">
		<el-steps :active="trackList.length" direction="vertical" finish-status="" v-if="trackList">
			<el-step
				:icon="Flag"
				style="margin: 0 0 10px 0"
				v-for="(item, index) in trackList"
				:key="index"
			>
				<template #title>
					<h4>{{ item.typeName }}</h4>
				</template>
				<template #description>
					<div style="">
						<p style="font-weight: 400">
							<span v-html="item.remark"></span>
						</p>
						<p style="font-weight: 200">
							{{ item.createTime }}「{{ item.userName ? item.userName : "-" }}」
						</p>
					</div>
				</template>
			</el-step>
		</el-steps>
	</div>
</template>

<script lang="ts" name="customeer_pro-subTrack" setup>
import { useCool } from "/@/cool";
import { Flag } from "@element-plus/icons-vue";
import { onMounted, ref } from "vue";

const props = defineProps({
	id: String
});
const emit = defineEmits(["cancel"]);
const { service } = useCool();

// 轨迹列表
const trackList = ref();
const getTrack = async () => {
	trackList.value = await service.customer_pro.clues.getTrackList({ cluesId: props.id });
};

onMounted(() => {
	getTrack();
});
</script>
