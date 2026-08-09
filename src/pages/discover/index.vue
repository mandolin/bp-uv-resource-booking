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
      <!-- <lang><zh-CN>发现页只保留 navbar 的单一标题层；搜索紧随其后，不重复营销标题或 eyebrow。</zh-CN><en>Discover retains only the navbar's single title layer; search follows immediately with no duplicate marketing heading or eyebrow.</en></lang> -->
      <u-search v-model="keyword" :placeholder="runtimeLocale.t('discover.searchPlaceholder')" @search="handleSearch" @clear="handleClear" />
      <!-- <lang><zh-CN>三项紧凑触发器复用 HIA-uView button 与 action-sheet：按钮只打开有限本地选项，选择面板提交后替换 page=1，追加页不会混入草稿。</zh-CN><en>Three compact triggers reuse HIA-uView buttons and action sheet: a button only opens finite local options, while selection replaces page one and appended pages never mix a draft.</en></lang> -->
      <view class="discover-page__filters">
        <view class="discover-page__filter-actions">
          <!-- <lang><zh-CN>每个动作只传固定筛选类别，不把标签、事件或页面对象当作查询输入。</zh-CN><en>Each action passes only a fixed filter kind and never treats a label, event, or page object as query input.</en></lang> -->
          <u-button :label="venueTriggerLabel" size="sm" block @click="openFilterSheet('venue')" />
          <u-button :label="resourceTypeTriggerLabel" variant="secondary" size="sm" block @click="openFilterSheet('resourceType')" />
          <u-button :label="dateTriggerLabel" variant="secondary" size="sm" block @click="openFilterSheet('date')" />
        </view>
      </view>
      <!-- <lang><zh-CN>底部面板只呈现当前有限 option 集合；页面收到 select intent 后才更新 filter 和目录。</zh-CN><en>The bottom sheet presents only the current finite option collection; the page updates filter and catalog only after receiving a select intent.</en></lang> -->
      <u-action-sheet
        :visible="filterSheetVisible"
        :title="filterSheetTitle"
        :items="filterSheetItems"
        :cancel-text="runtimeLocale.t('common.cancel')"
        mask-closable
        @select="selectFilterSheetItem"
        @close="closeFilterSheet"
      />

      <!-- <lang><zh-CN>加载、错误、空目录与可追加列表互斥，避免状态被纯 CSS 或隐藏分支掩盖。</zh-CN><en>Loading, error, empty catalog, and appendable list are mutually exclusive, preventing state from being hidden by CSS or a concealed branch.</en></lang> -->
      <u-loading-page v-if="demo.catalogPhase.value === 'loading'" :message="runtimeLocale.t('discover.loading')" />
      <u-empty v-else-if="demo.catalogPhase.value === 'failure'" :title="runtimeLocale.t('discover.failureTitle')" :description="runtimeLocale.localize(demo.catalogFailure.value?.message) || runtimeLocale.t('common.notAvailable')" :action-text="runtimeLocale.t('common.reload')" @action="handleSearch" />
      <u-empty
        v-else-if="demo.catalogPhase.value === 'ready' && demo.catalogEntries.value.length === 0"
        :title="runtimeLocale.t('discover.emptyTitle')"
        :description="runtimeLocale.t('discover.emptyDescription')"
        :action-text="runtimeLocale.t('common.clearSearch')"
        @action="handleClear"
      />
      <u-list v-else>
        <!-- <lang><zh-CN>原生 view 在 UList slot 内拥有卡片间距；这避免页面 scoped 样式落在隔离的自定义组件 host 上而失效。</zh-CN><en>A native view owns card spacing inside the UList slot, preventing page-scoped styling from landing on an isolated custom-component host and becoming ineffective.</en></lang> -->
        <view class="discover-page__list">
          <!-- <lang><zh-CN>每张卡片由页面 view 建立独立列表项边界，并只将查看意图返回给页面。</zh-CN><en>Each card receives a distinct list-item boundary from a page-owned view and returns only a view intent to the page.</en></lang> -->
          <view v-for="entry in demo.catalogEntries.value" :key="entry.id" class="discover-page__list-item">
            <resource-card :entry="entry" layout="catalog" @view="openDetail" />
          </view>
          <view class="discover-page__footer">
            <!-- <lang><zh-CN>追加失败仍保留已有列表和页次；notice 明确说明当前可见结果未被清空，重试只重新请求下一页。</zh-CN><en>An append failure retains existing list and page facts; notice explicitly says visible results remain and retry requests only the next page.</en></lang> -->
            <u-notice v-if="appendFailureMessage" visible tone="warning" :message="appendFailureMessage" />
            <text>{{ pageFacts }}</text>
            <u-loadmore :status="footerStatus" :more-text="runtimeLocale.t('load.more')" :loading-text="runtimeLocale.t('load.loading')" :nomore-text="runtimeLocale.t('load.nomore')" :error-text="runtimeLocale.t('load.error')" @loadmore="handleLoadMore" />
          </view>
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

