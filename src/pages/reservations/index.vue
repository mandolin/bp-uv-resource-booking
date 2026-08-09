<!--
@lang zh-CN 我的预约页呈现当前运行时的 local mock 预约，并以“露出取消操作后再二次确认”的受控语义取消记录；它不读取真实身份、联系人、支付、后端订单或跨会话存储。
@lang en My Bookings presents current-runtime local mock reservations and cancels a record with controlled semantics of “reveal cancel then confirm again”; it reads no real identity, contact, payment, backend order, or cross-session storage.
-->
<template>
  <!-- <lang><zh-CN>provider 直接包住本页，使 UI components、状态标签和领域字段投影使用同一 runtime locale。</zh-CN><en>The provider directly wraps this page so UI components, state labels, and domain-field projection use one runtime locale.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <!-- <lang><zh-CN>页面壳用 HIA-uView 呈现当前单语言标题，平台常驻主导航与页面自有预约筛选 tab 保持职责分离。</zh-CN><en>The page shell uses HIA-uView for the current single-language title, keeping platform-persistent primary navigation separate from page-owned reservation-filter tabs.</en></lang> -->
    <runtime-page-shell :title="runtimeLocale.t('title.reservations')">
      <view class="reservations-page">
        <!-- <lang><zh-CN>来源标记紧邻页面筛选，明确列表内容仍是当前运行时的本地示例，而不是账户订单。</zh-CN><en>The source badge sits next to the page filter, making clear that list content remains current-runtime local demo data rather than account orders.</en></lang> -->
        <view class="reservations-page__source"><source-badge :source="demo.catalogSource.value" /></view>
        <!-- <lang><zh-CN>取消写入失败始终由 state 的受限 outcome 显式展示；页面不猜测其是否已经提交或回退。</zh-CN><en>A cancellation write failure is always explicitly displayed from state bounded outcome; page does not guess whether it submitted or rolled back.</en></lang> -->
        <u-notice v-if="demo.bookingWriteFailure.value" visible tone="error" :message="runtimeLocale.localize(demo.bookingWriteFailure.value.message) || runtimeLocale.t('common.notAvailable')" />
        <u-tabs v-model="activeTab" :items="reservationTabs" />
        <text class="reservations-page__hint">{{ runtimeLocale.t('reservation.cancelHint') }}</text>
        <u-empty
          v-if="visibleReservations.length === 0"
          :title="runtimeLocale.t('reservation.emptyTitle')"
          :description="runtimeLocale.t('reservation.emptyDescription')"
          :action-text="runtimeLocale.t('common.goDiscover')"
          @action="goDiscover"
        />
        <u-list v-else class="reservations-page__list">
          <!-- <lang><zh-CN>每张 HIA-uView 卡片把图片、可审计字段与受控操作放在同一视觉表面；操作按钮只改变页面意图，仍不直接修改记录。</zh-CN><en>Each HIA-uView card keeps its image, auditable fields, and controlled actions on one visual surface; action buttons change only page intent and still do not mutate a record directly.</en></lang> -->
          <u-card v-for="reservation in visibleReservations" :key="reservation.id" class="reservation-card" :padding="0" shadow>
            <view class="reservation-card__layout">
              <u-image class="reservation-card__image" :src="reservation.venueImage || ''" :alt="reservation.resourceName" fluid shape="rounded" />
              <view class="reservation-card__body">
                <text class="reservation-card__title">{{ reservation.venueName }} · {{ reservation.resourceName }}</text>
                <view class="reservation-card__fact">
                  <u-icon name="▣" size="small" tone="neutral" />
                  <text>{{ runtimeLocale.formatDate(reservation.date) }}</text>
                </view>
                <view class="reservation-card__fact">
                  <u-icon name="◷" size="small" tone="neutral" />
                  <text>{{ reservation.time }}</text>
                </view>
                <view class="reservation-card__status">
                  <text class="reservation-card__status-dot" />
                  <text>{{ reservationStatusLabel(reservation.status) }}</text>
                </view>
                <view class="reservation-card__links">
                  <u-button size="sm" variant="text" :label="runtimeLocale.t('common.viewDetails')" @click="openReservationDetail(reservation.id)" />
                  <u-button v-if="reservation.status === 'confirmed'" size="sm" variant="text" :label="openReservationId === reservation.id ? runtimeLocale.t('common.closeActions') : runtimeLocale.t('common.actions')" @click="toggleReservationActions(reservation.id)" />
                </view>
              </view>
            </view>
            <!-- <lang><zh-CN>受控操作栏只在用户明确露出后出现；改期只导航，取消只进入二次确认 modal。</zh-CN><en>The controlled action rail appears only after explicit user reveal; reschedule only navigates, while cancel only enters the second-confirmation modal.</en></lang> -->
            <view v-if="reservation.status === 'confirmed' && openReservationId === reservation.id" class="reservation-card__action-rail">
              <u-button :label="runtimeLocale.t('reservation.reschedule')" variant="secondary" block @click="openReschedule(reservation.id)" />
              <u-button :label="runtimeLocale.t('common.cancel')" variant="secondary" block @click="requestCancellation(reservation.id)" />
            </view>
          </u-card>
        </u-list>
        <u-modal :visible="Boolean(pendingReservationId)" :title="runtimeLocale.t('reservation.cancelTitle')" :cancel-text="runtimeLocale.t('common.keep')" :confirm-text="runtimeLocale.t('reservation.cancelConfirm')" @cancel="closeCancelModal" @confirm="confirmCancellation"><text>{{ runtimeLocale.t('reservation.cancelNotice') }}</text></u-modal>
      </view>
    </runtime-page-shell>
  </u-config-provider>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import RuntimePageShell from '../../components/RuntimePageShell.vue';
