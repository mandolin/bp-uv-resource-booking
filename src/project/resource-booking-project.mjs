/**
 * <lang><zh-CN>资源预约 BP 的项目组合根：把显式 project/solution/capability/session profiles、唯一 local adapter 与 HIA-uView-Biz project runtime 组合为面向页面/state 的高层业务 facade。</zh-CN><en>Project composition root for the resource-booking BP: combines explicit project, solution, capability, and session profiles, the sole local adapter, and HIA-uView-Biz project runtime into a high-level business facade for pages and state.</en></lang>
 * @lang zh-CN 本模块不公开 raw project facade、opaque adapter token、lower runtime、profile body 或 handler；业务 I/O 只能通过六项命名方法进入 capability/operation gate。
 * @lang en This module exposes no raw project facade, opaque adapter token, lower runtime, profile body, or handler; business I/O can enter capability and operation gates only through six named methods.
 */

// <lang><zh-CN>只依赖 Biz 面向项目的 public API，不直接 import async-provider、solution 或 provider-port lower runtime。</zh-CN><en>Depend only on the Biz project-facing public API and do not import async-provider, solution, or provider-port lower runtimes directly.</en></lang>
import {
  createProjectFacade,
  diagnoseProjectConfiguration
} from '@hia-uview/biz-project-runtime';

// <lang><zh-CN>adapter factory 拥有 local JSON 与 mock transaction；composition root 只保留 opaque token 和 count getter。</zh-CN><en>The adapter factory owns local JSON and the mock transaction; the composition root retains only an opaque token and count getter.</en></lang>
import { createLocalResourceBookingAdapter } from '../adapters/local-resource-booking-adapter.mjs';

// <lang><zh-CN>首页审阅模块是 fixture case、exact options 与 loading timing 的唯一事实源；组合根不重复解释 mode。</zh-CN><en>The Home review module is the sole source of truth for fixture cases, exact options, and loading timing; the composition root does not reinterpret modes.</en></lang>
import {
  createHomeCatalogReviewFixture,
  getCompiledHomeCatalogReviewCase
} from '../review/home-catalog-review.mjs';

// <lang><zh-CN>版本化 domain constant 仅用于项目自有 failure shape。</zh-CN><en>The versioned domain constant serves only the project's own failure shape.</en></lang>
import { BOOKING_DOMAIN_VERSION } from '../domain/booking-domain.mjs';

// <lang><zh-CN>profile factory 与稳定 operation ID 共同形成唯一声明式 composition relation。</zh-CN><en>The profile factory and stable operation IDs together form the sole declarative composition relation.</en></lang>
import { RESOURCE_BOOKING_OPERATION_IDS } from './resource-booking-contracts.mjs';
import { createResourceBookingProfiles } from './resource-booking-profiles.mjs';

/**
 * <lang><zh-CN>复制 runtime 已保证为 plain data 的公开结果。</zh-CN><en>Copies a public result already guaranteed by runtime to be plain data.</en></lang>
 * @param {unknown} value <lang><zh-CN>terminal value、doctor report、snapshot 或 observation。</zh-CN><en>Terminal value, doctor report, snapshot, or observation.</en></lang>
 * @returns {unknown} <lang><zh-CN>与内部结果不共享引用的 JSON copy。</zh-CN><en>JSON copy sharing no reference with the internal result.</en></lang>
 * @lang zh-CN helper 不接触 caller 输入、adapter token、function 或异常。
 * @lang en The helper touches no caller input, adapter token, function, or exception.
 */
function copyJson(value) {
  // <lang><zh-CN>公开 runtime/result surface 均为 JSON-compatible plain data。</zh-CN><en>Every public runtime and result surface is JSON-compatible plain data.</en></lang>
  return JSON.parse(JSON.stringify(value));
}

