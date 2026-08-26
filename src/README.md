# FSD Architecture

This project follows Feature-Sliced Design (FSD) architecture.

## Structure

```
src/
├── app/              # Application initialization
│   ├── App.tsx      # Root component
│   ├── index.tsx    # Entry point
│   └── styles/      # Global styles
├── pages/            # Application pages
├── widgets/          # Composite UI blocks
├── features/         # User interactions and features
├── entities/         # Business entities
└── shared/           # Reusable infrastructure
    ├── ui/           # UI components (shadcn-css)
    ├── lib/          # Utilities and helpers
    └── config/       # Configuration
```

## Path Aliases

- `@app/*` - Application layer
- `@pages/*` - Pages layer
- `@widgets/*` - Widgets layer
- `@features/*` - Features layer
- `@entities/*` - Entities layer
- `@shared/*` - Shared layer

## Using shadcn-css

Components from shadcn-css are added to `@shared/ui` with CSS modules.

### Adding components

```bash
npx shadcn-css add button card input
```

### Using components

```tsx
import { Button } from '@shared/ui/Button'

function MyComponent() {
  return <Button variant="primary">Click me</Button>
}
```

## CSS Modules

All components use CSS modules (`.module.css` files) for scoped styling.
