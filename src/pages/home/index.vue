<!--
@lang zh-CN 首页按已审阅视觉板呈现品牌栏、欢迎信息、原创主图、双入口、单项精选资源和数据来源说明；不包含搜索、真实定位、身份、支付、远端请求或行业会员信息。
@lang en Home follows the reviewed visual board with a brand bar, welcome copy, original hero image, two entries, one featured resource, and a data-source explanation; it includes no search, real location, identity, payment, remote request, or industry membership information.
-->
<template>
  <!-- <lang><zh-CN>provider 直接包住页面，使 HIA-uView locale context、BP runtime 文案和领域投影始终使用同一种运行时语言。</zh-CN><en>The provider directly wraps the page so the HIA-uView locale context, BP runtime copy, and domain projection always use one runtime language.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <!-- <lang><zh-CN>首页使用应用自管品牌栏；其余页面继续使用 RuntimePageShell 的默认 HIA-uView navbar，平台 custom tabBar 仍常驻。</zh-CN><en>Home supplies an application-owned brand bar; other pages continue using RuntimePageShell's default HIA-uView navbar while the platform custom tab bar remains persistent.</en></lang> -->
    <runtime-page-shell :title="runtimeLocale.t('title.home')">
      <template #header>
        <!-- <lang><zh-CN>品牌与 source badge 保持同一可发现层级；微信条件样式为右侧原生胶囊预留空间。</zh-CN><en>Brand and source badge stay at one discoverable level; WeChat-specific styling reserves space for the native capsule on the right.</en></lang> -->
        <view class="home-page__brand-bar">
          <text class="home-page__brand">{{ runtimeLocale.t('app.brand') }}</text>
          <source-badge :source="demo.catalogSource.value" />
        </view>
      </template>

      <view class="home-page">
        <!-- <lang><zh-CN>欢迎标题与说明独立位于主图之前，拒绝使用渐变覆盖层压缩文字或改变图片可读性。</zh-CN><en>The welcome heading and description sit independently before the hero image, avoiding a gradient overlay that compresses copy or changes image readability.</en></lang> -->
        <view class="home-page__intro">
          <text class="home-page__title">{{ runtimeLocale.t('home.title') }}</text>
          <text class="home-page__subtitle">{{ runtimeLocale.t('home.subtitle') }}</text>
        </view>

        <!-- <lang><zh-CN>主图使用仓内登记的中性公共阅览空间资产，并通过 UImage 的公开 fluid 契约填满页面拥有的固定几何。</zh-CN><en>The hero uses the registered neutral public-reading-space asset and fills page-owned fixed geometry through UImage's public fluid contract.</en></lang> -->
        <view class="home-page__hero">
          <u-image :src="heroImage" :alt="runtimeLocale.t('home.heroAlt')" fluid shape="rounded" />
        </view>

        <!-- <lang><zh-CN>两个入口均使用 HIA-uView UButton；第一方图标只是可见装饰，文字继续承担完整操作语义。</zh-CN><en>Both entries use HIA-uView UButton; first-party icons are visible decoration while text continues to carry the complete action meaning.</en></lang> -->
        <view class="home-page__shortcuts">
          <u-button :label="runtimeLocale.t('home.chooseDate')" size="lg" block @click="browseResources">
            <template #leading><image class="home-page__shortcut-icon" src="/static/icons/action-calendar-light.svg" mode="aspectFit" /></template>
          </u-button>
          <u-button :label="runtimeLocale.t('home.browseVenues')" variant="secondary" size="lg" block @click="browseResources">
            <template #leading><image class="home-page__shortcut-icon" src="/static/icons/action-venue-primary.svg" mode="aspectFit" /></template>
          </u-button>
        </view>

        <!-- <lang><zh-CN>加载、失败、空结果和精选项显式互斥；首页只呈现一个精选入口，不复用发现页的完整分页目录。</zh-CN><en>Loading, failure, empty, and featured states are explicitly exclusive; Home presents one featured entry rather than reusing Discover's complete paged catalog.</en></lang> -->
        <u-loading-page v-if="demo.catalogPhase.value === 'loading'" :message="runtimeLocale.t('home.loading')" />
        <view v-else-if="demo.catalogPhase.value === 'failure'" class="home-page__state">
          <u-notice visible tone="error" :message="runtimeLocale.localize(demo.catalogFailure.value?.message) || runtimeLocale.t('common.notAvailable')" />
          <u-button :label="runtimeLocale.t('common.reload')" block @click="handleRetry" />
        </view>
        <u-empty
          v-else-if="!featuredEntry"
          :title="runtimeLocale.t('home.emptyTitle')"
          :description="runtimeLocale.t('home.emptyDescription')"
          :action-text="runtimeLocale.t('common.goDiscover')"
          @action="browseResources"
        />
        <view v-else class="home-page__featured">
          <!-- <lang><zh-CN>区块右侧提供明确“查看全部”入口；精选卡整体报告查看意图，没有第二个重复详情按钮。</zh-CN><en>The section exposes an explicit View all entry; the whole featured card reports view intent and contains no duplicate details button.</en></lang> -->
          <u-section :title="runtimeLocale.t('home.sectionFeatured')" :right-text="runtimeLocale.t('common.viewAll')" @right-click="browseResources" />
          <resource-card :entry="featuredEntry" layout="featured" @view="openDetail" />
        </view>

        <!-- <lang><zh-CN>来源说明使用 HIA-uView UAlertTips 的标题与说明结构，始终公开本地示例边界。</zh-CN><en>The source explanation uses HIA-uView UAlertTips title-and-description structure and always discloses the local-demo boundary.</en></lang> -->
        <u-alert-tips
          class="home-page__data-notice"
          show
          type="primary"
          :title="runtimeLocale.t('home.dataNoticeTitle')"
          :description="runtimeLocale.t('home.dataNoticeDescription')"
        />
      </view>
    </runtime-page-shell>
  </u-config-provider>
