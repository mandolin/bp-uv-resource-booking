# 上游、许可证与图片来源 / Upstream, licenses, and image provenance

## 直接可复现输入 / Direct reproducible inputs

| 输入 / Input | 地址 / Location | 提交 / Commit | 许可证 / License | 使用方式 / Use |
| --- | --- | --- | --- | --- |
| HIA-uView | `src/vendor/HIA-uView` | `796fe0d839537900aade45b4a7a856721dfe4e4a` | MIT | 通过明确 `file:` package、静态 Easycom、完整样式入口、默认主题、locale provider bridge、package-owned types、小程序条件编译回退、`UImage.fluid`、`UTag.appearance=outline`、无宿主描边的 `USection` 操作、正确对齐的纵向 `USteps` 连接线、必须配合可见文字的 `UButton.leading` 装饰及原生按钮、搜索、提示 control 的宿主字体继承消费 UI；不深导入 UI runtime 私有状态 / Consumes UI through the explicit `file:` package, static Easycom, complete style entry, default theme, locale provider bridge, package-owned types, Mini Program conditional fallbacks, `UImage.fluid`, `UTag.appearance=outline`, host-chrome-free `USection` actions, correctly aligned vertical `USteps` connectors, `UButton.leading` decoration that must accompany visible text, and host-font inheritance for native button, search, and alert controls; it does not deep-import UI runtime private state |
| HIA-uView-Biz | `src/vendor/HIA-uView-Biz` | `838e0344adb4177327ced50792c2e5b5744b86f7` | MIT | BP 只直接消费 project-runtime；三个内部 runtime 由版本精确的本地 override 与同源 Vite alias 作为其传递依赖，业务源码不深导入 / BP directly consumes only project-runtime; three internal runtimes are its transitive dependencies through version-exact local overrides and same-provenance Vite aliases, with no deep import from business source |

两个 submodule 均保留为 Git link。升级只能经单独审阅：更新 Git link、记录新 commit、重跑本仓测试与 H5/mp-weixin 构建，再审阅许可证/NOTICE 变化。

Both submodules remain Git links. Upgrade only through a separate review: update the Git link, record the new commit, rerun this repository’s tests and H5/mp-weixin builds, then review license/NOTICE changes.

当前 HIA-uView pin 纳入了微信小程序编译时将组件规则写入 app WXSS 的修复、默认浅色 token 的受控 `MP-WEIXIN` 条件编译回退、package-owned declarations、显式 opt-in global types、静态 Easycom fragment，以及由父容器拥有显式几何的 `UImage.fluid`。BP 继续以受限 `easycom` 直接将 `u-*` 标签解析到该 pin 的叶级 SFC，以生成组件自身的 JS/JSON/WXSS；hero、目录封面和详情图片不再通过深层选择器改写 UI 组件内部尺寸。上述能力均经过 UI 的文档、主题、H5/mp-weixin fixture、契约、runtime 与 local package trial 检查后才可被 BP 采用；它们不扩大为真机、发布或业务后端支持声明。

The current HIA-uView pin includes the repair that writes component rules to app WXSS during Mini Program compilation, controlled default-light token `MP-WEIXIN` conditional fallbacks, package-owned declarations, explicit opt-in global types, a static Easycom fragment, and `UImage.fluid` whose explicit geometry remains parent-owned. BP additionally resolves `u-*` tags directly to leaf SFCs in that pin through bounded `easycom` so component JS/JSON/WXML/WXSS are generated as well; hero, catalog-cover, and detail images no longer rewrite UI internals through deep selectors. BP adopts these capabilities only after the UI documentation, theme, H5/mp-weixin fixture, contract, runtime, and local package-trial checks pass. They do not expand into a device, release, or business-backend support claim.

HIA-uView 的更早上游参考项目（uView、uView2.0、uView-Pro、uview-plus）由 HIA-uView 自身的审计与 NOTICE 治理负责。本 BP 不直接复制这些项目的源码。

Earlier HIA-uView upstream references (uView, uView2.0, uView-Pro, and uview-plus) are governed by HIA-uView’s own audit and NOTICE process. This BP does not directly copy their source code.

## 字体选择与交付边界 / Typeface selection and delivery boundary

