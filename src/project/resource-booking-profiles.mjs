/**
 * <lang><zh-CN>资源预约 BP 的声明式项目组合输入加载器：只复制已提交 JSON profile、capability registry 与 anonymous session，并交给 HIA-uView-Biz project runtime。</zh-CN><en>Declarative project-composition input loader for the resource-booking BP: it only copies checked-in JSON profiles, capability registry, and anonymous session for the HIA-uView-Biz project runtime.</en></lang>
 * @lang zh-CN 配置事实位于相邻版本化 JSON；本模块不发现环境、执行配置脚本、读取网络/storage/身份或修改 authoring input。
 * @lang en Configuration facts live in adjacent versioned JSON; this module discovers no environment, executes no configuration script, reads no network/storage/identity, and modifies no authoring input.
 */

// <lang><zh-CN>四项 JSON 均为 BP 自有、受版本控制的声明式输入；import 不接受 caller 路径或动态 specifier。</zh-CN><en>All four JSON documents are BP-owned, version-controlled declarative inputs; imports accept no caller path or dynamic specifier.</en></lang>
import projectProfile from './project.profile.json' with { type: 'json' };
import solutionProfile from './solution.profile.json' with { type: 'json' };
import capabilityPackages from './capability-packages.json' with { type: 'json' };
import anonymousSession from './anonymous-session.json' with { type: 'json' };

/**
 * <lang><zh-CN>复制一项只含 JSON value 的已审阅声明。</zh-CN><en>Copies one reviewed declaration containing only JSON values.</en></lang>
 * @param {unknown} value <lang><zh-CN>静态 import 的 JSON 值。</zh-CN><en>Statically imported JSON value.</en></lang>
 * @returns {unknown} <lang><zh-CN>与模块缓存解除引用的 detached value。</zh-CN><en>Detached value sharing no reference with the module cache.</en></lang>
 * @lang zh-CN JSON round trip 不解释 function、accessor、prototype 或表达式；Biz runtime 随后执行 exact schema/relation validation。
 * @lang en The JSON round trip interprets no function, accessor, prototype, or expression; the Biz runtime then performs exact schema and relation validation.
 */
function copyDeclaration(value) {
  // <lang><zh-CN>静态 JSON 已在编译/Node import 时解析；复制只建立每个 facade 实例的独立 ownership。</zh-CN><en>Static JSON is parsed during compilation or Node import; copying only establishes independent ownership for each facade instance.</en></lang>
  return JSON.parse(JSON.stringify(value));
}

/**
 * <lang><zh-CN>创建一次 project-runtime 组合所需的全部声明式 profile 输入。</zh-CN><en>Creates all declarative profile inputs required by one project-runtime composition.</en></lang>
 * @returns {{projectProfile: object, solutionProfile: object, capabilityPackages: object[], session: object}} <lang><zh-CN>相互匹配且引用隔离的完整输入。</zh-CN><en>Complete mutually matching inputs with isolated references.</en></lang>
 * @lang zh-CN 返回值可同时交给 doctor 与 facade builder；两者只验证/复制，不应修改 checked-in declarations。
 * @lang en The result may be supplied to both the doctor and facade builder; each validates and copies without modifying checked-in declarations.
 */
export function createResourceBookingProfiles() {
  // <lang><zh-CN>逐项复制，禁止模块级共享数组跨越 runtime 的 declarative-data ownership gate。</zh-CN><en>Copy each declaration independently, preventing module-level shared arrays from crossing the runtime's declarative-data ownership gate.</en></lang>
  return {
    projectProfile: copyDeclaration(projectProfile),
    solutionProfile: copyDeclaration(solutionProfile),
    capabilityPackages: copyDeclaration(capabilityPackages),
    session: copyDeclaration(anonymousSession)
  };
}
