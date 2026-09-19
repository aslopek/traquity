# TraQuity UI styleguide

The binding reference for how this app looks. Audience is coding agents first, humans second. Every rule here is checkable against a
diff; where a rule has an exception, the exception is named.

TraQuity is a desktop portfolio tracker. The visual target is a calm, dense FinTech console: dark, quiet chrome, one accent color used
sparingly, and numbers that are easy to scan down a column. It is deliberately not stock Material — every Material component is
re-tokenized in `src/theme/_material.scss`.

## 1. Where styling lives

| File                        | Holds                                                                         |
|-----------------------------|-------------------------------------------------------------------------------|
| `src/theme/_palettes.scss`  | Generated M3 tonal palettes. Regenerate, never hand-edit.                     |
| `src/theme/_tokens.scss`    | Every `--tq-*` custom property. The single source of design values.           |
| `src/theme/_base.scss`      | Element defaults: `html`, `body`, headings, scrollbars, focus rings.          |
| `src/theme/_material.scss`  | All Angular Material component overrides.                                     |
| `src/theme/_utilities.scss` | Global `.tq-*` classes (cards, pages, values, forms, dialogs).                |
| `src/styles.scss`           | The entry point. Includes `mat.theme()` and forwards the above. Nothing else. |
| `<component>.scss`          | Only what is unique to that component: its own layout.                        |

**A component `.scss` never `@use`s a global stylesheet.** Sass emits a `@use`d file's CSS into every compilation unit that uses it, and
each component is its own unit — one `@use '../../styles'` duplicates the whole Material theme into that component's bundle. Global
values reach components as CSS custom properties (`var(--tq-…)`), which need no import. The only legitimate `@use` in a component is
`sass:math` or another pure-function module.

### Regenerating the palettes

```
npx ng generate @angular/material:theme-color \
  --primary-color "#009bff" --tertiary-color "#f9992c" --secondary-color "#5c7c99" \
  --neutral-color "#8e9196" --neutral-variant-color "#8b9199" --error-color "#ef4444" \
  --directory "src/theme" --is-scss --defaults
```

The schematic writes `src/theme_theme-colors.scss`; move it to `src/theme/_palettes.scss`.

## 2. Tokens

`var(--tq-…)` is how a component reads a design value. Never write a raw hex, a raw shadow, a raw duration or a bare spacing number in a
component stylesheet — if the value you need has no token, add one to `_tokens.scss` instead of inlining it.

Material's own `--mat-sys-*` tokens exist and are correct to read (`--mat-sys-primary`, `--mat-sys-on-surface`, …). The `--tq-*`
layer sits on top of them: text and accent tokens alias Material's, surfaces and everything structural are ours.

### Surfaces

Four depths, darkest at the back. Depth is carried by background *and* border, never by a drop shadow alone.

| Token                                        | Use                                                                             |
|----------------------------------------------|---------------------------------------------------------------------------------|
| `--tq-surface-canvas`                        | The app background behind everything.                                           |
| `--tq-surface-chrome`                        | Header and side menu.                                                           |
| `--tq-surface-raised`                        | Cards, dialogs, menus, popovers.                                                |
| `--tq-surface-sunken`                        | Inputs, table header rows, code/mono blocks — recessed inside a raised surface. |
| `--tq-surface-hover` / `--tq-surface-active` | Translucent white overlays for interaction states. Layer over a surface.        |

The four are tones off the generated neutral ramp in `_palettes.scss` (today 10, 12, ~17 and 20), not free-hand hexes. Making the
app lighter or darker means moving all four along that ramp together, keeping roughly a 2x luminance step from canvas to raised so
a card still reads as in front of the page. `--tq-glass-bg` is `--tq-surface-raised` at 72% and moves with it.

### Borders

`--tq-border` for every ordinary divider and card outline. `--tq-border-strong` for hover and for a control that must read as an edge
(button-toggle group, table outline). `--tq-border-accent` is the focused/selected edge.

### Text

`--tq-text` (primary), `--tq-text-muted` (labels, captions, secondary rows), `--tq-text-faint` (disabled, watermark, sub-values).
Three levels is the whole vocabulary — a fourth opacity invented in a component is a bug.

### Value colors

