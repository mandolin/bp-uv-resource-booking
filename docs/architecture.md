# 架构与数据源边界 / Architecture and source boundary

## 已实现的本地路径 / Implemented local path

页面只调用 `src/state/booking-demo.mjs` 的有限 action。状态层调用 `src/services/local-project-provider.mjs`；provider 通过 Biz 的 async-provider runtime 将已经导入的 `src/data/venues.json` 映射为受限的目录或详情 outcome。页面不会持有 request handle、dataset、provider host、URL 或 token。

Pages call only finite actions from `src/state/booking-demo.mjs`. The state layer calls `src/services/local-project-provider.mjs`; the provider uses Biz’s async-provider runtime to map the already imported `src/data/venues.json` into bounded catalog or detail outcomes. Pages hold no request handle, dataset, provider host, URL, or token.

```text
page → booking-demo state → local-project-provider → async-provider runtime → local JSON
```

目录使用 `page` / `pageSize`。下拉刷新或搜索替换第一页；触底才追加下一页；页脚显示“已加载 / 总数 / 当前页”，并在追加失败时保留已显示内容和重试入口。

The catalog uses `page` / `pageSize`. Pull refresh or search replaces page one; only reach-bottom appends the next page; the footer shows loaded / total / current-page facts and retains displayed content plus a retry entry when append fails.

## 预约边界 / Booking boundary

确认预约仅写入进程内 mock 状态，刷新即回到 `venues.json` 中的初始预约。取消采用“露出取消操作 → 二次确认 → 标记为已取消”的受控语义；没有远端撤销、退款、库存释放、支付或会员规则。

Booking confirmation writes only process-local mock state and a refresh returns to the initial reservations in `venues.json`. Cancellation uses controlled “reveal Cancel → confirm again → mark cancelled” semantics; there is no remote revocation, refund, inventory release, payment, or membership rule.

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
