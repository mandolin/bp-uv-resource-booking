<!--
@lang zh-CN 改期页只允许当前运行时一条 confirmed local mock 预约在其原资源的已声明日期/时段间选择 replacement；它不允许换资源，不访问网络、身份、支付、库存锁或持久化数据。
@lang en Reschedule permits only one current-runtime confirmed local-mock reservation to choose a replacement among its original resource’s declared dates/slots; it permits no resource change and accesses no network, identity, payment, inventory hold, or persistent data.
-->
<template>
  <!-- <lang><zh-CN>provider 让全部 UI 文案、状态和领域字段投影与应用唯一 runtime locale 一致。</zh-CN><en>The provider aligns all UI copy, state, and domain-field projection with application’s sole runtime locale.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <!-- <lang><zh-CN>改期使用带返回行为的应用壳；它是详情的本地后续页面，不属于主 tab 路由。</zh-CN><en>Reschedule uses application shell with back behavior; it is a local follow-up page of detail and not a primary-tab route.</en></lang> -->
    <runtime-page-shell :title="runtimeLocale.t('title.reschedule')" back>
      <view class="reservation-reschedule-page">
        <!-- <lang><zh-CN>只有当前 confirmed 记录才可改期；取消、未知或刷新后不存在的 ID 明确进入恢复态。</zh-CN><en>Only current confirmed record can be rescheduled; cancelled, unknown, or post-refresh missing IDs explicitly enter recovery state.</en></lang> -->
        <view v-if="reservationDisplay && reservationDisplay.status === 'confirmed'" class="reservation-reschedule-page__content">
          <source-badge :source="demo.catalogSource.value" />
          <text class="reservation-reschedule-page__eyebrow">{{ runtimeLocale.t('reservation.reschedule') }}</text>
          <text class="reservation-reschedule-page__title">{{ reservationDisplay.resourceName }}</text>
          <text class="reservation-reschedule-page__venue">{{ reservationDisplay.venueName }}</text>
          <u-card :title="runtimeLocale.t('reschedule.currentTitle')">
            <u-cell :label="runtimeLocale.t('reservation.dateLabel')" :value="runtimeLocale.formatDate(reservationDisplay.date)" />
            <u-cell :label="runtimeLocale.t('reservation.timeLabel')" :value="reservationDisplay.time" />
          </u-card>
          <!-- <lang><zh-CN>日期和时段都来自 state 已投影的原资源 allowlist；页面不接受自由文本或另一个资源 ID。</zh-CN><en>Dates and slots both come from original-resource allowlists projected by state; the page accepts neither free text nor another resource ID.</en></lang> -->
          <u-card :title="runtimeLocale.t('reschedule.chooseDate')" :sub-title="runtimeLocale.t('reschedule.chooseDateHint')">
            <view class="reservation-reschedule-page__choices">
              <u-button v-for="date in dateOptions" :key="date.value" :label="date.label" :variant="selectedDate === date.value ? 'primary' : 'secondary'" size="sm" @click="selectDate(date.value)" />
            </view>
          </u-card>
          <u-card :title="runtimeLocale.t('reschedule.chooseTime')" :sub-title="runtimeLocale.t('reschedule.chooseTimeHint')">
            <view class="reservation-reschedule-page__choices">
              <u-button v-for="slot in reservationDisplay.availableSlots" :key="slot" :label="slot" :variant="selectedTime === slot ? 'primary' : 'secondary'" size="sm" @click="selectTime(slot)" />
            </view>
          </u-card>
          <u-notice v-if="resultFailure" visible tone="error" :message="runtimeLocale.localize(resultFailure.message) || runtimeLocale.t('common.notAvailable')" />
          <u-notice visible tone="info" :message="runtimeLocale.t('reschedule.atomicNotice')" />
          <u-button :label="runtimeLocale.t('reschedule.confirm')" block :loading="demo.bookingPhase.value === 'submitting'" :disabled="!selectedDate || !selectedTime" @click="confirmReschedule" />
        </view>
        <u-empty v-else :title="runtimeLocale.t('reschedule.emptyTitle')" :description="runtimeLocale.t('reschedule.emptyDescription')" :action-text="runtimeLocale.t('common.goDiscover')" @action="goDiscover" />
      </view>
    </runtime-page-shell>
  </u-config-provider>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import RuntimePageShell from '../../components/RuntimePageShell.vue';
import SourceBadge from '../../components/SourceBadge.vue';
import { openPrimaryPage } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>改期页只读取共享 readonly reservation view，并委托既有 state reschedule action。</zh-CN><en>Reschedule reads only shared readonly reservation views and delegates to existing state reschedule action.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>所有显示值经唯一 runtime locale 投影；页面不创建语言偏好或临时文案表。</zh-CN><en>Every display value is projected through sole runtime locale; page creates no language preference or temporary copy table.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>路由保存候选稳定 ID，详情仍在受限 readonly collection 中精确查找。</zh-CN><en>The route stores candidate stable ID while detail still looks it up exactly in bounded readonly collection.</en></lang>
const routeReservationId = ref('');

