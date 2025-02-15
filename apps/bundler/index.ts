import { Connection, Keypair, LAMPORTS_PER_SOL, Message, SystemProgram, Transaction } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import Fastify from 'fastify'
import { TransactionInstruction } from '@solana/web3.js'
import cors from '@fastify/cors'

const fastify = Fastify({
  logger: true,
})

await fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
})

const rpc = process.env.HELIUS_RPC_URL as string
const connection = new Connection(rpc, 'confirmed')

const feePayer = Keypair.fromSecretKey(bs58.decode(process.env.FEE_PAYER_PRIVATE_KEY as string))
const alice = Keypair.fromSecretKey(bs58.decode(process.env.ALICE_PRIVATE_KEY as string))
const bob = Keypair.fromSecretKey(bs58.decode(process.env.BOB_PRIVATE_KEY as string))

fastify.post('/api/v1/prepare', async function handler(request, reply) {
  const { ix } = (await request.body) as { ix: TransactionInstruction }

  // const instructionDataBuffer = Buffer.from(ix.data, 'hex')

  // const numSignatures = instructionDataBuffer[0]
  // const signatures = instructionDataBuffer.slice(1, numSignatures * 64 + 1)
  // const pubkeys = instructionDataBuffer.slice(numSignatures * 64 + 1, numSignatures * 64 + 1 + numSignatures * 32)
  // const messages = instructionDataBuffer.slice(numSignatures * 64 + 1 + numSignatures * 32)

  // let tx = new Transaction().add(
  //   SystemProgram.transfer({
  //     fromPubkey: alice.publicKey,
  //     toPubkey: bob.publicKey,
  //     lamports: 0.1 * LAMPORTS_PER_SOL,
  //   }),
  // )

  // tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  // tx.feePayer = feePayer.publicKey
  // let realDataNeedToSign = tx.serializeMessage() // the real data singer need to sign.

  // let feePayerSignature = nacl.sign.detached(realDataNeedToSign, feePayer.secretKey)
  // let aliceSignature = nacl.sign.detached(realDataNeedToSign, alice.secretKey)

  // let verifyFeePayerSignatureResult = nacl.sign.detached.verify(
  //   realDataNeedToSign,
  //   feePayerSignature,
  //   feePayer.publicKey.toBytes(), // you should use the raw pubkey (32 bytes) to verify
  // )
  // console.log(`verify feePayer signature: ${verifyFeePayerSignatureResult}`)

  // let verifyAliceSignatureResult = nacl.sign.detached.verify(realDataNeedToSign, aliceSignature, alice.publicKey.toBytes())
  // console.log(`verify alice signature: ${verifyAliceSignatureResult}`)

  // // 3.b. Recover Transaction (use populate with signature)

  // let recoverTx = Transaction.populate(Message.from(realDataNeedToSign), [bs58.encode(feePayerSignature), bs58.encode(aliceSignature)])

  // const txHash = await connection.sendRawTransaction(recoverTx.serialize())

  // // 4. Send transaction
  // console.log(`explorer url: https://explorer.solana.com/tx/${txHash}`)

  return { txHash: '123' }
})

fastify.get('/api/gm', async function handler(request, reply) {
  return { gm: 'bro' }
})

try {
  await fastify.listen({ port: Number(process.env.PORT) })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
