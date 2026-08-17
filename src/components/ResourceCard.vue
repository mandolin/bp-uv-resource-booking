<!--
@component ResourceCard
@lang zh-CN 呈现一个 local provider 返回的 canonical 资源摘要；首页使用横向精选布局，发现页使用封面优先布局，整张卡片只报告查看意图，不执行导航、请求、预约或图片发现。
@lang en Presents one canonical resource summary returned by the local provider; Home uses a horizontal featured layout and Discover uses a cover-first layout, while the whole card reports view intent only and performs no navigation, request, booking, or image discovery.
-->
<template>
  <!-- <lang><zh-CN>HIA-uView UCard 提供受控表面；页面组件只在其默认 slot 内安排领域事实，不创建第二套卡片基础组件。</zh-CN><en>HIA-uView UCard provides the controlled surface; the page component arranges domain facts only inside its default slot and creates no second card primitive.</en></lang> -->
  <u-card :class="['resource-card', `resource-card--${cardLayout}`]" :padding="0" shadow>
    <!-- <lang><zh-CN>整张摘要是唯一查看 control，避免独立详情按钮与卡片本体产生重复主操作。</zh-CN><en>The whole summary is the sole view control, avoiding duplicate primary actions between a details button and the card body.</en></lang> -->
    <view class="resource-card__control" role="button" tabindex="0" :aria-label="displayTitle" @click="handleView" @keydown.enter.prevent="handleView" @keydown.space.prevent="handleView">
      <!-- <lang><zh-CN>图片容器拥有明确几何，UImage 通过公开 fluid prop 填满；不使用跨组件深层选择器。</zh-CN><en>The image container owns explicit geometry and UImage fills it through the public fluid prop; no cross-component deep selector is used.</en></lang> -->
      <view class="resource-card__image-shell">
        <u-image :src="imageUrl || ''" :alt="venueName" fluid shape="rounded" />
      </view>

      <view class="resource-card__body">
        <!-- <lang><zh-CN>可见主标题只使用较短的资源名称，场馆作为相邻次级事实；整卡 aria-label 仍组合两者，避免中英文长名称互相挤压。</zh-CN><en>The visible primary title uses the shorter resource name while the venue remains the adjacent secondary fact; the whole-card aria-label still combines both, preventing long Chinese or English names from crowding one another.</en></lang> -->
        <text class="resource-card__title">{{ resourceName }}</text>
        <text class="resource-card__venue">{{ venueName }}</text>

        <!-- <lang><zh-CN>容量与下一时段使用 HIA-uView UIcon 的可见 label 组合；它们只说明 local JSON，不声明实时库存。</zh-CN><en>Capacity and next slot use visible labels composed by HIA-uView UIcon; they describe local JSON only and declare no live inventory.</en></lang> -->
        <view class="resource-card__facts">
          <u-icon name="○" :label="capacityLabel" size="small" tone="neutral" />
          <u-icon name="◷" :label="nextSlotLabel" size="small" tone="neutral" />
        </view>
      </view>
    </view>
  </u-card>
</template>

<script setup>
// <lang><zh-CN>computed 只把受限 entry 投影为当前 locale 文案，不建立派生缓存服务。</zh-CN><en>Computed values only project the bounded entry into current-locale copy and create no derived cache service.</en></lang>
import { computed } from 'vue';
import { getVenueImage } from '../data/asset-map.mjs';
import { useRuntimeLocale } from '../localization/runtime-locale.mjs';

// <lang><zh-CN>稳定组件名用于调试和模板识别，不注册全局业务组件或路由。</zh-CN><en>The stable component name supports debugging and template identification and registers no global business component or route.</en></lang>
defineOptions({ name: 'ResourceCard' });

// <lang><zh-CN>entry 是 canonical catalog entry；layout 只选择两种已审阅的信息密度。</zh-CN><en>Entry is a canonical catalog entry; layout selects only two reviewed information densities.</en></lang>
const props = defineProps({
  // <lang><zh-CN>调用方必须提供 provider 已映射的单项资源；组件不接受 dataset 或 source handle。</zh-CN><en>The caller must provide one provider-mapped resource; the component accepts neither dataset nor source handle.</en></lang>
  entry: { type: Object, required: true },
  // <lang><zh-CN>布局只允许首页精选和发现目录两种稳定分支。</zh-CN><en>Layout allows only the stable Home-featured and Discover-catalog branches.</en></lang>
  layout: {
    type: String,
    default: 'featured',
    validator: (value) => ['featured', 'catalog'].includes(value)
  }
});

// <lang><zh-CN>view 是唯一事件，表示本地用户意图而非已完成导航或网络操作。</zh-CN><en>View is the sole event and represents local user intent rather than completed navigation or network work.</en></lang>
const emit = defineEmits(['view']);

// <lang><zh-CN>读取唯一共享 runtime locale，避免领域名称形成中英混排。</zh-CN><en>Read the sole shared runtime locale to prevent mixed-language domain names.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>未知 layout 稳定回退首页精选比例，拒绝任意字符串成为样式分支。</zh-CN><en>An unknown layout deterministically falls back to the Home-featured proportion, rejecting arbitrary strings as style branches.</en></lang>
const cardLayout = computed(() => props.layout === 'catalog' ? 'catalog' : 'featured');

