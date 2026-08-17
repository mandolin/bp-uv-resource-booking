/**
 * <lang><zh-CN>只读验证 BP 三份确定性 WOFF 子集的 provenance、哈希、格式、主字体名、字重与当前运行时可见文本覆盖。</zh-CN><en>Read-only verification for provenance, digests, format, primary names, weights, and current runtime-visible text coverage of the BP's three deterministic WOFF subsets.</en></lang>
 * @lang zh-CN 脚本只读取固定仓内文件，使用 Node 内建 WOFF/name/cmap 解析，不访问网络、环境秘密、用户目录或字体安装服务。
 * @lang en The script reads only fixed in-repository files and uses built-in Node WOFF/name/cmap parsing; it accesses no network, environment secret, user directory, or font-installation service.
 */

// <lang><zh-CN>使用 Node 内建文件、路径、哈希和 zlib API；字体维护依赖不进入普通验证。</zh-CN><en>Use Node built-in file, path, digest, and zlib APIs; the font maintenance dependency never enters normal verification.</en></lang>
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

// <lang><zh-CN>运行时 locale 资源作为正文 face 的受控可见文本来源，而不是由正则扫描源码注释。</zh-CN><en>Runtime locale resources are the controlled visible-text source for body faces instead of a regex scan over source comments.</en></lang>
import { BP_MESSAGES } from '../src/locales/messages.mjs';

// <lang><zh-CN>脚本 URL 固定解析 BP root，调用者 cwd 不会扩大文件系统边界。</zh-CN><en>The script URL fixes the BP root so the caller's cwd cannot expand the file-system boundary.</en></lang>
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fontAssetRoot = resolve(projectRoot, 'src/assets/fonts');
const corpusRoot = resolve(projectRoot, 'dev/fonts/glyph-corpus');
const manifestPath = resolve(fontAssetRoot, 'font-subsets.manifest.json');
const datasetPath = resolve(projectRoot, 'src/data/venues.json');

/**
 * <lang><zh-CN>锁定三个允许分发的 face 及其项目内身份、语料和包体预算。</zh-CN><en>Locks the three distributable faces and their in-project identities, corpora, and byte budgets.</en></lang>
 * @lang zh-CN 这是 allowlist，不从目录或 manifest 自发现字体；新增 face 必须经过明确审阅。
 * @lang en This is an allowlist and discovers no font from a directory or manifest; any added face requires explicit review.
 */
const expectedFaces = Object.freeze([
  Object.freeze({
    id: 'sans-regular',
    role: 'body',
    family: 'HIA-uView BP Sans SC',
    style: 'Regular',
    weight: 400,
    postscriptName: 'HIAuViewBPSansSC-Regular',
    outputFile: 'hia-uv-bp-sans-sc-regular-v2.005-subset.woff',
    corpusFile: 'sans-runtime.txt',
    maxOutputBytes: 180_000
  }),
  Object.freeze({
    id: 'sans-bold',
    role: 'emphasis',
    family: 'HIA-uView BP Sans SC',
    style: 'Bold',
    weight: 700,
    postscriptName: 'HIAuViewBPSansSC-Bold',
    outputFile: 'hia-uv-bp-sans-sc-bold-v2.005-subset.woff',
    corpusFile: 'sans-runtime.txt',
    maxOutputBytes: 180_000
  }),
  Object.freeze({
    id: 'serif-bold',
    role: 'display',
    family: 'HIA-uView BP Serif SC',
    style: 'Bold',
    weight: 700,
    postscriptName: 'HIAuViewBPSerifSC-Bold',
    outputFile: 'hia-uv-bp-serif-sc-bold-v2.003-subset.woff',
    corpusFile: 'serif-display.txt',
    maxOutputBytes: 200_000
  })
]);

// <lang><zh-CN>主字体名 ID 必须全部改为项目名；版权、许可与商标记录不在禁止集合中。</zh-CN><en>Every primary font-name ID must use the project name; copyright, license, and trademark records are outside the prohibited set.</en></lang>
const primaryNameIds = Object.freeze([1, 2, 3, 4, 6, 16, 17, 21, 22]);

// <lang><zh-CN>展示字体只服务当前明确采用 Serif 的 message key 与动态场馆/资源主标题。</zh-CN><en>The display font serves only message keys and dynamic venue/resource titles that explicitly use Serif today.</en></lang>
const serifMessageKeys = Object.freeze(['app.brand', 'home.title', 'booking.confirmedTitle']);

/**
 * <lang><zh-CN>锁定维护工具的两个可读路径；manifest 只能声明相同值，不能选择验证器读取任意文件。</zh-CN><en>Locks the two readable maintenance-tool paths; the manifest may declare only the same values and cannot choose an arbitrary verifier input.</en></lang>
 * @lang zh-CN 路径均为仓内公开文件，验证器在完成精确比较后仍使用此 allowlist 解析实际位置。
 * @lang en Both paths are public in-repository files, and the verifier still resolves actual locations from this allowlist after exact comparison.
 */
const expectedToolchainPaths = Object.freeze({
  scriptPath: 'scripts/build-font-subsets.py',
  requirementsPath: 'dev/fonts/requirements.lock'
});

/**
 * <lang><zh-CN>锁定两份 Adobe OFL 文本的顺序、身份、官方 URL 与内容哈希，阻止 manifest 把许可检查重定向到任意路径。</zh-CN><en>Locks order, identity, official URL, and content digest for the two Adobe OFL texts, preventing the manifest from redirecting license checks to arbitrary paths.</en></lang>
 * @lang zh-CN 哈希来自固定 Adobe tag 的官方原文；修改许可正文必须作为独立上游变更重新审计。
 * @lang en Digests come from official text at fixed Adobe tags; changing license text requires a separately audited upstream change.
 */
const expectedLicenses = Object.freeze([
  Object.freeze({
    copyright: 'Copyright 2014-2025 Adobe',
    path: 'LICENSES/Source-Han-Sans-OFL-1.1.txt',
    reservedFontName: 'Source',
    sha256: 'fcac737e761ec63dbfbdce11030a1780161920d80315edba9c8beff1c2bac5a2',
    spdx: 'OFL-1.1',
    url: 'https://github.com/adobe-fonts/source-han-sans/blob/2.005R/LICENSE.txt'
  }),
  Object.freeze({
    copyright: 'Copyright 2017-2022 Adobe',
    path: 'LICENSES/Source-Han-Serif-OFL-1.1.txt',
    reservedFontName: 'Source',
    sha256: '9ff5bb567e1b92c801fc1069e5fbf992ff8efccacb9db94e5959a5b3ba9bb903',
    spdx: 'OFL-1.1',
    url: 'https://github.com/adobe-fonts/source-han-serif/blob/2.003R/LICENSE.txt'
  })
]);

