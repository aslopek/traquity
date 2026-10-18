# LLM.md

Guidance for LLM coding agents (Claude Code, etc.) working in this package.

## What this package is

Spring Boot backend implementing the `traquity-api` OpenAPI specs. Root `LLM.md` covers how this fits with `traquity-api` and
`traquity-client-angular`.

## Commands

- `mvn clean package -DskipTests` — regenerate OpenAPI server sources, then build the jar.
- `mvn generate-sources` — regenerate only `target/generated-sources/openapi`. Run after editing a spec.
- `mvn spring-boot:run -Dspring-boot.run.profiles=dev` — run locally on port `23726` (H2 console `29232`). Dev profiles set the DB
  password themselves and never read the stdin channel.
- `mvn test` — all tests. `-Dtest=ClassName` / `-Dtest=ClassName#method` for one class/method.
- No Maven wrapper, no lint/checkstyle/spotless plugin configured.

## Codegen workflow

Each domain has its own `openapi-generator-maven-plugin` execution in `pom.xml`. Generated sources land under
`target/generated-sources/openapi`. Never edit generated DTOs or `*ApiDelegate` interfaces — change the spec and re-run
`mvn generate-sources`.

## Architecture

- Package-per-domain, one package per spec file.
- **Layering, consistent across every domain**:
  1. A package-private `*Controller` implements the generated `*ApiDelegate` — the only place generated DTOs are touched
     directly.
  2. It delegates to a `*Service` interface / `*ServiceImpl` holding business logic, operating on domain objects/entities.
     Interfaces and domain objects are public; implementations package-private.
  3. Persistence through a Spring Data JPA `*Repository` over a `*Entity`. Both package-private.
  4. A MapStruct `*Mapper` converts between entity, domain object and DTO — new field mappings go here, never into the
     controller or service. Package-private. Interfaces for simple mappers, never a `default` method — use an abstract class instead.
- **Persistence**: one H2 database. Schema changes go through Liquibase changelogs, consecutive IDs/filenames.
  `ddl-auto: validate` — the entity model must always match an applied changelog; never let Hibernate create/alter the schema.
- **Config profiles**: `application.yaml` is shared/prod defaults; dev profiles are local-only variants and never ship.
- **Database password channel**: the packaged app hands the DB password over stdin, marked by an env flag; the password is
  read once per JVM and never logged. The stream stays open for the run and its EOF is the shutdown signal.
- Without the marker, the password falls through to the environment variable.
- **`common/`**: cross-domain utilities (arithmetic incl. XIRR, config, database, error, image, shared mapper helpers,
  monetary, pagination, startup, time, util). Check here before writing a new one-off utility in a domain package.

## Implementation conventions

- **Exceptions**: flat, empty, unchecked marker exceptions named after their HTTP status, each mapped 1:1 to a response by one
  central exception handler. Service interface methods declare these in `throws` even though unchecked, to document which
  failures a caller must expect — keep this on new service methods.
- **Not-found/conflict/optimistic-locking is framework-driven.** Let JPA/the DB detect the violation (stale version at flush,
  constraint violation, missing row) and translate it — never duplicate a condition the framework already detects with a
  hand-rolled pre-check query. Hand-roll only where the precondition is invisible to JPA (comparing a client-supplied version
  against the loaded entity) — don't remove those as "leftovers". A constraint-violation-to-conflict mapping relies on every
  non-uniqueness integrity condition being rejected upstream as a bad request first — add that validation when adding a column
  or reference, or its violation surfaces as a misleading conflict.
- **Default entity properties**: id, version (optimistic lock), created/updated timestamps.
- **Domain object vs. entity**: the common shape is a package-private entity paired with a public plain domain object with
  near-identical fields. Not universal — a purely computed concept can be domain-only; don't assume every concept needs an
  entity.
- **Lombok**: `@Data` for domain objects. `@Entity` classes use `@Getter`/`@Setter`, never `@Data` — generated
  `equals`/`hashCode` is broken for JPA entities. `@Embeddable` classes deliberately keep `@Data` — they need value-based
  equality for collection membership; don't "clean them up". Constructor injection via Lombok on final fields; a static-only
  helper class uses the Lombok utility-class annotation.
- **`Optional<T>`** appears only at the repository boundary — services unwrap it immediately and never return or propagate it.
- **Pagination**: reuse the shared pagination helpers and page-container type. Never wire Spring Data's `Pageable`/`Page<T>`
  into a controller directly.
- **Monetary/arithmetic helpers** take an explicit `MathContext` — pass one through, don't hardcode scale/rounding at the call
  site.
- **Logging**: parameterized placeholders, never string concatenation in a log call.

## Testing

Every endpoint (URL + method) gets its own integration test class, plus one CORS test case. Unit tests are the exception,
written only for complex pure logic — they never replace the per-endpoint integration test.

- **Per-endpoint integration test class**:
  - Class and test/setup methods package-private. Non-injected members are `private`, initialized only inside the setup
    method; injected beans are field-injected.
  - Setup method sets the baseline. The first test method is the baseline case — no extra arrange. Every other test changes
    exactly one precondition in its own arrange step.
  - Assertions cover the HTTP response **and** the resulting database state, checking that neither too few nor too many rows
    changed.
  - Factor repeated positive/negative cases into small shared private helpers so test methods stay short.
- A custom JPA query on a repository gets its own repository test next to it, same conventions.
- One CORS test case per endpoint, asserting the header for allowed origins and its absence for a disallowed one.
- A shared integration-test base annotation seeds baseline SQL before each test and truncates after; outbound HTTP calls are
  stubbed.
- **Never call an endpoint to prepare database state for a test.** Baseline data comes from one shared example-data SQL file —
  the same one the frontend uses for local dev, so it must keep covering every case needed there. Only a justified exception
  sets up its own SQL in an individual test.
- A unit test mocks everything that isn't JDK — DTOs and domain objects included.
- **Assertions use AssertJ's `assertThat(...)` only**.
- Shared test infrastructure (base test annotation, config, HTTP stubbing, raw-SQL assertion helpers, ID constant holders)
  lives in one shared integration-test package — reach for raw SQL there instead of exposing another domain's repository.