// <lang><zh-CN>领域字段分别经共享 localize helper 选择当前语言，不直取 `zh-Hans` 或拼接双语值。</zh-CN><en>Domain fields separately use the shared localize helper to select the current language and never directly read `zh-Hans` or concatenate bilingual values.</en></lang>
const resourceName = computed(() => runtimeLocale.localize(props.entry.name));
const venueName = computed(() => runtimeLocale.localize(props.entry.venueName));

// <lang><zh-CN>主标题只组合两个已经本地化的安全名称，并使用中性分隔符。</zh-CN><en>The primary title combines only two already-localized safe names with a neutral separator.</en></lang>
const displayTitle = computed(() => `${venueName.value} · ${resourceName.value}`);

// <lang><zh-CN>容量使用受控数字占位；无效值回退到零，不显示 undefined 或技术字段。</zh-CN><en>Capacity uses a bounded numeric placeholder; an invalid value falls back to zero and never displays undefined or a technical field.</en></lang>
const capacityLabel = computed(() => runtimeLocale.t('resource.capacity', {
  capacity: Number.isFinite(props.entry.capacity) ? props.entry.capacity : 0
}));

// <lang><zh-CN>下一时段为空时使用静态 fallback，不猜测实时可用性。</zh-CN><en>An empty next slot uses static fallback and never guesses live availability.</en></lang>
const nextSlotLabel = computed(() => runtimeLocale.t('resource.nextSlot', {
  slot: props.entry.nextAvailableSlot || runtimeLocale.t('resource.viewFallback')
}));

// <lang><zh-CN>图片只从有限 asset-map ID 读取；未知值产生空 URL，不回退网络。</zh-CN><en>The image is read only through a finite asset-map ID; an unknown value yields an empty URL with no network fallback.</en></lang>
const imageUrl = computed(() => getVenueImage(props.entry.imageId));

/**
 * @lang zh-CN 将整卡点击报告为当前资源的查看意图。
 * @lang en Reports a whole-card click as view intent for the current resource.
 * @returns {void} <lang><zh-CN>无返回值；仅 emit canonical ID。</zh-CN><en>No return value; emits only the canonical ID.</en></lang>
 */
function handleView() {
  // <lang><zh-CN>组件不解释路由目标，只把 provider 已给出的 ID 交还页面。</zh-CN><en>The component interprets no route target and only returns the provider-supplied ID to the page.</en></lang>
  emit('view', props.entry.id);
}
</script>

<style scoped>
/* <lang><zh-CN>卡片根裁切公开 UImage、继承页面字体，并保持设计板较柔和的应用级圆角；它不覆盖 UCard 内部选择器。</zh-CN><en>The card root clips the public UImage, inherits the page font, and retains the board's softer application-level radius without overriding UCard internals.</en></lang> */
.resource-card { overflow: hidden; border-radius: var(--bp-card-radius, 14px); font-family: inherit; }
.resource-card__control { display: flex; align-items: stretch; min-width: 0; cursor: pointer; font-family: inherit; }
/* #ifdef H5 */
/* <lang><zh-CN>整卡获得键盘焦点时使用既有主题焦点色，确保 Enter/Space 等价激活具有非颜色之外的可见边界。</zh-CN><en>When the whole card receives keyboard focus, use the existing theme focus color so Enter/Space-equivalent activation has a visible boundary beyond color alone.</en></lang> */
.resource-card__control:focus-visible { outline: 2px solid var(--u-sys-color-focus); outline-offset: -2px; }
/* #endif */
/* <lang><zh-CN>首页精选图固定占卡宽约四成并使用 128px 高度覆盖右侧正文的实际行高，避免 fixed UImage 挤入正文或在卡片底部留下白条。</zh-CN><en>The Home-featured image occupies about two-fifths of the card width and uses a 128px height to cover the actual line-height of the copy on the right, preventing a fixed UImage from intruding into copy or leaving a white strip at the card bottom.</en></lang> */
.resource-card__image-shell { flex: 0 0 42%; height: 128px; overflow: hidden; }
.resource-card__body { box-sizing: border-box; display: flex; flex: 1; flex-direction: column; gap: 5px; min-width: 0; padding: 12px 12px 11px; }
.resource-card__title { display: -webkit-box; overflow: hidden; color: var(--u-sys-color-text); font-size: 16px; font-weight: 600; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.resource-card__venue { overflow: hidden; color: var(--u-sys-color-text-secondary); font-size: 13px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.resource-card__facts { display: flex; flex-direction: column; gap: 2px; margin-top: auto; min-width: 0; }
/* <lang><zh-CN>发现目录版采用全宽封面和下置正文；与首页共用同一事实与点击语义。</zh-CN><en>The Discover-catalog variant uses a full-width cover and body below while sharing the same facts and click meaning with Home.</en></lang> */
.resource-card--catalog .resource-card__control { flex-direction: column; }
.resource-card--catalog .resource-card__image-shell { flex: 0 0 auto; height: 172px; width: 100%; }
.resource-card--catalog .resource-card__body { gap: 6px; min-height: 126px; padding: 13px 14px 14px; }
.resource-card--catalog .resource-card__facts { flex-direction: row; flex-wrap: wrap; justify-content: space-between; gap: 6px 12px; }
/* #ifdef MP-WEIXIN */
.resource-card__title { color: #001b2e; }
.resource-card__venue { color: #27364a; }
/* #endif */
</style>