/**
 * <lang><zh-CN>在任何 manifest 声明路径被用于文件读取前，验证 toolchain 与 license locator 完全等于固定 allowlist。</zh-CN><en>Before any manifest-declared path can be used for file access, verifies that toolchain and license locators exactly equal fixed allowlists.</en></lang>
 * @param {object} manifest <lang><zh-CN>已解析但尚未获路径信任的 provenance object。</zh-CN><en>Parsed provenance object whose paths are not yet trusted.</en></lang>
 * @returns {void} <lang><zh-CN>路径与固定元数据完全一致时正常返回。</zh-CN><en>Returns normally when paths and fixed metadata match exactly.</en></lang>
 * @lang zh-CN 比较包含许可数组顺序，避免同路径重复、遗漏或利用对象字段混排掩盖替换。
 * @lang en Comparison includes license-array order, preventing duplicate/omitted paths or replacement hidden by object-field reordering.
 */
export function verifyManifestDeclaredPaths(manifest) {
  // <lang><zh-CN>toolchain 只允许两个精确相对 POSIX 路径；绝对路径、`..` 和其他仓内文件都会失败。</zh-CN><en>Toolchain allows only two exact relative POSIX paths; absolute paths, `..`, and other in-repository files all fail.</en></lang>
  if (
    manifest?.toolchain?.scriptPath !== expectedToolchainPaths.scriptPath
    || manifest?.toolchain?.requirementsPath !== expectedToolchainPaths.requirementsPath
  ) throw new Error('Unexpected font toolchain path declaration.');

  // <lang><zh-CN>许可 inventory 必须和冻结对象逐项逐字段相同；不从 manifest 反向构造预期集合。</zh-CN><en>The license inventory must match frozen objects item by item and field by field; expectations are never constructed from the manifest.</en></lang>
  if (!Array.isArray(manifest.licenses) || manifest.licenses.length !== expectedLicenses.length) {
    throw new Error('Unexpected font license inventory.');
  }

  expectedLicenses.forEach((expectedLicense, licenseIndex) => {
    const observedLicense = manifest.licenses[licenseIndex];
    for (const [fieldName, expectedValue] of Object.entries(expectedLicense)) {
      if (observedLicense?.[fieldName] !== expectedValue) {
        throw new Error(`Unexpected font license declaration at index ${licenseIndex}.`);
      }
    }
  });
}

/**
 * <lang><zh-CN>递归收集 JSON-like 结构中的字符串值，不把属性键、函数或原型成员误作用户可见文本。</zh-CN><en>Recursively collects string values from a JSON-like structure without treating property keys, functions, or prototype members as visible copy.</en></lang>
 * @param {unknown} value <lang><zh-CN>受控 locale 或 local dataset 节点。</zh-CN><en>Controlled locale or local-dataset node.</en></lang>
 * @param {string[]} target <lang><zh-CN>当前调用持有的字符串累加器。</zh-CN><en>String accumulator owned by the current call.</en></lang>
 * @returns {void} <lang><zh-CN>字符串通过 target 写入，不返回新容器。</zh-CN><en>Strings are written through target; no new container is returned.</en></lang>
 * @lang zh-CN 数据是仓内已审阅静态对象；函数不读取 getter、不执行动态模块，也不跟随任意引用图。
 * @lang en Data consists of reviewed static in-repository objects; the function reads no getter, executes no dynamic module, and follows no arbitrary reference graph.
 */
function collectStringValues(value, target) {
  // <lang><zh-CN>字符串是唯一运行时字形来源；保留完整值供 Unicode code point 去重。</zh-CN><en>Strings are the sole runtime glyph source; retain complete values for Unicode code-point deduplication.</en></lang>
  if (typeof value === 'string') {
    target.push(value);
    return;
  }

  // <lang><zh-CN>数组只遍历自身有限条目，顺序不影响后续集合语义。</zh-CN><en>Arrays traverse only their finite entries, and order does not affect later set semantics.</en></lang>
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, target);
    return;
  }

  // <lang><zh-CN>只接受普通非空 object 的 enumerable values；null 与数字等不贡献新字形。</zh-CN><en>Accept only enumerable values of a non-null plain object; null, numbers, and similar values contribute no new glyph.</en></lang>
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStringValues(item, target);
  }
}

/**
 * <lang><zh-CN>把一组文本转换为 Unicode code point 集合，正确保留非 BMP 字符边界。</zh-CN><en>Converts text values into a Unicode code-point set while preserving non-BMP character boundaries.</en></lang>
 * @param {Iterable<string>} textValues <lang><zh-CN>已审阅用户可见文本。</zh-CN><en>Reviewed user-visible text.</en></lang>
 * @returns {Set<number>} <lang><zh-CN>去重后的 Unicode code point。</zh-CN><en>Deduplicated Unicode code points.</en></lang>
 * @lang zh-CN JavaScript 字符迭代按 code point 工作，避免把 surrogate pair 错算为两个字体字符。
 * @lang en JavaScript string iteration works by code point, avoiding treatment of a surrogate pair as two font characters.
 */
function codepointsFromText(textValues) {
  // <lang><zh-CN>集合只表达覆盖合同，不保留文本顺序、message key 或领域记录关系。</zh-CN><en>The set expresses only the coverage contract and retains no text order, message key, or domain-record relationship.</en></lang>
  const codepoints = new Set();

  for (const textValue of textValues) {
    // <lang><zh-CN>逐字符转换为唯一标量值；空字符串自然不产生条目。</zh-CN><en>Convert each character into its unique scalar value; an empty string naturally contributes no entry.</en></lang>
    for (const character of textValue) codepoints.add(character.codePointAt(0));
  }

  return codepoints;
}

/**
 * <lang><zh-CN>读取本地 JSON dataset，并返回经过 JSON parser 限定的普通数据。</zh-CN><en>Reads the local JSON dataset and returns plain data bounded by the JSON parser.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>版本化场馆、资源与示例预约数据。</zh-CN><en>Versioned venue, resource, and demo-booking data.</en></lang>
 * @lang zh-CN 固定路径不受 runtime 或 CLI 输入影响；读取不会访问网络或修改数据文件。
 * @lang en The fixed path is unaffected by runtime or CLI input; reading neither accesses the network nor modifies the data file.
 */
async function readLocalDataset() {
  // <lang><zh-CN>显式 UTF-8 解码后再解析，保证 corpus 与应用所消费的 JSON 字符一致。</zh-CN><en>Decode explicitly as UTF-8 before parsing so the corpus matches the JSON characters consumed by the app.</en></lang>
  return JSON.parse(await readFile(datasetPath, 'utf8'));
}

/**
 * <lang><zh-CN>从完整 locale values 与 local dataset values 构造 Sans 的受控运行时覆盖。</zh-CN><en>Builds controlled Sans runtime coverage from all locale values and local-dataset values.</en></lang>
 * @param {object} localDataset <lang><zh-CN>固定 JSON 数据。</zh-CN><en>Fixed JSON data.</en></lang>
 * @returns {Set<number>} <lang><zh-CN>所有当前正文可见字符。</zh-CN><en>All currently visible body-copy characters.</en></lang>
 * @lang zh-CN 属性键、ROP 注释和路径不会进入集合；自由搜索输入与未来远端内容由 fallback 字体承担。
 * @lang en Property keys, ROP comments, and paths never enter the set; fallback fonts own free-form search input and future remote content.
 */
