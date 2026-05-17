// CancellableEitherAsync — Lazy Async Either with Cooperative Cancellation
//
// Extends EitherAsync with a third terminal state, Cancelled, and threads an
// optional AbortSignal through run(). Use it for timeouts, races, and flows that
// must abandon work cleanly. Sibling to EitherAsync; non-cancelling callers can
// continue to use EitherAsync unchanged. See docs/CANCELLABLE_DESIGN.md.

import * as Either from './Either.js';
import * as EitherAsync from './EitherAsync.js';

/** Third terminal state: the computation was cancelled and the answer is unwanted. */
export type Cancelled = { readonly tag: 'Cancelled'; readonly reason: unknown };

/** Construct a Cancelled terminal carrying a reason (typically the signal's `reason`). */
export const Cancelled = (reason: unknown): Cancelled => ({ tag: 'Cancelled', reason });

/** Test if a result is Cancelled. */
export const isCancelled = <L, R>(r: CancellableResult<L, R>): r is Cancelled => r.tag === 'Cancelled';

/** The three terminal states produced by run(): Right, Left, or Cancelled. */
export type CancellableResult<L, R> = Either.Either<L, R> | Cancelled;

/**
 * Lazy async Either with cooperative cancellation. run() accepts an optional
 * AbortSignal; underlying I/O is expected to forward it to short-circuit on abort.
 * Never throws or rejects: aborts become Cancelled, exceptions become Left.
 */
export type CancellableEitherAsync<L, R> = {
  readonly tag: 'CancellableEitherAsync';
  readonly run: (signal?: AbortSignal) => Promise<CancellableResult<L, R>>;
};

// --- internal helpers --------------------------------------------------------

const isAborted = (signal: AbortSignal | undefined): boolean => signal !== undefined && signal.aborted;

const isAbortError = (e: unknown): boolean => e instanceof Error && e.name === 'AbortError';

const cancelledFromSignal = (signal: AbortSignal): Cancelled => Cancelled(signal.reason ?? new Error('aborted'));

const linkSignals = (external: AbortSignal | undefined, internal: AbortController): AbortSignal => (external === undefined ? internal.signal : AbortSignal.any([external, internal.signal]));

// --- constructors ------------------------------------------------------------

/**
 * Construct a CancellableEitherAsync from a lazy run function.
 * @param run - A function (signal?) => Promise<CancellableResult<L, R>>.
 */
export const CancellableEitherAsync = <L, R>(run: (signal?: AbortSignal) => Promise<CancellableResult<L, R>>): CancellableEitherAsync<L, R> => ({
  tag: 'CancellableEitherAsync',
  run
});

/** Lift a synchronous Either into CancellableEitherAsync. */
export const liftEither = <L, R>(e: Either.Either<L, R>): CancellableEitherAsync<L, R> => CancellableEitherAsync(() => Promise.resolve(e));

/** Lift a pure Right value. */
export const of = <R>(value: R): CancellableEitherAsync<never, R> => liftEither(Either.Right(value));

/** Lift a pure Right value (explicit form). */
export const right = <R>(value: R): CancellableEitherAsync<never, R> => of(value);

/** Lift a pure Left error. */
export const left = <L>(error: L): CancellableEitherAsync<L, never> => liftEither(Either.Left(error));

/** Lift a pure Cancelled terminal with the given reason. */
export const cancelled = (reason: unknown): CancellableEitherAsync<never, never> => CancellableEitherAsync(() => Promise.resolve(Cancelled(reason)));

/**
 * Lift a Promise. Signal is checked at boundaries but not threaded into the Promise.
 * Rejected Promises become Left via onError; never throws or rejects.
 */
export const fromPromise = <L, R>(p: Promise<R>, onError: (e: unknown) => L): CancellableEitherAsync<L, R> =>
  CancellableEitherAsync(async (signal) => {
    if (isAborted(signal)) return cancelledFromSignal(signal as AbortSignal);
    return p.then(
      (r) => (isAborted(signal) ? cancelledFromSignal(signal as AbortSignal) : (Either.Right(r) as CancellableResult<L, R>)),
      (e) => Either.Left(onError(e))
    );
  });

/**
 * Primary cancellation lift: wraps an async function that accepts an AbortSignal.
 * AbortError rejections become Cancelled; other rejections become Left via onError.
 * Pre-aborted signals short-circuit before invocation. Never throws or rejects.
 */
export const fromAbortable = <L, R>(f: (signal: AbortSignal) => Promise<R>, onError: (e: unknown) => L): CancellableEitherAsync<L, R> =>
  CancellableEitherAsync(async (signal) => {
    const eff = signal ?? new AbortController().signal;
    if (eff.aborted) return cancelledFromSignal(eff);
    try {
      const r = await f(eff);
      return eff.aborted ? cancelledFromSignal(eff) : Either.Right(r);
    } catch (e) {
      return isAbortError(e) ? Cancelled(e) : Either.Left(onError(e));
    }
  });

