import crypto from 'crypto'

const SECRET = process.env.AUTH_SECRET ?? 'dev-secret-change-me'
const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes — long enough to fill out the form

interface TokenPayload {
  email: string
  type: 'DEPARTMENT' | 'FRANCHISE'
  departmentId: string | null
  exp: number
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
}

/** Issue a signed token proving this email was verified for this application context. */
export function issueVerificationToken(
  email: string,
  type: 'DEPARTMENT' | 'FRANCHISE',
  departmentId: string | null
): string {
  const payload: TokenPayload = {
    email: email.toLowerCase().trim(),
    type,
    departmentId,
    exp: Date.now() + TOKEN_TTL_MS,
  }
  const json = JSON.stringify(payload)
  const encoded = Buffer.from(json).toString('base64url')
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

/** Verify a token matches the given email/type/departmentId and hasn't expired. */
export function verifyVerificationToken(
  token: string | undefined | null,
  email: string,
  type: 'DEPARTMENT' | 'FRANCHISE',
  departmentId: string | null
): boolean {
  if (!token) return false
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return false

  const expectedSig = sign(encoded)
  // Constant-time comparison to avoid timing attacks
  if (
    expectedSig.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature))
  ) {
    return false
  }

  try {
    const payload: TokenPayload = JSON.parse(Buffer.from(encoded, 'base64url').toString())
    if (payload.exp < Date.now()) return false
    if (payload.email !== email.toLowerCase().trim()) return false
    if (payload.type !== type) return false
    if ((payload.departmentId ?? null) !== (departmentId ?? null)) return false
    return true
  } catch {
    return false
  }
}
