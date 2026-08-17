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
 * <lang><zh-CN>显式 Vite 审阅 mode 到首页目录 fixture 状态的完整静态映射。</zh-CN><en>Complete static mapping from explicit Vite review modes to Home catalog fixture states.</en></lang>
 * @lang zh-CN mode 名称不从环境、URL、文件或外部 registry 发现；只有四项 checked-in key 可以改变审阅状态。
 * @lang en Mode names are discovered from no environment, URL, file, or external registry; only four checked-in keys can change review state.
 */
const HOME_CATALOG_REVIEW_CASE_BY_VITE_MODE = Object.freeze({
  'review-home-ready': 'ready',
  'review-home-loading': 'loading',
  'review-home-failure': 'failure',
  'review-home-empty': 'empty'
});

/**
 * <lang><zh-CN>把 Vite mode 映射为有限首页目录审阅状态。</zh-CN><en>Maps a Vite mode to a finite Home catalog review state.</en></lang>
 * @param {unknown} mode <lang><zh-CN>Vite 提供的构建 mode 候选值。</zh-CN><en>Build-mode candidate supplied by Vite.</en></lang>
 * @returns {'ready'|'loading'|'failure'|'empty'} <lang><zh-CN>严格映射结果；普通非审阅 mode 为 ready。</zh-CN><en>Strictly mapped result; an ordinary non-review mode is ready.</en></lang>
 * @throws {Error} <lang><zh-CN>未知拼写进入保留 `review-home-` namespace 时失败关闭。</zh-CN><en>Fails closed when an unknown spelling enters the reserved `review-home-` namespace.</en></lang>
 * @lang zh-CN 不做大小写归一化或近似匹配，避免拼写错误静默生成错误审阅产物。
 * @lang en Performs no case normalization or approximate matching, preventing a typo from silently generating an incorrect review artifact.
 */
export function resolveHomeCatalogReviewCaseFromMode(mode) {
  // <lang><zh-CN>精确命中的 checked-in review mode 一一映射到有限 fixture case。</zh-CN><en>An exactly matched checked-in review mode maps one-to-one onto a finite fixture case.</en></lang>
  if (typeof mode === 'string' && Object.hasOwn(HOME_CATALOG_REVIEW_CASE_BY_VITE_MODE, mode)) {
    return HOME_CATALOG_REVIEW_CASE_BY_VITE_MODE[mode];
  }

  // <lang><zh-CN>进入保留 `review-home-` namespace 的未知拼写严格失败关闭，防止审阅者误把 ready 截图当作目标恢复态。</zh-CN><en>An unknown spelling entering the reserved `review-home-` namespace fails closed, preventing a reviewer from mistaking a ready screenshot for the target recovery state.</en></lang>
  if (typeof mode === 'string' && mode.startsWith('review-home-')) {
    throw new Error('Home catalog review Vite mode is not allowed.');
  }

  // <lang><zh-CN>普通 development、production、自定义非审阅 mode 与非字符串输入均保持公开 ready 行为。</zh-CN><en>Ordinary development, production, custom non-review modes, and non-string inputs all retain public ready behavior.</en></lang>
  return 'ready';
}

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

/**
 * <lang><zh-CN>H5 应用自管主导航使用的八张固定 27×27 PNG source 路径。</zh-CN><en>Eight fixed 27×27 PNG source paths used by the H5 application-owned primary navigation.</en></lang>
 * @lang zh-CN 这些小文件必须保留为 Pages-base URL，而不能被 Vite 内联成 data URI；这样浏览器成品门禁可以逐一绑定原创 SVG 派生物的摘要与实际 DOM locator。
 * @lang en These small files must remain Pages-base URLs instead of being inlined by Vite as data URIs, allowing the browser-artifact gate to bind every original-SVG derivative digest to the locator used by the DOM.
 */
const h5TabIconSourcePaths = new Set([
  'tab-home.png',
  'tab-home-active.png',
  'tab-discover.png',
  'tab-discover-active.png',
  'tab-reservations.png',
  'tab-reservations-active.png',
  'tab-profile.png',
  'tab-profile-active.png'
].map((fileName) => resolve(projectRoot, 'src/static/icons', fileName)));

