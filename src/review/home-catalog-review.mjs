/**
 * <lang><zh-CN>首页目录恢复态的受控审阅夹具：只把显式构建模式收束为四个有限 case，并为 loading case 提供不会按墙上时钟结束的内部调度器。</zh-CN><en>Controlled review fixture for Home catalog recovery states: constrains an explicit build mode to four finite cases and supplies an internal scheduler that does not end the loading case by wall-clock time.</en></lang>
 * @lang zh-CN 本模块不读取 route、query、storage、网络、系统语言或任意环境变量，也不接受 callback、dataset、adapter 或 runtime 注入。
 * @lang en This module reads no route, query, storage, network, system language, or arbitrary environment variable and accepts no callback, dataset, adapter, or runtime injection.
 */

/**
 * <lang><zh-CN>首页目录审阅允许的完整 case 集合。</zh-CN><en>Complete set of allowed Home-catalog review cases.</en></lang>
 * @lang zh-CN `ready` 是所有普通开发与发布构建的默认值；其余三项只由固定 review build mode 选择。
 * @lang en `ready` is the default for every ordinary development and release build; the other three are selected only by fixed review build modes.
 */
export const HOME_CATALOG_REVIEW_CASES = Object.freeze([
  'ready',
  'loading',
  'failure',
  'empty'
]);

/**
 * <lang><zh-CN>loading 审阅调度器返回的唯一不透明 token。</zh-CN><en>Sole opaque token returned by the loading-review scheduler.</en></lang>
 * @lang zh-CN runtime 只会把该值交还给 clearSchedule；token 不含 callback、时间、请求或业务数据。
 * @lang en The runtime only gives this value back to clearSchedule; the token contains no callback, time, request, or business data.
 */
const HOME_LOADING_REVIEW_TIMER_TOKEN = Object.freeze({
  kind: 'home-catalog-review-timer'
});

/**
 * <lang><zh-CN>确认候选值是无自定义 prototype 行为的普通 record。</zh-CN><en>Confirms that a candidate is an ordinary record without custom-prototype behavior.</en></lang>
 * @param {unknown} value <lang><zh-CN>候选 review options。</zh-CN><en>Candidate review options.</en></lang>
 * @returns {boolean} <lang><zh-CN>值可进行 exact-field 检查时为 true。</zh-CN><en>True when the value can undergo an exact-field check.</en></lang>
 * @lang zh-CN 本检查拒绝 array、function、class instance 与 null，防止构建夹具扩展为行为注入。
 * @lang en This check rejects arrays, functions, class instances, and null so the build fixture cannot expand into behavior injection.
 */