import SourceBadge from '../../components/SourceBadge.vue';
import { getVenueImage } from '../../data/asset-map.mjs';
import { openPrimaryPage, syncPrimaryTabChrome } from '../../localization/runtime-chrome.mjs';
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
    venueImage: getVenueImage(reservation.venueImageId),
    venueName: runtimeLocale.localize(reservation.venueName),
    resourceName: runtimeLocale.localize(reservation.resourceName)
  })));

// <lang><zh-CN>当前露出操作的单一预约 ID，空值表示没有 action row 打开。</zh-CN><en>Single reservation ID whose actions are revealed; an empty value means no action row is open.</en></lang>
const openReservationId = ref('');

// <lang><zh-CN>待二次确认的单一预约 ID；它不包含整条记录或其他用户信息。</zh-CN><en>Single reservation ID awaiting second confirmation; it contains no whole record or other user information.</en></lang>
const pendingReservationId = ref('');

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
 * <lang><zh-CN>打开一条已在当前有限列表中的预约详情。</zh-CN><en>Opens details of one reservation already in current finite list.</en></lang>
 * @param {string} reservationId <lang><zh-CN>当前卡片的稳定预约 ID。</zh-CN><en>Stable reservation ID of current card.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 路由只携带有限 ID；详情页仍须在 readonly state 中重新查找，不能信任任意 query 为记录。
 * @lang en The route carries only a finite ID; detail must still look it up in readonly state and cannot trust arbitrary query as a record.
 */
function openReservationDetail(reservationId) {
  // <lang><zh-CN>使用本地页面导航，不向 query 写入日期、时段、状态或任何用户资料。</zh-CN><en>Use local page navigation and write no date, slot, status, or user information into query.</en></lang>
  uni.navigateTo({ url: `/pages/reservation-detail/index?reservationId=${encodeURIComponent(reservationId)}` });
}

/**
 * <lang><zh-CN>从列表打开当前 confirmed 预约的受控改期页。</zh-CN><en>Opens the controlled reschedule page for a current confirmed booking from the list.</en></lang>
 * @param {string} reservationId <lang><zh-CN>当前记录的稳定预约 ID。</zh-CN><en>Stable reservation ID of the current record.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 路由仍只携带稳定 ID；改期页必须从共享 readonly state 重新验证记录与时段。
 * @lang en The route still carries only a stable ID; the reschedule page must revalidate record and slots from shared readonly state.
 */
function openReschedule(reservationId) {
  // <lang><zh-CN>只有当前可见列表中仍为 confirmed 的记录才允许导航，避免 stale action 打开不可改期记录。</zh-CN><en>Allow navigation only for a record still confirmed in the visible list, preventing a stale action from opening an ineligible record.</en></lang>
  const isConfirmed = visibleReservations.value.some((reservation) => reservation.id === reservationId && reservation.status === 'confirmed');
  if (!isConfirmed) return;

  // <lang><zh-CN>导航前收起局部操作栏；不创建 replacement 或改写旧记录。</zh-CN><en>Close the local action rail before navigation; create no replacement and mutate no old record.</en></lang>
  openReservationId.value = '';
  uni.navigateTo({ url: `/pages/reservation-reschedule/index?reservationId=${encodeURIComponent(reservationId)}` });
}

/**
 * <lang><zh-CN>切换一条已确认预约的受限操作栏。</zh-CN><en>Toggles the bounded action rail for one confirmed reservation.</en></lang>
 * @param {string} reservationId <lang><zh-CN>当前记录的有限 ID。</zh-CN><en>Finite ID of the current record.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 显式入口补足小程序环境的可发现性；它只露出声明的改期与取消意图，不直接执行任一写入。
 * @lang en This explicit entry improves Mini Program discoverability; it reveals only declared reschedule and cancellation intents and performs neither write directly.
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
/**
 * <lang><zh-CN>把已露出的取消意图送入二次确认 modal。</zh-CN><en>Sends a revealed cancel intent into the second-confirmation modal.</en></lang>
 * @param {string} reservationId <lang><zh-CN>当前记录的有限 ID。</zh-CN><en>Finite ID of the current record.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 只有当前可见且 confirmed 的预约可进入二次确认；该函数不执行取消。
 * @lang en Only a currently visible confirmed booking can enter second confirmation; this function does not cancel it.
 */
