<!--
@lang zh-CN 首页呈现已批准的“附近可预约资源”入口、source badge、精选资源与明确恢复状态；不包含真实定位、身份、支付、远端请求或行业会员信息。
@lang en Home presents approved nearby-bookable-resource entry, source badge, featured resources, and explicit recovery states; it includes no real location, identity, payment, remote request, or industry membership information.
-->
<template>
  <!-- <lang><zh-CN>页面根只编排受控 state 与展示型 HIA-uView 组件；滚动事件由 UniApp 页面钩子显式处理。</zh-CN><en>Page root orchestrates only controlled state and presentational HIA-uView components; scroll events are explicitly handled by UniApp page hooks.</en></lang> -->
  <view class="home-page">
    <!-- <lang><zh-CN>hero 使用原创项目内场馆图，不使用外部照片或地图服务。</zh-CN><en>Hero uses original in-project venue image and no external photograph or map service.</en></lang> -->
    <view class="home-page__hero">
      <u-image :src="heroImage" alt="滨河综合运动馆示例场地" size="large" shape="rounded" />
      <view class="home-page__hero-copy"><text class="home-page__eyebrow">城市公共资源预约</text><text class="home-page__title">把下一次活动，安排在刚好的时间</text><text class="home-page__subtitle">单运营主体、多场馆的本地优先示例</text></view>
    </view>
    <!-- <lang><zh-CN>source 状态始终可发现，避免把 local/降级事实藏进设置页。</zh-CN><en>Source state remains discoverable and does not hide local/degradation facts in a settings page.</en></lang> -->
    <view class="home-page__source"><source-badge :source="demo.catalogSource.value" /><text>数据可离线演示</text></view>
    <!-- <lang><zh-CN>搜索只把输入交给本地 catalog query；不会解析 URL、表达式或远端 filter。</zh-CN><en>Search sends input only to local catalog query and parses no URL, expression, or remote filter.</en></lang> -->
    <u-search v-model="keyword" placeholder="搜索场馆或资源" @search="handleSearch" @clear="handleClear" />
    <!-- <lang><zh-CN>加载、首次错误、空结果和 ready list 显式互斥呈现，保持可恢复状态可见。</zh-CN><en>Loading, initial failure, empty result, and ready list are explicitly mutually exclusive so recoverable state stays visible.</en></lang> -->
    <u-loading-page v-if="demo.catalogPhase.value === 'loading'" message="正在准备本地示例资源" />
    <view v-else-if="demo.catalogPhase.value === 'failure'" class="home-page__state"><u-notice visible tone="error" :message="demo.catalogFailure.value?.message?.['zh-Hans'] || '资源暂时不可用'" /><u-button label="重新加载 / Reload" block @click="handleRetry" /></view>
    <u-empty v-else-if="demo.catalogPhase.value === 'ready' && demo.catalogEntries.value.length === 0" title="没有匹配的资源" description="可清空关键词后重试" action-text="清空搜索" @action="handleClear" />
    <view v-else class="home-page__list">
      <!-- <lang><zh-CN>每个卡片只收到当前 canonical entry，并把查看意图交回页面导航。</zh-CN><en>Each card receives only current canonical entry and returns view intent to page navigation.</en></lang> -->
      <resource-card v-for="entry in demo.catalogEntries.value" :key="entry.id" :entry="entry" @view="openDetail" />
      <!-- <lang><zh-CN>页脚同时显示加载数、明确 page/total 和 append retry，不使用无限不可见滚动。</zh-CN><en>Footer displays loaded count, explicit page/total, and append retry together and uses no invisible infinite scroll.</en></lang> -->
      <view class="home-page__footer"><text>已加载 {{ demo.catalogEntries.value.length }} / {{ demo.catalogPaging.value.total }} · 第 {{ demo.catalogPaging.value.page }} 页</text><u-loadmore :status="footerStatus" @loadmore="handleLoadMore" /></view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { UButton, UEmpty, UImage, ULoadingPage, ULoadmore, UNotice, USearch } from '@hia-uview/ui';
