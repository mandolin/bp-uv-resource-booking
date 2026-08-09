<!--
@lang zh-CN 预约详情页只从共享 readonly state 查找当前运行时的 local mock 预约，并投影其已声明场馆、资源、日期、时段和状态；不读取身份、联系人、支付、后端订单或跨会话数据。
@lang en Reservation Detail finds only current-runtime local-mock reservations from shared readonly state and projects their declared venue, resource, date, slot, and status; it reads no identity, contact, payment, backend order, or cross-session data.
-->
<template>
  <!-- <lang><zh-CN>provider 保持 UI component locale、状态文案和领域字段投影使用同一 runtime locale。</zh-CN><en>The provider keeps UI component locale, status copy, and domain-field projection on one runtime locale.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <!-- <lang><zh-CN>详情页使用带返回行为的应用壳，不显示平台主 tabBar。</zh-CN><en>The detail page uses application shell with back behavior and displays no platform primary tab bar.</en></lang> -->
    <runtime-page-shell :title="runtimeLocale.t('title.reservationDetail')" back>
      <view class="reservation-detail-page">
        <!-- <lang><zh-CN>路由 ID 只有在 readonly state 中命中当前记录时才打开详情；未知、刷新后消失或任意 ID 都走明确空态。</zh-CN><en>A route ID opens detail only when it matches current record in readonly state; unknown, post-refresh missing, or arbitrary IDs use explicit empty state.</en></lang> -->
        <view v-if="reservationDisplay" class="reservation-detail-page__content">
          <!-- <lang><zh-CN>外层提供确定高度，公开 `fluid` 图片只负责填满边界；避免百分比高度在无定高父级中折叠。</zh-CN><en>The wrapper supplies a definite height while the public `fluid` image only fills that boundary, avoiding percentage-height collapse inside an auto-height parent.</en></lang> -->
          <view class="reservation-detail-page__image-frame">
            <u-image class="reservation-detail-page__image" :src="getVenueImage(reservationDisplay.venueImageId) || ''" :alt="reservationDisplay.resourceName" fluid shape="rounded" />
          </view>
          <!-- <lang><zh-CN>名称和状态共享主摘要行，使页面先回答“哪一项预约、当前什么状态”，再展示辅助字段。</zh-CN><en>Name and status share the primary summary row so the page answers “which booking, in what state” before auxiliary fields.</en></lang> -->
          <view class="reservation-detail-page__summary">
            <view class="reservation-detail-page__heading">
              <text class="reservation-detail-page__title">{{ reservationDisplay.venueName }} · {{ reservationDisplay.resourceName }}</text>
              <text class="reservation-detail-page__venue">{{ reservationDisplay.venueName }}</text>
            </view>
            <u-tag :text="reservationStatusLabel(reservationDisplay.status)" :tone="reservationDisplay.status === 'confirmed' ? 'primary' : 'neutral'" />
          </view>
          <!-- <lang><zh-CN>日期与时段以只读元数据条呈现，不模拟订单号、付款凭证或真实参与者计数。</zh-CN><en>Date and slot appear in a read-only metadata strip without simulating an order number, payment receipt, or real participant count.</en></lang> -->
          <view class="reservation-detail-page__metadata">
            <view class="reservation-detail-page__metadata-item"><u-icon name="▣" size="small" tone="neutral" /><text>{{ runtimeLocale.formatDate(reservationDisplay.date) }}</text></view>
            <view class="reservation-detail-page__metadata-item"><u-icon name="◷" size="small" tone="neutral" /><text>{{ reservationDisplay.time }}</text></view>
          </view>
          <u-card :title="runtimeLocale.t('reservation.detailTitle')">
            <u-cell :label="runtimeLocale.t('reservation.statusLabel')" :value="reservationStatusLabel(reservationDisplay.status)" />
            <u-cell :label="runtimeLocale.t('reservation.dateLabel')" :value="runtimeLocale.formatDate(reservationDisplay.date)" />
            <u-cell :label="runtimeLocale.t('reservation.timeLabel')" :value="reservationDisplay.time" />
          </u-card>
          <!-- <lang><zh-CN>纵向 HIA-uView 步骤更接近审阅稿的状态追溯层级，同时仍只说明 local mock 状态。</zh-CN><en>Vertical HIA-uView steps more closely match the reviewed trace hierarchy while still describing only local-mock state.</en></lang> -->
          <u-card :padding="14">
            <u-steps :current="reservationDisplay.status === 'confirmed' ? 1 : 2" direction="vertical" :steps="reservationSteps(reservationDisplay.status)" />
          </u-card>
          <u-notice v-if="demo.bookingWriteFailure.value" visible tone="error" :message="runtimeLocale.localize(demo.bookingWriteFailure.value.message) || runtimeLocale.t('common.notAvailable')" />
          <view class="reservation-detail-page__source">
            <source-badge :source="demo.catalogSource.value" />
            <text>{{ runtimeLocale.t('reservation.localBoundary') }}</text>
          </view>
          <!-- <lang><zh-CN>只有 confirmed 记录可开启改期或取消；两个按钮都先产生页面意图，实际 mutation 始终经 state 的 Biz write seam。</zh-CN><en>Only a confirmed record can open reschedule or cancellation; both buttons first create page intent, while actual mutation always crosses state’s Biz write seam.</en></lang> -->
          <view v-if="reservationDisplay.status === 'confirmed'" class="reservation-detail-page__actions">
            <u-button :label="runtimeLocale.t('reservation.reschedule')" variant="secondary" block @click="openReschedule" />
            <u-button :label="runtimeLocale.t('common.cancel')" block @click="openCancelPopup" />
          </view>
          <!-- <lang><zh-CN>取消二次确认复用 HIA-uView 的受控 bottom popup，贴合已审阅视觉板；遮罩不直接关闭，两个可见文字按钮分别表达保留与确认意图。</zh-CN><en>Cancellation confirmation reuses HIA-uView's controlled bottom popup to match the reviewed board; the mask does not close it directly, and two visible-text buttons express keep and confirm intent.</en></lang> -->
          <u-popup :visible="cancelPopupVisible" placement="bottom" :title="runtimeLocale.t('reservation.cancelTitle')" :mask-closable="false">
            <view class="reservation-detail-page__cancel-sheet">
              <text class="reservation-detail-page__cancel-description">{{ runtimeLocale.t('reservation.cancelNotice') }}</text>
              <view class="reservation-detail-page__cancel-actions">
                <u-button :label="runtimeLocale.t('common.keep')" variant="secondary" block @click="closeCancelPopup" />
                <u-button :label="runtimeLocale.t('reservation.cancelConfirm')" block @click="confirmCancellation" />
              </view>
            </view>
          </u-popup>
        </view>
        <u-empty v-else :title="runtimeLocale.t('reservation.detailEmptyTitle')" :description="runtimeLocale.t('reservation.detailEmptyDescription')" :action-text="runtimeLocale.t('common.goDiscover')" @action="goDiscover" />
      </view>
    </runtime-page-shell>
  </u-config-provider>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import RuntimePageShell from '../../components/RuntimePageShell.vue';
