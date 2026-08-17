/**
 * <lang><zh-CN>验证已生成微信小程序的应用自管 title、项目内嵌字体与平台常驻 custom tab 壳：全部应用页面必须关闭原生导航并引用 HIA-uView navbar 页面壳，三张字体必须与 manifest 逐字节一致，四个主页面必须进入 official custom-tab-bar/switchTab 生命周期；脚本只读固定输入。</zh-CN><en>Verifies the generated WeChat Mini Program's application-owned title, project-embedded fonts, and platform-persistent custom-tab shell: every application page must disable native navigation and reference the HIA-uView-navbar page shell, all three fonts must match the manifest byte for byte, and four primary pages must enter the official custom-tab-bar/switchTab lifecycle; the script reads only fixed inputs.</en></lang>
 * @lang zh-CN 本门禁验证编译产物契约，不替代开发者工具中的实际布局、点击、语言切换和安全区视觉检查。
 * @lang en This gate verifies the compiled-artifact contract and does not replace actual layout, clicks, language switching, and safe-area visual inspection in Developer Tools.
 */

// <lang><zh-CN>只使用 Node 内建文件与路径 API，不执行产物或连接微信开发者工具。</zh-CN><en>Use only Node built-in file and path APIs; execute no artifact and connect to no WeChat Developer Tools.</en></lang>
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
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
 * <lang><zh-CN>微信根样式中唯一允许的三张项目字体 face，按确定性生成顺序固定。</zh-CN><en>The only three project font faces allowed in the WeChat root stylesheet, fixed in deterministic generation order.</en></lang>
 * @lang zh-CN 此独立 allowlist 不从 manifest 推导 identity，避免被一份同时漂移的 provenance 文件放宽成品门禁。
 * @lang en This independent allowlist does not derive identities from the manifest, preventing a concurrently drifted provenance file from weakening the artifact gate.
 */
const expectedMpFontFaces = Object.freeze([
  Object.freeze({ id: 'sans-regular', family: 'HIA-uView BP Sans SC', compiledFamily: 'HIA-uView BP Sans SC', style: 'normal', weight: 400, display: 'swap', format: 'woff', mimeType: 'font/woff' }),
  Object.freeze({ id: 'sans-bold', family: 'HIA-uView BP Sans SC', compiledFamily: 'HIA-uView BP Sans SC', style: 'normal', weight: 700, display: 'swap', format: 'woff', mimeType: 'font/woff' }),
  Object.freeze({ id: 'serif-bold', family: 'HIA-uView BP Serif SC', compiledFamily: '"HIA-uView BP Serif SC"', style: 'normal', weight: 700, display: 'swap', format: 'woff', mimeType: 'font/woff' })
]);

/**
 * <lang><zh-CN>单张生成字体规则唯一允许的五个 CSS property。</zh-CN><en>The only five CSS properties allowed in one generated font-face rule.</en></lang>
 * @lang zh-CN 精确 property 集合阻止额外 locator、unicode-range 或未审阅行为悄然进入微信成品。
 * @lang en The exact property set prevents an extra locator, unicode range, or unreviewed behavior from silently entering the WeChat artifact.
 */
const expectedMpFontProperties = Object.freeze(['font-family', 'font-style', 'font-weight', 'font-display', 'src']);

/**
 * <lang><zh-CN>移除 CSS block comment，并拒绝未闭合 comment。</zh-CN><en>Removes CSS block comments and rejects an unterminated comment.</en></lang>
 * @param {string} stylesheet <lang><zh-CN>待验证的微信根样式全文。</zh-CN><en>Complete WeChat root stylesheet to verify.</en></lang>
 * @returns {string} <lang><zh-CN>不含 comment 的样式。</zh-CN><en>Stylesheet without comments.</en></lang>
 * @lang zh-CN 先移除 comment，防止说明文字中的 `@font-face` 被误计为真实规则。
 * @lang en Comments are removed first so explanatory `@font-face` text cannot be counted as a real rule.
 */
