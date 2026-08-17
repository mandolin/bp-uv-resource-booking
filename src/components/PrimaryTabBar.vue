<!--
@component PrimaryTabBar
@lang zh-CN H5 主导航适配器：把四个第一方固定页面、本地化标签与登记图标组合到 HIA-uView `UTabbar`，并把选择意图交回应用路由边界；不接管微信 official custom tabBar、业务状态、身份或动态导航配置。
@lang en H5 primary-navigation adapter: composes four fixed first-party pages, localized labels, and registered icons into HIA-uView `UTabbar`, then returns selection intent to the application routing boundary; it does not take over WeChat's official custom tab bar, business state, identity, or dynamic navigation configuration.
-->
<template>
  <!-- <lang><zh-CN>固定外壳只为 H5 提供底部定位与安全区；组件自身仍通过 HIA-uView 公共 API 呈现四项 tab。</zh-CN><en>The fixed shell supplies only H5 bottom positioning and safe-area space; the component itself still presents all four tabs through the public HIA-uView API.</en></lang> -->
  <view class="primary-tab-bar">
    <!-- <lang><zh-CN>受控 selected value、有限 items 与 change intent 是唯一输入输出；UTabbar 不接收 URL，也不执行路由。</zh-CN><en>The controlled selected value, finite items, and change intent are the sole inputs and output; UTabbar receives no URL and performs no routing.</en></lang> -->
    <u-tabbar :model-value="props.currentPage" :items="tabItems" @change="handleTabChange" />
  </view>
</template>

<script setup>
// <lang><zh-CN>computed 只投影当前 runtime locale；当前页 prop 始终是唯一选中事实，不建立第二个导航 store。</zh-CN><en>Computed projects only the current runtime locale; the current-page prop remains the sole selection fact and no second navigation store is created.</en></lang>
import { computed } from 'vue';
// <lang><zh-CN>八张 PNG 均由仓内 27 单位 SVG 直接栅格为 27×27；Vite import 保留 GitHub Pages base，不拼接根路径。</zh-CN><en>All eight PNGs are rasterized directly at 27×27 from repository-owned 27-unit SVGs; Vite imports preserve the GitHub Pages base without concatenating root paths.</en></lang>
import discoverActiveIcon from '../static/icons/tab-discover-active.png';
import discoverIcon from '../static/icons/tab-discover.png';
import homeActiveIcon from '../static/icons/tab-home-active.png';
import homeIcon from '../static/icons/tab-home.png';
import profileActiveIcon from '../static/icons/tab-profile-active.png';
import profileIcon from '../static/icons/tab-profile.png';
import reservationsActiveIcon from '../static/icons/tab-reservations-active.png';
import reservationsIcon from '../static/icons/tab-reservations.png';
// <lang><zh-CN>应用壳模型是固定页面 value、标签顺序和导航 allowlist 的唯一所有者。</zh-CN><en>The application-shell model is the sole owner of fixed page values, label order, and the navigation allowlist.</en></lang>
import { createPrimaryTabItems, isPrimaryPage, openPrimaryPage } from '../localization/runtime-chrome.mjs';
// <lang><zh-CN>共享 runtime locale 使标签随个人信息页选择即时切换，且不出现中英混排。</zh-CN><en>The shared runtime locale lets labels switch immediately with the Profile selection and prevents mixed-language chrome.</en></lang>
import { useRuntimeLocale } from '../localization/runtime-locale.mjs';

// <lang><zh-CN>稳定组件名只用于调试和生成物识别，不注册全局路由或 service。</zh-CN><en>The stable component name serves only debugging and artifact identification and registers no global router or service.</en></lang>
defineOptions({ name: 'PrimaryTabBar' });

/**
 * <lang><zh-CN>当前主页面由 RuntimePageShell 的第一方调用点提供。</zh-CN><en>The current primary page is supplied by the first-party RuntimePageShell call site.</en></lang>
 * @lang zh-CN validator 只接受应用壳 allowlist，拒绝 route query、URL 与动态 manifest。
 * @lang en The validator accepts only the application-shell allowlist and rejects route queries, URLs, and dynamic manifests.
 */
