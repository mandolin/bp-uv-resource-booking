/**
 * <lang><zh-CN>准备固定 H5 Pages 成品：确定性声明已登记原创 favicon，并写入本仓许可证、公开 NOTICE 与实际 runtime 上游许可证；只读取固定 source，只写固定 output 与其固定 `LICENSES` 子目录。</zh-CN><en>Prepares the fixed H5 Pages artifact by deterministically declaring the registered original favicon and writing this repository's license, public NOTICE, and actual runtime upstream licenses; it reads only fixed sources and writes only the fixed output and its fixed `LICENSES` child.</en></lang>
 * @lang zh-CN favicon 变换验证唯一 head、冲突声明、普通文件与 real containment；许可证文本严格解码 UTF-8、统一为 LF、验证非空与 canonical SHA-256。脚本不读取参数、环境变量或凭据，也不访问网络。
 * @lang en The favicon transform verifies a unique head, conflicting declarations, regular files, and real containment; license text is strictly decoded as UTF-8, normalized to LF, and checked for non-empty content and canonical SHA-256. The script reads no argument, environment variable, or credential and performs no network access.
 */

// <lang><zh-CN>只使用 Node 内建加密、文件与路径 API，避免成品准备引入新的 package 或执行安装脚本。</zh-CN><en>Use only Node built-in cryptography, file, and path APIs so artifact preparation adds no package or install-script execution.</en></lang>
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// <lang><zh-CN>从脚本自身位置固定仓根，不接受 cwd 或 CLI path 覆盖。</zh-CN><en>Fix the repository root from the script location and accept no cwd or CLI path override.</en></lang>
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// <lang><zh-CN>Pages artifact 只能是 Uni H5 的固定输出根，且必须由 build 预先创建。</zh-CN><en>The Pages artifact can only be the fixed Uni H5 output root and must already have been created by the build.</en></lang>
const outputRoot = resolve(repositoryRoot, 'dist/build/h5');

// <lang><zh-CN>生成后 H5 入口只能是固定 output 根的顶层 `index.html`。</zh-CN><en>The generated H5 entry can only be top-level `index.html` in the fixed output root.</en></lang>
const h5IndexPath = resolve(outputRoot, 'index.html');

// <lang><zh-CN>favicon 复用已登记原创首页选中态 SVG，不新增或复制另一份资产。</zh-CN><en>The favicon reuses the registered original active-Home SVG without adding or copying another asset.</en></lang>
const faviconAssetPath = resolve(outputRoot, 'static/icons/tab-home-active.svg');

// <lang><zh-CN>Pages 项目子路径下唯一允许的 favicon URL 与 H5 base 完全一致。</zh-CN><en>The sole allowed favicon URL uses the exact GitHub Pages project base.</en></lang>
const faviconHref = '/bp-uv-resource-booking/static/icons/tab-home-active.svg';

// <lang><zh-CN>完整 link 字面值固定属性、顺序与 URL，既用于插入也用于写后幂等复核。</zh-CN><en>The complete link literal pins attributes, order, and URL for both insertion and post-write idempotence checks.</en></lang>
const faviconLink = `<link rel="icon" type="image/svg+xml" href="${faviconHref}">`;

// <lang><zh-CN>许可证成品唯一允许的新目录是固定 output 下的 `LICENSES`。</zh-CN><en>The sole new directory allowed for license output is fixed `LICENSES` beneath the artifact root.</en></lang>
const licensesOutputRoot = resolve(outputRoot, 'LICENSES');

// <lang><zh-CN>仓内上游许可证副本只允许来自固定 `LICENSES` source 目录。</zh-CN><en>The in-repository upstream-license copy can only come from the fixed source `LICENSES` directory.</en></lang>
const licensesSourceRoot = resolve(repositoryRoot, 'LICENSES');

// <lang><zh-CN>HIA-uView source root 由父仓 Git link 固定，不从 registry 或父工作区发现。</zh-CN><en>The HIA-uView source root is fixed by a parent-repository Git link and discovered from neither a registry nor a parent workspace.</en></lang>
const hiaUViewRoot = resolve(repositoryRoot, 'src/vendor/HIA-uView');

// <lang><zh-CN>HIA-uView-Biz source root 使用另一个独立 Git link，不与 UI 路径混合。</zh-CN><en>The HIA-uView-Biz source root uses a separate Git link and is not mixed with the UI path.</en></lang>
const hiaUViewBizRoot = resolve(repositoryRoot, 'src/vendor/HIA-uView-Biz');

// <lang><zh-CN>DCloud 许可证来自当前 frozen lock 实际 materialize 的固定 UniApp package 入口。</zh-CN><en>The DCloud license comes from the fixed UniApp package entry actually materialized by the current frozen lock.</en></lang>
const dcloudUniAppRoot = resolve(repositoryRoot, 'node_modules/@dcloudio/uni-app');

// <lang><zh-CN>Vue 许可证来自同一 frozen install 的固定 runtime package 入口。</zh-CN><en>The Vue license comes from the fixed runtime package entry in the same frozen installation.</en></lang>
const vueRoot = resolve(repositoryRoot, 'node_modules/vue');

// <lang><zh-CN>严格 UTF-8 decoder 在许可证字节无效时失败，避免用替换字符生成与上游不同的法律文本。</zh-CN><en>The strict UTF-8 decoder fails on invalid license bytes so replacement characters cannot create legal text that differs from upstream.</en></lang>
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

/**
 * <lang><zh-CN>固定许可证分发清单，同时锁定 source root、source 文件名、目标区域、目标文件名与 canonical SHA-256。</zh-CN><en>Fixed license-distribution ledger pinning the source root, source filename, destination area, destination filename, and canonical SHA-256.</en></lang>
 * @lang zh-CN `THIRD_PARTY_NOTICES.md` 不能内嵌自身 digest，因此只使用运行时计算的非空 source digest 验证写后副本；其余输入都固定预期哈希。
 * @lang en `THIRD_PARTY_NOTICES.md` cannot embed its own digest, so its non-empty source digest is computed at runtime and compared with the written copy; every other input has a pinned expected hash.
 */