| 角色 / Role | 首选 / Preferred | 审阅基线 / Reviewed baseline | 许可证 / License | fallback 与发布范围 / Fallback and publication scope |
| --- | --- | --- | --- | --- |
| 正文、导航与 control / Body, navigation, and controls | Source Han Sans SC / 思源黑体 | Adobe Source Han Sans 2.005R | SIL Open Font License 1.1 | `Noto Sans SC` / `Noto Sans CJK SC` → generic `sans-serif` |
| 品牌与少量展示标题 / Brand and limited display headings | Source Han Serif SC / 思源宋体 | Adobe Source Han Serif 2.003R | SIL Open Font License 1.1 | `Noto Serif SC` / `Noto Serif CJK SC` → generic `serif` |
| 代码与技术文本 / Code and technical text | Source Han Mono SC / 思源等宽 | Adobe Source Han Mono 1.002 | SIL Open Font License 1.1 | `Noto Sans Mono CJK SC` / `Sarasa Mono SC` → generic `monospace` |

上述版本是采用字体家族时的官方审阅基线，不是本仓锁定或再分发的二进制输入。当前仓库不包含字体文件、不发起远端字体请求，也不将字体加入小程序包；实际命中的版本取决于开发或运行宿主已安装的字体。这样避免完整 Pan-CJK 字体给示例主包造成不可接受的体积负担，但不同宿主仍可能使用同源 Noto 或 generic fallback，因而不能把当前截图解释为跨设备逐字形一致。若未来要交付确定字体文件，必须单独确定 webfont/subset 机制、保留名称、OFL 文本、包体与小程序加载证据后再纳入资产清单。

The versions above are official review baselines for adopting the families, not binary inputs pinned or redistributed by this repository. The repository currently contains no font file, starts no remote font request, and adds no font to the Mini Program package; the exact version used depends on fonts installed by the development or runtime host. This avoids imposing the size of complete Pan-CJK fonts on the demo main package, while different hosts may still use sibling Noto or generic fallbacks, so current screenshots are not cross-device glyph-level evidence. Any future deterministic font-file delivery requires a separate decision on webfont/subsetting, reserved names, OFL text, package size, and Mini Program loading evidence before entering the asset inventory.

