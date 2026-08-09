/**
 * <lang><zh-CN>资源预约 BP 的 Biz project adoption 静态门禁：锁定声明式 profile、唯一 project-facing import 与 page/state/adapter 分层，不执行页面、网络或平台 API。</zh-CN><en>Static Biz-project-adoption gate for the resource-booking BP: locks declarative profiles, the sole project-facing import, and page/state/adapter layering without executing pages, network, or platform APIs.</en></lang>
 * @lang zh-CN 该测试证明源码不存在已知旁路；动态行为、operation 结果与 source lifecycle 由独立 project-runtime 测试覆盖。
 * @lang en This test proves source contains no known bypass; independent project-runtime tests cover dynamic behavior, operation outcomes, and source lifecycle.
 */

// <lang><zh-CN>标准断言与测试 runner 提供确定性失败，不引入第三方测试框架。</zh-CN><en>Standard assertions and test runner provide deterministic failures without a third-party test framework.</en></lang>
import assert from 'node:assert/strict';
import test from 'node:test';

// <lang><zh-CN>内建文件 API 只读取固定项目文件并检查旧入口不存在。</zh-CN><en>Built-in file APIs only read fixed project files and check that legacy entries are absent.</en></lang>
import { access, readFile, readdir } from 'node:fs/promises';

// <lang><zh-CN>路径工具从当前测试 URL 解析仓根，不依赖调用 cwd。</zh-CN><en>Path utilities resolve the repository root from this test URL without depending on caller cwd.</en></lang>
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * <lang><zh-CN>BP 仓库根的固定绝对路径。</zh-CN><en>Fixed absolute path of the BP repository root.</en></lang>
 */
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * <lang><zh-CN>可包含静态 import 的项目自有源码扩展名。</zh-CN><en>Project-owned source extensions that may contain static imports.</en></lang>
 */
const sourceExtensions = new Set(['.js', '.mjs', '.vue']);

/**
 * <lang><zh-CN>递归列出一个固定目录内的项目自有源码。</zh-CN><en>Recursively lists project-owned source under one fixed directory.</en></lang>
 * @param {string} directory <lang><zh-CN>当前受控目录。</zh-CN><en>Current controlled directory.</en></lang>
 * @returns {Promise<string[]>} <lang><zh-CN>普通源码文件的绝对路径。</zh-CN><en>Absolute paths of regular source files.</en></lang>
 * @lang zh-CN `vendor` 是独立 Git 输入且由输入 pin 管理；本测试不把上游内部 import 错判为 BP 绕过。
 * @lang en `vendor` is an independent Git input governed by input pins; this test does not misclassify upstream internal imports as BP bypasses.
 */
async function listOwnedSourceFiles(directory) {
  // <lang><zh-CN>目录项不跟随符号链接，扫描范围保持在显式 src tree。</zh-CN><en>Directory entries do not follow symbolic links, retaining the scan within the explicit src tree.</en></lang>
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  // <lang><zh-CN>逐项递归普通目录或收集受控扩展名的普通文件。</zh-CN><en>Recurse through regular directories or collect regular files with controlled extensions.</en></lang>
  for (const entry of entries) {
    // <lang><zh-CN>跳过独立治理的两个 source submodule。</zh-CN><en>Skip the two independently governed source submodules.</en></lang>
    if (entry.isDirectory() && entry.name === 'vendor') continue;

    // <lang><zh-CN>只递归真实目录；未知目录项不进入后续读取。</zh-CN><en>Recurse only through real directories; unknown entries do not enter later reads.</en></lang>
    if (entry.isDirectory()) {
      files.push(...await listOwnedSourceFiles(join(directory, entry.name)));
      continue;
    }

    // <lang><zh-CN>只加入可承载 import 的普通源码。</zh-CN><en>Add only regular source that can carry imports.</en></lang>
    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      files.push(join(directory, entry.name));
    }
  }

  // <lang><zh-CN>代码点排序使错误顺序跨主机稳定。</zh-CN><en>Code-point sorting keeps error order stable across hosts.</en></lang>
  return files.sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

