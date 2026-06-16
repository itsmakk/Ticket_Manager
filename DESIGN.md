# Aura Finance — Design Memory

**Source:** Neuform Featured templates from top creators.  
**Author:** Meng To (@mengto). Views: 100; favorites: 3; remixes: 2.  
**Tags:** feature, section, animated, bento, charts.

---

## Overview

Aura Finance Feature Section is designed for highlighting product capabilities and value points. Key features include reusable structure, responsive behavior, and production-ready presentation. It is suitable for component libraries and responsive product interfaces.

---

## Design Tokens

### Colors

| Token | Value |
|---|---|
| `--primary` | `#E2C854` |
| `--secondary` | `#000000` |
| `--accent` | `#10B981` |
| `--background` | `#000000` |
| `--surface` | `#191C21` |
| `--text-primary` | `#FFFFFF` |
| `--text-secondary` | `#A1A1AA` |
| `--border` | `#27272A` |

### Typography

| Token | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `--display-lg` | Inter | 64px | 500 | 1.04 | 0 |
| `--body-md` | Inter | 16px | 400 | 1.6 | — |
| `--label-md` | JetBrains Mono | 12px | 600 | 1.2 | — |

### Spacing

| Token | Value |
|---|---|
| `--base` | 8px |
| `--gap` | 16px |
| `--card-padding` | 24px |
| `--section-padding` | 80px |

### Border Radius

| Token | Value |
|---|---|
| `--radius-card` | 16px |
| `--radius-control` | 8px |
| `--radius-pill` | 9999px |

---

## Components

### Card
- **Background:** `--surface` (`#191C21`) with subtle `--border` (`#27272A`) borders
- **Border Radius:** `--radius-card` (16px)
- **Shadow:** HTML-matched depth

### Button
- **Background:** `--primary` (`#E2C854`) or `--accent` (`#10B981`) for main actions
- **Border Radius:** `--radius-control` (8px) or `--radius-pill` (9999px), matching source HTML

---

## Composition

Preserve the visible hierarchy, first-screen composition, section rhythm, density, and interaction tone before adapting copy or content.

Key visible headings include:
- DESIGN.md Is Design Memory.
- €34,550.80
- Recent
- Assets

---

## Layout

- Keep spacing deliberate and stable
- Favor the same grid direction, max-width behavior, card density, and responsive stacking seen in the HTML
- Do not replace distinctive source structures with generic SaaS sections

## Motion

Preserve existing motion cues: masked reveals, staggered entrance, hover lift, scroll-triggered transitions, and ambient movement. Keep easing smooth and restrained.

## Effects

If the source includes canvas, WebGL, Three.js, gradients, particles, or atmospheric effects, rebuild them as supporting layers behind the content. Keep effects performant, responsive, and secondary to the interface.

---

## Guardrails

- Do not flatten the source into a generic card grid.
- Do not swap the color mode unless the source clearly supports it.
- Preserve the first viewport signal, focal object, and visual density.
- Keep buttons, cards, and badges aligned to the same radius and border language.
