const BASE_URL = process.env.TXLINE_BASE_URL || 'https://txline-dev.txodds.com'
let jwt = ''
async function guestToken() {
  if (jwt) return jwt
  const response = await fetch(`${BASE_URL}/auth/guest/start`, { method: 'POST' })
  if (!response.ok) throw new Error(`TxLINE guest auth failed: ${response.status}`)
  jwt = String((await response.json() as { token?: string }).token || '')
  if (!jwt) throw new Error('TxLINE guest auth returned no token')
  return jwt
}
export async function txGet(path: string) {
  const apiToken = process.env.TXLINE_API_KEY
  if (!apiToken) throw new Error('TXLINE_API_KEY is not configured')
  const bearer = await guestToken()
  const response = await fetch(`${BASE_URL}${path}`, { headers: { Authorization: `Bearer ${bearer}`, 'X-Api-Token': apiToken } })
  if (!response.ok) throw new Error(`TxLINE ${path} failed: ${response.status}`)
  return response.json() as Promise<unknown>
}
