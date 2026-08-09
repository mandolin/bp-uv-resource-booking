# 上游、许可证与图片来源 / Upstream, licenses, and image provenance

## 直接可复现输入 / Direct reproducible inputs

| 输入 / Input | 地址 / Location | 提交 / Commit | 许可证 / License | 使用方式 / Use |
| --- | --- | --- | --- | --- |
| HIA-uView | `src/vendor/HIA-uView` | `498d5020d542561ca897b0deb64f144d3b99566c` | MIT | 通过明确 `file:` package、静态 Easycom、完整样式入口、默认主题、locale provider bridge、package-owned types、小程序条件编译回退、`UImage.fluid`、`UTag.appearance=outline`、无宿主描边的 `USection` 操作、正确对齐的纵向 `USteps` 连接线和必须配合可见文字的 `UButton.leading` 装饰消费 UI；不深导入 UI runtime 私有状态 / Consumes UI through the explicit `file:` package, static Easycom, complete style entry, default theme, locale provider bridge, package-owned types, Mini Program conditional fallbacks, `UImage.fluid`, `UTag.appearance=outline`, host-chrome-free `USection` actions, correctly aligned vertical `USteps` connectors, and `UButton.leading` decoration that must accompany visible text; it does not deep-import UI runtime private state |
| HIA-uView-Biz | `src/vendor/HIA-uView-Biz` | `8ba7fa56c1bcfe29655c37a2ea387237289a570c` | MIT | 通过明确 Vite alias 使用 async-provider runtime / async-provider runtime through an explicit Vite alias |

两个 submodule 均保留为 Git link。升级只能经单独审阅：更新 Git link、记录新 commit、重跑本仓测试与 H5/mp-weixin 构建，再审阅许可证/NOTICE 变化。

Both submodules remain Git links. Upgrade only through a separate review: update the Git link, record the new commit, rerun this repository’s tests and H5/mp-weixin builds, then review license/NOTICE changes.

当前 HIA-uView pin 纳入了微信小程序编译时将组件规则写入 app WXSS 的修复、默认浅色 token 的受控 `MP-WEIXIN` 条件编译回退、package-owned declarations、显式 opt-in global types、静态 Easycom fragment，以及由父容器拥有显式几何的 `UImage.fluid`。BP 继续以受限 `easycom` 直接将 `u-*` 标签解析到该 pin 的叶级 SFC，以生成组件自身的 JS/JSON/WXSS；hero、目录封面和详情图片不再通过深层选择器改写 UI 组件内部尺寸。上述能力均经过 UI 的文档、主题、H5/mp-weixin fixture、契约、runtime 与 local package trial 检查后才可被 BP 采用；它们不扩大为真机、发布或业务后端支持声明。

The current HIA-uView pin includes the repair that writes component rules to app WXSS during Mini Program compilation, controlled default-light token `MP-WEIXIN` conditional fallbacks, package-owned declarations, explicit opt-in global types, a static Easycom fragment, and `UImage.fluid` whose explicit geometry remains parent-owned. BP additionally resolves `u-*` tags directly to leaf SFCs in that pin through bounded `easycom` so component JS/JSON/WXML/WXSS are generated as well; hero, catalog-cover, and detail images no longer rewrite UI internals through deep selectors. BP adopts these capabilities only after the UI documentation, theme, H5/mp-weixin fixture, contract, runtime, and local package-trial checks pass. They do not expand into a device, release, or business-backend support claim.

HIA-uView 的更早上游参考项目（uView、uView2.0、uView-Pro、uview-plus）由 HIA-uView 自身的审计与 NOTICE 治理负责。本 BP 不直接复制这些项目的源码。

Earlier HIA-uView upstream references (uView, uView2.0, uView-Pro, and uview-plus) are governed by HIA-uView’s own audit and NOTICE process. This BP does not directly copy their source code.

## 原创图片资产 / Original image assets

四张图片均为本项目于 2026-08-03 或 2026-08-09 使用内置图像生成能力按下列项目专属 prompt 生成的虚构场馆图片。它们不来自网络、图库、真实场馆或第三方照片；没有人脸、标识、可读文字或品牌。图片仅服务示例展示，不能陈述为真实场馆、客观地点或可商用品牌素材。

All four images are fictional venue images generated for this project on 2026-08-03 or 2026-08-09 using built-in image generation with the project-specific prompts below. They do not come from the web, a stock library, a real venue, or a third-party photograph; they have no faces, logo, readable text, or brand. They serve demo presentation only and must not be represented as a real venue, factual place, or commercially cleared brand asset.

