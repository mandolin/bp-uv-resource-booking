/**
 * <lang><zh-CN>验证 local booking domain 的目录、详情与预约最小契约；测试不调用网络、storage、平台 API 或真实身份。</zh-CN><en>Verifies minimum catalog, detail, and reservation contracts of the local booking domain; tests call no network, storage, platform API, or real identity.</en></lang>
 * @lang zh-CN 这些测试覆盖可复现 local JSON 的核心行为，不能替代 H5/mp-weixin 实际编译或视觉验收。
 * @lang en These tests cover core behavior of reproducible local JSON and do not replace actual H5/mp-weixin compilation or visual acceptance.
 */

// <lang><zh-CN>导入 Node 内建测试断言和项目自有纯 domain API。</zh-CN><en>Import Node built-in test assertions and project-owned pure domain API.</en></lang>
import test from 'node:test';
import assert from 'node:assert/strict';
import localDataset from '../src/data/venues.json' with { type: 'json' };
import { createLocalCatalogPage, createLocalReservation, createLocalResourceDetail } from '../src/domain/booking-domain.mjs';

test('catalog uses explicit page facts and isolates entries', () => {
  // <lang><zh-CN>第一页以每页两项取得可预测小样本。</zh-CN><en>Read the first page with two entries for a predictable small fixture.</en></lang>
  const firstPage = createLocalCatalogPage(localDataset, { page: 1, pageSize: 2, keyword: '' });

  // <lang><zh-CN>验证显式分页事实与下一页存在性。</zh-CN><en>Verify explicit paging facts and existence of a next page.</en></lang>
  assert.equal(firstPage.kind, 'page');
  assert.equal(firstPage.page, 1);
  assert.equal(firstPage.entries.length, 2);
  assert.equal(firstPage.total, 4);
  assert.equal(firstPage.hasNext, true);

  // <lang><zh-CN>改写返回项不应污染重新生成的 local JSON projection。</zh-CN><en>Mutating a returned entry must not contaminate a newly generated local-JSON projection.</en></lang>
  firstPage.entries[0].name['zh-Hans'] = '不应写回 / Must not write back';
  assert.notEqual(createLocalCatalogPage(localDataset, { page: 1, pageSize: 2, keyword: '' }).entries[0].name['zh-Hans'], '不应写回 / Must not write back');
});

test('catalog rejects unsupported request shape without echoing it', () => {
  // <lang><zh-CN>传入动态字段形式的无效请求，domain 必须返回受限 failure。</zh-CN><en>Pass an invalid dynamic-field request shape; domain must return a bounded failure.</en></lang>
  const outcome = createLocalCatalogPage(localDataset, { page: 0, pageSize: 200, keyword: { unsafe: true } });

  // <lang><zh-CN>失败不包含原始请求对象或未知字段。</zh-CN><en>The failure contains no original request object or unknown field.</en></lang>
  assert.equal(outcome.kind, 'failure');
  assert.equal(outcome.code, 'invalid-request');
  assert.equal('keyword' in outcome, false);
});

test('detail exposes only declared slots and booking accepts only those slots', () => {
  // <lang><zh-CN>读取一个有限资源详情。</zh-CN><en>Read one finite resource detail.</en></lang>
  const detail = createLocalResourceDetail(localDataset, 'riverside-court-a');

  // <lang><zh-CN>详情只包含 local JSON 已声明的时段。</zh-CN><en>Detail contains only slots declared in local JSON.</en></lang>
  assert.equal(detail.kind, 'detail');
  assert.deepEqual(detail.resource.availableSlots, ['09:00', '11:00', '14:00', '16:00']);

  // <lang><zh-CN>已声明时段能够创建限定的 confirmed record。</zh-CN><en>A declared slot can create a bounded confirmed record.</en></lang>
  const confirmed = createLocalReservation(detail, '2026-08-08', '09:00', 2);
  assert.equal(confirmed.kind, 'confirmed');
  assert.equal(confirmed.reservation.id, 'reservation-demo-002');

  // <lang><zh-CN>未声明时段返回冲突，且不回显该原始时段。</zh-CN><en>An undeclared slot returns conflict and does not echo the raw slot.</en></lang>
  const conflict = createLocalReservation(detail, '2026-08-08', '23:59', 3);
  assert.equal(conflict.kind, 'failure');
  assert.equal(conflict.code, 'conflict');
  assert.equal(JSON.stringify(conflict).includes('23:59'), false);
});
