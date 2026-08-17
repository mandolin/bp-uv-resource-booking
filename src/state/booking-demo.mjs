/**
 * <lang><zh-CN>BP 的进程内 demo 状态：协调 local catalog/detail 请求和 mock 预约记录，不写入 storage、网络、用户身份或跨会话数据。</zh-CN><en>In-process demo state for the BP: coordinates local catalog/detail requests and mock reservation records without writing storage, network, user identity, or cross-session data.</en></lang>
 * @lang zh-CN 状态只服务已确认页面 flow；它不是通用 store、真实数据同步层或后台领域模型。
 * @lang en State serves only confirmed page flows; it is not a general store, real data-sync layer, or back-office domain model.
 */

// <lang><zh-CN>使用 Vue 最小 reactive primitives，不安装 global store plugin 或持久化插件。</zh-CN><en>Use minimum Vue reactive primitives and install no global-store or persistence plugin.</en></lang>
import { computed, readonly, ref } from 'vue';

// <lang><zh-CN>业务状态只导入 project-facing composition root 与稳定 domain 版本；它不读取 adapter、底层 runtime 或 local JSON。</zh-CN><en>Business state imports only the project-facing composition root and stable domain version; it reads no adapter, lower runtime, or local JSON.</en></lang>
import { resourceBookingProject } from '../project/resource-booking-project.mjs';
import { BOOKING_DOMAIN_VERSION } from '../domain/booking-domain.mjs';

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
 * <lang><zh-CN>没有可呈现目录 snapshot 时使用的固定分页事实。</zh-CN><en>Fixed pagination facts used when no displayable catalog snapshot exists.</en></lang>
 * @lang zh-CN scope 切换或无卡片重试会复制这份值，确保 loading 不继续声称旧页次、总数或下一页。
 * @lang en A scope change or cardless retry copies this value so loading cannot keep claiming a stale page, total, or next page.
 */
const EMPTY_CATALOG_PAGING = Object.freeze({ page: 0, pageSize: CATALOG_PAGE_SIZE, total: 0, hasNext: false });

/**
 * <lang><zh-CN>尚未产生 operation terminal 前使用的空 source fact。</zh-CN><en>Empty source fact used before an operation terminal exists.</en></lang>
 * @lang zh-CN null 只表示“尚无调用事实”；SourceBadge 会使用保守 local-safe 文案，真正调用完成后由 facade terminal 替换。
 * @lang en Null means only “no invocation fact yet”; SourceBadge uses conservative local-safe copy until a real facade terminal replaces it.
 */
const EMPTY_SOURCE_FACT = Object.freeze({ sourceId: null, authority: null, degradedReason: null });

/**
 * <lang><zh-CN>目录 operation 返回的有限筛选选项。</zh-CN><en>Finite filter options returned by the catalog operation.</en></lang>
 * @lang zh-CN 初始空集合不读取 dataset；首次成功 catalog terminal 会用 adapter-owned detached projection 替换它。
 * @lang en Initial empty collections read no dataset; the first successful catalog terminal replaces them with an adapter-owned detached projection.
 */
const catalogFilterOptions = ref({ venues: [], resourceTypes: [], dates: [] });

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
 * <lang><zh-CN>当前预约列表读取的可取消 project handle。</zh-CN><en>Cancellable project handle of the current reservation-list read.</en></lang>
 * @lang zh-CN 它只用于丢弃被替换的晚到结果，不暴露给页面、路由或 storage。
 * @lang en It serves only to discard replaced late results and is exposed to no page, route, or storage.
 */
let activeReservationReadHandle = null;

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
const catalogPaging = ref({ ...EMPTY_CATALOG_PAGING });

/**
 * <lang><zh-CN>可展示的当前 source metadata。</zh-CN><en>Current source metadata safe for display.</en></lang>
 * @lang zh-CN 当前只能为 local；字段保留为未来已审阅 source selector 的可发现性接口。
 * @lang en Current value can only be local; fields remain as discoverability interface for a future reviewed source selector.
 */
