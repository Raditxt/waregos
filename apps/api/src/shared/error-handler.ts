// ============================================
// ERROR HANDLER — Chain of Responsibility Pattern
// Centralized error handling
// ============================================

import type { FastifyError, FastifyInstance } from 'fastify'
import { logger } from './logger'
import { serverError, badRequest } from './response'

// Tipe handler diambil dari Fastify sendiri supaya cocok dengan signature
// setErrorHandler() versi 5.12+, termasuk varian HTTP/2.
// Fastify 5.12 mengetikkan `error` sebagai `unknown`; kita sempitkan ke
// FastifyError di dalam handler karena semua error dari framework dan
// plugin memang FastifyError.
type ErrorHandler = Parameters<FastifyInstance['setErrorHandler']>[0]

export const globalErrorHandler: ErrorHandler = (
  err,
  request,
  reply
): void => {
  const error = err as FastifyError

  // Log error
  logger.error(
    `${request.method} ${request.url} → ${error.message}`,
    'ErrorHandler',
    error
  )

  // Validation errors (Zod)
  if (error.statusCode === 400) {
    reply.code(400).send(badRequest(error.message))
    return
  }

  // Rate limit
  if (error.statusCode === 429) {
    reply.code(429).send(badRequest(
      'Terlalu banyak permintaan. Coba lagi dalam beberapa saat.',
      'TOO_MANY_REQUESTS'
    ))
    return
  }

  // Not found
  if (error.statusCode === 404) {
    reply.code(404).send(badRequest('Resource tidak ditemukan', 'NOT_FOUND'))
    return
  }

  // Default server error
  reply.code(500).send(serverError())
}