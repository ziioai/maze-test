# maze-test

A TypeScript package built with [tsup](https://tsup.egoist.dev/) and managed with [pnpm](https://pnpm.io/).

## Development

```sh
pnpm install
pnpm dev
```

## Build

```sh
pnpm check
```

The build emits ESM, CommonJS, type declarations, and source maps to `dist/`.

## Publishing

```sh
pnpm publish
```

The `prepublishOnly` script type-checks and builds the package before publication.

## License

[MIT](./LICENSE) © ziioai
