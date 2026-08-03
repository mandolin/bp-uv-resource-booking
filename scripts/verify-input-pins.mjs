/**
 * <lang><zh-CN>验证 BP 的两个 source submodule、精确 Git 提交和本地 alias 输入；脚本不拉取、更新或修改 submodule，也不读取网络、环境秘密或用户数据。</zh-CN><en>Verifies the BP's two source submodules, exact Git commits, and local alias inputs; it neither fetches, updates, nor modifies submodules and reads no network, environment secret, or user data.</en></lang>
 * @lang zh-CN 该检查把“可复现输入”变成可执行约束，避免构建无意间改用 registry、父目录或漂移的工作树。
 * @lang en This check turns “reproducible inputs” into an executable constraint, avoiding an accidental build from a registry, parent directory, or drifting worktree.
 */

// <lang><zh-CN>导入 Node 内建文件、路径和子进程 API；不引入依赖包或 shell。</zh-CN><en>Import Node built-in file, path, and child-process APIs; introduce no dependency package or shell.</en></lang>
import { access, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// <lang><zh-CN>从脚本 URL 固定解析 BP 根，不依赖调用命令的 cwd。</zh-CN><en>Resolve the BP root from script URL and do not depend on the calling command's cwd.</en></lang>
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// <lang><zh-CN>所有公开 source 输入均以路径、远端 URL 与精确 commit 三元组显式声明。</zh-CN><en>Every public source input is explicitly declared as a path, remote URL, and exact commit triple.</en></lang>
const expectedInputs = Object.freeze([
  Object.freeze({ path: 'src/vendor/HIA-uView', remote: 'https://github.com/mandolin/HIA-uView.git', commit: '8213f2b676c2b5470bfdef9b3c95c4fde39baf45' }),
  Object.freeze({ path: 'src/vendor/HIA-uView-Biz', remote: 'https://github.com/mandolin/HIA-uView-Biz.git', commit: '8ba7fa56c1bcfe29655c37a2ea387237289a570c' })
]);

/**
 * <lang><zh-CN>读取一个 Git worktree 的 HEAD，不使用 shell 字符串拼接。</zh-CN><en>Reads HEAD from one Git worktree without shell-string composition.</en></lang>
 * @param {string} worktreePath <lang><zh-CN>已验证的仓内 submodule 路径。</zh-CN><en>Verified in-repository submodule path.</en></lang>
 * @returns {string} <lang><zh-CN>去除空白后的完整 Git commit。</zh-CN><en>Full Git commit with surrounding whitespace removed.</en></lang>
 * @lang zh-CN execFileSync 只调用固定 Git executable 与参数数组，输入路径来自冻结声明。
 * @lang en execFileSync calls only fixed Git executable and argument arrays; input path comes from frozen declarations.
 */
function readGitHead(worktreePath) {
  // <lang><zh-CN>只查询 HEAD，不执行 checkout、fetch、pull、submodule update 或任何写操作。</zh-CN><en>Query only HEAD and perform no checkout, fetch, pull, submodule update, or write.</en></lang>
  return execFileSync('git', ['-C', worktreePath, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

/**
 * <lang><zh-CN>验证每个 source submodule 与其 Git link 声明。</zh-CN><en>Verifies every source submodule and its Git-link declaration.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>全部输入匹配后 resolve。</zh-CN><en>Resolves after all inputs match.</en></lang>
 * @lang zh-CN 失败只报告声明路径和预期关系，不输出环境变量、请求、源码内容或本地用户路径。
 * @lang en Failure reports only declared paths and expected relations, never environment variables, requests, source content, or local user paths.
 */
async function verifyInputs() {
  // <lang><zh-CN>读取受版本控制的 Git link 清单，检查路径和公开远端是否都被记录。</zh-CN><en>Read the version-controlled Git-link manifest and check that each path and public remote are recorded.</en></lang>
  const gitmodules = await readFile(resolve(projectRoot, '.gitmodules'), 'utf8');

  // <lang><zh-CN>逐项验证存在性、清单记录和精确 HEAD，避免只验证其中一项导致输入漂移。</zh-CN><en>Verify existence, manifest record, and exact HEAD per input, avoiding input drift from checking only one property.</en></lang>
  for (const expectedInput of expectedInputs) {
    // <lang><zh-CN>路径由 repo root 和冻结相对路径组成，不接受 CLI 传入的文件系统位置。</zh-CN><en>Path consists of repo root and frozen relative path and accepts no CLI-supplied filesystem location.</en></lang>
    const inputPath = resolve(projectRoot, expectedInput.path);
    await access(inputPath);

    // <lang><zh-CN>要求 .gitmodules 同时记录该路径与公开 remote，而不仅依赖当前 clone 的本地配置。</zh-CN><en>Require .gitmodules to record both the path and public remote rather than relying only on current clone's local config.</en></lang>
    if (!gitmodules.includes(`path = ${expectedInput.path}`) || !gitmodules.includes(`url = ${expectedInput.remote}`)) {
      throw new Error(`Missing declared Git link for ${expectedInput.path}.`);
    }

    // <lang><zh-CN>比较完整 commit，拒绝 branch、短 SHA 或未锁定 checkout。</zh-CN><en>Compare the full commit and reject a branch, short SHA, or unlocked checkout.</en></lang>
    if (readGitHead(inputPath) !== expectedInput.commit) {
      throw new Error(`Unexpected source commit for ${expectedInput.path}.`);
    }
  }

  // <lang><zh-CN>微信小程序组件必须通过受限 easycom 从已锁定的 UI submodule 叶级 SFC 静态解析；这避免公共 barrel 使 compiler 漏掉组件 JS、JSON、WXML 或 WXSS。</zh-CN><en>WeChat Mini Program components must be statically resolved from leaf SFCs in the pinned UI submodule through bounded easycom; this prevents a public barrel from making the compiler miss component JS, JSON, WXML, or WXSS.</en></lang>
  const pagesConfiguration = JSON.parse(await readFile(resolve(projectRoot, 'src/pages.json'), 'utf8'));
  const componentResolver = pagesConfiguration.easycom?.custom?.['^u-(.*)'];
  if (pagesConfiguration.easycom?.autoscan !== false || componentResolver !== '@/vendor/HIA-uView/HIA-uView-UI/src/components/u-$1/u-$1.vue') {
    throw new Error('Unexpected Mini Program static UI component resolver.');
  }

  // <lang><zh-CN>当前所有 BP 页面和通用资源卡片只使用模板 u-* 标签与静态 resolver；它们不能重新导入 UI 公共 runtime entry 破坏小程序产物边界。</zh-CN><en>All current BP pages and the generic resource card use template u-* tags with the static resolver only; they must not reimport the UI public runtime entry and break Mini Program output boundaries.</en></lang>
  const staticConsumerPaths = Object.freeze([
    'src/components/ResourceCard.vue',
    'src/pages/home/index.vue',
    'src/pages/discover/index.vue',
    'src/pages/reservations/index.vue',
    'src/pages/profile/index.vue',
    'src/pages/resource-detail/index.vue',
    'src/pages/booking-confirm/index.vue'
  ]);

  for (const relativePath of staticConsumerPaths) {
    // <lang><zh-CN>列表为冻结的仓内相对路径，不扫描调用方目录；检查只读取源码文本，不执行 Vue、compiler 或平台 API。</zh-CN><en>The list contains frozen in-repository relative paths and scans no caller directory; the check reads source text only and executes no Vue, compiler, or platform API.</en></lang>
    const sourceText = await readFile(resolve(projectRoot, relativePath), 'utf8');
    if (sourceText.includes("from '@hia-uview/ui'")) {
      throw new Error(`Unexpected public UI runtime import in ${relativePath}.`);
    }
  }
}

// <lang><zh-CN>以顶层 await 执行单一只读验证；异常保留非零退出码给 pnpm。</zh-CN><en>Execute the sole read-only verification with top-level await; an exception retains a nonzero exit code for pnpm.</en></lang>
await verifyInputs();
