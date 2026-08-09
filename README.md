# 城市公共资源预约示例 / Resource Booking Demo

`bp-uv-resource-booking` 是一个面向单运营主体、多场馆的 UniApp boilerplate。它演示“目录—关键词与本地筛选—详情—本地 mock 预约—二次确认取消”的通用资源与服务预约流，不是羽毛球、票务、会员、支付或真实后端的行业预置项目。

`bp-uv-resource-booking` is a UniApp boilerplate for one operating entity with multiple venues. It demonstrates a general resource-and-service booking flow—catalog, keyword and local filtering, detail, local mock booking, and second-confirmation cancellation. It is not an industry preset for badminton, ticketing, membership, payment, or a real backend.

## 当前边界 / Current boundary

- 核心数据来自仓内版本化 JSON；目录/详情读取以及预约创建、取消都经锁定的 HIA-uView-Biz async provider contract 到达唯一 local authority。默认流程不读取网络、不写入 storage，也不依赖账号、定位、地图或支付。
- The core data comes from versioned in-repository JSON. Catalog/detail reads plus booking creation and cancellation reach the sole local authority through the locked HIA-uView-Biz async-provider contract. The default flow reads no network, writes no storage, and depends on no account, location, map, or payment.

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
| `src/vendor/HIA-uView` | `9959205f5cb411ce16227943759ffb74c7aaae16` | HIA-uView UI 源码、完整样式入口、默认主题、locale provider bridge、package-owned types、受限 Easycom、小程序条件编译回退、受控流式图片布局、描边标签、轻量区块操作、纵向步骤连接线、按钮前置装饰以及原生按钮/搜索 control 的宿主字体继承 / UI source, complete style entry, default theme, locale-provider bridge, package-owned types, bounded Easycom, Mini Program conditional fallbacks, bounded fluid-image layout, outline tags, lightweight section actions, vertical-step connectors, button leading decorations, and host-font inheritance for native button/search controls |
| `src/vendor/HIA-uView-Biz` | `8ba7fa56c1bcfe29655c37a2ea387237289a570c` | Catalog/detail read and reservation write async-provider runtime / 目录/详情读取与预约写入 async-provider runtime |

上游关系、原始图片来源和许可证说明见 [docs/upstream-and-assets.md](docs/upstream-and-assets.md)。

For upstream relation, original-image provenance, and licensing notes, see [docs/upstream-and-assets.md](docs/upstream-and-assets.md).

当前 UI pin 已包含微信小程序全局组件样式输出修复、默认浅色 token 的受控 `MP-WEIXIN` 条件编译回退，以及 `UConfigProvider` 的双语 locale bridge；BP 的 `pages.json` 另外以受限 `easycom` 将 `u-*` 模板标签静态解析到该 pin 的叶级 SFC，确保小程序输出拥有对应组件 JS/JSON/WXML/WXSS。更新 pin 或 resolver 必须重跑本仓 test、H5 与 mp-weixin build，再在微信开发工具复核实际视觉，不可只依据 Git link 已更新推断运行成功。

The current UI pin includes the Mini Program global component-style output repair, controlled default-light token `MP-WEIXIN` conditional fallbacks, and the bilingual `UConfigProvider` locale bridge. BP `pages.json` additionally uses bounded `easycom` to statically resolve `u-*` template tags to leaf SFCs in that pin, ensuring the Mini Program output owns the corresponding component JS/JSON/WXML/WXSS. Updating a pin or resolver requires rerunning this repository's tests, H5 and mp-weixin builds, then rechecking actual visuals in WeChat DevTools; a changed Git link alone is not runtime-success evidence.

## 本地开发与构建 / Local development and builds

本项目优先使用 mise，而不是系统默认 Node 或临时下载的运行时。`.mise.toml` 固定 Node `24.12.0` 与 pnpm `10.27.0`。

This project prefers mise rather than a system-default Node or a temporarily downloaded runtime. `.mise.toml` pins Node `24.12.0` and pnpm `10.27.0`.

```powershell
mise install
mise exec -- pnpm install
mise exec -- pnpm test
mise exec -- pnpm run build:h5
mise exec -- pnpm run build:mp-weixin
```

微信小程序构建产物在 `dist/build/mp-weixin/`。用微信开发者工具导入该目录即可进行开发工具测试；本项目没有配置远端接口，因此不会替业务项目处理其域名白名单。

The WeChat Mini Program build output is `dist/build/mp-weixin/`. Import that directory with WeChat DevTools for development-tool testing. This project configures no remote API, so it does not handle domain allowlists for downstream business projects.

H5 构建产物的静态 base 固定为 `/bp-uv-resource-booking/`，与未来 GitHub Pages 仓路径一致。H5 runtime `@dcloudio/uni-h5` 与 `sass` 均为锁定的明确输入；前者用于 H5 平台运行时，后者只在编译 `uni.scss` 时使用。

The H5 build artifact has the static base `/bp-uv-resource-booking/`, matching the future GitHub Pages repository path. Both the H5 runtime `@dcloudio/uni-h5` and `sass` are pinned explicit inputs; the former serves the H5 platform runtime and the latter is used only to compile `uni.scss`.

## 数据源演进 / Data-source evolution

当前 source badge 明确显示“本地示例数据”。未来可经单独审阅增加 remote、virtual backend 或 optional public-API enhancement；必须保留 local JSON 作为可运行的主路径，并以明确设置和运行环境选择 source。详细边界见 [docs/architecture.md](docs/architecture.md)。

The current source badge explicitly says “local demo data.” A future review may add a remote source, virtual backend, or optional public-API enhancement; local JSON must remain a runnable primary path, and source selection must be explicit and environment-aware. See [docs/architecture.md](docs/architecture.md) for the boundary.

## 许可证 / License

本仓采用 [MIT License](LICENSE)。上游及图片素材说明在 [docs/upstream-and-assets.md](docs/upstream-and-assets.md)；不能把本示例中的 mock 数据、文案或图片当作真实场馆、实时库存或可商用第三方内容。

This repository uses the [MIT License](LICENSE). Upstream and image-asset notices are in [docs/upstream-and-assets.md](docs/upstream-and-assets.md); do not treat its mock data, copy, or images as real venues, live inventory, or third-party commercial content.
