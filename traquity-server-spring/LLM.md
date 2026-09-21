# LLM.md

This file provides guidance to LLM coding agents (Claude Code, etc.) when working with code in this repository.

## What this package is

A monolithic Spring Boot 4 (Java 25) backend implementing the `traquity-api` OpenAPI specs. See the root `LLM.md` for how this fits
together with `traquity-api` (spec source) and `traquity-client-angular` (which this backend is bundled into for the Electron desktop
app).

## Commands

- `mvn clean package -DskipTests` — regenerates OpenAPI server sources (`generate-sources` phase, `openapi-generator-maven-plugin`) then
  builds `target/traquity-server-spring-<version>.jar`.
- `mvn generate-sources` — regenerate only `target/generated-sources/openapi` without a full build; do this after editing a spec in
  `../traquity-api` and before relying on IDE autocomplete for a new `*ApiDelegate`/DTO.
- `mvn spring-boot:run -Dspring-boot.run.profiles=dev` — run the backend directly on port `23726` (H2 console `29232`). Other dev profiles:
  `dev-file`, `dev-empty-db` (see `application-dev*.yaml` for what each seeds/uses). Every dev profile sets `spring.datasource.password`
  itself and never consults `TQ_DB_FILE_PASSWORD`, so the stdin password channel described below does not apply to any of them; a plain
  `mvn spring-boot:run` with no profile and `TQ_DB_FILE_PASSWORD` exported in the shell works without providing a password on `stdin`.
- `mvn test` — run all tests.
- `mvn test -Dtest=CreateDepotTest` — run a single test class; `-Dtest=CreateDepotTest#someMethod` for a single method.
- No Maven wrapper is checked in (use a local `mvn`); no lint/checkstyle/spotless plugin is configured.

## Codegen workflow

Each domain has its own `execution` block in the `openapi-generator-maven-plugin` config in `pom.xml`, all sharing `api/openapi-config.json`
(delegate pattern, `Dto` model suffix, Java 8 date types) but each setting its own `apiPackage` (e.g.
`de.as.traquity.depot.api.controller`) and `inputSpec` pointing at `../traquity-api/*.yaml`. Generated sources land in
`target/generated-sources/openapi/src/main/java` (wired into the build via the `build-helper-maven-plugin`) — never edit generated DTOs or
`*ApiDelegate` interfaces; change the spec instead and re-run `mvn generate-sources`.

## Architecture

- **Package-per-domain** under `de.as.traquity/`: `admin`, `depot` (+ `dividend`, `performance`, `position`, `transaction` sub-packages),
  `configuration` (+ `securitygroup`), `security` (+ `stocksplit`), `price/security`, `notification/dividendannouncement`, `exchangerates`
  — one package per `traquity-api` spec file. `admin` holds what the Admin API describes: the process itself (PID, development mode, its
  database connection) and the third-party licenses of the libraries it ships with.
- **Layering, consistent across every domain**:
    1. A package-private `*Controller` implements the generated `*ApiDelegate` interface (e.g.
       `DepotController implements DepotApiDelegate`) — this is the only place generated request/response DTOs are touched directly.
    2. It delegates to a `*Service` interface / `*ServiceImpl` holding the actual business logic, operating on plain domain objects/entities
       rather than DTOs. Service Interfaces and domain objects are public, service implementations package-private.
    3. Persistence goes through a Spring Data JPA `*Repository` over a `*Entity`. Repositories and Entities are package-private.
    4. A MapStruct `*Mapper` converts between `*Entity`, domain objects, and generated DTOs — add new field mappings here rather than in the
       controller or service. Mappers are package-private. Mapper interfaces are okay but never use `default` methods — switch to abstract
       classes in this case.
- **Persistence**: a single encrypted H2 file database (see root `LLM.md` for the connection/env var details); schema changes go through
  Liquibase changelogs in `src/main/resources/db/changelogs`, wired via `classpath:db/liquibase.xml`. `ddl-auto: validate` means the entity
  model must always match an applied changelog — never rely on Hibernate to create/alter the schema. New changelogs must follow the existing
  conventions (consecutive IDs and filenames).
- **Config profiles**: `application.yaml` holds shared/prod defaults; `application-dev.yaml`, `application-dev-file.yaml`,
  `application-dev-empty-db.yaml` are local dev variants (different seed/DB state) activated via `-Dspring-boot.run.profiles=<name>`. None
  of the dev profiles are shipped with the app.