import SourceBadge from '../../components/SourceBadge.vue';
import { getVenueImage } from '../../data/asset-map.mjs';
import { openPrimaryPage } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>详情页只消费共享 state 的受限预约视图和既有取消 action，不读取 dataset 或 provider closure。</zh-CN><en>Detail consumes only shared state’s bounded reservation views and existing cancellation action and reads neither dataset nor provider closure.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>所有用户可见标签、状态和双语资源名都经唯一 runtime locale 投影。</zh-CN><en>Every user-visible label, status, and bilingual resource name is projected through the sole runtime locale.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>路由只保留候选稳定 ID；它在 state 查找前没有记录语义。</zh-CN><en>The route retains only a candidate stable ID; it has no record meaning before a state lookup.</en></lang>
const routeReservationId = ref('');

// <lang><zh-CN>底部确认层可见性由当前页面私有布尔值控制，不能通过路由或 swipe 副作用打开。</zh-CN><en>Bottom-confirmation visibility is controlled by a current-page private Boolean and cannot open through route or swipe side effect.</en></lang>
const cancelPopupVisible = ref(false);

// <lang><zh-CN>只从 readonly collection 查找精确 ID；列表更新后已取消和改期结果会自然重新投影。</zh-CN><en>Look up exact ID only from readonly collection; after list updates, cancelled and rescheduled results naturally reproject.</en></lang>
const reservation = computed(() => demo.reservationCards.value
  .find((candidate) => candidate.id === routeReservationId.value) ?? null);

// <lang><zh-CN>模板只消费这个单一的本地化安全投影，避免 reactive field object 进入 UI string props 或出现无意义的中间 alias。</zh-CN><en>The template consumes only this single localized safe projection, preventing reactive field objects from entering UI string props or creating meaningless intermediate aliases.</en></lang>
const reservationDisplay = computed(() => reservation.value
  ? {
      ...reservation.value,
      venueName: runtimeLocale.localize(reservation.value.venueName),
      resourceName: runtimeLocale.localize(reservation.value.resourceName)
    }
  : null);

/**
 * <lang><zh-CN>投影有限预约状态的当前语言标签。</zh-CN><en>Projects the current-language label of a finite reservation status.</en></lang>
 * @param {string} status <lang><zh-CN>预约的有限状态。</zh-CN><en>Finite reservation status.</en></lang>
 * @returns {string} <lang><zh-CN>已本地化状态标签。</zh-CN><en>Localized status label.</en></lang>
 * @lang zh-CN 未知状态只显示通用 fallback，不回显内部 status code。
 * @lang en An unknown status displays only generic fallback and echoes no internal status code.
 */
