# 城市公共资源预约示例 / Resource Booking Demo

`bp-uv-resource-booking` 是一个面向单运营主体、多场馆的 UniApp boilerplate。它演示“目录—关键词与本地筛选—详情—本地 mock 预约—二次确认取消”的通用资源与服务预约流，不是羽毛球、票务、会员、支付或真实后端的行业预置项目。

`bp-uv-resource-booking` is a UniApp boilerplate for one operating entity with multiple venues. It demonstrates a general resource-and-service booking flow—catalog, keyword and local filtering, detail, local mock booking, and second-confirmation cancellation. It is not an industry preset for badminton, ticketing, membership, payment, or a real backend.

## 当前边界 / Current boundary

- 核心数据来自仓内版本化 JSON；目录、详情、预约列表、创建、取消和改期六项业务操作全部经版本化 project/solution profile、capability gate 与 HIA-uView-Biz project facade 到达唯一 local adapter。默认业务流不读取网络，预约与草稿只留在内存，也不依赖账号、定位、地图或支付；只有用户明确选择的 runtime locale 会尝试写入一个固定设备 storage key，写入失败仍保留内存选择。
- The core data comes from versioned in-repository JSON. Catalog, detail, reservation-list, create, cancel, and reschedule operations all reach the sole local adapter through versioned project/solution profiles, the capability gate, and the HIA-uView-Biz project facade. The default business flow reads no network, keeps bookings and drafts only in memory, and depends on no account, location, map, or payment. Only an explicitly selected runtime locale attempts to write one fixed device-storage key, and an in-memory choice survives a storage failure.

- 根 `manifest.json` 显式设置 `uniStatistics.enable=false`，不启用 DCloud Uni Statistics。H5 与 mp-weixin 构建命令都会在编译后扫描最终文本产物，拒绝已知统计采集端点、接收器、队列、配置或初始化标记；锁文件仍可能包含编译链的传递依赖，这不代表它进入运行时产物。
- The root `manifest.json` explicitly sets `uniStatistics.enable=false`, so DCloud Uni Statistics is not enabled. Both H5 and mp-weixin build commands scan final text artifacts after compilation and reject known statistics collector endpoints, receivers, queues, configuration, or initialization markers. The lockfile may still contain a transitive compiler-chain dependency; that does not mean it enters runtime artifacts.

- 锁定的 Uni H5 通用 bundle 仍带有未调用的广告组件管理能力及两个 DCloud 广告端点字面值。本 BP 不声明广告组件、`adpid` 或广告 API 调用；源码与成品门禁只允许已审的休眠框架结构，并要求浏览器验收证明默认运行没有跨域请求。这是明确接受并披露的框架 surface，不是已启用广告能力，也不是“成品不含远端能力”的声明。
- The pinned generic Uni H5 bundle still carries an uncalled ad-component manager and two DCloud ad-endpoint literals. This BP declares no ad component, `adpid`, or ad-API call. Source and artifact gates permit only the reviewed dormant framework shape, while browser acceptance must prove that default execution makes no cross-origin request. This is an explicitly accepted and disclosed framework surface—not enabled advertising and not a claim that the artifact contains no remote-capable code.

- 首页、发现、我的预约、个人信息四个 tab；目录同时具有触底追加、显式页次和可发现的重试状态。
- There are four tabs: Home, Discover, My Bookings, and Profile. Catalogs use reach-bottom append, explicit page state, and discoverable retry status together.

- 页面正文、标题和四项 tab 都从同一 `zh-Hans`/`en` runtime locale 呈现；“个人信息”可选择跟随系统、简体中文或 English。标题继续使用 HIA-uView `u-navbar`，微信主导航通过 official custom tabBar 与 `switchTab` 保持跨页面常驻，并以受控 adapter 对齐 HIA-uView `u-tabbar` 的浅色视觉契约。
- Page body copy, titles, and all four tabs render from the same `zh-Hans`/`en` runtime locale. Profile can follow the system or select Simplified Chinese or English. Titles continue to use HIA-uView `u-navbar`; WeChat primary navigation remains persistent across pages through the official custom tab bar and `switchTab`, with a controlled adapter aligned to HIA-uView `u-tabbar`'s light visual contract.

- 字体角色统一为思源黑体承载正文与控件、思源宋体承载少量展示标题、思源等宽仅供代码或技术文本；当前不捆绑字体文件，宿主缺少 Adobe 名称时使用同源 Noto CJK 名称，再降级到 generic family。
- Typography uses Source Han Sans for body and controls, Source Han Serif for limited display headings, and Source Han Mono only for code or technical text. No font file is currently bundled; when Adobe family names are unavailable, the host uses sibling Noto CJK names before generic-family fallback.

