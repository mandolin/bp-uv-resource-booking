/**
 * <lang><zh-CN>资源预约 BP project composition contract tests：固定 solution closure、无执行 doctor、六项 facade operation、actual source facts、gate rejection 与 local write lifecycle。</zh-CN><en>Resource-booking BP project-composition contract tests: fix the solution closure, non-executing doctor, six facade operations, actual-source facts, gate rejection, and local write lifecycle.</en></lang>
 * @lang zh-CN fixture 只使用仓内 local JSON 与进程内 adapter，不访问网络、storage、credential、真实身份或动态代码。
 * @lang en Fixtures use only checked-in local JSON and an in-process adapter and access no network, storage, credential, real identity, or dynamic code.
 */

// <lang><zh-CN>使用严格断言固定公开 shape、source authority 与 mutation 不变量。</zh-CN><en>Use strict assertions to fix public shapes, source authority, and mutation invariants.</en></lang>
import assert from 'node:assert/strict';

// <lang><zh-CN>使用 Node 原生 test runner，避免引入新的测试 dependency。</zh-CN><en>Use the native Node test runner, avoiding a new test dependency.</en></lang>
import test from 'node:test';

// <lang><zh-CN>gate 负向测试只使用 project-runtime public API，不接触 lower async/provider runtime。</zh-CN><en>Gate-negative tests use only the project-runtime public API and touch no lower async or provider runtime.</en></lang>
import { createProjectFacade } from '@hia-uview/biz-project-runtime';

// <lang><zh-CN>内部 adapter factory 仅用于证明 unknown/kind mismatch 不执行 handler；production root 不公开其 token。</zh-CN><en>The internal adapter factory serves only to prove that unknown or kind-mismatched calls execute no handler; the production root does not expose its token.</en></lang>
import { createLocalResourceBookingAdapter } from '../src/adapters/local-resource-booking-adapter.mjs';

// <lang><zh-CN>稳定 ID 与 profile factory 用于断言声明关系，而不是绕过 production business methods。</zh-CN><en>Stable IDs and the profile factory assert declarative relations rather than bypass production business methods.</en></lang>
import {
  RESOURCE_BOOKING_CAPABILITY_IDS,
  RESOURCE_BOOKING_LOCAL_ADAPTER_ID,
  RESOURCE_BOOKING_OPERATION_IDS,
  RESOURCE_BOOKING_PROFILE_IDS
} from '../src/project/resource-booking-contracts.mjs';
import { createResourceBookingProfiles } from '../src/project/resource-booking-profiles.mjs';

// <lang><zh-CN>所有正向业务 flow 只通过项目高层 factory。</zh-CN><en>Every positive business flow uses only the high-level project factory.</en></lang>
import { createResourceBookingProject } from '../src/project/resource-booking-project.mjs';

/**
 * <lang><zh-CN>断言一个 mapped business outcome 来自唯一 local adapter。</zh-CN><en>Asserts that a mapped business outcome came from the sole local adapter.</en></lang>
 * @param {object} outcome <lang><zh-CN>高层 project method resolve 的 canonical outcome。</zh-CN><en>Canonical outcome resolved by a high-level project method.</en></lang>
 * @returns {void} <lang><zh-CN>source fact assertion 完成信号。</zh-CN><en>Completion signal for source-fact assertions.</en></lang>
 * @lang zh-CN 只断言 runtime 已公开的 actual source fields，不读取 adapter、handler 或 source registry。
 * @lang en Assert only actual-source fields exposed by runtime and read no adapter, handler, or source registry.
 */
function assertLocalSource(outcome) {
  // <lang><zh-CN>固定 local source ID、authority 与无降级原因。</zh-CN><en>Fix the local source ID, authority, and absence of a degradation reason.</en></lang>
  assert.deepEqual(outcome.source, {
    sourceId: RESOURCE_BOOKING_LOCAL_ADAPTER_ID,
    authority: 'local',
    degradedReason: null
  });
}

