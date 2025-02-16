import { p256 } from '@noble/curves/p256'
import * as BufferLayout from '@solana/buffer-layout'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
export type CreateSecp256r1InstructionWithPublicKeyParams = {
  publicKey: Uint8Array
  message: Uint8Array
  signature: Uint8Array
}

export const toBuffer = (arr: Buffer | Uint8Array | Array<number>): Buffer => {
  if (Buffer.isBuffer(arr)) {
    return arr
  } else if (arr instanceof Uint8Array) {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
  } else {
    return Buffer.from(arr)
  }
}

export const COMPRESSED_PUBKEY_SERIALIZED_SIZE = 33
export const SIGNATURE_SERIALIZED_SIZE = 64
export const SIGNATURE_OFFSETS_SERIALIZED_SIZE = 14
export const SIGNATURE_OFFSETS_START = 2
export const DATA_START = SIGNATURE_OFFSETS_SERIALIZED_SIZE + SIGNATURE_OFFSETS_START

export const SECP256R1_ORDER: Uint8Array = new Uint8Array([
  0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xbc, 0xe6, 0xfa, 0xad, 0xa7, 0x17, 0x9e, 0x84,
  0xf3, 0xb9, 0xca, 0xc2, 0xfc, 0x63, 0x25, 0x51,
])

export const SECP256R1_ORDER_MINUS_ONE: Uint8Array = new Uint8Array([
  0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xbc, 0xe6, 0xfa, 0xad, 0xa7, 0x17, 0x9e, 0x84,
  0xf3, 0xb9, 0xca, 0xc2, 0xfc, 0x63, 0x25, 0x50,
])

export const SECP256R1_HALF_ORDER: Uint8Array = new Uint8Array([
  0x7f, 0xff, 0xff, 0xff, 0x80, 0x00, 0x00, 0x00, 0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xde, 0x73, 0x7d, 0x56, 0xd3, 0x8b, 0xcf, 0x42,
  0x79, 0xdc, 0xe5, 0x61, 0x7e, 0x31, 0x92, 0xa8,
])

export const FIELD_SIZE = 32

const SECP256R1_INSTRUCTION_LAYOUT = BufferLayout.struct<
  Readonly<{
    numSignatures: number
    signatureOffset: number
    signatureInstructionIndex: number
    publicKeyOffset: number
    publicKeyInstructionIndex: number
    messageDataOffset: number
    messageDataSize: number
    messageInstructionIndex: number

    signature: Uint8Array
    publicKey: Uint8Array
  }>
>([
  BufferLayout.u16('numSignatures'),
  BufferLayout.u16('signatureOffset'),
  BufferLayout.u16('signatureInstructionIndex'),
  BufferLayout.u16('publicKeyOffset'),
  BufferLayout.u16('publicKeyInstructionIndex'),
  BufferLayout.u16('messageDataOffset'),
  BufferLayout.u16('messageDataSize'),
  BufferLayout.u16('messageInstructionIndex'),

  BufferLayout.blob(COMPRESSED_PUBKEY_SERIALIZED_SIZE, 'publicKey'),
  BufferLayout.blob(SIGNATURE_SERIALIZED_SIZE, 'signature'),
])

export type Secp256r1SignatureOffsets = {
  signatureOffset: number
  signatureInstructionIndex: number
  publicKeyOffset: number
  publicKeyInstructionIndex: number
  messageDataOffset: number
  messageDataSize: number
  messageInstructionIndex: number
}

export class Secp256r1 {
  constructor() {}

  static programId: PublicKey = new PublicKey('Secp256r1SigVerify1111111111111111111111111')