- 预约仅存在于当前运行时。取消要先露出操作，再进行二次确认；取消后记录保留为“已取消”，不伪装为删除。已确认预约可从详情进入受控改期：先验证并创建新预约，成功后才保留旧记录为“已取消”；它不能换资源，也不接入真实库存、支付或后端。
- Reservations exist only for the current runtime. Cancellation first reveals an action and then requires confirmation; cancelled records remain visibly cancelled rather than being disguised as deletion. A confirmed booking can enter controlled reschedule from details: it validates and creates a replacement first, then retains the old record as cancelled only after success; it cannot change resource and connects to no live inventory, payment, or backend.

## 可复现输入 / Reproducible inputs

两个 source submodule 位于 `src/vendor/`，以 Git link 锁定，不拷贝或扫描上游代码；BP 还在 `package.json` 以仓内 `file:` specifier 显式声明所消费的 UI 与 Biz runtime package。初始化或恢复工作树后执行：

Two source submodules live in `src/vendor/` and are locked as Git links; upstream code is neither copied nor scanned. BP also explicitly declares the consumed UI and Biz runtime packages through in-repository `file:` specifiers in `package.json`. After cloning or restoring the worktree, run:

```powershell
git submodule update --init --recursive
```

| 输入 / Input | 固定提交 / Pinned commit | 用途 / Use |
| --- | --- | --- |
| `src/vendor/HIA-uView` | `796fe0d839537900aade45b4a7a856721dfe4e4a` | HIA-uView UI 源码、完整样式入口、默认主题、locale provider bridge、package-owned types、受限 Easycom、小程序条件编译回退、受控流式图片布局、描边标签、轻量区块操作、纵向步骤连接线、按钮前置装饰以及原生按钮、搜索与提示 control 的宿主字体继承 / UI source, complete style entry, default theme, locale-provider bridge, package-owned types, bounded Easycom, Mini Program conditional fallbacks, bounded fluid-image layout, outline tags, lightweight section actions, vertical-step connectors, button leading decorations, and host-font inheritance for native button, search, and alert controls |
| `src/vendor/HIA-uView-Biz` | `838e0344adb4177327ced50792c2e5b5744b86f7` | 版本化 project/solution profile、capability/operation gate、确定性 source selection、统一 facade/doctor 与底层异步生命周期 / Versioned project/solution profiles, capability/operation gate, deterministic source selection, unified facade/doctor, and lower asynchronous lifecycle |

上游关系、原始图片来源和许可证说明见 [docs/upstream-and-assets.md](docs/upstream-and-assets.md)。

For upstream relation, original-image provenance, and licensing notes, see [docs/upstream-and-assets.md](docs/upstream-and-assets.md).

当前 UI pin 已包含微信小程序全局组件样式输出修复、默认浅色 token 的受控 `MP-WEIXIN` 条件编译回退，以及 `UConfigProvider` 的双语 locale bridge；BP 的 `pages.json` 另外以受限 `easycom` 将 `u-*` 模板标签静态解析到该 pin 的叶级 SFC，确保小程序输出拥有对应组件 JS/JSON/WXML/WXSS。更新 pin 或 resolver 必须重跑本仓 test、H5 与 mp-weixin build，再在微信开发工具复核实际视觉，不可只依据 Git link 已更新推断运行成功。

The current UI pin includes the Mini Program global component-style output repair, controlled default-light token `MP-WEIXIN` conditional fallbacks, and the bilingual `UConfigProvider` locale bridge. BP `pages.json` additionally uses bounded `easycom` to statically resolve `u-*` template tags to leaf SFCs in that pin, ensuring the Mini Program output owns the corresponding component JS/JSON/WXML/WXSS. Updating a pin or resolver requires rerunning this repository's tests, H5 and mp-weixin builds, then rechecking actual visuals in WeChat DevTools; a changed Git link alone is not runtime-success evidence.

## 本地开发与构建 / Local development and builds

本项目优先使用 mise，而不是系统默认 Node 或临时下载的运行时。`.mise.toml` 固定 Node `24.12.0` 与 pnpm `10.27.0`。

This project prefers mise rather than a system-default Node or a temporarily downloaded runtime. `.mise.toml` pins Node `24.12.0` and pnpm `10.27.0`.

```powershell
mise install
mise exec -- pnpm install --frozen-lockfile --ignore-scripts
mise exec -- pnpm test
mise exec -- pnpm run build:h5
mise exec -- pnpm run build:mp-weixin
```

