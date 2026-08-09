/**
 * <lang><zh-CN>验证已生成微信小程序的应用自管 title 与平台常驻 custom tab 壳：全部应用页面必须关闭原生导航并引用 HIA-uView navbar 页面壳，四个主页面必须进入 official custom-tab-bar/switchTab 生命周期；脚本只读固定 `dist/build/mp-weixin`。</zh-CN><en>Verifies the generated WeChat Mini Program's application-owned title and platform-persistent custom-tab shell: every application page must disable native navigation and reference the HIA-uView-navbar page shell, while four primary pages must enter the official custom-tab-bar/switchTab lifecycle; the script reads only fixed `dist/build/mp-weixin`.</en></lang>
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

// <lang><zh-CN>四个主页面的生成路径必须与 app.json tabBar 固定顺序一致；它们是已审阅应用导航的有限 allowlist。</zh-CN><en>Generated paths for the four primary pages must match the fixed app.json tabBar order; they are the reviewed application's finite navigation allowlist.</en></lang>
const primaryPagePaths = Object.freeze([
  'pages/home/index',
  'pages/discover/index',
  'pages/reservations/index',
  'pages/profile/index'
]);

/**
 * <lang><zh-CN>生成 app.json 与 custom-tab-bar 必须共同消费的八张 PNG 按普通/选中状态固定。</zh-CN><en>The eight PNGs that generated app.json and custom-tab-bar must consume together are fixed in normal/selected-state order.</en></lang>
 * @lang zh-CN 精确清单在微信启动前阻止不受支持的 SVG、网络 URL、丢失资产或状态复用进入产物。
 * @lang en The exact list blocks unsupported SVGs, network URLs, missing assets, or reused states from entering the artifact before WeChat startup.
 */
const expectedTabIconPaths = Object.freeze([
  'static/icons/tab-home.png',
  'static/icons/tab-home-active.png',
  'static/icons/tab-discover.png',
  'static/icons/tab-discover-active.png',
  'static/icons/tab-reservations.png',
  'static/icons/tab-reservations-active.png',
  'static/icons/tab-profile.png',
  'static/icons/tab-profile-active.png'
]);

/**
 * <lang><zh-CN>标准 PNG signature 用于证明构建产物是真实位图而不是只改后缀的 SVG。</zh-CN><en>The standard PNG signature proves the built artifact is a real bitmap rather than an SVG with only its suffix changed.</en></lang>
 */
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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
 * <lang><zh-CN>从已生成 app 配置取得全部受控应用页面。</zh-CN><en>Obtains every controlled application page from generated app configuration.</en></lang>
 * @param {object} appConfiguration <lang><zh-CN>已解析的微信 `app.json`。</zh-CN><en>Parsed WeChat `app.json`.</en></lang>
 * @returns {string[]} <lang><zh-CN>声明顺序不变的安全页面路径。</zh-CN><en>Safe page paths with declaration order preserved.</en></lang>
 * @lang zh-CN 编译产物清单是本门禁唯一的页面输入；不会枚举构建目录或追随任意路径。
 * @lang en The compiled artifact list is this gate's sole page input; it enumerates no build directory and follows no arbitrary path.
 */