function collectRequiredSansCodepoints(localDataset) {
  // <lang><zh-CN>数组在函数内暂存原始完整字符串，使数据来源仍可从调用路径区分。</zh-CN><en>The function-local array retains complete source strings so their origin remains distinguishable from the call path.</en></lang>
  const visibleText = [];
  collectStringValues(BP_MESSAGES, visibleText);
  collectStringValues(localDataset, visibleText);
  return codepointsFromText(visibleText);
}

/**
 * <lang><zh-CN>只收集实际采用展示 Serif 的品牌、欢迎标题、确认结果以及场馆/资源动态标题。</zh-CN><en>Collects only the brand, welcome heading, confirmation result, and dynamic venue/resource titles that actually use display Serif.</en></lang>
 * @param {object} localDataset <lang><zh-CN>固定 JSON 数据。</zh-CN><en>Fixed JSON data.</en></lang>
 * @returns {Set<number>} <lang><zh-CN>当前展示文本字符集合。</zh-CN><en>Current display-copy character set.</en></lang>
 * @lang zh-CN 新增 Serif 使用点必须同步扩大此明确清单和 tracked corpus，避免不受控地把全部正文复制进展示字体。
 * @lang en A new Serif use site must expand this explicit list and tracked corpus together, avoiding uncontrolled duplication of all body copy into the display font.
 */
function collectRequiredSerifCodepoints(localDataset) {
  // <lang><zh-CN>展示文本列表只包含已知 message values 与双语领域标题，不包含摘要、筛选器或用户输入。</zh-CN><en>The display-text list contains only known message values and bilingual domain titles, excluding summaries, filters, and user input.</en></lang>
  const displayText = [];

  for (const localeMessages of Object.values(BP_MESSAGES)) {
    for (const messageKey of serifMessageKeys) displayText.push(localeMessages[messageKey]);
  }

  // <lang><zh-CN>详情页标题由场馆名与资源名拼接，故两者的全部当前 locale 值都属于 Serif 覆盖合同。</zh-CN><en>Detail titles concatenate venue and resource names, so all current locale values for both belong to the Serif coverage contract.</en></lang>
  for (const venue of localDataset.venues) {
    collectStringValues(venue.name, displayText);
    for (const resource of venue.resources) collectStringValues(resource.name, displayText);
  }

  return codepointsFromText(displayText);
}

/**
 * <lang><zh-CN>解析实际字符 corpus，跳过双语 `#` 说明行并排除文件换行。</zh-CN><en>Parses a literal-character corpus, skipping bilingual `#` explanation lines and file line endings.</en></lang>
 * @param {string} corpusText <lang><zh-CN>UTF-8 corpus 全文。</zh-CN><en>Complete UTF-8 corpus text.</en></lang>
 * @returns {Set<number>} <lang><zh-CN>corpus 声明的 code point。</zh-CN><en>Code points declared by the corpus.</en></lang>
 * @lang zh-CN 空格和 ASCII 由独立 code-point spec 表达，因此这里可以安全忽略空说明行。
 * @lang en Spaces and ASCII are expressed by a separate code-point spec, so blank explanatory lines are safe to ignore here.
 */
function parseTextCorpus(corpusText) {
  // <lang><zh-CN>仅连接非空、非说明行；文件格式不允许把行边空格作为隐藏字形声明。</zh-CN><en>Join only non-empty, non-explanatory lines; the format does not allow edge spaces as hidden glyph declarations.</en></lang>
  const dataLines = corpusText.split(/\r?\n/u).filter((line) => line.length > 0 && !line.startsWith('#'));
  return codepointsFromText(dataLines);
}

/**
 * <lang><zh-CN>解析受控 `U+XXXX`/range 规范，明确表达空格、ASCII 和少量界面符号。</zh-CN><en>Parses the controlled `U+XXXX`/range specification that explicitly expresses space, ASCII, and a few interface symbols.</en></lang>
 * @param {string} specText <lang><zh-CN>UTF-8 code-point spec。</zh-CN><en>UTF-8 code-point specification.</en></lang>
 * @returns {Set<number>} <lang><zh-CN>展开后的有限 code point 集合。</zh-CN><en>Expanded finite code-point set.</en></lang>
 * @lang zh-CN 非法行、倒序范围或越过 Unicode 上界会失败，避免注释或拼写错误静默改变字体。
 * @lang en An invalid line, reversed range, or value above the Unicode ceiling fails so comments or typos cannot silently change a font.
 */
function parseCodepointSpec(specText) {
  // <lang><zh-CN>集合在当前解析内累加，重复声明不改变结果。</zh-CN><en>The set accumulates within this parse, and duplicate declarations do not change the result.</en></lang>
  const codepoints = new Set();
  const sourceLines = specText.split(/\r?\n/u);

  sourceLines.forEach((sourceLine, zeroBasedLineNumber) => {
    // <lang><zh-CN>仅行边空白被忽略；token 内部空白保持非法，保证格式简单可审计。</zh-CN><en>Only edge whitespace is ignored; interior whitespace remains invalid, keeping the format simple and auditable.</en></lang>
    const token = sourceLine.trim();
    if (!token || token.startsWith('#')) return;

    // <lang><zh-CN>正则只接受单值或两个显式 U+ 十六进制边界，不接受任意表达式。</zh-CN><en>The expression accepts only a singleton or two explicit hexadecimal U+ boundaries and never arbitrary syntax.</en></lang>
    const match = /^U\+([0-9A-F]{4,6})(?:-U\+([0-9A-F]{4,6}))?$/u.exec(token);
    if (!match) throw new Error(`Invalid code-point syntax at runtime-symbols.txt:${zeroBasedLineNumber + 1}.`);

    // <lang><zh-CN>缺失终点表示单值；所有数值在展开前验证次序和 Unicode 上界。</zh-CN><en>A missing end denotes a singleton; validate ordering and the Unicode ceiling before expansion.</en></lang>
    const start = Number.parseInt(match[1], 16);
    const end = Number.parseInt(match[2] ?? match[1], 16);
    if (start > end || end > 0x10ffff) throw new Error(`Invalid code-point range at runtime-symbols.txt:${zeroBasedLineNumber + 1}.`);

    for (let codepoint = start; codepoint <= end; codepoint += 1) codepoints.add(codepoint);
  });

  return codepoints;
}

/**
 * <lang><zh-CN>把 source-required 与共享符号集合合并成单个 face 的完整有限合同。</zh-CN><en>Merges source-required and shared-symbol sets into one face's complete finite contract.</en></lang>
 * @param {Set<number>} roleCodepoints <lang><zh-CN>当前角色的运行时文本。</zh-CN><en>Runtime text for the current role.</en></lang>
 * @param {Set<number>} sharedCodepoints <lang><zh-CN>ASCII 与显式界面符号。</zh-CN><en>ASCII and explicit interface symbols.</en></lang>
 * @returns {Set<number>} <lang><zh-CN>新的合并集合。</zh-CN><en>A new merged set.</en></lang>
 * @lang zh-CN 返回新 Set，调用者的来源集合保持不变，便于分别诊断 source 与 shared 覆盖。
 * @lang en Return a new Set so caller-owned source sets stay unchanged for separate source/shared diagnostics.
 */
