<!--
@lang zh-CN 首页呈现已审阅的城市公共资源预约入口、source badge、精选资源和明确恢复状态；不包含真实定位、身份、支付、远端请求或行业会员信息。
@lang en Home presents the reviewed civic-resource-booking entry, source badge, featured resources, and explicit recovery states; it includes no real location, identity, payment, remote request, or industry membership information.
-->
<template>
  <!-- <lang><zh-CN>provider 直接包住页面，使 HIA-uView 的 locale context 与 BP runtime 文案/领域投影保持一致。</zh-CN><en>The provider directly wraps the page, keeping HIA-uView locale context aligned with BP runtime copy and domain projection.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <!-- <lang><zh-CN>页面壳用 HIA-uView 呈现同一 locale 的标题；四项主导航由平台管理 custom tabBar 常驻呈现。</zh-CN><en>The page shell uses HIA-uView to render the same-locale title; platform-managed custom tabBar persistently renders the four primary navigation items.</en></lang> -->
    <runtime-page-shell :title="runtimeLocale.t('title.home')">
      <view class="home-page">
      <!-- <lang><zh-CN>hero 使用原创项目内场馆图，不使用外部照片或地图服务。</zh-CN><en>Hero uses an original in-project venue image and no external photograph or map service.</en></lang> -->
      <view class="home-page__hero">
        <u-image :src="heroImage" :alt="runtimeLocale.t('app.brand')" size="large" shape="rounded" />
        <view class="home-page__hero-copy">
          <text class="home-page__eyebrow">{{ runtimeLocale.t('home.eyebrow') }}</text>
          <text class="home-page__title">{{ runtimeLocale.t('home.title') }}</text>
          <text class="home-page__subtitle">{{ runtimeLocale.t('home.subtitle') }}</text>
        </view>
      </view>

      <!-- <lang><zh-CN>source 状态始终可发现，避免把 local/降级事实藏进设置页。</zh-CN><en>Source state remains discoverable and does not hide local/degradation facts in a settings page.</en></lang> -->
      <view class="home-page__source"><source-badge :source="demo.catalogSource.value" /><text>{{ runtimeLocale.t('home.offline') }}</text></view>
      <u-search v-model="keyword" :placeholder="runtimeLocale.t('home.searchPlaceholder')" @search="handleSearch" @clear="handleClear" />

      <!-- <lang><zh-CN>两个入口只复用当前本地目录 flow，不提前声明日历服务、实时库存或写入流程。</zh-CN><en>The two entries reuse only the current local catalog flow and do not declare a calendar service, live inventory, or a write flow early.</en></lang> -->
      <view class="home-page__shortcuts">
        <u-button :label="runtimeLocale.t('home.chooseDate')" variant="secondary" block @click="browseResources" />
        <u-button :label="runtimeLocale.t('home.browseVenues')" block @click="browseResources" />
      </view>

      <!-- <lang><zh-CN>加载、首次错误、空结果和 ready list 显式互斥呈现，保持可恢复状态可见。</zh-CN><en>Loading, initial failure, empty result, and ready list are explicitly mutually exclusive so recoverable state remains visible.</en></lang> -->
      <u-loading-page v-if="demo.catalogPhase.value === 'loading'" :message="runtimeLocale.t('home.loading')" />
      <view v-else-if="demo.catalogPhase.value === 'failure'" class="home-page__state">
        <u-notice visible tone="error" :message="runtimeLocale.localize(demo.catalogFailure.value?.message) || runtimeLocale.t('common.notAvailable')" />
        <u-button :label="runtimeLocale.t('common.reload')" block @click="handleRetry" />
      </view>
      <u-empty
        v-else-if="demo.catalogPhase.value === 'ready' && demo.catalogEntries.value.length === 0"
        :title="runtimeLocale.t('home.emptyTitle')"
        :description="runtimeLocale.t('home.emptyDescription')"
        :action-text="runtimeLocale.t('common.clearSearch')"
        @action="handleClear"
      />
      <view v-else>
        <!-- <lang><zh-CN>`u-section` 只承担标题层级；列表作为相邻块级区域，避免 section 的并列 slot 布局压缩资源卡片。</zh-CN><en>`u-section` owns only title hierarchy; the list is an adjacent block region, avoiding section's sibling-slot layout compressing resource cards.</en></lang> -->
        <u-section :title="runtimeLocale.t('home.sectionFeatured')" />
        <!-- <lang><zh-CN>每个卡片只收到当前 canonical entry，并把查看意图交回页面导航。</zh-CN><en>Each card receives only the current canonical entry and returns the view intent to page navigation.</en></lang> -->
        <view class="home-page__list">
          <resource-card v-for="entry in demo.catalogEntries.value" :key="entry.id" :entry="entry" @view="openDetail" />
        </view>
        <!-- <lang><zh-CN>页脚同时显示加载数、明确页次和 append retry，不使用不可发现的无限滚动。</zh-CN><en>Footer shows loaded count, explicit page state, and append retry together without undiscoverable infinite scrolling.</en></lang> -->
        <view class="home-page__footer">
          <text>{{ pageFacts }}</text>
          <u-loadmore :status="footerStatus" :more-text="runtimeLocale.t('load.more')" :loading-text="runtimeLocale.t('load.loading')" :nomore-text="runtimeLocale.t('load.nomore')" :error-text="runtimeLocale.t('load.error')" @loadmore="handleLoadMore" />
        </view>
      </view>
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
import { getVenueImage } from '../../data/asset-map.mjs';
import { openPrimaryPage, syncPrimaryTabChrome } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>首页只持有共享 demo 的受限公开 surface，不直接读取 dataset、provider host 或 request handle。</zh-CN><en>Home holds only the shared demo's bounded public surface and reads neither dataset, provider host, nor request handle directly.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>读取唯一共享 locale surface，所有用户可见静态文本和领域投影均从此处获得。</zh-CN><en>Read the sole shared locale surface; every user-visible static copy and domain projection is obtained here.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>输入框草稿在用户明确搜索前不改变当前结果查询。</zh-CN><en>Input draft changes no current result query before an explicit user search.</en></lang>
const keyword = ref('');

