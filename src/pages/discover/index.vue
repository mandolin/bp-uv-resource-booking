<!--
@lang zh-CN 发现页提供全量资源的本地检索、触底追加与显式分页状态；它不使用定位、地图、远端搜索、动态筛选表达式或持久化业务偏好。
@lang en Discover provides local search, reach-bottom append, and explicit pagination state for all resources; it uses no location, map, remote search, dynamic filter expression, or persisted business preference.
-->
<template>
  <!-- <lang><zh-CN>provider 让本页的 UI component locale 与 BP 文案/领域投影共享同一 runtime 值。</zh-CN><en>The provider makes this page's UI component locale share one runtime value with BP copy and domain projection.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <!-- <lang><zh-CN>页面壳用 HIA-uView navbar 呈现当前 locale，常驻 custom tabBar 通过页面 onShow 同步同一语言与选中态。</zh-CN><en>The page shell renders the current locale through HIA-uView navbar, while the persistent custom tab bar synchronizes the same language and selection on page show.</en></lang> -->
    <runtime-page-shell :title="runtimeLocale.t('title.discover')">
      <view class="discover-page">
      <view class="discover-page__heading">
        <text class="discover-page__eyebrow">{{ runtimeLocale.t('discover.eyebrow') }}</text>
        <text class="discover-page__title">{{ runtimeLocale.t('discover.title') }}</text>
        <source-badge :source="demo.catalogSource.value" />
      </view>
      <u-search v-model="keyword" :placeholder="runtimeLocale.t('discover.searchPlaceholder')" @search="handleSearch" @clear="handleClear" />
      <!-- <lang><zh-CN>三项筛选均为 state 提供的有限本地值；selector 提交后替换 page=1，追加页不会混入草稿。</zh-CN><en>All three filters are finite local values provided by state; a selector submission replaces page one, and appended pages never mix in a draft.</en></lang> -->
      <u-card class="discover-page__filters" :title="runtimeLocale.t('discover.filtersTitle')" :sub-title="runtimeLocale.t('discover.filtersHint')">
        <u-form>
          <u-form-item :label="runtimeLocale.t('discover.venueLabel')">
            <u-select v-model="selectedVenueId" :options="venueOptions" :placeholder="runtimeLocale.t('discover.venuePlaceholder')" @change="handleFilterChange" />
          </u-form-item>
          <u-form-item :label="runtimeLocale.t('discover.typeLabel')">
            <u-select v-model="selectedResourceTypeId" :options="resourceTypeOptions" :placeholder="runtimeLocale.t('discover.typePlaceholder')" @change="handleFilterChange" />
          </u-form-item>
          <u-form-item :label="runtimeLocale.t('discover.dateLabel')">
            <u-select v-model="selectedDate" :options="dateOptions" :placeholder="runtimeLocale.t('discover.datePlaceholder')" @change="handleFilterChange" />
          </u-form-item>
        </u-form>
        <u-button :label="runtimeLocale.t('discover.clearFilters')" variant="secondary" size="sm" @click="handleClearFilters" />
      </u-card>

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
    </runtime-page-shell>
  </u-config-provider>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import ResourceCard from '../../components/ResourceCard.vue';
import RuntimePageShell from '../../components/RuntimePageShell.vue';
import SourceBadge from '../../components/SourceBadge.vue';
import { syncPrimaryTabChrome } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>发现页只取得共享 demo 的受限公开 surface，不读取 dataset、adapter 或请求 handle。</zh-CN><en>Discover obtains only the shared demo's bounded public surface and reads no dataset, adapter, or request handle.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>所有本页静态文案和领域显示都使用同一 shared runtime locale。</zh-CN><en>Every static copy and domain display on this page uses the same shared runtime locale.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>搜索草稿在用户明确提交前不改变当前 catalog。</zh-CN><en>The search draft changes no current catalog before an explicit user submission.</en></lang>
const keyword = ref('');

