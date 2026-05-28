# Choosing the Right Tool: State Extractors and Validation Applicatives

A how-and-why guide to two places where elevate-ts gives you more than one function for nearby jobs, and picking the wrong one quietly does the wrong thing:

- **`State`** ships three runners — `runState`, `evalState`, `execState`. They differ only in _which part of the result they hand back_.
- **`Validation`** accumulates errors through an _applicative_. There are two idiomatic ways to combine fields — the function-first `ap` chain and `sequence` / `traverse` — and one tempting
  anti-pattern (a value-first `ap`) to avoid.

For the `Audit` module (which composes with `State`), see [AUDIT.md](./AUDIT.md); this guide only covers the small `State` + `Audit` seam at the end.

---

## State: `runState` vs `evalState` vs `execState`

A `State<S, A>` is a pure function `S -> [A, S]`: given a starting state it returns a **value** `A` and a **next state** `S`. The three runners differ only in what they project out of that pair.

| Runner      | Signature                         | Returns                            | Reach for it when                                                             |
| ----------- | --------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| `runState`  | `runState(initial)(computation)`  | `readonly [A, S]` — the whole pair | You need _both_ the produced value and the final state                        |
| `evalState` | `evalState(initial)(computation)` | `A` — value only                   | You only care about the computed value; the state was scratch space           |
| `execState` | `execState(initial)(computation)` | `S` — final state only             | You only care about the resulting state; the value is `void` or uninteresting |

All three are curried `initial`-first so they sit cleanly at the end of a `pipe`.

```ts
import { get, put, modify, gets, runState, evalState, execState } from 'elevate-ts/State';

type Counter = { readonly count: number };

const increment = modify<Counter>((s) => ({ count: s.count + 1 }));

runState({ count: 0 })(increment); // [undefined, { count: 1 }]  — value is void
evalState({ count: 0 })(increment); // undefined                  — just the value
execState({ count: 0 })(increment); // { count: 1 }               — just the state
```

### How to choose

- **Applying a transition (the common case):** use **`execState`**. Transitions built from `modify` / `put` carry their result in the _state_, and their value is `void`. A store dispatch is the
  canonical example:

  ```ts
  // state is the current snapshot; t is the transition to apply
  const dispatch = (t: State<Counter, void>): void => {
    state = execState(state)(t);
  };
  ```

- **Reading a computed answer out of state:** use **`evalState`**. When the computation's job is to _produce a value_ from the state (via `get` / `gets`) and you do not need to keep the threaded state
  afterwards:

  ```ts
  const total = gets<Counter, number>((s) => s.count * 100);
  evalState({ count: 3 })(total); // 300
  ```

- **Both at once:** use **`runState`** — e.g. a reducer that returns the new state _and_ an event describing what happened.

### [NOTE] The pitfall this guide exists to prevent

`runState` returns `[value, state]` in that order. Destructuring the **first** element and treating it as the new state is the most common `State` bug:

```ts
// [NO] WRONG — `next` is the value (void for a modify), not the new state
const [next] = runState(state)(increment);
state = next; // state is now undefined

// [YES] RIGHT — execState hands back the state directly
state = execState(state)(increment);
```

If you find yourself writing `const [next] = runState(...)` and then ignoring the second element, you wanted `evalState`. If you find yourself reaching for the second element and ignoring the first,
you wanted `execState`.

---

## Validation: accumulating errors with the applicative

`Validation<E, A>` is `Either`'s sibling that **does not short-circuit**: where `Either` stops at the first `Left`, `Validation` keeps going and **collects every error**. That is exactly what you want
for form validation, where reporting only the first broken field is a poor experience.

### First decision: `Either`/`chain` or `Validation`?

| You want                                                                      | Use                      |
| ----------------------------------------------------------------------------- | ------------------------ |
| Stop at the first failure (dependent steps; later steps need earlier results) | `Either` + `chain`       |
| Run independent checks and report _all_ failures together                     | `Validation` applicative |

Field validators that depend on each other still use `chain` _within_ a field (e.g. "is non-empty" then "is a valid email"); the applicative combines the _independent_ fields.

### `ap` is function-first — and why it stays that way

The applicative combinator has this shape:

```ts
ap: <E, A, B>(vf: Validation<E, (a: A) => B>) =>
  (va: Validation<E, A>) =>
    Validation<E, B>;
```

