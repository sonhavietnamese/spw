use anchor_lang::prelude::*;

declare_id!("7H8vjmfu5v5ou2RhTXDMbi5zp6JyQC744h8vwoPWjtNt");

#[program]
pub mod spw {
    use super::*;

    pub fn create_wallet(ctx: Context<CreateWallet>, x: Vec<u8>, y: Vec<u8>) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        wallet.x = x;
        wallet.y = y;

        // TODO: validate x and y

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
    pub x: Vec<u8>,
    pub y: Vec<u8>,
}

#[derive(Accounts)]
#[instruction(x: Vec<u8>, y: Vec<u8>)]
pub struct CreateWallet<'info> {
    /// The program pays for the vault creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The vault PDA account with data
    #[account(
        init,
        payer = payer,
        space = 8 + 4 + 1 * 32 + 4 + 1 * 32,
        seeds = [b"WALLET", x.as_slice(), y.as_slice()],
        bump,
    )]
    pub wallet: Account<'info, Wallet>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Transfer<'info> {
    /// The vault PDA account
    #[account(mut)]
    pub wallet: Account<'info, Wallet>,

    /// The authority (signer) for the vault
    pub authority: Signer<'info>,

    /// The recipient of the transfer
    #[account(mut)]
    pub recipient: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
