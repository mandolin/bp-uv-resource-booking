<!--
@lang zh-CN 个人信息页展示无敏感身份的 demo 资料与设备本机语言选择；不收集、编辑、上传或传输真实身份、联系方式、头像、账号或业务偏好。
@lang en Profile shows non-sensitive demo details and device-local language selection; it collects, edits, uploads, or transmits no real identity, contact, avatar, account, or business preference.
-->
<template>
  <!-- <lang><zh-CN>provider 直接包住页面组件树，使 HIA-uView 的受限 locale context 与 BP 显示语言保持同一 canonical 值。</zh-CN><en>The provider directly wraps the page component tree so HIA-uView's constrained locale context shares the BP display language's canonical value.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <!-- <lang><zh-CN>个人信息页壳与语言 radio 共用同一 store，选择变化会在同一渲染周期更新当前标题与全部 tab labels。</zh-CN><en>The Profile shell and language radios share one store, so a selection change updates the current title and every tab label in the same render cycle.</en></lang> -->
    <runtime-page-shell :title="runtimeLocale.t('title.profile')">
      <view class="profile-page">
        <!-- <lang><zh-CN>示例身份使用 HIA-uView avatar 和正文层级呈现，不成为可编辑账户表单或身份绑定入口。</zh-CN><en>Demo identity uses the HIA-uView avatar and body hierarchy without becoming an editable account form or identity-binding entry.</en></lang> -->
        <view class="profile-page__identity">
          <u-avatar :text="runtimeLocale.t('profile.avatar')" size="large" />
          <view class="profile-page__identity-copy">
            <text class="profile-page__name">{{ runtimeLocale.t('profile.visitor') }}</text>
            <u-alert-tips type="primary" :description="runtimeLocale.t('profile.noIdentity')" />
          </view>
        </view>

        <!-- <lang><zh-CN>预约概览只计数共享 readonly local mock collection；它不读取身份、后台订单或跨会话历史。</zh-CN><en>Booking summary counts only the shared readonly local-mock collection; it reads no identity, backend order, or cross-session history.</en></lang> -->
        <u-card class="profile-summary-card" :padding="16">
          <view class="profile-page__summary-header">
            <view class="profile-page__summary-title"><u-icon name="▣" size="large" tone="primary" /><text>{{ runtimeLocale.t('profile.bookingSummary') }}</text></view>
            <u-button size="sm" variant="text" :label="runtimeLocale.t('common.viewAll')" @click="goReservations" />
          </view>
          <view class="profile-page__summary-counts">
            <view class="profile-page__summary-count"><text class="profile-page__summary-number">{{ reservationSummary.confirmed }}</text><text>{{ runtimeLocale.t('profile.activeBookings') }}</text></view>
            <view class="profile-page__summary-count"><text class="profile-page__summary-number">{{ reservationSummary.cancelled }}</text><text>{{ runtimeLocale.t('profile.cancelledBookings') }}</text></view>
          </view>
        </u-card>

        <!-- <lang><zh-CN>语言设置使用可点击 HIA-uView cell 与平台有限 action sheet；每次选择只改变 locale preference，不影响业务数据或预约。</zh-CN><en>Language settings use a clickable HIA-uView cell and a finite platform action sheet; each selection changes only locale preference and affects no business data or booking.</en></lang> -->
        <u-card class="profile-settings-card" :padding="16">
          <u-cell :label="runtimeLocale.t('profile.language')" :description="followSystemLabel" :value="currentLanguageLabel" clickable @click="openLanguageSelector" />
          <view class="profile-page__divider" />
          <!-- <lang><zh-CN>数据源行保持只读，只描述当前 source authority，不伪造 reset、后台或账号能力。</zh-CN><en>The source row remains read-only and only describes the current source authority without fabricating reset, backend, or account capabilities.</en></lang> -->
          <view class="profile-page__source">
            <view class="profile-page__setting-label"><u-icon name="◉" size="medium" tone="neutral" /><text>{{ runtimeLocale.t('profile.dataSource') }}</text></view>
            <source-badge :source="demo.catalogSource.value" />
          </view>
        </u-card>

        <!-- <lang><zh-CN>storage 失败只提示本机可恢复状态，不隐藏当前已生效的内存选择。</zh-CN><en>A storage failure only reports a recoverable local state and does not hide the already-effective in-memory choice.</en></lang> -->
        <u-alert-tips
          :type="runtimeLocale.persistenceFailed.value ? 'warning' : 'primary'"
          :title="runtimeLocale.t('profile.dataBoundary')"
          :description="runtimeLocale.persistenceFailed.value ? runtimeLocale.t('profile.preferenceUnsaved') : runtimeLocale.t('profile.preferenceSaved')"
        />
        <u-button :label="runtimeLocale.t('profile.browse')" variant="secondary" block @click="goDiscover" />
      </view>
    </runtime-page-shell>
  </u-config-provider>
</template>

