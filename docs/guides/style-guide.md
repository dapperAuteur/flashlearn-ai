# Style Guide for FlashLearn AI

## 1. Colors

Use Tailwind CSS utility classes. All text must meet WCAG AA contrast requirements.

| Context | Minimum Class | Contrast Ratio | Notes |
|---------|--------------|----------------|-------|
| Body text on white | `text-gray-700` | 5.7:1 | AA compliant |
| Secondary text on white | `text-gray-600` | 5.7:1 | Minimum for body text |
| Placeholder text | `placeholder:text-gray-500` | 4.6:1 | AA for large text |
| Disabled/muted text | `text-gray-500` | 4.6:1 | Large text only (18px+) |
| Text on dark bg (gray-900) | `text-gray-300` | 7.4:1 | Good contrast |
| Links | `text-blue-600` | 4.7:1 | AA compliant |

**Never use** `text-gray-400` on light backgrounds (3.0:1 fails AA).

CSS variables (defined in `globals.css`):
- `--background`: #ffffff
- `--foreground`: #171717

## 2. Typography

Font: Arial, Helvetica, sans-serif (defined in `globals.css`).

| Element | Class | Notes |
|---------|-------|-------|
| Page titles | `text-2xl sm:text-3xl font-bold` | Responsive sizing |
| Section headings | `text-lg font-semibold` | |
| Body text | `text-sm` or `text-base` | min 16px on mobile inputs |
| Small labels | `text-xs font-medium` | |

## 3. Spacing

Use Tailwind's spacing scale (`p-`, `m-`, `gap-`). Follow mobile-first approach:
- Base styles for mobile (no prefix)
- `sm:` for 640px+
- `md:` for 768px+
- `lg:` for 1024px+

## 4. Components

### Buttons
- Primary: `bg-blue-600 text-white hover:bg-blue-700 rounded-xl px-6 py-3`
- Secondary: `bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl`
- Minimum touch target: 44x44px on mobile

### Cards
- Container: `bg-white rounded-2xl shadow-lg border border-gray-200`
- Padding: `p-6 sm:p-8`

### Modals
- Required ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Close button: `aria-label="Close [modal name]"`
- Escape key to close

### Forms
- Labels: `htmlFor` matching input `id`
- Errors: `aria-describedby` pointing to error `id`, `aria-invalid="true"`
- Required fields: `aria-required="true"`

## 5. Accessibility

### ARIA Requirements
- All icon-only buttons must have `aria-label`
- Decorative icons must have `aria-hidden="true"`
- Dynamic content changes: `aria-live="polite"` (or `"assertive"` for errors)
- Expandable sections: `aria-expanded` on trigger
- Navigation: `aria-label` on `<nav>`, `aria-current="page"` on active links
- Focus management: visible focus rings via `focus-visible:ring-2`
- Screen-reader-only text: `sr-only` class

### Keyboard Navigation
- All interactive elements must be reachable via Tab
- Enter/Space to activate buttons
- Escape to close modals/menus
- Arrow keys for radio groups and option lists

### Motion
- Respect `prefers-reduced-motion` for animations (handled in `globals.css`)

## 6. Breakpoints (Tailwind defaults)

| Breakpoint | Value | Usage |
|------------|-------|-------|
| `sm` | 640px | Small devices |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktops |
| `xl` | 1280px | Large screens |

## 7. Icons

Using Heroicons (`@heroicons/react`) and Lucide (`lucide-react`).

| Size | Class | Usage |
|------|-------|-------|
| Small | `h-4 w-4` | Inline with text, buttons |
| Medium | `h-5 w-5` or `h-6 w-6` | Standalone, navigation |
| Large | `h-10 w-10` or `h-12 w-12` | Empty states, hero sections |
