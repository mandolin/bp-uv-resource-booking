/**
 * <lang><zh-CN>首页恢复态审阅 fixture 契约测试：锁定 Vite mode 白名单、默认 ready、真实 Biz facade execution，以及 loading/failure/empty 三种受控结果。</zh-CN><en>Home recovery-state review-fixture contract tests: lock the Vite-mode allowlist, ready default, real Biz-facade execution, and the three controlled loading, failure, and empty outcomes.</en></lang>
 * @lang zh-CN 测试只使用仓内 local adapter 与编译配置函数，不读取 URL、storage、网络、DevTools 注入或生成 dist 文件。
 * @lang en Tests use only the in-repository local adapter and compile-configuration function and read no URL, storage, network, DevTools injection, or generated dist file.
 */

// <lang><zh-CN>严格断言固定有限 mode、canonical outcome 与 source execution facts。</zh-CN><en>Use strict assertions to fix finite modes, canonical outcomes, and source-execution facts.</en></lang>
import assert from 'node:assert/strict';

// <lang><zh-CN>Node 原生 runner 避免为审阅 fixture 引入新测试依赖。</zh-CN><en>The native Node runner avoids adding a test dependency for the review fixture.</en></lang>
import test from 'node:test';

// <lang><zh-CN>稳定 operation ID 只用于定位 count-only execution/observation，不绕过 project facade。</zh-CN><en>The stable operation ID only locates count-only execution and observation and does not bypass the project facade.</en></lang>
import { RESOURCE_BOOKING_OPERATION_IDS } from '../src/project/resource-booking-contracts.mjs';

// <lang><zh-CN>所有业务断言都通过高层 project factory 进入真实 Biz capability/operation gate。</zh-CN><en>Every business assertion enters the real Biz capability and operation gate through the high-level project factory.</en></lang>
import { createResourceBookingProject } from '../src/project/resource-booking-project.mjs';

// <lang><zh-CN>配置断言直接验证静态 mode resolver 与 Vite compile-time literal。</zh-CN><en>Configuration assertions directly verify the static mode resolver and Vite compile-time literal.</en></lang>
import viteConfig, { resolveHomeCatalogReviewCaseFromMode } from '../vite.config.mjs';

/**
 * <lang><zh-CN>创建首页首次目录读取使用的精确 request。</zh-CN><en>Creates the exact request used by the initial Home catalog read.</en></lang>
 * @returns {object} <lang><zh-CN>无动态字段、URL 或 transport metadata 的 page-one request。</zh-CN><en>Page-one request containing no dynamic field, URL, or transport metadata.</en></lang>
 * @lang zh-CN 每次返回新 plain data，防止测试之间共享 caller-mutable request。
 * @lang en Returns fresh plain data every time, preventing caller-mutable requests from being shared between tests.
 */
function createHomeCatalogRequest() {
  // <lang><zh-CN>字段集合与 production state 的 project-facing call 完全一致。</zh-CN><en>The field set exactly matches the project-facing call made by production state.</en></lang>
  return {
    page: 1,
    pageSize: 2,
    keyword: '',
    venueId: '',
    resourceTypeId: '',
    date: ''
  };
}

/**
 * <lang><zh-CN>读取单个目录 operation 的 adapter execution 次数。</zh-CN><en>Reads the adapter-execution count for the sole catalog operation.</en></lang>
 * @param {object} project <lang><zh-CN>高层资源预约 project facade。</zh-CN><en>High-level resource-booking project facade.</en></lang>
 * @returns {number} <lang><zh-CN>不含 request/result 的 count-only invocation fact。</zh-CN><en>Count-only invocation fact containing no request or result.</en></lang>
 * @lang zh-CN helper 不读取 adapter token、handler、dataset 或 raw runtime facade。
 * @lang en The helper reads no adapter token, handler, dataset, or raw runtime facade.
 */
function readCatalogInvocationCount(project) {
  // <lang><zh-CN>在已脱敏 source facts 中按 checked-in operation ID 定位唯一记录。</zh-CN><en>Locate the sole record in redacted source facts by the checked-in operation ID.</en></lang>
  const execution = project.getSourceFacts().execution.find(
    (entry) => entry.operationId === RESOURCE_BOOKING_OPERATION_IDS.queryCatalog
  );

  // <lang><zh-CN>完整 project relation 必须始终提供该固定 execution record。</zh-CN><en>The complete project relation must always provide this fixed execution record.</en></lang>
  assert.ok(execution);

  // <lang><zh-CN>只交付整数次数，不暴露其余 source facts。</zh-CN><en>Return only the integer count and expose no other source facts.</en></lang>
  return execution.invocations;
}

