/**
 * <lang><zh-CN>BP 的进程内 demo 状态：协调 local catalog/detail 请求和 mock 预约记录，不写入 storage、网络、用户身份或跨会话数据。</zh-CN><en>In-process demo state for the BP: coordinates local catalog/detail requests and mock reservation records without writing storage, network, user identity, or cross-session data.</en></lang>
 * @lang zh-CN 状态只服务已确认页面 flow；它不是通用 store、真实数据同步层或后台领域模型。
 * @lang en State serves only confirmed page flows; it is not a general store, real data-sync layer, or back-office domain model.
 */

// <lang><zh-CN>使用 Vue 最小 reactive primitives，不安装 global store plugin 或持久化插件。</zh-CN><en>Use minimum Vue reactive primitives and install no global-store or persistence plugin.</en></lang>
import { computed, readonly, ref } from 'vue';

// <lang><zh-CN>导入 local-first provider 和纯 domain mock transaction；两者都不连接后端。</zh-CN><en>Import local-first provider and pure domain mock transaction; neither connects to a backend.</en></lang>
import {
  startLocalCatalogQuery,
  startLocalResourceDetailQuery
} from '../services/local-project-provider.mjs';
import {
  createLocalReservation
} from '../domain/booking-domain.mjs';
import localDataset from '../data/venues.json';

/**
 * <lang><zh-CN>目录每页固定展示数量。</zh-CN><en>Fixed number of catalog entries per page.</en></lang>
 * @lang zh-CN 数量与 local domain 的安全上限相容，既支持触底追加，也让显式页次在小样本中可观察。
 * @lang en The count is compatible with local-domain safety cap, supporting reach-bottom append while keeping explicit page state observable in small fixtures.
 */
const CATALOG_PAGE_SIZE = 2;

/**
 * <lang><zh-CN>当前 catalog 请求的可取消 handle。</zh-CN><en>Cancellable handle of the current catalog request.</en></lang>
 * @lang zh-CN handle 只存在模块私有内存中；不会被路由、模板、storage 或日志暴露。
 * @lang en Handle exists only in module-private memory and is exposed to no route, template, storage, or log.
 */
let activeCatalogHandle = null;

/**
 * <lang><zh-CN>当前 detail 请求的可取消 handle。</zh-CN><en>Cancellable handle of the current detail request.</en></lang>
 * @lang zh-CN 新详情请求会先请求取消旧读取；取消结果只按 provider 契约映射，不伪称远端已经停止。
 * @lang en A new detail request first requests cancellation of old read; cancellation result maps only under provider contract and does not claim a remote stop.
 */
let activeDetailHandle = null;

/**
 * <lang><zh-CN>目录 entries 的当前累积列表。</zh-CN><en>Current accumulated list of catalog entries.</en></lang>
 * @lang zh-CN 列表由刷新替换或触底追加；它不直接引用 local JSON dataset。
 * @lang en The list is replaced by refresh or appended at reach-bottom; it directly references no local JSON dataset.
 */
const catalogEntries = ref([]);

/**
 * <lang><zh-CN>目录 request/结果的有限状态。</zh-CN><en>Finite state for catalog request/result.</en></lang>
 * @lang zh-CN phase 只控制页面呈现，不等同 provider telemetry 或真实网络状态。
 * @lang en Phase controls page presentation only and is neither provider telemetry nor real network state.
 */
const catalogPhase = ref('idle');

/**
 * <lang><zh-CN>当前 catalog 关键字。</zh-CN><en>Current catalog keyword.</en></lang>
 * @lang zh-CN 输入只在用户明确搜索/刷新时送入 local query，不自动请求或保存。
 * @lang en Input enters local query only on explicit user search/refresh and is neither automatically requested nor saved.
 */
const catalogKeyword = ref('');

