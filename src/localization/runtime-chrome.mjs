/**
 * <lang><zh-CN>BP 的应用自管运行时壳模型：声明四个主页面、生成本地化 tab 项，并把有限导航意图投影到 UniApp；不依赖原生 tabbar、原生标题、网络、身份或业务状态。</zh-CN><en>Application-owned runtime-shell model for the BP: declares four primary pages, creates localized tab items, and projects bounded navigation intents to UniApp; it depends on no native tabbar, native title, network, identity, or business state.</en></lang>
 * @lang zh-CN 小程序不支持 `pages.json` 文案国际化，因此可见 title/tab 由 Vue 壳和 HIA-uView 组件直接消费 runtime locale；本模块只拥有固定路由，不接受动态 URL。
 * @lang en Mini Programs do not support `pages.json` copy internationalization, so visible titles/tabs are rendered by the Vue shell and HIA-uView components directly from runtime locale; this module owns fixed routes only and accepts no dynamic URL.
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
 * <lang><zh-CN>从当前 runtime translator 生成 HIA-uView `u-tabbar` 的单语言 items。</zh-CN><en>Creates single-language HIA-uView `u-tabbar` items from the current runtime translator.</en></lang>
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
 * <lang><zh-CN>以接近原生 tab 的语义打开一个固定主页面。</zh-CN><en>Opens a fixed primary page with semantics close to a native tab.</en></lang>
 * @param {unknown} pageValue <lang><zh-CN>来自受控 `u-tabbar` 或第一方页面 action 的候选 value。</zh-CN><en>Candidate value from the controlled `u-tabbar` or a first-party page action.</en></lang>
 * @param {unknown} [uniApi] <lang><zh-CN>可选 UniApp API 对象，用于运行时调用或测试替身。</zh-CN><en>Optional UniApp API object for runtime calls or a test double.</en></lang>
 * @returns {boolean} <lang><zh-CN>导航是否被同步接受。</zh-CN><en>Whether navigation was accepted synchronously.</en></lang>
 * @lang zh-CN `reLaunch` 清理详情页栈，模拟 tab 切换的顶层边界；共享 demo state 仍由应用级 module store 持有。
 * @lang en `reLaunch` clears the detail-page stack to model a top-level tab boundary; shared demo state remains owned by the application-level module store.
 */
export function openPrimaryPage(pageValue, uniApi = resolveRuntimeUniApi()) {
  // <lang><zh-CN>先验证有限 value，再读取固定 URL；未知输入绝不进入平台 API。</zh-CN><en>Validate the finite value before reading its fixed URL; unknown input never reaches the platform API.</en></lang>
  if (!isPrimaryPage(pageValue) || typeof uniApi?.reLaunch !== 'function') return false;

  // <lang><zh-CN>平台同步异常只使本次导航失败，不改写 locale、业务状态或其他路由。</zh-CN><en>A synchronous platform exception only fails this navigation and rewrites no locale, business state, or other route.</en></lang>
  try {
    uniApi.reLaunch({ url: PRIMARY_PAGE_BY_VALUE[pageValue].url });
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
