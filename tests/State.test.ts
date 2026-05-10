import { describe, it, expect } from 'vitest';
import { State, get, put, modify, gets, map, ap, chain, runState, evalState, execState } from '../src/State.js';

describe('State', () => {
  describe('construction and execution', () => {
    it('State constructs a State from a function', () => {
      const s = State((n: number) => [n * 2, n + 1]);
      expect(s.tag).toBe('State');
      expect(typeof s.run).toBe('function');
    });

    it('runState executes a State with initial state', () => {
      const s = State((n: number) => [n * 2, n + 1]);
      const result = runState(5)(s);
      expect(result).toEqual([10, 6]);
    });
  });

  describe('get', () => {
    it('get retrieves the current state', () => {
      const result = runState(42)(get());
      expect(result).toEqual([42, 42]);
    });

    it('get preserves state', () => {
      const result = runState({ x: 10, y: 20 })(get());
      expect(result[0]).toEqual({ x: 10, y: 20 });
      expect(result[1]).toEqual({ x: 10, y: 20 });
    });
  });

  describe('put', () => {
    it('put replaces the state', () => {
      const result = runState(5)(put(42));
      expect(result).toEqual([undefined, 42]);
    });

    it('put returns undefined as value', () => {
      const result = runState('old')(put('new'));
      expect(result[0]).toBeUndefined();
      expect(result[1]).toBe('new');
    });
  });

  describe('modify', () => {
    it('modify transforms the state', () => {
      const result = runState(5)(modify((n) => n * 2));
      expect(result).toEqual([undefined, 10]);
    });

    it('modify returns undefined as value', () => {
      const result = runState(5)(modify((n) => n + 1));
      expect(result[0]).toBeUndefined();
      expect(result[1]).toBe(6);
    });
  });

  describe('gets', () => {
    it('gets transforms the state and returns result', () => {
      const result = runState(5)(gets((n) => n * 2));
      expect(result).toEqual([10, 5]);
    });

    it('gets does not modify state', () => {
      const result = runState(5)(gets((n) => n + 100));
      expect(result[0]).toBe(105);
      expect(result[1]).toBe(5);
    });
  });

  describe('functor laws', () => {
    it('identity: map(id)(s) = s', () => {
      const id = <A>(a: A) => a;
      const s = State((n: number) => [n * 2, n + 1]);
      const [lhs] = runState(5)(map(id)(s));
      const [rhs] = runState(5)(s);
      expect(lhs).toBe(rhs);
    });

    it('composition: map(g ∘ f) = map(g) ∘ map(f)', () => {
      const f = (x: number) => x + 1;
      const g = (x: number) => x * 2;
      const s = State((n: number) => [n, n]);

      const [lhs] = runState(5)(map((x) => g(f(x)))(s));
      const [rhs] = runState(5)(map(g)(map(f)(s)));
      expect(lhs).toBe(rhs);
    });
  });

  describe('applicative ap', () => {
    it('ap applies a State function to a State value', () => {
      const sf = State((n: number) => [(x: number) => x * n, n + 1]);
      const sa = State((n: number) => [n, n + 2]);
      const [value, state] = runState(5)(ap(sf)(sa));
      expect(value).toBe(30); // (5 + 2) * (5 + 1)
      expect(state).toBe(8); // (5 + 1) + 2
    });

    it('ap threads state through function and value', () => {
      const sf = State((n: number) => [(x: number) => x + n, n * 2]);
      const sa = State((n: number) => [10, n + 5]);
      const [value, state] = runState(3)(ap(sf)(sa));
      expect(value).toBe(13); // 10 + 3
      expect(state).toBe(11); // 6 + 5
    });
  });

  describe('monad laws', () => {
    it('left identity: chain(f)(State(a)) = f(a)', () => {
      const a = 5;
      const f = (x: number) => State((n: number) => [x + n, n]);
      const env = 10;

      const lhs = runState(env)(chain(f)(State(() => [a, env])));
      const rhs = runState(env)(f(a));
      expect(lhs).toEqual(rhs);
    });

    it('right identity: chain(pure)(s) = s', () => {
      const s = State((n: number) => [n * 2, n + 1]);
      const env = 5;
      const pure = <S, A>(a: A): State<S, A> => State((s) => [a, s]);

      const lhs = runState(env)(chain(pure)(s));
      const rhs = runState(env)(s);
      expect(lhs).toEqual(rhs);
    });

    it('associativity: chain(g)(chain(f)(s)) = chain(x => chain(g)(f(x)))(s)', () => {
      const s = State((n: number) => [n, n]);
      const f = (x: number) => State((n: number) => [x + n, n + 1]);
      const g = (x: number) => State((n: number) => [x * 2, n]);
      const env = 5;

      const lhs = runState(env)(chain(g)(chain(f)(s)));
      const rhs = runState(env)(chain((x) => chain(g)(f(x)))(s));
      expect(lhs).toEqual(rhs);
    });
  });

  describe('chain', () => {
    it('chain sequences State computations', () => {
      const s1 = State((n: number) => [n * 2, n + 1]);
      const f = (x: number) => State((n: number) => [x + n, n + 2]);
      const [value, state] = runState(5)(chain(f)(s1));
      expect(value).toBe(16); // (5 * 2) + (5 + 1)
      expect(state).toBe(8); // (5 + 1) + 2
    });

    it('chain threads state through multiple operations', () => {
      const s1 = get<number>();
      const s2 = chain((n) => modify((x) => x + n))(s1);
      const [, state] = runState(5)(s2);
      expect(state).toBe(10);
    });
  });

  describe('evalState', () => {
    it('evalState extracts only the value', () => {
      const s = State((n: number) => [n * 2, n + 100]);
      const value = evalState(5)(s);
      expect(value).toBe(10);
    });

    it('evalState ignores final state', () => {
      const s = State((n: number) => ['result', 999]);
      const value = evalState(1)(s);
      expect(value).toBe('result');
    });
  });

  describe('execState', () => {
    it('execState extracts only the final state', () => {
      const s = State((n: number) => [n * 2, n + 100]);
      const state = execState(5)(s);
      expect(state).toBe(105);
    });

    it('execState ignores the value', () => {
      const s = State((n: number) => ['ignored', 42]);
      const state = execState(1)(s);
      expect(state).toBe(42);
    });
  });

  describe('immutability', () => {
    it('State does not mutate the state', () => {
      const original = { count: 5 };
      const s = modify((obj) => ({ ...obj, count: obj.count + 1 }));
      const [, final] = runState(original)(s);

      expect(original.count).toBe(5); // original unchanged
      expect(final.count).toBe(6); // new state created
      expect(original).not.toBe(final); // different objects
    });

    it('chaining preserves immutability', () => {
      const original = { x: 10, y: 20 };
      const s = chain((_) => modify((obj) => ({ ...obj, x: obj.x * 2 })))(get());
      const [, final] = runState(original)(s);

      expect(original.x).toBe(10);
      expect(final.x).toBe(20);
    });
  });

  describe('complex scenarios', () => {
    it('counter increment with get/modify', () => {
      const increment = chain((n) => modify((s) => s + 1))(get());
      const [, state1] = runState(0)(increment);
      expect(state1).toBe(1);

      const [, state2] = runState(state1)(increment);
      expect(state2).toBe(2);
    });

    it('stateful computation with multiple operations', () => {
      const computation = chain((initial) => chain((doubled) => chain(() => modify((s) => s + initial))(get()))(State(() => [initial * 2, initial])))(get());

      const [, finalState] = runState(5)(computation);
      expect(finalState).toBe(10); // (5 * 2) + 5
    });

    it('gets used to extract values during computation', () => {
      const computation = chain((n) => chain((x) => State(() => [x + n, n]))(gets((s) => s * 2)))(get());

      const [value, state] = runState(5)(computation);
      expect(value).toBe(15); // (5 * 2) + 5
      expect(state).toBe(5);
    });

    it('map and chain combined', () => {
      const s1 = get<number>();
      const s2 = map((n) => n * 2)(s1);
      const s3 = chain((doubled) => State(() => [doubled + 100, doubled]))(s2);

      const [value, state] = runState(5)(s3);
      expect(value).toBe(110); // (5 * 2) + 100
      expect(state).toBe(10); // 5 * 2
    });
  });

  describe('Fantasy Land conformance', () => {
    // Regression guard — see docs/PROTOTYPE_ISOLATION.md.
    it('does not pollute Object.prototype with fantasy-land methods', () => {
      State((s: number) => [s + 1, s] as const);
      const objectProtoKeys = Object.keys(Object.prototype);
      expect(objectProtoKeys).not.toContain('fantasy-land/map');
      expect(({} as Record<string, unknown>)['fantasy-land/map']).toBeUndefined();
    });

    it('State exposes fantasy-land/of on the constructor', () => {
      expect(typeof (State as unknown as Record<string, unknown>)['fantasy-land/of']).toBe('function');
    });

    it('State exposes fantasy-land/map via the prototype', () => {
      const s = State((n: number) => [n + 1, n] as const) as unknown as Record<string, (f: (n: number) => number) => State<number, number>>;
      expect(typeof s['fantasy-land/map']).toBe('function');
      const mapped = s['fantasy-land/map']((n) => n * 2);
      expect(mapped.run(3)).toEqual([8, 3]);
    });

    it('State exposes fantasy-land/chain via the prototype', () => {
      const s = State((n: number) => [n + 1, n + 1] as const);
      const proto = s as unknown as Record<string, (f: (n: number) => State<number, number>) => State<number, number>>;
      const chained = proto['fantasy-land/chain']((n) => State((s2: number) => [n + s2, s2] as const));
      expect(chained.run(0)).toEqual([2, 1]);
    });
  });
});
