import { describe, it, expect } from 'vitest';
import { jsonResponse, parseJSON, askEnv, requireEnv, withStatusCode, handleEither, handleEitherAsync } from '../src/HTTP.js';
import { Right, Left } from '../src/Either.js';
import { EitherAsync } from '../src/EitherAsync.js';
import { Just, Nothing } from '../src/Maybe.js';
import { runReader } from '../src/Reader.js';

describe('HTTP', () => {
  describe('jsonResponse', () => {
    it('returns a Response with status code', () => {
      const response = jsonResponse(200)({ ok: true });
      expect(response.status).toBe(200);
    });

    it('sets Content-Type header to application/json', () => {
      const response = jsonResponse(201)({ id: 1 });
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('serializes the body to JSON', async () => {
      const body = { message: 'hello', count: 42 };
      const response = jsonResponse(200)(body);
      const text = await response.text();
      expect(text).toBe(JSON.stringify(body));
    });

    it('serializes arrays', async () => {
      const response = jsonResponse(200)([1, 2, 3]);
      const text = await response.text();
      expect(text).toBe('[1,2,3]');
    });

    it('serializes primitives', async () => {
      const response = jsonResponse(200)('string');
      const text = await response.text();
      expect(text).toBe('"string"');
    });

    it('handles various status codes', () => {
      expect(jsonResponse(201)(null).status).toBe(201);
      expect(jsonResponse(404)(null).status).toBe(404);
      expect(jsonResponse(500)(null).status).toBe(500);
    });
  });

  describe('parseJSON', () => {
    it('returns Right with parsed object', () => {
      const result = parseJSON<{ id: number }>('{"id":123}');
      expect(result.tag).toBe('Right');
      if (result.tag === 'Right') {
        expect(result.right.id).toBe(123);
      }
    });

    it('returns Right with parsed array', () => {
      const result = parseJSON<number[]>('[1,2,3]');
      expect(result.tag).toBe('Right');
      if (result.tag === 'Right') {
        expect(result.right).toEqual([1, 2, 3]);
      }
    });

    it('returns Right with parsed string', () => {
      const result = parseJSON<string>('"hello"');
      expect(result.tag).toBe('Right');
      if (result.tag === 'Right') {
        expect(result.right).toBe('hello');
      }
    });

    it('returns Right with parsed number', () => {
      const result = parseJSON<number>('42');
      expect(result.tag).toBe('Right');
      if (result.tag === 'Right') {
        expect(result.right).toBe(42);
      }
    });

    it('returns Left for invalid JSON', () => {
      const result = parseJSON<unknown>('{invalid}');
      expect(result.tag).toBe('Left');
      if (result.tag === 'Left') {
        expect(result.left).toContain('Invalid JSON');
      }
    });

    it('returns Left for null input', () => {
      const result = parseJSON<unknown>(null);
      expect(result.tag).toBe('Left');
      if (result.tag === 'Left') {
        expect(result.left).toBe('Missing body');
      }
    });

    it('returns Left for incomplete JSON', () => {
      const result = parseJSON<unknown>('{"incomplete":');
      expect(result.tag).toBe('Left');
    });
  });

  describe('askEnv', () => {
    it('returns Just when key exists in env', () => {
      const result = runReader({ API_KEY: 'secret123' })(askEnv('API_KEY'));
      expect(result.tag).toBe('Just');
      if (result.tag === 'Just') {
        expect(result.value).toBe('secret123');
      }
    });

    it('returns Nothing when key is absent', () => {
      const result = runReader({} as Record<string, string | undefined>)(askEnv('MISSING_KEY'));
      expect(result.tag).toBe('Nothing');
    });

    it('returns Nothing when value is undefined', () => {
      const result = runReader({ KEY: undefined })(askEnv('KEY'));
      expect(result.tag).toBe('Nothing');
    });

    it('handles multiple keys independently', () => {
      const env = { FOO: 'foo-value', BAR: 'bar-value' };
      const foo = runReader(env)(askEnv('FOO'));
      const bar = runReader(env)(askEnv('BAR'));
      expect(foo.tag).toBe('Just');
      expect(bar.tag).toBe('Just');
    });
  });

  describe('requireEnv', () => {
    it('returns Right when key exists in env', () => {
      const result = runReader({ DATABASE_URL: 'postgres://...' })(requireEnv('DATABASE_URL'));
      expect(result.tag).toBe('Right');
      if (result.tag === 'Right') {
        expect(result.right).toBe('postgres://...');
      }
    });

    it('returns Left when key is absent', () => {
      const result = runReader({} as Record<string, string | undefined>)(requireEnv('MISSING_KEY'));
      expect(result.tag).toBe('Left');
      if (result.tag === 'Left') {
        expect(result.left).toContain('Missing environment variable: MISSING_KEY');
      }
    });

    it('returns Left when value is undefined', () => {
      const result = runReader({ KEY: undefined })(requireEnv('KEY'));
      expect(result.tag).toBe('Left');
    });

    it('includes the key name in error message', () => {
      const result = runReader({} as Record<string, string | undefined>)(requireEnv('MY_SPECIAL_KEY'));
      expect(result.tag).toBe('Left');
      if (result.tag === 'Left') {
        expect(result.left).toContain('MY_SPECIAL_KEY');
      }
    });
  });

  describe('withStatusCode', () => {
    type MyError = 'not-found' | 'unauthorized' | 'conflict';

    it('maps known error codes to status codes', () => {
      const statusMap = {
        'not-found': 404,
        unauthorized: 401,
        conflict: 409,
        default: 500
      };
      const getStatus = withStatusCode<MyError>(statusMap);
      expect(getStatus('not-found')).toBe(404);
      expect(getStatus('unauthorized')).toBe(401);
      expect(getStatus('conflict')).toBe(409);
    });

    it('falls back to default for unmapped errors', () => {
      const statusMap = { default: 500 };
      const getStatus = withStatusCode<MyError>(statusMap);
      expect(getStatus('not-found')).toBe(500);
    });

    it('prioritizes mapped status over default', () => {
      const statusMap = { 'not-found': 404, default: 500 };
      const getStatus = withStatusCode<MyError>(statusMap);
      expect(getStatus('not-found')).toBe(404);
      expect(getStatus('unauthorized')).toBe(500);
    });
  });

  describe('handleEither', () => {
    it('calls onRight for Right value', () => {
      const handler = handleEither(
        () => jsonResponse(500)({ error: 'failed' }),
        (val: number) => jsonResponse(200)({ result: val })
      )(() => Right(42));

      const req = new Request('http://localhost/');
      const response = handler(req);
      expect(response.status).toBe(200);
    });

    it('calls onLeft for Left error', () => {
      const handler = handleEither(
        (err: string) => jsonResponse(400)({ error: err }),
        () => jsonResponse(200)({ result: 'ok' })
      )(() => Left('invalid input'));

      const req = new Request('http://localhost/');
      const response = handler(req);
      expect(response.status).toBe(400);
    });

    it('returns Response synchronously', () => {
      const handler = handleEither(
        () => jsonResponse(500)({ error: 'failed' }),
        (val: string) => jsonResponse(200)({ message: val })
      )(() => Right('success'));

      const req = new Request('http://localhost/');
      const response = handler(req);
      expect(response instanceof Response).toBe(true);
    });

    it('passes the request to the handler function', () => {
      const urls: string[] = [];
      const handler = handleEither(
        () => jsonResponse(500)({}),
        () => jsonResponse(200)({})
      )((req: Request) => {
        urls.push(req.url);
        return Right(undefined);
      });

      const req = new Request('http://localhost/test');
      handler(req);
      expect(urls).toContain('http://localhost/test');
    });

    it('can chain handler calls', () => {
      const baseHandler = (req: Request) => (req.url.includes('fail') ? Left('error') : Right('ok'));

      const wrapped = handleEither(
        (err: string) => jsonResponse(400)({ error: err }),
        (val: string) => jsonResponse(200)({ message: val })
      )(baseHandler);

      const failReq = new Request('http://localhost/fail');
      const successReq = new Request('http://localhost/success');

      expect(wrapped(failReq).status).toBe(400);
      expect(wrapped(successReq).status).toBe(200);
    });
  });

  describe('handleEitherAsync', () => {
    it('calls onRight for resolved value', async () => {
      const handler = handleEitherAsync(
        () => jsonResponse(500)({ error: 'failed' }),
        (val: number) => jsonResponse(200)({ result: val })
      )(() => EitherAsync(async () => Right(42)));

      const req = new Request('http://localhost/');
      const response = await handler(req);
      expect(response.status).toBe(200);
    });

    it('calls onLeft for rejected/Left value', async () => {
      const handler = handleEitherAsync(
        (err: string) => jsonResponse(400)({ error: err }),
        () => jsonResponse(200)({ result: 'ok' })
      )(() => EitherAsync(async () => Left('invalid input')));

      const req = new Request('http://localhost/');
      const response = await handler(req);
      expect(response.status).toBe(400);
    });

    it('returns Promise<Response>', async () => {
      const handler = handleEitherAsync(
        () => jsonResponse(500)({}),
        () => jsonResponse(200)({})
      )(() => EitherAsync(async () => Right(undefined)));

      const req = new Request('http://localhost/');
      const promise = handler(req);
      expect(promise instanceof Promise).toBe(true);
      const response = await promise;
      expect(response instanceof Response).toBe(true);
    });

    it('never rejects Promise', async () => {
      const handler = handleEitherAsync(
        () => jsonResponse(500)({ error: 'caught' }),
        () => jsonResponse(200)({})
      )(() => EitherAsync(async () => Left('error')));

      const req = new Request('http://localhost/');
      let rejected = false;
      try {
        await handler(req);
      } catch {
        rejected = true;
      }
      expect(rejected).toBe(false);
    });

    it('is lazy - does not call handler until invoked', async () => {
      let called = false;
      const baseHandler = () =>
        EitherAsync(async () => {
          called = true;
          return Right('done');
        });

      const wrapped = handleEitherAsync(
        () => jsonResponse(500)({}),
        () => jsonResponse(200)({})
      )(baseHandler);

      expect(called).toBe(false);

      const req = new Request('http://localhost/');
      await wrapped(req);
      expect(called).toBe(true);
    });

    it('passes the request to the handler function', async () => {
      const urls: string[] = [];
      const handler = handleEitherAsync(
        () => jsonResponse(500)({}),
        () => jsonResponse(200)({})
      )((req: Request) =>
        EitherAsync(async () => {
          urls.push(req.url);
          return Right(undefined);
        })
      );

      const req = new Request('http://localhost/test');
      await handler(req);
      expect(urls).toContain('http://localhost/test');
    });

    it('handles async operations correctly', async () => {
      const handler = handleEitherAsync(
        (err: string) => jsonResponse(400)({ error: err }),
        (val: string) => jsonResponse(200)({ message: val })
      )(() =>
        EitherAsync(
          async () =>
            new Promise<typeof Right>((resolve) => {
              setTimeout(() => resolve(Right('delayed')), 10);
            })
        )
      );

      const req = new Request('http://localhost/');
      const response = await handler(req);
      expect(response.status).toBe(200);
    });
  });
});
