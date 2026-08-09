<!--
@lang zh-CN 资源详情页呈现一个 local provider 已受限返回的资源、场馆和可预约时段，并只发出继续预约的本地页面导航；它不承诺实时库存、定位、地图、价格、支付或远端读取。
@lang en Resource Detail presents a resource, venue, and bookable slots already bounded by the local provider and emits only local page navigation to continue booking; it promises no live inventory, location, map, price, payment, or remote read.
-->
<template>
  <!-- <lang><zh-CN>provider 直接包住 detail 页面，令 UI 的受限 locale context 与领域值投影一致。</zh-CN><en>The provider directly wraps the detail page, aligning UI constrained locale context with domain-value projection.</en></lang> -->
  <u-config-provider :locale="runtimeLocale.locale.value">
    <!-- <lang><zh-CN>详情页使用带本地化返回文字的应用自管 navbar，不显示主页面 tabbar。</zh-CN><en>Detail uses the application-owned navbar with localized back copy and displays no primary-page tabbar.</en></lang> -->
    <runtime-page-shell :title="runtimeLocale.t('title.detail')" back>
      <view class="resource-detail-page">
      <!-- <lang><zh-CN>根节点按 detail 的有限 phase 选择静态 loading、可恢复 failure 或已加载详情。</zh-CN><en>The root selects static loading, recoverable failure, or loaded detail from the detail's finite phase.</en></lang> -->
      <u-loading-page v-if="demo.detailPhase.value === 'loading'" :message="runtimeLocale.t('detail.loading')" />
      <view v-else-if="demo.detailPhase.value === 'failure'" class="resource-detail-page__state">
        <source-badge :source="demo.catalogSource.value" />
        <u-empty :title="runtimeLocale.t('detail.failureTitle')" :description="runtimeLocale.localize(demo.detailFailure.value?.message) || runtimeLocale.t('common.notAvailable')" :action-text="runtimeLocale.t('common.retry')" @action="retryDetail" />
        <u-button :label="runtimeLocale.t('common.goDiscover')" variant="secondary" block @click="backToDiscover" />
      </view>
      <view v-else-if="demo.detailPhase.value === 'ready' && detail.kind === 'detail'" class="resource-detail-page__content">
        <!-- <lang><zh-CN>显式尺寸容器拥有详情封面的几何，内部 HIA-uView `UImage fluid` 只负责填充；这样避免百分比高度覆盖页面类后因缺少父高度而折叠。</zh-CN><en>An explicitly sized container owns the detail-cover geometry while the inner HIA-uView `UImage fluid` only fills it; this prevents percentage height from overriding the page class and collapsing without a parent height.</en></lang> -->
        <view class="resource-detail-page__image-frame">
          <u-image :src="venueImage || ''" :alt="venueName" fluid />
        </view>

        <!-- <lang><zh-CN>资源身份区把主标题、来源与静态元信息放在封面之后，视觉层级与已批准详情设计一致，但不虚构开放时间、距离或实时库存。</zh-CN><en>The resource identity region places the main title, source, and static metadata after the cover, matching the approved detail hierarchy without fabricating opening hours, distance, or live inventory.</en></lang> -->
        <view class="resource-detail-page__identity">
          <view class="resource-detail-page__heading-row">
            <view class="resource-detail-page__heading-copy">
              <text class="resource-detail-page__title">{{ venueName }} · {{ resourceName }}</text>
              <text class="resource-detail-page__summary">{{ venueSummary }}</text>
            </view>
            <source-badge :source="detail.source" />
          </view>
          <view class="resource-detail-page__metadata">
            <view class="resource-detail-page__meta-item"><u-icon name="◉" size="small" tone="neutral" /><text>{{ capacityLabel }}</text></view>
            <view class="resource-detail-page__meta-item"><u-icon name="◇" size="small" tone="neutral" /><text>{{ resourceType }}</text></view>
            <view class="resource-detail-page__meta-item"><u-icon name="⌖" size="small" tone="neutral" /><text>{{ districtName }}</text></view>
          </view>
        </view>

        <!-- <lang><zh-CN>日期和时段只来自当前资源的有限 local allowlist；页面拥有选择，HIA-uView 按钮仅呈现和发出 click 意图。</zh-CN><en>Dates and times come only from the current resource's finite local allowlist; the page owns selection while HIA-uView buttons only present and emit click intent.</en></lang> -->
        <view class="resource-detail-page__selection-section">
          <view class="resource-detail-page__section-heading">
            <text class="resource-detail-page__section-title">{{ runtimeLocale.t('detail.availableDates') }}</text>
            <text class="resource-detail-page__section-help">{{ runtimeLocale.t('detail.chooseDate') }}</text>
          </view>
          <view class="resource-detail-page__choices resource-detail-page__choices--dates">
            <u-button v-for="date in availableDates" :key="date.value" class="resource-detail-page__date-button" :label="date.label" :variant="selectedDate === date.value ? 'primary' : 'secondary'" size="sm" @click="selectDate(date.value)" />
          </view>
        </view>

        <view class="resource-detail-page__selection-section">
          <view class="resource-detail-page__section-heading">
            <text class="resource-detail-page__section-title">{{ runtimeLocale.t('detail.availableSlots') }}</text>
            <text class="resource-detail-page__section-help">{{ runtimeLocale.t('detail.chooseSlot') }}</text>
          </view>
          <view class="resource-detail-page__choices resource-detail-page__choices--slots">
            <u-button v-for="slot in detail.resource.availableSlots" :key="slot" class="resource-detail-page__slot-button" :label="runtimeLocale.t('detail.bookableSlot', { slot })" :variant="selectedTime === slot ? 'primary' : 'secondary'" size="sm" @click="selectTime(slot)" />
          </view>
        </view>

        <u-notice v-if="selectionFailure" visible tone="error" :message="runtimeLocale.localize(selectionFailure.message) || runtimeLocale.t('common.notAvailable')" />
        <u-button :label="runtimeLocale.t('detail.continueBooking')" block size="lg" :disabled="!selectedDate || !selectedTime" @click="continueBooking" />

        <!-- <lang><zh-CN>可选增强与核心预约区分隔；当前只披露未启用状态，不启动公共 API、定位或隐式 fallback。</zh-CN><en>Optional enhancements are separated from core booking; the current view only discloses their disabled state and starts no public API, location, or implicit fallback.</en></lang> -->
        <view class="resource-detail-page__enhancements">
          <u-card :title="runtimeLocale.t('detail.weatherTitle')" :sub-title="runtimeLocale.t('detail.optionalEnhancement')" :padding="12">
            <text class="resource-detail-page__enhancement-copy">{{ runtimeLocale.t('detail.weatherUnavailable') }}</text>
          </u-card>
          <u-card :title="runtimeLocale.t('detail.holidayTitle')" :sub-title="runtimeLocale.t('detail.optionalEnhancement')" :padding="12">
            <text class="resource-detail-page__enhancement-copy">{{ runtimeLocale.t('detail.holidayUnavailable') }}</text>
          </u-card>
        </view>
        <u-notice visible tone="info" :message="runtimeLocale.t('detail.bookingNotice')" />
      </view>
      <u-empty v-else :title="runtimeLocale.t('detail.emptyTitle')" :description="runtimeLocale.t('detail.emptyDescription')" :action-text="runtimeLocale.t('common.goDiscover')" @action="backToDiscover" />
      </view>
    </runtime-page-shell>
  </u-config-provider>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import RuntimePageShell from '../../components/RuntimePageShell.vue';
