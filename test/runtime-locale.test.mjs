/**
 * <lang><zh-CN>验证 BP runtime locale 的有限归一化、优先级、storage 失败、领域投影和壳文本；测试不连接 UniApp、网络、账号或真实 storage。</zh-CN><en>Verifies BP runtime locale normalization, priority, storage failure, domain projection, and shell copy; tests connect to no UniApp, network, account, or real storage.</en></lang>
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
  resolveRuntimeLocale,
  useRuntimeLocale
} from '../src/localization/runtime-locale.mjs';
import { applyPageTitle, applyRuntimeTabLabels } from '../src/localization/runtime-chrome.mjs';

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

test('domain projection and fixed date labels never produce bilingual concatenation', () => {
  // <lang><zh-CN>领域投影只选择一个语言值，日期标签也由当前 locale 单独生成。</zh-CN><en>Domain projection selects one language value only, and date labels are likewise generated per current locale.</en></lang>
  assert.equal(localize({ 'zh-Hans': '场地', en: 'Court' }, 'en'), 'Court');
  assert.equal(localize({ 'zh-Hans': '场地', en: '' }, 'en'), '场地');
  assert.equal(formatDemoDate('2026-08-08', 'zh-Hans'), '8 月 8 日');
  assert.equal(formatDemoDate('2026-08-08', 'en'), 'Aug 8');
  assert.equal(formatDemoDate('not-a-date', 'en'), '');
});

test('runtime chrome projects localized tab and title text through safe platform calls', () => {
  // <lang><zh-CN>共享 store 切换为英文；平台 stub 只收集固定 API 的文本 payload。</zh-CN><en>Switch shared store to English; platform stub collects copy payloads from fixed APIs only.</en></lang>
  useRuntimeLocale().selectLocale('en');
  const calls = [];
  const shell = {
    setTabBarItem: (payload) => calls.push(['tab', payload]),
    setNavigationBarTitle: (payload) => calls.push(['title', payload])
  };
  assert.equal(applyRuntimeTabLabels(shell), 4);
  assert.equal(applyPageTitle('title.profile', shell), true);
  assert.deepEqual(calls, [
    ['tab', { index: 0, text: 'Home' }],
    ['tab', { index: 1, text: 'Discover' }],
    ['tab', { index: 2, text: 'My bookings' }],
    ['tab', { index: 3, text: 'Profile' }],
    ['title', { title: 'Profile' }]
  ]);
});
