import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import aliceKeypair from '../keypair-alice.json'
import bundlerKeypair from '../keypair-bundler.json'
import IDL from '../target/idl/spw.json'
import type { Spw } from '../target/types/spw'
import { Buffer } from 'buffer'
import * as BufferLayout from '@solana/buffer-layout'
// import { newInstruction } from '@repo/shared'
import { Secp256r1 } from './secp256r1'

anchor.web3.Secp256k1Program

const rpc = 'https://devnet.helius-rpc.com/?api-key=8a2fb691-6f48-47f8-910c-97c8211e422e'
const connection = new Connection(rpc, 'confirmed')

const alice = new anchor.Wallet(anchor.web3.Keypair.fromSecretKey(new Uint8Array(aliceKeypair)))
const bundler = new anchor.Wallet(anchor.web3.Keypair.fromSecretKey(new Uint8Array(bundlerKeypair)))

const provider = new anchor.AnchorProvider(connection, bundler, { commitment: 'confirmed' })
anchor.setProvider(provider)

const program = new Program(IDL as Spw, provider)

const PROGRAM_ID = new PublicKey(program.programId)

export type CreateSecp256r1InstructionWithPublicKeyParams = {
  publicKey: Buffer | Uint8Array | Array<number>
  message: Buffer | Uint8Array | Array<number>
  signature: Buffer | Uint8Array | Array<number>
  recoveryId: number
  instructionIndex?: number
}

async function handle() {
  const publicKeyHex =
    '0491e43cb638355ce51c79d5cbb10a4429306254996576f21c48658c3a2d36eb01989c8f754a07b830d99df263acd60049ed5653b3fa85761fce7b83a0595505e6'
  const signatureHex =
    '3046022100a4a9c655b34d5e01890b821fbc42b0e4359d2a4d358040d9723949b7da97cdaa022100ecf4714949cc039b68eb70de85500bb3416d837515e39673061f23f31fd84028'
  const messageHex =
    '49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000a907a3b1e88d68dacd386df18f8e1c4289a0e5b70e31270c837dab0cb2194f2d'

  const publicKey = new Uint8Array(Buffer.from(publicKeyHex, 'hex'))
  const signature = new Uint8Array(Buffer.from(signatureHex, 'hex'))
  const message = new Uint8Array(Buffer.from(messageHex, 'hex'))

  const instruction = Secp256r1.createInstructionWithPublicKey({
    publicKey,
    message,
    signature,
  })
  console.log('instruction', instruction)
  // const x = Buffer.from([
  //   125, 213, 13, 45, 196, 46, 223, 79, 63, 222, 139, 247, 52, 219, 231, 1, 34, 110, 95, 51, 122, 250, 60, 41, 61, 255, 131, 20, 103, 129, 227, 224,
  // ])
  // const y = Buffer.from([
  //   12, 31, 0, 203, 49, 207, 212, 227, 13, 9, 142, 104, 214, 12, 164, 226, 61, 7, 92, 17, 99, 171, 125, 235, 147, 15, 138, 126, 237, 40, 23, 90,
  // ])

  // const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from('WALLET'), x, y], PROGRAM_ID)

  // const ix = await program.methods
  //   .createWallet(x, y)
  //   .accounts({
  //     payer: bundler.publicKey,
  //     wallet: pda,
  //     systemProgram: SystemProgram.programId,
  //   })
  //   .signers([bundler.payer])
  //   .instruction()

  // const tx = new Transaction().add(ix)
  // tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  // tx.feePayer = bundler.publicKey

  // const txHash = await provider.sendAndConfirm(tx)
  // console.log('Tx Hash: ', txHash)
}

// [ 1, 0, 49, 0, 255, 255, 16, 0, 255, 255, 113, 0, 69, 0, 255, 255, 2, 145, 228, 60, 182, 56, 53, 92, 229, 28, 121, 213, 203, 177, 10, 68, 41, 48, 98, 84, 153, 101, 118, 242, 28, 72, 101, 140, 58, 45, 54, 235, 1, 164, 169, 198, 85, 179, 77, 94, 1, 137, 11, 130, 31, 188, 66, 176, 228, 53, 157, 42, 77, 53, 128, 64, 217, 114, 57, 73, 183, 218, 151, 205, 170, 19, 11, 142, 181, 182, 51, 252, 101, 151, 20, 143, 33, 122, 175, 244, 76, 123, 121, 119, 56, 145, 52, 8, 17, 237, 154, 166, 207, 220, 138, 229, 41, 73, 150, 13, 229, 136, 14, 140, 104, 116, 52, 23, 15, 100, 118, 96, 91, 143, 228, 174, 185, 162, 134, 50, 199, 153, 92, 243, 186, 131, 29, 151, 99, 29, 0, 0, 0, 0, 169, 7, 163, 177, 232, 141, 104, 218, 205, 56, 109, 241, 143, 142, 28, 66, 137, 160, 229, 183, 14, 49, 39, 12, 131, 125, 171, 12, 178, 25, 79, 45 ]
// [ 1, 0, 49, 0, 255, 255, 16, 0, 255, 255, 113, 0, 69, 0, 255, 255, 2, 145, 228, 60, 182, 56, 53, 92, 229, 28, 121, 213, 203, 177, 10, 68, 41, 48, 98, 84, 153, 101, 118, 242, 28, 72, 101, 140, 58, 45, 54, 235, 1, 164, 169, 198, 85, 179, 77, 94, 1, 137, 11, 130, 31, 188, 66, 176, 228, 53, 157, 42, 77, 53, 128, 64, 217, 114, 57, 73, 183, 218, 151, 205, 170, 19, 11, 142, 181, 182, 51, 252, 101, 151, 20, 143, 33, 122, 175, 244, 76, 123, 121, 119, 56, 145, 52, 8, 17, 237, 154, 166, 207, 220, 138, 229, 41, 73, 150, 13, 229, 136, 14, 140, 104, 116, 52, 23, 15, 100, 118, 96, 91, 143, 228, 174, 185, 162, 134, 50, 199, 153, 92, 243, 186, 131, 29, 151, 99, 29, 0, 0, 0, 0, 169, 7, 163, 177, 232, 141, 104, 218, 205, 56, 109, 241, 143, 142, 28, 66, 137, 160, 229, 183, 14, 49, 39, 12, 131, 125, 171, 12, 178, 25, 79, 45 ]
handle()
