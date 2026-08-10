/**
 * <lang><zh-CN>GitHub Pages workflow 的静态供应链与权限合同：固定 immutable action、递归 Git link、冻结安装、成品门禁和 main-only deploy。</zh-CN><en>Static supply-chain and permission contract for the GitHub Pages workflow: fixes immutable actions, recursive Git links, frozen installation, the artifact gate, and main-only deployment.</en></lang>
 * @lang zh-CN 本测试不调用 GitHub、不读取 credential、不部署站点；线上状态由发布后的独立 smoke 证明。
 * @lang en This test neither calls GitHub, reads a credential, nor deploys a site; a separate post-publication smoke proves online state.
 */

// <lang><zh-CN>只使用 Node 内建断言、文件与测试 API。</zh-CN><en>Use only Node built-in assertion, file, and test APIs.</en></lang>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// <lang><zh-CN>workflow 使用仓内固定相对路径；测试 runner 的 cwd 必须是当前 package 根。</zh-CN><en>The workflow uses a fixed in-repository relative path; the test runner cwd must be the current package root.</en></lang>
const workflowPath = new URL('../.github/workflows/deploy-pages.yml', import.meta.url);

// <lang><zh-CN>五个 action 均使用已审标签对应的完整 commit，不接受可移动 tag 或 branch。</zh-CN><en>All five actions use full commits corresponding to reviewed tags and accept no movable tag or branch.</en></lang>
const immutableActionReferences = Object.freeze([
  'actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803',
  'actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38',
  'actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b',
  'actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b',
  'actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e'
]);

test('Pages workflow keeps immutable inputs, bounded permissions, and a gated artifact', async () => {
  // <lang><zh-CN>读取唯一 workflow；缺失或不可读必须使测试直接失败。</zh-CN><en>Read the sole workflow; absence or unreadability must fail the test directly.</en></lang>
  const workflow = await readFile(workflowPath, 'utf8');

  // <lang><zh-CN>逐项锁定完整 action commit，防止 tag 漂移改变构建或部署代码。</zh-CN><en>Fix every complete action commit so tag movement cannot change build or deployment code.</en></lang>
  for (const actionReference of immutableActionReferences) {
    assert.equal(workflow.includes(`uses: ${actionReference}`), true);
  }

  // <lang><zh-CN>任何 `uses:` 都必须以四十位十六进制 SHA 结尾。</zh-CN><en>Every `uses:` value must end with a forty-character hexadecimal SHA.</en></lang>
  const actionLines = workflow.split(/\r?\n/u).filter((line) => line.includes('uses:'));
  assert.equal(actionLines.length, immutableActionReferences.length);
  assert.equal(actionLines.every((line) => /uses:\s+[a-z0-9_.-]+\/[a-z0-9_.-]+@[0-9a-f]{40}(?:\s+#.*)?$/iu.test(line.trim())), true);

  // <lang><zh-CN>source checkout 必须递归 materialize 两个公开 Git link，且不得把凭据留给后续 shell。</zh-CN><en>Source checkout must recursively materialize both public Git links and retain no credential for later shell steps.</en></lang>
  assert.match(workflow, /persist-credentials:\s+false/u);
  assert.match(workflow, /submodules:\s+recursive/u);

  // <lang><zh-CN>CI runtime、冻结安装、测试、H5 build 与成品门禁必须处于 artifact upload 之前。</zh-CN><en>The CI runtime, frozen installation, tests, H5 build, and artifact gate must precede artifact upload.</en></lang>
  assert.match(workflow, /node-version:\s+24\.12\.0/u);
  assert.match(workflow, /pnpm@10\.27\.0/u);
  assert.match(workflow, /pnpm install --frozen-lockfile --ignore-scripts/u);
  assert.match(workflow, /pnpm test/u);
  assert.match(workflow, /pnpm run build:h5/u);
  assert.match(workflow, /node scripts\/verify-h5-pages-artifact\.mjs/u);
  assert.match(workflow, /path:\s+dist\/build\/h5/u);

  // <lang><zh-CN>deploy 必须依赖 build、限制 main 非 PR，并只在 job 级获得 Pages/OIDC 写权限。</zh-CN><en>Deployment must depend on build, exclude pull requests outside main, and receive Pages/OIDC write access only at job scope.</en></lang>
  assert.match(workflow, /needs:\s+build/u);
  assert.match(workflow, /github\.event_name != 'pull_request' && github\.ref == 'refs\/heads\/main'/u);
  assert.match(workflow, /name:\s+github-pages/u);
  assert.match(workflow, /pages:\s+write/u);
  assert.match(workflow, /id-token:\s+write/u);

  // <lang><zh-CN>workflow 不得读取 secret、使用 self-hosted runner、强制取消已开始部署或上传仓库根。</zh-CN><en>The workflow must not read a secret, use a self-hosted runner, cancel an in-progress deployment, or upload the repository root.</en></lang>
  assert.equal(/secrets\./iu.test(workflow), false);
  assert.equal(/self-hosted/iu.test(workflow), false);
  assert.match(workflow, /cancel-in-progress:\s+false/u);
  assert.equal(/path:\s+['"]?\.['"]?\s*$/mu.test(workflow), false);
});
