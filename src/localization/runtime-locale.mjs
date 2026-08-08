/**
 * <lang><zh-CN>BP 的受限 runtime locale state：解析系统语言、本机 preference 与静态文案；不读取账号、网络、UA、设备标识或动态翻译。</zh-CN><en>Constrained runtime-locale state for the BP: resolves system language, device-local preference, and static copy; it reads no account, network, user agent, device identifier, or dynamic translation.</en></lang>
 * @lang zh-CN 本模块拥有 BP 文案与 preference 策略；HIA-uView UI provider 只接收最终的 canonical locale。
 * @lang en This module owns BP copy and preference policy; the HIA-uView UI provider receives only the resulting canonical locale.
 */

// <lang><zh-CN>使用 Vue 最小 reactive primitives；不注册全局 store、持久化插件或语言 SDK。</zh-CN><en>Use minimum Vue reactive primitives and register no global store, persistence plugin, or language SDK.</en></lang>
import { computed, readonly, ref } from 'vue';
import { BP_MESSAGES, BP_SUPPORTED_LOCALES } from '../locales/messages.mjs';

/**
 * <lang><zh-CN>唯一允许保存的设备本机 preference key。</zh-CN><en>The sole device-local preference key allowed to be stored.</en></lang>
 * @lang zh-CN key 不包含用户、账号、租户、环境或远端 scope，且只保存受支持 locale ID。
 * @lang en The key contains no user, account, tenant, environment, or remote scope and stores only a supported locale ID.
 */
export const BP_LOCALE_PREFERENCE_KEY = 'bp-uv-resource-booking.locale-preference.v1';

/**
 * <lang><zh-CN>将候选值严格收敛到 BP 已支持的 locale，未知值返回 `null` 而不猜测语言。</zh-CN><en>Strictly narrows a candidate to a BP-supported locale; an unknown value returns `null` without guessing a language.</en></lang>
 * @param {unknown} locale <lang><zh-CN>待验证的候选 locale。</zh-CN><en>Candidate locale to validate.</en></lang>
 * @returns {'zh-Hans'|'en'|null} <lang><zh-CN>受支持 locale 或 `null`。</zh-CN><en>A supported locale or `null`.</en></lang>
 */
export function normalizeBpLocale(locale) {
  // <lang><zh-CN>只接受两个精确 canonical ID，避免 preference 保存平台别名或任意文本。</zh-CN><en>Accept only the two exact canonical IDs, preventing preference from storing platform aliases or arbitrary text.</en></lang>
  return BP_SUPPORTED_LOCALES.includes(locale) ? locale : null;
}

/**
 * <lang><zh-CN>归一受限系统语言读取的原始值。</zh-CN><en>Normalizes the raw value from the constrained system-language read.</en></lang>
 * @param {unknown} language <lang><zh-CN>平台返回的候选语言值。</zh-CN><en>Candidate language value returned by the platform.</en></lang>
 * @returns {'zh-Hans'|'en'} <lang><zh-CN>受支持 locale；未知输入稳定回退简体中文。</zh-CN><en>A supported locale; unknown input deterministically falls back to Simplified Chinese.</en></lang>
 */
export function normalizeSystemLanguage(language) {
  // <lang><zh-CN>非字符串、空值或异常形状没有可安全归一化的 BCP 47 含义。</zh-CN><en>Non-string, empty, or exceptional shapes have no BCP 47 meaning that can be safely normalized.</en></lang>
  if (typeof language !== 'string') return 'zh-Hans';

  // <lang><zh-CN>只进行规格允许的 trim、lowercase 和下划线到连字符处理，不尝试解析区域或脚本注册表。</zh-CN><en>Perform only spec-permitted trim, lowercase, and underscore-to-hyphen conversion; do not parse region or script registries.</en></lang>
  const normalized = language.trim().toLowerCase().replaceAll('_', '-');

  // <lang><zh-CN>中文及其变体归入简体中文，英语及其变体归入英文；其他语言没有对应 BP 资源。</zh-CN><en>Chinese and its variants map to Simplified Chinese, English and its variants to English; other languages have no corresponding BP resource.</en></lang>
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  return 'zh-Hans';
}

