// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { validateBuildEnv } from '../build-env.ts';

const validEnv = {
  VITE_API_URL: '/api/v1',
  VITE_APP_VERSION: '1.0.0',
  VITE_AUTH_SALT: 'a'.repeat(64),
};

describe('build environment', () => {
  it.each([
    '/api/v1',
    'https://api.example.com/api/v1',
    'http://localhost:3000/api/v1',
  ])('accepts API base %s', (VITE_API_URL) => {
    expect(() => validateBuildEnv({ ...validEnv, VITE_API_URL })).not.toThrow();
  });

  it.each(['VITE_API_URL', 'VITE_APP_VERSION', 'VITE_AUTH_SALT'])(
    'fails before emitting an unusable build without %s',
    (name) => {
      expect(() => validateBuildEnv({ ...validEnv, [name]: ' ' })).toThrow(
        name,
      );
    },
  );

  it.each([
    'api/v1',
    '//api.example.com/api/v1',
    'ftp://api.example.com/api/v1',
    'https://user:password@api.example.com/api/v1',
    '/api/v1?token=secret',
    '/api/v1#fragment',
    '/api/v1?',
    '/api/v1#',
    'https://',
    '/\\api.example.com',
    '/api/v 1',
  ])(
    'rejects an API base that would generate incorrect requests: %s',
    (VITE_API_URL) => {
      expect(() => validateBuildEnv({ ...validEnv, VITE_API_URL })).toThrow(
        'VITE_API_URL',
      );
    },
  );

  it.each(['salt', 'a'.repeat(63), 'g'.repeat(64), 'A'.repeat(64)])(
    'rejects an invalid auth salt',
    (VITE_AUTH_SALT) => {
      expect(() => validateBuildEnv({ ...validEnv, VITE_AUTH_SALT })).toThrow(
        'VITE_AUTH_SALT',
      );
    },
  );

  it.each(['bad version', 'a'.repeat(65), '1.0.0\r\nheader'])(
    'rejects versions that the API cannot verify',
    (VITE_APP_VERSION) => {
      expect(() => validateBuildEnv({ ...validEnv, VITE_APP_VERSION })).toThrow(
        'VITE_APP_VERSION',
      );
    },
  );
});
