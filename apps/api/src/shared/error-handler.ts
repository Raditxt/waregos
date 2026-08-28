// ============================================
// ERROR HANDLER — Chain of Responsibility Pattern
// Centralized error handling
// ============================================

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { logger } from './logger'
import { serverError, validationError, badRequest } from './response'

export const globalErrorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void => {
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