function reservationStatusLabel(status) {
  // <lang><zh-CN>当前 local mock contract 只声明 confirmed 与 cancelled 两项。</zh-CN><en>Current local-mock contract declares only confirmed and cancelled.</en></lang>
  return status === 'confirmed' ? runtimeLocale.t('reservation.confirmed') : status === 'cancelled' ? runtimeLocale.t('reservation.cancelled') : runtimeLocale.t('common.notAvailable');
}

/**
 * <lang><zh-CN>为有限预约状态创建时间线显示模型。</zh-CN><en>Creates a timeline presentation model for finite reservation status.</en></lang>
 * @param {string} status <lang><zh-CN>预约的有限状态。</zh-CN><en>Finite reservation status.</en></lang>
 * @returns {ReadonlyArray<object>} <lang><zh-CN>只读 step collection。</zh-CN><en>Readonly step collection.</en></lang>
 * @lang zh-CN 步骤只描述当前 local mock 记录，不表示后台审批、通知或退款过程。
 * @lang en Steps describe only current local-mock record and represent no back-office approval, notification, or refund process.
 */
function reservationSteps(status) {
  // <lang><zh-CN>创建与确认是两个固定基础步骤。</zh-CN><en>Creation and confirmation are the two fixed base steps.</en></lang>
  const steps = [
    Object.freeze({ label: runtimeLocale.t('reservation.stepCreated') }),
    Object.freeze({ label: runtimeLocale.t('reservation.stepConfirmed') })
  ];

  // <lang><zh-CN>仅当前记录已取消时追加取消步骤，避免展示未发生的状态转换。</zh-CN><en>Append cancellation step only when current record is cancelled, avoiding display of a transition that did not happen.</en></lang>
  if (status === 'cancelled') steps.push(Object.freeze({ label: runtimeLocale.t('reservation.stepCancelled') }));
  return Object.freeze(steps);
}

/**
 * <lang><zh-CN>读取路由提供的候选预约 ID。</zh-CN><en>Reads candidate reservation ID supplied by route.</en></lang>
 * @param {Record<string, unknown>} query <lang><zh-CN>UniApp onLoad 提供的页面 query。</zh-CN><en>Page query supplied by UniApp onLoad.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 非字符串输入稳定为空，后续 computed 因此进入安全空态而非解析任意参数。
 * @lang en A non-string input deterministically becomes empty so later computed enters safe empty state instead of parsing arbitrary parameter.
 */
function readRouteReservation(query) {
  // <lang><zh-CN>只读取确切 reservationId 字段，不读取 source、token、日期或其他参数。</zh-CN><en>Read only exact reservationId field and read no source, token, date, or other parameter.</en></lang>
  routeReservationId.value = typeof query?.reservationId === 'string' ? query.reservationId : '';
}

/**
 * <lang><zh-CN>打开当前 confirmed 预约的受控改期页。</zh-CN><en>Opens controlled reschedule page for current confirmed reservation.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 已取消或缺失记录不能进入改期；路由只传稳定 ID，资源/日期/时段仍由 state 重新查找和 allowlist 限制。
 * @lang en A cancelled or missing record cannot enter reschedule; route passes only stable ID while state relooks up resource/date/slot with allowlist limits.
 */
function openReschedule() {
  // <lang><zh-CN>当前状态不满足时保持零导航副作用。</zh-CN><en>When current status is ineligible, retain zero navigation side effect.</en></lang>
  if (reservationDisplay.value?.status !== 'confirmed') return;

  // <lang><zh-CN>只导航到本地页面，不创建 replacement 或修改旧预约。</zh-CN><en>Navigate only to local page and create no replacement or modification to old reservation.</en></lang>
  uni.navigateTo({ url: `/pages/reservation-reschedule/index?reservationId=${encodeURIComponent(reservationDisplay.value.id)}` });
}

/**
 * <lang><zh-CN>请求显示当前 confirmed 预约的二次取消确认。</zh-CN><en>Requests display of second cancellation confirmation for current confirmed reservation.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 该函数只改变局部 bottom popup 可见性，不执行取消或变更状态。
 * @lang en This function changes only local bottom-popup visibility and performs no cancellation or status change.
 */
function openCancelPopup() {
  // <lang><zh-CN>已取消/缺失记录不能被页面再次提出取消意图。</zh-CN><en>A cancelled or missing record cannot raise a new cancellation intent from page.</en></lang>
  if (reservationDisplay.value?.status !== 'confirmed') return;
  cancelPopupVisible.value = true;
}

