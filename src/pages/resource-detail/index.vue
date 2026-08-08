<!--
@lang zh-CN 资源详情页呈现一个 local provider 已受限返回的资源、场馆和可预约时段，并只发出继续预约的本地页面导航；它不承诺实时库存、定位、地图、价格、支付或远端读取。
@lang en Resource Detail presents a resource, venue, and bookable slots already bounded by the local provider and emits only local page navigation to continue booking; it promises no live inventory, location, map, price, payment, or remote read.
-->
<template>
  <!-- <lang><zh-CN>provider 直接包住 detail 页面，令 UI 的受限 locale context 与领域值投影一致。</zh-CN><en>The provider directly wraps the detail page, aligning UI constrained locale context with domain-value projection.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <view class="resource-detail-page">
      <!-- <lang><zh-CN>根节点按 detail 的有限 phase 选择静态 loading、可恢复 failure 或已加载详情。</zh-CN><en>The root selects static loading, recoverable failure, or loaded detail from the detail's finite phase.</en></lang> -->
      <u-loading-page v-if="demo.detailPhase.value === 'loading'" :message="runtimeLocale.t('detail.loading')" />
      <view v-else-if="demo.detailPhase.value === 'failure'" class="resource-detail-page__state">
        <u-notice visible tone="error" :message="runtimeLocale.localize(demo.detailFailure.value?.message) || runtimeLocale.t('common.notAvailable')" />
        <u-button :label="runtimeLocale.t('common.goDiscover')" block @click="backToDiscover" />
      </view>
      <view v-else-if="demo.detailPhase.value === 'ready' && detail.kind === 'detail'" class="resource-detail-page__content">
        <u-image class="resource-detail-page__image" :src="venueImage || ''" :alt="venueName" size="large" shape="rounded" />
        <view class="resource-detail-page__source"><source-badge :source="detail.source" /><text>{{ runtimeLocale.t('detail.offline') }}</text></view>
        <u-tag :text="resourceType" tone="primary" />
        <text class="resource-detail-page__title">{{ resourceName }}</text>
        <text class="resource-detail-page__venue">{{ venueName }} · {{ districtName }}</text>
        <text class="resource-detail-page__summary">{{ venueSummary }}</text>
        <u-card :title="runtimeLocale.t('detail.availableSlots')" :sub-title="runtimeLocale.t('detail.localSchedule')">
          <view class="resource-detail-page__slots"><u-tag v-for="slot in detail.resource.availableSlots" :key="slot" :text="slot" tone="accent" shape="pill" /></view>
        </u-card>
        <u-notice visible tone="info" :message="runtimeLocale.t('detail.bookingNotice')" />
        <u-button :label="runtimeLocale.t('detail.continueBooking')" block @click="continueBooking" />
      </view>
      <u-empty v-else :title="runtimeLocale.t('detail.emptyTitle')" :description="runtimeLocale.t('detail.emptyDescription')" :action-text="runtimeLocale.t('common.goDiscover')" @action="backToDiscover" />
    </view>
  </u-config-provider>
</template>

