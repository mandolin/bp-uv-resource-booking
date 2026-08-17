/**
 * <lang><zh-CN>验证 H5 相对 URL 与微信 Data URL 两份生成字体样式可逐字节重建，并继续绑定三份 WOFF 的 manifest 摘要。</zh-CN><en>Verifies that generated H5 relative-URL and WeChat Data-URL font styles rebuild byte for byte and remain bound to the manifest digests of all three WOFF files.</en></lang>
 * @lang zh-CN 测试只读取固定仓内 manifest、WOFF 和两份 SCSS，不运行 Sass/Vite、不访问网络，也不修改生成文件。
 * @lang en The test reads only the fixed in-repository manifest, WOFF files, and two SCSS outputs; it runs neither Sass nor Vite, accesses no network, and modifies no generated file.
 */

// <lang><zh-CN>使用 Node 内建断言、哈希、文件和 test runner，避免为生成 CSS 引入新的 runtime 或测试依赖。</zh-CN><en>Use built-in Node assertions, digests, files, and the test runner so generated CSS introduces no new runtime or test dependency.</en></lang>
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { runtimeFontStyleOutputs, verifyRuntimeFontStyles } from '../scripts/build-runtime-font-styles.mjs';

/**
 * <lang><zh-CN>锁定测试独立期望的三张 face，防止生成器与测试共享同一错误 identity。</zh-CN><en>Locks independent expectations for the three faces so generator and test cannot share the same mistaken identity.</en></lang>
 * @lang zh-CN 顺序即两个 SCSS 的规则顺序；manifest 只能证明摘要，不能决定 family、weight 或 locator basename。
 * @lang en Order is the rule order in both SCSS files; the manifest proves digests but cannot choose family, weight, or locator basename.
 */
const expectedFaces = Object.freeze([
  Object.freeze({ id: 'sans-regular', family: 'HIA-uView BP Sans SC', weight: 400, file: 'hia-uv-bp-sans-sc-regular-v2.005-subset.woff' }),
  Object.freeze({ id: 'sans-bold', family: 'HIA-uView BP Sans SC', weight: 700, file: 'hia-uv-bp-sans-sc-bold-v2.005-subset.woff' }),
  Object.freeze({ id: 'serif-bold', family: 'HIA-uView BP Serif SC', weight: 700, file: 'hia-uv-bp-serif-sc-bold-v2.003-subset.woff' })
]);

// <lang><zh-CN>固定 manifest 与 font asset 目录，不使用生成器导出的路径来验证输入独立性。</zh-CN><en>Fix the manifest and font-asset directory without using generator-exported paths, preserving independent input validation.</en></lang>
const manifestPath = fileURLToPath(new URL('../src/assets/fonts/font-subsets.manifest.json', import.meta.url));

/**
 * <lang><zh-CN>计算 Buffer 的 SHA-256 小写十六进制。</zh-CN><en>Computes lowercase hexadecimal SHA-256 for a Buffer.</en></lang>
 * @param {Buffer} bytes <lang><zh-CN>WOFF 或解码 Data URL 字节。</zh-CN><en>WOFF or decoded Data-URL bytes.</en></lang>
 * @returns {string} <lang><zh-CN>64 字符摘要。</zh-CN><en>64-character digest.</en></lang>
 * @lang zh-CN 纯函数不读取文件；调用方用固定路径取得受控输入。
 * @lang en The pure function reads no file; callers obtain controlled input through fixed paths.
 */
function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * <lang><zh-CN>从生成 SCSS 提取恰好三个简单 `@font-face` block；其他 Sass/CSS 结构不在该生成合同内。</zh-CN><en>Extracts exactly three simple `@font-face` blocks from generated SCSS; other Sass/CSS structures are outside this generation contract.</en></lang>
 * @param {string} stylesheet <lang><zh-CN>生成样式全文。</zh-CN><en>Complete generated stylesheet.</en></lang>
 * @returns {string[]} <lang><zh-CN>按文件顺序排列的规则内容。</zh-CN><en>Rule bodies in file order.</en></lang>
 * @lang zh-CN 生成器不会在注释、字符串或嵌套规则中写 `@font-face`，因此有限正则不会跨越未支持语法。
 * @lang en The generator writes no `@font-face` inside comments, strings, or nested rules, so the bounded expression cannot cross unsupported syntax.
 */
