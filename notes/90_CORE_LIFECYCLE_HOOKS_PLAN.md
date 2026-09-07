# `@wocker/core` — module lifecycle hooks (`OnModuleInit`)

Status: **deprioritized, work paused.** A small amount of work was already started directly in the
`packages/core` submodule working tree (uncommitted) and has been reverted so the submodule is clean
again. This file captures what existed so the feature can be picked up later without re-deriving it.

## What it was

A NestJS-style lifecycle hook interface for DI providers/modules, so a class could opt in to a
callback fired once the DI container has finished constructing it:

```ts
// src/types/hooks/OnModuleInit.ts
export interface OnModuleInit {
    onModuleInit(): void;
}
```

```ts
// src/types/hooks/index.ts
export * from "./OnModuleInit";
```

```ts
// src/types/index.ts
export * from "./hooks";   // added as the first export
// ...rest of existing exports unchanged
```

That's as far as it got — only the type/interface was scaffolded (`git add`ed but not committed).
**Nothing calls `onModuleInit()` yet** — the actual wiring was not started:

## Remaining work (not started)

1. Find where the DI container instantiates providers/modules (`packages/core/src`, module/container
   internals — not yet located/confirmed) and, after a provider is constructed, check
   `if (typeof instance.onModuleInit === "function")` and call it.
2. Decide ordering/async semantics: should `onModuleInit` support returning a `Promise` and be
   awaited before the app is considered "ready"? NestJS does; worth matching since the interface
   name/shape is deliberately Nest-compatible.
3. Decide whether it fires per-module (after all providers in a module are constructed) or per-provider
   as each one is built — affects whether a provider can rely on its own dependencies already being
   initialized.
4. Add a `*.spec.ts` alongside the container/module code exercising: hook called once, hook not
   required (providers without it are unaffected), and (if async is supported) hook awaited before
   downstream use.
5. Export surface is already staged (`src/types/index.ts` → `./hooks` → `OnModuleInit`) — reuse as-is
   when resuming.
6. `@wocker/core` and `@wocker/ws` share a version — this is a new public interface, so bump appropriately
   (minor) whenever it ships, per the versioning rules in the root `CLAUDE.md`.

## Why deprioritized

User call — no specific blocking reason recorded, just lower priority than other current work.