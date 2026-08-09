/**
 * <lang><zh-CN>验证 BP 场馆图片、主导航原创图标 allowlist 与版本化 local JSON 的展示规模；测试只读取仓内受登记的 JSON 和静态资产，不访问网络、图像生成服务、文件系统外路径或用户数据。</zh-CN><en>Verifies the BP venue-image and original primary-navigation-icon allowlists plus the presentation scale of versioned local JSON; the test reads only registered in-repository JSON and static assets and accesses no network, image-generation service, paths outside the file system boundary, or user data.</en></lang>
 * @lang zh-CN 图片的来源、用途与 prompt 摘要以及原创图标的语义和边界均由公开资产台账治理；本测试只锁定代码引用完整性与有限规模。
 * @lang en Image provenance, use, and prompt summaries plus original-icon meanings and boundaries are governed by the public asset ledger; this test locks only reference integrity and finite scale.
 */

// <lang><zh-CN>使用 Node 内建断言、文件访问和 test runner，不增加图像或网络测试依赖。</zh-CN><en>Use Node built-in assertions, file access, and test runner and add no image or network test dependency.</en></lang>
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// <lang><zh-CN>将 bundler 已知 JSON 导入为固定数据输入；它不是运行时文件发现或动态资源列表。</zh-CN><en>Import bundler-known JSON as fixed data input; it is neither runtime file discovery nor a dynamic asset list.</en></lang>
import localDataset from '../src/data/venues.json' with { type: 'json' };

/**
 * <lang><zh-CN>锁定每个 local image ID 对应的仓内版本化文件。</zh-CN><en>Locks the versioned in-repository file corresponding to each local image ID.</en></lang>
 * @lang zh-CN 映射防止 JSON 中的任意文本成为图片路径或 URL。
 * @lang en The mapping prevents arbitrary JSON text from becoming an image path or URL.
 */
const imageFileById = Object.freeze({
  'riverside-sports-hall': '../src/static/images/venue-riverside-sports-hall-v1.png',
  'cloudline-arts-center': '../src/static/images/venue-cloudline-arts-center-v1.png',
  'harbor-reading-hall': '../src/static/images/venue-harbor-reading-hall-v1.png',
  'newtown-workshop': '../src/static/images/venue-newtown-workshop-v1.png'
});

/**
 * <lang><zh-CN>锁定四项底部主导航的未选中/选中原创 SVG 资产对。</zh-CN><en>Locks the original unselected/selected SVG asset pair for each of the four bottom primary-navigation items.</en></lang>
 * @lang zh-CN 固定映射防止 custom tabBar 把任意路径、网络资源或第三方图标库变成导航输入。
 * @lang en The fixed mapping prevents the custom tab bar from turning arbitrary paths, network resources, or third-party icon libraries into navigation inputs.
 */
const tabIconFileByState = Object.freeze({
  home: '../src/static/icons/tab-home.svg',
  'home-active': '../src/static/icons/tab-home-active.svg',
  discover: '../src/static/icons/tab-discover.svg',
  'discover-active': '../src/static/icons/tab-discover-active.svg',
  reservations: '../src/static/icons/tab-reservations.svg',
  'reservations-active': '../src/static/icons/tab-reservations-active.svg',
  profile: '../src/static/icons/tab-profile.svg',
  'profile-active': '../src/static/icons/tab-profile-active.svg'
});

/**
 * <lang><zh-CN>锁定首页双入口使用的两张第一方原创 SVG 装饰图标。</zh-CN><en>Locks the two first-party original decorative SVG icons used by Home's paired entries.</en></lang>
 * @lang zh-CN 图标路径由模板固定引用，文字操作名称仍由 runtime locale 提供。
 * @lang en Template literals fix the icon paths while runtime locale copy continues to provide the action names.
 */
const homeActionIconFiles = Object.freeze([
  '../src/static/icons/action-calendar-light.svg',
  '../src/static/icons/action-venue-primary.svg'
]);

