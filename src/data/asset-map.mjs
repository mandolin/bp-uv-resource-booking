/**
 * <lang><zh-CN>已登记业务记录与页面 presentation 用途到原创静态图片的有限映射；此模块只绑定经过登记的项目内资产，不读取外部 URL 或动态图片来源。</zh-CN><en>Finite mappings from registered business records and page-presentation uses to original static images; this module binds only registered in-project assets and reads no external URL or dynamic image source.</en></lang>
 * @lang zh-CN 图片的生成 prompt、用途和版本记录在仓内资产台账；映射值不是业务数据、用户照片或第三方授权声明。
 * @lang en Image prompt, use, and version are recorded in the repository asset ledger; mapped values are neither business data, user photos, nor a third-party license assertion.
 */

// <lang><zh-CN>显式导入四张原创 venue 图片，使 H5/mp-weixin bundler 都能追踪静态资源。</zh-CN><en>Explicitly import four original venue images so both H5/mp-weixin bundlers can track static resources.</en></lang>
import riversideSportsHallImage from '../static/images/venue-riverside-sports-hall-v1.png';
import cloudlineArtsCenterImage from '../static/images/venue-cloudline-arts-center-v1.png';
import harborReadingHallImage from '../static/images/venue-harbor-reading-hall-v1.png';
import newtownWorkshopImage from '../static/images/venue-newtown-workshop-v1.png';
// <lang><zh-CN>首页 Hero 是独立 presentation 资产，不复用或冒充任何 local JSON 场馆记录。</zh-CN><en>The Home hero is a separate presentation asset and neither reuses nor masquerades as any local-JSON venue record.</en></lang>
import homeCivicReadingAtriumImage from '../static/images/home-hero-civic-reading-atrium-v1.png';

/**
 * <lang><zh-CN>可公开呈现的 venue image ID 与静态 asset URL 映射。</zh-CN><en>Mapping of publicly presentable venue-image IDs to static asset URLs.</en></lang>
 * @lang zh-CN 键是 local JSON 的有限 allowlist；不存在名称、URL、文件系统路径或 remote fallback。
 * @lang en Keys are a finite allowlist from local JSON; no name, URL, file-system path, or remote fallback exists.
 */
const imageById = Object.freeze({
  'riverside-sports-hall': riversideSportsHallImage,
  'cloudline-arts-center': cloudlineArtsCenterImage,
  'harbor-reading-hall': harborReadingHallImage,
  'newtown-workshop': newtownWorkshopImage
});

/**
 * <lang><zh-CN>页面级展示图片的有限 ID 到静态 asset URL 映射。</zh-CN><en>Finite mapping from page-presentation image IDs to static asset URLs.</en></lang>
 * @lang zh-CN 此映射与 venue 业务记录隔离；页面只能选择已登记的第一方展示用途，不接受 URL、路径或动态 manifest。
 * @lang en This mapping is isolated from venue business records; pages can select only registered first-party presentation uses and accept no URL, path, or dynamic manifest.
 */
const presentationImageById = Object.freeze({
  'home-civic-reading-atrium': homeCivicReadingAtriumImage
});

/**
 * <lang><zh-CN>读取一个 venue 的原创静态图片 URL。</zh-CN><en>Reads the original static image URL for one venue.</en></lang>
 * @param {string} imageId <lang><zh-CN>local JSON 已登记 image ID。</zh-CN><en>Image ID registered in local JSON.</en></lang>
 * @returns {string|null} <lang><zh-CN>已映射 asset URL，未知 ID 时为 null。</zh-CN><en>Mapped asset URL, or null for an unknown ID.</en></lang>
 * @lang zh-CN 未知 ID 不触发网络图片、目录扫描或默认第三方图；页面应显示自己的无图状态。
 * @lang en An unknown ID triggers no network image, directory scan, or default third-party image; the page should show its own no-image state.
 */
export function getVenueImage(imageId) {
  // <lang><zh-CN>只读取冻结 allowlist 的 own key，避免原型属性或任意输入成为资源路径。</zh-CN><en>Read only an own key from the frozen allowlist, preventing prototype properties or arbitrary input from becoming an asset path.</en></lang>
  return Object.hasOwn(imageById, imageId) ? imageById[imageId] : null;
}

/**
 * <lang><zh-CN>读取一个已登记页面用途的原创展示图片 URL。</zh-CN><en>Reads an original presentation-image URL registered for one page use.</en></lang>
 * @param {string} imageId <lang><zh-CN>第一方源码声明的 presentation image ID。</zh-CN><en>Presentation-image ID declared by first-party source.</en></lang>
 * @returns {string|null} <lang><zh-CN>已映射 asset URL，未知 ID 时为 null。</zh-CN><en>Mapped asset URL, or null for an unknown ID.</en></lang>
 * @lang zh-CN 未知 ID 不回退 venue 图片、网络资源或目录扫描，防止展示素材与领域事实混淆。
 * @lang en An unknown ID falls back to neither a venue image, a network resource, nor a directory scan, preventing presentation assets from being confused with domain facts.
 */
export function getPresentationImage(imageId) {
  // <lang><zh-CN>只读取冻结 presentation allowlist 的 own key，避免任意输入成为 bundler 或文件系统路径。</zh-CN><en>Read only an own key from the frozen presentation allowlist, preventing arbitrary input from becoming a bundler or file-system path.</en></lang>
  return Object.hasOwn(presentationImageById, imageId) ? presentationImageById[imageId] : null;
}
