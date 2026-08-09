/**
 * <lang><zh-CN>验证 local booking domain 的目录、详情与预约最小契约；测试不调用网络、storage、平台 API 或真实身份。</zh-CN><en>Verifies minimum catalog, detail, and reservation contracts of the local booking domain; tests call no network, storage, platform API, or real identity.</en></lang>
 * @lang zh-CN 这些测试覆盖可复现 local JSON 的核心行为，不能替代 H5/mp-weixin 实际编译或视觉验收。
 * @lang en These tests cover core behavior of reproducible local JSON and do not replace actual H5/mp-weixin compilation or visual acceptance.
 */

// <lang><zh-CN>导入 Node 内建测试断言和项目自有纯 domain API。</zh-CN><en>Import Node built-in test assertions and project-owned pure domain API.</en></lang>
import test from 'node:test';
import assert from 'node:assert/strict';
import localDataset from '../src/data/venues.json' with { type: 'json' };
import {
  createLocalCatalogFilterOptions,
  createLocalCatalogPage,
  createLocalReservation,
  createLocalResourceDetail
} from '../src/domain/booking-domain.mjs';

test('catalog uses explicit page facts and isolates entries', () => {
  // <lang><zh-CN>第一页以每页两项取得可预测小样本。</zh-CN><en>Read the first page with two entries for a predictable small fixture.</en></lang>
  const firstPage = createLocalCatalogPage(localDataset, { page: 1, pageSize: 2, keyword: '' });

  // <lang><zh-CN>验证显式分页事实与下一页存在性。</zh-CN><en>Verify explicit paging facts and existence of a next page.</en></lang>
  assert.equal(firstPage.kind, 'page');
  assert.equal(firstPage.page, 1);
  assert.equal(firstPage.entries.length, 2);
  assert.equal(firstPage.total, 10);
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

test('catalog applies declared local venue, type, and date filters before paging', () => {
  // <lang><zh-CN>只查询澄港场馆的学习空间且要求已声明的八月八日可用性。</zh-CN><en>Query only study spaces at Harbor venue with declared availability on August 8.</en></lang>
  const filteredPage = createLocalCatalogPage(localDataset, {
    page: 1,
    pageSize: 2,
    keyword: '',
    venueId: 'harbor-reading-hall',
    resourceTypeId: 'study-space',
    date: '2026-08-08'
  });

  // <lang><zh-CN>筛选后 total/hasNext 与同一结果集一致，并只保留两个受控资源。</zh-CN><en>After filtering, total/hasNext agree with one result set and retain only the two controlled resources.</en></lang>
  assert.equal(filteredPage.kind, 'page');
  assert.equal(filteredPage.total, 2);
  assert.equal(filteredPage.hasNext, false);
  assert.deepEqual(filteredPage.entries.map((entry) => entry.id), ['harbor-quiet-reading', 'harbor-shared-study-table']);
});

test('catalog filter options are detached, finite, and derived from declared availability', () => {
  // <lang><zh-CN>从同一静态 dataset 获取页面可消费的 selector options。</zh-CN><en>Get selector options consumable by pages from the same static dataset.</en></lang>
  const filterOptions = createLocalCatalogFilterOptions(localDataset);

  // <lang><zh-CN>锁定四个场馆、五种资源类型和三个示例日期，不让页面自行扫描 JSON。</zh-CN><en>Lock four venues, five resource types, and three demo dates so pages do not scan JSON themselves.</en></lang>
  assert.equal(filterOptions.venues.length, 4);
  assert.equal(filterOptions.resourceTypes.length, 5);
  assert.deepEqual(filterOptions.dates, ['2026-08-08', '2026-08-09', '2026-08-10']);

  // <lang><zh-CN>修改 option 标签不会写回原始 JSON 场馆名称。</zh-CN><en>Mutating an option label must not write back to the original JSON venue name.</en></lang>
  assert.throws(() => { filterOptions.venues[0].label.en = 'Must not mutate'; }, TypeError);
  assert.equal(localDataset.venues[0].name.en, 'Harbor Reading and Study Hall');
});

test('detail exposes only declared slots and booking accepts only those slots', () => {
  // <lang><zh-CN>读取一个有限资源详情。</zh-CN><en>Read one finite resource detail.</en></lang>
  const detail = createLocalResourceDetail(localDataset, 'riverside-court-a');

  // <lang><zh-CN>详情只包含 local JSON 已声明的时段。</zh-CN><en>Detail contains only slots declared in local JSON.</en></lang>
  assert.equal(detail.kind, 'detail');
  assert.deepEqual(detail.resource.availableDates, ['2026-08-08', '2026-08-09', '2026-08-10']);
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

  // <lang><zh-CN>未声明日期同样不可创建预约，防止确认页绕过本地可用日期 allowlist。</zh-CN><en>An undeclared date also cannot create a booking, preventing the confirmation page from bypassing the local available-date allowlist.</en></lang>
  const dateConflict = createLocalReservation(detail, '2026-08-11', '09:00', 4);
  assert.equal(dateConflict.kind, 'failure');
  assert.equal(dateConflict.code, 'conflict');
});
