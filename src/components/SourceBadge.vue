<!--
@component SourceBadge
@lang zh-CN 呈现项目 adapter 已允许公开的 source authority 与降级事实，并从共享 runtime locale 获取展示文本；不读取 provider、URL、HTTP、token、请求或用户数据。
@lang en Presents source authority and degradation facts already allowed by project adapter and obtains display copy from shared runtime locale; it reads no provider, URL, HTTP, token, request, or user data.
-->
<template>
  <!-- <lang><zh-CN>badge 只显示有限 authority 文案；降级时追加明确提示，不隐藏 source 状态。</zh-CN><en>Badge displays only finite authority copy and adds an explicit notice when degraded rather than hiding source state.</en></lang> -->
  <view class="source-badge" :class="`source-badge--${safeAuthority}`">
    <text class="source-badge__label">{{ label }}</text>
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
</script>

<style scoped>
/* <lang><zh-CN>badge 使用深色文字与浅色表面，不把清透青实底搭配白字。</zh-CN><en>Badge uses dark text with light surface and never pairs solid clear cyan with white text.</en></lang> */
.source-badge { display: inline-flex; gap: 6px; align-items: center; min-height: 26px; padding: 0 10px; border-radius: 999px; font-size: 12px; color: var(--u-sys-color-text); background: var(--u-sys-color-surface-subtle); }
.source-badge--local { border: 1px solid #b4c8e8; }
.source-badge--virtual { background: #d9f2f8; }
.source-badge--remote { background: #e1ebf8; }
.source-badge__detail { color: var(--u-sys-color-text-secondary); }
</style>
