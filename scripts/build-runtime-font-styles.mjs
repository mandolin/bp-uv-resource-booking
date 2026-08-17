/**
 * <lang><zh-CN>从三份已审计 WOFF 与 provenance manifest 确定性生成 H5 相对 URL 和微信 Data URL 两份 runtime `@font-face` SCSS。</zh-CN><en>Deterministically generates H5 relative-URL and WeChat Data-URL runtime `@font-face` SCSS from three audited WOFF files and their provenance manifest.</en></lang>
 * @lang zh-CN 默认模式原子写入两个固定输出；`--verify-only` 只重建内存字节并比较，不写文件。脚本不访问网络、用户目录、凭据或任意路径。
 * @lang en Default mode atomically writes two fixed outputs; `--verify-only` rebuilds bytes in memory and compares without writing. The script accesses no network, user directory, credential, or arbitrary path.
 */

// <lang><zh-CN>只使用 Node 内建哈希、文件和路径 API；不把字体维护依赖带入 runtime 样式生成。</zh-CN><en>Use only built-in Node digest, file, and path APIs; the font maintenance dependency never enters runtime-style generation.</en></lang>
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// <lang><zh-CN>复用完整字体门禁，确保样式生成前 manifest locator、输入摘要、主字体名、许可与 cmap 已通过。</zh-CN><en>Reuse the complete font gate so manifest locators, input digests, primary names, licenses, and cmap pass before style generation.</en></lang>
import { verifyFontSubsets } from './verify-font-subsets.mjs';

// <lang><zh-CN>所有路径从脚本 URL 和冻结仓内相对路径解析；调用者 cwd 与 CLI 均不能重定向输入输出。</zh-CN><en>Every path resolves from the script URL and frozen in-repository relatives; neither caller cwd nor CLI can redirect input or output.</en></lang>
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(projectRoot, 'src/assets/fonts/font-subsets.manifest.json');
const fontAssetRoot = resolve(projectRoot, 'src/assets/fonts');
const styleRoot = resolve(projectRoot, 'src/styles');

/**
 * <lang><zh-CN>锁定两份生成样式的唯一文件名与交付模式。</zh-CN><en>Locks the sole filenames and delivery modes of the two generated stylesheets.</en></lang>
 * @lang zh-CN 主任务只需通过 UniApp 条件 import 选择其中一份；本生成器不修改 `uni.scss` 或构建配置。
 * @lang en The main task only needs a UniApp conditional import selecting one file; this generator modifies neither `uni.scss` nor build configuration.
 */
export const runtimeFontStyleOutputs = Object.freeze({
  h5: Object.freeze({
    mode: 'h5-relative-url',
    path: resolve(styleRoot, 'runtime-font-faces-h5.scss')
  }),
  mpWeixin: Object.freeze({
    mode: 'mp-weixin-data-url',
    path: resolve(styleRoot, 'runtime-font-faces-mp-weixin.scss')
  })
});

/**
 * <lang><zh-CN>锁定三个允许进入 runtime 样式的 face 顺序、身份和物理输入文件。</zh-CN><en>Locks order, identity, and physical input file for the three faces allowed into runtime styles.</en></lang>
 * @lang zh-CN manifest 可以证明这些输入，但不能新增第四张字体、改变 family/weight 或决定读取路径。
 * @lang en The manifest can prove these inputs but cannot add a fourth font, change family/weight, or choose a read path.
 */
const expectedFaces = Object.freeze([
  Object.freeze({
    id: 'sans-regular',
    family: 'HIA-uView BP Sans SC',
    style: 'normal',
    weight: 400,
    outputFile: 'hia-uv-bp-sans-sc-regular-v2.005-subset.woff'
  }),
  Object.freeze({
    id: 'sans-bold',
    family: 'HIA-uView BP Sans SC',
    style: 'normal',
    weight: 700,
    outputFile: 'hia-uv-bp-sans-sc-bold-v2.005-subset.woff'
  }),
  Object.freeze({
    id: 'serif-bold',
    family: 'HIA-uView BP Serif SC',
    style: 'normal',
    weight: 700,
    outputFile: 'hia-uv-bp-serif-sc-bold-v2.003-subset.woff'
  })
]);