// <lang><zh-CN>hero 使用已登记的原创资产；未知 ID 时 UImage 显示中性 fallback。</zh-CN><en>Hero uses a registered original asset; UImage displays a neutral fallback for an unknown ID.</en></lang>
const heroImage = getVenueImage('riverside-sports-hall');

// <lang><zh-CN>将 state 映射为 ULoadmore 有限状态，append failure 保留列表并提供可点重试。</zh-CN><en>Map state to finite ULoadmore status; append failure retains the list and provides a retry control.</en></lang>
const footerStatus = computed(() => {
  if (demo.catalogPhase.value === 'appending') return 'loading';
  if (demo.catalogFailure.value && demo.catalogEntries.value.length > 0) return 'error';
  return demo.catalogPaging.value.hasNext ? 'more' : 'nomore';
});

// <lang><zh-CN>页脚事实只消费 provider 已返回的安全分页值，不猜测总量或下一页。</zh-CN><en>Footer facts consume only safe paging values returned by the provider and guess neither total nor next page.</en></lang>
const pageFacts = computed(() => runtimeLocale.t('common.pageFacts', {
  loaded: demo.catalogEntries.value.length,
  total: demo.catalogPaging.value.total,
  page: demo.catalogPaging.value.page
}));

/**
 * <lang><zh-CN>确保首次进入首页时加载 page=1。</zh-CN><en>Ensures page one loads on first entry to Home.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>首次加载完成后 resolve。</zh-CN><en>Resolves after initial loading completes.</en></lang>
 * @lang zh-CN 避免每次 tab show 重复请求；刷新/搜索通过明确 action 另行触发。
 * @lang en Avoids duplicate requests on every tab show; refresh/search trigger separately through explicit actions.
 */
async function ensureInitialCatalog() {
  // <lang><zh-CN>只在 idle 状态启动首次读取，保留已有 ready/error 状态供用户操作。</zh-CN><en>Start first read only while idle and retain existing ready/error state for user action.</en></lang>
  if (demo.catalogPhase.value === 'idle') await demo.refreshCatalog('');
}

