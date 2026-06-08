<template>
    <div class="app-sub-menu" v-if="app.isFold && !browser.isMini">
        <div class="app-sub-menu__title">
            {{ activeItem?.name }}
        </div>
        <div class="app-sub-menu__list">
            <template v-for="item in children" :key="item.id">
                <!-- 有子菜单：可展开/收起 -->
                <div v-if="item.children && item.children.length > 0">
                    <div class="app-sub-menu__item"
                        :class="{ 'is-active': hasActiveChild(item), 'is-expanded': expandedIds.includes(item.id) }"
                        @click="toggleExpand(item.id)">
                        <i :class="['menu-icon', 'cl-svg', item.icon]" />
                        <span class="menu-label">{{ item.name }}</span>
                        <el-icon class="arrow-icon" :class="{ 'is-rotated': expandedIds.includes(item.id) }">
                            <ArrowRight />
                        </el-icon>
                    </div>
                    <!-- 三级菜单 -->
                    <div v-show="expandedIds.includes(item.id)" class="app-sub-menu__sub-list">
                        <div v-for="sub in item.children.filter((e) => e.isShow)" :key="sub.id"
                            class="app-sub-menu__sub-item" :class="{ 'is-active': route.path === sub.path }"
                            @click.stop="toView(sub.path)">
                            <span class="menu-label">{{ sub.name }}</span>
                        </div>
                    </div>
                </div>
                <!-- 无子菜单：直接跳转 -->
                <div v-else class="app-sub-menu__item" :class="{ 'is-active': route.path === item.path }"
                    @click="toView(item.path)">
                    <i :class="['menu-icon', 'cl-svg', item.icon]" />
                    <span class="menu-label">{{ item.name }}</span>
                </div>
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useStore } from "../../store";
import { useCool } from "/@/cool";
import { ArrowRight } from "@element-plus/icons-vue";

const { router, route, browser } = useCool();
const { menu, app } = useStore();

// 展开的三级菜单ID列表
const expandedIds = ref<number[]>([]);

// 页面跳转
function toView(url: string) {
    if (url != route.path) {
        router.push(url);
    }
}

// 检查当前路由是否在菜单的子菜单中（递归）
function hasActiveChild(item: any): boolean {
    if (!item.children) return false;
    return item.children.some((child: any) => {
        if (child.path === route.path) return true;
        if (child.children) return hasActiveChild(child);
        return false;
    });
}

// 展开/收起三级菜单
function toggleExpand(id: number) {
    const idx = expandedIds.value.indexOf(id);
    if (idx >= 0) {
        expandedIds.value.splice(idx, 1);
    } else {
        expandedIds.value.push(id);
    }
}

// 当前选中的一级菜单
const activeItem = computed(() => {
    return menu.list[menu.foldActiveIndex];
});

// 当前一级菜单的子菜单
const children = computed(() => {
    return (activeItem.value?.children || []).filter((e) => e.isShow);
});

// 自动展开包含当前路由的三级菜单
function autoExpand() {
    const list = children.value;
    if (!list) return;
    list.forEach((item: any) => {
        if (item.children && hasActiveChild(item)) {
            if (!expandedIds.value.includes(item.id)) {
                expandedIds.value.push(item.id);
            }
        }
    });
}

// 监听路由变化，自动展开
watch(() => route.path, autoExpand, { immediate: true });

// 监听一级菜单切换，重置展开状态并自动展开
watch(() => menu.foldActiveIndex, () => {
    expandedIds.value = [];
    autoExpand();
});
</script>

<style lang="scss" scoped>
.app-sub-menu {
    width: 140px;
    min-width: 140px;
    height: 100%;
    background-color: #fff;
    border-right: 1px solid #e4e7ed;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 0;
        height: 0;
    }

    &__title {
        padding: 12px;
        font-size: 18px;
        color: #303133;
        font-weight: bold;
        border-bottom: 1px solid #e4e7ed;
    }

    &__list {
        padding: 8px 0;
    }

    &__item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        color: #606266;
        transition: all 0.2s;
        margin: 4px 8px;
        border-radius: 4px;

        &:hover {
            background-color: #f5f7fa;
            color: #409eff;
        }

        &.is-active {
            background-color: #ecf5ff;
            color: #409eff;

            .cl-svg {
                color: #409eff;
            }
        }

        .cl-svg {
            font-size: 16px;
            margin-right: 10px;
            flex-shrink: 0;
            color: #909399;
        }

        .arrow-icon {
            font-size: 12px;
            margin-left: auto;
            color: #c0c4cc;
            transition: transform 0.2s;

            &.is-rotated {
                transform: rotate(90deg);
            }
        }

        span {
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }

    &__sub-list {
        padding: 4px 0;
    }

    &__sub-item {
        padding: 10px 16px 10px 42px;
        cursor: pointer;
        color: #606266;
        transition: all 0.2s;
        margin: 2px 8px;
        border-radius: 4px;
        font-size: 13px;

        &:hover {
            background-color: #f5f7fa;
            color: #409eff;
        }

        &.is-active {
            background-color: #ecf5ff;
            color: #409eff;
        }
    }
}
</style>
