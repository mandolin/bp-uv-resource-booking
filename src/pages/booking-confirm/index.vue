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
      <!-- <lang><zh-CN>页面只在已有 detail 时开放确认；无 detail 时明确恢复，阻止隐藏状态或 URL 直接创建预约。</zh-CN><en>The page opens confirmation only with an existing detail; without it, explicit recovery prevents a hidden state or URL from creating a reservation directly.</en></lang> -->
      <view v-if="detail.kind === 'detail'" class="booking-confirm-page__content">
        <source-badge :source="detail.source" />
        <text class="booking-confirm-page__eyebrow">{{ runtimeLocale.t('booking.eyebrow') }}</text>
        <text class="booking-confirm-page__title">{{ resourceName }}</text>
        <text class="booking-confirm-page__venue">{{ venueName }} · {{ districtName }}</text>
        <u-form>
          <u-form-item :label="runtimeLocale.t('booking.chooseDate')" :help-text="runtimeLocale.t('booking.chooseDateHint')" required>
            <view class="booking-confirm-page__choices">
              <u-button v-for="date in dateOptions" :key="date.value" :label="date.label" :variant="selectedDate === date.value ? 'primary' : 'secondary'" size="sm" @click="selectedDate = date.value" />
            </view>
          </u-form-item>
          <u-form-item :label="runtimeLocale.t('booking.chooseSlot')" :help-text="runtimeLocale.t('booking.chooseSlotHint')" required>
            <view class="booking-confirm-page__choices">
              <u-button v-for="slot in detail.resource.availableSlots" :key="slot" :label="slot" :variant="selectedTime === slot ? 'primary' : 'secondary'" size="sm" @click="selectedTime = slot" />
            </view>
          </u-form-item>
        </u-form>
        <u-notice v-if="resultMessage" visible :tone="resultTone" :message="resultMessage" />
        <u-notice visible tone="info" :message="runtimeLocale.t('booking.localNotice')" />
        <!-- <lang><zh-CN>此按钮只调用已锁定 Biz write adapter 的 state action；页面不直接改写预约、调用 domain 或模拟后端。</zh-CN><en>This button calls only the state action backed by locked Biz write adapter; page directly mutates no reservation, calls no domain, and simulates no backend.</en></lang> -->
        <u-button :label="runtimeLocale.t('booking.confirmLocal')" block :loading="demo.bookingPhase.value === 'submitting'" @click="confirmBooking" />
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

// <lang><zh-CN>确认标题只经 runtime `localize` 投影当前 detail 的有限双语字段。</zh-CN><en>Confirmation headings project finite bilingual fields of current detail only through runtime `localize`.</en></lang>
const resourceName = computed(() => runtimeLocale.localize(detail.value.resource?.name));
const venueName = computed(() => runtimeLocale.localize(detail.value.venue?.name));
const districtName = computed(() => runtimeLocale.localize(detail.value.venue?.district));

// <lang><zh-CN>日期只来自当前资源明确声明的 local availability；标签随当前 locale 格式化，但不从系统时间、远端日历或动态脚本派生。</zh-CN><en>Dates come only from local availability explicitly declared by the current resource; labels follow current locale but derive from no system clock, remote calendar, or dynamic script.</en></lang>
const dateOptions = computed(() => (detail.value.kind === 'detail' ? detail.value.resource.availableDates : []).map((value) => Object.freeze({ value, label: runtimeLocale.formatDate(value) })));

// <lang><zh-CN>默认选中当前资源的第一个明确日期；没有详情时空值阻止 booking command。</zh-CN><en>Select the current resource’s first explicit date by default; without a detail, an empty value blocks a booking command.</en></lang>
const selectedDate = ref(detail.value.kind === 'detail' ? detail.value.resource.availableDates[0] ?? '' : '');

// <lang><zh-CN>时段只在 detail ready 后初始化；空值使缺失 detail 不能构造 booking。</zh-CN><en>Slot initializes only after detail is ready; an empty value prevents booking construction without a detail.</en></lang>
const selectedTime = ref(detail.value.kind === 'detail' ? detail.value.resource.availableSlots[0] ?? '' : '');

// <lang><zh-CN>结果只保存已本地化的可见文本，不保存原始错误、输入或领域对象。</zh-CN><en>Result retains only localized visible copy and stores no raw error, input, or domain object.</en></lang>
const resultMessage = ref('');

// <lang><zh-CN>结果视觉 tone 只在受限 success/error 两项中选择。</zh-CN><en>Result visual tone selects only between bounded success/error values.</en></lang>
const resultTone = ref('info');

/**
 * <lang><zh-CN>执行本地 mock 预约确认。</zh-CN><en>Executes local mock booking confirmation.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>Biz write terminal outcome 已投影到当前页面后 resolve。</zh-CN><en>Resolves after Biz write terminal outcome is projected onto current page.</en></lang>
 * @lang zh-CN action 不处理远端 transaction；成功、冲突和不确定失败均保持当前页面可见、可恢复。
 * @lang en The action handles no remote transaction; success, conflict, and uncertain failure all remain visible and recoverable on current page.
 */
async function confirmBooking() {
  // <lang><zh-CN>等待 state 经 Biz write runtime 返回 canonical outcome；参数都来自有限页面选择。</zh-CN><en>Await canonical outcome returned by state through Biz write runtime; every argument comes from finite page selection.</en></lang>
  const outcome = await demo.confirmLocalReservation(selectedDate.value, selectedTime.value);

  // <lang><zh-CN>失败只呈现 domain 已受限的双语字段经统一 helper 投影后的单语言文本。</zh-CN><en>On failure, present only the single-language text projected by the shared helper from domain-bounded bilingual fields.</en></lang>
  if (outcome.kind === 'failure') {
    resultTone.value = 'error';
    resultMessage.value = runtimeLocale.localize(outcome.message) || runtimeLocale.t('common.notAvailable');
    return;
  }

  // <lang><zh-CN>成功不跳转或隐藏结果，让用户可清楚确认 local mock 的性质。</zh-CN><en>Success neither navigates nor hides result, letting users clearly confirm the local-mock nature.</en></lang>
  resultTone.value = 'success';
  resultMessage.value = runtimeLocale.t('booking.created', {
    date: runtimeLocale.formatDate(outcome.reservation.date),
    time: outcome.reservation.time
  });
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
.booking-confirm-page__choices { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
