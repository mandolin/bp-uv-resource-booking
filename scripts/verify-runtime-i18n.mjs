/**
 * <lang><zh-CN>验证 BP 第一方 Vue 模板的 runtime i18n 消费边界：页面必须使用 locale provider，模板不得直取 `zh-Hans` 或放入未绑定的可见文案；脚本不编译、修改源码、读取网络或执行应用。</zh-CN><en>Verifies runtime-i18n consumption boundaries in BP first-party Vue templates: pages must use locale provider, and templates must not directly access `zh-Hans` or contain unbound visible copy; the script neither compiles nor modifies source, reads no network, or executes the app.</en></lang>
 * @lang zh-CN 这是受控静态门禁，不替代两 locale 的构建、微信开发者工具或人工视觉验证。
 * @lang en This is a controlled static gate and does not replace two-locale builds, WeChat DevTools, or human visual verification.
 */

// <lang><zh-CN>只使用 Node 内建文件和路径 API，不引入模板编译器或扫描第三方源码。</zh-CN><en>Use only Node built-in file and path APIs; introduce no template compiler and scan no third-party source.</en></lang>
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// <lang><zh-CN>从脚本位置解析仓根，避免依赖调用命令的 cwd 或外部路径。</zh-CN><en>Resolve repository root from script location, avoiding dependence on command cwd or external paths.</en></lang>
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// <lang><zh-CN>页面清单只从应用已声明的 pages 配置读取；这让新页面自动进入同一受控门禁，且不递归扫描目录。</zh-CN><en>Read the page list only from the application's declared pages configuration; this brings new pages into the same controlled gate without recursively scanning directories.</en></lang>
const pagesConfigurationPath = 'src/pages.json';

/**
 * <lang><zh-CN>宿主 tabBar 与微信 custom-tab-bar 共用的八张透明 PNG 运行时图标按页面和状态固定排序。</zh-CN><en>The eight transparent PNG runtime icons shared by the host tabBar and WeChat custom-tab-bar are fixed in page-and-state order.</en></lang>
 * @lang zh-CN 微信在 custom 组件运行前仍校验宿主声明；精确 allowlist 防止 SVG、网络 URL、未知文件或普通/选中态复用重新进入启动路径。
 * @lang en WeChat still validates the host declaration before the custom component runs; the exact allowlist prevents SVGs, network URLs, unknown files, or normal/selected-state reuse from re-entering the startup path.
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

// <lang><zh-CN>共用展示组件同样受模板直取/裸文案 gate 约束，但不要求各自拥有页面级 provider。</zh-CN><en>Shared presentation components are also subject to template direct-access/unbound-copy gates, but are not required to own a page-level provider.</en></lang>
const componentPaths = Object.freeze([
  'src/components/ResourceCard.vue',
  'src/components/RuntimePageShell.vue',
  'src/components/SourceBadge.vue'
]);

/**
 * <lang><zh-CN>从 Vue SFC 中提取 template 文本，并移除 HTML 注释以避免 ROP 注释被误判为可见文案。</zh-CN><en>Extracts template text from a Vue SFC and removes HTML comments so ROP comments are not misclassified as visible copy.</en></lang>
 * @param {string} sourceText <lang><zh-CN>已读取的第一方 SFC 文本。</zh-CN><en>Read first-party SFC text.</en></lang>
 * @returns {string} <lang><zh-CN>无 HTML 注释的 template 内容。</zh-CN><en>Template content without HTML comments.</en></lang>
 * @lang zh-CN 不能识别完整 Vue AST 时，该窄提取器只检查本项目受控 SFC 形状；结构变更需要同步审阅 gate。
 * @lang en When it cannot recognize a full Vue AST, this narrow extractor checks only controlled SFC shapes in this project; a structure change requires gate review.
 */
function getTemplateText(sourceText) {
  // <lang><zh-CN>只取第一个固定 template block；缺失时返回空文本，并由调用方报告受控错误。</zh-CN><en>Take only the first fixed template block; on absence return empty text for caller to report a controlled error.</en></lang>
  const templateMatch = /<template>([\s\S]*?)<\/template>/u.exec(sourceText);
  return templateMatch ? templateMatch[1].replace(/<!--[\s\S]*?-->/gu, '') : '';
}

