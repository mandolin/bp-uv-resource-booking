/**
 * <lang><zh-CN>验证 BP 显式关闭 Uni Statistics，并验证 H5 或微信小程序最终文本产物不含已知 DCloud 统计采集端点与初始化标记。</zh-CN><en>Verifies that the BP explicitly disables Uni Statistics and that final H5 or WeChat Mini Program text artifacts contain no known DCloud statistics collector endpoint or initialization marker.</en></lang>
 * @lang zh-CN 此脚本只读取固定 manifest 与固定构建目录；它不启动应用、不发送网络请求、不执行产物，也不读取环境秘密或用户数据。
 * @lang en This script reads only the fixed manifest and fixed build directories; it does not start the app, send network requests, execute artifacts, or read environment secrets or user data.
 */

// <lang><zh-CN>只使用 Node 内建文件、路径和 URL API，避免为隐私门禁引入新的供应链输入。</zh-CN><en>Use only Node built-in file, path, and URL APIs so the privacy gate introduces no new supply-chain input.</en></lang>
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// <lang><zh-CN>从脚本自身位置解析固定仓根，调用方 cwd 不能改变检查边界。</zh-CN><en>Resolve the fixed repository root from the script location so caller cwd cannot change the inspection boundary.</en></lang>
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// <lang><zh-CN>manifest 是统计开关的唯一源码事实，固定路径避免扫描或接受任意输入文件。</zh-CN><en>The manifest is the sole source fact for the statistics switch; its fixed path avoids scanning or accepting arbitrary input files.</en></lang>
const manifestPath = resolve(repositoryRoot, 'src/manifest.json');

// <lang><zh-CN>只支持源码门禁与两个已发布构建目标；固定映射阻止 CLI 参数变成任意文件系统路径。</zh-CN><en>Support only the source gate and two shipped build targets; the fixed mapping prevents a CLI argument from becoming an arbitrary file-system path.</en></lang>
const outputRoots = Object.freeze({
  h5: resolve(repositoryRoot, 'dist/build/h5'),
  'mp-weixin': resolve(repositoryRoot, 'dist/build/mp-weixin')
});

// <lang><zh-CN>平台局部统计设置可能覆盖根级关闭，因此同时审计两个实际目标与 DCloud 的 web 别名。</zh-CN><en>A platform-local statistics setting can override the root disablement, so inspect both actual targets and DCloud's web alias.</en></lang>
const platformManifestKeys = Object.freeze(['h5', 'web', 'mp-weixin']);

// <lang><zh-CN>只读取可能承载编译代码、配置、模板或样式的文本扩展名；二进制资产不作不可靠的 UTF-8 猜测。</zh-CN><en>Read only text extensions that can carry compiled code, configuration, templates, or styles; do not make unreliable UTF-8 guesses about binary assets.</en></lang>
const auditableTextExtensions = new Set(['.js', '.mjs', '.cjs', '.json', '.html', '.css', '.wxml', '.wxss', '.map']);

// <lang><zh-CN>这些标记覆盖锁定 DCloud 编译链当前注入的采集端点、接收器、配置、队列和 runtime banner；label 只用于受限错误输出。</zh-CN><en>These markers cover collector endpoints, receiver, configuration, queue, and runtime banner injected by the pinned DCloud compiler chain; labels are used only in bounded errors.</en></lang>
const forbiddenTelemetryMarkers = Object.freeze([
  Object.freeze({ label: 'DCloud statistics collector endpoint', pattern: /tongji\.dcloud\.io\/uni\/stat(?:\.gif)?/iu }),
  Object.freeze({ label: 'DCloud statistics collector host', pattern: /tongji-collector\.dcloud\.net\.cn/iu }),
  Object.freeze({ label: 'DCloud Uni Statistics runtime marker', pattern: /\buni-(?:cloud-)?stat(?:-public|-receiver)?\b/iu }),
  Object.freeze({ label: 'DCloud UniCloud statistics space marker', pattern: /__stat_unicloud_space/iu }),
  Object.freeze({ label: 'DCloud Uni Statistics configuration marker', pattern: /UNI_STATISTICS_CONFIG/u }),
  Object.freeze({ label: 'DCloud Uni Statistics queue marker', pattern: /\$\$STAT__DBDATA/u }),
  Object.freeze({ label: 'DCloud Uni Statistics initialization banner', pattern: /uni统计\s*2\.0/iu })
]);