/**
 * <lang><zh-CN>读取并解析一个固定仓内 JSON。</zh-CN><en>Reads and parses one fixed in-repository JSON document.</en></lang>
 * @param {string} relativePath <lang><zh-CN>由测试声明的仓内相对路径。</zh-CN><en>Repository-relative path declared by the test.</en></lang>
 * @returns {Promise<unknown>} <lang><zh-CN>解析后的 JSON 值。</zh-CN><en>Parsed JSON value.</en></lang>
 * @lang zh-CN 不接受调用方路径或 fallback；缺失/非法 JSON 直接失败。
 * @lang en Accepts no caller path or fallback; missing or invalid JSON fails directly.
 */
async function readJson(relativePath) {
  // <lang><zh-CN>路径只由固定仓根和测试内字面量组成。</zh-CN><en>The path consists only of the fixed repository root and a test literal.</en></lang>
  return JSON.parse(await readFile(resolve(repositoryRoot, relativePath), 'utf8'));
}

test('BP-owned source reaches Biz only through the project-facing package', async () => {
  // <lang><zh-CN>枚举 src 下全部项目自有 JS/MJS/Vue，避免只检查已知页面而漏掉新旁路。</zh-CN><en>Enumerate every BP-owned JS/MJS/Vue file under src so a new bypass cannot hide outside known pages.</en></lang>
  const sourceFiles = await listOwnedSourceFiles(resolve(repositoryRoot, 'src'));

  // <lang><zh-CN>三个 lower package 只能作为 project-runtime 的传递依赖，BP 自有源码不得直接命名它们。</zh-CN><en>The three lower packages are only project-runtime transitive dependencies and must not be named directly by BP-owned source.</en></lang>
  const forbiddenPackageSpecifiers = [
    '@hia-uview/biz-async-provider-runtime',
    '@hia-uview/biz-provider-port-runtime',
    '@hia-uview/biz-solution-profile-runtime'
  ];

  // <lang><zh-CN>仅 composition root 与 adapter authoring surface 可直接 import project package。</zh-CN><en>Only the composition root and adapter-authoring surface may directly import the project package.</en></lang>
  const allowedProjectPackageConsumers = new Set([
    'src/adapters/local-resource-booking-adapter.mjs',
    'src/project/resource-booking-project.mjs'
  ]);

  // <lang><zh-CN>逐文件读取文本；测试既不 import Vue 页面，也不执行任何业务模块。</zh-CN><en>Read text file by file; the test imports neither Vue pages nor any business module.</en></lang>
  for (const sourceFile of sourceFiles) {
    const sourceText = await readFile(sourceFile, 'utf8');
    const relativePath = relative(repositoryRoot, sourceFile).replaceAll('\\', '/');

    // <lang><zh-CN>任一下层 package specifier 都是失败，不允许 adapter 或测试 shim 例外。</zh-CN><en>Any lower-package specifier is a failure, with no adapter or test-shim exception.</en></lang>
    for (const forbiddenSpecifier of forbiddenPackageSpecifiers) {
      assert.equal(sourceText.includes(forbiddenSpecifier), false, `${relativePath} bypasses project runtime.`);
    }

    // <lang><zh-CN>相对路径 deep import 同样是旁路；即使未写 package specifier，也不得直接进入 vendor 内部 package。</zh-CN><en>A relative-path deep import is the same bypass; even without a package specifier, source must not enter an internal vendor package directly.</en></lang>
    assert.equal(sourceText.includes('HIA-uView-Biz/packages/'), false, `${relativePath} deep-imports a Biz vendor package.`);

    // <lang><zh-CN>直接 project package consumer 必须恰好处于两项 allowlist；页面/state 只能走本地 composition root。</zh-CN><en>A direct project-package consumer must be exactly one of two allowlisted files; pages and state use only the local composition root.</en></lang>
    if (sourceText.includes("from '@hia-uview/biz-project-runtime'")) {
      assert.equal(allowedProjectPackageConsumers.has(relativePath), true, `${relativePath} imports project runtime outside the composition boundary.`);
    }
  }
});

