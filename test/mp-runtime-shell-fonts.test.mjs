/**
 * <lang><zh-CN>以完全内存化的正负 fixture 验证微信根样式字体成品门禁，不依赖或读取真实 `dist`。</zh-CN><en>Verifies the WeChat root-stylesheet font artifact gate with fully in-memory positive and negative fixtures, without depending on or reading a real `dist`.</en></lang>
 * @lang zh-CN 测试独立构造三张小型假 WOFF 字节、manifest 及 CSS，覆盖 identity、locator、数量、MIME、format、size 与 SHA 漂移。
 * @lang en The test independently constructs three tiny fake WOFF byte sequences, a manifest, and CSS to cover identity, locator, count, MIME, format, size, and SHA drift.
 */

// <lang><zh-CN>只使用 Node 内建断言、哈希与测试运行器；被测模块的 main 守卫保证 import 不读取微信产物。</zh-CN><en>Use only Node built-in assertions, hashing, and the test runner; the tested module's main guard ensures import does not read WeChat artifacts.</en></lang>
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { verifyMpRuntimeFontFaces } from '../scripts/verify-mp-runtime-shell.mjs';

/**
 * <lang><zh-CN>锁定与 production allowlist 相同但不从实现导入的三张测试 identity 及独立字节。</zh-CN><en>Locks the three test identities and independent bytes to the production allowlist without importing them from the implementation.</en></lang>
 * @lang zh-CN 独立期望避免实现与测试共享同一错误常量；小字节只用于纯解析和摘要测试，不冒充真实字体。
 * @lang en Independent expectations prevent implementation and test from sharing one mistaken constant; tiny bytes exercise only pure parsing and digest checks and do not pretend to be real fonts.
 */
const fixtureFaces = Object.freeze([
  Object.freeze({ id: 'sans-regular', family: 'HIA-uView BP Sans SC', compiledFamily: 'HIA-uView BP Sans SC', style: 'normal', weight: 400, format: 'woff', mimeType: 'font/woff', bytes: Buffer.from('fixture-woff-sans-regular-v1', 'utf8') }),
  Object.freeze({ id: 'sans-bold', family: 'HIA-uView BP Sans SC', compiledFamily: 'HIA-uView BP Sans SC', style: 'normal', weight: 700, format: 'woff', mimeType: 'font/woff', bytes: Buffer.from('fixture-woff-sans-bold---v1', 'utf8') }),
  Object.freeze({ id: 'serif-bold', family: 'HIA-uView BP Serif SC', compiledFamily: '"HIA-uView BP Serif SC"', style: 'normal', weight: 700, format: 'woff', mimeType: 'font/woff', bytes: Buffer.from('fixture-woff-serif-bold--v1', 'utf8') })
]);

/**
 * <lang><zh-CN>计算 fixture 字节的 SHA-256 小写摘要。</zh-CN><en>Computes a lowercase SHA-256 digest for fixture bytes.</en></lang>
 * @param {Buffer} bytes <lang><zh-CN>单张假 WOFF 字节。</zh-CN><en>One fake WOFF byte sequence.</en></lang>
 * @returns {string} <lang><zh-CN>64 字符摘要。</zh-CN><en>A 64-character digest.</en></lang>
 * @lang zh-CN helper 不读取磁盘，也不复用被测实现的哈希函数。
 * @lang en The helper reads no disk and does not reuse the implementation's hash function.
 */
function fixtureSha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * <lang><zh-CN>从独立 face fixture 建立最小合格 manifest。</zh-CN><en>Builds a minimally valid manifest from independent face fixtures.</en></lang>
 * @returns {{faces: object[]}} <lang><zh-CN>每次新建、可供负例安全改写的 manifest。</zh-CN><en>A newly allocated manifest that negative cases can safely mutate.</en></lang>
 * @lang zh-CN 只提供门禁使用的字段，证明纯函数不依赖未声明 provenance 细节。
 * @lang en Only gate-consumed fields are provided, proving the pure function does not depend on undeclared provenance details.
 */
function createValidManifest() {
  return {
    faces: fixtureFaces.map((face) => ({
      id: face.id,
      cssFamily: face.family,
      fontStyle: face.style,
      fontWeight: face.weight,
      format: face.format,
      mimeType: face.mimeType,
      outputBytes: face.bytes.length,
      outputSha256: fixtureSha256(face.bytes)
    }))
  };
}

