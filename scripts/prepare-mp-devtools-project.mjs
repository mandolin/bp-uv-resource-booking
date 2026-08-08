/**
 * <lang><zh-CN>准备生成后的微信开发者工具私有项目配置：只关闭会误排除已引用自定义组件的“过滤无依赖文件”，并保留工具写入的其他本机偏好。</zh-CN><en>Prepares the generated WeChat Developer Tools private project configuration: disables only “filter dependency-free files,” which can wrongly exclude referenced custom components, while preserving other machine-local preferences written by the tool.</en></lang>
 * @lang zh-CN 本脚本只写入固定 `dist/build/mp-weixin/project.private.config.json`；它不读取源码以外目录、账号、凭据、环境变量或微信全局配置。
 * @lang en This script writes only fixed `dist/build/mp-weixin/project.private.config.json`; it reads no out-of-source directory, account, credential, environment variable, or global WeChat configuration.
 */

// <lang><zh-CN>只使用 Node 内建文件与路径 API，避免为生成物配置引入新的 runtime dependency。</zh-CN><en>Use only Node built-in file and path APIs, avoiding a new runtime dependency for generated-artifact configuration.</en></lang>
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// <lang><zh-CN>从脚本 URL 固定解析 BP 根与唯一微信输出配置，不接受 CLI 提供的任意路径。</zh-CN><en>Resolve the BP root and sole WeChat output configuration from the script URL, accepting no arbitrary CLI-supplied path.</en></lang>
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const privateConfigurationPath = resolve(projectRoot, 'dist/build/mp-weixin/project.private.config.json');

/**
 * <lang><zh-CN>读取已有开发者工具私有配置；首次构建尚无文件时返回空对象。</zh-CN><en>Reads the existing Developer Tools private configuration and returns an empty object when the first build has no file yet.</en></lang>
 * @returns {Promise<Record<string, unknown>>} <lang><zh-CN>可保留并更新的 JSON object。</zh-CN><en>JSON object that can be preserved and updated.</en></lang>
 * @lang zh-CN 只有 `ENOENT` 被解释为首次构建；无效 JSON、权限或其他 I/O 错误必须使构建失败。
 * @lang en Only `ENOENT` is interpreted as a first build; invalid JSON, permission failures, and other I/O errors must fail the build.
 */
async function readPrivateConfiguration() {
  try {
    // <lang><zh-CN>读取固定 UTF-8 JSON，并让解析错误保持可发现。</zh-CN><en>Read fixed UTF-8 JSON and keep parse failures discoverable.</en></lang>
    return JSON.parse(await readFile(privateConfigurationPath, 'utf8'));
  } catch (error) {
    // <lang><zh-CN>首次构建没有本机 private 文件时使用最小空配置；不吞掉其他错误。</zh-CN><en>Use a minimal empty configuration when a first build has no machine-local private file; swallow no other error.</en></lang>
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
}

/**
 * <lang><zh-CN>关闭会误删 `RuntimePageShell` 的开发期无依赖文件过滤。</zh-CN><en>Disables the development-time dependency-free-file filter that can wrongly remove `RuntimePageShell`.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>配置完成一次完整 UTF-8 文件写入后 resolve。</zh-CN><en>Resolves after configuration is serialized into one complete UTF-8 file write.</en></lang>
 * @lang zh-CN 除固定 Boolean key 外保留顶层字段和其他 setting；本步骤不更改 appid、libVersion、condition 或账号状态。
 * @lang en Preserve top-level fields and other settings except the fixed Boolean key; this step changes no appid, libVersion, condition, or account state.
 */
async function prepareDeveloperToolsConfiguration() {
  // <lang><zh-CN>先读取工具现有私有偏好，避免用模板覆盖维护者本机选择。</zh-CN><en>Read existing tool-private preferences first, avoiding replacement of maintainer-local choices with a template.</en></lang>
  const currentConfiguration = await readPrivateConfiguration();

  // <lang><zh-CN>浅复制顶层与 setting，仅把误判开关设为 false。</zh-CN><en>Shallow-copy the top level and settings, changing only the misclassification switch to false.</en></lang>
  const nextConfiguration = {
    ...currentConfiguration,
    setting: {
      ...(currentConfiguration.setting ?? {}),
      ignoreDevUnusedFiles: false
    }
  };

  // <lang><zh-CN>写回稳定的两空格 JSON 和尾随换行，便于人工核对当前生成物。</zh-CN><en>Write stable two-space JSON with a trailing newline for human inspection of the current artifact.</en></lang>
  await writeFile(privateConfigurationPath, `${JSON.stringify(nextConfiguration, null, 2)}\n`, 'utf8');
}

// <lang><zh-CN>执行唯一受限的生成物配置步骤；失败保留非零退出码给 pnpm。</zh-CN><en>Execute the sole bounded artifact-configuration step; failures retain a nonzero exit code for pnpm.</en></lang>
await prepareDeveloperToolsConfiguration();