/**
 * <lang><zh-CN>创建 direct project facade 所需的完整内部 test fixture。</zh-CN><en>Creates the complete internal test fixture required by a direct project facade.</en></lang>
 * @returns {{facade: object, adapterFixture: object}} <lang><zh-CN>仅供 gate 负向断言的 facade 与 count facts。</zh-CN><en>Facade and count facts used only for negative gate assertions.</en></lang>
 * @lang zh-CN fixture 不返回给页面或 production consumer；其唯一目的是真实调用 unknown/kind-mismatch gate。
 * @lang en The fixture is returned to no page or production consumer; its sole purpose is to call unknown and kind-mismatch gates genuinely.
 */
function createGateFixture() {
  // <lang><zh-CN>创建独立 profiles 与 opaque local adapter token。</zh-CN><en>Create isolated profiles and an opaque local-adapter token.</en></lang>
  const profiles = createResourceBookingProfiles();
  const adapterFixture = createLocalResourceBookingAdapter();

  // <lang><zh-CN>组合 relation 与 production root 精确一致。</zh-CN><en>The composition relation exactly matches the production root.</en></lang>
  const creation = createProjectFacade({
    ...profiles,
    adapters: [adapterFixture.adapter],
    settingMode: 'local',
    environmentId: null,
    timeoutMs: 5000
  });
  assert.equal(creation.ok, true);

  // <lang><zh-CN>raw facade 只留在当前 test closure。</zh-CN><en>Keep the raw facade only in the current test closure.</en></lang>
  return { facade: creation.facade, adapterFixture };
}

/**
 * <lang><zh-CN>验证 project facade public surface、solution closure 与无执行 doctor。</zh-CN><en>Verifies project-facade public surface, solution closure, and non-executing doctor.</en></lang>
 * @returns {void} <lang><zh-CN>全部结构 assertion 完成信号。</zh-CN><en>Completion signal for all structural assertions.</en></lang>
 * @lang zh-CN doctor 前后六项 execution counts 必须保持零，证明 readiness 不读取 local data 或运行 handler。
 * @lang en All six execution counts must remain zero before and after doctor, proving readiness neither reads local data nor runs a handler.
 */
function testProjectReadinessAndClosure() {
  // <lang><zh-CN>创建完整高层 project object。</zh-CN><en>Create the complete high-level project object.</en></lang>
  const project = createResourceBookingProject();

  // <lang><zh-CN>public root 只暴露六项业务方法与三项受限 introspection，不含 raw facade/adapter。</zh-CN><en>The public root exposes only six business methods and three bounded introspection methods, with no raw facade or adapter.</en></lang>
  assert.deepEqual(Object.keys(project).sort(), [
    'cancelReservation',
    'createReservation',
    'doctor',
    'getSnapshot',
    'getSourceFacts',
    'listReservations',
    'queryResourceCatalog',
    'readResourceDetail',
    'rescheduleReservation'
  ]);
  assert.equal('facade' in project, false);
  assert.equal('adapter' in project, false);

  // <lang><zh-CN>doctor 复用 production relation 并返回 ready metadata。</zh-CN><en>Doctor reuses the production relation and returns ready metadata.</en></lang>
  const diagnosis = project.doctor();
  assert.equal(diagnosis.ok, true);
  assert.equal(diagnosis.ready, true);
  assert.equal(diagnosis.project.id, RESOURCE_BOOKING_PROFILE_IDS.project);

  // <lang><zh-CN>solution resolver 以 dependency-first 顺序交付目录读取、预约创建与预约管理三级 closure，且三者都 available。</zh-CN><en>The solution resolver delivers the three-level directory-read, reservation-create, and reservation-manage closure in dependency-first order, with all three capabilities available.</en></lang>
  const snapshot = project.getSnapshot();
  assert.deepEqual(snapshot.capabilities, [
    { id: RESOURCE_BOOKING_CAPABILITY_IDS.resourceDirectoryRead, state: 'available' },
    { id: RESOURCE_BOOKING_CAPABILITY_IDS.reservationCreate, state: 'available' },
    { id: RESOURCE_BOOKING_CAPABILITY_IDS.reservationManage, state: 'available' }
  ]);
  assert.equal(snapshot.operations.length, 6);
  assert.deepEqual(snapshot.selection, {
    mode: 'local',
    origin: 'setting',
    environmentId: null
  });
  assert.deepEqual(snapshot.adapters, [{
    id: RESOURCE_BOOKING_LOCAL_ADAPTER_ID,
    authority: 'local',
    operationIds: Object.values(RESOURCE_BOOKING_OPERATION_IDS)
  }]);

  // <lang><zh-CN>初始 source facts 只含零计数，不包含 profile body、session 或 handler。</zh-CN><en>Initial source facts contain only zero counts and no profile body, session, or handler.</en></lang>
  const sourceFacts = project.getSourceFacts();
  assert.equal(sourceFacts.execution.every((entry) => entry.invocations === 0), true);
  assert.equal(JSON.stringify(sourceFacts).includes('grantIds'), false);
  assert.equal(JSON.stringify(sourceFacts).includes('handler'), false);
}

