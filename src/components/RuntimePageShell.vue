<!--
@lang zh-CN BP 的应用自管页面壳：用 HIA-uView `u-navbar` 呈现当前 runtime locale 的标题并处理状态栏与有限返回意图；微信主导航由 official custom tabBar 常驻，H5 一级页由应用适配器组合 HIA-uView `UTabbar`。
@lang en Application-owned page shell for the BP: renders the current-runtime-locale title with HIA-uView `u-navbar` and handles the status bar plus bounded back intent; WeChat retains its official custom tab bar, while H5 primary pages compose HIA-uView `UTabbar` through the application adapter.
-->
<template>
  <!-- <lang><zh-CN>根壳提供统一背景和最小视口高度；页面业务内容只通过默认 slot 进入。</zh-CN><en>The root shell provides a shared background and minimum viewport height; page business content enters only through the default slot.</en></lang> -->
  <view class="runtime-page-shell">
    <!-- <lang><zh-CN>sticky header 先占用 UniApp 状态栏变量；页面可通过受控 header slot 提供已审阅品牌栏，未提供时继续由 `u-navbar` 显示单语言标题和可选返回文字。</zh-CN><en>The sticky header first reserves UniApp's status-bar variable; a page may supply a reviewed brand bar through the bounded header slot, while `u-navbar` continues to render the single-language title and optional back copy by default.</en></lang> -->
    <view class="runtime-page-shell__header">
      <view class="runtime-page-shell__status-bar" />
      <slot name="header">
        <u-navbar visible :title="title">
          <template #left>
            <!-- <lang><zh-CN>二级页通过 navbar 的公开 left slot 提供纯箭头 control；可见图形由 CSS 绘制，完整本地化语义保留在 aria-label。</zh-CN><en>Secondary pages provide a chevron-only control through the navbar's public left slot; CSS draws the visible shape while aria-label retains the complete localized meaning.</en></lang> -->
            <button v-if="props.back" class="runtime-page-shell__back" type="button" :aria-label="backText" @click="handleBack">
              <view class="runtime-page-shell__back-icon" aria-hidden="true" />
            </button>
          </template>
        </u-navbar>
      </slot>
    </view>

    <!-- <lang><zh-CN>页面内容保持调用方所有权；壳不读取目录、预约、身份或数据 source。</zh-CN><en>Page content remains caller-owned; the shell reads no catalog, booking, identity, or data source.</en></lang> -->
    <view class="runtime-page-shell__body"><slot /></view>

    <!-- #ifdef H5 -->
    <!-- <lang><zh-CN>H5 仅在一级页面声明固定 value 时呈现 HIA-uView 主导航；二级详情/确认页不生成底栏。</zh-CN><en>H5 presents HIA-uView primary navigation only when a primary page declares a fixed value; secondary detail/confirmation pages generate no bottom bar.</en></lang> -->
    <primary-tab-bar v-if="props.primaryPage" :current-page="props.primaryPage" />
    <!-- #endif -->

  </view>
</template>

<script setup>
// <lang><zh-CN>computed 只投影 props 与共享 locale，不创建页面私有 store。</zh-CN><en>Computed values project only props and shared locale and create no page-private store.</en></lang>
import { computed } from 'vue';
// #ifdef H5
// <lang><zh-CN>H5 通过响应式 effect 同步浏览器文档语言；当前页标题由 onShow chrome bridge 独占，避免缓存 tab 页互相覆盖。</zh-CN><en>H5 uses a reactive effect to synchronize the browser document language; the onShow chrome bridge exclusively owns the current-page title so cached tab pages cannot overwrite one another.</en></lang>
import { watchEffect } from 'vue';
// <lang><zh-CN>H5 专用适配器在编译期从微信产物移除，确保 official custom tabBar 保持唯一微信底栏。</zh-CN><en>The H5-only adapter is removed from the WeChat artifact at compile time, keeping the official custom tab bar as the sole WeChat bottom bar.</en></lang>
import PrimaryTabBar from './PrimaryTabBar.vue';
// #endif
// <lang><zh-CN>返回 helper 只接受固定 fallback 主页面；页面壳不直接拼接或解释 URL。</zh-CN><en>The back helper accepts only a fixed fallback primary page; the page shell never concatenates or interprets URLs directly.</en></lang>
import { isPrimaryPage, navigateBackOrOpenPrimaryPage } from '../localization/runtime-chrome.mjs';
// <lang><zh-CN>标题、返回文字与 tab labels 共用唯一 runtime locale store。</zh-CN><en>Title, back copy, and tab labels share the sole runtime locale store.</en></lang>
import { useRuntimeLocale } from '../localization/runtime-locale.mjs';