  static createInstructionWithPublicKey(params: CreateSecp256r1InstructionWithPublicKeyParams): TransactionInstruction {
    const { publicKey, message, signature } = params

    // Convert DER signature to R and S components
    const { r, s } = derToRS(signature)

    // Create signature array
    const serializedSignature = new Uint8Array(SIGNATURE_SERIALIZED_SIZE)

    // Pad R and S values to 32 bytes
    const paddedR = padToLength(r, FIELD_SIZE)
    const paddedS = padToLength(s, FIELD_SIZE)

    // Copy R and S into signature
    serializedSignature.set(paddedR, 0)
    serializedSignature.set(paddedS, FIELD_SIZE)

    // Check if s > half_order, if so, compute s = order - s
    if (compareUint8Arrays(paddedS, SECP256R1_HALF_ORDER) > 0) {
      const newS = subtractUint8Arrays(SECP256R1_ORDER, paddedS)
      serializedSignature.set(padToLength(newS, FIELD_SIZE), FIELD_SIZE)
    }

    // Convert uncompressed public key to compressed format
    const compressedPubKey = compressPublicKey(publicKey)

    const instructionData = Buffer.alloc(SECP256R1_INSTRUCTION_LAYOUT.span + message.length)

    const numSignatures = 1
    const publicKeyOffset = DATA_START
    const signatureOffset = publicKeyOffset + COMPRESSED_PUBKEY_SERIALIZED_SIZE
    const messageDataOffset = signatureOffset + SIGNATURE_SERIALIZED_SIZE

    SECP256R1_INSTRUCTION_LAYOUT.encode(
      {
        numSignatures,
        signatureOffset,
        signatureInstructionIndex: 65535, // u16::MAX
        publicKeyOffset,
        publicKeyInstructionIndex: 65535, // u16::MAX
        messageDataOffset,
        messageDataSize: message.length,
        messageInstructionIndex: 65535, // u16::MAX

        publicKey: compressedPubKey,
        signature: serializedSignature,
      },
      instructionData as unknown as Uint8Array,
    )

    instructionData.fill(message, SECP256R1_INSTRUCTION_LAYOUT.span)

    return new TransactionInstruction({
      keys: [],
      programId: Secp256r1.programId,
      data: instructionData,
    })
  }
}

function padToLength(array: Uint8Array, length: number): Uint8Array {
  const result = new Uint8Array(length)
  result.set(array, length - array.length)
  return result
}

function compareUint8Arrays(a: Uint8Array, b: Uint8Array): number {
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    const aVal = a[i] as number
    const bVal = b[i] as number
    if (aVal !== bVal) {
      return aVal < bVal ? -1 : 1
    }
  }
  return 0
}

function subtractUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) {
    throw new Error('Arrays must have the same length')
  }

  const result = new Uint8Array(a.length)
  let borrow = 0

  for (let i = a.length - 1; i >= 0; i--) {
    const aVal = a[i] as number
    const bVal = b[i] as number
    let diff = aVal - bVal - borrow
    if (diff < 0) {
      diff += 256
      borrow = 1
    } else {
      borrow = 0
    }
    result[i] = diff
  }

  return result
}

function derToRS(der: Uint8Array): { r: Uint8Array; s: Uint8Array } {
  const signature = p256.Signature.fromDER(der)

  const rBytes = new Uint8Array(32)
  const sBytes = new Uint8Array(32)

  const rHex = signature.r.toString(16).padStart(64, '0')
  const sHex = signature.s.toString(16).padStart(64, '0')

  for (let i = 0; i < 32; i++) {
    rBytes[i] = parseInt(rHex.slice(i * 2, (i + 1) * 2), 16)
    sBytes[i] = parseInt(sHex.slice(i * 2, (i + 1) * 2), 16)
  }

  return { r: rBytes, s: sBytes }
}

function compressPublicKey(uncompressedKey: Uint8Array): Uint8Array {
  if (uncompressedKey.length !== 65) {
    throw new Error('Invalid uncompressed public key length')
  }

  const compressedKey = new Uint8Array(COMPRESSED_PUBKEY_SERIALIZED_SIZE)
  const yCoordinate = uncompressedKey[64]
  if (yCoordinate === undefined) {
    throw new Error('Invalid public key format')
  }
  compressedKey[0] = yCoordinate & 1 ? 0x03 : 0x02
  compressedKey.set(uncompressedKey.slice(1, COMPRESSED_PUBKEY_SERIALIZED_SIZE), 1)

  return compressedKey
}
