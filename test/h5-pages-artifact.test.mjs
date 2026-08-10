/**
 * <lang><zh-CN>以隔离临时成品验证 H5 GitHub Pages 门禁的正例，以及入口/base、遥测、机器路径、source map、外链、链接类型、私有配置、凭据与字体负例；测试不读取真实构建、不访问网络，也不保留 fixture。</zh-CN><en>Uses isolated temporary artifacts to verify the H5 GitHub Pages gate's positive case plus negative entry/base, telemetry, machine-path, source-map, external-link, link-type, private-configuration, credential, and font cases; tests read no real build, access no network, and retain no fixture.</en></lang>
 * @lang zh-CN fixture 中的 URL、路径和凭据形状都是人工测试值，不是运行配置、真实 secret 或部署目标。
 * @lang en URLs, paths, and credential shapes in fixtures are synthetic test values rather than runtime configuration, real secrets, or deployment targets.
 */

// <lang><zh-CN>只使用 Node 内建断言、临时文件 API、路径 API 与 test runner。</zh-CN><en>Use only Node built-in assertion, temporary-file, path, and test-runner APIs.</en></lang>
import assert from 'node:assert/strict';
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

// <lang><zh-CN>导入纯只读 verifier；模块被 test runner 导入时不会触发真实 `dist` 检查。</zh-CN><en>Import the read-only verifier; importing the module from the test runner does not trigger the real `dist` check.</en></lang>
import { verifyH5FontSourceBoundary, verifyH5PagesArtifact } from '../scripts/verify-h5-pages-artifact.mjs';

// <lang><zh-CN>从测试文件位置固定公开 BP 根，只读取准备清单本就采用的许可证 source，不读取真实 dist。</zh-CN><en>Fix the public BP root from the test-file location and read only license sources already used by the preparation ledger, never the real dist.</en></lang>
const fixtureProjectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * <lang><zh-CN>把九项法律载荷目标映射到其公开、版本固定的 source；fixture 复制真实 canonical 输入，从而真实验证 verifier 中不可伪造的 digest。</zh-CN><en>Maps the nine legal-payload destinations to their public, version-pinned sources; fixtures copy the real canonical inputs so the verifier's non-bypassable digests are tested honestly.</en></lang>
 */
const fixtureLegalSources = Object.freeze([
  Object.freeze({ destination: 'LICENSE', source: resolve(fixtureProjectRoot, 'LICENSE') }),
  Object.freeze({ destination: 'THIRD_PARTY_NOTICES.md', source: resolve(fixtureProjectRoot, 'THIRD_PARTY_NOTICES.md') }),
  Object.freeze({ destination: 'LICENSES/HIA-uView-MIT.txt', source: resolve(fixtureProjectRoot, 'src/vendor/HIA-uView/LICENSE') }),
  Object.freeze({ destination: 'LICENSES/HIA-uView-Biz-MIT.txt', source: resolve(fixtureProjectRoot, 'src/vendor/HIA-uView-Biz/LICENSE') }),
  Object.freeze({ destination: 'LICENSES/HIA-uView-THIRD_PARTY_NOTICES.md', source: resolve(fixtureProjectRoot, 'src/vendor/HIA-uView/THIRD_PARTY_NOTICES.md') }),
  Object.freeze({ destination: 'LICENSES/uView-Pro-MIT.txt', source: resolve(fixtureProjectRoot, 'LICENSES/uView-Pro-MIT.txt') }),
  Object.freeze({ destination: 'LICENSES/DCloud-Apache-2.0.txt', source: resolve(fixtureProjectRoot, 'node_modules/@dcloudio/uni-app/LICENSE') }),
  Object.freeze({ destination: 'LICENSES/Vue-MIT.txt', source: resolve(fixtureProjectRoot, 'node_modules/vue/LICENSE') }),
  Object.freeze({ destination: 'LICENSES/Vue-Router-MIT.txt', source: resolve(fixtureProjectRoot, 'LICENSES/Vue-Router-MIT.txt') })
]);

/**
 * <lang><zh-CN>隔离入口与真实 prepare 共同使用的唯一精确 favicon tag。</zh-CN><en>The sole exact favicon tag shared by the isolated entry and real preparation output.</en></lang>
 */
const passingFaviconTag = '<link rel="icon" type="image/svg+xml" href="/bp-uv-resource-booking/static/icons/tab-home-active.svg">';

/**
 * <lang><zh-CN>正例入口以精确 Pages base 加载同源 CSS 与 JS。</zh-CN><en>The positive entry loads same-origin CSS and JavaScript through the exact Pages base.</en></lang>
 */
const passingIndexHtml = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    ${passingFaviconTag}
    <link rel="stylesheet" href="/bp-uv-resource-booking/assets/app.css">
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/bp-uv-resource-booking/assets/app.js"></script>
  </body>