function unionCodepoints(roleCodepoints, sharedCodepoints) {
  return new Set([...roleCodepoints, ...sharedCodepoints]);
}

/**
 * <lang><zh-CN>计算固定文件的 SHA-256 小写十六进制。</zh-CN><en>Computes lowercase hexadecimal SHA-256 for a fixed file.</en></lang>
 * @param {string} filePath <lang><zh-CN>仓内 allowlisted 文件。</zh-CN><en>Allowlisted in-repository file.</en></lang>
 * @returns {Promise<string>} <lang><zh-CN>内容摘要。</zh-CN><en>Content digest.</en></lang>
 * @lang zh-CN 当前字体与 corpus 均为有限大小；单次读取简化只读验证，不接触外部数据。
 * @lang en Current fonts and corpora are finite; one read simplifies read-only verification and touches no external data.
 */
async function sha256File(filePath) {
  // <lang><zh-CN>哈希直接基于二进制 Buffer，文本换行或编码不会被运行时归一化。</zh-CN><en>Hash the binary Buffer directly so runtime text normalization cannot alter line endings or encoding.</en></lang>
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

/**
 * <lang><zh-CN>读取 WOFF 目录并解压每张 OpenType table，拒绝越界、重复 tag 与长度不符。</zh-CN><en>Reads a WOFF directory and inflates each OpenType table, rejecting bounds violations, duplicate tags, and length mismatches.</en></lang>
 * @param {Buffer} woffBytes <lang><zh-CN>受 manifest 哈希约束的 WOFF 字节。</zh-CN><en>WOFF bytes constrained by the manifest digest.</en></lang>
 * @returns {{ flavor: number, tables: Map<string, Buffer> }} <lang><zh-CN>原始 sfnt flavor 与解压 table。</zh-CN><en>Original sfnt flavor and inflated tables.</en></lang>
 * @lang zh-CN 解析器只实现当前验证所需的 WOFF 1.0，不接受 WOFF2 或未知容器。
 * @lang en The parser implements only WOFF 1.0 required by the current gate and accepts neither WOFF2 nor an unknown container.
 */
function parseWoffTables(woffBytes) {
  // <lang><zh-CN>44-byte WOFF header 和 `wOFF` signature 是继续读取目录的前置条件。</zh-CN><en>The 44-byte WOFF header and `wOFF` signature are prerequisites for reading its directory.</en></lang>
  if (woffBytes.length < 44 || woffBytes.toString('ascii', 0, 4) !== 'wOFF') throw new Error('Font is not WOFF 1.0.');

  // <lang><zh-CN>声明长度必须覆盖整个且仅覆盖当前 Buffer，避免尾随或截断数据被忽略。</zh-CN><en>The declared length must cover all and only the current Buffer so trailing or truncated data cannot be ignored.</en></lang>
  const flavor = woffBytes.readUInt32BE(4);
  const declaredLength = woffBytes.readUInt32BE(8);
  const tableCount = woffBytes.readUInt16BE(12);
  if (declaredLength !== woffBytes.length || tableCount === 0 || 44 + tableCount * 20 > woffBytes.length) {
    throw new Error('Invalid WOFF header bounds.');
  }

  // <lang><zh-CN>Map 以四字节 tag 为键保存解压 table；重复 tag 表示结构歧义并立即失败。</zh-CN><en>A Map stores inflated tables by four-byte tag; a duplicate tag creates structural ambiguity and fails immediately.</en></lang>
  const tables = new Map();

  for (let tableIndex = 0; tableIndex < tableCount; tableIndex += 1) {
    // <lang><zh-CN>每个目录项固定 20 bytes；偏移和长度在切片或解压前做整数边界核验。</zh-CN><en>Every directory record is 20 bytes; offset and lengths receive integer-bound checks before slicing or inflation.</en></lang>
    const recordOffset = 44 + tableIndex * 20;
    const tag = woffBytes.toString('ascii', recordOffset, recordOffset + 4);
    const tableOffset = woffBytes.readUInt32BE(recordOffset + 4);
    const compressedLength = woffBytes.readUInt32BE(recordOffset + 8);
    const originalLength = woffBytes.readUInt32BE(recordOffset + 12);
    if (tables.has(tag) || compressedLength === 0 || originalLength === 0 || tableOffset + compressedLength > woffBytes.length) {
      throw new Error(`Invalid WOFF table record for ${tag}.`);
    }

    // <lang><zh-CN>WOFF 仅当 compLength 小于 origLength 时使用 zlib；相等时 table 是原始字节。</zh-CN><en>WOFF uses zlib only when compLength is smaller than origLength; equal lengths denote raw table bytes.</en></lang>
    const storedBytes = woffBytes.subarray(tableOffset, tableOffset + compressedLength);
    const tableBytes = compressedLength < originalLength ? inflateSync(storedBytes) : Buffer.from(storedBytes);
    if (tableBytes.length !== originalLength) throw new Error(`Unexpected inflated length for ${tag}.`);
    tables.set(tag, tableBytes);
  }

  return { flavor, tables };
}

/**
 * <lang><zh-CN>解码 OpenType name record；当前主身份检查支持 Unicode/Windows UTF-16BE 与 ASCII-safe Macintosh 记录。</zh-CN><en>Decodes an OpenType name record; current primary-identity checks support Unicode/Windows UTF-16BE and ASCII-safe Macintosh records.</en></lang>
 * @param {Buffer} valueBytes <lang><zh-CN>name string storage 中的有限切片。</zh-CN><en>Finite slice from name string storage.</en></lang>
 * @param {number} platformId <lang><zh-CN>OpenType platform ID。</zh-CN><en>OpenType platform ID.</en></lang>
 * @returns {string} <lang><zh-CN>可比较的 JavaScript 字符串。</zh-CN><en>Comparable JavaScript string.</en></lang>
 * @lang zh-CN 项目改写后的主名全为 ASCII，因此 Macintosh 使用 latin1 解码不会损失被检查语义。
 * @lang en Modified primary names are ASCII-only, so latin1 decoding for Macintosh loses none of the checked semantics.
 */
function decodeNameRecord(valueBytes, platformId) {
  // <lang><zh-CN>Unicode 与 Windows name string 使用 UTF-16BE；Node 通过交换字节后以 utf16le 精确解码。</zh-CN><en>Unicode and Windows name strings use UTF-16BE; Node decodes them exactly by swapping bytes and using utf16le.</en></lang>
  if (platformId === 0 || platformId === 3) {
    if (valueBytes.length % 2 !== 0) throw new Error('Invalid UTF-16BE name length.');
    const littleEndianBytes = Buffer.alloc(valueBytes.length);
    for (let byteIndex = 0; byteIndex < valueBytes.length; byteIndex += 2) {
      littleEndianBytes[byteIndex] = valueBytes[byteIndex + 1];
      littleEndianBytes[byteIndex + 1] = valueBytes[byteIndex];
    }
    return littleEndianBytes.toString('utf16le');
  }

  return valueBytes.toString('latin1');
}

/**
 * <lang><zh-CN>解析 name table 为按 name ID 分组的字符串集合，并验证所有 record 边界。</zh-CN><en>Parses a name table into string sets grouped by name ID while validating every record boundary.</en></lang>
 * @param {Buffer} nameTable <lang><zh-CN>已解压 OpenType name table。</zh-CN><en>Inflated OpenType name table.</en></lang>
 * @returns {Map<number, Set<string>>} <lang><zh-CN>按 ID 去重的跨平台名称。</zh-CN><en>Cross-platform names deduplicated by ID.</en></lang>
 * @lang zh-CN format 0 与 1 共用基础 record 布局；当前检查不需要解析 format 1 language-tag records。
 * @lang en Formats 0 and 1 share the base record layout; this gate does not need format-1 language-tag records.
 */
function parseNameTable(nameTable) {
  if (nameTable.length < 6) throw new Error('Invalid name table header.');

  // <lang><zh-CN>record count 和 string storage offset 决定两个固定区域；任何交叠或越界均失败。</zh-CN><en>Record count and string-storage offset define two fixed regions; any overlap or bounds violation fails.</en></lang>
  const recordCount = nameTable.readUInt16BE(2);
  const stringStorageOffset = nameTable.readUInt16BE(4);
  if (6 + recordCount * 12 > nameTable.length || stringStorageOffset > nameTable.length) throw new Error('Invalid name table bounds.');

  // <lang><zh-CN>集合保留所有平台记录的不同值，用于发现某个平台仍暴露上游保留名。</zh-CN><en>Sets retain every distinct platform value so a platform that still exposes an upstream reserved name is detected.</en></lang>
  const valuesByNameId = new Map();

  for (let recordIndex = 0; recordIndex < recordCount; recordIndex += 1) {
    const recordOffset = 6 + recordIndex * 12;
    const platformId = nameTable.readUInt16BE(recordOffset);
    const nameId = nameTable.readUInt16BE(recordOffset + 6);
    const valueLength = nameTable.readUInt16BE(recordOffset + 8);
    const relativeValueOffset = nameTable.readUInt16BE(recordOffset + 10);
    const valueOffset = stringStorageOffset + relativeValueOffset;
    if (valueOffset + valueLength > nameTable.length) throw new Error(`Invalid name record bounds for ID ${nameId}.`);

    // <lang><zh-CN>仅解码可识别的平台记录；未知平台不被误解码，但 Python 生成门禁仍会审计完整输入。</zh-CN><en>Decode only recognized platform records; unknown platforms are not misdecoded, while the Python generation gate still audits the complete input.</en></lang>
    if (![0, 1, 3].includes(platformId)) continue;
    const decodedValue = decodeNameRecord(nameTable.subarray(valueOffset, valueOffset + valueLength), platformId);
    const values = valuesByNameId.get(nameId) ?? new Set();
    values.add(decodedValue);
    valuesByNameId.set(nameId, values);
  }

  return valuesByNameId;
}

/**
 * <lang><zh-CN>解析 cmap format 12 的 group ranges，并只保留映射到非零 glyph 的 code point。</zh-CN><en>Parses cmap format-12 group ranges and retains only code points mapped to nonzero glyphs.</en></lang>
 * @param {Buffer} cmapTable <lang><zh-CN>完整 cmap table。</zh-CN><en>Complete cmap table.</en></lang>
 * @param {number} subtableOffset <lang><zh-CN>format 12 子表起点。</zh-CN><en>Start of the format-12 subtable.</en></lang>
 * @returns {Set<number>} <lang><zh-CN>该子表的有效映射。</zh-CN><en>Valid mappings in the subtable.</en></lang>
 * @lang zh-CN 当前子集很小；仍限制 group 数与范围边界，避免损坏字体触发无界展开。
 * @lang en The current subset is small; group count and range bounds are still limited so a damaged font cannot trigger unbounded expansion.
 */
function parseCmapFormat12(cmapTable, subtableOffset) {
  if (subtableOffset + 16 > cmapTable.length) throw new Error('Invalid cmap format 12 header.');
  const subtableLength = cmapTable.readUInt32BE(subtableOffset + 4);
  const groupCount = cmapTable.readUInt32BE(subtableOffset + 12);
  if (groupCount > 100_000 || subtableOffset + subtableLength > cmapTable.length || 16 + groupCount * 12 > subtableLength) {
    throw new Error('Invalid cmap format 12 bounds.');
  }

  const codepoints = new Set();
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const groupOffset = subtableOffset + 16 + groupIndex * 12;
    const start = cmapTable.readUInt32BE(groupOffset);
    const end = cmapTable.readUInt32BE(groupOffset + 4);
    const startGlyph = cmapTable.readUInt32BE(groupOffset + 8);
    if (start > end || end > 0x10ffff || end - start > 100_000) throw new Error('Invalid cmap format 12 range.');
    for (let codepoint = start; codepoint <= end; codepoint += 1) {
      if (startGlyph + codepoint - start !== 0) codepoints.add(codepoint);
    }
  }
  return codepoints;
}

