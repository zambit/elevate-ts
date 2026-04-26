import { describe, it, expect, vi } from 'vitest';
import * as Audit from '../src/Audit.js';
import * as Maybe from '../src/Maybe.js';

describe('Audit', () => {
  describe('createSession', () => {
    it('creates a session with default config', () => {
      const session = Audit.createSession();
      expect(session.tag).toBe('AuditSession');
      expect(session.config.enabled).toBe(false);
      expect(session.config.captureInputs).toBe(true);
      expect(session.config.captureOutputs).toBe(true);
      expect(session.log.entries.length).toBe(0);
    });

    it('merges partial config with defaults', () => {
      const session = Audit.createSession({ enabled: true });
      expect(session.config.enabled).toBe(true);
      expect(session.config.captureInputs).toBe(true);
      expect(session.config.captureOutputs).toBe(true);
    });

    it('allows overriding multiple config options', () => {
      const session = Audit.createSession({
        enabled: true,
        captureInputs: false
      });
      expect(session.config.enabled).toBe(true);
      expect(session.config.captureInputs).toBe(false);
      expect(session.config.captureOutputs).toBe(true);
    });

    it('uses crypto.randomUUID as default ID generator', () => {
      const session = Audit.createSession();
      const id = session.config.generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('withEnabled', () => {
    it('enables audit tracking', () => {
      const session = Audit.createSession();
      const enabled = Audit.withEnabled(true)(session);
      expect(enabled.config.enabled).toBe(true);
      expect(session.config.enabled).toBe(false);
    });

    it('disables audit tracking', () => {
      const session = Audit.createSession({ enabled: true });
      const disabled = Audit.withEnabled(false)(session);
      expect(disabled.config.enabled).toBe(false);
    });

    it('returns new session without mutation', () => {
      const session = Audit.createSession();
      const modified = Audit.withEnabled(true)(session);
      expect(session).not.toBe(modified);
      expect(session.config.enabled).toBe(false);
    });
  });

  describe('withCaptureInputs', () => {
    it('enables input capture', () => {
      const session = Audit.createSession({ captureInputs: false });
      const captured = Audit.withCaptureInputs(true)(session);
      expect(captured.config.captureInputs).toBe(true);
    });

    it('disables input capture', () => {
      const session = Audit.createSession({ captureInputs: true });
      const uncaptured = Audit.withCaptureInputs(false)(session);
      expect(uncaptured.config.captureInputs).toBe(false);
    });
  });

  describe('withCaptureOutputs', () => {
    it('enables output capture', () => {
      const session = Audit.createSession({ captureOutputs: false });
      const captured = Audit.withCaptureOutputs(true)(session);
      expect(captured.config.captureOutputs).toBe(true);
    });

    it('disables output capture', () => {
      const session = Audit.createSession({ captureOutputs: true });
      const uncaptured = Audit.withCaptureOutputs(false)(session);
      expect(uncaptured.config.captureOutputs).toBe(false);
    });
  });

  describe('withGenerateId', () => {
    it('replaces ID generator', () => {
      const customId = () => 'custom-id-123';
      const session = Audit.createSession();
      const modified = Audit.withGenerateId(customId)(session);
      expect(modified.config.generateId).toBe(customId);
      expect(modified.config.generateId()).toBe('custom-id-123');
    });

    it('returns new session without mutation', () => {
      const customId = () => 'id';
      const session = Audit.createSession();
      const modified = Audit.withGenerateId(customId)(session);
      expect(session).not.toBe(modified);
      expect(session.config.generateId).not.toBe(customId);
    });
  });

  describe('record', () => {
    it('records an operation when enabled', () => {
      const session = Audit.createSession({ enabled: true });
      const updated = Audit.record('map')('Either')(5)(10)(session);
      expect(updated.log.entries.length).toBe(1);
      expect(updated.log.entries[0]!.operation).toBe('map');
      expect(updated.log.entries[0]!.monadType).toBe('Either');
    });

    it('is a no-op when disabled', () => {
      const session = Audit.createSession({ enabled: false });
      const updated = Audit.record('map')('Either')(5)(10)(session);
      expect(updated).toBe(session);
      expect(updated.log.entries.length).toBe(0);
    });

    it('captures inputs when enabled', () => {
      const session = Audit.createSession({
        enabled: true,
        captureInputs: true
      });
      const updated = Audit.record('map')('Either')(42)(84)(session);
      expect(updated.log.entries[0]!.input).toBe(42);
    });

    it('omits inputs when disabled', () => {
      const session = Audit.createSession({
        enabled: true,
        captureInputs: false
      });
      const updated = Audit.record('map')('Either')(42)(84)(session);
      expect(updated.log.entries[0]!.input).toBe(undefined);
    });

    it('captures outputs when enabled', () => {
      const session = Audit.createSession({
        enabled: true,
        captureOutputs: true
      });
      const updated = Audit.record('map')('Either')(5)(10)(session);
      expect(updated.log.entries[0]!.output).toBe(10);
    });

    it('omits outputs when disabled', () => {
      const session = Audit.createSession({
        enabled: true,
        captureOutputs: false
      });
      const updated = Audit.record('map')('Either')(5)(10)(session);
      expect(updated.log.entries[0]!.output).toBe(undefined);
    });

    it('uses custom ID generator', () => {
      let callCount = 0;
      const customId = () => `id-${++callCount}`;
      const session = Audit.createSession({
        enabled: true,
        generateId: customId
      });
      const updated = Audit.record('test')('Maybe')(null)(null)(session);
      expect(updated.log.entries[0]!.id).toBe('id-1');
    });

    it('records timestamp', () => {
      const session = Audit.createSession({ enabled: true });
      const before = Date.now();
      const updated = Audit.record('op')('monad')(1)(2)(session);
      const after = Date.now();
      const timestamp = updated.log.entries[0]!.timestamp;
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('returns new session without mutation', () => {
      const session = Audit.createSession({ enabled: true });
      const updated = Audit.record('map')('Either')(5)(10)(session);
      expect(session).not.toBe(updated);
      expect(session.log.entries.length).toBe(0);
      expect(updated.log.entries.length).toBe(1);
    });

    it('appends multiple records', () => {
      const session = Audit.createSession({ enabled: true });
      const s1 = Audit.record('map')('Either')(1)(2)(session);
      const s2 = Audit.record('chain')('Either')(2)(3)(s1);
      expect(s2.log.entries.length).toBe(2);
      expect(s2.log.entries[0]!.operation).toBe('map');
      expect(s2.log.entries[1]!.operation).toBe('chain');
    });
  });

  describe('track', () => {
    it('executes the function and returns the result', () => {
      const session = Audit.createSession({ enabled: false });
      const [result] = Audit.track('double')('Math')((x: number) => x * 2)(5)(session);
      expect(result).toBe(10);
    });

    it('records the operation when enabled', () => {
      const session = Audit.createSession({ enabled: true });
      const [, updated] = Audit.track('double')('Math')((x: number) => x * 2)(5)(session);
      expect(updated.log.entries.length).toBe(1);
      expect(updated.log.entries[0]!.operation).toBe('double');
      expect(updated.log.entries[0]!.input).toBe(5);
      expect(updated.log.entries[0]!.output).toBe(10);
    });

    it('is no-op when disabled', () => {
      const session = Audit.createSession({ enabled: false });
      const [result, updated] = Audit.track('op')('monad')((x: number) => x + 1)(1)(session);
      expect(result).toBe(2);
      expect(updated).toBe(session);
    });

    it('returns tuple of [result, updatedSession]', () => {
      const session = Audit.createSession({ enabled: true });
      const tuple = Audit.track('test')('monad')((x: string) => x.toUpperCase())('hello')(session);
      expect(Array.isArray(tuple)).toBe(true);
      expect(tuple.length).toBe(2);
      expect(tuple[0]).toBe('HELLO');
      expect(tuple[1]!.log.entries.length).toBe(1);
    });

    it('works with functions that return undefined', () => {
      const session = Audit.createSession({ enabled: true });
      const [result, updated] = Audit.track('sideEffect')('Effect')(() => {
        /* no-op */
      })(null)(session);
      expect(result).toBe(undefined);
      expect(updated.log.entries[0]!.output).toBe(undefined);
    });
  });

  describe('getLog', () => {
    it('returns the log from a session', () => {
      const session = Audit.createSession({ enabled: true });
      const updated = Audit.record('op')('monad')(1)(2)(session);
      const log = Audit.getLog(updated);
      expect(log.tag).toBe('AuditLog');
      expect(log.entries.length).toBe(1);
    });
  });

  describe('getEntries', () => {
    it('returns entries array from log', () => {
      const session = Audit.createSession({ enabled: true });
      const s1 = Audit.record('op1')('monad')(1)(2)(session);
      const s2 = Audit.record('op2')('monad')(2)(3)(s1);
      const entries = Audit.getEntries(Audit.getLog(s2));
      expect(entries.length).toBe(2);
      expect(entries[0]!.operation).toBe('op1');
      expect(entries[1]!.operation).toBe('op2');
    });

    it('returns empty array for empty log', () => {
      const session = Audit.createSession();
      const entries = Audit.getEntries(Audit.getLog(session));
      expect(entries.length).toBe(0);
    });
  });

  describe('entryAt', () => {
    it('returns Just for valid index', () => {
      const session = Audit.createSession({ enabled: true });
      const updated = Audit.record('op')('monad')(1)(2)(session);
      const result = Audit.entryAt(0)(Audit.getLog(updated));
      expect(Maybe.isJust(result)).toBe(true);
      expect(Maybe.getOrElse(() => null)(result)!.operation).toBe('op');
    });

    it('returns Nothing for negative index', () => {
      const session = Audit.createSession({ enabled: true });
      const updated = Audit.record('op')('monad')(1)(2)(session);
      const result = Audit.entryAt(-1)(Audit.getLog(updated));
      expect(Maybe.isNothing(result)).toBe(true);
    });

    it('returns Nothing for out-of-bounds index', () => {
      const session = Audit.createSession({ enabled: true });
      const updated = Audit.record('op')('monad')(1)(2)(session);
      const result = Audit.entryAt(10)(Audit.getLog(updated));
      expect(Maybe.isNothing(result)).toBe(true);
    });

    it('supports multiple entries', () => {
      const session = Audit.createSession({ enabled: true });
      const s1 = Audit.record('op1')('monad')(1)(2)(session);
      const s2 = Audit.record('op2')('monad')(2)(3)(s1);
      const entry0 = Audit.entryAt(0)(Audit.getLog(s2));
      const entry1 = Audit.entryAt(1)(Audit.getLog(s2));
      expect(Maybe.getOrElse(() => null)(entry0)!.operation).toBe('op1');
      expect(Maybe.getOrElse(() => null)(entry1)!.operation).toBe('op2');
    });
  });

  describe('inputAt', () => {
    it('returns input value when captured', () => {
      const session = Audit.createSession({
        enabled: true,
        captureInputs: true
      });
      const updated = Audit.record('op')('monad')(42)(100)(session);
      const result = Audit.inputAt(0)(Audit.getLog(updated));
      expect(Maybe.getOrElse(() => null)(result)).toBe(42);
    });

    it('returns Nothing when input not captured', () => {
      const session = Audit.createSession({
        enabled: true,
        captureInputs: false
      });
      const updated = Audit.record('op')('monad')(42)(100)(session);
      const result = Audit.inputAt(0)(Audit.getLog(updated));
      expect(Maybe.isNothing(result)).toBe(true);
    });

    it('returns Nothing for out-of-bounds index', () => {
      const session = Audit.createSession({ enabled: true });
      const result = Audit.inputAt(0)(Audit.getLog(session));
      expect(Maybe.isNothing(result)).toBe(true);
    });
  });

  describe('outputAt', () => {
    it('returns output value when captured', () => {
      const session = Audit.createSession({
        enabled: true,
        captureOutputs: true
      });
      const updated = Audit.record('op')('monad')(42)(100)(session);
      const result = Audit.outputAt(0)(Audit.getLog(updated));
      expect(Maybe.getOrElse(() => null)(result)).toBe(100);
    });

    it('returns Nothing when output not captured', () => {
      const session = Audit.createSession({
        enabled: true,
        captureOutputs: false
      });
      const updated = Audit.record('op')('monad')(42)(100)(session);
      const result = Audit.outputAt(0)(Audit.getLog(updated));
      expect(Maybe.isNothing(result)).toBe(true);
    });

    it('returns Nothing for out-of-bounds index', () => {
      const session = Audit.createSession({ enabled: true });
      const result = Audit.outputAt(0)(Audit.getLog(session));
      expect(Maybe.isNothing(result)).toBe(true);
    });
  });

  describe('replay', () => {
    it('returns all entries in order', () => {
      const session = Audit.createSession({ enabled: true });
      const s1 = Audit.record('map')('Either')(1)(2)(session);
      const s2 = Audit.record('chain')('Either')(2)(3)(s1);
      const entries = Audit.replay(Audit.getLog(s2));
      expect(entries.length).toBe(2);
      expect(entries[0]!.operation).toBe('map');
      expect(entries[1]!.operation).toBe('chain');
    });

    it('returns empty array for empty log', () => {
      const session = Audit.createSession();
      const entries = Audit.replay(Audit.getLog(session));
      expect(entries.length).toBe(0);
    });
  });

  describe('filterByOperation', () => {
    it('filters entries by operation name', () => {
      const session = Audit.createSession({ enabled: true });
      const s1 = Audit.record('map')('Either')(1)(2)(session);
      const s2 = Audit.record('chain')('Either')(2)(3)(s1);
      const s3 = Audit.record('map')('Either')(3)(4)(s2);
      const filtered = Audit.filterByOperation('map')(Audit.getLog(s3));
      expect(filtered.entries.length).toBe(2);
      expect(filtered.entries[0]!.operation).toBe('map');
      expect(filtered.entries[1]!.operation).toBe('map');
    });

    it('returns empty log if no matches', () => {
      const session = Audit.createSession({ enabled: true });
      const updated = Audit.record('map')('Either')(1)(2)(session);
      const filtered = Audit.filterByOperation('chain')(Audit.getLog(updated));
      expect(filtered.entries.length).toBe(0);
    });
  });

  describe('filterByMonadType', () => {
    it('filters entries by monad type', () => {
      const session = Audit.createSession({ enabled: true });
      const s1 = Audit.record('map')('Either')(1)(2)(session);
      const s2 = Audit.record('map')('Maybe')(2)(3)(s1);
      const s3 = Audit.record('chain')('Either')(3)(4)(s2);
      const filtered = Audit.filterByMonadType('Either')(Audit.getLog(s3));
      expect(filtered.entries.length).toBe(2);
      expect(filtered.entries[0]!.monadType).toBe('Either');
      expect(filtered.entries[1]!.monadType).toBe('Either');
    });

    it('returns empty log if no matches', () => {
      const session = Audit.createSession({ enabled: true });
      const updated = Audit.record('map')('Either')(1)(2)(session);
      const filtered = Audit.filterByMonadType('List')(Audit.getLog(updated));
      expect(filtered.entries.length).toBe(0);
    });
  });

  describe('integration', () => {
    it('chains track operations naturally', () => {
      const session = Audit.createSession({ enabled: true });
      const [r1, s1] = Audit.track('double')('Math')((x: number) => x * 2)(5)(session);
      const [r2, s2] = Audit.track('addOne')('Math')((x: number) => x + 1)(r1)(s1);
      expect(r2).toBe(11);
      expect(s2.log.entries.length).toBe(2);
      expect(s2.log.entries[0]!.output).toBe(10);
      expect(s2.log.entries[1]!.output).toBe(11);
    });

    it('zero-cost no-op when disabled', () => {
      const session = Audit.createSession({ enabled: false });
      const updated = Audit.record('op')('monad')(1)(2)(session);
      expect(updated).toBe(session);
    });
  });
});