/**
 * <lang><zh-CN>计算有限 Buffer 的 SHA-256 小写十六进制，用于把 manifest 声明绑定到实际 WOFF 字节。</zh-CN><en>Computes lowercase hexadecimal SHA-256 for a finite Buffer, binding manifest declarations to actual WOFF bytes.</en></lang>
 * @param {Buffer} bytes <lang><zh-CN>仓内 WOFF 或生成样式字节。</zh-CN><en>In-repository WOFF or generated-style bytes.</en></lang>
 * @returns {string} <lang><zh-CN>64 字符内容摘要。</zh-CN><en>64-character content digest.</en></lang>
 * @lang zh-CN 函数不读取文件或状态；调用方负责固定输入路径和大小边界。
 * @lang en The function reads no file or state; callers own fixed input paths and size boundaries.
 */
function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * <lang><zh-CN>读取 manifest 与三份固定 WOFF，并在完整字体门禁后再次逐 face 绑定身份、路径、大小和摘要。</zh-CN><en>Reads the manifest and three fixed WOFF files, then rebinds identity, path, size, and digest per face after the complete font gate.</en></lang>
 * @returns {Promise<Array<object>>} <lang><zh-CN>按冻结顺序排列、携带已验证字节的 face 输入。</zh-CN><en>Face inputs in frozen order carrying verified bytes.</en></lang>
 * @lang zh-CN 所有文件路径来自 expectedFaces；manifest 的 outputPath 仅用于比较，绝不用于文件系统解析。
 * @lang en Every file path comes from expectedFaces; manifest outputPath is compared only and never used for filesystem resolution.
 */
async function readVerifiedFaceInputs() {
  // <lang><zh-CN>先执行完整只读门禁，使任何 manifest 自指路径、许可、corpus 或 WOFF 语义问题在读取样式输入前失败。</zh-CN><en>Run the complete read-only gate first so any manifest self-path, license, corpus, or WOFF semantic issue fails before style inputs are read.</en></lang>
  await verifyFontSubsets();

  // <lang><zh-CN>manifest 只从固定路径解码为普通对象；无动态 import 或执行字段。</zh-CN><en>Decode the manifest from one fixed path into a plain object; no field is dynamically imported or executed.</en></lang>
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const facesById = new Map(manifest.faces.map((faceRecord) => [faceRecord.id, faceRecord]));

  // <lang><zh-CN>严格三个唯一 ID 防止重复项覆盖 Map 后仍通过逐项查找。</zh-CN><en>Exactly three unique IDs prevent duplicate records from overwriting a Map entry while still passing per-item lookup.</en></lang>
  if (facesById.size !== expectedFaces.length || manifest.faces.length !== expectedFaces.length) {
    throw new Error('Unexpected runtime font face set in provenance manifest.');
  }

  // <lang><zh-CN>Promise.all 只并行读取三个固定小型 WOFF；返回数组仍保持 expectedFaces 的稳定顺序。</zh-CN><en>Promise.all reads only three fixed small WOFF files in parallel; the returned array retains expectedFaces order.</en></lang>
  return Promise.all(expectedFaces.map(async (faceSpec) => {
    const faceRecord = facesById.get(faceSpec.id);
    if (!faceRecord) throw new Error(`Missing runtime font face ${faceSpec.id}.`);

    // <lang><zh-CN>路径和 font metadata 必须逐字段匹配固定合同；只改 manifest 不能改变样式语义。</zh-CN><en>Path and font metadata must match the frozen contract field by field; changing only the manifest cannot alter stylesheet semantics.</en></lang>
    const expectedOutputPath = `src/assets/fonts/${faceSpec.outputFile}`;
    if (
      faceRecord.outputPath !== expectedOutputPath
      || faceRecord.cssFamily !== faceSpec.family
      || faceRecord.fontStyle !== faceSpec.style
      || faceRecord.fontWeight !== faceSpec.weight
      || faceRecord.format !== 'woff'
      || faceRecord.mimeType !== 'font/woff'
    ) throw new Error(`Unexpected runtime font metadata for ${faceSpec.id}.`);

    // <lang><zh-CN>实际输入路径由固定 basename 组成；读取后同时检查长度和 SHA，避免同名替换。</zh-CN><en>The actual input path uses a fixed basename; both length and SHA are checked after reading to prevent same-name replacement.</en></lang>
    const fontPath = resolve(fontAssetRoot, faceSpec.outputFile);
    const fontBytes = await readFile(fontPath);
    if (fontBytes.length !== faceRecord.outputBytes || sha256Bytes(fontBytes) !== faceRecord.outputSha256) {
      throw new Error(`Runtime font input digest mismatch for ${faceSpec.id}.`);
    }

    return Object.freeze({ faceSpec, faceRecord, fontBytes });
  }));
}

