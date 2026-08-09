<!--
@component ResourceCard
@lang zh-CN 呈现一个 local provider 已返回的资源目录 entry 和显式查看意图；所有领域字段经共享 runtime locale 投影，不执行导航、请求、预约或图片发现。
@lang en Presents one resource-catalog entry returned by the local provider and an explicit view intent; every domain field is projected through shared runtime locale, and it executes no navigation, request, booking, or image discovery.
-->
<template>
  <!-- <lang><zh-CN>card 采用设计稿的横向摘要比例：原创 image、资源类型、名称和下一时段同属无副作用展示层，不把 card 本身变成隐式导航。</zh-CN><en>Card uses the board's horizontal summary proportion: original image, resource type, name, and next slot remain a side-effect-free presentation layer, and the card itself never becomes implicit navigation.</en></lang> -->
  <u-card :class="['resource-card', `resource-card--${cardLayout}`]" :padding="12" shadow>
    <view class="resource-card__content">
      <!-- <lang><zh-CN>图片来自有限 asset map；固定缩略图几何使不同场馆封面不改变目录行高；alt 使用场馆而非单个 resource 名称，说明封面所描述的真实视觉对象。</zh-CN><en>Image comes from finite asset map; fixed thumbnail geometry prevents venue covers from changing catalog row height; alt names the venue rather than one resource because it describes the actual visual subject.</en></lang> -->
      <u-image class="resource-card__image" :src="imageUrl || ''" :alt="venueName" size="large" shape="rounded" />
      <view class="resource-card__body">
        <!-- <lang><zh-CN>名称与场馆始终相邻，先建立用户识别资源所需的主次层级。</zh-CN><en>Name and venue stay adjacent, establishing the primary and secondary hierarchy needed to identify a resource.</en></lang> -->
        <text class="resource-card__title">{{ resourceName }}</text>
        <text class="resource-card__venue">{{ venueName }}</text>
        <!-- <lang><zh-CN>中性标签不使用行业标签库，领域文本均通过受控 localize helper 投影。</zh-CN><en>Neutral tags use no industry-tag registry, and all domain text is projected through the constrained localize helper.</en></lang> -->
        <view class="resource-card__meta"><u-tag :text="resourceType" tone="primary" /><text>{{ districtName }}</text></view>
        <!-- <lang><zh-CN>下一时段只作示例可用性提示，不声明实时库存或锁定。</zh-CN><en>Next slot is only a demo availability hint and declares no live inventory or lock.</en></lang> -->
        <text class="resource-card__slot">{{ nextSlotLabel }}</text>
      </view>
    </view>
    <template #footer>
      <!-- <lang><zh-CN>紧凑动作明确保留查看意图；页面拥有导航和详情读取。</zh-CN><en>Compact action explicitly retains the view intent; the page owns navigation and detail reading.</en></lang> -->
      <u-button :label="runtimeLocale.t('common.viewDetails')" variant="secondary" size="sm" @click="emit('view', props.entry.id)" />
    </template>
  </u-card>
</template>

<script setup>
import { computed } from 'vue';
import { getVenueImage } from '../data/asset-map.mjs';
import { useRuntimeLocale } from '../localization/runtime-locale.mjs';

// <lang><zh-CN>组件名保持项目语义，不定义可复用业务 registry 或路由策略。</zh-CN><en>Component name retains project semantics and defines no reusable business registry or route policy.</en></lang>
defineOptions({ name: 'resource-card' });

// <lang><zh-CN>entry 是已映射的 canonical catalog entry；layout 仅选择两种已审阅的信息密度，组件不读取整个 dataset 或 source provider。</zh-CN><en>Entry is an already mapped canonical catalog entry; layout selects only two reviewed information densities, and the component reads neither the whole dataset nor source provider.</en></lang>
const props = defineProps({
  entry: { type: Object, required: true },
  layout: {
    type: String,
    default: 'featured',
    validator: (value) => ['featured', 'catalog'].includes(value)
  }
});

