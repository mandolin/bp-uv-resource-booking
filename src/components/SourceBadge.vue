<!--
@component SourceBadge
@lang zh-CN 呈现项目 adapter 已允许公开的 source authority 与降级事实，并从共享 runtime locale 获取展示文本；不读取 provider、URL、HTTP、token、请求或用户数据。
@lang en Presents source authority and degradation facts already allowed by project adapter and obtains display copy from shared runtime locale; it reads no provider, URL, HTTP, token, request, or user data.
-->
<template>
  <!-- <lang><zh-CN>badge 只显示有限 authority 文案；降级时追加明确提示，不隐藏 source 状态。</zh-CN><en>Badge displays only finite authority copy and adds an explicit notice when degraded rather than hiding source state.</en></lang> -->
  <view class="source-badge">
    <!-- <lang><zh-CN>authority 复用 HIA-uView 的有限 tag 视觉，不在 BP 创建第二套 source 色板；文字始终是主语义。</zh-CN><en>Authority reuses the finite HIA-uView tag treatment and creates no second source color palette in the BP; text always carries the primary meaning.</en></lang> -->
    <u-tag :text="label" :tone="badgeTone" appearance="outline" size="small" shape="pill" :clickable="false" />
    <text v-if="props.source.degradedReason" class="source-badge__detail">{{ runtimeLocale.t('source.degraded') }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { useRuntimeLocale } from '../localization/runtime-locale.mjs';

// <lang><zh-CN>组件名只表示展示型 source badge，不表示 source selector 或 network status service。</zh-CN><en>Component name denotes a presentational source badge only and not a source selector or network-status service.</en></lang>
defineOptions({ name: 'source-badge' });

// <lang><zh-CN>仅接收 adapter 已受限的 source metadata；缺失时使用 local-safe 默认展示。</zh-CN><en>Receive only adapter-bounded source metadata and use local-safe display default when missing.</en></lang>
const props = defineProps({
  source: {
    type: Object,
    default: () => ({ authority: 'local', degradedReason: null })
  }
});

// <lang><zh-CN>读取唯一共享 locale store，保证 badge 与页面正文、应用自管标题和 tab 不会出现混排语言。</zh-CN><en>Read the sole shared locale store, keeping the badge aligned with page body copy, application-owned titles, and tabs without mixed languages.</en></lang>
const runtimeLocale = useRuntimeLocale();

// <lang><zh-CN>未知 authority 不被猜测为远端或在线；以 local-safe 呈现避免错误承诺。</zh-CN><en>An unknown authority is not guessed as remote or online and is rendered local-safe to avoid a false claim.</en></lang>
const safeAuthority = computed(() => ['local', 'virtual', 'remote'].includes(props.source.authority) ? props.source.authority : 'local');

// <lang><zh-CN>文字由有限 authority allowlist 对应的资源 key 生成，未转发 source ID、URL 或内部原因。</zh-CN><en>Copy derives from resource keys corresponding to a finite authority allowlist and forwards no source ID, URL, or internal reason.</en></lang>
const label = computed(() => runtimeLocale.t(`source.${safeAuthority.value}`));

// <lang><zh-CN>tone 与公共 outline appearance 只为有限 authority 提供辅助层级；它们不编码 online、可信度或写入成功等未验证语义。</zh-CN><en>Tone and the public outline appearance provide only supporting hierarchy for finite authorities; they encode no unverified semantics such as online status, trust, or write success.</en></lang>
const badgeTone = computed(() => safeAuthority.value === 'virtual' ? 'accent' : safeAuthority.value === 'remote' ? 'neutral' : 'primary');
</script>

<style scoped>
/* <lang><zh-CN>容器仅排列公共 tag 与降级文字，不复制 tag 的颜色、边框、圆角或交互语义。</zh-CN><en>The container only arranges the public tag and degradation copy; it does not duplicate the tag's colors, border, radius, or interaction semantics.</en></lang> */
.source-badge { display: inline-flex; gap: 6px; align-items: center; min-height: 26px; }
.source-badge__detail { color: var(--u-sys-color-text-secondary); }
</style>
