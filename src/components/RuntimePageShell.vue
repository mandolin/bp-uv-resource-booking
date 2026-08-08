<!--
@lang zh-CN BP 的应用自管页面壳：用 HIA-uView `u-navbar`/`u-tabbar` 呈现当前 runtime locale 的标题与主导航，并为自定义导航栏处理状态栏、底部安全区和有限路由意图。
@lang en Application-owned page shell for the BP: renders current-runtime-locale titles and primary navigation with HIA-uView `u-navbar`/`u-tabbar`, while handling the status bar, bottom safe area, and bounded routing intents for custom navigation.
-->
<template>
  <!-- <lang><zh-CN>根壳提供统一背景和最小视口高度；页面业务内容只通过默认 slot 进入。</zh-CN><en>The root shell provides a shared background and minimum viewport height; page business content enters only through the default slot.</en></lang> -->
  <view class="runtime-page-shell">
    <!-- <lang><zh-CN>sticky header 先占用 UniApp 状态栏变量，再由 `u-navbar` 显示响应式单语言标题和可选返回文字。</zh-CN><en>The sticky header first reserves UniApp's status-bar variable, then `u-navbar` displays the reactive single-language title and optional back copy.</en></lang> -->
    <view class="runtime-page-shell__header">
      <view class="runtime-page-shell__status-bar" />
      <u-navbar :title="pageTitle" :left-text="backText" @left-click="handleBack" />
    </view>

    <!-- <lang><zh-CN>页面内容保持调用方所有权；壳不读取目录、预约、身份或数据 source。</zh-CN><en>Page content remains caller-owned; the shell reads no catalog, booking, identity, or data source.</en></lang> -->
    <view class="runtime-page-shell__body"><slot /></view>

    <!-- <lang><zh-CN>主页面用流内 spacer 为 fixed tabbar 保留空间，详情/确认页不生成空白底栏。</zh-CN><en>Primary pages use an in-flow spacer for the fixed tabbar; detail and confirmation pages generate no empty bottom bar.</en></lang> -->
    <view v-if="hasPrimaryTab" class="runtime-page-shell__tabbar-spacer" />

    <!-- <lang><zh-CN>底栏只消费固定本地化 items，并把 change intent 交给受限路由 helper。</zh-CN><en>The bottom bar consumes only fixed localized items and returns change intent to the bounded routing helper.</en></lang> -->
    <view v-if="hasPrimaryTab" class="runtime-page-shell__tabbar">
      <u-tabbar :model-value="activeTab" :items="tabItems" @change="handleTabChange" />
    </view>
  </view>
</template>

<script setup>
// <lang><zh-CN>computed 只投影 props 与共享 locale，不创建页面私有 store。</zh-CN><en>Computed values project only props and shared locale and create no page-private store.</en></lang>
import { computed } from 'vue';
// <lang><zh-CN>导航 helper 只接受固定主页面；页面壳不直接拼接或解释 URL。</zh-CN><en>Navigation helpers accept fixed primary pages only; the page shell never concatenates or interprets URLs directly.</en></lang>
import { createPrimaryTabItems, isPrimaryPage, navigateBackOrOpenPrimaryPage, openPrimaryPage } from '../localization/runtime-chrome.mjs';
// <lang><zh-CN>标题、返回文字与 tab labels 共用唯一 runtime locale store。</zh-CN><en>Title, back copy, and tab labels share the sole runtime locale store.</en></lang>
import { useRuntimeLocale } from '../localization/runtime-locale.mjs';

// <lang><zh-CN>稳定组件名用于 Vue DevTools 与编译产物识别，不注册全局服务。</zh-CN><en>The stable component name supports Vue DevTools and compiled-output identification and registers no global service.</en></lang>
defineOptions({ name: 'RuntimePageShell' });

