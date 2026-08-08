/**
 * <lang><zh-CN>验证已生成微信小程序的应用自管 title 与平台常驻 custom tab 壳：六页必须关闭原生导航并引用 HIA-uView navbar 页面壳，四个主页面必须进入 official custom-tab-bar/switchTab 生命周期；脚本只读固定 `dist/build/mp-weixin`。</zh-CN><en>Verifies the generated WeChat Mini Program's application-owned title and platform-persistent custom-tab shell: all six pages must disable native navigation and reference the HIA-uView-navbar page shell, while four primary pages must enter the official custom-tab-bar/switchTab lifecycle; the script reads only fixed `dist/build/mp-weixin`.</en></lang>
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

// <lang><zh-CN>四个主页面的生成路径必须与 app.json tabBar 固定顺序一致。</zh-CN><en>Generated paths for the four primary pages must match the fixed app.json tabBar order.</en></lang>
const primaryPagePaths = Object.freeze(pagePaths.slice(0, 4));

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
  // <lang><zh-CN>开发者工具不得启用会误排除 RuntimePageShell 的开发期无依赖文件过滤。</zh-CN><en>Developer Tools must not enable the development-time dependency-free-file filter that can wrongly exclude RuntimePageShell.</en></lang>
  const privateProjectConfiguration = await readOutputJson('project.private.config.json');
  if (privateProjectConfiguration.setting?.ignoreDevUnusedFiles !== false) {
    throw new Error('Generated Developer Tools project still filters dependency-free files.');
  }

  // <lang><zh-CN>根产物必须声明 official custom tabBar 和四个固定主页面；custom=true 防止渲染静态 native labels。</zh-CN><en>The root artifact must declare the official custom tab bar and four fixed primary pages; custom=true prevents rendering static native labels.</en></lang>
  const appConfiguration = await readOutputJson('app.json');
  const generatedPrimaryPaths = appConfiguration.tabBar?.list?.map((item) => item.pagePath);
  if (appConfiguration.tabBar?.custom !== true || JSON.stringify(generatedPrimaryPaths) !== JSON.stringify(primaryPagePaths)) {
    throw new Error('Generated app.json is missing the fixed official custom tabBar declaration.');
  }

  // <lang><zh-CN>每页必须同时保持 custom navigation 和编译后的 RuntimePageShell 引用。</zh-CN><en>Every page must retain both custom navigation and a compiled RuntimePageShell reference.</en></lang>
  for (const pagePath of pagePaths) {
    const pageConfiguration = await readOutputJson(`${pagePath}.json`);
    if (pageConfiguration.navigationStyle !== 'custom' || !pageConfiguration.usingComponents?.['runtime-page-shell']) {
      throw new Error(`Generated page shell contract failed for ${pagePath}.`);
    }
  }

  // <lang><zh-CN>页面壳的组件清单必须解析 HIA-uView navbar，且不得再把页面局部 u-tabbar 编入微信端。</zh-CN><en>The page shell's component manifest must resolve HIA-uView navbar and must no longer compile a page-local u-tabbar into WeChat.</en></lang>
  const shellConfiguration = await readOutputJson('components/RuntimePageShell.json');
  if (!shellConfiguration.usingComponents?.['u-navbar'] || shellConfiguration.usingComponents?.['u-tabbar']) {
    throw new Error('Generated RuntimePageShell must contain HIA-uView navbar without page-local tabbar.');
  }

  // <lang><zh-CN>检查固定 compiler 产物显式显示 navbar，防止依赖 Mini Program 首帧中的组件默认 Boolean 值。</zh-CN><en>Check that the pinned compiler artifact explicitly shows navbar, preventing reliance on the component-default Boolean value during the Mini Program first render.</en></lang>
  const shellRuntime = await readFile(resolve(outputRoot, 'components/RuntimePageShell.js'), 'utf8');
  const explicitVisibleCount = shellRuntime.match(/visible:!0/gu)?.length ?? 0;
  if (explicitVisibleCount < 1) throw new Error('Generated RuntimePageShell does not explicitly show HIA-uView navbar.');

  // <lang><zh-CN>官方 custom-tab-bar 四件套必须被编译器原样复制，并保留 fixed 根、双语选择和固定 switchTab。</zh-CN><en>The official custom-tab-bar quartet must be copied verbatim by the compiler and retain a fixed root, bilingual selection, and fixed switchTab.</en></lang>
  const customTabConfiguration = await readOutputJson('custom-tab-bar/index.json');
  const customTabRuntime = await readFile(resolve(outputRoot, 'custom-tab-bar/index.js'), 'utf8');
  const customTabTemplate = await readFile(resolve(outputRoot, 'custom-tab-bar/index.wxml'), 'utf8');
  const customTabStyle = await readFile(resolve(outputRoot, 'custom-tab-bar/index.wxss'), 'utf8');
  if (customTabConfiguration.component !== true || !customTabRuntime.includes('wx.switchTab') || !customTabTemplate.includes("locale === 'en'") || !customTabStyle.includes('position: fixed')) {
    throw new Error('Generated official custom tabBar does not satisfy persistent bilingual chrome contract.');
  }
}

/**
 * <lang><zh-CN>验证 BP reservation write adapter、共享 static dataset 与 Biz async runtime 都实际进入微信生成物。</zh-CN><en>Verifies that BP reservation-write adapter, shared static dataset, and Biz async runtime all actually enter WeChat output.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>全部 write-consumer 输出契约成立后 resolve。</zh-CN><en>Resolves after every write-consumer output contract holds.</en></lang>
 * @lang zh-CN 此门禁只检查固定生成文件之间的静态链接；不执行预约、连接微信开发者工具或断言真机结果。
 * @lang en This gate checks only static links among fixed generated files; it executes no booking, connects to no Developer Tools, and asserts no device result.
 */