/**
 * <lang><zh-CN>验证 manifest 根级关闭统计，且任何存在的平台局部设置都不能重新开启或留下不确定值。</zh-CN><en>Verifies that the manifest disables statistics at the root and that any present platform-local setting cannot re-enable it or leave an indeterminate value.</en></lang>
 * @param {unknown} manifest <lang><zh-CN>已解析的受版本控制 manifest 值。</zh-CN><en>Parsed version-controlled manifest value.</en></lang>
 * @returns {void} <lang><zh-CN>边界成立时正常返回。</zh-CN><en>Returns normally when the boundary holds.</en></lang>
 * @lang zh-CN 根级 `false` 是必需事实；平台局部块若存在，也必须显式为 `false`，从而不依赖编译器的模糊 fallback。
 * @lang en Root-level `false` is required; if a platform-local block exists, it must also be explicitly `false`, avoiding an ambiguous compiler fallback.
 */
export function verifyManifestTelemetryDisabled(manifest) {
  // <lang><zh-CN>只接受普通 JSON object，避免数组或 null 通过可选链静默退化。</zh-CN><en>Accept only a regular JSON object so arrays or null cannot silently degrade through optional chaining.</en></lang>
  const isManifestObject = manifest !== null && typeof manifest === 'object' && !Array.isArray(manifest);
  if (!isManifestObject || manifest.uniStatistics?.enable !== false) {
    throw new Error('src/manifest.json must set root uniStatistics.enable to false.');
  }

  // <lang><zh-CN>逐个检查固定平台 key；只有不存在设置或明确关闭两种状态可以通过。</zh-CN><en>Inspect each fixed platform key; only an absent setting or explicit disablement may pass.</en></lang>
  for (const platformKey of platformManifestKeys) {
    // <lang><zh-CN>平台配置不存在或不是 object 时没有局部覆盖；继续检查下一项。</zh-CN><en>An absent or non-object platform configuration has no local override; continue with the next item.</en></lang>
    const platformConfiguration = manifest[platformKey];
    if (platformConfiguration === null || typeof platformConfiguration !== 'object' || Array.isArray(platformConfiguration)) continue;

    // <lang><zh-CN>只有实际声明 uniStatistics 时才要求其 enable 明确为 false，拒绝 true、缺值或类型漂移。</zh-CN><en>Only when uniStatistics is declared do we require enable to be explicitly false, rejecting true, omission, or type drift.</en></lang>
    const hasPlatformTelemetryConfiguration = Object.prototype.hasOwnProperty.call(platformConfiguration, 'uniStatistics');
    if (hasPlatformTelemetryConfiguration && platformConfiguration.uniStatistics?.enable !== false) {
      throw new Error(`src/manifest.json contains an unsafe ${platformKey} uniStatistics override.`);
    }
  }
}

/**
 * <lang><zh-CN>在一个已解码文本产物中查找第一个受禁止统计标记。</zh-CN><en>Finds the first forbidden statistics marker in one decoded text artifact.</en></lang>
 * @param {string} content <lang><zh-CN>固定构建目录内普通文本文件的 UTF-8 内容。</zh-CN><en>UTF-8 content of a regular text file inside the fixed build directory.</en></lang>
 * @returns {string | null} <lang><zh-CN>稳定 marker label，安全时为 null。</zh-CN><en>Stable marker label, or null when safe.</en></lang>
 * @lang zh-CN 返回 label 而非匹配正文，避免日志泄漏生成代码或潜在嵌入数据。
 * @lang en Returns a label rather than matched content, preventing logs from leaking generated code or potentially embedded data.
 */
export function findForbiddenTelemetryMarker(content) {
  // <lang><zh-CN>固定顺序保证同一产物始终报告同一首要失败原因。</zh-CN><en>The fixed order ensures that the same artifact always reports the same primary failure.</en></lang>
  for (const telemetryMarker of forbiddenTelemetryMarkers) {
    if (telemetryMarker.pattern.test(content)) return telemetryMarker.label;
  }

  // <lang><zh-CN>未命中已审计 marker 时返回明确空值，不把空字符串混作 label。</zh-CN><en>Return an explicit null when no reviewed marker matches rather than treating an empty string as a label.</en></lang>
  return null;
}