/**
 * <lang><zh-CN>页面壳的第一方受控输入。</zh-CN><en>First-party controlled inputs for the page shell.</en></lang>
 * @lang zh-CN title key、active tab 和返回开关都由六个静态页面源码提供；不接受业务对象、远端 manifest 或 route query。
 * @lang en The title key, active tab, and back switch are supplied by six static page sources; no business object, remote manifest, or route query is accepted.
 */
const props = defineProps({
  // <lang><zh-CN>静态 message key 决定可见页面标题，组件不从 route 或内容猜测标题。</zh-CN><en>A static message key determines the visible page title; the component infers no title from route or content.</en></lang>
  titleKey: { type: String, required: true },
  // <lang><zh-CN>主页面使用固定 tab value；空值表示当前页没有底部主导航。</zh-CN><en>Primary pages use a fixed tab value; an empty value means the current page has no bottom primary navigation.</en></lang>
  activeTab: { type: String, default: '' },
  // <lang><zh-CN>只有详情与确认等栈内页面显式开放返回 control。</zh-CN><en>Only stack-internal pages such as details and confirmation explicitly enable the back control.</en></lang>
  showBack: { type: Boolean, default: false }
});

// <lang><zh-CN>读取应用级 locale surface，使个人信息页的选择可即时重绘所有壳文案。</zh-CN><en>Read the application-level locale surface so a Profile choice immediately redraws every shell label.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>页面标题始终是当前 locale 的一个静态资源结果，不经过平台 native API。</zh-CN><en>The page title is always one static-resource result in the current locale and never passes through a native platform API.</en></lang>
const pageTitle = computed(() => runtimeLocale.t(props.titleKey));

// <lang><zh-CN>返回文字仅在页面声明返回 control 时存在，避免主页面出现无意义空按钮。</zh-CN><en>Back copy exists only when the page declares a back control, preventing meaningless empty controls on primary pages.</en></lang>
const backText = computed(() => props.showBack ? runtimeLocale.t('common.back') : '');

// <lang><zh-CN>未知/空 activeTab 不渲染底栏，从而详情页不会误选或猜测主页面。</zh-CN><en>An unknown or empty activeTab renders no bottom bar, so a detail page never guesses or falsely selects a primary page.</en></lang>
const hasPrimaryTab = computed(() => isPrimaryPage(props.activeTab));

// <lang><zh-CN>四项 label 随共享 locale 响应式重算，顺序和 value 仍由固定壳声明拥有。</zh-CN><en>All four labels recompute reactively with the shared locale while order and values remain owned by the fixed shell declaration.</en></lang>
const tabItems = computed(() => createPrimaryTabItems((messageKey) => runtimeLocale.t(messageKey)));

/**
 * <lang><zh-CN>处理 HIA-uView navbar 发出的返回意图。</zh-CN><en>Handles the back intent emitted by the HIA-uView navbar.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值；页面栈不可返回时进入发现页。</zh-CN><en>No return value; enters Discover when the page stack cannot go back.</en></lang>
 * @lang zh-CN fallback 为第一方固定主页面，不读取 referrer、外部 URL 或 query。
 * @lang en The fallback is a first-party fixed primary page and reads no referrer, external URL, or query.
 */
function handleBack() {
  // <lang><zh-CN>详情/确认页统一以发现作为无页面栈时的安全恢复入口。</zh-CN><en>Detail and confirmation pages share Discover as the safe recovery entry when no page stack exists.</en></lang>
  navigateBackOrOpenPrimaryPage('discover');
}

/**
 * <lang><zh-CN>处理 HIA-uView tabbar 发出的有限切换意图。</zh-CN><en>Handles a bounded switch intent emitted by the HIA-uView tabbar.</en></lang>
 * @param {unknown} nextPageValue <lang><zh-CN>组件根据固定 items 返回的候选主页面 value。</zh-CN><en>Candidate primary-page value returned by the component from fixed items.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值；未知 value 安全无操作。</zh-CN><en>No return value; an unknown value safely does nothing.</en></lang>
 * @lang zh-CN 实际 URL 只由导航模块映射，组件和事件不能提供 URL。
 * @lang en The navigation module alone maps the actual URL; neither the component nor event can supply a URL.
 */