function extractFontFaceRules(stylesheet) {
  return [...stylesheet.matchAll(/@font-face\s*\{([\s\S]*?)\}/gu)].map((match) => match[1]);
}

/**
 * <lang><zh-CN>从生成规则读取一个必需 CSS property，拒绝缺失或重复声明。</zh-CN><en>Reads one required CSS property from a generated rule and rejects a missing or duplicate declaration.</en></lang>
 * @param {string} ruleBody <lang><zh-CN>单个受控 `@font-face` 内容。</zh-CN><en>One controlled `@font-face` body.</en></lang>
 * @param {string} propertyName <lang><zh-CN>测试源码固定的 property 名。</zh-CN><en>Property name fixed in test source.</en></lang>
 * @returns {string} <lang><zh-CN>去除行边空白的 property value。</zh-CN><en>Property value with edge whitespace removed.</en></lang>
 * @lang zh-CN propertyName 不来自 manifest 或文件内容；构造正则不会接受任意表达式输入。
 * @lang en propertyName comes from neither manifest nor file content; constructing the expression accepts no arbitrary-expression input.
 */
function readRequiredProperty(ruleBody, propertyName) {
  // <lang><zh-CN>测试只传入小写 ASCII CSS property；显式校验后连字符无需在 regex atom 中转义。</zh-CN><en>Tests pass only lowercase ASCII CSS properties; after explicit validation, hyphens need no escaping in a regex atom.</en></lang>
  assert.match(propertyName, /^[a-z-]+$/u);
  // <lang><zh-CN>生成器每个 property 独占一行；以行尾分号而非首个分号终止，允许 Data URL MIME 中合法的 `;base64`。</zh-CN><en>Every generated property occupies one line; terminate at the line-ending semicolon rather than the first semicolon so a Data URL MIME may contain legal `;base64`.</en></lang>
  const matches = [...ruleBody.matchAll(new RegExp(`(?:^|\\n)\\s*${propertyName}:\\s*([^\\r\\n]+);\\s*(?=\\n|$)`, 'gu'))];
  assert.equal(matches.length, 1, `Expected one ${propertyName} declaration.`);
  return matches[0][1].trim();
}

test('runtime font styles rebuild byte-for-byte from three manifest-bound WOFF inputs', async () => {
  // <lang><zh-CN>共享生成器的只读模式重新执行完整字体门禁并以内存输出比较两份 SCSS 字节。</zh-CN><en>The generator's shared read-only mode reruns the complete font gate and compares both SCSS files with in-memory output bytes.</en></lang>
  await verifyRuntimeFontStyles();
});