微信小程序构建产物在 `dist/build/mp-weixin/`。用微信开发者工具导入该目录即可进行开发工具测试；本项目没有配置远端接口，因此不会替业务项目处理其域名白名单。

The WeChat Mini Program build output is `dist/build/mp-weixin/`. Import that directory with WeChat DevTools for development-tool testing. This project configures no remote API, so it does not handle domain allowlists for downstream business projects.

H5 构建产物的静态 base 固定为 `/bp-uv-resource-booking/`，与 GitHub Pages 仓路径一致。构建命令会在固定输出中补入许可证与第三方声明，并在成功返回前执行 Pages 成品门禁。H5 runtime `@dcloudio/uni-h5` 与 `sass` 均为锁定的明确输入；前者用于 H5 平台运行时，后者只在编译 `uni.scss` 时使用。

The H5 build artifact has the static base `/bp-uv-resource-booking/`, matching the GitHub Pages repository path. The build command adds license and third-party notices to the fixed output and runs the Pages artifact gate before returning successfully. Both the H5 runtime `@dcloudio/uni-h5` and `sass` are pinned explicit inputs; the former serves the H5 platform runtime and the latter is used only to compile `uni.scss`.

默认公开地址是 [https://mandolin.github.io/bp-uv-resource-booking/](https://mandolin.github.io/bp-uv-resource-booking/)。首次部署前，仓库管理员必须把 Pages source 设为 GitHub Actions；工作流本身不持有 PAT，也不会尝试自行改变仓库设置。完整的克隆、构建、人工验收、发布、pin 升级与回退步骤见 [交接与部署指南](docs/handoff-and-deployment.md)，分发输入与许可证边界见 [第三方声明](THIRD_PARTY_NOTICES.md)。

The default public URL is [https://mandolin.github.io/bp-uv-resource-booking/](https://mandolin.github.io/bp-uv-resource-booking/). Before the first deployment, a repository administrator must set the Pages source to GitHub Actions; the workflow holds no PAT and does not try to change repository settings itself. See the [handoff and deployment guide](docs/handoff-and-deployment.md) for cloning, builds, manual acceptance, publication, pin upgrades, and rollback, and the [third-party notices](THIRD_PARTY_NOTICES.md) for distributed inputs and license boundaries.

## 数据源演进 / Data-source evolution

当前 source badge 明确显示“本地示例数据”。未来可经单独审阅增加 remote、virtual backend 或 optional public-API enhancement；必须保留 local JSON 作为可运行的主路径，并以明确设置和运行环境选择 source。详细边界见 [docs/architecture.md](docs/architecture.md)。

The current source badge explicitly says “local demo data.” A future review may add a remote source, virtual backend, or optional public-API enhancement; local JSON must remain a runnable primary path, and source selection must be explicit and environment-aware. See [docs/architecture.md](docs/architecture.md) for the boundary.

BP 业务源码只直接导入 `@hia-uview/biz-project-runtime` 的 project-facing surface。具体 profile、local adapter、JSON 数据和预约规则归本 BP；capability/operation 准入、source 选择、读写生命周期、统一 terminal outcome 与只读 doctor 归 Biz。页面与 state 不直接持有 adapter、底层 runtime 或 JSON dataset。

BP business source directly imports only the project-facing surface of `@hia-uview/biz-project-runtime`. This BP owns its concrete profiles, local adapter, JSON data, and reservation rules; Biz owns capability/operation admission, source selection, read/write lifecycle, unified terminal outcomes, and the read-only doctor. Pages and state hold no adapter, lower runtime, or JSON dataset directly.

可审计配置分别位于 `src/project/project.profile.json`、`solution.profile.json`、`capability-packages.json` 与 `anonymous-session.json`。它们只含版本化 JSON 数据；没有配置脚本、动态依赖、endpoint、token 或运行时发现。当前设置与两个已声明环境都只能选择 `local`。

Auditable configuration lives in `src/project/project.profile.json`, `solution.profile.json`, `capability-packages.json`, and `anonymous-session.json`. They contain only versioned JSON data—no configuration script, dynamic dependency, endpoint, token, or runtime discovery. Current settings and both declared environments can select only `local`.

## 许可证 / License

本仓采用 [MIT License](LICENSE)。上游及图片素材说明在 [docs/upstream-and-assets.md](docs/upstream-and-assets.md)；不能把本示例中的 mock 数据、文案或图片当作真实场馆、实时库存或可商用第三方内容。

This repository uses the [MIT License](LICENSE). Upstream and image-asset notices are in [docs/upstream-and-assets.md](docs/upstream-and-assets.md); do not treat its mock data, copy, or images as real venues, live inventory, or third-party commercial content.