function getGeneratedPagePaths(appConfiguration) {
  // <lang><zh-CN>编译结果必须保留非空 pages 数组；否则页面壳检查会被无效产物静默绕过。</zh-CN><en>The compiled result must retain a nonempty pages array; otherwise an invalid artifact could silently bypass page-shell checks.</en></lang>
  if (!Array.isArray(appConfiguration.pages) || appConfiguration.pages.length === 0) {
    throw new Error('Generated app.json must declare at least one application page.');
  }

  // <lang><zh-CN>只接受普通 application page 段，拒绝绝对路径、空段、反斜杠和 traversal。</zh-CN><en>Accept only ordinary application-page segments, rejecting absolute paths, empty segments, backslashes, and traversal.</en></lang>
  const generatedPaths = appConfiguration.pages.map((pagePath) => {
    if (typeof pagePath !== 'string' || !/^pages(?:\/[a-z0-9-]+)+$/u.test(pagePath)) {
      throw new Error('Generated app.json contains an unsafe or unsupported page path.');
    }
    return pagePath;
  });

  // <lang><zh-CN>重复输出路径会让同一合格 json 掩盖 page-list 退化，因此拒绝。</zh-CN><en>Duplicate output paths could let one passing JSON hide page-list degradation, so reject them.</en></lang>
  if (new Set(generatedPaths).size !== generatedPaths.length) {
    throw new Error('Generated app.json must not declare duplicate application pages.');
  }

  return generatedPaths;
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
  const pagePaths = getGeneratedPagePaths(appConfiguration);
  const generatedPrimaryPaths = appConfiguration.tabBar?.list?.map((item) => item.pagePath);
  if (appConfiguration.tabBar?.custom !== true || JSON.stringify(generatedPrimaryPaths) !== JSON.stringify(primaryPagePaths)) {
    throw new Error('Generated app.json is missing the fixed official custom tabBar declaration.');
  }

  // <lang><zh-CN>按四个主页面的声明顺序展开普通/选中图标，让格式、顺序和状态配对一次性进入精确门禁。</zh-CN><en>Flatten normal/selected icons in the four-primary-page declaration order so format, order, and state pairing enter one exact gate.</en></lang>
  const generatedTabIconPaths = appConfiguration.tabBar.list.flatMap((item) => [item.iconPath, item.selectedIconPath]);
  if (JSON.stringify(generatedTabIconPaths) !== JSON.stringify(expectedTabIconPaths)) {
    throw new Error('Generated app.json must use the eight registered PNG runtime icons.');
  }

  for (const expectedIconPath of expectedTabIconPaths) {
    // <lang><zh-CN>路径来自脚本内冻结 allowlist，只读取对应构建资产，不枚举目录或接受配置生成任意文件系统目标。</zh-CN><en>The path comes from the script-frozen allowlist and reads only the corresponding built asset without enumerating directories or letting configuration produce an arbitrary file-system target.</en></lang>
    const iconBytes = await readFile(resolve(outputRoot, expectedIconPath));

    // <lang><zh-CN>签名、IHDR 几何和大小共同锁定微信兼容的 81×81 透明 PNG 交付轮廓；透明像素本身留给人工视觉与源码资产测试。</zh-CN><en>Signature, IHDR geometry, and size together lock the WeChat-compatible 81×81 PNG delivery shape; transparency itself remains covered by visual review and the source-asset test.</en></lang>
    const hasPngSignature = iconBytes.subarray(0, pngSignature.length).equals(pngSignature);
    const hasExpectedGeometry = iconBytes.length >= 24 && iconBytes.readUInt32BE(16) === 81 && iconBytes.readUInt32BE(20) === 81;
    if (!hasPngSignature || !hasExpectedGeometry || iconBytes.length >= 40 * 1024) {
      throw new Error(`Generated tab icon is not a bounded 81x81 PNG: ${expectedIconPath}.`);
    }
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

  // <lang><zh-CN>页面壳生成样式必须保留思源黑体优先的继承根，使 HIA-uView 叶级 control 能取得与页面一致的宿主字体。</zh-CN><en>The generated page-shell style must retain the Source Han Sans-first inheritance root so HIA-uView leaf controls receive the same host font as pages.</en></lang>
  const shellStyle = await readFile(resolve(outputRoot, 'components/RuntimePageShell.wxss'), 'utf8');
  if (!shellStyle.includes('Source Han Sans SC')) {
    throw new Error('Generated RuntimePageShell is missing Source Han Sans inheritance.');
  }

  // <lang><zh-CN>首页微信样式必须含确定的 16px gutter 与底栏预留；该字面 canary 捕获 app-level 变量让 shorthand 整体失效的回归。</zh-CN><en>The generated Home style must contain a deterministic 16px gutter and tab-bar reservation; this literal canary catches regressions where app-level variables invalidate the entire shorthand.</en></lang>
  const homeStyle = await readFile(resolve(outputRoot, 'pages/home/index.wxss'), 'utf8');
  if (!/\.home-page(?:\.[a-z0-9-]+)?\{[^}]*padding:20px 16px calc\(112px \+ env\(safe-area-inset-bottom\)\)/u.test(homeStyle)) {
    throw new Error('Generated Home style is missing the bounded WeChat content gutter.');
  }

  // <lang><zh-CN>发现目录生成物必须把 spacing class 落在原生 view，并保留 14px 纵向间距，不能退回 u-list host。</zh-CN><en>The generated Discover catalog must place the spacing class on a native view and retain a 14px vertical gap rather than returning it to the u-list host.</en></lang>
  const discoverTemplate = await readFile(resolve(outputRoot, 'pages/discover/index.wxml'), 'utf8');
  const discoverStyle = await readFile(resolve(outputRoot, 'pages/discover/index.wxss'), 'utf8');
  if (!/<view[^>]*class="discover-page__list(?:\s|")/u.test(discoverTemplate) || /<u-list[^>]*class="discover-page__list(?:\s|")/u.test(discoverTemplate) || !/\.discover-page__list(?:\.[a-z0-9-]+)?\{[^}]*gap:14px/u.test(discoverStyle)) {
    throw new Error('Generated Discover list is missing native-wrapper card spacing.');
  }

  // <lang><zh-CN>官方 custom-tab-bar 四件套必须被编译器原样复制，并保留 fixed 根、双语选择、固定 switchTab、无外边距白底和四项等分几何。</zh-CN><en>The official custom-tab-bar quartet must be copied verbatim by the compiler and retain a fixed root, bilingual selection, fixed switchTab, a marginless white surface, and equal four-item geometry.</en></lang>
  const customTabConfiguration = await readOutputJson('custom-tab-bar/index.json');
  const customTabRuntime = await readFile(resolve(outputRoot, 'custom-tab-bar/index.js'), 'utf8');
  const customTabTemplate = await readFile(resolve(outputRoot, 'custom-tab-bar/index.wxml'), 'utf8');
  const customTabStyle = await readFile(resolve(outputRoot, 'custom-tab-bar/index.wxss'), 'utf8');
  const hasStableTabTypography = customTabStyle.includes('font-size: 13px') && customTabStyle.includes('Source Han Sans SC');
  const hasFlushEqualSurface = customTabStyle.includes('padding: 5px 0 calc(5px + env(safe-area-inset-bottom))') && customTabStyle.includes('border-top: 1px solid #dfe5ec') && customTabStyle.includes('flex: 0 0 25%') && customTabStyle.includes('width: 27px');
  const hasNativeTabSurface = customTabTemplate.includes('<view\n    wx:for="{{items}}"') && !customTabTemplate.includes('<button');
  if (customTabConfiguration.component !== true || !customTabRuntime.includes('wx.switchTab') || !customTabTemplate.includes("locale === 'en'") || !customTabStyle.includes('position: fixed') || !hasStableTabTypography || !hasFlushEqualSurface || !hasNativeTabSurface) {
    throw new Error('Generated official custom tabBar does not satisfy persistent bilingual chrome contract.');
  }

  for (const expectedIconPath of expectedTabIconPaths) {
    // <lang><zh-CN>生成 custom runtime 采用根相对字面值；逐项要求与 app.json 的登记 PNG 完全同源。</zh-CN><en>The generated custom runtime uses root-relative literals; require each item to share the exact registered PNG with app.json.</en></lang>
    const expectedRuntimeLiteral = `/${expectedIconPath}`;
    if (!customTabRuntime.includes(expectedRuntimeLiteral)) {
      throw new Error('Generated custom tabBar runtime does not use the registered PNG icon set.');
    }
  }
}

