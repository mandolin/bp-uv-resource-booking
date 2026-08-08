/**
 * <lang><zh-CN>BP 的受限原生壳文本投影：同步 runtime locale 到 tab 和当前页面标题；不修改路由、全局配置、网络或业务状态。</zh-CN><en>Constrained native-shell copy projection for the BP: synchronizes runtime locale to tabs and current page title; it modifies no route, global configuration, network, or business state.</en></lang>
 * @lang zh-CN `pages.json` 中的中文只保留为原生 fallback，运行期可见文本必须经本模块更新。
 * @lang en Chinese in `pages.json` remains only as a native fallback; runtime-visible copy must be updated through this module.
 */

import { resolveRuntimeUniApi, useRuntimeLocale } from './runtime-locale.mjs';

/**
 * <lang><zh-CN>将固定 tab index 映射到第一方 locale resource key。</zh-CN><en>Maps fixed tab indices to first-party locale-resource keys.</en></lang>
 * @lang zh-CN 顺序与 `pages.json` 中的四个 tab 固定对应；不读取或枚举平台 tab 配置。
 * @lang en Order fixedly corresponds to the four tabs in `pages.json`; it reads or enumerates no platform tab configuration.
 */
const TAB_LABEL_KEYS = Object.freeze(['nav.home', 'nav.discover', 'nav.reservations', 'nav.profile']);

/**
 * <lang><zh-CN>等待 UniApp 完成当前页面与 native tabbar 初始化的最小壳投影延迟。</zh-CN><en>The minimum shell-projection delay that lets UniApp finish initializing the current page and native tabbar.</en></lang>
 * @lang zh-CN 这是一次性的生命周期协调，不是轮询、重试、网络等待或业务计时器。
 * @lang en This is one-shot lifecycle coordination, not polling, retrying, network waiting, or a business timer.
 */
const NATIVE_CHROME_DELAY_MS = 48;

/**
 * <lang><zh-CN>安全调用一个可选 UniApp 壳 API。</zh-CN><en>Safely calls one optional UniApp shell API.</en></lang>
 * @param {unknown} uniApi <lang><zh-CN>可选 UniApp API 对象。</zh-CN><en>Optional UniApp API object.</en></lang>
 * @param {'setTabBarItem'|'setNavigationBarTitle'} methodName <lang><zh-CN>allowlisted 平台方法名。</zh-CN><en>Allowlisted platform method name.</en></lang>
 * @param {object} payload <lang><zh-CN>固定结构的壳文本 payload。</zh-CN><en>Fixed-shape shell-copy payload.</en></lang>
 * @returns {boolean} <lang><zh-CN>调用是否没有同步异常；缺失或异常时为 `false`。</zh-CN><en>Whether the call had no synchronous exception; `false` when missing or exceptional.</en></lang>
 * @lang zh-CN 调用失败不能阻断页面渲染或改写 runtime locale；平台回退标题仍可使用。
 * @lang en A failed call cannot block page rendering or rewrite runtime locale; platform fallback titles remain usable.
 */
function callShellApi(uniApi, methodName, payload) {
  // <lang><zh-CN>只调用两个固定 API 之一，禁止方法名由页面、路由或用户输入提供。</zh-CN><en>Call only one of the two fixed APIs; method names cannot come from a page, route, or user input.</en></lang>
  try {
    if (typeof uniApi?.[methodName] !== 'function') return false;
    uniApi[methodName](payload);
    return true;
  } catch {
    return false;
  }
}

/**
 * <lang><zh-CN>投影四项 tab 文本到当前平台壳。</zh-CN><en>Projects four tab labels to the current platform shell.</en></lang>
 * @param {unknown} [uniApi] <lang><zh-CN>可选 UniApp API 对象。</zh-CN><en>Optional UniApp API object.</en></lang>
 * @returns {number} <lang><zh-CN>未同步异常的调用数量。</zh-CN><en>Number of calls without a synchronous exception.</en></lang>
 * @lang zh-CN 该函数只更新文字，不设置图标、颜色、路由或 tab 可见性。
 * @lang en This function updates only text and sets no icon, color, route, or tab visibility.
 */
export function applyRuntimeTabLabels(uniApi = resolveRuntimeUniApi()) {
  // <lang><zh-CN>读取唯一共享 locale store，保证 UI 内容与原生 tab 使用同一语言。</zh-CN><en>Read the sole shared locale store, ensuring UI content and native tabs use one language.</en></lang>
  const runtimeLocale = useRuntimeLocale();

  // <lang><zh-CN>在固定四项上累加成功结果，既不依赖数组外内容也不抛出页面错误。</zh-CN><en>Accumulate success results over the fixed four items, depending on no outside array content and throwing no page error.</en></lang>
  return TAB_LABEL_KEYS.reduce((appliedCount, key, index) => appliedCount + Number(callShellApi(uniApi, 'setTabBarItem', { index, text: runtimeLocale.t(key) })), 0);
}