/**
 * <lang><zh-CN>最近成功页的分页事实。</zh-CN><en>Pagination facts from most recent successful page.</en></lang>
 * @lang zh-CN 页脚显示 loaded/page/total/hasNext 时仅消费这份安全结果，不猜测总数。
 * @lang en Footer consumes only these safe result facts for loaded/page/total/hasNext and guesses no total.
 */
const catalogPaging = ref({ page: 0, pageSize: CATALOG_PAGE_SIZE, total: 0, hasNext: false });

/**
 * <lang><zh-CN>可展示的当前 source metadata。</zh-CN><en>Current source metadata safe for display.</en></lang>
 * @lang zh-CN 当前只能为 local；字段保留为未来已审阅 source selector 的可发现性接口。
 * @lang en Current value can only be local; fields remain as discoverability interface for a future reviewed source selector.
 */
const catalogSource = ref({ sourceId: 'bp-resource-booking.local-json', authority: 'local', degradedReason: null });

/**
 * <lang><zh-CN>目录非破坏性错误状态。</zh-CN><en>Non-destructive catalog error state.</en></lang>
 * @lang zh-CN 触底失败时已有列表保留，页面只显示 footer retry；首次失败才显示完整错误态。
 * @lang en Existing list remains on reach-bottom failure and page shows only footer retry; only initial failure shows full error state.
 */
const catalogFailure = ref(null);

/**
 * <lang><zh-CN>当前资源详情 outcome。</zh-CN><en>Current resource-detail outcome.</en></lang>
 * @lang zh-CN detail 只保留最后一次明确导航请求的结果，不缓存多个实体或跨会话保存。
 * @lang en Detail retains only result of last explicit navigation request and caches neither multiple entities nor cross-session state.
 */
const selectedDetail = ref(null);

/**
 * <lang><zh-CN>详情加载状态。</zh-CN><en>Detail loading state.</en></lang>
 * @lang zh-CN 该状态独立于 catalog，避免详情加载覆盖或重置已呈现目录。
 * @lang en This state is independent from catalog, preventing detail loading from overwriting or resetting displayed catalog.
 */
const detailPhase = ref('idle');

/**
 * <lang><zh-CN>当前详情失败结果。</zh-CN><en>Current detail failure result.</en></lang>
 * @lang zh-CN failure 已由 project adapter 脱敏，不包含 local dataset、request 或 provider 实现。
 * @lang en Failure is redacted by project adapter and contains no local dataset, request, or provider implementation.
 */
const detailFailure = ref(null);

/**
 * <lang><zh-CN>当前运行时 demo 预约记录。</zh-CN><en>Current runtime demo reservation records.</en></lang>
 * @lang zh-CN 初始值从 checked-in mock 复制；后续确认只留在当前内存，不模拟本地持久化。
 * @lang en Initial value copies checked-in mock; later confirmations remain only in current memory and simulate no local persistence.
 */
const reservations = ref(JSON.parse(JSON.stringify(localDataset.mockReservations)));

/**
 * <lang><zh-CN>预约确认流程的受限阶段。</zh-CN><en>Bounded phase of reservation-confirmation flow.</en></lang>
 * @lang zh-CN 页面显示 ready/submitting/confirmed/conflict；没有 payment、real transaction 或后台审批阶段。
 * @lang en Page displays ready/submitting/confirmed/conflict; it has no payment, real transaction, or back-office approval phase.
 */
const bookingPhase = ref('ready');

/**
 * <lang><zh-CN>最近确认的预约记录。</zh-CN><en>Most recently confirmed reservation record.</en></lang>
 * @lang zh-CN 用于确认结果页面；不会存储联系人、手机号、支付信息或真实身份。
 * @lang en Used by confirmation result page and stores no contact, phone, payment information, or real identity.
 */
const lastConfirmedReservation = ref(null);