</html>
`;

/**
 * <lang><zh-CN>正例 CSS 模拟锁定 DCloud shadow 预载，并在同文件后置规则中同时禁用动画与背景请求；data image 仍是本地内联资产。</zh-CN><en>The positive CSS simulates the pinned DCloud shadow preload and disables both animation and background request in a later same-file rule; the data image remains a local inline asset.</en></lang>
 */
const passingCss = `body:after{animation:shadow-preload .1s;background-image:url(https://cdn.dcloud.net.cn/img/shadow-grey.png)}
body:after{animation:none!important;background-image:none!important}
.local-image{background-image:url(data:image/svg+xml;base64,PHN2Zy8+)}
`;

/**
 * <lang><zh-CN>正例 JS 仅包含已审阅的 namespace 与 Vue 错误说明 identifier，不声明网络资源。</zh-CN><en>The positive JavaScript contains only reviewed namespace and Vue error-reference identifiers and declares no network resource.</en></lang>
 */
const passingJavaScript = [
  'const loadFontCapability = registerApi("loadFontFace", ({ family, source }) => {',
  '  const nativeFace = new FontFace(family, source);',
  '  const fallbackStyle = document.createElement("style");',
  '  fallbackStyle.innerText = `@font-face{font-family:"${family}";src:${source};}`;',
  '  return nativeFace || fallbackStyle;',
  '});',
  'const AdConfigManager=class ConfigState{static get instance(){return ConfigState._instance||(ConfigState._instance=new ConfigState,ConfigState._instance._init()),ConfigState._instance}_init(){this._getConfig()}get(adpid,success,fail){this._loadAdConfig(adpid);void success;void fail}_loadAdConfig(adpid){request({url:ConfigState.URL,method:"GET",data:{d:location.hostname,a:adpid}})}_getConfig(){return localStorage.getItem(ConfigState.KEY)}_setConfig(value){localStorage.setItem(ConfigState.KEY,value)}};',
  'define(AdConfigManager,"IC",0),define(AdConfigManager,"IS",0),define(AdConfigManager,"URL","https://hac1.dcloud.net.cn/ah5v2"),define(AdConfigManager,"KEY","uni_app_ad_config"),define(AdConfigManager,"CACHE_TIME",6e5),define(AdConfigManager,"ERROR_INVALID_ADPID",{"-5002":"invalid adpid"});',
  'const AdGuidManager=class GuidState{static get instance(){return GuidState._instance||(GuidState._instance=new GuidState),GuidState._instance}get(payload){this._process(payload)}_process(payload){request({url:GuidState.URL,method:"GET",data:{d:location.hostname,payload}})}_getConfig(){return localStorage.getItem(GuidState.KEY)}_setConfig(value){localStorage.setItem(GuidState.KEY,value)}};',
  'define(AdGuidManager,"URL","https://has1.dcloud.net.cn/ahl"),define(AdGuidManager,"KEY","uni_app_ad_guid");',
  'const svgNamespace = "http://www.w3.org/2000/svg";',
  'function reportRuntimeError(errorCode){const runtimeErrorReference = `https://vuejs.org/error-reference/#runtime-${errorCode}`;console.error(runtimeErrorReference)}',
  'void loadFontCapability;',
  'void svgNamespace;',
  'void reportRuntimeError;'
].join('\n');

/**
 * <lang><zh-CN>在 fixture 根内写入一个普通文件，并按需创建父目录。</zh-CN><en>Writes one regular file inside a fixture root and creates parent directories as needed.</en></lang>
 * @param {string} fixtureRoot <lang><zh-CN>由 mkdtemp 创建的隔离根。</zh-CN><en>Isolated root created by mkdtemp.</en></lang>
 * @param {string} relativePath <lang><zh-CN>测试声明的有限相对路径。</zh-CN><en>Finite relative path declared by the test.</en></lang>
 * @param {string | Uint8Array} content <lang><zh-CN>人工测试正文或字节。</zh-CN><en>Synthetic test content or bytes.</en></lang>
 * @returns {Promise<string>} <lang><zh-CN>写入文件的 fixture 内绝对路径，仅供本测试继续变更。</zh-CN><en>Fixture-internal absolute path used only for subsequent test mutation.</en></lang>
 */
async function writeFixtureFile(fixtureRoot, relativePath, content) {
  // <lang><zh-CN>路径只由临时根与当前测试的静态相对值构成。</zh-CN><en>The path consists only of the temporary root and this test's static relative value.</en></lang>
  const filePath = join(fixtureRoot, relativePath);

  // <lang><zh-CN>recursive mkdir 只作用于当前 fixture 的父目录，清理钩子会整体删除。</zh-CN><en>Recursive mkdir affects only the current fixture's parent directory, which the cleanup hook removes in full.</en></lang>
  await mkdir(dirname(filePath), { recursive: true });

  // <lang><zh-CN>写入调用方提供的人工内容，不复制真实构建或用户文件。</zh-CN><en>Write caller-provided synthetic content and copy no real build or user file.</en></lang>
  await writeFile(filePath, content);

  // <lang><zh-CN>返回路径仅用于同一测试中的覆盖、link 或删除。</zh-CN><en>Return the path only for overwrite, link, or removal in the same test.</en></lang>
  return filePath;
}

/**
 * <lang><zh-CN>把公开固定 source 的 canonical 法律文本复制到隔离 fixture 的九个精确目标。</zh-CN><en>Copies canonical legal text from public pinned sources into the nine exact destinations of an isolated fixture.</en></lang>
 * @param {string} fixtureRoot <lang><zh-CN>当前隔离成品根。</zh-CN><en>Current isolated artifact root.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>全部普通文件写入后完成。</zh-CN><en>Completes after every regular file is written.</en></lang>
 */
async function writeLegalFixturePayload(fixtureRoot) {
  // <lang><zh-CN>稳定清单顺序与 verifier/prepare 一致，任一 source 缺失都会让测试显式失败。</zh-CN><en>The stable ledger order matches the verifier/preparation flow, and a missing source fails the test explicitly.</en></lang>
  for (const fixtureLegalSource of fixtureLegalSources) {
    // <lang><zh-CN>只读取清单中的公开许可证或 NOTICE 普通文件，不读取构建输出。</zh-CN><en>Read only the public license or NOTICE regular file in the ledger, never build output.</en></lang>
    const canonicalLegalBytes = await readFile(fixtureLegalSource.source);

    // <lang><zh-CN>写入临时目标后由 verifier 独立核对 nlink、digest 与正文事实。</zh-CN><en>After writing the temporary destination, the verifier independently checks nlink, digest, and content facts.</en></lang>
    await writeFixtureFile(fixtureRoot, fixtureLegalSource.destination, canonicalLegalBytes);
  }
}

/**
 * <lang><zh-CN>计算 PNG chunk 的标准 CRC-32，使人工 fixture 保持完整可解析，而不是依赖 verifier 忽略校验位。</zh-CN><en>Computes the standard PNG-chunk CRC-32 so the synthetic fixture remains completely parseable rather than relying on the verifier to ignore checksum bytes.</en></lang>
 * @param {Uint8Array} chunkTypeAndData <lang><zh-CN>四字节 type 与 data 的连续字节。</zh-CN><en>Contiguous four-byte type plus data bytes.</en></lang>
 * @returns {number} <lang><zh-CN>无符号 CRC-32。</zh-CN><en>Unsigned CRC-32.</en></lang>
 */
function calculatePngCrc32(chunkTypeAndData) {
  // <lang><zh-CN>PNG 使用 IEEE CRC-32 的全 1 初始状态。</zh-CN><en>PNG uses the all-ones initial state of IEEE CRC-32.</en></lang>
  let crc = 0xffffffff;

  // <lang><zh-CN>逐字节更新，不创建全局 table，保持测试 helper 有限且无共享可变状态。</zh-CN><en>Update byte by byte without a global table, keeping the test helper finite and free of shared mutable state.</en></lang>
  for (const byteValue of chunkTypeAndData) {
    // <lang><zh-CN>当前输入字节先与低八位合并。</zh-CN><en>Merge the current input byte with the low eight bits first.</en></lang>
    crc ^= byteValue;

    // <lang><zh-CN>八轮反射多项式更新处理该字节的每一位。</zh-CN><en>Eight reflected-polynomial updates process every bit of the byte.</en></lang>
    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      // <lang><zh-CN>最低位为 1 时应用 PNG/ZIP 使用的反射多项式。</zh-CN><en>Apply the reflected PNG/ZIP polynomial when the least-significant bit is one.</en></lang>
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  // <lang><zh-CN>最终异或并转为无符号 32 位，供 Buffer 大端写入。</zh-CN><en>Apply the final XOR and convert to unsigned 32-bit for big-endian Buffer output.</en></lang>
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * <lang><zh-CN>建立一个包含 length、type、data 与正确 CRC 的 PNG chunk。</zh-CN><en>Builds one PNG chunk containing length, type, data, and a correct CRC.</en></lang>
 * @param {string} chunkType <lang><zh-CN>四字符 ASCII chunk type。</zh-CN><en>Four-character ASCII chunk type.</en></lang>
 * @param {Uint8Array} chunkData <lang><zh-CN>有限人工 data。</zh-CN><en>Finite synthetic data.</en></lang>
 * @returns {Buffer} <lang><zh-CN>完整 chunk bytes。</zh-CN><en>Complete chunk bytes.</en></lang>
 */
function createPngChunk(chunkType, chunkData) {
  // <lang><zh-CN>type 固定来自测试调用，按 PNG ASCII 编码。</zh-CN><en>The test call fixes the type, encoded as PNG ASCII.</en></lang>
  const chunkTypeBytes = Buffer.from(chunkType, 'ascii');

  // <lang><zh-CN>length header 只表示当前受控 data 长度。</zh-CN><en>The length header describes only the current controlled data length.</en></lang>
  const chunkLengthBytes = Buffer.alloc(4);
  chunkLengthBytes.writeUInt32BE(chunkData.byteLength, 0);

  // <lang><zh-CN>CRC 覆盖 type 与 data，不覆盖 length。</zh-CN><en>The CRC covers type and data, not the length.</en></lang>
  const crcInput = Buffer.concat([chunkTypeBytes, Buffer.from(chunkData)]);
  const chunkCrcBytes = Buffer.alloc(4);
  chunkCrcBytes.writeUInt32BE(calculatePngCrc32(crcInput), 0);

  // <lang><zh-CN>返回标准 chunk 布局。</zh-CN><en>Return the standard chunk layout.</en></lang>
  return Buffer.concat([chunkLengthBytes, crcInput, chunkCrcBytes]);
}

/**
 * <lang><zh-CN>建立一张有效灰度 PNG：IDAT 像素故意解压为人工 Windows 路径形状，而显式 tEXt 由调用方控制。</zh-CN><en>Builds a valid grayscale PNG whose IDAT pixels intentionally inflate to a synthetic Windows-path shape while explicit tEXt is caller-controlled.</en></lang>
 * @param {string} metadataText <lang><zh-CN>公开 tEXt payload。</zh-CN><en>Public tEXt payload.</en></lang>
 * @returns {Buffer} <lang><zh-CN>完整 PNG bytes。</zh-CN><en>Complete PNG bytes.</en></lang>
 * @lang zh-CN 此 canary 证明压缩像素不能按 UTF-8 全文扫描；相同路径若进入 tEXt metadata 仍必须失败。
 * @lang en This canary proves compressed pixels cannot be scanned as whole-file UTF-8; the same path must still fail when placed in tEXt metadata.
 */
function createPngFixture(metadataText) {
  // <lang><zh-CN>signature 使用 PNG 固定八字节。</zh-CN><en>The signature uses PNG's fixed eight bytes.</en></lang>
  const signatureBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // <lang><zh-CN>像素字节恰好组成一条人工机器路径，但它们只是单行灰度值，不是 metadata。</zh-CN><en>Pixel bytes happen to form one synthetic machine path, but they are only one row of grayscale values rather than metadata.</en></lang>
  const pixelBytes = Buffer.from(String.raw`Q:\fixture\pixel-only.png`, 'ascii');

  // <lang><zh-CN>IHDR 声明宽度等于灰度像素数、高度 1、8-bit grayscale、无 interlace。</zh-CN><en>IHDR declares a width equal to the grayscale-pixel count, height one, 8-bit grayscale, and no interlace.</en></lang>
  const imageHeaderBytes = Buffer.alloc(13);
  imageHeaderBytes.writeUInt32BE(pixelBytes.length, 0);
  imageHeaderBytes.writeUInt32BE(1, 4);
  imageHeaderBytes[8] = 8;
  imageHeaderBytes[9] = 0;

  // <lang><zh-CN>filter byte 0 后接精确一行像素，并用 level 0 保留可观察 canary 的无压缩 deflate block。</zh-CN><en>A filter byte of zero precedes exactly one pixel row, and level zero retains the observable canary in an uncompressed deflate block.</en></lang>
  const compressedPixelBytes = deflateSync(Buffer.concat([Buffer.from([0]), pixelBytes]), { level: 0 });

  // <lang><zh-CN>tEXt 使用标准 keyword/null/text 结构，verifier 应只审计这里的公开文本。</zh-CN><en>tEXt uses the standard keyword/null/text layout, and the verifier should audit only this public text.</en></lang>
  const metadataBytes = Buffer.concat([Buffer.from('Comment\0', 'latin1'), Buffer.from(metadataText, 'latin1')]);

  // <lang><zh-CN>按标准顺序组合 IHDR、tEXt、IDAT 与 IEND。</zh-CN><en>Combine IHDR, tEXt, IDAT, and IEND in standard order.</en></lang>
  return Buffer.concat([
    signatureBytes,
    createPngChunk('IHDR', imageHeaderBytes),
    createPngChunk('tEXt', metadataBytes),
    createPngChunk('IDAT', compressedPixelBytes),
    createPngChunk('IEND', Buffer.alloc(0))
  ]);
}

/**
 * <lang><zh-CN>创建包含入口、CSS、JS、LICENSE 与 NOTICE 的合格临时 artifact，并登记强制清理。</zh-CN><en>Creates an eligible temporary artifact containing the entry, CSS, JavaScript, LICENSE, and NOTICE and registers mandatory cleanup.</en></lang>
 * @param {import('node:test').TestContext} testContext <lang><zh-CN>当前 Node test context。</zh-CN><en>Current Node test context.</en></lang>
 * @returns {Promise<string>} <lang><zh-CN>隔离 artifact 根。</zh-CN><en>Isolated artifact root.</en></lang>
 */
async function createPassingFixture(testContext) {
  // <lang><zh-CN>系统临时目录中的唯一前缀避免并行测试互相覆盖。</zh-CN><en>A unique prefix in the system temporary directory prevents parallel tests from overwriting one another.</en></lang>
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'bp-h5-pages-artifact-'));

  // <lang><zh-CN>无论断言通过或失败，测试结束都递归删除已解析的唯一临时根。</zh-CN><en>Whether assertions pass or fail, test completion recursively removes the resolved unique temporary root.</en></lang>
  testContext.after(async () => {
    await rm(fixtureRoot, { recursive: true, force: true });
  });

  // <lang><zh-CN>顶层入口证明精确 base 和同源启动资源。</zh-CN><en>The top-level entry proves the exact base and same-origin bootstrap resources.</en></lang>
  await writeFixtureFile(fixtureRoot, 'index.html', passingIndexHtml);

  // <lang><zh-CN>主 CSS 包含受控 dormant framework URL 与明确后置关闭。</zh-CN><en>The main CSS contains the controlled dormant framework URL and its explicit later suppression.</en></lang>
  await writeFixtureFile(fixtureRoot, 'assets/app.css', passingCss);

  // <lang><zh-CN>主 JS 只保留非资源 identifier。</zh-CN><en>The main JavaScript retains only non-resource identifiers.</en></lang>
  await writeFixtureFile(fixtureRoot, 'assets/app.js', passingJavaScript);

  // <lang><zh-CN>九项真实 canonical 法律文本进入精确目标，形成 digest 与正文锚点正例。</zh-CN><en>Nine real canonical legal texts enter their exact destinations, forming the positive digest and content-anchor case.</en></lang>
  await writeLegalFixturePayload(fixtureRoot);

  // <lang><zh-CN>人工 PNG 的 IDAT 含机器路径形状像素，安全 metadata 证明二进制与文字边界。</zh-CN><en>The synthetic PNG has machine-path-shaped pixels in IDAT, while safe metadata proves the binary/text boundary.</en></lang>
  await writeFixtureFile(fixtureRoot, 'static/pixel-canary.png', createPngFixture('First-party fixture image.'));

  // <lang><zh-CN>独立 SVG 根元素只使用标准 xmlns；该 URI 是 namespace，不是浏览器资源。</zh-CN><en>The standalone SVG root uses only the standard xmlns; the URI is a namespace rather than a browser resource.</en></lang>
  await writeFixtureFile(fixtureRoot, 'static/icons/tab-home-active.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0h1v1z" /></svg>');

  // <lang><zh-CN>返回该测试唯一 artifact 根。</zh-CN><en>Return this test's sole artifact root.</en></lang>
  return fixtureRoot;
}

/**
 * <lang><zh-CN>创建不调用字体 API、只声明 host font-family 的 BP-owned source fixture，并放入一个应被跳过的锁定 vendor canary。</zh-CN><en>Creates a BP-owned source fixture that invokes no font API and declares only host font families, plus a locked-vendor canary that must be skipped.</en></lang>
 * @param {import('node:test').TestContext} testContext <lang><zh-CN>当前 Node test context。</zh-CN><en>Current Node test context.</en></lang>
 * @returns {Promise<string>} <lang><zh-CN>隔离 source 根。</zh-CN><en>Isolated source root.</en></lang>
 */
async function createPassingSourceFixture(testContext) {
  // <lang><zh-CN>独立临时根防止 source 负例修改 artifact fixture。</zh-CN><en>An independent temporary root prevents source negatives from modifying artifact fixtures.</en></lang>
  const sourceRoot = await mkdtemp(join(tmpdir(), 'bp-h5-font-source-'));

  // <lang><zh-CN>测试完成后只删除其唯一 source fixture。</zh-CN><en>Delete only this test's unique source fixture after completion.</en></lang>
  testContext.after(async () => {
    await rm(sourceRoot, { recursive: true, force: true });
  });

  // <lang><zh-CN>项目页面只使用 family 名称与 generic fallback，不声明字体文件或加载 API。</zh-CN><en>The project page uses only family names and a generic fallback and declares no font file or loading API.</en></lang>
  await writeFixtureFile(sourceRoot, 'App.vue', `<template><main>Fixture</main></template>\n<style>main{font-family:"Source Han Sans SC",sans-serif}</style>`);

  // <lang><zh-CN>普通 JSON 配置参与有限 source 枚举，但不含动态脚本或字体地址。</zh-CN><en>Ordinary JSON configuration enters finite source enumeration but contains no dynamic script or font location.</en></lang>
  await writeFixtureFile(sourceRoot, 'config/runtime.json', '{"source":"local"}');

  // <lang><zh-CN>vendor canary 故意包含上游字体 capability 形状；顶层 vendor 边界必须完全跳过，不把外部锁定输入归为 BP 自有调用。</zh-CN><en>The vendor canary intentionally contains an upstream font-capability shape; the top-level vendor boundary must be skipped completely rather than classifying a locked external input as a BP-owned invocation.</en></lang>
  await writeFixtureFile(sourceRoot, 'vendor/locked-runtime.js', `uni.loadFontFace({ family: 'IgnoredVendor', source: 'url(/ignored-vendor.woff2)' });`);

  // <lang><zh-CN>返回隔离 source 根。</zh-CN><en>Return the isolated source root.</en></lang>
  return sourceRoot;
}

/**
 * <lang><zh-CN>建立合格 fixture、执行一个受控负例变更，并断言 verifier 以指定稳定类别失败。</zh-CN><en>Creates an eligible fixture, applies one controlled negative mutation, and asserts that the verifier fails with the specified stable category.</en></lang>
 * @param {import('node:test').TestContext} testContext <lang><zh-CN>当前测试 context。</zh-CN><en>Current test context.</en></lang>
 * @param {(fixtureRoot: string) => Promise<void>} mutateFixture <lang><zh-CN>只修改当前 fixture 的异步函数。</zh-CN><en>Async function that modifies only the current fixture.</en></lang>
 * @param {RegExp} expectedError <lang><zh-CN>不含绝对路径或正文的错误类别。</zh-CN><en>Error category containing no absolute path or content.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>负例按预期失败后 resolve。</zh-CN><en>Resolves after the negative case fails as expected.</en></lang>
 */
async function expectFixtureFailure(testContext, mutateFixture, expectedError) {
  // <lang><zh-CN>每个负例都从独立合格基线开始，避免前一变更影响失败原因。</zh-CN><en>Every negative case starts from an independent eligible baseline so an earlier mutation cannot alter the failure cause.</en></lang>
  const fixtureRoot = await createPassingFixture(testContext);

  // <lang><zh-CN>变更函数仅接收临时根，不接收真实项目路径。</zh-CN><en>The mutation receives only the temporary root and no real project path.</en></lang>
  await mutateFixture(fixtureRoot);

  // <lang><zh-CN>verifier 必须 reject；错误表达式只检查稳定合同，不检查宿主路径。</zh-CN><en>The verifier must reject; the error expression checks only the stable contract and not a host path.</en></lang>
  await assert.rejects(() => verifyH5PagesArtifact(fixtureRoot), expectedError);
}

test('accepts the exact project base, required notices, same-origin resources, and suppressed DCloud preload', async function verifyPassingArtifact(testContext) {
  // <lang><zh-CN>正例只由 helper 创建，不读取或复制当前 dist。</zh-CN><en>The helper alone creates the positive case without reading or copying current dist.</en></lang>
  const fixtureRoot = await createPassingFixture(testContext);

  // <lang><zh-CN>验证结果仅包含固定 base 与有限计数。</zh-CN><en>The verification result contains only the fixed base and finite counts.</en></lang>
  const result = await verifyH5PagesArtifact(fixtureRoot);

  // <lang><zh-CN>三个 runtime 文件、九项法律载荷、一张 PNG 和一个独立 SVG 均为 link count 为 1 的普通文件。</zh-CN><en>Three runtime files, nine legal-payload files, one PNG, and one standalone SVG are regular files whose link count is one.</en></lang>
  assert.equal(result.fileCount, 14);

  // <lang><zh-CN>入口三项与 CSS 两项静态引用都已通过 resource policy。</zh-CN><en>All three entry references and both CSS references pass resource policy.</en></lang>
  assert.equal(result.resourceReferenceCount, 5);

  // <lang><zh-CN>成功摘要保持精确项目 base。</zh-CN><en>The success summary retains the exact project base.</en></lang>
  assert.equal(result.base, '/bp-uv-resource-booking/');

  // <lang><zh-CN>正例只保留一份结构锁定、且未被项目调用的 framework dormant capability。</zh-CN><en>The positive case retains exactly one structurally pinned framework dormant capability that the project does not invoke.</en></lang>
  assert.equal(result.dormantFontCapabilityCount, 1);

  // <lang><zh-CN>两个 endpoint/key 同处一份未调用的惰性 manager surface。</zh-CN><en>The two endpoint/key pairs coexist in one uninvoked lazy-manager surface.</en></lang>
  assert.equal(result.dormantAdManagerCount, 1);

  // <lang><zh-CN>冻结结果防止调用方事后篡改审计摘要。</zh-CN><en>A frozen result prevents callers from altering the audit summary afterward.</en></lang>
  assert.equal(Object.isFrozen(result), true);
});

test('requires top-level entry and the complete pinned legal payload as regular files', async function verifyRequiredTopLevelFiles(testContext) {
  // <lang><zh-CN>删除入口不能由嵌套资产或许可证替代。</zh-CN><en>Removing the entry cannot be compensated for by nested assets or licenses.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await rm(join(fixtureRoot, 'index.html'));
  }, /top-level index\.html is missing/u);

  // <lang><zh-CN>删除 LICENSE 必须单独失败，避免只部署 NOTICE。</zh-CN><en>Removing LICENSE must fail independently, preventing deployment of NOTICE alone.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await rm(join(fixtureRoot, 'LICENSE'));
  }, /legal payload LICENSE is missing/u);

  // <lang><zh-CN>删除 NOTICE 必须单独失败，避免上游/运行时声明从 Pages artifact 消失。</zh-CN><en>Removing NOTICE must fail independently so upstream/runtime notices cannot disappear from the Pages artifact.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await rm(join(fixtureRoot, 'THIRD_PARTY_NOTICES.md'));
  }, /top-level THIRD_PARTY_NOTICES\.md is missing/u);

  // <lang><zh-CN>删除嵌套 Vue Router 独立许可证必须失败，不能由 Vue core MIT 文本替代。</zh-CN><en>Removing the nested independent Vue Router license must fail; the Vue core MIT text cannot substitute for it.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await rm(join(fixtureRoot, 'LICENSES', 'Vue-Router-MIT.txt'));
  }, /legal payload LICENSES\/Vue-Router-MIT\.txt is missing/u);

  // <lang><zh-CN>即使保留文件名与可读标题，改变一个 canonical byte 也必须由固定摘要阻断。</zh-CN><en>Even with the filename and readable title retained, changing one canonical byte must be blocked by the pinned digest.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    const vueLicensePath = join(fixtureRoot, 'LICENSES', 'Vue-MIT.txt');
    const vueLicenseBytes = await readFile(vueLicensePath);
    await writeFixtureFile(fixtureRoot, 'LICENSES/Vue-MIT.txt', Buffer.concat([vueLicenseBytes, Buffer.from('\n')]));
  }, /does not match its pinned SHA-256/u);
});