// <lang><zh-CN>view 是唯一事件，代表本地用户意图而非路由或网络操作。</zh-CN><en>View is the sole event and represents local user intent rather than route or network operation.</en></lang>
const emit = defineEmits(['view']);

// <lang><zh-CN>读取唯一共享 runtime locale，使所有领域字段选择当前单一显示语言。</zh-CN><en>Read the sole shared runtime locale so every domain field selects the current single display language.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>未知 layout 稳定回退为首页精选比例，避免外部字符串成为 CSS 类或改变资源内容。</zh-CN><en>An unknown layout deterministically falls back to Home's featured proportion, preventing an external string from becoming a CSS class or changing resource content.</en></lang>
const cardLayout = computed(() => props.layout === 'catalog' ? 'catalog' : 'featured');

// <lang><zh-CN>各领域字段在模板之外统一投影，避免 `zh-Hans` 直取或单个字段形成双语拼接。</zh-CN><en>Project each domain field outside the template, avoiding direct `zh-Hans` access or bilingual concatenation in one field.</en></lang>
const resourceName = computed(() => runtimeLocale.localize(props.entry.name));
const venueName = computed(() => runtimeLocale.localize(props.entry.venueName));
const resourceType = computed(() => runtimeLocale.localize(props.entry.type));
const districtName = computed(() => runtimeLocale.localize(props.entry.district));

// <lang><zh-CN>下一时段为空时使用静态资源 fallback，不把空值、undefined 或技术 ID 显示给用户。</zh-CN><en>When next slot is empty, use a static-resource fallback and never display an empty value, undefined, or technical ID to users.</en></lang>
const nextSlotLabel = computed(() => runtimeLocale.t('resource.nextSlot', {
  slot: props.entry.nextAvailableSlot || runtimeLocale.t('resource.viewFallback')
}));

// <lang><zh-CN>根据受限 image ID 读取仓内原创 asset URL；未知值只导致空 URL。</zh-CN><en>Read in-repository original asset URL through bounded image ID; an unknown value only produces empty URL.</en></lang>
const imageUrl = computed(() => getVenueImage(props.entry.imageId));
</script>

<style scoped>
/* <lang><zh-CN>卡片内部使用固定缩略图和弹性正文，复现目录的紧凑横向节奏；仅消费公共系统 token，不编码业务状态颜色。</zh-CN><en>Card internals use a fixed thumbnail and flexible body to reproduce the compact horizontal catalog rhythm; they consume only public system tokens and encode no business-state color.</en></lang> */
.resource-card__content { display: flex; align-items: stretch; gap: 12px; min-width: 0; }
.resource-card__image { flex: 0 0 112px; height: 112px; width: 112px; }
.resource-card__image :deep(.u-image__native) { height: 100%; width: 100%; }
.resource-card__body { display: flex; flex: 1; gap: 5px; flex-direction: column; min-width: 0; }
.resource-card__title { color: var(--u-sys-color-text); font-size: 16px; font-weight: 700; line-height: 1.3; }
.resource-card__venue { color: var(--u-sys-color-text-secondary); font-size: 13px; line-height: 1.35; }
.resource-card__meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; color: var(--u-sys-color-text-secondary); font-size: 12px; }
.resource-card__slot { display: block; color: var(--u-sys-color-text); font-size: 13px; }
/* <lang><zh-CN>目录版将同一受控资源事实改为设计稿所需的封面优先层级；它不改变卡片事件、按钮或数据读取。</zh-CN><en>The catalog variant rearranges the same bounded resource facts into the board's cover-first hierarchy; it changes no card event, button, or data read.</en></lang> */
.resource-card--catalog .resource-card__content { gap: 10px; flex-direction: column; }
.resource-card--catalog .resource-card__image { flex: 0 0 auto; height: 148px; width: 100%; }
.resource-card--catalog .resource-card__body { gap: 6px; }
.resource-card--catalog .resource-card__meta { margin-top: 0; }
</style>