/**
 * <lang><zh-CN>供预约页呈现的最小预约卡片集合。</zh-CN><en>Minimum reservation-card collection for presentation on the reservations page.</en></lang>
 * @lang zh-CN 卡片只补充 local JSON 中已有的双语 venue/resource 字段；页面必须通过 runtime locale 投影它们，不读取或推断联系人、价格、支付或身份资料。
 * @lang en Cards add only existing bilingual venue/resource fields from local JSON; pages must project them through runtime locale and read or infer no contact, price, payment, or identity detail.
 */
const reservationCards = computed(() => reservations.value.map((reservation) => {
  // <lang><zh-CN>按当前记录的有限 venue ID 找到其静态展示记录；未知 ID 保持受限 fallback。</zh-CN><en>Find the static presentation record by current finite venue ID; an unknown ID retains a bounded fallback.</en></lang>
  const venue = localDataset.venues.find((candidateVenue) => candidateVenue.id === reservation.venueId);

  // <lang><zh-CN>只在已找到 venue 内查找 resource，避免全局任意字段匹配。</zh-CN><en>Find the resource only inside a found venue, avoiding global arbitrary-field matching.</en></lang>
  const resource = venue?.resources.find((candidateResource) => candidateResource.id === reservation.resourceId);

  // <lang><zh-CN>输出新展示对象，防止页面通过嵌套引用改写 local JSON 或运行时预约记录。</zh-CN><en>Output a new presentation object, preventing a page from mutating local JSON or runtime reservations through nested references.</en></lang>
  return {
    id: reservation.id,
    date: reservation.date,
    time: reservation.time,
    status: reservation.status,
    venueName: venue?.name ?? { 'zh-Hans': '示例场馆', en: 'Demo venue' },
    resourceName: resource?.name ?? { 'zh-Hans': '示例资源', en: 'Demo resource' }
  };
}));

/**
 * <lang><zh-CN>根据当前分页事实判断能否继续加载。</zh-CN><en>Determines whether loading may continue from current pagination facts.</en></lang>
 * @returns {object} <lang><zh-CN>只读 computed boolean。</zh-CN><en>Readonly computed Boolean.</en></lang>
 * @lang zh-CN 防止 reach-bottom 在无下一页、initial loading 或 append loading 时重复发起请求。
 * @lang en Prevent duplicate request at reach-bottom when no next page, initial loading, or append loading applies.
 */
const canLoadMore = computed(() => catalogPaging.value.hasNext && catalogPhase.value !== 'loading' && catalogPhase.value !== 'appending');

/**
 * <lang><zh-CN>加载或刷新目录页。</zh-CN><en>Loads or refreshes a catalog page.</en></lang>
 * @param {object} options <lang><zh-CN>请求模式和关键字。</zh-CN><en>Request mode and keyword.</en></lang>
 * @param {boolean} options.append <lang><zh-CN>是否追加下一页。</zh-CN><en>Whether to append the next page.</en></lang>
 * @param {string} options.keyword <lang><zh-CN>明确输入的关键字。</zh-CN><en>Explicitly entered keyword.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>页面状态稳定后 resolve。</zh-CN><en>Resolves after page state stabilizes.</en></lang>
 * @lang zh-CN 不等待或暴露 provider exception；所有结果先经 async runtime/project adapter 的受限 terminal mapping。
 * @lang en Does not await or expose provider exception; every result first crosses bounded terminal mapping of async runtime/project adapter.
 */