// <lang><zh-CN>三个 selector 草稿从当前已提交查询初始化；用户变更后才显式替换目录首页。</zh-CN><en>The three selector drafts initialize from the current committed query; only a user change explicitly replaces the catalog first page.</en></lang>
const selectedVenueId = ref(demo.catalogFilters.value.venueId);
const selectedResourceTypeId = ref(demo.catalogFilters.value.resourceTypeId);
const selectedDate = ref(demo.catalogFilters.value.date);

/**
 * <lang><zh-CN>将 state 的有限双语 option 集合投影为当前 runtime locale 的 USelect 输入。</zh-CN><en>Projects state’s finite bilingual option collection into current-runtime-locale input for USelect.</en></lang>
 * @param {ReadonlyArray<object>} options <lang><zh-CN>state 给出的有限 option 集合。</zh-CN><en>Finite option collection supplied by state.</en></lang>
 * @returns {Array<object>} <lang><zh-CN>仅含 value/label 的新 UI option 集合。</zh-CN><en>A new UI option collection containing only value/label.</en></lang>
 * @lang zh-CN 函数不暴露或改写 dataset 标签；空值选项由各 selector 的 placeholder 负责表达。
 * @lang en The function exposes or mutates no dataset label; each selector’s placeholder expresses the empty choice.
 */
function createLocalizedOptions(options) {
  // <lang><zh-CN>逐项复制固定 value 并按当前共享 locale 投影标签。</zh-CN><en>Copy the fixed value item by item and project its label through the current shared locale.</en></lang>
  const localizedOptions = [];

  // <lang><zh-CN>输入只来自冻结的 state option 集合，不枚举页面数据或动态属性。</zh-CN><en>Input comes only from the frozen state option collection and enumerates no page data or dynamic property.</en></lang>
  for (const option of options) {
    // <lang><zh-CN>USelect 只需要这两个受控原始字段。</zh-CN><en>USelect needs only these two controlled primitive fields.</en></lang>
    localizedOptions.push({ value: option.value, label: runtimeLocale.localize(option.label) });
  }

  // <lang><zh-CN>返回新数组，使 locale 更新后的 computed 值不会共享可写 UI option 对象。</zh-CN><en>Return a new array so computed values after a locale update share no writable UI option objects.</en></lang>
  return localizedOptions;
}

/**
 * <lang><zh-CN>将明确 ISO 示例日期投影为当前语言的 USelect 选项。</zh-CN><en>Projects explicit ISO demo dates as current-language options for USelect.</en></lang>
 * @param {ReadonlyArray<string>} dates <lang><zh-CN>state 给出的稳定日期字符串。</zh-CN><en>Stable date strings supplied by state.</en></lang>
 * @returns {Array<object>} <lang><zh-CN>仅含 value/label 的新日期 option 集合。</zh-CN><en>A new date-option collection containing only value/label.</en></lang>
 * @lang zh-CN 日期标签只格式化已声明的 ISO 字符串，不读取设备日历或生成未来日期。
 * @lang en Date labels format only declared ISO strings and read no device calendar or generate future dates.
 */
function createDateOptions(dates) {
  // <lang><zh-CN>为每个受控日期创建独立 UI record。</zh-CN><en>Create an independent UI record for each controlled date.</en></lang>
  const localizedDates = [];

  // <lang><zh-CN>保持 state 给出的确定性顺序，避免因宿主排序导致页面快照变化。</zh-CN><en>Keep the deterministic order supplied by state, avoiding host sorting that could change page snapshots.</en></lang>
  for (const date of dates) {
    // <lang><zh-CN>值保留 ISO 供 domain 比较，标签仅用于显示。</zh-CN><en>Retain ISO as the domain-comparison value and use the label only for display.</en></lang>
    localizedDates.push({ value: date, label: runtimeLocale.formatDate(date) });
  }

  // <lang><zh-CN>返回 detached collection，不向模板泄漏 state 的数组引用。</zh-CN><en>Return a detached collection and leak no state-array reference to the template.</en></lang>
  return localizedDates;
}

