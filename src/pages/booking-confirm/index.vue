<!--
@lang zh-CN 确认预约页为已加载 local resource detail 选择有限日期和时段，并在当前内存中创建 mock 预约；它不处理真实身份、联系方式、价格、支付、远端写入或 storage。
@lang en Booking Confirmation selects a finite date and time slot for a loaded local resource detail and creates a mock reservation in current memory; it handles no real identity, contact, price, payment, remote write, or storage.
-->
<template>
  <!-- <lang><zh-CN>provider 直接包住确认表单，让 UI component locale 与所有 BP 文案/领域值投影一致。</zh-CN><en>The provider directly wraps the confirmation form, aligning UI component locale with all BP copy and domain-value projection.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <!-- <lang><zh-CN>确认页使用带本地化返回文字的应用自管 navbar，并保持表单内业务状态由页面拥有。</zh-CN><en>Confirmation uses the application-owned navbar with localized back copy while retaining page ownership of form business state.</en></lang> -->
    <runtime-page-shell :title="runtimeLocale.t('title.confirm')" back>
      <view class="booking-confirm-page">
      <!-- <lang><zh-CN>页面只在已有 detail 和同资源已验证草稿时开放确认；无任一条件时明确恢复，阻止隐藏状态或 URL 直接创建预约。</zh-CN><en>The page opens confirmation only with existing detail and same-resource validated draft; without either, explicit recovery prevents hidden state or URL from creating a booking directly.</en></lang> -->
      <!-- <lang><zh-CN>确认成功后切换到独立结果投影，防止仍显示可再次提交的确认按钮。</zh-CN><en>After confirmation succeeds, switch to a separate result projection so a button allowing another submission is not still shown.</en></lang> -->
      <view v-if="confirmedReservation" class="booking-confirm-page__content">
        <source-badge :source="detail.source" />
        <text class="booking-confirm-page__eyebrow">{{ runtimeLocale.t('reservation.eyebrow') }}</text>
        <text class="booking-confirm-page__title">{{ runtimeLocale.t('booking.confirmedTitle') }}</text>
        <u-tag :text="runtimeLocale.t('reservation.confirmed')" tone="primary" />
        <u-card :title="runtimeLocale.t('booking.selectionTitle')">
          <u-cell :label="runtimeLocale.t('booking.venueLabel')" :value="confirmedReservation.venueName" />
          <u-cell :label="runtimeLocale.t('booking.resourceLabel')" :value="confirmedReservation.resourceName" />
          <u-cell :label="runtimeLocale.t('booking.dateLabel')" :value="runtimeLocale.formatDate(confirmedReservation.date)" />
          <u-cell :label="runtimeLocale.t('booking.timeLabel')" :value="confirmedReservation.time" />
        </u-card>
        <u-notice visible tone="success" :message="runtimeLocale.t('booking.confirmedDescription')" />
        <view class="booking-confirm-page__actions">
          <u-button :label="runtimeLocale.t('booking.viewReservation')" block @click="openConfirmedReservationDetail" />
          <u-button :label="runtimeLocale.t('booking.returnHome')" variant="secondary" block @click="returnHome" />
        </view>
      </view>
      <view v-else-if="hasBookingDraft" class="booking-confirm-page__content">
        <source-badge :source="detail.source" />
        <text class="booking-confirm-page__eyebrow">{{ runtimeLocale.t('booking.eyebrow') }}</text>
        <text class="booking-confirm-page__title">{{ resourceName }}</text>
        <text class="booking-confirm-page__venue">{{ venueName }} · {{ districtName }}</text>
        <!-- <lang><zh-CN>确认页只回显详情页已验证选择；它不重新开放任意日期/时段输入或将草稿写入 route。</zh-CN><en>Confirmation only echoes selection validated by detail; it reopens no arbitrary date/slot input and writes no draft into route.</en></lang> -->
        <u-card :title="runtimeLocale.t('booking.selectionTitle')">
          <u-cell :label="runtimeLocale.t('booking.venueLabel')" :value="venueName" />
          <u-cell :label="runtimeLocale.t('booking.resourceLabel')" :value="resourceName" />
          <u-cell :label="runtimeLocale.t('booking.dateLabel')" :value="selectedDateLabel" />
          <u-cell :label="runtimeLocale.t('booking.timeLabel')" :value="bookingDraft.time" />
        </u-card>
        <u-notice v-if="resultMessage" visible :tone="resultTone" :message="resultMessage" />
        <u-notice visible tone="info" :message="runtimeLocale.t('booking.localNotice')" />
        <!-- <lang><zh-CN>此按钮只调用已锁定 Biz write adapter 的 state action；页面不直接改写预约、调用 domain 或模拟后端。</zh-CN><en>This button calls only the state action backed by locked Biz write adapter; page directly mutates no reservation, calls no domain, and simulates no backend.</en></lang> -->
        <u-button :label="runtimeLocale.t('booking.confirmLocal')" block :loading="demo.bookingPhase.value === 'submitting'" @click="confirmBooking" />
        <u-button v-if="resultTone === 'error'" :label="runtimeLocale.t('booking.reviewAvailability')" variant="secondary" block @click="reviewAvailability" />
      </view>
      <u-empty v-else :title="runtimeLocale.t('booking.emptyTitle')" :description="runtimeLocale.t('booking.emptyDescription')" :action-text="runtimeLocale.t('common.goDiscover')" @action="backToDiscover" />
      </view>
    </runtime-page-shell>
  </u-config-provider>
