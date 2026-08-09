/**
 * <lang><zh-CN>BP 的进程内 demo 状态：协调 local catalog/detail 请求和 mock 预约记录，不写入 storage、网络、用户身份或跨会话数据。</zh-CN><en>In-process demo state for the BP: coordinates local catalog/detail requests and mock reservation records without writing storage, network, user identity, or cross-session data.</en></lang>
 * @lang zh-CN 状态只服务已确认页面 flow；它不是通用 store、真实数据同步层或后台领域模型。
 * @lang en State serves only confirmed page flows; it is not a general store, real data-sync layer, or back-office domain model.
 */

// <lang><zh-CN>使用 Vue 最小 reactive primitives，不安装 global store plugin 或持久化插件。</zh-CN><en>Use minimum Vue reactive primitives and install no global-store or persistence plugin.</en></lang>
import { computed, readonly, ref } from 'vue';

// <lang><zh-CN>导入 local-first read provider、Biz write adapter 与版本化 domain 常量；三者均不连接后端。</zh-CN><en>Import local-first read provider, Biz write adapter, and versioned domain constant; none connects to a backend.</en></lang>
import {
  startLocalCatalogQuery,
  startLocalResourceDetailQuery
} from '../services/local-project-provider.mjs';
import {
  startLocalReservationWrite
} from '../services/local-reservation-write-provider.mjs';
import {
  BOOKING_DOMAIN_VERSION,
  createLocalCatalogFilterOptions
} from '../domain/booking-domain.mjs';
import localDataset from '../data/venues.json' with { type: 'json' };

/**
 * <lang><zh-CN>目录每页固定展示数量。</zh-CN><en>Fixed number of catalog entries per page.</en></lang>
 * @lang zh-CN 数量与 local domain 的安全上限相容，既支持触底追加，也让显式页次在小样本中可观察。
 * @lang en The count is compatible with local-domain safety cap, supporting reach-bottom append while keeping explicit page state observable in small fixtures.
 */
const CATALOG_PAGE_SIZE = 2;

/**
 * <lang><zh-CN>没有筛选条件时使用的固定 catalog filter 形状。</zh-CN><en>Fixed catalog-filter shape used when no filtering condition applies.</en></lang>
 * @lang zh-CN 空字符串只表达“未选择”；它不代表任意条件、全部字段匹配或隐藏的默认排序。
 * @lang en An empty string expresses only “not selected”; it represents neither an arbitrary condition, all-field matching, nor hidden default sorting.
 */
const DEFAULT_CATALOG_FILTERS = Object.freeze({ venueId: '', resourceTypeId: '', date: '' });

/**
 * <lang><zh-CN>从同一静态 dataset 生成页面可读的有限筛选选项。</zh-CN><en>Generates the finite filter options readable by pages from the same static dataset.</en></lang>
 * @lang zh-CN state 只公开 detached option value，不公开 dataset 本体或其可写引用。
 * @lang en State exposes only detached option values and exposes neither the dataset itself nor a writable reference to it.
 */
const catalogFilterOptions = createLocalCatalogFilterOptions(localDataset);

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
 * <lang><zh-CN>当前预约 write 的可取消 handle。</zh-CN><en>Cancellable handle of the current reservation write.</en></lang>
 * @lang zh-CN 单一 handle 防止同一 runtime 内并发 create/cancel/reschedule 绕过 provider 的有界 receipt 语义；页面可在显式确认后发起取消或改期。
 * @lang en A single handle prevents concurrent create/cancel/reschedule in one runtime from bypassing provider's bounded receipt semantics; pages can start cancellation or reschedule after explicit confirmation.
 */
let activeReservationWriteHandle = null;

/**
 * <lang><zh-CN>下一个进程内预约 command 的递增序号。</zh-CN><en>Incrementing ordinal of the next in-process reservation command.</en></lang>
 * @lang zh-CN 序号只构成当前刷新周期内的 idempotency key 片段，不是订单号、身份、时间戳或持久化计数器。
 * @lang en The ordinal is only part of an idempotency key for current refresh cycle, not an order number, identity, timestamp, or persistent counter.
 */
let nextReservationCommandOrdinal = 1;

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
 * <lang><zh-CN>当前 catalog 已提交的固定筛选条件。</zh-CN><en>Current fixed filter conditions committed to the catalog.</en></lang>
 * @lang zh-CN 条件只在用户明确搜索、清除或改变 selector 时更新；下一页始终重用同一组值。
 * @lang en Conditions update only when a user explicitly searches, clears, or changes a selector; later pages always reuse the same values.
 */
