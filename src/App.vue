<!--
@lang zh-CN BP 全局应用外壳：不声明自动登录、远端初始化、storage 恢复、平台 service 或全局事件监听。
@lang en Global BP application shell: declares no automatic login, remote initialization, storage recovery, platform service, or global event listener.
-->
<script>
export default {
  // <lang><zh-CN>保留空启动钩子以满足 UniApp 应用形状；不读取系统信息、写入 storage 或调用 API。</zh-CN><en>Retain an empty launch hook to satisfy the UniApp application shape; it reads no system information, writes no storage, and calls no API.</en></lang>
  onLaunch() {}
};
</script>

<style>
/* <lang><zh-CN>全局主题只由 `uni.scss` 显式导入；此壳不重复注入字体、图标、图片或外部样式。</zh-CN><en>The global theme is explicitly imported only by `uni.scss`; this shell injects no duplicate font, icon, image, or external style.</en></lang> */
</style>
