# Wocker Development Guidelines

## Project Overview

Wocker is a monorepo workspace for Docker-based web project management. The repository uses npm workspaces with TypeScript and follows a modular architecture with core packages and plugins.

## Repository Structure

```
wocker-area/
├── packages/         # Core packages
│   ├── core/         # Core functionality with dependency injection
│   ├── docker/       # Docker management service
│   ├── docker-mock/  # Docker API mocking for tests
│   ├── testing/      # Testing utilities and mocks
│   ├── utils/        # Shared utilities
│   └── ws/           # Workspace CLI tool
└── plugins/          # Plugin packages
    ├── cron/
    ├── elastic/
    ├── mail/
    ├── mariadb/
    ├── memcached/
    ├── mongodb/
    ├── ollama/
    ├── pgsql/
    ├── redis/
    ├── rproxy/
    └── storage/
```

## Build System

### Dependencies and Build Order

The project has a strict build dependency chain:
1. **utils** – No dependencies, builds early
2. **core** – No dependencies, builds early
3. **All other packages/plugins** – Depend on core

Build scripts use `wait-on` to ensure dependencies are built before dependent packages.

### Building the Project

```bash
# Build all packages (recommended for first-time setup)
npm run build

# Build a specific package
npm run build --workspace @wocker/core

# Build specific package from root using named script
npm run build:core
npm run build:ws
npm run build:plugin-pgsql
```

### Watch Mode for Development

```bash
# Watch all packages (respects build order)
npm start
# or
npm run watch

# Watch specific package
npm run watch:core
npm run watch:ws

# Watch all + run tests in watch mode
npm run watch-all
```

### Clean Build

```bash
# Remove all build artifacts and dependencies
npm run clear
```

## TypeScript Configuration

### Compiler Settings

- **Target**: ES2020
- **Module**: CommonJS
- **Output**: `./lib` directory in each package
- **Decorators**: Enabled (`experimentalDecorators`, `emitDecoratorMetadata`)
- **Incremental**: Yes, with `.tsBuildinfo` files for faster rebuilds
- **Declarations**: Generated (`.d.ts` files)
- **Null Checks**: Disabled (`strictNullChecks: false`)

### Configuration Files

Each package has two TypeScript configs:
- `tsconfig.json` - Base configuration for development
- `tsconfig.build.json` - Extends base, excludes test files for production builds

## Testing

### Test Framework

The project uses **Jest** with **ts-jest** for TypeScript support.

### Running Tests

```bash
# Run all tests with coverage
npm test

# Run tests for specific package
npm run test:core
npm run test:utils
npm run test:testing
npm run test:ws

# Run tests in watch mode
npm run test-watch
npm run test-watch:core
```

### Running a Single Test File

From a package directory:
```bash
cd packages/core
npm test -- demo.spec.ts
```

From root using workspace:
```bash
npm test --workspace @wocker/core -- demo.spec.ts
```

### Test File Conventions

- **Location**: Test files live alongside source code in `src/` directory
- **Naming**: Use `.spec.ts` extension (e.g., `MyService.spec.ts`)
- **Pattern**: Files matching `**/*.spec.ts`, `**/*.test.ts`, `**/*e2e-spec.ts`

### Writing Tests

1. **Test-Only Edits**: When asked to add or complete tests, modify **only** the test files. Do not change the production code to make tests pass.
2. **Bug Reporting**: If tests fail due to an apparent bug in the production code, stop immediately and ask the user for guidance.

Example test structure:

```typescript
import {describe, it, expect} from "@jest/globals";

describe("ComponentName", (): void => {
    it("should perform expected behavior", (): void => {
        // Arrange
        const input = 42;

        // Act
        const result = myFunction(input);

        // Assert
        expect(result).toBe(expected);
    });
});
```

### Testing with Dependency Injection

The project includes a custom `@wocker/testing` package with `Test` utility for creating testing modules.

#### Basic Usage

