/**
 * <lang><zh-CN>BP 版本化 local JSON 数据集的唯一模块入口：只向项目自有 local adapter 提供目录、详情与预约初始静态输入，不执行网络、文件系统、storage 或动态加载。</zh-CN><en>Sole module entry for the BP versioned local-JSON dataset: supplies initial static catalog, detail, and reservation input only to the project-owned local adapter without network, file system, storage, or dynamic loading.</en></lang>
 * @lang zh-CN 本模块只重新导出 bundler 已知的 JSON；任何 consumer 都必须生成 detached projection，不能原地写入该 module object。
 * @lang en This module only re-exports bundler-known JSON; every consumer must create a detached projection and must not mutate this module object in place.
 */

// <lang><zh-CN>以 Node/ESM 所需的 JSON attribute 导入 checked-in 数据；属性不等同远端 loader 或动态数据源。</zh-CN><en>Import checked-in data with Node/ESM-required JSON attribute; the attribute is not a remote loader or dynamic data source.</en></lang>
import localDataset from './venues.json' with { type: 'json' };

/**
 * <lang><zh-CN>供受控 provider 使用的版本化 local dataset。</zh-CN><en>Versioned local dataset for use by controlled providers.</en></lang>
 * @lang zh-CN export 只允许模块内 provider 引用；页面通过 state/action/outcome 获取投影，不能直接读取整个 dataset。
 * @lang en Export is for module-internal provider reference only; pages obtain projections through state/action/outcome and cannot read full dataset directly.
 */
export { localDataset };
