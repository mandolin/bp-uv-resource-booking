/**
 * <lang><zh-CN>验证微信自定义头部适配器能以当前状态栏和原生胶囊建立同中心几何，并在平台缺失、抛错或返回畸形值时稳定回退。</zh-CN><en>Verifies that the WeChat custom-header adapter creates center-aligned geometry from the current status bar and native capsule and stably falls back when the platform is missing, throws, or returns malformed values.</en></lang>
 * @lang zh-CN 测试只调用纯适配函数与内存 fixture，不连接微信开发者工具、设备、窗口或网络。
 * @lang en The test calls only a pure adapter and in-memory fixtures and connects to no WeChat DevTools, device, window, or network.
 */

// <lang><zh-CN>只使用 Node 内建断言与 test runner，保持平台几何测试完全离线。</zh-CN><en>Use only Node built-in assertions and the test runner so platform-geometry tests remain fully offline.</en></lang>
import assert from 'node:assert/strict';
import test from 'node:test';
// <lang><zh-CN>被测函数通过显式依赖注入读取 fixture，不直接访问测试宿主全局对象。</zh-CN><en>The function under test reads fixtures through explicit dependency injection and never accesses test-host globals directly.</en></lang>
import { resolveWeChatHeaderLayout } from '../src/adapters/wechat-header-layout.mjs';

/**
 * @lang zh-CN 建立仅含两个现代微信几何 API 的只读 fixture。
 * @lang en Builds a read-only fixture containing only the two modern WeChat geometry APIs.
 * @param {number} statusBarHeight <lang><zh-CN>窗口状态栏高度。</zh-CN><en>Window status-bar height.</en></lang>
 * @param {number} menuTop <lang><zh-CN>菜单胶囊顶边坐标。</zh-CN><en>Menu-capsule top coordinate.</en></lang>
 * @param {number} menuHeight <lang><zh-CN>菜单胶囊高度。</zh-CN><en>Menu-capsule height.</en></lang>
 * @returns {{getWindowInfo: () => object, getMenuButtonBoundingClientRect: () => object}} <lang><zh-CN>可注入适配器的平台对象。</zh-CN><en>Platform object injectable into the adapter.</en></lang>
 */
function createPlatformFixture(statusBarHeight, menuTop, menuHeight) {
  // <lang><zh-CN>每次调用都返回新的最小对象，避免适配器依赖或修改无关平台字段。</zh-CN><en>Each call returns fresh minimal objects, preventing the adapter from depending on or mutating unrelated platform fields.</en></lang>
  return Object.freeze({
    getWindowInfo: () => ({ statusBarHeight }),
    getMenuButtonBoundingClientRect: () => ({ top: menuTop, height: menuHeight })
  });
}

test('aligns custom navigation centers for Dynamic Island and Android geometry', () => {
  // <lang><zh-CN>灵动岛 fixture 的 5px 上留白必须在胶囊下方对称复现，得到 42px 导航栏。</zh-CN><en>The Dynamic Island fixture's 5px upper gap must repeat symmetrically below the capsule, yielding a 42px navigation bar.</en></lang>
  const dynamicIslandLayout = resolveWeChatHeaderLayout(createPlatformFixture(54, 59, 32));
  assert.deepEqual(dynamicIslandLayout, { statusBarHeight: 54, navigationBarHeight: 42 });

  // <lang><zh-CN>普通 Android fixture 使用另一组状态栏与间距，证明实现不依赖机型常量。</zh-CN><en>A regular Android fixture uses different status and gap geometry, proving the implementation does not depend on device constants.</en></lang>
  const androidLayout = resolveWeChatHeaderLayout(createPlatformFixture(24, 28, 32));
  assert.deepEqual(androidLayout, { statusBarHeight: 24, navigationBarHeight: 40 });

  // <lang><zh-CN>返回值冻结，页面壳不能在渲染期间改变同一首帧读数。</zh-CN><en>The result is frozen so the page shell cannot alter the same first-render reading during rendering.</en></lang>
  assert.equal(Object.isFrozen(dynamicIslandLayout), true);
});

test('uses only modern geometry APIs and never consults deprecated system information', () => {
  // <lang><zh-CN>废弃 getter 若被调用会立刻抛错；合格结果证明适配器完全忽略该成员。</zh-CN><en>The deprecated getter throws immediately if called; a valid result proves the adapter ignores that member entirely.</en></lang>
  const platformWithDeprecatedTrap = Object.freeze({
    ...createPlatformFixture(47, 52, 32),
    getSystemInfoSync: () => { throw new Error('deprecated API must not be called'); }
  });

  // <lang><zh-CN>5px 对称留白仍得到 42px 导航栏，且陷阱未触发。</zh-CN><en>The symmetric 5px gap still yields a 42px navigation bar without triggering the trap.</en></lang>
  assert.deepEqual(resolveWeChatHeaderLayout(platformWithDeprecatedTrap), { statusBarHeight: 47, navigationBarHeight: 42 });
});

test('returns null for missing, throwing, or malformed platform geometry', async (testContext) => {
  // <lang><zh-CN>每个负例只破坏一个合同维度，便于定位错误回退边界。</zh-CN><en>Each negative case breaks one contract dimension so the fallback boundary remains diagnosable.</en></lang>
  const invalidCases = Object.freeze([
    Object.freeze({ name: 'missing platform', platform: undefined }),
    Object.freeze({ name: 'missing capsule API', platform: Object.freeze({ getWindowInfo: () => ({ statusBarHeight: 54 }) }) }),
    Object.freeze({ name: 'throwing window API', platform: Object.freeze({ getWindowInfo: () => { throw new Error('unavailable'); }, getMenuButtonBoundingClientRect: () => ({ top: 59, height: 32 }) }) }),
    Object.freeze({ name: 'capsule above status bar', platform: createPlatformFixture(54, 53, 32) }),
    Object.freeze({ name: 'non-finite status bar', platform: createPlatformFixture(Number.NaN, 59, 32) }),
    Object.freeze({ name: 'excessive capsule gap', platform: createPlatformFixture(24, 100, 32) })
  ]);

  // <lang><zh-CN>逐例要求 null；适配器不得抛出、猜测常量或调用另一套系统 API。</zh-CN><en>Require null for every case; the adapter must not throw, guess a constant, or call another system API.</en></lang>
  for (const invalidCase of invalidCases) {
    await testContext.test(invalidCase.name, () => {
      assert.equal(resolveWeChatHeaderLayout(invalidCase.platform), null);
    });
  }
});