The **function-carrying** Validation comes first (`vf`), the **value** second (`va`). This is the standard applicative signature — it matches Fantasy Land, fp-ts, purify-ts, and Haskell's `<*>`. Build
a record by feeding a curried constructor one field at a time:

```ts
import { pipe } from 'elevate-ts/Function';
import { Success, Failure, ap, chain, type Validation } from 'elevate-ts/Validation';

type Contact = { readonly name: string; readonly email: string };

const nonEmpty =
  (field: string) =>
  (v: string): Validation<string, string> =>
    v.trim().length > 0 ? Success(v.trim()) : Failure([`${field} is required`]);

const validEmail = (v: string): Validation<string, string> => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? Success(v) : Failure(['Invalid email']));

const build =
  (name: string) =>
  (email: string): Contact => ({ name, email });

// ap(vf)(va): the constructor is the inner Success, each ap layer applies a field.
// A failing field is carried through, so ALL field errors accumulate.
const validateContact = (raw: Contact): Validation<string, Contact> => ap(ap(Success(build))(nonEmpty('Name')(raw.name)))(pipe(raw.email, nonEmpty('Email'), chain(validEmail)));
```

### Why elevate-ts does _not_ ship a value-first `ap`

It is tempting, inside a left-to-right `pipe`, to want `pipe(Success(ctor), ap(field1), ap(field2))`. That does **not** type-check, because `pipe` feeds `Success(ctor)` into `ap`'s _value_ slot, but
`ap` expects the function-carrier there. The fix is **not** a flipped, value-first `ap` in the library:

- Function-first is the conventional, correct applicative signature. A value-first variant would surprise everyone who knows applicatives and would fork the mental model.
- The pull toward value-first is purely `pipe` ergonomics, and elevate-ts already solves the pipe-friendly case with `sequence` (below).

If a local pipe genuinely reads better with a flip, define a one-line helper _in your own code_ — but prefer the nested `ap` chain (type-precise per field) or `sequence` (clean for uniform fields)
first.

### `sequence` and `traverse` — the pipe-friendly, uniform-field path

When the fields share a type, `sequence` collapses an array of validations into a validation of an array, still **accumulating all errors**:

```ts
import { map, sequence } from 'elevate-ts/Validation';

const validateContact = (raw: Contact): Validation<string, Contact> =>
  pipe(
    sequence([nonEmpty('Name')(raw.name), pipe(raw.email, nonEmpty('Email'), chain(validEmail))]),
    map(([name, email]) => ({ name, email }))
  );
```

`traverse(f)(items)` is `sequence(items.map(f))` — use it to validate a homogeneous list (e.g. every row of a CSV) and get back either all the parsed rows or all the errors.

### Choosing between `ap` chain and `sequence`

| Situation                                                                    | Use                |
| ---------------------------------------------------------------------------- | ------------------ |
| Fields have different types, want each typed precisely through a constructor | nested `ap` chain  |
| Fields share a type (e.g. all `string`), want a clean left-to-right pipe     | `sequence` + `map` |
| Validating a list of like items                                              | `traverse`         |
| Dependent steps within one field                                             | `chain`            |

Both `ap` and `sequence` accumulate errors identically — the choice is about _type precision vs. pipe readability_, not about behavior.

---

## State + Audit: recording every transition

The `Audit` module wraps a plain function and records its input and output. Combined with `execState`, every dispatched transition becomes a replayable audit entry:

```ts
import * as Audit from 'elevate-ts/Audit';
import { execState } from 'elevate-ts/State';

// createSession defaults to enabled: false — pass { enabled: true } or nothing records
let session = Audit.createSession({ enabled: true });

const dispatch = (op: string, t: State<Counter, void>): void => {
  const [next, nextSession] = Audit.track(op)('State')((s: Counter) => execState(s)(t))(state)(session);
  state = next;
  session = nextSession;
};
```

`track` is deeply curried: `track(operation)(monadType)(f)(input)(session)` returns `readonly [output, nextSession]`. See [AUDIT.md](./AUDIT.md) for time-travel replay, filtering, custom id
generation, and privacy considerations.

---

## See Also

- [API.md](./API.md) — full function reference for `State`, `Validation`, and every module
- [AUDIT.md](./AUDIT.md) — the Audit subsystem in depth
- [elevate-ts-vs-purify-ts.md](./elevate-ts-vs-purify-ts.md) — data-last vs. method-chaining, and the `EitherAsync` / `Task` naming
