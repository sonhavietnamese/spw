export type Secp256r1SignatureOffsets = {
  signatureOffset: number
  signatureInstructionIndex: number
  publicKeyOffset: number
  publicKeyInstructionIndex: number
  messageDataOffset: number
  messageDataSize: number
  messageInstructionIndex: number
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

export async function newInstruction(): Promise<Uint8Array> {
  const publicKeyHex =
    '04cdfc52917e67195204e0a5a218d12cd2e32b7caceb977e200c92022f3f6952ebf96c869d3450803eecfda119a2a1aaf1cc7a8d336c4800f068135eaafa2091ab'
  const signatureHex =
    '304402202e18b2d789ede3626c804f6248224d17b3a9c007bcf5f896f16183ea30b3fa490220026b72e98d41718b1cb1b259382e7903d3836f8632a0978d9cc6a9ffd689b855' // from passkey (webauthn)
  const messageHex =
    '49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000a907a3b1e88d68dacd386df18f8e1c4289a0e5b70e31270c837dab0cb2194f2d' // "hello" in hex

  // Convert hex strings to Uint8Arrays
  const message = hexToUint8Array(messageHex)
  const publicKeyBytes = hexToUint8Array(publicKeyHex)
  const signatureBytes = hexToUint8Array(signatureHex)

  // Convert DER signature to R and S components
  const { r, s } = derToRS(signatureBytes)

  // Create signature array
  const signature = new Uint8Array(SIGNATURE_SERIALIZED_SIZE)

  // Pad R and S values to 32 bytes
  const paddedR = padToLength(r, FIELD_SIZE)
  const paddedS = padToLength(s, FIELD_SIZE)

  // Copy R and S into signature
  signature.set(paddedR, 0)
  signature.set(paddedS, FIELD_SIZE)

  // Check if s > half_order, if so, compute s = order - s
  if (compareUint8Arrays(paddedS, SECP256R1_HALF_ORDER) > 0) {
    const newS = subtractUint8Arrays(SECP256R1_ORDER, paddedS)
    signature.set(padToLength(newS, FIELD_SIZE), FIELD_SIZE)
  }

  // Convert uncompressed public key to compressed format
  const compressedPubKey = compressPublicKey(publicKeyBytes)

  // Create instruction data
  const instructionData = new Uint8Array(DATA_START + SIGNATURE_SERIALIZED_SIZE + COMPRESSED_PUBKEY_SERIALIZED_SIZE + message.length)

  const numSignatures = 1
  const publicKeyOffset = DATA_START
  const signatureOffset = publicKeyOffset + COMPRESSED_PUBKEY_SERIALIZED_SIZE
  const messageDataOffset = signatureOffset + SIGNATURE_SERIALIZED_SIZE

  // Write number of signatures
  instructionData[0] = numSignatures
  instructionData[1] = 0

  // Create and write offsets
  const offsets: Secp256r1SignatureOffsets = {
    signatureOffset,
    signatureInstructionIndex: 65535, // u16::MAX
    publicKeyOffset,
    publicKeyInstructionIndex: 65535,
    messageDataOffset,
    messageDataSize: message.length,
    messageInstructionIndex: 65535,
  }

  // Write offsets, compressed public key, signature, and message
  writeOffsets(instructionData, offsets, SIGNATURE_OFFSETS_START)
  instructionData.set(compressedPubKey, publicKeyOffset)
  instructionData.set(signature, signatureOffset)
  instructionData.set(message, messageDataOffset)

  return instructionData
}

// Helper functions

function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g)
  if (!matches) {
    throw new Error('Invalid hex string')
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)))
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
  // Simple DER parser - assumes valid DER format
  let offset = 2 // Skip sequence tag and length

  // Get R value
  offset++ // Skip integer tag
  const rLen = der[offset++]
  if (rLen === undefined) {
    throw new Error('Invalid DER format: R length not found')
  }
  const r = der.slice(offset, offset + rLen)
  offset += rLen

  // Get S value
  offset++ // Skip integer tag
  const sLen = der[offset++]
  if (sLen === undefined) {
    throw new Error('Invalid DER format: S length not found')
  }
  const s = der.slice(offset, offset + sLen)

  return { r, s }
}

function compressPublicKey(uncompressedKey: Uint8Array): Uint8Array {
  if (uncompressedKey.length !== 65) {
    throw new Error('Invalid uncompressed public key length')
  }

  // Assuming uncompressed key starts with 0x04 and is 65 bytes
  const compressedKey = new Uint8Array(33)
  // Set prefix to 0x02 or 0x03 depending on y-coordinate's least significant bit
  const yCoordinate = uncompressedKey[64]
  if (yCoordinate === undefined) {
    throw new Error('Invalid public key format')
  }
  compressedKey[0] = yCoordinate & 1 ? 0x03 : 0x02
  // Copy x-coordinate
  compressedKey.set(uncompressedKey.slice(1, 33), 1)
  return compressedKey
}

function writeOffsets(data: Uint8Array, offsets: Secp256r1SignatureOffsets, offset: number): void {
  if (!data.buffer) {
    throw new Error('Invalid Uint8Array: buffer is undefined')
  }
  const view = new DataView(data.buffer, data.byteOffset + offset)
  view.setUint16(0, offsets.signatureOffset, true)
  view.setUint16(2, offsets.signatureInstructionIndex, true)
  view.setUint16(4, offsets.publicKeyOffset, true)
  view.setUint16(6, offsets.publicKeyInstructionIndex, true)
  view.setUint16(8, offsets.messageDataOffset, true)
  view.setUint16(10, offsets.messageDataSize, true)
  view.setUint16(12, offsets.messageInstructionIndex, true)
}
