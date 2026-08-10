/**
 * <lang><zh-CN>验证 Uni Statistics 配置与产物 marker 的纯函数门禁；测试不读取构建目录、不启动应用、不访问网络，也不修改 manifest。</zh-CN><en>Verifies pure-function gates for Uni Statistics configuration and artifact markers; tests do not read build directories, start the app, access the network, or modify the manifest.</en></lang>
 * @lang zh-CN fixture 只含公开的最小配置与已知 DCloud marker，不包含用户数据、环境信息或应用业务正文。
 * @lang en Fixtures contain only minimal public configuration and known DCloud markers and include no user data, environment information, or application business content.
 */

// <lang><zh-CN>使用 Node 内建断言和 test runner，不增加测试依赖。</zh-CN><en>Use Node built-in assertions and test runner without adding a test dependency.</en></lang>
import assert from 'node:assert/strict';
import test from 'node:test';

// <lang><zh-CN>只导入无副作用验证表面；CLI main guard 会阻止测试触发文件系统扫描。</zh-CN><en>Import only the side-effect-free verification surface; the CLI main guard prevents tests from triggering file-system scans.</en></lang>
import { findForbiddenTelemetryMarker, verifyManifestTelemetryDisabled } from '../scripts/verify-telemetry-boundary.mjs';

test('telemetry manifest gate requires root disablement and rejects platform re-enablement', () => {
  // <lang><zh-CN>最小安全 fixture 明确根级关闭且不声明平台覆盖。</zh-CN><en>The minimal safe fixture explicitly disables the root setting and declares no platform override.</en></lang>
  const safeManifest = { uniStatistics: { enable: false }, h5: {}, 'mp-weixin': {} };
  assert.doesNotThrow(() => verifyManifestTelemetryDisabled(safeManifest));

  // <lang><zh-CN>缺失根配置不能依赖 DCloud 默认值。</zh-CN><en>A missing root configuration must not rely on DCloud defaults.</en></lang>
  assert.throws(() => verifyManifestTelemetryDisabled({ h5: {} }), /root uniStatistics\.enable/u);

  // <lang><zh-CN>平台局部 true 会覆盖根关闭，必须作为明确回归失败。</zh-CN><en>A platform-local true overrides the root disablement and must fail as an explicit regression.</en></lang>
  const unsafePlatformManifest = { uniStatistics: { enable: false }, h5: { uniStatistics: { enable: true } } };
  assert.throws(() => verifyManifestTelemetryDisabled(unsafePlatformManifest), /unsafe h5 uniStatistics override/u);
});

test('telemetry artifact marker gate detects collector and initialization evidence', () => {
  // <lang><zh-CN>普通业务 bundle 文本不得产生误报。</zh-CN><en>Ordinary business-bundle text must not produce a false positive.</en></lang>
  assert.equal(findForbiddenTelemetryMarker('const source = "local";'), null);

  // <lang><zh-CN>采集端点、runtime package、队列和初始化 banner 分别覆盖网络与初始化两类退化。</zh-CN><en>The collector endpoint, runtime package, queue, and initialization banner separately cover network and initialization regressions.</en></lang>
  const unsafeArtifactSnippets = Object.freeze([
    'https://tongji.dcloud.io/uni/stat',
    '@dcloudio/uni-stat-public',
    '@dcloudio/uni-cloud-stat',
    '$$STAT__DBDATA',
    '[uni统计 2.0]'
  ]);

  // <lang><zh-CN>每个已知 marker 必须返回受限 label，而不是泄漏匹配正文。</zh-CN><en>Every known marker must return a bounded label rather than leaking matched content.</en></lang>
  for (const unsafeArtifactSnippet of unsafeArtifactSnippets) {
    assert.equal(typeof findForbiddenTelemetryMarker(unsafeArtifactSnippet), 'string');
  }
});