</template>

<script setup>
// <lang><zh-CN>Vue 仅用于受控派生值和首次挂载；页面不建立第二个业务 store。</zh-CN><en>Vue is used only for bounded derived values and first mount; the page creates no second business store.</en></lang>
import { computed, onMounted } from 'vue';
// <lang><zh-CN>平台生命周期只处理明确的下拉刷新和主导航 chrome 同步。</zh-CN><en>Platform lifecycles handle only explicit pull refresh and primary-navigation chrome synchronization.</en></lang>
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import ResourceCard from '../../components/ResourceCard.vue';
import RuntimePageShell from '../../components/RuntimePageShell.vue';
import SourceBadge from '../../components/SourceBadge.vue';
import { getVenueImage } from '../../data/asset-map.mjs';
import { openPrimaryPage, syncPrimaryTabChrome } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>首页只持有共享 demo 的受限公开 surface，不读取 dataset、provider host 或 request handle。</zh-CN><en>Home holds only the shared demo's bounded public surface and reads neither dataset, provider host, nor request handle.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>唯一共享 locale surface 为所有静态文案和领域投影提供当前单语言。</zh-CN><en>The sole shared locale surface supplies the current single language for all static copy and domain projection.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>hero 使用资产 allowlist 中的中性阅览空间；未知 ID 时 UImage 显示受控 fallback。</zh-CN><en>The hero uses the neutral reading space from the asset allowlist; UImage shows its controlled fallback for an unknown ID.</en></lang>
const heroImage = getVenueImage('harbor-reading-hall');

// <lang><zh-CN>首页精选只读取当前 canonical page 的第一项，不复制领域对象或猜测第二项排序。</zh-CN><en>Home feature reads only the first item of the current canonical page and neither duplicates a domain object nor guesses a secondary ordering.</en></lang>
const featuredEntry = computed(() => demo.catalogEntries.value[0] ?? null);

// <lang><zh-CN>当前目录只要含关键字或任何发现页筛选，就需要在首页恢复无筛选的 profile 默认视图。</zh-CN><en>The current catalog needs the profile-default unfiltered Home view whenever it contains a keyword or any Discover filter.</en></lang>
const catalogNeedsHomeReset = computed(() => demo.catalogKeyword.value.length > 0 || Object.values(demo.catalogFilters.value).some((value) => value.length > 0));

/**
 * @lang zh-CN 确保首页持有无搜索、无筛选的目录第一页。
 * @lang en Ensures Home owns an unsearched, unfiltered first catalog page.
 * @returns {Promise<void>} <lang><zh-CN>目录无需改变或刷新稳定后 resolve。</zh-CN><en>Resolves when the catalog needs no change or after refresh stabilizes.</en></lang>
 */
