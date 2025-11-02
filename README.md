# @wocker/area

A monorepo workspace for Docker-based web project management. Wocker provides a CLI tool and plugin system for managing Docker environments for web development.

## Overview

Wocker Area is a TypeScript-based workspace that uses npm workspaces to manage multiple packages and plugins. The project includes a core dependency injection framework, a CLI tool (`ws`), and various plugins for common Docker services like PostgreSQL, Redis, MongoDB, Elasticsearch, and more.

**Homepage:** https://kearisp.github.io/wocker  
**Repository:** https://github.com/kearisp/wocker-area

## Tech Stack

- **Language:** TypeScript (target: ES2020)
- **Runtime:** Node.js
- **Package Manager:** npm with workspaces
- **Build System:** TypeScript compiler with incremental builds
- **Testing:** Jest with ts-jest
- **Module System:** CommonJS
- **Dependency Injection:** Custom DI system (decorators-based)
- **Docker Integration:** dockerode, docker-compose

## Requirements

- Node.js (version: TODO - check .nvmrc or engines field)
- npm (comes with Node.js)
- Docker and Docker Compose (for runtime functionality)
- Linux/WSL environment (recommended for keyring support)

### Additional Requirements for Keytar (Credential Storage)

On Linux/WSL, install the following packages for secure credential storage:

```bash
sudo apt update
sudo apt install gnome-keyring libsecret-tools seahorse
```

For WSL specifically, add this line to your `.bashrc` file:

```bash
# .bashrc
dbus-update-activation-environment --systemd DISPLAY
```

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/kearisp/wocker-area.git wocker-area
cd wocker-area
npm install
```

## Project Structure

```
wocker-area/
├── packages/              # Core packages
│   ├── core/              # Core framework with dependency injection
│   ├── utils/             # Shared utilities
│   ├── testing/           # Testing utilities and mocks
│   └── ws/                # CLI tool (main entry point: ws command)
├── plugins/               # Plugin packages for Docker services
│   ├── cron/              # Cron job management
│   ├── elastic/           # Elasticsearch integration
│   ├── mail/              # Mail service integration
│   ├── mariadb/           # MariaDB database support
│   ├── memcached/         # Memcached caching
│   ├── mongodb/           # MongoDB database support
│   ├── ollama/            # Ollama integration
│   ├── pgsql/             # PostgreSQL database support
│   ├── redis/             # Redis caching and data store
│   ├── rproxy/            # Reverse proxy configuration
│   └── storage/           # Storage management
├── bin/                   # Utility scripts
├── config/                # Configuration files
└── package.json           # Root workspace configuration
```

## Build System

The project follows a strict build dependency chain:

1. **utils** - No dependencies, builds first
2. **core** - Depends on utils
3. **All other packages/plugins** - Depend on core

### Building the Project

```bash
# Build all packages (recommended for first-time setup)
npm run build

# Build a specific package
npm run build:core
npm run build:ws
npm run build:utils
npm run build:testing

# Build specific plugin
npm run build:plugin-pgsql
npm run build:plugin-redis
# ... etc for other plugins
```

### Development with Watch Mode

```bash
# Watch all packages for changes (respects build order)
npm start
# or
npm run watch

# Watch specific package
npm run watch:core
npm run watch:ws
npm run watch:utils

# Watch all + run tests in watch mode
npm run watch-all
```

### Clean Build

Remove all build artifacts, dependencies, and coverage reports:

```bash
npm run clear
```

## Available Scripts

### Build Scripts
- `npm run build` - Build all packages and plugins
- `npm run build:core` - Build core package
- `npm run build:utils` - Build utils package
- `npm run build:testing` - Build testing utilities
- `npm run build:ws` - Build CLI tool
- `npm run build:plugin-*` - Build specific plugin (cron, elastic, mail, mariadb, memcached, mongodb, ollama, pgsql, redis, rproxy, storage)

### Watch Scripts
- `npm start` or `npm run watch` - Watch all packages
- `npm run watch:core` - Watch core package
- `npm run watch:utils` - Watch utils package
- `npm run watch:testing` - Watch testing package
- `npm run watch:ws` - Watch CLI tool
- `npm run watch:plugin-*` - Watch specific plugin
- `npm run watch-all` - Watch all packages and run tests

### Test Scripts
- `npm test` - Run all tests with coverage
- `npm run test:core` - Test core package
- `npm run test:utils` - Test utils package
- `npm run test:testing` - Test testing package
- `npm run test:ws` - Test CLI tool
- `npm run test-watch` - Run all tests in watch mode
- `npm run test-watch:*` - Watch tests for specific package

### Utility Scripts
- `npm run clear` - Clean all build artifacts and dependencies
- `npm run record-docker` - Record Docker configuration (TODO: document purpose)

## Testing

The project uses Jest with ts-jest for testing. Tests are located alongside source code with `.spec.ts` or `.test.ts` extensions.

### Running Tests

```bash
# Run all tests with coverage
npm run test

# Run tests for specific package
npm run test:core
npm run test:utils
npm run test:ws

# Run tests in watch mode
npm run test-watch
npm run test-watch:core
```

### Test Coverage

Coverage reports are generated in the `coverage/` directory of each package. The following formats are available:
- HTML report
- LCOV format
- JSON summary
- Text summary (console output)

### Writing Tests

Tests use Jest with the custom testing utilities from `@wocker/testing`:

```typescript
import {describe, it, expect} from "@jest/globals";
import {Test} from "@wocker/testing";

describe("MyService", (): void => {
    it("should work", async (): Promise<void> => {
        const context = await Test.createTestingModule({
            providers: [MyService]
        }).build();

        const service = context.get(MyService);
        expect(service).toBeInstanceOf(MyService);
    });
});
```

## Environment Variables

<!-- TODO: Document environment variables used by the project -->

No environment variables are currently documented. Check individual plugin configurations for plugin-specific environment variables.

## CLI Tool

The main CLI tool is provided by the `@wocker/ws` package and is accessible via the `ws` command after installation.

```bash
# After npm install, the ws command is available
ws
```

<!-- TODO: Document common ws commands and usage examples -->

## Development Guidelines

- **Code Style:** 4-space indentation, LF line endings
- **TypeScript Config:** ES2020 target, CommonJS modules, decorators enabled
- **Dependency Injection:** Use `@Injectable()`, `@Module()`, and `@Inject()` decorators
- **Testing:** Write tests alongside source code with `.spec.ts` extension
- **Build Order:** Always respect the dependency chain (utils → core → others)

For detailed development guidelines, see the [guidelines document](.junie/guidelines.md).

## Contributing

<!-- TODO: Add contribution guidelines -->

## License

MIT License - see package.json for details.

Copyright (c) 2025 Kris Papercut <krispcut@gmail.com>

## Links

- **Homepage:** https://kearisp.github.io/wocker
- **GitHub Repository:** https://github.com/kearisp/wocker-area
- **Issue Tracker:** https://github.com/kearisp/wocker-area/issues
