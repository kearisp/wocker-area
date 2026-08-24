# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Wocker is a Docker-based workspace management CLI tool (monorepo). It uses a custom NestJS-style dependency injection framework and a plugin system for Docker service management (PostgreSQL, Redis, MongoDB, reverse proxy, cron, etc.).

## Commands

```bash
# Build all packages (respects dependency order)
npm run build

# Build specific package or plugin
npm run build:core
npm run build:ws
npm run build:plugin-pgsql

# Watch mode for development
npm start          # or npm run watch

# Run all tests with coverage
npm test

# Run tests for a specific package
npm run test:core
npm run test:ws

# Run a single test file
npm test --workspace @wocker/core -- MyService.spec.ts

# Watch tests
npm run test-watch
npm run test-watch:core

# Remove all build artifacts and node_modules
npm run clear
```

## Architecture

**Monorepo with npm workspaces** — strict build order: `utils` and `core` first, everything else after (enforced via `wait-on` polling for `.tsbuildinfo` files).

```
packages/
  core/         # DI framework, CLI routing, base module system
  utils/        # Shared UI/prompt utilities
  testing/      # Test.createTestingModule() helper
  docker/       # Docker API wrapper (dockerode)
  docker-mock/  # Docker mock for tests (ModemMock)
  ws/           # Main CLI entry point; composes all modules
plugins/
  cron/ elastic/ mail/ mariadb/ memcached/ mongodb/
  pgsql/ redis/ rproxy/ storage/ ...
```

**DI System** (`packages/core`): decorator-based with `@Injectable()`, `@Module()`, `@Inject()`. Commands are registered with `@Command()` on controller classes; CLI completions via `@Completion()`.

**Plugin system** (`packages/ws/src/modules/plugin/`): plugins are ES modules loaded dynamically, each decorated with `@Plugin()` and containing their own controllers and services.

**Entry point**: `packages/ws/src/main.ts` → `AppModule` imports CoreModule, DockerModule, ProjectModule, PresetModule, PluginModule (dynamic), KeystoreModule, ProxyModule.

## Testing

- Test files live alongside source in `src/`, named `*.spec.ts`
- Import `describe`, `it`, `expect` from `@jest/globals`
- Use `@wocker/testing` for DI tests:

```typescript
const context = await Test.createTestingModule({ providers: [MyService] }).build();
const service = context.get(MyService);
```

- Override providers with `.overrideProvider(Dep).useValue(mock)`
- For Docker tests, use `ModemMock` from `@wocker/docker-mock-module`
- **When adding tests: only modify test files. If production code appears buggy, stop and ask.**

## TypeScript Config

- Target: ES2020, Module: CommonJS, output to `./lib`
- Decorators enabled (`experimentalDecorators`, `emitDecoratorMetadata`)
- `strictNullChecks: false`
- Each package has `tsconfig.json` (dev) + `tsconfig.build.json` (excludes tests)

## Code Style

- No comments that just restate what the code does. Only comment a non-obvious WHY (an external quirk, a workaround, a gotcha) — if the code already makes it obvious, leave it uncommented.

## Versioning

Only `@wocker/core` and `@wocker/ws` share the same version. All other packages and plugins version independently. Plugins at `1.x.x` are compatible with any `@wocker/core` `1.x.x`.