/**
 * <lang><zh-CN>验证 Vite mode 只接受四项精确 key，标准与未知 mode 保持 ready。</zh-CN><en>Verifies that Vite modes accept only four exact keys while standard and unknown modes remain ready.</en></lang>
 * @returns {void} <lang><zh-CN>映射与 compile literal 断言完成信号。</zh-CN><en>Completion signal for mapping and compile-literal assertions.</en></lang>
 * @lang zh-CN 测试不设置 process environment，也不创建 `.env` 或运行时配置入口。
 * @lang en The test sets no process environment and creates neither an `.env` file nor a runtime configuration entry.
 */
function testViteModeAllowlist() {
  // <lang><zh-CN>四项显式审阅 mode 必须逐一映射到同名有限状态。</zh-CN><en>Each of the four explicit review modes must map to the correspondingly named finite state.</en></lang>
  assert.equal(resolveHomeCatalogReviewCaseFromMode('review-home-ready'), 'ready');
  assert.equal(resolveHomeCatalogReviewCaseFromMode('review-home-loading'), 'loading');
  assert.equal(resolveHomeCatalogReviewCaseFromMode('review-home-failure'), 'failure');
  assert.equal(resolveHomeCatalogReviewCaseFromMode('review-home-empty'), 'empty');

  // <lang><zh-CN>普通 mode、大小写不同但未进入保留 namespace 的文本和非字符串输入都不能启用 fixture。</zh-CN><en>Ordinary modes, case-shifted text outside the reserved namespace, and non-string inputs must not enable a fixture.</en></lang>
  assert.equal(resolveHomeCatalogReviewCaseFromMode('production'), 'ready');
  assert.equal(resolveHomeCatalogReviewCaseFromMode('custom-local-build'), 'ready');
  assert.equal(resolveHomeCatalogReviewCaseFromMode('REVIEW-HOME-EMPTY'), 'ready');
  assert.equal(resolveHomeCatalogReviewCaseFromMode(undefined), 'ready');

  // <lang><zh-CN>已进入保留 review namespace 的未知拼写必须抛出，而不是静默生成 ready 审阅产物。</zh-CN><en>An unknown spelling inside the reserved review namespace must throw instead of silently generating a ready review artifact.</en></lang>
  assert.throws(() => resolveHomeCatalogReviewCaseFromMode('review-home-loading-extra'));
  assert.throws(() => resolveHomeCatalogReviewCaseFromMode('review-home-unknown'));

  // <lang><zh-CN>Vite callback 把标准 production mode 编译成 JSON ready literal，而不是运行时 mode reader。</zh-CN><en>The Vite callback compiles standard production mode into a JSON ready literal rather than a runtime mode reader.</en></lang>
  const standardConfig = viteConfig({ mode: 'production', command: 'build' });
  assert.equal(standardConfig.define.__HIA_HOME_CATALOG_REVIEW_CASE__, '"ready"');

  // <lang><zh-CN>显式 failure mode 只改变同一个 literal，不添加环境或网络配置。</zh-CN><en>The explicit failure mode changes only the same literal and adds no environment or network configuration.</en></lang>
  const failureConfig = viteConfig({ mode: 'review-home-failure', command: 'build' });
  assert.equal(failureConfig.define.__HIA_HOME_CATALOG_REVIEW_CASE__, '"failure"');
  assert.equal('envPrefix' in failureConfig, false);
  assert.equal('server' in failureConfig, false);

  // <lang><zh-CN>未知普通 Vite mode 与 production 一样编译为 ready；保留 review namespace 则已在上方证明失败关闭。</zh-CN><en>An unknown ordinary Vite mode compiles to ready like production; the reserved review namespace is proven above to fail closed.</en></lang>
  const unknownConfig = viteConfig({ mode: 'custom-local-build', command: 'build' });
  assert.equal(unknownConfig.define.__HIA_HOME_CATALOG_REVIEW_CASE__, '"ready"');
}

/**
 * <lang><zh-CN>验证空 factory options 使用 ready，而非法 direct options 在 project 边界严格失败关闭。</zh-CN><en>Verifies that empty factory options use ready while invalid direct options fail closed at the project boundary.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>ready page 与全部负向 options 断言完成后 resolve。</zh-CN><en>Resolves after the ready page and every negative-options assertion complete.</en></lang>
 * @lang zh-CN direct factory 不执行未知值回退；只有 Vite mode resolver 可把未知构建 mode 映射为 ready。
 * @lang en Direct factories perform no unknown-value fallback; only the Vite-mode resolver may map an unknown build mode to ready.
 */
