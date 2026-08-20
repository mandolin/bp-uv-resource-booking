# 架构与数据源边界 / Architecture and source boundary

## 已实现的本地路径 / Implemented local path

页面只调用 `src/state/booking-demo.mjs` 的有限 action。状态层只调用 `src/project/resource-booking-project.mjs` 暴露的业务方法；该 composition root 用版本化 project/solution profile、capability package 清单和唯一 local adapter 建立 HIA-uView-Biz project facade。JSON、领域映射和进程内预约 snapshot 留在 adapter 内，页面与 state 不持有 dataset、adapter、底层 runtime、URL 或 token。

Pages call only finite actions from `src/state/booking-demo.mjs`. The state layer calls only business methods exposed by `src/project/resource-booking-project.mjs`; that composition root builds the HIA-uView-Biz project facade from versioned project/solution profiles, a capability-package list, and the sole local adapter. JSON, domain mapping, and the in-process reservation snapshot stay inside the adapter, while pages and state hold no dataset, adapter, lower runtime, URL, or token.

四项 authoring input 分别为 `project.profile.json`、`solution.profile.json`、`capability-packages.json` 和 `anonymous-session.json`。加载器只为每个 facade 实例复制这些 JSON；它不计算环境、不执行配置脚本，也不从 package、网络或父 workspace 发现能力。

The four authoring inputs are `project.profile.json`, `solution.profile.json`, `capability-packages.json`, and `anonymous-session.json`. The loader only copies these JSON documents for each facade instance; it computes no environment, executes no configuration script, and discovers no capability from a package, network, or parent workspace.

```text
page → booking-demo state → project composition root → Biz project facade
     → capability/operation gate → selected local adapter → local JSON/domain rules
```

目录、详情、预约列表、创建、取消和改期是六个显式 operation。前三项 read 与后三项 write 都由同一 project profile 绑定到同一个 local adapter；write authority 在开始前固定为 `local`，不会自动 retry 或 fallback。state 只采用 facade 返回的完整预约投影与实际 source fact，不再根据 JSON 或局部 patch 自行重建结果。

Catalog, detail, reservation list, create, cancel, and reschedule are six explicit operations. The first three reads and latter three writes are bound by one project profile to the same local adapter. Write authority is fixed to `local` before it starts and never automatically retries or falls back. State adopts only complete reservation projections and actual source facts returned by the facade; it no longer rebuilds results from JSON or local patches.

BP 自有 capability closure 为“资源目录读取 → 预约创建 → 预约管理”。solution 只选择顶层预约管理 descriptor，由 Biz resolver 按 dependency-first 顺序展开三层；目录/详情绑定第一层，创建绑定第二层，预约列表、取消和改期绑定第三层。这里的 descriptor 只是本 BP 的业务声明，不冒充已抽取到 Biz 的通用预约模块。

The BP-owned capability closure is “resource-directory read → reservation create → reservation manage.” The solution selects only the top-level reservation-management descriptor, and the Biz resolver expands all three levels in dependency-first order. Catalog/detail bind to the first level, creation to the second, and reservation list/cancel/reschedule to the third. These descriptors are declarations of this BP, not a claim that a generic reservation module has already been extracted into Biz.

资源详情先从该资源已声明的日期和时段中创建内存期草稿；确认页只能回显并提交同一资源的已验证草稿。草稿不进入 URL、storage 或后端请求，且本身不表示库存预留或预约已创建。

Resource detail first creates an in-memory draft from dates and slots declared by that resource; confirmation can only echo and submit a validated draft for that same resource. The draft enters no URL, storage, or backend request and does not itself represent an inventory hold or a created booking.

project doctor 会在不启动 adapter 的情况下验证 profile、capability closure、operation 到 adapter 的覆盖、source mode 与 session/port 声明。它是配置就绪检查，不是真实库存、后端或设备健康探测。

The project doctor validates the profile, capability closure, operation-to-adapter coverage, source modes, and session/port declarations without starting the adapter. It is a configuration-readiness check, not a live inventory, backend, or device-health probe.

目录使用 `page` / `pageSize`。下拉刷新或搜索替换第一页；触底才追加下一页；页脚显示“已加载 / 总数 / 当前页 / 总页数”，总页数只由本次 facade terminal 的 `total` 与 `pageSize` 推导，并在追加失败时保留已显示内容和重试入口。

