/**
 * <lang><zh-CN>BP 的 local-first project provider：以已锁定 Biz async runtime 执行 explicit local source，投影目录/详情 terminal outcome，不发起网络、读取环境、访问 storage 或处理 credential。</zh-CN><en>Local-first project provider for the BP: executes an explicit local source through locked Biz async runtime and projects catalog/detail terminal outcomes without network, environment read, storage access, or credential handling.</en></lang>
 * @lang zh-CN 当前 profile 只选择 local JSON。remote/virtual 只保留为未来经审阅的 policy 输入，不在本文件实现、发现或回退。
 * @lang en The current profile selects local JSON only. Remote/virtual remain future reviewed policy inputs and are neither implemented, discovered, nor fallen back to in this file.
 */

// <lang><zh-CN>使用固定 submodule 的公开 async provider contract，不复制或修改其 runtime 实现。</zh-CN><en>Use public async-provider contract from the locked submodule and do not copy or modify its runtime implementation.</en></lang>
import {
  ASYNC_PROVIDER_CONTRACT_VERSION,
  ASYNC_SOURCE_POLICY_VERSION,
  createAsyncProviderHost
} from '@hia-uview/biz-async-provider-runtime';

// <lang><zh-CN>导入唯一共享 local dataset 入口与纯 domain 投影；二者均不含外部 endpoint、账户或生产记录。</zh-CN><en>Import the sole shared local-dataset entry and pure domain projections; neither contains external endpoint, account, or production record.</en></lang>
import { localDataset } from '../data/local-dataset.mjs';
import {
  BOOKING_DOMAIN_VERSION,
  createLocalCatalogPage,
  createLocalResourceDetail
} from '../domain/booking-domain.mjs';

/**
 * <lang><zh-CN>当前 demo source policy 的固定 ID。</zh-CN><en>Fixed ID of the current demo source policy.</en></lang>
 * @lang zh-CN ID 是可审计配置键，不是 URL、文件路径、environment variable 或 source discovery key。
 * @lang en The ID is a reviewable configuration key, not a URL, file path, environment variable, or source-discovery key.
 */
const LOCAL_SOURCE_ID = 'bp-resource-booking.local-json';

/**
 * <lang><zh-CN>创建 local catalog/detail provider declaration。</zh-CN><en>Creates the local catalog/detail provider declaration.</en></lang>
 * @returns {object} <lang><zh-CN>版本化 read provider declaration。</zh-CN><en>A versioned read-provider declaration.</en></lang>
 * @lang zh-CN declaration 不携带 URL、HTTP method、token、身份、storage key 或业务 DTO。
 * @lang en The declaration carries no URL, HTTP method, token, identity, storage key, or business DTO.
 */
function createLocalReadDeclaration() {
  // <lang><zh-CN>返回 runtime 所需的精确字段集合；read maxAttempts 为一，避免 local JSON 模拟无意义 retry。</zh-CN><en>Return the exact field set required by runtime; read maxAttempts is one, avoiding meaningless retry simulation for local JSON.</en></lang>
  return {
    asyncProviderContractVersion: ASYNC_PROVIDER_CONTRACT_VERSION,
    providerId: 'bp-resource-booking.local-read',
    portId: 'resource-booking-read',
    owner: 'bp-uv-resource-booking',
    kind: 'read',
    contract: { id: 'bp-resource-booking.catalog-detail', version: BOOKING_DOMAIN_VERSION },
    execution: 'injected-async',
    credential: { mode: 'none' },
    cancellation: 'explicit-handle',
    retry: { maxAttempts: 1 }
  };
}

/**
 * <lang><zh-CN>创建 local-first source policy。</zh-CN><en>Creates the local-first source policy.</en></lang>
 * @returns {object} <lang><zh-CN>只含 local authority 的明确 source policy。</zh-CN><en>An explicit source policy containing only local authority.</en></lang>
 * @lang zh-CN read/write ID 都被 runtime 要求明确声明；本 BP 目前只通过该 host 做读取，不因此声称写入已接入 provider。
 * @lang en Runtime requires both read/write IDs to be explicit; the BP currently uses this host only for reads and does not thereby claim writes are provider-integrated.
 */
function createLocalSourcePolicy() {
  // <lang><zh-CN>固定 local read 序列与 write authority，禁止隐式 remote/virtual 候选。</zh-CN><en>Fix the local read sequence and write authority, prohibiting implicit remote/virtual candidates.</en></lang>
  return {
    sourcePolicyVersion: ASYNC_SOURCE_POLICY_VERSION,
    mode: 'local',
    readSourceIds: [LOCAL_SOURCE_ID],
    writeSourceId: LOCAL_SOURCE_ID
  };
}