import SourceBadge from '../../components/SourceBadge.vue';
import ResourceCard from '../../components/ResourceCard.vue';
import { getVenueImage } from '../../data/asset-map.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>首页只持有共享 demo 的受限公开 surface，不直接读取 dataset、provider host 或 request handle。</zh-CN><en>Home holds only bounded public surface of shared demo and reads neither dataset, provider host, nor request handle directly.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>输入框草稿在用户明确搜索前不改变当前结果查询。</zh-CN><en>Input draft changes no current result query before explicit user search.</en></lang>
const keyword = ref('');

// <lang><zh-CN>hero 使用已登记的原创资产；未知 ID 时 UImage 显示中性 fallback。</zh-CN><en>Hero uses registered original asset; UImage displays neutral fallback for an unknown ID.</en></lang>
const heroImage = getVenueImage('riverside-sports-hall');

// <lang><zh-CN>将 state 映射为 ULoadmore 有限状态，append failure 保留列表并显示可点重试。</zh-CN><en>Map state to finite ULoadmore status; append failure retains list and displays clickable retry.</en></lang>
const footerStatus = computed(() => {
  if (demo.catalogPhase.value === 'appending') return 'loading';
  if (demo.catalogFailure.value && demo.catalogEntries.value.length > 0) return 'error';
  return demo.catalogPaging.value.hasNext ? 'more' : 'nomore';
});

/**
 * <lang><zh-CN>确保首次进入首页时加载 page=1。</zh-CN><en>Ensures page one loads on first entry to home.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>首次加载完成后 resolve。</zh-CN><en>Resolves after initial loading completes.</en></lang>
 * @lang zh-CN 避免每次 tab show 重复请求；刷新/搜索通过明确 action 另行触发。
 * @lang en Avoids duplicate request on every tab show; refresh/search trigger separately through explicit action.
 */
async function ensureInitialCatalog() {
  // <lang><zh-CN>只在 idle 状态启动首次读取，保留已有 ready/error 状态供用户操作。</zh-CN><en>Start first read only in idle state and retain existing ready/error state for user action.</en></lang>
  if (demo.catalogPhase.value === 'idle') await demo.refreshCatalog('');
}

/**
 * <lang><zh-CN>提交当前搜索草稿。</zh-CN><en>Submits current search draft.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>替换 page=1 后 resolve。</zh-CN><en>Resolves after replacing page one.</en></lang>
 * @lang zh-CN 搜索只过滤 local JSON，不调用 remote API 或存储关键字。
 * @lang en Search filters local JSON only and calls no remote API or stores no keyword.
 */
async function handleSearch() {
  // <lang><zh-CN>将草稿作为明确输入传给 refresh action。</zh-CN><en>Pass draft as explicit input to refresh action.</en></lang>
  await demo.refreshCatalog(keyword.value);
}

/**
 * <lang><zh-CN>清空搜索并恢复全部 local catalog。</zh-CN><en>Clears search and restores complete local catalog.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>page=1 刷新完成后 resolve。</zh-CN><en>Resolves after page-one refresh completes.</en></lang>
 * @lang zh-CN 清空只影响当前内存草稿和列表，不写入偏好或 storage。
 * @lang en Clearing affects only current memory draft/list and writes no preference or storage.
 */
async function handleClear() {
  // <lang><zh-CN>先同步清除输入，再显式替换 catalog 首页。</zh-CN><en>Clear input synchronously first and then explicitly replace catalog first page.</en></lang>
  keyword.value = '';
  await demo.refreshCatalog('');
}

/**
 * <lang><zh-CN>从 footer 或触底追加下一页。</zh-CN><en>Appends next page from footer or reach-bottom.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>追加完成或无需追加后 resolve。</zh-CN><en>Resolves after append completes or is unnecessary.</en></lang>
 * @lang zh-CN action 委托 state 的 hasNext/loading gate，不自行猜测分页。
 * @lang en Action delegates hasNext/loading gate to state and guesses no pagination itself.
 */
async function handleLoadMore() {
  // <lang><zh-CN>使用唯一 append action，确保失败时保留已显示 entries。</zh-CN><en>Use the sole append action, preserving displayed entries on failure.</en></lang>
  await demo.loadNextCatalogPage();
}

