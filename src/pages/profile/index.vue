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
      <!-- <lang><zh-CN>示例身份仅为页面展示，不成为可编辑账户表单或身份绑定入口。</zh-CN><en>Demo identity is presentation only and is neither an editable account form nor an identity-binding entry.</en></lang> -->
      <u-card :title="runtimeLocale.t('profile.visitor')" :sub-title="runtimeLocale.t('profile.subtitle')">
        <view class="profile-page__identity">
          <u-avatar :text="runtimeLocale.t('profile.avatar')" size="large" />
          <view>
            <text class="profile-page__name">{{ runtimeLocale.t('profile.visitor') }}</text>
            <text class="profile-page__detail">{{ runtimeLocale.t('profile.noIdentity') }}</text>
          </view>
        </view>
      </u-card>

      <!-- <lang><zh-CN>语言选择使用非颜色 radio 标记；每次 change 只改变 locale preference，不影响业务数据或预约。</zh-CN><en>Language selection uses non-color radio markers; each change alters only locale preference and affects no business data or booking.</en></lang> -->
      <u-card :title="runtimeLocale.t('profile.language')">
        <u-radio-group v-model="languageChoice">
          <u-radio value="system" :label="followSystemLabel" />
          <u-radio value="zh-Hans" :label="runtimeLocale.t('profile.simplifiedChinese')" />
          <u-radio value="en" :label="runtimeLocale.t('profile.english')" />
        </u-radio-group>
      </u-card>

      <!-- <lang><zh-CN>storage 失败只提示本机可恢复状态，不隐藏当前已生效的内存选择。</zh-CN><en>A storage failure only reports a recoverable local state and does not hide the already-effective in-memory choice.</en></lang> -->
      <u-notice
        v-if="runtimeLocale.persistenceFailed.value"
        visible
        tone="warning"
        :message="runtimeLocale.t('profile.preferenceUnsaved')"
      />
      <u-notice
        v-else
        visible
        tone="info"
        :message="runtimeLocale.t('profile.preferenceSaved')"
      />

      <!-- <lang><zh-CN>数据边界用只读 cell 展示，不把示例资料伪装为可保存的个人档案。</zh-CN><en>Data boundaries use read-only cells and do not present demo details as a saveable personal profile.</en></lang> -->
      <u-card :title="runtimeLocale.t('profile.dataBoundary')">
        <u-cell :label="runtimeLocale.t('profile.bookings')" />
        <u-cell :label="runtimeLocale.t('profile.venues')" />
        <u-cell :label="runtimeLocale.t('profile.images')" />
      </u-card>
      <u-button :label="runtimeLocale.t('profile.browse')" block @click="goDiscover" />
      </view>
    </runtime-page-shell>
  </u-config-provider>
</template>

<script setup>
import { computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import RuntimePageShell from '../../components/RuntimePageShell.vue';
import { openPrimaryPage, syncPrimaryTabChrome } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';

// <lang><zh-CN>个人信息页读取唯一共享 locale surface，不创建页面私有语言 store 或平行 UI locale global。</zh-CN><en>Profile reads the sole shared locale surface and creates neither a page-private language store nor a parallel UI locale global.</en></lang>
const runtimeLocale = useRuntimeLocale();

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

// <lang><zh-CN>个人信息页每次作为平台 tab 显示时校正选中态和当前 locale。</zh-CN><en>Whenever Profile is shown as a platform tab, correct its selection and current locale.</en></lang>
onShow(() => syncPrimaryTabChrome('profile', runtimeLocale.locale.value, (messageKey) => runtimeLocale.t(messageKey)));
</script>

<style scoped>
/* <lang><zh-CN>个人页使用 token 化卡片层级与非颜色单选标识，不模拟账号、会员或可编辑档案视觉。</zh-CN><en>Profile uses tokenized card hierarchy and non-color radio markers without simulating an account, membership, or editable-profile appearance.</en></lang> */
.profile-page { display: flex; gap: 16px; flex-direction: column; padding: 20px 16px 28px; background: var(--u-sys-color-surface-subtle); }
.profile-page__identity { display: flex; gap: 14px; align-items: center; }
.profile-page__name { display: block; color: var(--u-sys-color-text); font-size: 19px; font-weight: 700; }
.profile-page__detail { display: block; margin-top: 4px; color: var(--u-sys-color-text-secondary); font-size: 13px; line-height: 1.5; }
</style>
