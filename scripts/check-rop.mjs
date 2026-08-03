/**
 * <lang><zh-CN>验证本项目自有源文件具有中英双语文档标记；检查只读、只遍历固定 `src` 路径，并明确跳过已锁定且独立治理的 source submodule。</zh-CN><en>Verifies that project-owned source files have bilingual documentation markers; the check is read-only, traverses only fixed `src` paths, and explicitly skips locked source submodules governed independently.</en></lang>
 * @lang zh-CN 此脚本不是语义或许可证审计替代品；它只为初始化阶段的双语注释纪律提供可重复的最低门禁。
 * @lang en This script is not a replacement for semantic or license audit; it provides a repeatable minimum gate for bilingual-comment discipline during initialization.
 */

// <lang><zh-CN>只使用 Node 内建目录、文件和路径 API。</zh-CN><en>Use only Node built-in directory, file, and path APIs.</en></lang>
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// <lang><zh-CN>从脚本 URL 解析固定源根，避免调用方 cwd 影响扫描边界。</zh-CN><en>Resolve the fixed source root from script URL, avoiding scan-boundary influence from caller cwd.</en></lang>
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(projectRoot, 'src');

// <lang><zh-CN>仅检查可承载注释的项目自有语言文件；JSON 和图片通过各自文档/数据契约治理。</zh-CN><en>Check only project-owned language files that can carry comments; JSON and images are governed by their respective documentation/data contracts.</en></lang>
const commentableExtensions = new Set(['.js', '.mjs', '.vue', '.scss']);

/**
 * <lang><zh-CN>递归列出项目自有可注释源文件。</zh-CN><en>Recursively lists project-owned commentable source files.</en></lang>
 * @param {string} directory <lang><zh-CN>当前固定源子目录。</zh-CN><en>Current fixed source subdirectory.</en></lang>
 * @returns {Promise<string[]>} <lang><zh-CN>绝对文件路径数组。</zh-CN><en>Array of absolute file paths.</en></lang>
 * @lang zh-CN `vendor` 是已锁定输入而非本项目自有代码，故不对其实施重复或跨仓注释规则。
 * @lang en `vendor` is locked input rather than project-owned code, so no duplicate or cross-repository comment rule applies to it.
 */
async function listProjectSourceFiles(directory) {
  // <lang><zh-CN>使用 withFileTypes 避免额外 stat 与符号链接跟随。</zh-CN><en>Use withFileTypes to avoid extra stat calls and symlink traversal.</en></lang>
  const entries = await readdir(directory, { withFileTypes: true });
  const filePaths = [];

  // <lang><zh-CN>逐个处理固定目录项；未知类型不进入扫描。</zh-CN><en>Process fixed directory entries one by one; unknown types do not enter scanning.</en></lang>
  for (const entry of entries) {
    // <lang><zh-CN>source submodule 由其自身仓库治理，当前项目只验证 Git link 与其精确 commit。</zh-CN><en>The source submodule is governed by its own repository; the current project verifies only its Git link and exact commit.</en></lang>
    if (entry.isDirectory() && entry.name === 'vendor') continue;

    // <lang><zh-CN>子目录递归只从项目自有 src 边界继续。</zh-CN><en>Subdirectory recursion continues only from the project-owned src boundary.</en></lang>
    if (entry.isDirectory()) {
      filePaths.push(...await listProjectSourceFiles(join(directory, entry.name)));
      continue;
    }

    // <lang><zh-CN>仅将有限扩展名的普通文件加入检查集合。</zh-CN><en>Add only regular files with finite extensions to the check set.</en></lang>
    if (entry.isFile() && commentableExtensions.has(extname(entry.name))) filePaths.push(join(directory, entry.name));
  }

  // <lang><zh-CN>返回固定集合，不排序或读取任何外部目录。</zh-CN><en>Return the fixed collection without sorting or reading any external directory.</en></lang>
  return filePaths;
}

/**
 * <lang><zh-CN>验证每个项目自有源文件都含两种语言标记。</zh-CN><en>Verifies that every project-owned source file contains both language markers.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>无缺失后 resolve。</zh-CN><en>Resolves when no marker is missing.</en></lang>
 * @lang zh-CN 输出只报告相对于 BP root 的路径，避免环境路径泄漏。
 * @lang en Output reports only paths relative to the BP root, avoiding environment-path leakage.
 */
async function checkBilingualMarkers() {
  // <lang><zh-CN>先枚举可审计文件，保证错误列表可一次性给出。</zh-CN><en>Enumerate auditable files first so one error list can be produced.</en></lang>
  const filePaths = await listProjectSourceFiles(sourceRoot);
  const missingPaths = [];

  // <lang><zh-CN>每个文件只检查稳定 marker，而不把中文/英文内容的质量简化成机器翻译判断。</zh-CN><en>Check each file only for stable markers and do not reduce Chinese/English content quality to a machine-translation judgment.</en></lang>
  for (const filePath of filePaths) {
    const content = await readFile(filePath, 'utf8');
    if (!content.includes('@lang zh-CN') || !content.includes('@lang en')) missingPaths.push(relative(projectRoot, filePath));
  }

  // <lang><zh-CN>缺失 marker 时用单一受限错误终止，不继续处理或修改文件。</zh-CN><en>On missing marker, end with one bounded error and neither continue processing nor modify files.</en></lang>
  if (missingPaths.length > 0) throw new Error(`Missing bilingual markers: ${missingPaths.join(', ')}`);
}

// <lang><zh-CN>执行唯一只读门禁。</zh-CN><en>Execute the sole read-only gate.</en></lang>
await checkBilingualMarkers();