```typescript
import {Test} from "@wocker/testing";
import {MyService} from "./MyService";

describe("MyService", (): void => {
    it("should work with DI", async (): Promise<void> => {
        const context = await Test.createTestingModule({
            providers: [MyService]
        }).build();

        const service = context.get(MyService);
        expect(service).toBeInstanceOf(MyService);
    });
});
```

#### Overriding Providers

You can override providers (e.g., to use mocks) using `overrideProvider()`:

```typescript
import {Test} from "@wocker/testing";
import {MyService} from "./MyService";
import {OtherService} from "./OtherService";

describe("MyService", (): void => {
    it("should work with mocked dependency", async (): Promise<void> => {
        const mockValue = {
            getData: jest.fn()
        };

        const context = await Test
            .createTestingModule({
                providers: [MyService, OtherService]
            })
            .overrideProvider(OtherService)
            .useValue(mockValue)
            .build();

        const service = context.get(MyService);
        // ... test logic
    });
});
```

### Coverage

Tests run with coverage enabled by default. Coverage reports are generated in:
- `coverage/` directory in each package
- Formats: text-summary, lcov, json-summary, html

Coverage excludes:
- `src/index.ts` (barrel exports)
- `src/types/index.ts` (type definitions)

## Dependency Injection

The project uses a custom DI system similar to NestJS:

### Decorators

- `@Injectable(token?)` - Mark a class as injectable
- `@Module(config)` - Define a module with providers, imports, exports
- `@Inject(token)` - Inject a dependency by token

### Pattern Example

```typescript
import {Injectable, Module} from "@wocker/core";

@Injectable()
class MyService {
    doSomething() {
        return "result";
    }
}

@Module({
    providers: [MyService],
    exports: [MyService]
})
class MyModule {}
```

## Common Development Tasks

### Adding a New Test

1. Create a `.spec.ts` file in the same directory as the code being tested
2. Import from `@jest/globals`: `describe`, `it`, `expect`
3. Use `describe()` for test suites, `it()` for individual tests
4. Run tests to verify: `npm test --workspace @wocker/<package-name>`

### Adding a New Package

1. Create directory in `packages/` or `plugins/`
2. Add `package.json` with the appropriate name (`@wocker/<name>`)
3. Add `tsconfig.json` and `tsconfig.build.json`
4. Add `jest.config.ts` if tests are needed
5. Update root `package.json` scripts with build/watch/test commands
6. Respect build order: add `await:core` or `await:utils` dependency if needed

### Working with Workspaces

```bash
# Install dependencies for all workspaces
npm install

# Run script in specific workspace
npm run <script> --workspace @wocker/<package-name>

# Add dependency to specific workspace
npm install <package> --workspace @wocker/<package-name>
```

## Debugging Tips

### Build Issues

- Check that dependencies are built first (utils → core → others)
- Look for `.tsbuildinfo` files in `lib/` directories to verify incremental builds
- Use `npm run clear` to remove all artifacts and start fresh
- Check for circular dependencies between packages

### Test Issues

- Ensure the package has a `jest.config.ts` file
- Verify test file uses `.spec.ts` or `.test.ts` extension
- Check that `@jest/globals` is imported for describe/it/expect
- For DI tests, use `@wocker/testing` Test utility
- Run single test file to isolate issues: `npm test -- filename.spec.ts`

### Watch Mode Issues

- If watch mode doesn't detect changes, check `tsBuildInfoFile` setting
- Ensure `wait-on` is properly configured for package dependencies
- Use `concurrently` logs to see which package builds are failing

## Additional Notes

### Versioning

Only `@wocker/core` and `@wocker/ws` share the same version. All other packages and plugins maintain their own independent versioning.
Plugins and packages of version `1.x.x` are intended to be compatible with any version of `@wocker/core` within the `1.x.x` range.

### Package Manager

The project uses **npm** with workspaces (not yarn or pnpm).

### Docker Integration

The workspace includes various Docker-related plugins. Some packages may interact with the Docker daemon for testing.

#### Docker Mocking

For tests involving Docker, the `@wocker/docker-mock-module` provides utilities to mock the Docker API. You can find examples in `packages/docker/src/services/ImageService.spec.ts` using `ModemMock`.
