/**
 * <lang><zh-CN>资源预约示例的纯领域投影：从已加载 local dataset 生成目录页、资源详情和受限预约结果，不执行网络、storage、平台 API、真实事务或身份处理。</zh-CN><en>Pure domain projection for the resource-booking example: produces catalog pages, resource details, and bounded reservation results from an already loaded local dataset without network, storage, platform API, real transaction, or identity handling.</en></lang>
 * @lang zh-CN 本模块只表达通用示例语义；它不预置行业字段、价格、会员、支付、场馆运营规则或生产库存。
 * @lang en This module expresses only generic-demo semantics; it presets no industry field, price, membership, payment, venue-operation rule, or production inventory.
 */

/**
 * <lang><zh-CN>当前 local booking domain 结果的固定版本。</zh-CN><en>Fixed version of current local booking-domain outcomes.</en></lang>
 * @lang zh-CN 版本用于 project adapter 与页面间的明确对应，不代表 package 或服务发布版本。
 * @lang en The version supports an explicit correspondence between project adapter and pages and is not a package or service release version.
 */
export const BOOKING_DOMAIN_VERSION = '1.0';

/**
 * <lang><zh-CN>复制一个仅由 JSON 值组成的记录。</zh-CN><en>Copies one record containing JSON values only.</en></lang>
 * @param {unknown} value <lang><zh-CN>待复制值。</zh-CN><en>Value to copy.</en></lang>
 * @returns {unknown} <lang><zh-CN>隔离后的 JSON 值。</zh-CN><en>An isolated JSON value.</en></lang>
 * @lang zh-CN dataset 在导入后不可被页面直接共享或改写；复制失败由调用方受限处理。
 * @lang en The dataset cannot be directly shared with or mutated by a page after import; copy failure is bounded by the caller.
 */
function copyJson(value) {
  // <lang><zh-CN>JSON round trip 只用于本项目已审计的静态 JSON，拒绝函数、循环和行为对象。</zh-CN><en>The JSON round trip serves only this project's audited static JSON and rejects functions, cycles, and behavioral objects.</en></lang>
  return JSON.parse(JSON.stringify(value));
}

/**
 * <lang><zh-CN>创建当前项目自有的双语文本。</zh-CN><en>Creates bilingual text owned by the current project.</en></lang>
 * @param {string} zhHans <lang><zh-CN>简体中文文本。</zh-CN><en>Simplified-Chinese text.</en></lang>
 * @param {string} en <lang><zh-CN>英文文本。</zh-CN><en>English text.</en></lang>
 * @returns {object} <lang><zh-CN>新的 runtime locale object。</zh-CN><en>A new runtime locale object.</en></lang>
 * @lang zh-CN 所有用户可见 project-owned 文案同时保留 `zh-Hans` 与 `en`，不从系统语言推测。
 * @lang en Every user-visible project-owned copy retains both `zh-Hans` and `en` and is not inferred from a system language.
 */
function createLocalizedText(zhHans, en) {
  // <lang><zh-CN>返回新对象，防止结果间共享可写语言字段。</zh-CN><en>Return a new object, preventing results from sharing writable locale fields.</en></lang>
  return { 'zh-Hans': zhHans, en };
}

/**
 * <lang><zh-CN>将一个 venue 的资源扁平化为可呈现目录 entry。</zh-CN><en>Flattens one venue resource to a presentable catalog entry.</en></lang>
 * @param {object} venue <lang><zh-CN>已审计 local dataset venue record。</zh-CN><en>Audited local-dataset venue record.</en></lang>
 * @param {object} resource <lang><zh-CN>venue 所属资源记录。</zh-CN><en>Resource record owned by the venue.</en></lang>
 * @returns {object} <lang><zh-CN>不共享 dataset 引用的 catalog entry。</zh-CN><en>Catalog entry sharing no dataset reference.</en></lang>
 * @lang zh-CN entry 不携带管理字段、远端 ID、价格、用户数据或所有 time slot；详情页再读取有限可预约 slot。
 * @lang en An entry carries no administrative field, remote ID, price, user data, or every time slot; the detail page reads its finite bookable slots later.
 */