官方来源 / Official sources: [Source Han Sans](https://github.com/adobe-fonts/source-han-sans), [Source Han Serif](https://github.com/adobe-fonts/source-han-serif), [Source Han Mono](https://github.com/adobe-fonts/source-han-mono).

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

底部主导航为 Home、Discover、My bookings 和 Profile 四个语义各保留中性线框未选中态和钴蓝实心选中态：八张 SVG 是本项目直接绘制的 27×27 可审计源稿，未选中态统一使用更深中性色与 `2.333333`（7/3）单位描边；八张 81×81 透明 PNG 由对应源稿直接按 3x 栅格化，而不是把 24 单位源稿非整数放大到 81。custom tabBar 再以 27px 显示 PNG，使常见 3x 屏从源稿生成到最终呈现都使用整数比例。DCloud 的 [`image` 格式说明](https://en.uniapp.dcloud.io/component/image.html#image-format-description) 明确小程序只支持网络地址的 SVG；本地优先示例不为底栏引入网络依赖，同时微信在 official custom tabBar 组件运行前还会校验宿主 `tabBar` 图标格式，因此宿主声明和自定义组件共同使用 PNG，SVG 只作为原创源稿保留。两类资产均不来自图标库、字体、网络、上游仓或第三方品牌，也不表示定位、真实日程、库存、头像或身份数据；它们随本仓 MIT 许可证发布。

The bottom primary navigation retains a neutral outline unselected state and a solid cobalt selected state for each of Home, Discover, My bookings, and Profile. Eight SVGs are auditable 27×27 sources drawn directly for this project; unselected states use a darker neutral plus a `2.333333` (7/3)-unit stroke. Eight transparent 81×81 PNGs are rasterized directly at 3x from those sources instead of non-integer enlargement from a 24-unit source. The custom tab bar then displays each PNG at 27px, retaining an integer ratio from source generation through final presentation on common 3x screens. DCloud's [`image` format note](https://en.uniapp.dcloud.io/component/image.html#image-format-description) states that Mini Programs support SVG only from network addresses. This local-first demo therefore introduces no network dependency for its tab bar; WeChat also validates host `tabBar` icon formats before the official custom tabBar component runs, so the host declaration and custom component share the PNGs while SVGs remain auditable sources only. Neither asset set comes from an icon library, font, network source, upstream repository, or third-party brand, and they represent no location, live schedule, inventory, avatar, or identity data. They are distributed under this repository's MIT License.

首页双入口另使用两张本项目原创 SVG：浅色日历只装饰主按钮“选择日期”，钴蓝公共建筑只装饰次按钮“浏览场馆”。操作名称始终由相邻的运行时本地化文字承担；图标不表示真实日程、定位、场馆状态或库存。

Home's paired entries use two additional original project SVGs: a light calendar decorates the primary “Choose a date” button and a cobalt public-building outline decorates the secondary “Browse venues” button. Adjacent runtime-localized copy always carries the action name; the icons represent no live schedule, location, venue status, or inventory.

| 语义 / Meaning | SVG 源稿（未选中 / 选中） / SVG sources (unselected / selected) | PNG 运行时（未选中 / 选中） / PNG runtime (unselected / selected) | 边界 / Boundary |
| --- | --- | --- | --- |
| Home / 首页 | `tab-home.svg` / `tab-home-active.svg` | `tab-home.png` / `tab-home-active.png` | 房屋线框/实心剪影仅表示主页 / House outline/solid silhouette identifies only the primary Home page |
| Discover / 发现 | `tab-discover.svg` / `tab-discover-active.svg` | `tab-discover.png` / `tab-discover-active.png` | 指南针仅为导航隐喻，不声明定位能力 / Compass is only a navigation metaphor and claims no location capability |
| My bookings / 我的预约 | `tab-reservations.svg` / `tab-reservations-active.svg` | `tab-reservations.png` / `tab-reservations-active.png` | 日历不包含真实日期或库存 / Calendar contains no live date or inventory |
| Profile / 个人信息 | `tab-profile.svg` / `tab-profile-active.svg` | `tab-profile.png` / `tab-profile-active.png` | 人像轮廓不是真实头像或认证身份 / Person outline is no real avatar or authenticated identity |

上述表格中的文件均位于 `src/static/icons/`。PNG 运行时资产固定为 81×81、透明背景和小于 40 KiB；测试会校验文件签名、几何、数量和 source/runtime 对应关系，构建后门禁还会校验生成的 `app.json` 与 custom-tab-bar 只引用这八张 PNG。

All files in the table live under `src/static/icons/`. Runtime PNGs are fixed at 81×81 with transparency and below 40 KiB. Tests verify signatures, geometry, counts, and source/runtime correspondence; the post-build gate also verifies that generated `app.json` and custom-tab-bar reference only these eight PNGs.

| 首页入口 / Home entry | 文件 / File | 边界 / Boundary |
| --- | --- | --- |
| Choose a date / 选择日期 | `src/static/icons/action-calendar-light.svg` | 浅色日历只装饰本地目录入口，不表示已连接日历或实时库存 / Light calendar decorates a local catalog entry only and represents no connected calendar or live inventory |
| Browse venues / 浏览场馆 | `src/static/icons/action-venue-primary.svg` | 公共建筑轮廓只装饰目录入口，不表示定位或真实场馆认证 / Public-building outline decorates a catalog entry only and represents no location or real-venue verification |

## 依赖风险披露 / Dependency risk disclosure

UniApp/DCloud 编译链版本固定在 `3.0.0-5010520260709002`，Vue 固定在 `3.4.21`，完整解析结果位于 `pnpm-lock.yaml`。`@dcloudio/uni-h5` 是同版本的明确 H5 runtime 输入；`sass 1.77.8` 只用于编译项目已有的 `uni.scss`。编译链会传递解析 `@dcloudio/uni-stat`，但根 manifest 明确设置 `uniStatistics.enable=false`，H5 与 mp-weixin 构建后门禁还会拒绝统计端点和初始化 marker；因此披露该开发/构建依赖，不把它表述为已装入 BP runtime。通用 H5 bundle 另保留未调用的 DCloud 广告组件 manager 与两个固定端点字面值；BP 不使用广告入口，门禁锁定该休眠结构，最终浏览器验收必须证明默认运行零跨域请求。默认业务流不调用远端 API，但这不等于框架成品没有任何远端能力。版本升级时应先审阅官方变更、许可与两个产物门禁，再决定是否降低或接受新的风险。

The UniApp/DCloud compiler chain is pinned at `3.0.0-5010520260709002`, Vue at `3.4.21`, and the complete resolution is in `pnpm-lock.yaml`. `@dcloudio/uni-h5` is an explicit same-version H5 runtime input; `sass 1.77.8` compiles only the project’s existing `uni.scss`. The compiler chain transitively resolves `@dcloudio/uni-stat`, but the root manifest explicitly sets `uniStatistics.enable=false`, and post-build H5 and mp-weixin gates reject statistics endpoints and initialization markers. The dependency is therefore disclosed as a development/build input rather than represented as bundled BP runtime. The generic H5 bundle separately retains an uncalled DCloud ad-component manager and two fixed endpoint literals; the BP uses no ad entry, the gate locks this dormant shape, and final browser acceptance must prove zero cross-origin requests during default execution. The default business flow calls no remote API, but that is not a claim that the framework artifact has no remote capability. On upgrades, review official changes, licenses, and both artifact gates before deciding whether to reduce or accept new risk.