/**
 * Wrap a non-signal-aware async function. The wrapper short-circuits to
 * Cancelled if signal is aborted at entry or after resolve; thrown exceptions
 * and rejections become Left via onError. Never throws or rejects.
 */
export const tryCatch = <L, R>(f: () => Promise<R>, onError: (e: unknown) => L): CancellableEitherAsync<L, R> =>
  CancellableEitherAsync(async (signal) => {
    if (isAborted(signal)) return cancelledFromSignal(signal as AbortSignal);
    try {
      const r = await f();
      return isAborted(signal) ? cancelledFromSignal(signal as AbortSignal) : Either.Right(r);
    } catch (e) {
      return isAbortError(e) ? Cancelled(e) : Either.Left(onError(e));
    }
  });

// --- functor / bifunctor / monad / applicative -------------------------------

/** Functor map over the Right value. Cancelled and Left pass through. */
export const map =
  <L, A, B>(f: (a: A) => B): ((cea: CancellableEitherAsync<L, A>) => CancellableEitherAsync<L, B>) =>
  (cea) =>
    CancellableEitherAsync(async (signal) => {
      const r = await cea.run(signal);
      return r.tag === 'Right' ? Either.Right(f(r.right)) : r;
    });

/** Map over the Left value. Cancelled and Right pass through. */
export const mapLeft =
  <L, L2, R>(f: (l: L) => L2): ((cea: CancellableEitherAsync<L, R>) => CancellableEitherAsync<L2, R>) =>
  (cea) =>
    CancellableEitherAsync(async (signal) => {
      const r = await cea.run(signal);
      if (r.tag === 'Left') return Either.Left(f(r.left));
      return r as CancellableResult<L2, R>;
    });

/** Bifunctor bimap: transform both Left and Right. Cancelled passes through. */
export const bimap =
  <L, L2, A, B>(f: (l: L) => L2, g: (a: A) => B): ((cea: CancellableEitherAsync<L, A>) => CancellableEitherAsync<L2, B>) =>
  (cea) =>
    CancellableEitherAsync(async (signal) => {
      const r = await cea.run(signal);
      if (r.tag === 'Right') return Either.Right(g(r.right));
      if (r.tag === 'Left') return Either.Left(f(r.left));
      return r;
    });

/** Monadic bind. Threads the signal into both stages. Cancelled and Left short-circuit. */
export const chain =
  <L, A, B>(f: (a: A) => CancellableEitherAsync<L, B>): ((cea: CancellableEitherAsync<L, A>) => CancellableEitherAsync<L, B>) =>
  (cea) =>
    CancellableEitherAsync(async (signal) => {
      const r = await cea.run(signal);
      if (r.tag !== 'Right') return r;
      return f(r.right).run(signal);
    });

/**
 * Recover from Left. Does NOT recover from Cancelled — use chainCancelled for that.
 * Keeping these distinct prevents silently retrying work the caller abandoned.
 */
export const chainLeft =
  <L, L2, R>(f: (l: L) => CancellableEitherAsync<L2, R>): ((cea: CancellableEitherAsync<L, R>) => CancellableEitherAsync<L2, R>) =>
  (cea) =>
    CancellableEitherAsync(async (signal) => {
      const r = await cea.run(signal);
      if (r.tag === 'Left') return f(r.left).run(signal);
      return r as CancellableResult<L2, R>;
    });

/** Recover from Cancelled by producing a new computation. Right and Left pass through. */
export const chainCancelled =
  <L, R>(f: (reason: unknown) => CancellableEitherAsync<L, R>): ((cea: CancellableEitherAsync<L, R>) => CancellableEitherAsync<L, R>) =>
  (cea) =>
    CancellableEitherAsync(async (signal) => {
      const r = await cea.run(signal);
      if (r.tag === 'Cancelled') return f(r.reason).run(signal);
      return r;
    });

/** Applicative apply. Cancelled or Left in either side propagates. */
export const ap =
  <L, A, B>(cef: CancellableEitherAsync<L, (a: A) => B>): ((cea: CancellableEitherAsync<L, A>) => CancellableEitherAsync<L, B>) =>
  (cea) =>
    CancellableEitherAsync(async (signal) => {
      const [f, a] = await Promise.all([cef.run(signal), cea.run(signal)]);
      if (f.tag === 'Cancelled') return f;
      if (a.tag === 'Cancelled') return a;
      if (f.tag === 'Left') return f;
      if (a.tag === 'Left') return a;
      return Either.Right(f.right(a.right));
    });