const catalogFilters = ref({ ...DEFAULT_CATALOG_FILTERS });

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
 * <lang><zh-CN>从资源详情进入确认页前的受限本地预约草稿。</zh-CN><en>Bounded local booking draft held before moving from resource detail to confirmation.</en></lang>
 * @lang zh-CN 草稿只包含 provider-read 资源 ID 及已声明的日期/时段；它不含用户、价格、支付、token 或持久化数据。
 * @lang en The draft contains only provider-read resource ID and declared date/slot; it has no user, price, payment, token, or persistent data.
 */
const bookingDraft = ref(null);

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
 * <lang><zh-CN>最近一次预约 write 的受限失败。</zh-CN><en>Bounded failure of the most recent reservation write.</en></lang>
 * @lang zh-CN 失败可被确认页或预约页显示；它不保存 command、provider exception、source map 或用户资料。
 * @lang en Failure may be displayed by confirmation or reservation page; it stores no command, provider exception, source map, or user information.
 */
const bookingWriteFailure = ref(null);

/**
 * <lang><zh-CN>最近确认的预约记录。</zh-CN><en>Most recently confirmed reservation record.</en></lang>
 * @lang zh-CN 用于确认结果页面；不会存储联系人、手机号、支付信息或真实身份。
 * @lang en Used by confirmation result page and stores no contact, phone, payment information, or real identity.
 */
const lastConfirmedReservation = ref(null);

/**
 * <lang><zh-CN>供预约列表、详情和受控改期页呈现的最小预约视图集合。</zh-CN><en>Minimum reservation-view collection for list, detail, and controlled-reschedule pages.</en></lang>
 * @lang zh-CN 视图只补充 local JSON 中已有的双语 venue/resource、静态图片 ID 与声明可用性；页面必须通过 runtime locale 投影它们，不读取或推断联系人、价格、支付或身份资料。
 * @lang en Views add only existing bilingual venue/resource, static image ID, and declared availability from local JSON; pages must project them through runtime locale and read or infer no contact, price, payment, or identity detail.
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
    venueId: reservation.venueId,
    resourceId: reservation.resourceId,
    venueImageId: venue?.imageId ?? '',
    venueName: venue?.name ?? { 'zh-Hans': '示例场馆', en: 'Demo venue' },
    resourceName: resource?.name ?? { 'zh-Hans': '示例资源', en: 'Demo resource' },
    availableDates: resource ? [...resource.availableDates] : [],
    availableSlots: resource ? [...resource.availableSlots] : []
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
 * <lang><zh-CN>将页面提交的候选筛选收敛为唯一允许进入 local provider 的固定形状。</zh-CN><en>Narrows candidate page filters to the sole fixed shape allowed to enter the local provider.</en></lang>
 * @param {unknown} filters <lang><zh-CN>页面给出的候选筛选对象。</zh-CN><en>Candidate filter object supplied by a page.</en></lang>
 * @returns {object} <lang><zh-CN>只含三个字符串值的 detached filter record。</zh-CN><en>A detached filter record containing only three string values.</en></lang>
 * @lang zh-CN 未知对象、数组、对象字段或表达式不会进入 provider；无效字段确定性降级为未选择。
 * @lang en Unknown objects, arrays, object fields, or expressions enter no provider; an invalid field deterministically degrades to not selected.
 */
function normalizeCatalogFilters(filters) {
  // <lang><zh-CN>只接受非数组对象作为候选，其他形状不能提供可读取的筛选字段。</zh-CN><en>Accept only a non-array object as the candidate because other shapes provide no readable filter fields.</en></lang>
  const candidate = typeof filters === 'object' && filters !== null && !Array.isArray(filters) ? filters : DEFAULT_CATALOG_FILTERS;

  // <lang><zh-CN>逐项保留字符串并 trim；未知类型回退空字符串，不进行隐式序列化。</zh-CN><en>Retain and trim strings item by item; unknown types fall back to empty strings without implicit serialization.</en></lang>
  const venueId = typeof candidate.venueId === 'string' ? candidate.venueId.trim() : '';
  const resourceTypeId = typeof candidate.resourceTypeId === 'string' ? candidate.resourceTypeId.trim() : '';
  const date = typeof candidate.date === 'string' ? candidate.date.trim() : '';

  // <lang><zh-CN>返回独立对象，避免后续页面修改传入对象改变已提交查询。</zh-CN><en>Return an independent object so later page mutations cannot alter the committed query.</en></lang>
  return { venueId, resourceTypeId, date };
}