/**
 * <lang><zh-CN>关闭当前二次取消确认。</zh-CN><en>Closes the current second cancellation confirmation.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 关闭不清除预约、草稿或任何共享 state。
 * @lang en Closing clears no reservation, draft, or shared state.
 */
function closeCancelPopup() {
  // <lang><zh-CN>由受控 visible 值关闭底部确认层。</zh-CN><en>Close the bottom confirmation surface through its controlled visible value.</en></lang>
  cancelPopupVisible.value = false;
}

/**
 * <lang><zh-CN>执行已二次确认的本地取消。</zh-CN><en>Executes twice-confirmed local cancellation.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>Biz write terminal outcome 已被 state 采用或呈现后 resolve。</zh-CN><en>Resolves after state adopts or presents Biz write terminal outcome.</en></lang>
 * @lang zh-CN mutation 只经既有 state/Biz write seam；详情页不直接改写预约记录。
 * @lang en Mutation crosses only existing state/Biz write seam; detail directly mutates no reservation record.
 */
async function confirmCancellation() {
  // <lang><zh-CN>先保存稳定 ID 并关闭底部确认层，避免状态更新时重复确认。</zh-CN><en>Retain stable ID and close the bottom confirmation surface first, avoiding repeated confirmation during state update.</en></lang>
  const reservationId = reservationDisplay.value?.status === 'confirmed' ? reservationDisplay.value.id : '';
  cancelPopupVisible.value = false;

  // <lang><zh-CN>只有仍然符合条件的当前记录才调用共享取消 action。</zh-CN><en>Call shared cancellation action only for a current record that remains eligible.</en></lang>
  if (reservationId) await demo.cancelLocalReservation(reservationId);
}

/**
 * <lang><zh-CN>返回发现主页面。</zh-CN><en>Returns to Discover primary page.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 空态恢复不预取 catalog 或生成新的预约数据。
 * @lang en Empty-state recovery prefetches no catalog and generates no new reservation data.
 */
function goDiscover() {
  // <lang><zh-CN>只进入应用壳已声明的发现主页面。</zh-CN><en>Enter only Discover primary page declared by application shell.</en></lang>
  openPrimaryPage('discover');
}

// <lang><zh-CN>onLoad 是唯一 route ID 读取入口；模板和 computed 都不读取平台 query。</zh-CN><en>onLoad is the sole route-ID read entry; neither template nor computed reads platform query.</en></lang>
onLoad(readRouteReservation);
</script>

<style scoped>
/* <lang><zh-CN>详情页以大图、紧凑摘要、状态追溯和固定双操作层级还原审阅稿；不模拟订单号、用户信息或支付收据。</zh-CN><en>Detail follows the reviewed board with a large image, compact summary, status trace, and fixed dual-action hierarchy without simulating order numbers, user information, or payment receipts.</en></lang> */
.reservation-detail-page { min-height: 100%; padding: 12px 14px 24px; background: var(--u-sys-color-surface); }
.reservation-detail-page__content { display: flex; gap: 14px; flex-direction: column; }
.reservation-detail-page__image-frame { width: 100%; height: 190px; }
.reservation-detail-page__image { display: block; width: 100%; height: 100%; }
.reservation-detail-page__summary { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; }
.reservation-detail-page__heading { display: flex; min-width: 0; gap: 4px; flex: 1; flex-direction: column; }
.reservation-detail-page__title { color: var(--u-sys-color-text); font-size: 21px; font-weight: 700; line-height: 1.35; }
.reservation-detail-page__venue { color: var(--u-sys-color-text-secondary); font-size: 13px; }
.reservation-detail-page__metadata { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px 0; border-top: 1px solid var(--u-sys-color-border); border-bottom: 1px solid var(--u-sys-color-border); }
.reservation-detail-page__metadata-item { display: flex; align-items: center; gap: 7px; color: var(--u-sys-color-text-secondary); font-size: 13px; }
.reservation-detail-page__source { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border: 1px solid var(--u-sys-color-border); border-radius: 12px; background: var(--u-sys-color-surface-subtle); color: var(--u-sys-color-text-secondary); font-size: 12px; line-height: 1.55; }
.reservation-detail-page__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
/* <lang><zh-CN>底部确认内容保持单段风险说明与等宽双操作，安全区由 popup 宿主底部内边距继续承接；不创建第二套 overlay 或遮罩。</zh-CN><en>Bottom-confirmation content keeps one risk explanation and two equal actions while the popup host's bottom padding continues to carry the safe area; it creates no second overlay or mask.</en></lang> */
.reservation-detail-page__cancel-sheet { display: flex; flex-direction: column; gap: 20px; padding-bottom: env(safe-area-inset-bottom); }
.reservation-detail-page__cancel-description { color: var(--u-sys-color-text-secondary); font-size: 15px; line-height: 1.55; }
.reservation-detail-page__cancel-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
</style>