async function loadCatalog({ append, keyword }) {
  // <lang><zh-CN>非追加操作替换 page=1；追加只在已有已知下一页时前进一页。</zh-CN><en>Non-append operation replaces page one; append advances one page only when a next page is already known.</en></lang>
  const requestedPage = append ? catalogPaging.value.page + 1 : 1;

  // <lang><zh-CN>无需 append 时立即返回，避免触底重复调用改变加载/错误状态。</zh-CN><en>Return immediately when append is unnecessary, avoiding repeated reach-bottom calls changing load/error state.</en></lang>
  if (append && !canLoadMore.value) {
    return;
  }

  // <lang><zh-CN>取消先前尚未结束的读取请求；新 request 的结果由当前 call 自己拥有。</zh-CN><en>Request cancellation of prior unfinished read; result of new request is owned by current call itself.</en></lang>
  activeCatalogHandle?.cancel();

  // <lang><zh-CN>新搜索/刷新会立即更新 keyword；append 保留上次已确认 keyword。</zh-CN><en>New search/refresh updates keyword immediately; append retains last confirmed keyword.</en></lang>
  if (!append) {
    catalogKeyword.value = keyword;
  }

  // <lang><zh-CN>首次/刷新使用 loading，追加使用 appending，使列表在后者失败时保持可读。</zh-CN><en>Initial/refresh uses loading while append uses appending, keeping list readable when the latter fails.</en></lang>
  catalogPhase.value = append ? 'appending' : 'loading';

  // <lang><zh-CN>新请求开始前清除旧 failure，但不在 append 时清空已有 entries。</zh-CN><en>Clear old failure before new request but do not clear existing entries during append.</en></lang>
  catalogFailure.value = null;

  // <lang><zh-CN>从 explicit local provider 获取可取消 handle，输入只含有限 paging/keyword。</zh-CN><en>Obtain cancellable handle from explicit local provider; input contains only finite paging/keyword.</en></lang>
  const requestHandle = startLocalCatalogQuery(requestedPage, CATALOG_PAGE_SIZE, catalogKeyword.value);

  // <lang><zh-CN>将当前 handle 保留为私有取消目标，不放入响应式页面状态。</zh-CN><en>Retain current handle as private cancellation target and do not place it in reactive page state.</en></lang>
  activeCatalogHandle = requestHandle;

  // <lang><zh-CN>等待已脱敏结果；runtime 保证 Promise 不因 source exception reject。</zh-CN><en>Await redacted result; runtime guarantees the Promise does not reject for a source exception.</en></lang>
  const outcome = await requestHandle.promise;

  // <lang><zh-CN>若已有更新请求替换此 handle，静默丢弃晚到结果，避免旧搜索覆盖新内容。</zh-CN><en>If an updated request replaced this handle, silently discard late result, preventing old search from overwriting new content.</en></lang>
  if (activeCatalogHandle !== requestHandle) {
    return;
  }

  // <lang><zh-CN>当前 handle 已完成，清除私有引用以避免后续无意义 cancel。</zh-CN><en>Current handle completed, so clear private reference to avoid meaningless later cancellation.</en></lang>
  activeCatalogHandle = null;

  // <lang><zh-CN>失败保存给页面；append 保留 entries，首次失败由页面显示完整 recoverable state。</zh-CN><en>Store failure for page; append retains entries while initial failure displays full recoverable state.</en></lang>
  if (outcome.kind === 'failure') {
    catalogFailure.value = outcome;
    catalogPhase.value = append ? 'ready' : 'failure';
    return;
  }

  // <lang><zh-CN>append 连接新 page，刷新替换 page=1；均创建新数组避免共享 provider value。</zh-CN><en>Append concatenates new page while refresh replaces page one; both create new arrays to avoid sharing provider value.</en></lang>
  catalogEntries.value = append ? [...catalogEntries.value, ...outcome.entries] : [...outcome.entries];

  // <lang><zh-CN>保存结果中的分页/source 事实，供页脚和 source badge 直接呈现。</zh-CN><en>Store pagination/source facts from result for direct footer and source-badge presentation.</en></lang>
  catalogPaging.value = { page: outcome.page, pageSize: outcome.pageSize, total: outcome.total, hasNext: outcome.hasNext };
  catalogSource.value = { ...outcome.source };
  catalogPhase.value = 'ready';
}