Financial sign coloring is one system, used identically everywhere a gain/loss appears:

| Token                                                                                     | Meaning                                    |
|-------------------------------------------------------------------------------------------|--------------------------------------------|
| `--tq-positive` / `--tq-positive-soft` / `--tq-positive-surface` / `--tq-positive-border` | Gain                                       |
| `--tq-negative` / `--tq-negative-soft` / `--tq-negative-surface` / `--tq-negative-border` | Loss                                       |
| `--tq-flat`                                                                               | Exactly zero, or a value with no direction |

`-soft` is the text color on a dark surface, the base token is the one for borders, icons and chart series, `-surface` is the tinted pill
background, `-border` its outline. Red and green are never the only carrier of meaning: a sign (`+`/`−`/`∞`) is always printed too.

### Spacing

A 0.25rem scale: `--tq-space-1` (0.25rem) through `--tq-space-8` (4rem), doubling roughly every second step. Gaps, padding and margins use
it. Generous by default — `--tq-space-4` (1rem) is the normal gap between siblings, `--tq-space-5` (1.5rem) the padding inside a card,
`--tq-space-6` (2rem) the separation between page sections.

### Radius

| Token              | Value   | Applies to                                     |
|--------------------|---------|------------------------------------------------|
| `--tq-radius-xs`   | 0.25rem | Chips, tags, progress bars                     |
| `--tq-radius-sm`   | 0.5rem  | Buttons, inputs, menu items, table rows        |
| `--tq-radius-md`   | 0.75rem | Cards, dialogs, panels, menus                  |
| `--tq-radius-lg`   | 1rem    | Full-page frames (unlock, configure, insecure) |
| `--tq-radius-pill` | 999rem  | Pills, badges, toggle groups, avatars          |

### Elevation

Three soft shadows — `--tq-shadow-1` (resting card), `--tq-shadow-2` (hover, menu, popover), `--tq-shadow-3` (dialog). Material's
`mat-elevation-z*` classes and `mat.elevation()` are **not** used; the theme's own elevation tokens are overridden to these.
`--tq-shadow-color` is the color of `--tq-shadow-2` on its own, for a canvas-rendered shadow that takes color and blur as two options.

### Motion

`--tq-duration-fast` (120ms) for color/opacity, `--tq-duration` (180ms) for transform and size, `--tq-ease` for both. Transition named
properties, never `all`. Anything that moves respects `prefers-reduced-motion` — `_base.scss` disables transitions globally under that
query, so a component needs no extra handling.

### Glass

Floating surfaces — the header, dialog surfaces, menus, select and autocomplete panels, the datepicker — are opaque (`--tq-surface-chrome`
for the header, `--tq-surface-raised` for the rest) and get their depth from border and shadow like every
other surface. **Do not add `backdrop-filter` to them.** Translucency over the dark canvas reveals more dark canvas: it costs a
compositing layer per overlay and shows nothing.

The exception is a surface floating **directly over a chart**, where what is behind is a bright line, an area fill and a gradient.
There the blur has something to work with, and `--tq-glass-bg` (`--tq-surface-raised` at 72%) + `--tq-glass-blur` apply. Today that is
the echarts tooltips of the depot performance and historical price charts, and the position pie chart's hover tag, which is a DOM
element rather than an echarts tooltip but sits in exactly the same place. Those two tokens exist for this case and no other.

The remaining `backdrop-filter` in the theme is on `.cdk-overlay-dark-backdrop`, which blurs the page behind a modal. That is the
backdrop itself, not a surface.

### Typography

