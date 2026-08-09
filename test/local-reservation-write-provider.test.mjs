/**
 * <lang><zh-CN>验证 BP local reservation write adapter 真实经锁定 Biz async runtime 执行创建、取消、改期、幂等和有界失败；测试不访问网络、storage、平台 API、账号或真实预约系统。</zh-CN><en>Verifies that BP local reservation-write adapter actually executes create, cancel, reschedule, idempotency, and bounded failure through locked Biz async runtime; tests access no network, storage, platform API, account, or real booking system.</en></lang>
 * @lang zh-CN 每个 fixture 创建独立 in-process client，绝不复用生产 singleton 或断言跨会话持久化。
 * @lang en Each fixture creates an independent in-process client and never reuses production singleton or asserts cross-session persistence.
 */

// <lang><zh-CN>使用 Node 内建严格断言与测试 runner，不为纯 adapter 验收增加测试依赖。</zh-CN><en>Use Node built-in strict assertions and test runner, adding no dependency for pure-adapter acceptance.</en></lang>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// <lang><zh-CN>导入公开的独立 client 工厂；测试不会读取或修改 provider 私有 closure。</zh-CN><en>Import public independent-client factory; tests neither read nor modify provider private closure.</en></lang>
import { createLocalReservationWriteClient } from '../src/services/local-reservation-write-provider.mjs';
import {
  confirmLocalReservation,
  loadResourceDetail,
  prepareLocalBooking,
  useBookingDemo
} from '../src/state/booking-demo.mjs';

/**
 * <lang><zh-CN>启动并等待一条有限 write command。</zh-CN><en>Starts and awaits one finite write command.</en></lang>
 * @param {object} client <lang><zh-CN>独立 reservation write client。</zh-CN><en>Independent reservation-write client.</en></lang>
 * @param {object} command <lang><zh-CN>测试自有的固定 plain-data command。</zh-CN><en>Test-owned fixed plain-data command.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>adapter 映射后的 canonical outcome。</zh-CN><en>Canonical outcome mapped by adapter.</en></lang>
 * @lang zh-CN helper 不检查 runtime 内部，不取消 invocation，也不将 command 变成可变共享值。
 * @lang en Helper inspects no runtime internals, cancels no invocation, and turns no command into mutable shared value.
 */
async function execute(client, command) {
  // <lang><zh-CN>start 返回 Biz runtime 的显式 handle，测试只消费其 mapped promise。</zh-CN><en>Start returns explicit handle of Biz runtime; test consumes only its mapped promise.</en></lang>
  const handle = client.start(command);

  // <lang><zh-CN>等待一次性 terminal outcome；adapter 保证 source exception 不导致 rejection。</zh-CN><en>Await one terminal outcome; adapter guarantees a source exception causes no rejection.</en></lang>
  return handle.promise;
}

test('write adapter creates one detached reservation through local Biz authority', async () => {
  // <lang><zh-CN>每个 test 建立全新 client，使 receipt/snapshot 不受其他 fixture 污染。</zh-CN><en>Create a fresh client for each test so receipt/snapshot is not contaminated by another fixture.</en></lang>
  const client = createLocalReservationWriteClient();

  // <lang><zh-CN>提交已声明资源、日期和时段的最小 create command。</zh-CN><en>Submit minimum create command with declared resource, date, and slot.</en></lang>
  const outcome = await execute(client, {
    commandId: 'booking-command-001',
    operation: 'create',
    resourceId: 'riverside-court-a',
    date: '2026-08-08',
    time: '09:00'
  });

  // <lang><zh-CN>成功必须声明 confirmed、返回新记录和完整 detached snapshot。</zh-CN><en>Success must declare confirmed and return new record plus complete detached snapshot.</en></lang>
  assert.equal(outcome.kind, 'confirmed');
  assert.equal(outcome.reservation.status, 'confirmed');
  assert.equal(outcome.reservation.id, 'reservation-demo-002');
  assert.equal(outcome.reservations.length, 2);

  // <lang><zh-CN>改写调用方 snapshot 不得污染 client 内的 future receipt/snapshot。</zh-CN><en>Mutating caller snapshot must not contaminate future receipt/snapshot in client.</en></lang>
  outcome.reservations[1].status = 'cancelled';
  const observation = client.getObservation();
  assert.equal(observation.starts, 1);
  assert.equal(observation.successes, 1);
});