const distributionFiles = Object.freeze([
  Object.freeze({
    label: 'BP MIT license',
    sourceRoot: repositoryRoot,
    sourceFileName: 'LICENSE',
    destinationArea: 'root',
    destinationFileName: 'LICENSE',
    expectedSha256: 'DE0E1030000523AC27D7B3BC6A8DDE4EE67F58867AD5EDE64A65A76BF2D8848E'
  }),
  Object.freeze({
    label: 'BP third-party notice',
    sourceRoot: repositoryRoot,
    sourceFileName: 'THIRD_PARTY_NOTICES.md',
    destinationArea: 'root',
    destinationFileName: 'THIRD_PARTY_NOTICES.md',
    expectedSha256: null
  }),
  Object.freeze({
    label: 'HIA-uView MIT license',
    sourceRoot: hiaUViewRoot,
    sourceFileName: 'LICENSE',
    destinationArea: 'licenses',
    destinationFileName: 'HIA-uView-MIT.txt',
    expectedSha256: 'DE0E1030000523AC27D7B3BC6A8DDE4EE67F58867AD5EDE64A65A76BF2D8848E'
  }),
  Object.freeze({
    label: 'HIA-uView-Biz MIT license',
    sourceRoot: hiaUViewBizRoot,
    sourceFileName: 'LICENSE',
    destinationArea: 'licenses',
    destinationFileName: 'HIA-uView-Biz-MIT.txt',
    expectedSha256: 'DE0E1030000523AC27D7B3BC6A8DDE4EE67F58867AD5EDE64A65A76BF2D8848E'
  }),
  Object.freeze({
    label: 'HIA-uView third-party notice',
    sourceRoot: hiaUViewRoot,
    sourceFileName: 'THIRD_PARTY_NOTICES.md',
    destinationArea: 'licenses',
    destinationFileName: 'HIA-uView-THIRD_PARTY_NOTICES.md',
    expectedSha256: '7C6C57B870EC7ECBD20EF96700A1E4C8B4F7F00F19D395AACF36045CF827AC41'
  }),
  Object.freeze({
    label: 'uView-Pro MIT license',
    sourceRoot: licensesSourceRoot,
    sourceFileName: 'uView-Pro-MIT.txt',
    destinationArea: 'licenses',
    destinationFileName: 'uView-Pro-MIT.txt',
    expectedSha256: '906B494A3FA3B4E270BB08FC69625176E552EB0ACC922C253C4D5FBFA5544627'
  }),
  Object.freeze({
    label: 'Source Han Sans OFL-1.1 license',
    sourceRoot: licensesSourceRoot,
    sourceFileName: 'Source-Han-Sans-OFL-1.1.txt',
    destinationArea: 'licenses',
    destinationFileName: 'Source-Han-Sans-OFL-1.1.txt',
    expectedSha256: 'FCAC737E761EC63DBFBDCE11030A1780161920D80315EDBA9C8BEFF1C2BAC5A2'
  }),
  Object.freeze({
    label: 'Source Han Serif OFL-1.1 license',
    sourceRoot: licensesSourceRoot,
    sourceFileName: 'Source-Han-Serif-OFL-1.1.txt',
    destinationArea: 'licenses',
    destinationFileName: 'Source-Han-Serif-OFL-1.1.txt',
    expectedSha256: '9FF5BB567E1B92C801FC1069E5FBF992FF8EFCCACB9DB94E5959A5B3BA9BB903'
  }),
  Object.freeze({
    label: 'DCloud Apache-2.0 license',
    sourceRoot: dcloudUniAppRoot,
    sourceFileName: 'LICENSE',
    destinationArea: 'licenses',
    destinationFileName: 'DCloud-Apache-2.0.txt',
    expectedSha256: '58D1E17FFE5109A7AE296CAAFCADFDBE6A7D176F0BC4AB01E12A689B0499D8BD'
  }),
  Object.freeze({
    label: 'Vue MIT license',
    sourceRoot: vueRoot,
    sourceFileName: 'LICENSE',
    destinationArea: 'licenses',
    destinationFileName: 'Vue-MIT.txt',
    expectedSha256: '1BB85CC9B13B81EF41C81C51866172FC345E0503C86726A6755B796590B70175'
  }),
  Object.freeze({
    label: 'Vue Router MIT license',
    sourceRoot: licensesSourceRoot,
    sourceFileName: 'Vue-Router-MIT.txt',
    destinationArea: 'licenses',
    destinationFileName: 'Vue-Router-MIT.txt',
    expectedSha256: '91A2845C4DB44E7497B514B98634A674C737986AD0DB81599307CF733BF850B2'
  })
]);

/**
 * <lang><zh-CN>抛出不含本机绝对路径或文件正文的稳定准备错误。</zh-CN><en>Throws a stable preparation error containing neither a machine-absolute path nor file content.</en></lang>
 * @param {string} label <lang><zh-CN>固定清单中的公开输入标签。</zh-CN><en>Public input label from the fixed ledger.</en></lang>
 * @param {string} reason <lang><zh-CN>固定失败类别。</zh-CN><en>Stable failure category.</en></lang>
 * @returns {never} <lang><zh-CN>始终抛出。</zh-CN><en>Always throws.</en></lang>
 */
function failPreparation(label, reason) {
  // <lang><zh-CN>只拼接受控标签和类别，不传递底层文件系统错误。</zh-CN><en>Compose only the controlled label and category, never a lower-level file-system error.</en></lang>
  throw new Error(`Pages artifact preparation failed for ${label}: ${reason}.`);
}

/**
 * <lang><zh-CN>判断 canonical candidate 是否等于或位于 canonical root 内。</zh-CN><en>Determines whether a canonical candidate equals or lies beneath a canonical root.</en></lang>
 * @param {string} canonicalRoot <lang><zh-CN>已 realpath 的固定根。</zh-CN><en>Fixed root already resolved through realpath.</en></lang>
 * @param {string} canonicalCandidate <lang><zh-CN>待检查的已 realpath 路径。</zh-CN><en>Candidate path already resolved through realpath.</en></lang>
 * @returns {boolean} <lang><zh-CN>路径未逃逸固定根时为 true。</zh-CN><en>True when the path does not escape the fixed root.</en></lang>
 */
function isContainedPath(canonicalRoot, canonicalCandidate) {
  // <lang><zh-CN>relative 结果同时处理 Windows drive 与 POSIX root，避免字符串前缀混淆相邻目录。</zh-CN><en>The relative result handles both Windows drives and POSIX roots without confusing adjacent directories through string prefixes.</en></lang>
  const relativePath = relative(canonicalRoot, canonicalCandidate);

  // <lang><zh-CN>空结果表示同一路径；非绝对且不以父段开头表示真实后代。</zh-CN><en>An empty result is the same path; a non-absolute result without a leading parent segment is a real descendant.</en></lang>
  return relativePath === '' || (
    relativePath !== '..'
    && !relativePath.startsWith(`..${sep}`)
    && !isAbsolute(relativePath)
  );
}

