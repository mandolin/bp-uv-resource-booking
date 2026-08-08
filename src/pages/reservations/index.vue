<!--
@lang zh-CN 我的预约页呈现当前运行时的 local mock 预约，并以“露出取消操作后再二次确认”的受控语义取消记录；它不读取真实身份、联系人、支付、后端订单或跨会话存储。
@lang en My Bookings presents current-runtime local mock reservations and cancels a record with controlled semantics of “reveal cancel then confirm again”; it reads no real identity, contact, payment, backend order, or cross-session storage.
-->
<template>
  <!-- <lang><zh-CN>provider 直接包住本页，使 UI components、状态标签和领域字段投影使用同一 runtime locale。</zh-CN><en>The provider directly wraps this page so UI components, state labels, and domain-field projection use one runtime locale.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <view class="reservations-page">
      <view class="reservations-page__heading">
        <text class="reservations-page__eyebrow">{{ runtimeLocale.t('reservation.eyebrow') }}</text>
        <text class="reservations-page__title">{{ runtimeLocale.t('reservation.title') }}</text>
        <text class="reservations-page__description">{{ runtimeLocale.t('reservation.description') }}</text>
      </view>
      <u-tabs v-model="activeTab" :items="reservationTabs" />
      <u-empty
        v-if="visibleReservations.length === 0"
        :title="runtimeLocale.t('reservation.emptyTitle')"
        :description="runtimeLocale.t('reservation.emptyDescription')"
        :action-text="runtimeLocale.t('common.goDiscover')"
        @action="goDiscover"
      />
      <u-list v-else class="reservations-page__list">
        <!-- <lang><zh-CN>每条记录仅以有限 action array 提供取消入口；页面而非组件拥有二次确认与状态写回。</zh-CN><en>Each record exposes cancellation through a finite action array only; the page, not the component, owns second confirmation and state write-back.</en></lang> -->
        <u-swipe-action v-for="reservation in visibleReservations" :key="reservation.id" :open="openReservationId === reservation.id" :actions="reservation.status === 'confirmed' ? cancelActions : []" :close-text="runtimeLocale.t('common.close')" @update:open="handleSwipeOpen(reservation.id, $event)" @action="handleSwipeAction(reservation.id, $event)">
          <u-card :title="reservation.resourceName" :sub-title="reservation.venueName">
            <view class="reservations-page__record">
              <text>{{ runtimeLocale.formatDate(reservation.date) }} · {{ reservation.time }}</text>
              <u-tag :text="reservationStatusLabel(reservation.status)" :tone="reservation.status === 'confirmed' ? 'primary' : 'neutral'" />
            </view>
            <u-steps :current="reservation.status === 'confirmed' ? 1 : 2" direction="horizontal" :steps="reservationSteps(reservation.status)" />
            <view v-if="reservation.status === 'confirmed'" class="reservations-page__actions">
              <text class="reservations-page__hint">{{ runtimeLocale.t('reservation.cancelHint') }}</text>
              <u-button size="sm" variant="text" :label="openReservationId === reservation.id ? runtimeLocale.t('common.closeActions') : runtimeLocale.t('common.actions')" @click="toggleReservationActions(reservation.id)" />
            </view>
          </u-card>
        </u-swipe-action>
      </u-list>
      <u-modal :visible="Boolean(pendingReservationId)" :title="runtimeLocale.t('reservation.cancelTitle')" :cancel-text="runtimeLocale.t('common.keep')" :confirm-text="runtimeLocale.t('reservation.cancelConfirm')" @cancel="closeCancelModal" @confirm="confirmCancellation"><text>{{ runtimeLocale.t('reservation.cancelNotice') }}</text></u-modal>
    </view>
  </u-config-provider>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { scheduleRuntimeChrome } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>预约页只读取共享 state 的卡片结果，并调用其既有受限 local cancellation action。</zh-CN><en>Reservations reads only shared state's card result and invokes its existing bounded local cancellation action.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>页面使用唯一 shared runtime locale，以本地化 tab、状态、步骤和领域字段。</zh-CN><en>The page uses the sole shared runtime locale to localize tabs, statuses, steps, and domain fields.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>active/cancelled 只是当前页面展示筛选，不改变预约记录或数据 source。</zh-CN><en>Active/cancelled is only a current-page display filter and changes neither reservation records nor data source.</en></lang>
const activeTab = ref('active');