// <lang><zh-CN>每次 locale 变化时重建 selector 标签，但不改变已提交的稳定筛选值。</zh-CN><en>Rebuild selector labels whenever locale changes without changing committed stable filter values.</en></lang>
const venueOptions = computed(() => createLocalizedOptions(demo.catalogFilterOptions.venues));
const resourceTypeOptions = computed(() => createLocalizedOptions(demo.catalogFilterOptions.resourceTypes));
const dateOptions = computed(() => createDateOptions(demo.catalogFilterOptions.dates));

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
 * <lang><zh-CN>读取发现页当前可见的 selector 草稿。</zh-CN><en>Reads the selector drafts currently visible on Discover.</en></lang>
 * @returns {object} <lang><zh-CN>受限场馆、类型和日期 filter record。</zh-CN><en>A bounded venue, type, and date filter record.</en></lang>
 * @lang zh-CN 仅复制三个 selector 的原始值；页面不把搜索、分页或任何 UI object 混入 provider 输入。
 * @lang en Copies only the three selector primitives; the page mixes no search, paging, or UI object into provider input.
 */
function readFilterDraft() {
  // <lang><zh-CN>返回新对象，防止 action 之后的 UI 更新改写已经提交的请求值。</zh-CN><en>Return a new object so a UI update after the action cannot rewrite an already submitted request value.</en></lang>
  return {
    venueId: selectedVenueId.value,
    resourceTypeId: selectedResourceTypeId.value,
    date: selectedDate.value
  };
}

/**
 * <lang><zh-CN>提交发现页的本地搜索。</zh-CN><en>Submits Discover's local search.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>page=1 替换完成后 resolve。</zh-CN><en>Resolves after page-one replacement completes.</en></lang>
 * @lang zh-CN 关键字只传给 local JSON contains 查询，不成为 URL、表达式或偏好。
 * @lang en The keyword goes only to local-JSON contains matching and never becomes a URL, expression, or preference.
 */
async function handleSearch() {
  // <lang><zh-CN>以页面草稿执行明确首页刷新。</zh-CN><en>Run an explicit first-page refresh with the page draft.</en></lang>
  await demo.refreshCatalog(keyword.value, readFilterDraft());
}

/**
 * <lang><zh-CN>清空发现页搜索。</zh-CN><en>Clears Discover search.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>恢复全量首页后 resolve。</zh-CN><en>Resolves after the full first page is restored.</en></lang>
 * @lang zh-CN 不写 storage 或跨页面筛选偏好。
 * @lang en Writes no storage or cross-page filter preference.
 */
async function handleClear() {
  // <lang><zh-CN>先清空可见关键字草稿，再以不变筛选请求 local 首页。</zh-CN><en>Clear the visible keyword draft first, then request the local first page with unchanged filters.</en></lang>
  keyword.value = '';
  await demo.refreshCatalog('', readFilterDraft());
}

/**
 * <lang><zh-CN>提交一个 selector 变更后的完整本地筛选。</zh-CN><en>Submits the complete local filter after one selector changes.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>已替换 page=1 后 resolve。</zh-CN><en>Resolves after page one has been replaced.</en></lang>
 * @lang zh-CN 事件参数不作为查询输入；受控 v-model 已先更新相应草稿，避免组件事件形状成为领域契约。
 * @lang en The event parameter is not query input; controlled v-model has updated the matching draft first, avoiding a component-event shape becoming a domain contract.
 */
async function handleFilterChange() {
  // <lang><zh-CN>将关键字与三个已提交草稿一并刷新，保持 total/page/hasNext 对同一查询成立。</zh-CN><en>Refresh keyword and all three committed drafts together, keeping total/page/hasNext true for one query.</en></lang>
  await demo.refreshCatalog(keyword.value, readFilterDraft());
}

/**
 * <lang><zh-CN>清空三个有限 selector 并恢复当前关键字下的全量本地目录。</zh-CN><en>Clears the three finite selectors and restores the complete local catalog under the current keyword.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>已替换 page=1 后 resolve。</zh-CN><en>Resolves after page one has been replaced.</en></lang>
 * @lang zh-CN 本操作不写入设备 preference 或 storage，也不会清空独立的关键字草稿。
 * @lang en This action writes no device preference or storage and does not clear the independent keyword draft.
 */