test('H5 uses three exact local WOFF locators while WeChat embeds the same three digests', async () => {
  // <lang><zh-CN>并行读取固定 manifest 和两份生成样式；路径不来自 manifest 或 runtime。</zh-CN><en>Read the fixed manifest and two generated styles in parallel; paths come from neither manifest nor runtime.</en></lang>
  const [manifest, h5Stylesheet, mpWeixinStylesheet] = await Promise.all([
    readFile(manifestPath, 'utf8').then((manifestText) => JSON.parse(manifestText)),
    readFile(runtimeFontStyleOutputs.h5.path, 'utf8'),
    readFile(runtimeFontStyleOutputs.mpWeixin.path, 'utf8')
  ]);

  // <lang><zh-CN>两份文件都必须保留合法双语生成说明，并禁止 http、https 或协议相对网络 locator。</zh-CN><en>Both files must retain valid bilingual generation notes and forbid http, https, or protocol-relative network locators.</en></lang>
  for (const stylesheet of [h5Stylesheet, mpWeixinStylesheet]) {
    assert.match(stylesheet, /@lang zh-CN/u);
    assert.match(stylesheet, /@lang en/u);
    // <lang><zh-CN>只检查 locator 起始协议；base64 payload 本身可以合法包含连续 `/` 字符。</zh-CN><en>Check only locator-leading protocols because a base64 payload may legitimately contain consecutive `/` characters.</en></lang>
    assert.doesNotMatch(stylesheet, /url\(\s*["']?(?:https?:)?\/\//iu);
  }

  // <lang><zh-CN>每个目标恰好三张 face，且顺序和独立 allowlist 一致。</zh-CN><en>Each target contains exactly three faces in the order of the independent allowlist.</en></lang>
  const h5Rules = extractFontFaceRules(h5Stylesheet);
  const mpWeixinRules = extractFontFaceRules(mpWeixinStylesheet);
  assert.equal(h5Rules.length, expectedFaces.length);
  assert.equal(mpWeixinRules.length, expectedFaces.length);

  const manifestFacesById = new Map(manifest.faces.map((faceRecord) => [faceRecord.id, faceRecord]));

  for (const [faceIndex, expectedFace] of expectedFaces.entries()) {
    const manifestFace = manifestFacesById.get(expectedFace.id);
    assert.ok(manifestFace, `Missing manifest face ${expectedFace.id}.`);

    // <lang><zh-CN>实际 WOFF 从固定测试 URL 读取；摘要与 manifest 比较后再用于 Data URL 等价性验证。</zh-CN><en>Read the actual WOFF from a fixed test URL; compare its digest with the manifest before using it for Data-URL equivalence.</en></lang>
    const fontBytes = await readFile(fileURLToPath(new URL(`../src/assets/fonts/${expectedFace.file}`, import.meta.url)));
    assert.equal(fontBytes.length, manifestFace.outputBytes);
    assert.equal(sha256Bytes(fontBytes), manifestFace.outputSha256);

    for (const ruleBody of [h5Rules[faceIndex], mpWeixinRules[faceIndex]]) {
      // <lang><zh-CN>family、normal style、weight、swap 和 WOFF format 在两个目标中必须完全一致。</zh-CN><en>Family, normal style, weight, swap, and WOFF format must be identical across both targets.</en></lang>
      assert.equal(readRequiredProperty(ruleBody, 'font-family'), `"${expectedFace.family}"`);
      assert.equal(readRequiredProperty(ruleBody, 'font-style'), 'normal');
      assert.equal(readRequiredProperty(ruleBody, 'font-weight'), String(expectedFace.weight));
      assert.equal(readRequiredProperty(ruleBody, 'font-display'), 'swap');
    }

    // <lang><zh-CN>H5 只能引用从 UniApp 内联样式解析基准到 `src/assets/fonts` 的精确相对路径，禁止 Data URL、根路径或文件名漂移。</zh-CN><en>H5 may reference only the exact relative path from UniApp's inlined-style resolution base to `src/assets/fonts`, forbidding a Data URL, root path, or filename drift.</en></lang>
    const h5Source = readRequiredProperty(h5Rules[faceIndex], 'src');
    assert.equal(h5Source, `url("./assets/fonts/${expectedFace.file}") format("woff")`);
    assert.doesNotMatch(h5Source, /data:/iu);

    // <lang><zh-CN>微信 locator 必须是唯一 WOFF MIME 的 canonical base64；解码后逐字节等于 H5 所引用的同一输入。</zh-CN><en>The WeChat locator must be canonical base64 with the sole WOFF MIME; decoded bytes must equal the same input referenced by H5.</en></lang>
    const mpWeixinSource = readRequiredProperty(mpWeixinRules[faceIndex], 'src');
    const dataMatch = /^url\("data:font\/woff;base64,([A-Za-z0-9+/]+={0,2})"\) format\("woff"\)$/u.exec(mpWeixinSource);
    assert.ok(dataMatch, `Unexpected WeChat data locator for ${expectedFace.id}.`);
    const decodedFontBytes = Buffer.from(dataMatch[1], 'base64');
    assert.equal(decodedFontBytes.toString('base64'), dataMatch[1]);
    assert.equal(decodedFontBytes.equals(fontBytes), true);
    assert.equal(sha256Bytes(decodedFontBytes), manifestFace.outputSha256);
  }
});
