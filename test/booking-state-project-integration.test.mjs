/**
 * <lang><zh-CN>预约示例 state 到 HIA-uView-Biz project facade 的集成测试：从目录读取到预约创建、改期和取消，验证页面可见状态只采用 facade terminal。</zh-CN><en>Integration test from booking-demo state to the HIA-uView-Biz project facade: from catalog read through reservation create, reschedule, and cancel, it verifies that visible state adopts only facade terminals.</en></lang>
 * @lang zh-CN 测试使用 checked-in local adapter 与进程内 singleton，不调用 UniApp API、网络、storage、身份、支付或真实后端。
 * @lang en The test uses the checked-in local adapter and in-process singleton and calls no UniApp API, network, storage, identity, payment, or live backend.
 */

// <lang><zh-CN>标准断言与测试 runner 提供单一顺序集成场景。</zh-CN><en>Standard assertions and test runner provide one ordered integration scenario.</en></lang>
import assert from 'node:assert/strict';
import test from 'node:test';

// <lang><zh-CN>只导入页面实际消费的 state surface，不导入 adapter、dataset 或底层 Biz runtime。</zh-CN><en>Import only the state surface consumed by pages and import no adapter, dataset, or lower Biz runtime.</en></lang>
import { useBookingDemo } from '../src/state/booking-demo.mjs';

