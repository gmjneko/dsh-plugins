/**
 * dsh-animation-enhance — KoWork-style motion for the DSH Web client.
 *
 * The enhancer is deliberately renderer-only and component-agnostic: DSH ships
 * its chat, menus and settings as independently built client plugins, so the
 * stable seams are the DOM contracts they already expose (`data-disclosure-*`,
 * `data-step-process*`, `role="menu"`, `role="dialog"`). Everything below works
 * through those seams, which keeps this plugin independent of DSH internals and
 * lets it survive client releases that do not rename the contracts.
 *
 * Motion values are copied from KoWork's design system
 * (`packages/design-system/src/styles/{tokens,motion}.css`):
 *   disclosure  height 420ms / opacity 300ms / blur 360ms, ease (0.22, 1, 0.36, 1)
 *   menus       fade 200ms + blur 380ms + scale 280ms, origin follows the trigger
 *   dialogs     fade 220ms + blur 340ms + scale 0.98 → 1
 *   overlays    fade 180ms in / 140ms out
 *   pages       fade 200ms + blur 380ms
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-animation-enhance',
  factory() {
    const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
    const EASE_EXIT = 'cubic-bezier(0.4, 0, 1, 1)'
    const T = {
      height: 420,
      opacity: 300,
      filter: 360,
      chevron: 300,
      menuFade: 200,
      menuBlur: 380,
      menuScale: 280,
      menuExit: 240,
      overlayIn: 180,
      overlayOut: 140,
      dialogFade: 220,
      dialogBlur: 340,
      dialogExit: 240,
      pageFade: 200,
      pageBlur: 380,
      settle: 80,
    }

    const CLS = {
      disclosure: 'dsh-anim-disclosure',
      menuEnterUp: 'dsh-anim-menu-enter-up',
      menuEnterDown: 'dsh-anim-menu-enter-down',
      menuEnterRight: 'dsh-anim-menu-enter-right',
      menuExit: 'dsh-anim-menu-exit',
      dialogEnter: 'dsh-anim-dialog-enter',
      dialogExit: 'dsh-anim-dialog-exit',
      overlayEnter: 'dsh-anim-overlay-enter',
      overlayExit: 'dsh-anim-overlay-exit',
      pageEnter: 'dsh-anim-page-enter',
      sectionEnter: 'dsh-anim-section-enter',
      chevron: 'dsh-anim-chevron-in',
      chevronOut: 'dsh-anim-chevron-out',
    }

    const MENU_SELECTOR = '[data-menu-material]'
    const DIALOG_SELECTOR = '[role="dialog"][aria-modal="true"]'
    const DISCLOSURE_HEADER = '[data-disclosure-header]'
    const DISCLOSURE_ROW = '[data-disclosure-row]'
    const STEP_PROCESS = '[data-step-process]'
    const STEP_PROCESS_BODY = '[data-step-process-body]'
    const CHAT_MOTION_SCOPE = '[data-chat-motion]'
    const STYLE_ID = 'dsh-animation-enhance-styles'
    const MOTION_SCOPE = 'data-dsh-anim'
    const RUNTIME_KEY = '__dshAnimationEnhanceRuntime__'
    const REPLAY_KEY = '__dshAnimationEnhanceReplaying__'

    const CSS = `
      :root {
        --dsh-anim-ease: ${EASE};
        --dsh-anim-ease-exit: ${EASE_EXIT};
        --dsh-anim-blur: 4px;
        --dsh-anim-disclosure-height: ${T.height}ms;
        --dsh-anim-disclosure-opacity: ${T.opacity}ms;
        --dsh-anim-disclosure-filter: ${T.filter}ms;
      }

      @keyframes dsh-anim-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes dsh-anim-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes dsh-anim-blur-in {
        from { filter: blur(var(--dsh-anim-blur)); }
        to { filter: blur(0); }
      }
      @keyframes dsh-anim-exit {
        from { opacity: 1; filter: blur(0); }
        to { opacity: 0; filter: blur(var(--dsh-anim-blur)); }
      }
      @keyframes dsh-anim-scale-in-down {
        from { transform: translateY(-6px) scale(0.94); }
        to { transform: translateY(0) scale(1); }
      }
      @keyframes dsh-anim-scale-in-up {
        from { transform: translateY(6px) scale(0.94); }
        to { transform: translateY(0) scale(1); }
      }
      @keyframes dsh-anim-scale-in-right {
        from { transform: translateX(6px) scale(0.94); }
        to { transform: translateX(0) scale(1); }
      }
      @keyframes dsh-anim-menu-scale-out {
        from { transform: translateY(0) scale(1); }
        to { transform: translateY(4px) scale(0.96); }
      }
      @keyframes dsh-anim-dialog-in {
        from { opacity: 0; transform: scale(0.98); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes dsh-anim-dialog-out {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.99); }
      }
      @keyframes dsh-anim-chevron-in {
        from { transform: rotate(180deg); }
        to { transform: rotate(0deg); }
      }
      @keyframes dsh-anim-chevron-out {
        from { transform: rotate(0deg); }
        to { transform: rotate(180deg); }
      }

      /* KoWork's Disclosure.Content transition: the content box owns its height
         and rides height/opacity/filter/translate on one curve. */
      .${CLS.disclosure} {
        overflow-y: hidden !important;
        will-change: height, opacity, filter, transform;
        transition:
          height var(--dsh-anim-disclosure-height) var(--dsh-anim-ease),
          margin-top var(--dsh-anim-disclosure-height) var(--dsh-anim-ease),
          margin-bottom var(--dsh-anim-disclosure-height) var(--dsh-anim-ease),
          opacity var(--dsh-anim-disclosure-opacity) var(--dsh-anim-ease),
          filter var(--dsh-anim-disclosure-filter) var(--dsh-anim-ease),
          transform var(--dsh-anim-disclosure-height) var(--dsh-anim-ease) !important;
      }

      .${CLS.chevron},
      .${CLS.chevronOut} {
        transform-box: fill-box;
        transform-origin: center;
      }
      .${CLS.chevron} {
        animation: dsh-anim-chevron-in ${T.chevron}ms var(--dsh-anim-ease) both !important;
      }
      .${CLS.chevronOut} {
        animation: dsh-anim-chevron-out ${T.chevron}ms var(--dsh-anim-ease) both !important;
      }

      /* The user prefers a full-card blur-to-clear reveal over the native
         background blur. Opaque the menu material and hide the macOS backing
         first: with no backdrop-filter to preserve, the surface can safely
         animate filter/opacity/scale without a white flash or a detached
         backing rectangle. */
      [data-menu-material] > [aria-hidden="true"] {
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
        background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #fff)) !important;
      }
      [data-menu-backing] {
        display: none !important;
      }

      .${CLS.menuEnterDown} {
        transform-origin: top left;
        animation:
          dsh-anim-fade-in ${T.menuFade}ms var(--dsh-anim-ease) both,
          dsh-anim-blur-in ${T.menuBlur}ms var(--dsh-anim-ease) both,
          dsh-anim-scale-in-down ${T.menuScale}ms var(--dsh-anim-ease) both !important;
      }
      .${CLS.menuEnterUp} {
        transform-origin: bottom left;
        animation:
          dsh-anim-fade-in ${T.menuFade}ms var(--dsh-anim-ease) both,
          dsh-anim-blur-in ${T.menuBlur}ms var(--dsh-anim-ease) both,
          dsh-anim-scale-in-up ${T.menuScale}ms var(--dsh-anim-ease) both !important;
      }
      .${CLS.menuEnterRight} {
        transform-origin: left center;
        animation:
          dsh-anim-fade-in ${T.menuFade}ms var(--dsh-anim-ease) both,
          dsh-anim-blur-in ${T.menuBlur}ms var(--dsh-anim-ease) both,
          dsh-anim-scale-in-right ${T.menuScale}ms var(--dsh-anim-ease) both !important;
      }

      .${CLS.menuExit} {
        animation:
          dsh-anim-fade-out 160ms var(--dsh-anim-ease-exit) both,
          dsh-anim-exit 220ms var(--dsh-anim-ease-exit) both,
          dsh-anim-menu-scale-out 220ms var(--dsh-anim-ease-exit) both !important;
      }

      .${CLS.dialogEnter} {
        animation:
          dsh-anim-dialog-in ${T.dialogFade}ms var(--dsh-anim-ease) both,
          dsh-anim-blur-in ${T.dialogBlur}ms var(--dsh-anim-ease) both !important;
      }
      .${CLS.dialogExit} {
        animation:
          dsh-anim-dialog-out 160ms var(--dsh-anim-ease-exit) both,
          dsh-anim-exit 220ms var(--dsh-anim-ease-exit) both !important;
      }
      .${CLS.overlayEnter} {
        animation: dsh-anim-fade-in ${T.overlayIn}ms var(--dsh-anim-ease) both !important;
      }
      .${CLS.overlayExit} {
        animation: dsh-anim-fade-out ${T.overlayOut}ms var(--dsh-anim-ease-exit) both !important;
      }

      .${CLS.pageEnter} {
        animation:
          dsh-anim-fade-in ${T.pageFade}ms var(--dsh-anim-ease) both,
          dsh-anim-blur-in ${T.pageBlur}ms var(--dsh-anim-ease) both !important;
      }
      .${CLS.sectionEnter} {
        animation:
          dsh-anim-fade-in ${T.pageFade}ms var(--dsh-anim-ease) both,
          dsh-anim-blur-in ${T.pageBlur}ms var(--dsh-anim-ease) both !important;
      }

      [${MOTION_SCOPE}] {
        pointer-events: none !important;
      }

      @media (prefers-reduced-motion: reduce) {
        .${CLS.disclosure},
        .${CLS.chevron},
        .${CLS.chevronOut},
        .${CLS.menuEnterUp},
        .${CLS.menuEnterDown},
        .${CLS.menuEnterRight},
        .${CLS.menuExit},
        .${CLS.dialogEnter},
        .${CLS.dialogExit},
        .${CLS.overlayEnter},
        .${CLS.overlayExit},
        .${CLS.pageEnter},
        .${CLS.sectionEnter} {
          animation: none !important;
          transition: none !important;
        }
      }
    `

    /** @returns {boolean} whether the OS asks for reduced motion. */
    function reducedMotion() {
      return typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }

    /** @param {Element | null | undefined} value @returns {value is HTMLElement} */
    function isElement(value) {
      return value instanceof HTMLElement
    }

    /** @param {string} value @returns {string} a valid CSS.escape operand */
    function escapeAttribute(value) {
      return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(value)
        : value.replace(/["\\]/g, '\\$&')
    }

    /**
     * Measure the content height the element can animate in its own box model.
     * @param {HTMLElement} element
     * @returns {number} content-box height for the `height` property
     */
    function contentHeight(element) {
      const rect = element.getBoundingClientRect()
      if (rect.height <= 0) return 0
      const style = getComputedStyle(element)
      if (style.boxSizing === 'border-box') return rect.height
      const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
      const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0)
      return Math.max(0, rect.height - padding - border)
    }

    /** @param {HTMLElement} element @returns {boolean} whether it can own an animated box */
    function canAnimateBox(element) {
      const display = getComputedStyle(element).display
      return display !== 'inline' && display !== 'contents'
    }

    function createRuntime() {
      const disposers = []
      const timers = new Set()
      const styleTimers = new WeakMap()
      const revealStates = new Map()
      const settingsObservers = new Map()
      const menuMeta = new Map()
      const dialogMeta = new WeakMap()
      const activeMenus = new Set()
      const activeDialogs = new Set()
      const ghosts = new Set()
      const seenAdded = new WeakSet()
      const menuClassTimers = new Map()
      const groupTitleStates = new Map()
      const closing = new WeakSet()

      let disposed = false
      let replaying = false
      let bodyObserver
      let hiddenObserver
      let mainObserver
      let sidebarObserver
      let sessionObserver
      let menuRoleObserver
      let mainSlot = null
      let sidebarSlot = null
      let bootListener

      /** @param {() => void} fn @param {number} delay @returns {number} timer id */
      function later(fn, delay) {
        const id = window.setTimeout(() => {
          timers.delete(id)
          if (!disposed) fn()
        }, delay)
        timers.add(id)
        return id
      }

      /** @param {number | undefined} id */
      function clearLater(id) {
        if (id === undefined) return
        window.clearTimeout(id)
        timers.delete(id)
      }

      /**
       * Add a one-shot class and remove it after the whole composed animation.
       * Re-adding restarts the animation so quick successive switches replay.
       * @param {HTMLElement} element @param {string} className @param {number} duration
       */
      function playClassOnce(element, className, duration) {
        if (disposed) return
        const previous = styleTimers.get(element)
        if (previous !== undefined) {
          clearLater(previous.timer)
          element.classList.remove(previous.className)
        }
        element.classList.remove(className)
        if (element instanceof HTMLElement) void element.offsetWidth
        else element.getBoundingClientRect()
        element.classList.add(className)
        const timer = later(() => {
          element.classList.remove(className)
          const current = styleTimers.get(element)
          if (current !== undefined && current.timer === timer) styleTimers.delete(element)
        }, duration)
        styleTimers.set(element, { timer, className })
      }

      /**
       * Install the stylesheet, replacing a stale copy from an earlier mount.
       * @returns {() => void} style removal
       */
      function installStyles() {
        if (!document.head) return () => {}
        const old = document.getElementById(STYLE_ID)
        if (old !== null) old.remove()
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.setAttribute('data-dsh-animation-enhance', '')
        style.textContent = CSS
        document.head.appendChild(style)
        return () => {
          if (style.isConnected) style.remove()
        }
      }

      /** @param {EventTarget} target @param {string} type @param {EventListener} listener @param {boolean | AddEventListenerOptions} [options] */
      function on(target, type, listener, options) {
        target.addEventListener(type, listener, options)
        disposers.push(() => target.removeEventListener(type, listener, options))
      }

      /**
       * Open one element from zero height on KoWork's disclosure curve.
       * @param {HTMLElement} element
       * @param {string} [kind]
       * @returns {boolean} whether an animation started
       */
      function revealElement(element, kind = 'content') {
        if (disposed || reducedMotion() || !element.isConnected) return false
        if (revealStates.has(element) || closing.has(element) || !canAnimateBox(element)) return false
        const height = contentHeight(element)
        if (height <= 0) return false
        const computed = getComputedStyle(element)
        const marginTop = parseFloat(computed.marginTop) || 0
        const marginBottom = parseFloat(computed.marginBottom) || 0

        const previous = {
          height: element.style.height,
          marginTop: element.style.marginTop,
          marginBottom: element.style.marginBottom,
          opacity: element.style.opacity,
          filter: element.style.filter,
          transform: element.style.transform,
          overflow: element.style.overflow,
          overflowY: element.style.overflowY,
          willChange: element.style.willChange,
        }
        element.style.height = '0px'
        element.style.marginTop = '0px'
        element.style.marginBottom = '0px'
        element.style.opacity = '0'
        element.style.filter = 'blur(4px)'
        element.style.transform = 'translateY(5px)'
        element.style.willChange = 'height, margin-top, margin-bottom, opacity, filter, transform'
        void element.offsetHeight
        element.classList.add(CLS.disclosure)
        element.setAttribute(MOTION_SCOPE, kind)

        let frame = 0
        const finish = () => {
          if (frame) cancelAnimationFrame(frame)
          frame = 0
          const current = revealStates.get(element)
          if (current === undefined) return
          revealStates.delete(element)
          element.classList.remove(CLS.disclosure)
          element.style.height = previous.height
          element.style.marginTop = previous.marginTop
          element.style.marginBottom = previous.marginBottom
          element.style.opacity = previous.opacity
          element.style.filter = previous.filter
          element.style.transform = previous.transform
          element.style.overflow = previous.overflow
          element.style.overflowY = previous.overflowY
          element.style.willChange = previous.willChange
          element.removeAttribute(MOTION_SCOPE)
        }
        revealStates.set(element, { finish })
        frame = requestAnimationFrame(() => {
          frame = 0
          if (disposed || !element.isConnected) {
            finish()
            return
          }
          element.style.height = `${height}px`
          element.style.marginTop = `${marginTop}px`
          element.style.marginBottom = `${marginBottom}px`
          element.style.opacity = '1'
          element.style.filter = 'blur(0px)'
          element.style.transform = 'translateY(0)'
          later(finish, T.height + T.settle)
        })
        return true
      }

      /**
       * Collapse one element to zero height. The transition's end hands the
       * caller a cleanup function instead of restoring the box immediately:
       * the caller must replay the intercepted click first, otherwise the full
       * box flashes for one frame between cleanup and React's commit.
       * @param {HTMLElement} element
       * @param {(cleanup: () => void) => void} onFinished
       * @returns {boolean} whether a collapse started
       */
      function collapseElement(element, onFinished) {
        if (disposed || reducedMotion() || !element.isConnected) return false
        if (closing.has(element)) return false
        const state = revealStates.get(element)
        if (state !== undefined) {
          state.finish()
        }
        if (!canAnimateBox(element)) return false
        const height = contentHeight(element)
        if (height <= 0) return false
        const computed = getComputedStyle(element)
        const marginTop = parseFloat(computed.marginTop) || 0
        const marginBottom = parseFloat(computed.marginBottom) || 0
        closing.add(element)
        const previous = {
          height: element.style.height,
          marginTop: element.style.marginTop,
          marginBottom: element.style.marginBottom,
          opacity: element.style.opacity,
          filter: element.style.filter,
          transform: element.style.transform,
          overflow: element.style.overflow,
          overflowY: element.style.overflowY,
          pointerEvents: element.style.pointerEvents,
          willChange: element.style.willChange,
        }
        element.classList.add(CLS.disclosure)
        element.style.height = `${height}px`
        element.style.marginTop = `${marginTop}px`
        element.style.marginBottom = `${marginBottom}px`
        element.style.opacity = '1'
        element.style.filter = 'blur(0px)'
        element.style.transform = 'translateY(0)'
        element.style.willChange = 'height, margin-top, margin-bottom, opacity, filter, transform'
        element.style.pointerEvents = 'none'
        element.setAttribute(MOTION_SCOPE, 'collapse')

        let settled = false
        let cleaned = false
        let timer
        const cleanup = () => {
          if (cleaned) return
          cleaned = true
          element.classList.remove(CLS.disclosure)
          element.style.height = previous.height
          element.style.marginTop = previous.marginTop
          element.style.marginBottom = previous.marginBottom
          element.style.opacity = previous.opacity
          element.style.filter = previous.filter
          element.style.transform = previous.transform
          element.style.overflow = previous.overflow
          element.style.overflowY = previous.overflowY
          element.style.pointerEvents = previous.pointerEvents
          element.style.willChange = previous.willChange
          element.removeAttribute(MOTION_SCOPE)
        }
        const finish = () => {
          if (settled) return
          settled = true
          clearLater(timer)
          element.removeEventListener('transitionend', onTransitionEnd)
          closing.delete(element)
          onFinished(cleanup)
        }
        const onTransitionEnd = (event) => {
          if (event.target === element && event.propertyName === 'height') finish()
        }
        element.addEventListener('transitionend', onTransitionEnd)
        void element.offsetHeight
        element.style.height = '0px'
        element.style.marginTop = '0px'
        element.style.marginBottom = '0px'
        element.style.opacity = '0'
        element.style.filter = 'blur(4px)'
        element.style.transform = 'translateY(5px)'
        timer = later(finish, T.height + T.settle + 40)
        return true
      }

      /**
       * Collapse sibling boxes together and replay once after the last one.
       * @param {HTMLElement[]} elements @param {() => void} done
       */
      function collapseMany(elements, done) {
        const boxes = elements.filter(isElement)
          .filter(element => element.isConnected && !element.hasAttribute('hidden') && !closing.has(element))
        if (boxes.length === 0) {
          done()
          return false
        }
        let remaining = boxes.length
        let replayed = false
        const cleanups = []
        const finish = () => {
          if (replayed || remaining > 0) return
          replayed = true
          // Commit the closed state first. Every box is now unmounted or
          // hidden, so restoring its inline styles cannot flash a full frame.
          done()
          for (const cleanup of cleanups) cleanup()
        }
        let started = false
        for (const box of boxes) {
          const animated = collapseElement(box, (cleanup) => {
            cleanups.push(cleanup)
            remaining -= 1
            if (remaining === 0) finish()
          })
          if (animated) started = true
          else remaining -= 1
        }
        if (remaining === 0) finish()
        return started
      }

      /** @param {HTMLElement} container */
      function playChevron(container) {
        const svg = container.querySelector('svg')
        if (svg === null || !(svg instanceof SVGElement)) return
        playClassOnce(svg, CLS.chevron, T.chevron + 80)
      }

      /** @param {HTMLElement} container */
      function playChevronOut(container) {
        if (disposed || reducedMotion()) return
        const svg = container.querySelector('svg')
        if (svg === null || !(svg instanceof SVGElement)) return
        playClassOnce(svg, CLS.chevronOut, T.chevron + 80)
      }

      /** @param {HTMLElement} root @param {HTMLElement} header */
      function disclosureContent(root, header) {
        return Array.from(root.children).filter(child => child !== header)
      }

      /**
       * The group title's open-state padding-bottom is 8px. Animating it with
       * the body is what keeps the header and rows from offsetting mid-fold and
       * from jumping up by 8px when React commits the closed state.
       * @param {HTMLElement} button
       */
      function expandGroupTitle(button) {
        if (disposed || reducedMotion()) return
        const state = groupTitleStates.get(button)
        if (state !== undefined) state.clear()
        const target = parseFloat(getComputedStyle(button).paddingBottom) || 0
        if (target <= 0) return
        const previousPadding = button.style.paddingBottom
        const previousTransition = button.style.transition
        button.style.transition = 'none'
        button.style.paddingBottom = '0px'
        void button.offsetHeight
        button.style.transition = `padding-bottom ${T.height}ms ${EASE}`
        button.style.paddingBottom = `${target}px`
        const timer = later(() => {
          groupTitleStates.delete(button)
          button.style.paddingBottom = previousPadding
          button.style.transition = previousTransition
        }, T.height + T.settle)
        const clear = () => {
          clearLater(timer)
          groupTitleStates.delete(button)
          button.style.paddingBottom = previousPadding
          button.style.transition = previousTransition
        }
        groupTitleStates.set(button, { clear })
      }

      /**
       * @param {HTMLElement} button
       * @returns {() => void} cleanup to run after the replayed click commits
       */
      function collapseGroupTitle(button) {
        if (disposed || reducedMotion()) return () => {}
        const state = groupTitleStates.get(button)
        if (state !== undefined) state.clear()
        const start = parseFloat(getComputedStyle(button).paddingBottom) || 0
        if (start <= 0) return () => {}
        const previousTransition = button.style.transition
        button.style.transition = 'none'
        button.style.paddingBottom = `${start}px`
        void button.offsetHeight
        button.style.transition = `padding-bottom ${T.height}ms ${EASE}`
        button.style.paddingBottom = '0px'
        let done = false
        const cleanup = () => {
          if (done) return
          done = true
          clearLater(timer)
          groupTitleStates.delete(button)
          button.style.paddingBottom = ''
          button.style.transition = previousTransition
        }
        const timer = later(cleanup, T.height + T.settle + 120)
        groupTitleStates.set(button, { clear: cleanup })
        return cleanup
      }

      /** @param {HTMLElement} root */
      function animateOpenDisclosure(root) {
        if (disposed || reducedMotion()) return
        const header = root.querySelector(DISCLOSURE_HEADER)
        if (!(header instanceof HTMLElement)) return
        const content = disclosureContent(root, header)
        if (content.length === 0) return
        for (const element of content) {
          if (isElement(element)) revealElement(element, 'disclosure')
        }
        playChevron(header.querySelector(DISCLOSURE_ROW) ?? header)
      }

      /**
       * Decide whether this click is the disclosure header's own toggle rather
       * than an action control rendered inside the collapsed summary.
       * @param {HTMLElement} row @param {Element} target
       * @returns {HTMLElement | null} element whose click should be replayed
       */
      function disclosureToggle(row, target) {
        const leading = row.querySelector(':scope > button[aria-expanded]')
        if (leading instanceof HTMLElement && leading.contains(target)) return leading
        if (!row.hasAttribute('data-expandable')) return null
        const interactive = target.closest('button, a, input, textarea, select, [role="button"], [contenteditable="true"]')
        if (interactive !== null && interactive !== row && interactive !== leading) return null
        return row
      }

      /** @param {MouseEvent} event */
      function handleClick(event) {
        if (disposed || replaying || window[REPLAY_KEY] === true || reducedMotion() || event.defaultPrevented) return
        const target = event.target
        if (!(target instanceof Element)) return
        const collapsing = (element) => element.getAttribute(MOTION_SCOPE) === 'collapse'

        // Settings navigation swaps one section owner inside a stable wrapper;
        // animate on the next frame, after React has committed the new page.
        const settingsNav = target.closest('[data-shortcut-modal="settings"] nav button')
        if (settingsNav instanceof HTMLElement) {
          const panel = settingsNav.closest('[data-shortcut-modal="settings"]')
          if (panel instanceof HTMLElement) {
            requestAnimationFrame(() => requestAnimationFrame(() => animateSettingsSection(panel)))
          }
        }

        // Whole-Turn process summary: opening is React's job and gets the
        // chevron flourish. Closing is left to DSH's native fold: a multi-phase
        // custom height/margin animation fights the transcript's scroll and
        // layout settling, producing overshoot/rebound. In-step groups keep
        // their own animation below.
        const turnButton = target.closest('button[data-turn-process]')
        if (turnButton instanceof HTMLElement && !turnButton.disabled
          && turnButton.getAttribute('aria-expanded') !== 'true') {
          requestAnimationFrame(() => playChevron(turnButton))
        }

        // One process group: collapse its capped body.
        const groupButton = target.closest(`${STEP_PROCESS} button[aria-controls]`)
        if (groupButton instanceof HTMLElement) {
          const root = groupButton.closest(STEP_PROCESS)
          const controlled = groupButton.getAttribute('aria-controls')
          const body = controlled === null ? null : document.getElementById(controlled)
          if (root instanceof HTMLElement && body instanceof HTMLElement
            && body.matches(STEP_PROCESS_BODY) && root.contains(body)) {
            if (groupButton.getAttribute('aria-expanded') === 'true') {
              if (collapsing(body)) {
                event.preventDefault()
                event.stopImmediatePropagation()
                return
              }
              if (!body.hasAttribute('hidden') && body.closest(CHAT_MOTION_SCOPE) === null) {
                event.preventDefault()
                event.stopImmediatePropagation()
                playChevronOut(groupButton)
                const titleCleanup = collapseGroupTitle(groupButton)
                collapseMany([body], () => {
                  replayClick(groupButton)
                  titleCleanup()
                })
                return
              }
            } else {
              requestAnimationFrame(() => playChevron(groupButton))
            }
          }
        }

        // One tool/reasoning disclosure row.
        const row = target.closest(DISCLOSURE_ROW)
        if (row instanceof HTMLElement) {
          const header = row.closest(DISCLOSURE_HEADER)
          const root = header instanceof HTMLElement ? header.parentElement : null
          if (root instanceof HTMLElement && root.hasAttribute('data-open')) {
            const toggle = disclosureToggle(row, target)
            if (toggle === null) return
            const content = disclosureContent(root, header)
            if (content.length === 0) return
            event.preventDefault()
            event.stopImmediatePropagation()
            if (content.some(element => collapsing(element))) return
            playChevronOut(header.querySelector(DISCLOSURE_ROW) ?? header)
            collapseMany(content.filter(isElement), () => replayClick(toggle))
          }
        }
      }

      /** @param {HTMLElement} button */
      function visibleGroups(button) {
        const turn = button.getAttribute('data-turn-process')
        if (turn === null || turn === '') return []
        const selector = `${STEP_PROCESS}[data-chat-turn="${escapeAttribute(turn)}"]`
        return Array.from(document.querySelectorAll(selector)).filter(group =>
          group instanceof HTMLElement
          && !group.hasAttribute('hidden')
          && group.closest('[hidden]') === null
          && group.getBoundingClientRect().height > 0)
      }

      /** @param {HTMLElement} element */
      function replayClick(element) {
        if (disposed || !element.isConnected || window[REPLAY_KEY] === true) return
        replaying = true
        window[REPLAY_KEY] = true
        try {
          element.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1,
          }))
        } finally {
          window[REPLAY_KEY] = false
          replaying = false
        }
      }

      /**
       * A menu is added at its final position; animate from the trigger's side.
       * @param {HTMLElement} menu
       */
      function animateMenuEnter(menu, force = false) {
        if (disposed || reducedMotion()) return
        if (menu.closest('[data-dsh-anim-ghost]') !== null) return
        // First appearance is deduped by meta; a role change (menu ↔ group,
        // e.g. the model selector drilling into its model pane) forces the same
        // reveal so opening and expanding read as one motion system.
        if (!force && menuMeta.has(menu)) return
        const rect = menu.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        const trigger = nearestMenuTrigger(menu)
        const direction = trigger === null
          ? (rect.top > window.innerHeight / 2 ? 'up' : 'down')
          : directionFromTrigger(rect, trigger.getBoundingClientRect())
        const className = direction === 'up'
          ? CLS.menuEnterUp
          : direction === 'right' ? CLS.menuEnterRight : CLS.menuEnterDown
        menuMeta.set(menu, { rect })
        activeMenus.add(menu)
        const previous = menuClassTimers.get(menu)
        if (previous !== undefined) {
          clearLater(previous)
          menu.classList.remove(CLS.menuEnterUp, CLS.menuEnterDown, CLS.menuEnterRight)
        }
        void menu.offsetWidth
        menu.classList.add(className)
        const timer = later(() => {
          menu.classList.remove(className)
          menuClassTimers.delete(menu)
          if (menu.isConnected) {
            const meta = menuMeta.get(menu)
            if (meta !== undefined) meta.rect = menu.getBoundingClientRect()
          }
        }, T.menuBlur + 60)
        menuClassTimers.set(menu, timer)
      }

      /** @param {HTMLElement} menu @returns {HTMLElement | null} */
      function nearestMenuTrigger(menu) {
        const viewport = window.innerWidth + window.innerHeight
        const menuRect = menu.getBoundingClientRect()
        let best = null
        let bestDistance = Number.POSITIVE_INFINITY
        const candidates = document.querySelectorAll('button[aria-haspopup="menu"][aria-expanded="true"], [role="button"][aria-haspopup="menu"][aria-expanded="true"]')
        for (const candidate of candidates) {
          if (!(candidate instanceof HTMLElement) || menu.contains(candidate)) continue
          const rect = candidate.getBoundingClientRect()
          if (rect.width <= 0 || rect.height <= 0) continue
          const distance = Math.max(0, rect.left - menuRect.right)
            + Math.max(0, menuRect.left - rect.right)
            + Math.max(0, rect.top - menuRect.bottom)
            + Math.max(0, menuRect.top - rect.bottom)
          if (distance < bestDistance && distance < viewport) {
            bestDistance = distance
            best = candidate
          }
        }
        return best
      }

      /** @param {DOMRect} menu @param {DOMRect} trigger @returns {'up' | 'down' | 'right'} */
      function directionFromTrigger(menu, trigger) {
        if (menu.bottom <= trigger.top + 2) return 'up'
        if (menu.top >= trigger.bottom - 2) return 'down'
        if (menu.left >= trigger.right - 2) return 'right'
        return menu.top + menu.height / 2 < trigger.top ? 'up' : 'down'
      }

      /**
       * Clone the closed menu into a fixed, non-interactive card and play the
       * reverse reveal. The menu material is opaque (no backdrop-filter), so
       * the ghost can safely fade and blur without a white flash.
       * @param {HTMLElement} menu
       */
      function ghostMenu(menu) {
        if (disposed || reducedMotion()) return
        if (menu.classList.contains(CLS.menuEnterUp)
          || menu.classList.contains(CLS.menuEnterDown)
          || menu.classList.contains(CLS.menuEnterRight)) return
        const rect = menuMeta.get(menu)?.rect ?? menu.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        const ghost = menu.cloneNode(true)
        if (!(ghost instanceof HTMLElement)) return
        ghost.removeAttribute('id')
        ghost.setAttribute('aria-hidden', 'true')
        ghost.setAttribute('data-dsh-anim-ghost', '')
        ghost.removeAttribute(MOTION_SCOPE)
        ghost.classList.remove(CLS.menuEnterUp, CLS.menuEnterDown, CLS.menuEnterRight)
        ghost.classList.add(CLS.menuExit)
        ghost.style.setProperty('position', 'fixed', 'important')
        ghost.style.setProperty('left', `${rect.left}px`, 'important')
        ghost.style.setProperty('top', `${rect.top}px`, 'important')
        ghost.style.setProperty('box-sizing', 'border-box', 'important')
        ghost.style.setProperty('width', `${menu.offsetWidth || rect.width}px`, 'important')
        ghost.style.setProperty('height', `${menu.offsetHeight || rect.height}px`, 'important')
        ghost.style.setProperty('margin', '0', 'important')
        ghost.style.setProperty('pointer-events', 'none', 'important')
        ghost.style.setProperty('z-index', '990', 'important')
        ghost.style.removeProperty('--dsh-menu-anchor')
        ghost.style.setProperty('anchor-name', 'none', 'important')
        document.body.appendChild(ghost)
        ghosts.add(ghost)
        later(() => {
          ghost.remove()
          ghosts.delete(ghost)
        }, T.menuExit + 80)
      }

      /** @param {HTMLElement} panel */
      function animateDialogEnter(panel) {
        if (disposed || reducedMotion() || dialogMeta.has(panel)) return
        if (panel.closest('[data-dsh-anim-ghost]') !== null || panel.closest(`.${CLS.dialogExit}`) !== null) return
        const rect = panel.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        const container = panel.parentElement
        const mask = container === null ? null : findMask(container, panel)
        dialogMeta.set(panel, { container, mask, rect })
        activeDialogs.add(panel)
        panel.classList.add(CLS.dialogEnter)
        if (mask !== null) mask.classList.add(CLS.overlayEnter)
        later(() => {
          panel.classList.remove(CLS.dialogEnter)
          if (mask !== null) mask.classList.remove(CLS.overlayEnter)
          // The primitive's base `.dialog` rule keeps `modalEnter`; suppress a
          // restart when our longer enter class is removed.
          panel.style.animation = 'none'
        }, T.dialogBlur + 60)
        if (panel.getAttribute('data-shortcut-modal') === 'settings') observeSettingsSections(panel)
      }

      /** @param {HTMLElement} container @param {HTMLElement} panel @returns {HTMLElement | null} */
      function findMask(container, panel) {
        for (const child of container.children) {
          if (child !== panel && child instanceof HTMLElement && child.getAttribute('aria-hidden') === 'true') return child
        }
        return null
      }

      /** @param {HTMLElement} panel */
      function ghostDialog(panel) {
        if (disposed || reducedMotion()) return
        const meta = dialogMeta.get(panel)
        const container = meta?.container
        const source = container instanceof HTMLElement && container !== document.body && container.contains(panel)
          ? container
          : panel
        const rect = meta?.rect ?? panel.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        disconnectSettingsSections(panel)
        const ghost = source.cloneNode(true)
        if (!(ghost instanceof HTMLElement)) return
        ghost.setAttribute('aria-hidden', 'true')
        ghost.setAttribute('data-dsh-anim-ghost', '')
        ghost.removeAttribute(MOTION_SCOPE)
        ghost.style.setProperty('pointer-events', 'none', 'important')
        ghost.style.setProperty('z-index', '990', 'important')
        if (source === panel) {
          ghost.style.setProperty('position', 'fixed', 'important')
          ghost.style.setProperty('left', `${rect.left}px`, 'important')
          ghost.style.setProperty('top', `${rect.top}px`, 'important')
          ghost.style.setProperty('width', `${rect.width}px`, 'important')
          ghost.style.setProperty('height', `${rect.height}px`, 'important')
          ghost.style.setProperty('margin', '0', 'important')
        } else {
          ghost.style.setProperty('position', 'fixed', 'important')
          ghost.style.setProperty('inset', '0', 'important')
        }
        const clonedPanel = ghost.matches(DIALOG_SELECTOR) ? ghost : ghost.querySelector(DIALOG_SELECTOR)
        if (clonedPanel instanceof HTMLElement) {
          clonedPanel.classList.remove(CLS.dialogEnter)
          clonedPanel.style.animation = ''
          clonedPanel.classList.add(CLS.dialogExit)
        }
        const clonedMask = source === panel
          ? null
          : findMask(ghost, clonedPanel instanceof HTMLElement ? clonedPanel : ghost)
        if (clonedMask !== null) {
          clonedMask.classList.remove(CLS.overlayEnter)
          clonedMask.classList.add(CLS.overlayExit)
        }
        document.body.appendChild(ghost)
        ghosts.add(ghost)
        later(() => {
          ghost.remove()
          ghosts.delete(ghost)
        }, T.dialogExit + 80)
      }

      /** @param {HTMLElement} panel */
      function observeSettingsSections(panel) {
        if (disposed || settingsObservers.has(panel)) return
        const content = panel.lastElementChild
        const options = content?.lastElementChild
        if (!(options instanceof HTMLElement)) return
        const observer = new MutationObserver(() => {
          if (!disposed) animateSettingsSection(panel)
        })
        observer.observe(options, { childList: true })
        settingsObservers.set(panel, observer)
        animateSettingsSection(panel)
      }

      /** @param {HTMLElement} panel */
      function animateSettingsSection(panel) {
        if (disposed || reducedMotion() || !panel.isConnected) return
        const outlet = panel.querySelector('[data-slot="settings.section"]')
        if (outlet instanceof HTMLElement) {
          const surface = visibleSurface(outlet)
          if (surface !== null) {
            playClassOnce(surface, CLS.sectionEnter, T.pageBlur + 60)
            return
          }
        }
        const content = panel.lastElementChild
        const options = content?.lastElementChild
        const first = options?.firstElementChild
        if (first instanceof HTMLElement) animateSection(first)
      }

      /** @param {HTMLElement} panel */
      function disconnectSettingsSections(panel) {
        const observer = settingsObservers.get(panel)
        if (observer === undefined) return
        observer.disconnect()
        settingsObservers.delete(panel)
      }

      /**
       * Slot anchors are `display: contents`; walk through them to the box the
       * reader actually sees before starting a page/section reveal.
       * @param {HTMLElement} element
       * @returns {HTMLElement | null}
       */
      function visibleSurface(element) {
        let current = element
        for (let depth = 0; depth < 5; depth += 1) {
          if (!(current instanceof HTMLElement) || !current.isConnected) return null
          const style = getComputedStyle(current)
          if (style.display !== 'contents' && current.getBoundingClientRect().height > 0) return current
          const next = current.firstElementChild
          if (!(next instanceof HTMLElement)) return null
          current = next
        }
        return null
      }

      /** @param {HTMLElement} element */
      function animateSessionSwitch(element) {
        if (disposed || reducedMotion()) return
        requestAnimationFrame(() => {
          if (disposed || !element.isConnected) return
          playClassOnce(element, CLS.sectionEnter, T.pageBlur + 60)
        })
      }

      /** @param {HTMLElement} element */
      function animatePage(element) {
        if (disposed || reducedMotion()) return
        const surface = visibleSurface(element)
        if (surface === null) return
        playClassOnce(surface, CLS.pageEnter, T.pageBlur + 60)
      }

      /** @param {HTMLElement} element */
      function animateSection(element) {
        if (disposed || reducedMotion()) return
        const surface = visibleSurface(element)
        if (surface === null) return
        playClassOnce(surface, CLS.sectionEnter, T.pageBlur + 60)
      }

      /**
       * Observe the main panel slot. `display: contents` makes the slot wrapper
       * transparent to layout, so direct children are the visible pages.
       */
      function ensureSlots() {
        if (disposed) return
        if (!mainSlot || !mainSlot.isConnected) {
          mainObserver?.disconnect()
          const nextMain = document.querySelector('[data-slot="main"]')
          mainSlot = nextMain
          if (nextMain !== null) {
            mainObserver = new MutationObserver(records => {
              for (const record of records) {
                for (const node of record.addedNodes) {
                  if (node.nodeType === Node.ELEMENT_NODE) animatePage(/** @type {HTMLElement} */ (node))
                }
              }
            })
            mainObserver.observe(nextMain, { childList: true })
          }
        }
        if (!sidebarSlot || !sidebarSlot.isConnected) {
          sidebarObserver?.disconnect()
          const nextSidebar = document.querySelector('[data-slot="sidebar.workspaces"]')
          sidebarSlot = nextSidebar
          if (nextSidebar !== null) {
            sidebarObserver = new MutationObserver(records => {
              for (const record of records) {
                for (const node of record.addedNodes) {
                  if (node.nodeType === Node.ELEMENT_NODE) animateSection(/** @type {HTMLElement} */ (node))
                }
              }
            })
            sidebarObserver.observe(nextSidebar, { childList: true })
          }
        }
      }

      /** @param {Element} node @param {Set<HTMLElement>} openRoots */
      function handleAdded(node, openRoots) {
        if (node.parentElement === document.body && node.hasAttribute('data-dsh-anim-ghost')) return
        if (node instanceof HTMLElement) {
          // In-place dropdowns (Menu portal={false}) are inserted inside their
          // anchor wrapper, not under <body>; portaled ones arrive as body
          // children. Handle both without walking arbitrary transcript nodes.
          const role = node.getAttribute('role')
          if (node.hasAttribute('data-menu-material')) animateMenuEnter(node)
          else if (role === 'dialog' && node.getAttribute('aria-modal') === 'true') animateDialogEnter(node)
          else if (node.tagName === 'DIV' && node.hasAttribute('data-sidebar-right-tab')) animateSection(node)
        }
        if (node.parentElement === document.body) {
          // A menu node was already handled above; only scan wrappers (dialogs,
          // overlay roots) for nested portals here.
          const menu = node.matches(MENU_SELECTOR) ? null : node.querySelector(MENU_SELECTOR)
          if (menu instanceof HTMLElement) animateMenuEnter(menu)
          const dialog = node.matches(DIALOG_SELECTOR) ? node : node.querySelector(DIALOG_SELECTOR)
          if (dialog instanceof HTMLElement) animateDialogEnter(dialog)
        }

        const parent = node.parentElement
        if (parent instanceof HTMLElement && parent.hasAttribute('data-open')) {
          const header = parent.querySelector(DISCLOSURE_HEADER)
          if (header instanceof HTMLElement && header.parentElement === parent) openRoots.add(parent)
        }
      }

      /** @param {Element} node */
      function handleRemoved(node) {
        if (disposed) return
        for (const menu of [...activeMenus]) {
          if (node === menu || node.contains(menu)) {
            activeMenus.delete(menu)
            ghostMenu(menu)
          }
        }
        for (const panel of [...activeDialogs]) {
          if (node === panel || node.contains(panel)) {
            activeDialogs.delete(panel)
            ghostDialog(panel)
          }
        }
      }

      /** Update stored geometry while a menu/dialog is open and the page moves. */
      function refreshGeometry() {
        if (disposed) return
        for (const menu of activeMenus) {
          if (!menu.isConnected) continue
          if (menu.classList.contains(CLS.menuEnterUp)
            || menu.classList.contains(CLS.menuEnterDown)
            || menu.classList.contains(CLS.menuEnterRight)) continue
          const meta = menuMeta.get(menu)
          if (meta !== undefined) meta.rect = menu.getBoundingClientRect()
        }
        for (const panel of activeDialogs) {
          if (!panel.isConnected) continue
          const meta = dialogMeta.get(panel)
          if (meta !== undefined) meta.rect = panel.getBoundingClientRect()
        }
      }

      function installObservers() {
        bodyObserver = new MutationObserver(records => {
          const openRoots = new Set()
          for (const record of records) {
            for (const node of record.addedNodes) {
              if (node.nodeType !== Node.ELEMENT_NODE) continue
              if (seenAdded.has(node)) continue
              seenAdded.add(node)
              handleAdded(node, openRoots)
            }
            for (const node of record.removedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) handleRemoved(node)
            }
          }
          for (const root of openRoots) animateOpenDisclosure(root)
          ensureSlots()
        })
        bodyObserver.observe(document.body, { childList: true, subtree: true })

        hiddenObserver = new MutationObserver(records => {
          if (reducedMotion()) return
          for (const record of records) {
            const target = record.target
            if (!(target instanceof HTMLElement) || target.hasAttribute('hidden')) continue
            if (target.closest(CHAT_MOTION_SCOPE) !== null) continue
            if (target.matches(STEP_PROCESS) || target.matches(STEP_PROCESS_BODY)) {
              if (target.matches(STEP_PROCESS_BODY)) {
                const root = target.closest(STEP_PROCESS)
                const chevron = root?.querySelector('[data-step-process-chevron]')
                if (chevron instanceof HTMLElement) playChevron(chevron)
                const button = root?.querySelector('button[aria-controls]')
                if (button instanceof HTMLElement) expandGroupTitle(button)
              }
              revealElement(target, target.matches(STEP_PROCESS_BODY) ? 'group-body' : 'group-root')
            }
          }
        })
        hiddenObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['hidden'],
          subtree: true,
        })

        // Session switching keeps the conversation shell mounted and swaps the
        // `data-conversation-session` identity. Fade the new transcript in
        // without touching the resident header.
        sessionObserver = new MutationObserver(records => {
          for (const record of records) {
            const target = record.target
            if (!(target instanceof HTMLElement) || !target.hasAttribute('data-conversation-content')) continue
            const previous = record.oldValue
            const next = target.getAttribute('data-conversation-session')
            if (previous === null || next === null || previous === next) continue
            animateSessionSwitch(target)
          }
        })
        sessionObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-conversation-session'],
          subtree: true,
          attributeOldValue: true,
        })

        // Model select and similar menus swap role="menu" ↔ role="group" on
        // the same surface when drilling; redraw the card with the reveal.
        menuRoleObserver = new MutationObserver(records => {
          if (disposed) return
          for (const record of records) {
            const target = record.target
            if (!(target instanceof HTMLElement) || !target.hasAttribute('data-menu-material')) continue
            if (record.oldValue === target.getAttribute('role')) continue
            animateMenuEnter(target, true)
          }
        })
        menuRoleObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['role'],
          subtree: true,
          attributeOldValue: true,
        })

        on(document, 'click', handleClick, true)
        // Snapshot menu geometry before DSH's own mousedown/Escape close
        // handlers run, so the exit ghost starts from the box on screen.
        on(document, 'pointerdown', refreshGeometry, true)
        on(document, 'keydown', refreshGeometry, true)
        on(window, 'scroll', refreshGeometry, true)
        on(window, 'resize', refreshGeometry)
        on(window, 'pagehide', () => dispose())
        ensureSlots()
      }

      function dispose() {
        if (disposed) return
        disposed = true
        const pending = [...disposers]
        disposers.length = 0
        for (const fn of pending) fn()
        bodyObserver?.disconnect()
        hiddenObserver?.disconnect()
        mainObserver?.disconnect()
        sidebarObserver?.disconnect()
        sessionObserver?.disconnect()
        menuRoleObserver?.disconnect()
        bodyObserver = undefined
        hiddenObserver = undefined
        mainObserver = undefined
        sidebarObserver = undefined
        sessionObserver = undefined
        menuRoleObserver = undefined
        if (bootListener !== undefined) {
          document.removeEventListener('DOMContentLoaded', bootListener)
          bootListener = undefined
        }
        for (const timer of timers) window.clearTimeout(timer)
        timers.clear()
        for (const state of [...revealStates.values()]) state.finish()
        revealStates.clear()
        // Unload mid-collapse must not leave a box stuck at height 0: the
        // intercepted click is never replayed once the plugin is gone.
        for (const element of document.querySelectorAll(`[${MOTION_SCOPE}]`)) {
          if (!(element instanceof HTMLElement)) continue
          element.classList.remove(CLS.disclosure)
          for (const property of ['height', 'opacity', 'filter', 'transform', 'overflow', 'overflowY', 'pointerEvents', 'willChange']) {
            element.style[property] = ''
          }
          element.removeAttribute(MOTION_SCOPE)
        }
        for (const ghost of ghosts) ghost.remove()
        ghosts.clear()
        for (const menu of activeMenus) {
          menu.classList.remove(CLS.menuEnterUp, CLS.menuEnterDown, CLS.menuEnterRight, CLS.menuExit)
        }
        activeMenus.clear()
        menuMeta.clear()
        menuClassTimers.clear()
        for (const state of [...groupTitleStates.values()]) state.clear()
        groupTitleStates.clear()
        for (const panel of activeDialogs) {
          panel.classList.remove(CLS.dialogEnter, CLS.dialogExit)
          panel.style.animation = ''
          disconnectSettingsSections(panel)
        }
        activeDialogs.clear()
        for (const observer of settingsObservers.values()) observer.disconnect()
        if (styleEl !== null) styleEl.remove()
      }

      let styleEl = null
      function start() {
        if (disposed) return
        const disposeStyles = installStyles()
        styleEl = document.getElementById(STYLE_ID)
        disposers.push(disposeStyles)
        if (document.body === null) {
          bootListener = () => {
            bootListener = undefined
            if (!disposed) installObservers()
          }
          document.addEventListener('DOMContentLoaded', bootListener, { once: true })
          return
        }
        installObservers()
      }

      return { start, dispose }
    }

    return {
      apply(ctx) {
        // HMR can execute a client bundle again before the previous runtime's
        // cleanup runs. Two click interceptors would replay each other's
        // synthetic clicks forever, so keep exactly one runtime alive.
        const previous = window[RUNTIME_KEY]
        if (previous !== undefined && typeof previous.dispose === 'function') {
          try {
            previous.dispose()
          } catch {}
        }
        const runtime = createRuntime()
        const handle = {
          dispose() {
            runtime.dispose()
            if (window[RUNTIME_KEY] === handle) delete window[RUNTIME_KEY]
          },
        }
        window[RUNTIME_KEY] = handle
        ctx.effect(() => {
          runtime.start()
          return () => handle.dispose()
        }, 'dsh-animation-enhance: motion layer')
      },
    }
  },
})
