/**
 * <lang><zh-CN>BP 的受控 UniApp Vite 配置：只加载官方 transform、已锁定的同仓 submodule source 与本项目锁定 Vue runtime，不发现 registry、父目录或本机绝对路径输入。</zh-CN><en>Controlled UniApp Vite configuration for the BP: loads only the official transform, locked same-repository submodule sources, and this project's locked Vue runtime; it discovers no registry, parent-directory, or machine-absolute input.</en></lang>
 * @lang zh-CN H5 base 只为已声明 GitHub Pages path 服务；本配置不声明 proxy、remote API、环境加载、动态 import、dev server 或发布行为。
 * @lang en The H5 base serves only the declared GitHub Pages path; this configuration declares no proxy, remote API, environment loading, dynamic import, dev server, or publishing behavior.
 */

// <lang><zh-CN>导入固定的 Vite/UniApp 配置 API；不加载第三方构建 wrapper。</zh-CN><en>Import fixed Vite/UniApp configuration APIs and load no third-party build wrapper.</en></lang>
import { defineConfig } from 'vite';
import uniPlugin from '@dcloudio/vite-plugin-uni';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * <lang><zh-CN>当前配置所在 BP 仓根目录。</zh-CN><en>BP repository root containing the current configuration.</en></lang>
 * @lang zh-CN 路径由模块 URL 派生，避免从运行 shell 的 cwd 推断项目或 vendor 位置。
 * @lang en The path derives from module URL, avoiding inference of project/vendor locations from the running shell cwd.
 */
const projectRoot = dirname(fileURLToPath(import.meta.url));

/**
 * <lang><zh-CN>已锁定 HIA-uView UI runtime entry。</zh-CN><en>Locked HIA-uView UI runtime entry.</en></lang>
 * @lang zh-CN 该路径位于公开 Git submodule 内；其精确 commit 由父仓 gitlink 固定并由验证脚本检查。
 * @lang en This path lies inside a public Git submodule; its exact commit is fixed by the parent gitlink and checked by the verifier.
 */
const uiRuntimeEntry = resolve(projectRoot, 'src/vendor/HIA-uView/HIA-uView-UI/src/index.mjs');

/**
 * <lang><zh-CN>已锁定 HIA-uView UI 样式 entry。</zh-CN><en>Locked HIA-uView UI style entry.</en></lang>
 * @lang zh-CN 样式与 runtime 同源，避免以 package registry 或本机路径替代 theme 输入。
 * @lang en Style shares provenance with runtime, avoiding replacement of theme input through a package registry or machine path.
 */
const uiStyleEntry = resolve(projectRoot, 'src/vendor/HIA-uView/HIA-uView-UI/src/style.css');

/**
 * <lang><zh-CN>已锁定 Biz project runtime entry。</zh-CN><en>Locked Biz project-runtime entry.</en></lang>
 * @lang zh-CN BP 业务源码只直接使用该 project-facing ESM surface；其底层依赖仍由同一 Biz Git link 与显式 alias 固定。
 * @lang en BP business source directly uses only this project-facing ESM surface; its lower-level dependencies remain pinned by the same Biz Git link and explicit aliases.
 */
const bizProjectRuntimeEntry = resolve(projectRoot, 'src/vendor/HIA-uView-Biz/packages/project-runtime/src/index.mjs');

/**
 * <lang><zh-CN>project runtime 所组合的已锁定 Biz async provider entry。</zh-CN><en>Locked Biz async-provider entry composed by the project runtime.</en></lang>
 * @lang zh-CN 该 alias 只满足 project package 的静态依赖解析；BP 页面、state 与 adapter 不得直接导入它。
 * @lang en This alias only resolves the project package's static dependency; BP pages, state, and adapters must not import it directly.
 */
const bizAsyncProviderEntry = resolve(projectRoot, 'src/vendor/HIA-uView-Biz/packages/async-provider-runtime/src/index.mjs');

/**
 * <lang><zh-CN>project runtime 所组合的已锁定 Biz provider-port entry。</zh-CN><en>Locked Biz provider-port entry composed by the project runtime.</en></lang>
 * @lang zh-CN 该路径属于同一受控 submodule，不从 registry 或父 workspace 解析。
 * @lang en This path belongs to the same controlled submodule and resolves from neither a registry nor a parent workspace.
 */
const bizProviderPortEntry = resolve(projectRoot, 'src/vendor/HIA-uView-Biz/packages/provider-port-runtime/src/index.mjs');

/**
 * <lang><zh-CN>project runtime 所组合的已锁定 Biz solution-profile entry。</zh-CN><en>Locked Biz solution-profile entry composed by the project runtime.</en></lang>
 * @lang zh-CN solution 与 capability gate 的实现和 project facade 使用完全相同的 Git provenance。
 * @lang en The solution and capability-gate implementation shares exactly the same Git provenance as the project facade.
 */
const bizSolutionProfileEntry = resolve(projectRoot, 'src/vendor/HIA-uView-Biz/packages/solution-profile-runtime/src/index.mjs');

/**
 * <lang><zh-CN>根据 UniApp target 确定可部署的静态 H5 base。</zh-CN><en>Determines the deployable static H5 base from the UniApp target.</en></lang>
 * @lang zh-CN 只有 H5 使用 GitHub Pages 子路径；小程序 target 保留默认相对资源语义。
 * @lang en Only H5 uses the GitHub Pages subpath; mini-program targets retain default relative-asset semantics.
 */
const h5Base = process.env.UNI_PLATFORM === 'h5' ? '/bp-uv-resource-booking/' : '/';

// <lang><zh-CN>导出唯一官方 transform、可复现 alias 和 target-aware base；不添加隐式 auto-import、网络或后处理 plugin。</zh-CN><en>Export the sole official transform, reproducible aliases, and target-aware base; add no implicit auto-import, network, or post-processing plugin.</en></lang>
export default defineConfig({
  // <lang><zh-CN>官方 UniApp plugin 是唯一编译 transform；依赖版本由本仓 pnpm lock 固定。</zh-CN><en>The official UniApp plugin is the sole compilation transform; dependency versions are fixed by this repository's pnpm lock.</en></lang>
  plugins: [uniPlugin.default()],
  // <lang><zh-CN>在 H5 下使用唯一公开 Pages path，其他 target 不承继 Web deployment path。</zh-CN><en>Use the single public Pages path on H5; other targets do not inherit a web deployment path.</en></lang>
  base: h5Base,
  resolve: {
    // <lang><zh-CN>所有 alias 解析到仓内 Git submodule 或当前 lockfile 的 node_modules，不越出 BP 边界。</zh-CN><en>Every alias resolves to an in-repository Git submodule or this lockfile's node_modules and never escapes the BP boundary.</en></lang>
    alias: [
      { find: '@hia-uview/ui/style.css', replacement: uiStyleEntry },
      { find: '@hia-uview/ui', replacement: uiRuntimeEntry },
      { find: '@hia-uview/biz-project-runtime', replacement: bizProjectRuntimeEntry },
      { find: '@hia-uview/biz-async-provider-runtime', replacement: bizAsyncProviderEntry },
      { find: '@hia-uview/biz-provider-port-runtime', replacement: bizProviderPortEntry },
      { find: '@hia-uview/biz-solution-profile-runtime', replacement: bizSolutionProfileEntry }
    ]
  }
});