/**
 * <lang><zh-CN>验证 BP state、project composition、local adapter 与四个 Biz runtime 都实际进入微信生成物。</zh-CN><en>Verifies that BP state, project composition, local adapter, and all four Biz runtimes actually enter WeChat output.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>全部 project-facing consumer 输出契约成立后 resolve。</zh-CN><en>Resolves after every project-facing consumer output contract holds.</en></lang>
 * @lang zh-CN 此门禁只检查固定生成文件之间的静态链接；不执行业务操作、连接微信开发者工具或断言真机结果。
 * @lang en This gate checks only static links among fixed generated files; it executes no business operation, connects to no WeChat Developer Tools, and asserts no device result.
 */
async function verifyGeneratedBizProjectConsumer() {
  // <lang><zh-CN>读取固定 state、composition、adapter 与 contract 产物，不扫描或执行任意输出文件。</zh-CN><en>Read fixed state, composition, adapter, and contract artifacts and neither scan nor execute arbitrary output files.</en></lang>
  const stateRuntime = await readFile(resolve(outputRoot, 'state/booking-demo.js'), 'utf8');
  const projectRuntime = await readFile(resolve(outputRoot, 'project/resource-booking-project.js'), 'utf8');
  const adapterRuntime = await readFile(resolve(outputRoot, 'adapters/local-resource-booking-adapter.js'), 'utf8');
  const contractRuntime = await readFile(resolve(outputRoot, 'project/resource-booking-contracts.js'), 'utf8');

  // <lang><zh-CN>state 只能连接 high-level project singleton，并且六项读写方法都必须保留在最终 bundle。</zh-CN><en>State may connect only to the high-level project singleton, and all six read and write methods must remain in the final bundle.</en></lang>
  const expectedStateMethods = ['queryResourceCatalog', 'readResourceDetail', 'listReservations', 'createReservation', 'cancelReservation', 'rescheduleReservation'];
  if (!stateRuntime.includes('resource-booking-project') || expectedStateMethods.some((methodName) => !stateRuntime.includes(methodName))) {
    throw new Error('Generated state is missing the project-facing business bridge.');
  }
  for (const forbiddenBoundary of ['local-project-provider', 'local-reservation-write-provider', 'async-provider-runtime', 'provider-port-runtime', 'solution-profile-runtime', 'local-dataset']) {
    if (stateRuntime.includes(forbiddenBoundary)) {
      throw new Error('Generated state bypasses the project-facing business bridge.');
    }
  }

  // <lang><zh-CN>composition 必须保留 Biz project package 与六项命名业务方法，证明读写均由统一 facade 装配。</zh-CN><en>Composition must retain the Biz project package and six named business methods, proving that one facade assembles both reads and writes.</en></lang>
  const expectedProjectMethods = ['queryResourceCatalog', 'readResourceDetail', 'listReservations', 'createReservation', 'cancelReservation', 'rescheduleReservation'];
  if (!projectRuntime.includes('project-runtime') || !projectRuntime.includes('createProjectFacade') || expectedProjectMethods.some((methodName) => !projectRuntime.includes(methodName))) {
    throw new Error('Generated project composition is incomplete.');
  }

  // <lang><zh-CN>六个 operation ID 必须以固定 literal 存在于生成 contract，不允许页面或 command 自由 dispatch。</zh-CN><en>All six operation IDs must exist as fixed literals in the generated contract; neither pages nor commands may dispatch freely.</en></lang>
  const expectedOperationIds = ['resource.catalog.query', 'resource.detail.read', 'reservation.list', 'reservation.create', 'reservation.cancel', 'reservation.reschedule'];
  if (expectedOperationIds.some((operationId) => !contractRuntime.includes(operationId))) {
    throw new Error('Generated project operation contract is incomplete.');
  }

  // <lang><zh-CN>固定页面必须保留与其可见数据相同 operation 的 source fact；这里只锁生成标记，不执行页面或扩大产品展示。</zh-CN><en>Fixed pages must retain source facts from the same operations as their visible data; this only locks generated markers and neither executes pages nor expands product display.</en></lang>
  const generatedPageSourceFacts = Object.freeze([
    Object.freeze({ path: 'pages/home/index.js', marker: 'catalogSource' }),
    Object.freeze({ path: 'pages/resource-detail/index.js', marker: 'detailSource' }),
    Object.freeze({ path: 'pages/reservations/index.js', marker: 'reservationSource' }),
    Object.freeze({ path: 'pages/reservation-detail/index.js', marker: 'reservationSource' }),
    Object.freeze({ path: 'pages/reservation-reschedule/index.js', marker: 'reservationSource' }),
    Object.freeze({ path: 'pages/profile/index.js', marker: 'reservationSource' }),
    Object.freeze({ path: 'pages/booking-confirm/index.js', marker: 'writeSource' })
  ]);
  for (const pageSourceFact of generatedPageSourceFacts) {
    // <lang><zh-CN>每次只读一个固定页面产物；缺文件或缺 marker 都使构建失败。</zh-CN><en>Read one fixed page artifact at a time; a missing file or marker fails the build.</en></lang>
    const pageRuntime = await readFile(resolve(outputRoot, pageSourceFact.path), 'utf8');
    if (!pageRuntime.includes(pageSourceFact.marker)) {
      throw new Error('Generated page is missing its operation-specific source fact.');
    }
  }

  // <lang><zh-CN>唯一 local adapter 必须使用 opaque project adapter API 并独占 dataset；它不得自行导入底层 async runtime。</zh-CN><en>The sole local adapter must use the opaque project-adapter API and exclusively own the dataset; it must not import the lower async runtime itself.</en></lang>
  if (!adapterRuntime.includes('defineProjectSourceAdapter') || !adapterRuntime.includes('local-dataset') || adapterRuntime.includes('async-provider-runtime')) {
    throw new Error('Generated local adapter violates the project-adapter boundary.');
  }

  // <lang><zh-CN>四个 Biz runtime 产物都必须存在且保留各自公共入口标记，证明传递依赖没有依赖父 workspace 或 registry。</zh-CN><en>All four Biz-runtime artifacts must exist and retain their public entry markers, proving transitive dependencies rely on neither a parent workspace nor a registry.</en></lang>
  const generatedBizRuntimes = Object.freeze([
    Object.freeze({ path: 'vendor/HIA-uView-Biz/packages/project-runtime/src/index.js', marker: 'createProjectFacade' }),
    Object.freeze({ path: 'vendor/HIA-uView-Biz/packages/async-provider-runtime/src/index.js', marker: 'createAsyncProviderHost' }),
    Object.freeze({ path: 'vendor/HIA-uView-Biz/packages/provider-port-runtime/src/index.js', marker: 'createProviderPortHost' }),
    Object.freeze({ path: 'vendor/HIA-uView-Biz/packages/solution-profile-runtime/src/index.js', marker: 'createSolutionProfileRuntime' })
  ]);
  for (const generatedRuntime of generatedBizRuntimes) {
    // <lang><zh-CN>逐项读取固定相对路径；缺失文件或 marker 都使 build gate 失败。</zh-CN><en>Read each fixed relative path; a missing file or marker fails the build gate.</en></lang>
    const runtimeSource = await readFile(resolve(outputRoot, generatedRuntime.path), 'utf8');
    if (!runtimeSource.includes(generatedRuntime.marker)) {
      throw new Error('Generated Biz runtime entry is incomplete.');
    }
  }

  // <lang><zh-CN>共享 dataset 产物必须显式导出 localDataset，只允许 adapter 以合法 module binding 获取 static JSON。</zh-CN><en>The shared dataset artifact must explicitly export localDataset so only the adapter obtains static JSON through a valid module binding.</en></lang>
  const datasetRuntime = await readFile(resolve(outputRoot, 'data/local-dataset.js'), 'utf8');
  if (!datasetRuntime.includes('localDataset')) {
    throw new Error('Generated shared local dataset does not export its static binding.');
  }
}

// <lang><zh-CN>以顶层 await 执行唯一只读构建后门禁。</zh-CN><en>Execute the sole read-only post-build gate with top-level await.</en></lang>
await verifyGeneratedRuntimeShell();

// <lang><zh-CN>页面壳验证后再验证 Biz project consumer，保持失败定位与职责边界清晰。</zh-CN><en>Verify the Biz project consumer after the page shell, keeping failure localization and responsibility boundary clear.</en></lang>
await verifyGeneratedBizProjectConsumer();
