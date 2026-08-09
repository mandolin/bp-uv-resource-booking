/**
 * <lang><zh-CN>验证 BP 场馆图片、主导航原创图标 allowlist 与版本化 local JSON 的展示规模；测试只读取仓内受登记的 JSON 和静态资产，不访问网络、图像生成服务、文件系统外路径或用户数据。</zh-CN><en>Verifies the BP venue-image and original primary-navigation-icon allowlists plus the presentation scale of versioned local JSON; the test reads only registered in-repository JSON and static assets and accesses no network, image-generation service, paths outside the file system boundary, or user data.</en></lang>
 * @lang zh-CN 图片的来源、用途与 prompt 摘要以及原创图标的语义和边界均由公开资产台账治理；本测试只锁定代码引用完整性与有限规模。
 * @lang en Image provenance, use, and prompt summaries plus original-icon meanings and boundaries are governed by the public asset ledger; this test locks only reference integrity and finite scale.
 */

// <lang><zh-CN>使用 Node 内建断言、文件访问和 test runner，不增加图像或网络测试依赖。</zh-CN><en>Use Node built-in assertions, file access, and test runner and add no image or network test dependency.</en></lang>
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
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
 * <lang><zh-CN>锁定四项底部主导航的未选中/选中原创 SVG 源稿。</zh-CN><en>Locks the original unselected/selected SVG sources for each of the four bottom primary-navigation items.</en></lang>
 * @lang zh-CN 源稿保留可审计矢量表达；微信运行时不直接消费这些文件。
 * @lang en The sources retain auditable vector expressions; the WeChat runtime does not consume these files directly.
 */
const tabIconSourceFileByState = Object.freeze({
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
 * <lang><zh-CN>锁定由八张原创 SVG 源稿派生的透明 PNG 运行时资产。</zh-CN><en>Locks the transparent PNG runtime assets derived from the eight original SVG sources.</en></lang>
 * @lang zh-CN 固定映射同时供宿主 `tabBar` 声明和 custom tabBar 组件使用，防止微信启动前格式校验与实际呈现资产发生分叉。
 * @lang en The fixed mapping is shared conceptually by the host `tabBar` declaration and custom-tabBar component, preventing WeChat's prelaunch format validation from diverging from the assets actually rendered.
 */
const tabIconRuntimeFileByState = Object.freeze({
  home: '../src/static/icons/tab-home.png',
  'home-active': '../src/static/icons/tab-home-active.png',
  discover: '../src/static/icons/tab-discover.png',
  'discover-active': '../src/static/icons/tab-discover-active.png',
  reservations: '../src/static/icons/tab-reservations.png',
  'reservations-active': '../src/static/icons/tab-reservations-active.png',
  profile: '../src/static/icons/tab-profile.png',
  'profile-active': '../src/static/icons/tab-profile-active.png'
});

/**
 * <lang><zh-CN>PNG 文件头是运行时位图最小真实性门禁，避免只改扩展名伪装格式。</zh-CN><en>The PNG signature is the minimum runtime-bitmap authenticity gate, preventing a renamed extension from masquerading as the format.</en></lang>
 */
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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

test('custom tab bar retains eight registered original sources and eight compatible runtime states', async function verifyTabIconInventory() {
  // <lang><zh-CN>从冻结 allowlist 获取固定八张 SVG 源稿，不扫描 static 目录或接收运行时输入。</zh-CN><en>Obtain the eight fixed SVG sources from the frozen allowlist without scanning the static directory or accepting runtime input.</en></lang>
  const tabIconSourceFiles = Object.values(tabIconSourceFileByState);

  // <lang><zh-CN>独立取得八张 PNG 运行时资产，使测试能同时约束来源可审计性与微信格式兼容性。</zh-CN><en>Obtain the eight PNG runtime assets separately so the test constrains both source auditability and WeChat format compatibility.</en></lang>
  const tabIconRuntimeFiles = Object.values(tabIconRuntimeFileByState);

  // <lang><zh-CN>四项导航必须各有一张中性态和一张钴蓝选中态，源稿与运行时集合都不得复用同一文件伪装两个状态。</zh-CN><en>Each of four navigation items must have one neutral and one cobalt selected state, and neither the source nor runtime set may reuse one file to masquerade as two states.</en></lang>
  assert.equal(tabIconSourceFiles.length, 8);
  assert.equal(new Set(tabIconSourceFiles).size, 8);
  assert.equal(tabIconRuntimeFiles.length, 8);
  assert.equal(new Set(tabIconRuntimeFiles).size, 8);

  for (const relativeIconPath of tabIconSourceFiles) {
    // <lang><zh-CN>从当前测试文件只解析受登记的仓内相对路径，验证每张原创 SVG 源稿存在。</zh-CN><en>Resolve only the registered in-repository relative path from this test file and verify that each original SVG source exists.</en></lang>
    await access(fileURLToPath(new URL(relativeIconPath, import.meta.url)));
  }

  for (const relativeIconPath of tabIconRuntimeFiles) {
    // <lang><zh-CN>运行时路径只来自冻结 allowlist，并解析到仓内文件；不接受 pages 配置或用户文本决定读取位置。</zh-CN><en>The runtime path comes only from the frozen allowlist and resolves to an in-repository file; no pages configuration or user text chooses the read location.</en></lang>
    const absoluteIconPath = fileURLToPath(new URL(relativeIconPath, import.meta.url));

    // <lang><zh-CN>读取受登记 PNG 的有限二进制内容，验证真实签名与固定 81×81 IHDR，而不是信任文件后缀。</zh-CN><en>Read the finite binary content of the registered PNG and verify its real signature and fixed 81×81 IHDR rather than trusting the suffix.</en></lang>
    const iconBytes = await readFile(absoluteIconPath);
    assert.equal(iconBytes.subarray(0, pngSignature.length).equals(pngSignature), true);
    assert.equal(iconBytes.readUInt32BE(16), 81);
    assert.equal(iconBytes.readUInt32BE(20), 81);
    assert.equal(iconBytes.length < 40 * 1024, true);
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