The catalog uses `page` / `pageSize`. Pull refresh or search replaces page one; only reach-bottom appends the next page. The footer shows loaded / total / current-page / total-page facts, derives total pages only from the current facade terminal's `total` and `pageSize`, and retains displayed content plus a retry entry when append fails.

目录筛选仅接受当前本地 JSON 已声明的场馆 ID、资源类型 ID 和可用日期；它们与关键词共同在分页之前计算。页面不会传入任意字段、表达式、URL 参数或实时排班，空筛选只表示“不限制”。

Catalog filtering accepts only venue IDs, resource-type IDs, and available dates declared by current local JSON; they are computed together with keyword matching before paging. Pages pass no arbitrary field, expression, URL parameter, or live schedule, and an empty filter means only “unrestricted.”

## 可恢复结果 / Recoverable outcomes

目录的首屏读取失败显示完整的重试状态；追加失败保留已经显示的结果、分页事实和“重试下一页”入口。资源详情失败只重试同一个受限资源 ID，不切换 source 或把失败解释为已降级成功。

An initial catalog-read failure displays a complete retry state; an append failure retains already displayed results, pagination facts, and a “retry next page” entry. A resource-detail failure retries only the same bounded resource ID, switches no source, and never interprets failure as a successful degradation.

确认创建成功后，页面呈现独立的本地示例结果，并只允许进入该预约详情或返回首页；创建失败保留原草稿并提供“重新查看时段”。写入 authority 始终是 `local`，失败不会自动换成另一 source 或假装预约已经提交。

After a confirmed creation, the page presents a separate local-demo result and permits only entry to that booking’s details or return to Home; a creation failure retains the original draft and offers “review available times.” Write authority is always `local`: a failure neither automatically switches to another source nor pretends that a booking was submitted.

## 预约边界 / Booking boundary

确认预约、取消与改期都经 project facade 的固定 write operation 到达共享 local adapter 的进程内 mock transaction，刷新即回到 `venues.json` 中的初始预约。同一资源、日期与时段最多保留一项 `confirmed` 记录；创建或改期命中已确认时段时返回有界冲突且不改变 snapshot，`cancelled` 历史不占用示例时段。取消采用“露出取消操作 → 二次确认 → 标记为已取消”的受控语义；改期采用“取消旧预约 + 创建新预约”，若新时段冲突则旧预约保持确认状态。没有远端撤销、退款、库存释放、支付或会员规则。

Booking creation, cancellation, and reschedule all reach an in-process mock transaction in the shared local adapter through fixed project-facade write operations; a refresh returns to initial reservations in `venues.json`. At most one `confirmed` record may occupy the same resource, date, and slot. A create or reschedule attempt against an occupied confirmed slot returns a bounded conflict without changing the snapshot, while `cancelled` history occupies no demo slot. Cancellation uses controlled “reveal Cancel → confirm again → mark cancelled” semantics. Reschedule uses “cancel old reservation + create new reservation”; if a new slot conflicts, the old reservation stays confirmed. There is no remote revocation, refund, inventory release, payment, or membership rule.

## 主题装载边界 / Theme-loading boundary

`src/App.vue` 保留一个不含 CSS 声明的 SCSS 编译单元，使 UniApp 把特殊入口 `src/uni.scss` 标准预注入一次；App 不再显式 `@import` 它，避免双重注入。`uni.scss` 显式导入已锁定的 HIA-uView 样式、浅色 token 与目标平台字体声明；页面与组件只消费 token，不复制主题值。此入口必须随 H5 与 mp-weixin 构建一同验证，并由字体成品门禁拒绝缺失或重复声明，避免组件 CSS 已存在而主题/token/字体未正确装载的视觉退化。

`src/App.vue` retains an SCSS compilation unit with no CSS declarations so UniApp performs one standard pre-injection of the special `src/uni.scss` entry; App no longer `@import`s it explicitly, avoiding double injection. `uni.scss` explicitly imports the locked HIA-uView styles, light tokens, and target-specific font declarations; pages and components consume tokens without copying theme values. Both H5 and mp-weixin builds must verify this entry, and the font artifact gates reject missing or duplicate declarations, preventing visual degradation where component CSS exists but theme, tokens, or fonts are not loaded correctly.

## 隐私与遥测边界 / Privacy and telemetry boundary

