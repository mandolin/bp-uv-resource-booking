<!--
@lang zh-CN 首页按已审阅视觉板呈现品牌栏、欢迎信息、原创主图、双入口、单项精选资源和数据来源说明；不包含搜索、真实定位、身份、支付、远端请求或行业会员信息。
@lang en Home follows the reviewed visual board with a brand bar, welcome copy, original hero image, two entries, one featured resource, and a data-source explanation; it includes no search, real location, identity, payment, remote request, or industry membership information.
-->
<template>
  <!-- <lang><zh-CN>provider 直接包住页面，使 HIA-uView locale context、BP runtime 文案和领域投影始终使用同一种运行时语言。</zh-CN><en>The provider directly wraps the page so the HIA-uView locale context, BP runtime copy, and domain projection always use one runtime language.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <!-- <lang><zh-CN>首页使用应用自管品牌栏；其余页面继续使用 RuntimePageShell 的默认 HIA-uView navbar。微信 official custom tabBar 由宿主常驻，H5 则由页面壳呈现 HIA-uView UTabbar。</zh-CN><en>Home supplies an application-owned brand bar, while other pages continue using RuntimePageShell's default HIA-uView navbar. The host retains WeChat's official custom tab bar, whereas the H5 page shell renders HIA-uView UTabbar.</en></lang> -->
    <runtime-page-shell :title="runtimeLocale.t('title.home')" primary-page="home">
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
          <!-- <lang><zh-CN>中文标题使用设计板的 10+4 字符节奏；英文保留完整内容宽度，避免把相同像素宽度误作跨语言等价。</zh-CN><en>The Chinese heading uses the board's 10+4-character rhythm, while English retains the full content width instead of treating one pixel width as cross-language equivalence.</en></lang> -->
          <text class="home-page__title" :class="{ 'home-page__title--zh-hans': runtimeLocale.locale.value === 'zh-Hans' }">{{ runtimeLocale.t('home.title') }}</text>
          <text class="home-page__subtitle">{{ runtimeLocale.t('home.subtitle') }}</text>
        </view>

        <!-- <lang><zh-CN>主图使用仓内登记的中性公共阅览空间资产，并通过 UImage 的公开 fluid 契约填满页面拥有的固定几何。</zh-CN><en>The hero uses the registered neutral public-reading-space asset and fills page-owned fixed geometry through UImage's public fluid contract.</en></lang> -->
        <view class="home-page__hero">
          <u-image :src="heroImage" :alt="runtimeLocale.t('home.heroAlt')" fluid shape="rounded" />
        </view>

        <!-- <lang><zh-CN>两个入口均使用 HIA-uView UButton；第一方图标只是可见装饰，文字继续承担完整操作语义。</zh-CN><en>Both entries use HIA-uView UButton; first-party icons are visible decoration while text continues to carry the complete action meaning.</en></lang> -->
        <view class="home-page__shortcuts">
          <u-button :label="runtimeLocale.t('home.chooseDate')" size="lg" block @click="browseResources">
            <template #leading><image class="home-page__shortcut-icon" src="/static/icons/action-calendar-light.svg" mode="aspectFit" aria-hidden="true" /></template>
          </u-button>
          <u-button :label="runtimeLocale.t('home.browseVenues')" variant="secondary" size="lg" block @click="browseResources">
            <template #leading><image class="home-page__shortcut-icon" src="/static/icons/action-venue-primary.svg" mode="aspectFit" aria-hidden="true" /></template>
          </u-button>
        </view>

        <!-- <lang><zh-CN>精选区标题在主态、加载、首次失败与成功空结果中保持稳定，使恢复状态不会改变首页的信息架构或“查看全部”入口。</zh-CN><en>The featured-section heading remains stable across ready, loading, initial failure, and successful empty results so recovery states do not change Home's information architecture or View all entry.</en></lang> -->
        <view class="home-page__featured">
          <!-- <lang><zh-CN>区块右侧提供明确“查看全部”入口；入口只负责导航，不把当前首页结果是否为空解释成发现页事实。</zh-CN><en>The section exposes an explicit View all entry; the entry only navigates and does not interpret whether the current Home result is empty as a Discover-page fact.</en></lang> -->
          <u-section :title="runtimeLocale.t('home.sectionFeatured')" :right-text="runtimeLocale.t('common.viewAll')" @right-click="browseResources" />

          <!-- <lang><zh-CN>D-1 使用 HIA-uView 的局部 USkeleton 与可读文案共同呈现首次加载；页面不创建动画、计时器或第二套请求状态。</zh-CN><en>D-1 combines HIA-uView's local USkeleton with readable copy for initial loading; the page creates no animation, timer, or second request state.</en></lang> -->
          <view v-if="isCatalogPreparing" class="home-page__state home-page__state--loading">
            <u-skeleton :loading="true" :rows="2" show-title show-avatar />
            <text class="home-page__loading-copy">{{ runtimeLocale.t('home.loading') }}</text>
          </view>

          <!-- <lang><zh-CN>D-2 只把 canonical 首次失败投影为文字优先 UEmpty；只有 outcome 明确可重试时才提供 action。</zh-CN><en>D-2 projects only a canonical initial failure into a text-first UEmpty and offers an action only when the outcome is explicitly retryable.</en></lang> -->
          <view v-else-if="isInitialCatalogFailure" class="home-page__state home-page__state--terminal">
            <u-empty
              class="home-page__terminal-panel"
              :title="runtimeLocale.t('home.failureTitle')"
              :description="runtimeLocale.t('home.failureDescription')"
              :action-text="canRetryCatalogFailure ? runtimeLocale.t('common.retry') : ''"
              @action="handleRetry"
            />
          </view>

          <!-- <lang><zh-CN>D-3 表示 facade 已成功返回空目录；重新加载与 D-2 重试复用同一页面恢复意图，不跳转发现页。</zh-CN><en>D-3 represents a successfully returned empty catalog from the facade; Reload shares the same page recovery intent as D-2 retry and does not navigate to Discover.</en></lang> -->
          <view v-else-if="isSuccessfulCatalogEmpty" class="home-page__state home-page__state--terminal">
            <u-empty
              class="home-page__terminal-panel"
              :title="runtimeLocale.t('home.emptyTitle')"
              :description="runtimeLocale.t('home.emptyDescription')"
              :action-text="runtimeLocale.t('common.reload')"
              @action="handleRetry"
            />
          </view>

          <!-- <lang><zh-CN>已有精选快照时始终保留卡片；刷新失败仅在卡片上方增加非阻断 UNotice，不把可用内容替换成整块失败态。</zh-CN><en>When a featured snapshot exists, the card is always retained; a refresh failure adds only a non-blocking UNotice above it instead of replacing available content with a full failure state.</en></lang> -->
          <view v-else-if="featuredEntry" class="home-page__featured-card">
            <view v-if="hasRetainedFeaturedFailure" class="home-page__refresh-notice">
              <u-notice visible tone="warning" :message="retainedCatalogFailureMessage" />
            </view>
            <resource-card :entry="featuredEntry" layout="featured" @view="openDetail" />
          </view>
        </view>

        <!-- <lang><zh-CN>页面自有 wrapper 在精选卡与提示之间建立可靠间距；UAlertTips 继续承担提示语义，而 slot 让页面在不穿透小程序组件隔离边界的情况下统一图标、字体和颜色。</zh-CN><en>A page-owned wrapper creates reliable spacing between the featured card and the notice; UAlertTips retains alert semantics while its slot lets the page align icon, typography, and color without piercing Mini Program component isolation.</en></lang> -->
        <view class="home-page__data-notice">
          <u-alert-tips show type="primary">
            <view class="home-page__data-notice-content">
              <!-- <lang><zh-CN>信息标记是不可交互的可见装饰；相邻标题继续提供完整文字语义。</zh-CN><en>The information mark is non-interactive visible decoration; the adjacent title continues to provide the complete textual meaning.</en></lang> -->
              <text class="home-page__data-notice-icon" aria-hidden="true">i</text>
              <view class="home-page__data-notice-copy">
                <text class="home-page__data-notice-title">{{ runtimeLocale.t('home.dataNoticeTitle') }}</text>
                <text class="home-page__data-notice-description">{{ runtimeLocale.t('home.dataNoticeDescription') }}</text>
              </view>
            </view>
          </u-alert-tips>
        </view>
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
import { getPresentationImage } from '../../data/asset-map.mjs';
import { openPrimaryPage, syncPrimaryTabChrome } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>首页只持有共享 demo 的受限公开 surface，不读取 dataset、provider host 或 request handle。</zh-CN><en>Home holds only the shared demo's bounded public surface and reads neither dataset, provider host, nor request handle.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>唯一共享 locale surface 为所有静态文案和领域投影提供当前单语言。</zh-CN><en>The sole shared locale surface supplies the current single language for all static copy and domain projection.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>hero 使用独立 presentation allowlist 中的双层公共阅览空间，不与精选场馆卡重复；未知 ID 时 UImage 显示受控 fallback。</zh-CN><en>The hero uses the double-height public reading space from the separate presentation allowlist without duplicating the featured venue card; UImage shows its controlled fallback for an unknown ID.</en></lang>
const heroImage = getPresentationImage('home-civic-reading-atrium');