// <lang><zh-CN>稳定组件名用于 Vue DevTools 与编译产物识别，不注册全局服务。</zh-CN><en>The stable component name supports Vue DevTools and compiled-output identification and registers no global service.</en></lang>
defineOptions({ name: 'RuntimePageShell' });

/**
 * <lang><zh-CN>页面壳的第一方受控输入。</zh-CN><en>First-party controlled inputs for the page shell.</en></lang>
 * @lang zh-CN 已本地化 title 与返回开关由已声明页面源码提供；可选 header slot 仍由同一第一方页面拥有，不接受业务对象、远端 manifest 或 route query。
 * @lang en The localized title and back switch are supplied by declared page sources; an optional header slot remains owned by the same first-party page and accepts no business object, remote manifest, or route query.
 */
const props = defineProps({
  // <lang><zh-CN>页面直接提供当前 locale 的 title，壳不再依赖跨自定义组件的复合 key 属性桥接。</zh-CN><en>The page supplies the current-locale title directly, so the shell no longer depends on bridging a compound key prop across custom components.</en></lang>
  title: { type: String, required: true },
  // <lang><zh-CN>只有详情与确认等栈内页面显式开放返回 control。</zh-CN><en>Only stack-internal pages such as details and confirmation explicitly enable the back control.</en></lang>
  back: { type: Boolean, default: false },
  // <lang><zh-CN>一级页以固定 value 请求 H5 主导航；空值保留二级页面无 tab 的现有边界。</zh-CN><en>A primary page requests H5 navigation with a fixed value; an empty value preserves the existing tab-free boundary for secondary pages.</en></lang>
  primaryPage: {
    type: String,
    default: '',
    validator: (value) => value === '' || isPrimaryPage(value)
  }
});

// <lang><zh-CN>读取应用级 locale surface，使个人信息页的选择可即时重绘所有壳文案。</zh-CN><en>Read the application-level locale surface so a Profile choice immediately redraws every shell label.</en></lang>
const runtimeLocale = useRuntimeLocale();

// #ifdef H5
/**
 * <lang><zh-CN>把共享 locale 投影到 H5 根文档语言。</zh-CN><en>Projects the shared locale into the H5 root-document language.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值；effect 只写所有缓存页面共享的 `lang`。</zh-CN><en>No return value; the effect writes only the `lang` shared by all cached pages.</en></lang>
 * @lang zh-CN 该同步不读取 UA、系统语言或路由；canonical locale 已由共享 store 决定，当前可见页标题由 onShow chrome bridge 同步，微信在编译期移除整个节点。
 * @lang en This synchronization reads no user agent, system language, or route; the shared store already determined the canonical locale, the onShow chrome bridge synchronizes the currently visible page title, and WeChat removes the entire node at compile time.
 */
watchEffect(function synchronizeH5DocumentLanguage() {
  // <lang><zh-CN>只允许两个已支持的 BCP 47 值进入根文档，未知值确定性回退简体中文。</zh-CN><en>Allow only the two supported BCP 47 values into the root document and deterministically fall back to Simplified Chinese.</en></lang>
  document.documentElement.lang = runtimeLocale.locale.value === 'en' ? 'en' : 'zh-Hans';
});
// #endif