import SourceBadge from '../../components/SourceBadge.vue';
import { getVenueImage } from '../../data/asset-map.mjs';
import { openPrimaryPage } from '../../localization/runtime-chrome.mjs';
import { useRuntimeLocale } from '../../localization/runtime-locale.mjs';
import { useBookingDemo } from '../../state/booking-demo.mjs';

// <lang><zh-CN>详情页只读取共享 demo 的有限 detail surface 与 action。</zh-CN><en>Detail reads only the shared demo's finite detail surface and action.</en></lang>
const demo = useBookingDemo();

// <lang><zh-CN>读取唯一共享 locale，禁止 detail 模板直接从多语言 domain object 取固定语言字段。</zh-CN><en>Read the sole shared locale, prohibiting detail template from taking a fixed-language field directly from a multilingual domain object.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>模板只在 ready branch 消费此 detail；缺失时空对象保持 computed 无副作用。</zh-CN><en>The template consumes this detail only in the ready branch; an empty object on absence keeps computed values side-effect-free.</en></lang>
const detail = computed(() => demo.selectedDetail.value ?? {});

// <lang><zh-CN>日期和时段值只在详情成功后从其有限 allowlist 初始化；空值使缺失详情不能创建草稿。</zh-CN><en>Date and slot values initialize only from finite allowlists after detail succeeds; empty values prevent creating a draft without detail.</en></lang>
const selectedDate = ref('');
const selectedTime = ref('');

