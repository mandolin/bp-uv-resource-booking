<!--
@lang zh-CN 发现页提供全量资源的本地检索、触底追加与显式分页状态；它不使用定位、地图、远端搜索、动态筛选表达式或持久化业务偏好。
@lang en Discover provides local search, reach-bottom append, and explicit pagination state for all resources; it uses no location, map, remote search, dynamic filter expression, or persisted business preference.
-->
<template>
  <!-- <lang><zh-CN>provider 让本页的 UI component locale 与 BP 文案/领域投影共享同一 runtime 值。</zh-CN><en>The provider makes this page's UI component locale share one runtime value with BP copy and domain projection.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <view class="discover-page">
      <view class="discover-page__heading">
        <text class="discover-page__eyebrow">{{ runtimeLocale.t('discover.eyebrow') }}</text>
        <text class="discover-page__title">{{ runtimeLocale.t('discover.title') }}</text>
        <source-badge :source="demo.catalogSource.value" />
      </view>
      <u-search v-model="keyword" :placeholder="runtimeLocale.t('discover.searchPlaceholder')" @search="handleSearch" @clear="handleClear" />

      <!-- <lang><zh-CN>加载、错误、空目录与可追加列表互斥，避免状态被纯 CSS 或隐藏分支掩盖。</zh-CN><en>Loading, error, empty catalog, and appendable list are mutually exclusive, preventing state from being hidden by CSS or a concealed branch.</en></lang> -->
      <u-loading-page v-if="demo.catalogPhase.value === 'loading'" :message="runtimeLocale.t('discover.loading')" />
      <view v-else-if="demo.catalogPhase.value === 'failure'" class="discover-page__state">
        <u-notice visible tone="error" :message="runtimeLocale.localize(demo.catalogFailure.value?.message) || runtimeLocale.t('common.notAvailable')" />
        <u-button :label="runtimeLocale.t('common.reload')" block @click="handleSearch" />
      </view>
      <u-empty
        v-else-if="demo.catalogPhase.value === 'ready' && demo.catalogEntries.value.length === 0"
        :title="runtimeLocale.t('discover.emptyTitle')"
        :description="runtimeLocale.t('discover.emptyDescription')"
        :action-text="runtimeLocale.t('common.clearSearch')"
        @action="handleClear"
      />
      <u-list v-else class="discover-page__list">
        <!-- <lang><zh-CN>卡片只得到已映射 entry，并仅将查看意图返回给页面。</zh-CN><en>Cards receive only mapped entries and return only a view intent to the page.</en></lang> -->
        <resource-card v-for="entry in demo.catalogEntries.value" :key="entry.id" :entry="entry" @view="openDetail" />
        <view class="discover-page__footer">
          <text>{{ pageFacts }}</text>
          <u-loadmore :status="footerStatus" :more-text="runtimeLocale.t('load.more')" :loading-text="runtimeLocale.t('load.loading')" :nomore-text="runtimeLocale.t('load.nomore')" :error-text="runtimeLocale.t('load.error')" @loadmore="handleLoadMore" />
        </view>
      </u-list>
    </view>
  </u-config-provider>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import ResourceCard from '../../components/ResourceCard.vue';
import SourceBadge from '../../components/SourceBadge.vue';
import { scheduleRuntimeChrome } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>发现页只取得共享 demo 的受限公开 surface，不读取 dataset、adapter 或请求 handle。</zh-CN><en>Discover obtains only the shared demo's bounded public surface and reads no dataset, adapter, or request handle.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>所有本页静态文案和领域显示都使用同一 shared runtime locale。</zh-CN><en>Every static copy and domain display on this page uses the same shared runtime locale.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>搜索草稿在用户明确提交前不改变当前 catalog。</zh-CN><en>The search draft changes no current catalog before an explicit user submission.</en></lang>
const keyword = ref('');

// <lang><zh-CN>将 state 映射为有限 footer 状态，以支持“滚动 + 明确页次 + 可发现重试”。</zh-CN><en>Map state to finite footer status, supporting “scroll + explicit page state + discoverable retry”.</en></lang>
const footerStatus = computed(() => {
  if (demo.catalogPhase.value === 'appending') return 'loading';
  if (demo.catalogFailure.value && demo.catalogEntries.value.length > 0) return 'error';
  return demo.catalogPaging.value.hasNext ? 'more' : 'nomore';
});

// <lang><zh-CN>页脚只显示安全 pagination result 中的事实。</zh-CN><en>Footer displays facts from safe pagination results only.</en></lang>
const pageFacts = computed(() => runtimeLocale.t('common.pageFacts', {
  loaded: demo.catalogEntries.value.length,
  total: demo.catalogPaging.value.total,
  page: demo.catalogPaging.value.page
}));

/**
 * <lang><zh-CN>确保首次进入发现页时有一个 catalog 首页。</zh-CN><en>Ensures a catalog first page exists when Discover is first entered.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>首次读取完成后 resolve。</zh-CN><en>Resolves after the first read completes.</en></lang>
 * @lang zh-CN 仅在 idle 时读取，避免 tab 返回造成无意义刷新。
 * @lang en Reads only while idle, avoiding meaningless refresh on tab return.
 */
