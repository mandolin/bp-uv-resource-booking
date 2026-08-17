/**
 * <lang><zh-CN>验证固定 H5 GitHub Pages 成品的路径、文件类型、静态 base、隐私、遥测、字体与外部资源边界；直接执行时只读取 `dist/build/h5`，导出的验证函数仅供隔离 fixture 测试复用。</zh-CN><en>Verifies path, file-type, static-base, privacy, telemetry, font, and external-resource boundaries of the fixed H5 GitHub Pages artifact; direct execution reads only `dist/build/h5`, while the exported verifier is reused only by isolated fixture tests.</en></lang>
 * @lang zh-CN 本门禁只证明静态成品满足发布前负面约束，不替代 GitHub Pages 线上响应、浏览器 Network/Console 或业务流程验收。
 * @lang en This gate proves only pre-release negative constraints of the static artifact; it does not replace GitHub Pages response checks, browser Network/Console review, or business-flow acceptance.
 */

// <lang><zh-CN>只使用 Node 内建加密、只读文件系统与路径 API；脚本不执行成品、不访问网络，也不读取环境变量。</zh-CN><en>Use only Node built-in cryptography, read-only file-system, and path APIs; the script neither executes the artifact nor accesses the network or environment variables.</en></lang>
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';

// <lang><zh-CN>复用唯一字体专项门禁验证 source WOFF 的 CFF/name/cmap、语料、许可与生成链；H5 门禁只把其固定字节身份绑定到 Pages 成品。</zh-CN><en>Reuse the sole font-specific gate for source WOFF CFF/name/cmap, corpus, license, and toolchain verification; the H5 gate only binds those fixed byte identities into the Pages artifact.</en></lang>
import { verifyFontSubsets } from './verify-font-subsets.mjs';

/**
 * <lang><zh-CN>GitHub Pages 项目站唯一允许的根相对静态 base。</zh-CN><en>The sole root-relative static base allowed for the GitHub Pages project site.</en></lang>
 */
const PROJECT_BASE = '/bp-uv-resource-booking/';

/**
 * <lang><zh-CN>Pages 入口唯一允许的 favicon href、精确 link tag 与 artifact 相对目标。</zh-CN><en>The sole favicon href, exact link tag, and artifact-relative target allowed in the Pages entry.</en></lang>
 * @lang zh-CN favicon 复用 BP 已分发的一方本地图标，不增加图片、字体、CDN 或其他网络来源。
 * @lang en The favicon reuses a first-party local icon already distributed by the BP and adds no image, font, CDN, or other network source.
 */
const PROJECT_FAVICON_HREF = `${PROJECT_BASE}static/icons/tab-home-active.svg`;
const PROJECT_FAVICON_TAG = `<link rel="icon" type="image/svg+xml" href="${PROJECT_FAVICON_HREF}">`;
const PROJECT_FAVICON_ARTIFACT_PATH = 'static/icons/tab-home-active.svg';

// <lang><zh-CN>从脚本自身位置解析固定 BP 根，避免调用目录改变直接执行的审计边界。</zh-CN><en>Resolve the fixed BP root from the script location so the calling directory cannot change the direct-execution audit boundary.</en></lang>
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// <lang><zh-CN>直接执行入口只检查构建器约定的 H5 发布目录，不接受 CLI 路径。</zh-CN><en>The direct entry checks only the builder-defined H5 publication directory and accepts no CLI path.</en></lang>
const fixedOutputRoot = resolve(projectRoot, 'dist/build/h5');

// <lang><zh-CN>直接执行还检查 BP 自有 `src`，证明项目没有调用 framework 的 dormant 字体能力或声明字体资源；锁定 vendor 由其自身仓库治理。</zh-CN><en>Direct execution also checks the BP-owned `src`, proving that the project neither invokes the framework's dormant font capability nor declares font resources; locked vendor inputs remain governed by their own repositories.</en></lang>
const fixedSourceRoot = resolve(projectRoot, 'src');

/**
 * <lang><zh-CN>DCloud H5 固定样式中唯一受控的 dormant 外链；只有同一 CSS 在其后明确关闭伪元素动画和背景时才允许保留。</zh-CN><en>The sole controlled dormant external URL in the pinned DCloud H5 style; it may remain only when the same CSS subsequently disables the pseudo-element animation and background explicitly.</en></lang>
 */
const DCLOUD_SHADOW_URL = 'https://cdn.dcloud.net.cn/img/shadow-grey.png';

/**
 * <lang><zh-CN>锁定 UniApp H5 bundle 中 dormant 广告配置管理器的两个 endpoint 与两个 storage key。</zh-CN><en>Locks the two endpoints and two storage keys of the dormant ad-configuration managers in the UniApp H5 bundle.</en></lang>
 * @lang zh-CN 它们不是 BP 运行依赖白名单；只有完整惰性 manager 结构、source 零采用和浏览器零跨域 smoke 共同成立时才是受控成品例外。
 * @lang en They are not a BP runtime-dependency allowlist; they form a controlled artifact exception only together with the complete lazy-manager shape, zero source adoption, and a zero-cross-origin browser smoke.
 */
const DCLOUD_AD_CONFIG_URL = 'https://hac1.dcloud.net.cn/ah5v2';
const DCLOUD_AD_GUID_URL = 'https://has1.dcloud.net.cn/ahl';
const DCLOUD_AD_CONFIG_KEY = 'uni_app_ad_config';
const DCLOUD_AD_GUID_KEY = 'uni_app_ad_guid';

/**
 * <lang><zh-CN>任一出现即触发完整 dormant ad manager 结构审计的固定 marker。</zh-CN><en>Fixed markers whose presence triggers the complete dormant-ad-manager shape audit.</en></lang>
 */
const dcloudAdManagerMarkers = Object.freeze([
  DCLOUD_AD_CONFIG_URL,
  DCLOUD_AD_GUID_URL,
  DCLOUD_AD_CONFIG_KEY,
  DCLOUD_AD_GUID_KEY
]);

/**
 * <lang><zh-CN>编译器/runtime 用作命名空间或错误说明标识且不会声明网络资源的有限 URL。</zh-CN><en>Finite URLs used by the compiler/runtime as namespace or error-reference identifiers rather than declared network resources.</en></lang>
 * @lang zh-CN 该清单不能扩展为业务 endpoint、CDN、统计、广告、字体或运行时 fetch 例外。
 * @lang en This list must not expand into exceptions for business endpoints, CDNs, telemetry, advertising, fonts, or runtime fetches.
 */
const inertIdentifierUrls = new Set([
  'http://www.w3.org/1998/Math/MathML',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/XML/1998/namespace'
]);

/**
 * <lang><zh-CN>Uni Statistics 初始化与 collector 的稳定禁用标记。</zh-CN><en>Stable forbidden markers for Uni Statistics initialization and collectors.</en></lang>
 * @lang zh-CN 任何一项进入成品都说明“默认零遥测”尚未由编译结果证明。
 * @lang en Any marker entering the artifact means the compiled result has not yet proved the default zero-telemetry boundary.
 */
const forbiddenTelemetryMarkers = Object.freeze([
  Object.freeze({ label: 'Uni Statistics collector endpoint', value: 'https://tongji-collector.dcloud.net.cn' }),
  Object.freeze({ label: 'Uni Statistics image endpoint', value: 'https://tongji.dcloud.io/uni/stat.gif' }),
  Object.freeze({ label: 'Uni Statistics legacy endpoint', value: 'https://tongji.dcloud.io/uni/stat' }),
  Object.freeze({ label: 'Uni Statistics initializer', value: '[uni统计 2.0]' }),
  Object.freeze({ label: 'Uni Statistics enabled banner', value: 'uni统计 2.0 已启用' })
]);

/**
 * <lang><zh-CN>高置信度凭据正文标记；只报告类别，不回显命中的敏感文本。</zh-CN><en>High-confidence credential-content markers; diagnostics report only the category and never echo matched sensitive text.</en></lang>
 */
const forbiddenSecretPatterns = Object.freeze([
  Object.freeze({ label: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/iu }),
  Object.freeze({ label: 'GitHub token', pattern: /(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})/u }),
  Object.freeze({ label: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/u }),
  Object.freeze({ label: 'Google API key', pattern: /AIza[0-9A-Za-z_-]{30,}/u }),
  Object.freeze({ label: 'payment secret key', pattern: /sk_(?:live|test)_[0-9A-Za-z]{16,}/u }),
  Object.freeze({ label: 'Slack token', pattern: /xox[baprs]-[0-9A-Za-z-]{16,}/u }),
  Object.freeze({ label: 'Bearer credential', pattern: /Bearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}/iu })
]);

/**
 * <lang><zh-CN>不得进入 Pages artifact 的目录段。</zh-CN><en>Directory segments forbidden from the Pages artifact.</en></lang>
 */
const forbiddenDirectorySegments = new Set(['.git', '.hg', '.svn', '.ssh', 'node_modules']);

/**
 * <lang><zh-CN>不得作为静态发布文件出现的私有或工具配置文件名。</zh-CN><en>Private or tool-configuration filenames forbidden as static publication files.</en></lang>
 */
const forbiddenConfigurationNames = new Set([
  '.npmrc',
  '.pnpmrc',
  '.yarnrc',
  '.yarnrc.yml',
  'project.private.config.json'
]);

/**
 * <lang><zh-CN>始终禁止的字体二进制扩展名；唯一允许的 WOFF 1.0 由下方 manifest/hash/name allowlist 独立治理。</zh-CN><en>Font-binary extensions that remain unconditionally forbidden; the only allowed WOFF 1.0 files are governed separately by the manifest/hash/name allowlist below.</en></lang>
 */
const forbiddenFontExtensions = new Set(['.eot', '.otf', '.ttc', '.ttf', '.woff2']);

/**
 * <lang><zh-CN>PNG signature 与 metadata 解压上限用于区分可审计文字块和不可按文本解释的压缩像素。</zh-CN><en>The PNG signature and metadata inflation limit separate auditable text chunks from compressed pixels that must not be interpreted as text.</en></lang>
 */
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const maximumPngMetadataBytes = 1024 * 1024;

/**
 * <lang><zh-CN>文本资源扩展名仅决定需要解析 HTML/CSS resource reference 的文件；隐私、凭据和遥测 marker 仍扫描全部普通文件。</zh-CN><en>Text-resource extensions determine only which files need HTML/CSS resource-reference parsing; privacy, credential, and telemetry markers are still scanned in every regular file.</en></lang>
 */
const htmlExtensions = new Set(['.htm', '.html', '.svg']);

/**
 * <lang><zh-CN>可能声明浏览器字体行为或字体资源的 runtime 文本扩展名。</zh-CN><en>Runtime-text extensions that can declare browser font behavior or font resources.</en></lang>
 */
const runtimeTextExtensions = new Set(['.css', '.htm', '.html', '.js', '.mjs', '.svg']);

/**
 * <lang><zh-CN>BP 自有 source 字体边界扫描的有限语言扩展名。</zh-CN><en>Finite language extensions scanned for the BP-owned source font boundary.</en></lang>
 */
const projectSourceExtensions = new Set(['.css', '.htm', '.html', '.js', '.json', '.mjs', '.scss', '.svg', '.vue']);

/**
 * <lang><zh-CN>静态字体地址、data font 与常见远程字体样式服务 marker。</zh-CN><en>Markers for static font locations, data fonts, and common remote font-style services.</en></lang>
 * @lang zh-CN 动态 DCloud `loadFontFace` capability 只传递调用方参数，不含这些静态 marker；项目 source 或 artifact 出现任一项均说明字体边界已扩大。
 * @lang en The dynamic DCloud `loadFontFace` capability only forwards caller parameters and contains none of these static markers; any occurrence in project source or the artifact expands the font boundary.
 */
