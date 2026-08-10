# 开发交接、部署与回退 / Development handoff, deployment, and rollback

本文面向接手本示例的开发者，说明如何从公开仓库得到可复现工作树、运行自动门禁、构建两个目标、核对 HIA-uView UI/Biz 消费链，并安全发布或回退 GitHub Pages。它不把示例数据、微信开发工具测试或静态站点部署解释为真实业务上线。

This guide is for developers taking over the demo. It explains how to obtain a reproducible public worktree, run automated gates, build both targets, trace HIA-uView UI/Biz consumption, and publish or roll back GitHub Pages safely. It does not treat demo data, WeChat DevTools testing, or a static-site deployment as a live business launch.

## 可复现检出 / Reproducible checkout

推荐在首次克隆时一并检出两个公开 submodule。不要用浮动分支、未记录的父工作区或本机绝对路径替代 Git link。

Clone both public submodules with the repository. Do not replace a Git link with a floating branch, an undeclared parent workspace, or a machine-absolute path.

~~~powershell
git clone --recurse-submodules https://github.com/mandolin/bp-uv-resource-booking.git
cd bp-uv-resource-booking
git submodule status --recursive
~~~

若已经完成普通克隆，可在仓库根目录补齐 submodule：

If the repository was cloned without submodules, initialize them from the repository root:

~~~powershell
git submodule update --init --recursive
git submodule status --recursive
~~~

状态输出应指向 README 与 <code>docs/upstream-and-assets.md</code> 记录的完整提交。前导 <code>-</code> 表示尚未初始化，前导 <code>+</code> 表示工作树与父仓 Git link 不一致；两种情况都不能作为发布输入。

The status must resolve to the full commits recorded in the README and <code>docs/upstream-and-assets.md</code>. A leading <code>-</code> means the submodule is not initialized, while a leading <code>+</code> means its worktree differs from the parent Git link; neither is a releasable input.

## 工具链、安装与自动门禁 / Toolchain, installation, and automated gates

仓库的 <code>.mise.toml</code> 固定 Node <code>24.12.0</code> 与 pnpm <code>10.27.0</code>。优先让 mise 提供工具，不依赖系统默认版本。安装必须遵守 lockfile，并禁止依赖安装脚本。

The repository pins Node <code>24.12.0</code> and pnpm <code>10.27.0</code> in <code>.mise.toml</code>. Prefer mise over system-default tools. Installation must obey the lockfile and disable dependency install scripts.

~~~powershell
mise install
mise exec -- pnpm install --frozen-lockfile --ignore-scripts
mise exec -- pnpm test
mise exec -- pnpm run build:h5
mise exec -- pnpm run build:mp-weixin
~~~

成功的 H5 构建位于 <code>dist/build/h5/</code>，微信小程序构建位于 <code>dist/build/mp-weixin/</code>。两个目录都是可重建、被 Git 忽略的输出，不应提交。微信构建会在输出目录生成仅供开发工具导入的私有项目配置；它不提供真实微信 AppID、账号或正式发布能力。

A successful H5 build is written to <code>dist/build/h5/</code>, and the WeChat Mini Program build to <code>dist/build/mp-weixin/</code>. Both are reproducible, Git-ignored outputs and must not be committed. The WeChat build creates a private project configuration only inside the output for DevTools import; it provides no real WeChat AppID, account, or production-release capability.

H5 准备步骤会把本仓 <code>LICENSE</code> 与 <code>THIRD_PARTY_NOTICES.md</code> 放在成品根，并在 <code>LICENSES/</code> 放入固定的 HIA-uView、HIA-uView-Biz、uView-Pro、DCloud、Vue 与 Vue Router 许可证/NOTICE。所有文本从固定 source 读取并统一为 LF；不可变许可输入以固定 SHA-256 核验，本清单因不能自引用自身 digest 而以非空及 source/destination digest 相等核验。完整路径与来源见 [第三方声明](../THIRD_PARTY_NOTICES.md)。缺失、空文件、哈希漂移、链接或越界路径都会阻断准备。