async function ensureHomeCatalog() {
  // <lang><zh-CN>首次进入或从发现页带回筛选时显式恢复默认目录；已有无筛选结果则避免重复读取。</zh-CN><en>Explicitly restore the default catalog on first entry or after returning with Discover filters; retain existing unfiltered results without duplicate reads.</en></lang>
  if (demo.catalogPhase.value === 'idle' || catalogNeedsHomeReset.value) await demo.refreshCatalog('');
}

/**
 * @lang zh-CN 重试无搜索、无筛选的本地目录首页。
 * @lang en Retries the unsearched, unfiltered local catalog first page.
 * @returns {Promise<void>} <lang><zh-CN>刷新稳定后 resolve。</zh-CN><en>Resolves after refresh stabilizes.</en></lang>
 */
async function handleRetry() {
  // <lang><zh-CN>首页错误恢复不复用发现页草稿，避免隐藏条件导致精选项变化。</zh-CN><en>Home error recovery never reuses a Discover draft, preventing hidden conditions from changing the featured entry.</en></lang>
  await demo.refreshCatalog('');
}

/**
 * @lang zh-CN 导航到当前精选资源的详情页。
 * @lang en Navigates to the current featured resource details.
 * @param {string} resourceId <lang><zh-CN>ResourceCard 发出的有限资源 ID。</zh-CN><en>Finite resource ID emitted by ResourceCard.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 */
function openDetail(resourceId) {
  // <lang><zh-CN>ID 来自 canonical entry，并在成为 query 前编码；页面不附带 source 或用户字段。</zh-CN><en>The ID comes from a canonical entry and is encoded before becoming a query; the page appends no source or user field.</en></lang>
  uni.navigateTo({ url: `/pages/resource-detail/index?resourceId=${encodeURIComponent(resourceId)}` });
}

/**
 * @lang zh-CN 转到发现主页面浏览完整目录。
 * @lang en Moves to the Discover primary page to browse the complete catalog.
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 */
function browseResources() {
  // <lang><zh-CN>日期和场馆入口当前共享同一个安全目录入口，不提前声明日历库存或写入。</zh-CN><en>Date and venue entries currently share one safe catalog entry and declare no calendar inventory or write operation early.</en></lang>
  openPrimaryPage('discover');
}

// <lang><zh-CN>首次挂载执行幂等目录检查，数据加载仍由页面显式启动。</zh-CN><en>First mount runs the idempotent catalog check while data loading remains explicitly page-initiated.</en></lang>
onMounted(ensureHomeCatalog);

/**
 * @lang zh-CN 同步首页常驻 tab chrome，并恢复首页默认目录范围。
 * @lang en Synchronizes Home's persistent tab chrome and restores Home's default catalog scope.
 * @returns {Promise<void>} <lang><zh-CN>目录检查完成后 resolve。</zh-CN><en>Resolves after the catalog check completes.</en></lang>
 */
async function handlePageShow() {
  // <lang><zh-CN>只把固定首页 value 与共享 translator 交给受限 chrome bridge。</zh-CN><en>Pass only the fixed Home value and shared translator to the bounded chrome bridge.</en></lang>
  syncPrimaryTabChrome('home', runtimeLocale.locale.value, (messageKey) => runtimeLocale.t(messageKey));
  // <lang><zh-CN>从发现页返回时清除其筛选投影，保证首页精选不随隐藏状态漂移。</zh-CN><en>Clear Discover's filter projection when returning so Home's feature does not drift with hidden state.</en></lang>
  await ensureHomeCatalog();
}

// <lang><zh-CN>每次平台 tab 显示首页时同步常驻底栏和默认目录范围。</zh-CN><en>Synchronize the persistent bottom bar and default catalog scope whenever the platform tab shows Home.</en></lang>
onShow(handlePageShow);

// <lang><zh-CN>下拉刷新只重读无筛选本地第一页；finally 始终清理平台 loading，不把它解释为网络状态。</zh-CN><en>Pull refresh rereads only the unfiltered local first page; finally always clears platform loading without interpreting it as network state.</en></lang>
onPullDownRefresh(async () => {
  try {
    // <lang><zh-CN>显式调用首页恢复 action，保持失败边界与按钮重试一致。</zh-CN><en>Call the explicit Home recovery action, keeping failure boundaries aligned with button retry.</en></lang>
    await handleRetry();
  } finally {
    // <lang><zh-CN>平台刷新动画在成功与失败时都结束，业务状态仍由 demo surface 呈现。</zh-CN><en>The platform refresh animation ends on both success and failure while the demo surface continues to present business state.</en></lang>
    uni.stopPullDownRefresh();
  }
});
</script>

