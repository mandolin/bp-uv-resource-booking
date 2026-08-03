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
 * <lang><zh-CN>已锁定 Biz async provider runtime entry。</zh-CN><en>Locked Biz async-provider runtime entry.</en></lang>
 * @lang zh-CN BP 只使用其公开 ESM surface；不读取 Biz 私有工作区或未锁定的 package 输出。
 * @lang en The BP uses only its public ESM surface and reads no Biz private workspace or unlocked package output.
 */
const bizAsyncProviderEntry = resolve(projectRoot, 'src/vendor/HIA-uView-Biz/packages/async-provider-runtime/src/index.mjs');

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
      { find: '@hia-uview/biz-async-provider-runtime', replacement: bizAsyncProviderEntry }
    ]
  }
});