function createCatalogEntry(venue, resource) {
  // <lang><zh-CN>复制最小双语和展示标识字段，避免页面改写 dataset 中的嵌套对象。</zh-CN><en>Copy the minimum bilingual and presentation-ID fields, preventing a page from mutating nested dataset objects.</en></lang>
  return {
    id: resource.id,
    venueId: venue.id,
    venueName: copyJson(venue.name),
    venueSummary: copyJson(venue.summary),
    district: copyJson(venue.district),
    imageId: venue.imageId,
    name: copyJson(resource.name),
    type: copyJson(resource.type),
    resourceTypeId: resource.typeId,
    capacity: resource.capacity,
    availableDates: [...resource.availableDates],
    nextAvailableSlot: resource.availableSlots[0] ?? null
  };
}

/**
 * <lang><zh-CN>判断一个目录筛选值是否仍处于本地 JSON 查询可安全处理的原始字符串边界内。</zh-CN><en>Determines whether one catalog-filter value remains within the primitive-string boundary safely handled by the local-JSON query.</en></lang>
 * @param {unknown} value <lang><zh-CN>候选筛选值。</zh-CN><en>Candidate filter value.</en></lang>
 * @returns {boolean} <lang><zh-CN>值为省略值或字符串时为 `true`。</zh-CN><en>`true` when the value is omitted or a string.</en></lang>
 * @lang zh-CN 空字符串表示“不筛选”；非字符串不会被强制转换、解释或回显。
 * @lang en An empty string means “do not filter”; non-strings are neither coerced, interpreted, nor echoed.
 */
function isCatalogFilterValue(value) {
  // <lang><zh-CN>只接受未提供或字符串，阻止对象、数组和表达式穿过 provider 边界。</zh-CN><en>Accept only an omitted value or a string, blocking objects, arrays, and expressions from crossing the provider boundary.</en></lang>
  return value === undefined || typeof value === 'string';
}

/**
 * <lang><zh-CN>校验目录请求的受限 page/pageSize/keyword/filter 形状。</zh-CN><en>Validates the bounded page/pageSize/keyword/filter shape of a catalog request.</en></lang>
 * @param {unknown} request <lang><zh-CN>候选目录请求。</zh-CN><en>Candidate catalog request.</en></lang>
 * @returns {boolean} <lang><zh-CN>请求能否安全进入 local projection。</zh-CN><en>Whether the request may safely enter local projection.</en></lang>
 * @lang zh-CN 仅支持固定场馆、资源类型和本地示例日期 ID；不支持任意 filter DSL、排序表达式、SQL、正则、URL 参数或行业字段。
 * @lang en Only fixed venue, resource-type, and local-demo date IDs are supported; arbitrary filter DSL, sort expression, SQL, regex, URL parameter, and industry field are unsupported.
 */
function isValidCatalogRequest(request) {
  // <lang><zh-CN>所有读取均在确认普通对象和必要原始字段后发生。</zh-CN><en>All reads occur only after confirming an ordinary object and required primitive fields.</en></lang>
  return typeof request === 'object'
    && request !== null
    && !Array.isArray(request)
    && Number.isInteger(request.page)
    && request.page >= 1
    && Number.isInteger(request.pageSize)
    && request.pageSize >= 1
    && request.pageSize <= 20
    && (request.keyword === undefined || typeof request.keyword === 'string')
    && isCatalogFilterValue(request.venueId)
    && isCatalogFilterValue(request.resourceTypeId)
    && isCatalogFilterValue(request.date);
}

/**
 * <lang><zh-CN>从已加载 dataset 创建发现页可安全呈现的有限筛选选项。</zh-CN><en>Creates finite filter options safely presentable by Discover from the loaded dataset.</en></lang>
 * @param {object} dataset <lang><zh-CN>版本化 local JSON dataset。</zh-CN><en>Versioned local-JSON dataset.</en></lang>
 * @returns {object} <lang><zh-CN>venue、resourceType 和 date 的 detached option 集合。</zh-CN><en>Detached option collections for venue, resource type, and date.</en></lang>
 * @lang zh-CN 选项只来自本项目已审计的静态数据；该函数不发现外部字段、动态筛选器或真实排班。
 * @lang en Options come only from this project's audited static data; this function discovers no external field, dynamic filter, or live schedule.
 */