/**
 * <lang><zh-CN>校验 adapter-private local read request。</zh-CN><en>Validates an adapter-private local read request.</en></lang>
 * @param {unknown} request <lang><zh-CN>runtime 已复制的读取请求。</zh-CN><en>Read request copied by runtime.</en></lang>
 * @returns {boolean} <lang><zh-CN>请求是否是本 provider 明确支持的 catalog/detail operation。</zh-CN><en>Whether request is a catalog/detail operation explicitly supported by this provider.</en></lang>
 * @lang zh-CN operation 是本项目内部 route/adapter 元数据，绝不投影为 URL、method 或远端 API 协议。
 * @lang en Operation is internal project route/adapter metadata and is never projected as URL, method, or remote API protocol.
 */
function isSupportedReadRequest(request) {
  // <lang><zh-CN>只接受无数组对象、固定 operation 及其最小字段；不读取任意嵌套输入。</zh-CN><en>Accept only a non-array object, fixed operation, and its minimum fields; read no arbitrary nested input.</en></lang>
  return typeof request === 'object'
    && request !== null
    && !Array.isArray(request)
    && ((request.operation === 'catalog' && Number.isInteger(request.page) && Number.isInteger(request.pageSize))
      || (request.operation === 'detail' && typeof request.resourceId === 'string'));
}

/**
 * <lang><zh-CN>创建唯一 local JSON source provider。</zh-CN><en>Creates the sole local-JSON source provider.</en></lang>
 * @returns {object} <lang><zh-CN>受限 local authority/invoke source provider。</zh-CN><en>A bounded local authority/invoke source provider.</en></lang>
 * @lang zh-CN source 只调用同步纯 domain 函数后 Promise resolve，不访问文件系统；JSON 已在 module import 时作为 bundler 静态输入装载。
 * @lang en The source only Promise-resolves synchronous pure domain functions and accesses no file system; JSON is loaded as bundler static input at module import time.
 */
function createLocalSourceProvider() {
  // <lang><zh-CN>返回 runtime 精确允许的 authority/invoke 双字段对象。</zh-CN><en>Return the exact two-field authority/invoke object permitted by runtime.</en></lang>
  return {
    authority: 'local',
    /**
     * <lang><zh-CN>执行一项 runtime 已隔离的 local read operation。</zh-CN><en>Executes one runtime-isolated local read operation.</en></lang>
     * @param {object} request <lang><zh-CN>已复制 adapter-private request。</zh-CN><en>Copied adapter-private request.</en></lang>
     * @returns {Promise<object>} <lang><zh-CN>受限 source terminal outcome。</zh-CN><en>A bounded source terminal outcome.</en></lang>
     * @lang zh-CN invoke 不写入 dataset、预约 store 或页面状态；它只为当前读取返回隔离 domain outcome。
     * @lang en Invoke mutates no dataset, reservation store, or page state; it returns only isolated domain outcome for current read.
     */
    invoke(request) {
      // <lang><zh-CN>未知 operation 受限为不可 retry failure，不回显 request 或可用 operation 列表。</zh-CN><en>An unknown operation becomes a bounded non-retryable failure and echoes neither request nor available-operation list.</en></lang>
      if (!isSupportedReadRequest(request)) {
        // <lang><zh-CN>固定 unknown 防止 project-private validation 细节跨越 source boundary。</zh-CN><en>Use fixed unknown, preventing project-private validation detail from crossing source boundary.</en></lang>
        return Promise.resolve({ kind: 'failure', code: 'unknown', retryable: false });
      }

      // <lang><zh-CN>catalog 只调用纯分页投影，不混入详情字段或状态写入。</zh-CN><en>Catalog calls only pure pagination projection and mixes in no detail field or state write.</en></lang>
      if (request.operation === 'catalog') {
        // <lang><zh-CN>将选定 page/pageSize/keyword 映射给 domain，同时不透传 operation 到 canonical value。</zh-CN><en>Map selected page/pageSize/keyword to domain and do not pass operation through to canonical value.</en></lang>
        const outcome = createLocalCatalogPage(localDataset, { page: request.page, pageSize: request.pageSize, keyword: request.keyword });

        // <lang><zh-CN>domain failure 仍作为安全 private value 返回，由 adapter 统一映射 page/failure。</zh-CN><en>Domain failure still returns as safe private value and is uniformly mapped by adapter to page/failure.</en></lang>
        return Promise.resolve({ kind: 'success', value: outcome });
      }

      // <lang><zh-CN>剩余已校验分支只能是 detail，使用固定 resource ID 查询纯详情投影。</zh-CN><en>The remaining validated branch can only be detail and uses fixed resource-ID query for pure detail projection.</en></lang>
      const outcome = createLocalResourceDetail(localDataset, request.resourceId);

      // <lang><zh-CN>source outcome 不含 dataset、provider、exception 或任意动态字段。</zh-CN><en>The source outcome contains no dataset, provider, exception, or arbitrary dynamic field.</en></lang>
      return Promise.resolve({ kind: 'success', value: outcome });
    }
  };
}