/**
 * <lang><zh-CN>为一个目标生成稳定文件头，说明生成所有权、平台 locator 和人工修改边界。</zh-CN><en>Generates a stable file header for one target, documenting generation ownership, platform locator, and manual-edit boundary.</en></lang>
 * @param {'h5-relative-url'|'mp-weixin-data-url'} deliveryMode <lang><zh-CN>冻结目标模式。</zh-CN><en>Frozen target mode.</en></lang>
 * @returns {string} <lang><zh-CN>以换行结束的合法 SCSS 双语注释。</zh-CN><en>Valid bilingual SCSS comment ending in a newline.</en></lang>
 * @lang zh-CN 注释不含本机路径、网络 URL 或时间戳，确保输出可逐字节重建。
 * @lang en The comment contains no machine path, network URL, or timestamp, preserving byte-for-byte reconstruction.
 */
function renderFileHeader(deliveryMode) {
  const targetDescription = deliveryMode === 'h5-relative-url'
    ? 'H5 uses relative project-owned WOFF locators that Vite emits as same-origin assets.'
    : 'WeChat uses project-owned WOFF bytes embedded as Data URLs for the DevTools demonstration target.';

  return [
    '/**',
    ' * @lang zh-CN 此文件由 scripts/build-runtime-font-styles.mjs 根据已锁 WOFF 与 provenance 确定性生成；禁止手工编辑，修改输入后应重建并运行专项门禁。',
    ' * @lang en This file is generated deterministically by scripts/build-runtime-font-styles.mjs from pinned WOFF files and provenance; do not edit it manually, and rebuild plus run the dedicated gate after changing inputs.',
    ` * @lang zh-CN 平台交付模式：${deliveryMode === 'h5-relative-url' ? 'H5 使用项目内相对 WOFF locator，由 Vite 输出同源资产。' : '微信使用项目内 WOFF 字节生成 Data URL，仅面向当前开发者工具演示范围。'}`,
    ` * @lang en Delivery mode: ${targetDescription}`,
    ' */',
    ''
  ].join('\n');
}

/**
 * <lang><zh-CN>按目标平台为单个 face 构造唯一允许的 `src` locator。</zh-CN><en>Builds the sole allowed `src` locator for one face on a target platform.</en></lang>
 * @param {object} faceInput <lang><zh-CN>携带固定身份、manifest 记录与已验证 WOFF 字节的输入。</zh-CN><en>Input carrying frozen identity, manifest record, and verified WOFF bytes.</en></lang>
 * @param {'h5-relative-url'|'mp-weixin-data-url'} deliveryMode <lang><zh-CN>目标 locator 模式。</zh-CN><en>Target locator mode.</en></lang>
 * @returns {string} <lang><zh-CN>不带尾随分号的 CSS `url(...) format(...)` 值。</zh-CN><en>CSS `url(...) format(...)` value without a trailing semicolon.</en></lang>
 * @lang zh-CN H5 locator 从 UniApp 内联样式的 `src/App.vue` 解析基准指向固定 `src/assets/fonts` basename；微信 base64 由同一已验证 Buffer 直接编码，不重新读取或转换字体。
 * @lang en The H5 locator points from UniApp's inlined-style `src/App.vue` resolution base to the fixed `src/assets/fonts` basename; WeChat base64 is encoded directly from the same verified Buffer without rereading or transforming the font.
 */
function renderSourceLocator(faceInput, deliveryMode) {
  if (deliveryMode === 'h5-relative-url') {
    return `url("./assets/fonts/${faceInput.faceSpec.outputFile}") format("woff")`;
  }

  return `url("data:font/woff;base64,${faceInput.fontBytes.toString('base64')}") format("woff")`;
}

/**
 * <lang><zh-CN>渲染一张带 provenance 双语注释的 `@font-face`，属性顺序和空白均属于确定性输出合同。</zh-CN><en>Renders one `@font-face` with a bilingual provenance comment; property order and whitespace are part of the deterministic output contract.</en></lang>
 * @param {object} faceInput <lang><zh-CN>已验证 face 输入。</zh-CN><en>Verified face input.</en></lang>
 * @param {'h5-relative-url'|'mp-weixin-data-url'} deliveryMode <lang><zh-CN>目标 locator 模式。</zh-CN><en>Target locator mode.</en></lang>
 * @returns {string} <lang><zh-CN>以一个空行结尾的完整 SCSS 片段。</zh-CN><en>Complete SCSS fragment ending in one blank line.</en></lang>
 * @lang zh-CN `font-display: swap` 允许 fallback 先呈现；视觉自动化由主任务的 font-ready 门禁等待实际 face。
 * @lang en `font-display: swap` permits initial fallback rendering; the main task's font-ready gate waits for actual faces in visual automation.
 */