// <lang><zh-CN>底部选择面板拥有当前固定类别与受控可见性；页面在 select intent 后明确关闭它。</zh-CN><en>The bottom selection panel owns current fixed kind and controlled visibility; the page explicitly closes it after a select intent.</en></lang>
const filterSheetKind = ref('');
const filterSheetVisible = ref(false);

/**
 * <lang><zh-CN>将 state 的有限双语 option 集合投影为当前 runtime locale 的 action-sheet 输入。</zh-CN><en>Projects state’s finite bilingual option collection into current-runtime-locale input for the action sheet.</en></lang>
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
    // <lang><zh-CN>Action sheet 只需要这两个受控原始字段。</zh-CN><en>The action sheet needs only these two controlled primitive fields.</en></lang>
    localizedOptions.push({ value: option.value, label: runtimeLocale.localize(option.label) });
  }

  // <lang><zh-CN>返回新数组，使 locale 更新后的 computed 值不会共享可写 UI option 对象。</zh-CN><en>Return a new array so computed values after a locale update share no writable UI option objects.</en></lang>
  return localizedOptions;
}

/**
 * <lang><zh-CN>将明确 ISO 示例日期投影为当前语言的 action-sheet 选项。</zh-CN><en>Projects explicit ISO demo dates as current-language options for the action sheet.</en></lang>
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

/**
 * <lang><zh-CN>为紧凑筛选触发器创建当前选择或通用类别的短标签。</zh-CN><en>Creates a short label of current selection or general category for a compact filter trigger.</en></lang>
 * @param {string} selectedValue <lang><zh-CN>当前已提交的有限筛选值。</zh-CN><en>Current committed finite filter value.</en></lang>
 * @param {ReadonlyArray<object>} options <lang><zh-CN>当前语言的有限选项。</zh-CN><en>Finite options in current language.</en></lang>
 * @param {string} fallback <lang><zh-CN>未选择时的类别标签。</zh-CN><en>Category label used when no value is selected.</en></lang>
 * @returns {string} <lang><zh-CN>包含视觉展开提示的可见短标签。</zh-CN><en>Visible short label containing a visual expansion cue.</en></lang>
 * @lang zh-CN 标签不形成新的筛选值或查询字段；它只解释已提交的有限 selector 状态。
 * @lang en The label creates no new filter value or query field; it only explains committed finite selector state.
 */
function createFilterTriggerLabel(selectedValue, options, fallback) {
  // <lang><zh-CN>只在有限 option 集合中寻找严格相等的当前值。</zh-CN><en>Look for the current value by strict equality only in the finite option collection.</en></lang>
  const selectedOption = options.find((option) => option.value === selectedValue);

  // <lang><zh-CN>未选择或未知值回退类别名称，避免将内部 ID 暴露为用户文案。</zh-CN><en>An unselected or unknown value falls back to category name, preventing an internal ID from being exposed as user copy.</en></lang>
  const visibleLabel = selectedOption?.label || fallback;

  // <lang><zh-CN>展开符只提示有限 action sheet，不代表原生 dropdown 或远端搜索。</zh-CN><en>The expansion cue indicates only a finite action sheet and represents no native dropdown or remote search.</en></lang>
  return `${visibleLabel} ▾`;
}