// <lang><zh-CN>两个选择只保存当前页面临时原始值；实际 replacement 只能通过 state/Biz write action 建立。</zh-CN><en>The two selections retain only current-page temporary primitives; actual replacement can arise only through state/Biz write action.</en></lang>
const selectedDate = ref('');
const selectedTime = ref('');

// <lang><zh-CN>改期失败保留在本页可发现，不假装旧记录已经取消。</zh-CN><en>A reschedule failure remains discoverable on this page and does not pretend old record was cancelled.</en></lang>
const resultFailure = ref(null);

// <lang><zh-CN>仅在共享 readonly collection 中按稳定 ID 定位当前记录。</zh-CN><en>Locate current record by stable ID only in shared readonly collection.</en></lang>
const reservation = computed(() => demo.reservationCards.value
  .find((candidate) => candidate.id === routeReservationId.value) ?? null);

// <lang><zh-CN>将两项双语领域字段投影为当前单语言对象，避免模板直接取语言键。</zh-CN><en>Project the two bilingual domain fields into a current-single-language object, avoiding direct language-key access in template.</en></lang>
const reservationDisplay = computed(() => reservation.value
  ? {
      ...reservation.value,
      venueName: runtimeLocale.localize(reservation.value.venueName),
      resourceName: runtimeLocale.localize(reservation.value.resourceName)
    }
  : null);

// <lang><zh-CN>日期 options 只格式化当前原资源已声明的 ISO allowlist。</zh-CN><en>Date options format only ISO allowlist declared by current original resource.</en></lang>
const dateOptions = computed(() => reservationDisplay.value
  ? reservationDisplay.value.availableDates.map((value) => Object.freeze({ value, label: runtimeLocale.formatDate(value) }))
  : []);

/**
 * <lang><zh-CN>在路由记录可用后以原预约值或首个 allowlist 值同步两个选择。</zh-CN><en>Synchronizes both selections to old reservation values or first allowlist values after route record becomes available.</en></lang>
 * @param {object|null} nextReservation <lang><zh-CN>当前本地化预约视图或 `null`。</zh-CN><en>Current localized reservation view or `null`.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 同步不写入 state、不会提交改期；它只保持页面按钮与当前记录的声明值一致。
 * @lang en Synchronization writes no state and submits no reschedule; it only keeps page buttons consistent with current record’s declared values.
 */
function synchronizeSelections(nextReservation) {
  // <lang><zh-CN>只有 confirmed 记录拥有可改期 allowlist；其他状态清空两个候选值。</zh-CN><en>Only a confirmed record owns reschedulable allowlists; other statuses clear both candidates.</en></lang>
  if (!nextReservation || nextReservation.status !== 'confirmed') {
    selectedDate.value = '';
    selectedTime.value = '';
    resultFailure.value = null;
    return;
  }

  // <lang><zh-CN>优先保留旧值（它们应仍在 allowlist 中），否则稳定采用首个已声明值。</zh-CN><en>Prefer old values, which should remain in allowlists, otherwise deterministically adopt first declared values.</en></lang>
  selectedDate.value = nextReservation.availableDates.includes(nextReservation.date) ? nextReservation.date : nextReservation.availableDates[0] ?? '';
  selectedTime.value = nextReservation.availableSlots.includes(nextReservation.time) ? nextReservation.time : nextReservation.availableSlots[0] ?? '';
  resultFailure.value = null;
}

// <lang><zh-CN>state 记录变化是唯一选择同步入口，覆盖路由初次读取与改期成功后的 collection 替换。</zh-CN><en>State-record change is sole selection synchronization entry, covering initial route read and collection replacement after a successful reschedule.</en></lang>
watch(reservationDisplay, synchronizeSelections, { immediate: true });

/**
 * <lang><zh-CN>读取路由提供的候选预约 ID。</zh-CN><en>Reads candidate reservation ID supplied by route.</en></lang>
 * @param {Record<string, unknown>} query <lang><zh-CN>UniApp onLoad 提供的页面 query。</zh-CN><en>Page query supplied by UniApp onLoad.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 只接收字符串 ID；未知形状确定性进入空态，不能变成 provider 或资源查询。
 * @lang en Accept only a string ID; an unknown shape deterministically enters empty state and cannot become provider or resource query.
 */
function readRouteReservation(query) {
  // <lang><zh-CN>只读取精确 reservationId，不解析任何日期、时段、source 或命令字段。</zh-CN><en>Read only exact reservationId and parse no date, slot, source, or command field.</en></lang>
  routeReservationId.value = typeof query?.reservationId === 'string' ? query.reservationId : '';
}

/**
 * <lang><zh-CN>选择一个当前资源已声明日期。</zh-CN><en>Selects one date declared by current resource.</en></lang>
 * @param {string} date <lang><zh-CN>当前按钮绑定的有限 ISO 日期。</zh-CN><en>Finite ISO date bound by current button.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 点击只更新页面局部选择并清除旧失败，不创建 replacement 或库存锁。
 * @lang en Click updates only page-local selection and clears old failure; it creates no replacement or inventory hold.
 */
