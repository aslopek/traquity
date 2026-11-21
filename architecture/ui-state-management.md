# UI State Management

The ADRs in this file deal with how the Angular client manages its state: what the global store's slices and the signal stores hold, and how
they depend on each other. The conventions they follow are defined in `traquity-client-angular/LLM.md`.

## ADR-001: The security slice holds its own request currency, copied from the depot slice

**Status:** ACCEPTED

**Context:** Every security request asks for its price meta information in a currency: `getSecurity`, `getSecurities` and `updateSecurity`
take an optional `currency` query parameter. The currency to ask for is the one of the selected depots. The depot slice owns it and
announces every change with `Selected Depot Currency Changed`.

The security slice cannot read that value through the depot slice's selector. The depot slice already composes the security slice's
selectors (`depot.selector.ts` reads `securitiesById`), and `traquity-client-angular/LLM.md` forbids two slices importing each other's
selectors both ways.

Copying the currency into the security slice was considered first and declined. The first implementation put a `currency` field into
`Load Security`, `Load All Securities` and `Update Security` instead, and every dispatcher read `selectedDepotCurrency` to fill it. Once in
place, that showed three problems:

- **Every dispatcher had to know about depots.** Many call sites, among them the transaction page loading security names and the security
  edit screen saving master data, imported the depot selector only to pass its value on. Where the currency comes from was written down each
  and every time. This created tight coupling from several components to the depot slice that were not necessary.
- **The currency belongs to the slice, not to a request.** Every security the slice holds has to be priced in the same currency. A field per
  request let two dispatchers pass different currencies, and the slice could not tell which currency a security it already held had been
  loaded in: `Load Security` skips the request for a loaded security, whatever currency it was loaded in.
- **The slice kept a copy anyway.** To hold loads until the first currency was announced and to reload on a change, the security slice
  already listened to `Selected Depot Currency Changed` and kept the last announced currency in the private `scan` state of one effect.

**Decision:**

- The security slice has a 'request currency': the currency every security request it sends asks prices in. It has none until the depot
  slice announces the first currency.
- The 'request currency' is only meant to be attached to currency-bound requests for securities. Displaying a monetary value for a security
  still relies on other parameters. For example, price meta info have their own currency that must be used - even if it coincides with the
  globally stored currency.
- The security slice takes over every currency announced with `Selected Depot Currency Changed` by dispatching its own
  `Set Request Currency`. Only that action changes the request currency, since a slice's state changes only through the slice's own actions.
- `Load Security`, `Load All Securities` and `Update Security` do not accept a currency argument. The security slice sends their requests in
  its 'request currency'. A request arriving while there is none waits until one is set. It is never dropped and never sent without a
  currency.
- When the request currency changes, every loaded security is loaded again. Setting the same request currency again loads nothing.
- The security page puts the securities it shows into the security slice, so it asks for them in the request currency too, and loads its
  current page again when the request currency changes. Before a request currency is set, it sends no request and loads its page once one is
  set.

**Alternatives declined:**

- *The security slice reads `selectedDepotCurrency` itself.* The two slices would import each other's selectors both ways.
- *A currency field per action.* The first implementation, with the problems listed above.

**Consequences, accepted:**

- The currency of the selected depots exists twice in the global store. The copy follows the original one action later, and the security
  slice's requests use only the copy.
- Dispatchers load and update securities without knowing about depots. Tight coupling is prevented.
- Every request the security slice sends waits for the request currency on its own. A request added to the slice later has to wait the same
  way.
