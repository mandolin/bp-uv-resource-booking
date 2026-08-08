/**
 * <lang><zh-CN>BP 的应用自管运行时壳模型：声明四个主页面、生成本地化 tab 项，并把有限导航意图投影到 UniApp；不依赖原生标题、网络、身份或业务状态。</zh-CN><en>Application-owned runtime-shell model for the BP: declares four primary pages, creates localized tab items, and projects bounded navigation intents to UniApp; it depends on no native title, network, identity, or business state.</en></lang>
 * @lang zh-CN 微信端使用官方 custom tabBar 容器保持切换期间常驻，其他支持宿主可使用平台 tabBar；本模块只拥有固定路由和受限文案同步，不接受动态 URL。
 * @lang en WeChat uses the official custom-tabBar container to remain mounted during switches, while other supporting hosts may use platform tabBar; this module owns only fixed routes and bounded copy synchronization and accepts no dynamic URL.
 */

// <lang><zh-CN>复用唯一受限 UniApp API 解析入口；不在模块加载时捕获平台对象。</zh-CN><en>Reuse the sole bounded UniApp-API resolver and do not capture the platform object at module load.</en></lang>
import { resolveRuntimeUniApi } from './runtime-locale.mjs';

/**
 * <lang><zh-CN>四个主页面的冻结应用壳声明。</zh-CN><en>Frozen application-shell declarations for the four primary pages.</en></lang>
 * @lang zh-CN value、message key 和本地 URL 都由第一方源码固定，不能由 manifest、query、远端数据或用户输入扩展。
 * @lang en Values, message keys, and local URLs are fixed by first-party source and cannot be extended by a manifest, query, remote data, or user input.
 */
export const PRIMARY_PAGE_SPECS = Object.freeze([
  Object.freeze({ value: 'home', labelKey: 'nav.home', url: '/pages/home/index' }),
  Object.freeze({ value: 'discover', labelKey: 'nav.discover', url: '/pages/discover/index' }),
  Object.freeze({ value: 'reservations', labelKey: 'nav.reservations', url: '/pages/reservations/index' }),
  Object.freeze({ value: 'profile', labelKey: 'nav.profile', url: '/pages/profile/index' })
]);

/**
 * <lang><zh-CN>按主页面 value 建立的只读有限查找表。</zh-CN><en>Readonly finite lookup table keyed by primary-page value.</en></lang>
 * @lang zh-CN 查找表只从同文件冻结声明生成，避免调用方提供 URL 或将未知 tab 当成页面。
 * @lang en The lookup is created only from frozen declarations in this file, preventing callers from supplying URLs or treating an unknown tab as a page.
 */
const PRIMARY_PAGE_BY_VALUE = Object.freeze(Object.fromEntries(PRIMARY_PAGE_SPECS.map((pageSpec) => [pageSpec.value, pageSpec])));

/**
 * <lang><zh-CN>判断一个未知值是否为应用声明的主页面。</zh-CN><en>Determines whether an unknown value is an application-declared primary page.</en></lang>
 * @param {unknown} value <lang><zh-CN>待验证的 tab/page value。</zh-CN><en>Tab/page value to validate.</en></lang>
 * @returns {boolean} <lang><zh-CN>仅在有限声明中存在时为 true。</zh-CN><en>True only when present in the finite declaration.</en></lang>
 * @lang zh-CN 本函数不规范化、拼接或猜测未知值。
 * @lang en This function does not normalize, concatenate, or guess an unknown value.
 */
export function isPrimaryPage(value) {
  // <lang><zh-CN>只有 string 且为查找表自有键时才通过，拒绝原型链与隐式类型转换。</zh-CN><en>Pass only a string that is an own lookup key, rejecting prototype-chain and implicit type coercion.</en></lang>
  return typeof value === 'string' && Object.hasOwn(PRIMARY_PAGE_BY_VALUE, value);
}

/**
 * <lang><zh-CN>从当前 runtime translator 生成平台/HIA-uView tab chrome 共用的单语言 items。</zh-CN><en>Creates single-language items shared by platform and HIA-uView tab chrome from the current runtime translator.</en></lang>
 * @param {(messageKey: string) => string} translate <lang><zh-CN>唯一 runtime locale store 的静态资源翻译函数。</zh-CN><en>Static-resource translator from the sole runtime locale store.</en></lang>
 * @returns {ReadonlyArray<{value: string, label: string}>} <lang><zh-CN>固定顺序的冻结 tab 项。</zh-CN><en>Frozen tab items in fixed order.</en></lang>
 * @lang zh-CN label key 来自第一方声明；translate 不接收路由、query、领域对象或远端数据。
 * @lang en Label keys come from first-party declarations; translate receives no route, query, domain object, or remote data.
 */