function removeCssComments(stylesheet) {
  // <lang><zh-CN>输入必须是文本；类型错误不得被隐式字符串化后通过。</zh-CN><en>The input must be text; a type error must not pass after implicit string conversion.</en></lang>
  if (typeof stylesheet !== 'string') throw new Error('Generated app.wxss must be text.');

  // <lang><zh-CN>有限 block-comment 表达式只删除完整配对；后续残留起始符即表示损坏的 CSS。</zh-CN><en>The bounded block-comment expression removes only complete pairs; a remaining opener therefore means damaged CSS.</en></lang>
  const uncommentedStylesheet = stylesheet.replace(/\/\*[\s\S]*?\*\//gu, '');
  if (uncommentedStylesheet.includes('/*') || uncommentedStylesheet.includes('*/')) {
    throw new Error('Generated app.wxss contains an unterminated CSS comment.');
  }

  return uncommentedStylesheet;
}

/**
 * <lang><zh-CN>从微信根样式提取全部且仅限简单顶层 `@font-face` rule body。</zh-CN><en>Extracts every—and only simple top-level—`@font-face` rule body from the WeChat root stylesheet.</en></lang>
 * @param {string} stylesheet <lang><zh-CN>待验证的微信根样式全文。</zh-CN><en>Complete WeChat root stylesheet to verify.</en></lang>
 * @returns {string[]} <lang><zh-CN>按出现顺序排列的三张 rule body。</zh-CN><en>The three rule bodies in occurrence order.</en></lang>
 * @lang zh-CN 生成合同不允许嵌套 brace；token 数与可解析 block 数必须同为三，避免畸形或额外规则绕过。
 * @lang en The generation contract allows no nested braces; token and parseable-block counts must both be three so malformed or extra rules cannot bypass the gate.
 */
function extractMpFontFaceRules(stylesheet) {
  // <lang><zh-CN>comment 清理后的文本是唯一解析输入。</zh-CN><en>Comment-stripped text is the sole parser input.</en></lang>
  const uncommentedStylesheet = removeCssComments(stylesheet);

  // <lang><zh-CN>分别计数所有 directive token 与简单 block，任何数量或结构差异都拒绝。</zh-CN><en>Count every directive token and simple block separately, rejecting any count or structural difference.</en></lang>
  const directiveCount = uncommentedStylesheet.match(/@font-face\b/giu)?.length ?? 0;
  const ruleBodies = [...uncommentedStylesheet.matchAll(/@font-face\s*\{([^{}]*)\}/gu)].map((match) => match[1]);
  if (directiveCount !== expectedMpFontFaces.length || ruleBodies.length !== expectedMpFontFaces.length) {
    throw new Error('Generated app.wxss must contain exactly three simple @font-face rules.');
  }

  return ruleBodies;
}

/**
 * <lang><zh-CN>在不切断 quoted Data URL 分号的前提下，把一张简单字体规则拆成 declaration。</zh-CN><en>Splits one simple font rule into declarations without cutting the semicolon inside a quoted Data URL.</en></lang>
 * @param {string} ruleBody <lang><zh-CN>不含 brace 的单张 `@font-face` 内容。</zh-CN><en>One brace-free `@font-face` body.</en></lang>
 * @returns {string[]} <lang><zh-CN>去除边缘空白后的非空 declaration。</zh-CN><en>Nonempty declarations with edge whitespace removed.</en></lang>
 * @lang zh-CN 扫描器只跟踪 CSS quote、escape 与 parenthesis 深度；生成合同之外的不平衡结构立即失败。
 * @lang en The scanner tracks only CSS quotes, escapes, and parenthesis depth; unbalanced structure outside the generation contract fails immediately.
 */
function splitMpFontDeclarations(ruleBody) {
  // <lang><zh-CN>累积完整 declaration、当前片段以及最小 CSS 状态。</zh-CN><en>Accumulate complete declarations, the current fragment, and minimal CSS state.</en></lang>
  const declarations = [];
  let currentDeclaration = '';
  let activeQuote = '';
  let escaped = false;
  let parenthesisDepth = 0;

  for (const character of ruleBody) {
    // <lang><zh-CN>当前字符始终写入片段；状态只决定分号是否为顶层终止符。</zh-CN><en>Always append the current character; state only decides whether a semicolon is a top-level terminator.</en></lang>
    currentDeclaration += character;

    if (escaped) {
      // <lang><zh-CN>反斜杠后的单字符只解除 escape，不参与 quote 或括号切换。</zh-CN><en>The single character after a backslash only clears escape and cannot toggle quotes or parentheses.</en></lang>
      escaped = false;
      continue;
    }
    if (character === '\\') {
      // <lang><zh-CN>记录下一字符被 escape，保持 quoted locator 的原始字节语义。</zh-CN><en>Mark the next character escaped, preserving the quoted locator's original byte semantics.</en></lang>
      escaped = true;
      continue;
    }
    if (activeQuote) {
      // <lang><zh-CN>只有与当前 quote 相同的字符才关闭字符串。</zh-CN><en>Only a character matching the active quote closes the string.</en></lang>
      if (character === activeQuote) activeQuote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      // <lang><zh-CN>进入 quoted value，使 Data URL 的 MIME 分号保持在同一 declaration。</zh-CN><en>Enter a quoted value so the Data-URL MIME semicolon remains in the same declaration.</en></lang>
      activeQuote = character;
      continue;
    }
    if (character === '(') {
      // <lang><zh-CN>进入函数参数；函数内未加引号的分号也不能终止 declaration。</zh-CN><en>Enter function arguments; even an unquoted semicolon inside a function cannot terminate the declaration.</en></lang>
      parenthesisDepth += 1;
      continue;
    }
    if (character === ')') {
      // <lang><zh-CN>先拒绝多余右括号，再退出一层函数参数。</zh-CN><en>Reject an extra closing parenthesis before leaving one function-argument level.</en></lang>
      if (parenthesisDepth === 0) throw new Error('Generated font-face contains unbalanced parentheses.');
      parenthesisDepth -= 1;
      continue;
    }
    if (character === ';' && parenthesisDepth === 0) {
      // <lang><zh-CN>顶层分号完成一项；去掉终止符并忽略纯空白片段。</zh-CN><en>A top-level semicolon completes an item; remove the terminator and ignore a whitespace-only fragment.</en></lang>
      const completedDeclaration = currentDeclaration.slice(0, -1).trim();
      if (completedDeclaration) declarations.push(completedDeclaration);
      currentDeclaration = '';
    }
  }

  // <lang><zh-CN>任何未闭合 quote、escape 或括号都表示非 canonical 成品。</zh-CN><en>Any unclosed quote, escape, or parenthesis marks a noncanonical artifact.</en></lang>
  if (activeQuote || escaped || parenthesisDepth !== 0) {
    throw new Error('Generated font-face contains an unbalanced CSS value.');
  }

  // <lang><zh-CN>允许最后一项省略尾分号，但仍将其作为完整 declaration 解析。</zh-CN><en>Allow the final item to omit its trailing semicolon while still parsing it as a complete declaration.</en></lang>
  const trailingDeclaration = currentDeclaration.trim();
  if (trailingDeclaration) declarations.push(trailingDeclaration);

  return declarations;
}

/**
 * <lang><zh-CN>把一张字体规则解析成拒绝重复 property 的精确 map。</zh-CN><en>Parses one font rule into an exact map that rejects duplicate properties.</en></lang>
 * @param {string} ruleBody <lang><zh-CN>不含 brace 的单张 `@font-face` 内容。</zh-CN><en>One brace-free `@font-face` body.</en></lang>
 * @returns {Map<string, string>} <lang><zh-CN>property 到未改写 value 的映射。</zh-CN><en>Property-to-unmodified-value mapping.</en></lang>
 * @lang zh-CN property 名仅接受小写 ASCII 与连字符；生成 CSS 不使用 custom property、vendor prefix 或 fallback declaration。
 * @lang en Property names accept only lowercase ASCII and hyphens; generated CSS uses no custom properties, vendor prefixes, or fallback declarations.
 */
function parseMpFontFaceDeclarations(ruleBody) {
  // <lang><zh-CN>每张规则从空 map 开始，避免跨 face 共享状态。</zh-CN><en>Start each rule with an empty map so no state is shared across faces.</en></lang>
  const declarations = new Map();

  for (const declaration of splitMpFontDeclarations(ruleBody)) {
    // <lang><zh-CN>第一处冒号分开 property 与 value；Data URL 后续冒号属于 value。</zh-CN><en>The first colon separates property and value; later Data-URL colons belong to the value.</en></lang>
    const separatorIndex = declaration.indexOf(':');
    if (separatorIndex <= 0) throw new Error('Generated font-face contains an invalid declaration.');

    // <lang><zh-CN>只规范边缘空白，不重写 family、locator 或 format 的语义。</zh-CN><en>Normalize edge whitespace only, without rewriting family, locator, or format semantics.</en></lang>
    const propertyName = declaration.slice(0, separatorIndex).trim();
    const propertyValue = declaration.slice(separatorIndex + 1).trim();
    if (!/^[a-z][a-z-]*$/u.test(propertyName) || !propertyValue) {
      throw new Error('Generated font-face contains an unsupported property or empty value.');
    }
    if (declarations.has(propertyName)) throw new Error(`Generated font-face repeats ${propertyName}.`);

    // <lang><zh-CN>保留原值供 canonical 精确比较。</zh-CN><en>Retain the original value for an exact canonical comparison.</en></lang>
    declarations.set(propertyName, propertyValue);
  }

  // <lang><zh-CN>精确集合同时拒绝缺失与额外 property。</zh-CN><en>The exact set rejects both missing and extra properties.</en></lang>
  const generatedPropertyNames = [...declarations.keys()].sort();
  const expectedPropertyNames = [...expectedMpFontProperties].sort();
  if (JSON.stringify(generatedPropertyNames) !== JSON.stringify(expectedPropertyNames)) {
    throw new Error('Generated font-face must contain exactly the five approved properties.');
  }

  return declarations;
}

/**
 * <lang><zh-CN>计算字体字节的 SHA-256 小写十六进制摘要。</zh-CN><en>Computes the lowercase hexadecimal SHA-256 digest of font bytes.</en></lang>
 * @param {Buffer} fontBytes <lang><zh-CN>从 canonical Data URL 解码的 WOFF 字节。</zh-CN><en>WOFF bytes decoded from a canonical Data URL.</en></lang>
 * @returns {string} <lang><zh-CN>64 字符摘要。</zh-CN><en>A 64-character digest.</en></lang>
 * @lang zh-CN 纯函数不读文件、不连接网络，也不改变输入 Buffer。
 * @lang en The pure function reads no file, connects to no network, and does not mutate the input Buffer.
 */
function sha256FontBytes(fontBytes) {
  return createHash('sha256').update(fontBytes).digest('hex');
}

/**
 * <lang><zh-CN>严格验证微信 `app.wxss` 中三张字体 face 与 manifest 三张记录逐字节一致。</zh-CN><en>Strictly verifies that the three font faces in WeChat `app.wxss` match the three manifest records byte for byte.</en></lang>
 * @param {string} stylesheet <lang><zh-CN>生成的 `dist/build/mp-weixin/app.wxss` 全文或测试 fixture。</zh-CN><en>Complete generated `dist/build/mp-weixin/app.wxss` text or a test fixture.</en></lang>
 * @param {object} fontManifest <lang><zh-CN>解析后的项目字体 manifest 或测试 fixture。</zh-CN><en>Parsed project font manifest or a test fixture.</en></lang>
 * @returns {void} <lang><zh-CN>全部 identity、locator 与字节合同成立时无返回值。</zh-CN><en>Returns nothing when all identity, locator, and byte contracts hold.</en></lang>
 * @lang zh-CN 此导出纯函数不读取真实 dist，供独立正负 fixture 复用；调用方负责提供固定文件内容。
 * @lang en This exported pure function reads no real dist and supports independent positive and negative fixtures; its caller supplies fixed file content.
 */
export function verifyMpRuntimeFontFaces(stylesheet, fontManifest) {
  // <lang><zh-CN>manifest 必须且只能包含 allowlist 的三张 face。</zh-CN><en>The manifest must contain exactly—and only—the three allowlisted faces.</en></lang>
  if (!fontManifest || !Array.isArray(fontManifest.faces) || fontManifest.faces.length !== expectedMpFontFaces.length) {
    throw new Error('Font manifest must contain exactly three faces.');
  }

  // <lang><zh-CN>以 id 建立唯一映射；重复 id 不得用后项静默覆盖前项。</zh-CN><en>Build a unique map by ID; a later duplicate must not silently overwrite an earlier entry.</en></lang>
  const manifestFacesById = new Map();
  for (const manifestFace of fontManifest.faces) {
    if (!manifestFace || typeof manifestFace.id !== 'string' || manifestFacesById.has(manifestFace.id)) {
      throw new Error('Font manifest contains a missing or duplicate face ID.');
    }
    manifestFacesById.set(manifestFace.id, manifestFace);
  }

  // <lang><zh-CN>提取结果严格保持生成顺序，使 identity 调换也不能仅凭相同 family/weight 集合通过。</zh-CN><en>Keep extraction in strict generation order so swapped identities cannot pass merely by preserving a family/weight set.</en></lang>
  const generatedRules = extractMpFontFaceRules(stylesheet);

  for (const [faceIndex, expectedFace] of expectedMpFontFaces.entries()) {
    // <lang><zh-CN>manifest face 先与独立 allowlist 核对，再作为成品 bytes/size/SHA 的权威记录。</zh-CN><en>Check the manifest face against the independent allowlist before treating it as authoritative for artifact bytes, size, and SHA.</en></lang>
    const manifestFace = manifestFacesById.get(expectedFace.id);
    if (!manifestFace) throw new Error(`Font manifest is missing ${expectedFace.id}.`);
    if (manifestFace.cssFamily !== expectedFace.family || manifestFace.fontStyle !== expectedFace.style || manifestFace.fontWeight !== expectedFace.weight || manifestFace.format !== expectedFace.format || manifestFace.mimeType !== expectedFace.mimeType) {
      throw new Error(`Font manifest identity drifted for ${expectedFace.id}.`);
    }
    if (!Number.isSafeInteger(manifestFace.outputBytes) || manifestFace.outputBytes <= 0 || !/^[a-f0-9]{64}$/u.test(manifestFace.outputSha256)) {
      throw new Error(`Font manifest byte contract is invalid for ${expectedFace.id}.`);
    }

    // <lang><zh-CN>解析对应顺序的生成规则，并逐 property 锁定当前 DCloud CSS serializer 的精确输出；Sans 的合法多 identifier family 会去引号，含 generic `Serif` token 的项目 family 保留引号。</zh-CN><en>Parse the generated rule at the corresponding position and lock every property to the current DCloud CSS serializer output; the valid multi-identifier Sans family loses quotes, while the project family containing the generic `Serif` token retains them.</en></lang>
    const declarations = parseMpFontFaceDeclarations(generatedRules[faceIndex]);
    if (declarations.get('font-family') !== expectedFace.compiledFamily || declarations.get('font-style') !== expectedFace.style || declarations.get('font-weight') !== String(expectedFace.weight) || declarations.get('font-display') !== expectedFace.display) {
      throw new Error(`Generated font-face identity drifted for ${expectedFace.id}.`);
    }

    // <lang><zh-CN>src 只接受当前编译器序列化的一条无引号 canonical WOFF Data URL 与双引号 WOFF format，不接受远程、fallback、错误 MIME 或额外空白结构。</zh-CN><en>The src accepts only the current compiler's one unquoted canonical WOFF Data URL plus double-quoted WOFF format, rejecting remote sources, fallbacks, wrong MIME types, or extra whitespace structure.</en></lang>
    const sourceValue = declarations.get('src');
    const sourceMatch = /^url\(data:font\/woff;base64,([A-Za-z0-9+/]+={0,2})\) format\("woff"\)$/u.exec(sourceValue);
    if (!sourceMatch) throw new Error(`Generated font-face locator is not canonical WOFF data for ${expectedFace.id}.`);

    // <lang><zh-CN>严格 base64 round trip 排除非 canonical padding 或解码器宽容输入。</zh-CN><en>A strict base64 round trip excludes noncanonical padding or decoder-tolerated input.</en></lang>
    const decodedFontBytes = Buffer.from(sourceMatch[1], 'base64');
    if (decodedFontBytes.toString('base64') !== sourceMatch[1]) {
      throw new Error(`Generated font-face base64 is not canonical for ${expectedFace.id}.`);
    }

    // <lang><zh-CN>size 与 SHA 独立核对 manifest；任一差异都说明 app.wxss 未嵌入被审计的 WOFF 原字节。</zh-CN><en>Check size and SHA independently against the manifest; either difference means app.wxss did not embed the audited original WOFF bytes.</en></lang>
    if (decodedFontBytes.length !== manifestFace.outputBytes) {
      throw new Error(`Generated font-face byte size drifted for ${expectedFace.id}.`);
    }
    if (sha256FontBytes(decodedFontBytes) !== manifestFace.outputSha256) {
      throw new Error(`Generated font-face SHA-256 drifted for ${expectedFace.id}.`);
    }
  }
}

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

  // <lang><zh-CN>并行读取固定源码 manifest 与固定微信根样式；manifest 提供审计字节合同，app.wxss 提供实际交付字节。</zh-CN><en>Read the fixed source manifest and fixed WeChat root stylesheet in parallel; the manifest provides the audited byte contract and app.wxss provides the actually delivered bytes.</en></lang>
  const [fontManifestText, applicationStyle] = await Promise.all([
    readFile(resolve(projectRoot, 'src/assets/fonts/font-subsets.manifest.json'), 'utf8'),
    readFile(resolve(outputRoot, 'app.wxss'), 'utf8')
  ]);

  // <lang><zh-CN>JSON 解析或纯成品门禁任一失败都直接阻断微信构建，不回退到 host 或网络字体。</zh-CN><en>Any JSON parse or pure artifact-gate failure blocks the WeChat build directly, with no fallback to host or network fonts.</en></lang>
  const fontManifest = JSON.parse(fontManifestText);
  verifyMpRuntimeFontFaces(applicationStyle, fontManifest);

  // <lang><zh-CN>按四个主页面的声明顺序展开普通/选中图标，让格式、顺序和状态配对一次性进入精确门禁。</zh-CN><en>Flatten normal/selected icons in the four-primary-page declaration order so format, order, and state pairing enter one exact gate.</en></lang>
  const generatedTabIconPaths = appConfiguration.tabBar.list.flatMap((item) => [item.iconPath, item.selectedIconPath]);
  if (JSON.stringify(generatedTabIconPaths) !== JSON.stringify(expectedTabIconPaths)) {
    throw new Error('Generated app.json must use the eight registered PNG runtime icons.');
  }

  for (const expectedIconPath of expectedTabIconPaths) {
    // <lang><zh-CN>路径来自脚本内冻结 allowlist，只读取对应构建资产，不枚举目录或接受配置生成任意文件系统目标。</zh-CN><en>The path comes from the script-frozen allowlist and reads only the corresponding built asset without enumerating directories or letting configuration produce an arbitrary file-system target.</en></lang>
    const iconBytes = await readFile(resolve(outputRoot, expectedIconPath));

    // <lang><zh-CN>签名、IHDR 几何和大小共同锁定与 27px 展示框同尺寸的微信兼容 PNG，禁止构建产物重新引入 81→27 运行时缩小；透明像素本身留给人工视觉与源码资产测试。</zh-CN><en>Signature, IHDR geometry, and size lock a WeChat-compatible PNG whose intrinsic size matches the 27px presentation box, preventing the built artifact from reintroducing 81→27 runtime downscaling; visual review and the source-asset test continue to cover transparent pixels.</en></lang>
    const hasPngSignature = iconBytes.subarray(0, pngSignature.length).equals(pngSignature);
    const hasExpectedGeometry = iconBytes.length >= 24 && iconBytes.readUInt32BE(16) === 27 && iconBytes.readUInt32BE(20) === 27;
    if (!hasPngSignature || !hasExpectedGeometry || iconBytes.length >= 10 * 1024) {
      throw new Error(`Generated tab icon is not a bounded 27x27 PNG: ${expectedIconPath}.`);
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
  if (!shellConfiguration.usingComponents?.['u-navbar'] || shellConfiguration.usingComponents?.['u-tabbar'] || shellConfiguration.usingComponents?.['primary-tab-bar']) {
    throw new Error('Generated RuntimePageShell must contain HIA-uView navbar without H5 or page-local tabbar.');
  }

  // <lang><zh-CN>H5 专用 PrimaryTabBar 不能作为孤立 component 泄入微信产物；只检查该固定编译目标路径，不枚举输出目录。</zh-CN><en>The H5-only PrimaryTabBar cannot leak into the WeChat artifact as an orphan component; inspect only its fixed compilation path without enumerating the output directory.</en></lang>
  let h5PrimaryTabLeaked = false;
  try {
    // <lang><zh-CN>若固定 JSON 存在，说明条件编译未完整剔除 H5 adapter。</zh-CN><en>If the fixed JSON exists, conditional compilation failed to remove the H5 adapter completely.</en></lang>
    await access(resolve(outputRoot, 'components/PrimaryTabBar.json'));
    h5PrimaryTabLeaked = true;
  } catch (error) {
    // <lang><zh-CN>只有固定路径不存在是预期结果；权限、I/O 或其他异常必须阻断，不能被误判为“未泄入”。</zh-CN><en>Only absence of the fixed path is expected; permission, I/O, and other failures must block instead of masquerading as "not leaked."</en></lang>
    if (error?.code !== 'ENOENT') throw error;

    // <lang><zh-CN>确认 ENOENT 后保持 false；其他构建文件仍由后续固定读取逐项验证。</zh-CN><en>Keep false only after confirming ENOENT; later fixed reads continue validating every other build file.</en></lang>
    h5PrimaryTabLeaked = false;
  }
  if (h5PrimaryTabLeaked) throw new Error('Generated WeChat artifact contains the H5-only PrimaryTabBar.');

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

/**
 * <lang><zh-CN>按既有顺序运行微信壳与 Biz consumer 两组只读成品门禁。</zh-CN><en>Runs the WeChat-shell and Biz-consumer read-only artifact gates in their established order.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>两组门禁均通过后 resolve。</zh-CN><en>Resolves after both gate groups pass.</en></lang>
 * @lang zh-CN 此函数只由 CLI main path 调用；测试导入纯字体函数时不会读取真实 dist。
 * @lang en This function is called only by the CLI main path; importing the pure font function in tests does not read the real dist.
 */
async function runMpRuntimeShellGate() {
  // <lang><zh-CN>先验证页面壳、字体与导航，再验证依赖这些入口的 Biz project consumer。</zh-CN><en>Verify the page shell, fonts, and navigation before the Biz project consumer that depends on those entry points.</en></lang>
  await verifyGeneratedRuntimeShell();
  await verifyGeneratedBizProjectConsumer();
}

// <lang><zh-CN>只有当前模块是 Node CLI 入口时才触发真实构建读取；测试 import 保持无副作用。</zh-CN><en>Read the real build only when this module is the Node CLI entry point; test imports remain side-effect free.</en></lang>
const isMainModule = typeof process.argv[1] === 'string' && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  // <lang><zh-CN>顶层 await 保持原命令的失败码与未捕获错误语义。</zh-CN><en>Top-level await preserves the existing command's failure code and uncaught-error semantics.</en></lang>
  await runMpRuntimeShellGate();
}