export function createLocalCatalogFilterOptions(dataset) {
  // <lang><zh-CN>场馆选项保留数据集稳定顺序，使受控 selector 不依赖宿主 locale 排序。</zh-CN><en>Venue options retain dataset-stable order, so the controlled selector depends on no host-locale sorting.</en></lang>
  const venues = dataset.venues.map((venue) => ({ value: venue.id, label: copyJson(venue.name) }));

  // <lang><zh-CN>使用集合去重资源类型 ID；第一个已审计双语标签成为该有限分类的规范显示文本。</zh-CN><en>Deduplicate resource-type IDs with a set; the first audited bilingual label becomes the canonical display text for that finite category.</en></lang>
  const resourceTypeById = new Map();

  // <lang><zh-CN>使用集合收集明确声明的示例日期，而不调用设备时钟或日历服务。</zh-CN><en>Collect explicitly declared demo dates with a set and call neither device clock nor calendar service.</en></lang>
  const availableDates = new Set();

  // <lang><zh-CN>只遍历受控 venue/resource 数组，保留所有可用于目录筛选的声明事实。</zh-CN><en>Traverse only controlled venue/resource arrays and retain every declared fact usable for catalog filtering.</en></lang>
  for (const venue of dataset.venues) {
    // <lang><zh-CN>逐资源记录首次分类标签并收集其可用日期。</zh-CN><en>For each resource, record the first category label and collect its available dates.</en></lang>
    for (const resource of venue.resources) {
      // <lang><zh-CN>稳定 ID 已存在时不覆盖先前标签，防止相同分类在数据中出现显示漂移。</zh-CN><en>Do not overwrite an earlier label when the stable ID already exists, preventing display drift for one category in the dataset.</en></lang>
      if (!resourceTypeById.has(resource.typeId)) resourceTypeById.set(resource.typeId, copyJson(resource.type));

      // <lang><zh-CN>只加入 JSON 已声明的 ISO 日期字符串。</zh-CN><en>Add only ISO date strings declared by the JSON.</en></lang>
      for (const date of resource.availableDates) availableDates.add(date);
    }
  }

  // <lang><zh-CN>类型维持首次出现顺序，日期按 ISO 字符串的确定性代码点顺序显示。</zh-CN><en>Types retain first-occurrence order while dates display in deterministic code-point order of their ISO strings.</en></lang>
  const resourceTypes = [...resourceTypeById].map(([value, label]) => ({ value, label }));
  const dates = [...availableDates].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);

  // <lang><zh-CN>复制标签并冻结外层结构，避免页面通过 option collection 改写 dataset 关联数据。</zh-CN><en>Copy labels and freeze the outer structure, preventing a page from mutating dataset-associated data through the option collection.</en></lang>
  return Object.freeze({
    venues: Object.freeze(venues.map((option) => Object.freeze({ value: option.value, label: Object.freeze(copyJson(option.label)) }))),
    resourceTypes: Object.freeze(resourceTypes.map((option) => Object.freeze({ value: option.value, label: Object.freeze(copyJson(option.label)) }))),
    dates: Object.freeze([...dates])
  });
}

/**
 * <lang><zh-CN>创建一个受限的目录请求失败。</zh-CN><en>Creates one bounded catalog-request failure.</en></lang>
 * @returns {object} <lang><zh-CN>不回显原始请求的 failure。</zh-CN><en>A failure that does not echo the original request.</en></lang>
 * @lang zh-CN 失败文本是项目自有双语文案；不泄漏输入字段、provider 或堆栈。
 * @lang en Failure copy is project-owned bilingual copy and leaks no input field, provider, or stack.
 */
