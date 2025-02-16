use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::Instruction,
    sysvar::instructions::{load_instruction_at_checked, ID as IX_ID},
};
use solana_feature_set::FeatureSet;
use solana_secp256r1_program::verify;

declare_id!("7H8vjmfu5v5ou2RhTXDMbi5zp6JyQC744h8vwoPWjtNt");

#[program]
pub mod spw {

    use super::*;

    pub fn create_wallet(ctx: Context<CreateWallet>, pubkey: [u8; 33]) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        wallet.pubkey = pubkey;
        wallet.bump = ctx.bumps.wallet;

        Ok(())
    }

    pub fn execute(ctx: Context<Execute>, pubkey: [u8; 33]) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;

        require!(wallet.pubkey == pubkey, SpwError::NotAuthorized);

        let ix: Instruction = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar)?;

        require!(
            verify(&ix.data, &[], &FeatureSet::all_enabled()).is_ok(),
            SpwError::InvalidSignature
        );

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