function renderFontFace(faceInput, deliveryMode) {
  const { faceSpec, faceRecord } = faceInput;
  const sourceLocator = renderSourceLocator(faceInput, deliveryMode);

  return [
    `/* @lang zh-CN ${faceSpec.id} 使用经审计的项目字体名、${faceSpec.weight} 字重和 WOFF 摘要 ${faceRecord.outputSha256}；OFL 许可与上游 provenance 由 font-subsets.manifest.json 绑定。 */`,
    `/* @lang en ${faceSpec.id} uses the audited project family, weight ${faceSpec.weight}, and WOFF digest ${faceRecord.outputSha256}; font-subsets.manifest.json binds OFL licensing and upstream provenance. */`,
    '@font-face {',
    `  font-family: "${faceSpec.family}";`,
    `  font-style: ${faceSpec.style};`,
    `  font-weight: ${faceSpec.weight};`,
    '  font-display: swap;',
    `  src: ${sourceLocator};`,
    '}',
    ''
  ].join('\n');
}

/**
 * <lang><zh-CN>在内存中重建两份完整 SCSS，使构建与只读验证共享唯一渲染逻辑。</zh-CN><en>Rebuilds both complete SCSS outputs in memory so build and read-only verification share one rendering path.</en></lang>
 * @param {Array<object>} faceInputs <lang><zh-CN>按冻结顺序排列的三个已验证 face。</zh-CN><en>Three verified faces in frozen order.</en></lang>
 * @returns {{ h5: string, mpWeixin: string }} <lang><zh-CN>两个以 LF 结尾的确定性 UTF-8 文本。</zh-CN><en>Two deterministic UTF-8 texts ending in LF.</en></lang>
 * @lang zh-CN 函数不读取文件或平台环境；目标差异仅存在于 header 描述和 `src` locator。
 * @lang en The function reads no file or platform environment; target differences exist only in header description and `src` locator.
 */
function renderRuntimeFontStyles(faceInputs) {
  // <lang><zh-CN>分别以固定 header 开始，再按同一 face 顺序追加规则，避免两个目标的 family/weight 漂移。</zh-CN><en>Start with fixed headers and append rules in the same face order, preventing family/weight drift between targets.</en></lang>
  const h5Fragments = [renderFileHeader(runtimeFontStyleOutputs.h5.mode)];
  const mpWeixinFragments = [renderFileHeader(runtimeFontStyleOutputs.mpWeixin.mode)];

  for (const faceInput of faceInputs) {
    h5Fragments.push(renderFontFace(faceInput, runtimeFontStyleOutputs.h5.mode));
    mpWeixinFragments.push(renderFontFace(faceInput, runtimeFontStyleOutputs.mpWeixin.mode));
  }

  return Object.freeze({
    h5: h5Fragments.join(''),
    mpWeixin: mpWeixinFragments.join('')
  });
}

/**
 * <lang><zh-CN>将一个生成文本通过同目录临时文件原子提升到固定目标，并清理失败临时文件。</zh-CN><en>Promotes one generated text atomically through a same-directory temporary file and cleans a failed temporary file.</en></lang>
 * @param {string} outputPath <lang><zh-CN>来自 runtimeFontStyleOutputs 的固定路径。</zh-CN><en>Fixed path from runtimeFontStyleOutputs.</en></lang>
 * @param {string} outputText <lang><zh-CN>已在内存确定的 UTF-8 SCSS。</zh-CN><en>UTF-8 SCSS already determined in memory.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>目标替换完成后 resolve。</zh-CN><en>Resolves after target replacement.</en></lang>
 * @lang zh-CN 临时路径只在固定目标后追加 `.tmp`；函数不接受 CLI 路径，也不删除其他文件。
 * @lang en The temporary path only appends `.tmp` to the fixed target; the function accepts no CLI path and deletes no other file.
 */
async function writeGeneratedStyle(outputPath, outputText) {
  const temporaryPath = `${outputPath}.tmp`;
  await mkdir(dirname(outputPath), { recursive: true });

  try {
    // <lang><zh-CN>显式 UTF-8 写入已经包含 LF 的文本，不让宿主平台转换换行。</zh-CN><en>Write the LF-containing text explicitly as UTF-8 without host-platform line-ending conversion.</en></lang>
    await writeFile(temporaryPath, outputText, 'utf8');
    await rename(temporaryPath, outputPath);
  } finally {
    // <lang><zh-CN>`force` 只容忍成功 rename 后临时路径不存在；清理目标仍是固定 `.tmp`。</zh-CN><en>`force` only tolerates an absent temporary path after successful rename; cleanup remains bounded to the fixed `.tmp`.</en></lang>
    await rm(temporaryPath, { force: true });
  }
}

