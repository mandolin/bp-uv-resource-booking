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

// <lang><zh-CN>所有受检页面是声明式有限列表，不递归发现、枚举或执行任意用户文件。</zh-CN><en>All inspected pages are a declarative finite list; the script recursively discovers, enumerates, or executes no arbitrary user files.</en></lang>
const pagePaths = Object.freeze([
  'src/pages/home/index.vue',
  'src/pages/discover/index.vue',
  'src/pages/reservations/index.vue',
  'src/pages/profile/index.vue',
  'src/pages/resource-detail/index.vue',
  'src/pages/booking-confirm/index.vue'
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
  // <lang><zh-CN>先检查六个页面，再检查三个共用展示组件，避免因异步顺序使诊断不稳定。</zh-CN><en>Check six pages first then three shared presentation components, avoiding unstable diagnostics from asynchronous order.</en></lang>
  for (const relativePath of pagePaths) await verifySfc(relativePath, true);
  for (const relativePath of componentPaths) await verifySfc(relativePath, false);

  // <lang><zh-CN>读取声明式页面配置，确保小程序不再生成带静态语言的原生 title/tabbar。</zh-CN><en>Read declarative page configuration to ensure the Mini Program no longer generates native titles/tabbar with a static language.</en></lang>
  const pagesConfiguration = JSON.parse(await readFile(resolve(projectRoot, 'src/pages.json'), 'utf8'));

  // <lang><zh-CN>六页都必须关闭原生导航栏，避免应用自管标题与原生静态标题同时显示。</zh-CN><en>All six pages must disable the native navigation bar, preventing an application-owned title and a native static title from appearing together.</en></lang>
  if (!Array.isArray(pagesConfiguration.pages) || pagesConfiguration.pages.length !== pagePaths.length || pagesConfiguration.pages.some((page) => page.style?.navigationStyle !== 'custom')) {
    throw new Error('Every page must use application-owned custom navigation.');
  }

  // <lang><zh-CN>根配置不得重新引入 native tabBar；主导航只能由 runtime page shell 的 `u-tabbar` 呈现。</zh-CN><en>The root configuration must not reintroduce native tabBar; primary navigation may be rendered only by the runtime page shell's `u-tabbar`.</en></lang>
  if (Object.hasOwn(pagesConfiguration, 'tabBar')) throw new Error('Native tabBar is incompatible with runtime-localized application chrome.');

  // <lang><zh-CN>壳必须实际组合锁定 HIA-uView 的两个公开组件，不能退化为裸 view 或平台壳 API。</zh-CN><en>The shell must actually compose the two public components from pinned HIA-uView and cannot regress to bare views or platform-shell APIs.</en></lang>
  const runtimeShellSource = await readFile(resolve(projectRoot, 'src/components/RuntimePageShell.vue'), 'utf8');
  if (!runtimeShellSource.includes('<u-navbar visible') || !runtimeShellSource.includes('<u-tabbar visible')) {
    throw new Error('Runtime page shell must explicitly render visible HIA-uView navbar and tabbar components.');
  }
}

// <lang><zh-CN>以顶层 await 运行唯一 gate；异常保留非零退出码给 pnpm，不做局部容错掩盖失败。</zh-CN><en>Run the sole gate with top-level await; an exception retains nonzero exit for pnpm and no local recovery hides failure.</en></lang>
await verifyRuntimeI18n();