// <lang><zh-CN>首页精选只读取当前 canonical page 的第一项，不复制领域对象或猜测第二项排序。</zh-CN><en>Home feature reads only the first item of the current canonical page and neither duplicates a domain object nor guesses a secondary ordering.</en></lang>
const featuredEntry = computed(() => demo.catalogEntries.value[0] ?? null);

// <lang><zh-CN>首次 idle/loading 且没有快照时呈现 D-1；同 scope 刷新若已有卡片则继续保留卡片，避免内容闪回骨架。</zh-CN><en>D-1 appears for initial idle/loading without a snapshot; a same-scope refresh with an existing card retains that card instead of flashing back to a skeleton.</en></lang>
const isCatalogPreparing = computed(() => (demo.catalogPhase.value === 'idle' || demo.catalogPhase.value === 'loading') && featuredEntry.value === null);

// <lang><zh-CN>首次失败只在没有可保留精选快照时成立；已有快照的同一 canonical failure 会走非阻断提示分支。</zh-CN><en>An initial failure exists only when no featured snapshot can be retained; the same canonical failure with a snapshot follows the non-blocking notice branch.</en></lang>
const isInitialCatalogFailure = computed(() => demo.catalogPhase.value === 'failure' && featuredEntry.value === null);

// <lang><zh-CN>D-2 action 严格服从 canonical outcome 的 retryable 标志，非可重试失败不生成误导按钮。</zh-CN><en>The D-2 action strictly follows the canonical outcome's retryable flag, so a non-retryable failure creates no misleading button.</en></lang>
const canRetryCatalogFailure = computed(() => isInitialCatalogFailure.value && demo.catalogFailure.value?.retryable === true);