/**
 * <lang><zh-CN>把 source 文本转为唯一 canonical LF bytes 并计算 SHA-256。</zh-CN><en>Converts source text into unique canonical LF bytes and computes SHA-256.</en></lang>
 * @param {Uint8Array} sourceBytes <lang><zh-CN>固定普通 source 文件的原始字节。</zh-CN><en>Raw bytes from the fixed regular source file.</en></lang>
 * @param {string} label <lang><zh-CN>固定公开输入标签。</zh-CN><en>Fixed public input label.</en></lang>
 * @returns {{ canonicalBytes: Uint8Array, sha256: string }} <lang><zh-CN>canonical bytes 与大写 SHA-256。</zh-CN><en>Canonical bytes and uppercase SHA-256.</en></lang>
 */
function canonicalizeLicenseText(sourceBytes, label) {
  // <lang><zh-CN>空 source 不能形成许可证或 NOTICE。</zh-CN><en>An empty source cannot form a license or NOTICE.</en></lang>
  if (sourceBytes.byteLength === 0) failPreparation(label, 'source is empty');

  // <lang><zh-CN>严格解码异常转为稳定类别，不输出原始字节或路径。</zh-CN><en>Convert strict-decoding failure into a stable category without exposing raw bytes or paths.</en></lang>
  let sourceText;
  try {
    sourceText = utf8Decoder.decode(sourceBytes);
  } catch {
    failPreparation(label, 'source is not valid UTF-8');
  }

  // <lang><zh-CN>无论 checkout 使用 CRLF、CR 或 LF，法律文本都生成相同 canonical bytes。</zh-CN><en>Whether checkout uses CRLF, CR, or LF, the legal text produces the same canonical bytes.</en></lang>
  const canonicalText = sourceText.replace(/\r\n?/gu, '\n');

  // <lang><zh-CN>纯空白文本与零字节文本同样不能作为法律声明。</zh-CN><en>Whitespace-only text, like a zero-byte file, cannot serve as a legal notice.</en></lang>
  if (canonicalText.trim().length === 0) failPreparation(label, 'source contains no legal text');

  // <lang><zh-CN>Buffer 使用无 BOM UTF-8 写入，确保 Linux CI 与 Windows 本机产物一致。</zh-CN><en>Buffer writes BOM-free UTF-8 so Linux CI and Windows-local artifacts are identical.</en></lang>
  const canonicalBytes = Buffer.from(canonicalText, 'utf8');

  // <lang><zh-CN>大写十六进制与公开 NOTICE 的固定 digest 表示保持一致。</zh-CN><en>Uppercase hexadecimal matches the pinned digest representation in the public NOTICE.</en></lang>
  const sha256 = createHash('sha256').update(canonicalBytes).digest('hex').toUpperCase();

  // <lang><zh-CN>返回新 bytes 与 digest；调用方不会持有 source Buffer 的可变引用。</zh-CN><en>Return new bytes and digest; callers retain no mutable reference to the source Buffer.</en></lang>
  return { canonicalBytes, sha256 };
}

/**
 * <lang><zh-CN>读取并验证一个固定 source 是其 real root 内的非空普通文件。</zh-CN><en>Reads and verifies that a fixed source is a non-empty regular file within its real root.</en></lang>
 * @param {{ label: string, sourceRoot: string, sourceFileName: string, destinationArea: string, destinationFileName: string, expectedSha256: string | null }} entry <lang><zh-CN>冻结清单项。</zh-CN><en>Frozen ledger entry.</en></lang>
 * @returns {Promise<{ entry: typeof entry, canonicalBytes: Uint8Array, sha256: string }>} <lang><zh-CN>已验证且 canonicalized 的清单项。</zh-CN><en>Validated and canonicalized ledger entry.</en></lang>
 */
async function readValidatedSource(entry) {
  // <lang><zh-CN>source root 可以是 pnpm 的固定 package link；realpath 后的目标必须是普通目录。</zh-CN><en>A source root may be pnpm's fixed package link; its realpath target must be a regular directory.</en></lang>
  let canonicalSourceRoot;
  try {
    canonicalSourceRoot = await realpath(entry.sourceRoot);
  } catch {
    failPreparation(entry.label, 'fixed source root is missing');
  }

  // <lang><zh-CN>canonical root 再以 lstat 验证，避免 link 链最终指向文件或特殊节点。</zh-CN><en>Verify the canonical root again with lstat so a link chain cannot terminate at a file or special node.</en></lang>
  const sourceRootStatus = await lstat(canonicalSourceRoot);
  if (!sourceRootStatus.isDirectory() || sourceRootStatus.isSymbolicLink()) {
    failPreparation(entry.label, 'fixed source root is not a real directory');
  }

  // <lang><zh-CN>source basename 来自冻结清单，并与固定 root 组合为唯一声明路径。</zh-CN><en>The source basename comes from the frozen ledger and combines with the fixed root into the sole declared path.</en></lang>
  const sourcePath = resolve(entry.sourceRoot, entry.sourceFileName);

  // <lang><zh-CN>先检查声明路径的 lexical containment，再检查解析后的 real containment。</zh-CN><en>Check lexical containment of the declared path before checking resolved real containment.</en></lang>
  if (!isContainedPath(resolve(entry.sourceRoot), sourcePath)) {
    failPreparation(entry.label, 'declared source escapes its fixed root');
  }

  // <lang><zh-CN>lstat 不接受 leaf symlink；node_modules 中合法 hard-linked 普通文件可由内容哈希继续约束。</zh-CN><en>lstat rejects a leaf symlink; a legitimate hard-linked regular file in node_modules remains constrained by its content hash.</en></lang>
  let sourceStatus;
  try {
    sourceStatus = await lstat(sourcePath);
  } catch {
    failPreparation(entry.label, 'fixed source file is missing');
  }
  if (!sourceStatus.isFile() || sourceStatus.isSymbolicLink()) {
    failPreparation(entry.label, 'fixed source is not a regular file');
  }

  // <lang><zh-CN>realpath 必须仍落在已解析 package/repository root 内。</zh-CN><en>The realpath must remain inside the resolved package/repository root.</en></lang>
  const canonicalSourcePath = await realpath(sourcePath);
  if (!isContainedPath(canonicalSourceRoot, canonicalSourcePath) || canonicalSourcePath === canonicalSourceRoot) {
    failPreparation(entry.label, 'real source escapes its fixed root');
  }

  // <lang><zh-CN>只读取已经完成类型与 containment 验证的 canonical 普通文件。</zh-CN><en>Read only the canonical regular file after type and containment validation.</en></lang>
  let sourceBytes;
  try {
    sourceBytes = await readFile(canonicalSourcePath);
  } catch {
    failPreparation(entry.label, 'fixed source cannot be read');
  }

  // <lang><zh-CN>换行归一与 digest 计算发生在任何 output 写入之前。</zh-CN><en>Newline normalization and digest calculation happen before any output write.</en></lang>
  const canonicalSource = canonicalizeLicenseText(sourceBytes, entry.label);

  // <lang><zh-CN>不可变输入必须匹配冻结哈希；自引用 NOTICE 使用本次计算 digest 做 source/destination 比较。</zh-CN><en>Immutable inputs must match their pinned hashes; the self-referential NOTICE uses its computed digest for source/destination comparison.</en></lang>
  if (entry.expectedSha256 !== null && canonicalSource.sha256 !== entry.expectedSha256) {
    failPreparation(entry.label, 'canonical SHA-256 does not match the pinned value');
  }

  // <lang><zh-CN>冻结验证结果，防止后续流程改写 entry 或 digest。</zh-CN><en>Freeze the validation result so later flow cannot rewrite the entry or digest.</en></lang>
  return Object.freeze({ entry, ...canonicalSource });
}