test('rejects a root resource outside the exact project base', async function verifyWrongBase(testContext) {
  // <lang><zh-CN>错误入口仍是有效 HTML，但把启动资源指向站点根的其他子路径。</zh-CN><en>The invalid entry remains valid HTML but points bootstrap resources at another site-root subpath.</en></lang>
  const wrongBaseIndex = `<!doctype html>
<html><head><link rel="stylesheet" href="/wrong-base/assets/app.css"></head>
<body><script type="module" src="/wrong-base/assets/app.js"></script></body></html>`;

  // <lang><zh-CN>覆盖仅发生在临时入口。</zh-CN><en>The overwrite affects only the temporary entry.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'index.html', wrongBaseIndex);
  }, /outside the exact project base/u);
});

test('requires one exact same-origin SVG favicon and its regular artifact target', async function verifyFaviconContract(testContext) {
  // <lang><zh-CN>完全删除 favicon 声明时，即使其他启动资源仍使用正确 base 也必须失败。</zh-CN><en>Removing the favicon declaration completely must fail even when other bootstrap resources still use the correct base.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'index.html', passingIndexHtml.replace(passingFaviconTag, ''));
  }, /sole exact project favicon/u);

  // <lang><zh-CN>重复同一个精确 tag 仍违反唯一性，不能用字面值存在掩盖第二声明。</zh-CN><en>Duplicating the exact same tag still violates uniqueness; literal presence cannot conceal a second declaration.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'index.html', passingIndexHtml.replace(passingFaviconTag, `${passingFaviconTag}\n    ${passingFaviconTag}`));
  }, /sole exact project favicon/u);

  // <lang><zh-CN>外部 favicon 即使 MIME 正确也扩大网络来源，先由通用未知外链门禁阻断。</zh-CN><en>An external favicon expands network provenance even with the correct MIME and is first blocked by the general unknown-link gate.</en></lang>
  const externalFaviconTag = '<link rel="icon" type="image/svg+xml" href="https://example.invalid/favicon.svg">';
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'index.html', passingIndexHtml.replace(passingFaviconTag, externalFaviconTag));
  }, /unknown external URL/u);

  // <lang><zh-CN>站点根的其他子路径不是本项目 Pages base，不能被同源概念放宽。</zh-CN><en>Another site-root subpath is not this project's Pages base and cannot be relaxed merely because it is same-origin.</en></lang>
  const wrongBaseFaviconTag = '<link rel="icon" type="image/svg+xml" href="/wrong-base/static/icons/tab-home-active.svg">';
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'index.html', passingIndexHtml.replace(passingFaviconTag, wrongBaseFaviconTag));
  }, /outside the exact project base/u);

  // <lang><zh-CN>正确 href 但错误 MIME/属性形状不是精确 favicon 合同。</zh-CN><en>The correct href with a wrong MIME/attribute shape is not the exact favicon contract.</en></lang>
  const wrongMimeFaviconTag = '<link rel="icon" type="image/png" href="/bp-uv-resource-booking/static/icons/tab-home-active.svg">';
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'index.html', passingIndexHtml.replace(passingFaviconTag, wrongMimeFaviconTag));
  }, /sole exact project favicon/u);

  // <lang><zh-CN>入口声明正确但 SVG 目标缺失时不能部署悬空 favicon。</zh-CN><en>A correct entry declaration cannot deploy a dangling favicon when the SVG target is absent.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await rm(join(fixtureRoot, 'static', 'icons', 'tab-home-active.svg'));
  }, /exact project favicon target is missing/u);
});