// <lang><zh-CN>D-3 只接受 ready terminal 加空快照，idle/loading/failure 都不得被误报为成功空结果。</zh-CN><en>D-3 accepts only a ready terminal plus an empty snapshot; idle, loading, and failure must never be misreported as a successful empty result.</en></lang>
const isSuccessfulCatalogEmpty = computed(() => demo.catalogPhase.value === 'ready' && featuredEntry.value === null);

// <lang><zh-CN>刷新失败且已有精选快照时保留卡片，并只根据仍存在的 canonical failure 附加一条局部非阻断反馈。</zh-CN><en>A refresh failure with an existing featured snapshot retains the card and adds one local non-blocking feedback message only while the canonical failure remains present.</en></lang>
const hasRetainedFeaturedFailure = computed(() => demo.catalogFailure.value !== null && featuredEntry.value !== null);

// <lang><zh-CN>保留快照提示优先使用 facade outcome 的双语消息；极端缺失消息时回退到既有通用不可用文案，避免页面私自扩张错误语义。</zh-CN><en>The retained-snapshot notice prefers the facade outcome's bilingual message and falls back to the existing generic unavailable copy in the exceptional absence of a message, avoiding page-owned expansion of error semantics.</en></lang>
const retainedCatalogFailureMessage = computed(() => runtimeLocale.localize(demo.catalogFailure.value?.message) || runtimeLocale.t('common.notAvailable'));

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
/* <lang><zh-CN>首页采用设计板的紧凑纵向节奏，并为微信 official custom tabBar 或 H5 HIA-uView UTabbar 与安全区留出完整滚动空间。</zh-CN><en>Home adopts the board's compact vertical rhythm and reserves complete scroll space for either WeChat's official custom tab bar or H5's HIA-uView UTabbar plus the safe area.</en></lang> */
.home-page { box-sizing: border-box; min-height: 100%; padding: 20px var(--bp-page-inline, 16px) calc(var(--bp-shell-tabbar-height, 64px) + 24px + env(safe-area-inset-bottom)); background: var(--u-sys-color-surface); color: var(--u-sys-color-text); }
/* <lang><zh-CN>品牌栏是首页唯一顶部标题层；其宽度与高度稳定，不生成第二个居中标题。</zh-CN><en>The brand bar is Home's sole top-title layer; its width and height remain stable and create no second centered heading.</en></lang> */
.home-page__brand-bar { box-sizing: border-box; display: flex; align-items: center; gap: 10px; height: 100%; padding: 0 var(--bp-page-inline, 16px); overflow: hidden; background: var(--u-sys-color-surface); }
.home-page__brand { min-width: 0; overflow: hidden; color: var(--u-sys-color-action-primary); font-family: var(--bp-font-display, "HIA-uView BP Serif SC", "Source Han Serif SC", "Noto Serif SC", "Noto Serif CJK SC", serif); font-size: 21px; font-weight: 700; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
/* <lang><zh-CN>欢迎语采用思源宋体优先的展示栈；正文、按钮和导航继续继承思源黑体优先栈。</zh-CN><en>Welcome copy uses a Source Han Serif-first display stack while body copy, buttons, and navigation continue to inherit the Source Han Sans-first stack.</en></lang> */
.home-page__intro { display: flex; flex-direction: column; gap: 6px; }
.home-page__title { display: block; max-width: 100%; font-family: var(--bp-font-display, "HIA-uView BP Serif SC", "Source Han Serif SC", "Noto Serif SC", "Noto Serif CJK SC", serif); font-size: 26px; font-weight: 700; line-height: 1.38; letter-spacing: .01em; }
/* <lang><zh-CN>280px 宽度在已锁思源宋体子集中稳定形成设计板的中文 10+4 断行；英文不继承此限制。</zh-CN><en>A 280px width produces the board's stable Chinese 10+4 wrap with the pinned Source Han Serif subset; English does not inherit this limit.</en></lang> */
.home-page__title--zh-hans { max-width: 280px; }
.home-page__subtitle { display: block; color: var(--u-sys-color-text-secondary); font-size: 14px; line-height: 1.55; }
/* <lang><zh-CN>页面拥有 216px hero 几何，UImage 仅通过 fluid 填满，图片不再依靠深层选择器或覆盖文案。</zh-CN><en>The page owns 216px hero geometry and UImage only fills it through fluid, with no deep selector or overlaid copy.</en></lang> */
.home-page__hero { height: 216px; margin-top: 14px; overflow: hidden; border-radius: 16px; box-shadow: var(--bp-card-shadow, 0 2px 8px rgb(0 27 46 / 12%)); }
/* <lang><zh-CN>双入口等宽排列，主操作在左，图标与文字保持单行居中。</zh-CN><en>The two entries share equal width with the primary action on the left, keeping icon and copy centered on one line.</en></lang> */
.home-page__shortcuts { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; margin-top: 16px; }
.home-page__shortcut-icon { display: block; flex: 0 0 24px; height: 24px; width: 24px; }
/* <lang><zh-CN>8px 容器外距与 USection 内部 44px 居中行共同形成设计板约 18–22px 的按钮至标题可见间距。</zh-CN><en>An 8px container margin combines with USection's centered 44px row to produce the board's roughly 18–22px visible button-to-title gap.</en></lang> */
.home-page__featured { margin-top: 8px; }
/* <lang><zh-CN>恢复态与主态卡片共享 10px 区块内距；页面 wrapper 只负责位置，具体骨架与空态视觉继续由 HIA-uView 组件拥有。</zh-CN><en>Recovery states and the ready-state card share a 10px section gap; the page wrapper owns only placement while HIA-uView components retain skeleton and empty-state visuals.</en></lang> */
.home-page__state { box-sizing: border-box; display: flex; width: 100%; flex-direction: column; gap: 12px; margin-top: 10px; }
/* <lang><zh-CN>D-1 的页面自有卡面为 USkeleton 提供与精选卡一致的局部表面；它不改变 USkeleton 的公开 token 或内部节点。</zh-CN><en>D-1's page-owned card surface gives USkeleton a local surface aligned with the featured card without changing USkeleton's public tokens or internals.</en></lang> */
.home-page__state--loading { gap: 12px; height: 128px; min-height: 128px; overflow: hidden; padding: 0; border: 1px solid #f7f9fc; border-radius: 14px; background: var(--u-sys-color-surface-elevated, #ffffff); box-shadow: var(--bp-card-shadow, 0 2px 8px rgb(0 27 46 / 12%)); }
/* <lang><zh-CN>loading 文案从 40px avatar、12px 左内距与 12px gap 推导为 64px 左起点，并使用 Board D 冻结的 13/20 字体节奏。</zh-CN><en>Loading copy derives its 64px left origin from the 40px avatar, 12px inset, and 12px gap and uses Board D's frozen 13/20 type rhythm.</en></lang> */
.home-page__loading-copy { display: block; margin: 0 12px 0 64px; color: var(--u-sys-color-text-secondary, #27364a); font-size: 13px; font-weight: 400; line-height: 20px; }
/* <lang><zh-CN>页面 wrapper 冻结 D-2/D-3 的最小纵向占位；UEmpty 自身继续拥有实际 padding、边界、文案和 action 视觉。</zh-CN><en>The page wrapper freezes the minimum vertical footprint for D-2 and D-3 while UEmpty continues owning actual padding, border, copy, and action visuals.</en></lang> */
.home-page__state--terminal { min-height: 160px; }
/* <lang><zh-CN>页面只通过组件公开根 class 固定 D-2/D-3 的可用内容宽度，避免短文案触发 UEmpty 的 auto-margin 收窄；组件仍独占其 token、内部结构与行为。</zh-CN><en>The page fixes D-2/D-3 to the available content width only through the component's public root class, preventing short copy from shrinking UEmpty through auto margins; the component still owns its tokens, internals, and behavior.</en></lang> */
.home-page__terminal-panel { width: 100%; }
.home-page__featured-card { margin-top: 10px; }
/* <lang><zh-CN>刷新反馈位于保留卡片之前并提供固定间距；notice 自身仍是 inline、无计时器且不阻断卡片操作。</zh-CN><en>Refresh feedback precedes the retained card with a fixed gap; the notice itself remains inline, timer-free, and non-blocking to card operation.</en></lang> */
.home-page__refresh-notice { margin-bottom: 10px; }
/* <lang><zh-CN>native wrapper 独立提供 16px 卡片间距，避免 margin 落到小程序自定义组件宿主后失效。</zh-CN><en>The native wrapper independently supplies a 16px card gap, avoiding a margin that disappears when attached to a Mini Program custom-component host.</en></lang> */
.home-page__data-notice { box-sizing: border-box; margin-top: 16px; width: 100%; }
/* <lang><zh-CN>slot 内容显式采用思源黑体优先栈和设计板的信息色层级；页面只控制其自有节点，不改写 UAlertTips 内部选择器。</zh-CN><en>The slot content explicitly uses the Source Han Sans-first stack and the board's information-color hierarchy; the page controls only its own nodes and does not override UAlertTips internals.</en></lang> */
.home-page__data-notice-content { box-sizing: border-box; display: flex; align-items: flex-start; gap: 10px; width: 100%; color: var(--u-comp-alert-tips-foreground, #001b2e); font-family: "HIA-uView BP Sans SC", "Source Han Sans SC", "Noto Sans SC", "Noto Sans CJK SC", sans-serif; }
.home-page__data-notice-icon { display: block; flex: 0 0 18px; height: 18px; margin-top: 1px; border-radius: 50%; background: var(--u-sys-color-action-primary, #0047ab); color: var(--u-sys-color-on-action-primary, #ffffff); font-family: "HIA-uView BP Sans SC", "Source Han Sans SC", "Noto Sans SC", "Noto Sans CJK SC", sans-serif; font-size: 12px; font-weight: 700; line-height: 18px; text-align: center; }
.home-page__data-notice-copy { display: flex; flex: 1; flex-direction: column; gap: 4px; min-width: 0; font-family: inherit; }
.home-page__data-notice-title { display: block; color: var(--u-sys-color-action-primary, #0047ab); font-family: inherit; font-size: 14px; font-weight: 600; line-height: 1.4; }
.home-page__data-notice-description { display: block; color: var(--u-sys-color-text-secondary, #27364a); font-family: inherit; font-size: 13px; font-weight: 400; line-height: 1.55; }
/* <lang><zh-CN>微信原生菜单胶囊占据品牌栏右侧；本页只预留固定横向安全空间，纵向中心由页面壳的受限平台几何适配器负责。</zh-CN><en>The native WeChat menu capsule occupies the brand bar's right side; this page reserves only fixed horizontal safe space while the page shell's bounded platform-geometry adapter owns vertical centering.</en></lang> */
/* #ifdef MP-WEIXIN */
.home-page__brand-bar { padding: 0 116px 0 16px; background: #ffffff; }
.home-page { padding: 20px 16px calc(88px + env(safe-area-inset-bottom)); background: #ffffff; color: #001b2e; }
.home-page__brand { color: #0047ab; }
.home-page__subtitle { color: #27364a; }
/* #endif */
</style>