/**
 * <lang><zh-CN>生成并原子写入 H5 与微信两份 runtime font-face SCSS。</zh-CN><en>Generates and atomically writes H5 and WeChat runtime font-face SCSS.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>两个目标均写入后 resolve。</zh-CN><en>Resolves after both targets are written.</en></lang>
 * @lang zh-CN 两份文本先全部在内存构造，再顺序写入；任何输入验证失败都发生在首次输出写入前。
 * @lang en Both texts are fully constructed in memory before sequential writes; every input-verification failure occurs before the first output write.
 */
export async function buildRuntimeFontStyles() {
  const faceInputs = await readVerifiedFaceInputs();
  const renderedStyles = renderRuntimeFontStyles(faceInputs);
  await writeGeneratedStyle(runtimeFontStyleOutputs.h5.path, renderedStyles.h5);
  await writeGeneratedStyle(runtimeFontStyleOutputs.mpWeixin.path, renderedStyles.mpWeixin);
}

/**
 * <lang><zh-CN>只读重建两份期望 SCSS，并要求仓内文件逐字节完全相同。</zh-CN><en>Rebuilds both expected SCSS outputs read-only and requires byte-for-byte equality with in-repository files.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>两个输出均与重建字节一致后 resolve。</zh-CN><en>Resolves after both outputs equal rebuilt bytes.</en></lang>
 * @lang zh-CN 比较 Buffer 而非规范化文本，能发现换行、空白、注释或 base64 的任何未生成改动。
 * @lang en Buffer comparison, rather than normalized text, detects every non-generated line-ending, whitespace, comment, or base64 change.
 */
export async function verifyRuntimeFontStyles() {
  const faceInputs = await readVerifiedFaceInputs();
  const renderedStyles = renderRuntimeFontStyles(faceInputs);

  // <lang><zh-CN>固定目标与内存 key 显式配对，不遍历 styles 目录或接受额外生成文件。</zh-CN><en>Pair fixed targets with in-memory keys explicitly; do not scan the styles directory or accept an extra generated file.</en></lang>
  const expectedByOutputPath = new Map([
    [runtimeFontStyleOutputs.h5.path, renderedStyles.h5],
    [runtimeFontStyleOutputs.mpWeixin.path, renderedStyles.mpWeixin]
  ]);

  for (const [outputPath, expectedText] of expectedByOutputPath) {
    const observedBytes = await readFile(outputPath);
    const expectedBytes = Buffer.from(expectedText, 'utf8');
    if (!observedBytes.equals(expectedBytes)) {
      throw new Error(`Runtime font style is not reproducible: ${basename(outputPath)}.`);
    }
  }
}

/**
 * <lang><zh-CN>执行唯一 CLI：无参数生成，`--verify-only` 只读验证；拒绝其他参数以保持边界有限。</zh-CN><en>Runs the sole CLI: no argument generates and `--verify-only` verifies read-only; every other argument is rejected to keep the boundary finite.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>操作完成后 resolve，异常保留非零退出码。</zh-CN><en>Resolves after completion, while exceptions retain a nonzero exit code.</en></lang>
 * @lang zh-CN CLI 不接受输入、输出、URL、family 或字重覆盖；所有可变事实来自已审计仓内文件。
 * @lang en The CLI accepts no input, output, URL, family, or weight override; every variable fact comes from audited in-repository files.
 */
async function main() {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.length === 0) {
    await buildRuntimeFontStyles();
    process.stdout.write('Generated deterministic H5 and WeChat runtime font styles.\n');
    return;
  }

  if (argumentsList.length === 1 && argumentsList[0] === '--verify-only') {
    await verifyRuntimeFontStyles();
    process.stdout.write('Verified deterministic H5 and WeChat runtime font styles.\n');
    return;
  }

  throw new Error('Usage: node scripts/build-runtime-font-styles.mjs [--verify-only]');
}

// <lang><zh-CN>仅直接执行脚本时运行 CLI；测试导入公开函数不会生成或修改文件。</zh-CN><en>Run the CLI only when the script is executed directly; tests importing public functions generate or modify no file.</en></lang>
const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) await main();
