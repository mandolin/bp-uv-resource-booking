# 上游、许可证与图片来源 / Upstream, licenses, and image provenance

## 直接可复现输入 / Direct reproducible inputs

| 输入 / Input | 地址 / Location | 提交 / Commit | 许可证 / License | 使用方式 / Use |
| --- | --- | --- | --- | --- |
| HIA-uView | `src/vendor/HIA-uView` | `308d4a754e658b254fc48ac965b3d50d1786a6a3` | MIT | 通过明确 Vite alias 使用 UI 源码、样式和主题 / UI source, styles, and theme through explicit Vite aliases |
| HIA-uView-Biz | `src/vendor/HIA-uView-Biz` | `8ba7fa56c1bcfe29655c37a2ea387237289a570c` | MIT | 通过明确 Vite alias 使用 async-provider runtime / async-provider runtime through an explicit Vite alias |

两个 submodule 均保留为 Git link。升级只能经单独审阅：更新 Git link、记录新 commit、重跑本仓测试与 H5/mp-weixin 构建，再审阅许可证/NOTICE 变化。

Both submodules remain Git links. Upgrade only through a separate review: update the Git link, record the new commit, rerun this repository’s tests and H5/mp-weixin builds, then review license/NOTICE changes.

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