根 `src/manifest.json` 显式设置 `uniStatistics.enable=false`；H5、`web` 或 `mp-weixin` 平台块若以后声明 `uniStatistics`，也必须明确保持 `enable=false`，不能覆盖根设置。常规 `check` 锁定源码配置，两个 build 命令还会分别扫描最终 H5 与微信小程序文本产物，并在发现已知 DCloud 统计采集端点、接收器、配置、持久队列或初始化 banner 时失败。门禁不执行产物，也不把“lockfile 仍解析到编译链传递依赖”等同于“统计 runtime 已发布”。

The root `src/manifest.json` explicitly sets `uniStatistics.enable=false`. If an H5, `web`, or `mp-weixin` platform block later declares `uniStatistics`, it must also keep `enable=false` explicitly and cannot override the root. The normal `check` locks the source configuration, while both build commands separately scan final H5 and WeChat Mini Program text artifacts and fail on known DCloud statistics collector endpoints, receivers, configuration, persistent queues, or initialization banners. The gate does not execute artifacts and does not equate “the lockfile still resolves a compiler-chain transitive dependency” with “a statistics runtime is shipped.”

本 BP 不发送应用分析、用户行为或预约数据。目录、详情和预约操作只使用仓内 JSON 与进程内状态；预约草稿与记录不持久化。唯一设备 storage 例外是用户在“个人信息”明确选择 runtime locale 时使用的固定 key；该值只表达 `zh-Hans`、`en` 或跟随系统偏好，不含账号、身份、预约、场馆、搜索或设备画像。

This BP sends no application analytics, user behavior, or booking data. Catalog, detail, and booking operations use only checked-in JSON plus in-process state, and booking drafts and records are not persisted. The sole device-storage exception is the fixed key used when a user explicitly chooses a runtime locale in Profile; its value expresses only `zh-Hans`, `en`, or follow-system preference and contains no account, identity, booking, venue, search, or device-profile data.

锁定的 `@dcloudio/uni-h5` 通用 bundle 仍包含广告组件 manager 的休眠实现，以及 `https://hac1.dcloud.net.cn/ah5v2` 与 `https://has1.dcloud.net.cn/ahl` 两个固定端点字面值。它们只有在广告组件路径调用 manager 时才会请求配置或上报；本 BP 不声明广告组件、`adpid`、广告配置或广告 API。源码门禁拒绝这些采用入口，H5 成品门禁只允许锁定版本中的精确休眠结构并拒绝漂移、复制或其他广告端点，浏览器验收还必须证明默认页面流没有跨域请求。该边界不把“当前未触发”写成“框架没有远端能力”。

The pinned generic `@dcloudio/uni-h5` bundle still contains the dormant implementation of its ad-component manager and the two fixed endpoint literals `https://hac1.dcloud.net.cn/ah5v2` and `https://has1.dcloud.net.cn/ahl`. They request configuration or report data only when an ad-component path calls the manager. This BP declares no ad component, `adpid`, ad configuration, or ad API. The source gate rejects those adoption entries; the H5 artifact gate allows only the exact dormant shape in the pinned version and rejects drift, duplication, or another ad endpoint; browser acceptance must additionally prove that the default page flow makes no cross-origin request. This boundary does not turn “not currently triggered” into “the framework has no remote capability.”

## 未来 source selector / Future source selector

当前 project profile 只允许 `local`，且 source badge 来自每项 facade terminal 的实际 source fact，而不是页面常量。`virtual` 和 `remote` 是未来候选，而非承诺、隐藏 fallback 或运行时探测。未来实现必须在需求、产品和 UI 审阅后明确以下内容：

The current project profile allows only `local`, and each source badge comes from the actual source fact of the corresponding facade terminal rather than a page constant. `virtual` and `remote` are future candidates, not a promise, hidden fallback, or runtime discovery. A future implementation must explicitly define the following after requirements, product, and UI review:

- source 配置、环境能力和选择优先级；不允许动态脚本、任意依赖或任意连接。
- Source configuration, environment capabilities, and selection precedence; dynamic scripts, arbitrary dependencies, and arbitrary connections are not allowed.

- local JSON 的可运行回退与 source badge / 降级可发现性。
- Runnable local-JSON fallback and source-badge / degradation discoverability.

- virtual backend 的数据一致性、URL/API 映射及小程序 WebAssembly 兼容策略。
- Virtual-backend data consistency, URL/API mapping, and Mini Program WebAssembly compatibility strategy.

- remote adapter 的抽象 API contract；Biz 不直接暴露 HTTP 或旧式 `{ code, message, data }` 协议。
- An abstract API contract for a remote adapter; Biz does not directly expose HTTP or legacy `{ code, message, data }` protocol.