The H5 preparation step places this repository's <code>LICENSE</code> and <code>THIRD_PARTY_NOTICES.md</code> at the artifact root, and fixed HIA-uView, HIA-uView-Biz, uView-Pro, DCloud, Vue, and Vue Router license/NOTICE files under <code>LICENSES/</code>. Every text is read from a fixed source and normalized to LF. Immutable license inputs are checked against fixed SHA-256 values; because this ledger cannot self-reference its own digest, it is checked for non-empty content and matching source/destination digests. See [Third-party notices](../THIRD_PARTY_NOTICES.md) for exact paths and provenance. A missing or empty file, hash drift, a link, or path escape blocks preparation.

同一步骤还在唯一 <code>&lt;head&gt;</code> 中声明 <code>/bp-uv-resource-booking/static/icons/tab-home-active.svg</code> 为 favicon，复用已登记原创资产并避免浏览器隐式请求 <code>/favicon.ico</code>。已有其他 icon 声明、重复 head、链接/越界入口或写后不一致都会阻断准备；重复执行不会增加第二个声明。

The same step also declares <code>/bp-uv-resource-booking/static/icons/tab-home-active.svg</code> as the favicon inside the sole <code>&lt;head&gt;</code>, reusing the registered original asset and preventing the browser's implicit <code>/favicon.ico</code> request. Another icon declaration, duplicate head, linked/escaping entry, or post-write mismatch blocks preparation; repeated execution adds no second declaration.

常规测试会核对 submodule pin、双语注释、运行时语言、UI/Biz 消费边界以及显式关闭遥测。两个构建还分别检查最终产物，拒绝已知 DCloud 统计端点与初始化标记。通过门禁只证明当前仓库声明的边界，不等于依赖没有安全公告。

The normal tests verify submodule pins, bilingual comments, runtime locale behavior, UI/Biz adoption boundaries, and the explicit telemetry opt-out. Both builds also inspect their final output and reject known DCloud statistics endpoints and initialization markers. Passing these gates proves only the repository's declared boundary; it does not mean the dependency tree has no security advisories.

2026-08-10 针对当前锁文件的 npmjs audit 快照报告 0 项 critical、12 项 high、21 项 moderate 和 8 项 low；仅 production 投影为 0 项 critical、8 项 high、15 项 moderate 和 3 项 low。默认配置的 npmmirror 不实现 audit endpoint，因此本次只读审计明确指定公开 npmjs endpoint；这不会改变 lockfile 或安装来源。多数公告路径位于锁定的 DCloud/Vite/微信小程序 build 链。维护者本地与 <code>main</code> 只做一次性静态构建，使用 <code>--ignore-scripts</code>，不启动对外 dev/preview server，也不给构建传入应用 secret。

The 2026-08-10 npmjs audit snapshot of the current lockfile reports 0 critical, 12 high, 21 moderate, and 8 low findings; the production-only projection reports 0 critical, 8 high, 15 moderate, and 3 low. The configured default npmmirror provides no audit endpoint, so this read-only audit explicitly targeted the public npmjs endpoint; it changed neither the lockfile nor the install source. Most advisory paths are in the pinned DCloud/Vite/WeChat Mini Program build chain. Maintainer-local and <code>main</code> jobs perform one-shot static builds, use <code>--ignore-scripts</code>, start no externally reachable dev/preview server, and supply no application secret to the build.

Pull Request CI 必须把 PR 中的测试与构建脚本视为不可信代码：它在 GitHub-hosted 临时 runner 上运行，只有只读仓库权限，不使用 secret、package cache 或 deploy 权限，并禁止依赖安装脚本；但测试/构建 JavaScript 仍会执行，runner 仍有出站网络，因此隔离只能降低而不能消除风险。项目明确接受但不隐藏这项阶段性风险；升级依赖或改变 CI 权限后必须重新审计。此边界不是“漏洞无影响”、runtime 零风险或“已经修复”的声明。

Pull Request CI must treat tests and build scripts supplied by a PR as untrusted code. It runs on an ephemeral GitHub-hosted runner with read-only repository permission, no secrets, package cache, or deploy permission, and dependency install scripts disabled; test/build JavaScript still executes and the runner still has outbound network access, so isolation reduces but does not eliminate risk. The project accepts this interim risk without hiding it. Re-audit after dependency upgrades or CI-permission changes. This boundary is not a claim that an advisory is harmless, runtime risk is zero, or the findings are fixed.

