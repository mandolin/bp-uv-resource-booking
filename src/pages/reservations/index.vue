<!--
@lang zh-CN 我的预约页呈现当前运行时的 local mock 预约，并以“露出取消操作后再二次确认”的受控语义取消记录；它不读取真实身份、联系人、支付、后端订单或跨会话存储。
@lang en My Bookings presents current-runtime local mock reservations and cancels a record with controlled semantics of “reveal cancel then confirm again”; it reads no real identity, contact, payment, backend order, or cross-session storage.
-->
<template>
  <!-- <lang><zh-CN>页面只消费 presentation-ready reservation cards 和唯一的 local cancel action；swipe 组件只负责报告 action intent。</zh-CN><en>The page consumes only presentation-ready reservation cards and the sole local cancel action; the swipe component only reports action intent.</en></lang> -->
  <view class="reservations-page">
    <view class="reservations-page__heading"><text class="reservations-page__eyebrow">本地 mock / Local mock</text><text class="reservations-page__title">我的预约</text><text class="reservations-page__description">本页记录只在当前运行期间存在；刷新后恢复仓内初始示例数据。</text></view>
    <u-empty v-if="demo.reservationCards.value.length === 0" title="暂无本地示例预约 / No local demo bookings" description="可从资源详情选择一个时段 / Choose a slot from Resource Detail" action-text="去发现资源 / Discover resources" @action="goDiscover" />
    <view v-else class="reservations-page__list">
      <!-- <lang><zh-CN>每条记录仅以有限 action array 提供取消入口；页面而非组件拥有二次确认与状态写回。</zh-CN><en>Each record exposes cancellation through a finite action array only; the page, not the component, owns second confirmation and state write-back.</en></lang> -->
      <u-swipe-action v-for="reservation in demo.reservationCards.value" :key="reservation.id" :open="openReservationId === reservation.id" :actions="reservation.status === 'confirmed' ? cancelActions : []" close-text="收起 / Close" @update:open="handleSwipeOpen(reservation.id, $event)" @action="handleSwipeAction(reservation.id, $event)">
        <u-card :title="reservation.resourceName" :sub-title="reservation.venueName">
          <view class="reservations-page__record"><text>{{ reservation.date }} · {{ reservation.time }}</text><u-tag :text="reservation.status === 'confirmed' ? '已确认 / Confirmed' : '已取消 / Cancelled'" :tone="reservation.status === 'confirmed' ? 'primary' : 'neutral'" /></view>
          <view v-if="reservation.status === 'confirmed'" class="reservations-page__actions">
            <text class="reservations-page__hint">点按“操作”露出“取消”，随后还需确认。 / Reveal Cancel from Actions, then confirm again.</text>
            <u-button size="sm" variant="text" :label="openReservationId === reservation.id ? '收起操作 / Close actions' : '操作 / Actions'" @click="toggleReservationActions(reservation.id)" />
          </view>
        </u-card>
      </u-swipe-action>
    </view>
    <u-modal :visible="Boolean(pendingReservationId)" title="取消本地示例预约 / Cancel local demo booking" cancel-text="保留预约 / Keep booking" confirm-text="确认取消 / Confirm cancellation" @cancel="closeCancelModal" @confirm="confirmCancellation"><text>该操作只改变当前运行时的 mock 记录，不会发送网络请求、退款或修改真实预约。 / This only changes a current-runtime mock record; it sends no request, refund, or real-booking change.</text></u-modal>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>预约页只读取共享 state 的卡片结果，并调用其受限 cancellation action。</zh-CN><en>Reservations reads only shared state's card result and invokes its bounded cancellation action.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>当前露出操作的单一预约 ID，空值表示没有 action row 打开。</zh-CN><en>Single reservation ID whose actions are revealed; an empty value means no action row is open.</en></lang>
const openReservationId = ref('');

// <lang><zh-CN>待二次确认的单一预约 ID；它不包含整条记录或其他用户信息。</zh-CN><en>Single reservation ID awaiting second confirmation; it contains no whole record or other user information.</en></lang>
const pendingReservationId = ref('');

// <lang><zh-CN>取消操作是页面自有的冻结 allowlist，swipe 组件不理解其业务结果。</zh-CN><en>The cancellation action is a page-owned frozen allowlist; the swipe component understands no business result of it.</en></lang>
const cancelActions = Object.freeze([Object.freeze({ value: 'cancel', label: '取消 / Cancel', type: 'danger' })]);

/**
 * <lang><zh-CN>切换一条已确认预约的受限操作行。</zh-CN><en>Toggles the bounded action row for one confirmed reservation.</en></lang>
 * @param {string} reservationId <lang><zh-CN>当前记录的有限 ID。</zh-CN><en>Finite ID of the current record.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 该显式入口补足小程序环境的可发现性；它只露出已声明的操作，不直接执行取消。
 * @lang en This explicit entry point improves discoverability in Mini Program environments; it reveals only declared actions and does not cancel directly.
 */
function toggleReservationActions(reservationId) {
  // <lang><zh-CN>再次点按同一记录收起；切换其他记录时始终只有一行可见。</zh-CN><en>A second tap on the same record closes it; switching records always leaves only one row visible.</en></lang>
  openReservationId.value = openReservationId.value === reservationId ? '' : reservationId;
}