/**
 * <lang><zh-CN>递归列出一个固定构建根内可审计的普通文本文件。</zh-CN><en>Recursively lists auditable regular text files within one fixed build root.</en></lang>
 * @param {string} directory <lang><zh-CN>当前固定构建子目录。</zh-CN><en>Current fixed build subdirectory.</en></lang>
 * @returns {Promise<string[]>} <lang><zh-CN>按路径稳定排序的绝对文件列表。</zh-CN><en>Absolute file paths in stable path order.</en></lang>
 * @lang zh-CN 枚举只跟随普通目录，不跟随符号链接或其他特殊条目。
 * @lang en Enumeration follows only regular directories and follows neither symbolic links nor other special entries.
 */
async function listAuditableOutputFiles(directory) {
  // <lang><zh-CN>排序目录项使失败定位不受文件系统枚举顺序影响。</zh-CN><en>Sort directory entries so failure localization does not depend on file-system enumeration order.</en></lang>
  const directoryEntries = await readdir(directory, { withFileTypes: true });
  const orderedEntries = directoryEntries.toSorted((leftEntry, rightEntry) => leftEntry.name.localeCompare(rightEntry.name, 'en'));
  const outputFiles = [];

  // <lang><zh-CN>逐项仅接受普通目录或普通文件，符号链接与特殊条目不会扩大信任边界。</zh-CN><en>Accept only regular directories or files per entry; symbolic links and special entries cannot expand the trust boundary.</en></lang>
  for (const directoryEntry of orderedEntries) {
    // <lang><zh-CN>由当前固定目录与单个受控名称解析下一路径，不消费产物正文中的路径。</zh-CN><en>Resolve the next path from the current fixed directory and one controlled name, never from a path embedded in artifact content.</en></lang>
    const entryPath = resolve(directory, directoryEntry.name);

    // <lang><zh-CN>普通子目录继续递归，并保持结果顺序。</zh-CN><en>Recurse into a regular subdirectory while retaining result order.</en></lang>
    if (directoryEntry.isDirectory()) {
      outputFiles.push(...await listAuditableOutputFiles(entryPath));
      continue;
    }

    // <lang><zh-CN>只有 allowlist 扩展名的普通文件进入 UTF-8 检查。</zh-CN><en>Only regular files with allowlisted extensions enter UTF-8 inspection.</en></lang>
    const hasAuditableExtension = auditableTextExtensions.has(extname(directoryEntry.name).toLowerCase());
    if (directoryEntry.isFile() && hasAuditableExtension) outputFiles.push(entryPath);
  }

  return outputFiles;
}

/**
 * <lang><zh-CN>读取并验证受版本控制的根 manifest。</zh-CN><en>Reads and verifies the version-controlled root manifest.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>显式关闭边界成立后 resolve。</zh-CN><en>Resolves after the explicit-disable boundary holds.</en></lang>
 * @lang zh-CN JSON 语法错误由原生 parser 直接使门禁失败；脚本不回写或修复配置。
 * @lang en A JSON syntax error fails the gate through the native parser; the script neither rewrites nor repairs configuration.
 */
async function verifySourceTelemetryBoundary() {
  // <lang><zh-CN>固定 manifest 每次只读取一次；读取失败转换为不含宿主绝对路径的稳定诊断。</zh-CN><en>Read the fixed manifest once; convert a read failure into a stable diagnostic containing no absolute host path.</en></lang>
  let manifestText;
  try {
    manifestText = await readFile(manifestPath, 'utf8');
  } catch {
    throw new Error('Telemetry source gate could not read src/manifest.json.');
  }

  // <lang><zh-CN>解析后的固定配置交给纯验证函数；语法错误仍由 JSON parser 明确终止。</zh-CN><en>Pass the parsed fixed configuration to the pure verifier; a syntax error still terminates explicitly through the JSON parser.</en></lang>
  const manifest = JSON.parse(manifestText);
  verifyManifestTelemetryDisabled(manifest);
}

/**
 * <lang><zh-CN>验证一个已知目标的最终构建文本不含 DCloud 统计运行时证据。</zh-CN><en>Verifies that final build text for one known target contains no evidence of the DCloud statistics runtime.</en></lang>
 * @param {'h5' | 'mp-weixin'} target <lang><zh-CN>固定输出映射中的构建目标。</zh-CN><en>Build target in the fixed output mapping.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>至少检查一个文件且全部安全后 resolve。</zh-CN><en>Resolves after at least one file is inspected and all are safe.</en></lang>
 * @lang zh-CN 错误只包含目标、仓内相对路径和 marker label，不输出构建正文或绝对环境路径。
 * @lang en Errors contain only the target, repository-relative path, and marker label, never build content or an absolute environment path.
 */