/**
 * <lang><zh-CN>验证 build 已创建的固定 output 是仓根内的真实目录。</zh-CN><en>Verifies that the fixed output created by the build is a real directory inside the repository root.</en></lang>
 * @returns {Promise<string>} <lang><zh-CN>已验证的 canonical output root。</zh-CN><en>Validated canonical output root.</en></lang>
 */
async function requireOutputRoot() {
  // <lang><zh-CN>仓根 canonical path 是 output containment 的唯一 authority。</zh-CN><en>The canonical repository path is the sole authority for output containment.</en></lang>
  const canonicalRepositoryRoot = await realpath(repositoryRoot);

  // <lang><zh-CN>output 缺失说明 H5 build 尚未完成；脚本不替编译器创建多级目录。</zh-CN><en>A missing output means the H5 build is incomplete; this script does not create compiler directory levels.</en></lang>
  let outputStatus;
  try {
    outputStatus = await lstat(outputRoot);
  } catch {
    failPreparation('H5 Pages output', 'fixed output root is missing');
  }

  // <lang><zh-CN>拒绝 symlink/junction 与非目录，防止固定字符串被重定向到仓外。</zh-CN><en>Reject symlinks/junctions and non-directories so the fixed string cannot redirect writes outside the repository.</en></lang>
  if (!outputStatus.isDirectory() || outputStatus.isSymbolicLink()) {
    failPreparation('H5 Pages output', 'fixed output root is not a real directory');
  }

  // <lang><zh-CN>real output 必须严格位于 real repository root 下而不是等于仓根。</zh-CN><en>The real output must lie strictly beneath the real repository root rather than equal it.</en></lang>
  const canonicalOutputRoot = await realpath(outputRoot);
  if (!isContainedPath(canonicalRepositoryRoot, canonicalOutputRoot) || canonicalOutputRoot === canonicalRepositoryRoot) {
    failPreparation('H5 Pages output', 'real output escapes the repository root');
  }

  // <lang><zh-CN>返回 canonical root 供所有 destination containment 检查复用。</zh-CN><en>Return the canonical root for every destination-containment check.</en></lang>
  return canonicalOutputRoot;
}

/**
 * <lang><zh-CN>仅创建或复用固定 output 下真实的 `LICENSES` 目录。</zh-CN><en>Creates or reuses only the real fixed `LICENSES` directory beneath the output.</en></lang>
 * @param {string} canonicalOutputRoot <lang><zh-CN>已验证的 canonical artifact root。</zh-CN><en>Validated canonical artifact root.</en></lang>
 * @returns {Promise<string>} <lang><zh-CN>已验证的 canonical LICENSES output root。</zh-CN><en>Validated canonical LICENSES output root.</en></lang>
 */
async function ensureLicensesOutputRoot(canonicalOutputRoot) {
  // <lang><zh-CN>固定 mkdir 不使用 recursive，因而不能隐式创建或越过其他目录层级。</zh-CN><en>The fixed mkdir is non-recursive, so it cannot implicitly create or cross another directory level.</en></lang>
  try {
    await mkdir(licensesOutputRoot);
  } catch (error) {
    // <lang><zh-CN>仅允许已存在状态进入后续 lstat；其他失败转换为稳定错误。</zh-CN><en>Only an already-existing state proceeds to lstat; every other failure becomes a stable error.</en></lang>
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') {
      failPreparation('LICENSES directory', 'fixed directory cannot be created');
    }
  }

  // <lang><zh-CN>即使目录刚创建，也重新 lstat 以拒绝竞争产生的 link 或特殊节点。</zh-CN><en>Even after creation, lstat again to reject a link or special node introduced by a race.</en></lang>
  const licensesStatus = await lstat(licensesOutputRoot);
  if (!licensesStatus.isDirectory() || licensesStatus.isSymbolicLink()) {
    failPreparation('LICENSES directory', 'fixed destination is not a real directory');
  }

  // <lang><zh-CN>canonical LICENSES 必须严格位于 canonical output 内。</zh-CN><en>Canonical LICENSES must lie strictly inside canonical output.</en></lang>
  const canonicalLicensesRoot = await realpath(licensesOutputRoot);
  if (!isContainedPath(canonicalOutputRoot, canonicalLicensesRoot) || canonicalLicensesRoot === canonicalOutputRoot) {
    failPreparation('LICENSES directory', 'real destination escapes the artifact root');
  }

  // <lang><zh-CN>返回唯一可用于上游许可证 destination 的 canonical 目录。</zh-CN><en>Return the sole canonical directory allowed for upstream-license destinations.</en></lang>
  return canonicalLicensesRoot;
}

/**
 * <lang><zh-CN>确认固定 destination 可以安全创建或替换为独立普通文件。</zh-CN><en>Confirms that a fixed destination can be safely created or replaced as an independent regular file.</en></lang>
 * @param {string} destinationPath <lang><zh-CN>固定 artifact destination。</zh-CN><en>Fixed artifact destination.</en></lang>
 * @param {string} canonicalDestinationRoot <lang><zh-CN>destination 所属的已验证 canonical root。</zh-CN><en>Validated canonical root owning the destination.</en></lang>
 * @param {string} label <lang><zh-CN>固定公开输入标签。</zh-CN><en>Fixed public input label.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>destination 可写时完成。</zh-CN><en>Completes when the destination is writable.</en></lang>
 */