const props = defineProps({
  // <lang><zh-CN>四个固定 value 之一；每个一级页面以字面量声明自己的值。</zh-CN><en>One of four fixed values; each primary page declares its own literal.</en></lang>
  currentPage: { type: String, required: true, validator: isPrimaryPage }
});

// <lang><zh-CN>唯一共享 locale surface 提供当前语言的四项可见 label。</zh-CN><en>The sole shared locale surface supplies the four visible labels in the current language.</en></lang>
const runtimeLocale = useRuntimeLocale();

/**
 * <lang><zh-CN>每个固定页面 value 对应的普通/选中图标对。</zh-CN><en>Regular/active icon pair for each fixed page value.</en></lang>
 * @lang zh-CN locator 由 bundler import 生成且全部来自仓内 allowlist；不接收用户、业务或远端输入。
 * @lang en Locators are produced by bundler imports and all come from an in-repository allowlist; they accept no user, business, or remote input.
 */
const iconPairByPage = Object.freeze({
  home: Object.freeze({ icon: homeIcon, activeIcon: homeActiveIcon }),
  discover: Object.freeze({ icon: discoverIcon, activeIcon: discoverActiveIcon }),
  reservations: Object.freeze({ icon: reservationsIcon, activeIcon: reservationsActiveIcon }),
  profile: Object.freeze({ icon: profileIcon, activeIcon: profileActiveIcon })
});

// <lang><zh-CN>locale 变化时重新投影 label；静态图标对保持不变，结果不携带 URL，路由仍只由应用 helper 拥有。</zh-CN><en>A locale change reprojects labels while static icon pairs remain unchanged; the result carries no URL and routing remains owned only by the application helper.</en></lang>
const tabItems = computed(() => createPrimaryTabItems((messageKey) => runtimeLocale.t(messageKey)).map((item) => Object.freeze({
  ...item,
  ...iconPairByPage[item.value]
})));

/**
 * @lang zh-CN 把 UTabbar 的有限选择意图投影到应用拥有的固定 `switchTab` 路由。
 * @lang en Projects UTabbar's bounded selection intent into the application-owned fixed `switchTab` route.
 * @param {unknown} pageValue <lang><zh-CN>UTabbar 从固定 items 返回的候选 value。</zh-CN><en>Candidate value returned by UTabbar from the fixed items.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值；选中态只在目标页面真正成为 current prop 后变化。</zh-CN><en>No return value; selection changes only after the destination page actually becomes the current prop.</en></lang>
 */
function handleTabChange(pageValue) {
  // <lang><zh-CN>未知值和重复选择保持零路由；受控 model 同样不会改变可见高亮。</zh-CN><en>An unknown or repeated selection produces no route; the controlled model likewise keeps the visible highlight unchanged.</en></lang>
  if (!isPrimaryPage(pageValue) || pageValue === props.currentPage) return;

  // <lang><zh-CN>只提交受限导航意图；同步或异步失败均留下真实当前页高亮，不伪造已完成切换。</zh-CN><en>Submit only the bounded navigation intent; synchronous or asynchronous failure leaves the actual current page highlighted and never fabricates a completed switch.</en></lang>
  openPrimaryPage(pageValue);
}
</script>

<style scoped>
/* <lang><zh-CN>H5 外壳无外边距固定在视口底边；白色安全区与 UTabbar 的同色表面连成一个连续区域。</zh-CN><en>The H5 shell stays fixed to the viewport bottom without outer margins; its white safe area forms one continuous surface with UTabbar.</en></lang> */
.primary-tab-bar { position: fixed; z-index: var(--bp-shell-tabbar-z, 30); right: 0; bottom: 0; left: 0; box-sizing: border-box; margin: 0; padding: 0 0 env(safe-area-inset-bottom); background: var(--u-comp-tabbar-surface, #ffffff); font-family: var(--bp-font-body, "HIA-uView BP Sans SC", "Source Han Sans SC", "Noto Sans SC", sans-serif); }
</style>