/**
 * <lang><zh-CN>创建项目自有的双语 provider failure。</zh-CN><en>Creates a project-owned bilingual provider failure.</en></lang>
 * @param {string} code <lang><zh-CN>页面已理解的稳定 failure code。</zh-CN><en>Stable failure code understood by pages.</en></lang>
 * @param {string} zhHans <lang><zh-CN>简体中文恢复提示。</zh-CN><en>Simplified-Chinese recovery guidance.</en></lang>
 * @param {string} en <lang><zh-CN>English recovery guidance。</zh-CN><en>English recovery guidance.</en></lang>
 * @param {object} source <lang><zh-CN>runtime 已脱敏的 actual source fact。</zh-CN><en>Actual-source fact already redacted by runtime.</en></lang>
 * @param {boolean} [retryable=false] <lang><zh-CN>是否允许用户显式发起新的同类读取。</zh-CN><en>Whether the user may explicitly start a new read of the same kind.</en></lang>
 * @returns {object} <lang><zh-CN>不含 request、command、value、exception 或 profile 的 failure。</zh-CN><en>Failure containing no request, command, value, exception, or profile.</en></lang>
 * @lang zh-CN actual source fact 只含 sourceId/authority/degradedReason，便于示例披露 local authority。
 * @lang en The actual-source fact contains only sourceId, authority, and degradedReason so the demo can disclose local authority.
 */
function createProviderFailure(code, zhHans, en, source, retryable = false) {
  // <lang><zh-CN>固定双语 shape 与既有 state failure projection 保持兼容。</zh-CN><en>The fixed bilingual shape remains compatible with existing state failure projection.</en></lang>
  return {
    contractVersion: BOOKING_DOMAIN_VERSION,
    kind: 'failure',
    code,
    message: { 'zh-Hans': zhHans, en },
    retryable,
    scope: 'provider',
    source: copyJson(source)
  };
}

/**
 * <lang><zh-CN>把 project-runtime terminal envelope 投影为项目 canonical outcome。</zh-CN><en>Projects a project-runtime terminal envelope into a project canonical outcome.</en></lang>
 * @param {object} envelope <lang><zh-CN>受限 async-provider terminal envelope。</zh-CN><en>Bounded async-provider terminal envelope.</en></lang>
 * @param {'read'|'write'} operationKind <lang><zh-CN>高层方法固定的 operation kind。</zh-CN><en>Operation kind fixed by the high-level method.</en></lang>
 * @param {boolean} [retainProviderRetryable=false] <lang><zh-CN>当前高层读取是否获准保留 provider retryable。</zh-CN><en>Whether the current high-level read may retain provider retryability.</en></lang>
 * @returns {object} <lang><zh-CN>domain/booking value 加 actual source，或双语 bounded failure。</zh-CN><en>Domain or booking value with actual source, or a bilingual bounded failure.</en></lang>
 * @lang zh-CN mapper 不透传 runtime message、exception、request 或 lower host；write unknown 明确要求用户回看列表。
 * @lang en The mapper forwards no runtime message, exception, request, or lower host; write unknown explicitly asks the user to review the list.
 */
function mapTerminalEnvelope(envelope, operationKind, retainProviderRetryable = false) {
  // <lang><zh-CN>success value 已由 runtime 隔离；再复制并附加 actual source fact。</zh-CN><en>Runtime has already isolated a success value; copy it again and attach the actual-source fact.</en></lang>
  if (envelope.kind === 'success') {
    const canonicalValue = copyJson(envelope.value);
    return {
      ...canonicalValue,
      source: copyJson(envelope.source)
    };
  }

  // <lang><zh-CN>write source 启动后的 unknown/timeout 不能宣称未发生，也不自动 retry/fallback。</zh-CN><en>Unknown or timeout after write-source start cannot be claimed not to have happened and triggers no automatic retry or fallback.</en></lang>
  if (operationKind === 'write' && (envelope.code === 'unknown' || envelope.code === 'timeout')) {
    return createProviderFailure(
      'provider-unavailable',
      '示例预约结果暂时无法确认，请查看当前预约列表。',
      'The demo booking result cannot be confirmed yet; review the current booking list.',
      envelope.source
    );
  }

  // <lang><zh-CN>明确取消只说明本次高层调用没有得到结果，不暴露 runtime cancellation phase。</zh-CN><en>Explicit cancellation states only that this high-level call obtained no result and exposes no runtime cancellation phase.</en></lang>
  if (envelope.code === 'cancelled') {
    return createProviderFailure(
      'cancelled',
      '本次示例操作已取消。',
      'This demo operation was cancelled.',
      envelope.source
    );
  }

  // <lang><zh-CN>其他 runtime failure 统一为 provider failure；只有获准的 catalog read 且 envelope 明确标记可重试时才保留该能力，不把 P70 语义扩散到其他读取，也不回显 lower code/message。</zh-CN><en>Other runtime failures become provider failures; retryability is retained only for the authorized catalog read when the envelope marks it explicitly, avoiding propagation of the P70 semantic to other reads and echoing no lower code or message.</en></lang>
  return createProviderFailure(
    'provider-unavailable',
    '示例数据暂时不可用，请稍后重试。',
    'Demo data is temporarily unavailable. Please try again.',
    envelope.source,
    operationKind === 'read' && retainProviderRetryable === true && envelope.retryable === true
  );
}

