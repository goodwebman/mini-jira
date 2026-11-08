import { errors, jwtVerify, SignJWT } from 'jose';
import { AppError } from './errors.js';

const ALGORITHM = 'HS256';
const ISSUER = 'gwmt';
const AUDIENCE = 'gwmt-web';
const ACCESS_TTL_SEC = 15 * 60;

const secretKey = (secret: string) => new TextEncoder().encode(secret);

export interface AccessClaims {
  userId: string;
  sessionId: string;
}

export async function signAccessToken(claims: AccessClaims, secret: string, now: Date) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + ACCESS_TTL_SEC;
  const accessToken = await new SignJWT({ sid: claims.sessionId })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(secretKey(secret));
  return { accessToken, accessTokenExpiresAt: new Date(expiresAt * 1000).toISOString() };
}

export async function verifyAccessToken(
  token: string,
  secret: string,
  now: Date,
): Promise<AccessClaims> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
      currentDate: now,
      requiredClaims: ['sub', 'sid', 'iat', 'exp'],
    });
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
      throw new AppError('ACCESS_TOKEN_INVALID');
    }
    return { userId: payload.sub, sessionId: payload.sid };
  } catch (err) {
    if (err instanceof errors.JWTExpired) throw new AppError('ACCESS_TOKEN_EXPIRED');
    throw new AppError('ACCESS_TOKEN_INVALID');
  }
}