<script setup>
import { computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import RuntimePageShell from '../../components/RuntimePageShell.vue';
import SourceBadge from '../../components/SourceBadge.vue';
import { openPrimaryPage, syncPrimaryTabChrome } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>个人信息页只读取共享 demo 状态，避免建立另一份预约统计或页面私有数据源。</zh-CN><en>Profile reads only shared demo state, avoiding another booking summary or page-private data source.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>个人信息页读取唯一共享 locale surface，不创建页面私有语言 store 或平行 UI locale global。</zh-CN><en>Profile reads the sole shared locale surface and creates neither a page-private language store nor a parallel UI locale global.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>概览只区分当前 local mock contract 的两个有限状态，未知状态不计入任何展示计数。</zh-CN><en>The summary distinguishes only the two finite statuses of the current local-mock contract; an unknown status contributes to no displayed count.</en></lang>
const reservationSummary = computed(() => {
  // <lang><zh-CN>先创建本次计算专属的可变计数器，随后冻结返回投影以避免模板意外改写。</zh-CN><en>Create mutable counters private to this computation, then freeze returned projection to prevent accidental template mutation.</en></lang>
  const summary = { confirmed: 0, cancelled: 0 };

  for (const reservation of demo.reservationCards.value) {
    // <lang><zh-CN>confirmed 与 cancelled 分别对应当前设计稿的两项可发现计数。</zh-CN><en>Confirmed and cancelled respectively correspond to the two discoverable counts in the current design board.</en></lang>
    if (reservation.status === 'confirmed') summary.confirmed += 1;
    else if (reservation.status === 'cancelled') summary.cancelled += 1;
  }

  return Object.freeze(summary);
});

// <lang><zh-CN>radio 以 `system` 显式表示无 stored preference；其余值只能是规格允许的 canonical locale。</zh-CN><en>Radio uses `system` explicitly to represent no stored preference; all other values can only be spec-permitted canonical locales.</en></lang>
const languageChoice = computed({
  get: () => runtimeLocale.followsSystem.value ? 'system' : runtimeLocale.locale.value,
  set: (nextChoice) => {
    // <lang><zh-CN>跟随系统先在内存恢复系统值；否则只接受 store 的有限 locale allowlist。</zh-CN><en>Follow-system first restores the system value in memory; otherwise accept only the store's finite locale allowlist.</en></lang>
    if (nextChoice === 'system') runtimeLocale.followSystem();
    else runtimeLocale.selectLocale(nextChoice);

    // <lang><zh-CN>当前页面正文/navbar 由响应式 store 重绘；平台管理的 tab chrome 通过受限 bridge 立即同步。</zh-CN><en>The reactive store redraws current page body/navbar; the bounded bridge immediately synchronizes platform-managed tab chrome.</en></lang>
    syncPrimaryTabChrome('profile', runtimeLocale.locale.value, (messageKey) => runtimeLocale.t(messageKey));
  }
});

// <lang><zh-CN>跟随系统行同时说明当前归一化语言，避免用户把状态误认为第三种可持久语言。</zh-CN><en>The follow-system row also states the current normalized language, preventing users from mistaking it for a third persistable language.</en></lang>
const followSystemLabel = computed(() => runtimeLocale.t('profile.followSystem', {
  locale: runtimeLocale.t(runtimeLocale.systemLocale.value === 'en' ? 'locale.enName' : 'locale.zhName')
}));

// <lang><zh-CN>设置卡右侧只展示当前实际生效语言；跟随系统模式仍投影其归一化结果而不是字面 `system`。</zh-CN><en>The settings-card trailing value displays only the language currently in effect; follow-system mode still projects its normalized result rather than literal `system`.</en></lang>
const currentLanguageLabel = computed(() => runtimeLocale.t(runtimeLocale.locale.value === 'en' ? 'locale.enName' : 'locale.zhName'));

// <lang><zh-CN>语言 action sheet 只声明三个既有 preference 值；label 每次随当前 runtime locale 重新投影。</zh-CN><en>The language action sheet declares only the three existing preference values; labels reproject on every current-runtime-locale change.</en></lang>
const languageOptions = computed(() => Object.freeze([
  Object.freeze({ value: 'system', label: followSystemLabel.value }),
  Object.freeze({ value: 'zh-Hans', label: runtimeLocale.t('profile.simplifiedChinese') }),
  Object.freeze({ value: 'en', label: runtimeLocale.t('profile.english') })
]));

/**
 * <lang><zh-CN>打开平台 action sheet，让用户从有限语言 preference 中选择一项。</zh-CN><en>Opens a platform action sheet so the user can choose one finite language preference.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN action sheet 只接收本地静态 label，不读取账户、远端配置或用户自由文本。
 * @lang en The action sheet receives only local static labels and reads no account, remote configuration, or user free text.
 */
function openLanguageSelector() {
  // <lang><zh-CN>快照保留本次 sheet 的值/标签对应，避免用户选择期间 locale 重绘造成索引漂移。</zh-CN><en>A snapshot preserves value/label correspondence for this sheet, avoiding index drift if locale redraws during user selection.</en></lang>
  const optionSnapshot = languageOptions.value;

  // <lang><zh-CN>平台只接收文字数组；成功回调委托给有界结果函数，取消关闭保持零状态变化。</zh-CN><en>The platform receives only a text array; success delegates to the bounded result function, while cancellation retains zero state change.</en></lang>
  uni.showActionSheet({
    itemList: optionSnapshot.map((option) => option.label),
    success: (result) => applyLanguageSelection(optionSnapshot, result)
  });
}

/**
 * <lang><zh-CN>把 action sheet 返回的有限索引应用为语言 preference。</zh-CN><en>Applies the finite index returned by the action sheet as a language preference.</en></lang>
 * @param {ReadonlyArray<{ value: string, label: string }>} options <lang><zh-CN>打开 sheet 时冻结的语言选项快照。</zh-CN><en>Language-option snapshot frozen when the sheet opened.</en></lang>
 * @param {{ tapIndex?: number }} result <lang><zh-CN>平台 action sheet 的受限选择结果。</zh-CN><en>Bounded selection result from the platform action sheet.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 非整数或越界索引保持零状态改变；所有实际值仍经 locale store allowlist 处理。
 * @lang en A non-integer or out-of-range index retains zero state change; every actual value still passes through the locale-store allowlist.
 */
function applyLanguageSelection(options, result) {
  // <lang><zh-CN>平台索引必须是快照数组内的整数位置，避免任意字段成为 preference。</zh-CN><en>The platform index must be an integer position inside the snapshot array, preventing an arbitrary field from becoming a preference.</en></lang>
  const selectedOption = Number.isInteger(result?.tapIndex) ? options[result.tapIndex] : null;
  if (!selectedOption) return;

  // <lang><zh-CN>复用既有 computed setter，使平台 chrome 与正文继续在同一更新路径同步。</zh-CN><en>Reuse the existing computed setter so platform chrome and body continue synchronizing through one update path.</en></lang>
  languageChoice.value = selectedOption.value;
}

/**
 * <lang><zh-CN>转到发现 tab。</zh-CN><en>Moves to the Discover tab.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 个人信息页不预取 catalog、修改 preference 以外的数据或尝试身份登录。
 * @lang en Profile does not prefetch catalog, modify data other than language preference, or attempt identity login.
 */
function goDiscover() {
  // <lang><zh-CN>只进入应用壳固定声明的发现主页面。</zh-CN><en>Enter only the Discover primary page fixed by the application shell.</en></lang>
  openPrimaryPage('discover');
}

/**
 * <lang><zh-CN>转到“我的预约”主页面。</zh-CN><en>Moves to the My Bookings primary page.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 此导航只进入应用固定 tab，不预取、取消或创建预约。
 * @lang en This navigation enters only an application-fixed tab and neither prefetches, cancels, nor creates a booking.
 */
function goReservations() {
  // <lang><zh-CN>只选择主导航 allowlist 中的预约页面。</zh-CN><en>Select only the bookings page in the primary-navigation allowlist.</en></lang>
  openPrimaryPage('reservations');
}

// <lang><zh-CN>个人信息页每次作为平台 tab 显示时校正选中态和当前 locale。</zh-CN><en>Whenever Profile is shown as a platform tab, correct its selection and current locale.</en></lang>
onShow(() => syncPrimaryTabChrome('profile', runtimeLocale.locale.value, (messageKey) => runtimeLocale.t(messageKey)));
</script>

<style scoped>
/* <lang><zh-CN>个人页采用审阅稿的身份摘要、预约统计与设置分组；底部 padding 为常驻 tabBar 留出安全空间。</zh-CN><en>Profile follows the reviewed identity summary, booking statistics, and grouped settings; bottom padding reserves safe space for the persistent tab bar.</en></lang> */
.profile-page { display: flex; min-height: 100%; gap: 16px; flex-direction: column; padding: 24px 16px calc(var(--bp-shell-tabbar-height) + 28px); background: var(--u-sys-color-surface); }
.profile-page__identity { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 18px; align-items: center; padding: 6px 22px 16px; }
.profile-page__identity-copy { display: flex; min-width: 0; gap: 10px; flex-direction: column; }
.profile-page__name { display: block; color: var(--u-sys-color-text); font-size: 24px; font-weight: 700; line-height: 1.3; }
.profile-page__summary-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.profile-page__summary-title,
.profile-page__setting-label { display: flex; align-items: center; gap: 10px; color: var(--u-sys-color-text); font-size: 16px; font-weight: 700; }
.profile-page__summary-counts { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 14px; padding-left: 42px; }
.profile-page__summary-count { display: flex; gap: 3px; flex-direction: column; color: var(--u-sys-color-text-secondary); font-size: 13px; }
.profile-page__summary-number { color: var(--u-sys-color-text); font-size: 24px; font-weight: 700; line-height: 1.2; }
.profile-page__source { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.profile-page__setting-value { color: var(--u-sys-color-text-secondary); font-size: 14px; }
.profile-page__divider { height: 1px; margin: 14px 0; background: var(--u-sys-color-border); }
</style>
