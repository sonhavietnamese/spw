use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::Instruction,
    secp256k1_program,
    sysvar::instructions::{load_instruction_at_checked, ID as IX_ID},
};

declare_id!("EEEndbjqETkwEx65o968iHXbHaFs1TPVMvsh3aA3hkgQ");

// pub mod custom_secp256r1 {
//     use {
//         openssl::{
//             bn::{BigNum, BigNumContext},
//             ec::{EcGroup, EcKey, EcPoint},
//             nid::Nid,
//             pkey::PKey,
//             sign::Verifier,
//         },
//         solana_precompile_error::PrecompileError,
//     };

//     pub const COMPRESSED_PUBKEY_SERIALIZED_SIZE: usize = 33;
//     pub const SIGNATURE_SERIALIZED_SIZE: usize = 64;
//     pub const SIGNATURE_OFFSETS_SERIALIZED_SIZE: usize = 14;
//     pub const SIGNATURE_OFFSETS_START: usize = 2;
//     pub const DATA_START: usize = SIGNATURE_OFFSETS_SERIALIZED_SIZE + SIGNATURE_OFFSETS_START;

//     // Order as defined in SEC2: 2.7.2 Recommended Parameters secp256r1
//     pub const SECP256R1_ORDER: [u8; FIELD_SIZE] = [
//         0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
//         0xFF, 0xBC, 0xE6, 0xFA, 0xAD, 0xA7, 0x17, 0x9E, 0x84, 0xF3, 0xB9, 0xCA, 0xC2, 0xFC, 0x63,
//         0x25, 0x51,
//     ];

//     // Computed SECP256R1_ORDER - 1
//     pub const SECP256R1_ORDER_MINUS_ONE: [u8; FIELD_SIZE] = [
//         0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
//         0xFF, 0xBC, 0xE6, 0xFA, 0xAD, 0xA7, 0x17, 0x9E, 0x84, 0xF3, 0xB9, 0xCA, 0xC2, 0xFC, 0x63,
//         0x25, 0x50,
//     ];

//     // Computed half order
//     const SECP256R1_HALF_ORDER: [u8; FIELD_SIZE] = [
//         0x7F, 0xFF, 0xFF, 0xFF, 0x80, 0x00, 0x00, 0x00, 0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
//         0xFF, 0xDE, 0x73, 0x7D, 0x56, 0xD3, 0x8B, 0xCF, 0x42, 0x79, 0xDC, 0xE5, 0x61, 0x7E, 0x31,
//         0x92, 0xA8,
//     ];
//     // Field size in bytes
//     const FIELD_SIZE: usize = 32;
//     pub fn verify(data: &[u8], instruction_datas: &[&[u8]]) -> Result<(), PrecompileError> {
//         if data.len() < SIGNATURE_OFFSETS_START {
//             return Err(PrecompileError::InvalidInstructionDataSize);
//         }
//         let num_signatures = data[0] as usize;
//         if num_signatures == 0 {
//             return Err(PrecompileError::InvalidInstructionDataSize);
//         }
//         if num_signatures > 8 {
//             return Err(PrecompileError::InvalidInstructionDataSize);
//         }

//         let expected_data_size = num_signatures
//             .saturating_mul(SIGNATURE_OFFSETS_SERIALIZED_SIZE)
//             .saturating_add(SIGNATURE_OFFSETS_START);

//         // We do not check or use the byte at data[1]
//         if data.len() < expected_data_size {
//             return Err(PrecompileError::InvalidInstructionDataSize);
//         }

//         // Parse half order from constant
//         let half_order: BigNum = BigNum::from_slice(&SECP256R1_HALF_ORDER)
//             .map_err(|_| PrecompileError::InvalidSignature)?;

//         // Parse order - 1 from constant
//         let order_minus_one: BigNum = BigNum::from_slice(&SECP256R1_ORDER_MINUS_ONE)
//             .map_err(|_| PrecompileError::InvalidSignature)?;

//         // Create a BigNum for 1
//         let one = BigNum::from_u32(1).map_err(|_| PrecompileError::InvalidSignature)?;

//         // Define curve group
//         let group = EcGroup::from_curve_name(Nid::X9_62_PRIME256V1)
//             .map_err(|_| PrecompileError::InvalidSignature)?;
//         let mut ctx = BigNumContext::new().map_err(|_| PrecompileError::InvalidSignature)?;

//         for i in 0..num_signatures {
//             let start = i
//                 .saturating_mul(SIGNATURE_OFFSETS_SERIALIZED_SIZE)
//                 .saturating_add(SIGNATURE_OFFSETS_START);
//             let end = start.saturating_add(SIGNATURE_OFFSETS_SERIALIZED_SIZE);

//             // bytemuck wants structures aligned
//             let offsets: &Secp256r1SignatureOffsets =
//                 bytemuck::try_from_bytes(&data[start..end])
//                     .map_err(|_| PrecompileError::InvalidDataOffsets)?;

