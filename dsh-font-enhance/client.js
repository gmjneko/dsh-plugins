window.__ModuleLoader__.load({
  id: '@local/dsh-font-enhance',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const storageKey = 'dsh-font-enhance-weight';
    const legacyStorageKey = 'dsh-conversation-font-weight';
    const weights = [];
    for (let value = 300; value <= 700; value += 25) weights.push(value);
    const defaultWeight = 400;

    const copy = {
      en: {
        settingTitle: 'Interface text weight',
        settingDescription: 'Base weight for interface text. In-between steps are interpolated with a hairline stroke; headings and bold stay one step heavier.',
        rangeLabel: 'Interface font weight',
      },
      zh: {
        settingTitle: '界面字体字重',
        settingDescription: '调整界面正文的基础字重。中间档用极细描边插值，标题与加粗保持更重一档。',
        rangeLabel: '界面字体字重',
      },
    };

    function pickCopy(localeId) {
      return String(localeId || '').toLowerCase().startsWith('zh') ? copy.zh : copy.en;
    }

    function storedWeight(key) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return undefined;
        const value = Number(raw);
        return weights.includes(value) ? value : undefined;
      } catch {
        return undefined;
      }
    }

    function readWeight() {
      return storedWeight(storageKey) ?? storedWeight(legacyStorageKey) ?? defaultWeight;
    }

    function weightPlan(value) {
      const lower = Math.min(700, Math.max(300, Math.floor(value / 100) * 100));
      const fraction = Math.min(1, Math.max(0, (value - lower) / 100));
      return { weight: lower, stroke: fraction === 0 ? 0 : Number((fraction * 0.6).toFixed(2)) };
    }

    function stylesheet(weight) {
      const plan = weightPlan(weight);
      const emphasis = Math.min(700, plan.weight + 200);
      return `
        body {
          --dsh-font-enhance-weight: ${plan.weight};
          -webkit-text-stroke-color: currentColor;
          -webkit-text-stroke-width: ${plan.stroke}px;
        }
        body,
        body :where(*:not(svg):not(svg *)) {
          font-weight: var(--dsh-font-enhance-weight) !important;
        }
        body :where(strong, b) {
          font-weight: ${emphasis} !important;
          -webkit-text-stroke-width: 0 !important;
        }
        body :where(strong, b) :where(*) {
          font-weight: inherit !important;
          -webkit-text-stroke-width: inherit !important;
        }
        body :where(h1, h2, h3, h4, h5, h6) {
          font-weight: ${emphasis} !important;
          -webkit-text-stroke-width: 0 !important;
        }
        body :where(h1, h2, h3, h4, h5, h6) :where(*) {
          font-weight: inherit !important;
          -webkit-text-stroke-width: inherit !important;
        }
        .dsh-fen-setting {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(160px, 260px);
          align-items: center;
          gap: 20px;
          padding: 16px 0;
          border-bottom: 1px solid var(--dsw-alias-border-l1);
        }
        .dsh-fen-copy { min-width: 0; }
        .dsh-fen-title {
          display: block;
          color: var(--dsw-alias-label-primary);
          font-size: 14px;
          font-weight: 500;
        }
        .dsh-fen-description {
          margin: 4px 0 0;
          color: var(--dsw-alias-label-secondary);
          font-size: 12px;
          line-height: 1.5;
        }
        .dsh-fen-control {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 44px;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .dsh-fen-range {
          width: 100%;
          margin: 0;
          accent-color: var(--dsw-alias-brand-primary);
          cursor: pointer;
        }
        .dsh-fen-value {
          color: var(--dsw-alias-label-primary);
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          text-align: right;
        }
        @media (max-width: 520px) {
          .dsh-fen-setting { grid-template-columns: minmax(0, 1fr); gap: 12px; }
          .dsh-fen-control { max-width: 280px; }
        }
      `;
    }

    function insertStyles(css) {
      if (typeof styles === 'object' && styles !== null && typeof styles.insert === 'function') {
        return styles.insert(css);
      }
      const element = document.createElement('style');
      element.setAttribute('data-dsh-font-enhance', '');
      element.textContent = css;
      document.head.appendChild(element);
      return () => element.remove();
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const locale = ctx.locale;
        const weightListeners = new Set();
        let weight = readWeight();
        let disposeStyles;

        function useCopy() {
          const [texts, setTexts] = React.useState(() => pickCopy(locale.getLocale().active));
          React.useEffect(
            () => locale.subscribe(() => setTexts(pickCopy(locale.getLocale().active))),
            [],
          );
          return texts;
        }

        function useWeight() {
          const [value, setValue] = React.useState(weight);
          React.useEffect(() => {
            const listener = () => setValue(weight);
            weightListeners.add(listener);
            return () => {
              weightListeners.delete(listener);
            };
          }, []);
          return value;
        }

        function setWeight(next) {
          if (!weights.includes(next) || next === weight) return;
          weight = next;
          try {
            window.localStorage.setItem(storageKey, String(next));
          } catch {}
          if (disposeStyles) disposeStyles();
          disposeStyles = insertStyles(stylesheet(weight));
          for (const listener of weightListeners) listener();
        }

        function WeightSetting() {
          const texts = useCopy();
          const value = useWeight();
          const inputId = React.useId();
          const descriptionId = React.useId();
          return h('div', { className: 'dsh-fen-setting' },
            h('div', { className: 'dsh-fen-copy' },
              h('label', { className: 'dsh-fen-title', htmlFor: inputId }, texts.settingTitle),
              h('p', { className: 'dsh-fen-description', id: descriptionId }, texts.settingDescription)
            ),
            h('div', { className: 'dsh-fen-control' },
              h('input', {
                id: inputId,
                className: 'dsh-fen-range',
                type: 'range',
                min: weights[0],
                max: weights[weights.length - 1],
                step: 25,
                value,
                'aria-label': texts.rangeLabel,
                'aria-describedby': descriptionId,
                'aria-valuetext': String(value),
                onChange(event) {
                  const next = Number(event.currentTarget.value);
                  if (!weights.includes(next)) return;
                  setWeight(next);
                },
              }),
              h('output', { className: 'dsh-fen-value', htmlFor: inputId }, String(value))
            )
          );
        }

        ctx.effect(() => {
          disposeStyles = insertStyles(stylesheet(weight));
          return () => {
            if (disposeStyles) disposeStyles();
            disposeStyles = undefined;
          };
        }, 'dsh-font-enhance:styles');

        ctx.slots.inject('settings.general.item', () => ctx.slots.register({
          name: 'settings.general.item',
          id: 'dsh-font-enhance',
          order: 13,
        }, WeightSetting));
      },
    };
  },
});