/**
 * <lang><zh-CN>提交当前搜索草稿。</zh-CN><en>Submits the current search draft.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>替换 page=1 后 resolve。</zh-CN><en>Resolves after replacing page one.</en></lang>
 * @lang zh-CN 搜索只过滤 local JSON，不调用 remote API 或存储关键字。
 * @lang en Search filters local JSON only and calls no remote API or stores no keyword.
 */
async function handleSearch() {
  // <lang><zh-CN>将草稿作为明确输入传给 refresh action。</zh-CN><en>Pass draft as explicit input to the refresh action.</en></lang>
  await demo.refreshCatalog(keyword.value);
}

/**
 * <lang><zh-CN>清空搜索并恢复全部 local catalog。</zh-CN><en>Clears search and restores the complete local catalog.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>page=1 刷新完成后 resolve。</zh-CN><en>Resolves after page-one refresh completes.</en></lang>
 * @lang zh-CN 清空只影响当前内存草稿和列表，不写入 preference 或 storage。
 * @lang en Clearing affects only the current in-memory draft/list and writes no preference or storage.
 */
async function handleClear() {
  // <lang><zh-CN>先同步清除输入，再显式替换 catalog 首页。</zh-CN><en>Clear input synchronously first, then explicitly replace the catalog first page.</en></lang>
  keyword.value = '';
  await demo.refreshCatalog('');
}

/**
 * <lang><zh-CN>从 footer 或触底追加下一页。</zh-CN><en>Appends the next page from footer or reach-bottom.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>追加完成或无需追加后 resolve。</zh-CN><en>Resolves after append completes or is unnecessary.</en></lang>
 * @lang zh-CN action 委托 state 的 hasNext/loading gate，不自行猜测分页。
 * @lang en Action delegates to state's hasNext/loading gate and guesses no pagination itself.
 */
async function handleLoadMore() {
  // <lang><zh-CN>使用唯一 append action，确保失败时保留已显示 entries。</zh-CN><en>Use the sole append action, ensuring displayed entries remain on failure.</en></lang>
  await demo.loadNextCatalogPage();
}

/**
 * <lang><zh-CN>重试当前 local catalog 查询。</zh-CN><en>Retries the current local catalog query.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>刷新完成后 resolve。</zh-CN><en>Resolves after refresh completes.</en></lang>
 * @lang zh-CN 首次失败回到 page=1；append failure 的 footer 使用相同 append action。
 * @lang en Initial failure returns to page one; append failure footer uses the same append action.
 */
async function handleRetry() {
  // <lang><zh-CN>用当前草稿重做明确 page=1 查询。</zh-CN><en>Redo the explicit page-one query using the current draft.</en></lang>
  await demo.refreshCatalog(keyword.value);
}

/**
 * <lang><zh-CN>导航到一个资源详情页。</zh-CN><en>Navigates to one resource-detail page.</en></lang>
 * @param {string} resourceId <lang><zh-CN>card emit 的有限资源 ID。</zh-CN><en>Finite resource ID emitted by a card.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 资源 ID 来自当前 canonical entry；它不是 URL、remote endpoint 或任意外部输入。
 * @lang en Resource ID comes from the current canonical entry; it is not a URL, remote endpoint, or arbitrary external input.
 */
function openDetail(resourceId) {
  // <lang><zh-CN>使用 UniApp 本地页面导航，不添加 query 以外的用户或 source 数据。</zh-CN><en>Use UniApp local page navigation and add no user or source data beyond the query.</en></lang>
  uni.navigateTo({ url: `/pages/resource-detail/index?resourceId=${encodeURIComponent(resourceId)}` });
}

/**
 * <lang><zh-CN>转到发现 tab 浏览当前本地目录。</zh-CN><en>Moves to the Discover tab to browse the current local catalog.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 日期入口在 P57 只复用目录入口，不创建实际日历选择或写入流程。
 * @lang en In P57, the date entry only reuses the catalog entry and creates no real calendar selection or write flow.
 */
function browseResources() {
  // <lang><zh-CN>使用应用壳固定主页面路由，保留 module store 中共享 catalog 的当前可见状态。</zh-CN><en>Use the application shell's fixed primary-page route and retain the shared catalog's currently visible module-store state.</en></lang>
  openPrimaryPage('discover');
}

