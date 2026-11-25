# Design System: Eval Diff

## Product Identity
- **Product:** Eval Diff — compare two LLM eval runs and report regressions
- **Users:** engineers shipping LLM features, eval owners, CI maintainers
- **Core action:** paste two runs, see what got worse, copy the report or install the CLI
- **Visual direction:** dark, precise, technical

## Color Tokens
- Background: `#0b0e14`
- Surface: `#121722`
- Surface raised: `#171e2b`
- Border: `#263041`
- Text primary: `#e6edf3`
- Text secondary: `#8b98a9`
- Accent: `#5eead4`
- Destructive: `#fb7185`
- Warning: `#fbbf24`
- Success: `#4ade80`

## Typography
- Font family: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
- Scale: 11, 12, 13, 14, 16, 20, 26, 34
- Weights: 400, 500, 600, 700
- Line heights: 1.3 tight, 1.5 normal, 1.7 relaxed

## Spacing Scale
- 4, 8, 12, 16, 24, 32, 48, 64

## Layout
- Max width: 1100px
- Grid: 12 columns, 16px gap
- Breakpoints: 640, 768, 1024

## Border Radius
- sm: 4px, md: 8px, lg: 12px, full: 9999px

## Surface Treatments
- Cards: 1px solid border, no shadow, subtle hover border change to accent
- Terminal: raised surface, 1px border, no glow
- Inputs: surface, 1px border, visible focus ring with accent offset

## Component Conventions
- Button variants: primary (accent text on dark), secondary (bordered), ghost
- Input: monospace, 12px, padding 10px 12px, error state destructive border
- Card: padding 20px, radius 8px, border 1px
- Code block: mono 12px, horizontal scroll, no line numbers

## Animation Principles
- Duration: fast 150ms, normal 250ms; no slow UI transitions
- Easing: ease-out for enter, ease-in-out for state changes
- Reduced motion: respect `prefers-reduced-motion`; disable transitions
- Animate only transform and opacity

## Accessibility
- Contrast: WCAG AA minimum
- Focus: visible 2px accent ring with 2px offset
- Keyboard: full navigation; buttons and textareas labelled
- Screen reader: semantic sections, table headers, status region

## App Icon

- Source of truth: `docs/favicon.svg` — 64×64 rounded square, `rx=14`, fill `#0b0e14`, 3px `#263041` border.
- Mark: two 4px opposing chevrons in `#5eead4`, with inner tips at x=22 and x=42. The 20-unit gap keeps the mark legible at 16px.
- Fallbacks: `favicon.ico` (16–256px) and `apple-touch-icon.png` (180px), generated from the same geometry.
- No gradients, shadows or glows.

## Anti-Patterns to Avoid
- Generic AI SaaS dashboard
- Gradients and glow
- Decorative icons without purpose
- Animation that blocks interaction
- Inconsistent mono/sans mixing