/**
 * <lang><zh-CN>包装 runtime handle，只改变 Promise value projection，不改变 cancel lifecycle。</zh-CN><en>Wraps a runtime handle, changing only Promise-value projection and not cancellation lifecycle.</en></lang>
 * @param {{promise: Promise<object>, cancel: Function}} runtimeHandle <lang><zh-CN>raw facade 返回的内部 handle。</zh-CN><en>Internal handle returned by the raw facade.</en></lang>
 * @param {'read'|'write'} operationKind <lang><zh-CN>高层业务方法固定的 kind。</zh-CN><en>Kind fixed by the high-level business method.</en></lang>
 * @param {boolean} [retainProviderRetryable=false] <lang><zh-CN>是否允许当前读取保留 provider retryable。</zh-CN><en>Whether the current read may retain provider retryability.</en></lang>
 * @returns {{promise: Promise<object>, cancel: Function}} <lang><zh-CN>mapped Promise 与原语义 cancel handle。</zh-CN><en>Mapped promise and cancel handle with original semantics.</en></lang>
 * @lang zh-CN wrapper 不公开 raw handle、host、operation ID 或 facade；caller 只能等待或请求取消当前业务调用。
 * @lang en The wrapper exposes no raw handle, host, operation ID, or facade; callers may only await or request cancellation of the current business call.
 */
function mapRuntimeHandle(runtimeHandle, operationKind, retainProviderRetryable = false) {
  // <lang><zh-CN>冻结 outer handle，防止页面替换 promise/cancel 成为隐藏 transport seam。</zh-CN><en>Freeze the outer handle so a page cannot replace promise or cancel and create a hidden transport seam.</en></lang>
  return Object.freeze({
    promise: runtimeHandle.promise.then((envelope) => mapTerminalEnvelope(envelope, operationKind, retainProviderRetryable)),
    cancel: runtimeHandle.cancel
  });
}

/**
 * <lang><zh-CN>创建一个独立、进程内的资源预约 project facade。</zh-CN><en>Creates an isolated in-process resource-booking project facade.</en></lang>
 * @param {unknown} [options={}] <lang><zh-CN>空 record 或精确 `{ fixtureCase }` 审阅选项。</zh-CN><en>Empty record or exact `{ fixtureCase }` review options.</en></lang>
 * @returns {object} <lang><zh-CN>六项高层业务方法与 doctor/snapshot/source-fact getters。</zh-CN><en>Six high-level business methods plus doctor, snapshot, and source-fact getters.</en></lang>
 * @throws {Error} <lang><zh-CN>审阅 options 非精确有限合同，或 checked-in composition relation 无法通过 readiness 时抛出固定错误。</zh-CN><en>Throws a fixed error when review options violate the exact finite contract or the checked-in composition relation fails readiness.</en></lang>
 * @lang zh-CN 每个实例拥有独立 local adapter transaction；生产 singleton 由本模块底部创建，测试可用工厂隔离 write lifecycle。
 * @lang en Every instance owns an isolated local-adapter transaction; the production singleton is created at the bottom of this module, while tests may isolate write lifecycles through the factory.
 */