// <lang><zh-CN>返回文字仅在页面声明返回 control 时存在，避免主页面出现无意义空按钮。</zh-CN><en>Back copy exists only when the page declares a back control, preventing meaningless empty controls on primary pages.</en></lang>
const backText = computed(() => props.back ? runtimeLocale.t('common.back') : '');

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

</script>

<style scoped>
/* <lang><zh-CN>根壳填满视口、建立思源黑体优先的正文继承根并继承 HIA-uView 浅色表面；所有层级值由 BP 自有布局 token 提供。</zh-CN><en>The root shell fills the viewport, establishes a Source Han Sans-first body inheritance root, and inherits the HIA-uView light surface; all layering values come from BP-owned layout tokens.</en></lang> */
.runtime-page-shell { display: flex; flex-direction: column; min-height: 100vh; background: var(--u-sys-color-surface-subtle); font-family: var(--bp-font-body, "HIA-uView BP Sans SC", "Source Han Sans SC", "Noto Sans SC", "Noto Sans CJK SC", sans-serif); }
/* <lang><zh-CN>header 在页面滚动时保持可见，并以主题表面遮住其下内容。</zh-CN><en>The header remains visible during page scrolling and uses the themed surface to cover content beneath it.</en></lang> */
.runtime-page-shell__header { position: sticky; z-index: var(--bp-shell-header-z, 20); top: 0; background: var(--u-sys-color-surface); }
/* <lang><zh-CN>UniApp 的状态栏变量在 H5 为零、在支持宿主为实际高度；不读取设备标识或同步系统 API。</zh-CN><en>UniApp's status-bar variable is zero on H5 and the actual height on supporting hosts; no device identifier or synchronous system API is read.</en></lang> */
.runtime-page-shell__status-bar { height: var(--status-bar-height); min-height: var(--status-bar-height); background: var(--u-sys-color-surface); }
/* <lang><zh-CN>返回 control 清除宿主 button 外观并保留 40px 触控面；内部双边框形成与视觉板一致的轻量 chevron，不依赖字符字形或外部图标。</zh-CN><en>The back control removes host button chrome while retaining a 40px touch target; two inner borders form the board-aligned lightweight chevron without relying on a text glyph or external icon.</en></lang> */
.runtime-page-shell__back { display: flex; align-items: center; justify-content: center; height: 40px; width: 40px; margin: 0; padding: 0; appearance: none; background: transparent; border: 0; border-radius: 0; color: var(--u-comp-navbar-control-foreground); }
.runtime-page-shell__back::after { border: 0; }
.runtime-page-shell__back-icon { box-sizing: border-box; height: 11px; width: 11px; border-bottom: 2px solid currentColor; border-left: 2px solid currentColor; transform: rotate(45deg); }
/* <lang><zh-CN>body 取得剩余空间；具体 padding、表单和列表仍由页面拥有。</zh-CN><en>The body takes remaining space; concrete padding, forms, and lists remain page-owned.</en></lang> */
.runtime-page-shell__body { flex: 1; min-width: 0; }
/* <lang><zh-CN>微信自定义组件样式隔离可能阻断 app-level token 继承；以下条件编译字面值与 `uni.scss` 默认值保持一致，只补足页面壳自身的表面与层级。</zh-CN><en>WeChat custom-component style isolation may block inheritance of app-level tokens; the following conditional literal values match `uni.scss` defaults and supplement only the page shell's own surfaces and layers.</en></lang> */
/* #ifdef MP-WEIXIN */
.runtime-page-shell { background: #f7f9fc; }
.runtime-page-shell__header { z-index: 20; background: #ffffff; }
.runtime-page-shell__status-bar { background: #ffffff; }
.runtime-page-shell__back { color: #0047ab; }
/* #endif */
</style>