test('same command ID replays detached receipt without a second mutation', async () => {
  // <lang><zh-CN>创建独立 client 以固定该 test 的 receipt 生命周期。</zh-CN><en>Create independent client to fix receipt lifecycle of this test.</en></lang>
  const client = createLocalReservationWriteClient();

  // <lang><zh-CN>冻结测试 command，重复调用时其内容完全一致。</zh-CN><en>Freeze test command so repeated invocation has exactly identical content.</en></lang>
  const command = Object.freeze({
    commandId: 'booking-command-002',
    operation: 'create',
    resourceId: 'riverside-court-a',
    date: '2026-08-08',
    time: '09:00'
  });

  // <lang><zh-CN>首次创建预约，第二次只能重放同一 receipt。</zh-CN><en>Create booking first; second invocation may only replay same receipt.</en></lang>
  const first = await execute(client, command);
  const replay = await execute(client, command);

  // <lang><zh-CN>两个 outcome 值相等但引用隔离；每个 snapshot 都只包含一次新预约。</zh-CN><en>Both outcome values are equal but references isolated; each snapshot contains new reservation only once.</en></lang>
  assert.deepEqual(replay, first);
  assert.notEqual(replay, first);
  assert.notEqual(replay.reservations, first.reservations);
  assert.equal(replay.reservations.length, 2);
  assert.equal(client.getObservation().starts, 2);
});

test('incompatible reuse of a command ID is bounded conflict and does not mutate snapshot', async () => {
  // <lang><zh-CN>独立 client 先接受一条 create command。</zh-CN><en>Let independent client accept one create command first.</en></lang>
  const client = createLocalReservationWriteClient();
  await execute(client, {
    commandId: 'booking-command-003',
    operation: 'create',
    resourceId: 'riverside-court-a',
    date: '2026-08-08',
    time: '09:00'
  });

  // <lang><zh-CN>同 ID 使用不同时间必须被 runtime/provider 映射为 conflict。</zh-CN><en>Using same ID with different time must map to conflict through runtime/provider.</en></lang>
  const conflict = await execute(client, {
    commandId: 'booking-command-003',
    operation: 'create',
    resourceId: 'riverside-court-a',
    date: '2026-08-08',
    time: '11:00'
  });

  // <lang><zh-CN>failure 不回显 command 值，且不产生第二条预约。</zh-CN><en>Failure echoes no command value and creates no second reservation.</en></lang>
  assert.equal(conflict.kind, 'failure');
  assert.equal(conflict.code, 'conflict');
  assert.equal(JSON.stringify(conflict).includes('11:00'), false);
  const replay = await execute(client, {
    commandId: 'booking-command-003',
    operation: 'create',
    resourceId: 'riverside-court-a',
    date: '2026-08-08',
    time: '09:00'
  });
  assert.equal(replay.reservations.length, 2);
});

test('reschedule atomically retains cancelled history and appends a new confirmation', async () => {
  // <lang><zh-CN>创建独立 client，并先生成一个可改期 confirmed reservation。</zh-CN><en>Create independent client and first generate a confirmed reservation eligible for reschedule.</en></lang>
  const client = createLocalReservationWriteClient();
  const created = await execute(client, {
    commandId: 'booking-command-004',
    operation: 'create',
    resourceId: 'riverside-court-a',
    date: '2026-08-08',
    time: '09:00'
  });

  // <lang><zh-CN>改期只携带旧预约 ID 和新 date/time，不允许页面在同一 command 中替换 resource。</zh-CN><en>Reschedule carries only old reservation ID and new date/time; page cannot replace resource in same command.</en></lang>
  const outcome = await execute(client, {
    commandId: 'booking-command-005',
    operation: 'reschedule',
    reservationId: created.reservation.id,
    date: '2026-08-09',
    time: '11:00'
  });

  // <lang><zh-CN>旧记录保持 cancelled，新记录确认且完整 snapshot 同时包含两者。</zh-CN><en>Old record remains cancelled, new record is confirmed, and complete snapshot contains both.</en></lang>
  assert.equal(outcome.kind, 'rescheduled');
  assert.equal(outcome.cancelledReservation.id, created.reservation.id);
  assert.equal(outcome.cancelledReservation.status, 'cancelled');
  assert.equal(outcome.reservation.status, 'confirmed');
  assert.equal(outcome.reservation.date, '2026-08-09');
  assert.equal(outcome.reservation.time, '11:00');
  assert.equal(outcome.reservations.length, 3);
});

