use anchor_lang::prelude::*;

//declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
declare_id!("7GAzi1mmd9CT3kgV8vL1RbvQJyTNYRjYfuJ7rV42vVoi");


#[program]
pub mod customshop {
    use super::*;

    pub fn create_marker(ctx: Context<CreateMarker>, domain: String) -> Result<()> {
        let marker = &mut ctx.accounts.marker;
        marker.authority = *ctx.accounts.authority.key;
        marker.linkedWallet = *ctx.accounts.user.key;
        marker.domain = domain;
        marker.created = true;
        Ok(())
    }

    pub fn update_linked_wallet(ctx: Context<UpdateMarker>, domain: String) -> Result<()> {
        let marker = &mut ctx.accounts.marker;
        msg!("{}", *ctx.accounts.user.key);
        marker.linkedWallet = *ctx.accounts.user.key;
        Ok(())
    }
}

#[account]
pub struct Marker {
    authority: Pubkey, /// 32 
    linkedWallet: Pubkey, /// 32
    domain: String, /// 36 = 32 + 4  -> (32 IS LIMITED BY SEED LENGTH, 4 GIVES THE LENGTH OF THE STRING)
    created: bool 
}

// validation struct for create marker
#[derive(Accounts)]
#[instruction(domain: String)]
pub struct CreateMarker<'info> {
    #[account(mut)]
    user: Signer<'info>,

    authority: Signer<'info>,

    #[account(init, payer = user, 
        space = 8+32+32+36+1, seeds = [
        b"marker", 
        domain.as_bytes()
        ], bump)]
    marker: Account<'info, Marker>,
    system_program: Program<'info, System>,
}

// validation struct for create marker
#[derive(Accounts)]
#[instruction(domain: String)]
pub struct UpdateMarker<'info> {
    #[account(mut)]
    user: Signer<'info>,

    authority: Signer<'info>,

    #[account(
        mut, 
        has_one = authority,
        seeds = [
        b"marker", 
        domain.as_bytes()
        ], bump)]
    marker: Account<'info, Marker>,
    system_program: Program<'info, System>,
}