// <lang><zh-CN>路由资源 ID 只保存为受控重试输入；详情展示仍只信任 state/provider 的 terminal outcome。</zh-CN><en>The route resource ID is retained only as controlled retry input; detail presentation still trusts only the state/provider terminal outcome.</en></lang>
const routeResourceId = ref('');

// <lang><zh-CN>详情页保留最近一次草稿校验失败，以便用户在原地调整选择而不是误以为已经预约。</zh-CN><en>The detail page retains the most recent draft-validation failure so a user can adjust selection in place rather than believe a booking already exists.</en></lang>
const selectionFailure = ref(null);

/**
 * <lang><zh-CN>在详情切换后用该资源的首个有限日期和时段同步页面选择。</zh-CN><en>Synchronizes page selection to the resource’s first finite date and slot after detail changes.</en></lang>
 * @param {object} nextDetail <lang><zh-CN>state 提供的最新 detail outcome 或空对象。</zh-CN><en>Latest detail outcome or empty object supplied by state.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 同步不请求 availability，也不保留前一资源的 selection；每个资源需显式以自己的声明值重新开始。
 * @lang en Synchronization requests no availability and retains no prior resource selection; every resource explicitly restarts from its own declared values.
 */
function synchronizeBookingSelection(nextDetail) {
  // <lang><zh-CN>成功 detail 使用首项，其他 phase 清空选择，确保 disabled 按钮反映真实页面状态。</zh-CN><en>A successful detail uses first entries while other phases clear selection, ensuring disabled button reflects actual page state.</en></lang>
  selectedDate.value = nextDetail.kind === 'detail' ? nextDetail.resource.availableDates[0] ?? '' : '';
  selectedTime.value = nextDetail.kind === 'detail' ? nextDetail.resource.availableSlots[0] ?? '' : '';

  // <lang><zh-CN>新详情没有继承旧草稿失败，避免错误消息跨资源显示。</zh-CN><en>A new detail inherits no prior draft failure, avoiding error copy displayed across resources.</en></lang>
  selectionFailure.value = null;
}

// <lang><zh-CN>state 更新是资源切换的唯一选择同步入口；immediate 覆盖页面首次加载前后的两种时序。</zh-CN><en>A state update is the sole selection-synchronization entry for resource changes; immediate covers timing both before and after first page load.</en></lang>
watch(detail, synchronizeBookingSelection, { immediate: true });

// <lang><zh-CN>所有可见领域字段经同一 `localize` helper 选择语言与 fallback。</zh-CN><en>Every visible domain field selects language and fallback through the same `localize` helper.</en></lang>
const resourceName = computed(() => runtimeLocale.localize(detail.value.resource?.name));
const resourceType = computed(() => runtimeLocale.localize(detail.value.resource?.type));
const venueName = computed(() => runtimeLocale.localize(detail.value.venue?.name));
const districtName = computed(() => runtimeLocale.localize(detail.value.venue?.district));
const venueSummary = computed(() => runtimeLocale.localize(detail.value.venue?.summary));

// <lang><zh-CN>日期标签使用共享 locale 格式化当前资源 JSON 已声明的 ISO 值，不生成或查询日历日期。</zh-CN><en>Date labels format only ISO values declared by current resource JSON through shared locale and generate or query no calendar date.</en></lang>
const availableDates = computed(() => detail.value.kind === 'detail'
  ? detail.value.resource.availableDates.map((value) => Object.freeze({ value, label: runtimeLocale.formatDate(value) }))
  : []);

// <lang><zh-CN>容量标签只投影当前 detail 的数值，不把容量解释为剩余名额或实时可用量。</zh-CN><en>The capacity label projects only the current detail's numeric value and never interprets capacity as remaining places or live availability.</en></lang>
const capacityLabel = computed(() => runtimeLocale.t('resource.capacity', { capacity: detail.value.resource?.capacity ?? 0 }));

// <lang><zh-CN>图片只经已登记 asset map 读取，未知 ID 不会变成网络或文件路径。</zh-CN><en>The image is read only through the registered asset map; an unknown ID cannot become a network or file path.</en></lang>
const venueImage = computed(() => detail.value.venue ? getVenueImage(detail.value.venue.imageId) : null);