/**
 * <lang><zh-CN>投影一个页面的本地化导航栏标题。</zh-CN><en>Projects one page's localized navigation-bar title.</en></lang>
 * @param {string} titleKey <lang><zh-CN>第一方声明的标题 resource key。</zh-CN><en>Title resource key declared by first party.</en></lang>
 * @param {unknown} [uniApi] <lang><zh-CN>可选 UniApp API 对象。</zh-CN><en>Optional UniApp API object.</en></lang>
 * @returns {boolean} <lang><zh-CN>调用是否没有同步异常。</zh-CN><en>Whether the call had no synchronous exception.</en></lang>
 * @lang zh-CN 标题 key 必须来自页面源码；本函数不读取 URL、路由参数或业务对象作为标题。
 * @lang en The title key must come from page source; this function reads no URL, route parameter, or business object as title.
 */
export function applyPageTitle(titleKey, uniApi = resolveRuntimeUniApi()) {
  // <lang><zh-CN>只传入当前 locale 的静态资源结果，避免将内部 key 或未知对象暴露到原生壳。</zh-CN><en>Pass only the current-locale static-resource result, avoiding exposure of an internal key or unknown object to the native shell.</en></lang>
  return callShellApi(uniApi, 'setNavigationBarTitle', { title: useRuntimeLocale().t(titleKey) });
}

/**
 * <lang><zh-CN>在 launch 或语言变更后同步应用的 tab 文本。</zh-CN><en>Synchronizes application tab text after launch or a language change.</en></lang>
 * @param {unknown} [uniApi] <lang><zh-CN>可选 UniApp API 对象。</zh-CN><en>Optional UniApp API object.</en></lang>
 * @returns {number} <lang><zh-CN>未同步异常的 tab 调用数量。</zh-CN><en>Number of tab calls without a synchronous exception.</en></lang>
 * @lang zh-CN 页面标题由各页面 `onShow` 调用 `applyPageTitle`，避免壳模块猜测当前 route。
 * @lang en Page titles call `applyPageTitle` from each page's `onShow`, preventing this shell module from guessing the current route.
 */
export function refreshRuntimeChrome(uniApi = resolveRuntimeUniApi()) {
  // <lang><zh-CN>当前壳只拥有四项 tab 投影，返回结果供测试验证而不用于业务流程。</zh-CN><en>The current shell owns only four-tab projection; return result supports tests and is unused by business flow.</en></lang>
  return applyRuntimeTabLabels(uniApi);
}

/**
 * <lang><zh-CN>在当前页面与 tabbar 完成初始渲染后投影 tab 文本和可选页面标题。</zh-CN><en>Projects tab copy and an optional page title after the current page and tabbar finish initial rendering.</en></lang>
 * @param {string|undefined} [titleKey] <lang><zh-CN>当前页面声明的 title resource key；缺失时只更新 tab。</zh-CN><en>Title resource key declared by the current page; when absent, updates tabs only.</en></lang>
 * @param {unknown} [uniApi] <lang><zh-CN>可选的已解析 UniApp 平台对象。</zh-CN><en>Optional resolved UniApp platform object.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值；投影失败保留原生 fallback，不阻断页面。</zh-CN><en>No return value; a failed projection retains native fallback and never blocks the page.</en></lang>
 * @lang zh-CN DCloud 要求在 native tabbar 已渲染后更新 tab，且 `onShow` 更新标题需稍后执行以免被框架覆盖；本函数把这两个固定规则收敛在唯一受控位置。
 * @lang en DCloud requires updating native tabs after they render and delaying an `onShow` title update so the framework does not overwrite it; this function centralizes both fixed rules in one controlled location.
 */
export function scheduleRuntimeChrome(titleKey, uniApi = resolveRuntimeUniApi()) {
  // <lang><zh-CN>title key 只能是页面源码传入的 string；未知形状不传给 native shell。</zh-CN><en>A title key may only be a string supplied by page source; an unknown shape is never passed to the native shell.</en></lang>
  const safeTitleKey = typeof titleKey === 'string' ? titleKey : undefined;

  // <lang><zh-CN>只排入一次固定短延迟；回调只调用 allowlisted 壳 API，不读取路由、网络或业务数据。</zh-CN><en>Schedule one fixed short delay only; the callback calls allowlisted shell APIs and reads no route, network, or business data.</en></lang>
  setTimeout(() => {
    // <lang><zh-CN>tab 与标题使用调用时的同一 locale store，避免页面内容和 native chrome 在切换后分属不同语言。</zh-CN><en>Tabs and title use the same locale store at call time, preventing page content and native chrome from belonging to different languages after a switch.</en></lang>
    refreshRuntimeChrome(uniApi);
    if (safeTitleKey) applyPageTitle(safeTitleKey, uniApi);
  }, NATIVE_CHROME_DELAY_MS);
}
