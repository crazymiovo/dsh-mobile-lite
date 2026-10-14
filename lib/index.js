/**
 * dsh-mobile-lite —— 宿主半边（空实现）
 *
 * 本插件的全部逻辑都在浏览器端（lib/client.js）。宿主侧不需要注入任何服务，
 * 这里只提供一个空的 apply，使插件行能够存在于 Host Loader 中，
 * 从而让 `dsh.client` 声明被前端的模块加载器发现。
 */
export function apply() {}
