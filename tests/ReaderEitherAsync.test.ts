import { describe, it, expect } from 'vitest';
import * as Either from '../src/Either.js';
import * as EitherAsync from '../src/EitherAsync.js';
import * as Reader from '../src/Reader.js';
import * as ReaderEitherAsync from '../src/ReaderEitherAsync.js';

type Env = { readonly multiplier: number; readonly label: string };
const env: Env = { multiplier: 2, label: 'test' };

describe('ReaderEitherAsync', () => {
  describe('construction and execution', () => {
    it('ReaderEitherAsync constructs a lazy computation that does not run until invoked', async () => {
      let executed = false;
      const rea = ReaderEitherAsync.ReaderEitherAsync<Env, string, number>(async (e) => {
        executed = true;
        return Either.Right(e.multiplier);
      });
      expect(executed).toBe(false);
      const result = await rea.run(env);
      expect(executed).toBe(true);
      expect(result).toEqual(Either.Right(2));
    });
  });

  describe('lifts: of, right, left', () => {
    it('of lifts a value into Right and ignores the env', async () => {
      const rea = ReaderEitherAsync.of(42);
      const result = await rea.run(env);
      expect(result).toEqual(Either.Right(42));
    });

    it('right is an alias for of', async () => {
      const rea = ReaderEitherAsync.right(99);
      expect(await rea.run(env)).toEqual(Either.Right(99));
    });

    it('left lifts an error into Left', async () => {
      const rea = ReaderEitherAsync.left('oops');
      expect(await rea.run(env)).toEqual(Either.Left('oops'));
    });
  });

  describe('liftEither / liftEitherAsync / liftReader', () => {
    it('liftEither wraps a sync Right', async () => {
      const rea = ReaderEitherAsync.liftEither(Either.Right(7));
      expect(await rea.run(env)).toEqual(Either.Right(7));
    });

    it('liftEither wraps a sync Left', async () => {
      const rea = ReaderEitherAsync.liftEither(Either.Left('boom'));
      expect(await rea.run(env)).toEqual(Either.Left('boom'));
    });

    it('liftEitherAsync round-trips a Right', async () => {
      const rea = ReaderEitherAsync.liftEitherAsync(EitherAsync.of(11));
      expect(await rea.run(env)).toEqual(Either.Right(11));
    });

    it('liftEitherAsync round-trips a Left', async () => {
      const rea = ReaderEitherAsync.liftEitherAsync(EitherAsync.left('async-fail'));
      expect(await rea.run(env)).toEqual(Either.Left('async-fail'));
    });

    it('liftReader runs the Reader against env and wraps in Right', async () => {
      const reader = Reader.Reader<Env, string>((e) => `hello ${e.label}`);
      const rea = ReaderEitherAsync.liftReader(reader);
      expect(await rea.run(env)).toEqual(Either.Right('hello test'));
    });
  });

  describe('fromPromise / tryCatch', () => {
    it('fromPromise resolves to Right when promise succeeds', async () => {
      const rea = ReaderEitherAsync.fromPromise<Env, string, number>(
        async (e) => e.multiplier * 10,
        () => 'err'
      );
      expect(await rea.run(env)).toEqual(Either.Right(20));
    });

    it('fromPromise turns rejection into Left via onError', async () => {
      const rea = ReaderEitherAsync.fromPromise<Env, string, number>(
        () => Promise.reject(new Error('boom')),
        (e) => `caught: ${(e as Error).message}`
      );
      expect(await rea.run(env)).toEqual(Either.Left('caught: boom'));
    });

    it('tryCatch catches synchronous exceptions thrown before the promise', async () => {
      const rea = ReaderEitherAsync.tryCatch<Env, string, number>(
        () => {
          throw new Error('sync throw');
        },
        (e) => `caught: ${(e as Error).message}`
      );
      expect(await rea.run(env)).toEqual(Either.Left('caught: sync throw'));
    });

    it('tryCatch resolves to Right when async function succeeds', async () => {
      const rea = ReaderEitherAsync.tryCatch<Env, string, string>(
        async (e) => e.label.toUpperCase(),
        () => 'err'
      );
      expect(await rea.run(env)).toEqual(Either.Right('TEST'));
    });
  });

  describe('Reader operations: ask, asks, asksEither, asksEitherAsync, local, provide', () => {
    it('ask returns the env as Right', async () => {
      const rea = ReaderEitherAsync.ask<Env>();
      expect(await rea.run(env)).toEqual(Either.Right(env));
    });

    it('asks transforms env and returns Right', async () => {
      const rea = ReaderEitherAsync.asks<Env, number>((e) => e.multiplier + 1);
      expect(await rea.run(env)).toEqual(Either.Right(3));
    });

    it('asksEither lifts an env-aware Either', async () => {
      const rea = ReaderEitherAsync.asksEither<Env, string, number>((e) => (e.multiplier > 0 ? Either.Right(e.multiplier) : Either.Left('non-positive')));
      expect(await rea.run(env)).toEqual(Either.Right(2));
    });

    it('asksEither propagates Left from the env-aware function', async () => {
      const rea = ReaderEitherAsync.asksEither<Env, string, number>(() => Either.Left('forced'));
      expect(await rea.run(env)).toEqual(Either.Left('forced'));
    });

    it('asksEitherAsync lifts an env-aware EitherAsync', async () => {
      const rea = ReaderEitherAsync.asksEitherAsync<Env, string, string>((e) => EitherAsync.of(`${e.label}!`));
      expect(await rea.run(env)).toEqual(Either.Right('test!'));
    });

    it('local modifies the env for a sub-computation', async () => {
      const rea = ReaderEitherAsync.asks<Env, number>((e) => e.multiplier);
      const localized = ReaderEitherAsync.local<Env>((e) => ({ ...e, multiplier: 100 }))(rea);
      expect(await localized.run(env)).toEqual(Either.Right(100));
      expect(env.multiplier).toBe(2);
    });

    it('provide partially applies the env, returning a plain EitherAsync', async () => {
      const rea = ReaderEitherAsync.asks<Env, string>((e) => e.label);
      const ea = ReaderEitherAsync.provide(env)(rea);
      const result = await ea.run();
      expect(result).toEqual(Either.Right('test'));
    });
  });

  describe('functor / bifunctor: map, mapLeft, bimap', () => {
    it('map transforms Right value', async () => {
      const rea = ReaderEitherAsync.asks<Env, number>((e) => e.multiplier);
      const mapped = ReaderEitherAsync.map<number, number>((n) => n * 5)(rea);
      expect(await mapped.run(env)).toEqual(Either.Right(10));
    });

    it('map preserves Left', async () => {
      const rea = ReaderEitherAsync.left<string>('err');
      const mapped = ReaderEitherAsync.map<number, number>((n) => n * 5)(rea);
      expect(await mapped.run(env)).toEqual(Either.Left('err'));
    });

    it('mapLeft transforms Left value', async () => {
      const rea = ReaderEitherAsync.left<string>('err');
      const mapped = ReaderEitherAsync.mapLeft<string, number>((s) => s.length)(rea);
      expect(await mapped.run(env)).toEqual(Either.Left(3));
    });

    it('mapLeft preserves Right', async () => {
      const rea = ReaderEitherAsync.of(42);
      const mapped = ReaderEitherAsync.mapLeft<string, number>((s) => s.length)(rea);
      expect(await mapped.run(env)).toEqual(Either.Right(42));
    });

    it('bimap transforms both branches', async () => {
      const reaR = ReaderEitherAsync.of<number>(7);
      const mappedR = ReaderEitherAsync.bimap<string, number, number, string>(
        (s) => s.length,
        (n) => `n=${n}`
      )(reaR);
      expect(await mappedR.run(env)).toEqual(Either.Right('n=7'));

      const reaL = ReaderEitherAsync.left<string>('err');
      const mappedL = ReaderEitherAsync.bimap<string, number, number, string>(
        (s) => s.length,
        (n) => `n=${n}`
      )(reaL);
      expect(await mappedL.run(env)).toEqual(Either.Left(3));
    });
  });

  describe('monad: chain, chainLeft', () => {
    it('chain sequences computations sharing the same env', async () => {
      const step1 = ReaderEitherAsync.asks<Env, number>((e) => e.multiplier);
      const chained = ReaderEitherAsync.chain<Env, string, number, string>((n) => ReaderEitherAsync.asks<Env, string>((e) => `${e.label}=${n * 10}`))(step1);
      expect(await chained.run(env)).toEqual(Either.Right('test=20'));
    });

    it('chain short-circuits on Left without running the continuation', async () => {
      let called = false;
      const start = ReaderEitherAsync.left<string>('stop');
      const chained = ReaderEitherAsync.chain<Env, string, never, number>((n) => {
        called = true;
        return ReaderEitherAsync.of(n);
      })(start);
      expect(await chained.run(env)).toEqual(Either.Left('stop'));
      expect(called).toBe(false);
    });

    it('chainLeft recovers from Left', async () => {
      const start = ReaderEitherAsync.left<string>('boom');
      const recovered = ReaderEitherAsync.chainLeft<Env, string, never, number>((err) => ReaderEitherAsync.of(err.length))(start);
      expect(await recovered.run(env)).toEqual(Either.Right(4));
    });

    it('chainLeft passes through Right unchanged', async () => {
      const start = ReaderEitherAsync.of<number>(42);
      const recovered = ReaderEitherAsync.chainLeft<Env, string, never, number>(() => ReaderEitherAsync.of(0))(start);
      expect(await recovered.run(env)).toEqual(Either.Right(42));
    });
  });

  describe('applicative: ap', () => {
    it('ap applies a wrapped function to a wrapped value', async () => {
      const ref = ReaderEitherAsync.of<(n: number) => number>((n) => n + 1);
      const rea = ReaderEitherAsync.of<number>(5);
      const applied = ReaderEitherAsync.ap<Env, never, number, number>(ref)(rea);
      expect(await applied.run(env)).toEqual(Either.Right(6));
    });

    it('ap propagates Left from the function side', async () => {
      const ref = ReaderEitherAsync.left<string>('fn-err') as unknown as ReaderEitherAsync.ReaderEitherAsync<Env, string, (n: number) => number>;
      const rea = ReaderEitherAsync.of<number>(5);
      const applied = ReaderEitherAsync.ap<Env, string, number, number>(ref)(rea);
      expect(await applied.run(env)).toEqual(Either.Left('fn-err'));
    });

    it('ap propagates Left from the value side', async () => {
      const ref = ReaderEitherAsync.of<(n: number) => number>((n) => n + 1);
      const rea = ReaderEitherAsync.left<string>('val-err') as unknown as ReaderEitherAsync.ReaderEitherAsync<Env, string, number>;
      const applied = ReaderEitherAsync.ap<Env, string, number, number>(ref)(rea);
      expect(await applied.run(env)).toEqual(Either.Left('val-err'));
    });
  });

  describe('extraction: runReaderEitherAsync, getOrElse, fold', () => {
    it('runReaderEitherAsync runs with the supplied env', async () => {
      const rea = ReaderEitherAsync.asks<Env, number>((e) => e.multiplier);
      const result = await ReaderEitherAsync.runReaderEitherAsync(env)(rea);
      expect(result).toEqual(Either.Right(2));
    });

    it('getOrElse returns the Right value', async () => {
      const rea = ReaderEitherAsync.of(99);
      const value = await ReaderEitherAsync.getOrElse(0)(rea)(env);
      expect(value).toBe(99);
    });

    it('getOrElse returns the default on Left', async () => {
      const rea = ReaderEitherAsync.left<string>('err');
      const value = await ReaderEitherAsync.getOrElse(0)(rea)(env);
      expect(value).toBe(0);
    });

    it('fold maps Right via onRight', async () => {
      const rea = ReaderEitherAsync.of<number>(5);
      const value = await ReaderEitherAsync.fold<string, number, string>(
        async (l) => `L:${l}`,
        async (r) => `R:${r}`
      )(rea)(env);
      expect(value).toBe('R:5');
    });

    it('fold maps Left via onLeft', async () => {
      const rea = ReaderEitherAsync.left<string>('boom');
      const value = await ReaderEitherAsync.fold<string, number, string>(
        async (l) => `L:${l}`,
        async (r) => `R:${r}`
      )(rea)(env);
      expect(value).toBe('L:boom');
    });
  });

  describe('all', () => {
    it('all collects all Rights into an array', async () => {
      const reas = [1, 2, 3].map((n) => ReaderEitherAsync.of(n));
      const result = await ReaderEitherAsync.all(reas).run(env);
      expect(result).toEqual(Either.Right([1, 2, 3]));
    });

    it('all returns the first Left when any fails', async () => {
      const reas = [
        ReaderEitherAsync.of<number>(1),
        ReaderEitherAsync.left<string>('mid-fail') as unknown as ReaderEitherAsync.ReaderEitherAsync<Env, string, number>,
        ReaderEitherAsync.of<number>(3)
      ];
      const result = await ReaderEitherAsync.all<Env, string, number>(reas).run(env);
      expect(result).toEqual(Either.Left('mid-fail'));
    });

    it('all returns Right([]) for empty input', async () => {
      const result = await ReaderEitherAsync.all<Env, string, number>([]).run(env);
      expect(result).toEqual(Either.Right([]));
    });
  });
});