/**
 * <lang><zh-CN>创建当前 local-first read host。</zh-CN><en>Creates the current local-first read host.</en></lang>
 * @returns {object} <lang><zh-CN>初始化成功的 async provider host。</zh-CN><en>An successfully initialized async-provider host.</en></lang>
 * @throws {Error} <lang><zh-CN>受控 checked-in declaration/policy 不一致时抛出。</zh-CN><en>Thrown when controlled checked-in declaration/policy are inconsistent.</en></lang>
 * @lang zh-CN 失败是项目开发配置错误；不向页面公开 runtime diagnostics、source map 或任意输入。
 * @lang en Failure is a project-development configuration error and exposes no runtime diagnostic, source map, or arbitrary input to pages.
 */
function createLocalReadHost() {
  // <lang><zh-CN>组合三个固定 checked-in 输入，既不合并环境配置，也不发现其他 source。</zh-CN><en>Compose three fixed checked-in inputs and neither merge environment configuration nor discover another source.</en></lang>
  const initialization = createAsyncProviderHost({
    declaration: createLocalReadDeclaration(),
    sourcePolicy: createLocalSourcePolicy(),
    sourceProviders: { [LOCAL_SOURCE_ID]: createLocalSourceProvider() },
    timeoutMs: 5000
  });

  // <lang><zh-CN>任何失败都在模块初始化时明确停止，防止页面拥有 partial/local fallback host。</zh-CN><en>Stop explicitly at module initialization for any failure, preventing pages from owning a partial/local fallback host.</en></lang>
  if (!initialization.ok) {
    // <lang><zh-CN>错误字符串不包含 diagnostics 或 source ID，保持公开 build 输出可安全复制。</zh-CN><en>Error string contains no diagnostic or source ID, keeping public build output safe to copy.</en></lang>
    throw new Error('BP local project provider failed to initialize.');
  }

  // <lang><zh-CN>返回 runtime host；后续 exported functions 只公开 result/cancel/observation，而不泄漏 host 初始化输入。</zh-CN><en>Return runtime host; later exported functions expose only result/cancel/observation and do not leak host initialization inputs.</en></lang>
  return initialization.host;
}

/**
 * <lang><zh-CN>本模块唯一的 local read runtime host。</zh-CN><en>The sole local-read runtime host of this module.</en></lang>
 * @lang zh-CN host 进程内存活且不持久化；模块卸载或应用刷新后会回到 checked-in local JSON。
 * @lang en Host lives in process memory and persists nothing; module unload or app refresh returns to checked-in local JSON.
 */
const localReadHost = createLocalReadHost();

/**
 * <lang><zh-CN>把 runtime terminal envelope 映射为项目可用 outcome。</zh-CN><en>Maps a runtime terminal envelope to a project-usable outcome.</en></lang>
 * @param {object} envelope <lang><zh-CN>async runtime 产生的受限 envelope。</zh-CN><en>Bounded envelope produced by async runtime.</en></lang>
 * @returns {object} <lang><zh-CN>domain value 或受限 provider failure。</zh-CN><en>A domain value or bounded provider failure.</en></lang>
 * @lang zh-CN local source 的 domain value 仍会复制一次；runtime/provider 私有异常、request 和实现对象不跨越此 adapter。
 * @lang en A local-source domain value is copied once more; runtime/provider-private exception, request, and implementation object do not cross this adapter.
 */