/**
 * <lang><zh-CN>将声明式 `pages.json` 的有限页面路径转换为受检 SFC 路径。</zh-CN><en>Converts finite page paths declared in `pages.json` into inspected SFC paths.</en></lang>
 * @param {unknown} pagesConfiguration <lang><zh-CN>已解析的应用 pages 配置。</zh-CN><en>Parsed application pages configuration.</en></lang>
 * @returns {string[]} <lang><zh-CN>按 pages 配置顺序排列的安全仓内 SFC 路径。</zh-CN><en>Safe repository-local SFC paths in pages-configuration order.</en></lang>
 * @lang zh-CN 该窄转换器只接受本项目的受控页面段；它不把配置内容当作任意文件路径。
 * @lang en This narrow converter accepts only this project's controlled page segments; it never treats configuration content as an arbitrary file path.
 */
function getDeclaredPageSources(pagesConfiguration) {
  // <lang><zh-CN>pages 必须是非空数组，空声明不能令所有页面级 i18n 检查被静默跳过。</zh-CN><en>Pages must be a nonempty array, so an empty declaration cannot silently skip every page-level i18n check.</en></lang>
  if (!Array.isArray(pagesConfiguration?.pages) || pagesConfiguration.pages.length === 0) {
    throw new Error('pages.json must declare at least one application page.');
  }

  // <lang><zh-CN>收集后的路径保持声明顺序，以便失败诊断稳定且与路由配置直接对应。</zh-CN><en>Collected paths preserve declaration order, keeping failure diagnostics stable and directly corresponding to route configuration.</en></lang>
  const declaredSources = [];

  for (const page of pagesConfiguration.pages) {
    // <lang><zh-CN>只接受由小写字母、数字、连字符和单斜杠段组成的页面路径，拒绝绝对路径、空段和 traversal。</zh-CN><en>Accept only page paths made of lowercase letters, digits, hyphens, and single slash segments, rejecting absolute paths, empty segments, and traversal.</en></lang>
    const pagePath = typeof page?.path === 'string' ? page.path : '';
    if (!/^pages(?:\/[a-z0-9-]+)+$/u.test(pagePath)) {
      throw new Error('pages.json contains an unsafe or unsupported page path.');
    }

    // <lang><zh-CN>只把已验证页面段映射到固定 `src` 根下的同名 Vue 文件。</zh-CN><en>Map only the verified page segment to its same-named Vue file beneath the fixed `src` root.</en></lang>
    declaredSources.push(`src/${pagePath}.vue`);
  }

  // <lang><zh-CN>重复路由会让一个页面的合格结果掩盖另一个声明问题，因此在读取 SFC 前拒绝。</zh-CN><en>Duplicate routes could let one passing page hide another declaration problem, so reject them before reading SFCs.</en></lang>
  if (new Set(declaredSources).size !== declaredSources.length) {
    throw new Error('pages.json must not declare duplicate application pages.');
  }

  return declaredSources;
}

/**
 * <lang><zh-CN>验证一份受控 SFC 的 i18n 模板约束。</zh-CN><en>Verifies i18n template constraints for one controlled SFC.</en></lang>
 * @param {string} relativePath <lang><zh-CN>冻结的仓内相对路径。</zh-CN><en>Frozen repository-relative path.</en></lang>
 * @param {boolean} requireProvider <lang><zh-CN>是否要求页面级 `u-config-provider`。</zh-CN><en>Whether page-level `u-config-provider` is required.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>符合门禁时 resolve，否则抛出受控错误。</zh-CN><en>Resolves when gate passes; otherwise throws a controlled error.</en></lang>
 * @lang zh-CN 验证只读文本，不运行 SFC、Vue setup、路由、平台 API 或业务状态。
 * @lang en Validation reads text only and runs no SFC, Vue setup, route, platform API, or business state.
 */