/**
 * <lang><zh-CN>仅阻止八张登记主导航 PNG 被内联，其余资产继续采用 Vite 的锁定默认判断。</zh-CN><en>Prevents inlining only for the eight registered primary-navigation PNGs and leaves every other asset to Vite's pinned default decision.</en></lang>
 * @param {string} filePath <lang><zh-CN>Vite 已解析的候选资产路径。</zh-CN><en>Candidate asset path resolved by Vite.</en></lang>
 * @returns {boolean | undefined} <lang><zh-CN>登记图标返回 false；其他文件返回 undefined 以保留默认阈值。</zh-CN><en>False for a registered icon; undefined for another file to retain the default threshold.</en></lang>
 * @lang zh-CN 路径只与仓内冻结 Set 做精确比较，不按扩展名或调用方文本放宽全部 PNG。
 * @lang en The path is compared exactly with the frozen in-repository set and never broadens all PNGs by extension or caller text.
 */
function retainPrimaryTabIconFile(filePath) {
  // <lang><zh-CN>Vite 提供绝对路径；再次 resolve 只规范化分隔与点段，不读取文件系统。</zh-CN><en>Vite supplies an absolute path; resolving again only normalizes separators and dot segments without reading the file system.</en></lang>
  if (h5TabIconSourcePaths.has(resolve(filePath))) return false;

  // <lang><zh-CN>undefined 明确委托给 Vite 默认逻辑，字体等较大资产仍生成同源文件。</zh-CN><en>Undefined explicitly delegates to Vite's default logic, so larger assets such as fonts remain same-origin files.</en></lang>
  return undefined;
}

// <lang><zh-CN>导出唯一官方 transform、可复现 alias、target-aware base 与 compile-time fixture literal；不添加隐式 auto-import、网络或后处理 plugin。</zh-CN><en>Export the sole official transform, reproducible aliases, target-aware base, and compile-time fixture literal; add no implicit auto-import, network, or post-processing plugin.</en></lang>
export default defineConfig(({ mode }) => {
  // <lang><zh-CN>每次配置求值只执行有限静态映射；production、development 与自定义非审阅 mode 都生成 ready literal。</zh-CN><en>Each configuration evaluation performs only the finite static mapping; production, development, and custom non-review modes all generate the ready literal.</en></lang>
  const homeCatalogReviewCase = resolveHomeCatalogReviewCaseFromMode(mode);

  // <lang><zh-CN>返回固定 UniApp 构建关系；审阅状态通过单个不可变 literal 编译进项目组合根。</zh-CN><en>Return the fixed UniApp build relation; review state is compiled into the project composition root through one immutable literal.</en></lang>
  return {
    // <lang><zh-CN>官方 UniApp plugin 是唯一编译 transform；依赖版本由本仓 pnpm lock 固定。</zh-CN><en>The official UniApp plugin is the sole compilation transform; dependency versions are fixed by this repository's pnpm lock.</en></lang>
    plugins: [uniPlugin.default()],
    // <lang><zh-CN>在 H5 下使用唯一公开 Pages path，其他 target 不承继 Web deployment path。</zh-CN><en>Use the single public Pages path on H5; other targets do not inherit a web deployment path.</en></lang>
    base: h5Base,
    define: {
      // <lang><zh-CN>JSON literal 阻止 mode 文本成为代码；runtime 不再读取 mode 或环境。</zh-CN><en>The JSON literal prevents mode text from becoming code; runtime no longer reads the mode or environment.</en></lang>
      __HIA_HOME_CATALOG_REVIEW_CASE__: JSON.stringify(homeCatalogReviewCase)
    },
    build: {
      // <lang><zh-CN>保留八张底栏 PNG 的真实文件 locator；精确 allowlist 以外的资产继续使用默认 4 KiB 内联阈值。</zh-CN><en>Retain real file locators for the eight tab PNGs; assets outside the exact allowlist continue using the default 4 KiB inline threshold.</en></lang>
      assetsInlineLimit: retainPrimaryTabIconFile
    },
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
  };
});
