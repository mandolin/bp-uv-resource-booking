<!--
@lang zh-CN 个人信息页仅呈现明确标识为 mock 的非敏感个人资料占位与数据边界说明；它不采集、编辑、上传、存储或传输真实身份、联系方式、头像或偏好。
@lang en Profile presents only clearly marked mock non-sensitive profile placeholders and data-boundary notes; it collects, edits, uploads, stores, or transmits no real identity, contact, avatar, or preference.
-->
<template>
  <!-- <lang><zh-CN>页面是静态 demo 边界说明，不使用表单控件来暗示可保存的个人资料能力。</zh-CN><en>The page is a static demo boundary statement and uses no form control that would imply a saveable profile capability.</en></lang> -->
  <view class="profile-page">
    <u-card title="示例访客 / Demo visitor" sub-title="Mock profile · 本地展示 / Local presentation"><view class="profile-page__identity"><u-avatar text="DV" size="large" /><view><text class="profile-page__name">示例访客 / Demo visitor</text><text class="profile-page__detail">未绑定身份、手机号或账号 / No identity, phone, or account is bound</text></view></view></u-card>
    <u-notice visible tone="info" message="这是个人信息页面的展示骨架。当前版本不保存偏好，也不接入微信、企业或其他身份提供方。 / This is a presentation skeleton for Profile. The current version saves no preference and connects to no WeChat, enterprise, or other identity provider." />
    <u-card title="数据边界 / Data boundary"><view class="profile-page__list"><text>• 预约记录：仅当前运行时 mock 数据 / Bookings: current-runtime mock only</text><text>• 场馆数据：仓内 local JSON / Venue data: in-repository local JSON</text><text>• 图像资产：仓内原创 AI 生成素材 / Images: in-repository original AI-generated assets</text></view></u-card>
    <u-button label="浏览资源 / Browse resources" block @click="goDiscover" />
  </view>
</template>

<script setup>

/**
 * <lang><zh-CN>转到发现 tab。</zh-CN><en>Moves to the Discover tab.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 个人信息页不预取 catalog、写入偏好或尝试身份登录。
 * @lang en Profile does not prefetch catalog, write preferences, or attempt identity sign-in.
 */
function goDiscover() {
  // <lang><zh-CN>只执行 UniApp 本地 tab 路由。</zh-CN><en>Perform only UniApp local tab routing.</en></lang>
  uni.switchTab({ url: '/pages/discover/index' });
}
</script>

<style scoped>
/* <lang><zh-CN>个人页保持展示性卡片和细字体层级，不冒充账号设置或可编辑身份表单。</zh-CN><en>Profile keeps presentational cards and a light type hierarchy, without impersonating account settings or an editable identity form.</en></lang> */
.profile-page { display: flex; gap: 16px; flex-direction: column; min-height: 100vh; padding: 20px 16px 28px; background: var(--u-sys-color-surface-subtle); }
.profile-page__identity { display: flex; gap: 14px; align-items: center; }
.profile-page__name { display: block; color: var(--u-sys-color-text); font-size: 19px; font-weight: 700; }
.profile-page__detail { display: block; margin-top: 4px; color: var(--u-sys-color-text-secondary); font-size: 13px; line-height: 1.5; }
.profile-page__list { display: flex; gap: 10px; flex-direction: column; color: var(--u-sys-color-text); font-size: 14px; line-height: 1.6; }
</style>
