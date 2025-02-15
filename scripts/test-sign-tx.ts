import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import aliceKeypair from '../keypair-alice.json'
import bundlerKeypair from '../keypair-bundler.json'
import IDL from '../target/idl/spw.json'
import type { Spw } from '../target/types/spw'

const rpc = 'https://devnet.helius-rpc.com/?api-key=8a2fb691-6f48-47f8-910c-97c8211e422e'
const connection = new Connection(rpc, 'confirmed')

const alice = new anchor.Wallet(anchor.web3.Keypair.fromSecretKey(new Uint8Array(aliceKeypair)))
const bundler = new anchor.Wallet(anchor.web3.Keypair.fromSecretKey(new Uint8Array(bundlerKeypair)))

const provider = new anchor.AnchorProvider(connection, bundler, { commitment: 'confirmed' })
anchor.setProvider(provider)

const program = new Program(IDL as Spw, provider)

const PROGRAM_ID = new PublicKey(program.programId)

async function handle() {
  const x = Buffer.from([
    125, 213, 13, 45, 196, 46, 223, 79, 63, 222, 139, 247, 52, 219, 231, 1, 34, 110, 95, 51, 122, 250, 60, 41, 61, 255, 131, 20, 103, 129, 227, 224,
  ])
  const y = Buffer.from([
    12, 31, 0, 203, 49, 207, 212, 227, 13, 9, 142, 104, 214, 12, 164, 226, 61, 7, 92, 17, 99, 171, 125, 235, 147, 15, 138, 126, 237, 40, 23, 90,
  ])

  const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from('WALLET'), x, y], PROGRAM_ID)

  const ix = await program.methods
    .createWallet(x, y)
    .accounts({
      payer: bundler.publicKey,
      wallet: pda,
      systemProgram: SystemProgram.programId,
    })
    .signers([bundler.payer])
    .instruction()

  const tx = new Transaction().add(ix)
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  tx.feePayer = bundler.publicKey

  const txHash = await provider.sendAndConfirm(tx)
  console.log('Tx Hash: ', txHash)
}

handle()
