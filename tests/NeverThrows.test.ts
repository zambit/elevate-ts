// Locks down the exception contract of the async monads.
//
// - MaybeAsync never rejects: a throw or rejection anywhere becomes Nothing.
// - EitherAsync / ReaderEitherAsync / CancellableEitherAsync capture throws only
//   where the caller supplies an error mapper (tryCatch, fromPromise, tryMap,
//   tryChain). A throw inside a plain map/chain callback is a caller bug and
//   rejects run(); those tests pin that documented behavior so it cannot drift.

import { describe, it, expect } from 'vitest';

import * as CEA from '../src/CancellableEitherAsync.js';
import { Left, Right } from '../src/Either.js';
import * as EA from '../src/EitherAsync.js';
import { memoize } from '../src/Function.js';
import { Just, Nothing } from '../src/Maybe.js';
import * as MA from '../src/MaybeAsync.js';
import * as REA from '../src/ReaderEitherAsync.js';

const boom = (): never => {
  throw new Error('boom');
};

const toMessage = (e: unknown): string => (e as Error).message;

describe('MaybeAsync never rejects', () => {
  it('the constructor turns a rejecting computation into Nothing', async () => {
    await expect(MA.MaybeAsync(() => Promise.reject(new Error('x'))).run()).resolves.toEqual(Nothing);
  });

  it('the constructor turns a synchronously throwing computation into Nothing', async () => {
    await expect(MA.MaybeAsync(boom).run()).resolves.toEqual(Nothing);
  });

  it('map: a throwing f becomes Nothing', async () => {
    await expect(MA.map(boom)(MA.of(1)).run()).resolves.toEqual(Nothing);
  });

  it('chain: a throwing f becomes Nothing', async () => {
    await expect(MA.chain(boom)(MA.of(1)).run()).resolves.toEqual(Nothing);
  });

  it('chain: an inner computation that rejects becomes Nothing', async () => {
    const inner = { tag: 'MaybeAsync', run: () => Promise.reject(new Error('inner')) } as MA.MaybeAsync<number>;
    await expect(MA.chain(() => inner)(MA.of(1)).run()).resolves.toEqual(Nothing);
  });

  it('filter: a throwing predicate becomes Nothing', async () => {
    await expect(MA.filter(boom)(MA.of(1)).run()).resolves.toEqual(Nothing);
  });

  it('ap: a throwing function becomes Nothing', async () => {
    await expect(MA.ap(MA.of(boom))(MA.of(1)).run()).resolves.toEqual(Nothing);
  });

  it('alt: an alternative that rejects becomes Nothing', async () => {
    const rejecting = { tag: 'MaybeAsync', run: () => Promise.reject(new Error('alt')) } as MA.MaybeAsync<number>;
    await expect(MA.alt(rejecting)(MA.nothing<number>()).run()).resolves.toEqual(Nothing);
  });

  it('all: one rejecting member makes the whole result Nothing', async () => {
    const rejecting = { tag: 'MaybeAsync', run: () => Promise.reject(new Error('member')) } as MA.MaybeAsync<number>;
    await expect(MA.all([MA.of(1), rejecting]).run()).resolves.toEqual(Nothing);
  });

  it('operators wrapping a hand-built rejecting value still resolve', async () => {
    const handBuilt = { tag: 'MaybeAsync', run: () => Promise.reject(new Error('hand')) } as MA.MaybeAsync<number>;
    await expect(MA.map((n: number) => n + 1)(handBuilt).run()).resolves.toEqual(Nothing);
  });

  it('toEitherAsync: a throw upstream becomes Left(onNothing)', async () => {
    await expect(MA.toEitherAsync('none')(MA.map(boom)(MA.of(1))).run()).resolves.toEqual(Left('none'));
  });

  it('successful pipelines are unchanged', async () => {
    await expect(MA.chain((n: number) => MA.of(n * 2))(MA.map((n: number) => n + 1)(MA.of(1))).run()).resolves.toEqual(Just(4));
  });
});

describe('EitherAsync', () => {
  it('map: a throwing f rejects run() (documented caller bug)', async () => {
    await expect(EA.map(boom)(EA.of(1)).run()).rejects.toThrow('boom');
  });

  it('chain: a throwing f rejects run() (documented caller bug)', async () => {
    await expect(EA.chain(boom)(EA.of(1)).run()).rejects.toThrow('boom');
  });

  it('toMaybeAsync: a rejecting source becomes Nothing', async () => {
    await expect(EA.toMaybeAsync(EA.map(boom)(EA.of(1))).run()).resolves.toEqual(Nothing);
  });

  describe('tryMap', () => {
    it('maps Right values', async () => {
      await expect(EA.tryMap((n: number) => n + 1, toMessage)(EA.of(1)).run()).resolves.toEqual(Right(2));
    });

    it('turns a throw in f into Left via onError', async () => {
      await expect(EA.tryMap(boom, toMessage)(EA.of(1)).run()).resolves.toEqual(Left('boom'));
    });

    it('passes Left through without calling f', async () => {
      let called = false;
      const f = (n: number): number => ((called = true), n);
      await expect(EA.tryMap(f, toMessage)(EA.left('e')).run()).resolves.toEqual(Left('e'));
      expect(called).toBe(false);
    });
  });

  describe('tryChain', () => {
    it('chains Right values', async () => {
      await expect(EA.tryChain((n: number) => EA.of(n + 1), toMessage)(EA.of(1)).run()).resolves.toEqual(Right(2));
    });

    it('turns a synchronous throw in f into Left via onError', async () => {
      await expect(EA.tryChain(boom, toMessage)(EA.of(1)).run()).resolves.toEqual(Left('boom'));
    });

    it('turns a rejecting inner computation into Left via onError', async () => {
      const inner = EA.map(boom)(EA.of(1));
      await expect(EA.tryChain(() => inner, toMessage)(EA.of(1)).run()).resolves.toEqual(Left('boom'));
    });

    it('keeps an inner Left as-is', async () => {
      await expect(EA.tryChain(() => EA.left('inner'), toMessage)(EA.of(1)).run()).resolves.toEqual(Left('inner'));
    });

    it('passes Left through without calling f', async () => {
      await expect(EA.tryChain(boom, toMessage)(EA.left('e')).run()).resolves.toEqual(Left('e'));
    });
  });
});

