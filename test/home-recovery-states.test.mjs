/**
 * <lang><zh-CN>锁定 W-uv-P70 Board D 首页恢复态、审阅夹具和构建模式的有限合同；本测试只读取仓内固定源码并调用公开纯函数。</zh-CN><en>Locks the finite W-uv-P70 Board D contracts for Home recovery states, the review fixture, and build modes; this test reads only fixed in-repository sources and calls public pure functions.</en></lang>
 * @lang zh-CN 门禁覆盖公开 HIA-uView 投影、冻结双语文案、保留快照语义、无旁路页面边界、精确夹具 options 与失败关闭的 Vite mode。
 * @lang en The gate covers public HIA-uView projections, frozen bilingual copy, retained-snapshot semantics, a bypass-free page boundary, exact fixture options, and fail-closed Vite modes.
 */

// <lang><zh-CN>使用 Node 严格断言验证固定结构、冻结值与有限函数结果。</zh-CN><en>Use Node strict assertions to verify fixed structure, frozen values, and finite function results.</en></lang>
import assert from 'node:assert/strict';
// <lang><zh-CN>只通过固定 file URL 读取待审计源码，不枚举目录或解释外部路径。</zh-CN><en>Read audited sources only through fixed file URLs without enumerating directories or interpreting external paths.</en></lang>
import { readFile } from 'node:fs/promises';
// <lang><zh-CN>Node 原生 test runner 避免为静态与模块合同引入额外依赖。</zh-CN><en>The native Node test runner avoids adding a dependency for static and module contracts.</en></lang>
import test from 'node:test';
// <lang><zh-CN>审阅模块的三项公开 surface 是模块级行为测试的唯一业务输入。</zh-CN><en>The review module's three public surfaces are the sole business inputs to module-level behavior tests.</en></lang>
import {
  HOME_CATALOG_REVIEW_CASES,
  createHomeCatalogReviewFixture,
  getCompiledHomeCatalogReviewCase
} from '../src/review/home-catalog-review.mjs';

/**
 * <lang><zh-CN>Board D 静态门禁允许读取的完整固定源码集合。</zh-CN><en>Complete fixed source set that the Board D static gate may read.</en></lang>
 * @lang zh-CN URL 全部相对于当前测试文件确定，不接受 cwd、CLI、环境、route 或 storage 输入。
 * @lang en Every URL is determined relative to this test file and accepts no cwd, CLI, environment, route, or storage input.
 */
const BOARD_D_SOURCE_URLS = Object.freeze({
  home: new URL('../src/pages/home/index.vue', import.meta.url),
  messages: new URL('../src/locales/messages.mjs', import.meta.url),
  review: new URL('../src/review/home-catalog-review.mjs', import.meta.url),
  vite: new URL('../vite.config.mjs', import.meta.url)
});

/**
 * @lang zh-CN 并行读取 Board D 的四项固定源码输入。
 * @lang en Reads the four fixed Board D source inputs in parallel.
 * @returns {Promise<{home: string, messages: string, review: string, vite: string}>} <lang><zh-CN>按稳定逻辑名称索引的源码文本。</zh-CN><en>Source text indexed by stable logical names.</en></lang>
 */
async function readBoardDSources() {
  // <lang><zh-CN>每个固定 URL 都必须成功读取；缺失文件直接失败，不能静默跳过对应合同。</zh-CN><en>Every fixed URL must be read successfully; a missing file fails directly and cannot silently skip its contract.</en></lang>
  const sourceEntries = await Promise.all(Object.entries(BOARD_D_SOURCE_URLS).map(async ([sourceName, sourceUrl]) => [sourceName, await readFile(sourceUrl, 'utf8')]));

  // <lang><zh-CN>只把已知固定条目转换成局部 record，不执行或改写源码。</zh-CN><en>Convert only known fixed entries into a local record without executing or rewriting source.</en></lang>
  return Object.fromEntries(sourceEntries);
}