test('rejects Uni Statistics initialization and collector endpoints', async function verifyTelemetryRejection(testContext) {
  // <lang><zh-CN>将 endpoint 分段拼接，避免测试源码本身伪装成可用运行配置。</zh-CN><en>Assemble the endpoint in segments so the test source itself does not masquerade as usable runtime configuration.</en></lang>
  const collectorEndpoint = ['https://tongji-collector', 'dcloud.net.cn'].join('.');

  // <lang><zh-CN>人工 bundle 同时模拟稳定 initializer marker 与 collector 字面值。</zh-CN><en>The synthetic bundle simulates both the stable initializer marker and collector literal.</en></lang>
  const telemetryBundle = `const marker = '[uni统计 2.0]'; const endpoint = '${collectorEndpoint}'; void marker; void endpoint;`;

  // <lang><zh-CN>替换主 JS 后必须在任意外链分类前以 telemetry 类别失败。</zh-CN><en>After replacing the main JavaScript, the gate must fail with the telemetry category before generic external-link classification.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', telemetryBundle);
  }, /Uni Statistics/u);
});

test('rejects absolute machine paths and internal collaboration markers', async function verifyPrivatePathRejection(testContext) {
  // <lang><zh-CN>人工 Windows 路径不对应当前工作区，只用于验证驱动器根识别。</zh-CN><en>The synthetic Windows path does not identify the current workspace and only verifies drive-root recognition.</en></lang>
  const windowsPathBundle = String.raw`const buildSource = "Q:\example\private\entry.mjs"; void buildSource;`;

  // <lang><zh-CN>驱动器路径必须以机器路径类别失败。</zh-CN><en>The drive path must fail under the machine-path category.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', windowsPathBundle);
  }, /absolute machine path/u);

  // <lang><zh-CN>同一人工路径进入 PNG tEXt metadata 时必须失败；正例已证明 IDAT 灰度像素中的相同形状被正确忽略。</zh-CN><en>The same synthetic path must fail in PNG tEXt metadata; the positive case already proves that the matching shape in IDAT grayscale pixels is ignored correctly.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'static/pixel-canary.png', createPngFixture(String.raw`Source Q:\fixture\metadata-leak.png`));
  }, /absolute machine path/u);

  // <lang><zh-CN>在测试运行时拼接内部协作区 marker，让 fixture 含连续字面值而测试源码不伪装为构建输出。</zh-CN><en>Assemble the internal collaboration-zone marker at test runtime so the fixture contains a contiguous literal while the test source does not masquerade as build output.</en></lang>
  const internalMarker = ['work', 'zone'].join('-');

  // <lang><zh-CN>内部协作区名称不依赖绝对路径也必须被拒绝。</zh-CN><en>The internal collaboration-zone name must be rejected even without an absolute path.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', `const internalArea = '${internalMarker}'; void internalArea;`);
  }, /internal collaboration marker/u);
});