function createInvalidCatalogRequestFailure() {
  // <lang><zh-CN>返回固定 failure shape，允许页面显示可重试前的输入修正提示。</zh-CN><en>Return the fixed failure shape, allowing a page to show input-correction guidance before retry.</en></lang>
  return {
    contractVersion: BOOKING_DOMAIN_VERSION,
    kind: 'failure',
    code: 'invalid-request',
    message: createLocalizedText('查询条件暂不受支持。', 'The query is not supported.'),
    retryable: false,
    scope: 'request'
  };
}

/**
 * <lang><zh-CN>从 local dataset 创建一个显式分页的资源目录页。</zh-CN><en>Creates an explicitly paged resource catalog page from the local dataset.</en></lang>
 * @param {object} dataset <lang><zh-CN>版本化 local JSON dataset。</zh-CN><en>Versioned local JSON dataset.</en></lang>
 * @param {unknown} request <lang><zh-CN>目录 page request。</zh-CN><en>Catalog page request.</en></lang>
 * @returns {object} <lang><zh-CN>canonical page 或 bounded request failure。</zh-CN><en>A canonical page or bounded request failure.</en></lang>
 * @lang zh-CN 分页在内存中从明确 JSON 数据派生；本函数不进行延迟加载、网络请求或无限滚动的副作用。
 * @lang en Pagination derives in memory from explicit JSON data; this function performs no lazy loading, network request, or infinite-scroll side effect.
 */
export function createLocalCatalogPage(dataset, request) {
  // <lang><zh-CN>先拒绝无效请求，避免对未知输入执行字符串转换或 dataset 遍历。</zh-CN><en>Reject an invalid request first, avoiding string conversion or dataset traversal for unknown input.</en></lang>
  if (!isValidCatalogRequest(request)) {
    // <lang><zh-CN>返回固定 request failure，不回显潜在敏感或任意输入。</zh-CN><en>Return fixed request failure and echo no potentially sensitive or arbitrary input.</en></lang>
    return createInvalidCatalogRequestFailure();
  }

  // <lang><zh-CN>把可选关键字规范为小写可比较文本；空白不构成过滤条件。</zh-CN><en>Normalize optional keyword to lowercase comparable text; whitespace is not a filtering condition.</en></lang>
  const normalizedKeyword = (request.keyword ?? '').trim().toLocaleLowerCase('en-US');

  // <lang><zh-CN>将每个 venue 的有限 resource 列表扁平化为可呈现 entry，不保留 dataset 引用。</zh-CN><en>Flatten each venue's finite resource list to presentable entries and retain no dataset reference.</en></lang>
  const allEntries = dataset.venues.flatMap((venue) => venue.resources.map((resource) => createCatalogEntry(venue, resource)));

  // <lang><zh-CN>规范化三个可选筛选值；空字符串保持“不筛选”，不会成为动态表达式或字段名。</zh-CN><en>Normalize the three optional filter values; an empty string remains “do not filter” and never becomes a dynamic expression or field name.</en></lang>
  const venueId = (request.venueId ?? '').trim();
  const resourceTypeId = (request.resourceTypeId ?? '').trim();
  const date = (request.date ?? '').trim();

  // <lang><zh-CN>以关键字、场馆、类型和已声明可用日期共同筛选；分页始终基于该完整受限结果计算。</zh-CN><en>Filter jointly by keyword, venue, type, and declared available date; pagination always derives from this complete bounded result.</en></lang>
  const filteredEntries = allEntries.filter((entry) => {
    // <lang><zh-CN>仅按中英名称与区域执行简单 contains 查询，不执行正则、排序或动态字段访问。</zh-CN><en>Perform simple contains matching only on Chinese/English names and district; execute no regex, sorting, or dynamic field access.</en></lang>
    const matchesKeyword = normalizedKeyword.length === 0
      || [entry.name['zh-Hans'], entry.name.en, entry.venueName['zh-Hans'], entry.venueName.en, entry.district['zh-Hans'], entry.district.en]
        .some((candidate) => candidate.toLocaleLowerCase('en-US').includes(normalizedKeyword));

    // <lang><zh-CN>其余筛选都只比较有限 ID/日期 allowlist，未选择值不会过滤结果。</zh-CN><en>Every remaining filter compares only finite ID/date allowlists; an unselected value does not filter results.</en></lang>
    return matchesKeyword
      && (venueId.length === 0 || entry.venueId === venueId)
      && (resourceTypeId.length === 0 || entry.resourceTypeId === resourceTypeId)
      && (date.length === 0 || entry.availableDates.includes(date));
  });

  // <lang><zh-CN>计算 one-based page 的零基开始索引，不允许页面隐式跳过或重复记录。</zh-CN><en>Compute the zero-based start index for a one-based page, allowing no implicit record skip or duplication.</en></lang>
  const startIndex = (request.page - 1) * request.pageSize;

  // <lang><zh-CN>复制当前 page slice，确保调用方不能经返回数组写入中间 entry。</zh-CN><en>Copy the current page slice, ensuring callers cannot write through its returned array to an intermediate entry.</en></lang>
  const entries = filteredEntries.slice(startIndex, startIndex + request.pageSize).map((entry) => copyJson(entry));

  // <lang><zh-CN>总数和 hasNext 共同公开分页事实，供滚动加载页脚与显式页次状态使用。</zh-CN><en>Total and hasNext together expose pagination facts for scroll-loading footer and explicit page-state use.</en></lang>
  return {
    contractVersion: BOOKING_DOMAIN_VERSION,
    kind: 'page',
    entries,
    page: request.page,
    pageSize: request.pageSize,
    total: filteredEntries.length,
    hasNext: startIndex + entries.length < filteredEntries.length
  };
}