function selectDate(date) {
  // <lang><zh-CN>值来自当前有限按钮，不接收自由输入。</zh-CN><en>Value comes from current finite button and accepts no free input.</en></lang>
  selectedDate.value = date;
  resultFailure.value = null;
}

/**
 * <lang><zh-CN>选择一个当前资源已声明时段。</zh-CN><en>Selects one slot declared by current resource.</en></lang>
 * @param {string} time <lang><zh-CN>当前按钮绑定的有限时段。</zh-CN><en>Finite slot bound by current button.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 点击只更新页面局部选择并清除旧失败，不创建 replacement 或库存锁。
 * @lang en Click updates only page-local selection and clears old failure; it creates no replacement or inventory hold.
 */
function selectTime(time) {
  // <lang><zh-CN>值来自当前有限按钮，不接收自由输入。</zh-CN><en>Value comes from current finite button and accepts no free input.</en></lang>
  selectedTime.value = time;
  resultFailure.value = null;
}

/**
 * <lang><zh-CN>提交当前 confirmed 预约的受控改期。</zh-CN><en>Submits controlled reschedule of current confirmed reservation.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>失败投影完成或成功跳转到新预约详情后 resolve。</zh-CN><en>Resolves after failure projection or successful navigation to new reservation detail.</en></lang>
 * @lang zh-CN state/Biz adapter 先验证并创建 replacement，再原子取消旧记录；页面不提前隐藏或标记旧预约。
 * @lang en State/Biz adapter validates and creates replacement before atomically cancelling old record; page neither hides nor marks old booking early.
 */
async function confirmReschedule() {
  // <lang><zh-CN>仅 confirmed 当前记录和两个有限选择可进入 write action。</zh-CN><en>Only a current confirmed record with both finite selections may enter write action.</en></lang>
  const currentReservation = reservationDisplay.value;
  if (!currentReservation || currentReservation.status !== 'confirmed' || !selectedDate.value || !selectedTime.value) return;

  // <lang><zh-CN>等待已锁定 Biz write seam 的 canonical outcome，页面不自行变更 snapshot。</zh-CN><en>Await canonical outcome of locked Biz write seam; page changes no snapshot itself.</en></lang>
  const outcome = await demo.rescheduleLocalReservation(currentReservation.id, selectedDate.value, selectedTime.value);

  // <lang><zh-CN>failure 保留旧记录 confirmed，并在本页可发现显示。</zh-CN><en>Failure retains old record confirmed and displays it discoverably on this page.</en></lang>
  if (outcome.kind === 'failure') {
    resultFailure.value = outcome;
    return;
  }

  // <lang><zh-CN>只接受完整 rescheduled outcome；未知 success kind 不导航，避免显示半完成 replacement。</zh-CN><en>Accept only complete rescheduled outcome; an unknown success kind does not navigate, avoiding display of half-complete replacement.</en></lang>
  if (outcome.kind !== 'rescheduled') return;

  // <lang><zh-CN>成功 snapshot 已被 state 原子采用，随后替换为新 confirmed 记录的本地详情页面。</zh-CN><en>State has atomically adopted successful snapshot, then replace with local detail page of new confirmed record.</en></lang>
  uni.redirectTo({ url: `/pages/reservation-detail/index?reservationId=${encodeURIComponent(outcome.reservation.id)}` });
}

/**
 * <lang><zh-CN>从无效改期恢复到发现主页面。</zh-CN><en>Recovers from invalid reschedule to Discover primary page.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 空态恢复不额外读取或改变预约记录。
 * @lang en Empty-state recovery performs no additional reservation read or mutation.
 */
function goDiscover() {
  // <lang><zh-CN>使用应用壳固定主页面导航，不使用外部 URL 或历史参数。</zh-CN><en>Use application-shell fixed primary navigation and no external URL or history parameter.</en></lang>
  openPrimaryPage('discover');
}

// <lang><zh-CN>onLoad 是唯一 route ID 读取入口；模板和计算值不直接访问平台 query。</zh-CN><en>onLoad is sole route-ID read entry; template and computed access no platform query directly.</en></lang>
onLoad(readRouteReservation);
</script>

<style scoped>
/* <lang><zh-CN>改期页采用与板 B 一致的清晰摘要、有限选择和单一确认动作，不引入订单、支付或身份视觉。</zh-CN><en>Reschedule uses clear summary, finite selection, and one confirmation action consistent with Board B without introducing order, payment, or identity visuals.</en></lang> */
.reservation-reschedule-page { padding: 20px 16px 28px; background: var(--u-sys-color-surface-subtle); }
.reservation-reschedule-page__content { display: flex; gap: 16px; flex-direction: column; }
.reservation-reschedule-page__eyebrow { color: var(--u-sys-color-action-primary); font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.reservation-reschedule-page__title { color: var(--u-sys-color-text); font-size: 27px; font-weight: 700; line-height: 1.3; }
.reservation-reschedule-page__venue { color: var(--u-sys-color-text-secondary); font-size: 14px; }
.reservation-reschedule-page__choices { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