function mapReadEnvelope(envelope) {
  // <lang><zh-CN>成功时只返回 private value 的 JSON 副本和已允许 source metadata。</zh-CN><en>On success return only JSON copy of private value and permitted source metadata.</en></lang>
  if (envelope.kind === 'success') {
    // <lang><zh-CN>附加 source 供页面 badge 使用，不泄漏 provider 函数或 source map。</zh-CN><en>Attach source for page badge use and leak no provider function or source map.</en></lang>
    return {
      ...JSON.parse(JSON.stringify(envelope.value)),
      source: { ...envelope.source }
    };
  }

  // <lang><zh-CN>失败统一投影为项目 provider failure，保留 runtime 已受限 code/source 但不透传其 message 对象。</zh-CN><en>Uniformly project failure as project provider failure, retaining runtime-bounded code/source but not passing through its message object.</en></lang>
  return {
    contractVersion: BOOKING_DOMAIN_VERSION,
    kind: 'failure',
    code: envelope.code === 'timeout' ? 'timeout' : 'provider-unavailable',
    message: {
      'zh-Hans': '示例数据暂时不可用，请稍后重试。',
      en: 'Demo data is temporarily unavailable. Please try again.'
    },
    retryable: envelope.retryable,
    scope: 'provider',
    source: { ...envelope.source }
  };
}

/**
 * <lang><zh-CN>启动一次 local-first paged catalog 查询。</zh-CN><en>Starts one local-first paged catalog query.</en></lang>
 * @param {number} page <lang><zh-CN>one-based page。</zh-CN><en>One-based page.</en></lang>
 * @param {number} pageSize <lang><zh-CN>每页数量。</zh-CN><en>Entries per page.</en></lang>
 * @param {string} keyword <lang><zh-CN>受控查询关键字。</zh-CN><en>Controlled query keyword.</en></lang>
 * @returns {object} <lang><zh-CN>mapped Promise 与 explicit cancel handle。</zh-CN><en>A mapped Promise and explicit cancel handle.</en></lang>
 * @lang zh-CN 目录读取不访问远端；页面决定何时调用、何时丢弃其结果和如何显示 loading/footer。
 * @lang en Catalog reading accesses no remote; the page decides when to call, discard its result, and display loading/footer.
 */
export function startLocalCatalogQuery(page, pageSize, keyword) {
  // <lang><zh-CN>以 adapter-private operation shape 调用 host，保持 runtime request isolation 生效。</zh-CN><en>Call host using adapter-private operation shape, keeping runtime request isolation effective.</en></lang>
  const invocation = localReadHost.start({ operation: 'catalog', page, pageSize, keyword });

  // <lang><zh-CN>返回新的 outer handle，不改变 runtime-owned cancel 函数语义。</zh-CN><en>Return a new outer handle without changing runtime-owned cancel-function semantics.</en></lang>
  return { promise: invocation.promise.then(mapReadEnvelope), cancel: invocation.cancel };
}

/**
 * <lang><zh-CN>启动一次 local-first resource detail 查询。</zh-CN><en>Starts one local-first resource-detail query.</en></lang>
 * @param {string} resourceId <lang><zh-CN>页面声明的资源 ID。</zh-CN><en>Resource ID declared by the page.</en></lang>
 * @returns {object} <lang><zh-CN>mapped Promise 与 explicit cancel handle。</zh-CN><en>A mapped Promise and explicit cancel handle.</en></lang>
 * @lang zh-CN resource ID 不会成为 URL、文件路径或数据库查询；它只进入 local JSON 的有限 ID 比较。
 * @lang en Resource ID never becomes a URL, file path, or database query; it enters only finite-ID comparison in local JSON.
 */
export function startLocalResourceDetailQuery(resourceId) {
  // <lang><zh-CN>构建受限 detail request 并立即交由 runtime 隔离。</zh-CN><en>Build bounded detail request and immediately hand it to runtime for isolation.</en></lang>
  const invocation = localReadHost.start({ operation: 'detail', resourceId });

  // <lang><zh-CN>terminal result 只经同一 mapping helper 进入页面层。</zh-CN><en>Terminal result enters page layer only through the same mapping helper.</en></lang>
  return { promise: invocation.promise.then(mapReadEnvelope), cancel: invocation.cancel };
}

/**
 * <lang><zh-CN>读取仅计数的 local provider observation。</zh-CN><en>Reads count-only local-provider observation.</en></lang>
 * @returns {object} <lang><zh-CN>隔离 observation copy。</zh-CN><en>An isolated observation copy.</en></lang>
 * @lang zh-CN observation 不用于用户画像、分析、监控或界面展示；它仅为受控测试/诊断保留。
 * @lang en Observation is used for no user profiling, analytics, monitoring, or interface display; it is retained only for controlled test/diagnosis.
 */
export function getLocalProviderObservation() {
  // <lang><zh-CN>runtime 返回副本，本函数不向其中添加 request、value 或页面状态。</zh-CN><en>Runtime returns a copy and this function adds no request, value, or page state to it.</en></lang>
  return localReadHost.getObservation();
}