test('rejects source-map files and sourceMappingURL directives', async function verifySourceMapRejection(testContext) {
  // <lang><zh-CN>独立 `.map` 文件即使不被入口引用也不得上传。</zh-CN><en>A standalone `.map` file must not be uploaded even when the entry does not reference it.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js.map', '{}');
  }, /source map is present/u);

  // <lang><zh-CN>没有实际 map 文件的 directive 仍可能触发请求并披露映射名。</zh-CN><en>A directive without an actual map can still trigger a request and disclose the mapping name.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', `void 0;\n//# sourceMappingURL=/bp-uv-resource-booking/assets/app.js.map`);
  }, /source-map reference/u);
});

test('rejects unknown external resources and an unsuppressed DCloud preload', async function verifyExternalResourceRejection(testContext) {
  // <lang><zh-CN>入口保留合格 local CSS，另把 script 指向人工外部 host。</zh-CN><en>The entry retains eligible local CSS while pointing the script at a synthetic external host.</en></lang>
  const externalIndex = `<!doctype html>
<html><head><link rel="stylesheet" href="/bp-uv-resource-booking/assets/app.css"></head>
<body><script type="module" src="https://example.invalid/app.js"></script></body></html>`;

  // <lang><zh-CN>未知绝对 URL 不得成为 HTML resource。</zh-CN><en>An unknown absolute URL must not become an HTML resource.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'index.html', externalIndex);
  }, /unknown external URL/u);

  // <lang><zh-CN>精确 DCloud URL 只有预载规则而没有后置关闭时仍必须失败。</zh-CN><en>The exact DCloud URL must still fail when it has only the preload rule and no later suppression.</en></lang>
  const unsuppressedCss = `body:after{animation:shadow-preload .1s;background-image:url(https://cdn.dcloud.net.cn/img/shadow-grey.png)}`;
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.css', unsuppressedCss);
  }, /DCloud shadow preload/u);
});