test('state and pages cannot bypass the project composition root', async () => {
  // <lang><zh-CN>state 是页面唯一业务入口，必须显式连接 project singleton。</zh-CN><en>State is the pages' sole business entry and must explicitly connect to the project singleton.</en></lang>
  const stateSource = await readFile(resolve(repositoryRoot, 'src/state/booking-demo.mjs'), 'utf8');
  assert.equal(stateSource.includes("from '../project/resource-booking-project.mjs'"), true);

  // <lang><zh-CN>收集 state 对 project singleton 的全部命名调用；去重后代码点排序，使新增任意 dispatch 或遗漏 operation 都可确定失败。</zh-CN><en>Collect every named project-singleton call from state; deduplication and code-point sorting make any arbitrary dispatch addition or missing operation fail deterministically.</en></lang>
  const invokedProjectMethods = [...new Set(
    [...stateSource.matchAll(/resourceBookingProject\.([A-Za-z][A-Za-z0-9]*)\s*\(/gu)].map((match) => match[1])
  )].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);

  // <lang><zh-CN>state 必须恰好使用六项高层方法，不能少走 facade，也不能增加 raw invoke/doctor 作为业务路径。</zh-CN><en>State must use exactly the six high-level methods, neither skipping the facade nor adding raw invoke or doctor as a business path.</en></lang>
  assert.deepEqual(invokedProjectMethods, [
    'cancelReservation',
    'createReservation',
    'listReservations',
    'queryResourceCatalog',
    'readResourceDetail',
    'rescheduleReservation'
  ]);

  // <lang><zh-CN>已知旁路全部禁止：直接 JSON、data helper、adapter、services 与旧 provider 名称。</zh-CN><en>Forbid every known bypass: direct JSON, data helper, adapter, services, and legacy-provider names.</en></lang>
  for (const forbiddenStateBoundary of ['venues.json', 'local-dataset', '../adapters/', '../services/', 'startLocalCatalogQuery', 'startLocalReservationWrite']) {
    assert.equal(stateSource.includes(forbiddenStateBoundary), false);
  }

  // <lang><zh-CN>所有页面都只能经共享 state 访问业务数据；受控图片 asset map 仍可直接用于纯展示。</zh-CN><en>Every page may access business data only through shared state; the controlled image asset map may still serve pure presentation directly.</en></lang>
  const pageFiles = (await listOwnedSourceFiles(resolve(repositoryRoot, 'src/pages'))).filter((filePath) => extname(filePath) === '.vue');
  for (const pageFile of pageFiles) {
    const pageSource = await readFile(pageFile, 'utf8');
    assert.equal(pageSource.includes('/project/'), false);
    assert.equal(pageSource.includes('/adapters/'), false);
    assert.equal(pageSource.includes('/domain/'), false);
    assert.equal(pageSource.includes('/services/'), false);
    assert.equal(pageSource.includes('venues.json'), false);
    assert.equal(pageSource.includes('local-dataset'), false);

    // <lang><zh-CN>页面可读取唯一纯展示 asset map；任何其他 data module 或 JSON import 都会绕过 state/project outcome。</zh-CN><en>Pages may read only the presentation-only asset map; any other data module or JSON import would bypass state and project outcomes.</en></lang>
    assert.equal(/from\s+['"][^'"]*\/data\/(?!asset-map\.mjs['"])/u.test(pageSource), false);
    assert.equal(/from\s+['"][^'"]*\.json['"]/u.test(pageSource), false);
  }

  // <lang><zh-CN>两个旧 service 入口必须物理不存在，避免新页面误用兼容捷径。</zh-CN><en>The two legacy service entries must be physically absent so a new page cannot use a compatibility shortcut.</en></lang>
  await assert.rejects(access(resolve(repositoryRoot, 'src/services/local-project-provider.mjs')));
  await assert.rejects(access(resolve(repositoryRoot, 'src/services/local-reservation-write-provider.mjs')));
});