</template>

<script setup>
import { computed, ref } from 'vue';
import RuntimePageShell from '../../components/RuntimePageShell.vue';
import SourceBadge from '../../components/SourceBadge.vue';
import { openPrimaryPage } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>确认页只消费 shared state 的 detail、booking phase 与已接入 Biz runtime 的显式 local write action。</zh-CN><en>Confirmation consumes only shared state's detail, booking phase, and explicit local write action integrated with Biz runtime.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>所有文本使用同一 runtime locale；页面不创建平行语言选择或临时词典。</zh-CN><en>All copy uses the same runtime locale; the page creates no parallel language choice or temporary dictionary.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>缺失详情时返回空对象，使模板明确走空态而非读取隐藏字段。</zh-CN><en>Return an empty object when detail is absent, making the template explicitly use the empty state rather than reading hidden fields.</en></lang>
const detail = computed(() => demo.selectedDetail.value ?? {});

// <lang><zh-CN>确认页只读取 state 已验证的受限草稿，页面不从路由、storage 或临时表单重建选择。</zh-CN><en>Confirmation reads only bounded draft already validated by state and rebuilds no selection from route, storage, or a temporary form.</en></lang>
const bookingDraft = computed(() => demo.bookingDraft.value ?? {});

// <lang><zh-CN>草稿必须对应当前 ready detail，且日期与时段仍在该资源的明确 allowlist 中。</zh-CN><en>The draft must correspond to current ready detail, with date and slot still in that resource’s explicit allowlists.</en></lang>
const hasBookingDraft = computed(() => detail.value.kind === 'detail'
  && bookingDraft.value.resourceId === detail.value.resource.id
  && detail.value.resource.availableDates.includes(bookingDraft.value.date)
  && detail.value.resource.availableSlots.includes(bookingDraft.value.time));

// <lang><zh-CN>确认标题只经 runtime `localize` 投影当前 detail 的有限双语字段。</zh-CN><en>Confirmation headings project finite bilingual fields of current detail only through runtime `localize`.</en></lang>
const resourceName = computed(() => runtimeLocale.localize(detail.value.resource?.name));
const venueName = computed(() => runtimeLocale.localize(detail.value.venue?.name));
const districtName = computed(() => runtimeLocale.localize(detail.value.venue?.district));

