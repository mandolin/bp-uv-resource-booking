/**
 * <lang><zh-CN>锁定首页“数据来源说明”的页面自有间距与 slot 排版契约；测试只读取固定源码文件，不启动应用、访问网络或推断像素截图。</zh-CN><en>Locks the page-owned spacing and slot-layout contract for Home's data-source notice; the test reads only the fixed source file and neither starts the app, accesses the network, nor infers screenshot pixels.</en></lang>
 * @lang zh-CN 该门禁防止间距再次挂到微信自定义组件宿主上，并确保提示文字使用明确的思源黑体与信息色层级。
 * @lang en This gate prevents spacing from returning to a WeChat custom-component host and ensures the notice copy uses an explicit Source Han Sans stack and information-color hierarchy.
 */

// <lang><zh-CN>使用 Node 内建断言、文件读取与测试 runner，不引入视觉测试依赖。</zh-CN><en>Use Node built-in assertions, file access, and test runner without adding a visual-test dependency.</en></lang>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

/**
 * <lang><zh-CN>固定首页源码是当前提示结构和 scoped 样式的唯一检查输入。</zh-CN><en>The fixed Home source is the sole check input for the current notice structure and scoped styles.</en></lang>
 */
const homeSourceUrl = new URL('../src/pages/home/index.vue', import.meta.url);

test('home data notice retains native spacing and controlled typography', async function verifyHomeNoticePresentation() {
  // <lang><zh-CN>只读取仓内固定首页文件；测试不会枚举页面或跟随运行时路径。</zh-CN><en>Read only the fixed in-repository Home file; the test neither enumerates pages nor follows a runtime path.</en></lang>
  const homeSource = await readFile(homeSourceUrl, 'utf8');

  // <lang><zh-CN>native view 必须包住 UAlertTips，使 16px 间距不依赖小程序自定义组件宿主的 margin 行为。</zh-CN><en>A native view must wrap UAlertTips so the 16px gap does not depend on Mini Program custom-component host margin behavior.</en></lang>
  assert.match(homeSource, /<view class="home-page__data-notice">\s*<u-alert-tips show type="primary">/u);
  assert.match(homeSource, /\.home-page__data-notice\s*\{[^}]*margin-top:\s*16px;/u);

  // <lang><zh-CN>页面自有 slot 节点必须继续提供图标、标题和说明，避免穿透 UAlertTips 内部选择器。</zh-CN><en>Page-owned slot nodes must continue to provide the icon, title, and description, avoiding any penetration of UAlertTips internal selectors.</en></lang>
  assert.match(homeSource, /home-page__data-notice-icon/u);
  assert.match(homeSource, /home-page__data-notice-title/u);
  assert.match(homeSource, /home-page__data-notice-description/u);

  // <lang><zh-CN>slot 内容锁定思源黑体优先栈、品牌蓝标题和次级正文色，防止回退到组件默认字形或单一黑色。</zh-CN><en>The slot content locks a Source Han Sans-first stack, brand-blue title, and secondary body color, preventing a regression to component-default glyphs or one undifferentiated black.</en></lang>
  assert.match(homeSource, /\.home-page__data-notice-content\s*\{[^}]*color:\s*#27364a;[^}]*font-family:\s*"Source Han Sans SC"/u);
  assert.match(homeSource, /\.home-page__data-notice-title\s*\{[^}]*color:\s*#0047ab;[^}]*font-size:\s*14px;/u);
  assert.match(homeSource, /\.home-page__data-notice-description\s*\{[^}]*color:\s*#27364a;[^}]*font-size:\s*13px;/u);
});