/**
 * <lang><zh-CN>通过高层 project surface 执行六项 operation 并验证共享 adapter state。</zh-CN><en>Executes all six operations through the high-level project surface and verifies shared adapter state.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>六项 terminal 与最终 snapshot assertion 完成时 resolve。</zh-CN><en>Resolves when all six terminals and final-snapshot assertions complete.</en></lang>
 * @lang zh-CN 正向 flow 不 import domain、dataset 或 service shim；filter/card projection 必须由 adapter outcome 直接交付。
 * @lang en The positive flow imports no domain, dataset, or service shim; adapter outcomes must directly deliver filter and card projections.
 */
async function testSixOperationsAndSharedState() {
  // <lang><zh-CN>独立 project 确保 write lifecycle 从 checked-in mock snapshot 开始。</zh-CN><en>An isolated project ensures the write lifecycle starts from the checked-in mock snapshot.</en></lang>
  const project = createResourceBookingProject();

  // <lang><zh-CN>目录查询返回 canonical page、adapter-owned filterOptions 与 actual source。</zh-CN><en>Catalog query returns a canonical page, adapter-owned filterOptions, and actual source.</en></lang>
  const catalog = await project.queryResourceCatalog({
    page: 1,
    pageSize: 2,
    keyword: '',
    venueId: '',
    resourceTypeId: '',
    date: ''
  }).promise;
  assert.equal(catalog.kind, 'page');
  assert.equal(catalog.entries.length, 2);
  assert.equal(catalog.filterOptions.venues.length > 0, true);
  assert.equal(catalog.filterOptions.resourceTypes.length > 0, true);
  assertLocalSource(catalog);

  // <lang><zh-CN>详情读取交付可预约日期/时段，不需要页面直读 local JSON。</zh-CN><en>Detail read delivers bookable dates and slots without requiring a page to read local JSON directly.</en></lang>
  const detail = await project.readResourceDetail('riverside-court-a').promise;
  assert.equal(detail.kind, 'detail');
  assert.equal(detail.resource.id, 'riverside-court-a');
  assert.equal(detail.resource.availableSlots.includes('09:00'), true);
  assertLocalSource(detail);

  // <lang><zh-CN>预约列表初始同时含 raw records 与完整 reservationCards。</zh-CN><en>The initial reservation list contains both raw records and complete reservationCards.</en></lang>
  const initialList = await project.listReservations().promise;
  assert.equal(initialList.kind, 'reservations');
  assert.equal(initialList.reservations.length, 1);
  assert.equal(initialList.reservationCards.length, 1);
  assert.equal(initialList.reservationCards[0].resourceName.en.length > 0, true);
  assertLocalSource(initialList);

  // <lang><zh-CN>create 在同一 adapter transaction append reservation-demo-002，并返回完整 cards。</zh-CN><en>Create appends reservation-demo-002 in the same adapter transaction and returns complete cards.</en></lang>
  const created = await project.createReservation({
    commandId: 'booking-command-101',
    resourceId: 'riverside-court-a',
    date: '2026-08-08',
    time: '09:00'
  }).promise;
  assert.equal(created.kind, 'confirmed');
  assert.equal(created.reservation.id, 'reservation-demo-002');
  assert.equal(created.reservations.length, 2);
  assert.equal(created.reservationCards.length, 2);
  assertLocalSource(created);

  // <lang><zh-CN>cancel 保留 record 并只把新记录状态变为 cancelled。</zh-CN><en>Cancel retains the record and changes only the new record's status to cancelled.</en></lang>
  const cancelled = await project.cancelReservation({
    commandId: 'booking-command-102',
    reservationId: created.reservation.id
  }).promise;
  assert.equal(cancelled.kind, 'cancelled');
  assert.equal(cancelled.reservation.status, 'cancelled');
  assert.equal(cancelled.reservationCards.length, 2);
  assertLocalSource(cancelled);

  // <lang><zh-CN>reschedule 为初始记录创建 replacement-demo-003 后保留旧 cancelled record。</zh-CN><en>Reschedule creates replacement demo-003 for the initial record and retains the old cancelled record.</en></lang>
  const rescheduled = await project.rescheduleReservation({
    commandId: 'booking-command-103',
    reservationId: 'reservation-demo-001',
    date: '2026-08-08',
    time: '16:00'
  }).promise;
  assert.equal(rescheduled.kind, 'rescheduled');
  assert.equal(rescheduled.cancelledReservation.status, 'cancelled');
  assert.equal(rescheduled.reservation.id, 'reservation-demo-003');
  assert.equal(rescheduled.reservation.status, 'confirmed');
  assert.equal(rescheduled.reservations.length, 3);
  assert.equal(rescheduled.reservationCards.length, 3);
  assertLocalSource(rescheduled);

  // <lang><zh-CN>六个 handler 各执行一次，证明 list 与 writes 共享同一 adapter instance。</zh-CN><en>Each of the six handlers executes once, proving that list and writes share one adapter instance.</en></lang>
  const executionByOperation = Object.fromEntries(
    project.getSourceFacts().execution.map((entry) => [entry.operationId, entry.invocations])
  );
  assert.deepEqual(executionByOperation, {
    [RESOURCE_BOOKING_OPERATION_IDS.queryCatalog]: 1,
    [RESOURCE_BOOKING_OPERATION_IDS.readResourceDetail]: 1,
    [RESOURCE_BOOKING_OPERATION_IDS.listReservations]: 1,
    [RESOURCE_BOOKING_OPERATION_IDS.createReservation]: 1,
    [RESOURCE_BOOKING_OPERATION_IDS.cancelReservation]: 1,
    [RESOURCE_BOOKING_OPERATION_IDS.rescheduleReservation]: 1
  });
}

