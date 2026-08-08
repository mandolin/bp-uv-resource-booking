/**
 * <lang><zh-CN>BP 的 UniApp Vue 3 入口：仅创建当前 App，不注册全局 UI plugin、router、store、身份、网络或平台 service。</zh-CN><en>UniApp Vue 3 entry for the BP: creates only the current App and registers no global UI plugin, router, store, identity, network, or platform service.</en></lang>
 * @lang zh-CN HIA-uView UI 与 Biz runtime 由 `package.json` 显式声明为锁定本地 package；小程序 UI 叶级 SFC 通过受控 easycom 映射静态解析，主题由 `uni.scss` 显式引入。
 * @lang en HIA-uView UI and Biz runtime are explicitly declared as pinned local packages in `package.json`; controlled easycom mapping statically resolves Mini Program leaf SFCs, and `uni.scss` explicitly includes the theme.
 */

// <lang><zh-CN>使用官方 UniApp Vue 3 app factory，不引入额外 runtime wrapper。</zh-CN><en>Use the official UniApp Vue 3 app factory and introduce no additional runtime wrapper.</en></lang>
import { createSSRApp } from 'vue';
import App from './App.vue';

/**
 * <lang><zh-CN>创建 BP 的唯一 UniApp 应用实例。</zh-CN><en>Creates the BP's sole UniApp application instance.</en></lang>
 * @returns {object} <lang><zh-CN>仅含官方 `app` 的 entry container。</zh-CN><en>Entry container containing only the official `app`.</en></lang>
 * @lang zh-CN 此函数不读取 data source、不启动预取或加载用户状态；各页面自主请求其受限 local provider。
 * @lang en This function reads no data source and starts no prefetch or user-state load; each page requests its bounded local provider independently.
 */
export function createApp() {
  // <lang><zh-CN>创建 SSR-compatible app，不启动开发服务器、设备连接、微信开发工具或网络活动。</zh-CN><en>Create the SSR-compatible app and start no dev server, device connection, WeChat DevTools, or network activity.</en></lang>
  const app = createSSRApp(App);

  // <lang><zh-CN>遵循 UniApp Vue 3 entry 约定，返回最小 app container。</zh-CN><en>Follow the UniApp Vue 3 entry convention and return the minimum app container.</en></lang>
  return { app };
}