test('checked-in declarations expose the exact six-operation local project', async () => {
  // <lang><zh-CN>并行读取四项声明与 package manifest；它们都是固定公开样板输入。</zh-CN><en>Read the four declarations and package manifest in parallel; all are fixed public boilerplate inputs.</en></lang>
  const [projectProfile, solutionProfile, capabilityPackages, session, packageManifest] = await Promise.all([
    readJson('src/project/project.profile.json'),
    readJson('src/project/solution.profile.json'),
    readJson('src/project/capability-packages.json'),
    readJson('src/project/anonymous-session.json'),
    readJson('package.json')
  ]);

  // <lang><zh-CN>锁定 profile identity、唯一 local mode 与六项明确 operation。</zh-CN><en>Lock profile identity, the sole local mode, and six explicit operations.</en></lang>
  assert.equal(projectProfile.projectProfileVersion, '1.0');
  assert.equal(projectProfile.kind, 'project-profile');
  assert.equal(projectProfile.solutionProfileId, solutionProfile.id);
  assert.equal(projectProfile.channelProfileId, solutionProfile.channelProfileId);
  assert.deepEqual(projectProfile.sourceSelection.settingModes, ['local']);
  assert.deepEqual(projectProfile.operationSelections.map((selection) => selection.operationId), [
    'resource.catalog.query',
    'resource.detail.read',
    'reservation.list',
    'reservation.create',
    'reservation.cancel',
    'reservation.reschedule'
  ]);

  // <lang><zh-CN>operation 必须逐项绑定语义相符的 capability：目录 read、预约 create 与预约 manage 不得再次混为同一模块声明。</zh-CN><en>Each operation must bind to its matching capability: directory reads, reservation creation, and reservation management must not collapse back into one module declaration.</en></lang>
  assert.deepEqual(
    projectProfile.operationSelections.map((selection) => [selection.operationId, selection.capabilityPackageId]),
    [
      ['resource.catalog.query', 'bp-uv-resource-booking.resource-directory-read'],
      ['resource.detail.read', 'bp-uv-resource-booking.resource-directory-read'],
      ['reservation.list', 'bp-uv-resource-booking.reservation-manage'],
      ['reservation.create', 'bp-uv-resource-booking.reservation-create'],
      ['reservation.cancel', 'bp-uv-resource-booking.reservation-manage'],
      ['reservation.reschedule', 'bp-uv-resource-booking.reservation-manage']
    ]
  );

  // <lang><zh-CN>solution 只选择顶层预约管理能力；resolver 必须从三项 descriptor 建立目录读取 → 预约创建 → 预约管理的 dependency-first closure。</zh-CN><en>The solution selects only the top-level reservation-management capability; the resolver must build a dependency-first directory-read → reservation-create → reservation-manage closure from the three descriptors.</en></lang>
  assert.deepEqual(solutionProfile.capabilityPackageIds, ['bp-uv-resource-booking.reservation-manage']);
  assert.deepEqual(capabilityPackages, [
    {
      packageVersion: '1.0',
      kind: 'solution-capability-package',
      id: 'bp-uv-resource-booking.resource-directory-read',
      dependsOn: [],
      requiredModuleIds: ['bp-uv-resource-booking.resource-directory'],
      requiredGrantIds: ['resource-booking.directory.read']
    },
    {
      packageVersion: '1.0',
      kind: 'solution-capability-package',
      id: 'bp-uv-resource-booking.reservation-create',
      dependsOn: ['bp-uv-resource-booking.resource-directory-read'],
      requiredModuleIds: ['bp-uv-resource-booking.reservation'],
      requiredGrantIds: ['resource-booking.reservation.create']
    },
    {
      packageVersion: '1.0',
      kind: 'solution-capability-package',
      id: 'bp-uv-resource-booking.reservation-manage',
      dependsOn: ['bp-uv-resource-booking.reservation-create'],
      requiredModuleIds: ['bp-uv-resource-booking.reservation'],
      requiredGrantIds: ['resource-booking.reservation.manage']
    }
  ]);
  assert.deepEqual(session.grantIds, [
    'resource-booking.directory.read',
    'resource-booking.reservation.create',
    'resource-booking.reservation.manage'
  ]);

  // <lang><zh-CN>BP 直接 Biz dependency 只能是 project runtime；底层 package 仅存在于版本精确 override。</zh-CN><en>The BP's only direct Biz dependency must be project runtime; lower packages exist only in version-exact overrides.</en></lang>
  const directBizDependencies = Object.keys(packageManifest.dependencies).filter((packageName) => packageName.startsWith('@hia-uview/biz-'));
  assert.deepEqual(directBizDependencies, ['@hia-uview/biz-project-runtime']);
  assert.deepEqual(Object.keys(packageManifest.pnpm.overrides), [
    '@hia-uview/biz-async-provider-runtime@0.0.0',
    '@hia-uview/biz-provider-port-runtime@0.0.0',
    '@hia-uview/biz-solution-profile-runtime@0.0.0'
  ]);
});

