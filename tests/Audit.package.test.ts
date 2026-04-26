import { describe, it, expect } from 'vitest';
import { Audit } from '@zambit/elevate-ts';
import * as AuditDirect from '@zambit/elevate-ts/Audit';

describe('Audit — package import', () => {
  it('can import Audit from main export', () => {
    const session = Audit.createSession();
    expect(session.tag).toBe('AuditSession');
  });

  it('can import Audit from subpath export', () => {
    const session = AuditDirect.createSession();
    expect(session.tag).toBe('AuditSession');
  });
});