async function testReadyFallback() {
  // <lang><zh-CN>无参数 factory 是公开标准构建使用的 ready 基线。</zh-CN><en>The no-argument factory is the ready baseline used by public standard builds.</en></lang>
  const defaultProject = createResourceBookingProject();
  const defaultOutcome = await defaultProject.queryResourceCatalog(createHomeCatalogRequest()).promise;
  assert.equal(defaultOutcome.kind, 'page');
  assert.equal(defaultOutcome.entries.length, 2);
  assert.equal(readCatalogInvocationCount(defaultProject), 1);

  // <lang><zh-CN>旧 string factory 形状、未知 case 与额外数据字段都必须在创建 runtime 前抛出固定错误。</zh-CN><en>The legacy string-factory shape, an unknown case, and an extra data field must all throw fixed errors before creating a runtime.</en></lang>
  assert.throws(() => createResourceBookingProject('empty'));
  assert.throws(() => createResourceBookingProject({ fixtureCase: 'unknown' }));
  assert.throws(() => createResourceBookingProject({ fixtureCase: 'empty', extra: true }));

  // <lang><zh-CN>callback 形式的 scheduler 字段属于 behavioral injection，即使 case 合法也必须失败关闭。</zh-CN><en>A callback-shaped scheduler field is behavioral injection and must fail closed even when the case itself is valid.</en></lang>
  assert.throws(() => createResourceBookingProject({
    fixtureCase: 'loading',
    schedule: () => undefined
  }));

  // <lang><zh-CN>accessor 不能成为隐藏 case reader；descriptor 校验必须在执行 getter 前拒绝它。</zh-CN><en>An accessor cannot become a hidden case reader; descriptor validation must reject it before executing the getter.</en></lang>
  let accessorReads = 0;
  const accessorOptions = {};
  Object.defineProperty(accessorOptions, 'fixtureCase', {
    enumerable: true,
    get() {
      // <lang><zh-CN>若该分支执行，说明审阅 factory 已读取 behavioral input，测试必须失败。</zh-CN><en>If this branch executes, the review factory read behavioral input and the test must fail.</en></lang>
      accessorReads += 1;
      return 'empty';
    }
  });
  assert.throws(() => createResourceBookingProject(accessorOptions));
  assert.equal(accessorReads, 0);
}

/**
 * <lang><zh-CN>验证 empty fixture 通过 Biz facade 返回成功 canonical empty page。</zh-CN><en>Verifies that the empty fixture returns a successful canonical empty page through the Biz facade.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>空页与 execution facts 断言完成后 resolve。</zh-CN><en>Resolves after empty-page and execution-fact assertions complete.</en></lang>
 * @lang zh-CN empty 不是 provider failure，也不让页面或 state 直接覆盖 entries。
 * @lang en Empty is not a provider failure and does not let a page or state directly overwrite entries.
 */
async function testEmptyOutcomeThroughFacade() {
  // <lang><zh-CN>显式有限状态只在独立 project transaction 内启用。</zh-CN><en>Enable the explicit finite state only inside an isolated project transaction.</en></lang>
  const project = createResourceBookingProject({ fixtureCase: 'empty' });
  const outcome = await project.queryResourceCatalog(createHomeCatalogRequest()).promise;

  // <lang><zh-CN>canonical page 保留分页与 actual-source contract，同时明确 total/entries 均为空。</zh-CN><en>The canonical page retains pagination and actual-source contracts while explicitly making both total and entries empty.</en></lang>
  assert.equal(outcome.kind, 'page');
  assert.deepEqual(outcome.entries, []);
  assert.equal(outcome.total, 0);
  assert.equal(outcome.hasNext, false);
  // <lang><zh-CN>空目录不能泄漏 ready dataset 的场馆、资源类型或日期筛选项。</zh-CN><en>An empty catalog cannot leak venue, resource-type, or date filters from the ready dataset.</en></lang>
  assert.deepEqual(outcome.filterOptions.venues, []);
  assert.deepEqual(outcome.filterOptions.resourceTypes, []);
  assert.deepEqual(outcome.filterOptions.dates, []);
  assert.equal(outcome.source.authority, 'local');
  assert.equal(readCatalogInvocationCount(project), 1);
}

/**
 * <lang><zh-CN>验证 failure fixture 经 Biz runtime source failure 映射为可显式重试的项目 canonical failure。</zh-CN><en>Verifies that the failure fixture maps a Biz-runtime source failure into an explicitly retryable project canonical failure.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>failure、source 与 observation 断言完成后 resolve。</zh-CN><en>Resolves after failure, source, and observation assertions complete.</en></lang>
 * @lang zh-CN 结果不回显 lower runtime code/message，只保留项目 code、双语 message 与 actual source。
 * @lang en The result echoes no lower-runtime code or message and retains only the project code, bilingual message, and actual source.
 */
