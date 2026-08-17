/**
 * <lang><zh-CN>验证 BP runtime locale 的有限归一化、优先级、storage 失败、领域投影与平台管理 tab bridge；测试不连接 UniApp、网络、账号或真实 storage。</zh-CN><en>Verifies BP runtime locale normalization, priority, storage failure, domain projection, and the platform-managed tab bridge; tests connect to no UniApp, network, account, or real storage.</en></lang>
 * @lang zh-CN 假 facade 只模拟规格允许的返回值与失败，不将测试扩展成平台集成测试。
 * @lang en The fake facade simulates only spec-permitted returns and failures; it does not expand tests into platform integration tests.
 */

// <lang><zh-CN>使用 Node 内建测试与严格断言，不引入额外测试依赖。</zh-CN><en>Use Node built-in tests and strict assertions without an extra test dependency.</en></lang>
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BP_LOCALE_PREFERENCE_KEY,
  createRuntimeLocaleStore,
  createUniLocalePlatform,
  formatDemoDate,
  localize,
  normalizeSystemLanguage,
  resolveRuntimeUniApi,
  resolveRuntimeLocale,
  useRuntimeLocale
} from '../src/localization/runtime-locale.mjs';
import { createPrimaryTabItems, navigateBackOrOpenPrimaryPage, openPrimaryPage, syncPrimaryTabChrome } from '../src/localization/runtime-chrome.mjs';

/**
 * <lang><zh-CN>创建一个只记录规格允许操作的 fake locale facade。</zh-CN><en>Creates a fake locale facade that records only spec-permitted operations.</en></lang>
 * @param {object} options <lang><zh-CN>有限系统语言、preference 与写入结果。</zh-CN><en>Finite system language, preference, and write result.</en></lang>
 * @returns {object} <lang><zh-CN>facade 与调用记录。</zh-CN><en>Facade and call record.</en></lang>
 * @lang zh-CN 每个方法都是同步且无副作用的测试替身，除调用记录外不接触真实平台状态。
 * @lang en Each method is a synchronous, side-effect-free test double and touches no real platform state apart from call records.
 */
function createFakeLocaleFacade({ systemLanguage, preference, writeSucceeds = true, removeSucceeds = true }) {
  // <lang><zh-CN>记录只保存 key 和 canonical locale，不记录设备、用户或真实 storage 内容。</zh-CN><en>Record retains only a key and canonical locale, never device, user, or real storage content.</en></lang>
  const calls = [];
  return {
    calls,
    facade: Object.freeze({
      readSystemLanguage: () => systemLanguage,
      readPreference: () => preference,
      writePreference: (locale) => { calls.push(['write', locale]); return writeSucceeds; },
      removePreference: () => { calls.push(['remove']); return removeSucceeds; }
    })
  };
}

test('runtime locale normalizes only zh and en system values', () => {
  // <lang><zh-CN>覆盖规格中的大小写、下划线、区域变体与未知值，不读取宿主系统。</zh-CN><en>Cover spec case, underscore, regional variants, and unknown values without reading the host system.</en></lang>
  assert.equal(normalizeSystemLanguage(' zh_CN '), 'zh-Hans');
  assert.equal(normalizeSystemLanguage('en-US'), 'en');
  assert.equal(normalizeSystemLanguage('fr-FR'), 'zh-Hans');
  assert.equal(normalizeSystemLanguage(null), 'zh-Hans');
});

test('runtime locale gives valid preference priority over system language', () => {
  // <lang><zh-CN>仅合法精确 preference 可覆盖系统；任意旧值继续走系统归一化。</zh-CN><en>Only a valid exact preference overrides system; arbitrary stale values continue through system normalization.</en></lang>
  assert.equal(resolveRuntimeLocale('en', 'zh-CN'), 'en');
  assert.equal(resolveRuntimeLocale('en-US', 'zh-CN'), 'zh-Hans');
  assert.equal(resolveRuntimeLocale(undefined, 'en_GB'), 'en');
});

