import type { IncomingMessage, ServerResponse } from 'node:http'
import app from '../server/app.js'

export default function handler(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url || '/api', 'http://localhost')
  const path = url.searchParams.get('path')
  request.url = path ? `/api/${path}` : '/api'
  return app(request, response)
}