// <lang><zh-CN>日期只格式化详情已验证并放入草稿的 ISO 值；不从系统时间、远端日历或动态脚本派生。</zh-CN><en>Date formats only ISO value validated by detail and placed in draft; it derives from no system clock, remote calendar, or dynamic script.</en></lang>
const selectedDateLabel = computed(() => runtimeLocale.formatDate(bookingDraft.value.date));

// <lang><zh-CN>结果只保存已本地化的可见文本，不保存原始错误、输入或领域对象。</zh-CN><en>Result retains only localized visible copy and stores no raw error, input, or domain object.</en></lang>
const resultMessage = ref('');

// <lang><zh-CN>结果视觉 tone 只在受限 success/error 两项中选择。</zh-CN><en>Result visual tone selects only between bounded success/error values.</en></lang>
const resultTone = ref('info');

// <lang><zh-CN>成功页只按本次 create outcome 的稳定 ID 查找 adopted snapshot，不显示旧成功、任意 query 或内部 command。</zh-CN><en>The success page finds adopted snapshot only by stable ID from this create outcome and displays no stale success, arbitrary query, or internal command.</en></lang>
const confirmedReservationId = ref('');

// <lang><zh-CN>结果页将当前 readonly reservation card 投影为单语言显示对象；snapshot 缺失时回到常规确认恢复态。</zh-CN><en>The result page projects the current readonly reservation card into a single-language display object; on absent snapshot it returns to ordinary confirmation recovery.</en></lang>
const confirmedReservation = computed(() => {
  // <lang><zh-CN>只在共享卡片集合中精确查找本次成功 ID，避免从 write outcome 直接泄漏原始记录。</zh-CN><en>Look up this success ID exactly only in shared card collection, avoiding direct exposure of raw record from write outcome.</en></lang>
  const reservation = demo.reservationCards.value.find((candidate) => candidate.id === confirmedReservationId.value);

  // <lang><zh-CN>缺失记录不产生半完成的成功页。</zh-CN><en>An absent record produces no half-complete success page.</en></lang>
  if (!reservation) return null;

  // <lang><zh-CN>只投影页面需要的字段对象，模板不选择固定语言键。</zh-CN><en>Project only fields the page needs, and do not let template select a fixed language key.</en></lang>
  return Object.freeze({
    ...reservation,
    venueName: runtimeLocale.localize(reservation.venueName),
    resourceName: runtimeLocale.localize(reservation.resourceName)
  });
});

/**
 * <lang><zh-CN>执行本地 mock 预约确认。</zh-CN><en>Executes local mock booking confirmation.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>Biz write terminal outcome 已投影到当前页面后 resolve。</zh-CN><en>Resolves after Biz write terminal outcome is projected onto current page.</en></lang>
 * @lang zh-CN action 不处理远端 transaction；成功、冲突和不确定失败均保持当前页面可见、可恢复。
 * @lang en The action handles no remote transaction; success, conflict, and uncertain failure all remain visible and recoverable on current page.
 */
async function confirmBooking() {
  // <lang><zh-CN>等待 state 经 Biz write runtime 返回 canonical outcome；state 只消费详情页已验证草稿。</zh-CN><en>Await canonical outcome returned by state through Biz write runtime; state consumes only the detail-validated draft.</en></lang>
  const outcome = await demo.confirmLocalReservation();

  // <lang><zh-CN>失败只呈现 domain 已受限的双语字段经统一 helper 投影后的单语言文本。</zh-CN><en>On failure, present only the single-language text projected by the shared helper from domain-bounded bilingual fields.</en></lang>
  if (outcome.kind === 'failure') {
    resultTone.value = 'error';
    resultMessage.value = runtimeLocale.localize(outcome.message) || runtimeLocale.t('common.notAvailable');
    return;
  }

  // <lang><zh-CN>成功不跳转或隐藏结果，让用户可清楚确认 local mock 的性质。</zh-CN><en>Success neither navigates nor hides result, letting users clearly confirm the local-mock nature.</en></lang>
  confirmedReservationId.value = outcome.reservation.id;
  resultTone.value = 'success';
  resultMessage.value = runtimeLocale.t('booking.created', {
    date: runtimeLocale.formatDate(outcome.reservation.date),
    time: outcome.reservation.time
  });
}

