// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial
// Copyright (C) 2024 Zambit Technologies Corp
// See LICENSE or COMMERCIAL-LICENSE.md in the package root.

// HTTP — CloudFlare Workers and Web Fetch API Helpers

import type * as Either from './Either.js';
import * as EitherModule from './Either.js';
import type * as EitherAsync from './EitherAsync.js';
import type * as Maybe from './Maybe.js';
import * as MaybeModule from './Maybe.js';
import type * as Reader from './Reader.js';
import * as ReaderModule from './Reader.js';

export type SyncHTTPHandler = (req: Request) => Response;
export type HTTPHandler = (req: Request) => Promise<Response>;
export type StatusMap<E extends string> = Partial<Record<E, number>> & {
  readonly default: number;
};

/**
 * Create a JSON response with the given status code and body.
 * @param status HTTP status code (200, 404, 500, etc.)
 * @returns Function that takes a body and returns a Response with Content-Type: application/json
 */
export const jsonResponse =
  (status: number) =>
  (body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });

/**
 * Safely parse a JSON string into an Either.
 * @param raw JSON string or null
 * @returns Either.Right with parsed value or Either.Left with error message
 */
export const parseJSON = <T>(raw: string | null): Either.Either<string, T> => {
  if (raw === null) return EitherModule.Left('Missing body');
  try {
    return EitherModule.Right(JSON.parse(raw) as T);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return EitherModule.Left(`Invalid JSON: ${message}`);
  }
};

/**
 * Access a CloudFlare environment variable, returning Nothing if absent.
 * @param key Environment variable name
 * @returns Reader that extracts an optional string from the environment
 */
export const askEnv = (key: string): Reader.Reader<Record<string, string | undefined>, Maybe.Maybe<string>> =>
  ReaderModule.asks((env: Record<string, string | undefined>) => {
    const value = env[key];
    return value !== undefined ? MaybeModule.Just(value) : MaybeModule.Nothing;
  });

/**
 * Access a required CloudFlare environment variable.
 * @param key Environment variable name
 * @returns Reader that returns Either.Left if the variable is missing
 */
export const requireEnv = (key: string): Reader.Reader<Record<string, string | undefined>, Either.Either<string, string>> =>
  ReaderModule.asks((env: Record<string, string | undefined>) => {
    const value = env[key];
    return value !== undefined ? EitherModule.Right(value) : EitherModule.Left(`Missing environment variable: ${key}`);
  });

/**
 * Map domain error codes to HTTP status codes.
 * @param codes Object mapping error strings to status codes, with a 'default' fallback
 * @returns Function that maps an error to its HTTP status code
 */
export const withStatusCode =
  <E extends string>(codes: StatusMap<E>) =>
  (error: E): number =>
    codes[error] ?? codes.default;

/**
 * Wrap a synchronous Either-returning handler to produce an HTTP Response.
 * @param onLeft Callback to transform error into Response
 * @param onRight Callback to transform success value into Response
 * @returns Function that wraps a handler function
 */
export const handleEither =
  <E, A>(onLeft: (err: E) => Response, onRight: (val: A) => Response) =>
  (fn: (req: Request) => Either.Either<E, A>): SyncHTTPHandler =>
  (req: Request): Response => {
    const result = fn(req);
    return result.tag === 'Left' ? onLeft(result.left) : onRight(result.right);
  };

/**
 * Wrap an asynchronous EitherAsync-returning handler to produce an HTTP Response Promise.
 * @param onLeft Callback to transform error into Response
 * @param onRight Callback to transform success value into Response
 * @returns Function that wraps a handler function
 */
export const handleEitherAsync =
  <E, A>(onLeft: (err: E) => Response, onRight: (val: A) => Response) =>
  (fn: (req: Request) => EitherAsync.EitherAsync<E, A>): HTTPHandler =>
  async (req: Request): Promise<Response> => {
    const result = await fn(req).run();
    return result.tag === 'Left' ? onLeft(result.left) : onRight(result.right);
  };
