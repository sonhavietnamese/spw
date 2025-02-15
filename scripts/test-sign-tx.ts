import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js'

import { Transaction } from '@solana/web3.js'

const rpc = 'https://devnet.helius-rpc.com/?api-key=8a2fb691-6f48-47f8-910c-97c8211e422e'
const connection = new Connection(rpc, 'confirmed')

const alice = Keypair.generate()
const bob = Keypair.generate()

let tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: alice.publicKey,
    toPubkey: bob.publicKey,
    lamports: 0.1 * LAMPORTS_PER_SOL,
  }),
)

tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
tx.feePayer = alice.publicKey

console.log(tx.serializeMessage())