// <lang><zh-CN>tabs 是从静态资源动态投影的有限列表，不接受远端或用户提供的 tab 标签。</zh-CN><en>Tabs are a finite list dynamically projected from static resources and accept no remote or user-provided tab labels.</en></lang>
const reservationTabs = computed(() => Object.freeze([
  Object.freeze({ value: 'active', label: runtimeLocale.t('reservation.tabActive') }),
  Object.freeze({ value: 'cancelled', label: runtimeLocale.t('reservation.tabCancelled') })
]));

// <lang><zh-CN>卡片数据保留字段对象；可见筛选只在有限 status 上进行，名称在模板调用受控 `localize`。</zh-CN><en>Card data retains field objects; visibility filters only finite statuses, while names are localized through controlled `localize` in the template.</en></lang>
const visibleReservations = computed(() => demo.reservationCards.value
  .filter((reservation) => activeTab.value === 'active' ? reservation.status === 'confirmed' : reservation.status === 'cancelled')
  .map((reservation) => Object.freeze({
    ...reservation,
    venueName: runtimeLocale.localize(reservation.venueName),
    resourceName: runtimeLocale.localize(reservation.resourceName)
  })));

// <lang><zh-CN>当前露出操作的单一预约 ID，空值表示没有 action row 打开。</zh-CN><en>Single reservation ID whose actions are revealed; an empty value means no action row is open.</en></lang>
const openReservationId = ref('');

// <lang><zh-CN>待二次确认的单一预约 ID；它不包含整条记录或其他用户信息。</zh-CN><en>Single reservation ID awaiting second confirmation; it contains no whole record or other user information.</en></lang>
const pendingReservationId = ref('');

// <lang><zh-CN>取消操作是页面自有冻结 allowlist；swipe 组件不理解其业务结果。</zh-CN><en>The cancellation action is a page-owned frozen allowlist; the swipe component understands no business result.</en></lang>
const cancelActions = computed(() => Object.freeze([Object.freeze({ value: 'cancel', label: runtimeLocale.t('common.cancel'), type: 'danger' })]));

/**
 * <lang><zh-CN>投影有限预约状态的单语言标签。</zh-CN><en>Projects a single-language label for a finite reservation status.</en></lang>
 * @param {string} status <lang><zh-CN>预约记录的有限状态。</zh-CN><en>Finite status of a reservation record.</en></lang>
 * @returns {string} <lang><zh-CN>已本地化状态标签。</zh-CN><en>Localized status label.</en></lang>
 * @lang zh-CN 未知状态安全显示通用 fallback，不将原始状态码暴露为用户文案。
 * @lang en An unknown status safely displays generic fallback and exposes no raw status code as user copy.
 */
function reservationStatusLabel(status) {
  // <lang><zh-CN>只允许 confirmed/cancelled 两项映射，符合当前 local mock contract。</zh-CN><en>Map only confirmed/cancelled, consistent with the current local-mock contract.</en></lang>
  return status === 'confirmed' ? runtimeLocale.t('reservation.confirmed') : status === 'cancelled' ? runtimeLocale.t('reservation.cancelled') : runtimeLocale.t('common.notAvailable');
}

/**
 * <lang><zh-CN>为有限预约状态创建步骤显示模型。</zh-CN><en>Creates a steps presentation model for a finite reservation status.</en></lang>
 * @param {string} status <lang><zh-CN>预约记录的有限状态。</zh-CN><en>Finite status of a reservation record.</en></lang>
 * @returns {ReadonlyArray<object>} <lang><zh-CN>只读 steps 列表。</zh-CN><en>Readonly steps list.</en></lang>
 * @lang zh-CN steps 仅呈现当前 mock 状态，不声称服务端审批、通知或退款进度。
 * @lang en Steps present current mock state only and claim no server approval, notification, or refund progress.
 */
function reservationSteps(status) {
  // <lang><zh-CN>已取消记录追加第三步；已确认记录保持两步，防止凭空显示未发生的取消。</zh-CN><en>Cancelled records append a third step; confirmed records retain two, preventing display of a cancellation that never happened.</en></lang>
  const steps = [
    Object.freeze({ label: runtimeLocale.t('reservation.stepCreated') }),
    Object.freeze({ label: runtimeLocale.t('reservation.stepConfirmed') })
  ];
  if (status === 'cancelled') steps.push(Object.freeze({ label: runtimeLocale.t('reservation.stepCancelled') }));
  return Object.freeze(steps);
}