function isPlainRecord(value) {
  // <lang><zh-CN>先收窄 null 与非 object，避免读取无效 prototype。</zh-CN><en>First narrow null and non-objects to avoid reading an invalid prototype.</en></lang>
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;

  // <lang><zh-CN>只接受标准或 null prototype record；两者的 own keys 均没有 getter 继承链。</zh-CN><en>Accept only standard- or null-prototype records; own keys of either have no inherited getter chain.</en></lang>
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * <lang><zh-CN>把调用方 options 收束为一个经过 allowlist 验证的 fixture case。</zh-CN><en>Converts caller options into one allowlist-validated fixture case.</en></lang>
 * @param {unknown} options <lang><zh-CN>空 record 或只含 `fixtureCase` 的 record。</zh-CN><en>Empty record or a record containing only `fixtureCase`.</en></lang>
 * @returns {'ready'|'loading'|'failure'|'empty'} <lang><zh-CN>有限审阅 case。</zh-CN><en>Finite review case.</en></lang>
 * @throws {Error} <lang><zh-CN>shape 或 case 不在固定合同内时抛出不回显输入的错误。</zh-CN><en>Throws an error that does not echo input when the shape or case falls outside the fixed contract.</en></lang>
 * @lang zh-CN 空 record 明确回退 ready；任何额外字段都失败关闭，不能携带 scheduler、数据体或 provider。
 * @lang en An empty record explicitly falls back to ready; any extra field fails closed and cannot carry a scheduler, data body, or provider.
 */
function normalizeHomeCatalogReviewCase(options) {
  // <lang><zh-CN>非普通 record 没有审阅配置含义。</zh-CN><en>A non-ordinary record has no review-configuration meaning.</en></lang>
  if (!isPlainRecord(options)) {
    throw new Error('Home catalog review options must be a plain record.');
  }

  // <lang><zh-CN>枚举全部 own string/symbol keys，使不可枚举字段或 symbol 也不能成为隐藏注入面。</zh-CN><en>Enumerate every own string and symbol key so a non-enumerable field or symbol cannot become a hidden injection surface.</en></lang>
  const optionFields = Reflect.ownKeys(options);
  if (optionFields.length > 1 || (optionFields.length === 1 && optionFields[0] !== 'fixtureCase')) {
    throw new Error('Home catalog review options contain unsupported fields.');
  }

  // <lang><zh-CN>显式字段必须是普通 enumerable data property；accessor 永不执行，防止 getter 读取宿主状态或产生副作用。</zh-CN><en>An explicit field must be an ordinary enumerable data property; an accessor is never executed, preventing a getter from reading host state or causing side effects.</en></lang>
  const fixtureCaseDescriptor = optionFields.length === 0
    ? null
    : Object.getOwnPropertyDescriptor(options, 'fixtureCase');
  if (fixtureCaseDescriptor !== null && (!Object.hasOwn(fixtureCaseDescriptor, 'value') || fixtureCaseDescriptor.enumerable !== true)) {
    throw new Error('Home catalog review fixtureCase must be an enumerable data property.');
  }

  // <lang><zh-CN>没有显式字段时采用发布安全的 ready；有字段时只读取 descriptor 中已取得的原始 primitive。</zh-CN><en>Use release-safe ready when no field is explicit; when present, read only the original primitive already obtained from its descriptor.</en></lang>
  const fixtureCase = fixtureCaseDescriptor === null ? 'ready' : fixtureCaseDescriptor.value;
  if (!HOME_CATALOG_REVIEW_CASES.includes(fixtureCase)) {
    throw new Error('Home catalog review case is not allowed.');
  }

  // <lang><zh-CN>返回固定 string，后续 adapter 只执行静态分支。</zh-CN><en>Return a fixed string so the adapter later executes only static branches.</en></lang>
  return fixtureCase;
}

/**
 * <lang><zh-CN>为 loading 审阅占位一个永不主动触发的 timeout token。</zh-CN><en>Reserves a timeout token for loading review without ever firing it proactively.</en></lang>
 * @param {Function} callback <lang><zh-CN>Biz runtime 提供的 timeout callback；本夹具明确不执行它。</zh-CN><en>Timeout callback supplied by the Biz runtime; this fixture explicitly does not execute it.</en></lang>
 * @param {number} delayMs <lang><zh-CN>Biz runtime 的受限 timeout 值；本夹具不把它当作等待时间。</zh-CN><en>Bounded timeout value from the Biz runtime; this fixture does not treat it as a wait duration.</en></lang>
 * @returns {object} <lang><zh-CN>可交还给 clearSchedule 的固定 token。</zh-CN><en>Fixed token that may be returned to clearSchedule.</en></lang>
 * @lang zh-CN 该行为仅使显式 loading review build 稳定停留在 D-1；普通构建仍使用 runtime 默认 timer。
 * @lang en This behavior only keeps an explicit loading-review build stably in D-1; ordinary builds still use the runtime's default timer.
 */
function holdHomeLoadingReviewTimeout(callback, delayMs) {
  // <lang><zh-CN>明确丢弃 callback 引用，不缓存、包装或执行业务外行为。</zh-CN><en>Explicitly discard the callback reference without caching, wrapping, or executing behavior outside the business flow.</en></lang>
  void callback;
  // <lang><zh-CN>明确不读取真实延迟，使截图不会随机器速度漂移。</zh-CN><en>Explicitly ignore the real delay so screenshots cannot drift with machine speed.</en></lang>
  void delayMs;
  // <lang><zh-CN>返回不含调用数据的稳定 token。</zh-CN><en>Return the stable token containing no invocation data.</en></lang>
  return HOME_LOADING_REVIEW_TIMER_TOKEN;
}

/**
 * <lang><zh-CN>清理 loading 审阅的无动作 timeout token。</zh-CN><en>Clears the no-op timeout token used by loading review.</en></lang>
 * @param {unknown} timerToken <lang><zh-CN>Biz runtime 交还的不透明 token。</zh-CN><en>Opaque token returned by the Biz runtime.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值；没有 timer 或 callback 需要释放。</zh-CN><en>No return value; there is no timer or callback to release.</en></lang>
 * @lang zh-CN clear 函数与 scheduler 成对满足 facade contract，但不拥有 wall-clock resource。
 * @lang en The clear function pairs with the scheduler to satisfy the facade contract but owns no wall-clock resource.
 */
function clearHomeLoadingReviewTimeout(timerToken) {
  // <lang><zh-CN>runtime token 只完成 scheduler pairing；夹具不解释或记录它。</zh-CN><en>The runtime token only completes scheduler pairing; the fixture neither interprets nor records it.</en></lang>
  void timerToken;
}

/**
 * <lang><zh-CN>创建供项目组合根消费的有限首页目录审阅配置。</zh-CN><en>Creates a finite Home-catalog review configuration for the project composition root.</en></lang>
 * @param {unknown} [options={}] <lang><zh-CN>空 record 或精确 `{ fixtureCase }`。</zh-CN><en>Empty record or exact `{ fixtureCase }`.</en></lang>
 * @returns {{fixtureCase: 'ready'|'loading'|'failure'|'empty', runtimeTiming: object}} <lang><zh-CN>冻结 case 与内部 runtime timing。</zh-CN><en>Frozen case and internal runtime timing.</en></lang>
 * @lang zh-CN 只有 loading 获得内部 scheduler；调用方不能传入或替换 timing function。
 * @lang en Only loading receives the internal scheduler; callers cannot supply or replace a timing function.
 */
export function createHomeCatalogReviewFixture(options = {}) {
  // <lang><zh-CN>先完成 exact-shape 与 allowlist 验证，再创建任何 runtime 选项。</zh-CN><en>Complete exact-shape and allowlist validation before creating any runtime option.</en></lang>
  const fixtureCase = normalizeHomeCatalogReviewCase(options);

  // <lang><zh-CN>loading 使用模块自有 function pair；其余 case 返回空 timing 并保留 Biz 默认 timer。</zh-CN><en>Loading uses the module-owned function pair; other cases return empty timing and retain the Biz default timer.</en></lang>
  const runtimeTiming = fixtureCase === 'loading'
    ? Object.freeze({
      schedule: holdHomeLoadingReviewTimeout,
      clearSchedule: clearHomeLoadingReviewTimeout
    })
    : Object.freeze({});

  // <lang><zh-CN>冻结 outer result，避免组合根或测试把 ready 改成其他 case。</zh-CN><en>Freeze the outer result so the composition root or a test cannot change ready into another case.</en></lang>
  return Object.freeze({ fixtureCase, runtimeTiming });
}

/**
 * <lang><zh-CN>读取由 Vite 固定 define 写入当前 bundle 的首页目录审阅 case。</zh-CN><en>Reads the Home-catalog review case written into the current bundle by a fixed Vite define.</en></lang>
 * @returns {'ready'|'loading'|'failure'|'empty'} <lang><zh-CN>构建期 case；直接 Node 测试与普通未 define 环境为 ready。</zh-CN><en>Build-time case; direct Node tests and ordinary undefined environments use ready.</en></lang>
 * @throws {Error} <lang><zh-CN>构建工具注入未知值时失败关闭。</zh-CN><en>Fails closed when the build tool injects an unknown value.</en></lang>
 * @lang zh-CN 唯一输入是编译期 string literal；函数不读取 process.env、global property、route 或 storage。
 * @lang en The sole input is a compile-time string literal; the function reads no process.env, global property, route, or storage.
 */
export function getCompiledHomeCatalogReviewCase() {
  // <lang><zh-CN>Node 直接 import 时 identifier 不存在，`typeof` 安全回退 ready；Vite 则把两处标识符替换为同一 string literal。</zh-CN><en>When Node imports directly the identifier is absent and `typeof` safely falls back to ready; Vite replaces both identifiers with the same string literal.</en></lang>
  const compiledCase = typeof __HIA_HOME_CATALOG_REVIEW_CASE__ === 'string'
    ? __HIA_HOME_CATALOG_REVIEW_CASE__
    : 'ready';

  // <lang><zh-CN>复用同一个 exact allowlist，不让构建 define 绕过 fixture contract。</zh-CN><en>Reuse the same exact allowlist so a build define cannot bypass the fixture contract.</en></lang>
  return normalizeHomeCatalogReviewCase({ fixtureCase: compiledCase });
}
