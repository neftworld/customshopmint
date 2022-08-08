use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token, Mint, Burn};
declare_id!("5hUjjLKqi5jEMFVgUkz21RwGd6YfQD7uNDHX3GQKcEo6");

#[program]
pub mod customshop {
    use super::*;

    pub fn create_marker(ctx: Context<CreateMarker>, domain: String) -> Result<()> {
        let marker = &mut ctx.accounts.marker;
        marker.authority = *ctx.accounts.authority.key;
        marker.domain = domain;
        marker.mint = ctx.accounts.mint.to_account_info().key();
        Ok(())
    }

    /// this should be called by the current owner to burn both mint and marker
    pub fn burn_marker_and_mint<'info>(ctx: Context<'_, '_, '_, 'info, BurnMarkerAndMint<'info>>, domain: String) -> Result<()> {
        let token_account = &mut ctx.accounts.token_account;
        msg!("burning token");
        let cpi_accounts_burnmint = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };

         let cpi_program = ctx.accounts.token_program.to_account_info();

         let cpi_ctx_burn_mint = CpiContext::new(cpi_program, cpi_accounts_burnmint);

        anchor_spl::token::burn(cpi_ctx_burn_mint, 1);

        Ok(())
    }

      /// when mints are replaced (when old has been burned), this can
      /// be called by anybody
      pub fn burn_marker_only(_ctx: Context<BurnMarker>) -> Result<()> {
        // let marker = &mut ctx.accounts.marker;
        msg!("burning token");

        Ok(())
    }
}

#[account]
pub struct Marker {
    /// 32 
    authority: Pubkey, 
    /// 36 = 32 + 4  -> (32 IS LIMITED BY SEED LENGTH, 4 GIVES THE LENGTH OF THE STRING)
    domain: String, 
    /// 32
    mint: Pubkey
}

// validation struct for create marker
#[derive(Accounts)]
#[instruction(domain: String)]
pub struct CreateMarker<'info> {
    #[account(mut)]
    owner: Signer<'info>,

    authority: Signer<'info>,

    #[account(init, payer = owner, 
        space = 8+32+32+36+32, seeds = [
        b"marker", 
        domain.as_bytes()
        ], bump)]
    marker: Account<'info, Marker>,

    mint: Account<'info, Mint>,

    #[account(
        mut, 
        constraint = token_account.owner == owner.key(),
        constraint = token_account.mint == mint.key(),
        constraint = token_account.amount > 0
       )]
    token_account: Account<'info, TokenAccount>,

    system_program: Program<'info, System>,
}

// validation struct for burning when mint exists - can be called by owner only
#[derive(Accounts)]
#[instruction(domain: String)]
pub struct BurnMarkerAndMint<'info> {
    // #[account(mut)]
    owner: Signer<'info>,

    #[account(mut)]
    mint: Account<'info, Mint>,

    authority: Signer<'info>,

    #[account(
        mut, 
        has_one = authority,
        seeds = [
            b"marker", 
            domain.as_bytes()
        ], 
        close = authority,
        bump)
    ]
    marker: Account<'info, Marker>,

    #[account(
        mut, 
        has_one = owner,
        // authority = marker.authority,
        constraint = token_account.owner == owner.key(),
        constraint = marker.mint == token_account.mint,
        constraint = token_account.amount > 0
        )]
    token_account: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,

    // system_program: Program<'info, System>,
}


// validation struct for burning - can only be called when the mint doesn't exist. signed by authority as a cleanup
// to free up a domain when the associated mint is burned
#[derive(Accounts)]
#[instruction(domain: String)]
pub struct BurnMarker<'info> {
    #[account(mut)]
    authority: Signer<'info>,

    #[account(
        mut, 
        has_one = authority,
        seeds = [
        b"marker", 
        domain.as_bytes()
        ], bump)]
    marker: Account<'info, Marker>,

    token_program: Program<'info, System>,

    system_program: Program<'info, System>,
}