/**
 * <lang><zh-CN>显式刷新目录的首页。</zh-CN><en>Explicitly refreshes first catalog page.</en></lang>
 * @param {string} keyword <lang><zh-CN>最新搜索关键字。</zh-CN><en>Latest search keyword.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>目录稳定后 resolve。</zh-CN><en>Resolves after catalog stabilizes.</en></lang>
 * @lang zh-CN 此操作对应筛选/下拉刷新，始终替换 page=1，而不混入当前追加页。
 * @lang en This operation corresponds to filter/pull refresh and always replaces page one without mixing current appended page.
 */
export function refreshCatalog(keyword = catalogKeyword.value) {
  // <lang><zh-CN>委托唯一 load helper，保持 loading、取消和 failure 语义一致。</zh-CN><en>Delegate to the sole load helper, keeping loading, cancellation, and failure semantics consistent.</en></lang>
  return loadCatalog({ append: false, keyword });
}

/**
 * <lang><zh-CN>显式追加目录下一页。</zh-CN><en>Explicitly appends next catalog page.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>追加完成或无需追加后 resolve。</zh-CN><en>Resolves after append completes or is unnecessary.</en></lang>
 * @lang zh-CN 页面只能在触底时调用；组件自身不监听滚动或主动请求。
 * @lang en A page may call this only at reach-bottom; the component itself listens to no scroll and proactively requests nothing.
 */
export function loadNextCatalogPage() {
  // <lang><zh-CN>保留当前 keyword，使后续 page 保持同一明确查询条件。</zh-CN><en>Retain current keyword so later page keeps the same explicit query condition.</en></lang>
  return loadCatalog({ append: true, keyword: catalogKeyword.value });
}

/**
 * <lang><zh-CN>加载一个资源详情。</zh-CN><en>Loads one resource detail.</en></lang>
 * @param {string} resourceId <lang><zh-CN>显式导航传入的资源 ID。</zh-CN><en>Resource ID supplied by explicit navigation.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>详情状态稳定后 resolve。</zh-CN><en>Resolves after detail state stabilizes.</en></lang>
 * @lang zh-CN 详情读取独立于目录列表；失败不重置目录或预约记录。
 * @lang en Detail reading is independent from catalog list; failure resets neither catalog nor reservation records.
 */
export async function loadResourceDetail(resourceId) {
  // <lang><zh-CN>请求取消旧详情，避免返回较慢的旧资源覆盖新导航。</zh-CN><en>Request cancellation of old detail, avoiding a slower old resource overwriting new navigation.</en></lang>
  activeDetailHandle?.cancel();

  // <lang><zh-CN>清空前一详情 failure 并进入独立 loading phase。</zh-CN><en>Clear prior detail failure and enter independent loading phase.</en></lang>
  detailFailure.value = null;
  detailPhase.value = 'loading';

  // <lang><zh-CN>启动明确 local detail read；resource ID 不成为 URL 或文件路径。</zh-CN><en>Start explicit local detail read; resource ID becomes no URL or file path.</en></lang>
  const requestHandle = startLocalResourceDetailQuery(resourceId);

  // <lang><zh-CN>保留私有 handle 以识别和丢弃被替换请求的晚到结果。</zh-CN><en>Retain private handle to recognize and discard late results of replaced request.</en></lang>
  activeDetailHandle = requestHandle;

  // <lang><zh-CN>等待受限 terminal outcome。</zh-CN><en>Await bounded terminal outcome.</en></lang>
  const outcome = await requestHandle.promise;

  // <lang><zh-CN>新请求已取代此请求时不改变详情状态。</zh-CN><en>Do not change detail state when a new request already replaced this request.</en></lang>
  if (activeDetailHandle !== requestHandle) {
    return;
  }

  // <lang><zh-CN>完成后清理私有 handle。</zh-CN><en>Clear private handle after completion.</en></lang>
  activeDetailHandle = null;

  // <lang><zh-CN>失败只显示受限 failure，成功则替换唯一 selected detail。</zh-CN><en>Display only bounded failure on failure; replace sole selected detail on success.</en></lang>
  if (outcome.kind === 'failure') {
    detailFailure.value = outcome;
    selectedDetail.value = null;
    detailPhase.value = 'failure';
    return;
  }

  // <lang><zh-CN>写入纯 detail 与 ready phase；source 已随 outcome 受限携带。</zh-CN><en>Write pure detail and ready phase; bounded source already accompanies outcome.</en></lang>
  selectedDetail.value = outcome;
  detailPhase.value = 'ready';
}

