<!--
@component ResourceCard
@lang zh-CN 呈现一个已由 local provider 返回的资源目录 entry 和显式查看意图；不执行导航、请求、预约或图片发现。
@lang en Presents one resource-catalog entry returned by local provider and explicit view intent; it executes no navigation, request, booking, or image discovery.
-->
<template>
  <!-- <lang><zh-CN>card 将原创 image、资源类型、名称和下一时段组织为可点击但无副作用的展示层。</zh-CN><en>Card organizes original image, resource type, name, and next slot as a clickable but side-effect-free presentation layer.</en></lang> -->
  <u-card :title="props.entry.name['zh-Hans']" :sub-title="props.entry.venueName['zh-Hans']" shadow>
    <!-- <lang><zh-CN>图片来自有限 asset map；缺失时 UImage 显示自己的中性 fallback。</zh-CN><en>Image comes from finite asset map; UImage displays its own neutral fallback when missing.</en></lang> -->
    <u-image class="resource-card__image" :src="imageUrl || ''" :alt="props.entry.name['zh-Hans']" size="large" shape="rounded" />
    <!-- <lang><zh-CN>中性标签不使用行业标签库，文本都来自项目 local JSON。</zh-CN><en>Neutral tag uses no industry-tag registry and all copy comes from project local JSON.</en></lang> -->
    <view class="resource-card__meta"><u-tag :text="props.entry.type['zh-Hans']" tone="primary" /><text>{{ props.entry.district['zh-Hans'] }}</text></view>
    <!-- <lang><zh-CN>下一时段只作示例可用性提示，不声明实时库存或锁定。</zh-CN><en>Next slot is only a demo availability hint and declares no live inventory or lock.</en></lang> -->
    <text class="resource-card__slot">最近可约：{{ props.entry.nextAvailableSlot || '请查看详情' }}</text>
    <template #footer>
      <!-- <lang><zh-CN>按钮只 emit view intent；页面拥有导航和详情读取。</zh-CN><en>Button emits view intent only; the page owns navigation and detail reading.</en></lang> -->
      <u-button label="查看详情 / View details" variant="secondary" block @click="emit('view', props.entry.id)" />
    </template>
  </u-card>
</template>

<script setup>
import { computed } from 'vue';
import { UButton, UCard, UImage, UTag } from '@hia-uview/ui';
import { getVenueImage } from '../data/asset-map.mjs';

// <lang><zh-CN>组件名保持项目语义，不定义可复用业务 registry 或路由策略。</zh-CN><en>Component name retains project semantics and defines no reusable business registry or route policy.</en></lang>
defineOptions({ name: 'resource-card' });

// <lang><zh-CN>entry 是已映射的 canonical catalog entry；组件不读取整个 dataset 或 source provider。</zh-CN><en>Entry is an already mapped canonical catalog entry; component reads neither entire dataset nor source provider.</en></lang>
const props = defineProps({ entry: { type: Object, required: true } });

// <lang><zh-CN>view 是唯一事件，代表本地用户意图而非路由或网络操作。</zh-CN><en>View is the sole event and represents local user intent rather than route or network operation.</en></lang>
const emit = defineEmits(['view']);

// <lang><zh-CN>根据受限 image ID 读取仓内原创 asset URL；未知值只导致空 URL。</zh-CN><en>Read in-repository original asset URL through bounded image ID; an unknown value only produces empty URL.</en></lang>
const imageUrl = computed(() => getVenueImage(props.entry.imageId));
</script>

<style scoped>
/* <lang><zh-CN>卡片内部布局只服务小程序/H5 的可读信息密度，不编码业务状态颜色。</zh-CN><en>Internal card layout serves readable mini-program/H5 information density and encodes no business-state color.</en></lang> */
.resource-card__image { width: 100%; margin-bottom: 12px; }
.resource-card__meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; color: var(--u-sys-color-text-secondary); font-size: 13px; }
.resource-card__slot { display: block; color: var(--u-sys-color-text); font-size: 14px; }
</style>