Roboto only, bundled (see `LLM.md`'s font rules). The scale is `--tq-font-size-xs` … `--tq-font-size-3xl` with matching
`--tq-line-height-*`. Weights: 400 body, 500 labels and emphasis, 700 numbers that carry the screen.

`--tq-font-mono` is the one other family, and only for literal code a user wrote or a config file supplied — JSON paths, URL patterns,
header values. It is a stack of fonts already installed on the machine, so it fetches nothing and needs no bundled file. Never reach for
it to make ordinary numbers line up; `.tq-numeric` on Roboto does that better.

**Every number rendered for reading gets tabular figures.** Use the `.tq-numeric` class (or `font-variant-numeric: tabular-nums` where a
class cannot reach). This covers currency, percentages, quantities, dates in tables, and chart axis labels. Proportional figures in a
column of prices are the single most obvious "not a finance app" tell.

`--tq-tracking-label` is in `em` deliberately: a label's letter-spacing has to scale with that label's own font-size, which is the one
exception `LLM.md` grants to the rem rule.

## 3. Global classes

Defined in `_utilities.scss`, usable from any template without an import. Prefer one of these over re-deriving the same look in a
component stylesheet.

### Page frame

A page that carries its own title uses this frame. A `*-page` component embedded in another page — a tab of the depot page, a panel of
the settings page — does not: the tab label or panel header is already its title, so it lays itself out with `:host` and skips the head
row. The depot page itself is the third case, a bare tab host with no title of its own.

```html
<div class="tq-page">
  <header class="tq-page__head">
    <h1 class="tq-page__title">Securities</h1>
  </header>
  <section class="tq-card">…</section>
</div>
```

- `.tq-page` — column layout, page padding, `--tq-space-6` between sections.
- `.tq-page__head` — title row, `space-between`, so an action added beside the title pushes right.
- `.tq-page__title` — the one `h1` per page.
- `.tq-page--scroll` — adds the scroll container behavior for pages that own their own scrolling.

### Cards and sections

- `.tq-card` — raised surface, `--tq-border`, `--tq-radius-md`, `--tq-space-5` padding, `--tq-shadow-1`.
- `.tq-card--flush` — same surface with no padding, for a card whose child (a table, a list) reaches the edge.
- `.tq-card--quiet` — a barely-tinted card with no shadow, for a block nested inside another card.
- `.tq-card__head` / `.tq-card__title` / `.tq-card__actions` — the card's own header row.
- `.tq-section-label` — the small uppercase caption above a value or a group (`--tq-text-muted`, `--tq-tracking-label`, weight 500).

Do not use `<mat-card>`. A `div.tq-card` carries the same look with none of the MDC wrapper elements, and `_material.scss` carries no
card overrides — a `mat-card` added anyway would come out unthemed.

### Values

- `.tq-numeric` — tabular figures. On every number.
- `.tq-value` — the large figure in a KPI or detail row (weight 700, `--tq-font-size-2xl`, tabular).
- `.tq-pill` + `.tq-pill--positive` / `.tq-pill--negative` / `.tq-pill--neutral` / `.tq-pill--accent` — tinted, pill-shaped badge for a
  delta or a status shown inline.
- `.tq-kpi-grid` — the responsive grid KPI cards sit in (`repeat(auto-fit, minmax(13rem, 1fr))`).

### State

- `.tq-empty` — centered empty-state block (icon, headline, one line of help, optional action).
- `.tq-muted` / `.tq-faint` — text color only, no other effect.
- `.tq-notice` + `.tq-notice--info` / `--warn` / `--error` — an inline banner with an icon slot. Every warning or error
  message in a template uses this instead of a hand-rolled colored div.

### Forms

- `.tq-form` — vertical stack of fields with `--tq-space-4` gaps.
- `.tq-form-grid` — two-column responsive field grid.
- `.tq-field-hint` — helper text under a control that is not a `mat-hint`.

### Dialogs

Every dialog, without exception, is built like this:

```html
<app-title-toolbar title="Create Depot"
                   (onClose)="close()">
</app-title-toolbar>
<div class="tq-dialog__body">…</div>
<div class="tq-dialog__actions">
  <button matButton
          (click)="close()">
    Cancel
  </button>
  <button matButton="filled"
          (click)="save()">
    Save
  </button>
</div>
```

- `app-title-toolbar` is the only dialog header. A dialog that used a bare `<h2>` or its own toolbar is wrong.
- The width comes from the `MatDialog` config alone. M3's own 560px cap on the overlay pane is overridden to `80vw` in
  `_material.scss`; without that, a dialog wider than 560px keeps its content width and the surface clips the right edge — the close
  button first.
- `.tq-dialog__body` scrolls; the toolbar and the actions row do not.
- `.tq-dialog__actions` right-aligns, gap `--tq-space-2`, with a top border.
- The confirming action is the rightmost button and the only filled one. A destructive confirm is `class="tq-danger"`.
- A confirmation dialog that only asks a question uses `.tq-dialog__body` with a single paragraph — no card inside a dialog.

### Tables and lists

- `.tq-table` on a `<table>` (or the wrapper of a `mat-table`): sunken header row, `--tq-border` row separators, no vertical rules,
  row hover in `--tq-surface-hover`.
- Numeric cells get `.tq-numeric` and `text-align: right`. Their header cell gets `.tq-table__cell--numeric`, which right-aligns it and,
  on a sortable `mat-header-cell`, moves the sort arrow to the right edge so it follows the label instead of sitting away from it.
- A non-tabular row list (positions, announcements, transactions) is the component's own `.foo-row`, built from the same pieces: a
  flex row, `--tq-space-3`/`--tq-space-4` padding, `--tq-radius-sm`, and `--tq-surface-hover` on `:hover`.

### Scrolling

`.tq-scroll` gives an overflow container the thin, self-colored scrollbar. Any element with its own `overflow: auto` gets it.

## 4. Material component rules

All overrides live in `_material.scss` and go through the official `mat.<component>-overrides()` mixins. Three hard rules:

- **Only components the app actually renders are themed.** An `overrides()` mixin emits its custom properties into `styles.css`
  whether or not the component exists, so a block for a component with no usage is dead weight — the first usage of a new component
  brings its block with it, and the last usage removed takes its block along.
- **Look is themed centrally, per-instance geometry is not.** Colour, shape, elevation and type go in `_material.scss` and apply
  everywhere. A size that only one usage wants — how wide *this* drawer is — is that component's own layout, and it sets the
  `--mat-*` token on its own element instead. Putting it in `_material.scss` makes one screen's decision binding on every other:
  `sidenav-overrides` once carried the shell's side menu width, which silently pinned the database dialog's drawer to it too.
- **No `!important`.** If a value does not take, the override token is wrong — look it up in the component's `_m3-*.scss` token file.
- **No reaching into MDC internals** (`.mat-mdc-…`, `.mdc-…`) unless no token exists for the property. Where that is unavoidable, the
  selector goes in `_material.scss` with a one-line comment naming the missing token, never in a component stylesheet.

Settled component decisions:

- **`mat-form-field`** — `appearance="fill"` everywhere, filled `--tq-surface-sunken` background, no underline, `--tq-radius-sm`, accent
  ring on focus. Never `appearance="outline"`.
- **Buttons** — `matButton` for secondary, `matButton="filled"` for the primary action in a view, `matButton="tonal"` for a neutral
  action that still needs weight, `matButton="outlined"` for a bordered secondary. Icon-only stays `mat-icon-button`, which is the only
  selector v22 offers for it. The legacy `mat-flat-button` / `mat-raised-button` / `mat-stroked-button` attributes are not used. Exactly
  one filled button per view or dialog. `--tq-radius-sm`.
- **`mat-slide-toggle`** — the only control for "this thing is on/off". Sized down from M3's touch-first default to a 2.25rem by
  1.25rem track with a 0.875rem handle, so it sits level with the 0.875rem label beside it; the checkmark in the handle is sized
  away. Track, handle and the two handle margins are one geometry — change one and `_material.scss` says how to recompute the rest.
- **`mat-checkbox`** — only for selecting items in a list or accepting a multi-select option, never for activating a configuration. The
  app has none today, so `_material.scss` carries no checkbox overrides; adding one means adding them back.
- **`mat-button-toggle-group`** — pill-shaped segmented control (`--tq-radius-pill`), used for range/mode switching.
- **`mat-tab-group`** — underlined tabs, no ripple wash, label weight 500.
- **`mat-menu`, `mat-select` panel, autocomplete** — raised surface, `--tq-radius-md`, `--tq-shadow-2`. A menu panel sizes to its content
  up to `28rem`; Material's hard-coded 280px cap is overridden in `_material.scss`.
- **`mat-tooltip`** — small, `--tq-surface-sunken`, `--tq-radius-xs`.
- **`mat-progress-bar`** — 0.25rem tall, `--tq-radius-pill`, primary fill.
- **`mat-table`** — themed to match `.tq-table`; prefer `.tq-table` markup for new tables.
- **`mat-dialog`** — raised surface, `--tq-radius-md`, `--tq-shadow-3`, no internal padding (the body class owns it).
- **`mat-toolbar`** — only the app header uses it. Not a page-title mechanism, and not a dialog header: `app-title-toolbar` is a plain
  `<header>`.
- **Icons** — `<mat-icon>` with `fontIcon="…"` (Material Symbols ligature set). Icon-only controls always carry `matTooltip` and
  `aria-label`.

## 5. Charts

echarts options are built in `*.pipe.ts` files (see `LLM.md`). A chart paints on a canvas, so it cannot inherit a CSS value — it reads
the token instead, through `chartToken(name)` / `chartTokenAlpha(name, alpha)` from `src/common/chart/chart-token.ts`. Never a hex
literal in a pipe. Both return the empty string where there is no document to read from, which is what keeps a pipe's spec runnable in
the node-environment jest suite; echarts falls back to its own default for that option.

Read tokens into `private readonly` fields on the pipe, not inside `transform` — the value cannot change while the app runs, and a
per-call `getComputedStyle` forces a style recalculation on every chart update. A string assembled from several tokens (the tooltip's
`extraCssText`) is one field too, not rebuilt per call.

A `tooltip.formatter` returning HTML is a raw string that nothing escapes on the way to the DOM. Every interpolated value goes through
`escapeHtml` from `src/common/chart/escape-html.ts`, including the ones that are fixed labels today.

- Series color for a single-series chart: `--tq-series-1`.
- Gain/loss series and thresholds: `--tq-positive` / `--tq-negative` (or their `-soft` variants for text on a dark surface).
- Axis lines and split lines: `--tq-border`; axis labels `--tq-text-muted` or `--tq-text-faint` at 11px-equivalent.
- Tooltips: `--tq-glass-bg` background with `--tq-glass-blur` as a `backdrop-filter` in `extraCssText`, `--tq-border` outline,
  `--tq-radius-md`, `--tq-shadow-2`. A tooltip sits on top of the chart it belongs to, which is the one place glass reads (see above).
- Categorical series beyond the first use the ramp `--tq-series-1` … `--tq-series-6`, in order, wrapping with a modulo. The ramp's six
  values are picked together: one hue family per slot, stepped so neighbouring slots stay apart under protanopia and deuteranopia too,
  and far enough from `--tq-positive` / `--tq-negative` / `--tq-warning` that a series never impersonates a status. Changing one value
  in isolation is what breaks that, since a slot is only ever as readable as the slots it sits beside.

**SVG chart chrome is styled in CSS, not through attributes.** `stroke`, `fill` and `font-family` are CSS properties, so an overlay drawn
as inline SVG (the position pie chart's group ring) takes a class and reads `var(--tq-…)` from the component stylesheet. An
`[attr.stroke]` bound to a color held in a TypeScript constant is the thing this replaces.

## 6. Accessibility

- Every icon-only control has an `aria-label` and a `matTooltip` with the same text.
- Focus is always visible: `_base.scss` draws a `--tq-border-accent` ring on `:focus-visible`. Never `outline: none` without replacing it.
- Text on a surface meets 4.5:1; `--tq-text-faint` is for decoration and disabled states only, never for information a user must read.
- A blurred/obfuscated value (hidden absolute values) keeps `pointer-events: none` and `user-select: none` so it cannot be read back.

## 7. Writing a component's SCSS

```scss
:host {
  display: flex;
  flex-direction: column;
  gap: var(--tq-space-4);
}

.chart {
  height: 22rem;
}
```

That is the expected size. If a component stylesheet is growing past ~40 lines, the look it is building probably belongs in
`_utilities.scss` as a `.tq-*` class.

- `:host` carries the component's own box (display, size, flow). A wrapper `<div>` whose only job is layout is removed in favor of `:host`.
- Class names are BEM-ish: `.block`, `.block__element`, `.block--modifier`. One block per component, named after the component.
- Lengths are `rem` (`LLM.md`); `em` only where the value must scale with the element's own font-size, with a comment saying so.
- Layout is Flexbox or Grid. No floats, no absolute positioning for flow, no magic-number margins to fake alignment.
- No `::ng-deep`. Styling a child component's internals means either a token on the parent that the child reads, or an override in
  `_material.scss`.
