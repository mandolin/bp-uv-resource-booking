<!--
@lang zh-CN 确认预约页为已加载的 local resource detail 选择有限日期和时段，并在当前内存中创建 mock 预约；它不处理真实身份、联系方式、价格、支付、远端写入或 storage。
@lang en Booking Confirmation selects a finite date and time slot for a loaded local resource detail and creates a mock reservation in current memory; it handles no real identity, contact, price, payment, remote write, or storage.
-->
<template>
  <!-- <lang><zh-CN>页面只在已有 detail 时开放确认；无 detail 时以明确恢复入口阻止隐藏状态或 URL 直接创建预约。</zh-CN><en>The page opens confirmation only with an existing detail; without it, an explicit recovery entry prevents a hidden state or URL from creating a reservation directly.</en></lang> -->
  <view class="booking-confirm-page">
    <view v-if="detail.kind === 'detail'" class="booking-confirm-page__content">
      <source-badge :source="detail.source" />
      <text class="booking-confirm-page__eyebrow">确认预约 / Confirm booking</text>
      <text class="booking-confirm-page__title">{{ detail.resource.name['zh-Hans'] }}</text>
      <text class="booking-confirm-page__venue">{{ detail.venue.name['zh-Hans'] }} · {{ detail.venue.district['zh-Hans'] }}</text>
      <u-card title="选择日期 / Choose a date" sub-title="示例日期，不接入真实排班 / Demo dates, no live schedule"><view class="booking-confirm-page__choices"><u-button v-for="date in dates" :key="date.value" :label="date.label" :variant="selectedDate === date.value ? 'primary' : 'secondary'" size="sm" @click="selectedDate = date.value" /></view></u-card>
      <u-card title="选择时段 / Choose a slot" sub-title="仅显示当前本地资源声明的时段 / Only slots declared by current local resource"><view class="booking-confirm-page__choices"><u-button v-for="slot in detail.resource.availableSlots" :key="slot" :label="slot" :variant="selectedTime === slot ? 'primary' : 'secondary'" size="sm" @click="selectedTime = slot" /></view></u-card>
      <u-notice v-if="resultMessage" visible :tone="resultTone" :message="resultMessage" />
      <u-notice visible tone="info" message="确认仅创建本次运行期间的本地 mock 预约。刷新后将恢复为仓内初始示例数据。 / Confirmation creates a local mock reservation for this runtime only. Refresh restores checked-in demo data." />
      <u-button label="确认本地示例预约 / Confirm local demo booking" block :loading="demo.bookingPhase.value === 'submitting'" @click="confirmBooking" />
    </view>
    <u-empty v-else title="请先选择资源 / Choose a resource first" description="预约确认只允许从已加载资源详情进入 / Booking Confirmation is entered only from a loaded resource detail" action-text="前往发现页 / Go to Discover" @action="backToDiscover" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { UButton, UCard, UEmpty, UNotice } from '@hia-uview/ui';
import SourceBadge from '../../components/SourceBadge.vue';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>确认页只消费 shared state 的 detail、booking phase 与显式 local write action。</zh-CN><en>Confirmation consumes only shared state's detail, booking phase, and explicit local-write action.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>缺失详情时返回空对象，使模板明确走空态而非读取隐藏字段。</zh-CN><en>Return an empty object when detail is absent, making the template explicitly use the empty state rather than reading hidden fields.</en></lang>
const detail = computed(() => demo.selectedDetail.value ?? {});

// <lang><zh-CN>日期是已审阅的有限 local mock options，不从系统时间、远端日历或动态脚本派生。</zh-CN><en>Dates are reviewed finite local mock options and are derived from no system time, remote calendar, or dynamic script.</en></lang>
const dates = Object.freeze([
  Object.freeze({ value: '2026-08-08', label: '8 月 8 日 / Aug 8' }),
  Object.freeze({ value: '2026-08-09', label: '8 月 9 日 / Aug 9' }),
  Object.freeze({ value: '2026-08-10', label: '8 月 10 日 / Aug 10' })
]);

