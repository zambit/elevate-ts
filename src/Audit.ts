// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial
// Copyright (C) 2024 Zambit Technologies Corp
// See LICENSE or COMMERCIAL-LICENSE.md in the package root.

// Audit — Operation Tracking with Time-Travel Replay

import type * as Maybe from './Maybe.js';
import * as MaybeModule from './Maybe.js';

export type AuditConfig = {
  readonly enabled: boolean;
  readonly captureInputs: boolean;
  readonly captureOutputs: boolean;
  readonly generateId: () => string;
};

export type AuditEntry = {
  readonly tag: 'AuditEntry';
  readonly id: string;
  readonly timestamp: number;
  readonly operation: string;
  readonly monadType: string;
  readonly input: unknown;
  readonly output: unknown;
};

export type AuditLog = {
  readonly tag: 'AuditLog';
  readonly entries: readonly AuditEntry[];
};

export type AuditSession = {
  readonly tag: 'AuditSession';
  readonly config: AuditConfig;
  readonly log: AuditLog;
};

const defaultConfig: AuditConfig = {
  enabled: false,
  captureInputs: true,
  captureOutputs: true,
  generateId: () => crypto.randomUUID()
};

export const createSession = (config: Partial<AuditConfig> = {}): AuditSession => ({
  tag: 'AuditSession',
  config: { ...defaultConfig, ...config },
  log: { tag: 'AuditLog', entries: [] }
});

export const withEnabled =
  (enabled: boolean) =>
  (session: AuditSession): AuditSession => ({
    ...session,
    config: { ...session.config, enabled }
  });

export const withCaptureInputs =
  (captureInputs: boolean) =>
  (session: AuditSession): AuditSession => ({
    ...session,
    config: { ...session.config, captureInputs }
  });

export const withCaptureOutputs =
  (captureOutputs: boolean) =>
  (session: AuditSession): AuditSession => ({
    ...session,
    config: { ...session.config, captureOutputs }
  });

export const withGenerateId =
  (generateId: () => string) =>
  (session: AuditSession): AuditSession => ({
    ...session,
    config: { ...session.config, generateId }
  });

const makeEntry =
  (config: AuditConfig) =>
  (operation: string) =>
  (monadType: string) =>
  (input: unknown) =>
  (output: unknown): AuditEntry => ({
    tag: 'AuditEntry',
    id: config.generateId(),
    timestamp: Date.now(),
    operation,
    monadType,
    input: config.captureInputs ? input : undefined,
    output: config.captureOutputs ? output : undefined
  });

const appendEntry =
  (entry: AuditEntry) =>
  (session: AuditSession): AuditSession => ({
    ...session,
    log: {
      ...session.log,
      entries: [...session.log.entries, entry]
    }
  });

export const record =
  (operation: string) =>
  (monadType: string) =>
  (input: unknown) =>
  (output: unknown) =>
  (session: AuditSession): AuditSession =>
    !session.config.enabled ? session : appendEntry(makeEntry(session.config)(operation)(monadType)(input)(output))(session);

export const track =
  (operation: string) =>
  (monadType: string) =>
  <A, B>(f: (a: A) => B) =>
  (input: A) =>
  (session: AuditSession): readonly [B, AuditSession] => {
    const output = f(input);
    return [output, record(operation)(monadType)(input)(output)(session)];
  };

export const getLog = (session: AuditSession): AuditLog => session.log;

export const getEntries = (log: AuditLog): readonly AuditEntry[] => log.entries;

export const entryAt =
  (index: number) =>
  (log: AuditLog): Maybe.Maybe<AuditEntry> =>
    index >= 0 && index < log.entries.length ? MaybeModule.Just(log.entries[index] as AuditEntry) : MaybeModule.Nothing;

export const inputAt =
  (index: number) =>
  (log: AuditLog): Maybe.Maybe<unknown> =>
    MaybeModule.chain((entry: AuditEntry) => (entry.input !== undefined ? MaybeModule.Just(entry.input) : MaybeModule.Nothing))(entryAt(index)(log));

export const outputAt =
  (index: number) =>
  (log: AuditLog): Maybe.Maybe<unknown> =>
    MaybeModule.chain((entry: AuditEntry) => (entry.output !== undefined ? MaybeModule.Just(entry.output) : MaybeModule.Nothing))(entryAt(index)(log));

export const replay = (log: AuditLog): readonly AuditEntry[] => log.entries;

export const filterByOperation =
  (operation: string) =>
  (log: AuditLog): AuditLog => ({
    ...log,
    entries: log.entries.filter((e) => e.operation === operation)
  });

export const filterByMonadType =
  (monadType: string) =>
  (log: AuditLog): AuditLog => ({
    ...log,
    entries: log.entries.filter((e) => e.monadType === monadType)
  });
