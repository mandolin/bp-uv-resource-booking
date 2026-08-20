/**
 * <lang><zh-CN>锁定发现页主态的公开 UI 采用、source/pagination 事实、紧凑目录几何与滚动加载边界；测试只读取固定源码。</zh-CN><en>Locks the Discover main state's public-UI adoption, source/pagination facts, compact catalog geometry, and scrolling-load boundary; the test reads only fixed source.</en></lang>
 * @lang zh-CN 本门禁不进入筛选面板、初始失败/空态、追加失败或详情页，也不替代微信开发者工具的逐页视觉确认。
 * @lang en This gate enters neither the filter panel, initial failure/empty states, append failure, nor detail, and does not replace page-by-page visual confirmation in WeChat Developer Tools.
 */

// <lang><zh-CN>标准断言、文件读取与测试 runner 提供无浏览器、无网络的确定性静态检查。</zh-CN><en>Standard assertions, file reads, and the test runner provide deterministic static checks without a browser or network.</en></lang>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

/**
 * <lang><zh-CN>发现页主态合同涉及的固定源码 URL。</zh-CN><en>Fixed source URLs involved in the Discover main-state contract.</en></lang>
 * @lang zh-CN 清单不扫描目录，不能由 CLI、用户输入或运行时数据扩展。
 * @lang en The list scans no directory and cannot be extended by CLI input, user input, or runtime data.
 */
const sourceUrls = Object.freeze({
  actionSheetStyle: new URL('../src/vendor/HIA-uView/HIA-uView-UI/src/components/u-action-sheet/u-action-sheet.css', import.meta.url),
  discover: new URL('../src/pages/discover/index.vue', import.meta.url),
  messages: new URL('../src/locales/messages.mjs', import.meta.url),
  resourceCard: new URL('../src/components/ResourceCard.vue', import.meta.url),
  search: new URL('../src/vendor/HIA-uView/HIA-uView-UI/src/components/u-search/u-search.vue', import.meta.url)
});

/**
 * @lang zh-CN 并行读取全部固定源码，避免一个合同使用不同文件时点。
 * @lang en Reads all fixed sources in parallel so one contract cannot use files from different moments.
 * @returns {Promise<Record<string,string>>} <lang><zh-CN>按稳定逻辑名索引的源码文本。</zh-CN><en>Source text indexed by stable logical names.</en></lang>
 */
async function readSources() {
  // <lang><zh-CN>任一固定文件缺失即失败，不把缺失 pin 或页面静默当作无需验证。</zh-CN><en>Any missing fixed file fails rather than silently treating a missing pin or page as exempt.</en></lang>
  const entries = await Promise.all(Object.entries(sourceUrls).map(async ([name, sourceUrl]) => [name, await readFile(sourceUrl, 'utf8')]));
  // <lang><zh-CN>返回当前测试独占的新 record，不把可写文件 handle 暴露给断言。</zh-CN><en>Return a new record owned by this test and expose no writable file handle to assertions.</en></lang>
  return Object.fromEntries(entries);
}