async function handleClearFilters() {
  // <lang><zh-CN>同步重置所有 selector，使按钮后的可见表单与提交 query 一致。</zh-CN><en>Synchronously reset every selector so the visible form after the button matches the submitted query.</en></lang>
  selectedVenueId.value = '';
  selectedResourceTypeId.value = '';
  selectedDate.value = '';

  // <lang><zh-CN>用当前关键字和已清空 filter 显式替换首页。</zh-CN><en>Explicitly replace the first page with current keyword and cleared filters.</en></lang>
  await demo.refreshCatalog(keyword.value, readFilterDraft());
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

// <lang><zh-CN>首次挂载继续使用同一幂等 helper；平台 tab 的 show 生命周期另行同步常驻 chrome。</zh-CN><en>First mount continues to use the same idempotent helper; the platform tab's show lifecycle separately synchronizes persistent chrome.</en></lang>
onMounted(ensureInitialCatalog);

/**
 * <lang><zh-CN>同步发现页的常驻 tab chrome，并确保目录已有首页。</zh-CN><en>Synchronizes Discover's persistent tab chrome and ensures a catalog first page exists.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>幂等目录检查完成后 resolve。</zh-CN><en>Resolves after the idempotent catalog check completes.</en></lang>
 * @lang zh-CN 该生命周期只同步固定 discover value/locale 并复用已有 local catalog，不预取新 source。
 * @lang en This lifecycle synchronizes only the fixed Discover value/locale and reuses the existing local catalog without prefetching a new source.
 */
async function handlePageShow() {
  // <lang><zh-CN>当前 tab 实例接收单一选中态和当前 runtime locale。</zh-CN><en>The current tab instance receives one selection state and the current runtime locale.</en></lang>
  syncPrimaryTabChrome('discover', runtimeLocale.locale.value, (messageKey) => runtimeLocale.t(messageKey));
  // <lang><zh-CN>保留原有 idle-only 数据 gate。</zh-CN><en>Retain the original idle-only data gate.</en></lang>
  await ensureInitialCatalog();
}

// <lang><zh-CN>每次平台 tab 显示发现页时同步常驻底栏。</zh-CN><en>Synchronize the persistent bottom bar whenever the platform tab shows Discover.</en></lang>
onShow(handlePageShow);

// <lang><zh-CN>下拉刷新只替换 page=1 并结束平台 UI loading，不代表网络请求完成。</zh-CN><en>Pull refresh only replaces page one and ends platform UI loading; it represents no network request completion.</en></lang>
onPullDownRefresh(async () => { await handleSearch(); uni.stopPullDownRefresh(); });

// <lang><zh-CN>触底委托 append action，state 在无下一页或忙碌时保持无操作。</zh-CN><en>Reach bottom delegates to append action; state remains a no-op when no next page exists or it is busy.</en></lang>
onReachBottom(handleLoadMore);
</script>

<style scoped>
/* <lang><zh-CN>发现页使用设计稿的清晰标题、搜索与纵向卡片层级，分页状态始终位于列表末尾。</zh-CN><en>Discover uses the design's clear heading, search, and vertical-card hierarchy, with pagination state always at list end.</en></lang> */
.discover-page { padding: 20px 16px 28px; background: var(--u-sys-color-surface-subtle); }
.discover-page__heading { display: flex; gap: 7px; flex-direction: column; margin-bottom: 16px; }
.discover-page__eyebrow { color: var(--u-sys-color-action-primary); font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.discover-page__title { color: var(--u-sys-color-text); font-size: 27px; font-weight: 700; }
.discover-page__filters { margin-top: 14px; }
.discover-page__state { display: flex; gap: 12px; flex-direction: column; margin-top: 20px; }
.discover-page__list { display: flex; gap: 14px; flex-direction: column; margin-top: 16px; }
.discover-page__footer { display: flex; gap: 8px; flex-direction: column; align-items: center; padding: 8px 0 20px; color: var(--u-sys-color-text-secondary); font-size: 12px; }
</style>