<style scoped>
/* <lang><zh-CN>首页采用设计板的紧凑纵向节奏，并为固定 custom tabBar 与安全区留出完整滚动空间。</zh-CN><en>Home adopts the board's compact vertical rhythm and reserves complete scroll space for the fixed custom tab bar and safe area.</en></lang> */
.home-page { box-sizing: border-box; min-height: 100%; padding: 20px var(--bp-page-inline) calc(var(--bp-shell-tabbar-height) + 48px + env(safe-area-inset-bottom)); background: var(--u-sys-color-surface-subtle); color: var(--u-sys-color-text); }
/* <lang><zh-CN>品牌栏是首页唯一顶部标题层；其宽度与高度稳定，不生成第二个居中标题。</zh-CN><en>The brand bar is Home's sole top-title layer; its width and height remain stable and create no second centered heading.</en></lang> */
.home-page__brand-bar { box-sizing: border-box; display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 var(--bp-page-inline); overflow: hidden; background: var(--u-sys-color-surface); }
.home-page__brand { min-width: 0; overflow: hidden; color: var(--u-sys-color-action-primary); font-family: var(--bp-font-display, "Songti SC", STSong, SimSun, serif); font-size: 21px; font-weight: 700; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
/* <lang><zh-CN>欢迎语使用系统可用的中文展示字体 fallback；正文仍采用统一无衬线字体栈。</zh-CN><en>Welcome copy uses the system-available Chinese display-font fallback while body copy retains the shared sans-serif stack.</en></lang> */
.home-page__intro { display: flex; flex-direction: column; gap: 6px; }
.home-page__title { display: block; max-width: 330px; font-family: var(--bp-font-display, "Songti SC", STSong, SimSun, serif); font-size: 26px; font-weight: 700; line-height: 1.38; letter-spacing: .01em; }
.home-page__subtitle { display: block; color: var(--u-sys-color-text-secondary); font-size: 14px; line-height: 1.55; }
/* <lang><zh-CN>页面拥有 216px hero 几何，UImage 仅通过 fluid 填满，图片不再依靠深层选择器或覆盖文案。</zh-CN><en>The page owns 216px hero geometry and UImage only fills it through fluid, with no deep selector or overlaid copy.</en></lang> */
.home-page__hero { height: 216px; margin-top: 14px; overflow: hidden; border-radius: 16px; box-shadow: var(--bp-card-shadow); }
/* <lang><zh-CN>双入口等宽排列，主操作在左，图标与文字保持单行居中。</zh-CN><en>The two entries share equal width with the primary action on the left, keeping icon and copy centered on one line.</en></lang> */
.home-page__shortcuts { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; margin-top: 16px; }
.home-page__shortcut-icon { display: block; flex: 0 0 24px; height: 24px; width: 24px; }
.home-page__state { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
.home-page__featured { margin-top: 22px; }
.home-page__featured > .resource-card { margin-top: 10px; }
/* <lang><zh-CN>来源说明通过组件根的公开 class 呈现视觉板中的浅蓝信息表面；不穿透或改写 UAlertTips 的内部结构。</zh-CN><en>The source explanation uses the component root's public class to render the board's pale-blue information surface without piercing or rewriting UAlertTips internals.</en></lang> */
.home-page__data-notice { margin-top: 18px; background: var(--u-comp-notice-info-surface); border-color: var(--u-comp-notice-info-border); border-radius: var(--bp-card-radius); color: var(--u-comp-notice-info-foreground); }
/* <lang><zh-CN>微信原生菜单胶囊占据品牌栏右侧；只预留固定安全空间，不读取设备或窗口信息。</zh-CN><en>The native WeChat menu capsule occupies the brand bar's right side; reserve fixed safe space without reading device or window information.</en></lang> */
/* #ifdef MP-WEIXIN */
.home-page__brand-bar { padding-right: 116px; background: #ffffff; }
.home-page { background: #f7f9fc; color: #001b2e; }
.home-page__brand { color: #0047ab; }
.home-page__subtitle { color: #27364a; }
/* #endif */
</style>
