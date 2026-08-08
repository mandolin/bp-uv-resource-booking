<!--
@lang zh-CN BP 全局应用外壳：只在 launch 初始化受限 runtime locale 并投影 tab 文本；不声明自动登录、远端初始化、业务 storage 恢复、网络或身份 service。
@lang en Global BP application shell: initializes constrained runtime locale and projects tab copy only at launch; it declares no automatic login, remote initialization, business-storage recovery, network, or identity service.
-->
<script>
// <lang><zh-CN>导入 BP 自有 locale 初始化与壳投影；二者不创建业务 provider、写入预约或调用网络。</zh-CN><en>Import BP-owned locale initialization and shell projection; neither creates a business provider, writes bookings, nor calls a network.</en></lang>
import { initializeRuntimeLocale } from './localization/runtime-locale.mjs';
import { scheduleRuntimeChrome } from './localization/runtime-chrome.mjs';

export default {
  /**
   * <lang><zh-CN>在应用启动时建立当前会话的 locale 并同步 native tab 标签。</zh-CN><en>Establishes the current-session locale and synchronizes native tab labels at application launch.</en></lang>
   * @returns {void} <lang><zh-CN>无返回值；可选平台 API 缺失或失败不会阻断应用。</zh-CN><en>No return value; a missing or failed optional platform API never blocks the application.</en></lang>
   * @lang zh-CN 只读取规格允许的系统 language 和唯一 locale preference；不预取 catalog、执行预约写入或读取身份。
   * @lang en Reads only the spec-permitted system language and sole locale preference; it prefetches no catalog, performs no booking write, and reads no identity.
   */
  onLaunch() {
    // <lang><zh-CN>先完成固定优先级解析，确保 UI 与随后 tab 投影共享同一 canonical locale。</zh-CN><en>Resolve the fixed priority first, ensuring UI and subsequent tab projection share one canonical locale.</en></lang>
    initializeRuntimeLocale();

    // <lang><zh-CN>等待原生 tabbar 初始化后再投影文本；页面自身在 show 时补投影 title。</zh-CN><en>Wait for native tabbar initialization before projecting copy; each page projects its title again when shown.</en></lang>
    scheduleRuntimeChrome();
  }
};
</script>

<style>
/* <lang><zh-CN>全局主题只由 `uni.scss` 显式导入；此壳不重复注入字体、图标、图片或外部样式。</zh-CN><en>The global theme is explicitly imported only by `uni.scss`; this shell injects no duplicate font, icon, image, or external style.</en></lang> */
@import './uni.scss';
</style>