export function createPrimaryTabItems(translate) {
  // <lang><zh-CN>缺少 translator 时返回空冻结列表，使展示层安全不呈现未知或默认混排文案。</zh-CN><en>Return an empty frozen list when the translator is absent so the presentation layer safely renders no unknown or mixed default copy.</en></lang>
  if (typeof translate !== 'function') return Object.freeze([]);

  // <lang><zh-CN>逐项只投影稳定 value 与当前 locale label，不暴露内部 URL 给 UI 组件。</zh-CN><en>Project only stable values and current-locale labels, exposing no internal URL to the UI component.</en></lang>
  return Object.freeze(PRIMARY_PAGE_SPECS.map((pageSpec) => Object.freeze({
    value: pageSpec.value,
    label: translate(pageSpec.labelKey)
  })));
}

/**
 * <lang><zh-CN>读取当前微信页面栈，供 custom tabBar 的页面实例同步使用。</zh-CN><en>Reads the current WeChat page stack for custom-tabBar page-instance synchronization.</en></lang>
 * @returns {unknown[]} <lang><zh-CN>可用页面数组；宿主缺失或读取失败时为空数组。</zh-CN><en>Available page array, or an empty array when the host is absent or reading fails.</en></lang>
 * @lang zh-CN 本函数只调用无参数 `getCurrentPages`，不读取页面 data、query、referrer 或用户内容。
 * @lang en This function calls only zero-argument `getCurrentPages` and reads no page data, query, referrer, or user content.
 */
function readCurrentPageStack() {
  try {
    // <lang><zh-CN>优先使用小程序模块级全局函数；兼容测试或 H5 显式提供的 global fallback。</zh-CN><en>Prefer the Mini Program module-level global and support an explicit global fallback for tests or H5.</en></lang>
    const readPages = typeof getCurrentPages === 'function' ? getCurrentPages : globalThis.getCurrentPages;
    const pages = typeof readPages === 'function' ? readPages() : [];
    return Array.isArray(pages) ? pages : [];
  } catch {
    return [];
  }
}

/**
 * <lang><zh-CN>同步当前主页面、locale 与四项单语言 label 到平台管理的 tab chrome。</zh-CN><en>Synchronizes the current primary page, locale, and four single-language labels into platform-managed tab chrome.</en></lang>
 * @param {unknown} pageValue <lang><zh-CN>第一方主页面 value。</zh-CN><en>First-party primary-page value.</en></lang>
 * @param {unknown} locale <lang><zh-CN>共享 runtime locale 的候选值。</zh-CN><en>Candidate value from the shared runtime locale.</en></lang>
 * @param {(messageKey: string) => string} translate <lang><zh-CN>共享 runtime translator。</zh-CN><en>Shared runtime translator.</en></lang>
 * @param {{ pages?: unknown[], uniApi?: unknown, weChat?: boolean }} [adapters] <lang><zh-CN>测试可注入的受限宿主替身。</zh-CN><en>Bounded host doubles injectable by tests.</en></lang>
 * @returns {boolean} <lang><zh-CN>custom 或 native tab chrome 是否同步接受。</zh-CN><en>Whether custom or native tab chrome accepted synchronization.</en></lang>
 * @lang zh-CN 微信优先调用当前 tab 页的 `getTabBar().setData`，不调用受 tourist appid 限制的 native label API；非微信宿主才逐项尝试 `setTabBarItem`。
 * @lang en WeChat first calls the current tab page's `getTabBar().setData` and avoids native label APIs constrained by tourist appid; only non-WeChat hosts try `setTabBarItem` item by item.
 */
export function syncPrimaryTabChrome(pageValue, locale, translate, adapters = {}) {
  // <lang><zh-CN>主页面与 translator 必须同时通过有限 gate，未知输入不得触达平台。</zh-CN><en>The primary page and translator must both pass finite gates; unknown input never reaches the platform.</en></lang>
  if (!isPrimaryPage(pageValue) || typeof translate !== 'function') return false;

  // <lang><zh-CN>custom tabBar 只区分当前支持的两个 canonical locale，其他值确定性回退简体中文。</zh-CN><en>The custom tabBar distinguishes only the two currently supported canonical locales and deterministically falls back to Simplified Chinese.</en></lang>
  const canonicalLocale = locale === 'en' ? 'en' : 'zh-Hans';
  const pages = Array.isArray(adapters.pages) ? adapters.pages : readCurrentPageStack();

  // <lang><zh-CN>微信每个 tab 页拥有自己的 custom-tab-bar 实例；在 onShow 更新当前实例可保持常驻并校正选中态。</zh-CN><en>Each WeChat tab page owns a custom-tab-bar instance; updating the current instance on show retains the chrome and corrects selection.</en></lang>
  try {
    const currentPage = pages.at(-1);
    const customTabBar = typeof currentPage?.getTabBar === 'function' ? currentPage.getTabBar() : null;
    if (typeof customTabBar?.setData === 'function') {
      customTabBar.setData({ selected: pageValue, locale: canonicalLocale });
      return true;
    }
  } catch {
    return false;
  }

  // <lang><zh-CN>微信 custom 实例尚未就绪时保持安全无操作，避免退回会被 tourist appid 拒绝的 native API。</zh-CN><en>Remain a safe no-op while a WeChat custom instance is not ready, avoiding fallback to native APIs rejected by tourist appid.</en></lang>
  const isWeChat = typeof adapters.weChat === 'boolean' ? adapters.weChat : typeof wx !== 'undefined';
  if (isWeChat) return false;

  // <lang><zh-CN>H5 等非微信宿主使用已声明 tabBar 的公开 API 更新四项文案；任何一项异常都返回失败但不影响正文 locale。</zh-CN><en>Non-WeChat hosts such as H5 update all four labels through the declared tabBar's public API; an exception returns failure without affecting body locale.</en></lang>
  const uniApi = adapters.uniApi ?? resolveRuntimeUniApi();
  if (typeof uniApi?.setTabBarItem !== 'function') return false;
  try {
    createPrimaryTabItems(translate).forEach((item, index) => uniApi.setTabBarItem({ index, text: item.label }));
    return true;
  } catch {
    return false;
  }
}