function requestCancellation(reservationId) {
  // <lang><zh-CN>重新验证当前 readonly 投影，阻止 stale、cancelled 或任意 ID 打开危险确认。</zh-CN><en>Revalidate current readonly projection, blocking stale, cancelled, or arbitrary IDs from opening dangerous confirmation.</en></lang>
  const isConfirmed = visibleReservations.value.some((reservation) => reservation.id === reservationId && reservation.status === 'confirmed');
  if (!isConfirmed) return;

  // <lang><zh-CN>收起 action rail 后才显示 modal，清晰区分“露出操作”和“确认取消”两个步骤。</zh-CN><en>Close the action rail before showing the modal, clearly separating “reveal action” and “confirm cancellation” steps.</en></lang>
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
 * @returns {Promise<void>} <lang><zh-CN>取消 write 的 terminal outcome 已被 state 采用或显示后 resolve。</zh-CN><en>Resolves after state adopts or displays terminal outcome of cancellation write.</en></lang>
 * @lang zh-CN 已二次确认的取消只走 Biz write contract；页面不直接改写预约 status。
 * @lang en A twice-confirmed cancellation goes only through Biz write contract; page does not directly mutate reservation status.
 */
async function confirmCancellation() {
  // <lang><zh-CN>保存有限 ID 后先关闭 modal，防止 state 更新重渲染时重复确认。</zh-CN><en>Retain finite ID then close modal first, preventing repeated confirmation during state-update rerender.</en></lang>
  const reservationId = pendingReservationId.value;
  pendingReservationId.value = '';

  // <lang><zh-CN>只有非空 pending ID 才等待受限 action；failure 由 state 保存并在页面 notice 显示。</zh-CN><en>Await bounded action only for non-empty pending ID; state retains a failure for page notice display.</en></lang>
  if (reservationId) await demo.cancelLocalReservation(reservationId);
}

/**
 * <lang><zh-CN>切换到发现 tab。</zh-CN><en>Switches to the Discover tab.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 导航不会生成或预加载数据。
 * @lang en Navigation generates or preloads no data.
 */
function goDiscover() {
  // <lang><zh-CN>只进入应用壳固定声明的发现主页面。</zh-CN><en>Enter only the Discover primary page fixed by the application shell.</en></lang>
  openPrimaryPage('discover');
}

// <lang><zh-CN>预约页每次作为平台 tab 显示时同步常驻底栏的选中态与单一 locale。</zh-CN><en>Whenever Reservations is shown as a platform tab, synchronize the persistent bottom bar's selection and single locale.</en></lang>
onShow(() => syncPrimaryTabChrome('reservations', runtimeLocale.locale.value, (messageKey) => runtimeLocale.t(messageKey)));
</script>

<style scoped>
/* <lang><zh-CN>预约页按获批设计板使用居中来源标记、紧凑筛选和图像主导卡片；底部 padding 为常驻 tabBar 保留安全空间。</zh-CN><en>Reservations follows the approved board with a centered source badge, compact filter, and image-led cards; bottom padding reserves safe space for the persistent tab bar.</en></lang> */
.reservations-page { min-height: 100%; padding: 18px 14px calc(var(--bp-shell-tabbar-height) + 26px); background: var(--u-sys-color-surface); }
.reservations-page__source { display: flex; justify-content: center; margin: 0 0 18px; }
.reservations-page__hint { display: block; padding: 14px 2px 8px; color: var(--u-sys-color-text-secondary); font-size: 13px; line-height: 1.45; text-align: center; }
.reservations-page__list { display: flex; gap: 16px; flex-direction: column; margin-top: 4px; }
.reservation-card__layout { display: grid; grid-template-columns: 126px minmax(0, 1fr); min-height: 170px; }
.reservation-card__image { display: block; width: 126px; height: 170px; }
.reservation-card__body { display: flex; min-width: 0; gap: 9px; flex-direction: column; padding: 15px 14px 12px; }
.reservation-card__title { color: var(--u-sys-color-text); font-size: 17px; font-weight: 700; line-height: 1.35; }
.reservation-card__fact { display: flex; align-items: center; gap: 7px; color: var(--u-sys-color-text-secondary); font-size: 13px; line-height: 1.35; }
.reservation-card__status { display: flex; align-items: center; gap: 8px; color: var(--u-sys-color-action-primary); font-size: 13px; font-weight: 600; }
.reservation-card__status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--u-sys-color-accent); }
.reservation-card__links { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-top: auto; }
.reservation-card__action-rail { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 14px 14px; }
/* <lang><zh-CN>小屏幕收窄图片列，仍保留信息列最小可读宽度。</zh-CN><en>Narrow the image column on smaller screens while retaining a minimum readable information column.</en></lang> */
@media (max-width: 360px) {
  .reservation-card__layout { grid-template-columns: 108px minmax(0, 1fr); }
  .reservation-card__image { width: 108px; }
}
</style>
