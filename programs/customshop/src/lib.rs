use anchor_lang::prelude::*;

//declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
declare_id!("7GAzi1mmd9CT3kgV8vL1RbvQJyTNYRjYfuJ7rV42vVoi");


#[program]
pub mod customshop {
    use super::*;

    // pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    //     Ok(())
    // }

    pub fn create_marker(ctx: Context<CreateMarker>, domain: String) -> Result<()> {
     
        let marker = &mut ctx.accounts.marker;
        marker.authority = *ctx.accounts.authority.key;
        marker.created = true;
        Ok(())
    }
}

// #[derive(Accounts)]
// pub struct Initialize {}


// #[account]
// pub struct MarkerSeeds {
//     domain: String,
//     bump: u8,
// }

#[account]
pub struct Marker {
    authority: Pubkey,
    created: bool
}

// validation struct for create marker
#[derive(Accounts)]
#[instruction(domain: String)]
pub struct CreateMarker<'info> {
    #[account(mut)]
    user: Signer<'info>,

    authority: Signer<'info>,

    #[account(init, payer = user, space = 8+32+1, seeds = [b"marker", 
    domain.as_bytes()
    
    ], bump)]
    marker: Account<'info, Marker>,

    system_program: Program<'info, System>,

}