/**
 * <lang><zh-CN>响应一条预约的操作行开合意图。</zh-CN><en>Responds to one reservation's action-row open/close intent.</en></lang>
 * @param {string} reservationId <lang><zh-CN>当前渲染记录的有限 ID。</zh-CN><en>Finite ID of the current rendered record.</en></lang>
 * @param {boolean} isOpen <lang><zh-CN>swipe 组件报告的开合值。</zh-CN><en>Open/close value reported by the swipe component.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 该函数只管理局部呈现状态，不执行取消或修改预约。
 * @lang en This function manages local presentation state only and performs no cancellation or reservation change.
 */
function handleSwipeOpen(reservationId, isOpen) {
  // <lang><zh-CN>只保留一个露出行，减少小屏幕上多个危险操作同时可见的歧义。</zh-CN><en>Retain only one revealed row, reducing ambiguity from multiple destructive actions simultaneously visible on small screens.</en></lang>
  openReservationId.value = isOpen ? reservationId : '';
}

/**
 * <lang><zh-CN>把已露出的取消意图送入二次确认 modal。</zh-CN><en>Sends a revealed cancel intent into the second-confirmation modal.</en></lang>
 * @param {string} reservationId <lang><zh-CN>当前记录的有限 ID。</zh-CN><en>Finite ID of the current record.</en></lang>
 * @param {string} action <lang><zh-CN>swipe 组件报告的 allowlisted action 值。</zh-CN><en>Allowlisted action value reported by the swipe component.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 未识别 action 保持零状态改变，不能被当成取消或任意命令。
 * @lang en An unrecognized action retains zero state change and cannot become cancellation or an arbitrary command.
 */
function handleSwipeAction(reservationId, action) {
  // <lang><zh-CN>只允许字面 cancel 进入 modal，保持操作 allowlist 封闭。</zh-CN><en>Allow only literal cancel to enter the modal, keeping the action allowlist closed.</en></lang>
  if (action !== 'cancel') return;

  // <lang><zh-CN>收起 action row 后才显示 modal，清晰区分“露出操作”和“确认取消”两个步骤。</zh-CN><en>Close the action row before displaying the modal, clearly separating “reveal action” and “confirm cancellation” steps.</en></lang>
  openReservationId.value = '';
  pendingReservationId.value = reservationId;
}

/**
 * <lang><zh-CN>放弃本次取消确认。</zh-CN><en>Abandons the current cancellation confirmation.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 不改写预约列表或其他页面状态。
 * @lang en Does not rewrite the reservation list or any other page state.
 */
function closeCancelModal() {
  // <lang><zh-CN>只清除 pending ID，从而由受控 visible 关闭 modal。</zh-CN><en>Clear only the pending ID so controlled visibility closes the modal.</en></lang>
  pendingReservationId.value = '';
}

/**
 * <lang><zh-CN>执行已二次确认的 local mock 取消。</zh-CN><en>Executes a twice-confirmed local mock cancellation.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN state action 会保留已取消记录，页面不将其伪装为删除或远端撤销。
 * @lang en The state action retains the cancelled record; the page does not disguise it as deletion or remote revocation.
 */
function confirmCancellation() {
  // <lang><zh-CN>保存有限 ID 后先关闭 modal，防止 state 更新重渲染时重复确认。</zh-CN><en>Retain the finite ID then close the modal first, preventing repeated confirmation during state-update rerendering.</en></lang>
  const reservationId = pendingReservationId.value;
  pendingReservationId.value = '';

  // <lang><zh-CN>只有非空 pending ID 才调用受限 action。</zh-CN><en>Call the bounded action only for a non-empty pending ID.</en></lang>
  if (reservationId) demo.cancelLocalReservation(reservationId);
}

/**
 * <lang><zh-CN>切换到发现 tab。</zh-CN><en>Switches to the Discover tab.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 导航不会生成或预加载数据。
 * @lang en Navigation generates or preloads no data.
 */
function goDiscover() {
  // <lang><zh-CN>使用 UniApp 本地 tab 路由。</zh-CN><en>Use UniApp local tab routing.</en></lang>
  uni.switchTab({ url: '/pages/discover/index' });
}
</script>

<style scoped>
/* <lang><zh-CN>预约页使用中性信息卡和明确的已取消状态，不将取消操作以危险色覆盖正文内容。</zh-CN><en>Reservations uses neutral information cards and an explicit cancelled state without overlaying body content in destructive color.</en></lang> */
.reservations-page { min-height: 100vh; padding: 20px 16px 28px; background: var(--u-sys-color-surface-subtle); }
.reservations-page__heading { display: flex; gap: 6px; flex-direction: column; margin-bottom: 18px; }
.reservations-page__eyebrow { color: var(--u-sys-color-action-primary); font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.reservations-page__title { color: var(--u-sys-color-text); font-size: 27px; font-weight: 700; }
.reservations-page__description { color: var(--u-sys-color-text-secondary); font-size: 13px; line-height: 1.6; }
.reservations-page__list { display: flex; gap: 12px; flex-direction: column; }
.reservations-page__record { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--u-sys-color-text); font-size: 15px; }
.reservations-page__actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; }
.reservations-page__hint { flex: 1; color: var(--u-sys-color-text-secondary); font-size: 12px; line-height: 1.5; }
</style>