/**
 * <lang><zh-CN>解析 BMP cmap format 4，按 idDelta/idRangeOffset 规则判定非零 glyph mapping。</zh-CN><en>Parses BMP cmap format 4 and applies idDelta/idRangeOffset rules to identify nonzero glyph mappings.</en></lang>
 * @param {Buffer} cmapTable <lang><zh-CN>完整 cmap table。</zh-CN><en>Complete cmap table.</en></lang>
 * @param {number} subtableOffset <lang><zh-CN>format 4 子表起点。</zh-CN><en>Start of the format-4 subtable.</en></lang>
 * @returns {Set<number>} <lang><zh-CN>该子表的有效 BMP 映射。</zh-CN><en>Valid BMP mappings in the subtable.</en></lang>
 * @lang zh-CN 计算 glyphIdArray 地址时以当前 idRangeOffset 字段位置为基准，符合 OpenType cmap 定义。
 * @lang en GlyphIdArray address calculation is relative to the current idRangeOffset field, as required by the OpenType cmap definition.
 */
function parseCmapFormat4(cmapTable, subtableOffset) {
  if (subtableOffset + 14 > cmapTable.length) throw new Error('Invalid cmap format 4 header.');
  const subtableLength = cmapTable.readUInt16BE(subtableOffset + 2);
  const segmentCount = cmapTable.readUInt16BE(subtableOffset + 6) / 2;
  if (!Number.isInteger(segmentCount) || segmentCount <= 0 || subtableOffset + subtableLength > cmapTable.length) throw new Error('Invalid cmap format 4 bounds.');

  // <lang><zh-CN>四个平行数组的位置由 segment count 确定；reservedPad 位于 endCode 与 startCode 之间。</zh-CN><en>Segment count determines the four parallel-array positions; reservedPad lies between endCode and startCode.</en></lang>
  const endCodesOffset = subtableOffset + 14;
  const startCodesOffset = endCodesOffset + segmentCount * 2 + 2;
  const deltasOffset = startCodesOffset + segmentCount * 2;
  const rangeOffsetsOffset = deltasOffset + segmentCount * 2;
  if (rangeOffsetsOffset + segmentCount * 2 > subtableOffset + subtableLength) throw new Error('Invalid cmap format 4 arrays.');

  const codepoints = new Set();
  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const start = cmapTable.readUInt16BE(startCodesOffset + segmentIndex * 2);
    const end = cmapTable.readUInt16BE(endCodesOffset + segmentIndex * 2);
    const delta = cmapTable.readInt16BE(deltasOffset + segmentIndex * 2);
    const rangeOffsetField = rangeOffsetsOffset + segmentIndex * 2;
    const rangeOffset = cmapTable.readUInt16BE(rangeOffsetField);
    if (start > end) throw new Error('Invalid cmap format 4 segment.');

    for (let codepoint = start; codepoint <= end && codepoint !== 0xffff; codepoint += 1) {
      // <lang><zh-CN>rangeOffset 为零时直接应用 delta；否则从当前字段相对定位 glyphIdArray 并再应用 delta。</zh-CN><en>When rangeOffset is zero apply delta directly; otherwise locate glyphIdArray relative to this field and then apply delta.</en></lang>
      let glyphId;
      if (rangeOffset === 0) {
        glyphId = (codepoint + delta) & 0xffff;
      } else {
        const glyphOffset = rangeOffsetField + rangeOffset + (codepoint - start) * 2;
        if (glyphOffset + 2 > subtableOffset + subtableLength) throw new Error('Invalid cmap format 4 glyph offset.');
        glyphId = cmapTable.readUInt16BE(glyphOffset);
        if (glyphId !== 0) glyphId = (glyphId + delta) & 0xffff;
      }
      if (glyphId !== 0) codepoints.add(codepoint);
    }
  }

  return codepoints;
}