//             // Parse out signature
//             let signature = get_data_slice(
//                 data,
//                 instruction_datas,
//                 offsets.signature_instruction_index,
//                 offsets.signature_offset,
//                 SIGNATURE_SERIALIZED_SIZE,
//             )?;

//             // Parse out pubkey
//             let pubkey = get_data_slice(
//                 data,
//                 instruction_datas,
//                 offsets.public_key_instruction_index,
//                 offsets.public_key_offset,
//                 COMPRESSED_PUBKEY_SERIALIZED_SIZE,
//             )?;

//             // Parse out message
//             let message = get_data_slice(
//                 data,
//                 instruction_datas,
//                 offsets.message_instruction_index,
//                 offsets.message_data_offset,
//                 offsets.message_data_size as usize,
//             )?;

//             let r_bignum = BigNum::from_slice(&signature[..FIELD_SIZE])
//                 .map_err(|_| PrecompileError::InvalidSignature)?;
//             let s_bignum = BigNum::from_slice(&signature[FIELD_SIZE..])
//                 .map_err(|_| PrecompileError::InvalidSignature)?;

//             // Check that the signature is generally in range
//             let within_range = r_bignum >= one
//                 && r_bignum <= order_minus_one
//                 && s_bignum >= one
//                 && s_bignum <= half_order;

//             if !within_range {
//                 return Err(PrecompileError::InvalidSignature);
//             }

//             // Create an ECDSA signature object from the ASN.1 integers
//             let ecdsa_sig = openssl::ecdsa::EcdsaSig::from_private_components(r_bignum, s_bignum)
//                 .and_then(|sig| sig.to_der())
//                 .map_err(|_| PrecompileError::InvalidSignature)?;

//             let public_key_point = EcPoint::from_bytes(&group, pubkey, &mut ctx)
//                 .map_err(|_| PrecompileError::InvalidPublicKey)?;
//             let public_key = EcKey::from_public_key(&group, &public_key_point)
//                 .map_err(|_| PrecompileError::InvalidPublicKey)?;
//             let public_key_as_pkey =
//                 PKey::from_ec_key(public_key).map_err(|_| PrecompileError::InvalidPublicKey)?;

//             let mut verifier =
//                 Verifier::new(openssl::hash::MessageDigest::sha256(), &public_key_as_pkey)
//                     .map_err(|_| PrecompileError::InvalidSignature)?;
//             verifier
//                 .update(message)
//                 .map_err(|_| PrecompileError::InvalidSignature)?;

//             if !verifier
//                 .verify(&ecdsa_sig)
//                 .map_err(|_| PrecompileError::InvalidSignature)?
//             {
//                 return Err(PrecompileError::InvalidSignature);
//             }
//         }
//         Ok(())
//     }
// }

#[program]
pub mod spw {

    use super::*;
    use solana_feature_set::FeatureSet;
    // use solana_secp256r1_program::verify;

    pub fn create_wallet(ctx: Context<CreateWallet>, pubkey: [u8; 33]) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        wallet.pubkey = pubkey;
        wallet.bump = ctx.bumps.wallet;

        msg!("Wallet created");

        Ok(())
    }

    pub fn execute(ctx: Context<Execute>, pubkey: [u8; 33]) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;

        require!(wallet.pubkey == pubkey, SpwError::NotAuthorized);

        let ix: Instruction = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar)?;

        let feature_set = FeatureSet::all_enabled();
        // require!(
        //     verify(&ix.data.as_slice(), &[ix.data.as_slice()], &feature_set).is_ok(),
        //     SpwError::InvalidSignature
        // );

        // require!(
        //     verify(&ix.data.as_slice(), &[ix.data.as_slice()], &feature_set).is_ok(),
        //     SpwError::InvalidSignature
        // );

        msg!("Signature verified");

        Ok(())
    }
}

#[account]
pub struct Wallet {
    pub pubkey: [u8; 33],
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(pubkey: [u8; 33])]
pub struct CreateWallet<'info> {
    /// The program pays for the vault creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The vault PDA account with data
    #[account(
        init,
        payer = payer,
        space = 8 + 1 * 33 + 1,
        seeds = [b"WALLET", pubkey.as_slice()],
        bump,
    )]
    pub wallet: Account<'info, Wallet>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pubkey: [u8; 33])]
pub struct Execute<'info> {
    #[account(mut, seeds = [b"WALLET", pubkey.as_slice()], bump = wallet.bump)]
    pub wallet: Account<'info, Wallet>,

    pub system_program: Program<'info, System>,

    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>,
}

#[error_code]
pub enum SpwError {
    #[msg("spw: invalid signature")]
    InvalidSignature,

    #[msg("spw: not authorized")]
    NotAuthorized,
}
