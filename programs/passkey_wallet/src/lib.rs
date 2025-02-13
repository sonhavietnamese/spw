use anchor_lang::prelude::*;

declare_id!("FXrwbz22nusEEic4Z188VYwk9gjwHvHHHgSJ34gJ1pwn");

#[program]
pub mod vault_factory {
    use super::*;

    pub fn create_vault(ctx: Context<CreateVault>, x: u64, y: u64) -> Result<()> {
        // Initialize the vault's data
        let vault = &mut ctx.accounts.vault;
        vault.x = x;
        vault.y = y;

        Ok(())
    }

    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
        ctx.accounts.vault.sub_lamports(amount)?;
        ctx.accounts.recipient.add_lamports(amount)?;

        Ok(())
    }
}

#[account]
pub struct Vault {
    pub x: u64,
    pub y: u64,
}

#[derive(Accounts)]
pub struct CreateVault<'info> {
    /// The program pays for the vault creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The vault PDA account with data
    #[account(
        init,
        seeds = [b"VAULT", authority.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + 8 + 8  // discriminator + x + y
    )]
    pub vault: Account<'info, Vault>,

    /// The authority (signer) for the vault
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Transfer<'info> {
    /// The vault PDA account
    #[account(
        mut,
        seeds = [b"VAULT", authority.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    /// The authority (signer) for the vault
    pub authority: Signer<'info>,

    /// The recipient of the transfer
    #[account(mut)]
    pub recipient: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
