export type TrustProxyEnv = {
  NODE_ENV?: string
  TRUST_PROXY_CIDRS?: string
}

// Nilai opsi `trustProxy` Fastify dari env (ADR 0008).
// TRUST_PROXY_CIDRS: daftar CIDR dipisah koma; hanya alamat di dalamnya yang dipercaya
// sebagai proxy saat membaca X-Forwarded-For.
// Kosong: di luar produksi trustProxy mati; di produksi melempar Error.
export function trustProxyFromEnv(env: TrustProxyEnv): string[] | false {
  const cidrs = (env.TRUST_PROXY_CIDRS ?? '')
    .split(',')
    .map((cidr) => cidr.trim())
    .filter(Boolean)

  if (cidrs.length > 0) return cidrs

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'TRUST_PROXY_CIDRS wajib diisi di produksi (subnet internal Docker, mis. 10.89.10.0/24).',
    )
  }
  return false
}