test('Discover main state uses public HIA-uView surfaces and real facade facts', async function verifyDiscoverMainContract() {
  // <lang><zh-CN>一次性读取受审边界后执行相关断言。</zh-CN><en>Read the reviewed boundary once before running related assertions.</en></lang>
  const sources = await readSources();

  // <lang><zh-CN>搜索装饰只能经公开 searchIcon 属性开启；页面不创建私有放大镜节点或资产。</zh-CN><en>The search decoration may be enabled only through the public searchIcon prop; the page creates no private magnifier node or asset.</en></lang>
  assert.match(sources.discover, /<u-search\s+v-model="keyword"\s+search-icon="search"/u);
  assert.match(sources.search, /searchIcon:\s*\{ type: String, default: '' \}/u);
  assert.match(sources.search, /<view v-if="searchIcon === 'search'" class="u-search__leading-icon" aria-hidden="true">/u);

  // <lang><zh-CN>当前未选择、面板关闭的主态明确将三项触发器全部设为 secondary；选中/展开强调留给后续单独检查点。</zh-CN><en>The current unselected, sheet-closed main state explicitly keeps all three triggers secondary; selected/open emphasis belongs to a later checkpoint.</en></lang>
  const filterActionBlock = sources.discover.match(/<view class="discover-page__filter-actions">([\s\S]*?)<\/view>/u)?.[1] ?? '';
  assert.equal(filterActionBlock.match(/<u-button\b/gu)?.length ?? 0, 3);
  assert.equal(filterActionBlock.match(/variant="secondary"/gu)?.length ?? 0, 3);

  // <lang><zh-CN>结果行只在 ready 且非空时显示，并精确绑定 catalog facade terminal 的 source；不能借用常量或其他操作 source。</zh-CN><en>The result row renders only while ready and nonempty and binds exactly to the catalog facade terminal's source; it cannot borrow a constant or another operation source.</en></lang>
  assert.match(sources.discover, /<view v-if="demo\.catalogPhase\.value === 'ready' && demo\.catalogEntries\.value\.length > 0" class="discover-page__result-summary">[\s\S]*?<source-badge :source="demo\.catalogSource\.value" \/>/u);
  assert.match(sources.discover, /const resultTotal = computed\(\(\) => runtimeLocale\.t\('discover\.resultTotal', \{[\s\S]*?total: demo\.catalogPaging\.value\.total/u);

  // <lang><zh-CN>页数只由 terminal 的 total/pageSize 推导，页脚同时传入当前页和总页数，且保留触底与公开 ULoadMore 两条等价加载入口。</zh-CN><en>Page count derives only from terminal total/pageSize, the footer receives both current and total pages, and reach-bottom plus public ULoadMore remain equivalent loading entries.</en></lang>
  assert.match(sources.discover, /return Math\.ceil\(total \/ pageSize\);/u);
  assert.match(sources.discover, /totalPages:\s*totalPages\.value/u);
  assert.match(sources.discover, /<u-loadmore[^>]*@loadmore="handleLoadMore"/u);
  assert.match(sources.discover, /onReachBottom\(handleLoadMore\);/u);
  assert.equal(sources.messages.includes("'common.pageFacts': '已加载 {loaded} / {total} · 第 {page} / {totalPages} 页'"), true);
  assert.equal(sources.messages.includes("'common.pageFacts': '{loaded} / {total} loaded · Page {page} / {totalPages}'"), true);

  // <lang><zh-CN>目录卡只压缩 catalog 分支到已确认几何；首页基础分支继续使用 128px，防止本次发现页调整污染已通过首页。</zh-CN><en>Only the catalog branch is compacted to the confirmed geometry; the Home base branch remains 128px so this Discover change cannot contaminate the accepted Home page.</en></lang>
  assert.match(sources.resourceCard, /\.resource-card__image-shell\s*\{[^}]*height:\s*128px;/u);
  assert.match(sources.resourceCard, /\.resource-card--catalog \.resource-card__image-shell\s*\{[^}]*height:\s*132px;/u);
  assert.match(sources.resourceCard, /\.resource-card--catalog \.resource-card__body\s*\{\s*gap:\s*4px;\s*min-height:\s*96px;\s*padding:\s*10px 12px;/u);

  // <lang><zh-CN>目录摘要仍只呈现资源、场馆、容量和下一静态时段，不加入距离、收藏、营销描述或实时库存承诺。</zh-CN><en>The catalog summary still presents only resource, venue, capacity, and the next static slot, adding no distance, favorite, marketing description, or live-inventory promise.</en></lang>
  const cardTemplate = sources.resourceCard.match(/<template>([\s\S]*?)<\/template>/u)?.[1] ?? '';
  for (const requiredProjection of ['{{ resourceName }}', '{{ venueName }}', ':label="capacityLabel"', ':label="nextSlotLabel"']) {
    assert.equal(cardTemplate.includes(requiredProjection), true);
  }
  for (const forbiddenProjection of ['distance', 'favorite', 'description', 'liveInventory']) {
    assert.equal(cardTemplate.includes(forbiddenProjection), false);
  }

  // <lang><zh-CN>被锁 UI 样式使用显式 disabled 状态类且不含 attribute selector，保证本次 BP 升级不会重新触发微信 WXSS 告警。</zh-CN><en>The pinned UI style uses an explicit disabled-state class and contains no attribute selector, ensuring this BP upgrade cannot reintroduce the WeChat WXSS warning.</en></lang>
  assert.equal(sources.actionSheetStyle.includes('.u-action-sheet__item--disabled'), true);
  assert.doesNotMatch(sources.actionSheetStyle, /\[[^\]]*disabled[^\]]*\]/u);
});