async function ensureInitialCatalog() {
  // <lang><zh-CN>共享 state 已加载时保持当前用户可见的结果。</zh-CN><en>Retain currently user-visible results when shared state is already loaded.</en></lang>
  if (demo.catalogPhase.value === 'idle') await demo.refreshCatalog('');
}

/**
 * <lang><zh-CN>提交发现页的本地搜索。</zh-CN><en>Submits Discover's local search.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>page=1 替换完成后 resolve。</zh-CN><en>Resolves after page-one replacement completes.</en></lang>
 * @lang zh-CN 关键字只传给 local JSON contains 查询，不成为 URL、表达式或偏好。
 * @lang en The keyword goes only to local-JSON contains matching and never becomes a URL, expression, or preference.
 */
async function handleSearch() {
  // <lang><zh-CN>以页面草稿执行明确首页刷新。</zh-CN><en>Run an explicit first-page refresh with the page draft.</en></lang>
  await demo.refreshCatalog(keyword.value);
}

/**
 * <lang><zh-CN>清空发现页搜索。</zh-CN><en>Clears Discover search.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>恢复全量首页后 resolve。</zh-CN><en>Resolves after the full first page is restored.</en></lang>
 * @lang zh-CN 不写 storage 或跨页面筛选偏好。
 * @lang en Writes no storage or cross-page filter preference.
 */
async function handleClear() {
  // <lang><zh-CN>先清空可见草稿，再请求全量 local 首页。</zh-CN><en>Clear visible draft first, then request the full local first page.</en></lang>
  keyword.value = '';
  await demo.refreshCatalog('');
}

/**
 * <lang><zh-CN>从 footer 或触底读取下一页。</zh-CN><en>Reads the next page from footer or reach-bottom.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>追加完成或不需要追加后 resolve。</zh-CN><en>Resolves after append completes or is unnecessary.</en></lang>
 * @lang zh-CN hasNext/loading gate 由 state 统一拥有。
 * @lang en The hasNext/loading gate is solely owned by state.
 */
async function handleLoadMore() {
  // <lang><zh-CN>委托唯一 append action，使失败保留当前条目。</zh-CN><en>Delegate to the sole append action so failures retain current entries.</en></lang>
  await demo.loadNextCatalogPage();
}

/**
 * <lang><zh-CN>打开一个局部资源详情。</zh-CN><en>Opens one local resource detail.</en></lang>
 * @param {string} resourceId <lang><zh-CN>当前 card emit 的有限资源 ID。</zh-CN><en>Finite resource ID emitted by the current card.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN ID 来自 canonical entry，且只进入本地页面 query。
 * @lang en The ID comes from a canonical entry and enters only a local page query.
 */
function openDetail(resourceId) {
  // <lang><zh-CN>使用 UniApp 页内导航，不向 query 传递 provider、source 或用户数据。</zh-CN><en>Use UniApp page navigation and pass no provider, source, or user data into the query.</en></lang>
  uni.navigateTo({ url: `/pages/resource-detail/index?resourceId=${encodeURIComponent(resourceId)}` });
}

// <lang><zh-CN>首次挂载与 tab show 都使用同一幂等 helper，前者加载目录、后者在 native chrome 初始化后投影 tab 与标题。</zh-CN><en>First mount and tab show use one idempotent helper; the former loads catalog while the latter projects tabs and title after native chrome initializes.</en></lang>
onMounted(ensureInitialCatalog);
onShow(() => { scheduleRuntimeChrome('title.discover'); return ensureInitialCatalog(); });

// <lang><zh-CN>下拉刷新只替换 page=1 并结束平台 UI loading，不代表网络请求完成。</zh-CN><en>Pull refresh only replaces page one and ends platform UI loading; it represents no network request completion.</en></lang>
onPullDownRefresh(async () => { await handleSearch(); uni.stopPullDownRefresh(); });

// <lang><zh-CN>触底委托 append action，state 在无下一页或忙碌时保持无操作。</zh-CN><en>Reach bottom delegates to append action; state remains a no-op when no next page exists or it is busy.</en></lang>
onReachBottom(handleLoadMore);
</script>

<style scoped>
/* <lang><zh-CN>发现页使用设计稿的清晰标题、搜索与纵向卡片层级，分页状态始终位于列表末尾。</zh-CN><en>Discover uses the design's clear heading, search, and vertical-card hierarchy, with pagination state always at list end.</en></lang> */
.discover-page { min-height: 100vh; padding: 20px 16px 28px; background: var(--u-sys-color-surface-subtle); }
.discover-page__heading { display: flex; gap: 7px; flex-direction: column; margin-bottom: 16px; }
.discover-page__eyebrow { color: var(--u-sys-color-action-primary); font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.discover-page__title { color: var(--u-sys-color-text); font-size: 27px; font-weight: 700; }
.discover-page__state { display: flex; gap: 12px; flex-direction: column; margin-top: 20px; }
.discover-page__list { display: flex; gap: 14px; flex-direction: column; margin-top: 16px; }
.discover-page__footer { display: flex; gap: 8px; flex-direction: column; align-items: center; padding: 8px 0 20px; color: var(--u-sys-color-text-secondary); font-size: 12px; }
</style>