// <lang><zh-CN>首次挂载调用幂等 ensure helper，保证加载只由页面显式启动。</zh-CN><en>First mount calls the idempotent ensure helper, ensuring loading starts only explicitly from the page.</en></lang>
onMounted(ensureInitialCatalog);

/**
 * <lang><zh-CN>同步首页的常驻 tab chrome，并确保首次目录读取。</zh-CN><en>Synchronizes Home's persistent tab chrome and ensures the initial catalog read.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>幂等目录检查完成后 resolve。</zh-CN><en>Resolves after the idempotent catalog check completes.</en></lang>
 * @lang zh-CN 微信 custom-tab-bar 在页面显示时校正选中态和 locale；H5 等宿主同步已声明 platform tab labels。
 * @lang en The WeChat custom tab bar corrects selection and locale when the page is shown; hosts such as H5 synchronize declared platform-tab labels.
 */
async function handlePageShow() {
  // <lang><zh-CN>只把固定首页 value 与共享 runtime translator 交给受限 chrome bridge。</zh-CN><en>Pass only the fixed Home value and shared runtime translator to the bounded chrome bridge.</en></lang>
  syncPrimaryTabChrome('home', runtimeLocale.locale.value, (messageKey) => runtimeLocale.t(messageKey));
  // <lang><zh-CN>保持原有幂等首次读取，不因 tab 生命周期改变数据行为。</zh-CN><en>Retain the original idempotent first read without changing data behavior for tab lifecycle.</en></lang>
  await ensureInitialCatalog();
}

// <lang><zh-CN>每次平台 tab 显示首页时同步常驻底栏并复用目录状态。</zh-CN><en>Synchronize the persistent bottom bar and reuse catalog state whenever the platform tab shows Home.</en></lang>
onShow(handlePageShow);

// <lang><zh-CN>下拉刷新显式替换 page=1，结束平台 loading 只是 UI 清理，不代表远端网络状态。</zh-CN><en>Pull refresh explicitly replaces page one; ending platform loading is UI cleanup only and represents no remote network state.</en></lang>
onPullDownRefresh(async () => { await handleSearch(); uni.stopPullDownRefresh(); });

// <lang><zh-CN>触底只委托 append action；无 next page 时 state 会安全无操作。</zh-CN><en>Reach bottom delegates only to the append action; state safely no-ops when no next page exists.</en></lang>
onReachBottom(handleLoadMore);
</script>

<style scoped>
/* <lang><zh-CN>首页复用 theme token，保持 H5 与小程序内的可读边距、表面和主色层级。</zh-CN><en>Home reuses theme tokens, retaining readable spacing, surfaces, and primary-color hierarchy on H5 and Mini Program.</en></lang> */
.home-page { padding: var(--bp-page-block) var(--bp-page-inline) 28px; background: var(--u-sys-color-surface-subtle); }
.home-page__hero { position: relative; overflow: hidden; margin-bottom: 14px; border-radius: var(--bp-card-radius); box-shadow: var(--bp-card-shadow); }
.home-page__hero :deep(.u-image) { width: 100%; height: 236px; }
.home-page__hero-copy { position: absolute; inset: auto 0 0; display: flex; gap: 6px; flex-direction: column; padding: 42px 18px 18px; color: #fff; background: linear-gradient(180deg, transparent, rgb(0 27 46 / 82%)); }
.home-page__eyebrow { font-size: 12px; letter-spacing: .08em; }
.home-page__title { font-size: 24px; font-weight: 700; line-height: 1.3; }
.home-page__subtitle { font-size: 13px; opacity: .92; }
.home-page__source { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 14px 0; color: var(--u-sys-color-text-secondary); font-size: 12px; }
.home-page__shortcuts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0 18px; }
.home-page__state { display: flex; gap: 12px; flex-direction: column; margin-top: 20px; }
.home-page__list { display: flex; gap: 14px; flex-direction: column; margin-top: 12px; }
.home-page__footer { display: flex; gap: 8px; flex-direction: column; align-items: center; padding: 12px 0 20px; color: var(--u-sys-color-text-secondary); font-size: 12px; }
</style>