/**
 * <lang><zh-CN>统计源码中一个固定正则合同的命中数。</zh-CN><en>Counts matches for one fixed regular-expression contract in source.</en></lang>
 * @param {string} source <lang><zh-CN>仓内固定源码文本。</zh-CN><en>Fixed in-repository source text.</en></lang>
 * @param {RegExp} pattern <lang><zh-CN>带全局标志的静态合同表达式。</zh-CN><en>Static contract expression carrying the global flag.</en></lang>
 * @returns {number} <lang><zh-CN>有限命中数。</zh-CN><en>Finite match count.</en></lang>
 * @lang zh-CN helper 不接受用户文本创建正则，也不修改传入 pattern。
 * @lang en The helper creates no regular expression from user text and does not mutate the supplied pattern.
 */
function countMatches(source, pattern) {
  // <lang><zh-CN>match 在无命中时返回 null，明确收敛为零。</zh-CN><en>Match returns null when absent, which is explicitly converged to zero.</en></lang>
  return (source.match(pattern) ?? []).length;
}

/**
 * <lang><zh-CN>移除 JavaScript block 与整行普通注释，供可执行旁路标识符检查使用。</zh-CN><en>Removes JavaScript block comments and full-line ordinary comments for executable-bypass identifier checks.</en></lang>
 * @param {string} source <lang><zh-CN>不含用户输入的仓内固定 JavaScript 源码。</zh-CN><en>Fixed in-repository JavaScript source containing no user input.</en></lang>
 * @returns {string} <lang><zh-CN>保留可执行代码和 string literal 的审计文本。</zh-CN><en>Audit text retaining executable code and string literals.</en></lang>
 * @lang zh-CN helper 只用于负向边界断言，不用于解析、转换或执行生产源码。
 * @lang en The helper is used only for negative boundary assertions and never to parse, transform, or execute production source.
 */
function withoutJavaScriptComments(source) {
  // <lang><zh-CN>先移除跨行 JSDoc/CSS-style block，再移除剩余整行 `//` 注释；固定目标文件不含正则或 string 中的注释标记。</zh-CN><en>Remove multiline JSDoc/CSS-style blocks first and then remaining full-line `//` comments; the fixed target file contains no comment markers inside regexes or strings.</en></lang>
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
}

test('Board D keeps one common featured section and projects initial idle/loading through a local USkeleton', async function verifyBoardDLoadingProjection() {
  // <lang><zh-CN>首页结构与双语文案来自同一次固定快照读取。</zh-CN><en>Home structure and bilingual copy come from the same fixed snapshot read.</en></lang>
  const { home, messages } = await readBoardDSources();

  // <lang><zh-CN>唯一 USection 位于所有互斥状态之前，使标题与“查看全部”在 ready、loading、failure、empty 中保持共同层级。</zh-CN><en>The sole USection precedes every mutually exclusive state so its title and View all action keep one shared hierarchy in ready, loading, failure, and empty.</en></lang>
  assert.equal(countMatches(home, /<u-section\b/gu), 1);
  assert.match(home, /<view class="home-page__featured">[\s\S]*?<u-section\b[^>]*@right-click="browseResources"\s*\/>[\s\S]*?v-if="isCatalogPreparing"[\s\S]*?v-else-if="isInitialCatalogFailure"[\s\S]*?v-else-if="isSuccessfulCatalogEmpty"[\s\S]*?v-else-if="featuredEntry"/u);

  // <lang><zh-CN>首次 idle 与 loading 共用局部两行骨架、标题和头像；旧全屏 ULoadingPage 不得返回首页。</zh-CN><en>Initial idle and loading share a local two-row skeleton with title and avatar; the former full-page ULoadingPage must not return to Home.</en></lang>
  assert.match(home, /<u-skeleton :loading="true" :rows="2" show-title show-avatar\s*\/>/u);
  assert.match(home, /const isCatalogPreparing = computed\(\(\) => \(demo\.catalogPhase\.value === 'idle' \|\| demo\.catalogPhase\.value === 'loading'\) && featuredEntry\.value === null\);/u);
  assert.doesNotMatch(home, /<u-loading-page\b/iu);

  // <lang><zh-CN>页面自有 wrapper 只提供至少 128px 的稳定局部几何，不穿透 USkeleton 内部节点。</zh-CN><en>The page-owned wrapper supplies only stable local geometry of at least 128px and does not pierce USkeleton internals.</en></lang>
  assert.match(home, /\.home-page__state--loading\s*\{[^}]*\bmin-height:\s*128px;[^}]*\}/u);
  assert.doesNotMatch(home, /:deep\([^)]*(?:skeleton|u-skeleton)/iu);

  // <lang><zh-CN>可读 loading 文案使用已接受的精确中英文，不依赖骨架动画表达状态。</zh-CN><en>Readable loading copy uses the exact accepted Chinese and English and does not depend on skeleton animation to express state.</en></lang>
  assert.match(home, /class="home-page__loading-copy">\{\{ runtimeLocale\.t\('home\.loading'\) \}\}<\/text>/u);
  assert.equal(messages.includes("'home.loading': '正在准备精选场馆'"), true);
  assert.equal(messages.includes("'home.loading': 'Preparing featured venues'"), true);
});