test('booking state obtains catalog, reservation cards, and all writes through project facade', async () => {
  // <lang><zh-CN>取得生产 state 的只读 surface；测试不写 ref 或绕过 action。</zh-CN><en>Obtain the production state's readonly surface; the test neither writes refs nor bypasses actions.</en></lang>
  const demo = useBookingDemo();

  // <lang><zh-CN>目录首次读取同时交付 entries、筛选项与 actual local source。</zh-CN><en>The first catalog read jointly delivers entries, filter options, and actual local source.</en></lang>
  await demo.refreshCatalog('', { venueId: '', resourceTypeId: '', date: '' });
  assert.equal(demo.catalogPhase.value, 'ready');
  assert.equal(demo.catalogEntries.value.length > 0, true);
  assert.equal(demo.catalogFilterOptions.value.venues.length > 0, true);
  assert.equal(demo.catalogSource.value.authority, 'local');

  // <lang><zh-CN>记录 same-scope refresh 前已确认的卡片、分页与 source；刷新开始时这些可见事实必须保留，避免已有内容闪回 skeleton。</zh-CN><en>Record cards, pagination, and source confirmed before a same-scope refresh; these visible facts must remain when refresh starts, avoiding a flash back to the skeleton over existing content.</en></lang>
  const retainedEntryIds = demo.catalogEntries.value.map((entry) => entry.id);
  const retainedPaging = { ...demo.catalogPaging.value };
  const retainedSource = { ...demo.catalogSource.value };

  // <lang><zh-CN>同一空关键字/空筛选显式刷新仍走 facade，但 state 在 terminal 前保留当前 snapshot。</zh-CN><en>An explicit refresh of the same empty-keyword and empty-filter scope still crosses the facade, while state retains its current snapshot before the terminal.</en></lang>
  const sameScopeRefresh = demo.refreshCatalog('', { venueId: '', resourceTypeId: '', date: '' });
  assert.equal(demo.catalogPhase.value, 'loading');
  assert.deepEqual(demo.catalogEntries.value.map((entry) => entry.id), retainedEntryIds);
  assert.deepEqual({ ...demo.catalogPaging.value }, retainedPaging);
  assert.deepEqual({ ...demo.catalogSource.value }, retainedSource);
  await sameScopeRefresh;
  assert.equal(demo.catalogPhase.value, 'ready');
  assert.deepEqual(demo.catalogEntries.value.map((entry) => entry.id), retainedEntryIds);

  // <lang><zh-CN>切换到确定无匹配项的新关键字 scope 后，loading 必须立即撤下旧卡片、分页与 source，而不是把 Discover 的旧结果带回其他页面。</zh-CN><en>After switching to a new keyword scope guaranteed to match nothing, loading must immediately withdraw stale cards, pagination, and source rather than carry Discover's old results into another page.</en></lang>
  const emptyCatalogRead = demo.refreshCatalog('p70-no-such-local-resource', { venueId: '', resourceTypeId: '', date: '' });
  assert.equal(demo.catalogPhase.value, 'loading');
  assert.deepEqual(demo.catalogEntries.value, []);
  assert.deepEqual({ ...demo.catalogPaging.value }, { page: 0, pageSize: 2, total: 0, hasNext: false });
  assert.deepEqual({ ...demo.catalogSource.value }, { sourceId: null, authority: null, degradedReason: null });

  // <lang><zh-CN>等待 facade 的 successful empty terminal；D-3 只能表现为 ready 加空集合，并保留实际 local source，而不是伪造 failure。</zh-CN><en>Await the facade's successful-empty terminal; D-3 may only become ready plus an empty collection with actual local source, never a fabricated failure.</en></lang>
  await emptyCatalogRead;
  assert.equal(demo.catalogPhase.value, 'ready');
  assert.deepEqual(demo.catalogEntries.value, []);
  assert.equal(demo.catalogPaging.value.total, 0);
  assert.equal(demo.catalogSource.value.authority, 'local');
  assert.equal(demo.catalogFailure.value, null);

  // <lang><zh-CN>恢复默认 scope 供后续详情/预约流程使用；从 successful empty 返回时同样只能通过 facade 重新取得卡片。</zh-CN><en>Restore the default scope for later detail/reservation flow; returning from successful empty must likewise reacquire cards only through the facade.</en></lang>
  await demo.refreshCatalog('', { venueId: '', resourceTypeId: '', date: '' });
  assert.equal(demo.catalogPhase.value, 'ready');
  assert.equal(demo.catalogEntries.value.length > 0, true);

  // <lang><zh-CN>选择 facade 给出的一个有限场馆 ID 形成 filter-only scope 变化；即使关键字不变，旧卡片和页次也必须在 terminal 前撤下。</zh-CN><en>Select one finite venue ID supplied by the facade to create a filter-only scope change; even with an unchanged keyword, stale cards and paging must be withdrawn before the terminal.</en></lang>
  const venueId = demo.catalogFilterOptions.value.venues[0].value;
  const filteredCatalogRead = demo.refreshCatalog('', { venueId, resourceTypeId: '', date: '' });
  assert.equal(demo.catalogPhase.value, 'loading');
  assert.deepEqual(demo.catalogEntries.value, []);
  assert.equal(demo.catalogPaging.value.page, 0);
  assert.equal(demo.catalogSource.value.authority, null);
  await filteredCatalogRead;
  assert.equal(demo.catalogPhase.value, 'ready');
  assert.equal(demo.catalogEntries.value.length > 0, true);

  // <lang><zh-CN>再次恢复默认 scope，使余下测试继续从未筛选 canonical catalog 选择资源。</zh-CN><en>Restore the default scope again so the remaining test continues selecting a resource from the unfiltered canonical catalog.</en></lang>
  await demo.refreshCatalog('', { venueId: '', resourceTypeId: '', date: '' });

  // <lang><zh-CN>详情 ID 只取自 facade 返回的 canonical catalog entry。</zh-CN><en>Take the detail ID only from a canonical catalog entry returned by the facade.</en></lang>
  const resourceId = demo.catalogEntries.value[0].id;
  await demo.loadResourceDetail(resourceId);
  assert.equal(demo.detailPhase.value, 'ready');
  assert.equal(demo.selectedDetail.value.kind, 'detail');
  assert.equal(demo.detailSource.value.authority, 'local');

  // <lang><zh-CN>从有效详情切到未知 ID 时，state 必须在 terminal 前立即撤下旧详情，不能让新路由继续显示前一资源。</zh-CN><en>When moving from a valid detail to an unknown ID, state must withdraw the old detail before the terminal and must not let the new route keep showing the prior resource.</en></lang>
  const missingDetailRead = demo.loadResourceDetail('unknown');
  assert.equal(demo.detailPhase.value, 'loading');
  assert.equal(demo.selectedDetail.value, null);
  await missingDetailRead;
  assert.equal(demo.detailPhase.value, 'failure');
  assert.equal(demo.selectedDetail.value, null);
  assert.equal(demo.detailFailure.value.kind, 'failure');
  assert.equal(demo.detailFailure.value.code, 'not-found');
  assert.equal(demo.detailFailure.value.message.en.includes('unknown'), false);

  // <lang><zh-CN>对同一未知路由显式重试仍保持 bounded failure 与空详情，不得恢复缓存成功结果。</zh-CN><en>An explicit retry of the same unknown route must retain a bounded failure and empty detail rather than restoring a cached success.</en></lang>
  await demo.loadResourceDetail('unknown');
  assert.equal(demo.detailPhase.value, 'failure');
  assert.equal(demo.selectedDetail.value, null);
  assert.equal(demo.detailFailure.value.code, 'not-found');

  // <lang><zh-CN>返回一个 canonical 资源后可重新进入 ready，证明失败没有污染后续发现页恢复路径。</zh-CN><en>Returning to a canonical resource can re-enter ready, proving the failure does not contaminate the later Discover recovery path.</en></lang>
  await demo.loadResourceDetail(resourceId);
  assert.equal(demo.detailPhase.value, 'ready');
  assert.equal(demo.selectedDetail.value.resource.id, resourceId);

  // <lang><zh-CN>预约列表由 reservation.list 初始化；state 不从 JSON seed 构造卡片。</zh-CN><en>Initialize reservations through reservation.list; state constructs no cards from a JSON seed.</en></lang>
  await demo.refreshReservations();
  assert.equal(demo.reservationPhase.value, 'ready');
  assert.equal(demo.reservationCards.value.length, demo.reservations.value.length);
  assert.equal(demo.reservationSource.value.authority, 'local');
  const initialReservationCount = demo.reservationCards.value.length;

  // <lang><zh-CN>草稿选择仅来自当前详情声明的第一项日期与时段。</zh-CN><en>Draft selection comes only from the first date and slot declared by current detail.</en></lang>
  const detail = demo.selectedDetail.value;
  const selection = demo.prepareLocalBooking(detail.resource.availableDates[0], detail.resource.availableSlots[0]);
  assert.equal(selection.kind, 'selection-ready');

  // <lang><zh-CN>创建成功后 state 同时采用 raw snapshot、adapter-owned cards 与 write source。</zh-CN><en>After successful creation, state jointly adopts the raw snapshot, adapter-owned cards, and write source.</en></lang>
  const confirmation = await demo.confirmLocalReservation();
  assert.equal(confirmation.kind, 'confirmed');
  assert.equal(demo.reservationCards.value.length, initialReservationCount + 1);
  assert.equal(demo.writeSource.value.authority, 'local');
  assert.equal(demo.reservationSource.value.authority, 'local');

  // <lang><zh-CN>改期使用同一详情中的另一已声明时段，完整 outcome 必须同时保留旧 cancelled 记录与新 confirmed replacement。</zh-CN><en>Reschedule uses another declared slot from the same detail, and the complete outcome must retain both the old cancelled record and the new confirmed replacement.</en></lang>
  const replacementTime = detail.resource.availableSlots.find((slot) => slot !== detail.resource.availableSlots[0]);
  assert.equal(typeof replacementTime, 'string');
  const reschedule = await demo.rescheduleLocalReservation(
    confirmation.reservation.id,
    detail.resource.availableDates[0],
    replacementTime
  );
  assert.equal(reschedule.kind, 'rescheduled');
  assert.equal(demo.reservationCards.value.length, initialReservationCount + 2);
  assert.equal(demo.reservationCards.value.find((reservation) => reservation.id === confirmation.reservation.id)?.status, 'cancelled');
  assert.equal(demo.reservationCards.value.find((reservation) => reservation.id === reschedule.reservation.id)?.status, 'confirmed');

  // <lang><zh-CN>再取消 replacement，确认第三项 write 仍采用完整 facade snapshot，而不是页面删除或局部 patch。</zh-CN><en>Then cancel the replacement, confirming that the third write still adopts a complete facade snapshot rather than deleting or patching locally in the page.</en></lang>
  const cancellation = await demo.cancelLocalReservation(reschedule.reservation.id);
  assert.equal(cancellation.kind, 'cancelled');
  assert.equal(demo.reservationCards.value.length, initialReservationCount + 2);
  assert.equal(demo.reservationCards.value.find((reservation) => reservation.id === reschedule.reservation.id)?.status, 'cancelled');
  assert.equal(demo.writeSource.value.authority, 'local');
  assert.equal(demo.reservationSource.value.authority, 'local');
});