async function requireReplaceableDestination(destinationPath, canonicalDestinationRoot, label) {
  // <lang><zh-CN>固定 basename 必须在其实际 destination root 内。</zh-CN><en>The fixed basename must remain inside its actual destination root.</en></lang>
  if (!isContainedPath(canonicalDestinationRoot, destinationPath) || destinationPath === canonicalDestinationRoot) {
    failPreparation(label, 'declared destination escapes its fixed root');
  }

  // <lang><zh-CN>首次构建允许文件不存在；其他 stat 异常不得被当作不存在。</zh-CN><en>The first build may have no destination; no other stat failure is treated as absence.</en></lang>
  let destinationStatus;
  try {
    destinationStatus = await lstat(destinationPath);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
    failPreparation(label, 'destination cannot be inspected');
  }

  // <lang><zh-CN>已有 destination 必须是 link count 为 1 的普通文件；writeFile 不得跟随 link 或改写 hardlink 同伴。</zh-CN><en>An existing destination must be a regular file whose link count is one; writeFile must neither follow a link nor rewrite a hard-link peer.</en></lang>
  if (!destinationStatus.isFile() || destinationStatus.isSymbolicLink() || destinationStatus.nlink !== 1) {
    failPreparation(label, 'existing destination is not an independent regular file');
  }

  // <lang><zh-CN>已有文件的 realpath 必须仍位于声明 destination root。</zh-CN><en>An existing file's realpath must remain inside the declared destination root.</en></lang>
  const canonicalDestinationPath = await realpath(destinationPath);
  if (!isContainedPath(canonicalDestinationRoot, canonicalDestinationPath) || canonicalDestinationPath === canonicalDestinationRoot) {
    failPreparation(label, 'existing destination escapes its fixed root');
  }
}

/**
 * <lang><zh-CN>确认一个固定 artifact 路径已存在、是 link count 为 1 的普通文件，并真实位于 output 内。</zh-CN><en>Confirms that a fixed artifact path exists, is a regular file whose link count is one, and lies physically inside the output.</en></lang>
 * @param {string} filePath <lang><zh-CN>由固定 output 与固定相对路径组成的文件。</zh-CN><en>File composed from the fixed output and a fixed relative path.</en></lang>
 * @param {string} canonicalOutputRoot <lang><zh-CN>已验证的 canonical artifact root。</zh-CN><en>Validated canonical artifact root.</en></lang>
 * @param {string} label <lang><zh-CN>不含本机路径的公开诊断标签。</zh-CN><en>Public diagnostic label containing no machine path.</en></lang>
 * @returns {Promise<string>} <lang><zh-CN>已验证文件的 canonical path。</zh-CN><en>Canonical path of the verified file.</en></lang>
 */
async function requireExistingArtifactFile(filePath, canonicalOutputRoot, label) {
  // <lang><zh-CN>声明路径必须严格位于固定 output 字符串路径之下。</zh-CN><en>The declared path must lie strictly beneath the fixed output string path.</en></lang>
  const declaredOutputRoot = resolve(outputRoot);
  const declaredFilePath = resolve(filePath);
  if (!isContainedPath(declaredOutputRoot, declaredFilePath) || declaredFilePath === declaredOutputRoot) {
    failPreparation(label, 'declared file escapes the fixed output root');
  }

  // <lang><zh-CN>lstat 拒绝缺失、symlink、目录、特殊文件与 hardlink。</zh-CN><en>lstat rejects absence, symlinks, directories, special files, and hard links.</en></lang>
  let fileStatus;
  try {
    fileStatus = await lstat(declaredFilePath);
  } catch {
    failPreparation(label, 'fixed artifact file is missing');
  }
  if (!fileStatus.isFile() || fileStatus.isSymbolicLink() || fileStatus.nlink !== 1) {
    failPreparation(label, 'fixed artifact path is not an independent regular file');
  }

  // <lang><zh-CN>realpath 必须严格保留在 canonical output 内，避免中间目录重定向。</zh-CN><en>The realpath must remain strictly inside canonical output, preventing intermediate-directory redirection.</en></lang>
  const canonicalFilePath = await realpath(declaredFilePath);
  if (!isContainedPath(canonicalOutputRoot, canonicalFilePath) || canonicalFilePath === canonicalOutputRoot) {
    failPreparation(label, 'real artifact file escapes the fixed output root');
  }

  // <lang><zh-CN>调用方只读取或覆写这个经过双重 containment 检查的路径。</zh-CN><en>Callers read or replace only this path after both containment checks.</en></lang>
  return canonicalFilePath;
}

/**
 * <lang><zh-CN>检查唯一 head 与 favicon 冲突，并规划一次确定性、幂等的 link 插入。</zh-CN><en>Checks the unique head and favicon conflicts, then plans one deterministic, idempotent link insertion.</en></lang>
 * @param {string} htmlText <lang><zh-CN>已严格解码并统一为 LF 的生成后 H5 入口。</zh-CN><en>Generated H5 entry already strictly decoded and normalized to LF.</en></lang>
 * @returns {{ changed: boolean, htmlText: string }} <lang><zh-CN>是否需写入及唯一预期 HTML。</zh-CN><en>Whether a write is needed and the sole expected HTML.</en></lang>
 */
