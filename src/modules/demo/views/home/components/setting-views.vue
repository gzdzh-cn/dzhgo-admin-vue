<template>
	<div class="setting">
		<div class="floor">
			<div class="title">
				<el-icon><Setting /></el-icon>
				系统信息
			</div>
			<div class="table">
				<table>
					<tbody>
						<tr>
							<td class="left">系统更新：</td>
							<td class="right">已是最新版</td>
							<td class="left">当前版本：</td>
							<td class="right">{{ serverInfo?.dzhVersion }}</td>
						</tr>
						<tr>
							<td class="left">网站名称：</td>
							<td class="right">{{ serverInfo?.siteName }}</td>
							<td class="left">版权所有：</td>
							<td class="right">盗版必究</td>
						</tr>
						<tr>
							<td class="left">更新日志：</td>
							<td class="right"><a>查看</a></td>
							<td class="left">帮助中心:</td>
							<td class="right"><a>查看</a></td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<div class="floor">
			<div class="title">
				<el-icon><Odometer /></el-icon>
				服务器信息
			</div>
			<div class="table">
				<table>
					<tbody>
						<tr>
							<td class="left">服务器系统：</td>
							<td class="right">{{ serverInfo?.goHostOs }}</td>
							<td class="left">网站域名/IP：</td>
							<td class="right">
								{{ serverInfo?.hostUrl }} [ {{ serverInfo?.sourceIp }} ]
							</td>
						</tr>
						<tr>
							<td class="left">服务器架构：</td>
							<td class="right">{{ serverInfo?.goHostArch }}</td>
							<td class="left">Mysql 版本：</td>
							<td class="right">{{ serverInfo?.mysqlVersion }}</td>
						</tr>

						<tr>
							<td class="left">go 版本：</td>
							<td class="right">{{ serverInfo?.goVersion }}</td>
							<td class="left">gf 版本</td>
							<td class="right">{{ serverInfo?.gfVersion }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { Setting, Odometer } from "@element-plus/icons-vue";
import { useCool } from "/@/cool";
import { onMounted, ref } from "vue";

const { service } = useCool();
const serverInfo = ref();

// 服务器信息
const getServerInfo = async () => {
	serverInfo.value = await service.base.open.serverInfo();
};

onMounted(() => {
	getServerInfo();
});
</script>

<style lang="scss" scoped>
a {
	color: #31b4e1;
	text-decoration: none;
}
table {
	box-sizing: border-box;
	width: 100%;
	border-collapse: collapse; /* 合并边框 */
}

.setting {
	padding: 0 30px 30px 30px;
	.floor {
		margin-top: 20px;
	}
	.title {
		height: 50px;
		line-height: 50px;
		font-size: 16px;
		font-weight: 400;
	}
	.table {
		.left {
			background-color: #f9f9f9;
			text-align: center;
			height: 40px;
			line-height: 40px;
			border-width: 1px;
			border-style: solid;
			border-color: #eee;
		}
		.right {
			padding: 0 10px;
			text-align: left;
			height: 40px;
			line-height: 40px;
			border-width: 1px;
			border-style: solid;
			border-color: #eee;
		}
	}
}
</style>