test('Board D initial failure and successful whole-catalog empty states use UEmpty with frozen copy and one recovery intent', async function verifyBoardDEmptyProjections() {
  // <lang><zh-CN>固定源码用于确认 D-2、D-3 与统一恢复 action 的静态连接。</zh-CN><en>Fixed sources confirm the static wiring of D-2, D-3, and the shared recovery action.</en></lang>
  const { home, messages } = await readBoardDSources();

  // <lang><zh-CN>首次 failure 仅在无快照时成立，并使用 Retry；canonical retryable 严格为 true 才暴露 action。</zh-CN><en>Initial failure exists only without a snapshot and uses Retry; the action is exposed only when canonical retryable is strictly true.</en></lang>
  assert.match(home, /const isInitialCatalogFailure = computed\(\(\) => demo\.catalogPhase\.value === 'failure' && featuredEntry\.value === null\);/u);
  assert.match(home, /v-else-if="isInitialCatalogFailure"[\s\S]*?<u-empty[\s\S]*?:title="runtimeLocale\.t\('home\.failureTitle'\)"[\s\S]*?:description="runtimeLocale\.t\('home\.failureDescription'\)"[\s\S]*?:action-text="canRetryCatalogFailure \? runtimeLocale\.t\('common\.retry'\) : ''"[\s\S]*?@action="handleRetry"/u);
  assert.match(home, /const canRetryCatalogFailure = computed\(\(\) => isInitialCatalogFailure\.value && demo\.catalogFailure\.value\?\.retryable === true\);/u);

  // <lang><zh-CN>whole-catalog empty 只能是 ready terminal 加空快照，并使用 Reload 回到同一 facade 读取。</zh-CN><en>Whole-catalog empty can only be a ready terminal plus an empty snapshot and uses Reload to return to the same facade read.</en></lang>
  assert.match(home, /const isSuccessfulCatalogEmpty = computed\(\(\) => demo\.catalogPhase\.value === 'ready' && featuredEntry\.value === null\);/u);
  assert.match(home, /v-else-if="isSuccessfulCatalogEmpty"[\s\S]*?<u-empty[\s\S]*?:title="runtimeLocale\.t\('home\.emptyTitle'\)"[\s\S]*?:description="runtimeLocale\.t\('home\.emptyDescription'\)"[\s\S]*?:action-text="runtimeLocale\.t\('common\.reload'\)"[\s\S]*?@action="handleRetry"/u);
  assert.equal(countMatches(home, /@action="handleRetry"/gu), 2);
  assert.match(home, /async function handleRetry\(\) \{[\s\S]*?await demo\.refreshCatalog\(''\);[\s\S]*?\}/u);

  // <lang><zh-CN>D-2 使用已接受的精确失败标题与说明。</zh-CN><en>D-2 uses the exact accepted failure title and description.</en></lang>
  assert.equal(messages.includes("'home.failureTitle': '精选场馆暂时不可用'"), true);
  assert.equal(messages.includes("'home.failureDescription': '本地示例目录暂时无法读取，请重试。'"), true);
  assert.equal(messages.includes("'home.failureTitle': 'Featured venues are temporarily unavailable'"), true);
  assert.equal(messages.includes("'home.failureDescription': 'The local demo catalog is temporarily unavailable. Try again.'"), true);

  // <lang><zh-CN>D-3 使用已接受的精确成功空结果标题与说明。</zh-CN><en>D-3 uses the exact accepted successful-empty title and description.</en></lang>
  assert.equal(messages.includes("'home.emptyTitle': '暂无可展示资源'"), true);
  assert.equal(messages.includes("'home.emptyDescription': '当前本地示例中没有可展示的场馆或服务。'"), true);
  assert.equal(messages.includes("'home.emptyTitle': 'No resources to show'"), true);
  assert.equal(messages.includes("'home.emptyDescription': 'The current local demo has no venues or services to display.'"), true);
});

