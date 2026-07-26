// jose 최상위 진입점을 쓰면 우리가 쓰지도 않는 JWE(암호화) 코드까지 딸려와
// 미들웨어 번들에 들어가고 Edge 런타임 경고가 뜬다. 필요한 두 경로만 직접 가져온다.
import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';

/**
 * 관리자 세션 토큰.
 *
 * middleware(Edge 런타임)와 서버 액션(Node 런타임) 양쪽에서 쓰이므로
 * 이 파일은 Node 전용 API(node:crypto 등)를 쓰지 않는다.
 */

export const SESSION_COOKIE = 'albam_admin';

/**
 * 180일. 아버지 폰에서 한 번 로그인하면 계속 유지되어야 한다(PRD).
 * 짧게 잡으면 몇 달 뒤 로그인 화면을 만나고, 그때 비밀번호를 기억 못 한다.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

const ISSUER = 'albam';
const AUDIENCE = 'albam-admin';

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET 환경변수가 없거나 너무 짧습니다 (16자 이상).');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    // secretKey()도 try 안에서 부른다. SESSION_SECRET이 없으면 미들웨어가 500을 내는 대신
    // 그냥 미인증으로 처리되어 로그인 화면으로 넘어가야 한다.
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload.role === 'admin';
  } catch {
    return false; // 만료·서명 불일치·형식 오류·키 미설정 전부 미인증으로 취급
  }
}
