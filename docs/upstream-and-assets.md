# 上游、许可证与图片来源 / Upstream, licenses, and image provenance

## 直接可复现输入 / Direct reproducible inputs

| 输入 / Input | 地址 / Location | 提交 / Commit | 许可证 / License | 使用方式 / Use |
| --- | --- | --- | --- | --- |
| HIA-uView | `src/vendor/HIA-uView` | `1dfde9f17fc3654857ba17c12ffeca0822fc8dd9` | MIT | 通过明确 `file:` package、静态 Easycom、完整样式入口、默认主题、locale provider bridge、package-owned types 和小程序条件编译回退消费 UI；不深导入 UI runtime 私有状态 / Consumes UI through the explicit `file:` package, static Easycom, complete style entry, default theme, locale provider bridge, package-owned types, and Mini Program conditional fallbacks; it does not deep-import UI runtime private state |
| HIA-uView-Biz | `src/vendor/HIA-uView-Biz` | `8ba7fa56c1bcfe29655c37a2ea387237289a570c` | MIT | 通过明确 Vite alias 使用 async-provider runtime / async-provider runtime through an explicit Vite alias |

两个 submodule 均保留为 Git link。升级只能经单独审阅：更新 Git link、记录新 commit、重跑本仓测试与 H5/mp-weixin 构建，再审阅许可证/NOTICE 变化。

Both submodules remain Git links. Upgrade only through a separate review: update the Git link, record the new commit, rerun this repository’s tests and H5/mp-weixin builds, then review license/NOTICE changes.

当前 HIA-uView pin 纳入了微信小程序编译时将组件规则写入 app WXSS 的修复、默认浅色 token 的受控 `MP-WEIXIN` 条件编译回退，以及 package-owned declarations、显式 opt-in global types 与静态 Easycom fragment。BP 继续以受限 `easycom` 直接将 `u-*` 标签解析到该 pin 的叶级 SFC，以生成组件自身的 JS/JSON/WXSS。上述能力均经过 UI 的文档、主题、H5/mp-weixin fixture、契约、runtime 与 local package trial 检查后才可被 BP 采用；它们不扩大为真机、发布或业务后端支持声明。

The current HIA-uView pin includes the repair that writes component rules to app WXSS during Mini Program compilation, controlled default-light token `MP-WEIXIN` conditional fallbacks, package-owned declarations, explicit opt-in global types, and a static Easycom fragment. BP additionally resolves `u-*` tags directly to leaf SFCs in that pin through bounded `easycom` so component JS/JSON/WXML/WXSS are generated as well. BP adopts these capabilities only after the UI documentation, theme, H5/mp-weixin fixture, contract, runtime, and local package-trial checks pass. They do not expand into a device, release, or business-backend support claim.

HIA-uView 的更早上游参考项目（uView、uView2.0、uView-Pro、uview-plus）由 HIA-uView 自身的审计与 NOTICE 治理负责。本 BP 不直接复制这些项目的源码。

Earlier HIA-uView upstream references (uView, uView2.0, uView-Pro, and uview-plus) are governed by HIA-uView’s own audit and NOTICE process. This BP does not directly copy their source code.

## 原创图片资产 / Original image assets

两张图片均为本项目于 2026-08-03 使用内置图像生成能力按下列项目专属 prompt 生成的虚构场馆图片。它们不来自网络、图库、真实场馆或第三方照片；没有人脸、标识、可读文字或品牌。图片仅服务示例展示，不能陈述为真实场馆、客观地点或可商用品牌素材。

Both images are fictional venue images generated for this project on 2026-08-03 using built-in image generation with the project-specific prompts below. They do not come from the web, a stock library, a real venue, or a third-party photograph; they have no faces, logo, readable text, or brand. They serve demo presentation only and must not be represented as a real venue, factual place, or commercially cleared brand asset.

| 文件 / File | 项目用途 / Project use | 生成 prompt 摘要 / Prompt summary |
| --- | --- | --- |
| `src/static/images/venue-riverside-sports-hall-v1.png` | 滨河综合运动馆 / Riverside Sports Hall | 虚构的中国城市多功能运动馆，适合羽毛球与社区活动，木地板，干净明亮，无人物、文字或标识 / Fictional Chinese municipal multipurpose sports hall for badminton and community activity, hardwood floor, clean and bright, no people, text, or logo |
| `src/static/images/venue-cloudline-arts-center-v1.png` | 云际艺术与活动中心 / Cloudline Arts Center | 虚构的中国城市艺术与社区活动中心，可容纳工作坊与小型演出，无人物、文字或标识 / Fictional Chinese municipal arts and community activity center for workshops and small performances, no people, text, or logo |

## 依赖风险披露 / Dependency risk disclosure

UniApp/DCloud 编译链版本固定在 `3.0.0-5010520260709002`，Vue 固定在 `3.4.21`，完整解析结果位于 `pnpm-lock.yaml`。`@dcloudio/uni-h5` 是同版本的明确 H5 runtime 输入；`sass 1.77.8` 只用于编译项目已有的 `uni.scss`。它们用于开发期与构建期；BP runtime 默认不调用远端 API。版本升级时应先审阅官方变更、许可与本项目 H5/mp-weixin 构建，再决定是否降低或接受新的风险。

The UniApp/DCloud compiler chain is pinned at `3.0.0-5010520260709002`, Vue at `3.4.21`, and the complete resolution is in `pnpm-lock.yaml`. `@dcloudio/uni-h5` is an explicit same-version H5 runtime input; `sass 1.77.8` compiles only the project’s existing `uni.scss`. They are used for development and build; the BP runtime calls no remote API by default. On upgrades, review official changes, licenses, and this project’s H5/mp-weixin builds before deciding whether to reduce or accept new risk.