test('allows only the reviewed SVG namespace and Vue diagnostic URI shapes', async function verifyInertUriBoundary(testContext) {
  // <lang><zh-CN>标准 SVG URI 若在同文件第二次作为 href 出现，就不再是唯一根 namespace。</zh-CN><en>If the standard SVG URI appears a second time as href in the same file, it is no longer the sole root namespace.</en></lang>
  const linkedNamespaceSvg = '<svg xmlns="http://www.w3.org/2000/svg"><a href="http://www.w3.org/2000/svg"><path d="M0 0" /></a></svg>';
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'static/icons/tab-home-active.svg', linkedNamespaceSvg);
  }, /unknown external URL/u);

  // <lang><zh-CN>同一 xmlns 即使写在内联 HTML 的 `<svg>` 上，也不属于独立 `.svg` 文件的窄例外。</zh-CN><en>The same xmlns on an inline HTML `<svg>` does not belong to the narrow standalone-`.svg` exception.</en></lang>
  const inlineSvgIndex = `<!doctype html><html><head><link rel="stylesheet" href="/bp-uv-resource-booking/assets/app.css"></head><body><svg xmlns="http://www.w3.org/2000/svg"></svg><script src="/bp-uv-resource-booking/assets/app.js"></script></body></html>`;
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'index.html', inlineSvgIndex);
  }, /unknown external URL/u);

  // <lang><zh-CN>Vue 文档 prefix 后的静态编号不是锁定 compiler template 形状。</zh-CN><en>A static number after the Vue documentation prefix is not the pinned compiler-template shape.</en></lang>
  const staticVueSuffix = 'const runtimeErrorReference="https://vuejs.org/error-reference/#runtime-17";console.error(runtimeErrorReference);';
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', staticVueSuffix);
  }, /unknown external URL/u);

  // <lang><zh-CN>精确 template URI 直接进入 fetch 时是网络资源，而不是局部错误诊断变量。</zh-CN><en>The exact template URI is a network resource when passed directly to fetch rather than bound as a local error-diagnostic variable.</en></lang>
  const fetchedVueTemplate = 'function loadReference(errorCode){return fetch(`https://vuejs.org/error-reference/#runtime-${errorCode}`)}';
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', fetchedVueTemplate);
  }, /unknown external URL/u);
});