async function verifyGeneratedBizWriteConsumer() {
  // <lang><zh-CN>读取由 compiler 生成的固定 write service，而不是扫描或执行任意输出文件。</zh-CN><en>Read fixed write service generated by compiler rather than scanning or executing arbitrary output files.</en></lang>
  const writeProviderRuntime = await readFile(resolve(outputRoot, 'services/local-reservation-write-provider.js'), 'utf8');

  // <lang><zh-CN>read/write runtime 必须显式保留 Biz package、固定 write port 与公开 BP entry；缺一项都可能退化为直接 state mutation。</zh-CN><en>Read/write runtime must explicitly retain Biz package, fixed write port, and public BP entry; a missing item could degrade into direct state mutation.</en></lang>
  if (!writeProviderRuntime.includes('async-provider-runtime') || !writeProviderRuntime.includes('resource-booking-write') || !writeProviderRuntime.includes('startLocalReservationWrite')) {
    throw new Error('Generated reservation write adapter is missing locked Biz write-consumer contract.');
  }

  // <lang><zh-CN>write provider 必须依赖唯一共享 dataset module，而不能由 compiler 折叠为未导出的 read-provider 内部变量。</zh-CN><en>Write provider must depend on the sole shared dataset module and cannot be folded by compiler into an unexported read-provider internal variable.</en></lang>
  if (!writeProviderRuntime.includes('local-dataset') || writeProviderRuntime.includes('local-project-provider')) {
    throw new Error('Generated reservation write adapter does not retain the explicit shared dataset boundary.');
  }

  // <lang><zh-CN>共享 dataset 产物必须显式导出 localDataset，确保两个 provider 都以合法 module binding 获取 static JSON。</zh-CN><en>Shared dataset artifact must explicitly export localDataset so both providers obtain static JSON through a valid module binding.</en></lang>
  const datasetRuntime = await readFile(resolve(outputRoot, 'data/local-dataset.js'), 'utf8');
  if (!datasetRuntime.includes('localDataset')) {
    throw new Error('Generated shared local dataset does not export its static binding.');
  }
}

// <lang><zh-CN>以顶层 await 执行唯一只读构建后门禁。</zh-CN><en>Execute the sole read-only post-build gate with top-level await.</en></lang>
await verifyGeneratedRuntimeShell();

// <lang><zh-CN>页面壳验证后再验证 Biz write consumer，保持失败定位与职责边界清晰。</zh-CN><en>Verify Biz write consumer after page shell, keeping failure localization and responsibility boundary clear.</en></lang>
await verifyGeneratedBizWriteConsumer();