test('catalog retains four venues, ten resources, and registered original images', async function verifyAssetInventory() {
  // <lang><zh-CN>场馆数组是固定 local JSON 的唯一视觉目录来源，长度不从文件夹、远端或用户输入推断。</zh-CN><en>The venue array is the sole visual-catalog source of fixed local JSON, and its length is never inferred from folders, remote data, or user input.</en></lang>
  const venues = localDataset.venues;

  // <lang><zh-CN>将每个场馆的有限 resources 扁平计数，验证设计板所需的跨场馆目录规模。</zh-CN><en>Flatten and count finite resources of every venue, validating the cross-venue catalog scale required by the design boards.</en></lang>
  const resourceCount = venues.reduce((total, venue) => total + venue.resources.length, 0);

  // <lang><zh-CN>四个场馆和十项资源提供可见分页与跨场馆筛选样本，仍不构成真实库存或行业 catalog。</zh-CN><en>Four venues and ten resources provide visible pagination and cross-venue filtering samples while remaining neither live inventory nor an industry catalog.</en></lang>
  assert.equal(venues.length, 4);
  assert.equal(resourceCount, 10);

  for (const venue of venues) {
    // <lang><zh-CN>每个 image ID 必须出现在冻结映射中，未知值立即失败而不是降级到路径拼接或网络图片。</zh-CN><en>Every image ID must occur in the frozen mapping; an unknown value fails immediately rather than degrading to path construction or a network image.</en></lang>
    const relativeImagePath = imageFileById[venue.imageId];
    assert.equal(typeof relativeImagePath, 'string');

    // <lang><zh-CN>只从当前测试文件解析固定相对路径并验证静态文件存在，不遍历目录。</zh-CN><en>Resolve only the fixed relative path from the current test file and verify static-file presence without traversing a directory.</en></lang>
    await access(fileURLToPath(new URL(relativeImagePath, import.meta.url)));
  }
});

test('custom tab bar retains eight registered original local icon states', async function verifyTabIconInventory() {
  // <lang><zh-CN>从冻结 allowlist 获取固定八个相对路径，不扫描 static 目录或接收运行时输入。</zh-CN><en>Obtain the fixed eight relative paths from the frozen allowlist without scanning the static directory or accepting runtime input.</en></lang>
  const tabIconFiles = Object.values(tabIconFileByState);

  // <lang><zh-CN>四项导航必须各有一张中性态和一张钴蓝选中态，且不得复用同一文件伪装两个状态。</zh-CN><en>Each of four navigation items must have one neutral and one cobalt selected asset, and no file may be reused to masquerade as both states.</en></lang>
  assert.equal(tabIconFiles.length, 8);
  assert.equal(new Set(tabIconFiles).size, 8);

  for (const relativeIconPath of tabIconFiles) {
    // <lang><zh-CN>从当前测试文件只解析受登记的仓内相对路径，验证每张 SVG 存在。</zh-CN><en>Resolve only the registered in-repository relative path from this test file and verify that each SVG exists.</en></lang>
    await access(fileURLToPath(new URL(relativeIconPath, import.meta.url)));
  }
});

test('home actions retain two registered original local decorations', async function verifyHomeActionIconInventory() {
  // <lang><zh-CN>两个路径对应日期与场馆入口，集合大小锁定避免同一图标被误作两个不同语义。</zh-CN><en>The two paths correspond to date and venue entries, and the set size prevents one icon from masquerading as two meanings.</en></lang>
  assert.equal(homeActionIconFiles.length, 2);
  assert.equal(new Set(homeActionIconFiles).size, 2);

  for (const relativeIconPath of homeActionIconFiles) {
    // <lang><zh-CN>只解析冻结的仓内相对路径；测试不遍历目录或请求外部图标。</zh-CN><en>Resolve only the frozen in-repository relative path; the test neither scans directories nor requests external icons.</en></lang>
    await access(fileURLToPath(new URL(relativeIconPath, import.meta.url)));
  }
});