/**
 * <lang><zh-CN>打开刚确认的本地示例预约详情。</zh-CN><en>Opens details of the just-confirmed local demo booking.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 路由只携带当前成功结果的有限 ID；详情页仍通过 shared readonly state 重新查找记录。
 * @lang en Route carries only finite ID of current success result; detail still relooks up record through shared readonly state.
 */
function openConfirmedReservationDetail() {
  // <lang><zh-CN>没有安全结果视图时保持零导航副作用。</zh-CN><en>When no safe result view exists, retain zero navigation side effect.</en></lang>
  if (!confirmedReservation.value) return;

  // <lang><zh-CN>只打开应用已声明的本地预约详情页面。</zh-CN><en>Open only the application-declared local reservation-detail page.</en></lang>
  uni.redirectTo({ url: `/pages/reservation-detail/index?reservationId=${encodeURIComponent(confirmedReservation.value.id)}` });
}

/**
 * <lang><zh-CN>回到当前确认草稿所属资源的可用时段。</zh-CN><en>Returns to available slots of resource belonging to current confirmation draft.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 此恢复只在失败结果下提供；它不伪称失败已提交，也不清空当前草稿。
 * @lang en This recovery is offered only after a failure; it does not pretend failure submitted or clear current draft.
 */
function reviewAvailability() {
  // <lang><zh-CN>只使用 provider-read detail 的有限 resource ID，不从错误或路由解析目标。</zh-CN><en>Use only finite resource ID from provider-read detail and parse no destination from error or route.</en></lang>
  const resourceId = detail.value.kind === 'detail' ? detail.value.resource.id : '';
  if (!resourceId) return;

  // <lang><zh-CN>替换为本地详情页，以明确重新选择而不是重放失败 write。</zh-CN><en>Replace with local detail page to explicitly reselect rather than replay failed write.</en></lang>
  uni.redirectTo({ url: `/pages/resource-detail/index?resourceId=${encodeURIComponent(resourceId)}` });
}

/**
 * <lang><zh-CN>从确认结果返回首页主页面。</zh-CN><en>Returns from confirmation result to Home primary page.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 首页导航不重置已经确认的本地记录，不触发新的目录读取或业务写入。
 * @lang en Home navigation resets no confirmed local record and starts neither a new catalog read nor business write.
 */
function returnHome() {
  // <lang><zh-CN>只进入应用壳固定允许的首页主页面。</zh-CN><en>Enter only Home primary page fixed by application shell.</en></lang>
  openPrimaryPage('home');
}

/**
 * <lang><zh-CN>返回发现 tab。</zh-CN><en>Returns to the Discover tab.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 回退不清理其他可见 local state。
 * @lang en Returning does not clear other visible local state.
 */
function backToDiscover() {
  // <lang><zh-CN>只进入应用壳固定声明的发现主页面。</zh-CN><en>Enter only the Discover primary page fixed by the application shell.</en></lang>
  openPrimaryPage('discover');
}
</script>

<style scoped>
/* <lang><zh-CN>确认页以清晰的表单分组和主题卡片组织 local flow，不模拟支付或会员视觉。</zh-CN><en>Confirmation uses clear form grouping and theme cards to organize local flow without simulating payment or membership visuals.</en></lang> */
.booking-confirm-page { padding: 20px 16px 28px; background: var(--u-sys-color-surface-subtle); }
.booking-confirm-page__content { display: flex; gap: 16px; flex-direction: column; }
.booking-confirm-page__eyebrow { color: var(--u-sys-color-action-primary); font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.booking-confirm-page__title { color: var(--u-sys-color-text); font-size: 27px; font-weight: 700; }
.booking-confirm-page__venue { color: var(--u-sys-color-text-secondary); font-size: 14px; }
.booking-confirm-page__actions { display: flex; gap: 10px; flex-direction: column; }
</style>