- **Database password channel**: the packaged Electron spawn hands the H2 file password over the process's stdin instead of its
  environment, marked by `TQ_DB_FILE_PASSWORD_STDIN=true` in the environment. The stream stays open for the whole run, and reaching EOF on
  it is a shutdown request, not part of the handover — see `architecture/configuration.md` ADR-012 for the full reasoning.
  `common/startup/StdinPasswordEnvironmentPostProcessor` (an `EnvironmentPostProcessor`, registered via `META-INF/spring.factories` under
  `org.springframework.boot.EnvironmentPostProcessor` — the `.imports` mechanism is auto-configuration-only and does not apply here) reads
  the first line of `System.in` only when that marker is present, decodes it once as UTF-8, and contributes it as the
  `TQ_DB_FILE_PASSWORD` property ahead of the system environment via `common/startup/SystemInChannel`'s single `StdinChannel`. The read is
  one-shot per JVM, so the outcome of the first read is memoized instead of the line being read again. The password is the bytes before the
  first line feed, verbatim — no trimming, `\r` included — so it travels byte-for-byte, whitespace included except for a line feed itself.
  Without the marker (every standalone `mvn spring-boot:run` and every dev profile), `System.in` is never touched and `application.yaml`'s
  `${TQ_DB_FILE_PASSWORD:}` placeholder falls through to the environment variable exactly as before; the fallback applies also if the marker
  is set but the line never completes within the read timeout. The password is never logged. `common/startup/StdinShutdown` closes the
  application context and exits with code 0 once that same stream reaches EOF, again only when the marker is set. Running `backend.jar` by
  hand with the marker set: `Enter` completes the password, and `Ctrl-D` (`Ctrl-Z` then `Enter` on Windows) shuts the backend down.
- **`common/`**: cross-domain utilities — `arithmetic` (incl. XIRR calculation), `config` (`@Configuration` classes), `database`, `error`
  (exception handling), `image`, `mapper` (shared MapStruct helpers, e.g. `DateParser`), `monetary`, `pagination`, `startup` (boot-time
  environment contributions), `time`, `util` (value formatting). Reach for these before writing a new one-off utility in a domain package.

## Implementation conventions

- **Exceptions**: `common/error` defines a flat set of empty, unchecked marker exceptions named after their HTTP status
  (`NotFoundException`, `ConflictException`, `BadRequestException`, `UnprocessableEntityException`,
  `InternalServerErrorException`), each mapped 1:1 to a `ResponseEntity` with an empty body by a package-private `@ControllerAdvice`
  (`common/error/RestExceptionHandler.java`; `ConstraintViolationException` also maps to 400 there). Service interface methods declare these
  in a `throws` clause even though they're unchecked (e.g. `DepotService.createDepot(...) throws BadRequestException, ConflictException`)
  purely to document which failures a caller must expect — keep this on new service methods rather than removing it as redundant.
- **Not-found/conflict/optimistic-locking**: framework-driven — let JPA/the DB detect the violation (stale version at flush,
  unique/referential constraint violation, missing row on `findById`) and translate the resulting exception into the matching
  `common/error` exception; never duplicate a condition the framework can detect with a hand-rolled pre-check query. Hand-rolling is only
  justified when the precondition is invisible to JPA/the DB — e.g. comparing a client-supplied version against the loaded entity's in
  update methods (`findById(...).orElseThrow(NotFoundException::new)` + version equality check → `ConflictException`, see
  `SecurityServiceImpl.updateSecurity`) — so don't remove such checks as leftovers. The `persist(...)` methods mapping
  `DataIntegrityViolationException` to `ConflictException` (409) rely on every non-uniqueness integrity condition (not-null, length,
  missing FK target) being rejected as 400 by upstream validation — when adding a column or reference, add that validation too, or its
  violation will surface as a misleading 409.
- **Default entity properties**: `Long id` (primary key), `Long version` (`@Version` annotated for optimistic locking),
  `OffsetDateTime createdAt` (`@CreationTimestamp` annotated), `OffsetDateTime updatedAt` (`@UpdateTimestamp` annotated).
- **Domain object vs. entity**: the common shape is a package-private `*Entity` (`@Getter @Setter @Entity`) paired with a public plain
  domain object (`@Data`, no persistence annotations) with near-identical fields, including `id`/`version` (e.g. `depot/Depot.java` vs.
  `depot/DepotEntity.java`). This isn't universal, though — purely computed/non-persisted concepts (e.g.
  `depot/performance/model/Performance.java`) are domain-only with no entity counterpart. Don't assume every new domain concept needs an
  entity.
- **Lombok**: `@Data` is the default for domain objects; `@Entity` classes use `@Getter` + `@Setter` instead — never `@Data`, since
  Lombok-generated `equals`/`hashCode` is broken for JPA entities (identity semantics via Hibernate proxies, mutable hash codes).
  `@Embeddable` classes (e.g. `CurrencyMappingEntity`, `HistoricalSecurityPriceMarketCloseTimeEntity`) deliberately keep `@Data`: they are
  stored in `@ElementCollection` `HashSet`s and therefore need value-based `equals`/`hashCode` — don't "clean them up" to
  `@Getter`/`@Setter`. `@RequiredArgsConstructor` on `final` fields is the standard constructor-injection style; `@UtilityClass` is used for
  static-only helpers (e.g. `MathFunctions`, `PaginationUtils`) instead of a private constructor.
- **`Optional<T>`** is used only at the repository boundary (e.g. `findByName(...)`); services unwrap it immediately via
  `.orElseThrow(NotFoundException::new)` rather than returning/propagating `Optional` themselves.
