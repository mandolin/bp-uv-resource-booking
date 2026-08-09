/**
 * <lang><zh-CN>资源预约 BP 的项目级稳定契约词汇：集中定义 capability、operation、source 与 profile identity，避免页面、adapter 和组合根各自发明别名。</zh-CN><en>Project-level stable contract vocabulary for the resource-booking BP: centralizes capability, operation, source, and profile identities so pages, adapters, and the composition root do not invent aliases independently.</en></lang>
 * @lang zh-CN 这些值只用于内存内的显式组合与审计，不是 URL、package discovery key、credential、storage key 或后端协议。
 * @lang en These values serve only explicit in-memory composition and review; they are not URLs, package-discovery keys, credentials, storage keys, or backend protocols.
 */

/**
 * <lang><zh-CN>项目、solution 与 channel profile 的稳定 identity。</zh-CN><en>Stable identities of the project, solution, and channel profiles.</en></lang>
 * @lang zh-CN channel 表示本 BP 的 UniApp 宿主边界，不探测当前运行平台。
 * @lang en The channel represents this BP's UniApp host boundary and does not detect the current runtime platform.
 */
export const RESOURCE_BOOKING_PROFILE_IDS = Object.freeze({
  project: 'bp-uv-resource-booking.project',
  solution: 'bp-uv-resource-booking.solution',
  channel: 'bp-uv-resource-booking.uniapp'
});

/**
 * <lang><zh-CN>solution closure 中三项显式 capability package identity。</zh-CN><en>Three explicit capability-package identities in the solution closure.</en></lang>
 * @lang zh-CN 依赖链为资源目录读取 → 预约创建 → 预约管理，使查询、创建与管理 operation 各自绑定语义相符的 module/grant，同时保留 dependency-first 组合。
 * @lang en The dependency chain is resource-directory read → reservation create → reservation manage, binding query, create, and management operations to matching modules and grants while retaining dependency-first composition.
 */
export const RESOURCE_BOOKING_CAPABILITY_IDS = Object.freeze({
  resourceDirectoryRead: 'bp-uv-resource-booking.resource-directory-read',
  reservationCreate: 'bp-uv-resource-booking.reservation-create',
  reservationManage: 'bp-uv-resource-booking.reservation-manage'
});

/**
 * <lang><zh-CN>project facade 唯一允许的六项业务 operation ID。</zh-CN><en>The six business-operation IDs exclusively allowed by the project facade.</en></lang>
 * @lang zh-CN operation ID 是稳定业务入口；adapter-private request/command 不再携带自由 dispatch 名称。
 * @lang en Operation IDs are stable business entries; adapter-private requests and commands carry no free dispatch name.
 */
export const RESOURCE_BOOKING_OPERATION_IDS = Object.freeze({
  queryCatalog: 'resource.catalog.query',
  readResourceDetail: 'resource.detail.read',
  listReservations: 'reservation.list',
  createReservation: 'reservation.create',
  cancelReservation: 'reservation.cancel',
  rescheduleReservation: 'reservation.reschedule'
});

/**
 * <lang><zh-CN>当前 BP 唯一 local JSON/in-memory authority 的 adapter ID。</zh-CN><en>Adapter ID of the BP's sole local-JSON and in-memory authority.</en></lang>
 * @lang zh-CN future remote/virtual authority 必须另行声明并通过 profile readiness；本常量不进行 fallback 或发现。
 * @lang en A future remote or virtual authority must be declared separately and pass profile readiness; this constant performs no fallback or discovery.
 */
export const RESOURCE_BOOKING_LOCAL_ADAPTER_ID = 'bp-uv-resource-booking.local';