/**
 * <lang><zh-CN>合并 cmap 中所有受支持 Unicode 子表，避免依赖单个平台 record 的排序。</zh-CN><en>Merges every supported Unicode cmap subtable without depending on one platform record's ordering.</en></lang>
 * @param {Buffer} cmapTable <lang><zh-CN>已解压 cmap table。</zh-CN><en>Inflated cmap table.</en></lang>
 * @returns {Set<number>} <lang><zh-CN>format 4/12 的有效 Unicode mapping 并集。</zh-CN><en>Union of valid Unicode mappings from formats 4 and 12.</en></lang>
 * @lang zh-CN 只接受 Unicode platform 或 Windows Unicode encodings 1/10，排除 symbol/non-Unicode 子表。
 * @lang en Accept only the Unicode platform or Windows Unicode encodings 1/10, excluding symbol and non-Unicode subtables.
 */
function parseUnicodeCmap(cmapTable) {
  if (cmapTable.length < 4 || cmapTable.readUInt16BE(0) !== 0) throw new Error('Invalid cmap header.');
  const recordCount = cmapTable.readUInt16BE(2);
  if (4 + recordCount * 8 > cmapTable.length) throw new Error('Invalid cmap encoding records.');

  const codepoints = new Set();
  const visitedOffsets = new Set();
  for (let recordIndex = 0; recordIndex < recordCount; recordIndex += 1) {
    const recordOffset = 4 + recordIndex * 8;
    const platformId = cmapTable.readUInt16BE(recordOffset);
    const encodingId = cmapTable.readUInt16BE(recordOffset + 2);
    const subtableOffset = cmapTable.readUInt32BE(recordOffset + 4);
    const isUnicodeRecord = platformId === 0 || (platformId === 3 && [1, 10].includes(encodingId));
    if (!isUnicodeRecord || visitedOffsets.has(subtableOffset)) continue;
    if (subtableOffset + 2 > cmapTable.length) throw new Error('Invalid cmap subtable offset.');
    visitedOffsets.add(subtableOffset);

    const format = cmapTable.readUInt16BE(subtableOffset);
    const mapped = format === 12
      ? parseCmapFormat12(cmapTable, subtableOffset)
      : format === 4
        ? parseCmapFormat4(cmapTable, subtableOffset)
        : new Set();
    for (const codepoint of mapped) codepoints.add(codepoint);
  }

  if (codepoints.size === 0) throw new Error('No supported Unicode cmap mapping found.');
  return codepoints;
}

/**
 * <lang><zh-CN>构造单张 face 的期望主字体名，和 Python 生成器保持相同命名规则。</zh-CN><en>Builds expected primary names for one face under the same rule as the Python generator.</en></lang>
 * @param {object} faceSpec <lang><zh-CN>冻结 face 身份。</zh-CN><en>Frozen face identity.</en></lang>
 * @param {string} upstreamTag <lang><zh-CN>manifest 锁定的 Adobe tag。</zh-CN><en>Adobe tag pinned by the manifest.</en></lang>
 * @returns {Map<number, string>} <lang><zh-CN>受控 name ID 与唯一期望值。</zh-CN><en>Controlled name IDs and their sole expected values.</en></lang>
 * @lang zh-CN Regular 完整名不追加重复 style；unique ID 仍不使用 OFL 保留名。
 * @lang en The Regular full name omits a repeated style; the unique ID also avoids the OFL reserved name.
 */
function expectedPrimaryNames(faceSpec, upstreamTag) {
  const fullName = faceSpec.style === 'Regular' ? faceSpec.family : `${faceSpec.family} ${faceSpec.style}`;
  return new Map([
    [1, faceSpec.family],
    [2, faceSpec.style],
    [3, `HIA-uView BP;${upstreamTag};${faceSpec.postscriptName}`],
    [4, fullName],
    [6, faceSpec.postscriptName],
    [16, faceSpec.family],
    [17, faceSpec.style],
    [21, faceSpec.family],
    [22, faceSpec.style]
  ]);
}

/**
 * <lang><zh-CN>验证单份 WOFF 的容器、CFF flavor、主字体名和受控 Unicode 覆盖。</zh-CN><en>Verifies one WOFF's container, CFF flavor, primary names, and controlled Unicode coverage.</en></lang>
 * @param {Buffer} fontBytes <lang><zh-CN>已通过 manifest digest 检查的字体字节。</zh-CN><en>Font bytes already checked against the manifest digest.</en></lang>
 * @param {object} faceSpec <lang><zh-CN>冻结 face 声明。</zh-CN><en>Frozen face declaration.</en></lang>
 * @param {object} faceRecord <lang><zh-CN>对应 provenance 记录。</zh-CN><en>Corresponding provenance record.</en></lang>
 * @param {Set<number>} requiredCodepoints <lang><zh-CN>角色与共享符号的完整集合。</zh-CN><en>Complete role and shared-symbol set.</en></lang>
 * @returns {void} <lang><zh-CN>全部条件满足时正常返回。</zh-CN><en>Returns normally when all conditions hold.</en></lang>
 * @lang zh-CN 二进制深层 CFF identity 已由生成器验证；普通门禁以固定输出 SHA-256 绑定该已审计结果。
 * @lang en Deep binary CFF identity is verified by the generator; the normal gate binds that audited result through the fixed output SHA-256.
 */