test('Board D retains a featured snapshot during refresh loading/failure and keeps the data notice unconditional', async function verifyBoardDRetainedSnapshotProjection() {
  // <lang><zh-CN>本门禁只读取首页投影，证明已有 canonical entry 时不会退回首次恢复面。</zh-CN><en>This gate reads only the Home projection, proving an existing canonical entry cannot fall back to an initial-recovery surface.</en></lang>
  const { home } = await readBoardDSources();

  // <lang><zh-CN>loading 与 failure 的首次状态均显式要求空快照，因此已有 featuredEntry 会继续进入卡片分支。</zh-CN><en>Both initial loading and initial failure explicitly require an empty snapshot, so an existing featuredEntry continues into the card branch.</en></lang>
  assert.match(home, /const isCatalogPreparing = computed\(\(\) =>[\s\S]*?&& featuredEntry\.value === null\);/u);
  assert.match(home, /const isInitialCatalogFailure = computed\(\(\) =>[\s\S]*?&& featuredEntry\.value === null\);/u);
  assert.match(home, /<view v-else-if="featuredEntry" class="home-page__featured-card">[\s\S]*?<resource-card :entry="featuredEntry" layout="featured" @view="openDetail"\s*\/>/u);

  // <lang><zh-CN>刷新 failure 与快照同时存在时只在卡片上方增加 warning UNotice，不替换卡片或增加阻断 action。</zh-CN><en>When refresh failure and a snapshot coexist, only a warning UNotice is added above the card without replacing it or adding a blocking action.</en></lang>
  assert.match(home, /const hasRetainedFeaturedFailure = computed\(\(\) => demo\.catalogFailure\.value !== null && featuredEntry\.value !== null\);/u);
  assert.match(home, /v-if="hasRetainedFeaturedFailure" class="home-page__refresh-notice">\s*<u-notice visible tone="warning" :message="retainedCatalogFailureMessage"\s*\/>[\s\S]*?<resource-card :entry="featuredEntry"/u);

  // <lang><zh-CN>数据来源说明使用无条件 wrapper，并位于完整精选状态组之后；所有恢复态都保留该说明。</zh-CN><en>The data-source explanation uses an unconditional wrapper after the complete featured-state group, so every recovery state retains it.</en></lang>
  assert.equal(countMatches(home, /<view class="home-page__data-notice">/gu), 1);
  assert.match(home, /<view v-else-if="featuredEntry" class="home-page__featured-card">[\s\S]*?<\/view>\s*<\/view>[\s\S]*?<view class="home-page__data-notice">\s*<u-alert-tips show type="primary">/u);
});