/**
 * <lang><zh-CN>按有效 preference、系统语言、默认值的固定优先级选择运行时 locale。</zh-CN><en>Selects runtime locale with the fixed priority of valid preference, system language, and default.</en></lang>
 * @param {unknown} preference <lang><zh-CN>读取到的本机 preference。</zh-CN><en>Device-local preference read from storage.</en></lang>
 * @param {unknown} systemLanguage <lang><zh-CN>受限系统读取的语言值。</zh-CN><en>Language value from the constrained system read.</en></lang>
 * @returns {'zh-Hans'|'en'} <lang><zh-CN>可直接供 BP 与 UI provider 使用的 canonical locale。</zh-CN><en>Canonical locale directly usable by the BP and UI provider.</en></lang>
 */
export function resolveRuntimeLocale(preference, systemLanguage) {
  // <lang><zh-CN>仅有效 preference 才能越过系统语言，不让旧值或任意存储内容劫持显示语言。</zh-CN><en>Only a valid preference may override system language, so stale or arbitrary storage cannot hijack the display language.</en></lang>
  return normalizeBpLocale(preference) ?? normalizeSystemLanguage(systemLanguage);
}

/**
 * <lang><zh-CN>从同一 locale 的静态资源解析一条已声明的消息。</zh-CN><en>Resolves one declared message from static resources of the same locale.</en></lang>
 * @param {unknown} locale <lang><zh-CN>候选显示 locale。</zh-CN><en>Candidate display locale.</en></lang>
 * @param {string} key <lang><zh-CN>第一方源码声明的稳定 message key。</zh-CN><en>Stable message key declared by first-party source.</en></lang>
 * @param {Record<string, string|number>} [values] <lang><zh-CN>受控占位符值。</zh-CN><en>Controlled placeholder values.</en></lang>
 * @returns {string} <lang><zh-CN>本地化消息或安全的通用 fallback。</zh-CN><en>Localized message or a safe generic fallback.</en></lang>
 */
export function translate(locale, key, values = {}) {
  // <lang><zh-CN>无效 locale 确定性回退中文资源；message key 缺失不会回显内部 key。</zh-CN><en>An invalid locale deterministically falls back to Chinese resources; a missing message key never echoes the internal key.</en></lang>
  const messages = BP_MESSAGES[normalizeBpLocale(locale) ?? 'zh-Hans'];
  const template = messages[key] ?? messages['common.notAvailable'];

  // <lang><zh-CN>占位符替换只处理调用方给出的扁平文本/数字，不执行表达式、HTML 或对象序列化。</zh-CN><en>Placeholder substitution handles only caller-provided flat text/numbers and executes no expression, HTML, or object serialization.</en></lang>
  return template.replace(/\{([a-zA-Z0-9]+)\}/g, (placeholder, name) => Object.hasOwn(values, name) ? String(values[name]) : placeholder);
}

/**
 * <lang><zh-CN>投影领域对象的双语字段，遵循当前语言、简体中文、英文、空字符串的固定回退次序。</zh-CN><en>Projects a bilingual domain field with the fixed fallback order of current language, Simplified Chinese, English, and empty string.</en></lang>
 * @param {unknown} localizedValue <lang><zh-CN>领域对象中的有限双语字段。</zh-CN><en>Finite bilingual field in a domain object.</en></lang>
 * @param {unknown} locale <lang><zh-CN>候选显示 locale。</zh-CN><en>Candidate display locale.</en></lang>
 * @returns {string} <lang><zh-CN>安全显示文本；不返回对象、数组或任意输入。</zh-CN><en>Safe display text; never returns an object, array, or arbitrary input.</en></lang>
 */
