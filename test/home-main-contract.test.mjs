/**
 * <lang><zh-CN>锁定 W-uv-P70 首页主态的独立 Hero、紧凑英文 chrome、H5 HIA-uView 主导航与两项无障碍 touch-improve；测试只读取固定源码，不运行页面、平台 API、路由或业务操作。</zh-CN><en>Locks W-uv-P70 Home main state's independent hero, compact English chrome, H5 HIA-uView primary navigation, and two accessibility touch-improvements; the test reads only fixed source and runs no page, platform API, route, or business operation.</en></lang>
 * @lang zh-CN 本文件验证实施边界而非像素等价；H5/微信截图与维护者逐页决定仍是视觉接受依据。
 * @lang en This file verifies the implementation boundary rather than pixel equivalence; H5/WeChat screenshots and page-by-page maintainer decisions remain the visual-acceptance evidence.
 */

// <lang><zh-CN>只使用 Node 内建断言、文件和 test runner，避免为静态合同增加浏览器或网络依赖。</zh-CN><en>Use only Node built-in assertion, file access, and the test runner, avoiding browser or network dependencies for the static contract.</en></lang>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

/**
 * <lang><zh-CN>待复核的固定第一方源码 URL。</zh-CN><en>Fixed first-party source URLs under review.</en></lang>
 * @lang zh-CN 清单不扫描目录，也不允许 CLI、query 或用户内容选择文件。
 * @lang en The list scans no directory and lets no CLI value, query, or user content select a file.
 */
const sourceUrls = Object.freeze({
  app: new URL('../src/App.vue', import.meta.url),
  assetMap: new URL('../src/data/asset-map.mjs', import.meta.url),
  home: new URL('../src/pages/home/index.vue', import.meta.url),
  messages: new URL('../src/locales/messages.mjs', import.meta.url),
  primaryTab: new URL('../src/components/PrimaryTabBar.vue', import.meta.url),
  resourceCard: new URL('../src/components/ResourceCard.vue', import.meta.url),
  runtimeShell: new URL('../src/components/RuntimePageShell.vue', import.meta.url),
  sourceBadge: new URL('../src/components/SourceBadge.vue', import.meta.url)
});

/**
 * @lang zh-CN 读取全部固定源码，供同一测试内执行相互关联的静态断言。
 * @lang en Reads every fixed source so one test can perform related static assertions.
 * @returns {Promise<Record<string, string>>} <lang><zh-CN>按稳定逻辑名称索引的源码文本。</zh-CN><en>Source text indexed by stable logical name.</en></lang>
 */
async function readSources() {
  // <lang><zh-CN>逐项并行读取固定 URL；任一缺失都使测试失败而不是静默跳过合同。</zh-CN><en>Read the fixed URLs in parallel; any missing file fails the test instead of silently skipping a contract.</en></lang>
  const sourceEntries = await Promise.all(Object.entries(sourceUrls).map(async ([sourceName, sourceUrl]) => [sourceName, await readFile(sourceUrl, 'utf8')]));

  // <lang><zh-CN>转换为无原型依赖的普通 record，仅用于当前测试读取。</zh-CN><en>Convert to a plain record used only for current-test reads and with no prototype-dependent lookup.</en></lang>
  return Object.fromEntries(sourceEntries);
}