function verifyWoff(fontBytes, faceSpec, faceRecord, requiredCodepoints) {
  const { flavor, tables } = parseWoffTables(fontBytes);

  // <lang><zh-CN>`OTTO` flavor 与 CFF table 必须同时存在，排除改扩展名、TrueType 替换或空壳 WOFF。</zh-CN><en>`OTTO` flavor and a CFF table must both exist, excluding renamed files, TrueType replacement, or an empty WOFF shell.</en></lang>
  if (flavor !== 0x4f54544f || !tables.has('CFF ') || !tables.has('name') || !tables.has('cmap') || !tables.has('OS/2')) {
    throw new Error(`Unexpected OpenType tables for ${faceSpec.id}.`);
  }

  // <lang><zh-CN>OS/2 usWeightClass 位于 table offset 4；字节数与期望一致，防止 runtime face 匹配到错误权重。</zh-CN><en>OS/2 usWeightClass is at table offset 4; it must match the expected weight so runtime face matching cannot select the wrong face.</en></lang>
  const os2Table = tables.get('OS/2');
  if (os2Table.length < 6 || os2Table.readUInt16BE(4) !== faceSpec.weight) throw new Error(`Unexpected OS/2 weight for ${faceSpec.id}.`);

  const namesById = parseNameTable(tables.get('name'));
  const expectedNames = expectedPrimaryNames(faceSpec, faceRecord.upstream.tag);
  for (const nameId of primaryNameIds) {
    const observedValues = namesById.get(nameId);
    const expectedValue = expectedNames.get(nameId);
    if (!observedValues || observedValues.size !== 1 || !observedValues.has(expectedValue)) {
      throw new Error(`Unexpected primary name ID ${nameId} for ${faceSpec.id}.`);
    }
    if ([...observedValues].some((value) => value.toLocaleLowerCase('en-US').includes('source'))) {
      throw new Error(`Reserved font name remains in primary name ID ${nameId} for ${faceSpec.id}.`);
    }
  }

  // <lang><zh-CN>name ID 13 必须保留 OFL 描述；独立 LICENSE 文件由 manifest 的许可哈希另行绑定。</zh-CN><en>Name ID 13 must retain its OFL description; the manifest separately binds the standalone LICENSE file by digest.</en></lang>
  const licenseValues = namesById.get(13) ?? new Set();
  if (![...licenseValues].some((value) => value.includes('Open Font License'))) throw new Error(`Missing embedded OFL metadata for ${faceSpec.id}.`);

  const mappedCodepoints = parseUnicodeCmap(tables.get('cmap'));
  const missingCodepoints = [...requiredCodepoints].filter((codepoint) => !mappedCodepoints.has(codepoint)).sort((left, right) => left - right);
  if (missingCodepoints.length > 0) {
    const formattedMissing = missingCodepoints.slice(0, 20).map((codepoint) => `U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}`).join(', ');
    throw new Error(`Missing glyphs for ${faceSpec.id}: ${formattedMissing}.`);
  }

  if (faceRecord.unicodeCount !== requiredCodepoints.size || faceRecord.mappedUnicodeCount !== mappedCodepoints.size) {
    throw new Error(`Unexpected Unicode counts for ${faceSpec.id}.`);
  }
}

/**
 * <lang><zh-CN>输出两个角色 corpus 的规范排序字符串，供首次建立或显式更新 tracked corpus 时人工审阅。</zh-CN><en>Prints canonical sorted strings for both role corpora for human review during initial creation or an explicit tracked-corpus update.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>JSON 输出完成后 resolve。</zh-CN><en>Resolves after JSON output.</en></lang>
 * @lang zh-CN 此诊断模式只打印，不写文件；ASCII 与共享符号仍由 runtime-symbols.txt 单独治理。
 * @lang en This diagnostic mode only prints and never writes files; runtime-symbols.txt continues to govern ASCII and shared symbols separately.
 */
async function printCanonicalCorpora() {
  const localDataset = await readLocalDataset();
  const canonicalString = (codepoints) => [...codepoints]
    .filter((codepoint) => codepoint > 0x7e)
    .sort((left, right) => left - right)
    .map((codepoint) => String.fromCodePoint(codepoint))
    .join('');

  // <lang><zh-CN>JSON 保留实际 Unicode 字符和精确计数，便于复制前逐字审阅而不混入终端转义。</zh-CN><en>JSON preserves literal Unicode characters and exact counts so they can be reviewed character by character without terminal escapes.</en></lang>
  const sansCodepoints = collectRequiredSansCodepoints(localDataset);
  const serifCodepoints = collectRequiredSerifCodepoints(localDataset);
  process.stdout.write(`${JSON.stringify({
    sans: canonicalString(sansCodepoints),
    sansCount: [...sansCodepoints].filter((codepoint) => codepoint > 0x7e).length,
    serif: canonicalString(serifCodepoints),
    serifCount: [...serifCodepoints].filter((codepoint) => codepoint > 0x7e).length
  }, null, 2)}\n`);
}

/**
 * <lang><zh-CN>执行完整字体专项门禁：精确文件集合、manifest、许可、corpus、哈希、WOFF table 与运行时覆盖。</zh-CN><en>Runs the complete font-specific gate: exact files, manifest, licenses, corpora, digests, WOFF tables, and runtime coverage.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>三张 face 全部通过后 resolve。</zh-CN><en>Resolves after all three faces pass.</en></lang>
 * @lang zh-CN 门禁只承诺 H5 与微信开发者工具当前项目内交付，不声称满足微信正式上传包体。
 * @lang en The gate promises only current in-project delivery for H5 and WeChat DevTools and does not claim compliance with WeChat production-upload package limits.
 */
