import { describe, it, expect, vi } from 'vitest';

import * as CancellableEitherAsync from '../src/CancellableEitherAsync.js';
import * as Either from '../src/Either.js';
import * as EitherAsync from '../src/EitherAsync.js';

const abortedSignal = (reason: unknown = 'pre-aborted'): AbortSignal => {
  const c = new AbortController();
  c.abort(reason);
  return c.signal;
};

describe('CancellableEitherAsync', () => {
  describe('construction and execution', () => {
    it('CancellableEitherAsync constructs a lazy async computation', async () => {
      let executed = false;
      const cea = CancellableEitherAsync.CancellableEitherAsync(async () => {
        executed = true;
        return Either.Right(42);
      });

      expect(executed).toBe(false);
      const result = await cea.run();
      expect(executed).toBe(true);
      expect(result).toEqual(Either.Right(42));
    });
  });

  describe('Cancelled constructor and isCancelled', () => {
    it('Cancelled produces a tagged terminal with reason', () => {
      const c = CancellableEitherAsync.Cancelled('user-aborted');
      expect(c).toEqual({ tag: 'Cancelled', reason: 'user-aborted' });
    });

    it('isCancelled discriminates correctly', () => {
      expect(CancellableEitherAsync.isCancelled(CancellableEitherAsync.Cancelled('x'))).toBe(true);
      expect(CancellableEitherAsync.isCancelled(Either.Right(1))).toBe(false);
      expect(CancellableEitherAsync.isCancelled(Either.Left('e'))).toBe(false);
    });
  });

  describe('of, right, left, cancelled', () => {
    it('of lifts a pure value into Right', async () => {
      const result = await CancellableEitherAsync.of(42).run();
      expect(result).toEqual(Either.Right(42));
    });

    it('right lifts a pure value into Right', async () => {
      const result = await CancellableEitherAsync.right(99).run();
      expect(result).toEqual(Either.Right(99));
    });

    it('left lifts a pure error into Left', async () => {
      const result = await CancellableEitherAsync.left('boom').run();
      expect(result).toEqual(Either.Left('boom'));
    });

    it('cancelled lifts a pure Cancelled terminal', async () => {
      const result = await CancellableEitherAsync.cancelled('user').run();
      expect(result).toEqual({ tag: 'Cancelled', reason: 'user' });
    });
  });

  describe('liftEither', () => {
    it('lifts a Right', async () => {
      const result = await CancellableEitherAsync.liftEither(Either.Right(5)).run();
      expect(result).toEqual(Either.Right(5));
    });

    it('lifts a Left', async () => {
      const result = await CancellableEitherAsync.liftEither(Either.Left('e')).run();
      expect(result).toEqual(Either.Left('e'));
    });
  });

  describe('fromPromise', () => {
    it('resolves a Promise into Right', async () => {
      const cea = CancellableEitherAsync.fromPromise(Promise.resolve(42), (e) => `err: ${String(e)}`);
      const result = await cea.run();
      expect(result).toEqual(Either.Right(42));
    });

    it('rejected Promise becomes Left via onError', async () => {
      const cea = CancellableEitherAsync.fromPromise(Promise.reject(new Error('oops')), () => 'caught');
      const result = await cea.run();
      expect(result).toEqual(Either.Left('caught'));
    });

    it('pre-aborted signal short-circuits to Cancelled', async () => {
      const cea = CancellableEitherAsync.fromPromise(Promise.resolve(42), () => 'err');
      const result = await cea.run(abortedSignal('first'));
      expect(result.tag).toBe('Cancelled');
    });

    it('CRITICAL: fromPromise never rejects', async () => {
      const cea = CancellableEitherAsync.fromPromise(Promise.reject(new Error('boom')), () => 'mapped');
      await expect(cea.run()).resolves.toBeDefined();
    });
  });

  describe('fromAbortable', () => {
    it('successful resolve becomes Right', async () => {
      const cea = CancellableEitherAsync.fromAbortable(
        async () => 10,
        () => 'err'
      );
      const result = await cea.run();
      expect(result).toEqual(Either.Right(10));
    });

    it('non-abort rejection becomes Left via onError', async () => {
      const cea = CancellableEitherAsync.fromAbortable(
        async () => {
          throw new Error('regular failure');
        },
        () => 'mapped'
      );
      const result = await cea.run();
      expect(result).toEqual(Either.Left('mapped'));
    });

    it('AbortError rejection becomes Cancelled', async () => {
      const cea = CancellableEitherAsync.fromAbortable(
        async () => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          throw e;
        },
        () => 'should-not-be-called'
      );
      const result = await cea.run();
      expect(result.tag).toBe('Cancelled');
    });

    it('pre-aborted signal short-circuits before invocation', async () => {
      const called = vi.fn(async () => 1);
      const cea = CancellableEitherAsync.fromAbortable(called, () => 'err');
      const result = await cea.run(abortedSignal('pre'));
      expect(called).not.toHaveBeenCalled();
      expect(result.tag).toBe('Cancelled');
    });

    it('signal aborted mid-await results in Cancelled', async () => {
      const ctrl = new AbortController();
      const cea = CancellableEitherAsync.fromAbortable(
        (signal) =>
          new Promise<number>((_, reject) => {
            signal.addEventListener('abort', () => {
              const e = new Error('aborted');
              e.name = 'AbortError';
              reject(e);
            });
          }),
        () => 'err'
      );
      const promise = cea.run(ctrl.signal);
      ctrl.abort('mid');
      const result = await promise;
      expect(result.tag).toBe('Cancelled');
    });

    it('passes signal to user fn even when no external signal provided', async () => {
      const seen: AbortSignal[] = [];
      const cea = CancellableEitherAsync.fromAbortable(
        async (signal) => {
          seen.push(signal);
          return 7;
        },
        () => 'err'
      );
      await cea.run();
      expect(seen).toHaveLength(1);
      expect(seen[0]?.aborted).toBe(false);
    });
  });

  describe('tryCatch', () => {
    it('captures a successful Promise', async () => {
      const cea = CancellableEitherAsync.tryCatch(
        async () => 11,
        () => 'err'
      );
      const result = await cea.run();
      expect(result).toEqual(Either.Right(11));
    });

    it('rejected Promise becomes Left', async () => {
      const cea = CancellableEitherAsync.tryCatch(
        async () => {
          throw new Error('fail');
        },
        () => 'mapped'
      );
      const result = await cea.run();
      expect(result).toEqual(Either.Left('mapped'));
    });

    it('pre-aborted signal short-circuits even though fn ignores signal', async () => {
      const called = vi.fn(async () => 1);
      const cea = CancellableEitherAsync.tryCatch(called, () => 'err');
      const result = await cea.run(abortedSignal());
      expect(called).not.toHaveBeenCalled();
      expect(result.tag).toBe('Cancelled');
    });
  });

  describe('map, mapLeft, bimap', () => {
    it('map transforms Right', async () => {
      const result = await CancellableEitherAsync.map((n: number) => n * 2)(CancellableEitherAsync.of(5)).run();
      expect(result).toEqual(Either.Right(10));
    });

    it('map passes Left through', async () => {
      const result = await CancellableEitherAsync.map((n: number) => n * 2)(CancellableEitherAsync.left('e')).run();
      expect(result).toEqual(Either.Left('e'));
    });

    it('map passes Cancelled through', async () => {
      const result = await CancellableEitherAsync.map((n: number) => n * 2)(CancellableEitherAsync.cancelled('x')).run();
      expect(result.tag).toBe('Cancelled');
    });

    it('mapLeft transforms Left', async () => {
      const result = await CancellableEitherAsync.mapLeft((s: string) => s.toUpperCase())(CancellableEitherAsync.left('err')).run();
      expect(result).toEqual(Either.Left('ERR'));
    });

    it('mapLeft passes Cancelled through', async () => {
      const result = await CancellableEitherAsync.mapLeft((s: string) => s.toUpperCase())(CancellableEitherAsync.cancelled('x')).run();
      expect(result.tag).toBe('Cancelled');
    });

    it('bimap transforms Right', async () => {
      const result = await CancellableEitherAsync.bimap(
        (s: string) => s.length,
        (n: number) => n + 1
      )(CancellableEitherAsync.of(5)).run();
      expect(result).toEqual(Either.Right(6));
    });

    it('bimap transforms Left', async () => {
      const result = await CancellableEitherAsync.bimap(
        (s: string) => s.length,
        (n: number) => n + 1
      )(CancellableEitherAsync.left('abc')).run();
      expect(result).toEqual(Either.Left(3));
    });

    it('bimap passes Cancelled through', async () => {
      const result = await CancellableEitherAsync.bimap(
        (s: string) => s.length,
        (n: number) => n + 1
      )(CancellableEitherAsync.cancelled('x')).run();
      expect(result.tag).toBe('Cancelled');
    });
  });

  describe('chain', () => {
    it('flattens nested computations', async () => {
      const result = await CancellableEitherAsync.chain((n: number) => CancellableEitherAsync.of(n * 2))(CancellableEitherAsync.of(5)).run();
      expect(result).toEqual(Either.Right(10));
    });

    it('Left short-circuits', async () => {
      const f = vi.fn((_: number) => CancellableEitherAsync.of(0));
      const result = await CancellableEitherAsync.chain(f)(CancellableEitherAsync.left('e')).run();
      expect(f).not.toHaveBeenCalled();
      expect(result).toEqual(Either.Left('e'));
    });

    it('Cancelled short-circuits', async () => {
      const f = vi.fn((_: number) => CancellableEitherAsync.of(0));
      const result = await CancellableEitherAsync.chain(f)(CancellableEitherAsync.cancelled('x')).run();
      expect(f).not.toHaveBeenCalled();
      expect(result.tag).toBe('Cancelled');
    });

    it('threads signal into downstream stage', async () => {
      const seen: AbortSignal[] = [];
      const downstream = (_n: number) =>
        CancellableEitherAsync.fromAbortable(
          async (signal) => {
            seen.push(signal);
            return 0;
          },
          () => 'err'
        );
      const pipeline = CancellableEitherAsync.chain(downstream)(CancellableEitherAsync.of(1));
      const ctrl = new AbortController();
      await pipeline.run(ctrl.signal);
      expect(seen).toHaveLength(1);
    });
  });

  describe('chainLeft', () => {
    it('recovers from Left', async () => {
      const result = await CancellableEitherAsync.chainLeft((_e: string) => CancellableEitherAsync.of(99))(CancellableEitherAsync.left('e')).run();
      expect(result).toEqual(Either.Right(99));
    });

    it('passes Right through untouched', async () => {
      const f = vi.fn((_e: string) => CancellableEitherAsync.of(0));
      const result = await CancellableEitherAsync.chainLeft(f)(CancellableEitherAsync.of(7)).run();
      expect(f).not.toHaveBeenCalled();
      expect(result).toEqual(Either.Right(7));
    });

    it('does NOT recover from Cancelled (key §6.2 contract)', async () => {
      const f = vi.fn((_e: string) => CancellableEitherAsync.of(99));
      const result = await CancellableEitherAsync.chainLeft(f)(CancellableEitherAsync.cancelled('x')).run();
      expect(f).not.toHaveBeenCalled();
      expect(result.tag).toBe('Cancelled');
    });
  });

  describe('chainCancelled', () => {
    it('recovers from Cancelled', async () => {
      const result = await CancellableEitherAsync.chainCancelled((_r: unknown) => CancellableEitherAsync.of(123))(CancellableEitherAsync.cancelled('x')).run();
      expect(result).toEqual(Either.Right(123));
    });

    it('passes Right through untouched', async () => {
      const f = vi.fn((_r: unknown) => CancellableEitherAsync.of(0));
      const result = await CancellableEitherAsync.chainCancelled(f)(CancellableEitherAsync.of(1)).run();
      expect(f).not.toHaveBeenCalled();
      expect(result).toEqual(Either.Right(1));
    });

    it('passes Left through untouched', async () => {
      const f = vi.fn((_r: unknown) => CancellableEitherAsync.of(0));
      const result = await CancellableEitherAsync.chainCancelled(f)(CancellableEitherAsync.left('e')).run();
      expect(f).not.toHaveBeenCalled();
      expect(result).toEqual(Either.Left('e'));
    });
  });

  describe('ap', () => {
    it('applies a Right function to a Right value', async () => {
      const cef = CancellableEitherAsync.of((n: number) => n + 1);
      const result = await CancellableEitherAsync.ap(cef)(CancellableEitherAsync.of(4)).run();
      expect(result).toEqual(Either.Right(5));
    });

    it('Cancelled on the function side propagates', async () => {
      const result = await CancellableEitherAsync.ap(CancellableEitherAsync.cancelled('x') as CancellableEitherAsync.CancellableEitherAsync<string, (n: number) => number>)(
        CancellableEitherAsync.of(1)
      ).run();
      expect(result.tag).toBe('Cancelled');
    });

    it('Left on the value side propagates', async () => {
      const cef = CancellableEitherAsync.of((n: number) => n + 1);
      const result = await CancellableEitherAsync.ap(cef)(CancellableEitherAsync.left('e')).run();
      expect(result).toEqual(Either.Left('e'));
    });
  });

  describe('withTimeout', () => {
    it('completes before timeout → Right', async () => {
      const cea = CancellableEitherAsync.fromAbortable(
        async () => 7,
        () => 'err'
      );
      const result = await CancellableEitherAsync.withTimeout(1000)(cea).run();
      expect(result).toEqual(Either.Right(7));
    });

    it('timeout fires → Cancelled', async () => {
      vi.useFakeTimers();
      const cea = CancellableEitherAsync.fromAbortable(
        (signal) =>
          new Promise<number>((_, reject) => {
            signal.addEventListener('abort', () => {
              const e = new Error('aborted');
              e.name = 'AbortError';
              reject(e);
            });
          }),
        () => 'err'
      );
      const promise = CancellableEitherAsync.withTimeout(50)(cea).run();
      vi.advanceTimersByTime(60);
      const result = await promise;
      expect(result.tag).toBe('Cancelled');
      vi.useRealTimers();
    });

    it('external abort during withTimeout → Cancelled', async () => {
      const ctrl = new AbortController();
      const cea = CancellableEitherAsync.fromAbortable(
        (signal) =>
          new Promise<number>((_, reject) => {
            signal.addEventListener('abort', () => {
              const e = new Error('aborted');
              e.name = 'AbortError';
              reject(e);
            });
          }),
        () => 'err'
      );
      const promise = CancellableEitherAsync.withTimeout(1000)(cea).run(ctrl.signal);
      ctrl.abort('user');
      const result = await promise;
      expect(result.tag).toBe('Cancelled');
    });
  });

  describe('race', () => {
    it('first Right wins', async () => {
      const slow = CancellableEitherAsync.fromAbortable(
        () => new Promise<number>((r) => setTimeout(() => r(100), 50)),
        () => 'err'
      );
      const fast = CancellableEitherAsync.of(1);
      const result = await CancellableEitherAsync.race([slow, fast]).run();
      expect(result).toEqual(Either.Right(1));
    });

    it('first Left wins', async () => {
      const slow = CancellableEitherAsync.fromAbortable(
        () => new Promise<number>((r) => setTimeout(() => r(100), 50)),
        () => 'err'
      );
      const result = await CancellableEitherAsync.race([CancellableEitherAsync.left('first'), slow]).run();
      expect(result).toEqual(Either.Left('first'));
    });

    it('first Cancelled wins', async () => {
      const slow = CancellableEitherAsync.fromAbortable(
        () => new Promise<number>((r) => setTimeout(() => r(100), 50)),
        () => 'err'
      );
      const result = await CancellableEitherAsync.race([CancellableEitherAsync.cancelled('first'), slow]).run();
      expect(result.tag).toBe('Cancelled');
    });

    it('empty array → Cancelled', async () => {
      const result = await CancellableEitherAsync.race([]).run();
      expect(result.tag).toBe('Cancelled');
    });

    it('losers see an aborted signal', async () => {
      const seenAborts: boolean[] = [];
      const loser = CancellableEitherAsync.fromAbortable(
        (signal) =>
          new Promise<number>((resolve) => {
            signal.addEventListener('abort', () => {
              seenAborts.push(true);
              resolve(0);
            });
          }),
        () => 'err'
      );
      const winner = CancellableEitherAsync.of(1);
      await CancellableEitherAsync.race([winner, loser]).run();
      await new Promise((r) => setTimeout(r, 0));
      expect(seenAborts).toContain(true);
    });
  });

  describe('onCancel', () => {
    it('fires when external signal aborts', async () => {
      const handler = vi.fn();
      const cea = CancellableEitherAsync.fromAbortable(
        (signal) =>
          new Promise<number>((_, reject) => {
            signal.addEventListener('abort', () => {
              const e = new Error('aborted');
              e.name = 'AbortError';
              reject(e);
            });
          }),
        () => 'err'
      );
      const ctrl = new AbortController();
      const promise = CancellableEitherAsync.onCancel(handler)(cea).run(ctrl.signal);
      ctrl.abort('user');
      await promise;
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('fires when upstream produces Cancelled (key §6.3 option-b contract)', async () => {
      const handler = vi.fn();
      const result = await CancellableEitherAsync.onCancel(handler)(CancellableEitherAsync.cancelled('upstream')).run();
      expect(handler).toHaveBeenCalledWith('upstream');
      expect(result.tag).toBe('Cancelled');
    });

    it('does not fire on Right', async () => {
      const handler = vi.fn();
      await CancellableEitherAsync.onCancel(handler)(CancellableEitherAsync.of(1)).run();
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire on Left', async () => {
      const handler = vi.fn();
      await CancellableEitherAsync.onCancel(handler)(CancellableEitherAsync.left('e')).run();
      expect(handler).not.toHaveBeenCalled();
    });

    it('a throwing handler does not bubble up', async () => {
      const handler = () => {
        throw new Error('handler boom');
      };
      const result = await CancellableEitherAsync.onCancel(handler)(CancellableEitherAsync.cancelled('x')).run();
      expect(result.tag).toBe('Cancelled');
    });
  });

  describe('fromEitherAsync and toEitherAsync', () => {
    it('fromEitherAsync lifts EitherAsync; signal ignored', async () => {
      const ea = EitherAsync.of(42);
      const cea = CancellableEitherAsync.fromEitherAsync(ea);
      const result = await cea.run(abortedSignal());
      expect(result).toEqual(Either.Right(42));
    });

    it('toEitherAsync collapses Cancelled into Left', async () => {
      const cea = CancellableEitherAsync.cancelled('user');
      const ea = CancellableEitherAsync.toEitherAsync(cea, (r) => `cancelled: ${String(r)}`);
      const result = await ea.run();
      expect(result).toEqual(Either.Left('cancelled: user'));
    });

    it('toEitherAsync passes Right through', async () => {
      const ea = CancellableEitherAsync.toEitherAsync(CancellableEitherAsync.of(7), () => 'never');
      const result = await ea.run();
      expect(result).toEqual(Either.Right(7));
    });

    it('toEitherAsync passes Left through', async () => {
      const ea = CancellableEitherAsync.toEitherAsync(CancellableEitherAsync.left('e'), () => 'never');
      const result = await ea.run();
      expect(result).toEqual(Either.Left('e'));
    });
  });

  describe('fold', () => {
    it('calls onRight for Right', async () => {
      const result = await CancellableEitherAsync.fold(
        (_l: string) => Promise.resolve('L'),
        (r: number) => Promise.resolve(`R:${r}`),
        (_c: unknown) => Promise.resolve('C')
      )(CancellableEitherAsync.of(5))();
      expect(result).toBe('R:5');
    });

    it('calls onLeft for Left', async () => {
      const result = await CancellableEitherAsync.fold(
        (l: string) => Promise.resolve(`L:${l}`),
        (_r: number) => Promise.resolve('R'),
        (_c: unknown) => Promise.resolve('C')
      )(CancellableEitherAsync.left('e'))();
      expect(result).toBe('L:e');
    });

    it('calls onCancelled for Cancelled', async () => {
      const result = await CancellableEitherAsync.fold(
        (_l: string) => Promise.resolve('L'),
        (_r: number) => Promise.resolve('R'),
        (c: unknown) => Promise.resolve(`C:${String(c)}`)
      )(CancellableEitherAsync.cancelled('x'))();
      expect(result).toBe('C:x');
    });

    it('forwards signal to the wrapped computation', async () => {
      const seen: AbortSignal[] = [];
      const cea = CancellableEitherAsync.fromAbortable(
        async (signal) => {
          seen.push(signal);
          return 1;
        },
        () => 'err'
      );
      const ctrl = new AbortController();
      await CancellableEitherAsync.fold<string, number, string>(
        (_) => Promise.resolve('L'),
        (_) => Promise.resolve('R'),
        (_) => Promise.resolve('C')
      )(cea)(ctrl.signal);
      expect(seen).toHaveLength(1);
    });
  });

  describe('all', () => {
    it('all Right → Right of array', async () => {
      const result = await CancellableEitherAsync.all([CancellableEitherAsync.of(1), CancellableEitherAsync.of(2), CancellableEitherAsync.of(3)]).run();
      expect(result).toEqual(Either.Right([1, 2, 3]));
    });

    it('first Left wins', async () => {
      const result = await CancellableEitherAsync.all([CancellableEitherAsync.of(1), CancellableEitherAsync.left('boom'), CancellableEitherAsync.of(3)]).run();
      expect(result).toEqual(Either.Left('boom'));
    });

    it('first Cancelled wins', async () => {
      const result = await CancellableEitherAsync.all([CancellableEitherAsync.of(1), CancellableEitherAsync.cancelled('x'), CancellableEitherAsync.of(3)]).run();
      expect(result.tag).toBe('Cancelled');
    });

    it('external abort during all → Cancelled', async () => {
      const ctrl = new AbortController();
      const cea = CancellableEitherAsync.fromAbortable(
        (signal) =>
          new Promise<number>((_, reject) => {
            signal.addEventListener('abort', () => {
              const e = new Error('aborted');
              e.name = 'AbortError';
              reject(e);
            });
          }),
        () => 'err'
      );
      const promise = CancellableEitherAsync.all([cea]).run(ctrl.signal);
      ctrl.abort('outer');
      const result = await promise;
      expect(result.tag).toBe('Cancelled');
    });
  });

  describe('CRITICAL: run() never rejects', () => {
    it('a pipeline whose lifts throw or reject still resolves cleanly', async () => {
      const pipeline = CancellableEitherAsync.chain((n: number) =>
        CancellableEitherAsync.chain((_m: number) =>
          CancellableEitherAsync.tryCatch(
            async () => {
              throw new Error('inner');
            },
            () => 'mapped'
          )
        )(CancellableEitherAsync.of(n + 1))
      )(CancellableEitherAsync.fromPromise(Promise.reject(new Error('outer')), () => 'outerMapped'));
      await expect(pipeline.run()).resolves.toBeDefined();
    });
  });
});