test('runtime locale keeps an in-memory choice when storage save fails', () => {
  // <lang><zh-CN>构造失败写入，以验证 locale 立即改变且失败状态可发现。</zh-CN><en>Construct a failed write to verify locale changes immediately and failure state is discoverable.</en></lang>
  const fake = createFakeLocaleFacade({ systemLanguage: 'zh-CN', preference: undefined, writeSucceeds: false });
  const store = createRuntimeLocaleStore(fake.facade);
  store.initialize();
  assert.equal(store.selectLocale('en'), true);
  assert.equal(store.locale.value, 'en');
  assert.equal(store.persistenceFailed.value, true);
  assert.deepEqual(fake.calls, [['write', 'en']]);
});

test('follow system deletes only the fixed preference key in the platform facade', () => {
  // <lang><zh-CN>通过 facade 结果测试跟随系统；真实 `uni` key 由单独 wrapper 测试锁定。</zh-CN><en>Test follow-system through facade results; the real `uni` key is locked by a separate wrapper test.</en></lang>
  const fake = createFakeLocaleFacade({ systemLanguage: 'en-US', preference: 'zh-Hans' });
  const store = createRuntimeLocaleStore(fake.facade);
  store.initialize();
  assert.equal(store.followSystem(), 'en');
  assert.equal(store.followsSystem.value, true);
  assert.deepEqual(fake.calls, [['remove']]);
});

test('UniApp locale facade limits storage operations to its fixed key and catches failures', () => {
  // <lang><zh-CN>fake UniApp 仅暴露规格允许 API，验证固定 key 与异常回退。</zh-CN><en>Fake UniApp exposes only spec-permitted APIs, verifying fixed key and exception fallback.</en></lang>
  const calls = [];
  const platform = createUniLocalePlatform({
    getSystemInfoSync: () => ({ language: 'en-GB', ignored: 'not-read' }),
    getStorageSync: (key) => { calls.push(['get', key]); return 'en'; },
    setStorageSync: (key, value) => calls.push(['set', key, value]),
    removeStorageSync: (key) => calls.push(['remove', key])
  });
  assert.equal(platform.readSystemLanguage(), 'en-GB');
  assert.equal(platform.readPreference(), 'en');
  assert.equal(platform.writePreference('en'), true);
  assert.equal(platform.removePreference(), true);
  assert.deepEqual(calls, [['get', BP_LOCALE_PREFERENCE_KEY], ['set', BP_LOCALE_PREFERENCE_KEY, 'en'], ['remove', BP_LOCALE_PREFERENCE_KEY]]);
  assert.equal(createUniLocalePlatform({ getSystemInfoSync: () => { throw new Error('blocked'); } }).readSystemLanguage(), undefined);
});

test('runtime UniApp resolver uses an explicit global compatibility fallback for default platform calls', () => {
  // <lang><zh-CN>Node 没有小程序模块级 `uni` binding，故只验证 H5/测试可用的 global fallback 与默认 facade，而不伪造小程序运行时。</zh-CN><en>Node has no Mini Program module-level `uni` binding, so verify only the H5/test global fallback and default facade without faking Mini Program runtime.</en></lang>
  const previousUni = globalThis.uni;
  const calls = [];
  const fallbackUni = {
    getSystemInfoSync: () => ({ language: 'en-US' }),
    getStorageSync: (key) => { calls.push(['get', key]); return undefined; },
    setStorageSync: (key, value) => calls.push(['set', key, value]),
    removeStorageSync: (key) => calls.push(['remove', key])
  };
  globalThis.uni = fallbackUni;
  try {
    assert.equal(resolveRuntimeUniApi(), fallbackUni);
    const platform = createUniLocalePlatform();
    assert.equal(platform.readSystemLanguage(), 'en-US');
    assert.equal(platform.writePreference('en'), true);
    assert.deepEqual(calls, [['set', BP_LOCALE_PREFERENCE_KEY, 'en']]);
  } finally {
    // <lang><zh-CN>无论断言是否失败都恢复 Node 全局，避免影响同文件之后的共享 locale 测试。</zh-CN><en>Restore the Node global whether assertions fail or pass, preventing impact on later shared-locale tests in this file.</en></lang>
    if (previousUni === undefined) delete globalThis.uni;
    else globalThis.uni = previousUni;
  }
});

