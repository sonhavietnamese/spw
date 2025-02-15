import { bufferToHex, toBase64url } from '@passwordless-id/webauthn/dist/esm/utils'
import { isoBase64URL, isoUint8Array, toHash } from '@simplewebauthn/server/helpers'
import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'

const CREATE_CHALLENGE = 'create-passkey'
const SIGN_CHALLENGE = 'hello'

const log = console.log

export default function Attempt04() {
  const create = async () => {
    const username = 's' + Date.now()
    const userID = new Uint8Array(username.split('').map((char) => char.charCodeAt(0)))
    log('Start Registration')

    const challengeBuffer = new TextEncoder().encode(CREATE_CHALLENGE)
    log('challengeBuffer', challengeBuffer)

    const registrationResult = await navigator.credentials.create({
      publicKey: {
        challenge: challengeBuffer,
        rp: {
          name: 'simplewebauthn',
          id: 'localhost',
        },
        user: {
          id: userID,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required',
        },
      },
    })

    log('registrationResult', registrationResult)

    const publicKeyBuffer = registrationResult.response.getPublicKey() as ArrayBuffer
    log('>> raw: publicKey buffer', publicKeyBuffer)
    log('>> raw: publicKey hex 2', bufferToHex(publicKeyBuffer))

    // Format the ASN.1 DER encoded public key
    const bytes = new Uint8Array(publicKeyBuffer)
    const p256Prefix = [0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]
    let keyStart = -1

    for (let i = 0; i < bytes.length - p256Prefix.length; i++) {
      let match = true
      for (let j = 0; j < p256Prefix.length; j++) {
        if (bytes[i + j] !== p256Prefix[j]) {
          match = false
          break
        }
      }
      if (match && bytes[i + p256Prefix.length] === 0x03) {
        keyStart = i + p256Prefix.length
        break
      }
    }

    if (keyStart === -1) {
      console.error('Could not find P-256 key data')
      return
    }

    // Skip the BIT STRING tag and length
    keyStart += 2
    // Skip the leading zero byte
    keyStart += 1

    const rawKeyBytes = bytes.slice(keyStart)
    log('>> converted: publicKey bytes', rawKeyBytes)

    const x = rawKeyBytes.slice(1, 33)
    const y = rawKeyBytes.slice(33, 65)

    log('>> converted: publicKey x', Array.from(x).join(','))
    log('>> converted: publicKey y', Array.from(y).join(','))

    const publicKeyHex = bufferToHex(rawKeyBytes)
    log('>> converted: publicKey hex', publicKeyHex)
  }

  const craftInstruction = async () => {
    const transferAmount = 0.01 // 0.01 SOL

    // Instruction index for the SystemProgram transfer instruction
    const transferInstructionIndex = 2

    // Create a buffer for the data to be passed to the transfer instruction
    const instructionData = Buffer.alloc(4 + 8) // uint32 + uint64
    // Write the instruction index to the buffer
    instructionData.writeUInt32LE(transferInstructionIndex, 0)
    // Write the transfer amount to the buffer
    instructionData.writeBigUInt64LE(BigInt(transferAmount * LAMPORTS_PER_SOL), 4)

    const sender = Keypair.generate()
    const receiver = Keypair.generate()

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: receiver.publicKey, isSigner: false, isWritable: true },
      ],
      programId: SystemProgram.programId,
      data: instructionData,
    })

    await fetch('http://localhost:3501/api/v1/prepare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ix }),
    })

    // Add the transfer instruction to a new transaction
    // const transaction = new Transaction().add(transferInstruction)

    // log('transaction', transaction)
  }

  const sign = async () => {
    log('Start Sign')
    const challengeBuffer = new TextEncoder().encode(SIGN_CHALLENGE)
    log('challengeBuffer', challengeBuffer)

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer,
        rpId: 'localhost',
        userVerification: 'required',
      },
    })

    if (!assertion) {
      console.error('No assertion response')
      return
    }

    log('registrationResult', assertion)
    const signatureBuffer = assertion.response.signature as ArrayBuffer
    log('>> raw: signature buffer', signatureBuffer)
    log('>> raw: signature hex', bufferToHex(signatureBuffer))

    // Authenticator Data
    const authenticatorDataBase64URL = toBase64url(assertion.response.authenticatorData as ArrayBuffer)
    const authDataBuffer = isoBase64URL.toBuffer(authenticatorDataBase64URL)
    log('>> raw: authenticatorData', assertion.response.authenticatorData)
    log('>> raw: authenticatorDataBase64URL', authenticatorDataBase64URL)
    log('>> raw: authDataBuffer', authDataBuffer)

    // Client Data
    const clientDataJSONBase64URL = toBase64url(assertion.response.clientDataJSON as ArrayBuffer)
    const clientDataHash = await toHash(isoBase64URL.toBuffer(clientDataJSONBase64URL))
    log('>> raw: clientDataJSON', assertion.response.clientDataJSON)
    log('>> raw: clientDataJSONBase64URL', clientDataJSONBase64URL)
    log('>> raw: clientDataHash', clientDataHash)

    // Signature
    const signatureBase = isoUint8Array.concat([authDataBuffer, clientDataHash])
    log('>> raw: signature base', signatureBase)
    log('>> raw: signature base hex', bufferToHex(signatureBase))
  }

  return (
    <div className='flex bg-gray-700 w-screen h-screen flex-col  text-white p-10 gap-5'>
      <button className='px-4 py-2 bg-black' onClick={craftInstruction}>
        Craft Instruction
      </button>
      <button className='px-4 py-2 bg-black' onClick={create}>
        Create
      </button>

      <button className='px-4 py-2 bg-black' onClick={sign}>
        Sign
      </button>
    </div>
  )
}
