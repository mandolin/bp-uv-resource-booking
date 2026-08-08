/**
 * <lang><zh-CN>BP 的 local-first 预约写入 adapter：通过锁定的 Biz async-provider runtime 执行创建、取消和改期命令，并只向页面交付受限 canonical outcome 与 detached reservation snapshot。</zh-CN><en>Local-first reservation-write adapter for the BP: executes create, cancel, and reschedule commands through the locked Biz async-provider runtime and delivers only bounded canonical outcomes and detached reservation snapshots to pages.</en></lang>
 * @lang zh-CN local JSON 与进程内 mock transaction 是唯一 authority；本模块不访问网络、storage、账号、token、支付、真实库存或动态脚本。
 * @lang en Local JSON and an in-process mock transaction are the only authority; this module accesses no network, storage, account, token, payment, live inventory, or dynamic script.
 */

// <lang><zh-CN>使用固定 Biz public runtime 的 write lifecycle，不复制或修改其 provider 实现。</zh-CN><en>Use the write lifecycle from the fixed Biz public runtime and do not copy or modify its provider implementation.</en></lang>
import {
  ASYNC_PROVIDER_CONTRACT_VERSION,
  ASYNC_SOURCE_POLICY_VERSION,
  createAsyncProviderHost
} from '@hia-uview/biz-async-provider-runtime';

// <lang><zh-CN>导入唯一共享 local dataset 入口与纯领域投影；两者均为仓内静态输入而非后端 DTO。</zh-CN><en>Import the sole shared local-dataset entry and pure domain projections; both are in-repository static inputs rather than backend DTOs.</en></lang>
import { localDataset } from '../data/local-dataset.mjs';
import {
  BOOKING_DOMAIN_VERSION,
  createLocalReservation,
  createLocalResourceDetail
} from '../domain/booking-domain.mjs';

/**
 * <lang><zh-CN>本 adapter 唯一 local write source 的稳定标识。</zh-CN><en>Stable identifier of this adapter's sole local write source.</en></lang>
 * @lang zh-CN 标识是受审计的 policy key，不是 URL、文件路径、endpoint 或 source discovery 输入。
 * @lang en The identifier is a reviewed policy key, not a URL, file path, endpoint, or source-discovery input.
 */
const LOCAL_RESERVATION_WRITE_SOURCE_ID = 'bp-resource-booking.local-reservation-write';

/**
 * <lang><zh-CN>单个运行时 mock transaction 最多保留的幂等 command receipt 数量。</zh-CN><en>Maximum idempotent command receipts retained by one runtime mock transaction.</en></lang>
 * @lang zh-CN 有界值避免示例无限累积操作历史；达到上限时显式失败，不静默丢弃仍可重放的 receipt。
 * @lang en The bound prevents the demo from accumulating unbounded operation history; at capacity it fails explicitly rather than silently dropping replayable receipts.
 */
const MAX_COMMAND_RECEIPTS = 32;

/**
 * <lang><zh-CN>创建项目自有、可经 runtime locale 投影的双语文本。</zh-CN><en>Creates project-owned bilingual text that runtime locale may project.</en></lang>
 * @param {string} zhHans <lang><zh-CN>简体中文文本。</zh-CN><en>Simplified-Chinese text.</en></lang>
 * @param {string} en <lang><zh-CN>English text。</zh-CN><en>English text.</en></lang>
 * @returns {object} <lang><zh-CN>新的 `{ zh-Hans, en }` plain-data text。</zh-CN><en>A new `{ zh-Hans, en }` plain-data text.</en></lang>
 * @lang zh-CN 文案不从 provider exception、输入或远端响应派生，避免向页面回显未受控内容。
 * @lang en Copy derives from no provider exception, input, or remote response, preventing uncontrolled content from being echoed to pages.
 */
function createLocalizedText(zhHans, en) {
  // <lang><zh-CN>返回新对象，避免不同 outcome 共享可写 locale 字段。</zh-CN><en>Return a new object, preventing different outcomes from sharing writable locale fields.</en></lang>
  return { 'zh-Hans': zhHans, en };
}

/**
 * <lang><zh-CN>复制本模块已验证为 JSON plain data 的值。</zh-CN><en>Copies a value this module has validated as JSON plain data.</en></lang>
 * @param {unknown} value <lang><zh-CN>待隔离的值。</zh-CN><en>Value to isolate.</en></lang>
 * @returns {unknown} <lang><zh-CN>不共享引用的 JSON 值。</zh-CN><en>A JSON value sharing no reference.</en></lang>
 * @lang zh-CN 此 helper 只处理 runtime 已隔离的 command、静态 JSON 与 adapter outcome；不用于任意页面对象或行为值。
 * @lang en This helper handles only runtime-isolated commands, static JSON, and adapter outcomes; it is not for arbitrary page objects or behavioral values.
 */
function copyJson(value) {
  // <lang><zh-CN>使用 JSON round trip 保持本模块的 plain-data boundary；不接受函数、循环、accessor 或共享状态。</zh-CN><en>Use a JSON round trip to retain this module's plain-data boundary; accept no function, cycle, accessor, or shared state.</en></lang>
  return JSON.parse(JSON.stringify(value));
}

/**
 * <lang><zh-CN>创建一个不回显 command 的 booking failure。</zh-CN><en>Creates a booking failure that does not echo a command.</en></lang>
 * @param {string} code <lang><zh-CN>项目 allowlist 内的稳定 failure code。</zh-CN><en>Stable failure code in the project allowlist.</en></lang>
 * @param {string} zhHans <lang><zh-CN>简体中文可见文案。</zh-CN><en>Visible Simplified-Chinese copy.</en></lang>
 * @param {string} en <lang><zh-CN>可见 English 文案。</zh-CN><en>Visible English copy.</en></lang>
 * @returns {object} <lang><zh-CN>受限 booking failure outcome。</zh-CN><en>A bounded booking-failure outcome.</en></lang>
 * @lang zh-CN failure 不携带 reservation 集合、request、provider、异常或 source 实现细节。
 * @lang en A failure carries no reservation collection, request, provider, exception, or source-implementation detail.
 */