function handleTabChange(nextPageValue) {
  // <lang><zh-CN>调用同一有限主页面 gate，模拟原生 tab 的顶层切换边界。</zh-CN><en>Call the same finite primary-page gate to model the top-level switching boundary of a native tab.</en></lang>
  openPrimaryPage(nextPageValue);
}
</script>

<style scoped>
/* <lang><zh-CN>根壳填满视口并继承 HIA-uView 浅色表面；所有层级值由 BP 自有布局 token 提供。</zh-CN><en>The root shell fills the viewport and inherits the HIA-uView light surface; all layering values come from BP-owned layout tokens.</en></lang> */
.runtime-page-shell { display: flex; flex-direction: column; min-height: 100vh; background: var(--u-sys-color-surface-subtle); }
/* <lang><zh-CN>header 在页面滚动时保持可见，并以主题表面遮住其下内容。</zh-CN><en>The header remains visible during page scrolling and uses the themed surface to cover content beneath it.</en></lang> */
.runtime-page-shell__header { position: sticky; z-index: var(--bp-shell-header-z); top: 0; background: var(--u-sys-color-surface); }
/* <lang><zh-CN>UniApp 的状态栏变量在 H5 为零、在支持宿主为实际高度；不读取设备标识或同步系统 API。</zh-CN><en>UniApp's status-bar variable is zero on H5 and the actual height on supporting hosts; no device identifier or synchronous system API is read.</en></lang> */
.runtime-page-shell__status-bar { height: var(--status-bar-height); min-height: var(--status-bar-height); background: var(--u-sys-color-surface); }
/* <lang><zh-CN>body 取得剩余空间；具体 padding、表单和列表仍由页面拥有。</zh-CN><en>The body takes remaining space; concrete padding, forms, and lists remain page-owned.</en></lang> */
.runtime-page-shell__body { flex: 1; min-width: 0; }
/* <lang><zh-CN>spacer 与 fixed 底栏共享高度 token，避免页面末项被遮挡。</zh-CN><en>The spacer and fixed bottom bar share a height token, preventing the final page item from being obscured.</en></lang> */
.runtime-page-shell__tabbar-spacer { min-height: calc(var(--bp-shell-tabbar-height) + env(safe-area-inset-bottom)); }
/* <lang><zh-CN>底栏固定在视口底部，并只为设备安全区追加非交互 padding。</zh-CN><en>The tabbar is fixed to the viewport bottom and adds only noninteractive padding for the device safe area.</en></lang> */
.runtime-page-shell__tabbar { position: fixed; z-index: var(--bp-shell-tabbar-z); right: 0; bottom: 0; left: 0; min-height: var(--bp-shell-tabbar-height); padding-bottom: env(safe-area-inset-bottom); background: var(--u-sys-color-surface); }

/* <lang><zh-CN>微信自定义组件样式隔离可能阻断 app-level token 继承；以下条件编译字面值与 `uni.scss` 默认值保持一致，只补足页面壳自身的表面、层级和底栏高度。</zh-CN><en>WeChat custom-component style isolation may block inheritance of app-level tokens; the following conditional literal values match `uni.scss` defaults and supplement only the page shell's own surfaces, layers, and tabbar height.</en></lang> */
/* #ifdef MP-WEIXIN */
.runtime-page-shell { background: #f7f9fc; }
.runtime-page-shell__header { z-index: 20; background: #ffffff; }
.runtime-page-shell__status-bar { background: #ffffff; }
.runtime-page-shell__tabbar-spacer { min-height: calc(57px + env(safe-area-inset-bottom)); }
.runtime-page-shell__tabbar { z-index: 30; min-height: 57px; background: #ffffff; }
/* #endif */
</style>