const catalogSource = ref({ ...EMPTY_SOURCE_FACT });

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
 * <lang><zh-CN>最近一次详情读取的实际 source fact。</zh-CN><en>Actual source fact of the most recent detail read.</en></lang>
 * @lang zh-CN 页面不再借用 catalog source；每种操作只呈现自身 terminal 的 authority 与降级事实。
 * @lang en Pages no longer borrow catalog source; each operation presents authority and degradation from its own terminal.
 */
const detailSource = ref({ ...EMPTY_SOURCE_FACT });

/**
 * <lang><zh-CN>当前运行时 demo 预约记录。</zh-CN><en>Current runtime demo reservation records.</en></lang>
 * @lang zh-CN 初始为空；显式 reservation.list 从 project adapter 取得完整 snapshot，后续 mutation 只留在当前内存。
 * @lang en Initially empty; explicit reservation.list obtains a complete snapshot from the project adapter, while later mutations remain only in current memory.
 */
const reservations = ref([]);

/**
 * <lang><zh-CN>供预约列表、详情和受控改期页呈现的 adapter-owned 预约卡投影。</zh-CN><en>Adapter-owned reservation-card projections for list, detail, and controlled-reschedule pages.</en></lang>
 * @lang zh-CN state 不再读取 local JSON 补充场馆或资源；list/write operation 必须交付完整 detached cards。
 * @lang en State no longer reads local JSON to enrich venue or resource data; list/write operations must deliver complete detached cards.
 */
const reservationCards = ref([]);

/**
 * <lang><zh-CN>预约列表读取的有限阶段。</zh-CN><en>Finite phase of reservation-list reading.</en></lang>
 * @lang zh-CN ready 只表示当前 project read 已确定完成，不表示真实库存或后端同步。
 * @lang en Ready means only that the current project read completed deterministically, not that live inventory or backend synchronization exists.
 */
const reservationPhase = ref('idle');

/**
 * <lang><zh-CN>最近一次 reservation.list 的受限失败。</zh-CN><en>Bounded failure of the most recent reservation.list operation.</en></lang>
 * @lang zh-CN 失败不清空已呈现 snapshot，并且不包含 request、adapter 异常或内部 source map。
 * @lang en Failure does not clear a displayed snapshot and contains no request, adapter exception, or internal source map.
 */
const reservationFailure = ref(null);

/**
 * <lang><zh-CN>最近一次 reservation.list 或成功 write 所确认的 source fact。</zh-CN><en>Source fact confirmed by the most recent reservation.list or successful write.</en></lang>
 * @lang zh-CN 该事实与预约卡同源，供列表、详情、改期与个人信息页使用。
 * @lang en This fact shares provenance with reservation cards and serves list, detail, reschedule, and profile pages.
 */
const reservationSource = ref({ ...EMPTY_SOURCE_FACT });

/**
 * <lang><zh-CN>最近一次预约 write terminal 的实际 source fact。</zh-CN><en>Actual source fact of the most recent reservation-write terminal.</en></lang>
 * @lang zh-CN success 与 failure 均可更新该受限事实，但它从不表示支付、库存或远端提交。
 * @lang en Both success and failure may update this bounded fact, but it never represents payment, inventory, or remote submission.
 */
const writeSource = ref({ ...EMPTY_SOURCE_FACT });

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
 * <lang><zh-CN>把候选关键字规范为 catalog scope 使用的稳定文本。</zh-CN><en>Normalizes a candidate keyword into stable text used by catalog scope.</en></lang>
 * @param {unknown} keyword <lang><zh-CN>页面传入的候选关键字。</zh-CN><en>Candidate keyword supplied by a page.</en></lang>
 * @returns {string} <lang><zh-CN>trim 后的有限文本或空字符串。</zh-CN><en>Trimmed finite text or an empty string.</en></lang>
 * @lang zh-CN 该规范化与 local domain 的空白语义一致；它不执行大小写折叠、表达式解析或隐式序列化。
 * @lang en This normalization matches the local domain's whitespace semantics; it performs no case folding, expression parsing, or implicit serialization.
 */