// <lang><zh-CN>默认选中第一个明确日期，调用方仍可在有限按钮中改变它。</zh-CN><en>Select the first explicit date by default while callers may still change it through finite buttons.</en></lang>
const selectedDate = ref(dates[0].value);

// <lang><zh-CN>时段只在 detail ready 后初始化；空值使缺失 detail 不能构造 booking。</zh-CN><en>Slot initializes only after detail is ready; an empty value prevents booking construction without a detail.</en></lang>
const selectedTime = ref(detail.value.kind === 'detail' ? detail.value.resource.availableSlots[0] ?? '' : '');

// <lang><zh-CN>确认结果只存放项目自有双语文案，既不暴露原始错误也不记录输入。</zh-CN><en>Confirmation result holds only project-owned bilingual copy, exposing neither raw error nor recording input.</en></lang>
const resultMessage = ref('');

// <lang><zh-CN>结果视觉 tone 只在受限 success/error 两项中选择。</zh-CN><en>Result visual tone selects only between bounded success and error values.</en></lang>
const resultTone = ref('info');

/**
 * <lang><zh-CN>执行本地 mock 预约确认。</zh-CN><en>Executes local mock booking confirmation.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN action 不处理远端 transaction；成功与冲突均保持当前页面可见、可恢复。
 * @lang en The action handles no remote transaction; both success and conflict remain visible and recoverable on the current page.
 */
function confirmBooking() {
  // <lang><zh-CN>调用 state 的唯一 local write action；参数都来自有限页面选择。</zh-CN><en>Call state's sole local-write action; every parameter comes from finite page selection.</en></lang>
  const outcome = demo.confirmLocalReservation(selectedDate.value, selectedTime.value);

  // <lang><zh-CN>失败只呈现 adapter/domain 已受限的项目文案。</zh-CN><en>On failure, present only project copy already bounded by adapter/domain.</en></lang>
  if (outcome.kind === 'failure') {
    resultTone.value = 'error';
    resultMessage.value = outcome.message['zh-Hans'];
    return;
  }

  // <lang><zh-CN>成功不跳转或隐藏结果，让用户可以清楚确认本地 mock 的性质。</zh-CN><en>Success neither navigates nor hides its result, letting users clearly confirm the local-mock nature.</en></lang>
  resultTone.value = 'info';
  resultMessage.value = `已创建本地示例预约：${outcome.reservation.date} ${outcome.reservation.time}。可在“我的预约”查看。 / Local demo booking created; view it in My bookings.`;
}

/**
 * <lang><zh-CN>返回发现 tab。</zh-CN><en>Returns to the Discover tab.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 回退不清理其他可见 local state。
 * @lang en Returning does not clear other visible local state.
 */
function backToDiscover() {
  // <lang><zh-CN>仅执行本地 tab 导航。</zh-CN><en>Perform only local tab navigation.</en></lang>
  uni.switchTab({ url: '/pages/discover/index' });
}
</script>

<style scoped>
/* <lang><zh-CN>确认页以清晰的选择分组和主题卡片组织本地 flow，不模拟支付或会员视觉。</zh-CN><en>Confirmation uses clear choice groups and theme cards to organize a local flow without simulating payment or membership visuals.</en></lang> */
.booking-confirm-page { min-height: 100vh; padding: 20px 16px 28px; background: var(--u-sys-color-surface-subtle); }
.booking-confirm-page__content { display: flex; gap: 16px; flex-direction: column; }
.booking-confirm-page__eyebrow { color: var(--u-sys-color-action-primary); font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.booking-confirm-page__title { color: var(--u-sys-color-text); font-size: 27px; font-weight: 700; }
.booking-confirm-page__venue { color: var(--u-sys-color-text-secondary); font-size: 14px; }
.booking-confirm-page__choices { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