// <lang><zh-CN>三个触发器随当前选择与语言更新；其紧凑三列布局由页面组合管理，按钮本身仍使用 UI 的 token 化边界。</zh-CN><en>The three triggers update with current selection and language; page composition manages their compact three-column layout while buttons retain UI tokenized bounds.</en></lang>
const venueTriggerLabel = computed(() => createFilterTriggerLabel(selectedVenueId.value, venueOptions.value, runtimeLocale.t('discover.venueLabel')));
const resourceTypeTriggerLabel = computed(() => createFilterTriggerLabel(selectedResourceTypeId.value, resourceTypeOptions.value, runtimeLocale.t('discover.typeLabel')));
const dateTriggerLabel = computed(() => createFilterTriggerLabel(selectedDate.value, dateOptions.value, runtimeLocale.t('discover.dateLabel')));

// <lang><zh-CN>当前面板只指向三类固定集合之一；未知类别不产生可选择项。</zh-CN><en>The current panel points to only one of three fixed collections; an unknown kind produces no selectable item.</en></lang>
const activeFilterOptions = computed(() => {
  if (filterSheetKind.value === 'venue') return venueOptions.value;
  if (filterSheetKind.value === 'resourceType') return resourceTypeOptions.value;
  if (filterSheetKind.value === 'date') return dateOptions.value;
  return [];
});

// <lang><zh-CN>底部面板的标题只由已声明类别映射，不采用路由或用户文本。</zh-CN><en>The bottom-panel title maps only from declared kinds and adopts no route or user text.</en></lang>
const filterSheetTitle = computed(() => {
  if (filterSheetKind.value === 'venue') return runtimeLocale.t('discover.selectVenue');
  if (filterSheetKind.value === 'resourceType') return runtimeLocale.t('discover.selectType');
  if (filterSheetKind.value === 'date') return runtimeLocale.t('discover.selectDate');
  return runtimeLocale.t('discover.filtersTitle');
});

// <lang><zh-CN>每个面板第一项始终清除当前维度，随后才列出 state 提供的有限选项。</zh-CN><en>The first item in every panel always clears current dimension, followed only by finite options supplied by state.</en></lang>
const filterSheetItems = computed(() => [{ value: '', label: runtimeLocale.t('discover.allCurrentDimension') }, ...activeFilterOptions.value]);

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

// <lang><zh-CN>只有已有结果上的追加失败才显示这条恢复提示；首屏失败使用完整 `u-empty`，避免两个错误层级同时出现。</zh-CN><en>Show this recovery hint only for an append failure with existing results; an initial failure uses complete `u-empty`, avoiding two error hierarchies at once.</en></lang>
const appendFailureMessage = computed(() => demo.catalogFailure.value && demo.catalogEntries.value.length > 0
  ? `${runtimeLocale.localize(demo.catalogFailure.value.message) || runtimeLocale.t('common.notAvailable')} ${runtimeLocale.t('discover.appendFailure')}`
  : '');

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
 * <lang><zh-CN>打开一个固定维度的本地选择面板。</zh-CN><en>Opens the local selection panel for one fixed dimension.</en></lang>
 * @param {'venue'|'resourceType'|'date'} filterKind <lang><zh-CN>已声明的筛选类别。</zh-CN><en>Declared filter kind.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN button click 不直接更新业务筛选；只有 action-sheet select 才提交新查询。
 * @lang en A button click does not directly update business filters; only an action-sheet select submits a new query.
 */
function openFilterSheet(filterKind) {
  // <lang><zh-CN>只接受三类固定类别，未知输入不会打开空面板或写入筛选状态。</zh-CN><en>Accept only three fixed kinds; an unknown input opens no empty panel and writes no filter state.</en></lang>
  if (!['venue', 'resourceType', 'date'].includes(filterKind)) return;

  // <lang><zh-CN>将有限类别转移给面板并显式显示；业务 selector 仍保持原值。</zh-CN><en>Transfer finite kind to the panel and explicitly show it; business selectors retain their prior values.</en></lang>
  filterSheetKind.value = filterKind;
  filterSheetVisible.value = true;
}