export function localize(localizedValue, locale) {
  // <lang><zh-CN>只接受非数组对象，避免模板把不受控值隐式转换成用户可见字符串。</zh-CN><en>Accept only a non-array object, avoiding implicit conversion of uncontrolled values into user-visible text in templates.</en></lang>
  if (typeof localizedValue !== 'object' || localizedValue === null || Array.isArray(localizedValue)) return '';

  // <lang><zh-CN>先确定当前 canonical locale，再按规格采用静态 fallback key 顺序。</zh-CN><en>Determine the current canonical locale first, then use the spec's static fallback-key order.</en></lang>
  const canonicalLocale = normalizeBpLocale(locale) ?? 'zh-Hans';
  const candidates = [localizedValue[canonicalLocale], localizedValue['zh-Hans'], localizedValue.en];

  // <lang><zh-CN>仅返回首个非空字符串，避免空白、数字或对象成为可见领域文本。</zh-CN><en>Return only the first non-empty string, preventing whitespace, numbers, or objects from becoming visible domain text.</en></lang>
  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim()) ?? '';
}

/**
 * <lang><zh-CN>将受控 ISO 日期格式化为当前 BP 语言的稳定短标签。</zh-CN><en>Formats a controlled ISO date as a stable short label in the current BP language.</en></lang>
 * @param {string} isoDate <lang><zh-CN>checked-in fixture 或 domain 产生的 YYYY-MM-DD 日期。</zh-CN><en>YYYY-MM-DD date produced by checked-in fixture or domain.</en></lang>
 * @param {unknown} locale <lang><zh-CN>候选显示 locale。</zh-CN><en>Candidate display locale.</en></lang>
 * @returns {string} <lang><zh-CN>有限日期标签；无效输入返回空字符串。</zh-CN><en>Finite date label; invalid input returns an empty string.</en></lang>
 */
export function formatDemoDate(isoDate, locale) {
  // <lang><zh-CN>日期不是用户输入，也不调用宿主时钟；严格格式检查避免隐式 Date 时区转换。</zh-CN><en>The date is not user input and does not call a host clock; strict format checking avoids implicit Date time-zone conversion.</en></lang>
  const match = typeof isoDate === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate) : null;
  if (!match) return '';

  // <lang><zh-CN>将月日转为有限数字，输出不包含时区、年份推断或平台相关 Intl 行为。</zh-CN><en>Convert month/day to finite numbers; output contains no time zone, year inference, or platform-specific Intl behavior.</en></lang>
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';

  // <lang><zh-CN>英文使用审核后的静态月缩写；中文使用固定月/日句式，避免页面硬编码双语日期。</zh-CN><en>English uses reviewed static month abbreviations; Chinese uses a fixed month/day form, avoiding page-level hard-coded bilingual dates.</en></lang>
  if (normalizeBpLocale(locale) === 'en') {
    const months = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    return `${months[month - 1]} ${day}`;
  }
  return `${month} 月 ${day} 日`;
}

/**
 * <lang><zh-CN>创建只使用允许 UniApp API 的窄平台 locale facade。</zh-CN><en>Creates a narrow platform-locale facade that uses only permitted UniApp APIs.</en></lang>
 * @param {unknown} [uniApi] <lang><zh-CN>可选的 UniApp API 对象，测试可传入假对象。</zh-CN><en>Optional UniApp API object; tests may supply a fake object.</en></lang>
 * @returns {object} <lang><zh-CN>系统语言与 preference 的受异常保护读写操作。</zh-CN><en>Exception-protected system-language and preference read/write operations.</en></lang>
 * @lang zh-CN facade 不公开原始平台对象，且绝不因可选 API 缺失而抛出到页面。
 * @lang en The facade exposes no raw platform object and never throws to pages when an optional API is absent.
 */