function normalizeCatalogKeyword(keyword) {
  // <lang><zh-CN>只接受字符串并删除边界空白，其他类型不能成为查询 scope。</zh-CN><en>Accept only a string and remove boundary whitespace; other types cannot become a query scope.</en></lang>
  return typeof keyword === 'string' ? keyword.trim() : '';
}

/**
 * <lang><zh-CN>判断候选关键字与筛选是否仍属于当前已提交 catalog scope。</zh-CN><en>Determines whether candidate keyword and filters remain in the committed catalog scope.</en></lang>
 * @param {string} keyword <lang><zh-CN>已规范化候选关键字。</zh-CN><en>Normalized candidate keyword.</en></lang>
 * @param {{venueId:string,resourceTypeId:string,date:string}} filters <lang><zh-CN>已规范化候选筛选。</zh-CN><en>Normalized candidate filters.</en></lang>
 * @returns {boolean} <lang><zh-CN>四项查询输入均与当前提交值相同时为 true。</zh-CN><en>True when all four query inputs equal their current committed values.</en></lang>
 * @lang zh-CN scope 比较只读取有限 plain values；它不依赖页面实例、请求 handle、结果数量或 source authority。
 * @lang en Scope comparison reads only finite plain values and depends on no page instance, request handle, result count, or source authority.
 */
function matchesCurrentCatalogScope(keyword, filters) {
  // <lang><zh-CN>严格比较规范化字段，避免 Discover 的旧筛选 snapshot 被首页空 scope 复用。</zh-CN><en>Strictly compare normalized fields so Home cannot reuse a Discover snapshot from an old filtered scope.</en></lang>
  return catalogKeyword.value === keyword
    && catalogFilters.value.venueId === filters.venueId
    && catalogFilters.value.resourceTypeId === filters.resourceTypeId
    && catalogFilters.value.date === filters.date;
}

/**
 * <lang><zh-CN>撤下不属于下一次读取 scope 的目录 snapshot。</zh-CN><en>Withdraws the catalog snapshot that does not belong to the next read scope.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 只清除 entries、分页与 source；全局有限筛选选项仍来自最近成功 facade terminal，可继续支撑 Discover selector。
 * @lang en Only entries, pagination, and source are cleared; global finite filter options still come from the latest successful facade terminal and may continue supporting Discover selectors.
 */