test('allows ad endpoints only inside one complete uninvoked DCloud manager surface', async function verifyDormantAdManagerBoundary(testContext) {
  // <lang><zh-CN>仅放入 endpoint/key 而没有 instance/get/process/storage 结构，不构成 dormant 例外。</zh-CN><en>Endpoint/key literals without instance/get/process/storage shapes do not form a dormant exception.</en></lang>
  const incompleteAdSurface = [
    'const configUrl = "https://hac1.dcloud.net.cn/ah5v2";',
    'const guidUrl = "https://has1.dcloud.net.cn/ahl";',
    'const configKey = "uni_app_ad_config";',
    'const guidKey = "uni_app_ad_guid";',
    'void configUrl; void guidUrl; void configKey; void guidKey;'
  ].join('\n');
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', incompleteAdSurface);
  }, /dormant ad manager shape is invalid/u);

  // <lang><zh-CN>在合格 framework surface 后显式读取 manager `.instance` 会自动初始化 manager，因此不再 dormant。</zh-CN><en>Explicitly reading manager `.instance` after an eligible framework surface initializes the manager, so it is no longer dormant.</en></lang>
  const invokedAdSurface = `${passingJavaScript}\nAdConfigManager.instance.get('fixture');`;
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', invokedAdSurface);
  }, /dormant ad manager shape is invalid/u);

  // <lang><zh-CN>在受控两 endpoint 之外增加第三个广告 host 仍按未知外链失败，不能泛化为 DCloud/广告域名白名单。</zh-CN><en>Adding a third advertising host beyond the controlled pair still fails as an unknown external URL and cannot generalize into a DCloud/advertising-domain allowlist.</en></lang>
  const thirdAdEndpoint = `${passingJavaScript}\nconst extraAdEndpoint = 'https://ads.example.invalid/request'; void extraAdEndpoint;`;
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', thirdAdEndpoint);
  }, /unknown external URL/u);

  // <lang><zh-CN>endpoint 出现在 HTML resource surface 时没有 JS manager 结构，必须失败。</zh-CN><en>An endpoint on an HTML resource surface has no JavaScript manager shape and must fail.</en></lang>
  const adEndpointIndex = `<!doctype html><html><head><link rel="stylesheet" href="/bp-uv-resource-booking/assets/app.css"></head><body><img src="https://hac1.dcloud.net.cn/ah5v2"><script src="/bp-uv-resource-booking/assets/app.js"></script></body></html>`;
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'index.html', adEndpointIndex);
  }, /dormant ad manager/u);
});

test('rejects symbolic links and hard links inside the artifact', async function verifyLinkTypeRejection(testContext) {
  // <lang><zh-CN>symlink fixture 从合格树开始，并在同一临时根内创建真实目标目录。</zh-CN><en>The symlink fixture starts from an eligible tree and creates a real target directory inside the same temporary root.</en></lang>
  const symlinkFixtureRoot = await createPassingFixture(testContext);
  const realDirectory = join(symlinkFixtureRoot, 'assets', 'real-directory');
  await mkdir(realDirectory, { recursive: true });
  await writeFixtureFile(symlinkFixtureRoot, 'assets/real-directory/value.txt', 'fixture');

  // <lang><zh-CN>Windows 使用无需文件目标推断的 junction，其他平台使用目录 symlink；二者均应被 lstat 识别为 symbolic link。</zh-CN><en>Windows uses a junction that needs no file-target inference, while other platforms use a directory symlink; lstat must recognize both as symbolic links.</en></lang>
  const symbolicLinkType = process.platform === 'win32' ? 'junction' : 'dir';
  const symbolicLinkPath = join(symlinkFixtureRoot, 'assets', 'linked-directory');
  await symlink(realDirectory, symbolicLinkPath, symbolicLinkType);

  // <lang><zh-CN>链接即使指向 artifact 内部也不能替代普通目录。</zh-CN><en>The link cannot substitute for a regular directory even when its target is inside the artifact.</en></lang>
  await assert.rejects(() => verifyH5PagesArtifact(symlinkFixtureRoot), /symbolic link is present/u);

  // <lang><zh-CN>hardlink 使用另一个独立 fixture，避免前述 symlink 提前决定失败原因。</zh-CN><en>The hardlink uses another independent fixture so the prior symlink cannot determine the failure first.</en></lang>
  const hardlinkFixtureRoot = await createPassingFixture(testContext);
  const originalFile = join(hardlinkFixtureRoot, 'assets', 'app.js');
  const hardlinkFile = join(hardlinkFixtureRoot, 'assets', 'app-copy.js');
  await link(originalFile, hardlinkFile);

  // <lang><zh-CN>任一普通文件 link count 非 1 都不能形成可移植 Pages artifact。</zh-CN><en>No regular file whose link count differs from one can form a portable Pages artifact.</en></lang>
  await assert.rejects(() => verifyH5PagesArtifact(hardlinkFixtureRoot), /hard link is present/u);
});