<script setup>
import { computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import SourceBadge from '../../components/SourceBadge.vue';
import { getVenueImage } from '../../data/asset-map.mjs';
import { applyPageTitle } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>详情页只读取共享 demo 的有限 detail surface 与 action。</zh-CN><en>Detail reads only the shared demo's finite detail surface and action.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>读取唯一共享 locale，禁止 detail 模板直接从多语言 domain object 取固定语言字段。</zh-CN><en>Read the sole shared locale, prohibiting detail template from taking a fixed-language field directly from a multilingual domain object.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>模板只在 ready branch 消费此 detail；缺失时空对象保持 computed 无副作用。</zh-CN><en>The template consumes this detail only in the ready branch; an empty object on absence keeps computed values side-effect-free.</en></lang>
const detail = computed(() => demo.selectedDetail.value ?? {});

// <lang><zh-CN>所有可见领域字段经同一 `localize` helper 选择语言与 fallback。</zh-CN><en>Every visible domain field selects language and fallback through the same `localize` helper.</en></lang>
const resourceName = computed(() => runtimeLocale.localize(detail.value.resource?.name));
const resourceType = computed(() => runtimeLocale.localize(detail.value.resource?.type));
const venueName = computed(() => runtimeLocale.localize(detail.value.venue?.name));
const districtName = computed(() => runtimeLocale.localize(detail.value.venue?.district));
const venueSummary = computed(() => runtimeLocale.localize(detail.value.venue?.summary));

// <lang><zh-CN>图片只经已登记 asset map 读取，未知 ID 不会变成网络或文件路径。</zh-CN><en>The image is read only through the registered asset map; an unknown ID cannot become a network or file path.</en></lang>
const venueImage = computed(() => detail.value.venue ? getVenueImage(detail.value.venue.imageId) : null);

/**
 * <lang><zh-CN>读取路由中明确传入的资源 ID。</zh-CN><en>Reads the explicitly supplied resource ID from the route.</en></lang>
 * @param {Record<string, unknown>} query <lang><zh-CN>UniApp onLoad 提供的页面 query。</zh-CN><en>Page query supplied by UniApp onLoad.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>详情状态稳定后 resolve。</zh-CN><en>Resolves after detail state stabilizes.</en></lang>
 * @lang zh-CN 非字符串 ID 交由 project adapter 映射为受限 failure，不解析额外参数。
 * @lang en A non-string ID is mapped to a bounded failure by the project adapter; no extra parameter is parsed.
 */
async function readRouteResource(query) {
  // <lang><zh-CN>只传递有限 resourceId 字段，不接受 endpoint、source、token 或动态配置。</zh-CN><en>Pass only the finite resourceId field and accept no endpoint, source, token, or dynamic configuration.</en></lang>
  await demo.loadResourceDetail(query?.resourceId);
}

/**
 * <lang><zh-CN>进入本地预约确认页。</zh-CN><en>Enters local booking confirmation.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 详情已在共享受限 state 中，路由不复制资源对象、source 或业务字段。
 * @lang en Detail already exists in shared bounded state; routing copies no resource object, source, or business field.
 */
function continueBooking() {
  // <lang><zh-CN>只执行本地页面导航，不创建预约、请求或支付流程。</zh-CN><en>Perform only local page navigation and create no reservation, request, or payment flow.</en></lang>
  uni.navigateTo({ url: '/pages/booking-confirm/index' });
}

/**
 * <lang><zh-CN>回到发现 tab。</zh-CN><en>Returns to the Discover tab.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN tab 导航不清除共享 local catalog，用户可回到原有显式分页位置。
 * @lang en Tab navigation does not clear shared local catalog, allowing return to existing explicit pagination position.
 */
function backToDiscover() {
  // <lang><zh-CN>使用 tab 级导航而非浏览器 history 或外部 URL。</zh-CN><en>Use tab-level navigation rather than browser history or an external URL.</en></lang>
  uni.switchTab({ url: '/pages/discover/index' });
}

// <lang><zh-CN>onLoad 是唯一详情读取入口，页面不在 render、computed 或 watch 中自行发起读取。</zh-CN><en>onLoad is the sole detail-read entry; the page starts no read from render, computed, or watch.</en></lang>
onLoad(readRouteResource);

// <lang><zh-CN>每次显示都投影本地化 native 标题；不从资源名称生成动态 title。</zh-CN><en>Every show projects the localized native title and does not generate a dynamic title from resource name.</en></lang>
onShow(() => applyPageTitle('title.detail'));
</script>

<style scoped>
/* <lang><zh-CN>详情页以主题表面、可读行距和 token 化圆角组织内容，不编码实时或行业状态色。</zh-CN><en>Detail uses theme surfaces, readable line height, and tokenized radius to organize content without encoding live or industry-state colors.</en></lang> */
.resource-detail-page { min-height: 100vh; padding: 16px; background: var(--u-sys-color-surface-subtle); }
.resource-detail-page__content { display: flex; gap: 16px; flex-direction: column; }
.resource-detail-page__image { width: 100%; height: 252px; }
.resource-detail-page__source { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; color: var(--u-sys-color-text-secondary); font-size: 12px; }
.resource-detail-page__title { color: var(--u-sys-color-text); font-size: 28px; font-weight: 700; line-height: 1.25; }
.resource-detail-page__venue { color: var(--u-sys-color-text-secondary); font-size: 14px; }
.resource-detail-page__summary { color: var(--u-sys-color-text); font-size: 15px; line-height: 1.7; }
.resource-detail-page__slots { display: flex; gap: 8px; flex-wrap: wrap; }
.resource-detail-page__state { display: flex; gap: 12px; flex-direction: column; margin-top: 20px; }
</style>