function planFaviconDeclaration(htmlText) {
  // <lang><zh-CN>生成入口必须恰有一个 opening head；属性允许存在但不能复制 head。</zh-CN><en>The generated entry must have exactly one opening head; attributes are allowed but a duplicate head is not.</en></lang>
  const openingHeadMatches = [...htmlText.matchAll(/<head(?:\s[^>]*)?>/giu)];
  if (openingHeadMatches.length !== 1) {
    failPreparation('H5 favicon declaration', 'generated entry does not contain exactly one opening head');
  }

  // <lang><zh-CN>closing head 同样必须唯一，确保插入点没有歧义。</zh-CN><en>The closing head must likewise be unique so the insertion point is unambiguous.</en></lang>
  const closingHeadMatches = [...htmlText.matchAll(/<\/head\s*>/giu)];
  if (closingHeadMatches.length !== 1) {
    failPreparation('H5 favicon declaration', 'generated entry does not contain exactly one closing head');
  }

  // <lang><zh-CN>matchAll 的固定 HTML match 必须提供索引；空值视为结构错误。</zh-CN><en>A fixed HTML match from matchAll must provide an index; absence is a structural failure.</en></lang>
  const openingHeadIndex = openingHeadMatches[0].index;
  const closingHeadIndex = closingHeadMatches[0].index;
  if (openingHeadIndex === undefined || closingHeadIndex === undefined) {
    failPreparation('H5 favicon declaration', 'head positions are unavailable');
  }

  // <lang><zh-CN>opening match 结束位置用于证明 favicon 位于 head 内。</zh-CN><en>The end of the opening match proves that the favicon lies inside the head.</en></lang>
  const openingHeadEnd = openingHeadIndex + openingHeadMatches[0][0].length;
  if (openingHeadEnd >= closingHeadIndex) {
    failPreparation('H5 favicon declaration', 'head order is invalid');
  }

  // <lang><zh-CN>遍历所有 link，而不只搜索期望 URL，以发现其他 favicon、shortcut icon 或 touch icon 冲突。</zh-CN><en>Inspect every link, not only the expected URL, to find conflicting favicon, shortcut-icon, or touch-icon declarations.</en></lang>
  const linkMatches = [...htmlText.matchAll(/<link\b[^>]*>/giu)];

  // <lang><zh-CN>过滤任何 rel token 含独立 `icon` 段、favicon 文件名或目标 URL 的声明。</zh-CN><en>Filter declarations whose rel token contains an independent `icon` segment, whose filename is favicon, or whose URL is the target.</en></lang>
  const iconLinkMatches = linkMatches.filter((linkMatch) => {
    // <lang><zh-CN>rel 支持生成 HTML 常见的双引号、单引号或无引号形式。</zh-CN><en>Support the double-quoted, single-quoted, or unquoted rel forms common in generated HTML.</en></lang>
    const relationMatch = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu.exec(linkMatch[0]);

    // <lang><zh-CN>缺失 rel 时使用空值，仍由 href/favicon marker 捕获异常目标引用。</zh-CN><en>Use an empty value when rel is absent; href/favicon markers can still catch an abnormal target reference.</en></lang>
    const relationValue = (relationMatch?.[1] ?? relationMatch?.[2] ?? relationMatch?.[3] ?? '').toLowerCase();

    // <lang><zh-CN>以空白拆分 rel tokens，并把连字符中的独立 icon 段视为同类声明。</zh-CN><en>Split rel tokens on whitespace and treat an independent icon segment inside a hyphenated token as the same declaration class.</en></lang>
    const hasIconRelation = relationValue
      .split(/\s+/u)
      .some((token) => /(?:^|-)icon(?:-|$)/u.test(token));

    // <lang><zh-CN>目标 href 或常见 favicon 文件名即使 rel 写错，也不能绕过冲突检查。</zh-CN><en>The target href or a common favicon filename cannot bypass conflict checking through a malformed rel.</en></lang>
    const hasFaviconTarget = linkMatch[0].includes(faviconHref) || /\bfavicon\.(?:ico|png|svg)\b/iu.test(linkMatch[0]);

    // <lang><zh-CN>任一语义命中都进入唯一性与精确字面值检查。</zh-CN><en>Either semantic match enters uniqueness and exact-literal checking.</en></lang>
    return hasIconRelation || hasFaviconTarget;
  });

  // <lang><zh-CN>多个 icon link 无法确定浏览器选择顺序，必须阻断而不是删除未知声明。</zh-CN><en>Multiple icon links make browser selection ambiguous and must block rather than delete an unknown declaration.</en></lang>
  if (iconLinkMatches.length > 1) {
    failPreparation('H5 favicon declaration', 'generated entry contains conflicting icon links');
  }

  // <lang><zh-CN>已有一个 icon 时，只接受本项目固定字面值且必须位于唯一 head 内。</zh-CN><en>When one icon already exists, accept only the project-pinned literal inside the unique head.</en></lang>
  if (iconLinkMatches.length === 1) {
    // <lang><zh-CN>固定 match 索引用于验证 DOM 位置，不以全文替换猜测。</zh-CN><en>The fixed match index verifies DOM position without guessing through whole-text replacement.</en></lang>
    const iconLinkIndex = iconLinkMatches[0].index;
    if (
      iconLinkIndex === undefined
      || iconLinkIndex < openingHeadEnd
      || iconLinkIndex >= closingHeadIndex
      || iconLinkMatches[0][0] !== faviconLink
    ) {
      failPreparation('H5 favicon declaration', 'existing icon link conflicts with the pinned declaration');
    }

    // <lang><zh-CN>精确声明已经存在时返回原文，第二次 prepare 不改变任何字节。</zh-CN><en>When the exact declaration exists, return the original text so a second prepare changes no byte.</en></lang>
    return Object.freeze({ changed: false, htmlText });
  }

  // <lang><zh-CN>closing head 必须独占其行的非内容部分，固定缩进才能产生唯一跨平台输出。</zh-CN><en>The closing head must occupy only the non-content portion of its line so fixed indentation produces one cross-platform output.</en></lang>
  const closingLineBreakIndex = htmlText.lastIndexOf('\n', closingHeadIndex - 1);
  const closingLineStart = closingLineBreakIndex + 1;
  const closingIndent = htmlText.slice(closingLineStart, closingHeadIndex);
  if (!/^[ \t]*$/u.test(closingIndent)) {
    failPreparation('H5 favicon declaration', 'closing head does not have a deterministic line insertion point');
  }

  // <lang><zh-CN>favicon 使用 closing head 缩进再加两个空格，与生成入口现有 child indentation 一致。</zh-CN><en>The favicon uses the closing-head indentation plus two spaces, matching the generated entry's child indentation.</en></lang>
  const faviconLine = `${closingIndent}  ${faviconLink}\n`;

  // <lang><zh-CN>只在 closing head 行前插入一行，不改写其他 HTML、资源 hash 或 runtime 属性。</zh-CN><en>Insert exactly one line before the closing-head line without rewriting any other HTML, resource hash, or runtime attribute.</en></lang>
  const transformedHtml = `${htmlText.slice(0, closingLineStart)}${faviconLine}${htmlText.slice(closingLineStart)}`;

  // <lang><zh-CN>返回固定变换结果；调用方写后会再次运行本函数证明幂等。</zh-CN><en>Return the fixed transform; the caller reruns this function after writing to prove idempotence.</en></lang>
  return Object.freeze({ changed: true, htmlText: transformedHtml });
}

/**
 * <lang><zh-CN>验证已登记 favicon asset，并安全、幂等地更新生成后 H5 入口。</zh-CN><en>Verifies the registered favicon asset and safely, idempotently updates the generated H5 entry.</en></lang>
 * @param {string} canonicalOutputRoot <lang><zh-CN>已验证的 canonical artifact root。</zh-CN><en>Validated canonical artifact root.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>favicon 声明写入并复核完成。</zh-CN><en>Completes after the favicon declaration is written and rechecked.</en></lang>
 */