/**
 * <lang><zh-CN>提交 action sheet 中已选择的有限筛选值。</zh-CN><en>Submits the finite filter value selected in the action sheet.</en></lang>
 * @param {{value?: unknown}} selection <lang><zh-CN>UI component 报告的受控选择意图。</zh-CN><en>Controlled selection intent reported by the UI component.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>面板关闭且新 page=1 稳定后 resolve。</zh-CN><en>Resolves after panel closes and new page one stabilizes.</en></lang>
 * @lang zh-CN 选择值仍需是字符串；页面不信任 index、事件对象或任意 action-sheet item 字段。
 * @lang en The selected value must still be a string; the page trusts neither index, event object, nor arbitrary action-sheet item field.
 */
async function selectFilterSheetItem(selection) {
  // <lang><zh-CN>非字符串 select intent 不改变可见筛选或当前目录。</zh-CN><en>A non-string select intent changes neither visible filters nor current catalog.</en></lang>
  if (typeof selection?.value !== 'string') return;

  // <lang><zh-CN>按当前固定面板把值写入唯一对应 selector；未知类别不写入任何字段。</zh-CN><en>Write value to its sole matching selector according to current fixed panel; an unknown kind writes no field.</en></lang>
  if (filterSheetKind.value === 'venue') selectedVenueId.value = selection.value;
  if (filterSheetKind.value === 'resourceType') selectedResourceTypeId.value = selection.value;
  if (filterSheetKind.value === 'date') selectedDate.value = selection.value;

  // <lang><zh-CN>在刷新前关闭局部面板，避免加载态下残留无效交互层。</zh-CN><en>Close the local panel before refresh, avoiding a stale interactive layer during loading.</en></lang>
  closeFilterSheet();

  // <lang><zh-CN>只有新的三值完整草稿才替换目录首页。</zh-CN><en>Only the new complete three-value draft replaces the catalog first page.</en></lang>
  await handleFilterChange();
}

/**
 * <lang><zh-CN>关闭有限筛选 action sheet 并清除临时面板类别。</zh-CN><en>Closes the finite filter action sheet and clears temporary panel kind.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 此函数不重置已提交筛选，也不发起读取；mask/cancel 和 select 后都可安全调用。
 * @lang en This function resets no committed filter and starts no read; it is safe after mask/cancel or select.
 */
function closeFilterSheet() {
  // <lang><zh-CN>先隐藏面板，再清空临时类别。</zh-CN><en>Hide panel first, then clear temporary kind.</en></lang>
  filterSheetVisible.value = false;
  filterSheetKind.value = '';
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
/* <lang><zh-CN>发现页从 navbar 后直接进入搜索、筛选与封面目录，并为固定 tabBar 预留完整底部空间。</zh-CN><en>Discover moves directly from the navbar into search, filters, and the cover catalog while reserving full bottom space for the fixed tab bar.</en></lang> */
.discover-page { box-sizing: border-box; min-height: 100%; padding: 16px 16px calc(var(--bp-shell-tabbar-height, 64px) + 42px + env(safe-area-inset-bottom)); background: var(--u-sys-color-surface-subtle); }
.discover-page__filters { display: flex; gap: 8px; flex-direction: column; margin-top: 14px; }
.discover-page__filter-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.discover-page__state { display: flex; gap: 12px; flex-direction: column; margin-top: 20px; }
.discover-page__list { display: flex; gap: 14px; flex-direction: column; margin-top: 16px; }
.discover-page__list-item { min-width: 0; }
.discover-page__footer { display: flex; gap: 8px; flex-direction: column; align-items: center; padding: 8px 0 20px; color: var(--u-sys-color-text-secondary); font-size: 12px; }
/* <lang><zh-CN>微信端采用字面内容 gutter 和底栏预留，避免 app-level CSS 变量在自定义组件隔离下令整条 padding 声明失效。</zh-CN><en>WeChat uses a literal content gutter and tab-bar reservation so app-level CSS variables cannot invalidate the entire padding declaration under custom-component isolation.</en></lang> */
/* #ifdef MP-WEIXIN */
.discover-page { padding: 16px 16px calc(106px + env(safe-area-inset-bottom)); background: #f7f9fc; }
/* #endif */
</style>
