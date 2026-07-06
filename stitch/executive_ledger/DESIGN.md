---
name: Executive Ledger
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#4f4535'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#817563'
  outline-variant: '#d3c4af'
  surface-tint: '#7b5800'
  primary: '#785600'
  on-primary: '#ffffff'
  primary-container: '#986d00'
  on-primary-container: '#fffbff'
  inverse-primary: '#f7bd48'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#655b42'
  on-tertiary: '#ffffff'
  tertiary-container: '#7f7459'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdea6'
  primary-fixed-dim: '#f7bd48'
  on-primary-fixed: '#271900'
  on-primary-fixed-variant: '#5d4200'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#f0e1c1'
  tertiary-fixed-dim: '#d3c5a7'
  on-tertiary-fixed: '#221b07'
  on-tertiary-fixed-variant: '#4f462f'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
typography:
  display-lg:
    fontFamily: Dancing Script
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  display-lg-mobile:
    fontFamily: Dancing Script
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Dancing Script
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Dancing Script
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Montserrat Alternates
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Montserrat Alternates
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Montserrat Alternates
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Montserrat Alternates
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style
The design system embodies the prestige of a high-end private bank or a heritage luxury house. It evokes a sense of permanence, exclusivity, and meticulous record-keeping. The aesthetic is "Executive Ledger"—a blend of traditional craftsmanship and modern precision. 

The design style leans into **Minimalism with Tactile accents**. It uses expansive white space and a restricted, expensive color palette to create an atmosphere of calm authority. High-contrast typography and subtle physical metaphors (like thin metallic lines and vellum-like surfaces) ensure the UI feels like a physical artifact of value rather than a transient digital interface.

## Colors
The palette is rooted in Ochre and Gold, symbolizing wealth and stability. 

- **Primary (Dark Ochre):** Used for brand-critical elements and primary actions to ensure legibility and weight.
- **Secondary (Metallic Gold):** Reserved for accents, interactive states, and decorative borders to provide a sense of luxury.
- **Tertiary (Burnished Umber):** A deep, warm neutral used for text and structural lines to avoid the harshness of pure black.
- **Neutral (Vellum):** A warm, off-white background color that reduces eye strain and reinforces the "ledger" metaphor.

## Typography
The typography pairing balances expressive heritage with modern geometric clarity. 

**Dancing Script** is used for headlines and brand moments. Its fluid, calligraphic nature suggests a personal signature or a handwritten entry in a master ledger. Use it sparingly for maximum impact.

**Montserrat Alternates** provides a sophisticated, slightly avant-garde geometric structure for all functional text. The "Alternates" variant adds a touch of unique character to the body copy, ensuring the UI doesn't feel standard or "off-the-shelf." 

All labels and small UI elements use increased letter spacing and uppercase styling to maintain a structured, architectural feel.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop to maintain a sense of composed, editorial balance. 

- **Desktop:** A 12-column grid centered in a 1200px container. Large margins (64px+) are encouraged to frame content like a rare manuscript.
- **Mobile:** A 4-column fluid grid. Gutters are reduced to 16px to maximize real estate, while maintaining a 20px outer safety margin.
- **Rhythm:** All spacing is derived from an 8px base unit. Vertical rhythm should be generous to promote readability and a "leisurely" browsing experience.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines** rather than aggressive shadows. 

1.  **Surfaces:** The base layer is the "Vellum" neutral. Elevated cards use a pure white surface with a very fine 1px border in #D4AF37 at 30% opacity.
2.  **Shadows:** When necessary, use "Ambient Shadows"—extremely diffused, long-range blurs (30px+) with a low opacity (5%) Ochre tint to suggest the element is gently hovering.
3.  **Dividers:** Use hairline strokes (0.5pt) in Tertiary colors to separate sections, mimicking the ruled lines of a ledger.

## Shapes
This design system utilizes a **Soft** shape language. Corners are clipped with a 0.25rem radius to take the edge off the digital experience without feeling "bubbly" or informal. This subtle rounding suggests high-quality stationery or debossed leather goods where edges are softened by hand-finishing.

## Components
- **Buttons:** Primary buttons are solid #B8860B with Montserrat Alternates labels in uppercase. Secondary buttons use a "Ghost" style with a 1px gold border.
- **Input Fields:** Bottom-bordered only by default, mimicking a signature line. Upon focus, the line transitions to a 2px Gold stroke.
- **Cards:** Defined by a subtle 1px border and generous internal padding (32px+). Avoid heavy dropshadows.
- **Chips/Tags:** Used for status indicators, these should have a light gold background tint with dark ochre text, utilizing the `label-sm` typography.
- **Lists:** Items are separated by full-width hairline dividers. Interactive list items use a "Secondary Gold" hover state that changes the background color by only 2-3%.
- **Special Component (The Seal):** A circular badge element featuring the primary brand mark, used to "sign off" on completed transactions or sections.