test('domain projection and fixed date labels never produce bilingual concatenation', () => {
  // <lang><zh-CN>领域投影只选择一个语言值，日期标签也由当前 locale 单独生成。</zh-CN><en>Domain projection selects one language value only, and date labels are likewise generated per current locale.</en></lang>
  assert.equal(localize({ 'zh-Hans': '场地', en: 'Court' }, 'en'), 'Court');
  assert.equal(localize({ 'zh-Hans': '场地', en: '' }, 'en'), '场地');
  assert.equal(formatDemoDate('2026-08-08', 'zh-Hans'), '8 月 8 日');
  assert.equal(formatDemoDate('2026-08-08', 'en'), 'Aug 8');
  assert.equal(formatDemoDate('not-a-date', 'en'), '');
});

test('runtime chrome creates localized primary-tab items without dynamic input', () => {
  // <lang><zh-CN>共享 store 切换为英文；tab items 直接由 translator 生成，不创建任何平台壳调用。</zh-CN><en>Switch the shared store to English; tab items are created directly from the translator without any platform-shell call.</en></lang>
  useRuntimeLocale().selectLocale('en');
  const runtimeLocale = useRuntimeLocale();
  assert.deepEqual(createPrimaryTabItems((messageKey) => runtimeLocale.t(messageKey)), [
    { value: 'home', label: 'Home' },
    { value: 'discover', label: 'Discover' },
    { value: 'reservations', label: 'My bookings' },
    { value: 'profile', label: 'Profile' }
  ]);
});

test('platform-managed chrome allows only fixed primary routes and provides a bounded back fallback', () => {
  // <lang><zh-CN>平台替身只记录本地导航；未知 tab 必须零调用，返回失败只能进入固定发现页。</zh-CN><en>The platform double records local navigation only; an unknown tab must cause zero calls, and a failed back can enter only the fixed Discover page.</en></lang>
  const calls = [];
  const shell = {
    switchTab: (payload) => calls.push(['switchTab', payload]),
    navigateBack: (payload) => {
      calls.push(['navigateBack', { delta: payload.delta }]);
      payload.fail();
    }
  };

  // <lang><zh-CN>直接主页面导航只解析冻结 value；任意字符串不会变成 URL。</zh-CN><en>Direct primary-page navigation resolves only a frozen value; an arbitrary string never becomes a URL.</en></lang>
  assert.equal(openPrimaryPage('home', shell), true);
  assert.equal(openPrimaryPage('https://example.invalid', shell), false);

  // <lang><zh-CN>返回 API 的 fail callback 复用同一固定路由 helper。</zh-CN><en>The back API fail callback reuses the same fixed-route helper.</en></lang>
  assert.equal(navigateBackOrOpenPrimaryPage('discover', shell), true);
  assert.deepEqual(calls, [
    ['switchTab', { url: '/pages/home/index' }],
    ['navigateBack', { delta: 1 }],
    ['switchTab', { url: '/pages/discover/index' }]
  ]);
});

