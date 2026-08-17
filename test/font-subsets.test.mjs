/**
 * <lang><zh-CN>把确定性字体专项门禁接入 BP 的 Node test runner；测试只读取仓内 manifest、corpus、许可与三个 WOFF。</zh-CN><en>Connects the deterministic-font gate to the BP Node test runner; the test reads only the in-repository manifest, corpora, licenses, and three WOFF files.</en></lang>
 * @lang zh-CN Python/FontTools 只负责受控重建；日常测试使用 Node 内建解析器，避免隐式安装或联网。
 * @lang en Python/FontTools handles controlled reconstruction only; routine tests use the built-in Node parser and never install implicitly or access the network.
 */

// <lang><zh-CN>使用 Node 内建断言与 test runner，并复用唯一字体验证实现，避免测试与命令形成两套规则。</zh-CN><en>Use built-in Node assertions and the test runner while reusing the sole font verifier so tests and commands cannot diverge into two rule sets.</en></lang>
import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyFontSubsets, verifyManifestDeclaredPaths } from '../scripts/verify-font-subsets.mjs';

test('three local font subsets retain deterministic provenance, renamed identities, and runtime coverage', async function verifyCheckedInFontSubsets() {
  // <lang><zh-CN>所有断言由字体专项门禁集中执行；任何异常自然成为当前测试的非通过结果。</zh-CN><en>The font-specific gate centralizes every assertion; any exception naturally becomes a failing result for this test.</en></lang>
  await verifyFontSubsets();
});

test('font manifest cannot redirect toolchain or license reads outside their exact allowlists', () => {
  // <lang><zh-CN>最小有效骨架只提供路径验证所需字段，不读取真实文件或依赖当前 manifest。</zh-CN><en>The minimal valid skeleton supplies only fields needed for path validation and reads no real file or current manifest.</en></lang>
  const validManifestSkeleton = {
    toolchain: {
      scriptPath: 'scripts/build-font-subsets.py',
      requirementsPath: 'dev/fonts/requirements.lock'
    },
    licenses: [
      {
        copyright: 'Copyright 2014-2025 Adobe',
        path: 'LICENSES/Source-Han-Sans-OFL-1.1.txt',
        reservedFontName: 'Source',
        sha256: 'fcac737e761ec63dbfbdce11030a1780161920d80315edba9c8beff1c2bac5a2',
        spdx: 'OFL-1.1',
        url: 'https://github.com/adobe-fonts/source-han-sans/blob/2.005R/LICENSE.txt'
      },
      {
        copyright: 'Copyright 2017-2022 Adobe',
        path: 'LICENSES/Source-Han-Serif-OFL-1.1.txt',
        reservedFontName: 'Source',
        sha256: '9ff5bb567e1b92c801fc1069e5fbf992ff8efccacb9db94e5959a5b3ba9bb903',
        spdx: 'OFL-1.1',
        url: 'https://github.com/adobe-fonts/source-han-serif/blob/2.003R/LICENSE.txt'
      }
    ]
  };

  // <lang><zh-CN>原样固定声明必须通过纯路径门禁，证明负例不是因骨架缺字段而失败。</zh-CN><en>The unchanged fixed declaration must pass the pure path gate, proving negative cases do not fail because the skeleton lacks a field.</en></lang>
  assert.doesNotThrow(() => verifyManifestDeclaredPaths(validManifestSkeleton));

  // <lang><zh-CN>即使路径仍位于仓内，manifest 也不能选择另一个 script；实际读取永远来自硬编码 allowlist。</zh-CN><en>Even an in-repository path cannot select another script through the manifest; actual reads always come from the hard-coded allowlist.</en></lang>
  const redirectedToolchain = structuredClone(validManifestSkeleton);
  redirectedToolchain.toolchain.scriptPath = 'scripts/verify-font-subsets.mjs';
  assert.throws(() => verifyManifestDeclaredPaths(redirectedToolchain), /toolchain path declaration/u);

  // <lang><zh-CN>许可顺序和路径都属于合同；交换条目不能借助相同数量绕过精确身份检查。</zh-CN><en>License order and path are both contractual; swapping entries cannot bypass exact identity checks merely by retaining the same count.</en></lang>
  const reorderedLicenses = structuredClone(validManifestSkeleton);
  reorderedLicenses.licenses.reverse();
  assert.throws(() => verifyManifestDeclaredPaths(reorderedLicenses), /license declaration/u);
});