/**
 * <lang><zh-CN>切换一条已确认预约的受限操作行。</zh-CN><en>Toggles the bounded action row for one confirmed reservation.</en></lang>
 * @param {string} reservationId <lang><zh-CN>当前记录的有限 ID。</zh-CN><en>Finite ID of the current record.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 显式入口补足小程序环境的可发现性；它只露出声明操作，不直接执行取消。
 * @lang en This explicit entry improves Mini Program discoverability; it reveals only declared action and does not cancel directly.
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
  // <lang><zh-CN>只保留一个露出行，减少小屏幕上多个危险操作同时可见的歧义。</zh-CN><en>Retain only one revealed row, reducing ambiguity from multiple dangerous actions visible on small screens.</en></lang>
  openReservationId.value = isOpen ? reservationId : '';
}

/**
 * <lang><zh-CN>把已露出的取消意图送入二次确认 modal。</zh-CN><en>Sends a revealed cancel intent into the second-confirmation modal.</en></lang>
 * @param {string} reservationId <lang><zh-CN>当前记录的有限 ID。</zh-CN><en>Finite ID of the current record.</en></lang>
 * @param {string} action <lang><zh-CN>swipe 组件报告的 allowlisted action 值。</zh-CN><en>Allowlisted action value reported by the swipe component.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 未识别 action 保持零状态改变，不能被当成取消或任意命令。
 * @lang en An unrecognized action retains zero state change and cannot become cancellation or arbitrary command.
 */
function handleSwipeAction(reservationId, action) {
  // <lang><zh-CN>只允许字面 cancel 进入 modal，保持操作 allowlist 封闭。</zh-CN><en>Allow only literal cancel to enter modal, keeping the action allowlist closed.</en></lang>
  if (action !== 'cancel') return;

  // <lang><zh-CN>收起 action row 后才显示 modal，清晰区分“露出操作”和“确认取消”两个步骤。</zh-CN><en>Close action row before showing modal, clearly separating “reveal action” and “confirm cancellation” steps.</en></lang>
  openReservationId.value = '';
  pendingReservationId.value = reservationId;
}

/**
 * <lang><zh-CN>放弃本次取消确认。</zh-CN><en>Abandons the current cancellation confirmation.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 不改写预约列表或其他页面状态。
 * @lang en Does not rewrite reservation list or any other page state.
 */
function closeCancelModal() {
  // <lang><zh-CN>只清除 pending ID，从而由受控 visible 关闭 modal。</zh-CN><en>Clear only pending ID so controlled visible closes the modal.</en></lang>
  pendingReservationId.value = '';
}

/**
 * <lang><zh-CN>执行已二次确认的 local mock 取消。</zh-CN><en>Executes a twice-confirmed local mock cancellation.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN P57 保留既有 state action；P58 才评估其向 Biz write contract 的迁移。
 * @lang en P57 retains existing state action; P58 alone evaluates its migration to a Biz write contract.
 */
function confirmCancellation() {
  // <lang><zh-CN>保存有限 ID 后先关闭 modal，防止 state 更新重渲染时重复确认。</zh-CN><en>Retain finite ID then close modal first, preventing repeated confirmation during state-update rerender.</en></lang>
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

// <lang><zh-CN>每次显示在 native chrome 初始化后投影 tab 和当前 locale 标题，保留 `pages.json` 文本仅作为平台 fallback。</zh-CN><en>Every show projects tabs and the current-locale title after native chrome initializes, retaining `pages.json` copy only as platform fallback.</en></lang>
onShow(() => scheduleRuntimeChrome('title.reservations'));
</script>

<style scoped>
/* <lang><zh-CN>预约页使用中性信息卡、明显状态步骤和受限操作，不将取消危险色覆盖正文内容。</zh-CN><en>Reservations uses neutral information cards, visible state steps, and constrained actions without overlaying body content in destructive color.</en></lang> */
.reservations-page { min-height: 100vh; padding: 20px 16px 28px; background: var(--u-sys-color-surface-subtle); }
.reservations-page__heading { display: flex; gap: 6px; flex-direction: column; margin-bottom: 18px; }
.reservations-page__eyebrow { color: var(--u-sys-color-action-primary); font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.reservations-page__title { color: var(--u-sys-color-text); font-size: 27px; font-weight: 700; }
.reservations-page__description { color: var(--u-sys-color-text-secondary); font-size: 13px; line-height: 1.6; }
.reservations-page__list { display: flex; gap: 12px; flex-direction: column; margin-top: 14px; }
.reservations-page__record { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--u-sys-color-text); font-size: 15px; }
.reservations-page__actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; }
.reservations-page__hint { flex: 1; color: var(--u-sys-color-text-secondary); font-size: 12px; line-height: 1.5; }
</style>