async function testFailureOutcomeThroughFacade() {
  // <lang><zh-CN>独立 failure project 确保其他测试不共享 source observation。</zh-CN><en>An isolated failure project ensures no source observation is shared with another test.</en></lang>
  const project = createResourceBookingProject({ fixtureCase: 'failure' });
  const outcome = await project.queryResourceCatalog(createHomeCatalogRequest()).promise;

  // <lang><zh-CN>高层 outcome 必须是可重试 provider failure，并保留 local actual-source fact。</zh-CN><en>The high-level outcome must be a retryable provider failure retaining the local actual-source fact.</en></lang>
  assert.equal(outcome.kind, 'failure');
  assert.equal(outcome.code, 'provider-unavailable');
  assert.equal(outcome.retryable, true);
  assert.equal(outcome.scope, 'provider');
  assert.equal(outcome.source.authority, 'local');
  assert.equal(readCatalogInvocationCount(project), 1);

  // <lang><zh-CN>Biz observation 的 unavailable terminal 证明结果不是页面或 state 伪造。</zh-CN><en>The unavailable terminal in Biz observation proves the result was not fabricated by a page or state.</en></lang>
  const observation = project.getSourceFacts().observation.operations.find(
    (entry) => entry.operationId === RESOURCE_BOOKING_OPERATION_IDS.queryCatalog
  );
  assert.ok(observation);
  assert.equal(observation.attempts, 1);
  assert.equal(observation.failures.unavailable, 1);
}

/**
 * <lang><zh-CN>验证 loading fixture 启动真实 Biz attempt 后保持高层审阅 Promise pending。</zh-CN><en>Verifies that the loading fixture holds the high-level review promise pending after starting a real Biz attempt.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>pending、execution 与 cancel 断言完成后 resolve。</zh-CN><en>Resolves after pending, execution, and cancellation assertions complete.</en></lang>
 * @lang zh-CN 测试结束前显式取消底层 runtime timer；pending 高层 Promise 本身不启动 timer，也不会阻止 Node 退出。
 * @lang en The test explicitly cancels the lower runtime timer before ending; the pending high-level promise starts no timer and does not prevent Node from exiting.
 */
async function testLoadingOutcomeThroughFacade() {
  // <lang><zh-CN>显式 loading project 启动与 production 完全相同的命名目录 operation。</zh-CN><en>The explicit loading project starts the same named catalog operation as production.</en></lang>
  const project = createResourceBookingProject({ fixtureCase: 'loading' });
  const handle = project.queryResourceCatalog(createHomeCatalogRequest());

  // <lang><zh-CN>让 async host 的受控启动 microtask 进入真实 adapter handler，不使用人工延时。</zh-CN><en>Allow the asynchronous host's controlled startup microtasks to enter the real adapter handler without an artificial delay.</en></lang>
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  // <lang><zh-CN>adapter invocation 与 Biz attempt 都必须已发生，证明 loading 不是直接 state mutation。</zh-CN><en>Both the adapter invocation and Biz attempt must have occurred, proving loading is not a direct state mutation.</en></lang>
  assert.equal(readCatalogInvocationCount(project), 1);
  const observation = project.getSourceFacts().observation.operations.find(
    (entry) => entry.operationId === RESOURCE_BOOKING_OPERATION_IDS.queryCatalog
  );
  assert.ok(observation);
  assert.equal(observation.starts, 1);
  assert.equal(observation.attempts, 1);

  // <lang><zh-CN>同一 microtask checkpoint 内 fixture promise 仍保持 pending。</zh-CN><en>The fixture promise remains pending within the same microtask checkpoint.</en></lang>
  const pendingProbe = await Promise.race([
    handle.promise.then(() => 'settled'),
    Promise.resolve('pending')
  ]);
  assert.equal(pendingProbe, 'pending');

  // <lang><zh-CN>测试收尾调用真实 runtime cancel；review scheduler 没有 wall-clock timer，标准 mapper 仍交付 canonical cancelled terminal。</zh-CN><en>Test teardown calls the real runtime cancel; the review scheduler has no wall-clock timer, while the standard mapper still delivers a canonical cancelled terminal.</en></lang>
  assert.equal(handle.cancel(), true);
  const cancelledOutcome = await handle.promise;
  assert.equal(cancelledOutcome.kind, 'failure');
  assert.equal(cancelledOutcome.code, 'cancelled');
  assert.equal(cancelledOutcome.retryable, false);
}

// <lang><zh-CN>五项测试分别锁定配置边界与四种有限运行结果，且每项创建独立 project transaction。</zh-CN><en>Five tests separately lock the configuration boundary and four finite runtime results, with each creating an isolated project transaction.</en></lang>
test('home review fixture accepts only explicit Vite modes', testViteModeAllowlist);
test('home review fixture defaults empty options to ready and rejects invalid direct options', testReadyFallback);
test('home empty review state returns a canonical page through Biz facade', testEmptyOutcomeThroughFacade);
test('home failure review state returns a retryable canonical failure through Biz facade', testFailureOutcomeThroughFacade);
test('home loading review state remains pending after a real Biz facade attempt', testLoadingOutcomeThroughFacade);