function clearCatalogSnapshot() {
  // <lang><zh-CN>先撤下旧卡片，防止新 scope 的 loading 或 failure 显示前一 scope 数据。</zh-CN><en>Withdraw stale cards first so loading or failure for a new scope cannot display data from the prior scope.</en></lang>
  catalogEntries.value = [];

  // <lang><zh-CN>将分页恢复为“尚无 terminal”，不把旧 total/hasNext 投影给新 scope。</zh-CN><en>Restore pagination to “no terminal yet” and project no stale total/hasNext into the new scope.</en></lang>
  catalogPaging.value = { ...EMPTY_CATALOG_PAGING };

  // <lang><zh-CN>source 同步恢复为空事实，等待新 facade terminal 提供实际 authority。</zh-CN><en>Restore source to the empty fact as well, awaiting actual authority from the new facade terminal.</en></lang>
  catalogSource.value = { ...EMPTY_SOURCE_FACT };
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

  // <lang><zh-CN>刷新时规范化新关键字，追加时只使用已提交值，避免 page 间混入未提交草稿。</zh-CN><en>Normalize a new keyword on refresh and use only the committed value on append, preventing an unsubmitted draft from mixing across pages.</en></lang>
  const requestedKeyword = append ? catalogKeyword.value : normalizeCatalogKeyword(keyword);

  // <lang><zh-CN>刷新时规范化新筛选，追加时只使用已提交值，避免 page 间混入未提交草稿。</zh-CN><en>Normalize new filters on refresh and use only committed values on append, preventing an unsubmitted draft from mixing across pages.</en></lang>
  const requestedFilters = append ? catalogFilters.value : normalizeCatalogFilters(filters);

  // <lang><zh-CN>在写入新 scope 前比较四项提交值；append 按定义始终沿用当前 scope。</zh-CN><en>Compare all four committed values before writing a new scope; append always retains current scope by definition.</en></lang>
  const scopeMatches = append || matchesCurrentCatalogScope(requestedKeyword, requestedFilters);

  // <lang><zh-CN>只有 same-scope 且确有卡片时，刷新 loading/failure 才能保留旧 snapshot；空结果或新 scope 都不得保留旧分页/source。</zh-CN><en>Only a same-scope refresh with actual cards may retain the old snapshot during loading/failure; an empty result or new scope retains no stale pagination/source.</en></lang>
  const retainsVisibleSnapshot = append || (scopeMatches && catalogEntries.value.length > 0);

  // <lang><zh-CN>取消先前尚未结束的读取请求；新 request 的结果由当前 call 自己拥有。</zh-CN><en>Request cancellation of prior unfinished read; result of new request is owned by current call itself.</en></lang>
  activeCatalogHandle?.cancel();

  // <lang><zh-CN>新搜索/刷新会立即更新 keyword 与筛选；append 保留上次已确认的完整查询。</zh-CN><en>New search/refresh updates keyword and filters; append retains the last confirmed complete query.</en></lang>
  if (!append) {
    catalogKeyword.value = requestedKeyword;
    catalogFilters.value = { ...requestedFilters };
  }

  // <lang><zh-CN>新 scope、初始读取或无卡片重试先撤下 snapshot；same-scope 卡片刷新则保持已呈现内容，等待 terminal 决定替换或非阻塞失败。</zh-CN><en>A new scope, initial read, or cardless retry first withdraws its snapshot; a same-scope card refresh keeps displayed content until the terminal replaces it or reports a non-blocking failure.</en></lang>
  if (!retainsVisibleSnapshot) clearCatalogSnapshot();

  // <lang><zh-CN>首次/刷新使用 loading，追加使用 appending，使列表在后者失败时保持可读。</zh-CN><en>Initial/refresh uses loading while append uses appending, keeping list readable when the latter fails.</en></lang>
  catalogPhase.value = append ? 'appending' : 'loading';

  // <lang><zh-CN>新请求开始前清除旧 failure，但不在 append 时清空已有 entries。</zh-CN><en>Clear old failure before new request but do not clear existing entries during append.</en></lang>
  catalogFailure.value = null;

  // <lang><zh-CN>通过唯一 project-facing facade 启动 catalog operation；state 不选择 adapter 或 authority。</zh-CN><en>Start the catalog operation through the sole project-facing facade; state selects neither adapter nor authority.</en></lang>
  const requestHandle = resourceBookingProject.queryResourceCatalog({
    page: requestedPage,
    pageSize: CATALOG_PAGE_SIZE,
    keyword: requestedKeyword,
    venueId: requestedFilters.venueId,
    resourceTypeId: requestedFilters.resourceTypeId,
    date: requestedFilters.date
  });

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
    // <lang><zh-CN>失败仍保留 runtime 给出的 actual source，避免 badge 借用旧成功或硬编码 local。</zh-CN><en>Failure still retains the actual source supplied by the runtime, preventing the badge from borrowing stale success or hard-coded local.</en></lang>
    if (outcome.source) catalogSource.value = { ...outcome.source };
    catalogFailure.value = outcome;
    catalogPhase.value = retainsVisibleSnapshot ? 'ready' : 'failure';
    return;
  }

  // <lang><zh-CN>append 连接新 page，刷新替换 page=1；均创建新数组避免共享 provider value。</zh-CN><en>Append concatenates new page while refresh replaces page one; both create new arrays to avoid sharing provider value.</en></lang>
  catalogEntries.value = append ? [...catalogEntries.value, ...outcome.entries] : [...outcome.entries];

  // <lang><zh-CN>筛选选项只采用 catalog operation 的 adapter-owned projection，不从 JSON 或旧页面状态重建。</zh-CN><en>Adopt filter options only from the catalog operation's adapter-owned projection and rebuild them from neither JSON nor stale page state.</en></lang>
  if (outcome.filterOptions && Array.isArray(outcome.filterOptions.venues) && Array.isArray(outcome.filterOptions.resourceTypes) && Array.isArray(outcome.filterOptions.dates)) {
    catalogFilterOptions.value = JSON.parse(JSON.stringify(outcome.filterOptions));
  }

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

  // <lang><zh-CN>新详情读取立即清除旧 detail 与预约草稿，避免 loading/failure 期间继续暴露前一路由的资源、日期或时段。</zh-CN><en>A new detail read immediately clears the old detail and booking draft, preventing the loading/failure phases from exposing the prior route's resource, date, or slot.</en></lang>
  selectedDetail.value = null;
  bookingDraft.value = null;

  // <lang><zh-CN>清空前一详情 failure 并进入独立 loading phase。</zh-CN><en>Clear prior detail failure and enter independent loading phase.</en></lang>
  detailFailure.value = null;
  detailPhase.value = 'loading';

  // <lang><zh-CN>通过 project composition root 启动详情 operation；resource ID 不成为 URL、文件路径或 adapter selector。</zh-CN><en>Start the detail operation through the project composition root; resource ID becomes no URL, file path, or adapter selector.</en></lang>
  const requestHandle = resourceBookingProject.readResourceDetail(resourceId);

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
    // <lang><zh-CN>详情失败 source 与目录 source 分离，供详情页准确披露当前 operation。</zh-CN><en>Keep detail-failure source separate from catalog source so the detail page accurately discloses its current operation.</en></lang>
    if (outcome.source) detailSource.value = { ...outcome.source };
    detailFailure.value = outcome;
    selectedDetail.value = null;
    detailPhase.value = 'failure';
    return;
  }

  // <lang><zh-CN>写入纯 detail 与 ready phase；source 已随 outcome 受限携带。</zh-CN><en>Write pure detail and ready phase; bounded source already accompanies outcome.</en></lang>
  selectedDetail.value = outcome;
  detailSource.value = { ...outcome.source };
  detailPhase.value = 'ready';
}