/**
 * <lang><zh-CN>以接近原生 tab 的语义打开一个固定主页面。</zh-CN><en>Opens a fixed primary page with semantics close to a native tab.</en></lang>
 * @param {unknown} pageValue <lang><zh-CN>来自受控 tab chrome 或第一方页面 action 的候选 value。</zh-CN><en>Candidate value from controlled tab chrome or a first-party page action.</en></lang>
 * @param {unknown} [uniApi] <lang><zh-CN>可选 UniApp API 对象，用于运行时调用或测试替身。</zh-CN><en>Optional UniApp API object for runtime calls or a test double.</en></lang>
 * @returns {boolean} <lang><zh-CN>导航是否被同步接受。</zh-CN><en>Whether navigation was accepted synchronously.</en></lang>
 * @lang zh-CN `switchTab` 委托平台保持底栏与已访问主页面实例；共享 demo state 仍由应用级 module store 持有。
 * @lang en `switchTab` delegates retention of the tabbar and visited primary-page instances to the platform; shared demo state remains owned by the application-level module store.
 */
export function openPrimaryPage(pageValue, uniApi = resolveRuntimeUniApi()) {
  // <lang><zh-CN>先验证有限 value，再读取固定 URL；未知输入绝不进入平台 API。</zh-CN><en>Validate the finite value before reading its fixed URL; unknown input never reaches the platform API.</en></lang>
  if (!isPrimaryPage(pageValue) || typeof uniApi?.switchTab !== 'function') return false;

  // <lang><zh-CN>平台同步异常只使本次导航失败，不改写 locale、业务状态或其他路由。</zh-CN><en>A synchronous platform exception only fails this navigation and rewrites no locale, business state, or other route.</en></lang>
  try {
    uniApi.switchTab({ url: PRIMARY_PAGE_BY_VALUE[pageValue].url });
    return true;
  } catch {
    return false;
  }
}

/**
 * <lang><zh-CN>尝试返回上一页，并在页面栈不可返回时打开固定主页面。</zh-CN><en>Attempts to return to the previous page and opens a fixed primary page when the stack cannot go back.</en></lang>
 * @param {unknown} fallbackPageValue <lang><zh-CN>页面源码声明的有限 fallback 主页面 value。</zh-CN><en>Finite fallback primary-page value declared by page source.</en></lang>
 * @param {unknown} [uniApi] <lang><zh-CN>可选 UniApp API 对象，用于运行时调用或测试替身。</zh-CN><en>Optional UniApp API object for runtime calls or a test double.</en></lang>
 * @returns {boolean} <lang><zh-CN>返回或 fallback 是否被同步接受。</zh-CN><en>Whether back or fallback was accepted synchronously.</en></lang>
 * @lang zh-CN 回退始终为 delta=1；异步 fail 回调只能进入同一固定主页面 allowlist。
 * @lang en Back is always delta=1; the asynchronous fail callback can enter only the same fixed primary-page allowlist.
 */
export function navigateBackOrOpenPrimaryPage(fallbackPageValue, uniApi = resolveRuntimeUniApi()) {
  // <lang><zh-CN>无 navigateBack 时直接执行受限 fallback，适配从分享/刷新直接进入的页面。</zh-CN><en>When navigateBack is unavailable, run the bounded fallback directly, accommodating pages entered from a share or refresh.</en></lang>
  if (typeof uniApi?.navigateBack !== 'function') return openPrimaryPage(fallbackPageValue, uniApi);

  // <lang><zh-CN>把异步失败处理收敛为同一 allowlisted helper，且同步异常同样进入该 fallback。</zh-CN><en>Constrain asynchronous failure handling to the same allowlisted helper, and route a synchronous exception to that fallback as well.</en></lang>
  try {
    uniApi.navigateBack({
      delta: 1,
      fail: () => openPrimaryPage(fallbackPageValue, uniApi)
    });
    return true;
  } catch {
    return openPrimaryPage(fallbackPageValue, uniApi);
  }
}