/**
 * <lang><zh-CN>加载或刷新目录页。</zh-CN><en>Loads or refreshes a catalog page.</en></lang>
 * @param {object} options <lang><zh-CN>请求模式、关键字和固定筛选。</zh-CN><en>Request mode, keyword, and fixed filters.</en></lang>
 * @param {boolean} options.append <lang><zh-CN>是否追加下一页。</zh-CN><en>Whether to append the next page.</en></lang>
 * @param {string} options.keyword <lang><zh-CN>明确输入的关键字。</zh-CN><en>Explicitly entered keyword.</en></lang>
 * @param {unknown} options.filters <lang><zh-CN>候选场馆、类型和日期筛选。</zh-CN><en>Candidate venue, type, and date filters.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>页面状态稳定后 resolve。</zh-CN><en>Resolves after page state stabilizes.</en></lang>
 * @lang zh-CN 不等待或暴露 provider exception；所有结果先经 async runtime/project adapter 的受限 terminal mapping。
 * @lang en Does not await or expose provider exception; every result first crosses bounded terminal mapping of async runtime/project adapter.
 */
async function loadCatalog({ append, keyword, filters }) {
  // <lang><zh-CN>非追加操作替换 page=1；追加只在已有已知下一页时前进一页。</zh-CN><en>Non-append operation replaces page one; append advances one page only when a next page is already known.</en></lang>
  const requestedPage = append ? catalogPaging.value.page + 1 : 1;

  // <lang><zh-CN>无需 append 时立即返回，避免触底重复调用改变加载/错误状态。</zh-CN><en>Return immediately when append is unnecessary, avoiding repeated reach-bottom calls changing load/error state.</en></lang>
  if (append && !canLoadMore.value) {
    return;
  }

  // <lang><zh-CN>刷新时规范化新筛选，追加时只使用已提交值，避免 page 间混入未提交草稿。</zh-CN><en>Normalize new filters on refresh and use only committed values on append, preventing an unsubmitted draft from mixing across pages.</en></lang>
  const requestedFilters = append ? catalogFilters.value : normalizeCatalogFilters(filters);

  // <lang><zh-CN>取消先前尚未结束的读取请求；新 request 的结果由当前 call 自己拥有。</zh-CN><en>Request cancellation of prior unfinished read; result of new request is owned by current call itself.</en></lang>
  activeCatalogHandle?.cancel();

  // <lang><zh-CN>新搜索/刷新会立即更新 keyword 与筛选；append 保留上次已确认的完整查询。</zh-CN><en>New search/refresh updates keyword and filters; append retains the last confirmed complete query.</en></lang>
  if (!append) {
    catalogKeyword.value = keyword;
    catalogFilters.value = { ...requestedFilters };
  }

  // <lang><zh-CN>首次/刷新使用 loading，追加使用 appending，使列表在后者失败时保持可读。</zh-CN><en>Initial/refresh uses loading while append uses appending, keeping list readable when the latter fails.</en></lang>
  catalogPhase.value = append ? 'appending' : 'loading';

  // <lang><zh-CN>新请求开始前清除旧 failure，但不在 append 时清空已有 entries。</zh-CN><en>Clear old failure before new request but do not clear existing entries during append.</en></lang>
  catalogFailure.value = null;

  // <lang><zh-CN>从 explicit local provider 获取可取消 handle，输入只含有限 paging/keyword/filter 值。</zh-CN><en>Obtain cancellable handle from explicit local provider; input contains only finite paging/keyword/filter values.</en></lang>
  const requestHandle = startLocalCatalogQuery(requestedPage, CATALOG_PAGE_SIZE, catalogKeyword.value, requestedFilters);

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
 * @param {unknown} [filters] <lang><zh-CN>候选场馆、类型和日期筛选。</zh-CN><en>Candidate venue, type, and date filters.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>目录稳定后 resolve。</zh-CN><en>Resolves after catalog stabilizes.</en></lang>
 * @lang zh-CN 此操作对应筛选/下拉刷新，始终替换 page=1，而不混入当前追加页。
 * @lang en This operation corresponds to filter/pull refresh and always replaces page one without mixing current appended page.
 */
export function refreshCatalog(keyword = catalogKeyword.value, filters = DEFAULT_CATALOG_FILTERS) {
  // <lang><zh-CN>委托唯一 load helper，保持 loading、取消和 failure 语义一致。</zh-CN><en>Delegate to the sole load helper, keeping loading, cancellation, and failure semantics consistent.</en></lang>
  return loadCatalog({ append: false, keyword, filters });
}

/**
 * <lang><zh-CN>显式追加目录下一页。</zh-CN><en>Explicitly appends next catalog page.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>追加完成或无需追加后 resolve。</zh-CN><en>Resolves after append completes or is unnecessary.</en></lang>
 * @lang zh-CN 页面只能在触底时调用；组件自身不监听滚动或主动请求。
 * @lang en A page may call this only at reach-bottom; the component itself listens to no scroll and proactively requests nothing.
 */
export function loadNextCatalogPage() {
  // <lang><zh-CN>保留当前 keyword 与筛选，使后续 page 保持同一明确查询条件。</zh-CN><en>Retain current keyword and filters so later pages keep the same explicit query condition.</en></lang>
  return loadCatalog({ append: true, keyword: catalogKeyword.value, filters: catalogFilters.value });
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

  // <lang><zh-CN>新详情读取使旧资源的预约草稿失效，避免确认页跨资源复用日期或时段。</zh-CN><en>A new detail read invalidates an old resource’s booking draft, preventing confirmation from reusing date or slot across resources.</en></lang>
  bookingDraft.value = null;

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
 * <lang><zh-CN>为当前已加载资源准备一个受限的本地预约草稿。</zh-CN><en>Prepares a bounded local booking draft for the currently loaded resource.</en></lang>
 * @param {string} date <lang><zh-CN>详情页已选择的 ISO 日期。</zh-CN><en>ISO date selected on the detail page.</en></lang>
 * @param {string} time <lang><zh-CN>详情页已选择的已声明时段。</zh-CN><en>Declared slot selected on the detail page.</en></lang>
 * @returns {object} <lang><zh-CN>selection-ready 或 bounded failure outcome。</zh-CN><en>A selection-ready or bounded failure outcome.</en></lang>
 * @lang zh-CN 本 action 只建立进程内页面流草稿，不发起 Biz write、网络、storage、预约 mutation 或身份处理。
 * @lang en This action creates only an in-process page-flow draft and starts no Biz write, network, storage, reservation mutation, or identity handling.
 */
export function prepareLocalBooking(date, time) {
  // <lang><zh-CN>草稿只能关联当前 ready detail；不能由路由参数或旧页面字段构造。</zh-CN><en>A draft can associate only with current ready detail and cannot be constructed from route parameters or stale page fields.</en></lang>
  const detail = selectedDetail.value;

  // <lang><zh-CN>日期和时段均必须来自当前资源的明确 allowlist。</zh-CN><en>Both date and slot must come from explicit allowlists of current resource.</en></lang>
  const hasAvailableDate = detail?.kind === 'detail' && detail.resource.availableDates.includes(date);
  const hasAvailableSlot = detail?.kind === 'detail' && detail.resource.availableSlots.includes(time);

  // <lang><zh-CN>无详情或未知选择不会保留旧草稿，并以受限失败留在详情页处理。</zh-CN><en>No detail or unknown selection retains no old draft and returns a bounded failure for the detail page to handle.</en></lang>
  if (!hasAvailableDate || !hasAvailableSlot) {
    bookingDraft.value = null;
    return createStateBookingFailure('conflict', '请选择当前资源已声明的日期和时段。', 'Choose a date and time declared for the current resource.');
  }

  // <lang><zh-CN>只复制进入确认页必要的稳定 ID 与原始值，避免 draft 携带完整详情或 UI event。</zh-CN><en>Copy only stable ID and primitives needed by confirmation, preventing the draft from carrying full detail or a UI event.</en></lang>
  bookingDraft.value = { resourceId: detail.resource.id, date, time };

  // <lang><zh-CN>返回新的 plain-data outcome，页面据此执行本地导航而不把 draft 自身写进 route。</zh-CN><en>Return a new plain-data outcome so the page performs local navigation without writing the draft itself into a route.</en></lang>
  return { contractVersion: BOOKING_DOMAIN_VERSION, kind: 'selection-ready', selection: { ...bookingDraft.value } };
}

/**
 * <lang><zh-CN>创建项目 state 自有的受限预约失败。</zh-CN><en>Creates a bounded booking failure owned by project state.</en></lang>
 * @param {string} code <lang><zh-CN>稳定 failure code。</zh-CN><en>Stable failure code.</en></lang>
 * @param {string} zhHans <lang><zh-CN>简体中文文案。</zh-CN><en>Simplified-Chinese copy.</en></lang>
 * @param {string} en <lang><zh-CN>English 文案。</zh-CN><en>English copy.</en></lang>
 * @returns {object} <lang><zh-CN>不包含输入或内部实现的 failure。</zh-CN><en>A failure containing no input or internal implementation.</en></lang>
 * @lang zh-CN 此 helper 仅覆盖写入尚未开始或 state 不变量失效；真正 mutation 的成功/失败由 Biz write adapter 给出。
 * @lang en This helper covers only a write not yet started or state-invariant failure; success/failure of actual mutation comes from Biz write adapter.
 */
function createStateBookingFailure(code, zhHans, en) {
  // <lang><zh-CN>返回统一双语 plain-data failure，供任一页面通过 runtime locale 投影。</zh-CN><en>Return unified bilingual plain-data failure for any page to project through runtime locale.</en></lang>
  return {
    contractVersion: BOOKING_DOMAIN_VERSION,
    kind: 'failure',
    code,
    message: { 'zh-Hans': zhHans, en },
    retryable: false,
    scope: 'booking'
  };
}

/**
 * <lang><zh-CN>创建当前进程内下一条预约 command 的稳定 ID。</zh-CN><en>Creates stable ID of the next in-process reservation command.</en></lang>
 * @returns {string} <lang><zh-CN>符合 write adapter allowlist 的 command ID。</zh-CN><en>A command ID conforming to write-adapter allowlist.</en></lang>
 * @lang zh-CN ID 只使当前 client 的重复 invocation 可重放；不投影到用户界面或持久化数据。
 * @lang en The ID only makes repeated invocation of current client replayable; it is not projected to UI or persistent data.
 */
function createNextReservationCommandId() {
  // <lang><zh-CN>先读取当前 ordinal，再递增以确保一个 state action 只创建一个有限 command ID。</zh-CN><en>Read current ordinal then increment it so one state action creates only one finite command ID.</en></lang>
  const commandId = `booking-command-${String(nextReservationCommandOrdinal).padStart(3, '0')}`;
  nextReservationCommandOrdinal += 1;

  // <lang><zh-CN>返回仅含受控 ASCII 的 in-process ID。</zh-CN><en>Return an in-process ID containing only controlled ASCII.</en></lang>
  return commandId;
}

/**
 * <lang><zh-CN>采用 Biz write adapter 已确认的完整预约 snapshot。</zh-CN><en>Adopts the complete reservation snapshot confirmed by Biz write adapter.</en></lang>
 * @param {object} outcome <lang><zh-CN>adapter 的 canonical success outcome。</zh-CN><en>Canonical success outcome from adapter.</en></lang>
 * @returns {boolean} <lang><zh-CN>snapshot 是否可安全采用。</zh-CN><en>Whether snapshot may be safely adopted.</en></lang>
 * @lang zh-CN state 绝不根据页面输入、旧数组或局部 patch 自行推导 mutation；只有 provider 交付的完整 snapshot 可替换它。
 * @lang en State derives no mutation from page input, old array, or local patch; only a complete provider-delivered snapshot may replace it.
 */
function adoptReservationSnapshot(outcome) {
  // <lang><zh-CN>先确认返回包含数组，防止 malformed success 覆盖现有可见预约。</zh-CN><en>Confirm an array exists first, preventing malformed success from overwriting visible reservations.</en></lang>
  if (!Array.isArray(outcome?.reservations)) {
    // <lang><zh-CN>保持原 state，交由调用方产生有界失败。</zh-CN><en>Retain original state and let caller produce bounded failure.</en></lang>
    return false;
  }

  // <lang><zh-CN>JSON 复制隔离 adapter outcome，页面无法通过结果引用回写 provider snapshot。</zh-CN><en>JSON-copy adapter outcome so pages cannot write back to provider snapshot through result reference.</en></lang>
  reservations.value = JSON.parse(JSON.stringify(outcome.reservations));

  // <lang><zh-CN>明确返回采用成功。</zh-CN><en>Explicitly return successful adoption.</en></lang>
  return true;
}

/**
 * <lang><zh-CN>通过唯一 Biz write adapter 提交一条预约 command。</zh-CN><en>Submits one reservation command through the sole Biz write adapter.</en></lang>
 * @param {object} command <lang><zh-CN>state 构造的有限 plain-data command。</zh-CN><en>Finite plain-data command constructed by state.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>canonical outcome 或受限并发失败。</zh-CN><en>A canonical outcome or bounded concurrency failure.</en></lang>
 * @lang zh-CN 同一时刻只允许一个 write；这避免页面双击把不同 command ID 误作为两笔可接受的独立写入。
 * @lang en Only one write is allowed at a time; this prevents page double click from treating different command IDs as two acceptable independent writes.
 */
async function submitReservationWrite(command) {
  // <lang><zh-CN>已有 write 未完成时不创建第二个 provider invocation 或命令。</zh-CN><en>When a write is pending, create no second provider invocation or command.</en></lang>
  if (activeReservationWriteHandle) {
    // <lang><zh-CN>返回可发现冲突，状态和 provider snapshot 均不改变。</zh-CN><en>Return a discoverable conflict and change neither state nor provider snapshot.</en></lang>
    return createStateBookingFailure('conflict', '正在处理上一项示例预约操作，请稍候。', 'The previous demo booking operation is still being processed.');
  }

  // <lang><zh-CN>启动已锁定 Biz runtime 的唯一 write seam，state 不直接运行 domain mutation。</zh-CN><en>Start the sole write seam of locked Biz runtime; state runs no domain mutation directly.</en></lang>
  const requestHandle = startLocalReservationWrite(command);

  // <lang><zh-CN>保留私有 handle，仅用于防止并发提交；不暴露给模板或 storage。</zh-CN><en>Retain private handle only to prevent concurrent submit; expose it to neither template nor storage.</en></lang>
  activeReservationWriteHandle = requestHandle;

  // <lang><zh-CN>等待 runtime 永不 reject 的 mapped terminal outcome。</zh-CN><en>Await mapped terminal outcome that runtime never rejects.</en></lang>
  const outcome = await requestHandle.promise;

  // <lang><zh-CN>完成后清理当前 handle，使下一条用户显式操作可启动新的 command。</zh-CN><en>Clear current handle after completion so next explicit user action may start a new command.</en></lang>
  activeReservationWriteHandle = null;

  // <lang><zh-CN>将受限 outcome 原样交回 action；只有 action 决定对应页面 phase 和 snapshot adoption。</zh-CN><en>Return bounded outcome unchanged to action; only action decides page phase and snapshot adoption.</en></lang>
  return outcome;
}

/**
 * <lang><zh-CN>确认当前 selected detail 的 local 示例预约。</zh-CN><en>Confirms a local demo reservation for current selected detail.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>Biz write adapter 的 confirmed 或 bounded failure outcome。</zh-CN><en>Confirmed or bounded failure outcome from Biz write adapter.</en></lang>
 * @lang zh-CN 创建只经 Biz write lifecycle 到达 local authority，且只消费详情页已验证的进程内草稿；它不调用远端 API、支付或 storage。
 * @lang en Creation reaches local authority only through Biz write lifecycle and consumes only an in-process draft validated by detail; it calls no remote API, payment, or storage.
 */
export async function confirmLocalReservation() {
  // <lang><zh-CN>读取当前 detail 与草稿；二者都必须存在且资源 ID 相同，不能从路由/隐藏状态构造 command。</zh-CN><en>Read current detail and draft; both must exist with matching resource IDs, and no command is constructed from route/hidden state.</en></lang>
  const detail = selectedDetail.value;
  const draft = bookingDraft.value;

  // <lang><zh-CN>任何草稿不变量缺失时 write 尚未开始，返回可恢复冲突并保留预约集合。</zh-CN><en>When any draft invariant is missing, write has not started; return a recoverable conflict and retain reservation collection.</en></lang>
  if (detail?.kind !== 'detail' || !draft || draft.resourceId !== detail.resource.id || !detail.resource.availableDates.includes(draft.date) || !detail.resource.availableSlots.includes(draft.time)) {
    // <lang><zh-CN>更新页面 phase 与受限 failure，不修改预约集合。</zh-CN><en>Update page phase and bounded failure without modifying reservation collection.</en></lang>
    const failure = createStateBookingFailure('conflict', '请先重新选择可预约资源。', 'Choose a bookable resource again first.');
    bookingPhase.value = 'conflict';
    bookingWriteFailure.value = failure;
    return failure;
  }

  // <lang><zh-CN>进入 submitting 只表示等待 Biz provider terminal outcome，不声称真实网络 transaction 已开始。</zh-CN><en>Entering submitting means only awaiting Biz-provider terminal outcome and does not claim a real network transaction started.</en></lang>
  bookingPhase.value = 'submitting';
  bookingWriteFailure.value = null;

  // <lang><zh-CN>从已验证草稿和 provider-read detail 提取有限原始值，命令不携带整份 detail 或页面对象。</zh-CN><en>Take finite primitives from validated draft and provider-read detail; command carries no complete detail or page object.</en></lang>
  const command = {
    commandId: createNextReservationCommandId(),
    operation: 'create',
    resourceId: detail.resource.id,
    date: draft.date,
    time: draft.time
  };

  // <lang><zh-CN>唯一 write helper 负责通过 Biz runtime 发送、隔离并等待 command。</zh-CN><en>The sole write helper sends, isolates, and awaits command through Biz runtime.</en></lang>
  const outcome = await submitReservationWrite(command);

  // <lang><zh-CN>business/provider failure 不采用 snapshot；确认页可保持当前选择并给出恢复提示。</zh-CN><en>On business/provider failure adopt no snapshot; confirmation page retains current selection and can show recovery guidance.</en></lang>
  if (outcome.kind === 'failure') {
    // <lang><zh-CN>固定 conflict phase 并保留失败给其他可见 surface。</zh-CN><en>Fix conflict phase and retain failure for other visible surfaces.</en></lang>
    bookingPhase.value = 'conflict';
    bookingWriteFailure.value = outcome;
    return outcome;
  }

  // <lang><zh-CN>create 的成功 kind 必须为 confirmed 且必须携带完整 snapshot。</zh-CN><en>Successful create kind must be confirmed and must carry a complete snapshot.</en></lang>
  if (outcome.kind !== 'confirmed' || !adoptReservationSnapshot(outcome)) {
    // <lang><zh-CN>阻断 malformed success，防止 state 把不完整 provider value 当成预约已创建。</zh-CN><en>Block malformed success, preventing state from treating incomplete provider value as a created booking.</en></lang>
    const failure = createStateBookingFailure('provider-unavailable', '示例预约状态暂时不可用，请查看当前预约列表。', 'Demo booking state is temporarily unavailable; review the current booking list.');
    bookingPhase.value = 'conflict';
    bookingWriteFailure.value = failure;
    return failure;
  }

  // <lang><zh-CN>仅在 canonical snapshot 已采用后保存 detached last confirmed record。</zh-CN><en>Save detached last-confirmed record only after canonical snapshot has been adopted.</en></lang>
  lastConfirmedReservation.value = { ...outcome.reservation };
  bookingPhase.value = 'confirmed';
  bookingWriteFailure.value = null;
  return outcome;
}

/**
 * <lang><zh-CN>取消一个当前运行时的已确认示例预约。</zh-CN><en>Cancels one confirmed demo reservation in the current runtime.</en></lang>
 * @param {string} reservationId <lang><zh-CN>页面从已呈现预约记录取得的有限预约 ID。</zh-CN><en>Finite reservation ID obtained by a page from a displayed reservation record.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>Biz write adapter 的 cancelled 或 bounded failure outcome。</zh-CN><en>Cancelled or bounded failure outcome from Biz write adapter.</en></lang>
 * @lang zh-CN 页面二次确认后只调用此 action；它不执行远端撤销、退款、库存释放或 storage 写入。
 * @lang en A page calls this action only after second confirmation; it performs no remote revocation, refund, inventory release, or storage write.
 */
export async function cancelLocalReservation(reservationId) {
  // <lang><zh-CN>构造固定 cancel command，不在 state 直接遍历或改写预约集合。</zh-CN><en>Construct fixed cancel command and neither traverse nor mutate reservation collection in state directly.</en></lang>
  const command = {
    commandId: createNextReservationCommandId(),
    operation: 'cancel',
    reservationId
  };

  // <lang><zh-CN>等待唯一 Biz write boundary 的 canonical outcome。</zh-CN><en>Await canonical outcome of sole Biz write boundary.</en></lang>
  const outcome = await submitReservationWrite(command);

  // <lang><zh-CN>失败保留原集合并保存可发现失败。</zh-CN><en>On failure retain original collection and store discoverable failure.</en></lang>
  if (outcome.kind === 'failure') {
    // <lang><zh-CN>页面可显示 outcome，而不伪称取消已经回退或成功。</zh-CN><en>Page may display outcome without claiming cancellation rolled back or succeeded.</en></lang>
    bookingWriteFailure.value = outcome;
    return outcome;
  }

  // <lang><zh-CN>cancel 的成功 kind 必须含完整 snapshot；否则不改变 state。</zh-CN><en>Successful cancel kind must contain complete snapshot; otherwise change no state.</en></lang>
  if (outcome.kind !== 'cancelled' || !adoptReservationSnapshot(outcome)) {
    // <lang><zh-CN>将内部不变量失效转为 bounded provider failure。</zh-CN><en>Turn internal invariant failure into bounded provider failure.</en></lang>
    const failure = createStateBookingFailure('provider-unavailable', '示例预约状态暂时不可用，请查看当前预约列表。', 'Demo booking state is temporarily unavailable; review the current booking list.');
    bookingWriteFailure.value = failure;
    return failure;
  }

  // <lang><zh-CN>成功后清除旧失败，已取消历史由 adopted snapshot 保留。</zh-CN><en>Clear old failure on success; adopted snapshot retains cancellation history.</en></lang>
  bookingWriteFailure.value = null;
  return outcome;
}

/**
 * <lang><zh-CN>以“取消旧预约后创建新预约”的语义改期一个示例预约。</zh-CN><en>Reschedules one demo reservation with semantics of cancel old reservation then create new reservation.</en></lang>
 * @param {string} reservationId <lang><zh-CN>当前 confirmed 预约 ID。</zh-CN><en>Current confirmed reservation ID.</en></lang>
 * @param {string} date <lang><zh-CN>新的有限 ISO 日期。</zh-CN><en>New finite ISO date.</en></lang>
 * @param {string} time <lang><zh-CN>新的已声明时段。</zh-CN><en>New declared slot.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>rescheduled 或 bounded failure outcome。</zh-CN><en>Rescheduled or bounded failure outcome.</en></lang>
 * @lang zh-CN 预约详情页已在显式入口后调用此 action；它仍不能被页面 CSS 或直接 mutation 替代。
 * @lang en Reservation Detail now calls this action after an explicit entry; it still cannot be replaced by page CSS or direct mutation.
 */
export async function rescheduleLocalReservation(reservationId, date, time) {
  // <lang><zh-CN>构造唯一有限 reschedule command，资源从旧记录由 adapter 决定而非页面输入。</zh-CN><en>Construct the sole finite reschedule command; adapter determines resource from old record rather than page input.</en></lang>
  const command = {
    commandId: createNextReservationCommandId(),
    operation: 'reschedule',
    reservationId,
    date,
    time
  };

  // <lang><zh-CN>等待固定 local authority 的 Biz write terminal outcome。</zh-CN><en>Await Biz write terminal outcome of fixed local authority.</en></lang>
  const outcome = await submitReservationWrite(command);

  // <lang><zh-CN>failure 不改变 state，避免将未知/冲突误显示为旧预约已取消。</zh-CN><en>Failure changes no state, avoiding display of unknown/conflict as if old reservation had been cancelled.</en></lang>
  if (outcome.kind === 'failure') {
    // <lang><zh-CN>保存失败，等待后续 UI 显式投影恢复路径。</zh-CN><en>Store failure and await later UI to explicitly project recovery path.</en></lang>
    bookingWriteFailure.value = outcome;
    return outcome;
  }

  // <lang><zh-CN>reschedule 的成功必须同时提供旧取消和新确认后的完整 snapshot。</zh-CN><en>Successful reschedule must provide complete snapshot after old cancellation and new confirmation.</en></lang>
  if (outcome.kind !== 'rescheduled' || !adoptReservationSnapshot(outcome)) {
    // <lang><zh-CN>不变量不满足时保持原 state 并给出受限 failure。</zh-CN><en>When invariant is unmet retain original state and provide bounded failure.</en></lang>
    const failure = createStateBookingFailure('provider-unavailable', '示例预约状态暂时不可用，请查看当前预约列表。', 'Demo booking state is temporarily unavailable; review the current booking list.');
    bookingWriteFailure.value = failure;
    return failure;
  }

  // <lang><zh-CN>记录新 confirmed record，旧 cancelled record 已留在 snapshot 中供状态追溯。</zh-CN><en>Record new confirmed record; old cancelled record remains in snapshot for status traceability.</en></lang>
  lastConfirmedReservation.value = { ...outcome.reservation };
  bookingWriteFailure.value = null;
  return outcome;
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
    catalogFilters: readonly(catalogFilters),
    catalogFilterOptions,
    catalogPaging: readonly(catalogPaging),
    catalogSource: readonly(catalogSource),
    catalogFailure: readonly(catalogFailure),
    canLoadMore: readonly(canLoadMore),
    selectedDetail: readonly(selectedDetail),
    bookingDraft: readonly(bookingDraft),
    detailPhase: readonly(detailPhase),
    detailFailure: readonly(detailFailure),
    reservations: readonly(reservations),
    reservationCards: readonly(reservationCards),
    bookingPhase: readonly(bookingPhase),
    bookingWriteFailure: readonly(bookingWriteFailure),
    lastConfirmedReservation: readonly(lastConfirmedReservation),
    refreshCatalog,
    loadNextCatalogPage,
    loadResourceDetail,
    prepareLocalBooking,
    confirmLocalReservation,
    cancelLocalReservation,
    rescheduleLocalReservation
  };
}