/**
 * <lang><zh-CN>把一张 fixture face 渲染为生成器合同中的 canonical CSS rule。</zh-CN><en>Renders one fixture face as a canonical CSS rule in the generator contract.</en></lang>
 * @param {object} face <lang><zh-CN>固定测试 identity 与字节。</zh-CN><en>Fixed test identity and bytes.</en></lang>
 * @param {object} [overrides] <lang><zh-CN>仅供负例替换单一声明或 payload。</zh-CN><en>Overrides used only to replace one declaration or payload in negative cases.</en></lang>
 * @returns {string} <lang><zh-CN>一张完整 `@font-face` rule。</zh-CN><en>One complete `@font-face` rule.</en></lang>
 * @lang zh-CN 默认输出当前 DCloud serializer 的 family 引号形态、无引号 WOFF Data URL、normal、固定 weight 与 swap；override 不做修正，以便构造畸形输入。
 * @lang en Defaults emit the current DCloud serializer's family quoting, an unquoted WOFF Data URL, normal style, fixed weight, and swap; overrides are not corrected so malformed inputs can be constructed.
 */
function createFontFaceRule(face, overrides = {}) {
  // <lang><zh-CN>允许负例替换嵌入字节，同时保持其他声明不变。</zh-CN><en>Allow a negative case to replace embedded bytes while retaining every other declaration.</en></lang>
  const embeddedBytes = overrides.bytes ?? face.bytes;
  const payload = embeddedBytes.toString('base64');

  // <lang><zh-CN>若提供完整 src 则原样使用；否则由 MIME、payload 与 format 生成 canonical locator。</zh-CN><en>Use a complete src verbatim when supplied; otherwise build a canonical locator from MIME, payload, and format.</en></lang>
  const mimeType = overrides.mimeType ?? face.mimeType;
  const sourceFormat = overrides.sourceFormat ?? face.format;
  const source = overrides.source ?? `url(data:${mimeType};base64,${payload}) format("${sourceFormat}")`;

  // <lang><zh-CN>正例使用真实编译器 family 形态；显式 family override 原样进入无引号负例，不由 fixture helper 自动纠正。</zh-CN><en>The positive case uses the real compiler family form; an explicit family override enters an unquoted negative case verbatim and is not corrected by the fixture helper.</en></lang>
  const compiledFamily = Object.hasOwn(overrides, 'family') ? overrides.family : face.compiledFamily;

  return [
    '@font-face {',
    `  font-family: ${compiledFamily};`,
    `  font-style: ${overrides.style ?? face.style};`,
    `  font-weight: ${overrides.weight ?? face.weight};`,
    `  font-display: ${overrides.display ?? 'swap'};`,
    `  src: ${source};`,
    overrides.extraDeclaration ?? '',
    '}'
  ].filter(Boolean).join('\n');
}

/**
 * <lang><zh-CN>把三张规则包进含普通 app selector 与双语 comment 的根样式 fixture。</zh-CN><en>Wraps three rules in a root-stylesheet fixture containing an ordinary app selector and a bilingual comment.</en></lang>
 * @param {string[]} rules <lang><zh-CN>按生成顺序排列的字体规则。</zh-CN><en>Font rules in generation order.</en></lang>
 * @returns {string} <lang><zh-CN>完整 `app.wxss` fixture。</zh-CN><en>A complete `app.wxss` fixture.</en></lang>
 * @lang zh-CN 普通样式证明门禁只约束字体 face；comment 内 token 证明注释不会被误计数。
 * @lang en Ordinary styles prove the gate constrains only font faces; a token in the comment proves comments are not miscounted.
 */
function createStylesheet(rules) {
  return `/* <lang><zh-CN>说明 @font-face 合同。</zh-CN><en>Documents the @font-face contract.</en></lang> */\npage { color: #102a43; }\n${rules.join('\n')}`;
}

test('accepts exactly three canonical manifest-bound WeChat font faces without reading dist', () => {
  // <lang><zh-CN>正例完全从本文件内存 fixture 生成，不读取项目 manifest、WOFF 或构建目录。</zh-CN><en>The positive case is generated entirely from in-memory fixtures in this file and reads no project manifest, WOFF, or build directory.</en></lang>
  const stylesheet = createStylesheet(fixtureFaces.map((face) => createFontFaceRule(face)));
  const manifest = createValidManifest();

  assert.doesNotThrow(() => verifyMpRuntimeFontFaces(stylesheet, manifest));
});

