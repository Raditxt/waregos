import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import { FastifyInstance } from 'fastify'

async function corsPlugin(app: FastifyInstance) {
  // Baca daftar origin dari env (dipisah koma), bersihkan spasi
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  app.register(cors, {
    origin: (origin, cb) => {
      // Izinkan request tanpa origin (misal: curl, Postman, atau native mobile app)
      if (!origin) return cb(null, true)

      // Hanya izinkan origin yang terdaftar
      if (allowedOrigins.includes(origin)) {
        cb(null, true)
      } else {
        // Tolak: header Access-Control-Allow-Origin tidak akan dikirim
        cb(null, false)
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
}

export default fp(corsPlugin)