async function prepareFaviconDeclaration(canonicalOutputRoot) {
  // <lang><zh-CN>目标 SVG 必须已经由 UniApp build 复制到固定 artifact 路径；本步骤不创建资产。</zh-CN><en>The target SVG must already have been copied to the fixed artifact path by the UniApp build; this step creates no asset.</en></lang>
  const canonicalFaviconAssetPath = await requireExistingArtifactFile(
    faviconAssetPath,
    canonicalOutputRoot,
    'H5 favicon asset'
  );

  // <lang><zh-CN>非空 SVG 证明 link 不会指向零字节占位；完整 SVG 安全策略继续由 artifact gate 管理。</zh-CN><en>A non-empty SVG proves the link does not target a zero-byte placeholder; the artifact gate continues to own the complete SVG safety policy.</en></lang>
  const faviconAssetBytes = await readFile(canonicalFaviconAssetPath);
  if (faviconAssetBytes.byteLength === 0) {
    failPreparation('H5 favicon asset', 'registered asset is empty');
  }

  // <lang><zh-CN>index 必须是同一 canonical output 内的独立普通文件。</zh-CN><en>The index must be an independent regular file inside the same canonical output.</en></lang>
  const canonicalIndexPath = await requireExistingArtifactFile(
    h5IndexPath,
    canonicalOutputRoot,
    'H5 favicon declaration'
  );

  // <lang><zh-CN>读取固定入口并严格解码 UTF-8；异常不回显路径或 HTML。</zh-CN><en>Read the fixed entry and strictly decode UTF-8; failures echo neither a path nor HTML.</en></lang>
  const indexBytes = await readFile(canonicalIndexPath);
  let generatedHtml;
  try {
    generatedHtml = utf8Decoder.decode(indexBytes);
  } catch {
    failPreparation('H5 favicon declaration', 'generated entry is not valid UTF-8');
  }

  // <lang><zh-CN>空入口不能作为 Pages document，也不能安全寻找 head。</zh-CN><en>An empty entry cannot serve as a Pages document or provide a safe head insertion point.</en></lang>
  if (generatedHtml.trim().length === 0) {
    failPreparation('H5 favicon declaration', 'generated entry is empty');
  }

  // <lang><zh-CN>统一换行确保 Windows 与 Linux 构建得到完全相同的 favicon 变换。</zh-CN><en>Normalize newlines so Windows and Linux builds produce the exact same favicon transform.</en></lang>
  const canonicalGeneratedHtml = generatedHtml.replace(/\r\n?/gu, '\n');

  // <lang><zh-CN>规划函数同时验证唯一 head、冲突 link 与已有精确声明。</zh-CN><en>The planner jointly verifies the unique head, conflicting links, and an existing exact declaration.</en></lang>
  const faviconPlan = planFaviconDeclaration(canonicalGeneratedHtml);

  // <lang><zh-CN>首次插入或换行归一时才写；完全相同的第二次执行保持文件时间与字节不变。</zh-CN><en>Write only for first insertion or newline normalization; an identical second run leaves both timestamp and bytes unchanged.</en></lang>
  if (faviconPlan.changed || faviconPlan.htmlText !== generatedHtml) {
    // <lang><zh-CN>写前再次拒绝 link/hardlink，缩小检查与写入之间的状态窗口。</zh-CN><en>Reject links and hard links again before writing, narrowing the state window between inspection and replacement.</en></lang>
    await requireReplaceableDestination(canonicalIndexPath, canonicalOutputRoot, 'H5 favicon declaration');

    // <lang><zh-CN>只写入 planner 产生的唯一 UTF-8 文本，不运行 HTML 或读取外部输入。</zh-CN><en>Write only the planner's unique UTF-8 text without executing HTML or reading external input.</en></lang>
    try {
      await writeFile(canonicalIndexPath, Buffer.from(faviconPlan.htmlText, 'utf8'), { flag: 'w' });
    } catch {
      failPreparation('H5 favicon declaration', 'generated entry cannot be written');
    }
  }

  // <lang><zh-CN>写后重新执行普通文件与 real containment 检查。</zh-CN><en>Repeat the regular-file and real-containment checks after writing.</en></lang>
  const writtenIndexPath = await requireExistingArtifactFile(
    h5IndexPath,
    canonicalOutputRoot,
    'H5 favicon declaration'
  );

  // <lang><zh-CN>重新读取落盘字节，不能只信任 writeFile 或内存 plan。</zh-CN><en>Read the stored bytes again instead of trusting writeFile or the in-memory plan.</en></lang>
  const writtenIndexBytes = await readFile(writtenIndexPath);
  let writtenHtml;
  try {
    writtenHtml = utf8Decoder.decode(writtenIndexBytes);
  } catch {
    failPreparation('H5 favicon declaration', 'written entry is not valid UTF-8');
  }

  // <lang><zh-CN>落盘 HTML 必须逐字等于唯一 plan，排除截断或并发改写。</zh-CN><en>The stored HTML must equal the sole plan byte-for-byte, excluding truncation or concurrent rewriting.</en></lang>
  if (writtenHtml !== faviconPlan.htmlText) {
    failPreparation('H5 favicon declaration', 'written entry differs from the deterministic plan');
  }

  // <lang><zh-CN>写后再次规划必须返回 unchanged，证明唯一声明、正确 head 位置与幂等性。</zh-CN><en>Planning again after writing must return unchanged, proving uniqueness, correct head placement, and idempotence.</en></lang>
  const writtenPlan = planFaviconDeclaration(writtenHtml);
  if (writtenPlan.changed || writtenPlan.htmlText !== writtenHtml) {
    failPreparation('H5 favicon declaration', 'written entry is not idempotent');
  }
}

/**
 * <lang><zh-CN>写入一个 canonical 许可证文件并复核类型、containment 与 digest。</zh-CN><en>Writes one canonical license file and rechecks its type, containment, and digest.</en></lang>
 * @param {{ entry: { label: string, destinationFileName: string }, canonicalBytes: Uint8Array, sha256: string }} validatedSource <lang><zh-CN>已验证 source 描述。</zh-CN><en>Validated source descriptor.</en></lang>
 * @param {string} canonicalDestinationRoot <lang><zh-CN>该文件唯一允许的 canonical destination root。</zh-CN><en>Sole canonical destination root allowed for the file.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>写入与复核完成。</zh-CN><en>Completes after writing and rechecking.</en></lang>
 */