export function createUniLocalePlatform(uniApi = globalThis.uni) {
  /**
   * <lang><zh-CN>受限读取系统 language 字段。</zh-CN><en>Constrained read of the system `language` field.</en></lang>
   * @returns {unknown} <lang><zh-CN>原始语言值；不可用或失败时为 `undefined`。</zh-CN><en>Raw language value; `undefined` when unavailable or failed.</en></lang>
   * @lang zh-CN 只调用 `getSystemInfoSync`，并且只取其 language 字段；不读取其他系统信息。
   * @lang en Calls only `getSystemInfoSync` and takes only its language field; reads no other system information.
   */
  function readSystemLanguage() {
    // <lang><zh-CN>缺少 API、返回非对象或异常均被受控回退处理。</zh-CN><en>A missing API, non-object return, or exception is handled by controlled fallback.</en></lang>
    try {
      const systemInfo = typeof uniApi?.getSystemInfoSync === 'function' ? uniApi.getSystemInfoSync() : null;
      return typeof systemInfo === 'object' && systemInfo !== null ? systemInfo.language : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * <lang><zh-CN>读取唯一 locale preference key。</zh-CN><en>Reads the sole locale preference key.</en></lang>
   * @returns {unknown} <lang><zh-CN>原始 stored value；不可用或失败时为 `undefined`。</zh-CN><en>Raw stored value; `undefined` when unavailable or failed.</en></lang>
   * @lang zh-CN 不枚举 storage、不读取其他 key，也不把存储异常暴露给页面。
   * @lang en Enumerates no storage, reads no other key, and exposes no storage exception to pages.
   */
  function readPreference() {
    // <lang><zh-CN>存储只读一次，后续 state 只使用内存 ref，避免渲染期间反复读取。</zh-CN><en>Read storage only once; subsequent state uses an in-memory ref, avoiding repeated reads during rendering.</en></lang>
    try {
      return typeof uniApi?.getStorageSync === 'function' ? uniApi.getStorageSync(BP_LOCALE_PREFERENCE_KEY) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * <lang><zh-CN>保存一个已验证的 locale preference。</zh-CN><en>Saves one validated locale preference.</en></lang>
   * @param {'zh-Hans'|'en'} locale <lang><zh-CN>受支持 canonical locale。</zh-CN><en>Supported canonical locale.</en></lang>
   * @returns {boolean} <lang><zh-CN>写入是否完成；失败不抛出。</zh-CN><en>Whether the write completed; failure does not throw.</en></lang>
   * @lang zh-CN 不建立备用 storage 或网络同步路径。
   * @lang en Creates no fallback storage or network-sync path.
   */
  function writePreference(locale) {
    // <lang><zh-CN>只有受支持 locale 才能进入 platform API，防止调用方写入任意持久数据。</zh-CN><en>Only a supported locale may enter the platform API, preventing callers from writing arbitrary persistent data.</en></lang>
    if (!normalizeBpLocale(locale) || typeof uniApi?.setStorageSync !== 'function') return false;
    try {
      uniApi.setStorageSync(BP_LOCALE_PREFERENCE_KEY, locale);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * <lang><zh-CN>删除 locale preference 以恢复跟随系统。</zh-CN><en>Removes the locale preference to resume following the system.</en></lang>
   * @returns {boolean} <lang><zh-CN>删除是否完成；失败不抛出。</zh-CN><en>Whether removal completed; failure does not throw.</en></lang>
   * @lang zh-CN 不清除其他 storage，不替代为覆盖写入空值。
   * @lang en Clears no other storage and does not replace removal with an overwrite of an empty value.
   */
  function removePreference() {
    // <lang><zh-CN>只调用精确 remove API；缺失 API 与异常均导致可发现的内存期失败状态。</zh-CN><en>Call only the exact remove API; a missing API or exception yields a discoverable in-memory failure state.</en></lang>
    try {
      if (typeof uniApi?.removeStorageSync !== 'function') return false;
      uniApi.removeStorageSync(BP_LOCALE_PREFERENCE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  // <lang><zh-CN>返回冻结 facade，避免页面或测试意外重写某个操作。</zh-CN><en>Return a frozen facade, preventing a page or test from accidentally rewriting an operation.</en></lang>
  return Object.freeze({ readSystemLanguage, readPreference, writePreference, removePreference });
}

/**
 * <lang><zh-CN>创建 BP 的 runtime locale store；测试可注入安全 facade，生产使用受限 UniApp facade。</zh-CN><en>Creates the BP runtime-locale store; tests may inject a safe facade while production uses the constrained UniApp facade.</en></lang>
 * @param {object} [platform] <lang><zh-CN>已受限的 locale 平台 facade。</zh-CN><en>Already constrained locale-platform facade.</en></lang>
 * @returns {object} <lang><zh-CN>只读状态、显示 helper 与明确 locale actions。</zh-CN><en>Readonly state, display helpers, and explicit locale actions.</en></lang>
 * @lang zh-CN store 只处理 locale；不承担业务 state、路由、provider、身份或远端 source 责任。
 * @lang en The store handles only locale; it owns no business state, routing, provider, identity, or remote-source responsibility.
 */
export function createRuntimeLocaleStore(platform = createUniLocalePlatform()) {
  // <lang><zh-CN>初始值稳定为中文，应用启动后才以受控优先级更新，避免首帧读取失败阻断渲染。</zh-CN><en>Initialize stably in Chinese and update by controlled priority only after app launch, avoiding a failed first read blocking rendering.</en></lang>
  const locale = ref('zh-Hans');
  const storedPreference = ref(null);
  const systemLocale = ref('zh-Hans');
  const persistenceFailed = ref(false);

  /**
   * <lang><zh-CN>从平台 facade 初始化当前 locale。</zh-CN><en>Initializes the current locale from the platform facade.</en></lang>
   * @returns {'zh-Hans'|'en'} <lang><zh-CN>初始化后的 canonical locale。</zh-CN><en>Canonical locale after initialization.</en></lang>
   * @lang zh-CN 无效存储值只被忽略，既不删除也不替换，防止初始化扩大写入范围。
   * @lang en An invalid stored value is only ignored, never removed or replaced, preventing initialization from expanding write scope.
   */
  function initialize() {
    // <lang><zh-CN>读取两种有限输入后先规范系统值，再只保留合法 preference。</zh-CN><en>After reading the two finite inputs, normalize system value first and retain only a valid preference.</en></lang>
    const rawSystemLanguage = platform.readSystemLanguage();
    const rawPreference = platform.readPreference();
    systemLocale.value = normalizeSystemLanguage(rawSystemLanguage);
    storedPreference.value = normalizeBpLocale(rawPreference);
    locale.value = resolveRuntimeLocale(storedPreference.value, rawSystemLanguage);
    persistenceFailed.value = false;
    return locale.value;
  }

  /**
   * <lang><zh-CN>选择并尝试持久化一个明确 BP locale。</zh-CN><en>Selects and attempts to persist one explicit BP locale.</en></lang>
   * @param {unknown} nextLocale <lang><zh-CN>页面选择的候选 locale。</zh-CN><en>Candidate locale selected by a page.</en></lang>
   * @returns {boolean} <lang><zh-CN>候选是否合法；存储失败不会撤销本次内存选择。</zh-CN><en>Whether the candidate is valid; a storage failure does not undo this in-memory selection.</en></lang>
   * @lang zh-CN 当前会话立即采用选择，存储失败以 `persistenceFailed` 可发现披露。
   * @lang en The current session adopts the choice immediately and surfaces a storage failure through `persistenceFailed`.
   */
  function selectLocale(nextLocale) {
    // <lang><zh-CN>拒绝未知值，不改变已有 locale 或 storage 状态。</zh-CN><en>Reject an unknown value without changing existing locale or storage state.</en></lang>
    const canonicalLocale = normalizeBpLocale(nextLocale);
    if (!canonicalLocale) return false;

    // <lang><zh-CN>先更新内存状态使 UI 立即响应，再单次尝试写入精确 preference key。</zh-CN><en>Update in-memory state first for immediate UI response, then attempt one write to the exact preference key.</en></lang>
    locale.value = canonicalLocale;
    storedPreference.value = canonicalLocale;
    persistenceFailed.value = !platform.writePreference(canonicalLocale);
    return true;
  }

  /**
   * <lang><zh-CN>在内存中恢复跟随系统，并尝试删除已保存 preference。</zh-CN><en>Resumes following the system in memory and attempts to remove the saved preference.</en></lang>
   * @returns {'zh-Hans'|'en'} <lang><zh-CN>本会话立即使用的系统归一化 locale。</zh-CN><en>System-normalized locale used immediately for this session.</en></lang>
   * @lang zh-CN 删除失败时仍保留内存的跟随系统选择并可发现披露；不使用替代存储。
   * @lang en On removal failure, retain the in-memory follow-system choice and disclose it; use no alternate storage.
   */
  function followSystem() {
    // <lang><zh-CN>系统值来自初始化时的受限读取；不在用户点击后额外读取设备信息。</zh-CN><en>System value comes from the constrained initialization read; no extra device information is read after the user click.</en></lang>
    storedPreference.value = null;
    locale.value = systemLocale.value;
    persistenceFailed.value = !platform.removePreference();
    return locale.value;
  }

  // <lang><zh-CN>只读计算值用于个人信息页，避免模板自行判断 preference 优先级。</zh-CN><en>Readonly computed values serve the Profile page, avoiding template-level reimplementation of preference priority.</en></lang>
  const followsSystem = computed(() => storedPreference.value === null);
  const currentLocaleName = computed(() => translate(locale.value, locale.value === 'en' ? 'locale.enName' : 'locale.zhName'));

  // <lang><zh-CN>返回同一 store 的受限 surface，既不暴露可写 ref，也不允许调用方替换 platform facade。</zh-CN><en>Return the constrained surface of one store, exposing neither writable refs nor replacement of the platform facade.</en></lang>
  return Object.freeze({
    locale: readonly(locale),
    storedPreference: readonly(storedPreference),
    systemLocale: readonly(systemLocale),
    persistenceFailed: readonly(persistenceFailed),
    followsSystem: readonly(followsSystem),
    currentLocaleName: readonly(currentLocaleName),
    initialize,
    selectLocale,
    followSystem,
    t: (key, values) => translate(locale.value, key, values),
    localize: (value) => localize(value, locale.value),
    formatDate: (value) => formatDemoDate(value, locale.value)
  });
}

/**
 * <lang><zh-CN>应用共享的唯一 runtime locale store。</zh-CN><en>The sole runtime-locale store shared by the application.</en></lang>
 * @lang zh-CN 其生命周期等同当前应用运行期；没有跨会话内存、账号同步或多租户 scope。
 * @lang en Its lifecycle equals the current app runtime; it has no cross-session memory, account sync, or multi-tenant scope.
 */
const runtimeLocaleStore = createRuntimeLocaleStore();

/**
 * <lang><zh-CN>读取应用共享 runtime locale surface。</zh-CN><en>Reads the application-shared runtime-locale surface.</en></lang>
 * @returns {object} <lang><zh-CN>受限 runtime locale store。</zh-CN><en>The constrained runtime-locale store.</en></lang>
 * @lang zh-CN 此函数不创建新 store，确保每个页面、共用组件和 UI provider 使用同一选择。
 * @lang en This function creates no new store, ensuring every page, shared component, and UI provider uses one selection.
 */
export function useRuntimeLocale() {
  // <lang><zh-CN>返回已冻结共享 surface，不读取平台或执行 storage I/O。</zh-CN><en>Return the frozen shared surface and perform no platform read or storage I/O.</en></lang>
  return runtimeLocaleStore;
}

/**
 * <lang><zh-CN>在应用 launch 时初始化共享 runtime locale。</zh-CN><en>Initializes the shared runtime locale at application launch.</en></lang>
 * @returns {'zh-Hans'|'en'} <lang><zh-CN>初始化后的 canonical locale。</zh-CN><en>Canonical locale after initialization.</en></lang>
 * @lang zh-CN 仅应用壳应调用本函数；页面只读取 store，避免重复读取系统/存储。
 * @lang en Only the app shell should call this function; pages only read the store, avoiding repeated system/storage reads.
 */
export function initializeRuntimeLocale() {
  // <lang><zh-CN>委托共享 store 的唯一初始化入口。</zh-CN><en>Delegate to the shared store's sole initialization entry.</en></lang>
  return runtimeLocaleStore.initialize();
}
