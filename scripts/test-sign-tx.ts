import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import aliceKeypair from '../keypair-alice.json'
import bundlerKeypair from '../keypair-bundler.json'
import IDL from '../target/idl/spw.json'
import type { Spw } from '../target/types/spw'
import { Secp256r1 } from './secp256r1'

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

// >> converted: publicKey hex 04b89dcd439145a97e8a64d462a1b86f1632b1c61945035c44a7e49b756694e6b754536b862fa0c66602d99412628b2dae5a06edc3f9ef84626e0593d760d4a459
// >> converted: publicKey x 184,157,205,67,145,69,169,126,138,100,212,98,161,184,111,22,50,177,198,25,69,3,92,68,167,228,155,117,102,148,230,183
// >> converted: publicKey y 84,83,107,134,47,160,198,102,2,217,148,18,98,139,45,174,90,6,237,195,249,239,132,98,110,5,147,215,96,212,164,89
// >> compress publickey [ 3, 184, 157, 205, 67, 145, 69, 169, 126, 138, 100, 212, 98, 161, 184, 111, 22, 50, 177, 198, 25, 69, 3, 92, 68, 167, 228, 155, 117, 102, 148, 230, 183 ]

const compressedPubKey = new Uint8Array([
  3, 184, 157, 205, 67, 145, 69, 169, 126, 138, 100, 212, 98, 161, 184, 111, 22, 50, 177, 198, 25, 69, 3, 92, 68, 167, 228, 155, 117, 102, 148, 230,
  183,
])

async function handle() {
  const publicKeyHex =
    '04b89dcd439145a97e8a64d462a1b86f1632b1c61945035c44a7e49b756694e6b754536b862fa0c66602d99412628b2dae5a06edc3f9ef84626e0593d760d4a459'
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

  // const tx = new Transaction().add(instruction)

  // const txHash = await provider.sendAndConfirm(tx)

  // console.log('txHash', txHash)

  // console.log('instruction', instruction)
}

async function createWallet() {
  const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from('WALLET'), compressedPubKey], PROGRAM_ID)

  const tx = await program.methods
    .createWallet(Array.from(compressedPubKey))
    .accounts({
      wallet: pda,
      payer: bundler.publicKey,
    })
    .signers([bundler.payer])
    .rpc()

  console.log('tx', tx)
}

// [ 1, 0, 49, 0, 255, 255, 16, 0, 255, 255, 113, 0, 69, 0, 255, 255, 2, 145, 228, 60, 182, 56, 53, 92, 229, 28, 121, 213, 203, 177, 10, 68, 41, 48, 98, 84, 153, 101, 118, 242, 28, 72, 101, 140, 58, 45, 54, 235, 1, 164, 169, 198, 85, 179, 77, 94, 1, 137, 11, 130, 31, 188, 66, 176, 228, 53, 157, 42, 77, 53, 128, 64, 217, 114, 57, 73, 183, 218, 151, 205, 170, 19, 11, 142, 181, 182, 51, 252, 101, 151, 20, 143, 33, 122, 175, 244, 76, 123, 121, 119, 56, 145, 52, 8, 17, 237, 154, 166, 207, 220, 138, 229, 41, 73, 150, 13, 229, 136, 14, 140, 104, 116, 52, 23, 15, 100, 118, 96, 91, 143, 228, 174, 185, 162, 134, 50, 199, 153, 92, 243, 186, 131, 29, 151, 99, 29, 0, 0, 0, 0, 169, 7, 163, 177, 232, 141, 104, 218, 205, 56, 109, 241, 143, 142, 28, 66, 137, 160, 229, 183, 14, 49, 39, 12, 131, 125, 171, 12, 178, 25, 79, 45 ]
// [ 1, 0, 49, 0, 255, 255, 16, 0, 255, 255, 113, 0, 69, 0, 255, 255, 2, 145, 228, 60, 182, 56, 53, 92, 229, 28, 121, 213, 203, 177, 10, 68, 41, 48, 98, 84, 153, 101, 118, 242, 28, 72, 101, 140, 58, 45, 54, 235, 1, 164, 169, 198, 85, 179, 77, 94, 1, 137, 11, 130, 31, 188, 66, 176, 228, 53, 157, 42, 77, 53, 128, 64, 217, 114, 57, 73, 183, 218, 151, 205, 170, 19, 11, 142, 181, 182, 51, 252, 101, 151, 20, 143, 33, 122, 175, 244, 76, 123, 121, 119, 56, 145, 52, 8, 17, 237, 154, 166, 207, 220, 138, 229, 41, 73, 150, 13, 229, 136, 14, 140, 104, 116, 52, 23, 15, 100, 118, 96, 91, 143, 228, 174, 185, 162, 134, 50, 199, 153, 92, 243, 186, 131, 29, 151, 99, 29, 0, 0, 0, 0, 169, 7, 163, 177, 232, 141, 104, 218, 205, 56, 109, 241, 143, 142, 28, 66, 137, 160, 229, 183, 14, 49, 39, 12, 131, 125, 171, 12, 178, 25, 79, 45 ]
// handle()

createWallet()