/**
 * <lang><zh-CN>通过 project facade 显式刷新当前运行时预约列表。</zh-CN><en>Explicitly refreshes the current-runtime reservation list through the project facade.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>列表状态稳定后 resolve。</zh-CN><en>Resolves after list state stabilizes.</en></lang>
 * @lang zh-CN reservation.list 与三项 write 共用同一 adapter snapshot；页面不会读取 JSON seed 或自行补充卡片字段。
 * @lang en reservation.list shares one adapter snapshot with all three writes; pages read no JSON seed and enrich no card fields themselves.
 */
export async function refreshReservations() {
  // <lang><zh-CN>取消被新刷新替换的旧 read，并只用 handle identity 丢弃其晚到 terminal。</zh-CN><en>Cancel an old read replaced by a new refresh and discard its late terminal only by handle identity.</en></lang>
  activeReservationReadHandle?.cancel();

  // <lang><zh-CN>保留已有卡片进入 loading，避免刷新期间把可读 snapshot 清空。</zh-CN><en>Enter loading while retaining existing cards, avoiding clearing a readable snapshot during refresh.</en></lang>
  reservationPhase.value = 'loading';
  reservationFailure.value = null;

  // <lang><zh-CN>list operation 不接收页面筛选或任意 payload；source selection 完全来自 project profile。</zh-CN><en>The list operation accepts no page filter or arbitrary payload; source selection comes entirely from the project profile.</en></lang>
  const requestHandle = resourceBookingProject.listReservations();
  activeReservationReadHandle = requestHandle;

  // <lang><zh-CN>等待 facade 映射后的 bounded terminal；source exception 不会直接 reject 到页面层。</zh-CN><en>Await the facade-mapped bounded terminal; a source exception does not reject directly into the page layer.</en></lang>
  const outcome = await requestHandle.promise;

  // <lang><zh-CN>较新的 refresh 已接管时静默丢弃当前晚到结果。</zh-CN><en>Silently discard this late result when a newer refresh has taken ownership.</en></lang>
  if (activeReservationReadHandle !== requestHandle) {
    return;
  }

  // <lang><zh-CN>完成当前读取并释放私有 handle。</zh-CN><en>Complete the current read and release the private handle.</en></lang>
  activeReservationReadHandle = null;

  // <lang><zh-CN>保留任何 terminal 的实际 source fact；failure 不伪装为 local success。</zh-CN><en>Retain the actual source fact of every terminal; failure is not presented as local success.</en></lang>
  if (outcome?.source) {
    reservationSource.value = { ...outcome.source };
  }

  // <lang><zh-CN>runtime/business failure 保留旧 snapshot，并进入可发现失败阶段。</zh-CN><en>A runtime or business failure retains the old snapshot and enters a discoverable failure phase.</en></lang>
  if (outcome.kind === 'failure') {
    reservationFailure.value = outcome;
    reservationPhase.value = 'failure';
    return;
  }

  // <lang><zh-CN>只接受 reservation.list 的完整 canonical shape，拒绝把 malformed success 写入页面状态。</zh-CN><en>Accept only the complete canonical reservation.list shape and reject writing malformed success into page state.</en></lang>
  if (outcome.kind !== 'reservations' || !adoptReservationSnapshot(outcome)) {
    reservationFailure.value = createStateBookingFailure('provider-unavailable', '示例预约列表暂时不可用，请稍后重试。', 'The demo reservation list is temporarily unavailable; try again later.');
    reservationPhase.value = 'failure';
    return;
  }

  // <lang><zh-CN>完整 snapshot 已采用后进入 ready；不推导真实同步、库存或持久化状态。</zh-CN><en>Enter ready after adopting a complete snapshot; infer no live synchronization, inventory, or persistence state.</en></lang>
  reservationPhase.value = 'ready';
  reservationFailure.value = null;
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
  // <lang><zh-CN>同时要求 raw snapshot 与 adapter-owned cards，防止 state 重新读取 dataset 或接受半份成功。</zh-CN><en>Require both the raw snapshot and adapter-owned cards, preventing state from rereading the dataset or accepting a partial success.</en></lang>
  if (!Array.isArray(outcome?.reservations) || !Array.isArray(outcome?.reservationCards)) {
    // <lang><zh-CN>保持原 state，交由调用方产生有界失败。</zh-CN><en>Retain original state and let caller produce bounded failure.</en></lang>
    return false;
  }

  // <lang><zh-CN>JSON 复制隔离 adapter outcome，页面无法通过结果引用回写 provider snapshot 或卡片投影。</zh-CN><en>JSON-copy the adapter outcome so pages cannot write back to the provider snapshot or card projections through result references.</en></lang>
  reservations.value = JSON.parse(JSON.stringify(outcome.reservations));
  reservationCards.value = JSON.parse(JSON.stringify(outcome.reservationCards));

  // <lang><zh-CN>预约投影随同完整 snapshot 采用其 actual source，使列表/详情 badge 与可见数据保持同源。</zh-CN><en>Adopt the actual source together with the complete snapshot so list/detail badges share provenance with visible data.</en></lang>
  if (outcome.source) {
    reservationSource.value = { ...outcome.source };
  }

  // <lang><zh-CN>明确返回采用成功。</zh-CN><en>Explicitly return successful adoption.</en></lang>
  return true;
}

