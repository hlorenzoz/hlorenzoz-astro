# Missing Dependencies

Due to npm permission issues on your system, the following dependencies need to be installed manually:

```bash
# Fix npm permissions first (run this once)
sudo chown -R $(whoami) "$HOME/.npm"

# Then install required dependencies
npm install --legacy-peer-deps class-variance-authority clsx tailwind-merge
```

These dependencies are required for:
- **class-variance-authority**: Component variant styling (Button, Card, Input components)
- **clsx**: Conditional className utilities
- **tailwind-merge**: Tailwind class deduplication

## Alternative: Use yarn or pnpm

If npm continues to have issues, you can try:

```bash
# Using yarn
yarn add class-variance-authority clsx tailwind-merge

# Using pnpm
pnpm add class-variance-authority clsx tailwind-merge
```

## Status

- ✅ GSAP is already installed (from initial package.json)
- ⏳ CVA, clsx, tailwind-merge need manual installation
