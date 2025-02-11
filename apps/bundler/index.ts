// Import the framework and instantiate it
import Fastify from 'fastify'
const fastify = Fastify({
  logger: true,
})

fastify.get('/', async function handler(request, reply) {
  return { hello: 'world' }
})

try {
  await fastify.listen({ port: 3501 })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
