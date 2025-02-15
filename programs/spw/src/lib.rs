use anchor_lang::prelude::*;

declare_id!("7H8vjmfu5v5ou2RhTXDMbi5zp6JyQC744h8vwoPWjtNt");

#[program]
pub mod spw {
    use super::*;

    pub fn create_wallet(ctx: Context<CreateWallet>, r: u64, s: u64) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        wallet.r = r;
        wallet.s = s;

        Ok(())
    }

    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
        ctx.accounts.wallet.sub_lamports(amount)?;
        ctx.accounts.recipient.add_lamports(amount)?;

        Ok(())
    }
}

#[account]
pub struct Wallet {
    pub r: u64,
    pub s: u64,
}

#[derive(Accounts)]
pub struct CreateWallet<'info> {
    /// The program pays for the vault creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The vault PDA account with data
    #[account(
        init,
        seeds = [b"WALLET", authority.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + 8 + 8 
    )]
    pub wallet: Account<'info, Wallet>,

    /// The authority (signer) for the vault
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Transfer<'info> {
    /// The vault PDA account
    #[account(
        mut,
        seeds = [b"WALLET", authority.key().as_ref()],
        bump,
    )]
    pub wallet: Account<'info, Wallet>,

    /// The authority (signer) for the vault
    pub authority: Signer<'info>,

    /// The recipient of the transfer
    #[account(mut)]
    pub recipient: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
