# dsh-mobile-lite

**DSH Web 的移动端适配（精简版）** —— 窄屏好用，桌面端零副作用。

> **编写者说明**
>
> 本插件的**全部代码、布局锚点探测、多尺寸渲染验证均由 DeepSeek AI 完成**。
> 人类作者（crazymiovo）负责：提出需求、在真实设备上测试、指出问题并验收。
>
> 开发方式值得一提：AI 通过 Chrome DevTools 协议在真实 DSH 实例上以 390×844 手机视口
> 渲染页面、测量每个元素的几何、注入实验样式并截图比对，因此文中的实测数字
> （中栏 110px、headerActions 宽 777px 等）都是**量出来的，不是估的**。

为手机竖屏（390–430px）而写。解决 DSH Web 在窄屏下的两个具体问题：

1. **侧栏展开会把聊天区挤没**。DSH 的布局按桌面设计：侧栏 264–420px、中栏保护 400px，
   而手机竖屏只有 390px。手动展开侧栏时中栏实测只剩 **110px**，文字被迫逐字竖排。
2. **移动端没有可用的导航**。左侧 56px 图标栏白吃 14% 宽度，功能入口零散在侧栏里。

## 做了什么

| # | 改动 | 机制 |
|---|---|---|
| 1 | 三栏 grid 折叠为单栏 | 覆盖宿主内联的 `grid-template-columns`，中栏拿到全宽 |
| 2 | 侧栏改浮层抽屉 | `position: fixed` 脱离网格流 → 挤不到中栏；滑入 + 遮罩 |
| 3 | 底部导航栏 | 对话 / 会话两项，从拇指可达处驱动宿主 |
| 4 | 设置类面板双栏 → 单栏 | 左导航 188px 改为顶部横向滚动条，内容区拿回全宽 |
| 5 | 竖屏细节 | 隐藏宽度拖拽手柄、中栏底部为导航栏让位、安全区避让 |

**效果**（尺寸实测，390×844 手机视口）

| | 改造前 | 改造后 |
|---|---|---|
| 侧栏收起时的中栏 | 334px（56px 图标栏占位） | **390px**（图标栏让位） |
| **侧栏展开时的中栏** | **110px**（文字被迫逐字竖排） | **390px**（侧栏成浮层，不挤压） |
| 导航 | 零散在侧栏内 | 底部两格：对话 / 会话 |
| 设置面板内容区 | ~150px（文字竖排） | **342px**（顶部横滚导航 + 全宽内容） |

判定方式是 `computedStyle(frame).gridTemplateColumns` 与各列 `getBoundingClientRect()` 的实测值，
不是估算 —— 开发过程中用 Chrome DevTools 协议在真实实例上逐尺寸量过。

## 桌面端是 no-op

判据是 **`(max-width: 1023px)` 且 `(pointer: coarse)`** —— 必须是窄屏**并且**触摸指针。
所以你在电脑上把窗口拖窄，不会误启移动 UI。

## 安装

### 从 GitHub 安装（推荐）

```sh
dsh plugin --profile web add github:crazymiovo/dsh-mobile-lite
```

想锁定版本可以带 tag：

```sh
dsh plugin --profile web add github:crazymiovo/dsh-mobile-lite#v0.1.0
```

本插件的 `lib/` 是手写的模块 bundle、**已随仓库提交**，所以从 git 安装**不需要任何构建步骤**
（pnpm 拿到裸源码即可直接用）。

### 从 npm 安装

```sh
dsh plugin --profile web add dsh-mobile-lite
```

### ⚠️ 装完必须补一步，否则「装了没反应」

`dsh plugin` 实际只是把参数转发给 pnpm，**它不会把包名写进 `dsh.profile.bundles`**，
而 DSH 启动时是按 `dsh.profile.bundles` 这个有序列表加载插件的。

所以无论用上面哪种方式，装完都要：

1. 打开 `~/.dsh/profiles/web/package.json`
2. 把 `"dsh-mobile-lite"` 加进 `dsh.profile.bundles` 数组
3. **重启 dsh web**

（如果你是通过 DSH 的图形插件市场安装的，市场会自动完成这一步，可跳过。）

### 生效

**重启 dsh web** 后生效。之后修改本插件只需**强刷浏览器页面**
（`Ctrl+Shift+R` / 手机端清缓存或重开标签页）—— DSH 对客户端插件代码有 HTTP 缓存，
普通刷新可能仍拿到旧版本。

### 卸载

```sh
dsh plugin --profile web rm dsh-mobile-lite
```

再把 `dsh.profile.bundles` 里那行删掉，重启即可。本插件不改动宿主任何文件，卸载即彻底复原。

## 自定义

### 隐藏你不想要的插件按钮

窄屏下会话头部常被各插件注入的按钮挤满（实测一排按钮总宽 777px，而视口只有 390px），
标题会被压成「你...」。

本插件可以按类名隐藏它们。要改的只有 `lib/client.js` 顶部这一个数组：

```js
var HIDE_CLASSES = [
  'u_actions',      // dsh-undo-savepoint：撤销 / 恢复 / 快照 / 对话撤回
  'cm-stat-header', // dsh-cost-meter：会话头部的「费用明细」
  'sm-headerBtn',   // dsh-session-manager：归档 / 收藏 / 待回看 / 更多
  'OMoRSG_main',    // 文件管理器类插件：会话头部的「打开」入口
]
```

