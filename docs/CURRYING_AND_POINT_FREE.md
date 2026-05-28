# Currying and Point-Free Style: How elevate-ts Code Is Written

This is an opinionated codebase. Almost every function you will read here follows three conventions, and knowing them up front makes the rest of the code obvious instead of surprising:

1. **Curried** — multi-argument functions are written as a chain of one-argument functions.
2. **Data-last** — the data being operated on is the _last_ argument; the configuration (functions, predicates, keys) comes first.
3. **Point-free** — because of the first two, transformations are composed with `pipe` / `flow` without ever naming the value flowing through them.

If you have used **fp-ts** this will feel familiar. If you are coming from **purify-ts** or OO-style method chaining, the argument order is deliberately flipped — see
[elevate-ts-vs-purify-ts.md](./elevate-ts-vs-purify-ts.md).

---

## The one rule that explains everything: config-first, data-last

Every combinator takes what _configures_ the operation first, and the data structure it operates on last. Look at the real signatures from `Either`:

```ts
map: <L, A, B>(f: (a: A) => B) =>
  (ea: Either<L, A>) =>
    Either<L, B>;
chain: <L, A, B>(f: (a: A) => Either<L, B>) =>
  (ea: Either<L, A>) =>
    Either<L, B>;
getOrElse: <L, R>(fallback: R) =>
  (ea: Either<L, R>) =>
    R;
fold: <L, R, B>(onLeft, onRight) =>
  (ea: Either<L, R>) =>
    B;
```

The `Either` is always the **last** thing you supply. Applying only the first argument returns a function still waiting for the data — and _that_ is the piece you compose.

```ts
import { map } from 'elevate-ts/Either';

const double = map((n: number) => n * 2);
// double : <L>(ea: Either<L, number>) => Either<L, number>
// `double` is a reusable transformer. The Either is supplied later.
```

This is why the order is data-last: it makes partial application produce exactly the unary functions that `pipe` wants to thread a value through.

---

## `pipe` and `flow`: the composition backbone

`pipe` takes a **value** and threads it left-to-right through a series of unary functions. `flow` is the same, but takes **no initial value** — it returns a function, for when you are building a
transformer rather than running one.

```ts
import { pipe, flow } from 'elevate-ts/Function';
import * as Either from 'elevate-ts/Either';

// pipe: value first, then the steps
const result = pipe(
  Either.Right(21) as Either.Either<string, number>,
  Either.map((n) => n * 2),
  Either.getOrElse(0)
); // 42

// flow: no value — produces a reusable function
const doubleOrZero = flow(
  Either.map((n: number) => n * 2),
  Either.getOrElse(0)
);
doubleOrZero(Either.Right(21)); // 42
```

Read a `pipe` top-to-bottom as a sentence: "take this Right, map double over it, then get its value or fall back to 0." There is no method chaining and no intermediate variables — the data-last shape
makes each line a self-contained step.

---

## What point-free looks like (and when to stop)

"Point-free" means writing functions as compositions without mentioning their argument (the "point"). Currying makes it natural; the library uses it **only where it reads clearly**.

```ts
import { pipe } from 'elevate-ts/Function';
import * as List from 'elevate-ts/List';

// [YES] Point-free: named predicates/transformers compose into a readable pipeline
const isAdult = (p: Person): boolean => p.age >= 18;
const fullName = (p: Person): string => `${p.first} ${p.last}`;

const adultNames = (people: readonly Person[]): readonly string[] =>
  pipe(
    people,
    (ps) => ps.filter(isAdult),
    (ps) => ps.map(fullName)
  );
```

The opinion, taken verbatim from the project standards:

- **[YES] Curry** when partial application is reused, or when it lets a function drop into a `pipe` / `flow`.
- **[NO] Do not curry** a simple two-argument function that is called once in one place — `add(a, b)` beats `add(a)(b)`.
- **[YES] Point-free** when the result reads like a sentence.
- **[NO] Not point-free** when it turns cryptic or needs a comment to explain what it does. Readability wins over cleverness every time.

