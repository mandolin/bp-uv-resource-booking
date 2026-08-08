<!--
@lang zh-CN BP 全局应用入口：只在 launch 初始化受限 runtime locale；可见 title 由各页面的 HIA-uView navbar 响应式呈现，主 tab 由平台管理 chrome 在页面 onShow 同步，不声明自动登录、远端初始化、业务 storage 恢复、网络或身份 service。
@lang en Global BP application entry: initializes only the constrained runtime locale; each page reactively renders its visible title through HIA-uView navbar, while platform-managed chrome synchronizes primary tabs on page show, and the entry declares no automatic login, remote initialization, business-storage recovery, network, or identity service.
-->
<script>
// <lang><zh-CN>只导入 BP 自有 locale 初始化；页面 navbar 与平台 tab bridge 在各自生命周期消费同一响应式 surface。</zh-CN><en>Import only BP-owned locale initialization; page navbar and the platform-tab bridge consume the same reactive surface in their respective lifecycles.</en></lang>
import { initializeRuntimeLocale } from './localization/runtime-locale.mjs';

export default {
  /**
   * <lang><zh-CN>在应用启动时建立当前会话的 locale。</zh-CN><en>Establishes the current-session locale at application launch.</en></lang>
   * @returns {void} <lang><zh-CN>无返回值；可选平台 API 缺失或失败不会阻断应用。</zh-CN><en>No return value; a missing or failed optional platform API never blocks the application.</en></lang>
   * @lang zh-CN 只读取规格允许的系统 language 和唯一 locale preference；不预取 catalog、执行预约写入或读取身份。
   * @lang en Reads only the spec-permitted system language and sole locale preference; it prefetches no catalog, performs no booking write, and reads no identity.
   */
  onLaunch() {
    // <lang><zh-CN>完成固定优先级解析，使正文、HIA-uView provider、页面标题与 tab labels 共享同一 canonical locale。</zh-CN><en>Resolve the fixed priority so body copy, HIA-uView provider, page titles, and tab labels share one canonical locale.</en></lang>
    initializeRuntimeLocale();
  }
};
</script>

<style>
/* <lang><zh-CN>全局主题只由 `uni.scss` 显式导入；此壳不重复注入字体、图标、图片或外部样式。</zh-CN><en>The global theme is explicitly imported only by `uni.scss`; this shell injects no duplicate font, icon, image, or external style.</en></lang> */
@import './uni.scss';
</style>