/**
 * <lang><zh-CN>读取路由中明确传入的资源 ID。</zh-CN><en>Reads the explicitly supplied resource ID from the route.</en></lang>
 * @param {Record<string, unknown>} query <lang><zh-CN>UniApp onLoad 提供的页面 query。</zh-CN><en>Page query supplied by UniApp onLoad.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>详情状态稳定后 resolve。</zh-CN><en>Resolves after detail state stabilizes.</en></lang>
 * @lang zh-CN 非字符串 ID 交由 project adapter 映射为受限 failure，不解析额外参数。
 * @lang en A non-string ID is mapped to a bounded failure by the project adapter; no extra parameter is parsed.
 */
async function readRouteResource(query) {
  // <lang><zh-CN>只传递有限 resourceId 字段，不接受 endpoint、source、token 或动态配置。</zh-CN><en>Pass only the finite resourceId field and accept no endpoint, source, token, or dynamic configuration.</en></lang>
  routeResourceId.value = typeof query?.resourceId === 'string' ? query.resourceId : '';
  await demo.loadResourceDetail(routeResourceId.value);
}

/**
 * <lang><zh-CN>重试当前路由声明的资源详情读取。</zh-CN><en>Retries resource-detail read declared by the current route.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>本次受限读取稳定后 resolve。</zh-CN><en>Resolves after this bounded read stabilizes.</en></lang>
 * @lang zh-CN 重试只复用原始有限资源 ID，不切换 source、不保留失效 detail，也不把错误误作成功。
 * @lang en Retry reuses only original finite resource ID, switches no source, retains no stale detail, and never treats error as success.
 */
async function retryDetail() {
  // <lang><zh-CN>state 仍负责取消、晚到结果与失败映射；页面不直接调用 provider。</zh-CN><en>State still owns cancellation, late results, and failure mapping; page calls no provider directly.</en></lang>
  await demo.loadResourceDetail(routeResourceId.value);
}

/**
 * <lang><zh-CN>进入本地预约确认页。</zh-CN><en>Enters local booking confirmation.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 详情已在共享受限 state 中，路由不复制资源对象、source 或业务字段。
 * @lang en Detail already exists in shared bounded state; routing copies no resource object, source, or business field.
 */
/**
 * <lang><zh-CN>选择当前资源已声明的一个日期。</zh-CN><en>Selects one date declared by current resource.</en></lang>
 * @param {string} date <lang><zh-CN>当前按钮绑定的有限 ISO 日期。</zh-CN><en>Finite ISO date bound by current button.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 选择变化不启动读取、写入或库存预留；它只更新详情页本地草稿候选。
 * @lang en Changing selection starts no read, write, or inventory hold; it updates only local draft candidate on detail.
 */
function selectDate(date) {
  // <lang><zh-CN>值来自当前按钮绑定的 finite local option，选择变化不启动读取或写入。</zh-CN><en>Value comes from current button’s finite local option; changing selection starts no read or write.</en></lang>
  selectedDate.value = date;
  selectionFailure.value = null;
}

/**
 * <lang><zh-CN>选择当前资源已声明的一个时段。</zh-CN><en>Selects one slot declared by current resource.</en></lang>
 * @param {string} time <lang><zh-CN>当前按钮绑定的有限时段。</zh-CN><en>Finite slot bound by current button.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN 选择变化不启动读取、写入或库存预留；预约仅在确认页经 Biz write boundary 提交。
 * @lang en Changing selection starts no read, write, or inventory hold; a booking submits only through Biz write boundary on confirmation.
 */
function selectTime(time) {
  // <lang><zh-CN>值来自当前按钮绑定的 finite local option，选择变化清除旧草稿失败。</zh-CN><en>Value comes from current button’s finite local option; a selection change clears prior draft failure.</en></lang>
  selectedTime.value = time;
  selectionFailure.value = null;
}

/**
 * <lang><zh-CN>验证详情页选择并进入本地确认页。</zh-CN><en>Validates detail-page selection and enters local confirmation.</en></lang>
 * @returns {void} <lang><zh-CN>验证成功时导航，否则保留当前页面的受限失败。</zh-CN><en>Navigates on successful validation; otherwise retains bounded failure on current page.</en></lang>
 * @lang zh-CN 该步骤只创建受限进程内草稿，不创建预约、请求、支付或库存预留。
 * @lang en This step creates only a bounded in-process draft and creates no booking, request, payment, or inventory hold.
 */
