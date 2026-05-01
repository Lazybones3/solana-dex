use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use super::common;
use crate::constants;
use crate::state::Pool;

#[derive(Accounts)]
#[instruction(fee: u16)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [
            constants::POOL_AUTH_SEED_PREFIX,
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
            fee.to_le_bytes().as_ref(),
        ],
        bump,
        has_one = mint_a,
        has_one = mint_b,
    )]
    pub pool: Box<Account<'info, Pool>>,

    pub mint_a: Box<InterfaceAccount<'info, Mint>>,
    pub mint_b: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = pool,
    )]
    pub pool_a: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = pool,
    )]
    pub pool_b: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            constants::POOL_MINT_SEED_PREFIX,
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
            fee.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub mint_pool: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = payer,
    )]
    pub payer_a: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = payer,
    )]
    pub payer_b: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_pool,
        associated_token::authority = payer,
    )]
    pub payer_liquidity: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn add_liquidity(
    ctx: Context<AddLiquidity>,
    fee: u16,
    amount_a: u64,
    amount_b: u64,
) -> Result<()> {
    /*
    Calculate user shares to mint
    user shares = user_liquidity / pool_liquidity * supply
    user_liquidity = amount_a + amount_b
    */
    let user_liquidity = amount_a + amount_b;
    let pool_liquidity = ctx.accounts.pool_a.amount + ctx.accounts.pool_b.amount;
    let supply = ctx.accounts.mint_pool.supply;
    msg!("mint_pool supply is {}", supply);
    let shares = if pool_liquidity > 0 {
        user_liquidity * supply / pool_liquidity
    } else {
        user_liquidity
    };

    // Transfer amount_a from user into pool_a
    if amount_a > 0 {
        common::transfer(
            &ctx.accounts.token_program, 
            &ctx.accounts.payer_a, 
            &ctx.accounts.pool_a,
            &ctx.accounts.payer, 
            amount_a
        )?;
    }


    // Transfer amount_b from user into pool_b
    if amount_b > 0 {
        common::transfer(
            &ctx.accounts.token_program,
            &ctx.accounts.payer_b,
            &ctx.accounts.pool_b,
            &ctx.accounts.payer,
            amount_b
        )?;
    }

    // Mint shares to user's associated token account (payer_liquidity)
    if shares > 0 {
        let pool_bump = ctx.bumps.pool;
        let seeds = &[
            constants::POOL_AUTH_SEED_PREFIX,
            &ctx.accounts.mint_a.key().to_bytes(),
            &ctx.accounts.mint_b.key().to_bytes(),
            &fee.to_le_bytes(),
            &[pool_bump],
        ];
        common::mint(
            &ctx.accounts.token_program, 
            &ctx.accounts.mint_pool, 
            &ctx.accounts.payer_liquidity, 
            &ctx.accounts.pool,
            shares, 
            seeds
        )?;
    }

    Ok(())
}
