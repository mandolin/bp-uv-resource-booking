/**
 * <lang><zh-CN>验证已生成微信小程序的应用自管 title/tab 壳：六页必须关闭原生导航、引用页面壳，页面壳必须解析 HIA-uView navbar/tabbar 并显式传入 visible；脚本只读固定 `dist/build/mp-weixin`。</zh-CN><en>Verifies the generated WeChat Mini Program's application-owned title/tab shell: all six pages must disable native navigation and reference the page shell, while the shell must resolve HIA-uView navbar/tabbar and pass visible explicitly; the script reads only fixed `dist/build/mp-weixin`.</en></lang>
 * @lang zh-CN 本门禁验证编译产物契约，不替代开发者工具中的实际布局、点击、语言切换和安全区视觉检查。
 * @lang en This gate verifies the compiled-artifact contract and does not replace actual layout, clicks, language switching, and safe-area visual inspection in Developer Tools.
 */

// <lang><zh-CN>只使用 Node 内建文件与路径 API，不执行产物或连接微信开发者工具。</zh-CN><en>Use only Node built-in file and path APIs; execute no artifact and connect to no WeChat Developer Tools.</en></lang>
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// <lang><zh-CN>从脚本位置解析固定 BP 根和微信构建根，拒绝 CLI 指定任意目录。</zh-CN><en>Resolve the fixed BP root and WeChat build root from the script location, rejecting arbitrary CLI-supplied directories.</en></lang>
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, 'dist/build/mp-weixin');

/**
 * <lang><zh-CN>六个已审阅页面的固定生成路径。</zh-CN><en>Fixed generated paths for the six reviewed pages.</en></lang>
 * @lang zh-CN 列表与 `pages.json` 对齐，不从构建目录动态发现页面或第三方组件。
 * @lang en The list aligns with `pages.json` and dynamically discovers neither pages nor third-party components from the build directory.
 */
const pagePaths = Object.freeze([
  'pages/home/index',
  'pages/discover/index',
  'pages/reservations/index',
  'pages/profile/index',
  'pages/resource-detail/index',
  'pages/booking-confirm/index'
]);

/**
 * <lang><zh-CN>读取固定生成 JSON。</zh-CN><en>Reads a fixed generated JSON file.</en></lang>
 * @param {string} relativePath <lang><zh-CN>由本脚本声明的构建内相对路径。</zh-CN><en>Build-relative path declared by this script.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>已解析对象。</zh-CN><en>Parsed object.</en></lang>
 * @lang zh-CN JSON 解析失败直接使构建失败，不容错为缺失配置。
 * @lang en A JSON parse failure fails the build directly and is never tolerated as missing configuration.
 */
async function readOutputJson(relativePath) {
  // <lang><zh-CN>路径只由固定 output root 与声明相对路径组成。</zh-CN><en>The path consists only of the fixed output root and declared relative path.</en></lang>
  return JSON.parse(await readFile(resolve(outputRoot, relativePath), 'utf8'));
}

/**
 * <lang><zh-CN>验证应用自管壳确实进入微信构建产物。</zh-CN><en>Verifies that the application-owned shell actually enters the WeChat build artifact.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>全部契约成立后 resolve。</zh-CN><en>Resolves after every contract holds.</en></lang>
 * @lang zh-CN 输出错误只含稳定构建相对路径或契约名称，不输出用户数据、环境变量或源码正文。
 * @lang en Errors contain only stable build-relative paths or contract names and output no user data, environment variable, or source body.
 */
async function verifyGeneratedRuntimeShell() {
  // <lang><zh-CN>根产物不得恢复 native tabBar；可见 tab 只能来自 HIA-uView 页面壳。</zh-CN><en>The root artifact must not restore native tabBar; visible tabs may come only from the HIA-uView page shell.</en></lang>
  const appConfiguration = await readOutputJson('app.json');
  if (Object.prototype.hasOwnProperty.call(appConfiguration, 'tabBar')) {
    throw new Error('Generated app.json unexpectedly contains native tabBar.');
  }

  // <lang><zh-CN>每页必须同时保持 custom navigation 和编译后的 RuntimePageShell 引用。</zh-CN><en>Every page must retain both custom navigation and a compiled RuntimePageShell reference.</en></lang>
  for (const pagePath of pagePaths) {
    const pageConfiguration = await readOutputJson(`${pagePath}.json`);
    if (pageConfiguration.navigationStyle !== 'custom' || !pageConfiguration.usingComponents?.['runtime-page-shell']) {
      throw new Error(`Generated page shell contract failed for ${pagePath}.`);
    }
  }

  // <lang><zh-CN>页面壳的组件清单必须解析到两个 HIA-uView 叶级组件，不能退化为裸 view。</zh-CN><en>The page shell's component manifest must resolve both HIA-uView leaf components and cannot regress to bare views.</en></lang>
  const shellConfiguration = await readOutputJson('components/RuntimePageShell.json');
  if (!shellConfiguration.usingComponents?.['u-navbar'] || !shellConfiguration.usingComponents?.['u-tabbar']) {
    throw new Error('Generated RuntimePageShell is missing HIA-uView navbar or tabbar.');
  }

  // <lang><zh-CN>检查固定 compiler 产物含两次显式 `visible: true`，防止依赖 Mini Program 首帧中的组件默认 Boolean 值。</zh-CN><en>Check that the pinned compiler artifact contains two explicit `visible: true` values, preventing reliance on component-default Boolean values during the Mini Program first render.</en></lang>
  const shellRuntime = await readFile(resolve(outputRoot, 'components/RuntimePageShell.js'), 'utf8');
  const explicitVisibleCount = shellRuntime.match(/visible:!0/gu)?.length ?? 0;
  if (explicitVisibleCount < 2) throw new Error('Generated RuntimePageShell does not explicitly show both HIA-uView chrome components.');
}

// <lang><zh-CN>以顶层 await 执行唯一只读构建后门禁。</zh-CN><en>Execute the sole read-only post-build gate with top-level await.</en></lang>
await verifyGeneratedRuntimeShell();
