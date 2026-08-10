/**
 * <lang><zh-CN>资源预约 BP 的唯一 local project adapter：在一个共享进程内 authority 中统一目录、详情、预约列表与三项预约 mutation，并通过 HIA-uView-Biz opaque adapter token 进入 project facade。</zh-CN><en>Sole local project adapter for the resource-booking BP: unifies catalog, detail, reservation list, and three reservation mutations under one shared in-process authority and enters the project facade through an HIA-uView-Biz opaque adapter token.</en></lang>
 * @lang zh-CN adapter 只读取仓内静态 JSON 并维护独立 mock snapshot/receipt；它不访问网络、storage、身份、credential、支付、真实库存或动态代码。
 * @lang en The adapter reads only checked-in static JSON and maintains an isolated mock snapshot and receipt set; it accesses no network, storage, identity, credential, payment, live inventory, or dynamic code.
 */

// <lang><zh-CN>只从面向项目的 Biz package 获取 opaque adapter 定义 API，不直接创建底层 async host。</zh-CN><en>Obtain only the opaque-adapter definition API from the project-facing Biz package and do not create a lower async host directly.</en></lang>
import { defineProjectSourceAdapter } from '@hia-uview/biz-project-runtime';

// <lang><zh-CN>读取唯一版本化 local dataset 与纯 domain 投影；adapter 不原地修改任何导入对象。</zh-CN><en>Read the sole versioned local dataset and pure domain projections; the adapter mutates no imported object in place.</en></lang>
import { localDataset } from '../data/local-dataset.mjs';
import {
  BOOKING_DOMAIN_VERSION,
  createLocalCatalogFilterOptions,
  createLocalCatalogPage,
  createLocalReservation,
  createLocalResourceDetail
} from '../domain/booking-domain.mjs';

// <lang><zh-CN>复用 project profile 的稳定 operation/source identity，禁止 adapter-private alias 漂移。</zh-CN><en>Reuse stable operation and source identities from the project profile, preventing adapter-private alias drift.</en></lang>
import {
  RESOURCE_BOOKING_LOCAL_ADAPTER_ID,
  RESOURCE_BOOKING_OPERATION_IDS
} from '../project/resource-booking-contracts.mjs';

/**
 * <lang><zh-CN>单个 adapter 实例最多保留的幂等 write receipt 数量。</zh-CN><en>Maximum number of idempotent write receipts retained by one adapter instance.</en></lang>
 * @lang zh-CN 达到上限时拒绝新的 command，不驱逐可重放 receipt，也不产生新的 mutation。
 * @lang en At capacity a new command is rejected; replayable receipts are not evicted and no new mutation occurs.
 */
const MAX_COMMAND_RECEIPTS = 32;

/**
 * <lang><zh-CN>复制本模块已知为 JSON plain data 的值。</zh-CN><en>Copies a value known by this module to be JSON plain data.</en></lang>
 * @param {unknown} value <lang><zh-CN>静态 dataset、runtime-isolated input 或 canonical outcome。</zh-CN><en>Static dataset, runtime-isolated input, or canonical outcome.</en></lang>
 * @returns {unknown} <lang><zh-CN>与原值不共享对象引用的副本。</zh-CN><en>Copy sharing no object reference with the original value.</en></lang>
 * @lang zh-CN helper 不用于任意页面对象；behavioral input 已由 project runtime 在 handler 前拒绝。
 * @lang en The helper is not for arbitrary page objects; project runtime rejects behavioral input before a handler runs.
 */
function copyJson(value) {
  // <lang><zh-CN>JSON round trip 保留当前示例的有限 plain-data boundary。</zh-CN><en>A JSON round trip preserves the demo's finite plain-data boundary.</en></lang>
  return JSON.parse(JSON.stringify(value));
}

/**
 * <lang><zh-CN>创建项目自有的双语可见文本。</zh-CN><en>Creates project-owned bilingual visible text.</en></lang>
 * @param {string} zhHans <lang><zh-CN>简体中文文本。</zh-CN><en>Simplified-Chinese text.</en></lang>
 * @param {string} en <lang><zh-CN>English 文本。</zh-CN><en>English text.</en></lang>
 * @returns {{'zh-Hans': string, en: string}} <lang><zh-CN>新的 locale text。</zh-CN><en>Fresh locale text.</en></lang>
 * @lang zh-CN 文案不来自输入、异常或 source message，避免回显未受控数据。
 * @lang en Copy is derived from no input, exception, or source message, preventing uncontrolled echo.
 */
function createLocalizedText(zhHans, en) {
  // <lang><zh-CN>每次返回新对象，避免 receipt 与 caller 共享 locale 字段。</zh-CN><en>Return a fresh object each time so a receipt and caller share no locale fields.</en></lang>
  return { 'zh-Hans': zhHans, en };
}

/**
 * <lang><zh-CN>创建不回显 command 的 canonical booking failure。</zh-CN><en>Creates a canonical booking failure that does not echo a command.</en></lang>
 * @param {string} code <lang><zh-CN>项目 allowlist 内的稳定 failure code。</zh-CN><en>Stable failure code in the project allowlist.</en></lang>
 * @param {string} zhHans <lang><zh-CN>简体中文恢复提示。</zh-CN><en>Simplified-Chinese recovery guidance.</en></lang>
 * @param {string} en <lang><zh-CN>English recovery guidance。</zh-CN><en>English recovery guidance.</en></lang>
 * @returns {object} <lang><zh-CN>不含 snapshot、ID、异常或 provider 信息的 failure。</zh-CN><en>Failure containing no snapshot, ID, exception, or provider information.</en></lang>
 * @lang zh-CN failure 是 source success value 中的业务结果；project runtime failure 由组合根另行映射。
 * @lang en The failure is a business result inside a source-success value; the composition root maps project-runtime failures separately.
 */