test('primary tab chrome synchronizes WeChat custom state before native host labels', () => {
  // <lang><zh-CN>custom tab 实例只记录当前 value/locale；存在该实例时绝不触发 native tab API。</zh-CN><en>The custom-tab instance records only current value/locale; while it exists, no native-tab API may run.</en></lang>
  const previousPlatform = process.env.UNI_PLATFORM;
  const customUpdates = [];
  const nativeCalls = [];
  const translate = (messageKey) => ({
    'nav.home': 'Home',
    'nav.discover': 'Discover',
    'nav.reservations': 'My bookings',
    'nav.profile': 'Profile',
    'title.profile': 'Profile'
  })[messageKey];
  const currentPage = { getTabBar: () => ({ setData: (payload) => customUpdates.push(payload) }) };

  try {
    // <lang><zh-CN>官方编译平台值为微信时同步当前实例后立即返回，不调用作为测试替身提供的 setTabBarItem。</zh-CN><en>When the official compiled-platform value is WeChat, synchronize the current instance and return immediately without calling the test-double setTabBarItem.</en></lang>
    process.env.UNI_PLATFORM = 'mp-weixin';
    assert.equal(syncPrimaryTabChrome('profile', 'en', translate, {
      pages: [currentPage],
      uniApi: { setTabBarItem: (payload) => nativeCalls.push(payload) }
    }), true);
    assert.deepEqual(customUpdates, [{ selected: 'profile', locale: 'en' }]);
    assert.deepEqual(nativeCalls, []);

    // <lang><zh-CN>其他编译宿主没有 custom 实例时只更新四个固定 index/text，仍不接收调用方 URL。</zh-CN><en>Another compiled host without a custom instance updates only four fixed index/text pairs and still accepts no caller URL.</en></lang>
    process.env.UNI_PLATFORM = 'app-plus';
    assert.equal(syncPrimaryTabChrome('home', 'en', translate, {
      pages: [],
      uniApi: { setTabBarItem: (payload) => nativeCalls.push(payload) }
    }), true);
    assert.deepEqual(nativeCalls, [
      { index: 0, text: 'Home' },
      { index: 1, text: 'Discover' },
      { index: 2, text: 'My bookings' },
      { index: 3, text: 'Profile' }
    ]);
  } finally {
    // <lang><zh-CN>精确恢复测试前的编译平台环境，避免泄漏到其他 runtime 用例。</zh-CN><en>Restore the pre-test compiled-platform environment exactly, preventing leakage into other runtime cases.</en></lang>
    if (previousPlatform === undefined) delete process.env.UNI_PLATFORM;
    else process.env.UNI_PLATFORM = previousPlatform;
  }
});

test('H5 compatibility wx global never suppresses the application-owned tab boundary', () => {
  // <lang><zh-CN>保存可能存在的 Node 全局，测试结束后逐项恢复，避免影响同进程其他平台测试。</zh-CN><en>Retain any existing Node globals and restore each after the test, preventing impact on other platform tests in the same process.</en></lang>
  const previousWx = globalThis.wx;
  const previousDocument = globalThis.document;
  const previousPlatform = process.env.UNI_PLATFORM;
  const nativeCalls = [];

  // <lang><zh-CN>翻译替身只返回四个受审 label 与当前页标题，不读取 runtime store 或任意输入。</zh-CN><en>The translation double returns only four reviewed labels and the current-page title and reads neither the runtime store nor arbitrary input.</en></lang>
  const translate = (messageKey) => ({
    'nav.home': 'Home',
    'nav.discover': 'Discover',
    'nav.reservations': 'My bookings',
    'nav.profile': 'Profile',
    'title.profile': 'Profile'
  })[messageKey];

  try {
    // <lang><zh-CN>复现 UniApp H5：浏览器 document 存在，同时兼容层暴露空 wx；显式 H5 分支必须隐藏 native tab，而不是更新已隐藏 label。</zh-CN><en>Reproduce UniApp H5: browser document exists while the compatibility layer exposes an empty wx; the explicit H5 branch must hide the native tab rather than update hidden labels.</en></lang>
    globalThis.wx = {};
    globalThis.document = { title: 'Stale tab title' };
    process.env.UNI_PLATFORM = 'h5';
    assert.equal(syncPrimaryTabChrome('profile', 'en', translate, {
      pages: [],
      uniApi: {
        hideTabBar: (payload) => nativeCalls.push(['hideTabBar', payload]),
        setTabBarItem: (payload) => nativeCalls.push(['setTabBarItem', payload])
      }
    }), true);
    assert.deepEqual(nativeCalls, [['hideTabBar', { animation: false }]]);
    assert.equal(globalThis.document.title, 'Profile');
  } finally {
    // <lang><zh-CN>不存在的原始全局用删除恢复，已有值则精确写回原引用。</zh-CN><en>Restore an originally absent global by deletion and an existing value by writing back its exact reference.</en></lang>
    if (previousWx === undefined) delete globalThis.wx;
    else globalThis.wx = previousWx;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousPlatform === undefined) delete process.env.UNI_PLATFORM;
    else process.env.UNI_PLATFORM = previousPlatform;
  }
});