锁定的 <code>@dcloudio/uni-h5</code> bundle 还保留 dormant ad-manager endpoint <code>https://hac1.dcloud.net.cn/ah5v2</code> 与 <code>https://has1.dcloud.net.cn/ahl</code>。BP source 不导入、不创建也不调用广告组件/API；source 与 artifact gate 只允许当前锁定框架中的精确 dormant 结构，默认业务流的 Network smoke 必须证明没有跨域请求。成品因此不能表述为“不具备远端能力”；只能表述为默认业务流不触发该能力。该 dormant surface 及未来依赖版本漂移属于已接受并披露的阶段风险。

The pinned <code>@dcloudio/uni-h5</code> bundle also retains dormant ad-manager endpoints at <code>https://hac1.dcloud.net.cn/ah5v2</code> and <code>https://has1.dcloud.net.cn/ahl</code>. BP source neither imports, creates, nor invokes an advertising component/API. Source and artifact gates allow only the exact dormant structure in the pinned framework, and the default-flow Network smoke must prove that no cross-origin request occurs. The artifact therefore cannot be described as lacking remote capability; the supported claim is only that the default business flow does not trigger it. This dormant surface and future dependency-version drift are accepted and disclosed interim risks.

## GitHub Pages / GitHub Pages

默认部署目标是 [https://mandolin.github.io/bp-uv-resource-booking/](https://mandolin.github.io/bp-uv-resource-booking/)。H5 base 固定为 <code>/bp-uv-resource-booking/</code>；Pages workflow 只上传 <code>dist/build/h5</code>，不提交生成物、不建立 <code>gh-pages</code> branch，也不使用 secret、自定义域名或外部托管。

The default deployment target is [https://mandolin.github.io/bp-uv-resource-booking/](https://mandolin.github.io/bp-uv-resource-booking/). The H5 base is fixed to <code>/bp-uv-resource-booking/</code>. The Pages workflow uploads only <code>dist/build/h5</code>; it commits no generated output, creates no <code>gh-pages</code> branch, and uses no secret, custom domain, or external host.

首次发布前，仓库管理员必须在 GitHub 的 Pages 设置中把 Build and deployment source 选择为 <code>GitHub Actions</code>；workflow 文件存在本身不会完成这项仓库级启用。启用后再从受信任的 <code>main</code> 运行 workflow，并核对 environment 与最终 URL。

Before the first publication, a repository administrator must select <code>GitHub Actions</code> as the Build and deployment source in the repository's Pages settings. The presence of a workflow file does not perform this repository-level enablement. After enabling it, run the workflow from trusted <code>main</code> and verify both the environment and final URL.

应用使用 hash router。首页与发现页的地址形如：

The application uses hash routing. Home and Discover URLs therefore have this form:

~~~text
https://mandolin.github.io/bp-uv-resource-booking/#/pages/home/index
https://mandolin.github.io/bp-uv-resource-booking/#/pages/discover/index
~~~

URL fragment 不会发送给 GitHub Pages，因此入口与静态资源可由项目子路径稳定提供，也不需要复制 <code>index.html</code> 为 <code>404.html</code>。不带 <code>#</code> 的 history-style 地址（例如 <code>/bp-uv-resource-booking/pages/discover/index</code>）不属于公开路由契约，返回 404 不表示 hash 应用失效。

The URL fragment is never sent to GitHub Pages, so the project subpath can serve the entry and assets without copying <code>index.html</code> to <code>404.html</code>. A history-style URL without <code>#</code>, such as <code>/bp-uv-resource-booking/pages/discover/index</code>, is outside the public routing contract; a 404 there does not mean the hash application failed.

受信任的 <code>main</code> push 和手工 dispatch 可运行 [Pages workflow](../.github/workflows/deploy-pages.yml)。发布是否成功应以 Actions 中对应 commit 的 build、artifact upload 与 deploy job，以及最终 URL 的 HTTP/浏览器检查共同判断，不能只看 workflow 文件已经存在。

A trusted <code>main</code> push or manual dispatch can run the [Pages workflow](../.github/workflows/deploy-pages.yml). Deployment success requires the build, artifact-upload, and deploy jobs for the exact commit plus HTTP/browser checks of the resulting URL; the mere presence of a workflow file is not deployment evidence.

Pull Request 只运行安装、测试、H5 构建与成品门禁，不执行 Pages 部署；只有受信任的 <code>main</code> 状态可以更新公开站点。

Pull Requests run installation, tests, the H5 build, and artifact gates only; they do not deploy Pages. Only trusted <code>main</code> state may update the public site.

## H5 与微信人工验收 / H5 and WeChat manual acceptance

先刷新或重启应用得到初始 mock snapshot，再按下表检查。H5 还应在浏览器 Network 面板确认默认流程只读取同源静态文件，尤其没有请求已披露的 dormant ad-manager endpoint；微信开发工具控制台不应出现由本项目触发的阻断错误。宿主工具自身的已知噪声必须与项目错误分开记录。

Refresh or relaunch the application first to obtain the initial mock snapshot, then follow the table. For H5, also confirm in the browser Network panel that the default flow reads only same-origin static files and, in particular, does not request the disclosed dormant ad-manager endpoints. WeChat DevTools must show no blocking error caused by this project; known host-tool noise must be recorded separately from application errors.

| 检查 / Check | 操作与预期 / Action and expected result |
| --- | --- |
| 语言 / Locale | 在 Profile 中依次选择跟随系统、简体中文与 English；页面标题、正文、按钮、tab 和状态文案同步切换，刷新后只持久化这一有限偏好。 / Select follow-system, Simplified Chinese, and English in Profile; page titles, body copy, buttons, tabs, and status text change together, and only this bounded preference persists after reload. |
| 目录 / Catalog | Home 与 Discover 经 <code>resource.catalog.query</code> 加载本地目录；关键词、有限筛选、显式页次与触底追加可用，source badge 显示本次 terminal 的 local 来源。 / Home and Discover load the local catalog through <code>resource.catalog.query</code>; keyword search, bounded filters, explicit page state, and reach-bottom append work, and the source badge shows the local source of that terminal. |
| 详情与恢复 / Detail and recovery | 从目录进入有效资源，确认 <code>resource.detail.read</code> 详情与 source badge。H5 再访问 <code>#/pages/resource-detail/index?resourceId=unknown</code>；微信则在开发者工具用自定义编译/启动页面 <code>pages/resource-detail/index</code>、query <code>resourceId=unknown</code>，或使用同等可审计本地导航。两端都应显示有限失败与可发现重试，返回目录打开有效资源后恢复。 / Open a valid resource and verify <code>resource.detail.read</code> details and its source badge. On H5, then visit <code>#/pages/resource-detail/index?resourceId=unknown</code>. In WeChat DevTools, use a custom compile/start page of <code>pages/resource-detail/index</code> with query <code>resourceId=unknown</code>, or an equivalent auditable local navigation. Both targets must show bounded failure and discoverable retry, then recover after returning to the catalog and opening a valid resource. |
| 列表 / Reservation list | My Bookings 经 <code>reservation.list</code> 显示初始 mock 预约及 local source，不读取账号、后端订单或历史记录。 / My Bookings uses <code>reservation.list</code> to show the initial mock reservation and local source, without reading an account, backend order, or history. |
| 变更序列 1：Fresh / Mutation sequence 1: Fresh | 在执行任何写操作前刷新、关闭后重启应用，确认预约集合恢复为版本化 JSON：<code>reservation-demo-001</code>、<code>riverside-court-a</code>、<code>2026-08-08 14:00</code>、confirmed。该 reset 只是当前进程内 mock reset，不是服务端事务、备份恢复或生产 rollback。 / Before any write, reload or close and relaunch the app. Confirm that the versioned JSON baseline is restored: <code>reservation-demo-001</code>, <code>riverside-court-a</code>, <code>2026-08-08 14:00</code>, confirmed. This reset is only an in-process mock reset, not a server transaction, backup restore, or production rollback. |
| 变更序列 2：创建冲突 / Mutation sequence 2: Create conflict | 先为同一资源创建 <code>2026-08-08 14:00</code>；已有 <code>reservation-demo-001</code> 使 <code>reservation.create</code> 返回可发现冲突，不新增记录。 / First create <code>2026-08-08 14:00</code> for the same resource. Existing <code>reservation-demo-001</code> makes <code>reservation.create</code> return a discoverable conflict without adding a record. |
| 变更序列 3：创建成功 / Mutation sequence 3: Create success | 不刷新，改选 <code>2026-08-08 16:00</code>；确认页保持本地示例标识，创建成功后出现 confirmed <code>reservation-demo-002</code>、local write source 与相同时段。 / Without refreshing, choose <code>2026-08-08 16:00</code>. The confirmation page remains explicitly local-demo, and success creates confirmed <code>reservation-demo-002</code> with local write source and that slot. |
| 变更序列 4：改期冲突 / Mutation sequence 4: Reschedule conflict | 对初始 <code>reservation-demo-001</code> 尝试改到已由 <code>reservation-demo-002</code> 占用的 <code>16:00</code>；<code>reservation.reschedule</code> 返回冲突，旧记录仍为 <code>14:00</code> confirmed，不产生替代记录。 / Try to move initial <code>reservation-demo-001</code> to <code>16:00</code>, now occupied by <code>reservation-demo-002</code>. <code>reservation.reschedule</code> returns a conflict; the old record remains confirmed at <code>14:00</code>, with no replacement. |
| 变更序列 5：改期成功 / Mutation sequence 5: Reschedule success | 仍不刷新，把 <code>reservation-demo-001</code> 改到 <code>11:00</code>；成功后旧记录保留为 cancelled，新替代记录为 confirmed。 / Still without refreshing, move <code>reservation-demo-001</code> to <code>11:00</code>. After success, the old record is retained as cancelled and the replacement is confirmed. |
| 变更序列 6：最后取消 / Mutation sequence 6: Final cancel | 最后对一条仍 confirmed 的记录先露出取消操作，再完成二次确认；<code>reservation.cancel</code> 将该记录保留为 cancelled，不删除记录，也不暗示退款。 / Finally, reveal Cancel on a still-confirmed record and complete the second confirmation. <code>reservation.cancel</code> retains it as cancelled rather than deleting it or implying a refund. |
| 控制台错误分类 / Console error classification | 指向项目路径、HIA component、Biz adapter 的 stack，或伴随任一业务流程失败，均为阻断。纯 <code>WAServiceMainContext</code>/<code>appServiceSDKScriptError</code>、不伴随业务失败且六项 operation 可继续时，记录工具版本、时间、消息与影响后可归为宿主噪声，但不能作为真机证据。未知来源默认阻断，直至完成归类。 / A stack pointing to a project path, HIA component, or Biz adapter, or any error accompanied by a failed business flow, is blocking. A pure <code>WAServiceMainContext</code>/<code>appServiceSDKScriptError</code> with no business failure and all six operations still usable may be recorded as host noise with tool version, time, message, and impact; it is not real-device evidence. An unknown source blocks by default until classified. |

## UI 与 Biz consumer trace / UI and Biz consumer trace

两个 source dependency 都是父仓固定的公开 Git link，也是 <code>package.json</code> 中明确的仓内 <code>file:</code> dependency。页面不能从父工作区或 registry 猜测替代实现。

Both source dependencies are public Git links fixed by the parent repository and explicit in-repository <code>file:</code> dependencies in <code>package.json</code>. Pages cannot discover substitute implementations from a parent workspace or registry.

| 边界 / Boundary | 当前消费链 / Current consumer trace |
| --- | --- |
| HIA-uView UI | <code>@hia-uview/ui@0.0.0</code> 来自提交 <code>796fe0d839537900aade45b4a7a856721dfe4e4a</code>。全局样式由 <code>src/uni.scss</code> 引入；<code>u-*</code> 模板通过受限 Easycom 解析到该 pin 的叶级 SFC。 / <code>@hia-uview/ui@0.0.0</code> comes from commit <code>796fe0d839537900aade45b4a7a856721dfe4e4a</code>. Global styles enter through <code>src/uni.scss</code>, while bounded Easycom resolves <code>u-*</code> templates to leaf SFCs at that pin. |
| HIA-uView-Biz | BP 业务源码只直接导入 <code>@hia-uview/biz-project-runtime@0.0.0</code>，来自提交 <code>838e0344adb4177327ced50792c2e5b5744b86f7</code>；三个底层 runtime 只作为该 package 的同源传递依赖。 / BP business source directly imports only <code>@hia-uview/biz-project-runtime@0.0.0</code> from commit <code>838e0344adb4177327ced50792c2e5b5744b86f7</code>; the three lower runtimes are same-provenance transitive dependencies of that package only. |
| Project composition | 页面 → <code>booking-demo</code> state → BP project composition root → Biz project facade → capability/operation gate → 唯一 local adapter → 版本化 JSON 与进程内 transaction。 / Page → <code>booking-demo</code> state → BP project composition root → Biz project facade → capability/operation gate → sole local adapter → versioned JSON and in-process transaction. |
| 六项 operation / Six operations | <code>resource.catalog.query</code>、<code>resource.detail.read</code>、<code>reservation.list</code>、<code>reservation.create</code>、<code>reservation.cancel</code>、<code>reservation.reschedule</code>。source badge 使用各自 facade terminal 的实际 source fact，而不是页面常量。 / The source badge uses the actual source fact from each facade terminal rather than a page constant. |

当前 capability closure 是“资源目录读取 → 预约创建 → 预约管理”，profile 只允许 <code>local</code>。<code>remote</code>、virtual backend、公共 API 与 WebAssembly 都是未来候选，不是隐藏 fallback 或已交付能力。更完整的分层说明见 [架构与数据源边界](architecture.md)。

The current capability closure is resource-directory read → reservation create → reservation manage, and the profile allows only <code>local</code>. A remote source, virtual backend, public API, and WebAssembly are future candidates rather than hidden fallbacks or delivered capabilities. See [Architecture and source boundary](architecture.md) for the complete layering.

## Pin 升级 / Pin upgrades

一次只升级一个 source pin，并使用已经审阅的完整 commit。以下示例中的占位符必须替换为真实的 40 位提交；不要使用 branch 名或浮动 tag。

Upgrade one source pin at a time and use a reviewed full commit. Replace the placeholder below with a real 40-character commit; never use a branch name or floating tag.

~~~powershell
git -C src/vendor/HIA-uView fetch origin <full-commit>
git -C src/vendor/HIA-uView checkout <full-commit>
git add src/vendor/HIA-uView
~~~

升级 Biz 时把路径换为 <code>src/vendor/HIA-uView-Biz</code>。随后必须同步更新公开 pin 表、<code>scripts/verify-input-pins.mjs</code> 的预期提交和本 NOTICE；审阅上游 LICENSE/NOTICE、package graph、导出和源码采用变化。如果 package graph 改变，先审阅并更新 lockfile；无论 graph 是否改变，都用强制物化避免旧 <code>file:</code> 内容留在安装树，然后重跑冻结安装、测试、两个构建与人工矩阵。

For a Biz upgrade, replace the path with <code>src/vendor/HIA-uView-Biz</code>. Then update the public pin tables, expected commits in <code>scripts/verify-input-pins.mjs</code>, and this NOTICE; review upstream LICENSE/NOTICE, package graph, exports, and source-adoption changes. If the package graph changes, review and update the lockfile first. Whether or not it changes, force rematerialization so stale <code>file:</code> content cannot remain installed, then rerun frozen installation, tests, both builds, and the manual matrix.

~~~powershell
mise exec -- pnpm install --force --ignore-scripts
mise exec -- pnpm install --frozen-lockfile --ignore-scripts
mise exec -- pnpm test
mise exec -- pnpm run build:h5
mise exec -- pnpm run build:mp-weixin
~~~

只有父仓 Git link、文档/门禁声明、安装树和构建证据一致时，升级才完成。仅切换 submodule 内部 HEAD 不构成已提交升级。

An upgrade is complete only when the parent Git link, documentation/gate declarations, installed tree, and build evidence agree. Switching only the nested submodule HEAD is not a committed upgrade.

## 部署与代码回退 / Deployment and code rollback

为每次成功部署记录 BP commit、Actions run 与 Pages URL。若已部署 commit 有问题，首选在 <code>main</code> 上对发布 commit 执行 <code>git revert</code>，审阅生成的新提交并正常 push；同一 workflow 会从回退后的受信任树重新构建和部署。构建或 deploy job 在替换站点前失败时，已知良好部署应保持不变。

Record the BP commit, Actions run, and Pages URL for every successful deployment. If a deployed commit is faulty, prefer <code>git revert</code> of the release commit on <code>main</code>, review the new commit, and push normally; the same workflow rebuilds and deploys the reverted trusted tree. If a build or deploy job fails before replacing the site, the known-good deployment should remain in place.

不要强推、重写共享历史、手工编辑 Pages artifact、提交 <code>dist</code> 或建立旁路 <code>gh-pages</code> branch。pin 回退同样应把 submodule checkout、父仓 Git link、公开 pin 声明和门禁恢复到同一个已知良好提交，再完成全部验证。

Do not force-push, rewrite shared history, hand-edit a Pages artifact, commit <code>dist</code>, or create a bypass <code>gh-pages</code> branch. A pin rollback must likewise restore the submodule checkout, parent Git link, public pin declarations, and gates to one known-good commit before completing all verification.

预约数据的刷新重置与 Git/Pages 回退是两个完全不同的概念：前者只重建浏览器或小程序进程内 mock snapshot，后者恢复并重新部署源码。两者都不是实际业务数据库、支付、库存或订单 rollback。

Reservation reset and Git/Pages rollback are separate concepts. The former only rebuilds an in-browser or Mini Program in-process mock snapshot; the latter restores and redeploys source. Neither is a real business-database, payment, inventory, or order rollback.

## 已知交付边界 / Known delivery boundaries

- 当前页面是通用“单运营主体、多场馆”示例，不是某个真实运营主体、行业会员系统、价格、支付或营销方案。
- The pages are a generic one-operator/multi-venue demo, not a real operator, industry membership system, pricing, payment, or marketing solution.

- 默认业务路径只使用仓内 JSON 与当前进程内状态；没有真实后端、HTTP adapter、账号、定位、地图、消息、库存、退款或跨会话预约持久化。
- The default business path uses only checked-in JSON and current-process state. It has no real backend, HTTP adapter, account, location, map, messaging, inventory, refund, or cross-session booking persistence.

- 微信证据限于当前微信开发者工具测试版；不声明真机、正式版审核、AppID、域名白名单、支付、性能或生产兼容性。
- WeChat evidence is limited to the current WeChat DevTools test build; it claims no real-device behavior, production review, AppID, domain allowlist, payment, performance, or production compatibility.

- 当前实现仍有逐页视觉细节、tab 图标清晰度和跨设备字形一致性可改进；不能把能构建或已部署写成逐像素还原完成。
- Per-page visual details, tab-icon sharpness, and cross-device glyph consistency still have room for improvement; a successful build or deployment is not pixel-perfect design evidence.

- CSS 首选思源黑体、思源宋体和少量思源等宽名称，但仓库不捆绑字体文件，也不请求远端字体。宿主未安装时会降级到同源 Noto CJK 或 generic family，因此截图不证明所有设备使用同一字形。
- CSS prefers Source Han Sans, Source Han Serif, and limited Source Han Mono family names, but the repository bundles no font file and requests no remote font. Hosts without those fonts fall back to sibling Noto CJK or generic families, so screenshots do not prove identical glyphs across devices.

- 场馆图片与界面图标是本仓记录的虚构原创资产；它们不证明真实地点、品牌、库存或商业授权。完整来源、字体与许可证边界见 [上游、许可证与图片来源](upstream-and-assets.md) 和 [第三方声明](../THIRD_PARTY_NOTICES.md)。
- Venue images and UI icons are recorded fictional original assets of this repository. They prove no real place, brand, inventory, or commercial authorization. See [Upstream, licenses, and image provenance](upstream-and-assets.md) and [Third-party notices](../THIRD_PARTY_NOTICES.md) for the full provenance, font, and license boundaries.