/**
 * <lang><zh-CN>确认当前 selected detail 的本地示例预约。</zh-CN><en>Confirms a local demo reservation for current selected detail.</en></lang>
 * @param {string} date <lang><zh-CN>页面选择的 ISO 日期。</zh-CN><en>ISO date selected by the page.</en></lang>
 * @param {string} time <lang><zh-CN>页面选择的已声明 slot。</zh-CN><en>Declared slot selected by the page.</en></lang>
 * @returns {object} <lang><zh-CN>confirmed record 或 conflict failure。</zh-CN><en>A confirmed record or conflict failure.</en></lang>
 * @lang zh-CN 这只是 local mock write，不调用 async write provider、远端 API、支付或 storage。
 * @lang en This is only a local mock write and calls no async write provider, remote API, payment, or storage.
 */
export function confirmLocalReservation(date, time) {
  // <lang><zh-CN>没有 ready detail 时返回普通 conflict，不允许从 URL 或隐藏状态构造预约。</zh-CN><en>Return ordinary conflict without ready detail, allowing no reservation construction from URL or hidden state.</en></lang>
  if (selectedDetail.value?.kind !== 'detail') {
    // <lang><zh-CN>将 phase 固定为 conflict，供确认页显示非破坏性恢复提示。</zh-CN><en>Fix phase as conflict so confirmation page can display non-destructive recovery guidance.</en></lang>
    bookingPhase.value = 'conflict';
    return {
      kind: 'failure',
      code: 'conflict',
      message: { 'zh-Hans': '请先重新选择可预约资源。', en: 'Choose a bookable resource again first.' },
      retryable: false,
      scope: 'booking'
    };
  }

  // <lang><zh-CN>进入 submitting 仅表示页面处理本地动作，不表示 network transaction 已开始。</zh-CN><en>Entering submitting means only that page processes local action and not that a network transaction began.</en></lang>
  bookingPhase.value = 'submitting';

  // <lang><zh-CN>使用当前内存记录数量派生下一 ordinal，避免任何时间、随机数或持久化依赖。</zh-CN><en>Derive next ordinal from current in-memory record count, avoiding time, random, or persistence dependency.</en></lang>
  const outcome = createLocalReservation(selectedDetail.value, date, time, reservations.value.length + 1);

  // <lang><zh-CN>冲突保持已有记录和 selection，页面可回退更换 slot。</zh-CN><en>Conflict retains existing records and selection, allowing page to go back and change slot.</en></lang>
  if (outcome.kind === 'failure') {
    bookingPhase.value = 'conflict';
    return outcome;
  }

  // <lang><zh-CN>confirmed record 追加为新数组，避免外部持有旧数组后变更 store。</zh-CN><en>Append confirmed record as new array, avoiding external mutation of store through an old array.</en></lang>
  reservations.value = [...reservations.value, outcome.reservation];
  lastConfirmedReservation.value = { ...outcome.reservation };
  bookingPhase.value = 'confirmed';
  return outcome;
}