test('visible source badges retain operation-specific facade facts', async () => {
  // <lang><zh-CN>逐页期望值只锁定已审产品中的 source badge，不向没有 badge 的发现页新增展示责任。</zh-CN><en>Per-page expectations lock only source badges in the reviewed product and add no display responsibility to Discover, which has no badge.</en></lang>
  const expectedSourceBindings = Object.freeze([
    Object.freeze({ path: 'src/pages/home/index.vue', bindings: ['demo.catalogSource.value'] }),
    Object.freeze({ path: 'src/pages/discover/index.vue', bindings: [] }),
    Object.freeze({ path: 'src/pages/resource-detail/index.vue', bindings: ['demo.detailSource.value', 'detail.source'] }),
    Object.freeze({ path: 'src/pages/reservations/index.vue', bindings: ['demo.reservationSource.value'] }),
    Object.freeze({ path: 'src/pages/reservation-detail/index.vue', bindings: ['demo.reservationSource.value'] }),
    Object.freeze({ path: 'src/pages/reservation-reschedule/index.vue', bindings: ['demo.reservationSource.value'] }),
    Object.freeze({ path: 'src/pages/profile/index.vue', bindings: ['demo.reservationSource.value'] }),
    Object.freeze({ path: 'src/pages/booking-confirm/index.vue', bindings: ['demo.writeSource.value', 'detail.source'] })
  ]);

  // <lang><zh-CN>全部现有页面都必须显式登记；新增页面不能在未审阅 source 责任时静默逃逸本门禁。</zh-CN><en>Every current page must be registered explicitly; a new page cannot silently escape this gate before its source responsibility is reviewed.</en></lang>
  const registeredPagePaths = expectedSourceBindings
    .map((expectation) => expectation.path)
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);

  // <lang><zh-CN>从真实 pages tree 派生当前页面集合，并与受审登记逐项一致。</zh-CN><en>Derive the current page set from the real pages tree and match it exactly against the reviewed registry.</en></lang>
  const actualPagePaths = (await listOwnedSourceFiles(resolve(repositoryRoot, 'src/pages')))
    .filter((filePath) => extname(filePath) === '.vue')
    .map((filePath) => relative(repositoryRoot, filePath).replaceAll('\\', '/'));
  assert.deepEqual(actualPagePaths, registeredPagePaths);

  // <lang><zh-CN>按模板出现顺序提取全部 `source-badge` binding，防止页面借用 catalog 常量或把 write 结果继续标为 detail source。</zh-CN><en>Extract every source-badge binding in template order, preventing a page from borrowing a catalog constant or continuing to label a write result with detail provenance.</en></lang>
  for (const expectation of expectedSourceBindings) {
    const pageSource = await readFile(resolve(repositoryRoot, expectation.path), 'utf8');
    const actualBindings = [...pageSource.matchAll(/<source-badge[^>]*:source="([^"]+)"/gu)].map((match) => match[1]);
    assert.deepEqual(actualBindings, expectation.bindings, `${expectation.path} has an incorrect source-fact binding.`);
  }
});
