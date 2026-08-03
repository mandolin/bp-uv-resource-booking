<!--
@lang zh-CN 发现页提供全量资源的本地检索、触底追加与显式分页状态；它不使用定位、地图、远端搜索、动态筛选表达式或持久化偏好。
@lang en Discover provides local search, reach-bottom append, and explicit pagination state for all resources; it uses no location, map, remote search, dynamic filter expression, or persisted preference.
-->
<template>
  <!-- <lang><zh-CN>页面只组合共享 local-first catalog state 和展示型组件，所有数据写回仍在显式 state action 中完成。</zh-CN><en>The page combines only shared local-first catalog state and presentational components; every data write-back remains in explicit state actions.</en></lang> -->
  <view class="discover-page">
    <view class="discover-page__heading"><text class="discover-page__eyebrow">探索 / Discover</text><text class="discover-page__title">按场馆或资源查找</text><source-badge :source="demo.catalogSource.value" /></view>
    <u-search v-model="keyword" placeholder="搜索场馆或资源 / Search venues or resources" @search="handleSearch" @clear="handleClear" />
    <u-loading-page v-if="demo.catalogPhase.value === 'loading'" message="正在准备本地示例资源 / Preparing local demo resources" />
    <view v-else-if="demo.catalogPhase.value === 'failure'" class="discover-page__state"><u-notice visible tone="error" :message="demo.catalogFailure.value?.message?.['zh-Hans'] || '资源暂时不可用 / Resources are unavailable'" /><u-button label="重新加载 / Reload" block @click="handleSearch" /></view>
    <u-empty v-else-if="demo.catalogPhase.value === 'ready' && demo.catalogEntries.value.length === 0" title="没有匹配的资源 / No matching resources" description="可清空关键词后重试 / Clear the keyword and try again" action-text="清空搜索 / Clear search" @action="handleClear" />
    <view v-else class="discover-page__list">
      <!-- <lang><zh-CN>卡片得到已映射的 entry，并仅将查看意图返回给页面。</zh-CN><en>Cards receive mapped entries and return only a view intent to the page.</en></lang> -->
      <resource-card v-for="entry in demo.catalogEntries.value" :key="entry.id" :entry="entry" @view="openDetail" />
      <view class="discover-page__footer"><text>已加载 {{ demo.catalogEntries.value.length }} / {{ demo.catalogPaging.value.total }} · 第 {{ demo.catalogPaging.value.page }} 页</text><u-loadmore :status="footerStatus" @loadmore="handleLoadMore" /></view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import ResourceCard from '../../components/ResourceCard.vue';
import SourceBadge from '../../components/SourceBadge.vue';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>发现页只取得共享 demo 的受限公开 surface，不读取 dataset、adapter 或请求 handle。</zh-CN><en>Discover obtains only the shared demo's bounded public surface and reads no dataset, adapter, or request handle.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>搜索草稿在用户明确提交前不改变当前 catalog。</zh-CN><en>The search draft changes no current catalog before a user explicitly submits it.</en></lang>
const keyword = ref('');

// <lang><zh-CN>将 state 映射为有限 footer 状态，以支持“滚动 + 明确页次 + 可发现重试”。</zh-CN><en>Map state to a finite footer status, supporting “scroll + explicit page state + discoverable retry”.</en></lang>
const footerStatus = computed(() => {
  if (demo.catalogPhase.value === 'appending') return 'loading';
  if (demo.catalogFailure.value && demo.catalogEntries.value.length > 0) return 'error';
  return demo.catalogPaging.value.hasNext ? 'more' : 'nomore';
});

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
 * @returns {Promise<void>} <lang><zh-CN>恢复全量首页后 resolve。</zh-CN><en>Resolves after full first page is restored.</en></lang>
 * @lang zh-CN 不写 storage 或跨页面筛选偏好。
 * @lang en Writes no storage or cross-page filter preference.
 */
async function handleClear() {
  // <lang><zh-CN>先清空可见草稿，再请求全量 local 首页。</zh-CN><en>Clear the visible draft first, then request the full local first page.</en></lang>
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
 * @param {string} resourceId <lang><zh-CN>当前 card emit 的有限资源 ID。</zh-CN><en>Finite resource ID emitted by current card.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN ID 来自 canonical entry，且只进入本地页面 query。
 * @lang en The ID comes from a canonical entry and enters only a local page query.
 */
function openDetail(resourceId) {
  // <lang><zh-CN>使用 UniApp 页内导航，避免浏览器地址、远端 endpoint 或任意对象传递。</zh-CN><en>Use UniApp in-app navigation, avoiding browser addresses, remote endpoints, or arbitrary-object passing.</en></lang>
  uni.navigateTo({ url: `/pages/resource-detail/index?resourceId=${encodeURIComponent(resourceId)}` });
}

// <lang><zh-CN>挂载和 tab show 复用幂等初始化，不自动替换已有查询。</zh-CN><en>Mount and tab show reuse idempotent initialization and do not automatically replace an existing query.</en></lang>
onMounted(ensureInitialCatalog);
onShow(ensureInitialCatalog);

// <lang><zh-CN>下拉刷新替换首屏；停止 indicator 只是平台 UI 清理。</zh-CN><en>Pull refresh replaces the first page; stopping the indicator is platform UI cleanup only.</en></lang>
onPullDownRefresh(async () => { await handleSearch(); uni.stopPullDownRefresh(); });

// <lang><zh-CN>触底尝试追加，state 在无后续页时安全 no-op。</zh-CN><en>Reach-bottom attempts append; state safely no-ops without a subsequent page.</en></lang>
onReachBottom(handleLoadMore);
</script>

<style scoped>
/* <lang><zh-CN>发现页使用页面自有间距和主题语义表面，不重定义品牌或状态色。</zh-CN><en>Discover uses page-owned spacing and theme semantic surfaces without redefining brand or state colors.</en></lang> */
.discover-page { min-height: 100vh; padding: 20px var(--bp-page-inline) 28px; background: var(--u-sys-color-surface-subtle); }
.discover-page__heading { display: flex; gap: 8px; flex-direction: column; margin-bottom: 16px; }
.discover-page__eyebrow { color: var(--u-sys-color-action-primary); font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.discover-page__title { color: var(--u-sys-color-text); font-size: 24px; font-weight: 700; }
.discover-page__state { display: flex; gap: 12px; flex-direction: column; margin-top: 20px; }
.discover-page__list { display: flex; gap: 14px; flex-direction: column; margin-top: 16px; }
.discover-page__footer { display: flex; gap: 8px; flex-direction: column; align-items: center; padding: 8px 0 20px; color: var(--u-sys-color-text-secondary); font-size: 12px; }
</style>