/**
 * <lang><zh-CN>从 local dataset 查找一个资源详情。</zh-CN><en>Finds one resource detail from the local dataset.</en></lang>
 * @param {object} dataset <lang><zh-CN>版本化 local JSON dataset。</zh-CN><en>Versioned local JSON dataset.</en></lang>
 * @param {unknown} resourceId <lang><zh-CN>候选资源 ID。</zh-CN><en>Candidate resource ID.</en></lang>
 * @returns {object} <lang><zh-CN>canonical detail 或 bounded not-found failure。</zh-CN><en>A canonical detail or bounded not-found failure.</en></lang>
 * @lang zh-CN 详情只公开当前 JSON 明确写入的可预约时段，不表达实时库存、排队或保留锁。
 * @lang en Detail exposes only bookable slots explicitly written in current JSON and expresses no live inventory, queue, or reservation lock.
 */
export function createLocalResourceDetail(dataset, resourceId) {
  // <lang><zh-CN>先找到拥有请求 resource 的 venue；未知/非字符串 ID 不产生 dataset 细节泄漏。</zh-CN><en>Find the venue owning the requested resource first; an unknown/non-string ID leaks no dataset detail.</en></lang>
  const matchedVenue = typeof resourceId === 'string'
    ? dataset.venues.find((venue) => venue.resources.some((resource) => resource.id === resourceId))
    : undefined;

  // <lang><zh-CN>只在 venue 已存在时读取其匹配 resource。</zh-CN><en>Read the matching resource only after its venue exists.</en></lang>
  const matchedResource = matchedVenue?.resources.find((resource) => resource.id === resourceId);

  // <lang><zh-CN>找不到时返回固定 not-found，不提供可用 ID、venue 列表或搜索线索。</zh-CN><en>When missing, return fixed not-found and provide no available ID, venue list, or search clue.</en></lang>
  if (!matchedVenue || !matchedResource) {
    // <lang><zh-CN>failure 仍保持双语与无输入回显的 project outcome 形状。</zh-CN><en>The failure retains bilingual project-outcome shape with no input echo.</en></lang>
    return {
      contractVersion: BOOKING_DOMAIN_VERSION,
      kind: 'failure',
      code: 'not-found',
      message: createLocalizedText('未找到请求的示例资源。', 'The requested example resource was not found.'),
      retryable: false,
      scope: 'request'
    };
  }

  // <lang><zh-CN>只复制详情页声明的 venue/resource/slot 字段，避免未来 dataset 扩展自动泄漏。</zh-CN><en>Copy only venue/resource/slot fields declared by the detail page, preventing future dataset additions from leaking automatically.</en></lang>
  return {
    contractVersion: BOOKING_DOMAIN_VERSION,
    kind: 'detail',
    venue: {
      id: matchedVenue.id,
      name: copyJson(matchedVenue.name),
      summary: copyJson(matchedVenue.summary),
      district: copyJson(matchedVenue.district),
      imageId: matchedVenue.imageId
    },
    resource: {
      id: matchedResource.id,
      name: copyJson(matchedResource.name),
      type: copyJson(matchedResource.type),
      typeId: matchedResource.typeId,
      capacity: matchedResource.capacity,
      availableDates: [...matchedResource.availableDates],
      availableSlots: [...matchedResource.availableSlots]
    }
  };
}