/**
 * <lang><zh-CN>验证 unknown operation 与 read/write kind mismatch 在 adapter 前零执行。</zh-CN><en>Verifies that an unknown operation and read/write kind mismatch execute nothing before the adapter.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>三个 bounded rejection resolve 时完成。</zh-CN><en>Completes when all three bounded rejections resolve.</en></lang>
 * @lang zh-CN 负向测试使用 raw facade 仅为触达 runtime gate；production project object 没有任意 operation dispatch API。
 * @lang en The negative test uses a raw facade only to reach runtime gates; the production project object has no arbitrary-operation dispatch API.
 */
async function testGateRejectsWithoutAdapterExecution() {
  // <lang><zh-CN>fixture 初始所有 handler count 为零。</zh-CN><en>Every handler count starts at zero in the fixture.</en></lang>
  const fixture = createGateFixture();

  // <lang><zh-CN>unknown read、write-as-read 与 read-as-write 都返回相同 bounded invalid-request。</zh-CN><en>Unknown read, write-as-read, and read-as-write all return the same bounded invalid-request.</en></lang>
  const terminals = await Promise.all([
    fixture.facade.startRead('resource.unknown', {}).promise,
    fixture.facade.startRead(RESOURCE_BOOKING_OPERATION_IDS.createReservation, {}).promise,
    fixture.facade.startWrite(RESOURCE_BOOKING_OPERATION_IDS.queryCatalog, {}).promise
  ]);
  assert.equal(terminals.every((terminal) => terminal.kind === 'failure'), true);
  assert.equal(terminals.every((terminal) => terminal.code === 'invalid-request'), true);
  assert.equal(terminals.every((terminal) => terminal.source.sourceId === null), true);

  // <lang><zh-CN>所有 adapter execution counts 必须保持零。</zh-CN><en>Every adapter execution count must remain zero.</en></lang>
  assert.equal(
    fixture.adapterFixture.getExecutionSnapshot().every((entry) => entry.invocations === 0),
    true
  );
}