// --- cancellation-specific operators -----------------------------------------

/**
 * Cancel the computation after `ms` milliseconds. Composes an internal timeout
 * controller with the external signal via AbortSignal.any. Timeouts surface as
 * Cancelled with reason = Error('timeout after Nms'). Use chainCancelled to
 * convert to Left if a typed error is wanted.
 */
export const withTimeout =
  (ms: number): (<L, R>(cea: CancellableEitherAsync<L, R>) => CancellableEitherAsync<L, R>) =>
  <L, R>(cea: CancellableEitherAsync<L, R>) =>
    CancellableEitherAsync<L, R>(async (signal) => {
      const internal = new AbortController();
      const timer = setTimeout(() => internal.abort(new Error(`timeout after ${ms}ms`)), ms);
      try {
        return await cea.run(linkSignals(signal, internal));
      } finally {
        clearTimeout(timer);
      }
    });

/**
 * Race a non-empty array of computations; first to settle wins. The losers'
 * linked signals are aborted so any downstream I/O can short-circuit. An empty
 * input array yields Cancelled('race called with empty array').
 */
export const race = <L, R>(ceas: readonly CancellableEitherAsync<L, R>[]): CancellableEitherAsync<L, R> =>
  CancellableEitherAsync(async (signal) => {
    if (ceas.length === 0) return Cancelled('race called with empty array');
    const controllers = ceas.map(() => new AbortController());
    const promises = ceas.map((cea, i) => cea.run(linkSignals(signal, controllers[i] as AbortController)));
    const winner = await Promise.race(promises);
    controllers.forEach((c) => c.abort(new Error('race lost')));
    return winner;
  });

/**
 * Register a cleanup hook that fires whenever this stage produces Cancelled,
 * including upstream propagation. A throwing handler is silently caught — the
 * library has no logger and never re-throws from run().
 */
export const onCancel =
  <L, R>(handler: (reason: unknown) => void): ((cea: CancellableEitherAsync<L, R>) => CancellableEitherAsync<L, R>) =>
  (cea) =>
    CancellableEitherAsync(async (signal) => {
      const r = await cea.run(signal);
      if (r.tag === 'Cancelled') {
        try {
          handler(r.reason);
        } catch {
          // Swallow per contract.
        }
      }
      return r;
    });

// --- interop with EitherAsync ------------------------------------------------

/** Lift an EitherAsync. The signal is ignored — this stage cannot self-cancel. */
export const fromEitherAsync = <L, R>(ea: EitherAsync.EitherAsync<L, R>): CancellableEitherAsync<L, R> => CancellableEitherAsync(() => ea.run() as Promise<CancellableResult<L, R>>);

/** Collapse Cancelled into Left via onCancel, producing a plain EitherAsync. */
export const toEitherAsync = <L, R>(cea: CancellableEitherAsync<L, R>, onCancel: (reason: unknown) => L): EitherAsync.EitherAsync<L, R> =>
  EitherAsync.EitherAsync(async () => {
    const r = await cea.run();
    if (r.tag === 'Cancelled') return Either.Left(onCancel(r.reason));
    return r;
  });

// --- extraction --------------------------------------------------------------

/** Three-arm case analysis. The signal is forwarded to the wrapped computation. */
export const fold =
  <L, R, B>(onLeft: (l: L) => Promise<B>, onRight: (r: R) => Promise<B>, onCancelled: (reason: unknown) => Promise<B>): ((cea: CancellableEitherAsync<L, R>) => (signal?: AbortSignal) => Promise<B>) =>
  (cea) =>
  (signal) =>
    cea.run(signal).then((r) => {
      if (r.tag === 'Right') return onRight(r.right);
      if (r.tag === 'Left') return onLeft(r.left);
      return onCancelled(r.reason);
    });

// --- sequence ----------------------------------------------------------------

/**
 * All-or-first-non-Right: runs in parallel under a shared signal. On the first
 * Left or Cancelled, aborts the shared internal controller so any in-flight
 * sibling I/O can short-circuit, then returns that terminal.
 */
export const all = <L, R>(ceas: readonly CancellableEitherAsync<L, R>[]): CancellableEitherAsync<L, readonly R[]> =>
  CancellableEitherAsync(async (signal) => {
    const internal = new AbortController();
    const linked = linkSignals(signal, internal);
    const results = await Promise.all(ceas.map((cea) => cea.run(linked)));
    const values: R[] = [];
    for (const r of results) {
      if (r.tag !== 'Right') {
        internal.abort(new Error('sibling failed'));
        return r;
      }
      values.push(r.right);
    }
    return Either.Right(values);
  });