test('Home main state keeps the approved presentation, navigation, and accessibility boundaries', async function verifyHomeMainContract() {
  // <lang><zh-CN>一次读取后分别验证 Hero、文案、主导航与语义，避免不同文件时点造成不一致快照。</zh-CN><en>Read once and then verify hero, copy, primary navigation, and semantics, avoiding inconsistent snapshots across file timings.</en></lang>
  const sources = await readSources();

  // <lang><zh-CN>首页必须使用独立 presentation accessor 和专用 ID，不得退回精选场馆图片。</zh-CN><en>Home must use the separate presentation accessor and dedicated ID and must not fall back to the featured venue image.</en></lang>
  assert.match(sources.home, /getPresentationImage\('home-civic-reading-atrium'\)/u);
  assert.doesNotMatch(sources.home, /getVenueImage\('harbor-reading-hall'\)/u);
  assert.match(sources.assetMap, /'home-civic-reading-atrium':\s*homeCivicReadingAtriumImage/u);

  // <lang><zh-CN>英文 chrome/CTA 采用维护者确认的紧凑等义文字；完整正文仍保留公共空间预约含义。</zh-CN><en>English chrome/CTA uses the maintainer-approved compact equivalent copy while body text retains the full public-space booking meaning.</en></lang>
  assert.match(sources.messages, /'app\.brand': 'Clear Spaces'/u);
  assert.match(sources.messages, /'title\.home': 'Clear Spaces'/u);
  assert.match(sources.messages, /'source\.local': 'Local demo'/u);
  assert.match(sources.messages, /'home\.chooseDate': 'Select date'/u);
  assert.match(sources.messages, /'home\.browseVenues': 'View venues'/u);
  assert.equal(sources.messages.includes("'home.title': 'Welcome to Clear Civic Spaces booking'"), true);

  // <lang><zh-CN>双入口的本地图标只作装饰，必须从无障碍树隐藏，避免与按钮文字形成重复或跨语言名称。</zh-CN><en>The local icons in both entries are decorative and must stay hidden from the accessibility tree, preventing duplicate or cross-language names alongside button copy.</en></lang>
  assert.match(sources.home, /action-calendar-light\.svg"[^>]*aria-hidden="true"/u);
  assert.match(sources.home, /action-venue-primary\.svg"[^>]*aria-hidden="true"/u);

  // <lang><zh-CN>中文标题与英文标题使用明确不同的宽度策略，且首页主体采用设计板的白色表面。</zh-CN><en>The Chinese and English headings use explicitly different width strategies, and the Home body uses the board's white surface.</en></lang>
  assert.match(sources.home, /'home-page__title--zh-hans': runtimeLocale\.locale\.value === 'zh-Hans'/u);
  assert.match(sources.home, /\.home-page__title--zh-hans\s*\{\s*max-width:\s*280px;/u);
  assert.match(sources.home, /\.home-page\s*\{[^}]*background:\s*var\(--u-sys-color-surface\);/u);

  // <lang><zh-CN>H5 adapter 必须消费 HIA-uView UTabbar 和八个 27px 登记 PNG，并只把 value 交给固定应用 helper。</zh-CN><en>The H5 adapter must consume HIA-uView UTabbar and all eight registered 27px PNGs and pass only a value to the fixed application helper.</en></lang>
  assert.match(sources.primaryTab, /<u-tabbar[^>]*:model-value="props\.currentPage"[^>]*:items="tabItems"[^>]*@change="handleTabChange"/u);
  assert.equal((sources.primaryTab.match(/static\/icons\/tab-[a-z-]+\.png/gu) ?? []).length, 8);
  assert.match(sources.primaryTab, /openPrimaryPage\(pageValue\)/u);
  assert.doesNotMatch(sources.primaryTab, /selectedPage|ref\(|watch\(/u);
  assert.doesNotMatch(sources.primaryTab, /pagePath|wx\.switchTab/u);

  // <lang><zh-CN>平台边界同时要求 H5 最早隐藏 native surface、壳仅在 H5 编译 adapter，并让首页声明固定 current value。</zh-CN><en>The platform boundary also requires the earliest H5 native-surface hide, an H5-only shell adapter, and Home's fixed current value.</en></lang>
  assert.match(sources.app, /\/\/ #ifdef H5[\s\S]*uni\.hideTabBar\(\{ animation: false/u);
  assert.match(sources.runtimeShell, /<!-- #ifdef H5 -->[\s\S]*<primary-tab-bar[^>]*:current-page="props\.primaryPage"[\s\S]*<!-- #endif -->/u);
  assert.match(sources.home, /<runtime-page-shell[^>]*primary-page="home"/u);

  // <lang><zh-CN>H5 的可访问根文档语言必须跟随同一 runtime locale，且 DOM 写入只能存在于 H5 编译分支；可见页标题由 onShow chrome bridge 负责。</zh-CN><en>H5's accessible root-document language must follow the same runtime locale, and the DOM write may exist only in the H5 compilation branch; the onShow chrome bridge owns the visible-page title.</en></lang>
  assert.match(sources.runtimeShell, /\/\/ #ifdef H5[\s\S]*watchEffect\(function synchronizeH5DocumentLanguage\(\)[\s\S]*document\.documentElement\.lang = runtimeLocale\.locale\.value === 'en' \? 'en' : 'zh-Hans';[\s\S]*\/\/ #endif/u);

  // <lang><zh-CN>source badge 明确保持只读，整卡则提供 H5 键盘焦点与 Enter/Space 等价激活。</zh-CN><en>The source badge explicitly remains informational, while the whole card provides H5 keyboard focus and equivalent Enter/Space activation.</en></lang>
  assert.match(sources.sourceBadge, /<u-tag[^>]*:clickable="false"/u);
  assert.match(sources.resourceCard, /role="button"[^>]*tabindex="0"[^>]*@keydown\.enter\.prevent="handleView"[^>]*@keydown\.space\.prevent="handleView"/u);
});