- **Pagination**: reuse `common/pagination/PaginationUtils.getPageNumber/getPageSize(Integer)` (defaults `null` to page `0`/size `10`,
  throws `BadRequestException` on negative/zero) and `PageContainer<T>` (`total`, `currentPage`, `lastPage`, `pageSize`, `items`) — don't
  wire up Spring Data's `Pageable`/`Page<T>` directly in controllers.
- **Monetary/arithmetic helpers**: `common/arithmetic/MathFunctions` (a `@UtilityClass`) and `XirrFunction` take an explicit `MathContext`
  rather than relying on a global rounding mode — pass one through rather than hardcoding scale/rounding at the call site.
- **Logging**: `@Slf4j` with parameterized `{}` placeholders is the convention — avoid string concatenation in log calls.

## Testing concept

Every endpoint (a URL + HTTP method combination) has its own integration test class, plus one test case in `CorsIntegrationTest.java`. Unit
tests are the exception, written only when there's a specific reason (complex pure logic like `XirrFunctionTest`, `ValueFormatServiceTest`;
or, like `common/startup`'s `StdinChannelTest`/`StdinPasswordEnvironmentPostProcessorTest`/`StdinShutdownTest`, logic that runs before any
application context exists, or whose whole effect is ending the JVM, so no integration test can reach it). They never replace the
per-endpoint integration test.

- **Per-endpoint integration test class** (e.g. `CreateDepotTest`, `DeleteDepotTest`):
    - The class and every `@Test`/`@BeforeEach`/etc.-annotated method are package-private. Non-`@Autowired` members are `private` and are
      only ever initialized inside `void beforeEach()` — `@Autowired` beans are the one exception, injected via field injection instead.
    - `beforeEach()` sets up the baseline. The **first test method** in the class is the baseline case itself — no extra arrange, just act +
      assert. Every other test changes exactly one precondition in its own arrange step, then does act + assert (see `CreateDepotTest`:
      `createDepot_ok` is the baseline; `createDepot_USD_ok`, `createDepot_noName_badRequest`, etc. each change exactly one field of the
      shared `requestBody`).
    - Request bodies/headers that vary are `private` fields, initialized in `beforeEach()` per the same rule; the MockMvc request itself is
      built in a small private helper (e.g. `postDepot()`).
    - Assertions cover both the HTTP response (status, body, headers where applicable) **and** the resulting database state — and must check
      that neither too few nor too many rows changed (a `DELETE` test must assert the target row is gone *and* the row count only dropped by
      exactly one; see `DeleteDepotTest.deleteDepot_empty_ok` / `deleteDepot_transactionsAreRemoved`, which use `TestDataQuery` helpers to
      check cascade-deleted rows precisely).
    - Where practical, factor repeated positive/negative cases into parameterizable `runPositiveTestCase(...)` / `runNegativeTestCase(...)`
      private methods (see `CreateDepotTest`) so individual `@Test` methods stay short.
- A custom JPA query on a `*Repository` must have its own integration test (a `*RepositoryTest` next to the repository), following the
  same `@IntegrationTest` + package-private conventions.
- **`CorsIntegrationTest.java`**: one `@Test` per endpoint, each calling a shared
  `testEndpoint(HttpMethod, url, requestBody[, contentType])` helper that asserts the CORS header for two allowed origins and its absence
  for a disallowed one. Add a case here whenever a new endpoint is added, grouped under a `// <path>` comment matching the existing layout
  and alphabetical sorting.
- **`@IntegrationTest`** (`src/test/java/integration/IntegrationTest.java`) is the meta-annotation used by every integration test:
  `@SpringBootTest` + `@AutoConfigureMockMvc`, seeds `example-data.sql` + exchange-rate + historical-price SQL before each test method and
  truncates after. `MockServerUtils` stubs outbound HTTP calls (e.g. ECB exchange rates); fixtures live under `src/test/resources/fixtures`.
- **Never call an endpoint to prepare database state for a test.** All baseline data comes from
  `src/main/resources/db/example-data/example-data.sql` — the same file the frontend uses for local dev, so it must keep covering every case
  needed there, and any addition must follow the existing, orderly layout of that file (grouped by table, consistent `INSERT` style). Only
  in justified exceptional cases may an individual test case manipulate the database upfront with its own SQL instead.
- If a unit test is written, everything that isn't from the JDK — including DTOs and domain objects — must be mocked with Mockito rather
  than constructed for real (see `ValueFormatServiceTest`, `DividendAnnouncementServiceTest`).
- **Only use AssertJ DSL for assertions:** Assertions always use AssertJ's `assertThat(...)` (as in every example above) — never JUnit's own
  `assertEquals`/`assertTrue`/etc.
- `src/test/java/integration/` holds the shared integration-test infrastructure used across all of the above: `IntegrationTest`,
  `IntegrationTestConfig`, `MockServerUtils`, ID constant holders (`DepotIds`, `SecurityIds`), and `sql/TestDataQuery` (raw SQL assertions
  against DB to avoid exposing repositories from other domains).