function createBookingFailure(code, zhHans, en) {
  // <lang><zh-CN>固定返回 project-owned canonical shape，供 state 统一投影和恢复。</zh-CN><en>Return the fixed project-owned canonical shape for uniform state projection and recovery.</en></lang>
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
 * <lang><zh-CN>判断候选值是否为有限普通对象。</zh-CN><en>Determines whether a candidate value is a finite ordinary object.</en></lang>
 * @param {unknown} value <lang><zh-CN>候选值。</zh-CN><en>Candidate value.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否可读取有限字段。</zh-CN><en>Whether finite fields may be read.</en></lang>
 * @lang zh-CN Biz runtime 会先隔离 request；本检查仍保持 source 不把未知 container 解释成 command。
 * @lang en The Biz runtime isolates a request first; this check still keeps the source from interpreting an unknown container as a command.
 */
function isPlainRecord(value) {
  // <lang><zh-CN>仅接受非 null、非数组对象，不遍历 prototype 或调用转换方法。</zh-CN><en>Accept only a non-null, non-array object and do not traverse a prototype or call conversion methods.</en></lang>
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * <lang><zh-CN>判断 command 是否精确拥有一个 allowlisted 字段集合。</zh-CN><en>Determines whether a command owns exactly one allowlisted field set.</en></lang>
 * @param {object} command <lang><zh-CN>已确认普通对象的 command。</zh-CN><en>Command already confirmed as an ordinary object.</en></lang>
 * @param {string[]} expectedFields <lang><zh-CN>固定字段名集合。</zh-CN><en>Fixed field-name set.</en></lang>
 * @returns {boolean} <lang><zh-CN>字段集合是否精确匹配。</zh-CN><en>Whether field sets match exactly.</en></lang>
 * @lang zh-CN 额外字段被拒绝，避免 command 意外变成自由 payload 或未来动态配置载体。
 * @lang en Extra fields are rejected, preventing a command from becoming a free payload or future dynamic-configuration carrier.
 */
function hasExactFields(command, expectedFields) {
  // <lang><zh-CN>读取 own enumerable field 名称；command 已是 runtime 复制的 plain data。</zh-CN><en>Read own enumerable field names; command is already runtime-copied plain data.</en></lang>
  const actualFields = Object.keys(command);

  // <lang><zh-CN>先比较数量，避免缺字段或额外字段通过部分匹配。</zh-CN><en>Compare counts first so missing or extra fields cannot pass a partial match.</en></lang>
  if (actualFields.length !== expectedFields.length) {
    // <lang><zh-CN>字段数量不一致时不读取任何业务值。</zh-CN><en>Read no business value when field counts differ.</en></lang>
    return false;
  }

  // <lang><zh-CN>每个实际字段都必须属于固定 allowlist。</zh-CN><en>Every actual field must belong to the fixed allowlist.</en></lang>
  return actualFields.every((field) => expectedFields.includes(field));
}

/**
 * <lang><zh-CN>校验稳定、非敏感的 command ID。</zh-CN><en>Validates a stable, non-sensitive command ID.</en></lang>
 * @param {unknown} commandId <lang><zh-CN>候选 command ID。</zh-CN><en>Candidate command ID.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否可进入有界 receipt map。</zh-CN><en>Whether it may enter the bounded receipt map.</en></lang>
 * @lang zh-CN ID 只用于当前进程内幂等；不是订单号、用户 ID、token 或跨会话持久键。
 * @lang en An ID serves only in-process idempotency; it is not an order number, user ID, token, or cross-session persistence key.
 */
function isValidCommandId(commandId) {
  // <lang><zh-CN>允许明确的小写 ASCII 形式和有限长度，避免控制字符、URL 或任意文本进入 receipt key。</zh-CN><en>Allow an explicit lowercase-ASCII form and bounded length, preventing control characters, URLs, or arbitrary text from entering a receipt key.</en></lang>
  return typeof commandId === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(commandId);
}

/**
 * <lang><zh-CN>校验示例允许的 ISO-like 日期文本。</zh-CN><en>Validates ISO-like date text allowed by the demo.</en></lang>
 * @param {unknown} date <lang><zh-CN>候选日期。</zh-CN><en>Candidate date.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否为有限日期形状。</zh-CN><en>Whether it has the bounded date shape.</en></lang>
 * @lang zh-CN 这不是日历、时区或营业规则验证；页面仍只能提供已审阅的静态日期选择。
 * @lang en This is not calendar, timezone, or operating-rule validation; pages still provide only reviewed static date choices.
 */
function isSupportedDate(date) {
  // <lang><zh-CN>只接受固定十字符 YYYY-MM-DD 形状，不执行 Date 解析或系统时间读取。</zh-CN><en>Accept only the fixed ten-character YYYY-MM-DD shape and perform no Date parsing or system-clock read.</en></lang>
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * <lang><zh-CN>校验页面已声明的有限预约时段文本。</zh-CN><en>Validates a finite booking-slot text declared by a page.</en></lang>
 * @param {unknown} time <lang><zh-CN>候选时段。</zh-CN><en>Candidate slot.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否为受限时间形状。</zh-CN><en>Whether it has the bounded time shape.</en></lang>
 * @lang zh-CN 资源可用性仍由 local domain 根据其静态 allowlist 判定；本检查只拒绝任意 payload。
 * @lang en Resource availability remains determined by the local domain against its static allowlist; this check only rejects arbitrary payload.
 */
function isSupportedTime(time) {
  // <lang><zh-CN>只接受 HH:MM ASCII 形状，不将其解释为时区、时间戳或 cron 表达式。</zh-CN><en>Accept only the HH:MM ASCII shape and do not interpret it as timezone, timestamp, or cron expression.</en></lang>
  return typeof time === 'string' && /^\d{2}:\d{2}$/.test(time);
}

/**
 * <lang><zh-CN>校验一个 local booking write command 的完整 allowlist 形状。</zh-CN><en>Validates the complete allowlisted shape of one local booking-write command.</en></lang>
 * @param {unknown} command <lang><zh-CN>runtime 已隔离的候选 command。</zh-CN><en>Candidate command isolated by the runtime.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否是 create、cancel 或 reschedule 命令。</zh-CN><en>Whether it is a create, cancel, or reschedule command.</en></lang>
 * @lang zh-CN command 不支持 patch、自由 metadata、identity、credential、价格、支付或远端 transport 字段。
 * @lang en A command supports no patch, free metadata, identity, credential, price, payment, or remote-transport field.
 */
function isSupportedWriteCommand(command) {
  // <lang><zh-CN>未知容器不读取字段，直接拒绝。</zh-CN><en>Read no field from an unknown container and reject it directly.</en></lang>
  if (!isPlainRecord(command) || !isValidCommandId(command.commandId)) {
    // <lang><zh-CN>command ID 不合格时不再解释 operation 或其他值。</zh-CN><en>Do not interpret operation or other values when the command ID is invalid.</en></lang>
    return false;
  }

  // <lang><zh-CN>创建预约只允许有限 resource/date/time 字段。</zh-CN><en>A booking creation allows only finite resource/date/time fields.</en></lang>
  if (command.operation === 'create') {
    // <lang><zh-CN>字段和基础 primitive 都必须精确匹配，资源细节由 domain 再确认。</zh-CN><en>Both fields and primitive basics must match exactly; the domain confirms resource detail later.</en></lang>
    return hasExactFields(command, ['commandId', 'operation', 'resourceId', 'date', 'time'])
      && typeof command.resourceId === 'string'
      && isSupportedDate(command.date)
      && isSupportedTime(command.time);
  }

  // <lang><zh-CN>取消只允许当前 runtime 已呈现过的有限 reservation ID。</zh-CN><en>A cancellation permits only the finite reservation ID previously presented in current runtime.</en></lang>
  if (command.operation === 'cancel') {
    // <lang><zh-CN>只校验 opaque ID 的形状，不从字符串推导资源、用户或外部关系。</zh-CN><en>Validate only the opaque ID shape and derive no resource, user, or external relation from the string.</en></lang>
    return hasExactFields(command, ['commandId', 'operation', 'reservationId'])
      && typeof command.reservationId === 'string'
      && /^reservation-demo-\d{3}$/.test(command.reservationId);
  }

  // <lang><zh-CN>改期复用同一资源，只允许 reservation ID 与新的有限 date/time。</zh-CN><en>A reschedule retains the same resource and allows only a reservation ID plus new finite date/time.</en></lang>
  return command.operation === 'reschedule'
    && hasExactFields(command, ['commandId', 'operation', 'reservationId', 'date', 'time'])
    && typeof command.reservationId === 'string'
    && /^reservation-demo-\d{3}$/.test(command.reservationId)
    && isSupportedDate(command.date)
    && isSupportedTime(command.time);
}

/**
 * <lang><zh-CN>创建 local booking write provider declaration。</zh-CN><en>Creates the local booking-write provider declaration.</en></lang>
 * @returns {object} <lang><zh-CN>版本化 write-provider declaration。</zh-CN><en>A versioned write-provider declaration.</en></lang>
 * @lang zh-CN declaration 不携带 URL、HTTP method、token、身份、storage key、动态 source 或业务自由 payload。
 * @lang en The declaration carries no URL, HTTP method, token, identity, storage key, dynamic source, or free business payload.
 */
function createLocalWriteDeclaration() {
  // <lang><zh-CN>write retry 固定一，要求每次重新提交都由页面发起新的明确 command。</zh-CN><en>Fix write retry at one, requiring every resubmission to be a new explicit command initiated by a page.</en></lang>
  return {
    asyncProviderContractVersion: ASYNC_PROVIDER_CONTRACT_VERSION,
    providerId: 'bp-resource-booking.local-write',
    portId: 'resource-booking-write',
    owner: 'bp-uv-resource-booking',
    kind: 'write',
    contract: { id: 'bp-resource-booking.reservation-write', version: BOOKING_DOMAIN_VERSION },
    execution: 'injected-async',
    credential: { mode: 'none' },
    cancellation: 'explicit-handle',
    retry: { maxAttempts: 1 }
  };
}

/**
 * <lang><zh-CN>创建满足 Biz runtime 完整 source-policy 校验的 local policy。</zh-CN><en>Creates a local policy satisfying complete Biz-runtime source-policy validation.</en></lang>
 * @returns {object} <lang><zh-CN>固定 local source policy。</zh-CN><en>A fixed local source policy.</en></lang>
 * @lang zh-CN runtime 的 schema 同时要求 read sequence 与 write authority；当前 declaration 是 write，read sequence 永不会被该 host 调用。
 * @lang en The runtime schema requires both a read sequence and write authority; the current declaration is write, so this host never calls its read sequence.
 */
function createLocalWriteSourcePolicy() {
  // <lang><zh-CN>使用同一 local source 完整满足 exact source-map policy，不声明任何 remote/virtual fallback。</zh-CN><en>Use the same local source to satisfy the exact source-map policy and declare no remote/virtual fallback.</en></lang>
  return {
    sourcePolicyVersion: ASYNC_SOURCE_POLICY_VERSION,
    mode: 'local',
    readSourceIds: [LOCAL_RESERVATION_WRITE_SOURCE_ID],
    writeSourceId: LOCAL_RESERVATION_WRITE_SOURCE_ID
  };
}

/**
 * <lang><zh-CN>从当前 snapshot 生成下一个仅示例用 ordinal。</zh-CN><en>Creates the next demo-only ordinal from the current snapshot.</en></lang>
 * @param {object[]} reservationSnapshot <lang><zh-CN>transaction 私有预约 snapshot。</zh-CN><en>Transaction-private reservation snapshot.</en></lang>
 * @returns {number} <lang><zh-CN>下一个临时记录序号。</zh-CN><en>Next temporary-record ordinal.</en></lang>
 * @lang zh-CN ordinal 只依赖当前内存长度，不读取真实时间、随机数、账号或持久化计数器。
 * @lang en The ordinal depends only on current in-memory length and reads no real clock, random value, account, or persistent counter.
 */
function createNextReservationOrdinal(reservationSnapshot) {
  // <lang><zh-CN>已取消记录仍保留在 snapshot，因此 append ID 不会复用一个可追溯的历史记录。</zh-CN><en>Cancelled records remain in the snapshot, so an append ID does not reuse a traceable historical record.</en></lang>
  return reservationSnapshot.length + 1;
}

/**
 * <lang><zh-CN>执行 create command，并在成功时原子替换私有 snapshot。</zh-CN><en>Executes a create command and atomically replaces the private snapshot on success.</en></lang>
 * @param {object} command <lang><zh-CN>已验证 create command。</zh-CN><en>Validated create command.</en></lang>
 * @param {object[]} reservationSnapshot <lang><zh-CN>当前 transaction snapshot。</zh-CN><en>Current transaction snapshot.</en></lang>
 * @returns {object} <lang><zh-CN>domain outcome 和下一个 snapshot。</zh-CN><en>Domain outcome and next snapshot.</en></lang>
 * @lang zh-CN 失败不修改 snapshot；调用方只可在 confirmed outcome 后提交 replacement。
 * @lang en Failure modifies no snapshot; a caller may commit a replacement only after a confirmed outcome.
 */
function executeCreate(command, reservationSnapshot) {
  // <lang><zh-CN>从静态 dataset 查找唯一资源，未知 ID 保持 domain 已定义的受限失败。</zh-CN><en>Find the sole resource in static dataset; an unknown ID retains the bounded failure defined by the domain.</en></lang>
  const detail = createLocalResourceDetail(localDataset, command.resourceId);

  // <lang><zh-CN>详情失败时不计算 ordinal 或触碰私有 snapshot。</zh-CN><en>On detail failure, calculate no ordinal and touch no private snapshot.</en></lang>
  if (detail.kind === 'failure') {
    // <lang><zh-CN>返回 domain failure，使 adapter 保持同一双语/无回显语义。</zh-CN><en>Return the domain failure so the adapter retains unified bilingual no-echo semantics.</en></lang>
    return { outcome: detail, nextSnapshot: reservationSnapshot };
  }

  // <lang><zh-CN>根据当前 snapshot 创建临时 ordinal，而非接受页面提供的订单或序号。</zh-CN><en>Create the temporary ordinal from current snapshot rather than accepting a page-supplied order or sequence.</en></lang>
  const ordinal = createNextReservationOrdinal(reservationSnapshot);

  // <lang><zh-CN>纯 domain 仅接受该资源已声明的 slot，产生 confirmed 或 conflict。</zh-CN><en>The pure domain accepts only a slot declared by this resource and yields confirmed or conflict.</en></lang>
  const outcome = createLocalReservation(detail, command.date, command.time, ordinal);

  // <lang><zh-CN>slot 冲突时保留原 snapshot，避免 partial create。</zh-CN><en>On slot conflict retain original snapshot, avoiding a partial create.</en></lang>
  if (outcome.kind === 'failure') {
    // <lang><zh-CN>返回受限 domain failure，不创建 receipt 以外的副作用。</zh-CN><en>Return the bounded domain failure and create no side effect apart from a later receipt.</en></lang>
    return { outcome, nextSnapshot: reservationSnapshot };
  }

  // <lang><zh-CN>成功时以新数组 append isolated record；旧 snapshot 不被原地改写。</zh-CN><en>On success append an isolated record in a new array; the old snapshot is not mutated in place.</en></lang>
  const nextSnapshot = [...reservationSnapshot, copyJson(outcome.reservation)];

  // <lang><zh-CN>canonical result 同时携带新 snapshot，供页面 state 只在确定成功后替换。</zh-CN><en>The canonical result carries the new snapshot so page state replaces only after definite success.</en></lang>
  return {
    outcome: {
      ...outcome,
      reservation: copyJson(outcome.reservation),
      reservations: copyJson(nextSnapshot)
    },
    nextSnapshot
  };
}

/**
 * <lang><zh-CN>执行 cancel command，并保留可见的取消历史。</zh-CN><en>Executes a cancel command and retains visible cancellation history.</en></lang>
 * @param {object} command <lang><zh-CN>已验证 cancel command。</zh-CN><en>Validated cancel command.</en></lang>
 * @param {object[]} reservationSnapshot <lang><zh-CN>当前 transaction snapshot。</zh-CN><en>Current transaction snapshot.</en></lang>
 * @returns {object} <lang><zh-CN>domain outcome 和下一个 snapshot。</zh-CN><en>Domain outcome and next snapshot.</en></lang>
 * @lang zh-CN 取消不删除记录、不释放真实库存、不退款，也不写入任何持久层。
 * @lang en Cancellation deletes no record, releases no live inventory, refunds nothing, and writes no persistence layer.
 */
function executeCancel(command, reservationSnapshot) {
  // <lang><zh-CN>只查找当前 confirmed record；已取消或未知记录不可再次取消。</zh-CN><en>Find only a currently confirmed record; a cancelled or unknown record cannot be cancelled again.</en></lang>
  const reservationIndex = reservationSnapshot.findIndex((reservation) => reservation.id === command.reservationId && reservation.status === 'confirmed');

  // <lang><zh-CN>未找到时明确冲突且保留原 snapshot。</zh-CN><en>When missing, produce explicit conflict and retain the original snapshot.</en></lang>
  if (reservationIndex === -1) {
    // <lang><zh-CN>不回显 supplied ID 或其他记录。</zh-CN><en>Echo neither the supplied ID nor another record.</en></lang>
    return {
      outcome: createBookingFailure('conflict', '该示例预约已不可取消。', 'This demo reservation can no longer be cancelled.'),
      nextSnapshot: reservationSnapshot
    };
  }

  // <lang><zh-CN>复制目标记录并将唯一有限状态改为 cancelled。</zh-CN><en>Copy the target record and change its sole finite status to cancelled.</en></lang>
  const cancelledReservation = { ...reservationSnapshot[reservationIndex], status: 'cancelled' };

  // <lang><zh-CN>使用 map 建立新 snapshot，防止 source 直接改写旧数组或记录。</zh-CN><en>Use map to create a new snapshot, preventing source from mutating old array or record directly.</en></lang>
  const nextSnapshot = reservationSnapshot.map((reservation, index) => index === reservationIndex ? cancelledReservation : copyJson(reservation));

  // <lang><zh-CN>返回 detached record 和完整 detached snapshot，不公开 transaction 内部引用。</zh-CN><en>Return detached record and complete detached snapshot without exposing transaction-internal references.</en></lang>
  return {
    outcome: {
      contractVersion: BOOKING_DOMAIN_VERSION,
      kind: 'cancelled',
      reservation: copyJson(cancelledReservation),
      reservations: copyJson(nextSnapshot)
    },
    nextSnapshot
  };
}

/**
 * <lang><zh-CN>执行“取消旧预约后创建新预约”的受控改期 command。</zh-CN><en>Executes a controlled reschedule command that cancels an old reservation then creates a new one.</en></lang>
 * @param {object} command <lang><zh-CN>已验证 reschedule command。</zh-CN><en>Validated reschedule command.</en></lang>
 * @param {object[]} reservationSnapshot <lang><zh-CN>当前 transaction snapshot。</zh-CN><en>Current transaction snapshot.</en></lang>
 * @returns {object} <lang><zh-CN>domain outcome 和下一个 snapshot。</zh-CN><en>Domain outcome and next snapshot.</en></lang>
 * @lang zh-CN 改期不覆盖旧 record；若新时段不可用，旧 record 保持 confirmed，避免伪造半完成取消。
 * @lang en A reschedule does not overwrite the old record; if new slot is unavailable, old record stays confirmed, avoiding a fabricated half-complete cancellation.
 */
function executeReschedule(command, reservationSnapshot) {
  // <lang><zh-CN>先定位唯一可改期的 confirmed record；不接受已取消或未知历史。</zh-CN><en>Locate the sole confirmed record eligible for reschedule first; accept no cancelled or unknown history.</en></lang>
  const reservationIndex = reservationSnapshot.findIndex((reservation) => reservation.id === command.reservationId && reservation.status === 'confirmed');

  // <lang><zh-CN>缺少可改期记录时不进入 create 分支，也不改变 snapshot。</zh-CN><en>When no record is eligible, do not enter create branch and do not change snapshot.</en></lang>
  if (reservationIndex === -1) {
    // <lang><zh-CN>仅返回固定可恢复冲突文案。</zh-CN><en>Return only fixed recoverable conflict copy.</en></lang>
    return {
      outcome: createBookingFailure('conflict', '该示例预约已不可改期。', 'This demo reservation can no longer be rescheduled.'),
      nextSnapshot: reservationSnapshot
    };
  }

  // <lang><zh-CN>读取旧记录资源，改期不允许在同一 command 中偷偷换资源。</zh-CN><en>Read resource of old record; a reschedule cannot secretly change resource in the same command.</en></lang>
  const currentReservation = reservationSnapshot[reservationIndex];

  // <lang><zh-CN>重用 create 语义先验证新 slot；临时 command 不会进入 receipt map。</zh-CN><en>Reuse create semantics to validate new slot first; the temporary command never enters receipt map.</en></lang>
  const createResult = executeCreate({
    commandId: command.commandId,
    operation: 'create',
    resourceId: currentReservation.resourceId,
    date: command.date,
    time: command.time
  }, reservationSnapshot);

  // <lang><zh-CN>新预约失败时完整回退到原 snapshot，旧预约仍 confirmed。</zh-CN><en>When new reservation fails, fully retain original snapshot and leave old reservation confirmed.</en></lang>
  if (createResult.outcome.kind === 'failure') {
    // <lang><zh-CN>不复用 createResult 的 nextSnapshot，确保尚未 append 或取消。</zh-CN><en>Do not reuse createResult nextSnapshot, ensuring no append or cancellation occurred.</en></lang>
    return { outcome: createResult.outcome, nextSnapshot: reservationSnapshot };
  }

  // <lang><zh-CN>先由 createResult 提供新的 append snapshot，再在其中精确取消旧 ID，实现同 command 内原子 replacement。</zh-CN><en>Start with the append snapshot from createResult, then cancel exact old ID within it to implement atomic replacement in one command.</en></lang>
  const nextSnapshot = createResult.nextSnapshot.map((reservation) => reservation.id === currentReservation.id
    ? { ...reservation, status: 'cancelled' }
    : copyJson(reservation));

  // <lang><zh-CN>取得 detached new/old records，供调用方显示明确的“取消加创建”结果。</zh-CN><en>Take detached new/old records so callers can display an explicit “cancel plus create” result.</en></lang>
  const nextReservation = nextSnapshot.find((reservation) => reservation.id === createResult.outcome.reservation.id);
  const cancelledReservation = nextSnapshot.find((reservation) => reservation.id === currentReservation.id);

  // <lang><zh-CN>两个记录均应由上方受控转换产生；若未来修改破坏这一不变量，返回 bounded failure 且不提交 nextSnapshot。</zh-CN><en>Both records must arise from controlled transformation above; if a future edit breaks this invariant, return bounded failure and do not commit nextSnapshot.</en></lang>
  if (!nextReservation || !cancelledReservation) {
    // <lang><zh-CN>阻断内部不变量失败，不向页面暴露中间 snapshot。</zh-CN><en>Block an internal-invariant failure without exposing an intermediate snapshot to pages.</en></lang>
    return {
      outcome: createBookingFailure('provider-unavailable', '示例预约状态暂时不可用，请查看当前预约列表。', 'Demo reservation state is temporarily unavailable; review the current booking list.'),
      nextSnapshot: reservationSnapshot
    };
  }

  // <lang><zh-CN>返回显式 rescheduled outcome；旧记录保留 cancelled，新记录保持 confirmed。</zh-CN><en>Return explicit rescheduled outcome; old record remains cancelled and new record remains confirmed.</en></lang>
  return {
    outcome: {
      contractVersion: BOOKING_DOMAIN_VERSION,
      kind: 'rescheduled',
      cancelledReservation: copyJson(cancelledReservation),
      reservation: copyJson(nextReservation),
      reservations: copyJson(nextSnapshot)
    },
    nextSnapshot
  };
}

/**
 * <lang><zh-CN>在 private transaction 内执行一个已验证的 write command。</zh-CN><en>Executes one validated write command inside a private transaction.</en></lang>
 * @param {object} command <lang><zh-CN>已验证 command。</zh-CN><en>Validated command.</en></lang>
 * @param {object[]} reservationSnapshot <lang><zh-CN>当前 snapshot。</zh-CN><en>Current snapshot.</en></lang>
 * @returns {object} <lang><zh-CN>outcome 与候选 next snapshot。</zh-CN><en>Outcome and candidate next snapshot.</en></lang>
 * @lang zh-CN switch 只覆盖静态 allowlist；不支持动态 handler、eval、import 或 property dispatch。
 * @lang en The switch covers only a static allowlist; it supports no dynamic handler, eval, import, or property dispatch.
 */
function executeWriteCommand(command, reservationSnapshot) {
  // <lang><zh-CN>创建命令交给唯一 create helper。</zh-CN><en>Delegate a create command to the sole create helper.</en></lang>
  if (command.operation === 'create') {
    // <lang><zh-CN>保留 create 的 snapshot ownership。</zh-CN><en>Preserve create snapshot ownership.</en></lang>
    return executeCreate(command, reservationSnapshot);
  }

  // <lang><zh-CN>取消命令交给唯一 cancel helper。</zh-CN><en>Delegate a cancel command to the sole cancel helper.</en></lang>
  if (command.operation === 'cancel') {
    // <lang><zh-CN>保留 cancel 的历史状态语义。</zh-CN><en>Preserve cancellation-history semantics.</en></lang>
    return executeCancel(command, reservationSnapshot);
  }

  // <lang><zh-CN>剩余已验证 operation 只能为 reschedule。</zh-CN><en>The remaining validated operation can only be reschedule.</en></lang>
  return executeReschedule(command, reservationSnapshot);
}

/**
 * <lang><zh-CN>创建唯一 local reservation write source provider。</zh-CN><en>Creates the sole local reservation-write source provider.</en></lang>
 * @returns {object} <lang><zh-CN>受限 local authority/invoke provider。</zh-CN><en>A bounded local authority/invoke provider.</en></lang>
 * @lang zh-CN provider 封装 snapshot 与 receipt map；页面 state 无法直接写入这两个私有 transaction 记录。
 * @lang en The provider encapsulates snapshot and receipt map; page state cannot directly write either private transaction record.
 */
function createLocalReservationWriteSourceProvider() {
  // <lang><zh-CN>从 checked-in mock 复制起始 snapshot，避免写入导入的 JSON module 对象。</zh-CN><en>Copy initial snapshot from checked-in mock, avoiding writes to the imported JSON-module object.</en></lang>
  let reservationSnapshot = copyJson(localDataset.mockReservations);

  // <lang><zh-CN>receipt map 只保存有限 command fingerprint/outcome，不保存页面、身份、请求日志或 exception。</zh-CN><en>The receipt map retains only finite command fingerprint/outcome, no page, identity, request log, or exception.</en></lang>
  const receiptByCommandId = new Map();

  // <lang><zh-CN>返回 runtime 精确允许的 authority/invoke 双字段对象。</zh-CN><en>Return the exact authority/invoke two-field object allowed by runtime.</en></lang>
  return {
    authority: 'local',
    /**
     * <lang><zh-CN>执行一次 runtime 已隔离的 local booking write。</zh-CN><en>Executes one runtime-isolated local booking write.</en></lang>
     * @param {object} command <lang><zh-CN>已复制的 adapter-private command。</zh-CN><en>Copied adapter-private command.</en></lang>
     * @returns {Promise<object>} <lang><zh-CN>受限 source terminal outcome。</zh-CN><en>A bounded source terminal outcome.</en></lang>
     * @lang zh-CN invoke 不访问网络、storage 或 Vue reactivity；唯一副作用是 private snapshot/receipt 的受控 replacement。
     * @lang en Invoke accesses no network, storage, or Vue reactivity; its only side effect is controlled replacement of private snapshot/receipt.
     */
    invoke(command) {
      // <lang><zh-CN>未知 command 在读入任何业务字段前受限为 unknown runtime failure。</zh-CN><en>Constrain an unknown command to unknown runtime failure before reading any business field.</en></lang>
      if (!isSupportedWriteCommand(command)) {
        // <lang><zh-CN>不回显 command，避免 source boundary 成为输入诊断接口。</zh-CN><en>Do not echo command, preventing source boundary from becoming an input-diagnostics interface.</en></lang>
        return Promise.resolve({ kind: 'failure', code: 'unknown', retryable: false });
      }

      // <lang><zh-CN>将固定 allowlisted command 序列化为 idempotency fingerprint；此时不含行为对象或自由字段。</zh-CN><en>Serialize the fixed allowlisted command as idempotency fingerprint; it contains no behavioral object or free field now.</en></lang>
      const fingerprint = JSON.stringify(command);

      // <lang><zh-CN>查询同一 command ID 的既有 receipt，避免重复 invocation 产生第二次 mutation。</zh-CN><en>Look up existing receipt for same command ID, preventing a repeated invocation from producing a second mutation.</en></lang>
      const existingReceipt = receiptByCommandId.get(command.commandId);

      // <lang><zh-CN>同 ID 已出现时仅允许完全相同 command 的 detached replay。</zh-CN><en>When same ID exists, permit only an identical command's detached replay.</en></lang>
      if (existingReceipt) {
        // <lang><zh-CN>不同 fingerprint 明确产生 conflict，不应用现有或新 snapshot。</zh-CN><en>A different fingerprint explicitly yields conflict and applies neither existing nor new snapshot.</en></lang>
        if (existingReceipt.fingerprint !== fingerprint) {
          // <lang><zh-CN>source failure 不泄漏冲突命令的 ID 或字段。</zh-CN><en>The source failure leaks neither conflicting command ID nor fields.</en></lang>
          return Promise.resolve({ kind: 'failure', code: 'conflict', retryable: false });
        }

        // <lang><zh-CN>返回复制 receipt outcome，防止调用方改写后污染将来的 idempotent replay。</zh-CN><en>Return copied receipt outcome, preventing caller mutation from contaminating a future idempotent replay.</en></lang>
        return Promise.resolve({ kind: 'success', value: copyJson(existingReceipt.outcome) });
      }

      // <lang><zh-CN>达到上限时拒绝新的 command，保留已有 receipt 的可重放语义。</zh-CN><en>At capacity reject a new command, retaining replay semantics of existing receipts.</en></lang>
      if (receiptByCommandId.size >= MAX_COMMAND_RECEIPTS) {
        // <lang><zh-CN>不驱逐最旧 receipt，避免同一 command ID 的 retry 被误解释为新写入。</zh-CN><en>Do not evict oldest receipt, preventing a retry of same command ID from being misinterpreted as a new write.</en></lang>
        return Promise.resolve({ kind: 'failure', code: 'unavailable', retryable: false });
      }

      // <lang><zh-CN>在当前私有 snapshot 上执行唯一 allowlisted command；结果还未提交。</zh-CN><en>Execute the sole allowlisted command against current private snapshot; result is not committed yet.</en></lang>
      const execution = executeWriteCommand(command, reservationSnapshot);

      // <lang><zh-CN>将所有 canonical outcome（包括业务 conflict）写为 idempotent receipt，确保同 command retry 不改变语义。</zh-CN><en>Store every canonical outcome, including business conflict, as idempotent receipt so retry of same command changes no semantics.</en></lang>
      receiptByCommandId.set(command.commandId, {
        fingerprint,
        outcome: copyJson(execution.outcome)
      });

      // <lang><zh-CN>只有非 failure outcome 才提交新的 private snapshot；失败保持原状态。</zh-CN><en>Commit a new private snapshot only for non-failure outcome; failure preserves old state.</en></lang>
      if (execution.outcome.kind !== 'failure') {
        // <lang><zh-CN>复制候选 snapshot 后替换私有引用，阻断任何外部引用写回。</zh-CN><en>Replace private reference after copying candidate snapshot, blocking any external reference from writing back.</en></lang>
        reservationSnapshot = copyJson(execution.nextSnapshot);
      }

      // <lang><zh-CN>以 source success 表示 adapter 已完成；业务 conflict 仍保留在 canonical value 内由页面可见处理。</zh-CN><en>Use source success to show adapter completed; business conflict remains in canonical value for page-visible handling.</en></lang>
      return Promise.resolve({ kind: 'success', value: copyJson(execution.outcome) });
    }
  };
}

/**
 * <lang><zh-CN>把 Biz runtime terminal envelope 映射为项目 booking outcome。</zh-CN><en>Maps a Biz-runtime terminal envelope to a project booking outcome.</en></lang>
 * @param {object} envelope <lang><zh-CN>async runtime 产生的受限 envelope。</zh-CN><en>Bounded envelope produced by async runtime.</en></lang>
 * @returns {object} <lang><zh-CN>canonical booking outcome 或受限 provider failure。</zh-CN><en>A canonical booking outcome or bounded provider failure.</en></lang>
 * @lang zh-CN runtime source/exception/request/message 不跨越 adapter；页面只接收项目自有双语失败和成功 snapshot。
 * @lang en Runtime source/exception/request/message crosses no adapter; pages receive only project-owned bilingual failure and successful snapshot.
 */
function mapWriteEnvelope(envelope) {
  // <lang><zh-CN>source 成功时 value 已由 runtime 隔离，再复制一次使 caller 与 receipt 无共享引用。</zh-CN><en>On source success value is already runtime-isolated; copy once more so caller and receipt share no reference.</en></lang>
  if (envelope.kind === 'success') {
    // <lang><zh-CN>返回 private adapter 已定义的 canonical outcome。</zh-CN><en>Return canonical outcome defined by private adapter.</en></lang>
    return copyJson(envelope.value);
  }

  // <lang><zh-CN>write 开始前明确取消时可说明未提交；不把任何其他失败伪装为已回退。</zh-CN><en>When a write is definitely cancelled before start, say it was not submitted; do not portray any other failure as rolled back.</en></lang>
  if (envelope.code === 'cancelled') {
    // <lang><zh-CN>固定文案不引用 command 或 source。</zh-CN><en>Fixed copy refers to no command or source.</en></lang>
    return createBookingFailure('cancelled', '本次示例预约操作未提交。', 'This demo booking operation was not submitted.');
  }

  // <lang><zh-CN>同一 command ID 的不兼容重用由 runtime 标记为 conflict；adapter 将其保留为用户可恢复的业务冲突。</zh-CN><en>An incompatible reuse of same command ID is marked conflict by runtime; adapter retains it as user-recoverable business conflict.</en></lang>
  if (envelope.code === 'conflict') {
    // <lang><zh-CN>固定文案不回显冲突 command 或已存在 receipt。</zh-CN><en>Fixed copy echoes neither conflicting command nor existing receipt.</en></lang>
    return createBookingFailure('conflict', '本次示例预约操作与当前状态冲突，请查看预约列表后重试。', 'This demo booking operation conflicts with current state; review the booking list and try again.');
  }

  // <lang><zh-CN>timeout/unknown 后状态可能不确定，要求用户查看当前列表而不自动重试或本地补偿。</zh-CN><en>After timeout/unknown state may be uncertain, requiring user to review current list rather than automatic retry or local compensation.</en></lang>
  if (envelope.code === 'timeout' || envelope.code === 'unknown') {
    // <lang><zh-CN>显式披露不确定性，避免错误承诺 mutation 没有发生。</zh-CN><en>Explicitly disclose uncertainty, avoiding false assurance that mutation did not occur.</en></lang>
    return createBookingFailure('provider-unavailable', '示例预约结果暂时无法确认，请查看当前预约列表。', 'The demo booking result cannot be confirmed yet; review the current booking list.');
  }

  // <lang><zh-CN>其余受限 runtime failure 同样不泄漏内部 code/message，统一为可恢复 provider failure。</zh-CN><en>Other bounded runtime failures likewise leak no internal code/message and become a recoverable provider failure.</en></lang>
  return createBookingFailure('provider-unavailable', '示例预约暂时不可用，请稍后重试。', 'Demo booking is temporarily unavailable. Please try again.');
}

/**
 * <lang><zh-CN>创建一个独立 local reservation write client。</zh-CN><en>Creates an independent local reservation-write client.</en></lang>
 * @returns {object} <lang><zh-CN>带 `start(command)` 与仅计数 observation 的 client。</zh-CN><en>A client with `start(command)` and count-only observation.</en></lang>
 * @throws {Error} <lang><zh-CN>checked-in declaration/policy/source 失配时抛出。</zh-CN><en>Thrown when checked-in declaration/policy/source mismatch.</en></lang>
 * @lang zh-CN 工厂允许 Node fixture 获得隔离 transaction；生产模块只创建一个进程内 client。
 * @lang en The factory lets Node fixtures obtain isolated transactions; production module creates one in-process client only.
 */
export function createLocalReservationWriteClient() {
  // <lang><zh-CN>组装三个固定 checked-in 输入，不读取环境配置或发现其他 source。</zh-CN><en>Assemble three fixed checked-in inputs and read no environment configuration or discovered source.</en></lang>
  const initialization = createAsyncProviderHost({
    declaration: createLocalWriteDeclaration(),
    sourcePolicy: createLocalWriteSourcePolicy(),
    sourceProviders: { [LOCAL_RESERVATION_WRITE_SOURCE_ID]: createLocalReservationWriteSourceProvider() },
    timeoutMs: 5000
  });

  // <lang><zh-CN>初始化不通过时阻断模块，不向页面暴露 provider diagnostics 或 source map。</zh-CN><en>Block module on failed initialization and expose no provider diagnostic or source map to pages.</en></lang>
  if (!initialization.ok) {
    // <lang><zh-CN>错误文本固定且不含私有配置细节。</zh-CN><en>Error copy is fixed and contains no private configuration detail.</en></lang>
    throw new Error('BP local reservation write provider failed to initialize.');
  }

  // <lang><zh-CN>返回仅需的两个 surface，禁止 consumer 直接访问 host/provider/source closure。</zh-CN><en>Return only two required surfaces and prohibit consumer direct access to host/provider/source closure.</en></lang>
  return Object.freeze({
    /**
     * <lang><zh-CN>启动一次有限 local booking write。</zh-CN><en>Starts one finite local booking write.</en></lang>
     * @param {object} command <lang><zh-CN>页面 state 构造的有限 plain-data command。</zh-CN><en>Finite plain-data command constructed by page state.</en></lang>
     * @returns {object} <lang><zh-CN>mapped Promise 与 explicit cancel handle。</zh-CN><en>A mapped Promise and explicit cancel handle.</en></lang>
     * @lang zh-CN 此函数不直接修改 Vue state；调用方只可在 resolved canonical outcome 后采用 detached snapshot。
     * @lang en This function modifies no Vue state directly; a caller may adopt detached snapshot only after resolved canonical outcome.
     */
    start(command) {
      // <lang><zh-CN>把 command 立即交给 Biz host 隔离；runtime 决定固定 authority 与 cancellation lifecycle。</zh-CN><en>Hand command to Biz host immediately for isolation; runtime decides fixed authority and cancellation lifecycle.</en></lang>
      const invocation = initialization.host.start(command);

      // <lang><zh-CN>包装 Promise 只映射 terminal envelope，不改写 runtime cancel 语义。</zh-CN><en>Wrap promise only to map terminal envelope and do not alter runtime cancel semantics.</en></lang>
      return Object.freeze({ promise: invocation.promise.then(mapWriteEnvelope), cancel: invocation.cancel });
    },
    /**
     * <lang><zh-CN>读取仅计数的开发/测试 observation。</zh-CN><en>Reads count-only development/test observation.</en></lang>
     * @returns {object} <lang><zh-CN>隔离 observation copy。</zh-CN><en>An isolated observation copy.</en></lang>
     * @lang zh-CN observation 不用于页面、用户画像、遥测或业务结果判断。
     * @lang en Observation is not used for page, user profiling, telemetry, or business-outcome judgment.
     */
    getObservation() {
      // <lang><zh-CN>runtime 返回副本，本 client 不附加 command、结果或身份数据。</zh-CN><en>Runtime returns a copy and this client adds no command, result, or identity data.</en></lang>
      return initialization.host.getObservation();
    }
  });
}

/**
 * <lang><zh-CN>生产 BP 进程唯一共享的 local reservation write client。</zh-CN><en>The sole shared local reservation-write client of the production BP process.</en></lang>
 * @lang zh-CN client 不持久化；应用刷新或模块重载后从 checked-in mock reservations 重新开始。
 * @lang en Client persists nothing; app refresh or module reload restarts from checked-in mock reservations.
 */
const localReservationWriteClient = createLocalReservationWriteClient();

/**
 * <lang><zh-CN>启动生产 BP 的一次 local reservation write。</zh-CN><en>Starts one local reservation write for the production BP.</en></lang>
 * @param {object} command <lang><zh-CN>由受控 state 创建的有限 command。</zh-CN><en>Finite command created by controlled state.</en></lang>
 * @returns {object} <lang><zh-CN>mapped Promise 与 cancel handle。</zh-CN><en>A mapped Promise and cancel handle.</en></lang>
 * @lang zh-CN 页面不得绕过此入口直改 reservation state；所有 mutation 必须先跨越 Biz write lifecycle。
 * @lang en Pages must not bypass this entry to mutate reservation state directly; every mutation must first cross the Biz write lifecycle.
 */
export function startLocalReservationWrite(command) {
  // <lang><zh-CN>委托进程唯一 client，保持 receipt/snapshot ownership 一致。</zh-CN><en>Delegate to the process-sole client, keeping receipt/snapshot ownership consistent.</en></lang>
  return localReservationWriteClient.start(command);
}

/**
 * <lang><zh-CN>读取生产 local write client 的仅计数 observation。</zh-CN><en>Reads count-only observation of production local write client.</en></lang>
 * @returns {object} <lang><zh-CN>隔离 observation copy。</zh-CN><en>An isolated observation copy.</en></lang>
 * @lang zh-CN 仅供受控测试/诊断；绝不将它渲染为用户状态或发送到任何服务。
 * @lang en For controlled test/diagnosis only; never render it as user status or send it to any service.
 */
export function getLocalReservationWriteObservation() {
  // <lang><zh-CN>返回 runtime 提供的 detached count-only 副本。</zh-CN><en>Return detached count-only copy provided by runtime.</en></lang>
  return localReservationWriteClient.getObservation();
}
