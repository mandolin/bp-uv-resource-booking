/**
 * <lang><zh-CN>验证 BP 场馆图片 allowlist 与版本化 local JSON 的展示规模；测试只读取仓内受登记的 JSON 和静态图片，不访问网络、图像生成服务、文件系统外路径或用户数据。</zh-CN><en>Verifies the BP venue-image allowlist and presentation scale of versioned local JSON; the test reads only registered in-repository JSON and static images and accesses no network, image-generation service, paths outside the file system boundary, or user data.</en></lang>
 * @lang zh-CN 图像文件的来源、用途与 prompt 摘要由公开资产台账治理；本测试只锁定代码引用完整性与有限目录规模。
 * @lang en Image provenance, use, and prompt summaries are governed by the public asset ledger; this test locks only reference integrity and finite catalog scale.
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