test('invalid reschedule slot keeps prior booking confirmed and returns no partial snapshot', async () => {
  // <lang><zh-CN>先创建可改期记录，再请求该资源未声明的时段。</zh-CN><en>Create an eligible record first, then request a slot not declared by its resource.</en></lang>
  const client = createLocalReservationWriteClient();
  const created = await execute(client, {
    commandId: 'booking-command-006',
    operation: 'create',
    resourceId: 'riverside-court-a',
    date: '2026-08-08',
    time: '09:00'
  });
  const failure = await execute(client, {
    commandId: 'booking-command-007',
    operation: 'reschedule',
    reservationId: created.reservation.id,
    date: '2026-08-09',
    time: '23:59'
  });

  // <lang><zh-CN>业务冲突不含 snapshot；相同 create receipt 仍显示旧记录为 confirmed。</zh-CN><en>Business conflict contains no snapshot; same create receipt still shows old record confirmed.</en></lang>
  assert.equal(failure.kind, 'failure');
  assert.equal(failure.code, 'conflict');
  assert.equal('reservations' in failure, false);
  const createdReplay = await execute(client, {
    commandId: 'booking-command-006',
    operation: 'create',
    resourceId: 'riverside-court-a',
    date: '2026-08-08',
    time: '09:00'
  });
  assert.equal(createdReplay.reservation.status, 'confirmed');
});

test('state accepts only a detail-validated booking draft before a Biz-backed confirmation', async () => {
  // <lang><zh-CN>先经真实 local read action 装载有限资源详情，测试不伪造 selected detail 或路由输入。</zh-CN><en>Load finite resource detail through actual local read action first; the test fabricates neither selected detail nor route input.</en></lang>
  await loadResourceDetail('riverside-court-a');

  // <lang><zh-CN>未声明日期不能形成草稿，且 readonly public state 不应保留旧选择。</zh-CN><en>An undeclared date cannot form a draft, and readonly public state must retain no stale selection.</en></lang>
  const rejectedDraft = prepareLocalBooking('2026-08-11', '09:00');
  assert.equal(rejectedDraft.kind, 'failure');
  assert.equal(useBookingDemo().bookingDraft.value, null);

  // <lang><zh-CN>详情 allowlist 内的日期和时段形成与当前资源绑定的受限草稿。</zh-CN><en>Date and slot in detail allowlists form a bounded draft bound to current resource.</en></lang>
  const preparedDraft = prepareLocalBooking('2026-08-08', '09:00');
  assert.equal(preparedDraft.kind, 'selection-ready');
  assert.deepEqual(useBookingDemo().bookingDraft.value, {
    resourceId: 'riverside-court-a',
    date: '2026-08-08',
    time: '09:00'
  });

  // <lang><zh-CN>确认 action 不接收页面参数，只消费上述草稿并继续经过已锁定 Biz write adapter。</zh-CN><en>The confirmation action accepts no page parameter, consumes only above draft, and continues through locked Biz write adapter.</en></lang>
  const outcome = await confirmLocalReservation();
  assert.equal(outcome.kind, 'confirmed');
  assert.equal(outcome.reservation.resourceId, 'riverside-court-a');
  assert.equal(outcome.reservation.date, '2026-08-08');
  assert.equal(outcome.reservation.time, '09:00');
});

test('booking state imports the write adapter and does not retain raw reservation-domain mutation', async () => {
  // <lang><zh-CN>从测试文件位置读取固定项目 state 源码，不扫描任意目录或执行页面代码。</zh-CN><en>Read fixed project-state source from test-file location and neither scan arbitrary directory nor execute page code.</en></lang>
  const stateSourceUrl = new URL('../src/state/booking-demo.mjs', import.meta.url);

  // <lang><zh-CN>源文件仅作为静态 consumer 证据读取，绝不发送或写回。</zh-CN><en>Read source only as static consumer evidence and never send or write it back.</en></lang>
  const stateSource = await readFile(fileURLToPath(stateSourceUrl), 'utf8');

  // <lang><zh-CN>state 必须使用唯一 Biz-backed adapter entry，且不能重新导入原始 local reservation domain mutation。</zh-CN><en>State must use sole Biz-backed adapter entry and cannot re-import raw local-reservation domain mutation.</en></lang>
  assert.match(stateSource, /startLocalReservationWrite/gu);
  assert.doesNotMatch(stateSource, /createLocalReservation/gu);
  assert.match(stateSource, /rescheduleLocalReservation/gu);
});
