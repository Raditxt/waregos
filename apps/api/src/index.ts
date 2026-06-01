import Fastify from 'fastify'

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
})

const start = async () => {
  try {
    await app.listen({
      port: Number(process.env.API_PORT ?? 3001),
      host: process.env.API_HOST ?? '0.0.0.0'
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()