async function verifyBuiltTelemetryBoundary(target) {
  // <lang><zh-CN>目标只能来自冻结映射；未知 target 在任何文件访问前失败。</zh-CN><en>The target must come from the frozen mapping; an unknown target fails before any file access.</en></lang>
  const outputRoot = outputRoots[target];
  if (!outputRoot) throw new Error('Telemetry artifact gate requires h5 or mp-weixin.');

  // <lang><zh-CN>空输出不能冒充安全构建，因此至少必须发现一个可审计文本文件。</zh-CN><en>An empty output cannot masquerade as a safe build, so at least one auditable text file must be found.</en></lang>
  let outputFiles;
  try {
    outputFiles = await listAuditableOutputFiles(outputRoot);
  } catch {
    throw new Error(`Telemetry artifact gate could not read ${target} output.`);
  }
  if (outputFiles.length === 0) throw new Error(`Telemetry artifact gate found no auditable ${target} output.`);

  // <lang><zh-CN>逐文件读取并在首次命中时失败，保持诊断简洁且不继续处理无必要数据。</zh-CN><en>Read each file and fail on the first match, keeping diagnostics concise and avoiding unnecessary data processing.</en></lang>
  for (const outputFile of outputFiles) {
    // <lang><zh-CN>文件来自固定根的受控枚举，UTF-8 解码后只交给无副作用 marker 检查。</zh-CN><en>The file comes from controlled enumeration under a fixed root and, after UTF-8 decoding, goes only to the side-effect-free marker check.</en></lang>
    let outputText;
    try {
      outputText = await readFile(outputFile, 'utf8');
    } catch {
      const unreadableRelativePath = relative(repositoryRoot, outputFile).replaceAll('\\', '/');
      throw new Error(`${target} telemetry gate could not read ${unreadableRelativePath}.`);
    }

    // <lang><zh-CN>只在完整读取后进行 marker 检查，部分读取绝不能被当作安全结果。</zh-CN><en>Inspect markers only after a complete read; a partial read must never be treated as a safe result.</en></lang>
    const forbiddenMarker = findForbiddenTelemetryMarker(outputText);
    if (forbiddenMarker) {
      const outputRelativePath = relative(repositoryRoot, outputFile).replaceAll('\\', '/');
      throw new Error(`${target} output contains ${forbiddenMarker}: ${outputRelativePath}.`);
    }
  }
}

/**
 * <lang><zh-CN>按唯一受限 CLI mode 执行源码或构建后统计边界。</zh-CN><en>Runs the source or post-build statistics boundary for the sole bounded CLI mode.</en></lang>
 * @param {string | undefined} mode <lang><zh-CN>调用方提供的 `source`、`h5` 或 `mp-weixin`。</zh-CN><en>Caller-provided `source`, `h5`, or `mp-weixin`.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>所选门禁完整通过后 resolve。</zh-CN><en>Resolves after the selected gate fully passes.</en></lang>
 * @lang zh-CN 构建目标仍先重验 manifest，防止只依赖可能陈旧的 dist 结果。
 * @lang en Build targets reverify the manifest first, preventing reliance on potentially stale dist results alone.
 */
async function runTelemetryBoundary(mode) {
  // <lang><zh-CN>所有 mode 都先验证根配置，使平台构建与源码检查共享同一前置事实。</zh-CN><en>All modes verify the root configuration first so platform builds and source checks share the same prerequisite fact.</en></lang>
  await verifySourceTelemetryBoundary();

  // <lang><zh-CN>源码 mode 不要求已有构建目录，适合进入常规 test/check 链。</zh-CN><en>Source mode requires no existing build directory and therefore fits the normal test/check chain.</en></lang>
  if (mode === 'source') return;

  // <lang><zh-CN>只有两个冻结目标可以继续读取产物；缺失或任意参数立即失败。</zh-CN><en>Only the two frozen targets may continue to artifact reads; a missing or arbitrary argument fails immediately.</en></lang>
  if (mode !== 'h5' && mode !== 'mp-weixin') throw new Error('Telemetry boundary mode must be source, h5, or mp-weixin.');
  await verifyBuiltTelemetryBoundary(mode);
}

// <lang><zh-CN>测试导入纯函数时不执行文件门禁；作为 CLI 直接运行时执行唯一受限入口。</zh-CN><en>Do not execute file gates when tests import pure functions; when run directly as a CLI, execute the sole bounded entry.</en></lang>
const invokedScriptUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedScriptUrl === import.meta.url) await runTelemetryBoundary(process.argv[2]);