/**
 * <lang><zh-CN>验证 write maxAttempts=1、幂等 replay 与不兼容 command ID 重用不产生额外 mutation。</zh-CN><en>Verifies write maxAttempts=1, idempotent replay, and no extra mutation from incompatible command-ID reuse.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>write observation 与最终 list assertion 完成时 resolve。</zh-CN><en>Resolves when write observation and final-list assertions complete.</en></lang>
 * @lang zh-CN source failure 不 retry/fallback；相同 command replay 可再次进入 handler，但只能读取 receipt，不能二次 append。
 * @lang en A source failure neither retries nor falls back; replay of an identical command may reenter the handler but may only read a receipt and never append twice.
 */
async function testWriteLifecycleAndIdempotency() {
  // <lang><zh-CN>profile 层三项 write 都固定一次 attempt 与同一个 local authority。</zh-CN><en>At profile level all three writes fix one attempt and the same local authority.</en></lang>
  const profiles = createResourceBookingProfiles();
  const writeSelections = profiles.projectProfile.operationSelections.filter(
    (selection) => selection.kind === 'write'
  );
  assert.equal(writeSelections.length, 3);
  assert.equal(writeSelections.every((selection) => selection.retry.maxAttempts === 1), true);
  assert.equal(
    writeSelections.every(
      (selection) => selection.autoWriteAdapterId === RESOURCE_BOOKING_LOCAL_ADAPTER_ID
    ),
    true
  );

  // <lang><zh-CN>创建独立 transaction 并准备一个可重放 command。</zh-CN><en>Create an isolated transaction and prepare one replayable command.</en></lang>
  const project = createResourceBookingProject();
  const command = {
    commandId: 'booking-command-201',
    resourceId: 'riverside-court-a',
    date: '2026-08-09',
    time: '11:00'
  };

  // <lang><zh-CN>相同 command 两次都返回同一 confirmed receipt，不产生第二条 reservation。</zh-CN><en>The identical command returns the same confirmed receipt twice and creates no second reservation.</en></lang>
  const first = await project.createReservation(command).promise;
  const replay = await project.createReservation({ ...command }).promise;
  assert.equal(first.kind, 'confirmed');
  assert.deepEqual(replay.reservation, first.reservation);
  assert.equal(replay.reservations.length, 2);
  assertLocalSource(first);
  assertLocalSource(replay);

  // <lang><zh-CN>相同 ID 搭配不同 fingerprint 明确失败且不 retry/fallback。</zh-CN><en>The same ID with a different fingerprint fails explicitly and neither retries nor falls back.</en></lang>
  const conflict = await project.createReservation({
    ...command,
    time: '16:00'
  }).promise;
  assert.equal(conflict.kind, 'failure');
  assertLocalSource(conflict);

  // <lang><zh-CN>最终 list 仍只有初始记录与一次 create，证明 receipt replay/conflict 零额外 mutation。</zh-CN><en>The final list still contains only the initial record and one create, proving zero extra mutation from receipt replay or conflict.</en></lang>
  const finalList = await project.listReservations().promise;
  assert.equal(finalList.reservations.length, 2);

  // <lang><zh-CN>三次 create start 对应三次单 attempt；没有 retry 计数，也没有第二 authority。</zh-CN><en>Three create starts correspond to three single attempts, with no retry count and no second authority.</en></lang>
  const createObservation = project.getSourceFacts().observation.operations.find(
    (entry) => entry.operationId === RESOURCE_BOOKING_OPERATION_IDS.createReservation
  );
  assert.equal(createObservation.starts, 3);
  assert.equal(createObservation.attempts, 3);
  assert.equal(createObservation.retries, 0);
}

// <lang><zh-CN>四项 test 独立创建 project transaction，避免测试间共享 mutation。</zh-CN><en>All four tests create isolated project transactions, preventing mutation shared across tests.</en></lang>
test('resource-booking project exposes a complete ready solution closure', testProjectReadinessAndClosure);
test('resource-booking project executes all six operations through one local adapter', testSixOperationsAndSharedState);
test('resource-booking project rejects unknown and kind-mismatched operations before adapter execution', testGateRejectsWithoutAdapterExecution);
test('resource-booking project preserves single-attempt idempotent write lifecycle', testWriteLifecycleAndIdempotency);
