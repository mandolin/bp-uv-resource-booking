/**
 * <lang><zh-CN>微信自定义导航头几何适配器：只把当前窗口状态栏与原生菜单胶囊的同步读数收敛为可审计布局，不读取设备型号、身份、路由或业务状态。</zh-CN><en>WeChat custom-header geometry adapter: converges synchronous status-bar and native-menu-capsule readings into an auditable layout and reads no device model, identity, route, or business state.</en></lang>
 * @lang zh-CN 调用方显式注入有限平台 API；任何缺失、异常或畸形几何都返回 null，使页面壳继续使用静态跨端 fallback。
 * @lang en The caller explicitly injects a bounded platform API; any missing, throwing, or malformed geometry returns null so the page shell retains its static cross-platform fallback.
 */

// <lang><zh-CN>状态栏与导航栏采用宽松但有限的 CSS px 上界，拒绝把异常平台值变成任意页面尺寸。</zh-CN><en>Status and navigation bars use permissive but finite CSS-pixel upper bounds, preventing malformed platform values from becoming arbitrary page dimensions.</en></lang>
const MAX_STATUS_BAR_HEIGHT = 120;
const MAX_MENU_BUTTON_HEIGHT = 80;
const MAX_MENU_BUTTON_GAP = 48;
const MAX_NAVIGATION_BAR_HEIGHT = 112;

/**
 * @lang zh-CN 判断未知值是否为给定闭区间内的有限数字。
 * @lang en Determines whether an unknown value is a finite number inside the given closed interval.
 * @param {unknown} value <lang><zh-CN>待验证的平台几何值。</zh-CN><en>Platform geometry value to validate.</en></lang>
 * @param {number} minimum <lang><zh-CN>允许的最小值。</zh-CN><en>Allowed minimum.</en></lang>
 * @param {number} maximum <lang><zh-CN>允许的最大值。</zh-CN><en>Allowed maximum.</en></lang>
 * @returns {value is number} <lang><zh-CN>值可安全用于布局时为 true。</zh-CN><en>True when the value is safe for layout use.</en></lang>
 */
function isBoundedNumber(value, minimum, maximum) {
  // <lang><zh-CN>同时检查类型、有限性和范围，避免 NaN、Infinity 或字符串进入 CSS 投影。</zh-CN><en>Check type, finiteness, and range together so NaN, Infinity, or strings cannot enter the CSS projection.</en></lang>
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

/**
 * @lang zh-CN 从微信当前窗口与菜单胶囊读数计算状态栏和自定义导航栏高度。
 * @lang en Computes status-bar and custom-navigation heights from current WeChat window and menu-capsule readings.
 * @param {unknown} platformApi <lang><zh-CN>只需提供 getWindowInfo 与 getMenuButtonBoundingClientRect 的平台对象。</zh-CN><en>Platform object that only needs getWindowInfo and getMenuButtonBoundingClientRect.</en></lang>
 * @returns {{statusBarHeight: number, navigationBarHeight: number} | null} <lang><zh-CN>经验证的 CSS px 几何；不可用时为 null。</zh-CN><en>Validated CSS-pixel geometry, or null when unavailable.</en></lang>
 * @lang zh-CN 导航栏按胶囊上下留白对称计算，使自定义标题行中心与胶囊中心相同；本函数不缓存、监听或修改平台状态。
 * @lang en The navigation bar uses symmetric space above and below the capsule so the custom title-row center equals the capsule center; this function neither caches, observes, nor mutates platform state.
 */
export function resolveWeChatHeaderLayout(platformApi) {
  // <lang><zh-CN>平台对象与两个现代同步 API 都必须显式存在；不回退已废弃的 getSystemInfoSync。</zh-CN><en>The platform object and both modern synchronous APIs must explicitly exist; never fall back to deprecated getSystemInfoSync.</en></lang>
  if (!platformApi || typeof platformApi.getWindowInfo !== 'function' || typeof platformApi.getMenuButtonBoundingClientRect !== 'function') return null;

  try {
    // <lang><zh-CN>窗口信息只贡献当前状态栏高度，不读取设备品牌、型号或系统标识。</zh-CN><en>Window information contributes only the current status-bar height and reads no device brand, model, or system identifier.</en></lang>
    const windowInfo = platformApi.getWindowInfo();
    // <lang><zh-CN>菜单胶囊矩形只贡献 top 与 height，用于建立同中心的自定义导航栏。</zh-CN><en>The menu-capsule rectangle contributes only top and height to establish a center-aligned custom navigation bar.</en></lang>
    const menuButtonRect = platformApi.getMenuButtonBoundingClientRect();
    // <lang><zh-CN>在进行算术前逐一验证必要字段，避免隐式类型转换掩盖异常宿主值。</zh-CN><en>Validate every required field before arithmetic so implicit coercion cannot hide malformed host values.</en></lang>
    if (!isBoundedNumber(windowInfo?.statusBarHeight, 1, MAX_STATUS_BAR_HEIGHT)) return null;
    if (!isBoundedNumber(menuButtonRect?.top, windowInfo.statusBarHeight, windowInfo.statusBarHeight + MAX_MENU_BUTTON_GAP)) return null;
    if (!isBoundedNumber(menuButtonRect?.height, 1, MAX_MENU_BUTTON_HEIGHT)) return null;

    // <lang><zh-CN>胶囊顶边与状态栏底边之差成为上下相同的安全留白。</zh-CN><en>The difference between the capsule top and status-bar bottom becomes equal safe space above and below.</en></lang>
    const menuButtonGap = menuButtonRect.top - windowInfo.statusBarHeight;
    // <lang><zh-CN>对称导航高度令其中心恒等于胶囊中心，而不依赖设备常量或字体偏移。</zh-CN><en>The symmetric navigation height makes its center equal the capsule center without device constants or font offsets.</en></lang>
    const navigationBarHeight = menuButtonRect.height + (menuButtonGap * 2);
    // <lang><zh-CN>最终派生高度仍需单独受限，防止两个各自合格的边界值组合成异常栏高。</zh-CN><en>The final derived height remains independently bounded so two individually valid boundary values cannot combine into an abnormal bar height.</en></lang>
    if (!isBoundedNumber(navigationBarHeight, menuButtonRect.height, MAX_NAVIGATION_BAR_HEIGHT)) return null;

    // <lang><zh-CN>冻结小型返回对象，避免页面壳或测试意外改写同一读数。</zh-CN><en>Freeze the small result so neither the page shell nor tests can accidentally rewrite the same reading.</en></lang>
    return Object.freeze({
      statusBarHeight: windowInfo.statusBarHeight,
      navigationBarHeight
    });
  } catch {
    // <lang><zh-CN>平台读取失败只触发既有 fallback；适配器不记录设备信息，也不把异常升级为页面启动失败。</zh-CN><en>A platform-read failure only activates the existing fallback; the adapter records no device information and never escalates the exception into page-start failure.</en></lang>
    return null;
  }
}