/**
 * <lang><zh-CN>通过唯一 Biz project facade 提交一条预约 command。</zh-CN><en>Submits one reservation command through the sole Biz project facade.</en></lang>
 * @param {'create'|'cancel'|'reschedule'} operation <lang><zh-CN>state 选择的固定 write operation。</zh-CN><en>Fixed write operation selected by state.</en></lang>
 * @param {object} command <lang><zh-CN>state 构造的精确 plain-data command。</zh-CN><en>Exact plain-data command constructed by state.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>canonical outcome 或受限并发失败。</zh-CN><en>A canonical outcome or bounded concurrency failure.</en></lang>
 * @lang zh-CN 同一时刻只允许一个 write；这避免页面双击把不同 command ID 误作为两笔可接受的独立写入。
 * @lang en Only one write is allowed at a time; this prevents page double click from treating different command IDs as two acceptable independent writes.
 */
async function submitReservationWrite(operation, command) {
  // <lang><zh-CN>已有 write 未完成时不创建第二个 provider invocation 或命令。</zh-CN><en>When a write is pending, create no second provider invocation or command.</en></lang>
  if (activeReservationWriteHandle) {
    // <lang><zh-CN>返回可发现冲突，状态和 provider snapshot 均不改变。</zh-CN><en>Return a discoverable conflict and change neither state nor provider snapshot.</en></lang>
    return createStateBookingFailure('conflict', '正在处理上一项示例预约操作，请稍候。', 'The previous demo booking operation is still being processed.');
  }

  // <lang><zh-CN>只从三个已声明方法中选择 operation；command 自身不能携带自由 dispatch 名称。</zh-CN><en>Select only among three declared methods; the command itself cannot carry a free-dispatch name.</en></lang>
  const requestHandle = operation === 'create'
    ? resourceBookingProject.createReservation(command)
    : operation === 'cancel'
      ? resourceBookingProject.cancelReservation(command)
      : resourceBookingProject.rescheduleReservation(command);

  // <lang><zh-CN>保留私有 handle，仅用于防止并发提交；不暴露给模板或 storage。</zh-CN><en>Retain private handle only to prevent concurrent submit; expose it to neither template nor storage.</en></lang>
  activeReservationWriteHandle = requestHandle;

  // <lang><zh-CN>等待 runtime 永不 reject 的 mapped terminal outcome。</zh-CN><en>Await mapped terminal outcome that runtime never rejects.</en></lang>
  const outcome = await requestHandle.promise;

  // <lang><zh-CN>完成后清理当前 handle，使下一条用户显式操作可启动新的 command。</zh-CN><en>Clear current handle after completion so next explicit user action may start a new command.</en></lang>
  activeReservationWriteHandle = null;

  // <lang><zh-CN>保存 write terminal 的实际 source fact；未知或失败仍保留其明确 authority，而不伪装为成功。</zh-CN><en>Store the write terminal's actual source fact; unknown or failure retains its explicit authority rather than posing as success.</en></lang>
  if (outcome?.source) {
    writeSource.value = { ...outcome.source };
  }

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
    resourceId: detail.resource.id,
    date: draft.date,
    time: draft.time
  };

  // <lang><zh-CN>唯一 write helper 负责通过 Biz runtime 发送、隔离并等待 command。</zh-CN><en>The sole write helper sends, isolates, and awaits command through Biz runtime.</en></lang>
  const outcome = await submitReservationWrite('create', command);

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
    reservationId
  };

  // <lang><zh-CN>等待唯一 Biz write boundary 的 canonical outcome。</zh-CN><en>Await canonical outcome of sole Biz write boundary.</en></lang>
  const outcome = await submitReservationWrite('cancel', command);

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
    reservationId,
    date,
    time
  };

  // <lang><zh-CN>等待固定 local authority 的 Biz write terminal outcome。</zh-CN><en>Await Biz write terminal outcome of fixed local authority.</en></lang>
  const outcome = await submitReservationWrite('reschedule', command);

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
    catalogFilterOptions: readonly(catalogFilterOptions),
    catalogPaging: readonly(catalogPaging),
    catalogSource: readonly(catalogSource),
    catalogFailure: readonly(catalogFailure),
    canLoadMore: readonly(canLoadMore),
    selectedDetail: readonly(selectedDetail),
    bookingDraft: readonly(bookingDraft),
    detailPhase: readonly(detailPhase),
    detailFailure: readonly(detailFailure),
    detailSource: readonly(detailSource),
    reservations: readonly(reservations),
    reservationCards: readonly(reservationCards),
    reservationPhase: readonly(reservationPhase),
    reservationFailure: readonly(reservationFailure),
    reservationSource: readonly(reservationSource),
    bookingPhase: readonly(bookingPhase),
    bookingWriteFailure: readonly(bookingWriteFailure),
    writeSource: readonly(writeSource),
    lastConfirmedReservation: readonly(lastConfirmedReservation),
    refreshCatalog,
    loadNextCatalogPage,
    loadResourceDetail,
    refreshReservations,
    prepareLocalBooking,
    confirmLocalReservation,
    cancelLocalReservation,
    rescheduleLocalReservation
  };
}