const staticFontReferencePattern = /(?:data:(?:font\/|application\/(?:font|x-font))|(?:https?:\/\/|\/|\.\.?\/)[^\s"'`<>()]*\.(?:eot|otf|ttc|ttf|woff2?)(?:[?#][^\s"'`<>()]*)?|https?:\/\/(?:fonts\.(?:googleapis|gstatic)\.com|use\.typekit\.(?:com|net)|fast\.fonts\.net)(?:[/:?#]|$))/iu;

/**
 * <lang><zh-CN>字体生成 manifest 的固定 source 路径与当前已审字节摘要。</zh-CN><en>Fixed source path and currently reviewed byte digest of the generated font manifest.</en></lang>
 * @lang zh-CN manifest 是 source 审计输入而不是浏览器资源；任何重建导致的摘要变化都必须显式更新本交付门禁。
 * @lang en The manifest is a source-audit input rather than a browser resource; any rebuild that changes its digest requires an explicit update to this delivery gate.
 */
const fontManifestRelativePath = 'assets/fonts/font-subsets.manifest.json';
const PINNED_FONT_MANIFEST_SHA256 = '565FEC427F716B53BAD669A67460394106441DE871FC225490F69B7A024946A0';

/**
 * <lang><zh-CN>source gate 唯一允许承载字体声明的两个生成样式文件。</zh-CN><en>The only two generated style files permitted to carry font declarations through the source gate.</en></lang>
 */
const h5FontStyleRelativePath = 'styles/runtime-font-faces-h5.scss';
const mpWeixinFontStyleRelativePath = 'styles/runtime-font-faces-mp-weixin.scss';
const reviewedFontStylePaths = new Set([h5FontStyleRelativePath, mpWeixinFontStyleRelativePath]);

/**
 * <lang><zh-CN>两个生成样式的固定 source 字节摘要；它们把精确 CSS surface 绑定到已审 manifest，而不是只按文件名放行。</zh-CN><en>Pinned source-byte digests for the two generated styles; they bind the exact CSS surface to the reviewed manifest instead of allowing files by name alone.</en></lang>
 */
const reviewedFontStyleSha256ByPath = new Map([
  [h5FontStyleRelativePath, 'D3742B3069C8A5258A87096C5E2E78F0BE211339D9FD23ED3A312D6C636D722C'],
  [mpWeixinFontStyleRelativePath, 'F3F73A0C96C61A417306BDFE88DAA4422FC5ABACBDAC1FDEDC23D8D2A793AFC7']
]);

/**
 * <lang><zh-CN>两份 OFL 载荷的固定路径、摘要与人类可读事实。</zh-CN><en>Fixed paths, digests, and human-readable facts for the two OFL payloads.</en></lang>
 */
const expectedFontLicenses = Object.freeze([
  Object.freeze({
    path: 'LICENSES/Source-Han-Sans-OFL-1.1.txt',
    sha256: 'FCAC737E761EC63DBFBDCE11030A1780161920D80315EDBA9C8BEFF1C2BAC5A2',
    spdx: 'OFL-1.1',
    reservedFontName: 'Source',
    copyright: 'Copyright 2014-2025 Adobe'
  }),
  Object.freeze({
    path: 'LICENSES/Source-Han-Serif-OFL-1.1.txt',
    sha256: '9FF5BB567E1B92C801FC1069E5FBF992FF8EFCCACB9DB94E5959A5B3BA9BB903',
    spdx: 'OFL-1.1',
    reservedFontName: 'Source',
    copyright: 'Copyright 2017-2022 Adobe'
  })
]);

/**
 * <lang><zh-CN>三个可分发 face 的完整身份、source locator、字节摘要与 artifact 文件名规则。</zh-CN><en>Complete identities, source locators, byte digests, and artifact filename rules for the three distributable faces.</en></lang>
 * @lang zh-CN 该表不从 manifest 自发现 face；manifest 只能逐字段匹配这里的有限 allowlist。
 * @lang en This table discovers no face from the manifest; the manifest can only match this finite allowlist field by field.
 */
const expectedFontFaces = Object.freeze([
  Object.freeze({
    id: 'sans-regular',
    role: 'body',
    cssFamily: 'HIA-uView BP Sans SC',
    fontStyle: 'normal',
    fontWeight: 400,
    postscriptName: 'HIAuViewBPSansSC-Regular',
    outputPath: 'src/assets/fonts/hia-uv-bp-sans-sc-regular-v2.005-subset.woff',
    sourceRelativePath: 'assets/fonts/hia-uv-bp-sans-sc-regular-v2.005-subset.woff',
    outputBytes: 77_432,
    outputSha256: 'CB9B1F1E5BC7C188E7122D97502C5467FC17A3899AD295CAB2DF46C5624DD6F5',
    maxOutputBytes: 180_000,
    artifactFilePattern: /^assets\/hia-uv-bp-sans-sc-regular-v2\.005-subset-[A-Za-z0-9_-]{8}\.woff$/u,
    licensePath: 'LICENSES/Source-Han-Sans-OFL-1.1.txt'
  }),
  Object.freeze({
    id: 'sans-bold',
    role: 'emphasis',
    cssFamily: 'HIA-uView BP Sans SC',
    fontStyle: 'normal',
    fontWeight: 700,
    postscriptName: 'HIAuViewBPSansSC-Bold',
    outputPath: 'src/assets/fonts/hia-uv-bp-sans-sc-bold-v2.005-subset.woff',
    sourceRelativePath: 'assets/fonts/hia-uv-bp-sans-sc-bold-v2.005-subset.woff',
    outputBytes: 78_744,
    outputSha256: '63FB549C240FF5C010EA2CAC76C660F49F1EF6641A3AF22D6415688AFD1ED4BC',
    maxOutputBytes: 180_000,
    artifactFilePattern: /^assets\/hia-uv-bp-sans-sc-bold-v2\.005-subset-[A-Za-z0-9_-]{8}\.woff$/u,
    licensePath: 'LICENSES/Source-Han-Sans-OFL-1.1.txt'
  }),
  Object.freeze({
    id: 'serif-bold',
    role: 'display',
    cssFamily: 'HIA-uView BP Serif SC',
    fontStyle: 'normal',
    fontWeight: 700,
    postscriptName: 'HIAuViewBPSerifSC-Bold',
    outputPath: 'src/assets/fonts/hia-uv-bp-serif-sc-bold-v2.003-subset.woff',
    sourceRelativePath: 'assets/fonts/hia-uv-bp-serif-sc-bold-v2.003-subset.woff',
    outputBytes: 36_352,
    outputSha256: '6E5D3B2CBE007F2D3A369EC40ED3D8023DDD8825033331C1F751ECF49B59BEC0',
    maxOutputBytes: 200_000,
    artifactFilePattern: /^assets\/hia-uv-bp-serif-sc-bold-v2\.003-subset-[A-Za-z0-9_-]{8}\.woff$/u,
    licensePath: 'LICENSES/Source-Han-Serif-OFL-1.1.txt'
  })
]);

/**
 * <lang><zh-CN>H5 应用 UTabbar 唯一允许使用的八张 27×27 一方 PNG。</zh-CN><en>The only eight first-party 27×27 PNGs allowed for the H5 application UTabbar.</en></lang>
 */
const expectedApplicationTabIcons = Object.freeze([
  Object.freeze({ fileName: 'tab-home.png', sha256: '3D81AF885146350C9BC8A3E64E0F31834270E9C5FB2585099BBEB14105B6AB2B' }),
  Object.freeze({ fileName: 'tab-home-active.png', sha256: '9865D1BC5089361E0D80AE150EFEBF885DB4C84FC19527A411306071728A9114' }),
  Object.freeze({ fileName: 'tab-discover.png', sha256: '3D6EC5ED945C1F10541678352B31A9C79B64DFE17B9201E2037F39F11BB29999' }),
  Object.freeze({ fileName: 'tab-discover-active.png', sha256: '6BB10C9D1ED5CFC876BBC2FEFB1C128E8E7B6969A7B8F0992A08C66ACC454404' }),
  Object.freeze({ fileName: 'tab-reservations.png', sha256: '2D422AFA2AC96130889AC31B3F7683B51A272F9E907DFAE55D5B971C141D0D14' }),
  Object.freeze({ fileName: 'tab-reservations-active.png', sha256: 'CC6EC0B563AEA924685963596E7D8C2B2A868EEF1161B19AA89373C8C6A9E871' }),
  Object.freeze({ fileName: 'tab-profile.png', sha256: '0A7EFAC937C01BFB0F19D81D31A78E1D6DF4F4633B9D61BA6A6F0B36C02BA83B' }),
  Object.freeze({ fileName: 'tab-profile-active.png', sha256: '01F955ADC912D01FD53FD93D77953B950AC86583ED76A6F7FD84008F62A737CD' })
]);

/**
 * <lang><zh-CN>发布根必须携带的入口、顶层声明以及来源固定的完整许可证载荷。</zh-CN><en>Entry, top-level notices, and the complete source-pinned license payload required at the publication root.</en></lang>
 * @lang zh-CN 精确路径避免嵌套副本或仓库链接替代 Pages 使用者可直接取得的声明；固定 SHA-256 与正文事实共同绑定已审计来源。
 * @lang en Exact paths prevent nested copies or repository links from substituting for notices directly available to Pages users; pinned SHA-256 values and content facts jointly bind the audited sources.
 */
const requiredArtifactTextFiles = Object.freeze(['index.html', 'THIRD_PARTY_NOTICES.md']);

/**
 * <lang><zh-CN>从公开准备清单复制的不可变法律载荷事实。</zh-CN><en>Immutable legal-payload facts copied from the public preparation ledger.</en></lang>
 * @lang zh-CN 每项要求精确相对路径、canonical LF bytes 的大写 SHA-256 以及至少两个可读正文锚点；任何上游升级都必须同步审阅准备脚本、公开 NOTICE、这里和测试。
 * @lang en Each item requires an exact relative path, uppercase SHA-256 of canonical LF bytes, and at least two readable content anchors; every upstream upgrade must jointly review the preparation script, public NOTICE, this gate, and its tests.
 */
const pinnedLegalPayloads = Object.freeze([
  Object.freeze({
    relativePath: 'LICENSE',
    sha256: 'DE0E1030000523AC27D7B3BC6A8DDE4EE67F58867AD5EDE64A65A76BF2D8848E',
    contentAnchors: Object.freeze(['MIT License', 'Copyright (c) 2026 mandolin'])
  }),
  Object.freeze({
    relativePath: 'LICENSES/HIA-uView-MIT.txt',
    sha256: 'DE0E1030000523AC27D7B3BC6A8DDE4EE67F58867AD5EDE64A65A76BF2D8848E',
    contentAnchors: Object.freeze(['MIT License', 'Copyright (c) 2026 mandolin'])
  }),
  Object.freeze({
    relativePath: 'LICENSES/HIA-uView-Biz-MIT.txt',
    sha256: 'DE0E1030000523AC27D7B3BC6A8DDE4EE67F58867AD5EDE64A65A76BF2D8848E',
    contentAnchors: Object.freeze(['MIT License', 'Copyright (c) 2026 mandolin'])
  }),
  Object.freeze({
    relativePath: 'LICENSES/HIA-uView-THIRD_PARTY_NOTICES.md',
    sha256: '7C6C57B870EC7ECBD20EF96700A1E4C8B4F7F00F19D395AACF36045CF827AC41',
    contentAnchors: Object.freeze(['Reviewed MIT component derivations', 'uview-pro@0.6.13', '3bc1948d8f7c5d2bcb1ba3434cede1e709391a62'])
  }),
  Object.freeze({
    relativePath: 'LICENSES/uView-Pro-MIT.txt',
    sha256: '906B494A3FA3B4E270BB08FC69625176E552EB0ACC922C253C4D5FBFA5544627',
    contentAnchors: Object.freeze(['MIT License', 'Copyright (c) 2025 uviewpro.cn'])
  }),
  Object.freeze({
    relativePath: 'LICENSES/Source-Han-Sans-OFL-1.1.txt',
    sha256: 'FCAC737E761EC63DBFBDCE11030A1780161920D80315EDBA9C8BEFF1C2BAC5A2',
    contentAnchors: Object.freeze(['Copyright 2014-2025 Adobe', "Reserved Font\nName 'Source'", 'SIL OPEN FONT LICENSE Version 1.1'])
  }),
  Object.freeze({
    relativePath: 'LICENSES/Source-Han-Serif-OFL-1.1.txt',
    sha256: '9FF5BB567E1B92C801FC1069E5FBF992FF8EFCCACB9DB94E5959A5B3BA9BB903',
    contentAnchors: Object.freeze(['Copyright 2017-2022 Adobe', "Reserved Font\nName 'Source'", 'SIL OPEN FONT LICENSE Version 1.1'])
  }),
  Object.freeze({
    relativePath: 'LICENSES/DCloud-Apache-2.0.txt',
    sha256: '58D1E17FFE5109A7AE296CAAFCADFDBE6A7D176F0BC4AB01E12A689B0499D8BD',
    contentAnchors: Object.freeze(['Apache License', 'Version 2.0, January 2004'])
  }),
  Object.freeze({
    relativePath: 'LICENSES/Vue-MIT.txt',
    sha256: '1BB85CC9B13B81EF41C81C51866172FC345E0503C86726A6755B796590B70175',
    contentAnchors: Object.freeze(['The MIT License (MIT)', 'Copyright (c) 2018-present, Yuxi (Evan) You'])
  }),
  Object.freeze({
    relativePath: 'LICENSES/Vue-Router-MIT.txt',
    sha256: '91A2845C4DB44E7497B514B98634A674C737986AD0DB81599307CF733BF850B2',
    contentAnchors: Object.freeze(['The MIT License (MIT)', 'Copyright (c) 2019-present Eduardo San Martin Morote'])
  })
]);

/**
 * <lang><zh-CN>自引用顶层 NOTICE 不能固定自身 digest，但必须逐项列出准备清单的每个目标与固定 digest。</zh-CN><en>The self-referential top-level NOTICE cannot pin its own digest, but it must enumerate every preparation-ledger destination and pinned digest.</en></lang>
 */
const topLevelNoticeAnchors = Object.freeze([
  'Pages 成品许可证载荷 / Pages artifact license payload',
  'source/destination digest equality at write time',
  ...pinnedLegalPayloads.map((payload) => payload.relativePath),
  ...new Set(pinnedLegalPayloads.map((payload) => payload.sha256))
]);

/**
 * <lang><zh-CN>可包含上游许可证/源码 citation URL、但不会声明浏览器资源的顶层法律文本。</zh-CN><en>Top-level legal texts that may contain upstream license/source citation URLs but declare no browser resources.</en></lang>
 * @lang zh-CN 这些文件仍接受机器路径、内部 marker、凭据和遥测扫描；例外只跳过纯文本 citation 的外链分类。
 * @lang en These files still receive machine-path, internal-marker, credential, and telemetry scans; the exception skips only external-link classification for plain-text citations.
 */
const informationalCitationFiles = new Set([
  'THIRD_PARTY_NOTICES.md',
  ...pinnedLegalPayloads.map((payload) => payload.relativePath)
]);

/**
 * <lang><zh-CN>抛出不包含绝对路径或成品正文的稳定门禁错误。</zh-CN><en>Throws a stable gate error containing neither an absolute path nor artifact content.</en></lang>
 * @param {string} message <lang><zh-CN>稳定合同说明，可含已归一化的成品相对路径。</zh-CN><en>Stable contract description that may contain a normalized artifact-relative path.</en></lang>
 * @returns {never} <lang><zh-CN>始终抛出。</zh-CN><en>Always throws.</en></lang>
 */
function failArtifact(message) {
  // <lang><zh-CN>错误只使用调用方提供的受控摘要，不拼接底层文件系统异常。</zh-CN><en>The error uses only the caller-provided controlled summary and never appends a lower-level file-system exception.</en></lang>
  throw new Error(`H5 Pages artifact gate failed: ${message}`);
}

/**
 * <lang><zh-CN>计算原始字节的大写 SHA-256，统一 source manifest、生成样式与 artifact 二进制的身份比较。</zh-CN><en>Computes uppercase SHA-256 over raw bytes, unifying identity comparisons for the source manifest, generated styles, and artifact binaries.</en></lang>
 * @param {Uint8Array} fileBytes <lang><zh-CN>未转码的文件字节。</zh-CN><en>Untranscoded file bytes.</en></lang>
 * @returns {string} <lang><zh-CN>大写十六进制摘要。</zh-CN><en>Uppercase hexadecimal digest.</en></lang>
 */
function calculateSha256(fileBytes) {
  // <lang><zh-CN>摘要只绑定输入字节，不读取路径、时钟或环境。</zh-CN><en>The digest binds only the input bytes and reads no path, clock, or environment.</en></lang>
  return createHash('sha256').update(fileBytes).digest('hex').toUpperCase();
}

/**
 * <lang><zh-CN>读取并验证固定字体 manifest 的摘要与有限交付字段。</zh-CN><en>Reads and verifies the pinned font manifest digest and bounded delivery fields.</en></lang>
 * @param {string} sourceRoot <lang><zh-CN>固定项目 source 根或隔离 fixture 根。</zh-CN><en>Fixed project source root or isolated fixture root.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>仅供本门禁后续绑定使用的已审 manifest 对象。</zh-CN><en>The reviewed manifest object used only for subsequent bindings in this gate.</en></lang>
 * @lang zh-CN 路径和 face 数量来自代码内 allowlist；manifest 不能自行扩展要读取或分发的文件集合。
 * @lang en Paths and face counts come from the in-code allowlist; the manifest cannot expand the set of files to read or distribute by itself.
 */
async function readReviewedFontManifest(sourceRoot) {
  // <lang><zh-CN>只把代码内固定相对路径解析到调用方已验证的 source 根；manifest 正文不能选择读取位置。</zh-CN><en>Resolve only the in-code fixed relative path beneath the caller-validated source root; manifest content cannot select the read location.</en></lang>
  const fontManifestPath = resolve(sourceRoot, fontManifestRelativePath);

  // <lang><zh-CN>读取失败不回显宿主路径。</zh-CN><en>Do not echo a host path when the read fails.</en></lang>
  let manifestBytes;
  try {
    manifestBytes = await readFile(fontManifestPath);
  } catch {
    failArtifact('the reviewed font manifest is missing');
  }

  // <lang><zh-CN>原始字节摘要阻止空白、顺序或未审字段在不更新门禁时漂移。</zh-CN><en>The raw-byte digest prevents whitespace, ordering, or unreviewed fields from drifting without a gate update.</en></lang>
  if (calculateSha256(manifestBytes) !== PINNED_FONT_MANIFEST_SHA256) {
    failArtifact('the reviewed font manifest does not match its pinned SHA-256');
  }

  // <lang><zh-CN>JSON 解析错误转换为稳定合同错误，不暴露原始正文。</zh-CN><en>Convert a JSON parse error into a stable contract error without exposing source content.</en></lang>
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    failArtifact('the reviewed font manifest is not valid JSON');
  }

  // <lang><zh-CN>schema、平台交付说明与数组规模必须等于当前已审边界。</zh-CN><en>The schema, platform-delivery declarations, and array cardinalities must equal the current reviewed boundary.</en></lang>
  const hasExpectedEnvelope = manifest !== null
    && typeof manifest === 'object'
    && manifest.schemaVersion === '1.0'
    && manifest.policy?.delivery?.h5 === 'same-origin versioned WOFF asset'
    && manifest.policy?.delivery?.['mp-weixin'] === 'project-owned WOFF embedded byte-for-byte as generated CSS data URLs'
    && Array.isArray(manifest.faces)
    && manifest.faces.length === expectedFontFaces.length
    && Array.isArray(manifest.licenses)
    && manifest.licenses.length === expectedFontLicenses.length;
  if (!hasExpectedEnvelope) failArtifact('the reviewed font manifest envelope is outside the allowlist');

  // <lang><zh-CN>许可证逐索引匹配固定路径、摘要与 OFL 事实，禁止同数目的替代载荷。</zh-CN><en>Match licenses by index against fixed paths, digests, and OFL facts, preventing same-cardinality substitute payloads.</en></lang>
  for (let licenseIndex = 0; licenseIndex < expectedFontLicenses.length; licenseIndex += 1) {
    // <lang><zh-CN>预期记录来自只读 allowlist。</zh-CN><en>The expected record comes from the read-only allowlist.</en></lang>
    const expectedLicense = expectedFontLicenses[licenseIndex];

    // <lang><zh-CN>候选记录只从已固定摘要的 manifest 相同位置取得。</zh-CN><en>The candidate comes only from the corresponding position in the digest-pinned manifest.</en></lang>
    const manifestLicense = manifest.licenses[licenseIndex];

    // <lang><zh-CN>每个可执行判断都绑定发布所需的最小许可身份。</zh-CN><en>Each executable check binds the minimum license identity required for distribution.</en></lang>
    const matchesExpectedLicense = manifestLicense?.path === expectedLicense.path
      && String(manifestLicense.sha256 ?? '').toUpperCase() === expectedLicense.sha256
      && manifestLicense.spdx === expectedLicense.spdx
      && manifestLicense.reservedFontName === expectedLicense.reservedFontName
      && manifestLicense.copyright === expectedLicense.copyright;
    if (!matchesExpectedLicense) failArtifact(`font manifest license ${licenseIndex + 1} is outside the allowlist`);
  }

  // <lang><zh-CN>三个 face 逐索引绑定 CSS 身份、source 输出、字节摘要、尺寸上限与许可证。</zh-CN><en>Bind all three faces by index to CSS identity, source output, byte digest, size ceiling, and license.</en></lang>
  for (let faceIndex = 0; faceIndex < expectedFontFaces.length; faceIndex += 1) {
    // <lang><zh-CN>有限 allowlist 是授权来源。</zh-CN><en>The finite allowlist is the authorization source.</en></lang>
    const expectedFace = expectedFontFaces[faceIndex];

    // <lang><zh-CN>manifest 记录只能证明自身与 allowlist 一致，不能添加第四个 face。</zh-CN><en>The manifest record can only prove agreement with the allowlist and cannot add a fourth face.</en></lang>
    const manifestFace = manifest.faces[faceIndex];

    // <lang><zh-CN>字段集合覆盖浏览器声明、二进制身份与法律归属。</zh-CN><en>The field set covers browser declaration, binary identity, and legal attribution.</en></lang>
    const matchesExpectedFace = manifestFace?.id === expectedFace.id
      && manifestFace.role === expectedFace.role
      && manifestFace.cssFamily === expectedFace.cssFamily
      && manifestFace.fontStyle === expectedFace.fontStyle
      && manifestFace.fontWeight === expectedFace.fontWeight
      && manifestFace.postscriptName === expectedFace.postscriptName
      && manifestFace.format === 'woff'
      && manifestFace.mimeType === 'font/woff'
      && manifestFace.outputPath === expectedFace.outputPath
      && manifestFace.outputBytes === expectedFace.outputBytes
      && String(manifestFace.outputSha256 ?? '').toUpperCase() === expectedFace.outputSha256
      && manifestFace.maxOutputBytes === expectedFace.maxOutputBytes
      && manifestFace.license?.path === expectedFace.licensePath
      && manifestFace.reservedPrimaryNameCheck === true;
    if (!matchesExpectedFace) failArtifact(`font manifest face ${expectedFace.id} is outside the allowlist`);
  }

  // <lang><zh-CN>返回只在当前进程内使用的已验证对象；文件发现仍不读取其中的任意路径。</zh-CN><en>Return the verified object for in-process use only; file discovery still reads no arbitrary path from it.</en></lang>
  return manifest;
}

/**
 * <lang><zh-CN>验证 source 字体目录恰含固定 manifest 与三份 WOFF，并逐文件绑定尺寸、摘要和容器签名。</zh-CN><en>Verifies that the source font directory contains exactly the pinned manifest plus three WOFF files and binds every file to its size, digest, and container signature.</en></lang>
 * @param {string} sourceRoot <lang><zh-CN>已通过真实目录检查的 source 根。</zh-CN><en>Source root already proven to be a real directory.</en></lang>
 * @returns {Promise<Readonly<{ fontAssetByteCount: number, fontAssetCount: number }>>} <lang><zh-CN>不含路径、正文或可变 manifest 的有限 source 字体计数。</zh-CN><en>Finite source-font counts containing no paths, content, or mutable manifest.</en></lang>
 * @lang zh-CN 目录清单和读取路径完全来自代码内 allowlist；fixture 必须自带真实字节，因此隔离负例不会借用工作树字体。
 * @lang en The directory ledger and read paths come entirely from the in-code allowlist; fixtures must carry the real bytes, so isolated negative cases cannot borrow fonts from the worktree.
 */
async function verifyReviewedSourceFontAssets(sourceRoot) {
  // <lang><zh-CN>字体目录相对位置固定为 source 下的 assets/fonts。</zh-CN><en>The font directory location is fixed to assets/fonts beneath source.</en></lang>
  const sourceFontRoot = resolve(sourceRoot, 'assets/fonts');

  // <lang><zh-CN>目录读取失败转换为稳定类别。</zh-CN><en>Convert a directory-read failure into a stable category.</en></lang>
  let fontDirectoryEntries;
  try {
    fontDirectoryEntries = await readdir(sourceFontRoot, { withFileTypes: true });
  } catch {
    failArtifact('the reviewed source font directory is missing');
  }

  // <lang><zh-CN>唯一允许的文件名集合由 manifest 固定名和三个 face 的固定 source 路径 basename 构成。</zh-CN><en>The sole allowed filename set consists of the fixed manifest name plus basenames from the three fixed face source paths.</en></lang>
  const expectedFontFileNames = [
    'font-subsets.manifest.json',
    ...expectedFontFaces.map((face) => face.sourceRelativePath.split('/').at(-1) ?? '')
  ].sort();

  // <lang><zh-CN>排序后的真实目录名必须逐项相等，阻止第四份字体、旧版本或临时文件。</zh-CN><en>Sorted real directory names must match item by item, blocking a fourth font, stale version, or temporary file.</en></lang>
  const observedFontFileNames = [...fontDirectoryEntries].map((entry) => entry.name).sort();
  if (observedFontFileNames.length !== expectedFontFileNames.length
    || observedFontFileNames.some((fileName, fileIndex) => fileName !== expectedFontFileNames[fileIndex])) {
    failArtifact('the reviewed source font directory contains an unexpected file set');
  }

  // <lang><zh-CN>每个目录项必须是不可链接替代的普通文件。</zh-CN><en>Every directory entry must be a regular file that is not substituted through a link.</en></lang>
  for (const fontDirectoryEntry of fontDirectoryEntries) {
    const fontEntryPath = resolve(sourceFontRoot, fontDirectoryEntry.name);
    let fontEntryStats;
    try {
      fontEntryStats = await lstat(fontEntryPath);
    } catch {
      failArtifact(`reviewed source font entry cannot be inspected at ${fontDirectoryEntry.name}`);
    }
    if (fontEntryStats.isSymbolicLink() || !fontEntryStats.isFile()) {
      failArtifact(`reviewed source font entry is not a regular file at ${fontDirectoryEntry.name}`);
    }
    if (fontEntryStats.nlink !== 1) failArtifact(`reviewed source font hard link is present at ${fontDirectoryEntry.name}`);
  }

  // <lang><zh-CN>原始 manifest 先绑定摘要和有限字段。</zh-CN><en>Bind the raw manifest digest and bounded fields first.</en></lang>
  await readReviewedFontManifest(sourceRoot);

  // <lang><zh-CN>总字节数只用于无路径审计摘要。</zh-CN><en>The total byte count serves only the path-free audit summary.</en></lang>
  let fontAssetByteCount = 0;

  // <lang><zh-CN>三份 WOFF 逐项读取固定路径，不使用 manifest locator。</zh-CN><en>Read the three WOFF files from fixed paths rather than manifest locators.</en></lang>
  for (const expectedFace of expectedFontFaces) {
    let sourceWoffBytes;
    try {
      sourceWoffBytes = await readFile(resolve(sourceRoot, expectedFace.sourceRelativePath));
    } catch {
      failArtifact(`reviewed source WOFF is missing for ${expectedFace.id}`);
    }

    // <lang><zh-CN>长度、摘要与 WOFF 1.0 signature 必须同时匹配固定 face。</zh-CN><en>Length, digest, and the WOFF 1.0 signature must all match the pinned face.</en></lang>
    const hasExpectedWoffIdentity = sourceWoffBytes.byteLength === expectedFace.outputBytes
      && calculateSha256(sourceWoffBytes) === expectedFace.outputSha256
      && sourceWoffBytes.subarray(0, 4).toString('ascii') === 'wOFF';
    if (!hasExpectedWoffIdentity) failArtifact(`reviewed source WOFF does not match face ${expectedFace.id}`);

    // <lang><zh-CN>仅累计固定文件大小，不保留字节或路径。</zh-CN><en>Accumulate only the fixed file size and retain neither bytes nor paths.</en></lang>
    fontAssetByteCount += sourceWoffBytes.byteLength;
  }

  // <lang><zh-CN>返回冻结的无路径、无正文摘要。</zh-CN><en>Return a frozen path- and content-free summary.</en></lang>
  return Object.freeze({ fontAssetByteCount, fontAssetCount: expectedFontFaces.length });
}

/**
 * <lang><zh-CN>移除 CSS 注释，使 selector、声明数量和字体规则判断不接受注释中的伪证据。</zh-CN><en>Removes CSS comments so selector, declaration-count, and font-rule checks cannot accept evidence placed in comments.</en></lang>
 * @param {string} cssText <lang><zh-CN>source SCSS 或构建 CSS 正文。</zh-CN><en>Source SCSS or built CSS text.</en></lang>
 * @returns {string} <lang><zh-CN>只移除块注释后的正文。</zh-CN><en>Text with block comments removed.</en></lang>
 */
function stripCssComments(cssText) {
  // <lang><zh-CN>当前生成与构建产物只使用标准块注释；不解释字符串内部内容。</zh-CN><en>The current generated and built artifacts use only standard block comments; string content is not interpreted here.</en></lang>
  return cssText.replace(/\/\*[\s\S]*?\*\//gu, '');
}

/**
 * <lang><zh-CN>按不在引号或圆括号中的分号拆分一个扁平 CSS 声明块。</zh-CN><en>Splits one flat CSS declaration block at semicolons outside quotes and parentheses.</en></lang>
 * @param {string} declarationText <lang><zh-CN>不含花括号的声明正文。</zh-CN><en>Declaration text containing no braces.</en></lang>
 * @param {string} relativePath <lang><zh-CN>稳定诊断所用相对路径。</zh-CN><en>Relative path used in stable diagnostics.</en></lang>
 * @returns {Map<string, string>} <lang><zh-CN>小写属性名到原始 trim 值的唯一映射。</zh-CN><en>Unique mapping from lowercase property names to trimmed raw values.</en></lang>
 */
function parseCssDeclarations(declarationText, relativePath) {
  // <lang><zh-CN>片段数组按 source 顺序保留，以便重复属性稳定失败。</zh-CN><en>The fragment array preserves source order so duplicate properties fail deterministically.</en></lang>
  const declarationFragments = [];

  // <lang><zh-CN>当前片段只在顶层分号处提交。</zh-CN><en>The current fragment is committed only at a top-level semicolon.</en></lang>
  let currentFragment = '';

  // <lang><zh-CN>quote 与 escape 状态保护 data URI 和 quoted URL。</zh-CN><en>Quote and escape state protect data URIs and quoted URLs.</en></lang>
  let activeQuote = '';
  let isEscaped = false;

  // <lang><zh-CN>圆括号深度避免把 `data:...;base64` 中的分号当作声明边界。</zh-CN><en>Parenthesis depth prevents treating the semicolon in `data:...;base64` as a declaration boundary.</en></lang>
  let parenthesisDepth = 0;

  // <lang><zh-CN>逐字符解析有限生成 surface，不执行 CSS。</zh-CN><en>Parse the bounded generated surface character by character without executing CSS.</en></lang>
  for (const character of declarationText) {
    // <lang><zh-CN>前一反斜线转义当前字符时只追加并清除状态。</zh-CN><en>When the preceding backslash escapes this character, append it and clear the state.</en></lang>
    if (isEscaped) {
      currentFragment += character;
      isEscaped = false;
      continue;
    }

    // <lang><zh-CN>引号内的反斜线只影响下一个字符。</zh-CN><en>A backslash inside a quote affects only the next character.</en></lang>
    if (activeQuote !== '' && character === '\\') {
      currentFragment += character;
      isEscaped = true;
      continue;
    }

    // <lang><zh-CN>引号开闭不改变括号深度。</zh-CN><en>Opening or closing a quote does not alter parenthesis depth.</en></lang>
    if (character === '"' || character === "'") {
      if (activeQuote === '') activeQuote = character;
      else if (activeQuote === character) activeQuote = '';
      currentFragment += character;
      continue;
    }

    // <lang><zh-CN>引号内所有标点都作为 value 字节保留。</zh-CN><en>Preserve all punctuation inside quotes as value bytes.</en></lang>
    if (activeQuote !== '') {
      currentFragment += character;
      continue;
    }

    // <lang><zh-CN>函数括号只允许平衡嵌套。</zh-CN><en>Function parentheses must remain balanced.</en></lang>
    if (character === '(') parenthesisDepth += 1;
    if (character === ')') parenthesisDepth -= 1;
    if (parenthesisDepth < 0) failArtifact(`font CSS has unbalanced parentheses in ${relativePath}`);

    // <lang><zh-CN>只有顶层分号结束当前声明。</zh-CN><en>Only a top-level semicolon ends the current declaration.</en></lang>
    if (character === ';' && parenthesisDepth === 0) {
      declarationFragments.push(currentFragment);
      currentFragment = '';
      continue;
    }

    // <lang><zh-CN>非边界字符原样进入当前片段。</zh-CN><en>A non-boundary character enters the current fragment unchanged.</en></lang>
    currentFragment += character;
  }

  // <lang><zh-CN>未闭合 quote/括号不能形成确定 CSS。</zh-CN><en>An unclosed quote or parenthesis cannot form deterministic CSS.</en></lang>
  if (activeQuote !== '' || parenthesisDepth !== 0 || isEscaped) {
    failArtifact(`font CSS has an unterminated value in ${relativePath}`);
  }

  // <lang><zh-CN>最后一个无分号片段仍作为声明处理。</zh-CN><en>Treat the final fragment as a declaration even without a trailing semicolon.</en></lang>
  declarationFragments.push(currentFragment);

  // <lang><zh-CN>Map 明确拒绝同一属性通过 cascade 隐藏替代值。</zh-CN><en>The Map explicitly rejects a duplicate property hiding a substitute value through cascade.</en></lang>
  const declarationMap = new Map();
  for (const declarationFragment of declarationFragments) {
    // <lang><zh-CN>空白尾片段不构成声明。</zh-CN><en>A whitespace-only trailing fragment is not a declaration.</en></lang>
    const normalizedFragment = declarationFragment.trim();
    if (normalizedFragment === '') continue;

    // <lang><zh-CN>第一个冒号分隔属性名；data URI 的后续冒号保留在值中。</zh-CN><en>The first colon separates the property name; later colons in a data URI remain in the value.</en></lang>
    const separatorIndex = normalizedFragment.indexOf(':');
    if (separatorIndex <= 0) failArtifact(`font CSS has an invalid declaration in ${relativePath}`);

    // <lang><zh-CN>属性名按 CSS ASCII 语义归一为小写。</zh-CN><en>Normalize the property name to lowercase under CSS ASCII semantics.</en></lang>
    const propertyName = normalizedFragment.slice(0, separatorIndex).trim().toLowerCase();

    // <lang><zh-CN>值保留引号和 locator 字节，只去掉声明边缘空白。</zh-CN><en>Retain quotes and locator bytes in the value, trimming only declaration-edge whitespace.</en></lang>
    const propertyValue = normalizedFragment.slice(separatorIndex + 1).trim();
    if (propertyName === '' || propertyValue === '' || declarationMap.has(propertyName)) {
      failArtifact(`font CSS has a duplicate or empty declaration in ${relativePath}`);
    }

    // <lang><zh-CN>登记唯一属性。</zh-CN><en>Register the unique property.</en></lang>
    declarationMap.set(propertyName, propertyValue);
  }

  // <lang><zh-CN>返回当前规则的有限声明集。</zh-CN><en>Return the bounded declaration set for the current rule.</en></lang>
  return declarationMap;
}

/**
 * <lang><zh-CN>提取所有完整扁平 `@font-face` 规则，并拒绝畸形或嵌套规则。</zh-CN><en>Extracts every complete flat `@font-face` rule and rejects malformed or nested rules.</en></lang>
 * @param {string} cssText <lang><zh-CN>待审样式正文。</zh-CN><en>Style text to audit.</en></lang>
 * @param {string} relativePath <lang><zh-CN>稳定诊断路径。</zh-CN><en>Stable diagnostic path.</en></lang>
 * @returns {Array<Map<string, string>>} <lang><zh-CN>按出现顺序排列的声明集合。</zh-CN><en>Declaration maps in occurrence order.</en></lang>
 */
function extractFontFaceDeclarations(cssText, relativePath) {
  // <lang><zh-CN>先移除注释，避免注释 marker 被计为真实声明。</zh-CN><en>Remove comments first so a comment marker cannot count as a real declaration.</en></lang>
  const uncommentedCss = stripCssComments(cssText);

  // <lang><zh-CN>marker 数量用于发现缺失闭括号或嵌套内容。</zh-CN><en>The marker count detects a missing closing brace or nested content.</en></lang>
  const markerCount = [...uncommentedCss.matchAll(/@font-face\b/giu)].length;

  // <lang><zh-CN>当前生成器只产生无嵌套花括号的 face block。</zh-CN><en>The current generator produces only face blocks without nested braces.</en></lang>
  const completeBlocks = [...uncommentedCss.matchAll(/@font-face\s*\{([^{}]*)\}/giu)];
  if (completeBlocks.length !== markerCount) failArtifact(`font-face syntax is invalid in ${relativePath}`);

  // <lang><zh-CN>逐块转成唯一声明映射。</zh-CN><en>Convert every block into a unique declaration map.</en></lang>
  return completeBlocks.map((fontFaceMatch) => parseCssDeclarations(fontFaceMatch[1] ?? '', relativePath));
}

/**
 * <lang><zh-CN>把一个 CSS family 字面值规范为不带成对引号的单一名称。</zh-CN><en>Normalizes one CSS family literal into a single name without matching quotes.</en></lang>
 * @param {string} rawFamily <lang><zh-CN>`font-family` 原始值。</zh-CN><en>Raw `font-family` value.</en></lang>
 * @returns {string} <lang><zh-CN>单一 family 名称。</zh-CN><en>Single family name.</en></lang>
 */
function normalizeFontFamily(rawFamily) {
  // <lang><zh-CN>只接受一个双引号、单引号或无引号名称，不接受 fallback 列表。</zh-CN><en>Accept only one double-quoted, single-quoted, or unquoted name and no fallback list.</en></lang>
  const familyMatch = rawFamily.match(/^(?:"([^"]+)"|'([^']+)'|([^,"']+))$/u);
  if (!familyMatch) return '';

  // <lang><zh-CN>选择唯一捕获分支并去掉无引号值边缘空白。</zh-CN><en>Select the sole capture branch and trim an unquoted value at its edges.</en></lang>
  return (familyMatch[1] ?? familyMatch[2] ?? familyMatch[3] ?? '').trim();
}

/**
 * <lang><zh-CN>解析只含一个 WOFF `url()` 与精确 `format("woff")` 的 source descriptor。</zh-CN><en>Parses a source descriptor containing exactly one WOFF `url()` and exact `format("woff")`.</en></lang>
 * @param {string} rawSource <lang><zh-CN>`src` 原始值。</zh-CN><en>Raw `src` value.</en></lang>
 * @returns {string} <lang><zh-CN>locator；不合格时返回空字符串。</zh-CN><en>Locator, or an empty string when ineligible.</en></lang>
 */
function parseSingleWoffLocator(rawSource) {
  // <lang><zh-CN>locator 可由 compiler 保留双/单引号或去引号，但禁止 fallback source 与额外 format。</zh-CN><en>The compiler may retain double/single quotes or remove them around the locator, but fallback sources and extra formats are forbidden.</en></lang>
  const sourceMatch = rawSource.match(/^url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s"'()]+))\s*\)\s+format\(\s*(?:"woff"|'woff')\s*\)$/iu);
  if (!sourceMatch) return '';

  // <lang><zh-CN>返回未解码 locator，使后续 exact/base 检查看到真实输出。</zh-CN><en>Return the undecoded locator so later exact/base checks see the real output.</en></lang>
  return sourceMatch[1] ?? sourceMatch[2] ?? sourceMatch[3] ?? '';
}

/**
 * <lang><zh-CN>把一个 face 声明绑定到三个固定身份之一，并返回其 locator。</zh-CN><en>Binds one face declaration to one of the three fixed identities and returns its locator.</en></lang>
 * @param {Map<string, string>} declarations <lang><zh-CN>唯一 CSS descriptor 映射。</zh-CN><en>Unique CSS descriptor map.</en></lang>
 * @param {string} relativePath <lang><zh-CN>稳定诊断路径。</zh-CN><en>Stable diagnostic path.</en></lang>
 * @returns {{ face: (typeof expectedFontFaces)[number], locator: string }} <lang><zh-CN>固定 face 与声明 locator。</zh-CN><en>Pinned face and declared locator.</en></lang>
 */
function bindReviewedFontFace(declarations, relativePath) {
  // <lang><zh-CN>恰五个 descriptor 阻止 unicode-range、local()、style override 或其他未审行为。</zh-CN><en>Exactly five descriptors prevent unicode-range, `local()`, style overrides, or other unreviewed behavior.</en></lang>
  const allowedDescriptors = new Set(['font-family', 'font-style', 'font-weight', 'font-display', 'src']);
  if (declarations.size !== allowedDescriptors.size || [...declarations.keys()].some((key) => !allowedDescriptors.has(key))) {
    failArtifact(`font-face descriptors are outside the allowlist in ${relativePath}`);
  }

  // <lang><zh-CN>family、style 与数值 weight 共同选择唯一 face。</zh-CN><en>Family, style, and numeric weight jointly select one face.</en></lang>
  const family = normalizeFontFamily(declarations.get('font-family') ?? '');
  const style = (declarations.get('font-style') ?? '').toLowerCase();
  const weight = Number(declarations.get('font-weight') ?? Number.NaN);

  // <lang><zh-CN>只允许 swap，避免字体加载策略在平台间静默漂移。</zh-CN><en>Allow only `swap`, preventing silent font-loading-policy drift across platforms.</en></lang>
  if ((declarations.get('font-display') ?? '').toLowerCase() !== 'swap') {
    failArtifact(`font-face display policy is outside the allowlist in ${relativePath}`);
  }

  // <lang><zh-CN>精确身份表中必须只有一个匹配。</zh-CN><en>Exactly one identity in the fixed table must match.</en></lang>
  const matchingFaces = expectedFontFaces.filter((face) => face.cssFamily === family && face.fontStyle === style && face.fontWeight === weight);
  if (matchingFaces.length !== 1) failArtifact(`font-face identity is outside the allowlist in ${relativePath}`);

  // <lang><zh-CN>src 只能是单一 WOFF locator。</zh-CN><en>The source may only be one WOFF locator.</en></lang>
  const locator = parseSingleWoffLocator(declarations.get('src') ?? '');
  if (locator === '') failArtifact(`font-face source is outside the allowlist in ${relativePath}`);

  // <lang><zh-CN>返回固定对象引用，不创建可扩展 face 身份。</zh-CN><en>Return the fixed object reference without creating an extensible face identity.</en></lang>
  return { face: matchingFaces[0], locator };
}

/**
 * <lang><zh-CN>以稳定代码点顺序排序目录项。</zh-CN><en>Sorts directory entries in stable code-point order.</en></lang>
 * @param {{ name: string }} left <lang><zh-CN>左侧目录项。</zh-CN><en>Left directory entry.</en></lang>
 * @param {{ name: string }} right <lang><zh-CN>右侧目录项。</zh-CN><en>Right directory entry.</en></lang>
 * @returns {number} <lang><zh-CN>稳定比较结果。</zh-CN><en>Stable comparison result.</en></lang>
 */
function compareDirectoryEntries(left, right) {
  // <lang><zh-CN>避免 locale 依赖，让 CI 与本机使用同一遍历顺序和首个错误。</zh-CN><en>Avoid locale dependence so CI and local runs use the same traversal order and first error.</en></lang>
  if (left.name < right.name) return -1;

  // <lang><zh-CN>反向比较区分较大名称，完全相同的名称保持相等。</zh-CN><en>The reverse comparison distinguishes the larger name, while identical names remain equal.</en></lang>
  if (left.name > right.name) return 1;

  // <lang><zh-CN>同一目录不能有两个同名项；保留标准比较器的相等返回。</zh-CN><en>One directory cannot contain two same-name entries; retain the standard comparator equality result.</en></lang>
  return 0;
}

/**
 * <lang><zh-CN>验证每个成品相对路径不属于 source map、私有配置、凭据容器、字体或仓库/依赖元数据。</zh-CN><en>Verifies that each artifact-relative path is not a source map, private configuration, credential container, font, or repository/dependency metadata.</en></lang>
 * @param {string} relativePath <lang><zh-CN>使用 `/` 的成品相对路径。</zh-CN><en>Artifact-relative path using `/`.</en></lang>
 * @param {boolean} isDirectory <lang><zh-CN>当前项是否为真实目录。</zh-CN><en>Whether the current entry is a real directory.</en></lang>
 * @returns {void} <lang><zh-CN>路径合格时返回。</zh-CN><en>Returns when the path is eligible.</en></lang>
 */
function validateArtifactPath(relativePath, isDirectory) {
  // <lang><zh-CN>使用小写副本进行跨平台文件名策略比较，同时保留原相对路径用于稳定诊断。</zh-CN><en>Use a lowercase copy for cross-platform filename-policy comparison while retaining the original relative path for stable diagnostics.</en></lang>
  const lowerPath = relativePath.toLowerCase();

  // <lang><zh-CN>路径段来自受控目录遍历，拆分后可独立识别隐藏仓库与依赖树。</zh-CN><en>Path segments come from controlled directory traversal and can independently identify hidden repositories and dependency trees.</en></lang>
  const pathSegments = lowerPath.split('/');

  // <lang><zh-CN>任何被禁止目录段即使为空目录也不应进入发布 artifact。</zh-CN><en>No forbidden directory segment may enter the publication artifact, even as an empty directory.</en></lang>
  if (pathSegments.some((segment) => forbiddenDirectorySegments.has(segment))) {
    failArtifact(`repository or dependency metadata is present at ${relativePath}`);
  }

  // <lang><zh-CN>真实目录通过段级检查后无需应用文件扩展名规则。</zh-CN><en>After segment-level checks, a real directory needs no file-extension rules.</en></lang>
  if (isDirectory) return;

  // <lang><zh-CN>最后一段是文件名，所有后续私有配置与扩展名规则只针对该段。</zh-CN><en>The last segment is the filename, and all following private-configuration and extension rules target only that segment.</en></lang>
  const fileName = pathSegments.at(-1) ?? '';

  // <lang><zh-CN>拒绝 `.env` 全家族，防止构建环境与部署 secret 被当作静态文件上传。</zh-CN><en>Reject the entire `.env` family so build environment and deployment secrets cannot be uploaded as static files.</en></lang>
  if (fileName === '.env' || fileName.startsWith('.env.')) {
    failArtifact(`environment file is present at ${relativePath}`);
  }

  // <lang><zh-CN>拒绝明确私有配置名与任何 `.private.` 变体。</zh-CN><en>Reject explicit private configuration names and every `.private.` variant.</en></lang>
  if (forbiddenConfigurationNames.has(fileName) || fileName.includes('.private.')) {
    failArtifact(`private configuration is present at ${relativePath}`);
  }

  // <lang><zh-CN>source map 会泄露源码结构或本机构建路径，因此扩展名无条件禁止。</zh-CN><en>Source maps can disclose source structure or local build paths, so their extension is unconditionally forbidden.</en></lang>
  if (fileName.endsWith('.map')) failArtifact(`source map is present at ${relativePath}`);

  // <lang><zh-CN>私钥与证书容器不属于公开静态站点产物。</zh-CN><en>Private-key and certificate containers do not belong in a public static-site artifact.</en></lang>
  if (/\.(?:key|p12|pfx|pem)$/iu.test(fileName)) failArtifact(`credential container is present at ${relativePath}`);

  // <lang><zh-CN>旧字体容器与 WOFF2 仍无条件禁止；WOFF 1.0 只有在后续 manifest、CSS 和哈希三重绑定后才通过。</zh-CN><en>Legacy font containers and WOFF2 remain unconditionally forbidden; WOFF 1.0 passes only after the later manifest, CSS, and digest bindings.</en></lang>
  const fileExtension = extname(fileName).toLowerCase();
  if (forbiddenFontExtensions.has(fileExtension)) failArtifact(`font binary is present at ${relativePath}`);
}

/**
 * <lang><zh-CN>无符号链接跟随地遍历 artifact，并只返回 link count 为 1 的普通文件。</zh-CN><en>Traverses the artifact without following symbolic links and returns only regular files whose link count is one.</en></lang>
 * @param {string} artifactRoot <lang><zh-CN>待验证 artifact 根。</zh-CN><en>Artifact root to verify.</en></lang>
 * @returns {Promise<Array<{ absolutePath: string, relativePath: string }>>} <lang><zh-CN>按相对路径稳定排序的普通文件描述。</zh-CN><en>Regular-file descriptors stably sorted by relative path.</en></lang>
 * @lang zh-CN 目录只作为容器；symlink、junction、hardlink、socket、FIFO 与设备文件均失败。
 * @lang en Directories serve only as containers; symlinks, junctions, hardlinks, sockets, FIFOs, and device files all fail.
 */
async function collectArtifactFiles(artifactRoot) {
  // <lang><zh-CN>根 stat 失败时转换为不含本机绝对路径的稳定错误。</zh-CN><en>Convert a root-stat failure into a stable error containing no local absolute path.</en></lang>
  let rootStats;
  try {
    rootStats = await lstat(artifactRoot);
  } catch {
    failArtifact('the fixed output root is missing');
  }

  // <lang><zh-CN>根自身不能是 symlink/junction 或普通文件。</zh-CN><en>The root itself cannot be a symlink/junction or a regular file.</en></lang>
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) failArtifact('the fixed output root is not a real directory');

  // <lang><zh-CN>队列只保存已经 lstat 为真实目录的路径，不会追随链接。</zh-CN><en>The queue stores only paths already lstat-verified as real directories and never follows links.</en></lang>
  const pendingDirectories = [{ absolutePath: artifactRoot, relativePath: '' }];

  // <lang><zh-CN>收集普通文件供后续内容策略一次性验证。</zh-CN><en>Collect regular files for one subsequent content-policy pass.</en></lang>
  const artifactFiles = [];

  // <lang><zh-CN>逐层读取固定根内目录，输入集合不会来自 HTML、配置或用户数据。</zh-CN><en>Read directories beneath the fixed root level by level; the input set never comes from HTML, configuration, or user data.</en></lang>
  while (pendingDirectories.length > 0) {
    // <lang><zh-CN>取出首个已验证目录以保持确定性广度优先顺序。</zh-CN><en>Take the first verified directory to retain deterministic breadth-first order.</en></lang>
    const currentDirectory = pendingDirectories.shift();

    // <lang><zh-CN>类型只用于内部队列，空值表示实现错误而不是可容错 artifact。</zh-CN><en>The value is internal queue state; an empty value indicates an implementation error rather than a tolerable artifact.</en></lang>
    if (!currentDirectory) failArtifact('internal directory traversal state is invalid');

    // <lang><zh-CN>目录读取异常被转换为相对路径错误，不泄露底层绝对路径。</zh-CN><en>Convert a directory-read error into a relative-path diagnostic without leaking the lower-level absolute path.</en></lang>
    let directoryEntries;
    try {
      directoryEntries = await readdir(currentDirectory.absolutePath, { withFileTypes: true });
    } catch {
      const readablePath = currentDirectory.relativePath || '.';
      failArtifact(`directory cannot be read at ${readablePath}`);
    }

    // <lang><zh-CN>排序副本确保不同文件系统返回顺序不会改变首个失败事实。</zh-CN><en>A sorted copy ensures file-system enumeration order cannot change the first failing fact.</en></lang>
    const sortedEntries = [...directoryEntries].sort(compareDirectoryEntries);

    // <lang><zh-CN>逐项 lstat，禁止 Dirent 类型缓存掩盖 symlink 或特殊文件。</zh-CN><en>lstat every entry so cached Dirent types cannot hide a symlink or special file.</en></lang>
    for (const directoryEntry of sortedEntries) {
      // <lang><zh-CN>用 `/` 组装稳定诊断路径，不公开宿主分隔符或绝对根。</zh-CN><en>Assemble a stable diagnostic path with `/`, exposing neither host separators nor the absolute root.</en></lang>
      const relativePath = currentDirectory.relativePath === ''
        ? directoryEntry.name
        : `${currentDirectory.relativePath}/${directoryEntry.name}`;

      // <lang><zh-CN>实际读取路径只由已验证目录与其直接子项名构成。</zh-CN><en>The actual read path consists only of the verified directory and its direct child name.</en></lang>
      const absolutePath = join(currentDirectory.absolutePath, directoryEntry.name);

      // <lang><zh-CN>lstat 不追随符号链接；异常仍只报告相对路径。</zh-CN><en>lstat does not follow symbolic links; failures still report only the relative path.</en></lang>
      let entryStats;
      try {
        entryStats = await lstat(absolutePath);
      } catch {
        failArtifact(`entry cannot be inspected at ${relativePath}`);
      }

      // <lang><zh-CN>symlink 与 Windows junction 均由 isSymbolicLink 失败，避免发布根逃逸。</zh-CN><en>Fail symlinks and Windows junctions through isSymbolicLink so the publication root cannot be escaped.</en></lang>
      if (entryStats.isSymbolicLink()) failArtifact(`symbolic link is present at ${relativePath}`);

      // <lang><zh-CN>真实目录先执行段级策略，再进入只含受控子路径的队列。</zh-CN><en>A real directory first passes segment policy and then enters the queue containing only controlled child paths.</en></lang>
      if (entryStats.isDirectory()) {
        validateArtifactPath(relativePath, true);
        pendingDirectories.push({ absolutePath, relativePath });
        continue;
      }

      // <lang><zh-CN>除普通文件和目录外的所有文件系统类型均不属于静态站点。</zh-CN><en>No file-system type other than a regular file or directory belongs in the static site.</en></lang>
      if (!entryStats.isFile()) failArtifact(`non-regular file is present at ${relativePath}`);

      // <lang><zh-CN>普通文件路径先过 source map、配置、凭据与字体策略。</zh-CN><en>The regular-file path first passes source-map, configuration, credential, and font policies.</en></lang>
      validateArtifactPath(relativePath, false);

      // <lang><zh-CN>link count 大于 1 表示 hardlink；非 1 的异常值同样不接受为可移植 Pages artifact。</zh-CN><en>A link count greater than one denotes a hardlink; any abnormal value other than one is likewise not accepted as a portable Pages artifact.</en></lang>
      if (entryStats.nlink !== 1) failArtifact(`hard link is present at ${relativePath}`);

      // <lang><zh-CN>仅在全部文件系统约束成立后登记普通文件。</zh-CN><en>Register the regular file only after all file-system constraints hold.</en></lang>
      artifactFiles.push({ absolutePath, relativePath });
    }
  }

  // <lang><zh-CN>最终按相对路径排序，为内容扫描和测试摘要提供确定顺序。</zh-CN><en>Finally sort by relative path to give content scanning and test summaries deterministic order.</en></lang>
  return artifactFiles.sort((left, right) => compareDirectoryEntries({ name: left.relativePath }, { name: right.relativePath }));
}

/**
 * <lang><zh-CN>受限解压一个 PNG 文本 metadata payload。</zh-CN><en>Inflates one PNG text-metadata payload under a strict bound.</en></lang>
 * @param {Buffer} compressedBytes <lang><zh-CN>zTXt/iTXt 的 zlib payload。</zh-CN><en>zlib payload from zTXt/iTXt.</en></lang>
 * @param {string} relativePath <lang><zh-CN>仅用于稳定错误的成品相对路径。</zh-CN><en>Artifact-relative path used only in a stable error.</en></lang>
 * @returns {string} <lang><zh-CN>UTF-8 metadata 文本。</zh-CN><en>UTF-8 metadata text.</en></lang>
 */
function inflatePngMetadata(compressedBytes, relativePath) {
  // <lang><zh-CN>Node 内建 zlib 设置明确输出上限，防止 metadata 压缩炸弹扩大门禁内存。</zh-CN><en>Node's built-in zlib receives an explicit output limit so a metadata compression bomb cannot expand gate memory.</en></lang>
  let inflatedBytes;
  try {
    inflatedBytes = inflateSync(compressedBytes, { maxOutputLength: maximumPngMetadataBytes });
  } catch {
    failArtifact(`PNG text metadata cannot be audited at ${relativePath}`);
  }

  // <lang><zh-CN>只把已成功受限解压的 metadata 解释为 UTF-8。</zh-CN><en>Interpret only successfully bounded metadata as UTF-8.</en></lang>
  return inflatedBytes.toString('utf8');
}

/**
 * <lang><zh-CN>从 PNG 的 tEXt/iTXt/zTXt/eXIf 块提取可审计文字，明确忽略 IDAT 压缩像素字节。</zh-CN><en>Extracts auditable text from PNG tEXt/iTXt/zTXt/eXIf chunks while explicitly ignoring compressed IDAT pixel bytes.</en></lang>
 * @param {Buffer} pngBytes <lang><zh-CN>普通 `.png` 文件字节。</zh-CN><en>Bytes of a regular `.png` file.</en></lang>
 * @param {string} relativePath <lang><zh-CN>成品相对路径。</zh-CN><en>Artifact-relative path.</en></lang>
 * @returns {string} <lang><zh-CN>以换行连接的有限 metadata 文本。</zh-CN><en>Finite metadata text joined with newlines.</en></lang>
 * @lang zh-CN 压缩像素可能随机形成 `C:\` 等字节序列，不能作为路径泄露证据；显式文本 metadata 仍接受完整隐私、secret、URL 与遥测扫描。
 * @lang en Compressed pixels may randomly form byte sequences such as `C:\`; they are not path-leak evidence, while explicit text metadata still receives full privacy, secret, URL, and telemetry scans.
 */
function extractPngMetadataText(pngBytes, relativePath) {
  // <lang><zh-CN>扩展名不足以证明格式，必须先验证标准 signature。</zh-CN><en>The extension does not prove the format, so verify the standard signature first.</en></lang>
  if (pngBytes.length < pngSignature.length || !pngBytes.subarray(0, pngSignature.length).equals(pngSignature)) {
    failArtifact(`PNG signature is invalid at ${relativePath}`);
  }

  // <lang><zh-CN>chunk 游标从 signature 后开始。</zh-CN><en>The chunk cursor begins after the signature.</en></lang>
  let chunkOffset = pngSignature.length;

  // <lang><zh-CN>至少一个 IEND 必须完整结束 PNG。</zh-CN><en>At least one IEND must terminate the PNG completely.</en></lang>
  let reachedImageEnd = false;

  // <lang><zh-CN>metadata 片段只保存明确文本 chunk 或 eXIf 可打印字段。</zh-CN><en>Metadata fragments retain only explicit text chunks or printable eXIf fields.</en></lang>
  const metadataFragments = [];

  // <lang><zh-CN>每个 chunk 至少含 length、type 与 CRC。</zh-CN><en>Every chunk contains at least length, type, and CRC.</en></lang>
  while (chunkOffset + 12 <= pngBytes.length) {
    // <lang><zh-CN>大端长度只控制当前文件内 slice，不用于外部 allocation。</zh-CN><en>The big-endian length controls only a slice in the current file and no external allocation.</en></lang>
    const chunkLength = pngBytes.readUInt32BE(chunkOffset);

    // <lang><zh-CN>四字节 ASCII type 紧随 length。</zh-CN><en>The four-byte ASCII type follows the length.</en></lang>
    const chunkType = pngBytes.subarray(chunkOffset + 4, chunkOffset + 8).toString('ascii');

    // <lang><zh-CN>data end 与 CRC end 必须落在文件内，防止截断 chunk 被容错。</zh-CN><en>Both data end and CRC end must remain inside the file so a truncated chunk is never tolerated.</en></lang>
    const chunkDataStart = chunkOffset + 8;
    const chunkDataEnd = chunkDataStart + chunkLength;
    const nextChunkOffset = chunkDataEnd + 4;
    if (chunkDataEnd < chunkDataStart || nextChunkOffset > pngBytes.length) {
      failArtifact(`PNG chunk is truncated at ${relativePath}`);
    }

    // <lang><zh-CN>slice 只引用当前 chunk data；CRC 由既有资产测试治理，本门禁聚焦 metadata 隐私。</zh-CN><en>The slice references only current chunk data; existing asset tests govern CRC while this gate focuses on metadata privacy.</en></lang>
    const chunkData = pngBytes.subarray(chunkDataStart, chunkDataEnd);

    // <lang><zh-CN>tEXt 是 Latin-1 keyword/null/text，整体解码即可纳入高置信度 marker 扫描。</zh-CN><en>tEXt is Latin-1 keyword/null/text and can be decoded in full for high-confidence marker scanning.</en></lang>
    if (chunkType === 'tEXt') metadataFragments.push(chunkData.toString('latin1'));

    // <lang><zh-CN>zTXt 在 keyword/null/method 后保存 zlib 文本。</zh-CN><en>zTXt stores zlib text after keyword/null/method.</en></lang>
    if (chunkType === 'zTXt') {
      const keywordEnd = chunkData.indexOf(0);
      if (keywordEnd < 0 || keywordEnd + 2 > chunkData.length || chunkData[keywordEnd + 1] !== 0) {
        failArtifact(`PNG zTXt metadata is invalid at ${relativePath}`);
      }
      metadataFragments.push(chunkData.subarray(0, keywordEnd).toString('latin1'));
      metadataFragments.push(inflatePngMetadata(chunkData.subarray(keywordEnd + 2), relativePath));
    }

    // <lang><zh-CN>iTXt header 包含 keyword、compression flag/method、language 与 translated keyword，payload 可为明文或 zlib。</zh-CN><en>The iTXt header contains keyword, compression flag/method, language, and translated keyword, while its payload is plain text or zlib.</en></lang>
    if (chunkType === 'iTXt') {
      const keywordEnd = chunkData.indexOf(0);
      if (keywordEnd < 0 || keywordEnd + 3 > chunkData.length) failArtifact(`PNG iTXt metadata is invalid at ${relativePath}`);

      // <lang><zh-CN>压缩 flag/method 紧随 keyword terminator。</zh-CN><en>The compression flag/method immediately follow the keyword terminator.</en></lang>
      const compressionFlag = chunkData[keywordEnd + 1];
      const compressionMethod = chunkData[keywordEnd + 2];

      // <lang><zh-CN>language 与 translated keyword 都由 null 终止。</zh-CN><en>Both language and translated keyword are null-terminated.</en></lang>
      const languageEnd = chunkData.indexOf(0, keywordEnd + 3);
      const translatedKeywordEnd = languageEnd < 0 ? -1 : chunkData.indexOf(0, languageEnd + 1);
      if (languageEnd < 0 || translatedKeywordEnd < 0) failArtifact(`PNG iTXt metadata is invalid at ${relativePath}`);

      // <lang><zh-CN>header 的可读字段也属于公开 metadata。</zh-CN><en>Readable header fields also belong to public metadata.</en></lang>
      metadataFragments.push(chunkData.subarray(0, keywordEnd).toString('utf8'));
      metadataFragments.push(chunkData.subarray(keywordEnd + 3, languageEnd).toString('utf8'));
      metadataFragments.push(chunkData.subarray(languageEnd + 1, translatedKeywordEnd).toString('utf8'));

      // <lang><zh-CN>payload 从第二个 string terminator 后开始。</zh-CN><en>The payload begins after the second string terminator.</en></lang>
      const textPayload = chunkData.subarray(translatedKeywordEnd + 1);
      if (compressionFlag === 0) {
        metadataFragments.push(textPayload.toString('utf8'));
      } else if (compressionFlag === 1 && compressionMethod === 0) {
        metadataFragments.push(inflatePngMetadata(textPayload, relativePath));
      } else {
        failArtifact(`PNG iTXt compression is unsupported at ${relativePath}`);
      }
    }

    // <lang><zh-CN>eXIf 是结构化二进制；只提取长度至少六的可打印 ASCII run，避免把任意二进制对齐误作路径。</zh-CN><en>eXIf is structured binary; extract only printable ASCII runs of at least six characters so arbitrary binary alignment is not mistaken for a path.</en></lang>
    if (chunkType === 'eXIf') {
      const printableRuns = chunkData.toString('latin1').match(/[\x20-\x7e]{6,}/gu) ?? [];
      metadataFragments.push(...printableRuns);
    }

    // <lang><zh-CN>IEND 结束遍历；尾部额外字节不属于标准 PNG。</zh-CN><en>IEND terminates traversal; trailing extra bytes do not belong to a standard PNG.</en></lang>
    if (chunkType === 'IEND') {
      reachedImageEnd = true;
      chunkOffset = nextChunkOffset;
      break;
    }

    // <lang><zh-CN>前进到当前 CRC 后的下一 chunk。</zh-CN><en>Advance to the next chunk after the current CRC.</en></lang>
    chunkOffset = nextChunkOffset;
  }

  // <lang><zh-CN>缺失 IEND 或尾随 payload 均阻断 artifact。</zh-CN><en>A missing IEND or trailing payload blocks the artifact.</en></lang>
  if (!reachedImageEnd || chunkOffset !== pngBytes.length) failArtifact(`PNG structure is incomplete at ${relativePath}`);

  // <lang><zh-CN>换行分隔避免相邻 metadata 字段拼接成虚假 marker。</zh-CN><en>Newline separation prevents adjacent metadata fields from combining into a false marker.</en></lang>
  return metadataFragments.join('\n');
}

/**
 * <lang><zh-CN>读取一个已验证普通文件，并建立不会外泄正文的内部记录。</zh-CN><en>Reads one verified regular file and builds an internal record that will never expose its content.</en></lang>
 * @param {{ absolutePath: string, relativePath: string }} artifactFile <lang><zh-CN>已验证文件描述。</zh-CN><en>Verified file descriptor.</en></lang>
 * @returns {Promise<{ relativePath: string, extension: string, sha256: string, text: string, byteLength: number, bytes?: Buffer }>} <lang><zh-CN>用于文本策略、法律固定及受控 PNG/WOFF 二进制绑定的有限记录。</zh-CN><en>Bounded record used for text policy, legal pinning, and controlled PNG/WOFF binary bindings.</en></lang>
 */
async function readArtifactRecord(artifactFile) {
  // <lang><zh-CN>读取失败只转换成相对路径诊断。</zh-CN><en>Convert a read failure into a relative-path diagnostic only.</en></lang>
  let fileBytes;
  try {
    fileBytes = await readFile(artifactFile.absolutePath);
  } catch {
    failArtifact(`file cannot be read at ${artifactFile.relativePath}`);
  }

  // <lang><zh-CN>小写扩展名用于选择 HTML/CSS resource parser。</zh-CN><en>The lowercase extension selects the HTML/CSS resource parser.</en></lang>
  const extension = extname(artifactFile.relativePath).toLowerCase();

  // <lang><zh-CN>PNG 只解码显式 metadata，WOFF 完全不做 UTF-8 文本扫描；其余文件完整解码。</zh-CN><en>PNG decodes only explicit metadata, WOFF receives no UTF-8 text scan, and every other file is decoded in full.</en></lang>
  const text = extension === '.png'
    ? extractPngMetadataText(fileBytes, artifactFile.relativePath)
    : extension === '.woff'
      ? ''
      : fileBytes.toString('utf8');

  // <lang><zh-CN>原始字节摘要用于许可证来源固定；摘要不能恢复正文，也不包含机器路径。</zh-CN><en>The raw-byte digest pins license provenance; it cannot recover content and contains no machine path.</en></lang>
  const sha256 = calculateSha256(fileBytes);

  // <lang><zh-CN>只有需要结构验证的 PNG/WOFF 在内部记录中保留 Buffer；普通文本不重复保留字节。</zh-CN><en>Retain a Buffer in the internal record only for structurally verified PNG/WOFF files; normal text does not duplicate bytes.</en></lang>
  const bytes = extension === '.png' || extension === '.woff' ? fileBytes : undefined;

  // <lang><zh-CN>记录携带相对路径、摘要、长度与受控内部内容，不保留绝对路径。</zh-CN><en>The record carries a relative path, digest, length, and bounded internal content and retains no absolute path.</en></lang>
  return { relativePath: artifactFile.relativePath, extension, sha256, text, byteLength: fileBytes.byteLength, bytes };
}

/**
 * <lang><zh-CN>只读枚举 BP 自有 source 的有限文本文件，并明确跳过顶层锁定 `vendor` 输入。</zh-CN><en>Read-only enumerates finite BP-owned source text files while explicitly skipping the top-level locked `vendor` inputs.</en></lang>
 * @param {string} sourceRoot <lang><zh-CN>BP 自有 `src` 根或测试 fixture 根。</zh-CN><en>BP-owned `src` root or test-fixture root.</en></lang>
 * @returns {Promise<Array<{ relativePath: string, extension: string, sha256: string, text: string }>>} <lang><zh-CN>稳定排序且带原始字节摘要的 source 内容记录。</zh-CN><en>Stably sorted source-content records carrying raw-byte digests.</en></lang>
 * @lang zh-CN verifier 不读取 source submodule；其 commit、许可证和自身字体边界由既有 pin/consumer 门禁治理。
 * @lang en The verifier does not read source submodules; existing pin/consumer gates govern their commits, licenses, and own font boundaries.
 */
async function collectProjectSourceRecords(sourceRoot) {
  // <lang><zh-CN>根类型异常转换成不含绝对路径的稳定 source 错误。</zh-CN><en>Convert an invalid root type into a stable source error containing no absolute path.</en></lang>
  let sourceRootStats;
  try {
    sourceRootStats = await lstat(sourceRoot);
  } catch {
    failArtifact('the project source root is missing');
  }

  // <lang><zh-CN>source 根必须是真实目录，不能由 symlink/junction 重定向。</zh-CN><en>The source root must be a real directory and cannot be redirected by a symlink/junction.</en></lang>
  if (sourceRootStats.isSymbolicLink() || !sourceRootStats.isDirectory()) {
    failArtifact('the project source root is not a real directory');
  }

  // <lang><zh-CN>队列仅保存已 lstat 的项目自有目录。</zh-CN><en>The queue stores only lstat-verified project-owned directories.</en></lang>
  const pendingDirectories = [{ absolutePath: sourceRoot, relativePath: '' }];

  // <lang><zh-CN>记录只保留相对路径、扩展名和内部文本。</zh-CN><en>Records retain only relative paths, extensions, and internal text.</en></lang>
  const sourceRecords = [];

  // <lang><zh-CN>遍历输入固定为 sourceRoot，且不会由源码正文生成新路径。</zh-CN><en>Traversal input remains fixed to sourceRoot and source content creates no new path.</en></lang>
  while (pendingDirectories.length > 0) {
    // <lang><zh-CN>广度优先取出首个真实目录。</zh-CN><en>Take the first real directory in breadth-first order.</en></lang>
    const currentDirectory = pendingDirectories.shift();
    if (!currentDirectory) failArtifact('internal source traversal state is invalid');

    // <lang><zh-CN>目录读取失败只报告 source 相对位置。</zh-CN><en>A directory-read failure reports only the source-relative location.</en></lang>
    let directoryEntries;
    try {
      directoryEntries = await readdir(currentDirectory.absolutePath, { withFileTypes: true });
    } catch {
      const readablePath = currentDirectory.relativePath || '.';
      failArtifact(`project source directory cannot be read at ${readablePath}`);
    }

    // <lang><zh-CN>代码点排序使本机与 CI 取得相同首个错误。</zh-CN><en>Code-point sorting gives local and CI runs the same first error.</en></lang>
    const sortedEntries = [...directoryEntries].sort(compareDirectoryEntries);

    // <lang><zh-CN>逐项检查真实类型，不依赖 Dirent 缓存。</zh-CN><en>Inspect each real type without relying on the Dirent cache.</en></lang>
    for (const directoryEntry of sortedEntries) {
      // <lang><zh-CN>顶层 `vendor` 是精确 source-submodule 边界，无论其内部内容如何都不进入 BP-owned 扫描。</zh-CN><en>Top-level `vendor` is the exact source-submodule boundary and never enters the BP-owned scan regardless of its contents.</en></lang>
      if (currentDirectory.relativePath === '' && directoryEntry.name === 'vendor') continue;

      // <lang><zh-CN>组装只用于诊断的 `/` 相对路径。</zh-CN><en>Assemble a `/` relative path used only for diagnostics.</en></lang>
      const relativePath = currentDirectory.relativePath === ''
        ? directoryEntry.name
        : `${currentDirectory.relativePath}/${directoryEntry.name}`;

      // <lang><zh-CN>实际路径只由已验证目录与直接子项组成。</zh-CN><en>The actual path consists only of the verified directory and its direct child.</en></lang>
      const absolutePath = join(currentDirectory.absolutePath, directoryEntry.name);

      // <lang><zh-CN>lstat 防止项目自有 source 通过链接逃逸扫描根。</zh-CN><en>lstat prevents project-owned source from escaping the scan root through a link.</en></lang>
      let entryStats;
      try {
        entryStats = await lstat(absolutePath);
      } catch {
        failArtifact(`project source entry cannot be inspected at ${relativePath}`);
      }

      // <lang><zh-CN>项目自有 source 中的 symlink/junction 不能形成完整字体边界证据。</zh-CN><en>A symlink/junction in project-owned source cannot form complete font-boundary evidence.</en></lang>
      if (entryStats.isSymbolicLink()) failArtifact(`project source symbolic link is present at ${relativePath}`);

      // <lang><zh-CN>真实目录进入后续队列。</zh-CN><en>A real directory enters the subsequent queue.</en></lang>
      if (entryStats.isDirectory()) {
        pendingDirectories.push({ absolutePath, relativePath });
        continue;
      }

      // <lang><zh-CN>特殊文件不读取；source 根只允许普通文件和目录。</zh-CN><en>Do not read special files; the source root permits only regular files and directories.</en></lang>
      if (!entryStats.isFile()) failArtifact(`non-regular project source is present at ${relativePath}`);

      // <lang><zh-CN>扩展名不属于可执行/样式/config 文本时无需参与字体能力扫描。</zh-CN><en>A file whose extension is not executable/style/config text need not enter the font-capability scan.</en></lang>
      const extension = extname(relativePath).toLowerCase();
      if (!projectSourceExtensions.has(extension)) continue;

      // <lang><zh-CN>读取失败继续只报告项目相对路径。</zh-CN><en>A read failure continues to report only the project-relative path.</en></lang>
      let sourceBytes;
      try {
        sourceBytes = await readFile(absolutePath);
      } catch {
        failArtifact(`project source file cannot be read at ${relativePath}`);
      }

      // <lang><zh-CN>UTF-8 正文用于静态 surface 扫描，原始摘要用于绑定两个生成样式。</zh-CN><en>UTF-8 text serves static-surface scans, while the raw digest binds the two generated styles.</en></lang>
      const sourceText = sourceBytes.toString('utf8');
      const sha256 = calculateSha256(sourceBytes);

      // <lang><zh-CN>登记有限内部记录，不保留绝对路径。</zh-CN><en>Register a bounded internal record without retaining an absolute path.</en></lang>
      sourceRecords.push({ relativePath, extension, sha256, text: sourceText });
    }
  }

  // <lang><zh-CN>按相对路径稳定排序。</zh-CN><en>Sort stably by relative path.</en></lang>
  return sourceRecords.sort((left, right) => compareDirectoryEntries({ name: left.relativePath }, { name: right.relativePath }));
}

/**
 * <lang><zh-CN>验证 source 中恰有两个已生成字体样式，并把 H5 locator 与微信 data WOFF 逐 face 绑定到固定 manifest。</zh-CN><en>Verifies that source contains exactly the two generated font styles and binds each H5 locator and WeChat data WOFF face to the pinned manifest.</en></lang>
 * @param {Array<{ relativePath: string, extension: string, sha256: string, text: string }>} sourceRecords <lang><zh-CN>BP 自有 source 记录。</zh-CN><en>BP-owned source records.</en></lang>
 * @returns {Readonly<{ fontFaceCount: number, fontStyleFileCount: number }>} <lang><zh-CN>不含路径与内容的字体 source 摘要。</zh-CN><en>Path- and content-free font-source summary.</en></lang>
 */
function verifyReviewedSourceFontStyles(sourceRecords) {
  // <lang><zh-CN>恰好两个精确相对路径可承载声明；不存在按目录或后缀放宽。</zh-CN><en>Exactly two relative paths may carry declarations; no directory- or suffix-wide relaxation exists.</en></lang>
  const reviewedStyleRecords = sourceRecords.filter((sourceRecord) => reviewedFontStylePaths.has(sourceRecord.relativePath));
  if (reviewedStyleRecords.length !== reviewedFontStylePaths.size) {
    failArtifact('the complete generated font-style pair is missing from project source');
  }

  // <lang><zh-CN>两个文件各自必须包含三个唯一 face。</zh-CN><en>Each of the two files must contain three unique faces.</en></lang>
  let totalFontFaceCount = 0;

  // <lang><zh-CN>逐个生成样式验证字节与平台 locator 模式。</zh-CN><en>Verify bytes and platform-specific locator mode for each generated style.</en></lang>
  for (const styleRecord of reviewedStyleRecords) {
    // <lang><zh-CN>文件名匹配不够；原始字节必须等于生成器当前已审输出。</zh-CN><en>A matching filename is insufficient; raw bytes must equal the generator's currently reviewed output.</en></lang>
    const expectedStyleSha256 = reviewedFontStyleSha256ByPath.get(styleRecord.relativePath);
    if (typeof expectedStyleSha256 !== 'string' || styleRecord.sha256 !== expectedStyleSha256) {
      failArtifact(`generated font style does not match its pinned SHA-256 at ${styleRecord.relativePath}`);
    }

    // <lang><zh-CN>真实规则数必须精确为三。</zh-CN><en>The number of real rules must be exactly three.</en></lang>
    const faceDeclarations = extractFontFaceDeclarations(styleRecord.text, styleRecord.relativePath);
    if (faceDeclarations.length !== expectedFontFaces.length) {
      failArtifact(`generated font style must declare exactly three faces at ${styleRecord.relativePath}`);
    }

    // <lang><zh-CN>Set 防止复制一个合格 face 三次替代完整字重集合。</zh-CN><en>The Set prevents three copies of one eligible face from substituting for the full weight set.</en></lang>
    const seenFaceIds = new Set();
    for (const declarations of faceDeclarations) {
      // <lang><zh-CN>公共 descriptor validator 先绑定有限身份。</zh-CN><en>The shared descriptor validator first binds a bounded identity.</en></lang>
      const { face, locator } = bindReviewedFontFace(declarations, styleRecord.relativePath);
      if (seenFaceIds.has(face.id)) failArtifact(`generated font style duplicates face ${face.id} at ${styleRecord.relativePath}`);
      seenFaceIds.add(face.id);

      // <lang><zh-CN>固定 source 输出的 basename 是 H5 相对 locator 的唯一目标。</zh-CN><en>The basename of the pinned source output is the sole target of the H5 relative locator.</en></lang>
      const sourceFileName = face.outputPath.split('/').at(-1) ?? '';

      // <lang><zh-CN>H5 样式只能引用同项目 source WOFF，交由 Vite 产生 Pages-base hashed 文件。</zh-CN><en>The H5 style may reference only the same-project source WOFF, which Vite turns into a Pages-base hashed file.</en></lang>
      if (styleRecord.relativePath === h5FontStyleRelativePath) {
        const expectedLocator = `./assets/fonts/${sourceFileName}`;
        if (locator !== expectedLocator) failArtifact(`H5 generated font locator is outside the allowlist for ${face.id}`);
        continue;
      }

      // <lang><zh-CN>微信生成样式只允许 canonical base64 data WOFF，不能混入 URL 或 MIME 变体。</zh-CN><en>The generated WeChat style permits only canonical base64 data WOFF and no URL or MIME variant.</en></lang>
      const dataPrefix = 'data:font/woff;base64,';
      if (!locator.startsWith(dataPrefix)) failArtifact(`WeChat generated font locator is outside the allowlist for ${face.id}`);

      // <lang><zh-CN>payload 必须使用标准 base64 字符集与尾部 padding。</zh-CN><en>The payload must use the standard base64 alphabet and terminal padding.</en></lang>
      const encodedWoff = locator.slice(dataPrefix.length);
      if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(encodedWoff)) failArtifact(`WeChat generated font data is not canonical for ${face.id}`);

      // <lang><zh-CN>Node 解码后再次编码必须逐字符相等，阻止宽松 decoder 接受隐藏字节。</zh-CN><en>Re-encoding after Node decoding must match character for character, preventing the permissive decoder from accepting hidden bytes.</en></lang>
      const decodedWoff = Buffer.from(encodedWoff, 'base64');
      if (decodedWoff.toString('base64') !== encodedWoff) failArtifact(`WeChat generated font data is not canonical for ${face.id}`);

      // <lang><zh-CN>解码字节长度、摘要与 WOFF signature 同时绑定 source face。</zh-CN><en>Decoded byte length, digest, and WOFF signature jointly bind the source face.</en></lang>
      const hasExpectedBinary = decodedWoff.byteLength === face.outputBytes
        && calculateSha256(decodedWoff) === face.outputSha256
        && decodedWoff.subarray(0, 4).toString('ascii') === 'wOFF';
      if (!hasExpectedBinary) failArtifact(`WeChat generated font data does not match face ${face.id}`);
    }

    // <lang><zh-CN>每份样式都必须覆盖 allowlist 全集。</zh-CN><en>Each style must cover the complete allowlist.</en></lang>
    if (seenFaceIds.size !== expectedFontFaces.length) {
      failArtifact(`generated font style does not cover every reviewed face at ${styleRecord.relativePath}`);
    }

    // <lang><zh-CN>累计的是已绑定规则而不是 marker 文本。</zh-CN><en>Accumulate bound rules rather than marker text.</en></lang>
    totalFontFaceCount += faceDeclarations.length;
  }

  // <lang><zh-CN>冻结有限摘要供 source verifier 合并。</zh-CN><en>Freeze the bounded summary for the source verifier to compose.</en></lang>
  return Object.freeze({ fontFaceCount: totalFontFaceCount, fontStyleFileCount: reviewedStyleRecords.length });
}

/**
 * <lang><zh-CN>验证 BP 自有 source 只通过两个精确生成样式交付字体，且不调用动态字体或广告能力。</zh-CN><en>Verifies that BP-owned source delivers fonts only through the two exact generated styles and invokes neither dynamic-font nor advertising capabilities.</en></lang>
 * @param {string} sourceRoot <lang><zh-CN>固定项目 source 根或隔离测试根。</zh-CN><en>Fixed project source root or isolated test root.</en></lang>
 * @returns {Promise<Readonly<{ fileCount: number, fontAssetByteCount: number, fontAssetCount: number, fontFaceCount: number, fontStyleFileCount: number }>>} <lang><zh-CN>不含路径与正文的有限字体 source 摘要。</zh-CN><en>Finite font-source summary containing no paths or content.</en></lang>
 * @lang zh-CN 该负面证据与 artifact 的 dormant font/ad framework 结构门禁共同证明“能力存在但项目未采用”；它不是浏览器运行时网络 smoke 的替代品。
 * @lang en This negative evidence combines with the artifact's dormant font/ad framework shape gates to prove that capabilities exist but the project does not adopt them; it is not a substitute for a browser runtime network smoke.
 */
export async function verifyH5FontSourceBoundary(sourceRoot) {
  // <lang><zh-CN>拒绝隐式路径转换或空根。</zh-CN><en>Reject implicit path conversion or an empty root.</en></lang>
  if (typeof sourceRoot !== 'string' || sourceRoot.trim() === '') failArtifact('project source root input is invalid');

  // <lang><zh-CN>绝对解析值仅用于本次只读遍历，不进入输出。</zh-CN><en>The absolute resolved value serves only this read-only traversal and enters no output.</en></lang>
  const resolvedSourceRoot = resolve(sourceRoot);

  // <lang><zh-CN>只取得 BP 自有文本记录，跳过 vendor。</zh-CN><en>Obtain only BP-owned text records and skip vendor.</en></lang>
  const sourceRecords = await collectProjectSourceRecords(resolvedSourceRoot);

  // <lang><zh-CN>隔离根内的 manifest 与三份 WOFF 必须自足并逐字节通过；验证不回退到真实工作树。</zh-CN><en>The manifest and three WOFF files inside the isolated root must be self-contained and pass byte-for-byte; verification never falls back to the real worktree.</en></lang>
  const fontAssetSummary = await verifyReviewedSourceFontAssets(resolvedSourceRoot);

  // <lang><zh-CN>仅真实固定 source 再复用专项门禁完成 CFF/name/cmap、corpus 与工具链深审；fixture 仍由上方字节固定保持隔离。</zh-CN><en>Only the real fixed source additionally reuses the dedicated gate for CFF/name/cmap, corpus, and toolchain depth; fixtures remain isolated through the byte pins above.</en></lang>
  if (resolvedSourceRoot === fixedSourceRoot) await verifyFontSubsets();

  // <lang><zh-CN>两个生成样式先完成摘要、规则与逐字节绑定。</zh-CN><en>The two generated styles first complete digest, rule, and byte-for-byte bindings.</en></lang>
  const fontStyleSummary = verifyReviewedSourceFontStyles(sourceRecords);

  // <lang><zh-CN>逐文件检查实际调用形状与字体声明，不把普通 font-family 名称误作字体交付。</zh-CN><en>Check actual call shapes and font declarations file by file without mistaking ordinary font-family names for font delivery.</en></lang>
  for (const sourceRecord of sourceRecords) {
    // <lang><zh-CN>模板 `<ad>`、adpid、uni-ad、任意 `create*Ad(...)` 与固定 endpoint/key 均表示 BP 已采用 framework 广告 surface。</zh-CN><en>A template `<ad>`, adpid, uni-ad, any `create*Ad(...)`, or a fixed endpoint/key means the BP has adopted the framework advertising surface.</en></lang>
    const declaresAdSurface = /(?:<ad(?:\s|\/?>)|\badpid\b|\buni-ad\b|\bcreate[A-Za-z0-9_$]*Ad\s*\()/iu.test(sourceRecord.text)
      || dcloudAdManagerMarkers.some((marker) => sourceRecord.text.includes(marker));
    if (declaresAdSurface) failArtifact(`project source declares an advertising surface at ${sourceRecord.relativePath}`);

    // <lang><zh-CN>覆盖 `uni.loadFontFace(...)`、`wx.loadFontFace(...)`、直接函数调用与 computed member 调用。</zh-CN><en>Cover `uni.loadFontFace(...)`, `wx.loadFontFace(...)`, direct function calls, and computed-member calls.</en></lang>
    const invokesLoadFontFace = /(?:\b(?:uni|wx)\s*\.\s*loadFontFace\s*\(|\bloadFontFace\s*\(|\[\s*["']loadFontFace["']\s*\]\s*\()/u.test(sourceRecord.text);
    if (invokesLoadFontFace) failArtifact(`project source invokes loadFontFace at ${sourceRecord.relativePath}`);

    // <lang><zh-CN>固定 manifest 与两个已完整验证样式是仅有的 source 例外。</zh-CN><en>The pinned manifest and two fully verified styles are the only source exceptions.</en></lang>
    if (sourceRecord.relativePath === fontManifestRelativePath || reviewedFontStylePaths.has(sourceRecord.relativePath)) continue;

    // <lang><zh-CN>项目自有 source 中的 CSS 字体声明无条件扩大交付边界。</zh-CN><en>A CSS font declaration in project-owned source unconditionally expands the delivery boundary.</en></lang>
    if (/@font-face\b/iu.test(sourceRecord.text)) {
      failArtifact(`project source declares font-face at ${sourceRecord.relativePath}`);
    }

    // <lang><zh-CN>静态、data 或 font-service 地址即使尚未编译成文件，也构成未知字体依赖。</zh-CN><en>A static, data, or font-service location forms an unknown font dependency even before compilation into a file.</en></lang>
    if (staticFontReferencePattern.test(sourceRecord.text)) {
      failArtifact(`project source declares a static font resource at ${sourceRecord.relativePath}`);
    }
  }

  // <lang><zh-CN>冻结无路径摘要供 test/CI 记录。</zh-CN><en>Freeze a path-free summary for test/CI records.</en></lang>
  return Object.freeze({
    fileCount: sourceRecords.length,
    fontAssetByteCount: fontAssetSummary.fontAssetByteCount,
    fontAssetCount: fontAssetSummary.fontAssetCount,
    fontFaceCount: fontStyleSummary.fontFaceCount,
    fontStyleFileCount: fontStyleSummary.fontStyleFileCount
  });
}

/**
 * <lang><zh-CN>把 Pages 成品中恰三份 hashed WOFF 与恰三条 CSS face 声明逐项绑定到固定 source 字节。</zh-CN><en>Binds exactly three hashed WOFF files and exactly three CSS face declarations in the Pages artifact to the pinned source bytes.</en></lang>
 * @param {Array<{ relativePath: string, extension: string, sha256: string, text: string, byteLength: number, bytes?: Buffer }>} artifactRecords <lang><zh-CN>已通过文件系统门禁的成品记录。</zh-CN><en>Artifact records that have passed the file-system gates.</en></lang>
 * @returns {Readonly<{ fontAssetByteCount: number, fontAssetCount: number, fontCssPaths: Set<string>, fontFaceCount: number, fontFaces: ReadonlyArray<Readonly<{ id: string, byteLength: number, sha256: string }>> }>} <lang><zh-CN>供后续内容门禁与公开摘要使用的已审字体事实。</zh-CN><en>Reviewed font facts used by later content gates and the public summary.</en></lang>
 * @lang zh-CN 文件名只定位 Vite 版本化输出；授权最终由固定摘要、尺寸、CSS 身份、locator 与 WOFF signature 共同决定。
 * @lang en Filenames only locate Vite-versioned outputs; authorization ultimately requires the pinned digest, size, CSS identity, locator, and WOFF signature together.
 */
function verifyReviewedArtifactFonts(artifactRecords) {
  // <lang><zh-CN>所有 WOFF 1.0 文件都必须进入本函数，不能在其他目录保留第四份未引用副本。</zh-CN><en>Every WOFF 1.0 file must enter this function; no fourth unreferenced copy may remain elsewhere.</en></lang>
  const artifactWoffRecords = artifactRecords.filter((artifactRecord) => artifactRecord.extension === '.woff');
  if (artifactWoffRecords.length !== expectedFontFaces.length) {
    failArtifact('Pages artifact must contain exactly three reviewed WOFF files');
  }

  // <lang><zh-CN>face ID 到唯一成品文件的内部映射只在本次调用存活。</zh-CN><en>The internal face-ID-to-artifact mapping lives only for this invocation.</en></lang>
  const artifactWoffByFaceId = new Map();

  // <lang><zh-CN>逐 face 以版本化文件名规则定位唯一候选，再绑定完整二进制身份。</zh-CN><en>For each face, locate one candidate through its versioned filename rule and then bind its complete binary identity.</en></lang>
  for (const expectedFace of expectedFontFaces) {
    // <lang><zh-CN>候选路径必须命中该 face 的精确 Vite 输出命名规则。</zh-CN><en>The candidate path must match the exact Vite output naming rule for this face.</en></lang>
    const matchingWoffRecords = artifactWoffRecords.filter((artifactRecord) => expectedFace.artifactFilePattern.test(artifactRecord.relativePath));
    if (matchingWoffRecords.length !== 1) failArtifact(`Pages WOFF filename is outside the allowlist for ${expectedFace.id}`);

    // <lang><zh-CN>唯一候选仍不能只凭文件名获准。</zh-CN><en>The sole candidate is not authorized by filename alone.</en></lang>
    const matchingWoffRecord = matchingWoffRecords[0];
    if (!matchingWoffRecord?.bytes) failArtifact(`Pages WOFF bytes are unavailable for ${expectedFace.id}`);

    // <lang><zh-CN>摘要、长度与 signature 同时等于 source face 才能进入 CSS 绑定。</zh-CN><en>The digest, length, and signature must all equal the source face before CSS binding.</en></lang>
    const hasExpectedArtifactWoffIdentity = matchingWoffRecord.sha256 === expectedFace.outputSha256
      && matchingWoffRecord.byteLength === expectedFace.outputBytes
      && matchingWoffRecord.bytes.subarray(0, 4).toString('ascii') === 'wOFF';
    if (!hasExpectedArtifactWoffIdentity) failArtifact(`Pages WOFF does not match face ${expectedFace.id}`);

    // <lang><zh-CN>登记唯一 record 供 locator 精确反查。</zh-CN><en>Register the unique record for exact locator lookup.</en></lang>
    artifactWoffByFaceId.set(expectedFace.id, matchingWoffRecord);
  }

  // <lang><zh-CN>只有 CSS 可以承载静态字体声明；JS 中仍只保留 dormant Uni capability。</zh-CN><en>Only CSS may carry static font declarations; JavaScript still retains only the dormant Uni capability.</en></lang>
  const fontCssRecords = artifactRecords.filter((artifactRecord) => artifactRecord.extension === '.css' && /@font-face\b/iu.test(artifactRecord.text));

  // <lang><zh-CN>内部路径集合只让通用内容扫描识别已经完整绑定的 CSS。</zh-CN><en>An internal path set lets the general content scan recognize CSS that has already been fully bound.</en></lang>
  const fontCssPaths = new Set(fontCssRecords.map((fontCssRecord) => fontCssRecord.relativePath));

  // <lang><zh-CN>三个固定 face ID 必须各出现一次。</zh-CN><en>Each of the three fixed face IDs must appear exactly once.</en></lang>
  const seenFontFaceIds = new Set();

  // <lang><zh-CN>实际规则总数防止没有声明或额外第四条声明。</zh-CN><en>The actual rule count prevents either missing declarations or an extra fourth declaration.</en></lang>
  let artifactFontFaceCount = 0;

  // <lang><zh-CN>逐 CSS 验证声明，并拒绝规则之外的字体 locator。</zh-CN><en>Verify declarations CSS file by CSS file and reject font locators outside the rules.</en></lang>
  for (const fontCssRecord of fontCssRecords) {
    // <lang><zh-CN>完整 flat face 列表不能由注释 marker 伪造。</zh-CN><en>The complete flat face list cannot be forged through comment markers.</en></lang>
    const fontFaceDeclarations = extractFontFaceDeclarations(fontCssRecord.text, fontCssRecord.relativePath);

    // <lang><zh-CN>当前 CSS 中已绑定 locator 用于与静态引用列表逐项相等。</zh-CN><en>Bound locators in the current CSS are used for exact equality with its static-reference list.</en></lang>
    const boundFontLocators = [];

    // <lang><zh-CN>每条声明绑定唯一 face 和对应成品文件。</zh-CN><en>Bind every declaration to one face and its corresponding artifact file.</en></lang>
    for (const fontFaceDeclaration of fontFaceDeclarations) {
      const { face, locator } = bindReviewedFontFace(fontFaceDeclaration, fontCssRecord.relativePath);
      if (seenFontFaceIds.has(face.id)) failArtifact(`Pages CSS duplicates font face ${face.id}`);

      // <lang><zh-CN>locator 必须是精确 Pages base 加该 face 的唯一 hashed 成品路径。</zh-CN><en>The locator must be the exact Pages base plus the sole hashed artifact path for this face.</en></lang>
      const matchingWoffRecord = artifactWoffByFaceId.get(face.id);
      if (!matchingWoffRecord) failArtifact(`Pages WOFF mapping is missing for ${face.id}`);
      const expectedLocator = `${PROJECT_BASE}${matchingWoffRecord.relativePath}`;
      if (locator !== expectedLocator) failArtifact(`Pages font locator is outside the allowlist for ${face.id}`);

      // <lang><zh-CN>登记 face 与 locator，供全集及额外引用检查。</zh-CN><en>Register the face and locator for completeness and extra-reference checks.</en></lang>
      seenFontFaceIds.add(face.id);
      boundFontLocators.push(locator);
    }

    // <lang><zh-CN>删除全部已解析 face 后，剩余 CSS 不能出现远程、data 或其他静态字体 marker。</zh-CN><en>After removing every parsed face, the remaining CSS may contain no remote, data, or other static-font marker.</en></lang>
    const cssWithoutFontFaces = stripCssComments(fontCssRecord.text).replace(/@font-face\s*\{[^{}]*\}/giu, '');
    if (staticFontReferencePattern.test(cssWithoutFontFaces)) {
      failArtifact(`unreviewed static font resource is present in ${fontCssRecord.relativePath}`);
    }

    // <lang><zh-CN>CSS parser 观察到的字体引用必须与三条声明产生的 locator 同序同数。</zh-CN><en>Font references observed by the CSS parser must equal the declaration locators in both order and cardinality.</en></lang>
    const observedFontLocators = extractCssReferences(fontCssRecord.text).filter((resourceReference) => staticFontReferencePattern.test(resourceReference));
    if (observedFontLocators.length !== boundFontLocators.length
      || observedFontLocators.some((locator, locatorIndex) => locator !== boundFontLocators[locatorIndex])) {
      failArtifact(`Pages CSS font references are outside the allowlist in ${fontCssRecord.relativePath}`);
    }

    // <lang><zh-CN>累计已绑定规则数。</zh-CN><en>Accumulate the number of bound rules.</en></lang>
    artifactFontFaceCount += fontFaceDeclarations.length;
  }

  // <lang><zh-CN>全集 cardinality 同时证明没有漏项和未知第四项。</zh-CN><en>Complete-set cardinality proves both absence of omissions and absence of an unknown fourth item.</en></lang>
  if (artifactFontFaceCount !== expectedFontFaces.length || seenFontFaceIds.size !== expectedFontFaces.length) {
    failArtifact('Pages artifact must declare exactly three reviewed font faces');
  }

  // <lang><zh-CN>返回值按固定 face 顺序公开 ID、字节数与摘要，不公开宿主或成品路径。</zh-CN><en>The result exposes ID, byte count, and digest in fixed face order without exposing host or artifact paths.</en></lang>
  const fontFaces = Object.freeze(expectedFontFaces.map((expectedFace) => Object.freeze({
    id: expectedFace.id,
    byteLength: expectedFace.outputBytes,
    sha256: expectedFace.outputSha256
  })));

  // <lang><zh-CN>总字节数由固定 face 清单相加。</zh-CN><en>The total byte count is the sum of the fixed face ledger.</en></lang>
  const fontAssetByteCount = expectedFontFaces.reduce((byteCount, expectedFace) => byteCount + expectedFace.outputBytes, 0);

  // <lang><zh-CN>冻结外层摘要；Set 仅在同一 verifier 内部读取。</zh-CN><en>Freeze the outer summary; the Set is read only inside the same verifier.</en></lang>
  return Object.freeze({
    fontAssetByteCount,
    fontAssetCount: artifactWoffRecords.length,
    fontCssPaths,
    fontFaceCount: artifactFontFaceCount,
    fontFaces
  });
}

/**
 * <lang><zh-CN>判断 CSS 是否在最后一处 DCloud shadow 预载之后，以同一 `body:after` 规则明确关闭 animation 与 background image。</zh-CN><en>Determines whether CSS explicitly disables animation and background image in the same `body:after` rule after the final DCloud shadow preload occurrence.</en></lang>
 * @param {string} cssText <lang><zh-CN>单一构建 CSS 正文。</zh-CN><en>One built CSS body.</en></lang>
 * @returns {boolean} <lang><zh-CN>受控 dormant 例外是否被后置覆盖。</zh-CN><en>Whether the controlled dormant exception is overridden later.</en></lang>
 */
function hasDcloudShadowSuppression(cssText) {
  // <lang><zh-CN>没有 framework URL 时无需创建例外，也不把任意 override 当作外链许可。</zh-CN><en>Without the framework URL no exception is needed, and an arbitrary override grants no external-URL permission.</en></lang>
  const frameworkUrlIndex = cssText.lastIndexOf(DCLOUD_SHADOW_URL);
  if (frameworkUrlIndex < 0) return false;

  // <lang><zh-CN>只匹配扁平的 `body:after`/`body::after` 规则；当前 compiler 的全局 CSS 不需要执行或完整解析。</zh-CN><en>Match only flat `body:after`/`body::after` rules; the current compiler's global CSS requires neither execution nor a complete parser.</en></lang>
  const rulePattern = /([^{}]+)\{([^{}]*)\}/gu;

  // <lang><zh-CN>逐个检查最后一处 framework URL 之后的规则，确保覆盖确实是后置声明。</zh-CN><en>Inspect rules after the final framework URL so the suppression is genuinely a later declaration.</en></lang>
  for (const ruleMatch of cssText.matchAll(rulePattern)) {
    // <lang><zh-CN>match index 是稳定字符串位置；缺失值按不合格处理。</zh-CN><en>The match index is a stable string offset; a missing value is treated as ineligible.</en></lang>
    const ruleIndex = ruleMatch.index ?? -1;
    if (ruleIndex <= frameworkUrlIndex) continue;

    // <lang><zh-CN>组合 selector 只有显式包含精确 body pseudo-element 才能保护 framework preload。</zh-CN><en>A selector group protects the framework preload only when it explicitly includes the exact body pseudo-element.</en></lang>
    const selectors = (ruleMatch[1] ?? '').split(',').map((selector) => selector.trim());
    const targetsBodyAfter = selectors.includes('body:after') || selectors.includes('body::after');
    if (!targetsBodyAfter) continue;

    // <lang><zh-CN>两项 `!important` 声明必须位于同一规则，避免只停动画却仍触发背景请求。</zh-CN><en>Both `!important` declarations must occur in one rule so stopping animation cannot leave the background request active.</en></lang>
    const declarations = ruleMatch[2] ?? '';
    const disablesAnimation = /(?:^|;)\s*animation\s*:\s*none\s*!important\s*(?:;|$)/iu.test(declarations);
    const disablesBackground = /(?:^|;)\s*background-image\s*:\s*none\s*!important\s*(?:;|$)/iu.test(declarations);
    if (disablesAnimation && disablesBackground) return true;
  }

  // <lang><zh-CN>未找到完整后置规则时拒绝 dormant framework URL。</zh-CN><en>Reject the dormant framework URL when no complete later rule exists.</en></lang>
  return false;
}

/**
 * <lang><zh-CN>计算稳定字面值在文本中的非重叠出现次数。</zh-CN><en>Counts non-overlapping occurrences of a stable literal in text.</en></lang>
 * @param {string} text <lang><zh-CN>待检查内部正文。</zh-CN><en>Internal content to inspect.</en></lang>
 * @param {string} literal <lang><zh-CN>非空稳定字面值。</zh-CN><en>Nonempty stable literal.</en></lang>
 * @returns {number} <lang><zh-CN>非重叠出现次数。</zh-CN><en>Number of non-overlapping occurrences.</en></lang>
 */
function countLiteralOccurrences(text, literal) {
  // <lang><zh-CN>内部调用只传非空常量；防御性拒绝空值以避免无限循环。</zh-CN><en>Internal calls pass only nonempty constants; defensively reject an empty value to prevent an infinite loop.</en></lang>
  if (literal === '') failArtifact('internal literal-count input is invalid');

  // <lang><zh-CN>游标按完整字面值长度前进，使计数不受 RegExp 状态或转义影响。</zh-CN><en>Advance the cursor by the full literal length so counting is independent of RegExp state or escaping.</en></lang>
  let searchOffset = 0;

  // <lang><zh-CN>累计值只用于有限结构门禁，不输出正文位置。</zh-CN><en>The accumulated value serves only the finite structural gate and exposes no content offset.</en></lang>
  let occurrenceCount = 0;

  // <lang><zh-CN>逐项查找直到没有后续字面值。</zh-CN><en>Find occurrences one by one until no later literal remains.</en></lang>
  while (searchOffset < text.length) {
    // <lang><zh-CN>Ordinal indexOf 对 minified ASCII/Unicode marker 提供确定匹配。</zh-CN><en>Ordinal indexOf gives deterministic matching for minified ASCII/Unicode markers.</en></lang>
    const literalIndex = text.indexOf(literal, searchOffset);
    if (literalIndex < 0) break;

    // <lang><zh-CN>登记当前非重叠命中。</zh-CN><en>Register the current non-overlapping match.</en></lang>
    occurrenceCount += 1;

    // <lang><zh-CN>跳过完整命中字面值继续检查。</zh-CN><en>Continue after the complete matched literal.</en></lang>
    searchOffset = literalIndex + literal.length;
  }

  // <lang><zh-CN>返回有限计数。</zh-CN><en>Return the finite count.</en></lang>
  return occurrenceCount;
}

/**
 * <lang><zh-CN>判断 JS 中唯一 `@font-face` 是否属于锁定 UniApp H5 的 dormant `loadFontFace` capability，而不是项目静态字体注入或自动请求。</zh-CN><en>Determines whether the sole `@font-face` in JavaScript belongs to the pinned UniApp H5 dormant `loadFontFace` capability rather than project static-font injection or an automatic request.</en></lang>
 * @param {string} javaScriptText <lang><zh-CN>单一构建 JS 正文。</zh-CN><en>One built JavaScript body.</en></lang>
 * @returns {boolean} <lang><zh-CN>仅完整匹配受控 dormant capability 时为 true。</zh-CN><en>True only when the controlled dormant capability matches completely.</en></lang>
 * @lang zh-CN 固定结构要求 capability 注册名、原生 FontFace 分支、style fallback 与动态 family/source 模板同时存在；静态字体地址由独立规则无条件拒绝。
 * @lang en The fixed shape requires the capability registration name, native FontFace branch, style fallback, and dynamic family/source template together; a separate rule rejects static font locations unconditionally.
 */
function isReviewedDormantLoadFontFaceCapability(javaScriptText) {
  // <lang><zh-CN>只允许一个动态 CSS template，第二个 `@font-face` 即扩大了 artifact 字体 surface。</zh-CN><en>Allow only one dynamic CSS template; a second `@font-face` expands the artifact font surface.</en></lang>
  if (countLiteralOccurrences(javaScriptText, '@font-face') !== 1) return false;

  // <lang><zh-CN>锁定 compiler 的注册名加失败文案最多形成两处 `loadFontFace`；额外出现可能是调用或第二实现。</zh-CN><en>The pinned compiler's registration name plus failure message produce at most two `loadFontFace` occurrences; an extra occurrence may be a call or second implementation.</en></lang>
  const capabilityNameCount = countLiteralOccurrences(javaScriptText, 'loadFontFace');
  if (capabilityNameCount < 1 || capabilityNameCount > 2) return false;

  // <lang><zh-CN>取得唯一 CSS template 周边的有限窗口，避免文件其他无关 API 拼凑通过结构门禁。</zh-CN><en>Take a finite window around the sole CSS template so unrelated APIs elsewhere in the file cannot combine to pass the shape gate.</en></lang>
  const fontFaceIndex = javaScriptText.indexOf('@font-face');
  const contextStart = Math.max(0, fontFaceIndex - 1_200);
  const contextEnd = Math.min(javaScriptText.length, fontFaceIndex + 900);
  const capabilityContext = javaScriptText.slice(contextStart, contextEnd);

  // <lang><zh-CN>注册名必须紧邻同一 capability context，而不是由另一个 chunk 提供。</zh-CN><en>The registration name must occur in the same capability context rather than another chunk.</en></lang>
  const hasRegistrationName = /["']loadFontFace["']\s*,/u.test(capabilityContext);

  // <lang><zh-CN>原生分支必须构造 FontFace；这锁定 UniApp API bridge 而非任意 CSS 字符串。</zh-CN><en>The native branch must construct FontFace, binding the exception to the UniApp API bridge rather than an arbitrary CSS string.</en></lang>
  const hasNativeFontFaceBranch = /new\s+FontFace\s*\(/u.test(capabilityContext);

  // <lang><zh-CN>fallback 必须动态创建 style，而不是 link、script 或自动外部 stylesheet。</zh-CN><en>The fallback must dynamically create a style rather than a link, script, or automatic external stylesheet.</en></lang>
  const hasStyleFallback = /document\.createElement\(\s*["']style["']\s*\)/u.test(capabilityContext);

  // <lang><zh-CN>CSS template 必须从动态 family 与 source 插值生成，不能内置静态 URL。</zh-CN><en>The CSS template must interpolate dynamic family and source values rather than embedding a static URL.</en></lang>
  const hasDynamicTemplate = /innerText\s*=\s*`@font-face\{font-family:["']\$\{[^}]+\}["'];src:\$\{[^}]+\};/u.test(capabilityContext);

  // <lang><zh-CN>四项结构全部成立才保留 dormant framework capability。</zh-CN><en>Retain the dormant framework capability only when all four structural facts hold.</en></lang>
  return hasRegistrationName && hasNativeFontFaceBranch && hasStyleFallback && hasDynamicTemplate;
}

/**
 * <lang><zh-CN>取得指定位置之前、有限窗口内最后一个 `const Name=class` 绑定名。</zh-CN><en>Obtains the final `const Name=class` binding name within a finite window before a specified offset.</en></lang>
 * @param {string} javaScriptText <lang><zh-CN>单一构建 JS 正文。</zh-CN><en>One built JavaScript body.</en></lang>
 * @param {number} beforeIndex <lang><zh-CN>endpoint 字面值起点。</zh-CN><en>Start offset of the endpoint literal.</en></lang>
 * @returns {string | undefined} <lang><zh-CN>安全 JS identifier 或未找到。</zh-CN><en>Safe JavaScript identifier or undefined when absent.</en></lang>
 */
function findNearestClassBinding(javaScriptText, beforeIndex) {
  // <lang><zh-CN>manager class 与其静态 endpoint metadata 在锁定 minified bundle 中相距很近；有限窗口防止借用无关 class。</zh-CN><en>The manager class and its static endpoint metadata are close in the pinned minified bundle; a finite window prevents borrowing an unrelated class.</en></lang>
  const contextStart = Math.max(0, beforeIndex - 5_000);
  const bindingContext = javaScriptText.slice(contextStart, beforeIndex);

  // <lang><zh-CN>只接受语法安全的 identifier，后续可直接构造受控调用检测 RegExp。</zh-CN><en>Accept only a syntactically safe identifier, which can later form a controlled invocation-detection RegExp directly.</en></lang>
  const classBindingPattern = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*class\b/gu;
  const bindingMatches = [...bindingContext.matchAll(classBindingPattern)];

  // <lang><zh-CN>最后一个绑定是紧邻 endpoint metadata 的 manager。</zh-CN><en>The final binding is the manager adjacent to the endpoint metadata.</en></lang>
  return bindingMatches.at(-1)?.[1];
}

/**
 * <lang><zh-CN>判断 JS 是否只保留锁定 UniApp H5 的两个惰性广告 manager，且每个外部绑定仅出现在 class 声明和两项静态 metadata。</zh-CN><en>Determines whether JavaScript retains only the two pinned lazy UniApp H5 ad managers and each outer binding appears solely in its class declaration and two static metadata entries.</en></lang>
 * @param {string} javaScriptText <lang><zh-CN>单一构建 JS 正文。</zh-CN><en>One built JavaScript body.</en></lang>
 * @returns {boolean} <lang><zh-CN>仅完整匹配 endpoint、key、manager 与零 invocation 结构时为 true。</zh-CN><en>True only when endpoint, key, manager, and zero-invocation shapes all match.</en></lang>
 * @lang zh-CN 该静态判断不能证明浏览器绝不执行第三方 framework 分支；线上 Network smoke 仍必须证明默认流程零跨域。
 * @lang en This static judgment cannot prove that a browser never executes a third-party framework branch; the online Network smoke must still prove zero cross-origin traffic in the default flow.
 */
function isReviewedDormantDcloudAdManager(javaScriptText) {
  // <lang><zh-CN>四个固定 marker 必须各恰好出现一次，避免缺半边 manager、重复 storage 或第三份同 endpoint 逻辑。</zh-CN><en>Each of the four fixed markers must occur exactly once, preventing a half manager, duplicate storage, or a third implementation using the same endpoint.</en></lang>
  if (dcloudAdManagerMarkers.some((marker) => countLiteralOccurrences(javaScriptText, marker) !== 1)) return false;

  // <lang><zh-CN>两个 endpoint 必须按 config manager 后 guid manager 的锁定顺序出现并处于同一有限区域。</zh-CN><en>The two endpoints must occur in the pinned config-manager-then-guid-manager order within one finite region.</en></lang>
  const configUrlIndex = javaScriptText.indexOf(DCLOUD_AD_CONFIG_URL);
  const guidUrlIndex = javaScriptText.indexOf(DCLOUD_AD_GUID_URL);
  if (configUrlIndex < 0 || guidUrlIndex <= configUrlIndex || guidUrlIndex - configUrlIndex > 4_000) return false;

  // <lang><zh-CN>为两个 endpoint 分别解析紧邻 class binding。</zh-CN><en>Resolve the adjacent class binding for each endpoint separately.</en></lang>
  const configClassName = findNearestClassBinding(javaScriptText, configUrlIndex);
  const guidClassName = findNearestClassBinding(javaScriptText, guidUrlIndex);
  if (!configClassName || !guidClassName || configClassName === guidClassName) return false;

  // <lang><zh-CN>共享上下文必须同时覆盖两个 class、static instance getter、惰性 get/load/process、localStorage 与 GET request 结构。</zh-CN><en>The shared context must cover both classes, static instance getters, lazy get/load/process methods, localStorage, and GET-request shapes together.</en></lang>
  const sharedContextStart = Math.max(0, configUrlIndex - 3_600);
  const sharedContextEnd = Math.min(javaScriptText.length, guidUrlIndex + 500);
  const sharedContext = javaScriptText.slice(sharedContextStart, sharedContextEnd);
  const hasTwoInstanceGetters = countLiteralOccurrences(sharedContext, 'static get instance') === 2;
  const hasConfigLifecycle = sharedContext.includes('_loadAdConfig') && sharedContext.includes('_getConfig') && sharedContext.includes('_setConfig');
  const hasGuidLifecycle = sharedContext.includes('_process') && /\bget\([^)]*\)\s*\{[^{}]{0,220}this\._process\(/u.test(sharedContext);
  const hasStorageBoundary = sharedContext.includes('localStorage.getItem') && sharedContext.includes('localStorage.setItem');
  const hasGetRequestBoundary = countLiteralOccurrences(sharedContext, 'method:"GET"') >= 2 || countLiteralOccurrences(sharedContext, "method:'GET'") >= 2;
  const hasHostProjection = sharedContext.includes('location.hostname');

  // <lang><zh-CN>静态 metadata 必须把每个 URL/KEY 精确绑定到其相邻 manager class。</zh-CN><en>Static metadata must bind each URL/KEY exactly to its adjacent manager class.</en></lang>
  const configMetadataPattern = new RegExp(`${configClassName},["']URL["'],["']${DCLOUD_AD_CONFIG_URL.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}["'][\\s\\S]{0,300}${configClassName},["']KEY["'],["']${DCLOUD_AD_CONFIG_KEY}["']`, 'u');
  const guidMetadataPattern = new RegExp(`${guidClassName},["']URL["'],["']${DCLOUD_AD_GUID_URL.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}["'][\\s\\S]{0,300}${guidClassName},["']KEY["'],["']${DCLOUD_AD_GUID_KEY}["']`, 'u');
  const configControlMetadataPatterns = [
    new RegExp(`${configClassName},["']IC["'],0`, 'u'),
    new RegExp(`${configClassName},["']IS["'],0`, 'u'),
    new RegExp(`${configClassName},["']CACHE_TIME["'],6e5`, 'u'),
    new RegExp(`${configClassName},["']ERROR_INVALID_ADPID["'],\\{["']-5002["']:["']invalid adpid["']\\}`, 'u')
  ];
  const hasStaticMetadata = configMetadataPattern.test(sharedContext)
    && guidMetadataPattern.test(sharedContext)
    && configControlMetadataPatterns.every((metadataPattern) => metadataPattern.test(sharedContext));

  // <lang><zh-CN>锁定 bundle 的 config binding 只出现七次（声明、URL/KEY 与四项控制 metadata），guid binding 只出现三次（声明、URL/KEY）；alias、反射、属性读取和构造都会增加引用并失败。</zh-CN><en>In the pinned bundle, the config binding occurs only seven times (declaration, URL/KEY, and four control metadata entries), while the guid binding occurs only three times (declaration and URL/KEY); aliases, reflection, property reads, and construction add a reference and fail.</en></lang>
  const expectedBindingReferenceCounts = new Map([[configClassName, 7], [guidClassName, 3]]);
  const hasOnlyStaticManagerBindingReferences = [...expectedBindingReferenceCounts].every(([className, expectedReferenceCount]) => {
    // <lang><zh-CN>binding 已由 identifier 语法过滤，可安全放入 word-boundary RegExp。</zh-CN><en>The binding already passed identifier syntax validation and can safely enter a word-boundary RegExp.</en></lang>
    const bindingReferencePattern = new RegExp(`\\b${className}\\b`, 'gu');

    // <lang><zh-CN>matchAll 计数覆盖 dot、computed、alias、new 与未知调用形状，不依赖枚举激活 API。</zh-CN><en>The matchAll count covers dot, computed, alias, new, and unknown invocation shapes without enumerating activation APIs.</en></lang>
    return [...javaScriptText.matchAll(bindingReferencePattern)].length === expectedReferenceCount;
  });

  // <lang><zh-CN>全部事实成立且外部 binding 没有超出固定计数的额外引用时才允许两个 endpoint 字面值。</zh-CN><en>Allow the two endpoint literals only when every fact holds and neither outer binding has a reference beyond its pinned count.</en></lang>
  return hasTwoInstanceGetters
    && hasConfigLifecycle
    && hasGuidLifecycle
    && hasStorageBoundary
    && hasGetRequestBoundary
    && hasHostProjection
    && hasStaticMetadata
    && hasOnlyStaticManagerBindingReferences;
}

/**
 * <lang><zh-CN>从文本取得规范化的绝对 HTTP(S) URL 字面值。</zh-CN><en>Extracts normalized absolute HTTP(S) URL literals from text.</en></lang>
 * @param {string} text <lang><zh-CN>内部文件正文。</zh-CN><en>Internal file content.</en></lang>
 * @returns {string[]} <lang><zh-CN>出现顺序不变的 URL。</zh-CN><en>URLs in original occurrence order.</en></lang>
 */
function extractAbsoluteUrls(text) {
  // <lang><zh-CN>匹配在引号、空白、标签、括号或反斜杠前结束；随后仅清理不属于 URL 的尾随标点。</zh-CN><en>Match until a quote, whitespace, tag, parenthesis, or backslash and then strip only trailing punctuation that cannot belong to the intended literal.</en></lang>
  const urlPattern = /https?:\/\/[^\s"'`<>()\\]+/giu;

  // <lang><zh-CN>不解码或请求 URL，避免扫描产生网络或解释副作用。</zh-CN><en>Neither decode nor request URLs, avoiding network or interpretation side effects during scanning.</en></lang>
  return [...text.matchAll(urlPattern)].map((urlMatch) => (urlMatch[0] ?? '').replace(/[.,;:!?]+$/u, ''));
}

/**
 * <lang><zh-CN>判断固定 W3C SVG namespace 是否只作为独立 `.svg` 根元素的精确 `xmlns` 出现一次。</zh-CN><en>Determines whether the fixed W3C SVG namespace appears exactly once and only as the root element's exact `xmlns` in a standalone `.svg` file.</en></lang>
 * @param {string} absoluteUrl <lang><zh-CN>规范化绝对 URL。</zh-CN><en>Normalized absolute URL.</en></lang>
 * @param {{ extension: string, text: string }} artifactRecord <lang><zh-CN>承载 URL 的成品记录。</zh-CN><en>Artifact record carrying the URL.</en></lang>
 * @returns {boolean} <lang><zh-CN>仅精确 namespace 声明为 true。</zh-CN><en>True only for the exact namespace declaration.</en></lang>
 * @lang zh-CN 同一 URI 出现在 `href`、`src`、普通文本、HTML 或 CSS 时仍是未知外链，不能借标准域名形成资源白名单。
 * @lang en The same URI remains an unknown external link in `href`, `src`, plain text, HTML, or CSS; the standards domain never becomes a resource allowlist.
 */
function isReviewedSvgRootNamespace(absoluteUrl, artifactRecord) {
  // <lang><zh-CN>目前成品只需要 SVG 1.1 的默认 namespace，不预先放行 xlink 或其他 W3C URI。</zh-CN><en>The current artifact needs only the default SVG 1.1 namespace and does not pre-allow xlink or another W3C URI.</en></lang>
  const svgNamespace = 'http://www.w3.org/2000/svg';
  if (artifactRecord.extension !== '.svg' || absoluteUrl !== svgNamespace) return false;

  // <lang><zh-CN>全文只能有这一个字面值，防止根声明同时掩护 href、注释或普通文本里的第二次出现。</zh-CN><en>The literal may occur only once in the file so a root declaration cannot also shield a second occurrence in href, a comment, or plain text.</en></lang>
  if (countLiteralOccurrences(artifactRecord.text, svgNamespace) !== 1) return false;

  // <lang><zh-CN>只有根 `<svg>` start tag 的精确 xmlns 属性构成非资源语义。</zh-CN><en>Only the exact xmlns attribute on the root `<svg>` start tag has non-resource semantics.</en></lang>
  return /<svg\b[^>]*\bxmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["'][^>]*>/iu.test(artifactRecord.text);
}

/**
 * <lang><zh-CN>判断 Vue production error URL 是否保持固定 prefix、单 identifier 插值、局部变量绑定和错误报告上下文。</zh-CN><en>Determines whether a Vue production-error URL retains the fixed prefix, one identifier interpolation, a local-variable binding, and an error-reporting context.</en></lang>
 * @param {string} absoluteUrl <lang><zh-CN>从 JS template literal 提取的完整 URL 字面形状。</zh-CN><en>Complete URL-literal shape extracted from a JavaScript template literal.</en></lang>
 * @param {string} javaScriptText <lang><zh-CN>单一构建 JS 正文。</zh-CN><en>One built JavaScript body.</en></lang>
 * @returns {boolean} <lang><zh-CN>仅已锁定诊断结构为 true。</zh-CN><en>True only for the pinned diagnostic shape.</en></lang>
 */
function isReviewedVueErrorReference(absoluteUrl, javaScriptText) {
  // <lang><zh-CN>静态 suffix、表达式、属性访问和多个插值均不属于锁定 Vue 诊断形状。</zh-CN><en>A static suffix, expression, property access, or multiple interpolations do not belong to the pinned Vue diagnostic shape.</en></lang>
  if (!/^https:\/\/vuejs\.org\/error-reference\/#runtime-\$\{[A-Za-z_$][\w$]*\}$/u.test(absoluteUrl)) return false;

  // <lang><zh-CN>URL 中只含固定 ASCII 与已验证 identifier，可转义后匹配其原始反引号绑定。</zh-CN><en>The URL contains only fixed ASCII plus a validated identifier and can be escaped to match its original backtick binding.</en></lang>
  const escapedUrl = absoluteUrl.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

  // <lang><zh-CN>兼容未压缩 `const name=` 与压缩后的同一声明中 `,name=`，但拒绝直接作为函数参数或 DOM 属性值。</zh-CN><en>Accept unminified `const name=` and minified `,name=` in the same declaration while rejecting direct function arguments or DOM-property values.</en></lang>
  const bindingPattern = new RegExp('(?:\\b(?:const|let|var)\\s+|,)\\s*([A-Za-z_$][\\w$]*)\\s*=\\s*`' + escapedUrl + '`', 'u');
  const bindingMatch = bindingPattern.exec(javaScriptText);
  if (!bindingMatch || bindingMatch.index === undefined) return false;

  // <lang><zh-CN>有限邻域必须出现 Vue 错误处理或 console error 语义；这排除把同一文档 URL 当作 fetch/resource 的任意项目代码。</zh-CN><en>A finite neighborhood must contain Vue error-handler or console-error semantics, excluding arbitrary project code that treats the same documentation URL as a fetch/resource.</en></lang>
  const diagnosticContextStart = Math.max(0, bindingMatch.index - 300);
  const diagnosticContextEnd = Math.min(javaScriptText.length, bindingMatch.index + bindingMatch[0].length + 700);
  const diagnosticContext = javaScriptText.slice(diagnosticContextStart, diagnosticContextEnd);
  return /(?:errorHandler|console\.error)\b/u.test(diagnosticContext);
}

/**
 * <lang><zh-CN>判断绝对 URL 是否只是已审阅的 JS/runtime identifier 或独立 SVG namespace，而不是网络资源。</zh-CN><en>Determines whether an absolute URL is only a reviewed JavaScript/runtime identifier or standalone SVG namespace rather than a network resource.</en></lang>
 * @param {string} absoluteUrl <lang><zh-CN>规范化绝对 URL。</zh-CN><en>Normalized absolute URL.</en></lang>
 * @param {{ extension: string, text: string }} artifactRecord <lang><zh-CN>承载 URL 的成品记录。</zh-CN><en>Artifact record carrying the URL.</en></lang>
 * @returns {boolean} <lang><zh-CN>仅有限非资源语义为 true。</zh-CN><en>True only for finite non-resource semantics.</en></lang>
 */
function isInertRuntimeIdentifier(absoluteUrl, artifactRecord) {
  // <lang><zh-CN>独立 SVG 使用专用根 namespace 结构判断，不能共享 JS identifier 规则。</zh-CN><en>Standalone SVG uses its dedicated root-namespace shape and cannot share JavaScript identifier rules.</en></lang>
  if (isReviewedSvgRootNamespace(absoluteUrl, artifactRecord)) return true;

  // <lang><zh-CN>HTML、CSS 或其他文件不得借 runtime 标识清单放行外链。</zh-CN><en>HTML, CSS, and other files cannot use the runtime-identifier list to allow external links.</en></lang>
  if (artifactRecord.extension !== '.js' && artifactRecord.extension !== '.mjs') return false;

  // <lang><zh-CN>精确 W3C 清单成员可作为 compiler/runtime namespace 字面值保留。</zh-CN><en>Exact W3C list members may remain as compiler/runtime namespace literals.</en></lang>
  if (inertIdentifierUrls.has(absoluteUrl)) return true;

  // <lang><zh-CN>Vue 文档 URL 还必须通过 template binding 与诊断上下文结构。</zh-CN><en>The Vue documentation URL must additionally pass the template-binding and diagnostic-context shape.</en></lang>
  return isReviewedVueErrorReference(absoluteUrl, artifactRecord.text);
}

/**
 * <lang><zh-CN>抽取 HTML/SVG 的 URL 承载属性与 `srcset` 项。</zh-CN><en>Extracts URL-bearing HTML/SVG attributes and `srcset` entries.</en></lang>
 * @param {string} markupText <lang><zh-CN>构建后的 markup。</zh-CN><en>Built markup.</en></lang>
 * @returns {Array<{ attribute: string, value: string }>} <lang><zh-CN>有限属性引用。</zh-CN><en>Finite attribute references.</en></lang>
 */
function extractMarkupReferences(markupText) {
  // <lang><zh-CN>普通资源属性支持 compiler 输出的双引号、单引号与无引号形式。</zh-CN><en>Normal resource attributes support compiler-emitted double-quoted, single-quoted, and unquoted forms.</en></lang>
  const attributePattern = /\b(src|href|poster|action|formaction)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/giu;

  // <lang><zh-CN>累计引用时保留属性名，供 index base canary 区分真实资源入口。</zh-CN><en>Retain attribute names while collecting references so the index-base canary can distinguish real resource entries.</en></lang>
  const references = [];

  // <lang><zh-CN>逐项选择唯一被匹配的值分支，不解析脚本或 DOM。</zh-CN><en>Select the sole matched value branch for each item without parsing scripts or a DOM.</en></lang>
  for (const attributeMatch of markupText.matchAll(attributePattern)) {
    const attribute = (attributeMatch[1] ?? '').toLowerCase();
    const value = attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? '';
    references.push({ attribute, value });
  }

  // <lang><zh-CN>`srcset` 另行拆分候选的首个 URL token；当前 artifact 不接受含逗号的远程候选。</zh-CN><en>Handle `srcset` separately by taking each candidate's first URL token; the current artifact accepts no comma-bearing remote candidate.</en></lang>
  const srcsetPattern = /\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/giu;
  for (const srcsetMatch of markupText.matchAll(srcsetPattern)) {
    const srcsetValue = srcsetMatch[1] ?? srcsetMatch[2] ?? srcsetMatch[3] ?? '';

    // <lang><zh-CN>data image 自身含逗号，作为一个内联候选保留；普通 srcset 再按逗号分项。</zh-CN><en>A data image contains its own comma and remains one inline candidate; ordinary srcset values are split by comma.</en></lang>
    const candidates = srcsetValue.trim().toLowerCase().startsWith('data:image/')
      ? [srcsetValue]
      : srcsetValue.split(',');

    // <lang><zh-CN>descriptor（如 `2x`）不属于 URL，只保留每项第一个非空 token。</zh-CN><en>Descriptors such as `2x` are not URLs, so retain only the first nonempty token in each candidate.</en></lang>
    for (const candidate of candidates) {
      const value = candidate.trim().split(/\s+/u)[0] ?? '';
      references.push({ attribute: 'srcset', value });
    }
  }

  // <lang><zh-CN>返回出现顺序，便于稳定错误定位。</zh-CN><en>Return occurrence order for stable error localization.</en></lang>
  return references;
}

/**
 * <lang><zh-CN>抽取 CSS `url()` 与字符串形式 `@import` 的资源引用。</zh-CN><en>Extracts resource references from CSS `url()` and string-form `@import`.</en></lang>
 * @param {string} cssText <lang><zh-CN>构建后的 CSS。</zh-CN><en>Built CSS.</en></lang>
 * @returns {string[]} <lang><zh-CN>出现顺序不变的资源值。</zh-CN><en>Resource values in occurrence order.</en></lang>
 */
function extractCssReferences(cssText) {
  // <lang><zh-CN>compiler 输出的 url 可带双引号、单引号或不带引号。</zh-CN><en>Compiler-emitted URLs may be double-quoted, single-quoted, or unquoted.</en></lang>
  const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s][^)'"]*))\s*\)/giu;

  // <lang><zh-CN>先收集所有 url()，不会解码 data URI 或执行 CSS。</zh-CN><en>Collect every `url()` first without decoding data URIs or executing CSS.</en></lang>
  const references = [...cssText.matchAll(urlPattern)].map((urlMatch) => urlMatch[1] ?? urlMatch[2] ?? urlMatch[3] ?? '');

  // <lang><zh-CN>字符串 `@import` 未经过 url()，必须独立纳入同源约束。</zh-CN><en>String-form `@import` does not pass through `url()` and must independently enter the same-origin constraint.</en></lang>
  const importPattern = /@import\s+(?:"([^"]+)"|'([^']+)')/giu;
  for (const importMatch of cssText.matchAll(importPattern)) {
    references.push(importMatch[1] ?? importMatch[2] ?? '');
  }

  // <lang><zh-CN>返回有限静态引用列表。</zh-CN><en>Return the finite static-reference list.</en></lang>
  return references;
}

/**
 * <lang><zh-CN>验证一个声明式资源引用只能是内联图片、安全相对路径或精确 Pages 项目子路径。</zh-CN><en>Verifies that one declarative resource reference is only an inline image, safe relative path, or the exact Pages project subpath.</en></lang>
 * @param {string} rawReference <lang><zh-CN>HTML/CSS 中的原始引用值。</zh-CN><en>Raw HTML/CSS reference value.</en></lang>
 * @param {string} relativePath <lang><zh-CN>承载引用的成品相对路径。</zh-CN><en>Artifact-relative path containing the reference.</en></lang>
 * @param {boolean} allowDormantDcloudShadow <lang><zh-CN>同一 CSS 是否已形成后置关闭证据。</zh-CN><en>Whether the same CSS has proved a later suppression.</en></lang>
 * @returns {void} <lang><zh-CN>引用合格时返回。</zh-CN><en>Returns when the reference is eligible.</en></lang>
 */
function validateResourceReference(rawReference, relativePath, allowDormantDcloudShadow = false) {
  // <lang><zh-CN>trim 仅用于语法边界，不改变 URL 编码或路径语义。</zh-CN><en>Trim only syntax boundaries without changing URL encoding or path semantics.</en></lang>
  const reference = rawReference.trim();

  // <lang><zh-CN>空资源值会触发当前页面或产生不确定行为，不能作为明确静态依赖。</zh-CN><en>An empty resource value can target the current page or produce ambiguous behavior and is not an explicit static dependency.</en></lang>
  if (reference === '') failArtifact(`empty resource reference is present in ${relativePath}`);

  // <lang><zh-CN>同页 fragment 与 query 不会建立新的网络 origin。</zh-CN><en>Same-document fragments and queries establish no new network origin.</en></lang>
  if (reference.startsWith('#') || reference.startsWith('?')) return;

  // <lang><zh-CN>仅允许内联图片；data font、HTML、script 或任意二进制不在当前交付边界。</zh-CN><en>Allow only inline images; data fonts, HTML, scripts, and arbitrary binaries are outside the current delivery boundary.</en></lang>
  if (reference.toLowerCase().startsWith('data:image/')) return;

  // <lang><zh-CN>唯一 DCloud CSS URL 必须由调用方证明同文件后置关闭。</zh-CN><en>The sole DCloud CSS URL requires the caller to prove a later same-file suppression.</en></lang>
  if (reference === DCLOUD_SHADOW_URL) {
    if (allowDormantDcloudShadow) return;
    failArtifact(`DCloud shadow preload lacks the required suppression in ${relativePath}`);
  }

  // <lang><zh-CN>任何其他 protocol-relative 或带 scheme 资源都不是同源项目子路径。</zh-CN><en>Any other protocol-relative or scheme-bearing resource is not a same-origin project subpath.</en></lang>
  if (reference.startsWith('//') || /^[a-z][a-z0-9+.-]*:/iu.test(reference)) {
    failArtifact(`external resource reference is present in ${relativePath}`);
  }

  // <lang><zh-CN>浏览器路径不能包含 Windows 分隔符；这也阻断编码前的本机路径。</zh-CN><en>A browser path cannot contain Windows separators; this also blocks an unencoded local-machine path.</en></lang>
  if (reference.includes('\\')) failArtifact(`unsafe resource path is present in ${relativePath}`);

  // <lang><zh-CN>查询与 fragment 不参与路径 containment 判断。</zh-CN><en>Queries and fragments do not participate in path-containment checks.</en></lang>
  const rawPath = reference.split(/[?#]/u, 1)[0] ?? '';

  // <lang><zh-CN>非法 percent encoding 不是可审计静态路径。</zh-CN><en>Invalid percent encoding is not an auditable static path.</en></lang>
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    failArtifact(`invalid encoded resource path is present in ${relativePath}`);
  }

  // <lang><zh-CN>编码前后都拒绝 traversal 段，防止 `%2e%2e` 绕过项目子路径。</zh-CN><en>Reject traversal segments before and after decoding so `%2e%2e` cannot bypass the project subpath.</en></lang>
  const rawSegments = rawPath.split('/');
  const decodedSegments = decodedPath.split('/');
  if (rawSegments.includes('..') || decodedSegments.includes('..')) {
    failArtifact(`traversing resource path is present in ${relativePath}`);
  }

  // <lang><zh-CN>根相对资源必须精确进入项目 base；普通相对资源则自然解析在当前项目 origin/base 内。</zh-CN><en>A root-relative resource must enter the exact project base; an ordinary relative resource naturally resolves inside the current project origin/base.</en></lang>
  if (reference.startsWith('/') && !reference.startsWith(PROJECT_BASE)) {
    failArtifact(`resource is outside the exact project base in ${relativePath}`);
  }
}

/**
 * <lang><zh-CN>验证单文件不含 source-map 注释、机器路径、内部 WorkZone、凭据、遥测、字体注入或未知绝对外链。</zh-CN><en>Verifies that one file contains no source-map comment, machine path, internal WorkZone, credential, telemetry, font injection, or unknown absolute external URL.</en></lang>
 * @param {{ relativePath: string, extension: string, text: string }} artifactRecord <lang><zh-CN>内部成品记录。</zh-CN><en>Internal artifact record.</en></lang>
 * @param {Set<string>} reviewedFontCssPaths <lang><zh-CN>已经过逐 face/WOFF 绑定的 CSS 相对路径。</zh-CN><en>CSS relative paths already bound face by face to WOFF bytes.</en></lang>
 * @returns {number} <lang><zh-CN>本文件已审计的声明式资源引用数量。</zh-CN><en>Number of declarative resource references audited in this file.</en></lang>
 */
function validateArtifactRecord(artifactRecord, reviewedFontCssPaths) {
  // <lang><zh-CN>sourceMappingURL 即使未附带 `.map` 文件也会暴露或请求调试映射。</zh-CN><en>A sourceMappingURL can disclose or request debug mappings even without an accompanying `.map` file.</en></lang>
  if (/sourceMappingURL\s*=/iu.test(artifactRecord.text)) {
    failArtifact(`source-map reference is present in ${artifactRecord.relativePath}`);
  }

  // <lang><zh-CN>驱动器根、file URI、UNC 与用户 home 路径均属于本机构建信息。</zh-CN><en>Drive roots, file URIs, UNC paths, and user-home paths are all local build information.</en></lang>
  const hasWindowsDrivePath = /(?:^|[\s"'(=])(?:[A-Za-z]:[\\/]|file:\/\/\/[A-Za-z]:\/)/mu.test(artifactRecord.text);
  const hasUncPath = /(?:^|[\s"'(=])\\\\[A-Za-z0-9._-]+[\\/]/mu.test(artifactRecord.text);
  const hasPosixUserPath = /(?:^|[\s"'(=])\/(?:home|Users)\/[A-Za-z0-9._-]+\//mu.test(artifactRecord.text);
  if (hasWindowsDrivePath || hasUncPath || hasPosixUserPath) {
    failArtifact(`absolute machine path is present in ${artifactRecord.relativePath}`);
  }

  // <lang><zh-CN>内部协作区名称不属于公开代码或构建成品。</zh-CN><en>The internal collaboration-zone name belongs in neither public code nor build artifacts.</en></lang>
  if (/work[-_ ]?zone/iu.test(artifactRecord.text)) {
    failArtifact(`internal collaboration marker is present in ${artifactRecord.relativePath}`);
  }

  // <lang><zh-CN>逐项检查高置信度 secret，错误只暴露类别与相对路径。</zh-CN><en>Check each high-confidence secret and expose only its category plus relative path in the error.</en></lang>
  for (const secretPattern of forbiddenSecretPatterns) {
    if (secretPattern.pattern.test(artifactRecord.text)) {
      failArtifact(`${secretPattern.label} marker is present in ${artifactRecord.relativePath}`);
    }
  }

  // <lang><zh-CN>已知统计初始化或 collector 字面值无条件失败，不允许以 dormant 外链例外绕过。</zh-CN><en>Known telemetry initializers or collector literals fail unconditionally and cannot use the dormant-link exception.</en></lang>
  for (const telemetryMarker of forbiddenTelemetryMarkers) {
    if (artifactRecord.text.includes(telemetryMarker.value)) {
      failArtifact(`${telemetryMarker.label} is present in ${artifactRecord.relativePath}`);
    }
  }

  // <lang><zh-CN>法律文本可陈述许可证 URL、排除项与 dormant capability，但不会由浏览器作为 runtime 代码执行；它仍已完成机器路径、内部 marker、secret 与遥测扫描。</zh-CN><en>Legal text may describe license URLs, exclusions, and dormant capabilities but is not executed by the browser as runtime code; it has still completed machine-path, internal-marker, secret, and telemetry scans.</en></lang>
  const allowsInformationalCitations = informationalCitationFiles.has(artifactRecord.relativePath);

  // <lang><zh-CN>只有已逐字节绑定的 CSS 可静态声明三条 face；JS 仍只允许锁定 UniApp 的唯一 dormant capability 结构。</zh-CN><en>Only byte-bound CSS may statically declare the three faces; JavaScript still permits only the sole pinned UniApp dormant-capability shape.</en></lang>
  const containsFontFace = /@font-face\b/iu.test(artifactRecord.text);
  if (!allowsInformationalCitations && containsFontFace) {
    // <lang><zh-CN>预审 CSS 路径由同一次 artifact 字节记录生成，不接受调用方输入。</zh-CN><en>The pre-reviewed CSS paths come from the same artifact byte records and accept no caller input.</en></lang>
    const isReviewedStaticFontCss = artifactRecord.extension === '.css' && reviewedFontCssPaths.has(artifactRecord.relativePath);

    const isJavaScript = artifactRecord.extension === '.js' || artifactRecord.extension === '.mjs';
    if (!isReviewedStaticFontCss && (!isJavaScript || !isReviewedDormantLoadFontFaceCapability(artifactRecord.text))) {
      failArtifact(`font-face rule is present outside the reviewed dormant capability in ${artifactRecord.relativePath}`);
    }
  }

  // <lang><zh-CN>除已经完成三 face/WOFF 全绑定的 CSS 外，runtime 文本中的静态 font 路径、data font 或远程字体服务仍无条件失败。</zh-CN><en>Except for CSS that completed the three-face/WOFF binding, any static font path, data font, or remote font service in runtime text still fails unconditionally.</en></lang>
  const isReviewedFontCss = artifactRecord.extension === '.css' && reviewedFontCssPaths.has(artifactRecord.relativePath);
  if (!allowsInformationalCitations && !isReviewedFontCss && runtimeTextExtensions.has(artifactRecord.extension) && staticFontReferencePattern.test(artifactRecord.text)) {
    failArtifact(`static font resource is present in ${artifactRecord.relativePath}`);
  }

  // <lang><zh-CN>CSS 的 framework shadow URL 只能在同文件存在明确后置关闭时保留。</zh-CN><en>The framework shadow URL may remain in CSS only with an explicit later same-file suppression.</en></lang>
  const allowsDcloudShadow = artifactRecord.extension === '.css' && hasDcloudShadowSuppression(artifactRecord.text);

  // <lang><zh-CN>任一 dormant ad marker 出现时，承载文件必须是完整、零 invocation 的锁定 JS manager surface。</zh-CN><en>When any dormant-ad marker occurs, the containing file must be the complete pinned JavaScript manager surface with zero invocation.</en></lang>
  const containsDcloudAdManagerMarker = dcloudAdManagerMarkers.some((marker) => artifactRecord.text.includes(marker));
  const allowsDcloudAdManager = artifactRecord.extension === '.js'
    && containsDcloudAdManagerMarker
    && isReviewedDormantDcloudAdManager(artifactRecord.text);
  if (!allowsInformationalCitations && containsDcloudAdManagerMarker && !allowsDcloudAdManager) {
    failArtifact(`DCloud dormant ad manager shape is invalid in ${artifactRecord.relativePath}`);
  }

  // <lang><zh-CN>法律文本中的上游 citation 不会由浏览器自动取回；其他文件的绝对 URL 必须属于受控 CSS 例外或有限 JS 非资源 identifier。</zh-CN><en>Upstream citations in legal texts are not fetched automatically by the browser; absolute URLs in other files must belong to the controlled CSS exception or finite JS non-resource identifiers.</en></lang>
  if (!allowsInformationalCitations) {
    for (const absoluteUrl of extractAbsoluteUrls(artifactRecord.text)) {
      // <lang><zh-CN>DCloud shadow URL 使用专用错误，明确区分可补齐的后置关闭与未知外链。</zh-CN><en>The DCloud shadow URL uses a dedicated error that distinguishes a missing later suppression from an unknown external URL.</en></lang>
      if (absoluteUrl === DCLOUD_SHADOW_URL) {
        if (allowsDcloudShadow) continue;
        failArtifact(`DCloud shadow preload lacks the required suppression in ${artifactRecord.relativePath}`);
      }

      // <lang><zh-CN>两个 ad endpoint 只有在同一 JS 已通过完整惰性 manager 与零 invocation 检查时放行。</zh-CN><en>Allow the two ad endpoints only after the same JavaScript has passed the complete lazy-manager and zero-invocation checks.</en></lang>
      if (absoluteUrl === DCLOUD_AD_CONFIG_URL || absoluteUrl === DCLOUD_AD_GUID_URL) {
        if (allowsDcloudAdManager) continue;
        failArtifact(`DCloud dormant ad endpoint lacks the reviewed manager shape in ${artifactRecord.relativePath}`);
      }

      // <lang><zh-CN>有限 JS namespace/diagnostic identifier 不声明或触发资源请求。</zh-CN><en>Finite JavaScript namespace/diagnostic identifiers neither declare nor trigger resource requests.</en></lang>
      if (isInertRuntimeIdentifier(absoluteUrl, artifactRecord)) continue;

      // <lang><zh-CN>其余绝对 URL 均未进入同源项目资源或受控 dormant 清单。</zh-CN><en>Every remaining absolute URL belongs to neither same-origin project resources nor the controlled dormant list.</en></lang>
      failArtifact(`unknown external URL is present in ${artifactRecord.relativePath}`);
    }
  }

  // <lang><zh-CN>按扩展名只解析真实声明式资源 surface，避免把 JS 路由字符串误判为文件请求。</zh-CN><en>Parse only real declarative resource surfaces by extension so JavaScript route strings are not mistaken for file requests.</en></lang>
  let resourceReferences = [];
  if (htmlExtensions.has(artifactRecord.extension)) {
    resourceReferences = extractMarkupReferences(artifactRecord.text).map((reference) => reference.value);
  } else if (artifactRecord.extension === '.css') {
    resourceReferences = extractCssReferences(artifactRecord.text);
  }

  // <lang><zh-CN>逐项应用同源/base 与 dormant DCloud 例外规则。</zh-CN><en>Apply same-origin/base and dormant-DCloud exception rules to each item.</en></lang>
  for (const resourceReference of resourceReferences) {
    validateResourceReference(resourceReference, artifactRecord.relativePath, allowsDcloudShadow);
  }

  // <lang><zh-CN>返回有限计数供无敏感信息的成功摘要使用。</zh-CN><en>Return the finite count for a success summary containing no sensitive information.</en></lang>
  return resourceReferences.length;
}

/**
 * <lang><zh-CN>验证顶层 `index.html` 的项目 base、唯一精确 favicon 声明及其普通目标资产。</zh-CN><en>Verifies the top-level `index.html` project base, sole exact favicon declaration, and its regular target asset.</en></lang>
 * @param {{ relativePath: string, extension: string, text: string }} indexRecord <lang><zh-CN>顶层入口记录。</zh-CN><en>Top-level entry record.</en></lang>
 * @param {Array<{ relativePath: string, extension: string, text: string }>} artifactRecords <lang><zh-CN>已完成普通文件与内容门禁的稳定成品记录。</zh-CN><en>Stable artifact records that have passed regular-file and content gates.</en></lang>
 * @returns {void} <lang><zh-CN>入口、base 与 favicon 合格时返回。</zh-CN><en>Returns when the entry, base, and favicon are eligible.</en></lang>
 */
function validateTopLevelIndex(indexRecord, artifactRecords) {
  // <lang><zh-CN>若 compiler 输出 `<base>`，只能有一个且必须精确使用项目子路径。</zh-CN><en>If the compiler emits a `<base>`, there may be only one and it must use the exact project subpath.</en></lang>
  const baseTagPattern = /<base\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))[^>]*>/giu;
  const baseHrefs = [...indexRecord.text.matchAll(baseTagPattern)].map((baseMatch) => baseMatch[1] ?? baseMatch[2] ?? baseMatch[3] ?? '');
  if (baseHrefs.length > 1 || baseHrefs.some((baseHref) => baseHref !== PROJECT_BASE)) {
    failArtifact('top-level index.html declares an incorrect static base');
  }

  // <lang><zh-CN>启动引用从真实 URL 属性取得，不接受正文中无效地出现 base 字符串。</zh-CN><en>Bootstrap references come from real URL attributes rather than an inert occurrence of the base string in body text.</en></lang>
  const indexReferences = extractMarkupReferences(indexRecord.text);

  // <lang><zh-CN>所有入口引用已在通用内容扫描中验证；此处只确认至少一个 script/style/image 启动资源使用精确 base。</zh-CN><en>All entry references are validated by the general content scan; here require at least one script/style/image bootstrap resource to use the exact base.</en></lang>
  const hasProjectBaseResource = indexReferences.some((reference) => {
    const isBootstrapAttribute = reference.attribute === 'src' || reference.attribute === 'href';
    return isBootstrapAttribute && reference.value.startsWith(PROJECT_BASE);
  });
  if (!hasProjectBaseResource) failArtifact('top-level index.html does not use the exact project base');

  // <lang><zh-CN>先枚举所有声明 `icon` rel token 的 link，避免另一个 shortcut/mask icon 与精确声明并存。</zh-CN><en>First enumerate every link declaring an `icon` rel token so another shortcut or mask icon cannot coexist with the exact declaration.</en></lang>
  const linkTags = [...indexRecord.text.matchAll(/<link\b[^>]*>/giu)].map((linkMatch) => linkMatch[0] ?? '');
  const faviconLinkTags = linkTags.filter((linkTag) => /\srel\s*=\s*(?:"[^"]*\bicon\b[^"]*"|'[^']*\bicon\b[^']*'|[^\s"'=<>`]*\bicon\b[^\s"'=<>`]*)/iu.test(linkTag));

  // <lang><zh-CN>精确 tag 必须且只能出现一次，并且不能同时存在属性顺序、MIME、href 或 rel 不同的第二 favicon。</zh-CN><en>The exact tag must occur once and only once, with no second favicon differing in attribute order, MIME, href, or rel.</en></lang>
  const exactFaviconCount = countLiteralOccurrences(indexRecord.text, PROJECT_FAVICON_TAG);
  if (exactFaviconCount !== 1 || faviconLinkTags.length !== 1 || faviconLinkTags[0] !== PROJECT_FAVICON_TAG) {
    failArtifact('top-level index.html must declare the sole exact project favicon');
  }

  // <lang><zh-CN>href 对应的精确相对目标必须随 artifact 分发；目录遍历已证明命中项是 nlink=1 的普通文件。</zh-CN><en>The exact relative target corresponding to the href must ship with the artifact; directory traversal has already proved that a match is a regular file with nlink one.</en></lang>
  const faviconRecord = artifactRecords.find((artifactRecord) => artifactRecord.relativePath === PROJECT_FAVICON_ARTIFACT_PATH);
  if (!faviconRecord) failArtifact('the exact project favicon target is missing');

  // <lang><zh-CN>空 SVG 占位不能作为可显示 favicon，目标还必须保留实际 markup。</zh-CN><en>An empty SVG placeholder cannot serve as a visible favicon; the target must retain actual markup.</en></lang>
  if (faviconRecord.extension !== '.svg' || faviconRecord.text.trim() === '') {
    failArtifact('the exact project favicon target is invalid');
  }
}

/**
 * <lang><zh-CN>验证一个 H5 Pages 成品根并返回无路径、无正文的确定性摘要。</zh-CN><en>Verifies one H5 Pages artifact root and returns a deterministic summary containing no paths or content.</en></lang>
 * @param {string} artifactRoot <lang><zh-CN>直接入口的固定输出根或测试创建的隔离 fixture 根。</zh-CN><en>The direct entry's fixed output root or an isolated fixture root created by tests.</en></lang>
 * @returns {Promise<Readonly<{ base: string, dormantAdManagerCount: number, dormantFontCapabilityCount: number, fileCount: number, fontAssetByteCount: number, fontAssetCount: number, fontFaceCount: number, fontFaces: ReadonlyArray<Readonly<{ id: string, byteLength: number, sha256: string }>>, resourceReferenceCount: number }>>} <lang><zh-CN>含固定字体 ID/摘要但不含路径或正文的可审计有限统计。</zh-CN><en>Auditable finite statistics containing pinned font IDs/digests but no paths or content.</en></lang>
 * @lang zh-CN 调用方路径只决定测试或固定构建根，不会进入错误、成功摘要或 artifact。
 * @lang en The caller path selects only the fixture or fixed build root and enters neither errors, the success summary, nor the artifact.
 */
export async function verifyH5PagesArtifact(artifactRoot) {
  // <lang><zh-CN>拒绝非字符串或空路径，避免 Node 隐式类型转换扩大文件系统范围。</zh-CN><en>Reject non-string or empty paths so Node coercion cannot widen the file-system scope.</en></lang>
  if (typeof artifactRoot !== 'string' || artifactRoot.trim() === '') failArtifact('artifact root input is invalid');

  // <lang><zh-CN>解析只用于文件系统读取；绝对值不进入任何输出。</zh-CN><en>Resolve only for file-system reads; the absolute value enters no output.</en></lang>
  const resolvedArtifactRoot = resolve(artifactRoot);

  // <lang><zh-CN>先完成文件系统类型与路径门禁，再读取任何文件正文。</zh-CN><en>Complete file-system type and path gates before reading any file content.</en></lang>
  const artifactFiles = await collectArtifactFiles(resolvedArtifactRoot);

  // <lang><zh-CN>空 artifact 不能通过入口或 base 检查，提前给出稳定事实。</zh-CN><en>An empty artifact cannot satisfy entry or base checks, so report the stable fact early.</en></lang>
  if (artifactFiles.length === 0) failArtifact('the fixed output root contains no files');

  // <lang><zh-CN>按稳定文件顺序建立内部内容记录。</zh-CN><en>Build internal content records in stable file order.</en></lang>
  const artifactRecords = [];
  for (const artifactFile of artifactFiles) {
    artifactRecords.push(await readArtifactRecord(artifactFile));
  }

  // <lang><zh-CN>在通用 runtime 扫描前，把唯一三份 WOFF、三条 CSS 声明及 locator 完整绑定。</zh-CN><en>Before the general runtime scan, fully bind the sole three WOFF files, three CSS declarations, and their locators.</en></lang>
  const artifactFontSummary = verifyReviewedArtifactFonts(artifactRecords);

  // <lang><zh-CN>逐项取得精确顶层入口与 NOTICE；嵌套或大小写变体均不能替代。</zh-CN><en>Obtain the exact top-level entry and NOTICE one by one; nested or case-variant files cannot substitute for them.</en></lang>
  const requiredRecordByPath = new Map();
  for (const requiredPath of requiredArtifactTextFiles) {
    // <lang><zh-CN>文件描述已证明目标是 link count 为 1 的普通文件，此处再绑定精确顶层路径。</zh-CN><en>File descriptors already prove that the target is a regular file with link count one; bind the exact top-level path here.</en></lang>
    const requiredRecord = artifactRecords.find((artifactRecord) => artifactRecord.relativePath === requiredPath);
    if (!requiredRecord) failArtifact(`top-level ${requiredPath} is missing`);

    // <lang><zh-CN>空白许可证或 NOTICE 不能形成可读分发声明，入口也不能是空白占位。</zh-CN><en>A blank license or NOTICE cannot form a readable distribution notice, and the entry cannot be a blank placeholder.</en></lang>
    if (requiredRecord.text.trim() === '') failArtifact(`top-level ${requiredPath} is empty`);

    // <lang><zh-CN>Map 只在本次调用内连接精确路径与已扫描记录。</zh-CN><en>The Map links exact paths to scanned records only within this invocation.</en></lang>
    requiredRecordByPath.set(requiredPath, requiredRecord);
  }

  // <lang><zh-CN>自引用 NOTICE 不固定自身 digest，但必须以可读正文列全当前法律载荷路径、固定 digest 与 source/destination 相等承诺。</zh-CN><en>The self-referential NOTICE does not pin its own digest, but its readable content must enumerate every current legal-payload path, pinned digest, and the source/destination equality commitment.</en></lang>
  const noticeRecord = requiredRecordByPath.get('THIRD_PARTY_NOTICES.md');
  if (!noticeRecord) failArtifact('top-level THIRD_PARTY_NOTICES.md is missing');
  if (topLevelNoticeAnchors.some((anchor) => !noticeRecord.text.includes(anchor))) {
    failArtifact('top-level THIRD_PARTY_NOTICES.md does not describe the complete legal payload');
  }

  // <lang><zh-CN>逐项绑定 prepare 清单的精确目标、canonical digest 与正文事实；这同时证明 `LICENSES` 不是空占位目录。</zh-CN><en>Bind each preparation-ledger entry to its exact destination, canonical digest, and content facts; this also proves that `LICENSES` is not an empty placeholder directory.</en></lang>
  for (const legalPayload of pinnedLegalPayloads) {
    // <lang><zh-CN>文件系统遍历已证明每个命中项为 nlink=1 的普通文件。</zh-CN><en>File-system traversal has already proved every matching item is a regular file with nlink one.</en></lang>
    const legalRecord = artifactRecords.find((artifactRecord) => artifactRecord.relativePath === legalPayload.relativePath);
    if (!legalRecord) failArtifact(`legal payload ${legalPayload.relativePath} is missing`);

    // <lang><zh-CN>空白法律文本即使摘要意外登记也不能形成可阅读分发声明。</zh-CN><en>A whitespace-only legal text cannot form a readable distribution notice even if a digest were accidentally registered.</en></lang>
    if (legalRecord.text.trim() === '') failArtifact(`legal payload ${legalPayload.relativePath} is empty`);

    // <lang><zh-CN>固定 digest 是来源与版本的主证据，路径或标题相同但正文漂移必须失败。</zh-CN><en>The pinned digest is the primary provenance/version evidence; content drift must fail even when path and title remain unchanged.</en></lang>
    if (legalRecord.sha256 !== legalPayload.sha256) {
      failArtifact(`legal payload ${legalPayload.relativePath} does not match its pinned SHA-256`);
    }

    // <lang><zh-CN>正文锚点让清单可由人审阅，并防止未来误把不同许可证的同摘要记录复制到错误目标。</zh-CN><en>Content anchors keep the ledger human-reviewable and prevent a future copy of another license's digest record into the wrong destination.</en></lang>
    if (legalPayload.contentAnchors.some((anchor) => !legalRecord.text.includes(anchor))) {
      failArtifact(`legal payload ${legalPayload.relativePath} does not contain its expected license facts`);
    }

    // <lang><zh-CN>同一 Map 只保存本次 artifact 内的精确记录，便于后续防御性读取。</zh-CN><en>The same Map retains only exact records from this artifact for later defensive reads.</en></lang>
    requiredRecordByPath.set(legalPayload.relativePath, legalRecord);
  }

  // <lang><zh-CN>循环已保证入口存在；显式读取仍保留防御性类型判断。</zh-CN><en>The loop has guaranteed the entry exists; an explicit read still retains a defensive type check.</en></lang>
  const indexRecord = requiredRecordByPath.get('index.html');
  if (!indexRecord) failArtifact('top-level index.html is missing');

  // <lang><zh-CN>整个 artifact 最多保留一个带动态 `@font-face` template 的 JS chunk，防止 framework capability 被复制或项目实现混入另一 chunk。</zh-CN><en>The entire artifact may retain at most one JavaScript chunk with a dynamic `@font-face` template, preventing duplication of the framework capability or a project implementation in another chunk.</en></lang>
  const dormantFontCapabilityRecords = artifactRecords.filter((artifactRecord) => {
    const isJavaScript = artifactRecord.extension === '.js' || artifactRecord.extension === '.mjs';
    const isRuntimeArtifact = !informationalCitationFiles.has(artifactRecord.relativePath);
    return isRuntimeArtifact && isJavaScript && artifactRecord.text.includes('@font-face');
  });
  if (dormantFontCapabilityRecords.length > 1) failArtifact('more than one dormant font capability is present');

  // <lang><zh-CN>四个 ad marker 必须同处至多一个 JS record；跨 chunk 拆分不能借各自局部结构绕过。</zh-CN><en>All four ad markers must coexist in at most one JavaScript record; splitting them across chunks cannot bypass the gate through local shapes.</en></lang>
  const dormantAdManagerRecords = artifactRecords.filter((artifactRecord) => {
    // <lang><zh-CN>顶层 NOTICE 对 endpoint 的法律披露不是 runtime manager；只统计可执行 artifact 文件。</zh-CN><en>The top-level NOTICE's legal disclosure of endpoints is not a runtime manager; count only executable artifact files.</en></lang>
    const isRuntimeArtifact = !informationalCitationFiles.has(artifactRecord.relativePath);
    return isRuntimeArtifact && dcloudAdManagerMarkers.some((marker) => artifactRecord.text.includes(marker));
  });
  if (dormantAdManagerRecords.length > 1) failArtifact('dormant ad manager markers are split across files');

  // <lang><zh-CN>逐文件累加已验证资源引用数，不输出具体 URL 或正文。</zh-CN><en>Accumulate the count of verified resource references without outputting URLs or content.</en></lang>
  let resourceReferenceCount = 0;
  for (const artifactRecord of artifactRecords) {
    resourceReferenceCount += validateArtifactRecord(artifactRecord, artifactFontSummary.fontCssPaths);
  }

  // <lang><zh-CN>通用内容门禁完成后，再以实际属性证明顶层静态 base。</zh-CN><en>After the general content gate, prove the top-level static base from actual attributes.</en></lang>
  validateTopLevelIndex(indexRecord, artifactRecords);

  // <lang><zh-CN>冻结摘要，避免测试或调用方误改验证结果。</zh-CN><en>Freeze the summary so tests or callers cannot mutate the verification result.</en></lang>
  return Object.freeze({
    base: PROJECT_BASE,
    dormantAdManagerCount: dormantAdManagerRecords.length,
    dormantFontCapabilityCount: dormantFontCapabilityRecords.length,
    fileCount: artifactRecords.length,
    fontAssetByteCount: artifactFontSummary.fontAssetByteCount,
    fontAssetCount: artifactFontSummary.fontAssetCount,
    fontFaceCount: artifactFontSummary.fontFaceCount,
    fontFaces: artifactFontSummary.fontFaces,
    resourceReferenceCount
  });
}

/**
 * <lang><zh-CN>判断当前模块是否由 Node 直接执行，而不是被 test runner 导入。</zh-CN><en>Determines whether Node executed this module directly rather than importing it from the test runner.</en></lang>
 * @returns {boolean} <lang><zh-CN>仅直接入口为 true。</zh-CN><en>True only for the direct entry.</en></lang>
 */
function isDirectExecution() {
  // <lang><zh-CN>没有 argv 脚本项时不是可审计的直接入口。</zh-CN><en>Without an argv script item, this is not an auditable direct entry.</en></lang>
  const invokedPath = process.argv[1];
  if (typeof invokedPath !== 'string' || invokedPath === '') return false;

  // <lang><zh-CN>仅比较规范 file URL，不输出或持久化调用路径。</zh-CN><en>Compare only canonical file URLs without outputting or persisting the invoked path.</en></lang>
  return pathToFileURL(resolve(invokedPath)).href === import.meta.url;
}

// <lang><zh-CN>直接执行不接受额外路径或开关，始终验证固定 H5 artifact。</zh-CN><en>Direct execution accepts no additional path or switch and always verifies the fixed H5 artifact.</en></lang>
if (isDirectExecution()) {
  // <lang><zh-CN>额外参数可能把固定门禁误解为通用文件扫描器，因此明确拒绝。</zh-CN><en>Reject extra arguments that could misrepresent the fixed gate as a general file scanner.</en></lang>
  if (process.argv.length !== 2) failArtifact('direct execution accepts no arguments');

  // <lang><zh-CN>先证明 BP 自有 source 未采用字体加载能力，再审计包含 dormant framework capability 的固定成品。</zh-CN><en>First prove that BP-owned source does not adopt font loading, then audit the fixed artifact containing the dormant framework capability.</en></lang>
  await verifyH5FontSourceBoundary(fixedSourceRoot);

  // <lang><zh-CN>第二个顶层 await 只读固定构建根；成功保持静默，失败由 Node 以非零状态报告。</zh-CN><en>The second top-level await reads only the fixed build root; success remains silent and Node reports failure with a nonzero status.</en></lang>
  await verifyH5PagesArtifact(fixedOutputRoot);
}
