# Plugin service linking (`link`) — design notes

Status: **idea only, nothing implemented yet.** `PgSqlService.link()` (`plugins/pgsql/src/services/PgSqlService.ts`)
is currently a stub (validates the service/project exist, then does nothing — leave it as-is until this is
actually picked up). This file exists so the idea isn't lost.

## The idea

A project should be able to declare which plugin-managed services it depends on (e.g. "this project needs the
`pgsql` service named `default`"), and a `<plugin>:link <service> <project>` command should write that
dependency into the project's own config, instead of the developer hand-wiring container names/env vars into
`.env` every time.

## What already exists and points at this

- `ProjectConfig.Data` (`packages/core/src/makes/ProjectConfig.ts`) already has a `services` field:
  ```ts
  services?: Record<string, ProjectConfig.Service>;
  ```
  with
  ```ts
  export type Service = {
      type?: "compose" | "plugin";
      containerName?: string;
      buildArgs?: EnvConfig;
      env?: EnvConfig;
      ports?: string[];
      volumes?: string[];
  };
  ```
  `type: "plugin"` is already anticipated in the type, but `ProjectConfig.addService(name, data)` is an **empty
  stub** (line ~311) — it's never been wired up. This is the natural place to persist a link.
- Every DB-ish plugin (`pgsql`, `mongodb`, `mariadb`, `redis`, `elastic`, ...) independently reinvents container
  naming/credentials. A shared "link" concept would let a project's `ws start` know to also ensure `pgsql-default.ws`
  is running, inject `DATABASE_URL`/host/port into the project's env, etc. — without each plugin duplicating that.

## Proposed shape

1. **Experimental flag**: add `"linkPlugin"` to `AppService.experimentalFeatures` in
   `packages/core/src/services/AppService.ts`. This alone makes `experimental:enable linkPlugin` /
   `experimental:disable linkPlugin` work for free (`ExperimentalController` validates against that list).
   Nothing is user-visible until a controller actually checks
   `appService.isExperimentalEnabled("linkPlugin")`.

2. **Gate the command behind the flag, the same way `dns` does it.** Reference implementation:
   `packages/ws/src/modules/dns/index.ts`:
   ```ts
   @Module({imports: [CoreModule]})
   export class DnsModule {
       public static register(): DynamicModule {
           return {
               module: DnsModule,
               inject: [AppService],
               useFactory: (appService: AppService) => {
                   if(!appService.isExperimentalEnabled("dns")) {
                       return {};
                   }
                   return {
                       imports: [DockerModule],
                       controllers: [DnsController],
                       providers: [DnsService]
                   };
               }
           };
       }
   }
   ```
   and it's imported via `DnsModule.register()` (not the bare class) in `AppModule`.

   For a plugin, the equivalent would be a small `LinkModule` (could live inside `plugins/pgsql/src/modules/link/`,
   or — better, since this should be shared — as a reusable helper exported from `@wocker/core` that any plugin can
   drop in) with the same `static register(): DynamicModule` shape, and the plugin's own `@Plugin({...})` metadata
   would import it:
   ```ts
   @Plugin({
       name: "pgsql",
       controllers: [PgSqlController],
       imports: [LinkModule.register()],   // <- new
       providers: [PluginConfigService, PgSqlService]
   })
   ```
   This works because `@Plugin` is just `@Global() + @Module()` under the hood (`packages/core/src/decorators/Plugin.ts`),
   and the DI `Scanner` resolves `DynamicModule`s found in *any* module's `imports`, not just `AppModule`'s — same
   mechanism, no core changes needed beyond the `linkPlugin` flag itself.

   Until the flag is enabled, `pgsql:link` (and any other plugin's `:link` command) simply doesn't exist on the CLI —
   consistent with how `dns:start`/`dns:stop` behave today.

3. **What `link` should actually do** (once unstubbed):
   - Resolve the target service (`config.getService(serviceName)`) and target project (`projectService.get(projectName)`).
   - Call `projectConfig.addService(key, {type: "plugin", containerName: service.containerName, env: {...}})` —
     which means finishing `ProjectConfig.addService()` first (currently a no-op).
   - `key` naming needs a decision — probably `<pluginName>` when a project only links one service per plugin, or
     `<pluginName>:<serviceName>` to support linking multiple named services from the same plugin without collisions.
   - Save the project config (`projectService.save(project)`).
   - Add an `unlink` counterpart (`pgsql:unlink <project>`?) that removes the entry.

4. **Open questions / follow-ups, not yet decided:**
   - Should `ws start <project>` auto-start linked services first, or just assume they're already running?
   - Should linking auto-inject an env var (e.g. `DATABASE_URL`) into the project, and if so is that plugin-specific
     formatting (pgsql's connection string looks nothing like mongodb's) or left to the plugin to define?
   - `extraHosts`/network reachability: linked service container names already resolve via the shared `workspace`
     Docker network, so probably nothing extra is needed there — but worth confirming once this is built.
   - Multiple plugins implementing `:link` independently means duplicated CLI/controller boilerplate; worth
     revisiting whether the controller command itself (not just the gating module) should be a shared helper in
     `@wocker/core` that plugins configure rather than reimplement (e.g. a `LinkController` factory parameterized by
     the plugin's own `getService`/`containerName` lookup).

## Non-goals for this note

This is scoped to recording the idea, not to a commitment on the exact API. The first real implementation should
probably happen in one plugin (pgsql is the obvious candidate since `link()` already exists as a stub there) behind
the `linkPlugin` flag, get used for a bit, and only then get extracted into something shared once the shape is
proven.