function continueBooking() {
  // <lang><zh-CN>先经共享 state 验证 detail 与两个 allowlist，不将日期/时段写进 route。</zh-CN><en>Validate detail and both allowlists through shared state first and write neither date nor slot into route.</en></lang>
  const outcome = demo.prepareLocalBooking(selectedDate.value, selectedTime.value);

  // <lang><zh-CN>失败留在当前详情页供用户调整，不能导航到一个无效确认流程。</zh-CN><en>Keep failure on current detail page for adjustment and never navigate to an invalid confirmation flow.</en></lang>
  if (outcome.kind === 'failure') {
    selectionFailure.value = outcome;
    return;
  }

  // <lang><zh-CN>草稿已验证后只执行本地页面导航，实际预约仍在确认页触发。</zh-CN><en>After draft validation, perform only local page navigation; the actual booking still starts on confirmation.</en></lang>
  uni.navigateTo({ url: '/pages/booking-confirm/index' });
}

/**
 * <lang><zh-CN>回到发现 tab。</zh-CN><en>Returns to the Discover tab.</en></lang>
 * @returns {void} <lang><zh-CN>无返回值。</zh-CN><en>No return value.</en></lang>
 * @lang zh-CN tab 导航不清除共享 local catalog，用户可回到原有显式分页位置。
 * @lang en Tab navigation does not clear shared local catalog, allowing return to existing explicit pagination position.
 */
function backToDiscover() {
  // <lang><zh-CN>使用应用壳固定主页面导航，而非浏览器 history、query 或外部 URL。</zh-CN><en>Use the application shell's fixed primary-page navigation rather than browser history, a query, or an external URL.</en></lang>
  openPrimaryPage('discover');
}

// <lang><zh-CN>onLoad 是唯一详情读取入口，页面不在 render、computed 或 watch 中自行发起读取。</zh-CN><en>onLoad is the sole detail-read entry; the page starts no read from render, computed, or watch.</en></lang>
onLoad(readRouteResource);

</script>

<style scoped>
/* <lang><zh-CN>详情页用紧凑的移动端纵向节奏还原已批准视觉板；所有颜色、字体族与组件表面均来自现有 token。</zh-CN><en>Detail restores the approved board through a compact mobile vertical rhythm; every color, font family, and component surface comes from existing tokens.</en></lang> */
.resource-detail-page { min-height: 100%; background: var(--u-sys-color-surface); }
.resource-detail-page__content { display: flex; gap: 18px; flex-direction: column; padding: 0 16px 28px; }
.resource-detail-page__image-frame { height: 236px; margin: 0 -16px; overflow: hidden; background: var(--u-sys-color-surface-subtle); }
.resource-detail-page__identity { display: flex; gap: 12px; flex-direction: column; }
.resource-detail-page__heading-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.resource-detail-page__heading-copy { display: flex; flex: 1; gap: 7px; flex-direction: column; min-width: 0; }
.resource-detail-page__title { color: var(--u-sys-color-text); font-family: var(--bp-font-display, "Source Han Serif SC", "Noto Serif SC", "Noto Serif CJK SC", serif); font-size: 25px; font-weight: 700; line-height: 1.25; }
.resource-detail-page__summary { color: var(--u-sys-color-text-secondary); font-size: 13px; line-height: 1.55; }
.resource-detail-page__metadata { display: flex; gap: 8px 16px; flex-wrap: wrap; }
.resource-detail-page__meta-item { display: flex; align-items: center; gap: 5px; color: var(--u-sys-color-text-secondary); font-size: 13px; }
.resource-detail-page__selection-section { display: flex; gap: 10px; flex-direction: column; }
.resource-detail-page__section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.resource-detail-page__section-title { color: var(--u-sys-color-text); font-size: 17px; font-weight: 700; }
.resource-detail-page__section-help { color: var(--u-sys-color-text-secondary); font-size: 12px; text-align: right; }
.resource-detail-page__choices { display: flex; gap: 8px; flex-wrap: wrap; }
.resource-detail-page__date-button { flex: 1 1 92px; }
.resource-detail-page__slot-button { flex: 1 1 128px; }
.resource-detail-page__enhancements { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.resource-detail-page__enhancement-copy { color: var(--u-sys-color-text-secondary); font-size: 12px; line-height: 1.5; }
.resource-detail-page__state { display: flex; gap: 12px; flex-direction: column; padding: 16px; }

/* <lang><zh-CN>窄屏把可选增强改为单列，避免英语文案压缩到不可读宽度。</zh-CN><en>On narrow screens, optional enhancements become one column so English copy is not compressed into an unreadable width.</en></lang> */
@media (max-width: 360px) {
  .resource-detail-page__enhancements { grid-template-columns: 1fr; }
}
</style>