test('rejects remote, extra, duplicate, or identity-drifted font faces', async (testContext) => {
  // <lang><zh-CN>先固定两张 canonical rule；每个负例只改变待验证的单一合同维度。</zh-CN><en>Fix two canonical rules first; each negative case changes only one contract dimension under test.</en></lang>
  const canonicalRules = fixtureFaces.map((face) => createFontFaceRule(face));
  const identityCases = Object.freeze([
    Object.freeze({ name: 'remote locator', rules: [createFontFaceRule(fixtureFaces[0], { source: 'url("https://fonts.example.invalid/demo.woff") format("woff")' }), canonicalRules[1], canonicalRules[2]] }),
    Object.freeze({ name: 'extra face', rules: [...canonicalRules, canonicalRules[0]] }),
    Object.freeze({ name: 'duplicate face', rules: [canonicalRules[0], canonicalRules[1], canonicalRules[0]] }),
    Object.freeze({ name: 'wrong family', rules: [createFontFaceRule(fixtureFaces[0], { family: 'Unexpected Sans' }), canonicalRules[1], canonicalRules[2]] }),
    Object.freeze({ name: 'wrong style', rules: [createFontFaceRule(fixtureFaces[0], { style: 'italic' }), canonicalRules[1], canonicalRules[2]] }),
    Object.freeze({ name: 'wrong weight', rules: [createFontFaceRule(fixtureFaces[0], { weight: 500 }), canonicalRules[1], canonicalRules[2]] }),
    Object.freeze({ name: 'wrong display', rules: [createFontFaceRule(fixtureFaces[0], { display: 'block' }), canonicalRules[1], canonicalRules[2]] }),
    Object.freeze({ name: 'wrong format', rules: [createFontFaceRule(fixtureFaces[0], { sourceFormat: 'woff2' }), canonicalRules[1], canonicalRules[2]] }),
    Object.freeze({ name: 'wrong data MIME', rules: [createFontFaceRule(fixtureFaces[0], { mimeType: 'font/woff2' }), canonicalRules[1], canonicalRules[2]] }),
    Object.freeze({ name: 'extra property', rules: [createFontFaceRule(fixtureFaces[0], { extraDeclaration: '  unicode-range: U+0000-00FF;' }), canonicalRules[1], canonicalRules[2]] })
  ]);

  for (const invalidCase of identityCases) {
    await testContext.test(invalidCase.name, () => {
      // <lang><zh-CN>每个子测试使用新 manifest，避免某个负例污染后续判断。</zh-CN><en>Each subtest uses a fresh manifest so one negative case cannot contaminate later judgments.</en></lang>
      const stylesheet = createStylesheet(invalidCase.rules);
      assert.throws(() => verifyMpRuntimeFontFaces(stylesheet, createValidManifest()));
    });
  }
});

test('rejects decoded WOFF size or SHA drift independently', async (testContext) => {
  // <lang><zh-CN>canonical 样式作为两个 manifest 负例的共同只读输入。</zh-CN><en>The canonical stylesheet is the shared read-only input for two manifest negative cases.</en></lang>
  const canonicalStylesheet = createStylesheet(fixtureFaces.map((face) => createFontFaceRule(face)));

  await testContext.test('size mismatch', () => {
    // <lang><zh-CN>只增加第一张 face 的声明 size，payload 与 SHA 保持正确。</zh-CN><en>Increase only the declared size of the first face while retaining the correct payload and SHA.</en></lang>
    const manifest = createValidManifest();
    manifest.faces[0].outputBytes += 1;
    assert.throws(() => verifyMpRuntimeFontFaces(canonicalStylesheet, manifest), /byte size drifted/u);
  });

  await testContext.test('SHA mismatch with equal byte length', () => {
    // <lang><zh-CN>只替换第一张 face 的 64 字符摘要，保持 size 与 payload 不变。</zh-CN><en>Replace only the first face's 64-character digest while retaining size and payload.</en></lang>
    const manifest = createValidManifest();
    manifest.faces[0].outputSha256 = '0'.repeat(64);
    assert.throws(() => verifyMpRuntimeFontFaces(canonicalStylesheet, manifest), /SHA-256 drifted/u);
  });
});

test('rejects noncanonical base64 even when a tolerant decoder could produce bytes', () => {
  // <lang><zh-CN>在第一张 payload 中插入换行；Node decoder 可能宽容空白，但 canonical locator regex 必须先拒绝。</zh-CN><en>Insert a newline into the first payload; Node's decoder may tolerate whitespace, but the canonical locator expression must reject it first.</en></lang>
  const canonicalPayload = fixtureFaces[0].bytes.toString('base64');
  const splitPayload = `${canonicalPayload.slice(0, 8)}\n${canonicalPayload.slice(8)}`;
  const noncanonicalSource = `url("data:font/woff;base64,${splitPayload}") format("woff")`;
  const rules = [createFontFaceRule(fixtureFaces[0], { source: noncanonicalSource }), createFontFaceRule(fixtureFaces[1]), createFontFaceRule(fixtureFaces[2])];

  assert.throws(() => verifyMpRuntimeFontFaces(createStylesheet(rules), createValidManifest()), /not canonical WOFF data/u);
});
