/**
 * <lang><zh-CN>local JSON venue record 到原创静态图片的有限映射；此模块只绑定经过登记的项目内资产，不读取外部 URL 或动态图片来源。</zh-CN><en>Finite mapping from local-JSON venue records to original static images; this module binds only registered in-project assets and reads no external URL or dynamic image source.</en></lang>
 * @lang zh-CN 图片的生成 prompt、用途和版本记录在仓内资产台账；映射值不是业务数据、用户照片或第三方授权声明。
 * @lang en Image prompt, use, and version are recorded in the repository asset ledger; mapped values are neither business data, user photos, nor a third-party license assertion.
 */

// <lang><zh-CN>显式导入两张原创 venue 图片，使 H5/mp-weixin bundler 都能追踪静态资源。</zh-CN><en>Explicitly import two original venue images so both H5/mp-weixin bundlers can track static resources.</en></lang>
import riversideSportsHallImage from '../static/images/venue-riverside-sports-hall-v1.png';
import cloudlineArtsCenterImage from '../static/images/venue-cloudline-arts-center-v1.png';
import harborReadingHallImage from '../static/images/venue-harbor-reading-hall-v1.png';
import newtownWorkshopImage from '../static/images/venue-newtown-workshop-v1.png';

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