function createBookingFailure(code, zhHans, en) {
  // <lang><zh-CN>固定 shape 让现有 state 可继续通过 runtime locale 呈现。</zh-CN><en>The fixed shape lets existing state continue rendering through runtime locale.</en></lang>
  return {
    contractVersion: BOOKING_DOMAIN_VERSION,
    kind: 'failure',
    code,
    message: createLocalizedText(zhHans, en),
    retryable: false,
    scope: 'booking'
  };
}

/**
 * <lang><zh-CN>判断 runtime-isolated input 是否为普通 record。</zh-CN><en>Determines whether a runtime-isolated input is an ordinary record.</en></lang>
 * @param {unknown} value <lang><zh-CN>候选 request 或 command。</zh-CN><en>Candidate request or command.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否可以按有限 own fields 解释。</zh-CN><en>Whether it may be interpreted through finite own fields.</en></lang>
 * @lang zh-CN project runtime 已执行行为隔离；本检查仍拒绝 null 与数组，避免业务 dispatch 含糊。
 * @lang en Project runtime already performs behavioral isolation; this check still rejects null and arrays to avoid ambiguous business dispatch.
 */
function isPlainRecord(value) {
  // <lang><zh-CN>只接受 object literal 语义，不调用转换函数。</zh-CN><en>Accept only object-literal semantics and call no conversion function.</en></lang>
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * <lang><zh-CN>确认 record 的 own enumerable fields 与固定集合精确一致。</zh-CN><en>Confirms that a record's own enumerable fields exactly match a fixed set.</en></lang>
 * @param {object} value <lang><zh-CN>已确认普通 record。</zh-CN><en>Already confirmed ordinary record.</en></lang>
 * @param {string[]} expectedFields <lang><zh-CN>完整允许字段集合。</zh-CN><en>Complete allowed field set.</en></lang>
 * @returns {boolean} <lang><zh-CN>无缺失或额外字段时为 true。</zh-CN><en>True when no field is missing or extra.</en></lang>
 * @lang zh-CN exact shape 防止 request/command 演变为自由 metadata 或 transport payload。
 * @lang en Exact shape prevents a request or command from becoming free metadata or a transport payload.
 */
function hasExactFields(value, expectedFields) {
  // <lang><zh-CN>input 已由 runtime 复制为 plain data，因此 own key 枚举不会执行 caller behavior。</zh-CN><en>Runtime has copied input to plain data, so own-key enumeration executes no caller behavior.</en></lang>
  const actualFields = Object.keys(value);

  // <lang><zh-CN>数量和成员都必须一致。</zh-CN><en>Both count and membership must match.</en></lang>
  return actualFields.length === expectedFields.length
    && actualFields.every((field) => expectedFields.includes(field));
}

/**
 * <lang><zh-CN>校验当前进程幂等 receipt 使用的 command ID。</zh-CN><en>Validates a command ID used by in-process idempotent receipts.</en></lang>
 * @param {unknown} commandId <lang><zh-CN>候选 command ID。</zh-CN><en>Candidate command ID.</en></lang>
 * @returns {boolean} <lang><zh-CN>符合有限小写 ASCII 形式时为 true。</zh-CN><en>True when the value conforms to a bounded lowercase-ASCII form.</en></lang>
 * @lang zh-CN ID 不是订单号、用户 ID、token、跨会话 key 或可见业务编号。
 * @lang en The ID is not an order number, user ID, token, cross-session key, or visible business number.
 */
function isValidCommandId(commandId) {
  // <lang><zh-CN>有限长度阻止自由文本或 URL 进入 receipt key。</zh-CN><en>Bounded length prevents free text or a URL from entering a receipt key.</en></lang>
  return typeof commandId === 'string' && /^[a-z][a-z0-9-]{0,63}$/u.test(commandId);
}

/**
 * <lang><zh-CN>校验示例日期的有限文本形状。</zh-CN><en>Validates the bounded textual shape of a demo date.</en></lang>
 * @param {unknown} date <lang><zh-CN>候选日期。</zh-CN><en>Candidate date.</en></lang>
 * @returns {boolean} <lang><zh-CN>符合 YYYY-MM-DD 时为 true。</zh-CN><en>True when the value follows YYYY-MM-DD.</en></lang>
 * @lang zh-CN 具体 availability 仍由 resource domain allowlist 决定；本检查不读取系统时间。
 * @lang en Resource-domain allowlists still determine actual availability; this check reads no system clock.
 */
function isSupportedDate(date) {
  // <lang><zh-CN>只验证固定 ASCII shape，不进行 Date 解析或时区推断。</zh-CN><en>Validate only the fixed ASCII shape without Date parsing or timezone inference.</en></lang>
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(date);
}

/**
 * <lang><zh-CN>校验示例预约时段的有限文本形状。</zh-CN><en>Validates the bounded textual shape of a demo booking slot.</en></lang>
 * @param {unknown} time <lang><zh-CN>候选时段。</zh-CN><en>Candidate slot.</en></lang>
 * @returns {boolean} <lang><zh-CN>符合 HH:MM 时为 true。</zh-CN><en>True when the value follows HH:MM.</en></lang>
 * @lang zh-CN 本检查不把文本解释为 cron、timestamp 或真实营业规则。
 * @lang en This check does not interpret text as cron, a timestamp, or a real operating rule.
 */
function isSupportedTime(time) {
  // <lang><zh-CN>只接受五字符数字时段形状。</zh-CN><en>Accept only the five-character numeric slot shape.</en></lang>
  return typeof time === 'string' && /^\d{2}:\d{2}$/u.test(time);
}

/**
 * <lang><zh-CN>校验目录分页/筛选 request。</zh-CN><en>Validates a catalog pagination and filtering request.</en></lang>
 * @param {unknown} request <lang><zh-CN>facade 隔离后的 request。</zh-CN><en>Request isolated by the facade.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否可交给纯 catalog domain。</zh-CN><en>Whether it may be supplied to the pure catalog domain.</en></lang>
 * @lang zh-CN request 只允许分页、关键字、场馆、类型与日期，不含 transport 或动态 filter expression。
 * @lang en The request permits only pagination, keyword, venue, type, and date; it contains no transport or dynamic filter expression.
 */
function isCatalogRequest(request) {
  // <lang><zh-CN>state 总是提供六个字段；exact shape 阻止未审阅字段进入 domain。</zh-CN><en>State always supplies six fields; exact shape blocks unreviewed fields from entering the domain.</en></lang>
  return isPlainRecord(request)
    && hasExactFields(request, ['page', 'pageSize', 'keyword', 'venueId', 'resourceTypeId', 'date'])
    && Number.isInteger(request.page)
    && Number.isInteger(request.pageSize)
    && typeof request.keyword === 'string'
    && typeof request.venueId === 'string'
    && typeof request.resourceTypeId === 'string'
    && typeof request.date === 'string';
}

/**
 * <lang><zh-CN>校验 resource detail request。</zh-CN><en>Validates a resource-detail request.</en></lang>
 * @param {unknown} request <lang><zh-CN>facade 隔离后的 request。</zh-CN><en>Request isolated by the facade.</en></lang>
 * @returns {boolean} <lang><zh-CN>只含稳定 resourceId 时为 true。</zh-CN><en>True when it contains only a stable resourceId.</en></lang>
 * @lang zh-CN resourceId 只在有限 local JSON 集合中比较，不形成路径、URL 或查询语言。
 * @lang en resourceId is compared only in the finite local-JSON set and forms no path, URL, or query language.
 */
function isDetailRequest(request) {
  // <lang><zh-CN>拒绝空或额外字段。</zh-CN><en>Reject an empty or extra field.</en></lang>
  return isPlainRecord(request)
    && hasExactFields(request, ['resourceId'])
    && typeof request.resourceId === 'string';
}

/**
 * <lang><zh-CN>校验一项 operation-specific reservation command。</zh-CN><en>Validates one operation-specific reservation command.</en></lang>
 * @param {string} operationId <lang><zh-CN>facade 已固定的 write operation ID。</zh-CN><en>Write-operation ID already fixed by the facade.</en></lang>
 * @param {unknown} command <lang><zh-CN>facade 隔离后的 command。</zh-CN><en>Command isolated by the facade.</en></lang>
 * @returns {boolean} <lang><zh-CN>command 精确满足对应 operation 时为 true。</zh-CN><en>True when the command exactly satisfies the corresponding operation.</en></lang>
 * @lang zh-CN operation 不再由 command 自由 dispatch；同一个 command shape 只能进入调用方选择的固定 handler。
 * @lang en The command no longer performs free operation dispatch; one command shape can enter only the fixed handler selected by the caller.
 */
function isWriteCommand(operationId, command) {
  // <lang><zh-CN>所有 write 都先要求有限 commandId。</zh-CN><en>Every write first requires a bounded commandId.</en></lang>
  if (!isPlainRecord(command) || !isValidCommandId(command.commandId)) {
    return false;
  }

  // <lang><zh-CN>create 只接受 resource/date/time 原始值。</zh-CN><en>Create accepts only resource, date, and time primitives.</en></lang>
  if (operationId === RESOURCE_BOOKING_OPERATION_IDS.createReservation) {
    return hasExactFields(command, ['commandId', 'resourceId', 'date', 'time'])
      && typeof command.resourceId === 'string'
      && isSupportedDate(command.date)
      && isSupportedTime(command.time);
  }

  // <lang><zh-CN>cancel 只接受当前 runtime reservation ID。</zh-CN><en>Cancel accepts only a current-runtime reservation ID.</en></lang>
  if (operationId === RESOURCE_BOOKING_OPERATION_IDS.cancelReservation) {
    return hasExactFields(command, ['commandId', 'reservationId'])
      && typeof command.reservationId === 'string'
      && /^reservation-demo-\d{3}$/u.test(command.reservationId);
  }

  // <lang><zh-CN>剩余合法 write 只能是 reschedule，并复用旧记录的 resource identity。</zh-CN><en>The remaining valid write can only be reschedule and reuses the old record's resource identity.</en></lang>
  return operationId === RESOURCE_BOOKING_OPERATION_IDS.rescheduleReservation
    && hasExactFields(command, ['commandId', 'reservationId', 'date', 'time'])
    && typeof command.reservationId === 'string'
    && /^reservation-demo-\d{3}$/u.test(command.reservationId)
    && isSupportedDate(command.date)
    && isSupportedTime(command.time);
}

/**
 * <lang><zh-CN>从当前 snapshot 生成下一个仅示例用 reservation ordinal。</zh-CN><en>Creates the next demo-only reservation ordinal from the current snapshot.</en></lang>
 * @param {object[]} reservationSnapshot <lang><zh-CN>adapter 私有预约 snapshot。</zh-CN><en>Adapter-private reservation snapshot.</en></lang>
 * @returns {number} <lang><zh-CN>不会复用历史 ID 的下一个序号。</zh-CN><en>Next ordinal that does not reuse a historical ID.</en></lang>
 * @lang zh-CN cancelled record 仍保留，因此长度可作为当前刷新周期的单调序号来源。
 * @lang en Cancelled records remain present, so length is a monotonic ordinal source for the current refresh cycle.
 */
function createNextReservationOrdinal(reservationSnapshot) {
  // <lang><zh-CN>序号不读取真实时间、随机数、账号或持久化计数器。</zh-CN><en>The ordinal reads no real clock, random value, account, or persistent counter.</en></lang>
  return reservationSnapshot.length + 1;
}

/**
 * <lang><zh-CN>把共享 reservation snapshot 投影为页面可直接呈现的完整 card 集合。</zh-CN><en>Projects the shared reservation snapshot into a complete card collection directly presentable by pages.</en></lang>
 * @param {object[]} reservationSnapshot <lang><zh-CN>adapter 私有 raw reservation records。</zh-CN><en>Adapter-private raw reservation records.</en></lang>
 * @returns {object[]} <lang><zh-CN>补充双语场馆/资源、图片与静态 availability 的 detached cards。</zh-CN><en>Detached cards enriched with bilingual venue and resource data, images, and static availability.</en></lang>
 * @lang zh-CN projection 只读取受审计 local JSON；它不推断联系人、价格、支付、身份、实时库存或后端字段。
 * @lang en Projection reads only audited local JSON and infers no contact, price, payment, identity, live-inventory, or backend field.
 */
function createReservationCards(reservationSnapshot) {
  // <lang><zh-CN>每条 raw record 只按有限 venue/resource ID 关联静态展示信息。</zh-CN><en>Associate every raw record with static presentation data only through finite venue and resource IDs.</en></lang>
  return reservationSnapshot.map((reservation) => {
    // <lang><zh-CN>venue lookup 仅遍历 checked-in 小集合，未知 ID 使用固定 fallback。</zh-CN><en>Venue lookup traverses only the small checked-in set; an unknown ID uses a fixed fallback.</en></lang>
    const venue = localDataset.venues.find(
      (candidateVenue) => candidateVenue.id === reservation.venueId
    );

    // <lang><zh-CN>resource lookup 被限制在已匹配 venue 内。</zh-CN><en>Resource lookup is limited to the matched venue.</en></lang>
    const resource = venue?.resources.find(
      (candidateResource) => candidateResource.id === reservation.resourceId
    );

    // <lang><zh-CN>返回全新 card，不保留 dataset 或 transaction record 的嵌套引用。</zh-CN><en>Return a fresh card retaining no nested reference to the dataset or transaction record.</en></lang>
    return {
      id: reservation.id,
      date: reservation.date,
      time: reservation.time,
      status: reservation.status,
      venueId: reservation.venueId,
      resourceId: reservation.resourceId,
      venueImageId: venue?.imageId ?? '',
      venueName: copyJson(venue?.name ?? { 'zh-Hans': '示例场馆', en: 'Demo venue' }),
      resourceName: copyJson(resource?.name ?? { 'zh-Hans': '示例资源', en: 'Demo resource' }),
      availableDates: resource ? [...resource.availableDates] : [],
      availableSlots: resource ? [...resource.availableSlots] : []
    };
  });
}

/**
 * <lang><zh-CN>在当前 snapshot 上计算 create 结果。</zh-CN><en>Computes a create result against the current snapshot.</en></lang>
 * @param {object} command <lang><zh-CN>已验证 create command。</zh-CN><en>Validated create command.</en></lang>
 * @param {object[]} reservationSnapshot <lang><zh-CN>当前私有 snapshot。</zh-CN><en>Current private snapshot.</en></lang>
 * @returns {{outcome: object, nextSnapshot: object[]}} <lang><zh-CN>canonical outcome 与候选 next snapshot。</zh-CN><en>Canonical outcome and candidate next snapshot.</en></lang>
 * @lang zh-CN failure 保留原 snapshot；只有 confirmed outcome 含 append 后的新 snapshot。
 * @lang en A failure retains the original snapshot; only a confirmed outcome carries the appended next snapshot.
 */
function executeCreate(command, reservationSnapshot) {
  // <lang><zh-CN>先用纯 domain 查找资源；未知 ID 不计算 ordinal。</zh-CN><en>First use the pure domain to find a resource; an unknown ID does not calculate an ordinal.</en></lang>
  const detail = createLocalResourceDetail(localDataset, command.resourceId);
  if (detail.kind === 'failure') {
    return { outcome: detail, nextSnapshot: reservationSnapshot };
  }

  // <lang><zh-CN>domain 再验证静态可用日期/时段并创建 detached confirmed record。</zh-CN><en>The domain then validates static available dates and slots and creates a detached confirmed record.</en></lang>
  const ordinal = createNextReservationOrdinal(reservationSnapshot);
  const outcome = createLocalReservation(detail, command.date, command.time, ordinal);
  if (outcome.kind === 'failure') {
    return { outcome, nextSnapshot: reservationSnapshot };
  }

  // <lang><zh-CN>同一资源、日期与时段只能保留一项 confirmed 预约；cancelled 历史不占用示例时段。</zh-CN><en>Only one confirmed reservation may occupy the same resource, date, and slot; cancelled history does not occupy a demo slot.</en></lang>
  const hasConfirmedSlotConflict = reservationSnapshot.some(
    (reservation) => reservation.status === 'confirmed'
      && reservation.resourceId === command.resourceId
      && reservation.date === command.date
      && reservation.time === command.time
  );
  if (hasConfirmedSlotConflict) {
    // <lang><zh-CN>返回固定双语 conflict，不回显 resource、日期、时段或现有预约记录。</zh-CN><en>Return a fixed bilingual conflict without echoing the resource, date, slot, or existing reservation record.</en></lang>
    return {
      outcome: createBookingFailure(
        'conflict',
        '该示例时段已被预约，请重新选择时段。',
        'This demo slot is already booked; choose another slot.'
      ),
      nextSnapshot: reservationSnapshot
    };
  }

  // <lang><zh-CN>append 使用新数组；导入 dataset 与旧 snapshot 均不原地修改。</zh-CN><en>Append with a new array; neither imported dataset nor old snapshot is mutated in place.</en></lang>
  const nextSnapshot = [...reservationSnapshot, copyJson(outcome.reservation)];
  return {
    outcome: {
      ...outcome,
      reservation: copyJson(outcome.reservation),
      reservations: copyJson(nextSnapshot),
      reservationCards: createReservationCards(nextSnapshot)
    },
    nextSnapshot
  };
}

/**
 * <lang><zh-CN>在当前 snapshot 上计算 cancel 结果并保留可见历史。</zh-CN><en>Computes a cancel result against the current snapshot while retaining visible history.</en></lang>
 * @param {object} command <lang><zh-CN>已验证 cancel command。</zh-CN><en>Validated cancel command.</en></lang>
 * @param {object[]} reservationSnapshot <lang><zh-CN>当前私有 snapshot。</zh-CN><en>Current private snapshot.</en></lang>
 * @returns {{outcome: object, nextSnapshot: object[]}} <lang><zh-CN>canonical outcome 与候选 next snapshot。</zh-CN><en>Canonical outcome and candidate next snapshot.</en></lang>
 * @lang zh-CN cancel 不删除记录、不释放真实库存、不退款，也不触及持久层。
 * @lang en Cancel deletes no record, releases no live inventory, refunds nothing, and touches no persistence layer.
 */
function executeCancel(command, reservationSnapshot) {
  // <lang><zh-CN>只有当前 confirmed record 可取消。</zh-CN><en>Only a currently confirmed record may be cancelled.</en></lang>
  const reservationIndex = reservationSnapshot.findIndex(
    (reservation) => reservation.id === command.reservationId && reservation.status === 'confirmed'
  );
  if (reservationIndex === -1) {
    return {
      outcome: createBookingFailure('conflict', '该示例预约已不可取消。', 'This demo reservation can no longer be cancelled.'),
      nextSnapshot: reservationSnapshot
    };
  }

  // <lang><zh-CN>以新 record/new array 表示唯一状态变化。</zh-CN><en>Represent the sole status change with a new record and new array.</en></lang>
  const cancelledReservation = { ...reservationSnapshot[reservationIndex], status: 'cancelled' };
  const nextSnapshot = reservationSnapshot.map(
    (reservation, index) => index === reservationIndex ? cancelledReservation : copyJson(reservation)
  );
  return {
    outcome: {
      contractVersion: BOOKING_DOMAIN_VERSION,
      kind: 'cancelled',
      reservation: copyJson(cancelledReservation),
      reservations: copyJson(nextSnapshot),
      reservationCards: createReservationCards(nextSnapshot)
    },
    nextSnapshot
  };
}

/**
 * <lang><zh-CN>计算“创建 replacement 后取消旧记录”的原子改期结果。</zh-CN><en>Computes an atomic reschedule result that creates a replacement and then cancels the old record.</en></lang>
 * @param {object} command <lang><zh-CN>已验证 reschedule command。</zh-CN><en>Validated reschedule command.</en></lang>
 * @param {object[]} reservationSnapshot <lang><zh-CN>当前私有 snapshot。</zh-CN><en>Current private snapshot.</en></lang>
 * @returns {{outcome: object, nextSnapshot: object[]}} <lang><zh-CN>canonical outcome 与候选 next snapshot。</zh-CN><en>Canonical outcome and candidate next snapshot.</en></lang>
 * @lang zh-CN 新时段失败时旧记录保持 confirmed；成功时旧记录保留为 cancelled，且不允许换 resource。
 * @lang en When the new slot fails the old record remains confirmed; on success the old record remains as cancelled and the resource cannot change.
 */
function executeReschedule(command, reservationSnapshot) {
  // <lang><zh-CN>定位当前可改期记录，不接受取消历史或未知 ID。</zh-CN><en>Locate the current reschedulable record and accept neither cancelled history nor an unknown ID.</en></lang>
  const reservationIndex = reservationSnapshot.findIndex(
    (reservation) => reservation.id === command.reservationId && reservation.status === 'confirmed'
  );
  if (reservationIndex === -1) {
    return {
      outcome: createBookingFailure('conflict', '该示例预约已不可改期。', 'This demo reservation can no longer be rescheduled.'),
      nextSnapshot: reservationSnapshot
    };
  }

  // <lang><zh-CN>resourceId 来自私有旧记录，不接受 caller 在改期时替换资源。</zh-CN><en>resourceId comes from the private old record, preventing a caller from changing resources during reschedule.</en></lang>
  const currentReservation = reservationSnapshot[reservationIndex];
  const createResult = executeCreate({
    commandId: command.commandId,
    resourceId: currentReservation.resourceId,
    date: command.date,
    time: command.time
  }, reservationSnapshot);
  if (createResult.outcome.kind === 'failure') {
    return { outcome: createResult.outcome, nextSnapshot: reservationSnapshot };
  }

  // <lang><zh-CN>replacement 已成功后才在同一候选 snapshot 中取消旧记录。</zh-CN><en>Only after replacement succeeds is the old record cancelled in the same candidate snapshot.</en></lang>
  const nextSnapshot = createResult.nextSnapshot.map((reservation) => reservation.id === currentReservation.id
    ? { ...reservation, status: 'cancelled' }
    : copyJson(reservation));
  const nextReservation = nextSnapshot.find(
    (reservation) => reservation.id === createResult.outcome.reservation.id
  );
  const cancelledReservation = nextSnapshot.find(
    (reservation) => reservation.id === currentReservation.id
  );
  if (!nextReservation || !cancelledReservation) {
    return {
      outcome: createBookingFailure('provider-unavailable', '示例预约状态暂时不可用，请查看当前预约列表。', 'Demo reservation state is temporarily unavailable; review the current booking list.'),
      nextSnapshot: reservationSnapshot
    };
  }

  // <lang><zh-CN>返回 old/new record 与完整 detached snapshot，明确表达取消加创建语义。</zh-CN><en>Return old and new records plus a complete detached snapshot, explicitly expressing cancel-plus-create semantics.</en></lang>
  return {
    outcome: {
      contractVersion: BOOKING_DOMAIN_VERSION,
      kind: 'rescheduled',
      cancelledReservation: copyJson(cancelledReservation),
      reservation: copyJson(nextReservation),
      reservations: copyJson(nextSnapshot),
      reservationCards: createReservationCards(nextSnapshot)
    },
    nextSnapshot
  };
}

/**
 * <lang><zh-CN>创建一个拥有独立共享 snapshot/receipt 的 local project adapter。</zh-CN><en>Creates a local project adapter owning an isolated shared snapshot and receipt set.</en></lang>
 * @returns {{adapter: object, getExecutionSnapshot: Function}} <lang><zh-CN>opaque adapter token 与仅计数 execution fact getter。</zh-CN><en>Opaque adapter token and a count-only execution-fact getter.</en></lang>
 * @throws {Error} <lang><zh-CN>checked-in operation definition 与 project-runtime contract 失配时抛出固定错误。</zh-CN><en>Throws a fixed error when checked-in operation definitions mismatch the project-runtime contract.</en></lang>
 * @lang zh-CN adapter token 不公开 handler/invoke；getter 只返回 operation ID 与次数，不返回 request、command、value 或 snapshot。
 * @lang en The adapter token exposes no handler or invoke; the getter returns only operation IDs and counts, not requests, commands, values, or snapshots.
 */
export function createLocalResourceBookingAdapter() {
  // <lang><zh-CN>每个 project factory 从 checked-in mockReservations 建立独立 transaction snapshot。</zh-CN><en>Every project factory creates an isolated transaction snapshot from checked-in mockReservations.</en></lang>
  let reservationSnapshot = copyJson(localDataset.mockReservations);

  // <lang><zh-CN>receipt 只保存有限 fingerprint/outcome，不保存页面、身份、日志或异常。</zh-CN><en>Receipts retain only bounded fingerprints and outcomes, not pages, identities, logs, or exceptions.</en></lang>
  const receiptByCommandId = new Map();

  // <lang><zh-CN>execution counts 为六项 operation 建立固定零值，只用于 doctor/测试/source facts。</zh-CN><en>Execution counts establish a fixed zero value for all six operations and serve only doctor, tests, and source facts.</en></lang>
  const executionCounts = Object.fromEntries(
    Object.values(RESOURCE_BOOKING_OPERATION_IDS).map((operationId) => [operationId, 0])
  );

  /**
   * <lang><zh-CN>记录一个 handler invocation。</zh-CN><en>Records one handler invocation.</en></lang>
   * @param {string} operationId <lang><zh-CN>已静态绑定的 operation ID。</zh-CN><en>Statically bound operation ID.</en></lang>
   * @returns {void} <lang><zh-CN>计数完成信号。</zh-CN><en>Completion signal for count update.</en></lang>
   * @lang zh-CN 计数不采集 input、result、duration、identity 或 exception。
   * @lang en Counting collects no input, result, duration, identity, or exception.
   */
  function recordInvocation(operationId) {
    // <lang><zh-CN>operationId 来自当前模块常量，因此可安全更新预建字段。</zh-CN><en>operationId comes from this module's constants, so its pre-created field can be updated safely.</en></lang>
    executionCounts[operationId] += 1;
  }

  /**
   * <lang><zh-CN>执行一项已由 facade 固定的 reservation write。</zh-CN><en>Executes one reservation write already fixed by the facade.</en></lang>
   * @param {string} operationId <lang><zh-CN>固定 write operation ID。</zh-CN><en>Fixed write-operation ID.</en></lang>
   * @param {unknown} command <lang><zh-CN>runtime-isolated command。</zh-CN><en>Runtime-isolated command.</en></lang>
   * @returns {object} <lang><zh-CN>source success/failure outcome。</zh-CN><en>Source success or failure outcome.</en></lang>
   * @lang zh-CN 每次新 command 最多产生一次 snapshot replacement；project profile 同时固定 maxAttempts=1。
   * @lang en Every new command produces at most one snapshot replacement; the project profile also fixes maxAttempts to one.
   */
  function executeWrite(operationId, command) {
    // <lang><zh-CN>malformed command 只返回固定 source failure，不回显字段。</zh-CN><en>A malformed command returns only a fixed source failure and echoes no field.</en></lang>
    if (!isWriteCommand(operationId, command)) {
      return { kind: 'failure', code: 'unknown', retryable: false };
    }

    // <lang><zh-CN>fingerprint 绑定 operation 与精确 command，使跨 operation 重用同 ID 形成 conflict。</zh-CN><en>The fingerprint binds operation and exact command, making reuse of one ID across operations a conflict.</en></lang>
    const fingerprint = JSON.stringify({ operationId, command });
    const existingReceipt = receiptByCommandId.get(command.commandId);
    if (existingReceipt) {
      // <lang><zh-CN>只有相同 operation/command 可 detached replay；不兼容重用不 mutation。</zh-CN><en>Only an identical operation and command may be replayed detached; incompatible reuse performs no mutation.</en></lang>
      return existingReceipt.fingerprint === fingerprint
        ? { kind: 'success', value: copyJson(existingReceipt.outcome) }
        : { kind: 'failure', code: 'conflict', retryable: false };
    }

    // <lang><zh-CN>有界 receipt 满载时保留现状并拒绝新 write。</zh-CN><en>When bounded receipts are full, retain current state and reject the new write.</en></lang>
    if (receiptByCommandId.size >= MAX_COMMAND_RECEIPTS) {
      return { kind: 'failure', code: 'unavailable', retryable: false };
    }

    // <lang><zh-CN>静态分支只覆盖三项已声明 write operation，不做动态 handler lookup。</zh-CN><en>Static branches cover only the three declared write operations and perform no dynamic handler lookup.</en></lang>
    let execution;
    if (operationId === RESOURCE_BOOKING_OPERATION_IDS.createReservation) {
      execution = executeCreate(command, reservationSnapshot);
    } else if (operationId === RESOURCE_BOOKING_OPERATION_IDS.cancelReservation) {
      execution = executeCancel(command, reservationSnapshot);
    } else {
      execution = executeReschedule(command, reservationSnapshot);
    }

    // <lang><zh-CN>所有 canonical outcome 都成为可重放 receipt；只有非 failure outcome 提交 next snapshot。</zh-CN><en>Every canonical outcome becomes a replayable receipt; only a non-failure outcome commits the next snapshot.</en></lang>
    receiptByCommandId.set(command.commandId, {
      fingerprint,
      outcome: copyJson(execution.outcome)
    });
    if (execution.outcome.kind !== 'failure') {
      reservationSnapshot = copyJson(execution.nextSnapshot);
    }

    // <lang><zh-CN>source success 表示 adapter transaction 已确定完成；业务 conflict 仍保留在 canonical value。</zh-CN><en>Source success means the adapter transaction completed deterministically; a business conflict remains in the canonical value.</en></lang>
    return { kind: 'success', value: copyJson(execution.outcome) };
  }

  // <lang><zh-CN>六个 handler 都以静态 key 定义，确保 adapter registry 与 project profile 双向精确。</zh-CN><en>Define all six handlers under static keys, ensuring exact bidirectional correspondence between adapter registry and project profile.</en></lang>
  const adapterDefinition = defineProjectSourceAdapter({
    projectSourceAdapterVersion: '1.0',
    kind: 'project-source-adapter',
    id: RESOURCE_BOOKING_LOCAL_ADAPTER_ID,
    authority: 'local',
    operations: {
      [RESOURCE_BOOKING_OPERATION_IDS.queryCatalog]: (request) => {
        // <lang><zh-CN>先计数真实 handler entry，再以固定 failure 拒绝 malformed request。</zh-CN><en>Count the real handler entry first, then reject a malformed request with a fixed failure.</en></lang>
        recordInvocation(RESOURCE_BOOKING_OPERATION_IDS.queryCatalog);
        if (!isCatalogRequest(request)) {
          return { kind: 'failure', code: 'unknown', retryable: false };
        }

        // <lang><zh-CN>纯 domain 返回 page 或业务 failure，均作为 canonical value 由 facade 隔离。</zh-CN><en>The pure domain returns a page or business failure, each isolated by the facade as a canonical value.</en></lang>
        const catalogPage = createLocalCatalogPage(localDataset, request);
        const catalogValue = catalogPage.kind === 'page'
          ? {
            ...catalogPage,
            filterOptions: copyJson(createLocalCatalogFilterOptions(localDataset))
          }
          : catalogPage;

        // <lang><zh-CN>成功 page 同时交付 adapter-owned filterOptions，使 project consumer 不必直接读取 dataset。</zh-CN><en>A successful page also delivers adapter-owned filterOptions so a project consumer need not read the dataset directly.</en></lang>
        return { kind: 'success', value: catalogValue };
      },
      [RESOURCE_BOOKING_OPERATION_IDS.readResourceDetail]: (request) => {
        // <lang><zh-CN>detail handler 不读取完整 dataset 以外的任何 source。</zh-CN><en>The detail handler reads no source beyond the complete local dataset.</en></lang>
        recordInvocation(RESOURCE_BOOKING_OPERATION_IDS.readResourceDetail);
        if (!isDetailRequest(request)) {
          return { kind: 'failure', code: 'unknown', retryable: false };
        }

        // <lang><zh-CN>resource ID 只交给纯 finite lookup。</zh-CN><en>Supply resource ID only to the pure finite lookup.</en></lang>
        return { kind: 'success', value: createLocalResourceDetail(localDataset, request.resourceId) };
      },
      [RESOURCE_BOOKING_OPERATION_IDS.listReservations]: (request) => {
        // <lang><zh-CN>list 是共享 transaction snapshot 的唯一 read surface。</zh-CN><en>List is the sole read surface of the shared transaction snapshot.</en></lang>
        recordInvocation(RESOURCE_BOOKING_OPERATION_IDS.listReservations);
        if (!isPlainRecord(request) || !hasExactFields(request, [])) {
          return { kind: 'failure', code: 'unknown', retryable: false };
        }

        // <lang><zh-CN>每次返回完整 detached snapshot，不暴露 receipt map 或可写内部数组。</zh-CN><en>Return a complete detached snapshot each time, exposing neither receipt map nor writable internal array.</en></lang>
        return {
          kind: 'success',
          value: {
            contractVersion: BOOKING_DOMAIN_VERSION,
            kind: 'reservations',
            reservations: copyJson(reservationSnapshot),
            reservationCards: createReservationCards(reservationSnapshot)
          }
        };
      },
      [RESOURCE_BOOKING_OPERATION_IDS.createReservation]: (command) => {
        // <lang><zh-CN>create 的 operation authority 已由 facade 固定为 local。</zh-CN><en>The facade has already fixed create-operation authority to local.</en></lang>
        recordInvocation(RESOURCE_BOOKING_OPERATION_IDS.createReservation);
        return executeWrite(RESOURCE_BOOKING_OPERATION_IDS.createReservation, command);
      },
      [RESOURCE_BOOKING_OPERATION_IDS.cancelReservation]: (command) => {
        // <lang><zh-CN>cancel 复用同一 snapshot/receipt transaction。</zh-CN><en>Cancel reuses the same snapshot and receipt transaction.</en></lang>
        recordInvocation(RESOURCE_BOOKING_OPERATION_IDS.cancelReservation);
        return executeWrite(RESOURCE_BOOKING_OPERATION_IDS.cancelReservation, command);
      },
      [RESOURCE_BOOKING_OPERATION_IDS.rescheduleReservation]: (command) => {
        // <lang><zh-CN>reschedule 在同一 handler 内完成 replacement/cancel 原子计算。</zh-CN><en>Reschedule completes atomic replacement and cancellation calculation inside the same handler.</en></lang>
        recordInvocation(RESOURCE_BOOKING_OPERATION_IDS.rescheduleReservation);
        return executeWrite(RESOURCE_BOOKING_OPERATION_IDS.rescheduleReservation, command);
      }
    }
  });

  // <lang><zh-CN>checked-in definition 失败属于开发配置错误；固定异常不回显 diagnostics 或 handler。</zh-CN><en>A checked-in definition failure is a development-configuration error; the fixed exception echoes no diagnostic or handler.</en></lang>
  if (!adapterDefinition.ok) {
    throw new Error('BP local resource-booking adapter failed to initialize.');
  }

  /**
   * <lang><zh-CN>读取仅计数的 adapter execution facts。</zh-CN><en>Reads count-only adapter execution facts.</en></lang>
   * @returns {object[]} <lang><zh-CN>按稳定 operation order 返回的 detached counts。</zh-CN><en>Detached counts in stable operation order.</en></lang>
   * @lang zh-CN facts 不含 request、command、result、reservation、source function 或 receipt。
   * @lang en Facts contain no request, command, result, reservation, source function, or receipt.
   */
  function getExecutionSnapshot() {
    // <lang><zh-CN>逐项投影固定 shape，使调用方 mutation 不影响内部计数。</zh-CN><en>Project a fixed shape per item so caller mutation cannot affect internal counts.</en></lang>
    return Object.values(RESOURCE_BOOKING_OPERATION_IDS).map((operationId) => ({
      operationId,
      invocations: executionCounts[operationId]
    }));
  }

  // <lang><zh-CN>只交付 opaque token 与 bounded getter；不返回 definition、handler、snapshot 或 receipt map。</zh-CN><en>Deliver only the opaque token and bounded getter; return no definition, handler, snapshot, or receipt map.</en></lang>
  return Object.freeze({
    adapter: adapterDefinition.adapter,
    getExecutionSnapshot
  });
}
