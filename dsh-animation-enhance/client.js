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
      pageFade: 'dsh-anim-page-fade',
      sectionEnter: 'dsh-anim-section-enter',
      sectionBlur: 'dsh-anim-section-blur',
      menuSurface: 'dsh-anim-menu-surface',
    }

    const MENU_SELECTOR = '[data-menu-material]'
    const DIALOG_SELECTOR = '[role="dialog"][aria-modal="true"]'
    const DISCLOSURE_HEADER = '[data-disclosure-header]'
    const DISCLOSURE_ROW = '[data-disclosure-row]'
    const STEP_PROCESS = '[data-step-process]'
    const STEP_PROCESS_BODY = '[data-step-process-body]'
    const CHAT_MOTION_SCOPE = '[data-chat-motion]'
    const CHEVRON_SELECTOR = '[data-step-process-chevron], [data-disclosure-chevron], [data-chevron]'
    // `filter` repaints the whole subtree every frame; only pay for it on small
    // surfaces and fall back to a plain fade on long transcripts.
    const BLUR_NODE_BUDGET = 500
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
      @keyframes dsh-anim-section-blur {
        from { filter: blur(6px); }
        to { filter: blur(0); }
      }
      .${CLS.sectionBlur} {
        animation: dsh-anim-section-blur 240ms var(--dsh-anim-ease) both !important;
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

      /* The user prefers a full-card blur-to-clear reveal over the native
         background blur. Opaque the menu material and hide the macOS backing
         first: with no backdrop-filter to preserve, the surface can safely
         animate filter/opacity/scale without a white flash or a detached
         backing rectangle. The class is added by this plugin to the menus it
         animates and must stay for the menu's whole lifetime: dropping it when
         the animation ends would pop the translucent material back mid-open. */
      .${CLS.menuSurface} > [aria-hidden="true"] {
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
      /* Large surfaces (a long transcript) skip the blur and only fade. */
      .${CLS.pageFade} {
        animation: dsh-anim-fade-in ${T.pageFade}ms var(--dsh-anim-ease) both !important;
      }

      [${MOTION_SCOPE}="collapse"] {
        pointer-events: none !important;
      }

      @media (prefers-reduced-motion: reduce) {
        .${CLS.disclosure},
        .${CLS.menuEnterUp},
        .${CLS.menuEnterDown},
        .${CLS.menuEnterRight},
        .${CLS.menuExit},
        .${CLS.dialogEnter},
        .${CLS.dialogExit},
        .${CLS.overlayEnter},
        .${CLS.overlayExit},
        .${CLS.pageEnter},
        .${CLS.pageFade},
        .${CLS.sectionEnter},
        .${CLS.sectionBlur} {
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

    /**
     * Read an element's rendered rotation in degrees. Only a pure rotation is
     * accepted: a matrix with scale, skew or translation would be lost by the
     * arrow animation, so those report `null` and no animation runs.
     * @param {Element} element
     * @returns {number | null} degrees, or null when the transform is not a pure rotation
     */
    function rotationOf(element) {
      const raw = getComputedStyle(element).transform
      if (raw === '' || raw === 'none') return 0
      const match = /^matrix\(([^)]+)\)$/.exec(raw)
      if (match === null) return null
      const parts = match[1].split(',').map(Number)
      if (parts.length !== 6 || parts.some(Number.isNaN)) return null
      const [a, b, c, d, e, f] = parts
      if (Math.abs(a * a + b * b - 1) > 0.01 || Math.abs(c * c + d * d - 1) > 0.01) return null
      if (Math.abs(e) > 0.5 || Math.abs(f) > 0.5) return null
      return Math.round(Math.atan2(b, a) * (180 / Math.PI) * 10) / 10
    }

    /**
     * The arrow DSH itself marks as a chevron. Never fall back to "the first
     * svg in the row": disclosure rows routinely start with a tool icon, and
     * spinning that is worse than no flourish at all.
     * @param {Element | null | undefined} container
     * @returns {Element | null}
     */
    function chevronOf(container) {
      if (!(container instanceof Element)) return null
      return container.querySelector(CHEVRON_SELECTOR)
    }

    /**
     * Capture the facts a replayed click must keep so handlers that read the
     * event still see the original pointer, button and modifier state.
     * @param {MouseEvent} event
     * @returns {MouseEventInit}
     */
    function clickFacts(event) {
      return {
        detail: event.detail || 1,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      }
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
      const settingsSectionSurfaces = new Map()
      const menuMeta = new Map()
      const dialogMeta = new WeakMap()
      const activeMenus = new Set()
      const activeDialogs = new Set()
      const ghosts = new Set()
      const seenAdded = new WeakSet()
      const menuClassTimers = new Map()
      const groupTitleStates = new Map()
      const closing = new WeakSet()
      // Per collapsible root: the user's latest action, so a delayed replay can
      // tell that they already changed their mind instead of overruling them.
      const lastIntent = new WeakMap()
      const transitionListeners = new Set()

      let disposed = false
      let replaying = false
      let bodyObserver
      let hiddenObserver
      let mainObserver
      let sidebarObserver
      let menuRoleObserver
      let mainSlot = null
      let sidebarSlot = null
      let bootListener
      let geometryFrame = 0

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
       * @param {string} [kind] recorded on the element for debugging only
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
        element.setAttribute(MOTION_SCOPE, 'reveal')
        element.setAttribute('data-dsh-anim-kind', kind)

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
          element.removeAttribute('data-dsh-anim-kind')
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
          detachTransition()
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
          element.removeAttribute('data-dsh-anim-kind')
        }
        const finish = () => {
          if (settled) return
          settled = true
          clearLater(timer)
          detachTransition()
          closing.delete(element)
          onFinished(cleanup)
        }
        const onTransitionEnd = (event) => {
          if (event.target === element && event.propertyName === 'height') finish()
        }
        const detachTransition = () => {
          element.removeEventListener('transitionend', onTransitionEnd)
          transitionListeners.delete(detachTransition)
        }
        element.addEventListener('transitionend', onTransitionEnd)
        transitionListeners.add(detachTransition)
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

      /**
       * Play the arrow's own rotation as a measured delta instead of a fixed
       * 0°/180° keyframe pair. The angle before React commits is read now, the
       * committed angle is read two frames later, and the two are interpolated
       * with the Web Animations API. DSH keeps ownership: if the angle is still
       * moving, DSH is transitioning the arrow itself and we stay out of the
       * way; if nothing moved there is nothing to play.
       * @param {Element | null | undefined} marker
       */
      function scheduleChevron(marker) {
        if (disposed || reducedMotion() || !(marker instanceof Element) || !marker.isConnected) return
        const from = rotationOf(marker)
        if (from === null) return
        requestAnimationFrame(() => {
          if (disposed || !marker.isConnected) return
          const first = rotationOf(marker)
          requestAnimationFrame(() => {
            if (disposed || !marker.isConnected || first === null) return
            const settled = rotationOf(marker)
            if (settled === null) return
            // Still moving: DSH owns this transition, do not fight it.
            if (settled !== first) return
            if (Math.abs(settled - from) < 1) return
            try {
              const animation = marker.animate(
                [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${settled}deg)` }],
                { duration: T.chevron, easing: EASE, fill: 'none' },
              )
              animation.addEventListener('finish', () => animation.cancel(), { once: true })
            } catch {
              // WAAPI unavailable or the element rejects the keyframes.
            }
          })
        })
      }

      /** @param {HTMLElement} root @param {HTMLElement} header */
      function disclosureContent(root, header) {
        const content = root.querySelector('[data-disclosure-content]')
        if (content instanceof HTMLElement) return [content]
        // Fallback: every direct child of the disclosure root is a collapsible
        // content box; the header is the only non-content child.
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
        for (const element of content) {
          if (isElement(element)) revealElement(element, 'disclosure')
        }
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

      /**
       * Record the user's latest action on a collapsible root. A delayed replay
       * consults it: a click that asked to open again wins, while a repeated
       * "close" click does not cancel the collapse already running.
       * @param {HTMLElement} root
       * @param {'open' | 'close'} action
       */
      function bumpIntent(root, action) {
        lastIntent.set(root, action)
      }

      /**
       * Re-resolve the group toggle in the live tree: streaming output can
       * replace the row while the collapse animation runs.
       * @param {HTMLElement} root
       * @returns {HTMLElement | null}
       */
      function liveGroupToggle(root) {
        if (!root.isConnected) return null
        return root.querySelector('button[aria-controls]')
      }

      /**
       * @param {HTMLElement} root
       * @returns {HTMLElement | null} the disclosure row inside this root
       */
      function liveDisclosureRow(root) {
        if (!root.isConnected) return null
        const header = root.querySelector(DISCLOSURE_HEADER)
        return header instanceof HTMLElement ? header.querySelector(DISCLOSURE_ROW) : null
      }

      /**
       * @param {HTMLElement} root
       * @returns {HTMLElement | null} the disclosure toggle element, if any
       */
      function liveDisclosureToggle(root) {
        const row = liveDisclosureRow(root)
        if (!(row instanceof HTMLElement)) return null
        const leading = row.querySelector(':scope > button[aria-expanded]')
        if (leading instanceof HTMLElement) return leading
        return row.hasAttribute('data-expandable') ? row : null
      }

      /** @param {MouseEvent} event */
      function handleClick(event) {
        if (disposed || replaying || window[REPLAY_KEY] === true || reducedMotion() || event.defaultPrevented) return
        const target = event.target
        if (!(target instanceof Element)) return
        const collapsing = (element) => element.getAttribute(MOTION_SCOPE) === 'collapse'
        const facts = clickFacts(event)

        // Whole-Turn process summary: only the chevron flourish is ours.
        // Opening and closing the outer fold are left entirely to DSH. A
        // custom height/margin animation fought the transcript's scroll, and a
        // View Transition repainted the whole page (it read as a reload), so
        // native instant folding is the stable contract here. In-step groups
        // keep their own animation below.
        const turnButton = target.closest('button[data-turn-process]')
        if (turnButton instanceof HTMLElement && !turnButton.disabled
          && turnButton.getAttribute('aria-expanded') !== 'true') {
          scheduleChevron(chevronOf(turnButton))
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
              bumpIntent(root, 'close')
              if (collapsing(body)) {
                event.preventDefault()
                event.stopImmediatePropagation()
                return
              }
              if (!body.hasAttribute('hidden') && body.closest(CHAT_MOTION_SCOPE) === null) {
                event.preventDefault()
                event.stopImmediatePropagation()
                const titleCleanup = collapseGroupTitle(groupButton)
                collapseMany([body], () => {
                  // Replay only while closing is still the right action: a new
                  // open click, or React already committing the closed state,
                  // must win over this delayed click.
                  // Prefer the element the user actually clicked; only fall
                  // back to re-resolving when a render replaced it.
                  const live = groupButton.isConnected ? groupButton : liveGroupToggle(root)
                  if (lastIntent.get(root) === 'close' && live !== null
                    && live.getAttribute('aria-expanded') === 'true') {
                    scheduleChevron(chevronOf(root))
                    replayClick(live, facts)
                  }
                  titleCleanup()
                })
                return
              }
            } else {
              bumpIntent(root, 'open')
              scheduleChevron(chevronOf(root))
            }
          }
        }

        // One tool/reasoning disclosure row.
        const row = target.closest(DISCLOSURE_ROW)
        if (row instanceof HTMLElement) {
          const header = row.closest(DISCLOSURE_HEADER)
          const root = header instanceof HTMLElement ? header.parentElement : null
          if (!(root instanceof HTMLElement)) return
          const toggle = disclosureToggle(row, target)
          if (!root.hasAttribute('data-open')) {
            // Opening is DSH's; we only add the arrow flourish, measured from
            // the angle the row has right now (before React commits).
            if (toggle !== null) {
              bumpIntent(root, 'open')
              scheduleChevron(chevronOf(row))
            }
            return
          }
          if (toggle === null) return
          const content = disclosureContent(root, header)
          if (content.length === 0) return
          bumpIntent(root, 'close')
          if (content.some(element => collapsing(element))) {
            event.preventDefault()
            event.stopImmediatePropagation()
            return
          }
          event.preventDefault()
          event.stopImmediatePropagation()
          collapseMany(content.filter(isElement), () => {
            const live = toggle.isConnected ? toggle : liveDisclosureToggle(root)
            if (lastIntent.get(root) !== 'close' || live === null || !root.hasAttribute('data-open')) return
            scheduleChevron(chevronOf(liveDisclosureRow(root)))
            replayClick(live, facts)
          })
        }
      }

      /**
       * Replay an intercepted click on a live element, keeping the pointer,
       * button and modifier facts the original event carried.
       * @param {HTMLElement} element
       * @param {MouseEventInit} facts
       * @returns {boolean} whether a click was dispatched
       */
      function replayClick(element, facts = {}) {
        if (disposed || !element.isConnected || window[REPLAY_KEY] === true) return false
        replaying = true
        window[REPLAY_KEY] = true
        try {
          element.dispatchEvent(new MouseEvent('click', {
            ...facts,
            bubbles: true,
            cancelable: true,
            view: window,
          }))
          return true
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
        // Opaque the material only for surfaces this plugin animates; menus it
        // never touches keep the native translucent look.
        menu.classList.add(CLS.menuSurface)
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
        sanitizeGhost(ghost)
        ghost.classList.remove(CLS.menuEnterUp, CLS.menuEnterDown, CLS.menuEnterRight)
        ghost.classList.add(CLS.menuExit, CLS.menuSurface)
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
        const mask = findMask(panel)
        // Keep the geometry: the exit ghost is cloned after the panel has left
        // the DOM, where its own box already reads 0×0.
        dialogMeta.set(panel, {
          container,
          rect,
          containerRect: container instanceof HTMLElement ? container.getBoundingClientRect() : null,
        })
        activeDialogs.add(panel)
        panel.classList.add(CLS.dialogEnter)
        if (mask !== null) mask.classList.add(CLS.overlayEnter)
        later(() => {
          panel.classList.remove(CLS.dialogEnter)
          if (mask !== null) mask.classList.remove(CLS.overlayEnter)
          // The primitive's base `.dialog` rule keeps `modalEnter`; suppress a
          // restart when our longer enter class is removed. Cleared again when
          // the panel leaves the DOM (see handleRemoved).
          panel.style.animation = 'none'
        }, T.dialogBlur + 60)
        if (panel.getAttribute('data-shortcut-modal') === 'settings') observeSettingsSections(panel)
      }

      /**
       * The dialog's own scrim: a sibling in its wrapper that is hidden from AT.
       * @param {HTMLElement} container @param {HTMLElement} panel
       * @returns {HTMLElement | null}
       */
      function maskIn(container, panel) {
        for (const child of container.children) {
          if (child !== panel && child instanceof HTMLElement && child.getAttribute('aria-hidden') === 'true') return child
        }
        return null
      }

      /** @param {HTMLElement} panel @returns {HTMLElement | null} */
      function findMask(panel) {
        const container = panel.parentElement
        return container instanceof HTMLElement ? maskIn(container, panel) : null
      }

      /**
       * Make a clone inert and structurally unique: no ids to collide with the
       * live tree, no automation hooks, nothing focusable or announced.
       * @param {HTMLElement} ghost
       */
      function sanitizeGhost(ghost) {
        ghost.setAttribute('aria-hidden', 'true')
        ghost.setAttribute('data-dsh-anim-ghost', '')
        ghost.removeAttribute('id')
        ghost.removeAttribute('data-shortcut-modal')
        ghost.removeAttribute(MOTION_SCOPE)
        for (const node of ghost.querySelectorAll('[id]')) node.removeAttribute('id')
        for (const node of ghost.querySelectorAll('[data-shortcut-modal]')) node.removeAttribute('data-shortcut-modal')
        ghost.inert = true
      }

      /** @param {HTMLElement} panel */
      function ghostDialog(panel) {
        disconnectSettingsSections(panel)
        if (disposed || reducedMotion()) return
        const meta = dialogMeta.get(panel)
        const container = meta?.container
        const source = container instanceof HTMLElement && container !== document.body && container.contains(panel)
          ? container
          : panel
        const box = source === panel
          ? (meta?.rect ?? panel.getBoundingClientRect())
          : (meta?.containerRect ?? source.getBoundingClientRect())
        if (box.width <= 0 || box.height <= 0) return
        const ghost = source.cloneNode(true)
        if (!(ghost instanceof HTMLElement)) return
        sanitizeGhost(ghost)
        ghost.style.setProperty('position', 'fixed', 'important')
        ghost.style.setProperty('left', `${box.left}px`, 'important')
        ghost.style.setProperty('top', `${box.top}px`, 'important')
        ghost.style.setProperty('width', `${box.width}px`, 'important')
        ghost.style.setProperty('height', `${box.height}px`, 'important')
        ghost.style.setProperty('margin', '0', 'important')
        ghost.style.setProperty('pointer-events', 'none', 'important')
        ghost.style.setProperty('z-index', '990', 'important')
        const clonedPanel = ghost.matches(DIALOG_SELECTOR) ? ghost : ghost.querySelector(DIALOG_SELECTOR)
        if (clonedPanel instanceof HTMLElement) {
          clonedPanel.classList.remove(CLS.dialogEnter)
          clonedPanel.style.animation = ''
          clonedPanel.classList.add(CLS.dialogExit)
        }
        const clonedMask = source === panel || !(clonedPanel instanceof HTMLElement)
          ? null
          : findMask(clonedPanel)
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

      /**
       * The settings slot outlet. It is a confirmed slot key, so prefer it over
       * guessing the dialog's DOM shape; the structural fallback only exists for
       * older shells.
       * @param {HTMLElement} panel
       * @returns {HTMLElement | null}
       */
      function settingsOutlet(panel) {
        const outlet = panel.querySelector('[data-slot="settings.section"]')
        if (outlet instanceof HTMLElement) return outlet
        const content = panel.lastElementChild
        const options = content?.lastElementChild
        return options instanceof HTMLElement ? options : null
      }

      /** @param {HTMLElement} panel */
      function observeSettingsSections(panel) {
        if (disposed || settingsObservers.has(panel)) return
        const outlet = settingsOutlet(panel)
        if (outlet === null) return
        let pending = false
        const observer = new MutationObserver(() => {
          if (disposed || pending) return
          pending = true
          requestAnimationFrame(() => {
            pending = false
            if (!disposed) animateSettingsSection(panel)
          })
        })
        observer.observe(outlet, { childList: true })
        settingsObservers.set(panel, observer)
        animateSettingsSection(panel)
      }

      /**
       * Blur the new section into focus, keeping opacity at 1 so the pane never
       * goes blank (the old fade was what read as a flash). Identity dedupe
       * keeps async row updates from restarting the blur.
       * @param {HTMLElement} panel
       */
      function animateSettingsSection(panel) {
        if (disposed || reducedMotion() || !panel.isConnected) return
        const outlet = settingsOutlet(panel)
        const first = outlet?.firstElementChild
        const surface = first instanceof HTMLElement ? visibleSurface(first) : null
        if (surface === null) return
        if (settingsSectionSurfaces.get(panel) === surface) return
        settingsSectionSurfaces.set(panel, surface)
        // The CSS animation is 240ms; drop the class a beat after it finishes.
        playClassOnce(surface, CLS.sectionBlur, 240 + 40)
      }

      /** @param {HTMLElement} panel */
      function disconnectSettingsSections(panel) {
        const observer = settingsObservers.get(panel)
        if (observer === undefined) return
        observer.disconnect()
        settingsObservers.delete(panel)
        settingsSectionSurfaces.delete(panel)
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

      /**
       * `filter` repaints the whole subtree, so a long transcript pays for the
       * blur on every frame. Big surfaces only fade.
       * @param {HTMLElement} surface
       * @param {string} blurClass
       */
      function playEnter(surface, blurClass) {
        const className = surface.querySelectorAll('*').length <= BLUR_NODE_BUDGET
          ? blurClass
          : CLS.pageFade
        playClassOnce(surface, className, T.pageBlur + 60)
      }

      /** @param {HTMLElement} element */
      function animatePage(element) {
        if (disposed || reducedMotion()) return
        const surface = visibleSurface(element)
        if (surface === null) return
        playEnter(surface, CLS.pageEnter)
      }

      /** @param {HTMLElement} element */
      function animateSection(element) {
        if (disposed || reducedMotion()) return
        const surface = visibleSurface(element)
        if (surface === null) return
        playEnter(surface, CLS.sectionEnter)
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
            const timer = menuClassTimers.get(menu)
            if (timer !== undefined) {
              clearLater(timer)
              menuClassTimers.delete(menu)
            }
            // Snapshot first: the ghost needs the geometry recorded while the
            // menu was still on screen.
            ghostMenu(menu)
            menuMeta.delete(menu)
          }
        }
        for (const panel of [...activeDialogs]) {
          if (node === panel || node.contains(panel)) {
            activeDialogs.delete(panel)
            disconnectSettingsSections(panel)
            panel.style.animation = ''
            // Same ordering rule as menus: the ghost reads the stored box.
            ghostDialog(panel)
            dialogMeta.delete(panel)
          }
        }
        // A settings panel can lose its observer without ever becoming an
        // active dialog (reduced motion, no enter animation); never keep an
        // observer on a detached subtree.
        for (const panel of [...settingsObservers.keys()]) {
          if (node === panel || node.contains(panel) || !panel.isConnected) disconnectSettingsSections(panel)
        }
      }

      /**
       * Snapshot menu geometry while a menu is still open and the page moves.
       * Only menus need it: their exit ghost starts from the pre-close box.
       */
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
          if (meta === undefined) continue
          meta.rect = panel.getBoundingClientRect()
          if (meta.container instanceof HTMLElement && meta.container.isConnected) {
            meta.containerRect = meta.container.getBoundingClientRect()
          }
        }
      }

      /** Coalesce the scroll/resize geometry refreshes into one frame. */
      function scheduleGeometry() {
        if (disposed || geometryFrame) return
        geometryFrame = requestAnimationFrame(() => {
          geometryFrame = 0
          refreshGeometry()
        })
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
            // Only the innermost body owns the height animation. Animating the
            // group root as well nested two height transitions on the same
            // pixels, and made the whole group (header included) swallow clicks
            // through the pointer-events guard.
            if (!target.matches(STEP_PROCESS_BODY)) continue
            const root = target.closest(STEP_PROCESS)
            const button = root?.querySelector('button[aria-controls]')
            if (button instanceof HTMLElement) expandGroupTitle(button)
            revealElement(target, 'group-body')
          }
        })
        hiddenObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['hidden'],
          subtree: true,
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
        on(window, 'scroll', scheduleGeometry, true)
        on(window, 'resize', scheduleGeometry)
        // bfcache restores never re-run this bundle, so only a real unload may
        // tear the layer down.
        on(window, 'pagehide', event => {
          if (!event.persisted) dispose()
        })
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
        menuRoleObserver?.disconnect()
        bodyObserver = undefined
        hiddenObserver = undefined
        mainObserver = undefined
        sidebarObserver = undefined
        menuRoleObserver = undefined
        if (bootListener !== undefined) {
          document.removeEventListener('DOMContentLoaded', bootListener)
          bootListener = undefined
        }
        for (const timer of timers) window.clearTimeout(timer)
        timers.clear()
        if (geometryFrame) {
          cancelAnimationFrame(geometryFrame)
          geometryFrame = 0
        }
        for (const detach of [...transitionListeners]) detach()
        transitionListeners.clear()
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
          element.removeAttribute('data-dsh-anim-kind')
        }
        for (const ghost of ghosts) ghost.remove()
        ghosts.clear()
        for (const menu of activeMenus) {
          menu.classList.remove(CLS.menuEnterUp, CLS.menuEnterDown, CLS.menuEnterRight, CLS.menuExit)
        }
        for (const menu of document.querySelectorAll(`.${CLS.menuSurface}`)) menu.classList.remove(CLS.menuSurface)
        activeMenus.clear()
        menuMeta.clear()
        menuClassTimers.clear()
        for (const state of [...groupTitleStates.values()]) state.clear()
        groupTitleStates.clear()
        for (const panel of activeDialogs) {
          panel.classList.remove(CLS.dialogEnter, CLS.dialogExit)
          panel.style.animation = ''
        }
        activeDialogs.clear()
        for (const observer of settingsObservers.values()) observer.disconnect()
        settingsObservers.clear()
        settingsSectionSurfaces.clear()
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