test('Home owns no fixture, build-mode, route, or storage recovery bypass', async function verifyBoardDPageBoundary() {
  // <lang><zh-CN>页面源码是旁路检查的唯一输入；review 模块和 Vite 配置拥有各自独立边界。</zh-CN><en>Page source is the sole bypass-check input; the review module and Vite configuration own separate boundaries.</en></lang>
  const { home } = await readBoardDSources();

  /**
   * <lang><zh-CN>首页禁止出现的 fixture、编译配置、route 状态与 storage API 入口。</zh-CN><en>Fixture, compile-configuration, route-state, and storage API entries forbidden from Home.</en></lang>
   * @lang zh-CN 表达式只匹配可执行标识符或固定 mode，不把自然语言中的 reviewed 等词误报为旁路。
   * @lang en Expressions match only executable identifiers or a fixed mode and do not misreport natural-language words such as reviewed as bypasses.
   */
  const forbiddenHomeBypasses = Object.freeze([
    /fixtureCase/u,
    /HOME_CATALOG_REVIEW/u,
    /__HIA_HOME_CATALOG_REVIEW_CASE__/u,
    /review-home-(?:ready|loading|failure|empty)/u,
    /import\.meta\.env/u,
    /process\.env/u,
    /(?:uni\.)?(?:get|set|remove|clear)Storage(?:Sync)?\s*\(/u,
    /(?:localStorage|sessionStorage)\s*\./u,
    /(?:useRoute|getCurrentPages|onLoad)\s*\(/u
  ]);

  // <lang><zh-CN>逐项确认首页只从共享 state/facade 投影恢复态，而不自行选择审阅 case。</zh-CN><en>Confirm item by item that Home projects recovery states only from shared state/facade and never selects a review case itself.</en></lang>
  for (const forbiddenPattern of forbiddenHomeBypasses) assert.doesNotMatch(home, forbiddenPattern);
});

test('home catalog review fixture exposes one frozen allowlist and exact case-dependent runtime options', function verifyReviewFixtureContract() {
  // <lang><zh-CN>公开 allowlist 的成员、顺序与冻结状态都是跨 adapter、project 与 Vite 对齐的唯一词汇表。</zh-CN><en>The public allowlist's members, order, and frozen state form the sole vocabulary aligned across adapter, project, and Vite.</en></lang>
  assert.deepEqual(HOME_CATALOG_REVIEW_CASES, ['ready', 'loading', 'failure', 'empty']);
  assert.equal(Object.isFrozen(HOME_CATALOG_REVIEW_CASES), true);

  // <lang><zh-CN>Node/default 编译入口必须固定为 ready，不读取进程、route、storage 或全局属性。</zh-CN><en>The Node/default compiled entry must remain ready without reading process, route, storage, or a global property.</en></lang>
  assert.equal(getCompiledHomeCatalogReviewCase(), 'ready');

  /**
   * <lang><zh-CN>非 loading case 都必须获得完全相同的空 timing surface。</zh-CN><en>Every non-loading case must receive the same exact empty timing surface.</en></lang>
   * @lang zh-CN 三项逐一创建，避免一个共享可变 fixture 掩盖 case 泄漏。
   * @lang en Create all three independently so one shared mutable fixture cannot conceal case leakage.
   */
  const nonLoadingCases = Object.freeze(['ready', 'failure', 'empty']);
  for (const fixtureCase of nonLoadingCases) {
    // <lang><zh-CN>每次创建都必须只返回 case 与 runtimeTiming 两个冻结字段。</zh-CN><en>Every creation must return only the two frozen case and runtimeTiming fields.</en></lang>
    const fixture = createHomeCatalogReviewFixture({ fixtureCase });
    assert.deepEqual(Reflect.ownKeys(fixture), ['fixtureCase', 'runtimeTiming']);
    assert.equal(fixture.fixtureCase, fixtureCase);
    assert.deepEqual(fixture.runtimeTiming, {});
    assert.equal(Object.isFrozen(fixture.runtimeTiming), true);
    assert.equal(Object.isFrozen(fixture), true);
  }

  // <lang><zh-CN>无参数与空 record 都明确产生相同的 release-safe ready fixture。</zh-CN><en>No arguments and an empty record both explicitly produce the same release-safe ready fixture.</en></lang>
  assert.equal(createHomeCatalogReviewFixture().fixtureCase, 'ready');
  assert.equal(createHomeCatalogReviewFixture({}).fixtureCase, 'ready');

  // <lang><zh-CN>null-prototype plain record 仍只有一个 data field，故按模块的 plain-record 合同接受。</zh-CN><en>A null-prototype plain record still has one data field and is accepted by the module's plain-record contract.</en></lang>
  const nullPrototypeOptions = Object.assign(Object.create(null), { fixtureCase: 'empty' });
  assert.equal(createHomeCatalogReviewFixture(nullPrototypeOptions).fixtureCase, 'empty');

  // <lang><zh-CN>loading 独占模块自有 scheduler pair；outer、timing 与不透明 token 均不可变。</zh-CN><en>Loading alone owns the module-provided scheduler pair; the outer value, timing, and opaque token are all immutable.</en></lang>
  const loadingFixture = createHomeCatalogReviewFixture({ fixtureCase: 'loading' });
  assert.deepEqual(Reflect.ownKeys(loadingFixture.runtimeTiming).sort(), ['clearSchedule', 'schedule']);
  assert.equal(typeof loadingFixture.runtimeTiming.schedule, 'function');
  assert.equal(typeof loadingFixture.runtimeTiming.clearSchedule, 'function');
  assert.equal(Object.isFrozen(loadingFixture.runtimeTiming), true);
  assert.equal(Object.isFrozen(loadingFixture), true);

  // <lang><zh-CN>调度器不得执行 runtime callback 或按真实 delay 建立计时器，只返回稳定不透明 token。</zh-CN><en>The scheduler must neither execute the runtime callback nor create a real-delay timer and returns only a stable opaque token.</en></lang>
  let callbackWasInvoked = false;
  const timerToken = loadingFixture.runtimeTiming.schedule(() => {
    // <lang><zh-CN>若 callback 被调用，标记会使下方同步断言失败。</zh-CN><en>If the callback is invoked, the marker makes the synchronous assertion below fail.</en></lang>
    callbackWasInvoked = true;
  }, 1);
  assert.equal(callbackWasInvoked, false);
  assert.equal(Object.isFrozen(timerToken), true);
  assert.equal(loadingFixture.runtimeTiming.clearSchedule(timerToken), undefined);
});

test('home catalog review fixture rejects every non-exact or behavior-bearing options shape', function verifyReviewFixtureOptionBoundary() {
  /**
   * <lang><zh-CN>常见非法值覆盖非 record、未知 case、额外字段、注入函数与自定义 prototype。</zh-CN><en>Common invalid values cover non-records, an unknown case, extra fields, injected functions, and a custom prototype.</en></lang>
   * @lang zh-CN 所有错误只需失败关闭；测试不绑定内部错误措辞。
   * @lang en Every error only needs to fail closed; the test does not bind internal error wording.
   */
  const invalidOptions = Object.freeze([
    null,
    [],
    'ready',
    { fixtureCase: 'unknown' },
    { fixtureCase: 'ready', extra: true },
    { fixtureCase: 'loading', schedule: () => undefined },
    Object.create({ fixtureCase: 'ready' })
  ]);

  // <lang><zh-CN>每个候选都必须在创建 fixture 前同步拒绝。</zh-CN><en>Every candidate must be rejected synchronously before a fixture is created.</en></lang>
  for (const options of invalidOptions) assert.throws(() => createHomeCatalogReviewFixture(options));

  // <lang><zh-CN>不可枚举额外字段仍是 own field，不能利用 Object.keys 可见性绕过 exact shape。</zh-CN><en>A non-enumerable extra field is still an own field and cannot bypass the exact shape through Object.keys visibility.</en></lang>
  const optionsWithHiddenField = { fixtureCase: 'ready' };
  Object.defineProperty(optionsWithHiddenField, 'hidden', { value: true });
  assert.throws(() => createHomeCatalogReviewFixture(optionsWithHiddenField));

  // <lang><zh-CN>symbol 额外字段同样属于 options shape，必须失败关闭。</zh-CN><en>A symbol extra field likewise belongs to the options shape and must fail closed.</en></lang>
  const optionsWithSymbolField = { fixtureCase: 'ready', [Symbol('hidden')]: true };
  assert.throws(() => createHomeCatalogReviewFixture(optionsWithSymbolField));

  // <lang><zh-CN>accessor 不是 plain data field；验证器必须在不执行 getter 的前提下拒绝它。</zh-CN><en>An accessor is not a plain data field; validation must reject it without executing the getter.</en></lang>
  let accessorWasRead = false;
  const optionsWithAccessor = {};
  Object.defineProperty(optionsWithAccessor, 'fixtureCase', {
    enumerable: true,
    get() {
      // <lang><zh-CN>任何读取都会暴露 options 行为注入，因此记录为门禁失败。</zh-CN><en>Any read would expose options behavior injection and is therefore recorded as a gate failure.</en></lang>
      accessorWasRead = true;
      return 'ready';
    }
  });
  assert.throws(() => createHomeCatalogReviewFixture(optionsWithAccessor));
  assert.equal(accessorWasRead, false);
});

test('review source has no runtime selection bypass and Vite modes are exact, default-safe, and fail closed', async function verifyViteReviewModeContract() {
  // <lang><zh-CN>同时读取静态源码并加载配置模块，分别锁定无旁路文本边界与可执行映射行为。</zh-CN><en>Read static sources and load the configuration module together, locking both the bypass-free textual boundary and executable mapping behavior.</en></lang>
  const { review, vite } = await readBoardDSources();
  const viteModule = await import('../vite.config.mjs');

  // <lang><zh-CN>移除双语说明后只检查可执行 review 代码，避免把“不得读取 process.env”等约束文本误报为实现。</zh-CN><en>Check only executable review code after removing bilingual explanations so constraints such as “must not read process.env” are not misreported as implementation.</en></lang>
  const executableReviewSource = withoutJavaScriptComments(review);

  // <lang><zh-CN>review 模块只允许 compile-time identifier，不读取常见运行时配置入口。</zh-CN><en>The review module allows only its compile-time identifier and reads no common runtime-configuration entry.</en></lang>
  assert.doesNotMatch(executableReviewSource, /process\.env|import\.meta\.env|globalThis\s*\[|(?:localStorage|sessionStorage)\s*\.|uni\.(?:get|set)Storage/u);
  assert.match(review, /typeof __HIA_HOME_CATALOG_REVIEW_CASE__ === 'string'/u);

  // <lang><zh-CN>Vite 必须公开唯一精确 resolver，四项 checked-in mode 一一映射到 allowlist case。</zh-CN><en>Vite must expose one exact resolver whose four checked-in modes map one-to-one onto allowlisted cases.</en></lang>
  assert.equal(typeof viteModule.resolveHomeCatalogReviewCaseFromMode, 'function');
  const resolveReviewCase = viteModule.resolveHomeCatalogReviewCaseFromMode;
  assert.equal(resolveReviewCase('review-home-ready'), 'ready');
  assert.equal(resolveReviewCase('review-home-loading'), 'loading');
  assert.equal(resolveReviewCase('review-home-failure'), 'failure');
  assert.equal(resolveReviewCase('review-home-empty'), 'empty');

  // <lang><zh-CN>普通 development/production/custom mode 与非字符串输入均保持 ready，不意外启用审阅夹具。</zh-CN><en>Ordinary development, production, and custom modes plus non-string input remain ready and cannot accidentally enable the review fixture.</en></lang>
  assert.equal(resolveReviewCase('development'), 'ready');
  assert.equal(resolveReviewCase('production'), 'ready');
  assert.equal(resolveReviewCase('custom-local-build'), 'ready');
  assert.equal(resolveReviewCase(undefined), 'ready');

  // <lang><zh-CN>任何进入固定 review-home namespace 却未精确命中的拼写都必须失败关闭，而不是静默生成 ready 截图。</zh-CN><en>Any spelling entering the fixed review-home namespace without an exact match must fail closed instead of silently producing a ready screenshot.</en></lang>
  const invalidReviewModes = Object.freeze([
    'review-home-',
    'review-home-unknown',
    'review-home-loading-extra',
    'review-home-EMPTY'
  ]);
  for (const invalidMode of invalidReviewModes) assert.throws(() => resolveReviewCase(invalidMode));

  // <lang><zh-CN>标准与显式审阅配置只把一个 JSON string literal 写入与 review 模块一致的 compile-time identifier。</zh-CN><en>Standard and explicit review configurations write only one JSON string literal into the compile-time identifier shared with the review module.</en></lang>
  const standardConfig = viteModule.default({ mode: 'production', command: 'build' });
  const emptyReviewConfig = viteModule.default({ mode: 'review-home-empty', command: 'build' });
  assert.deepEqual(Reflect.ownKeys(standardConfig.define), ['__HIA_HOME_CATALOG_REVIEW_CASE__']);
  assert.equal(standardConfig.define.__HIA_HOME_CATALOG_REVIEW_CASE__, '"ready"');
  assert.equal(emptyReviewConfig.define.__HIA_HOME_CATALOG_REVIEW_CASE__, '"empty"');
  assert.equal('envPrefix' in standardConfig, false);
  assert.equal('server' in standardConfig, false);

  // <lang><zh-CN>静态配置不得遗留旧 identifier、动态 env loader 或页面可读 mode surface。</zh-CN><en>The static configuration must retain no legacy identifier, dynamic environment loader, or page-readable mode surface.</en></lang>
  assert.match(vite, /export function resolveHomeCatalogReviewCaseFromMode\(mode\)/u);
  assert.match(vite, /__HIA_HOME_CATALOG_REVIEW_CASE__:\s*JSON\.stringify\(/u);
  assert.doesNotMatch(vite, /__BP_HOME_REVIEW_STATE__|\bloadEnv\s*\(/u);
});
