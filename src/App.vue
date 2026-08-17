<!--
@lang zh-CN BP 全局应用入口：在 launch 初始化受限 runtime locale，并尽早请求 H5 隐藏已声明的原生 tab 表面；确定性的首帧隐藏与空间回收由全局 H5 CSS 负责，HIA-uView 应用适配器负责可见底栏。微信 official custom tabBar 不受影响，入口不声明自动登录、远端初始化、业务 storage 恢复、网络或身份 service。
@lang en Global BP application entry: initializes the constrained runtime locale at launch and requests early hiding of the declared native H5 tab surface; global H5 CSS owns deterministic first-frame hiding and space reclamation, while the HIA-uView application adapter owns the visible bar. WeChat's official custom tab bar is unaffected, and the entry declares no automatic login, remote initialization, business-storage recovery, network, or identity service.
-->
<script>
// <lang><zh-CN>只导入 BP 自有 locale 初始化；页面 navbar 与平台 tab bridge 在各自生命周期消费同一响应式 surface。</zh-CN><en>Import only BP-owned locale initialization; page navbar and the platform-tab bridge consume the same reactive surface in their respective lifecycles.</en></lang>
import { initializeRuntimeLocale } from './localization/runtime-locale.mjs';

/**
 * @lang zh-CN 在 H5 最早生命周期向 Uni 提交隐藏原生 tab 表面的 best-effort 请求；首帧与预留空间仍由 `uni.scss` 的静态 H5 规则保证。
 * @lang en Submits a best-effort request to hide Uni's native tab surface at the earliest H5 lifecycle; static H5 rules in `uni.scss` still guarantee the first frame and reserved-space behavior.
 * @returns {boolean} <lang><zh-CN>是否向 H5 API 提交隐藏请求；微信与其他编译目标为 false。</zh-CN><en>Whether a hide request was submitted to the H5 API; false for WeChat and other build targets.</en></lang>
 */
function hideNativeH5TabBar() {
  // <lang><zh-CN>默认保持零副作用；只有 H5 条件编译保留下方平台调用。</zh-CN><en>Default to zero side effects; only H5 conditional compilation retains the platform call below.</en></lang>
  let requestSubmitted = false;

  // #ifdef H5
  try {
    // <lang><zh-CN>无动画请求可能早于宿主 tab 实例就绪；失败回调保持零产品副作用，确定性隐藏由 CSS gate 补足。</zh-CN><en>The nonanimated request may precede host-tab readiness; its failure callback has zero product side effects and the CSS gate supplies deterministic hiding.</en></lang>
    uni.hideTabBar({ animation: false, fail: () => {} });
    // <lang><zh-CN>同步接受只表示请求已提交，不宣称宿主已完成渲染。</zh-CN><en>Synchronous acceptance means only that the request was submitted and does not claim host rendering has completed.</en></lang>
    requestSubmitted = true;
  } catch {
    // <lang><zh-CN>旧 H5 宿主缺少 API 时安全降级；页面正文和路由仍可用。</zh-CN><en>An older H5 host without the API degrades safely; page content and routing remain available.</en></lang>
    requestSubmitted = false;
  }
  // #endif

  // <lang><zh-CN>返回仅供诊断的同步事实，不进入产品状态。</zh-CN><en>Return a synchronous diagnostic fact that never enters product state.</en></lang>
  return requestSubmitted;
}

export default {
  /**
   * <lang><zh-CN>在应用启动时建立当前会话的 locale。</zh-CN><en>Establishes the current-session locale at application launch.</en></lang>
   * @returns {void} <lang><zh-CN>无返回值；可选平台 API 缺失或失败不会阻断应用。</zh-CN><en>No return value; a missing or failed optional platform API never blocks the application.</en></lang>
   * @lang zh-CN 只读取规格允许的系统 language 和唯一 locale preference；不预取 catalog、执行预约写入或读取身份。
   * @lang en Reads only the spec-permitted system language and sole locale preference; it prefetches no catalog, performs no booking write, and reads no identity.
   */
  onLaunch() {
    // <lang><zh-CN>先提交 H5 原生表面隐藏请求；静态 CSS 已在渲染前承担首帧兜底。</zh-CN><en>Submit the H5 native-surface hide request first; static CSS already owns the pre-render first-frame fallback.</en></lang>
    hideNativeH5TabBar();
    // <lang><zh-CN>完成固定优先级解析，使正文、HIA-uView provider、页面标题与 tab labels 共享同一 canonical locale。</zh-CN><en>Resolve the fixed priority so body copy, HIA-uView provider, page titles, and tab labels share one canonical locale.</en></lang>
    initializeRuntimeLocale();
  }
};
</script>

<style lang="scss">
/* <lang><zh-CN>此空 SCSS 编译单元只触发 UniApp 对特殊 `uni.scss` 的单次标准预注入；禁止在此再次 `@import`，否则全局主题与字体规则会重复。</zh-CN><en>This empty SCSS compilation unit only triggers UniApp's single standard pre-injection of the special `uni.scss`; do not `@import` it again here, or global theme and font rules will be duplicated.</en></lang> */
</style>
