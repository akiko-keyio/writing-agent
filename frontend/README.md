# Writing Agent — Frontend

React + Vite + TypeScript, UI via [coss ui](https://coss.com/ui) (`@coss/*` registry, installed with the shadcn CLI).

## Commands

```bash
pnpm install
pnpm dev
pnpm run build
pnpm run typecheck
```

## Adding coss components

```bash
npx shadcn@latest add @coss/button
```

Components land in `src/components/ui/`. See `components.json` and the [coss docs](https://coss.com/ui/docs/get-started).

## Agent skill

```bash
npx skills add cosscom/coss
```