test('rejects environment/private configuration files and credential markers', async function verifyConfigurationAndSecretRejection(testContext) {
  // <lang><zh-CN>`.env` 变体即使只含人工值也属于构建环境文件。</zh-CN><en>An `.env` variant remains a build-environment file even when it contains only synthetic values.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, '.env.production', 'SYNTHETIC_VALUE=fixture');
  }, /environment file is present/u);

  // <lang><zh-CN>微信私有 project config 不属于 H5 Pages artifact。</zh-CN><en>The private WeChat project configuration does not belong in the H5 Pages artifact.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'project.private.config.json', '{}');
  }, /private configuration is present/u);

  // <lang><zh-CN>人工 token 在运行时拼接，测试仓中不存在完整可扫描凭据字面值。</zh-CN><en>The synthetic token is assembled at runtime, so the test repository contains no complete scannable credential literal.</en></lang>
  const syntheticToken = ['github', 'pat', 'A'.repeat(24)].join('_');
  const secretBundle = `const accidentalCredential = '${syntheticToken}'; void accidentalCredential;`;

  // <lang><zh-CN>写入 artifact 后高置信度 marker 必须失败且不得回显 token。</zh-CN><en>After entering the artifact, the high-confidence marker must fail without echoing the token.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', secretBundle);
  }, /GitHub token marker/u);
});

test('rejects font binaries and font-face rules', async function verifyFontRejection(testContext) {
  // <lang><zh-CN>任意字体二进制扩展名都与 host-fallback 声明冲突。</zh-CN><en>Every font-binary extension contradicts the host-fallback declaration.</en></lang>
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/example.woff2', new Uint8Array([0x77, 0x4f, 0x46, 0x32]));
  }, /font binary is present/u);

  // <lang><zh-CN>即使字体 URL 位于正确项目 base，`@font-face` 仍表示仓库开始交付字体。</zh-CN><en>Even when a font URL uses the correct project base, `@font-face` means the repository has begun delivering a font.</en></lang>
  const fontFaceCss = `@font-face{font-family:Fixture;src:url('/bp-uv-resource-booking/assets/example.woff2')} body{font-family:Fixture}`;
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.css', fontFaceCss);
  }, /font-face rule is present/u);

  // <lang><zh-CN>JS 中任意不具备完整 framework 注册、原生分支与动态模板形状的 `@font-face` 字符串仍是未知注入。</zh-CN><en>Any JavaScript `@font-face` string lacking the complete framework registration, native branch, and dynamic-template shape remains an unknown injection.</en></lang>
  const unknownJavaScriptFontFace = 'const injectedStyle = `@font-face{font-family:"Unknown";src:local("Unknown")}`; void injectedStyle;';
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', unknownJavaScriptFontFace);
  }, /outside the reviewed dormant capability/u);

  // <lang><zh-CN>即使没有 `@font-face`，JS 中固定项目路径字体也会形成可自动采用的未知静态依赖。</zh-CN><en>Even without `@font-face`, a fixed project-path font in JavaScript forms an unknown static dependency that could be adopted automatically.</en></lang>
  const staticFontJavaScript = `const fontAsset = '/bp-uv-resource-booking/assets/unknown.woff2'; void fontAsset;`;
  await expectFixtureFailure(testContext, async (fixtureRoot) => {
    await writeFixtureFile(fixtureRoot, 'assets/app.js', staticFontJavaScript);
  }, /static font resource/u);
});

test('proves BP-owned source does not invoke or declare font delivery while skipping locked vendor', async function verifyProjectFontSourceBoundary(testContext) {
  // <lang><zh-CN>合格 source 只有 host family 名称；vendor canary 不计入 BP-owned 文件数或判断。</zh-CN><en>Eligible source has only host family names; the vendor canary contributes neither to the BP-owned file count nor the judgment.</en></lang>
  const passingSourceRoot = await createPassingSourceFixture(testContext);
  const passingResult = await verifyH5FontSourceBoundary(passingSourceRoot);
  assert.equal(passingResult.fileCount, 2);
  assert.equal(Object.isFrozen(passingResult), true);

  // <lang><zh-CN>项目自有 `uni.loadFontFace` 调用即使指向示例地址也扩大运行能力边界。</zh-CN><en>A project-owned `uni.loadFontFace` call expands runtime capability even when it points at a synthetic location.</en></lang>
  const invokingSourceRoot = await createPassingSourceFixture(testContext);
  await writeFixtureFile(invokingSourceRoot, 'main.mjs', `uni.loadFontFace({ family: 'Fixture', source: 'url(/fixture.woff2)' });`);
  await assert.rejects(() => verifyH5FontSourceBoundary(invokingSourceRoot), /project source invokes loadFontFace/u);

  // <lang><zh-CN>项目 CSS 中直接声明 `@font-face` 不属于 framework dormant capability。</zh-CN><en>A direct `@font-face` declaration in project CSS does not belong to the framework dormant capability.</en></lang>
  const declaringSourceRoot = await createPassingSourceFixture(testContext);
  await writeFixtureFile(declaringSourceRoot, 'styles/font.scss', `@font-face{font-family:Fixture;src:local('Fixture')}`);
  await assert.rejects(() => verifyH5FontSourceBoundary(declaringSourceRoot), /project source declares font-face/u);

  // <lang><zh-CN>没有 API 调用或 CSS 声明的固定字体地址仍是未知 source 依赖。</zh-CN><en>A fixed font location without an API call or CSS declaration remains an unknown source dependency.</en></lang>
  const staticResourceSourceRoot = await createPassingSourceFixture(testContext);
  await writeFixtureFile(staticResourceSourceRoot, 'styles/reference.scss', `.canary{background-image:url('/assets/fixture.ttf')}`);
  await assert.rejects(() => verifyH5FontSourceBoundary(staticResourceSourceRoot), /project source declares a static font resource/u);

  // <lang><zh-CN>项目模板 `<ad>`、adpid 与 create*Ad 调用中的任一项都表示主动采用广告能力。</zh-CN><en>Any project template `<ad>`, adpid, or create*Ad call means active adoption of advertising capability.</en></lang>
  const adSurfaceSourceRoot = await createPassingSourceFixture(testContext);
  await writeFixtureFile(adSurfaceSourceRoot, 'pages/ad.vue', `<template><ad adpid="fixture" /></template><script>uni.createRewardedVideoAd()</script>`);
  await assert.rejects(() => verifyH5FontSourceBoundary(adSurfaceSourceRoot), /project source declares an advertising surface/u);

  // <lang><zh-CN>固定 manager endpoint/storage key 即使未与组件相连也不能进入 BP 自有 source。</zh-CN><en>A fixed manager endpoint/storage key cannot enter BP-owned source even when it is not connected to a component.</en></lang>
  const adMarkerSourceRoot = await createPassingSourceFixture(testContext);
  await writeFixtureFile(adMarkerSourceRoot, 'config/ad.json', `{"key":"uni_app_ad_config","url":"https://hac1.dcloud.net.cn/ah5v2"}`);
  await assert.rejects(() => verifyH5FontSourceBoundary(adMarkerSourceRoot), /project source declares an advertising surface/u);
});