async function writeValidatedDestination(validatedSource, canonicalDestinationRoot) {
  // <lang><zh-CN>destination basename 来自冻结清单，不接受 source、CLI 或环境覆盖。</zh-CN><en>The destination basename comes from the frozen ledger and accepts no source, CLI, or environment override.</en></lang>
  const destinationPath = resolve(canonicalDestinationRoot, validatedSource.entry.destinationFileName);

  // <lang><zh-CN>任何写入前先拒绝 link、hardlink 与路径逃逸。</zh-CN><en>Reject links, hard links, and path escape before any write.</en></lang>
  await requireReplaceableDestination(destinationPath, canonicalDestinationRoot, validatedSource.entry.label);

  // <lang><zh-CN>只把内存中的 canonical LF bytes 写入固定目标，不 raw-copy checkout 换行。</zh-CN><en>Write only in-memory canonical LF bytes to the fixed target instead of raw-copying checkout newlines.</en></lang>
  try {
    await writeFile(destinationPath, validatedSource.canonicalBytes, { flag: 'w' });
  } catch {
    failPreparation(validatedSource.entry.label, 'canonical destination cannot be written');
  }

  // <lang><zh-CN>写后 lstat 再次证明目标是独立普通文件。</zh-CN><en>A post-write lstat proves again that the target is an independent regular file.</en></lang>
  const destinationStatus = await lstat(destinationPath);
  if (!destinationStatus.isFile() || destinationStatus.isSymbolicLink() || destinationStatus.nlink !== 1) {
    failPreparation(validatedSource.entry.label, 'written destination is not an independent regular file');
  }

  // <lang><zh-CN>写后 real containment 防止目标在检查与写入之间被重定向。</zh-CN><en>Post-write real containment detects redirection between checking and writing.</en></lang>
  const canonicalDestinationPath = await realpath(destinationPath);
  if (!isContainedPath(canonicalDestinationRoot, canonicalDestinationPath) || canonicalDestinationPath === canonicalDestinationRoot) {
    failPreparation(validatedSource.entry.label, 'written destination escapes its fixed root');
  }

  // <lang><zh-CN>重新读取成品而不是信任 writeFile 返回，证明落盘字节等于已验证 source。</zh-CN><en>Read the artifact back instead of trusting writeFile's return, proving the stored bytes equal the validated source.</en></lang>
  const writtenBytes = await readFile(canonicalDestinationPath);
  const writtenCanonical = canonicalizeLicenseText(writtenBytes, validatedSource.entry.label);
  if (writtenCanonical.sha256 !== validatedSource.sha256) {
    failPreparation(validatedSource.entry.label, 'written SHA-256 differs from the source');
  }
}

/**
 * <lang><zh-CN>验证全部 source 后，声明固定 favicon，仅创建固定 LICENSES 目录并写入完整许可证清单。</zh-CN><en>After validating every source, declares the fixed favicon, creates only the fixed LICENSES directory, and writes the complete license ledger.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>favicon 与全部固定许可文件准备完成信号。</zh-CN><en>Completion signal after the favicon and every fixed legal file are prepared.</en></lang>
 */
async function preparePagesArtifact() {
  // <lang><zh-CN>output containment 在 source 读取与任何 destination 写入前确定。</zh-CN><en>Establish output containment before source reading or any destination write.</en></lang>
  const canonicalOutputRoot = await requireOutputRoot();

  // <lang><zh-CN>先验证完整 source 集，避免许可证缺失或哈希漂移时生成半套新载荷。</zh-CN><en>Validate the complete source set first so a missing license or hash drift cannot create a partially new payload.</en></lang>
  const validatedSources = [];
  for (const entry of distributionFiles) {
    // <lang><zh-CN>每个结果都只来自冻结清单与固定 source。</zh-CN><en>Every result comes only from the frozen ledger and fixed source.</en></lang>
    validatedSources.push(await readValidatedSource(entry));
  }

  // <lang><zh-CN>许可证 source 全部合格后，再对生成入口执行唯一固定 favicon 变换。</zh-CN><en>Only after every license source is eligible, apply the sole fixed favicon transform to the generated entry.</en></lang>
  await prepareFaviconDeclaration(canonicalOutputRoot);

  // <lang><zh-CN>source 全部通过后才创建唯一允许的子目录。</zh-CN><en>Create the sole allowed child directory only after every source passes.</en></lang>
  const canonicalLicensesOutputRoot = await ensureLicensesOutputRoot(canonicalOutputRoot);

  // <lang><zh-CN>按冻结清单顺序写入，便于稳定诊断首个失败项。</zh-CN><en>Write in frozen-ledger order for deterministic first-failure diagnostics.</en></lang>
  for (const validatedSource of validatedSources) {
    // <lang><zh-CN>即使清单由本模块冻结，也显式拒绝未来误写的第三种 destination area。</zh-CN><en>Even though this module freezes the ledger, explicitly reject a future accidental third destination area.</en></lang>
    if (!['root', 'licenses'].includes(validatedSource.entry.destinationArea)) {
      failPreparation(validatedSource.entry.label, 'destination area is not allowed');
    }

    // <lang><zh-CN>只有 `root` 与 `licenses` 两个冻结区域；非 root 项只能进入固定 LICENSES。</zh-CN><en>The frozen areas are only `root` and `licenses`; every non-root entry can enter only fixed LICENSES.</en></lang>
    const canonicalDestinationRoot = validatedSource.entry.destinationArea === 'root'
      ? canonicalOutputRoot
      : canonicalLicensesOutputRoot;

    // <lang><zh-CN>写入 helper 对每个 destination 重复类型、containment 与 digest 复核。</zh-CN><en>The write helper repeats type, containment, and digest checks for every destination.</en></lang>
    await writeValidatedDestination(validatedSource, canonicalDestinationRoot);
  }
}

// <lang><zh-CN>直接执行入口捕获所有错误，只输出稳定摘要而不打印含本机路径的 stack。</zh-CN><en>The direct entry catches every error and prints only a stable summary rather than a stack containing machine paths.</en></lang>
try {
  await preparePagesArtifact();
} catch (error) {
  // <lang><zh-CN>脚本内部错误使用受控 message；未知异常折叠为固定类别。</zh-CN><en>Internal script errors use their controlled message; unknown exceptions collapse to a fixed category.</en></lang>
  const failureMessage = error instanceof Error && error.message.startsWith('Pages artifact preparation failed for ')
    ? error.message
    : 'Pages artifact preparation failed for artifact: unknown failure.';

  // <lang><zh-CN>stderr 只包含公开标签与失败类别，CI 可据退出码阻断上传。</zh-CN><en>stderr contains only a public label and failure category, while CI blocks upload through the exit code.</en></lang>
  console.error(failureMessage);
  process.exitCode = 1;
}
