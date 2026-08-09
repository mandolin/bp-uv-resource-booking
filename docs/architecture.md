# 架构与数据源边界 / Architecture and source boundary

## 已实现的本地路径 / Implemented local path

页面只调用 `src/state/booking-demo.mjs` 的有限 action。状态层调用 `src/services/local-project-provider.mjs`；provider 通过 Biz 的 async-provider runtime 将共享的静态 `src/data/local-dataset.mjs` 映射为受限的目录或详情 outcome。页面不会持有 request handle、dataset、provider host、URL 或 token。

Pages call only finite actions from `src/state/booking-demo.mjs`. The state layer calls `src/services/local-project-provider.mjs`; the provider uses Biz’s async-provider runtime to map shared static `src/data/local-dataset.mjs` into bounded catalog or detail outcomes. Pages hold no request handle, dataset, provider host, URL, or token.

```text
page → booking-demo state → local-project-provider → async-provider runtime → local JSON
```

预约创建、取消和改期则走独立但同样锁定的 write adapter。write authority 在开始前固定为 `local`，不会自动 retry 或 fallback；state 只会在 adapter 返回确定的完整 snapshot 后替换其可见预约列表。

Booking creation, cancellation, and reschedule use a separate but equally locked write adapter. Write authority is fixed to `local` before it starts and never automatically retries or falls back; state replaces its visible reservation list only after adapter returns a definite complete snapshot.

资源详情先从该资源已声明的日期和时段中创建内存期草稿；确认页只能回显并提交同一资源的已验证草稿。草稿不进入 URL、storage 或后端请求，且本身不表示库存预留或预约已创建。

Resource detail first creates an in-memory draft from dates and slots declared by that resource; confirmation can only echo and submit a validated draft for that same resource. The draft enters no URL, storage, or backend request and does not itself represent an inventory hold or a created booking.

```text
page → booking-demo state → local-reservation-write-provider → async-provider runtime → local mock transaction → local JSON seed
```

目录使用 `page` / `pageSize`。下拉刷新或搜索替换第一页；触底才追加下一页；页脚显示“已加载 / 总数 / 当前页”，并在追加失败时保留已显示内容和重试入口。

The catalog uses `page` / `pageSize`. Pull refresh or search replaces page one; only reach-bottom appends the next page; the footer shows loaded / total / current-page facts and retains displayed content plus a retry entry when append fails.

目录筛选仅接受当前本地 JSON 已声明的场馆 ID、资源类型 ID 和可用日期；它们与关键词共同在分页之前计算。页面不会传入任意字段、表达式、URL 参数或实时排班，空筛选只表示“不限制”。

Catalog filtering accepts only venue IDs, resource-type IDs, and available dates declared by current local JSON; they are computed together with keyword matching before paging. Pages pass no arbitrary field, expression, URL parameter, or live schedule, and an empty filter means only “unrestricted.”

## 可恢复结果 / Recoverable outcomes

目录的首屏读取失败显示完整的重试状态；追加失败保留已经显示的结果、分页事实和“重试下一页”入口。资源详情失败只重试同一个受限资源 ID，不切换 source 或把失败解释为已降级成功。

An initial catalog-read failure displays a complete retry state; an append failure retains already displayed results, pagination facts, and a “retry next page” entry. A resource-detail failure retries only the same bounded resource ID, switches no source, and never interprets failure as a successful degradation.

确认创建成功后，页面呈现独立的本地示例结果，并只允许进入该预约详情或返回首页；创建失败保留原草稿并提供“重新查看时段”。写入 authority 始终是 `local`，失败不会自动换成另一 source 或假装预约已经提交。

After a confirmed creation, the page presents a separate local-demo result and permits only entry to that booking’s details or return to Home; a creation failure retains the original draft and offers “review available times.” Write authority is always `local`: a failure neither automatically switches to another source nor pretends that a booking was submitted.

## 预约边界 / Booking boundary

确认预约、取消与改期都经 `local-reservation-write-provider` 的 Biz async-provider write lifecycle 到达进程内 mock transaction，刷新即回到 `venues.json` 中的初始预约。取消采用“露出取消操作 → 二次确认 → 标记为已取消”的受控语义；改期采用“取消旧预约 + 创建新预约”，若新时段冲突则旧预约保持确认状态。没有远端撤销、退款、库存释放、支付或会员规则。

Booking creation, cancellation, and reschedule all reach an in-process mock transaction through the Biz async-provider write lifecycle in `local-reservation-write-provider`; a refresh returns to initial reservations in `venues.json`. Cancellation uses controlled “reveal Cancel → confirm again → mark cancelled” semantics. Reschedule uses “cancel old reservation + create new reservation”; if new slot conflicts, old reservation stays confirmed. There is no remote revocation, refund, inventory release, payment, or membership rule.

## 主题装载边界 / Theme-loading boundary

`src/App.vue` 作为唯一全局样式发射点显式导入 `src/uni.scss`。该文件再显式导入已锁定的 HIA-uView 样式与浅色 token；页面与组件只消费 token，不复制主题值。此入口必须随 H5 与 mp-weixin 构建一同验证，避免组件 CSS 已存在而主题 token 未装载的视觉退化。

`src/App.vue` explicitly imports `src/uni.scss` as the sole global-style emission point. That file explicitly imports the locked HIA-uView styles and light tokens; pages and components consume tokens without copying theme values. This entry must be verified with both H5 and mp-weixin builds, preventing visual degradation where component CSS exists but theme tokens are not loaded.

## 未来 source selector / Future source selector

当前项目只声明 `local`。`virtual` 和 `remote` 是未来候选，而非承诺、隐藏 fallback 或运行时探测。未来实现必须在需求、产品和 UI 审阅后明确以下内容：

The current project declares only `local`. `virtual` and `remote` are future candidates, not a promise, hidden fallback, or runtime discovery. A future implementation must explicitly define the following after requirements, product, and UI review:

- source 配置、环境能力和选择优先级；不允许动态脚本、任意依赖或任意连接。
- Source configuration, environment capabilities, and selection precedence; dynamic scripts, arbitrary dependencies, and arbitrary connections are not allowed.

- local JSON 的可运行回退与 source badge / 降级可发现性。
- Runnable local-JSON fallback and source-badge / degradation discoverability.

- virtual backend 的数据一致性、URL/API 映射及小程序 WebAssembly 兼容策略。
- Virtual-backend data consistency, URL/API mapping, and Mini Program WebAssembly compatibility strategy.

- remote adapter 的抽象 API contract；Biz 不直接暴露 HTTP 或旧式 `{ code, message, data }` 协议。
- An abstract API contract for a remote adapter; Biz does not directly expose HTTP or legacy `{ code, message, data }` protocol.
