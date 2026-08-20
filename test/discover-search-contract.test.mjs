/**
 * <lang><zh-CN>发现页搜索提交静态门禁：锁定 HIA-uView-UI 的 confirm/search 意图分离，以及 BP 对两种显式提交的受控 keyword 汇聚，不执行 Vue、平台 API 或业务读取。</zh-CN><en>Static Discover-search submission gate: locks HIA-uView-UI's separate confirm/search intents and the BP's controlled-keyword convergence for both explicit submissions without executing Vue, platform APIs, or business reads.</en></lang>
 * @lang zh-CN 该门禁防止键盘回车因只监听可选动作按钮的 search 事件而静默失效；实际输入与结果呈现仍由 H5/微信人工验收覆盖。
 * @lang en This gate prevents keyboard Enter from silently failing when only the optional action button's search event is observed; H5/WeChat manual acceptance still covers real input and result rendering.
 */

// <lang><zh-CN>标准断言与测试 runner 提供确定性静态失败，不引入浏览器或第三方测试框架。</zh-CN><en>Standard assertions and the test runner provide deterministic static failures without a browser or third-party test framework.</en></lang>
import assert from 'node:assert/strict';
import test from 'node:test';

// <lang><zh-CN>内建文件 API 只读取固定的页面与 vendored UI component。</zh-CN><en>The built-in file API reads only the fixed page and vendored UI component.</en></lang>
import { readFile } from 'node:fs/promises';

// <lang><zh-CN>路径工具从当前测试 URL 解析仓根，不依赖调用 cwd。</zh-CN><en>Path utilities resolve the repository root from this test URL without depending on caller cwd.</en></lang>
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * <lang><zh-CN>BP 仓库根的固定绝对路径。</zh-CN><en>Fixed absolute path of the BP repository root.</en></lang>
 */
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * <lang><zh-CN>发现页源码的固定绝对路径。</zh-CN><en>Fixed absolute path of the Discover page source.</en></lang>
 */
const discoverPagePath = resolve(repositoryRoot, 'src/pages/discover/index.vue');

/**
 * <lang><zh-CN>受输入 pin 管理的 HIA-uView-UI 搜索组件固定绝对路径。</zh-CN><en>Fixed absolute path of the input-pinned HIA-uView-UI search component.</en></lang>
 */
const searchComponentPath = resolve(repositoryRoot, 'src/vendor/HIA-uView/HIA-uView-UI/src/components/u-search/u-search.vue');

test('Discover submits the controlled keyword from native confirm and optional search intents', async () => {
  // <lang><zh-CN>并行读取两个固定源码边界；测试不 import 或执行其中任一模块。</zh-CN><en>Read both fixed source boundaries in parallel; the test imports or executes neither module.</en></lang>
  const [discoverSource, searchComponentSource] = await Promise.all([
    readFile(discoverPagePath, 'utf8'),
    readFile(searchComponentPath, 'utf8')
  ]);

  // <lang><zh-CN>页面必须恰有一个搜索组件，避免新增的未受审搜索入口绕过同一提交规则。</zh-CN><en>The page must have exactly one search component so a new unreviewed search entry cannot bypass the same submission rule.</en></lang>
  const discoverSearchTags = [...discoverSource.matchAll(/<u-search\b[\s\S]*?\/>/gu)];
  assert.equal(discoverSearchTags.length, 1);

  // <lang><zh-CN>唯一搜索组件必须保留受控草稿及 clear，并把 confirm/search 两种意图汇聚到同一 handler。</zh-CN><en>The sole search component must retain its controlled draft and clear action while converging confirm/search intents on one handler.</en></lang>
  const discoverSearchTag = discoverSearchTags[0][0];
  assert.equal(discoverSearchTag.includes('v-model="keyword"'), true);
  // <lang><zh-CN>页面只通过 pin 的公开 searchIcon 迁移接口请求纯呈现装饰，不复制图标资产或私有结构。</zh-CN><en>The page requests its presentation-only decoration solely through the pin's public searchIcon migration surface and copies no icon asset or private structure.</en></lang>
  assert.equal(discoverSearchTag.includes('search-icon="search"'), true);
  assert.equal(discoverSearchTag.includes('@confirm="handleSearch"'), true);
  assert.equal(discoverSearchTag.includes('@search="handleSearch"'), true);
  assert.equal(discoverSearchTag.includes('@clear="handleClear"'), true);

  // <lang><zh-CN>HIA-uView-UI 必须继续把原生 input 确认转发为 confirm；页面不得假设编译器会合成 search。</zh-CN><en>HIA-uView-UI must continue forwarding native input confirmation as confirm; the page must not assume the compiler synthesizes search.</en></lang>
  assert.match(searchComponentSource, /<input[\s\S]*?@confirm="handleConfirm"[\s\S]*?\/>/u);
  assert.equal(searchComponentSource.includes("emit('confirm', event);"), true);

  // <lang><zh-CN>pin 必须只在精确 `search` 值下建立 aria-hidden 装饰；该装饰没有事件或文字。</zh-CN><en>The pin must create its aria-hidden decoration only for the exact `search` value; that decoration has no event or copy.</en></lang>
  assert.match(searchComponentSource, /<view v-if="searchIcon === 'search'" class="u-search__leading-icon" aria-hidden="true">/u);
  assert.match(searchComponentSource, /searchIcon:\s*\{ type: String, default: '' \}/u);

  // <lang><zh-CN>可选动作按钮停止 click 冒泡后独立发出 search；这既防止父级重复提交，也验证两种 intent 的差异是组件契约。</zh-CN><en>The optional action button stops click propagation before emitting search independently, preventing parent-level duplicate submission while proving that the two intents differ by component contract.</en></lang>
  assert.match(searchComponentSource, /<button\s+v-if="showAction && actionText\.length > 0"[\s\S]*?@click\.stop="search"/u);
  assert.equal(searchComponentSource.includes("emit('search', props.modelValue);"), true);

  // <lang><zh-CN>提交函数保持无事件参数，并只把受控 keyword 与有限 filter 草稿交给共享 state。</zh-CN><en>The submission function retains no event parameter and passes only the controlled keyword and finite filter draft to shared state.</en></lang>
  assert.match(discoverSource, /async function handleSearch\(\)\s*\{\s*[^}]*await demo\.refreshCatalog\(keyword\.value, readFilterDraft\(\)\);\s*\}/u);
});