/**
 * <lang><zh-CN>创建一个仅用于示例的本地预约记录。</zh-CN><en>Creates one local reservation record for the demo only.</en></lang>
 * @param {object} detail <lang><zh-CN>已经解析的 canonical resource detail。</zh-CN><en>An already resolved canonical resource detail.</en></lang>
 * @param {string} date <lang><zh-CN>调用方选择的 ISO 日期。</zh-CN><en>ISO date selected by the caller.</en></lang>
 * @param {string} time <lang><zh-CN>调用方选择的已声明时段。</zh-CN><en>Declared slot selected by the caller.</en></lang>
 * @param {number} ordinal <lang><zh-CN>本地临时记录序号。</zh-CN><en>Local temporary-record ordinal.</en></lang>
 * @returns {object} <lang><zh-CN>confirmed record 或 bounded conflict failure。</zh-CN><en>A confirmed record or bounded conflict failure.</en></lang>
 * @lang zh-CN 该函数不写入数据库、storage 或远端；记录只属于当前运行时 demo store，刷新后可恢复为 checked-in mock。
 * @lang en This function writes no database, storage, or remote; a record belongs only to current runtime demo store and may restore to checked-in mock after refresh.
 */
export function createLocalReservation(detail, date, time, ordinal) {
  // <lang><zh-CN>仅接受详情 allowlist 中的日期与时段，防止任意文本被伪装为可预约时间。</zh-CN><en>Accept only a date and slot in the detail allowlists, preventing arbitrary text from posing as a bookable time.</en></lang>
  const hasAvailableDate = detail.kind === 'detail' && detail.resource.availableDates.includes(date);
  const hasAvailableSlot = detail.kind === 'detail' && detail.resource.availableSlots.includes(time);

  // <lang><zh-CN>缺少已声明时段即返回 conflict，保留原有记录和页面选择供调用方调整。</zh-CN><en>A missing declared slot returns conflict, preserving existing record and page selection for caller adjustment.</en></lang>
  if (!hasAvailableDate || !hasAvailableSlot) {
    // <lang><zh-CN>不回显无效时间或 dataset 全部 slot。</zh-CN><en>Do not echo invalid time or every dataset slot.</en></lang>
    return {
      contractVersion: BOOKING_DOMAIN_VERSION,
      kind: 'failure',
      code: 'conflict',
      message: createLocalizedText('该时段已不可预约，请选择其他时段。', 'This slot is unavailable; choose another slot.'),
      retryable: false,
      scope: 'booking'
    };
  }

  // <lang><zh-CN>ordinal 只在当前内存 demo 中生成稳定可读 ID，不等同生产订单号或外部主键。</zh-CN><en>Ordinal creates a stable readable ID only in current in-memory demo and is not a production order number or external key.</en></lang>
  const reservationId = `reservation-demo-${String(ordinal).padStart(3, '0')}`;

  // <lang><zh-CN>返回独立 confirmed record，包含页面需要的最小 venue/resource/日期/时段信息。</zh-CN><en>Return independent confirmed record containing the minimum venue/resource/date/slot information needed by pages.</en></lang>
  return {
    contractVersion: BOOKING_DOMAIN_VERSION,
    kind: 'confirmed',
    reservation: {
      id: reservationId,
      venueId: detail.venue.id,
      resourceId: detail.resource.id,
      date,
      time,
      status: 'confirmed'
    }
  };
}