- **想隐藏别的插件按钮**：用浏览器元素检查器点到那个按钮，取它 `class` 里最独特的一个，
  填进数组即可（用「空格分隔的完整类名」精确匹配，不会误伤子串）。
- **不想要这个功能**：把数组清空成 `[]`，就不会隐藏任何插件按钮。
- **默认值来自开发者的环境**，你用不到的直接删。

改完执行 `node --check lib/client.js` 验语法，强刷页面即生效。

### 页面结构变了怎么办

DSH 升级后若某些布局不生效（不会白屏，最坏只是回到原生布局），
需要更新 `lib/client.js` 里的锚点。所有锚点集中在文件顶部，并有实测来源注释。

## 实现说明

- 手写 `__ModuleLoader__.load` bundle，**不需要 JSX / 构建工具 / React 依赖**。
  改完执行 `node --check lib/client.js` 验语法。
- `lib/index.js` 是宿主侧的空 `apply()`，只为让插件行存在于 Host Loader；
  全部逻辑在 `lib/client.js` 的 `apply(ctx)` 里。
- 只做布局与导航，**不改宿主的业务逻辑**，不注入网络请求，不改认证。

### 实测锚点

优先使用官方 `data-*` 属性；对 CSS Modules 类名只用**语义后缀**（哈希前缀会随构建变化）。
侧栏列没有官方属性，因此由 JS 打自己的标记。

| 元素 | 锚点 |
|---|---|
| 三栏容器 | `div[style*="grid-template-columns"]` |
| 中栏 / 右栏 / overlay / 拖拽手柄 | `[data-dsh-center-col]` / `[data-rightbar-col]` / `[data-shell-overlay]` / `[data-side]` |
| 侧栏列 | 无官方属性 → JS 打 `data-ml-sidebar` |
| 侧栏开合状态 | `frame[data-sidebar-collapsed]`（官方属性，比解析 grid 字符串可靠） |
| 侧栏开关 / 新建 / 设置 | `[aria-label="打开侧边栏"]` / `"收起侧边栏"` / `"新建会话"` / `"设置"` |

### 两个踩过的坑（供后来者）

**1. CSS Grid 的自动放置会让中栏塌陷。**
给侧栏加 `position: fixed` 后它脱离网格流，中栏会自动顶到第 1 列（0px）、
右栏顶到第 2 列 —— 现象是「中栏宽度测出 0、内容空白」，看起来像样式没生效，
其实是元素被放错了格。修法是**逐列显式声明 `grid-column`**。

**2. 常驻悬浮物会盖住底部导航。**
某些插件（如桌宠 / 悬浮球）的 z-index 高达 9999，底部导航必须高于它才点得到。
本插件的层级安排：

```
第三方插件的模态遮罩   20000+   临时弹窗，应盖住一切
底部导航栏             10002    常驻导航，必须始终可点
侧栏抽屉               10001
抽屉遮罩               10000
第三方悬浮球           9999
```

## 兼容性

- 开发与实测环境：**DSH 0.2.0-rc.2**（`dsh-client-ui-layout` 等同版本）
- 依赖的官方 `data-*` 属性与 `aria-label` 若在某版本改名，**失效方式是「布局不生效」
  而不是白屏**。这是刻意的设计：所有覆盖都限定在 `@media (max-width: 1023px)` 内，
  且不接管宿主的渲染流程。
- 与 `dsh-better-sidebar` 同装时可能争侧栏，冲突时先禁用它试。
- 平板取向：768–1023px 的触屏设备同样启用（侧栏抽屉 + 底部两格导航）。
  ≥1024px 与鼠标指针环境下完全 no-op。

## 与 dsh-web-mobile 的关系

做同类事情的项目还有一个更成熟的：[**dsh-web-mobile**](https://github.com/mexiaosqwq/dsh-web-mobile)
（105+ stars、562 commits）。**本插件是独立实现，没有使用它的任何代码**，但需要老实说明
它带来的帮助：

- **方向验证**：它证明了「侧栏做成浮层抽屉而不是挤压中栏」这条路在 DSH 上走得通，
  也证明了用 `pointer: coarse` 而非纯宽度来区分桌面/触摸是可行的做法。
  在动手之前，这些判断是它先做出来的。
- **兼容性参考**：它的 README 列出了与第三方插件共存时的踩坑记录
  （例如 locale 命名空间重名会把整站打成错误页），帮助评估了本插件的冲突风险。
- **平板取向**：它对 768–1023px 触屏设备的处理思路（限宽、而非简单放大手机布局）
  是本插件平板档设计的参照。

根因诊断则来自 DSH 自身的资料：`@deepseek-ai/dsh-client-ui-layout` 的 README 与
`columns.d.ts` 给出了三栏几何的权威定义（`CENTER_MIN = 400`、
`SIDEBAR_AUTO_COLLAPSE = 1024`、`SIDEBAR_COLLAPSED = 56` 等），
「窄屏手动展开侧栏会挤压中栏」这一行为在它的文档里有明确描述。

**如果你的需求更广泛，推荐直接用 dsh-web-mobile** —— 它覆盖的场景比本插件多得多
（弹窗改底部 sheet、iOS 缩放、键盘处理、文件面板手势、服务端响应压缩等）。
本插件的定位是**小而专注**：只解决窄屏下的布局与导航，代码量 20 KB 量级，
便于自行修改。

## License

MIT
