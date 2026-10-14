/**
 * dsh-mobile-lite —— 浏览器半边
 *
 * 手写 __ModuleLoader__.load bundle（不依赖 JSX / 构建工具 / React）。
 * 修改后执行 `node --check lib/client.js` 验证语法，再重启 dsh web。
 *
 * 做什么：
 *   1. 窄屏（≤1023px）且触摸设备下，把三栏 grid 折叠为单栏，中栏独占全宽；
 *      这是关键 —— 侧栏展开时不再挤压中栏（官方设计里窄屏手动展开会
 *      "re-expand over the squeezed center"，中栏只剩 110px）。
 *   2. 侧栏改为 position:fixed 浮层抽屉，配遮罩，脱离网格流。
 *   3. 底部导航栏（对话 / 会话 / 文件 / 设置），从拇指可达处驱动宿主。
 *   4. 隐藏桌面专属的宽度拖拽手柄，中栏底部为导航栏让位，安全区避让。
 *
 * 桌面端（鼠标指针）任何宽度均为 no-op。
 *
 * 锚点全部来自真机实测，见 README。
 */
window.__ModuleLoader__.load({
  id: 'dsh-mobile-lite',
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports

    var STYLE_ID = 'ml-style'
    var NAV_ID = 'ml-nav'
    var BP = '(max-width: 1023px)'

    // ── 锚点（实测确认）─────────────────────────────────────────────
    var SEL_FRAME = 'div[style*="grid-template-columns"]'
    var SEL_CENTER = '[data-dsh-center-col]'
    var SEL_RIGHTBAR = '[data-rightbar-col]'
    var ATTR_SIDEBAR = 'data-ml-sidebar'

    // ── 小屏要隐藏的第三方插件按钮容器（按「空格分隔的完整类名」精确匹配）──
    //     窄屏下会话头部会被各插件的按钮挤满（实测一排按钮总宽 777px > 视口 390px），
    //     标题被压成「你...」。这里列出要隐藏的容器类名。
    //
    //     ★ 定制方法：用浏览器的元素检查器点到那个按钮，看它的 class，
    //       取其中最独特的一个填进这个数组即可（不必重启，刷新页面生效）。
    //       用不到的条目可以直接删掉，删空数组就是「不隐藏任何插件按钮」。
    //
    //     以下默认值来自开发者的环境，按需增删：
    var HIDE_CLASSES = [
      'u_actions',      // dsh-undo-savepoint：撤销 / 恢复 / 快照 / 对话撤回
      'cm-stat-header', // dsh-cost-meter：会话头部的「费用明细」
      'sm-headerBtn',   // dsh-session-manager：归档 / 收藏 / 待回看 / 更多
      'OMoRSG_main',    // 文件管理器类插件：会话头部的「打开」入口
    ]

    // ── 样式 ────────────────────────────────────────────────────────
    var CSS = [
      '@media (max-width: 1023px) {',

      // ① 三栏 → 单栏
      '  html[data-ml] ' + SEL_FRAME + ' {',
      '    grid-template-columns: 0 minmax(0, 1fr) 0 !important;',
      '  }',

      // ② 显式列位 —— CSS Grid 自动放置会在侧栏脱离流后让中栏顶到第 1 列（0px），
      //    必须逐个声明列号，否则中栏塌陷成 0 宽。
      '  html[data-ml] [' + ATTR_SIDEBAR + '] { grid-column: 1 !important; grid-row: 1 !important; }',
      '  html[data-ml] ' + SEL_CENTER + ' { grid-column: 2 !important; grid-row: 1 !important; min-width: 0 !important; }',
      '  html[data-ml] ' + SEL_RIGHTBAR + ' { grid-column: 3 !important; grid-row: 1 !important; }',

      // ③ 侧栏 → 浮层抽屉
      '  html[data-ml] [' + ATTR_SIDEBAR + '] {',
      '    position: fixed !important;',
      '    top: 0; bottom: 0; left: 0;',
      '    width: min(84vw, 320px) !important;',
      '    max-width: none !important;',
      '    z-index: 10001 !important;',
      '    transform: translateX(-101%);',
      '    transition: transform .22s cubic-bezier(.2,.7,.3,1);',
      '    padding-top: env(safe-area-inset-top, 0px);',
      '    padding-bottom: calc(54px + env(safe-area-inset-bottom, 0px));',
      '    overflow-y: auto;',
      '    overscroll-behavior: contain;',
      '    will-change: transform;',
      '    box-shadow: 0 0 24px rgba(0,0,0,.32);',
      '  }',
      '  html[data-ml][data-ml-open] [' + ATTR_SIDEBAR + '] { transform: none; }',

      // ④ 遮罩：用中栏伪元素画，不插 DOM（避免与 React 抢节点）
      '  html[data-ml][data-ml-open] ' + SEL_CENTER + '::after {',
      '    content: ""; position: fixed; inset: 0;',
      '    left: min(84vw, 320px);',
      '    background: var(--dsw-alias-bg-mask-1, rgba(0,0,0,.35));',
      '    z-index: 10000;',
      '  }',

      // ⑤ 桌面专属：宽度拖拽手柄
      '  html[data-ml] [data-side] { display: none !important; }',

      // ⑥ 中栏底部为导航栏让位
      '  html[data-ml] ' + SEL_CENTER + ' {',
      '    padding-bottom: calc(50px + env(safe-area-inset-bottom, 0px)) !important;',
      '  }',

      // ⑦ 底部导航栏
      '  html[data-ml] #' + NAV_ID + ' {',
      '    position: fixed; left: 0; right: 0; bottom: 0;',
      '    height: calc(50px + env(safe-area-inset-bottom, 0px));',
      '    padding: 0 4px env(safe-area-inset-bottom, 0px);',
      '    display: grid; grid-template-columns: repeat(2, 1fr);',
      '    align-items: stretch;',
      '    background: var(--dsw-alias-bg-layer-1, #232324);',
      '    border-top: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12));',
      '    z-index: 10002;',
      '    -webkit-tap-highlight-color: transparent;',
      '  }',
      '  html[data-ml] #' + NAV_ID + ' button {',
      '    display: flex; flex-direction: column; align-items: center; justify-content: center;',
      '    gap: 3px; margin: 0; padding: 0; border: 0; background: none;',
      '    font-family: inherit; font-size: 10px; line-height: 1;',
      '    color: var(--dsw-alias-label-tertiary, #adb2b8);',
      '    cursor: pointer; -webkit-tap-highlight-color: transparent;',
      '  }',
      '  html[data-ml] #' + NAV_ID + ' button svg { width: 20px; height: 20px; display: block; }',
      '  html[data-ml] #' + NAV_ID + ' button[data-active] { color: var(--dsw-alias-label-primary, #f9fafb); }',
      '  html[data-ml] #' + NAV_ID + ' button:active { opacity: .65; }',

      // ⑦b 隐藏第三方插件注入的会话头部按钮 —— 只按自己打的标记隐藏。
      //     窄屏下标题行被这些按钮挤到横向溢出（实测 headerActions 宽 777px > 视口 390px），
      //     标题因此被压成「你...」，而它们在手机上基本用不上。
      //     要隐藏哪些类名见下方 HIDE_CLASSES —— 换插件只需改那个数组，
      //     CSS 本身不含任何第三方类名。
      //     保留：wSkVaW_tabs（对话/轨迹/Git/Zotero 原生视图标签）、
      //           headerUtilities / headerCorner 里的原生按钮（底部面板、右侧栏）。
      '  html[data-ml] [data-ml-hide-hit] {',
      '    display: none !important;',
      '  }',

      // ⑧ 设置类浮层面板：双栏 → 单栏
      //    这些面板在窄屏下是「左导航 188px + 右内容」，内容区只剩 ~150px，
      //    文字被迫逐字竖排。改成「顶部横向滚动导航 + 全宽内容」。
      //    锚点用 CSS Modules 的语义后缀（哈希前缀会随构建变，后缀是语义名）。
      '  html[data-ml] [data-ml-panel] {',
      '    flex-direction: column !important;',
      '  }',
      '  html[data-ml] [data-ml-panel-nav] {',
      '    width: 100% !important;',
      '    max-width: 100% !important;',
      '    height: auto !important;',
      '    flex: 0 0 auto !important;',
      '    flex-direction: row !important;',
      '    flex-wrap: nowrap !important;',
      '    align-items: center !important;',
      '    overflow: visible !important;',
      '    border-right: 0 !important;',
      '  }',
      // 导航条里除列表外的元素（如面板标题）：不收缩、不换行，避免被挤成竖排
      '  html[data-ml] [data-ml-panel-nav] > *:not([class*="_navList"]) {',
      '    flex: 0 0 auto !important;',
      '    white-space: nowrap !important;',
      '    min-width: max-content !important;',
      '  }',
      '  html[data-ml] [data-ml-panel-nav] > [class*="_navList"] { flex: 1 1 auto !important; min-width: 0 !important; }',
      '  html[data-ml] [data-ml-panel-nav] [class*="_navList"] {',
      '    flex-direction: row !important;',
      '    width: 100% !important;',
      '    height: auto !important;',
      '    overflow-x: auto !important;',
      '    overflow-y: hidden !important;',
      '    scrollbar-width: none;',
      '  }',
      '  html[data-ml] [data-ml-panel-nav] [class*="_navList"]::-webkit-scrollbar { display: none; }',
      '  html[data-ml] [data-ml-panel-nav] [class*="_navCell"] {',
      '    flex: 0 0 auto !important;',
      '    width: auto !important;',
      '    white-space: nowrap !important;',
      '  }',
      '  html[data-ml] [data-ml-panel-body] {',
      '    width: 100% !important;',
      '    max-width: 100% !important;',
      '    flex: 1 1 auto !important;',
      '    min-width: 0 !important;',
      '    min-height: 0 !important;',
      '  }',
      '}',
    ].join('\n')

    // ── 工具 ────────────────────────────────────────────────────────
    function byLabel(text) {
      return document.querySelector('[aria-label="' + text + '"]')
    }
    function frameEl() {
      return document.querySelector(SEL_FRAME)
    }
    function tap(el) {
      if (el && typeof el.click === 'function') { el.click(); return true }
      return false
    }
    /** 是否应当启用适配：窄屏 + 触摸指针（桌面窄窗口不误启） */
    function shouldAdapt() {
      try {
        return window.matchMedia(BP).matches && window.matchMedia('(pointer: coarse)').matches
      } catch (e) {
        return window.matchMedia(BP).matches
      }
    }

    // ── 注入样式 ────────────────────────────────────────────────────
    function injectStyle() {
      if (document.getElementById(STYLE_ID)) return
      var st = document.createElement('style')
      st.id = STYLE_ID
      st.textContent = CSS
      ;(document.head || document.documentElement).appendChild(st)
    }

    // ── 给侧栏打标记（它没有官方 data 属性）─────────────────────────
    function tagFrame() {
      var f = frameEl()
      if (!f || !f.children[0]) return false
      f.children[0].setAttribute(ATTR_SIDEBAR, '')
      document.documentElement.setAttribute('data-ml', '')
      return true
    }

    // ── 把 JS 算出的几何翻译成 CSS 可读的属性 ───────────────────────
    // 优先读 frame 上的官方 `data-sidebar-collapsed`（实测它在「窄屏自动收起」与
    // 「手动展开」两种状态下都准确），grid 字符串仅作兜底 —— 只解析内联样式会漏掉
    // 宿主用属性表达的状态切换。
    function syncOpen() {
      var f = frameEl()
      if (!f) return
      var collapsed = f.hasAttribute('data-sidebar-collapsed')
      var w = parseFloat(f.style.gridTemplateColumns) || 0
      var open = !collapsed && w > 60
      document.documentElement.toggleAttribute('data-ml-open', open)
      var nav = document.getElementById(NAV_ID)
      if (nav) {
        var sessions = nav.querySelector('[data-ml-nav="sessions"]')
        if (sessions) {
          if (open) sessions.setAttribute('data-active', '')
          else sessions.removeAttribute('data-active')
        }
      }
    }

    // ── 给 frame 挂状态观察器；frame 可能晚于插件加载才渲染，故可重试 ──
    var frameObserver = null
    var observedFrame = null
    function observeFrame() {
      var f = frameEl()
      if (!f) return false
      if (frameObserver && f === observedFrame) return true
      if (!frameObserver) {
        frameObserver = new window.MutationObserver(syncOpen)
        observers.push(frameObserver)
      }
      frameObserver.disconnect()
      frameObserver.observe(f, {
        attributes: true,
        attributeFilter: ['style', 'data-sidebar-collapsed'],
      })
      observedFrame = f
      return true
    }

    // ── 图标（内联 SVG，不引外部资源）────────────────────────────────
    var ICONS = {
      chat: '<path d="M4 5h16v11H9l-5 4z"/>',
      sessions: '<path d="M4 5h16M4 12h16M4 19h10"/>',
      compose: '<path d="M12 5v14M5 12h14"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    }
    function icon(name, filled) {
      var body = ICONS[name] || ''
      var attrs = filled
        ? ' fill="currentColor" stroke="currentColor"'
        : ' fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'
      return '<svg viewBox="0 0 24 24"' + attrs + '>' + body + '</svg>'
    }

    // ── 底部导航的动作（全部用官方语义按钮驱动，不猜内部状态）────────
    // 只保留两项：对话（回主区）与会话列表（开抽屉）。
    // 「新建会话」「设置」不占底部位置 —— 它们在会话列表抽屉里本来就有入口。
    // ORDER 的长度必须与 CSS 里 #ml-nav 的 grid-template-columns 列数一致。
    // 不提供「文件/右侧栏」入口：右栏需要中栏 ≥400px 且自身 ≥300px，
    // 手机竖屏（390px）下宿主必然拒绝分栏（computeColumns 的空间约束），
    // 放一个点了没反应的按钮只会骗人。
    var ACTIONS = {
      chat: function () { tap(byLabel('收起侧边栏')) },
      sessions: function () { tap(byLabel('打开侧边栏')) },
      compose: function () { tap(byLabel('新建会话')) },
      settings: function () { tap(byLabel('设置')) },
    }
    var LABELS = { chat: '对话', sessions: '会话', compose: '新建', settings: '设置' }
    var ORDER = ['chat', 'sessions']

    // ── 底部导航栏 ──────────────────────────────────────────────────
    function ensureNav() {
      if (document.getElementById(NAV_ID)) return
      var nav = document.createElement('nav')
      nav.id = NAV_ID
      nav.setAttribute('role', 'navigation')
      for (var i = 0; i < ORDER.length; i++) {
        var key = ORDER[i]
        var b = document.createElement('button')
        b.type = 'button'
        b.setAttribute('data-ml-nav', key)
        b.setAttribute('aria-label', LABELS[key])
        b.innerHTML = icon(key) + '<span>' + LABELS[key] + '</span>'
        ;(function (k, node) {
          node.addEventListener('click', function (ev) {
            ev.preventDefault()
            var fn = ACTIONS[k]
            if (!fn) return
            fn()
            window.setTimeout(syncOpen, 120)
            window.setTimeout(syncOpen, 420)
          }, { passive: false })
        })(key, b)
        nav.appendChild(b)
      }
      document.body.appendChild(nav)
      syncOpen()
    }

    // ── 点遮罩关闭抽屉 ──────────────────────────────────────────────
    function onDocClick(ev) {
      if (!document.documentElement.hasAttribute('data-ml-open')) return
      var t = ev.target
      if (!t || !t.closest) return
      if (t.closest('#' + NAV_ID)) return
      var sb = document.querySelector('[' + ATTR_SIDEBAR + ']')
      if (sb && sb.contains(t)) return
      // 点在遮罩（中栏伪元素）区域 —— 抽屉右缘之外
      var rect = sb ? sb.getBoundingClientRect() : null
      if (rect && ev.clientX > rect.right) tap(byLabel('收起侧边栏'))
    }

    // ── 给 HIDE_CLASSES 命中的第三方插件按钮打标记（CSS 只认这个标记）──
    function tagHidden() {
      if (!HIDE_CLASSES.length) return
      for (var i = 0; i < HIDE_CLASSES.length; i++) {
        var els
        try {
          els = document.querySelectorAll('[class~="' + HIDE_CLASSES[i] + '"]')
        } catch (e) { continue }
        for (var j = 0; j < els.length; j++) {
          if (!els[j].hasAttribute('data-ml-hide-hit')) els[j].setAttribute('data-ml-hide-hit', '')
        }
      }
    }

    // ── 给浮层面板（设置等）打标记：双栏 → 单栏靠 CSS，但需要先标出列 ──
    function tagPanels() {
      var kids = document.body.children
      for (var i = 0; i < kids.length; i++) {
        var el = kids[i]
        if (!el || el.id === NAV_ID || el.tagName !== 'DIV') continue
        var cs
        try { cs = window.getComputedStyle(el) } catch (e) { continue }
        if (cs.position !== 'fixed') continue
        if (parseInt(cs.zIndex, 10) < 500) continue
        var r = el.getBoundingClientRect()
        if (r.width < 240 || r.height < 240) continue
        el.setAttribute('data-ml-overlay', '')
        var panel = el.querySelector('[class*="_panel"]')
        if (!panel || panel.hasAttribute('data-ml-panel')) continue
        panel.setAttribute('data-ml-panel', '')
        // 定位左导航列：从 _navList 向上走到 panel 的直接子元素
        var navCol = panel.querySelector('[class*="_navList"]')
        while (navCol && navCol.parentElement !== panel) navCol = navCol.parentElement
        if (navCol) navCol.setAttribute('data-ml-panel-nav', '')
        for (var j = 0; j < panel.children.length; j++) {
          if (panel.children[j] !== navCol) panel.children[j].setAttribute('data-ml-panel-body', '')
        }
      }
    }

    // ── 生命周期 ────────────────────────────────────────────────────
    var observers = []
    var disposed = false

    function setup() {
      if (disposed) return shouldAdapt()
      if (!shouldAdapt()) {
        // 桌面：确保不残留任何移动端痕迹
        document.documentElement.removeAttribute('data-ml')
        document.documentElement.removeAttribute('data-ml-open')
        var nav = document.getElementById(NAV_ID)
        if (nav && nav.parentNode) nav.parentNode.removeChild(nav)
        var st = document.getElementById(STYLE_ID)
        if (st && st.parentNode) st.parentNode.removeChild(st)
        return false
      }
      injectStyle()
      tagFrame()
      syncOpen()
      ensureNav()
      tagPanels()
      tagHidden()
      return true
    }

    function apply(ctx) {
      setup()

      // 宿主重渲染会移除注入节点，用 MutationObserver 补回
      var mo = new window.MutationObserver(function () {
        if (disposed) return
        if (!shouldAdapt()) return
        if (!document.getElementById(NAV_ID)) ensureNav()
        if (!document.getElementById(STYLE_ID)) injectStyle()
        var f = frameEl()
        if (f && f.children[0] && !f.children[0].hasAttribute(ATTR_SIDEBAR)) tagFrame()
        var nav = document.getElementById(NAV_ID)
        if (nav && nav.parentNode !== document.body) document.body.appendChild(nav)
        tagPanels()
        tagHidden()
        // frame 可能此时才出现 / 被替换：确保状态观察器跟上
        observeFrame()
      })
      mo.observe(document.body, { childList: true, subtree: true })
      observers.push(mo)

      observeFrame()

      // 兜底：任何点击后都同步一次状态（覆盖侧栏内部按钮、快捷键等所有路径，
      // 不依赖 observer 是否成功挂上）
      document.addEventListener('click', function () {
        window.setTimeout(syncOpen, 120)
        window.setTimeout(syncOpen, 420)
      }, true)

      document.addEventListener('click', onDocClick, true)

      var mql = window.matchMedia(BP)
      var onMql = function () { setup(); observeFrame() }
      if (mql.addEventListener) mql.addEventListener('change', onMql)

      window.addEventListener('pagehide', function () {
        disposed = true
        for (var i = 0; i < observers.length; i++) {
          try { observers[i].disconnect() } catch (e) {}
        }
        document.removeEventListener('click', onDocClick, true)
      })
    }

    exports.apply = apply
    return module.exports
  },
})