/**
 * <lang><zh-CN>取消一个当前运行时的已确认示例预约。</zh-CN><en>Cancels one confirmed demo reservation in the current runtime.</en></lang>
 * @param {string} reservationId <lang><zh-CN>页面从已呈现预约记录取得的有限预约 ID。</zh-CN><en>Finite reservation ID obtained by a page from a displayed reservation record.</en></lang>
 * @returns {object} <lang><zh-CN>取消后的记录，或不泄漏集合信息的失败。</zh-CN><en>Cancelled record or a failure that leaks no collection information.</en></lang>
 * @lang zh-CN 这是已由页面二次确认后调用的 local mock write；不执行远端撤销、退款、库存释放或 storage 写入。
 * @lang en This is a local mock write invoked after page-side second confirmation; it performs no remote revocation, refund, inventory release, or storage write.
 */
export function cancelLocalReservation(reservationId) {
  // <lang><zh-CN>只接受字符串 ID，避免模板或未知对象触发集合遍历或隐式序列化。</zh-CN><en>Accept only a string ID, preventing a template or unknown object from triggering collection traversal or implicit serialization.</en></lang>
  const reservationIndex = typeof reservationId === 'string'
    ? reservations.value.findIndex((reservation) => reservation.id === reservationId && reservation.status === 'confirmed')
    : -1;

  // <lang><zh-CN>未找到可取消记录时返回固定冲突结果，不回显传入 ID 或其他预约。</zh-CN><en>Return a fixed conflict result when no cancellable record exists, echoing neither the supplied ID nor other reservations.</en></lang>
  if (reservationIndex === -1) {
    return {
      kind: 'failure',
      code: 'conflict',
      message: { 'zh-Hans': '该示例预约已不可取消。', en: 'This demo reservation can no longer be cancelled.' },
      retryable: false,
      scope: 'booking'
    };
  }

  // <lang><zh-CN>创建新数组与新记录，保留已取消历史以让示例明确展示状态，而非伪装为删除。</zh-CN><en>Create a new array and record, retaining cancelled history so the demo explicitly shows state instead of pretending a deletion.</en></lang>
  const cancelledReservation = { ...reservations.value[reservationIndex], status: 'cancelled' };
  reservations.value = reservations.value.map((reservation, index) => index === reservationIndex ? cancelledReservation : reservation);

  // <lang><zh-CN>返回脱离 store 的浅复制，让页面只消费当前取消结果。</zh-CN><en>Return a shallow copy detached from the store, letting the page consume only the current cancellation result.</en></lang>
  return { kind: 'cancelled', reservation: { ...cancelledReservation } };
}

/**
 * <lang><zh-CN>读取 BP 页面可消费的只读状态 surface。</zh-CN><en>Reads the readonly state surface consumable by BP pages.</en></lang>
 * @returns {object} <lang><zh-CN>有限 reactive state 与明确 actions。</zh-CN><en>Finite reactive state and explicit actions.</en></lang>
 * @lang zh-CN 只读包装阻止页面直接改写集合；所有变更都走上方已注释的 action。
 * @lang en Readonly wrapping prevents pages directly mutating collections; every change uses the documented action above.
 */
export function useBookingDemo() {
  // <lang><zh-CN>返回单一明确 surface，不暴露 request handles、dataset 或 provider host。</zh-CN><en>Return a single explicit surface and expose no request handle, dataset, or provider host.</en></lang>
  return {
    catalogEntries: readonly(catalogEntries),
    catalogPhase: readonly(catalogPhase),
    catalogKeyword: readonly(catalogKeyword),
    catalogPaging: readonly(catalogPaging),
    catalogSource: readonly(catalogSource),
    catalogFailure: readonly(catalogFailure),
    canLoadMore: readonly(canLoadMore),
    selectedDetail: readonly(selectedDetail),
    detailPhase: readonly(detailPhase),
    detailFailure: readonly(detailFailure),
    reservations: readonly(reservations),
    reservationCards: readonly(reservationCards),
    bookingPhase: readonly(bookingPhase),
    lastConfirmedReservation: readonly(lastConfirmedReservation),
    refreshCatalog,
    loadNextCatalogPage,
    loadResourceDetail,
    confirmLocalReservation,
    cancelLocalReservation
  };
}