```ts
// [NO] Over-abstracted — a generic compose just to add 5 hides intent
const doubleAddFive = compose(add(5), multiply(2));

// [YES] Plain and clear
const doubleAddFive = (n: number): number => n * 2 + 5;
```

---

## Reading a curried type signature

When you hit a signature like this in the source:

```ts
const filterBy =
  <T>(predicate: (item: T) => boolean) =>
  (items: readonly T[]): readonly T[] =>
    items.filter(predicate);
```

read the arrows left-to-right as "give me X, then Y":

- `filterBy(pred)` — "give me a predicate" → returns a function waiting for the array.
- `filterBy(pred)(items)` — "...now give me the items" → returns the filtered array.

The same shape appears at three levels in deeply curried functions. For example `Audit.track` is `track(operation)(monadType)(f)(input)(session)` — five single-argument steps. Each pair of parentheses
supplies one argument; you can stop partway and hold the partially-applied function as a reusable value.

---

## The helper functions that support the style

`elevate-ts/Function` ships the small tools that make currying and composition ergonomic:

| Helper                         | Purpose                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `pipe(a, ...fns)`              | Thread a value left-to-right through unary functions                                        |
| `flow(...fns)`                 | Compose unary functions into one, without an initial value                                  |
| `identity`                     | `(a) => a` — the no-op step (useful as a default branch)                                    |
| `constant(a)`                  | `() => a` — ignore input, always return `a`                                                 |
| `flip(f)`                      | Swap the two arguments of an uncurried binary function: `(a, b) => c` becomes `(b, a) => c` |
| `curry2` / `curry3` / `curry4` | Turn a tupled `(a, b) => c` into curried `(a) => (b) => c`                                  |
| `tap(f)`                       | Run a side effect on a value and return the value unchanged (debugging in a pipe)           |

Note that `flip` operates on **uncurried** binary functions (`(a, b) => c`), not on the curried, data-last combinators like `map` or `chain`. When you need a data-last function in the other order,
write a small local helper rather than reaching for `flip`. The library deliberately does not ship value-first variants of its combinators (for example, a value-first `ap`); the reasoning is in
[STATE_AND_VALIDATION.md](./STATE_AND_VALIDATION.md).

---

## A worked example

Putting all three conventions together — curried, data-last steps composed point-free in a `pipe`:

```ts
import { pipe } from 'elevate-ts/Function';
import * as Either from 'elevate-ts/Either';

type Order = { readonly id: string; readonly total: number };

const ensurePositive = (o: Order): Either.Either<string, Order> => (o.total > 0 ? Either.Right(o) : Either.Left(`Order ${o.id} has non-positive total`));

const applyTax = (o: Order): Order => ({ ...o, total: o.total * 1.2 });

const priceOrder = (o: Order): Either.Either<string, number> =>
  pipe(
    ensurePositive(o), // Either<string, Order>
    Either.map(applyTax), // map a pure transform over the Right
    Either.map((x) => x.total) // project the field
  );
```

Every step is a curried, data-last combinator; the `Order` / `Either` flowing through is never named after the first line. That is the house style.

---

## Why write code this way?

- **Composition without glue.** Data-last currying means functions snap together in `pipe` / `flow` with no adapter lambdas or temporary variables.
- **Tree-shaking and small bundles.** Standalone curried functions (rather than methods on a class prototype) let bundlers drop everything you do not import — important for the Cloudflare Workers
  target.
- **Reusability.** A partially-applied combinator (`const double = map(n => n * 2)`) is a first-class value you can name, pass around, and reuse.

---

## See Also

- [STATE_AND_VALIDATION.md](./STATE_AND_VALIDATION.md) — applies this style to `State` and `Validation`, including why there is no value-first `ap`
- [elevate-ts-vs-purify-ts.md](./elevate-ts-vs-purify-ts.md) — data-last vs. method chaining
- [API.md](./API.md) — full function reference