export function createResourceBookingProject(options = {}) {
  // <lang><zh-CN>唯一 review factory 执行 plain-record、exact-field 与 finite-case 验证；非法 direct options 严格失败关闭。</zh-CN><en>The sole review factory validates plain records, exact fields, and finite cases; invalid direct options fail closed.</en></lang>
  const homeCatalogReviewFixture = createHomeCatalogReviewFixture(options);

  // <lang><zh-CN>创建全新 declarative profiles，避免跨实例共享 caller-mutable graph。</zh-CN><en>Create fresh declarative profiles, avoiding a caller-mutable graph shared across instances.</en></lang>
  const profiles = createResourceBookingProfiles();

  // <lang><zh-CN>adapter fixture 只向组合根提供 opaque token 与 count-only facts。</zh-CN><en>The adapter fixture supplies only an opaque token and count-only facts to the composition root.</en></lang>
  const localAdapter = createLocalResourceBookingAdapter({
    fixtureCase: homeCatalogReviewFixture.fixtureCase
  });

  // <lang><zh-CN>options 精确绑定 local mode，不读取系统、UniApp 或网络状态。</zh-CN><en>Options bind local mode exactly and read no system, UniApp, or network state.</en></lang>
  const runtimeOptions = {
    ...profiles,
    adapters: [localAdapter.adapter],
    settingMode: 'local',
    environmentId: null,
    timeoutMs: 5000,
    ...homeCatalogReviewFixture.runtimeTiming
  };

  // <lang><zh-CN>doctor 与真实 facade 使用同一 options relation；diagnosis 不执行 handler。</zh-CN><en>Doctor and real facade use the same options relation; diagnosis executes no handler.</en></lang>
  const initialDiagnosis = diagnoseProjectConfiguration(runtimeOptions);
  if (!initialDiagnosis.ok || !initialDiagnosis.ready) {
    throw new Error('BP resource-booking project diagnosis failed.');
  }

  // <lang><zh-CN>只有完整 project/solution/capability/source readiness 通过后才取得 raw facade。</zh-CN><en>Obtain a raw facade only after complete project, solution, capability, and source readiness passes.</en></lang>
  const creation = createProjectFacade(runtimeOptions);
  if (!creation.ok) {
    throw new Error('BP resource-booking project facade failed to initialize.');
  }

  // <lang><zh-CN>raw facade 只保留在 factory closure，永不成为返回对象字段。</zh-CN><en>Keep the raw facade only inside the factory closure and never make it a field of the returned object.</en></lang>
  const facade = creation.facade;

  /**
   * <lang><zh-CN>启动分页资源目录查询。</zh-CN><en>Starts a paged resource-catalog query.</en></lang>
   * @param {object} request <lang><zh-CN>精确 page/pageSize/keyword/venueId/resourceTypeId/date request。</zh-CN><en>Exact page, pageSize, keyword, venueId, resourceTypeId, and date request.</en></lang>
   * @returns {{promise: Promise<object>, cancel: Function}} <lang><zh-CN>业务 page/failure handle。</zh-CN><en>Business page or failure handle.</en></lang>
   * @lang zh-CN request 直接进入 project runtime plain-data isolation，组合根不读取任意 getter。
   * @lang en The request enters project-runtime plain-data isolation directly; the composition root reads no arbitrary getter.
   */
  function queryResourceCatalog(request) {
    // <lang><zh-CN>稳定 read operation ID 是唯一 dispatch 输入；loading 同样使用标准 mapper，其稳定 pending 由 adapter source 与 review-only scheduler 共同保证。</zh-CN><en>The stable read-operation ID is the sole dispatch input; loading uses the standard mapper as well, with stable pending guaranteed jointly by the adapter source and review-only scheduler.</en></lang>
    return mapRuntimeHandle(
      facade.startRead(RESOURCE_BOOKING_OPERATION_IDS.queryCatalog, request),
      'read',
      true
    );
  }

  /**
   * <lang><zh-CN>启动一项 resource detail 读取。</zh-CN><en>Starts one resource-detail read.</en></lang>
   * @param {string} resourceId <lang><zh-CN>local dataset 中的稳定资源 ID。</zh-CN><en>Stable resource ID in the local dataset.</en></lang>
   * @returns {{promise: Promise<object>, cancel: Function}} <lang><zh-CN>业务 detail/failure handle。</zh-CN><en>Business detail or failure handle.</en></lang>
   * @lang zh-CN 高层方法构造唯一字段 request，resourceId 不被解释为 URL 或路径。
   * @lang en The high-level method constructs a single-field request; resourceId is not interpreted as a URL or path.
   */
  function readResourceDetail(resourceId) {
    // <lang><zh-CN>只把 caller 原始 primitive 放入 runtime-isolated request。</zh-CN><en>Place only the caller primitive in the runtime-isolated request.</en></lang>
    return mapRuntimeHandle(
      facade.startRead(RESOURCE_BOOKING_OPERATION_IDS.readResourceDetail, { resourceId }),
      'read'
    );
  }

  /**
   * <lang><zh-CN>读取当前 project adapter 的完整 detached reservation snapshot。</zh-CN><en>Reads the complete detached reservation snapshot of the current project adapter.</en></lang>
   * @returns {{promise: Promise<object>, cancel: Function}} <lang><zh-CN>reservations/failure handle。</zh-CN><en>Reservations or failure handle.</en></lang>
   * @lang zh-CN list 与三项 write 共用同一个 adapter transaction，因此可用于 timeout/unknown 后显式复核。
   * @lang en List shares one adapter transaction with all three writes, so it can explicitly reconcile state after timeout or unknown.
   */
  function listReservations() {
    // <lang><zh-CN>空 request 仍经过 facade isolation 和 read gate。</zh-CN><en>Even an empty request passes through facade isolation and the read gate.</en></lang>
    return mapRuntimeHandle(
      facade.startRead(RESOURCE_BOOKING_OPERATION_IDS.listReservations, {}),
      'read'
    );
  }

  /**
   * <lang><zh-CN>创建一项 local demo reservation。</zh-CN><en>Creates one local demo reservation.</en></lang>
   * @param {object} command <lang><zh-CN>精确 commandId/resourceId/date/time command。</zh-CN><en>Exact commandId, resourceId, date, and time command.</en></lang>
   * @returns {{promise: Promise<object>, cancel: Function}} <lang><zh-CN>confirmed/failure handle。</zh-CN><en>Confirmed or failure handle.</en></lang>
   * @lang zh-CN write authority 在 invocation 前固定为 local，maxAttempts 为一且无 fallback。
   * @lang en Write authority is fixed to local before invocation, maxAttempts is one, and no fallback exists.
   */
  function createReservation(command) {
    // <lang><zh-CN>command 直接交给 facade plain-data boundary。</zh-CN><en>Supply command directly to the facade plain-data boundary.</en></lang>
    return mapRuntimeHandle(
      facade.startWrite(RESOURCE_BOOKING_OPERATION_IDS.createReservation, command),
      'write'
    );
  }

  /**
   * <lang><zh-CN>取消一项当前 confirmed demo reservation。</zh-CN><en>Cancels one currently confirmed demo reservation.</en></lang>
   * @param {object} command <lang><zh-CN>精确 commandId/reservationId command。</zh-CN><en>Exact commandId and reservationId command.</en></lang>
   * @returns {{promise: Promise<object>, cancel: Function}} <lang><zh-CN>cancelled/failure handle。</zh-CN><en>Cancelled or failure handle.</en></lang>
   * @lang zh-CN adapter 保留 cancelled record，不伪装成删除或真实库存释放。
   * @lang en The adapter retains the cancelled record and does not present it as deletion or live-inventory release.
   */
  function cancelReservation(command) {
    // <lang><zh-CN>稳定 write operation gate 禁止 command 自由 dispatch。</zh-CN><en>The stable write-operation gate prevents free dispatch by command.</en></lang>
    return mapRuntimeHandle(
      facade.startWrite(RESOURCE_BOOKING_OPERATION_IDS.cancelReservation, command),
      'write'
    );
  }

  /**
   * <lang><zh-CN>以“创建 replacement 后取消旧记录”语义改期。</zh-CN><en>Reschedules with “create replacement, then cancel old record” semantics.</en></lang>
   * @param {object} command <lang><zh-CN>精确 commandId/reservationId/date/time command。</zh-CN><en>Exact commandId, reservationId, date, and time command.</en></lang>
   * @returns {{promise: Promise<object>, cancel: Function}} <lang><zh-CN>rescheduled/failure handle。</zh-CN><en>Rescheduled or failure handle.</en></lang>
   * @lang zh-CN resource identity 来自 adapter 私有旧记录；caller 不能在改期时更换资源。
   * @lang en Resource identity comes from the adapter-private old record; a caller cannot change resources during reschedule.
   */
  function rescheduleReservation(command) {
    // <lang><zh-CN>由独立 operation ID 固定改期 handler 与 contract。</zh-CN><en>The independent operation ID fixes the reschedule handler and contract.</en></lang>
    return mapRuntimeHandle(
      facade.startWrite(RESOURCE_BOOKING_OPERATION_IDS.rescheduleReservation, command),
      'write'
    );
  }

  /**
   * <lang><zh-CN>按真实 composition relation 重新执行只读结构诊断。</zh-CN><en>Reruns read-only structural diagnosis against the real composition relation.</en></lang>
   * @returns {object} <lang><zh-CN>project runtime 的 detached readiness report。</zh-CN><en>Detached readiness report from project runtime.</en></lang>
   * @lang zh-CN doctor 不调用六项 handler，不探测 source health，也不修复配置。
   * @lang en Doctor invokes none of the six handlers, probes no source health, and repairs no configuration.
   */
  function doctor() {
    // <lang><zh-CN>每次返回新 report copy，调用方 mutation 不影响后续诊断。</zh-CN><en>Return a fresh report copy every time so caller mutation cannot affect later diagnosis.</en></lang>
    return copyJson(diagnoseProjectConfiguration(runtimeOptions));
  }

  /**
   * <lang><zh-CN>读取 project-to-capability-to-operation 的受限组合 snapshot。</zh-CN><en>Reads a bounded project-to-capability-to-operation composition snapshot.</en></lang>
   * @returns {object} <lang><zh-CN>不含 profile body、session、adapter token 或 host 的 detached metadata。</zh-CN><en>Detached metadata containing no profile body, session, adapter token, or host.</en></lang>
   * @lang zh-CN capability snapshot 使用 resolver 的 dependency-first order，可直接证明 solution closure。
   * @lang en Capability snapshot uses the resolver's dependency-first order and directly proves the solution closure.
   */
  function getSnapshot() {
    // <lang><zh-CN>只组合 facade 已脱敏的公开 snapshots。</zh-CN><en>Compose only public snapshots already redacted by the facade.</en></lang>
    return {
      project: facade.getProjectSnapshot(),
      capabilities: facade.getCapabilitySnapshot(),
      operations: facade.getOperationSnapshot(),
      selection: facade.getSelectionSnapshot(),
      adapters: facade.getAdapterSnapshot()
    };
  }

  /**
   * <lang><zh-CN>读取 source selection、实际 handler 次数与 count-only lifecycle observation。</zh-CN><en>Reads source selection, actual handler counts, and count-only lifecycle observation.</en></lang>
   * @returns {object} <lang><zh-CN>不含业务值或 handler 的 detached source facts。</zh-CN><en>Detached source facts containing no business value or handler.</en></lang>
   * @lang zh-CN 每次 terminal outcome 的 actual source 仍是单次调用事实；本 getter 只补充聚合计数和声明 metadata。
   * @lang en The actual source on each terminal outcome remains the per-call fact; this getter adds only aggregate counts and declared metadata.
   */
  function getSourceFacts() {
    // <lang><zh-CN>adapter execution snapshot 与 runtime observation 都只含稳定 ID/计数。</zh-CN><en>Both adapter execution snapshot and runtime observation contain only stable IDs and counts.</en></lang>
    return {
      selection: facade.getSelectionSnapshot(),
      adapters: facade.getAdapterSnapshot(),
      execution: localAdapter.getExecutionSnapshot(),
      observation: facade.getObservation()
    };
  }

  // <lang><zh-CN>冻结唯一 high-level surface；raw facade、runtimeOptions、profiles 与 adapter token 都留在 closure。</zh-CN><en>Freeze the sole high-level surface; raw facade, runtimeOptions, profiles, and adapter token all remain in the closure.</en></lang>
  return Object.freeze({
    queryResourceCatalog,
    readResourceDetail,
    listReservations,
    createReservation,
    cancelReservation,
    rescheduleReservation,
    doctor,
    getSnapshot,
    getSourceFacts
  });
}

/**
 * <lang><zh-CN>当前 BP 进程唯一共享的资源预约 project facade。</zh-CN><en>Sole shared resource-booking project facade for the current BP process.</en></lang>
 * @lang zh-CN singleton 使页面读取与 mutation 共享同一 local reservation snapshot；标准构建固定 ready，显式审阅构建只采用 compile-time allowlisted case。
 * @lang en The singleton lets page reads and mutations share one local reservation snapshot; a standard build is fixed to ready, while an explicit review build uses only a compile-time allowlisted case.
 */
export const resourceBookingProject = createResourceBookingProject({
  fixtureCase: getCompiledHomeCatalogReviewCase()
});