/**
 * <lang><zh-CN>重试当前 local catalog 查询。</zh-CN><en>Retries current local catalog query.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>刷新完成后 resolve。</zh-CN><en>Resolves after refresh completes.</en></lang>
 * @lang zh-CN 首次失败回到 page=1；append failure 的 footer 会触发 append action。
 * @lang en Initial failure returns to page one; append failure footer triggers append action.
 */
async function handleRetry() {
  // <lang><zh-CN>用当前草稿重做明确 page=1 查询。</zh-CN><en>Redo explicit page-one query using current draft.</en></lang>
  await demo.refreshCatalog(keyword.value);
}

/**
 * <lang><zh-CN>导航到一个资源详情页。</zh-CN><en>Navigates to one resource-detail page.</en></lang>
 * @param {string} resourceId <lang><zh-CN>card emit 的有限资源 ID。</zh-CN><en>Finite resource ID emitted by card.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 资源 ID 来自当前 canonical entry；它不是 URL、remote endpoint 或任意外部输入。
 * @lang en Resource ID comes from current canonical entry and is not a URL, remote endpoint, or arbitrary external input.
 */
function openDetail(resourceId) {
  // <lang><zh-CN>使用 UniApp 本地页面导航，不添加 query 以外的用户或 source 数据。</zh-CN><en>Use UniApp local page navigation and add no user or source data beyond query.</en></lang>
  uni.navigateTo({ url: `/pages/resource-detail/index?resourceId=${encodeURIComponent(resourceId)}` });
}

// <lang><zh-CN>首次挂载和 tab show 都调用同一幂等 ensure helper，保证返回首页后的初始状态稳定。</zh-CN><en>Both first mount and tab show call the same idempotent ensure helper, keeping initial state stable after returning home.</en></lang>
onMounted(ensureInitialCatalog);
onShow(ensureInitialCatalog);

// <lang><zh-CN>下拉刷新显式替换 page=1，结束平台 loading 仅是 UI 清理，不代表远端网络状态。</zh-CN><en>Pull refresh explicitly replaces page one; ending platform loading is UI cleanup only and represents no remote network state.</en></lang>
onPullDownRefresh(async () => { await handleSearch(); uni.stopPullDownRefresh(); });

// <lang><zh-CN>触底只委托 append action；无 next page 时 state 会安全无操作。</zh-CN><en>Reach bottom delegates only append action; state safely no-ops when no next page exists.</en></lang>
onReachBottom(handleLoadMore);
</script>

<style scoped>
/* <lang><zh-CN>首页布局复用 theme token，保持 H5 与小程序内的可读边距、表面和主色层级。</zh-CN><en>Home layout reuses theme tokens, retaining readable spacing, surfaces, and primary-color hierarchy on H5 and mini-program.</en></lang> */
.home-page { min-height: 100vh; padding: var(--bp-page-block) var(--bp-page-inline) 28px; background: var(--u-sys-color-surface-subtle); }
.home-page__hero { position: relative; overflow: hidden; margin-bottom: 14px; border-radius: var(--bp-card-radius); box-shadow: var(--bp-card-shadow); }
.home-page__hero :deep(.u-image) { width: 100%; height: 236px; }
.home-page__hero-copy { position: absolute; inset: auto 0 0; display: flex; gap: 6px; flex-direction: column; padding: 42px 18px 18px; color: #fff; background: linear-gradient(180deg, transparent, rgb(0 27 46 / 82%)); }
.home-page__eyebrow { font-size: 12px; letter-spacing: .08em; }
.home-page__title { font-size: 24px; font-weight: 700; line-height: 1.3; }
.home-page__subtitle { font-size: 13px; opacity: .92; }
.home-page__source { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 14px 0; color: var(--u-sys-color-text-secondary); font-size: 12px; }
.home-page__state { display: flex; gap: 12px; flex-direction: column; margin-top: 20px; }
.home-page__list { display: flex; gap: 14px; flex-direction: column; margin-top: 16px; }
.home-page__footer { display: flex; gap: 8px; flex-direction: column; align-items: center; padding: 8px 0 20px; color: var(--u-sys-color-text-secondary); font-size: 12px; }
</style>