describe('ReaderEitherAsync', () => {
  const env = { base: 10 };

  it('map: a throwing f rejects run() (documented caller bug)', async () => {
    await expect(REA.map(boom)(REA.of(1)).run(env)).rejects.toThrow('boom');
  });

  describe('tryMap', () => {
    it('maps Right values', async () => {
      await expect(REA.tryMap((n: number) => n + 1, toMessage)(REA.of(1)).run(env)).resolves.toEqual(Right(2));
    });

    it('turns a throw in f into Left via onError', async () => {
      await expect(REA.tryMap(boom, toMessage)(REA.of(1)).run(env)).resolves.toEqual(Left('boom'));
    });

    it('passes Left through', async () => {
      await expect(REA.tryMap(boom, toMessage)(REA.left('e')).run(env)).resolves.toEqual(Left('e'));
    });
  });

  describe('tryChain', () => {
    it('chains Right values with access to the env', async () => {
      const f = (n: number): REA.ReaderEitherAsync<typeof env, string, number> => REA.asks((e: typeof env) => e.base + n);
      await expect(REA.tryChain(f, toMessage)(REA.of(1)).run(env)).resolves.toEqual(Right(11));
    });

    it('turns a synchronous throw in f into Left via onError', async () => {
      await expect(REA.tryChain(boom, toMessage)(REA.of(1)).run(env)).resolves.toEqual(Left('boom'));
    });

    it('turns a rejecting inner computation into Left via onError', async () => {
      const inner = REA.map(boom)(REA.of(1));
      await expect(REA.tryChain(() => inner, toMessage)(REA.of(1)).run(env)).resolves.toEqual(Left('boom'));
    });

    it('passes Left through', async () => {
      await expect(REA.tryChain(boom, toMessage)(REA.left('e')).run(env)).resolves.toEqual(Left('e'));
    });
  });
});

describe('CancellableEitherAsync', () => {
  it('map: a throwing f rejects run() (documented caller bug)', async () => {
    await expect(CEA.map(boom)(CEA.of(1)).run()).rejects.toThrow('boom');
  });

  describe('tryMap', () => {
    it('maps Right values', async () => {
      await expect(CEA.tryMap((n: number) => n + 1, toMessage)(CEA.of(1)).run()).resolves.toEqual(Right(2));
    });

    it('turns a throw in f into Left via onError', async () => {
      await expect(CEA.tryMap(boom, toMessage)(CEA.of(1)).run()).resolves.toEqual(Left('boom'));
    });

    it('passes Cancelled through without calling f', async () => {
      await expect(CEA.tryMap(boom, toMessage)(CEA.cancelled('stop')).run()).resolves.toEqual(CEA.Cancelled('stop'));
    });
  });

  describe('tryChain', () => {
    it('chains Right values', async () => {
      await expect(CEA.tryChain((n: number) => CEA.of(n + 1), toMessage)(CEA.of(1)).run()).resolves.toEqual(Right(2));
    });

    it('turns a synchronous throw in f into Left via onError', async () => {
      await expect(CEA.tryChain(boom, toMessage)(CEA.of(1)).run()).resolves.toEqual(Left('boom'));
    });

    it('turns a rejecting inner computation into Left via onError', async () => {
      const inner = CEA.map(boom)(CEA.of(1));
      await expect(CEA.tryChain(() => inner, toMessage)(CEA.of(1)).run()).resolves.toEqual(Left('boom'));
    });

    it('turns an AbortError thrown in f into Cancelled', async () => {
      const abort = (): never => {
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      };
      const result = await CEA.tryChain(abort, toMessage)(CEA.of(1)).run();
      expect(result.tag).toBe('Cancelled');
    });

    it('forwards the signal to the inner computation', async () => {
      const controller = new AbortController();
      let seen: AbortSignal | undefined;
      const inner = CEA.CancellableEitherAsync((signal) => ((seen = signal), Promise.resolve(Right(2))));
      await CEA.tryChain(() => inner, toMessage)(CEA.of(1)).run(controller.signal);
      expect(seen).toBe(controller.signal);
    });

    it('passes Left and Cancelled through', async () => {
      await expect(CEA.tryChain(boom, toMessage)(CEA.left('e')).run()).resolves.toEqual(Left('e'));
      await expect(CEA.tryChain(boom, toMessage)(CEA.cancelled('stop')).run()).resolves.toEqual(CEA.Cancelled('stop'));
    });
  });
});

describe('Function.memoize', () => {
  it('caches undefined results instead of recomputing', () => {
    let calls = 0;
    const f = memoize((_n: number): undefined => {
      calls++;
      return undefined;
    });
    f(1);
    f(1);
    f(1);
    expect(calls).toBe(1);
  });

  it('still caches per argument', () => {
    let calls = 0;
    const f = memoize((n: number): number => (calls++, n * 2));
    expect([f(1), f(2), f(1)]).toEqual([2, 4, 2]);
    expect(calls).toBe(2);
  });
});
