<template>
	<div class="app-slider">
		<div class="app-slider__logo" @click="toHome">
			<img class="avatar" :src="logo" alt="Logo" />
			<span v-if="!app.isFold || browser.isMini">{{ siteName }}</span>
		</div>

		<div class="app-slider__container">
			<b-menu />
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useBase } from "/$/base";
import { useBrowser, useCool } from "/@/cool";
import BMenu from "./bmenu";
import { onMounted, ref } from "vue";

const { browser } = useBrowser();
const { app, setting } = useBase();

const logo = ref(setting.setting.logo || app.info.logo);
const siteName = ref(setting.setting.siteName || app.info.name);
const copyright = ref(setting.setting.copyright);

function toHome() {}

onMounted(() => {});
</script>

<style lang="scss">
.app-slider {
	height: 100%;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
	background-color: #2f3447;
	border: 0px #f0e8e8 solid;

	&__logo {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 50px;
		cursor: pointer;

		img {
			// height: 30px;
			width: 50px;
		}

		span {
			color: var(--color-primary);
			font-weight: bold;
			font-size: 18px;
			margin-left: 10px;
			font-family: inherit;
			white-space: nowrap;
		}
	}

	&__container {
		height: calc(100% - 80px);
		overflow-y: auto;

		&::-webkit-scrollbar {
			width: 0;
			height: 0;
		}
	}

	&__menu {
		&.el-popper {
			&.is-light {
				border: 0;
			}
		}

		.el-menu {
			border-right: 0;
			background-color: transparent;

			&--popup {
				.cl-svg,
				span {
					color: #000;
				}
			}

			.el-sub-menu__title,
			&-item {
				&.is-active,
				&:hover {
					background-color: var(--color-primary) !important;

					.cl-svg,
					span {
						color: #fff;
					}
				}
			}

			.el-sub-menu__title,
			&-item,
			&__title {
				color: #eee;
				letter-spacing: 0.5px;
				height: 50px;
				line-height: 50px;

				.wrap {
					width: 100%;
				}

				.cl-svg {
					font-size: 16px;
				}

				span {
					display: inline-block;
					font-size: 14px;
					letter-spacing: 1px;
					margin-left: 10px;
					user-select: none;
				}
			}

			&--collapse {
				.wrap {
					text-align: center;

					.cl-svg {
						font-size: 18px;
					}
				}
			}
		}
	}
}
</style>