export async function verifyFontSubsets() {
  const [manifestText, dataset, sharedCorpusText, fontDirectoryEntries] = await Promise.all([
    readFile(manifestPath, 'utf8'),
    readLocalDataset(),
    readFile(resolve(corpusRoot, 'runtime-symbols.txt'), 'utf8'),
    readdir(fontAssetRoot, { withFileTypes: true })
  ]);

  // <lang><zh-CN>字体目录只允许 manifest 与三个 WOFF；未知二进制、临时文件或重复版本立即失败。</zh-CN><en>The font directory allows only the manifest and three WOFF files; an unknown binary, temporary file, or duplicate version fails immediately.</en></lang>
  const observedFiles = fontDirectoryEntries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  const expectedFiles = ['font-subsets.manifest.json', ...expectedFaces.map((faceSpec) => faceSpec.outputFile)].sort();
  if (JSON.stringify(observedFiles) !== JSON.stringify(expectedFiles)) throw new Error(`Unexpected font asset set: ${observedFiles.join(', ')}.`);

  const manifest = JSON.parse(manifestText);
  if (manifest.schemaVersion !== '1.0' || manifest.faces?.length !== expectedFaces.length) throw new Error('Unexpected font manifest schema or face count.');

  // <lang><zh-CN>任何路径解析或文件读取前先约束 manifest locator；后续读取仍只使用本文件固定 allowlist。</zh-CN><en>Constrain manifest locators before any path resolution or file read; later access still uses only this file's fixed allowlist.</en></lang>
  verifyManifestDeclaredPaths(manifest);

  // <lang><zh-CN>生成器与依赖锁哈希在普通 Node 门禁中复核，使旧产物不能在维护代码改变后继续冒充可复现。</zh-CN><en>Recheck generator and dependency-lock digests in the normal Node gate so old artifacts cannot masquerade as reproducible after maintenance code changes.</en></lang>
  const scriptDigest = await sha256File(resolve(projectRoot, expectedToolchainPaths.scriptPath));
  const requirementsDigest = await sha256File(resolve(projectRoot, expectedToolchainPaths.requirementsPath));
  if (scriptDigest !== manifest.toolchain.scriptSha256 || requirementsDigest !== manifest.toolchain.requirementsSha256) {
    throw new Error('Font toolchain provenance digest mismatch.');
  }

  // <lang><zh-CN>许可文件路径只来自 manifest 中受上游锁定的两个条目；每个内容摘要必须匹配。</zh-CN><en>License-file paths come only from the two upstream-pinned manifest entries; every content digest must match.</en></lang>
  for (const expectedLicense of expectedLicenses) {
    if (await sha256File(resolve(projectRoot, expectedLicense.path)) !== expectedLicense.sha256) throw new Error(`License digest mismatch for ${expectedLicense.path}.`);
  }

  const sharedCodepoints = parseCodepointSpec(sharedCorpusText);
  const requiredSans = unionCodepoints(collectRequiredSansCodepoints(dataset), sharedCodepoints);
  const requiredSerif = unionCodepoints(collectRequiredSerifCodepoints(dataset), sharedCodepoints);
  const facesById = new Map(manifest.faces.map((faceRecord) => [faceRecord.id, faceRecord]));

  for (const faceSpec of expectedFaces) {
    const faceRecord = facesById.get(faceSpec.id);
    if (!faceRecord) throw new Error(`Missing font manifest face ${faceSpec.id}.`);

    // <lang><zh-CN>固定 spec 与 manifest 的身份、路径、格式、权重和预算必须逐项一致，拒绝仅更新哈希掩盖语义漂移。</zh-CN><en>Frozen spec and manifest identity, path, format, weight, and budget must match field by field, rejecting a digest-only update that hides semantic drift.</en></lang>
    const expectedOutputPath = `src/assets/fonts/${faceSpec.outputFile}`;
    if (
      faceRecord.role !== faceSpec.role
      || faceRecord.cssFamily !== faceSpec.family
      || faceRecord.fontWeight !== faceSpec.weight
      || faceRecord.postscriptName !== faceSpec.postscriptName
      || faceRecord.outputPath !== expectedOutputPath
      || faceRecord.format !== 'woff'
      || faceRecord.mimeType !== 'font/woff'
      || faceRecord.maxOutputBytes !== faceSpec.maxOutputBytes
      || faceRecord.reservedPrimaryNameCheck !== true
    ) throw new Error(`Unexpected font manifest identity for ${faceSpec.id}.`);

    const roleCorpusPath = resolve(corpusRoot, faceSpec.corpusFile);
    const [roleCorpusText, roleCorpusDigest, sharedCorpusDigest, fontBytes, outputDigest] = await Promise.all([
      readFile(roleCorpusPath, 'utf8'),
      sha256File(roleCorpusPath),
      sha256File(resolve(corpusRoot, 'runtime-symbols.txt')),
      readFile(resolve(fontAssetRoot, faceSpec.outputFile)),
      sha256File(resolve(fontAssetRoot, faceSpec.outputFile))
    ]);

    if (
      faceRecord.corpus.rolePath !== relative(projectRoot, roleCorpusPath).replaceAll('\\', '/')
      || faceRecord.corpus.roleSha256 !== roleCorpusDigest
      || faceRecord.corpus.sharedSha256 !== sharedCorpusDigest
    ) throw new Error(`Corpus provenance mismatch for ${faceSpec.id}.`);

    // <lang><zh-CN>tracked corpus 必须覆盖从 runtime source 重建的集合；多余字符允许作为显式兼容余量，但仍受哈希审阅。</zh-CN><en>The tracked corpus must cover the set reconstructed from runtime sources; extra characters are allowed as explicit compatibility margin but remain digest-reviewed.</en></lang>
    const trackedRoleCodepoints = parseTextCorpus(roleCorpusText);
    const sourceRoleCodepoints = faceSpec.role === 'display'
      ? collectRequiredSerifCodepoints(dataset)
      : collectRequiredSansCodepoints(dataset);
    const missingTrackedCodepoints = [...sourceRoleCodepoints].filter((codepoint) => !trackedRoleCodepoints.has(codepoint) && !sharedCodepoints.has(codepoint));
    if (missingTrackedCodepoints.length > 0) throw new Error(`Tracked corpus is stale for ${faceSpec.id}.`);

    if (
      outputDigest !== faceRecord.outputSha256
      || fontBytes.length !== faceRecord.outputBytes
      || fontBytes.length > faceSpec.maxOutputBytes
    ) throw new Error(`Output identity or budget mismatch for ${faceSpec.id}.`);

    const requiredCodepoints = unionCodepoints(trackedRoleCodepoints, sharedCodepoints);
    verifyWoff(fontBytes, faceSpec, faceRecord, requiredCodepoints);
  }

  // <lang><zh-CN>manifest face ID 必须和冻结 allowlist 完全相同，阻断未审阅的第四张字体或重复 ID。</zh-CN><en>Manifest face IDs must exactly equal the frozen allowlist, blocking an unreviewed fourth font or duplicate ID.</en></lang>
  if (facesById.size !== expectedFaces.length || expectedFaces.some((faceSpec) => !facesById.has(faceSpec.id))) {
    throw new Error('Unexpected face ID set in font manifest.');
  }
}

// <lang><zh-CN>直接执行时支持只读 corpus 诊断或完整门禁；测试导入不会自动运行。</zh-CN><en>Direct execution supports read-only corpus diagnostics or the full gate; importing from tests does not run automatically.</en></lang>
const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  if (process.argv.includes('--print-corpora')) {
    await printCanonicalCorpora();
  } else {
    await verifyFontSubsets();
    process.stdout.write('Verified 3 deterministic BP font subsets with the Node gate.\n');
  }
}