| 文件 / File | 项目用途与 alt / Project use and alt | 生成 prompt 摘要 / Prompt summary |
| --- | --- | --- |
| `src/static/images/venue-riverside-sports-hall-v1.png` | 滨河综合运动馆 / Riverside Sports Hall | 虚构的中国城市多功能运动馆，适合羽毛球与社区活动，木地板，干净明亮，无人物、文字或标识 / Fictional Chinese municipal multipurpose sports hall for badminton and community activity, hardwood floor, clean and bright, no people, text, or logo |
| `src/static/images/venue-cloudline-arts-center-v1.png` | 云际艺术与活动中心 / Cloudline Arts Center | 虚构的中国城市艺术与社区活动中心，可容纳工作坊与小型演出，无人物、文字或标识 / Fictional Chinese municipal arts and community activity center for workshops and small performances, no people, text, or logo |
| `src/static/images/venue-harbor-reading-hall-v1.png` | 澄港阅览与学习馆 / Harbor Reading and Study Hall；card/detail alt 使用场馆名称 / card/detail alt uses the venue name | 内置图像生成，虚构中国城市公共阅览与学习空间，明亮木质内装、书架、长桌、绿植、无人、无文字、无标识 / Built-in image generation; fictional Chinese municipal reading and study hall with bright wood interior, bookshelves, shared tables, plants, no people, text, or logo |
| `src/static/images/venue-newtown-workshop-v1.png` | 新城社区创作空间 / New Town Community Workshop；card/detail alt 使用场馆名称 / card/detail alt uses the venue name | 内置图像生成，虚构中国城市社区工作坊与灵活活动空间，木地板、模块桌椅、自然光、无人、无文字、无标识 / Built-in image generation; fictional Chinese municipal community workshop and flexible activity space with wood floor, modular tables, daylight, no people, text, or logo |

## 原创界面图标 / Original UI icons

底部主导航的八张 SVG 是本项目为 Home、Discover、My bookings 和 Profile 四个语义直接绘制的线性图标；每项分别保留中性未选中态和钴蓝选中态。它们不来自图标库、字体、网络、上游仓或第三方品牌，也不表示定位、真实日程、库存、头像或身份数据。它们随本仓 MIT 许可证发布。

The eight bottom-primary-navigation SVGs are line icons drawn directly for this project for the Home, Discover, My bookings, and Profile meanings. Each item retains a neutral unselected state and a cobalt selected state. They come from no icon library, font, network source, upstream repository, or third-party brand, and they represent no location, live schedule, inventory, avatar, or identity data. They are distributed under this repository's MIT License.

首页双入口另使用两张本项目原创 SVG：浅色日历只装饰主按钮“选择日期”，钴蓝公共建筑只装饰次按钮“浏览场馆”。操作名称始终由相邻的运行时本地化文字承担；图标不表示真实日程、定位、场馆状态或库存。

Home's paired entries use two additional original project SVGs: a light calendar decorates the primary “Choose a date” button and a cobalt public-building outline decorates the secondary “Browse venues” button. Adjacent runtime-localized copy always carries the action name; the icons represent no live schedule, location, venue status, or inventory.

| 语义 / Meaning | 未选中 / Unselected | 选中 / Selected | 边界 / Boundary |
| --- | --- | --- | --- |
| Home / 首页 | `src/static/icons/tab-home.svg` | `src/static/icons/tab-home-active.svg` | 房屋轮廓仅表示主页 / House outline identifies only the primary Home page |
| Discover / 发现 | `src/static/icons/tab-discover.svg` | `src/static/icons/tab-discover-active.svg` | 指南针仅为导航隐喻，不声明定位能力 / Compass is only a navigation metaphor and claims no location capability |
| My bookings / 我的预约 | `src/static/icons/tab-reservations.svg` | `src/static/icons/tab-reservations-active.svg` | 日历不包含真实日期或库存 / Calendar contains no live date or inventory |
| Profile / 个人信息 | `src/static/icons/tab-profile.svg` | `src/static/icons/tab-profile-active.svg` | 人像轮廓不是真实头像或认证身份 / Person outline is no real avatar or authenticated identity |

| 首页入口 / Home entry | 文件 / File | 边界 / Boundary |
| --- | --- | --- |
| Choose a date / 选择日期 | `src/static/icons/action-calendar-light.svg` | 浅色日历只装饰本地目录入口，不表示已连接日历或实时库存 / Light calendar decorates a local catalog entry only and represents no connected calendar or live inventory |
| Browse venues / 浏览场馆 | `src/static/icons/action-venue-primary.svg` | 公共建筑轮廓只装饰目录入口，不表示定位或真实场馆认证 / Public-building outline decorates a catalog entry only and represents no location or real-venue verification |

## 依赖风险披露 / Dependency risk disclosure

UniApp/DCloud 编译链版本固定在 `3.0.0-5010520260709002`，Vue 固定在 `3.4.21`，完整解析结果位于 `pnpm-lock.yaml`。`@dcloudio/uni-h5` 是同版本的明确 H5 runtime 输入；`sass 1.77.8` 只用于编译项目已有的 `uni.scss`。它们用于开发期与构建期；BP runtime 默认不调用远端 API。版本升级时应先审阅官方变更、许可与本项目 H5/mp-weixin 构建，再决定是否降低或接受新的风险。

The UniApp/DCloud compiler chain is pinned at `3.0.0-5010520260709002`, Vue at `3.4.21`, and the complete resolution is in `pnpm-lock.yaml`. `@dcloudio/uni-h5` is an explicit same-version H5 runtime input; `sass 1.77.8` compiles only the project’s existing `uni.scss`. They are used for development and build; the BP runtime calls no remote API by default. On upgrades, review official changes, licenses, and this project’s H5/mp-weixin builds before deciding whether to reduce or accept new risk.