async function verifySfc(relativePath, requireProvider) {
  // <lang><zh-CN>路径从仓根与冻结列表组合，避免 CLI、环境或外部内容决定读取目标。</zh-CN><en>Build path from repository root and frozen list, preventing CLI, environment, or external content from deciding read targets.</en></lang>
  const sourceText = await readFile(resolve(projectRoot, relativePath), 'utf8');
  const templateText = getTemplateText(sourceText);

  // <lang><zh-CN>空 template 是受控错误，防止 gate 对删空页面给出错误通过。</zh-CN><en>An empty template is a controlled error, preventing the gate from falsely passing a deleted page.</en></lang>
  if (!templateText.trim()) throw new Error(`Missing template in ${relativePath}.`);

  // <lang><zh-CN>模板不得固定读取 `zh-Hans` 字段，所有领域值必须经过 runtime `localize()`。</zh-CN><en>Templates must not directly read a fixed `zh-Hans` field; all domain values must pass through runtime `localize()`.</en></lang>
  if (/\[['"]zh-Hans['"]\]/u.test(templateText)) throw new Error(`Direct zh-Hans template access in ${relativePath}.`);

  // <lang><zh-CN>可见文本属性必须使用绑定形式，阻止重新引入中英混排、隐藏默认 copy 或固定日期标签。</zh-CN><en>Visible-text attributes must use binding form, preventing reintroduction of mixed languages, hidden default copy, or fixed date labels.</en></lang>
  if (/(^|\s)(?:label|title|sub-title|placeholder|message|action-text|close-text|cancel-text|confirm-text|dismiss-text|alt)\s*=\s*['"]/u.test(templateText)) {
    throw new Error(`Unbound visible template attribute in ${relativePath}.`);
  }

  // <lang><zh-CN>直接标签间文本若含汉字，或若包含空格包围的斜线，即表示未经过静态 resource/领域投影的混排风险。</zh-CN><en>Direct text between tags containing Han characters, or a slash surrounded by spaces, indicates mixed-copy risk not passing static resource/domain projection.</en></lang>
  if (/>\s*[^<{]*[\u3400-\u9fff][^<{]*</u.test(templateText) || />\s*[^<{]*\s\/\s[^<{]*</u.test(templateText)) {
    throw new Error(`Unbound visible template text in ${relativePath}.`);
  }

  // <lang><zh-CN>页面必须显式持有 runtime locale 和 provider；共用组件只需使用 runtime locale，以便由页面 provider 提供 UI context。</zh-CN><en>Pages must explicitly hold runtime locale and provider; shared components need only use runtime locale so page provider supplies UI context.</en></lang>
  if (!sourceText.includes('useRuntimeLocale')) throw new Error(`Missing runtime locale consumer in ${relativePath}.`);
  if (requireProvider && !templateText.includes('<u-config-provider')) throw new Error(`Missing UConfigProvider in ${relativePath}.`);
  if (requireProvider && !templateText.includes('<runtime-page-shell')) throw new Error(`Missing runtime page shell in ${relativePath}.`);
}

/**
 * <lang><zh-CN>执行全部有限 SFC 的只读 i18n gate。</zh-CN><en>Executes the read-only i18n gate for all finite SFCs.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>全部 SFC 合格后 resolve。</zh-CN><en>Resolves after every SFC passes.</en></lang>
 * @lang zh-CN 顺序固定，失败信息只含仓内相对路径，不输出源码、用户数据或环境信息。
 * @lang en Order is fixed; failure messages contain only repository-relative paths and output no source, user data, or environment information.
 */
async function verifyRuntimeI18n() {
  // <lang><zh-CN>只读取应用的固定 pages 配置，并将其有限声明转换为页面 SFC 清单；不进行文件系统发现。</zh-CN><en>Read only the application's fixed pages configuration and convert its finite declarations into a page-SFC list; perform no filesystem discovery.</en></lang>
  const pagesConfiguration = JSON.parse(await readFile(resolve(projectRoot, pagesConfigurationPath), 'utf8'));
  const pagePaths = getDeclaredPageSources(pagesConfiguration);

  // <lang><zh-CN>先检查全部已声明页面，再检查三个共用展示组件，避免因异步顺序使诊断不稳定。</zh-CN><en>Check every declared page first then three shared presentation components, avoiding unstable diagnostics from asynchronous order.</en></lang>
  for (const relativePath of pagePaths) await verifySfc(relativePath, true);
  for (const relativePath of componentPaths) await verifySfc(relativePath, false);

  // <lang><zh-CN>全部已声明页面都必须关闭原生导航栏，避免应用自管标题与原生静态标题同时显示。</zh-CN><en>Every declared page must disable the native navigation bar, preventing an application-owned title and a native static title from appearing together.</en></lang>
  if (pagesConfiguration.pages.some((page) => page.style?.navigationStyle !== 'custom')) {
    throw new Error('Every page must use application-owned custom navigation.');
  }

  // <lang><zh-CN>平台 tab 声明必须固定为四个已审阅主页面并开启 custom；静态 text 只作为微信载入前的中文 fallback。</zh-CN><en>The platform-tab declaration must be fixed to four reviewed primary pages with custom enabled; static text serves only as a Chinese fallback before WeChat loads.</en></lang>
  const expectedPrimaryPaths = Object.freeze(['pages/home/index', 'pages/discover/index', 'pages/reservations/index', 'pages/profile/index']);
  const declaredPrimaryPaths = pagesConfiguration.tabBar?.list?.map((item) => item.pagePath);
  if (pagesConfiguration.tabBar?.custom !== true || JSON.stringify(declaredPrimaryPaths) !== JSON.stringify(expectedPrimaryPaths)) {
    throw new Error('Platform-managed custom tabBar must declare the four fixed primary pages.');
  }

  // <lang><zh-CN>按声明顺序展开普通/选中图标；字段缺失会保留为 undefined 并与精确 allowlist 不匹配。</zh-CN><en>Flatten normal/selected icons in declaration order; a missing field remains undefined and fails the exact allowlist comparison.</en></lang>
  const declaredTabIconPaths = pagesConfiguration.tabBar.list.flatMap((item) => [item.iconPath, item.selectedIconPath]);
  if (JSON.stringify(declaredTabIconPaths) !== JSON.stringify(expectedTabIconPaths)) {
    throw new Error('Platform-managed custom tabBar must use the eight registered PNG runtime icons.');
  }

  // <lang><zh-CN>页面壳仍必须组合锁定 HIA-uView navbar，但不得再在每个页面内重复创建 u-tabbar。</zh-CN><en>The page shell must still compose the pinned HIA-uView navbar but must no longer recreate u-tabbar inside every page.</en></lang>
  const runtimeShellSource = await readFile(resolve(projectRoot, 'src/components/RuntimePageShell.vue'), 'utf8');
  if (!runtimeShellSource.includes('<u-navbar visible') || runtimeShellSource.includes('<u-tabbar')) {
    throw new Error('Runtime page shell must render HIA-uView navbar without a page-local tabbar.');
  }

  // <lang><zh-CN>字体入口必须同时声明思源黑体、思源宋体和思源等宽三类受控角色；generic fallback 不能取代显式家族选择。</zh-CN><en>The font entry must declare the three controlled Source Han Sans, Source Han Serif, and Source Han Mono roles; generic fallbacks cannot replace explicit family selection.</en></lang>
  const globalStyleSource = await readFile(resolve(projectRoot, 'src/uni.scss'), 'utf8');
  const expectedSourceHanFamilies = Object.freeze(['"Source Han Sans SC"', '"Source Han Serif SC"', '"Source Han Mono SC"']);
  if (expectedSourceHanFamilies.some((familyName) => !globalStyleSource.includes(familyName))) {
    throw new Error('Global typography must retain the three declared Source Han font roles.');
  }

  // <lang><zh-CN>首页必须同时保留通用变量 fallback 与微信字面 gutter；任一缺失都可能让一条无效 shorthand 再次抹掉整页边距。</zh-CN><en>Home must retain both generic variable fallbacks and the literal WeChat gutter; either omission could let one invalid shorthand erase the entire page inset again.</en></lang>
  const homePageSource = await readFile(resolve(projectRoot, 'src/pages/home/index.vue'), 'utf8');
  if (!homePageSource.includes('var(--bp-page-inline, 16px)') || !homePageSource.includes('padding: 20px 16px calc(112px + env(safe-area-inset-bottom))')) {
    throw new Error('Home must retain its bounded cross-platform content gutter.');
  }

  // <lang><zh-CN>发现页的卡片间距必须由 UList slot 内的原生 view 拥有，不能再把页面 class 挂到隔离的自定义组件 host。</zh-CN><en>Discover card spacing must be owned by a native view inside the UList slot and cannot move its page class back onto the isolated custom-component host.</en></lang>
  const discoverPageSource = await readFile(resolve(projectRoot, 'src/pages/discover/index.vue'), 'utf8');
  const hasNativeDiscoverList = discoverPageSource.includes('<u-list v-else>') && discoverPageSource.includes('<view class="discover-page__list">') && discoverPageSource.includes('class="discover-page__list-item"');
  if (!hasNativeDiscoverList || discoverPageSource.includes('<u-list v-else class="discover-page__list">') || !discoverPageSource.includes('gap: 14px')) {
    throw new Error('Discover list spacing must remain on the native slot wrapper.');
  }

  // <lang><zh-CN>按受控 pages 配置建立路径映射，使 tab 合约不依赖页面在数组中的偶然排列。</zh-CN><en>Build a path map from controlled pages configuration so the tab contract does not depend on incidental array ordering.</en></lang>
  const pageSourcesByRoute = new Map(pagesConfiguration.pages.map((page) => [page.path, `src/${page.path}.vue`]));

  // <lang><zh-CN>四个主页面必须在 onShow 通过受限 bridge 同步当前 custom tab 实例，避免首次进入时选中态或语言漂移。</zh-CN><en>All four primary pages must synchronize their current custom-tab instance through the bounded bridge on show, avoiding selection or locale drift on first entry.</en></lang>
  for (const primaryPath of expectedPrimaryPaths) {
    // <lang><zh-CN>tabBar 声明的每一主页面都必须实际存在于受检 pages 集合。</zh-CN><en>Every primary page declared by tabBar must exist in the inspected pages set.</en></lang>
    const relativePath = pageSourcesByRoute.get(primaryPath);
    if (!relativePath) throw new Error(`Missing primary page source for ${primaryPath}.`);

    // <lang><zh-CN>已验证的相对路径只用于读取该固定主页面，不接收运行时导航输入。</zh-CN><en>The verified relative path is used only to read that fixed primary page and accepts no runtime navigation input.</en></lang>
    const sourceText = await readFile(resolve(projectRoot, relativePath), 'utf8');
    if (!sourceText.includes('syncPrimaryTabChrome')) throw new Error(`Missing persistent tab chrome synchronization in ${relativePath}.`);
  }

  // <lang><zh-CN>微信 raw custom-tab-bar 必须保持静态 allowlist、双语选择、无业务输入和固定 switchTab；样式根必须常驻 fixed。</zh-CN><en>The raw WeChat custom tab bar must retain a static allowlist, bilingual selection, no business input, and fixed switchTab; its style root must remain fixed.</en></lang>
  const customTabRuntime = await readFile(resolve(projectRoot, 'src/custom-tab-bar/index.js'), 'utf8');
  const customTabTemplate = await readFile(resolve(projectRoot, 'src/custom-tab-bar/index.wxml'), 'utf8');
  const customTabStyle = await readFile(resolve(projectRoot, 'src/custom-tab-bar/index.wxss'), 'utf8');
  const hasStableTabTypography = customTabStyle.includes('align-items: stretch') && customTabStyle.includes('"Source Han Sans SC"');
  if (!customTabRuntime.includes('wx.switchTab') || !customTabRuntime.includes("labelEn: 'My bookings'") || !customTabTemplate.includes("locale === 'en'") || !customTabStyle.includes('position: fixed') || !hasStableTabTypography) {
    throw new Error('WeChat custom tabBar does not satisfy persistent bilingual chrome contract.');
  }

  for (const expectedIconPath of expectedTabIconPaths) {
    // <lang><zh-CN>custom 组件使用根相对路径；逐项验证它与宿主声明消费同一登记 PNG，而不是保留另一套 SVG 或动态路径。</zh-CN><en>The custom component uses root-relative paths; verify each item consumes the same registered PNG as the host declaration rather than retaining another SVG set or dynamic path.</en></lang>
    const expectedRuntimeLiteral = `/${expectedIconPath}`;
    if (!customTabRuntime.includes(expectedRuntimeLiteral)) {
      throw new Error('WeChat custom tabBar runtime does not use the registered PNG icon set.');
    }
  }
}

// <lang><zh-CN>以顶层 await 运行唯一 gate；异常保留非零退出码给 pnpm，不做局部容错掩盖失败。</zh-CN><en>Run the sole gate with top-level await; an exception retains nonzero exit for pnpm and no local recovery hides failure.</en></lang>
await verifyRuntimeI18n();
