use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use super::common;
use crate::constants;
use crate::error;
use crate::state::Pool;

#[derive(Accounts)]
#[instruction(fee: u16)]
pub struct Swap<'info> {
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

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn swap(
    ctx: Context<Swap>,
    fee: u16,
    a_for_b: bool,
    amount_in: u64,
    min_amount_out: u64,
) -> Result<()> {
    // Calculate amount out with fee
    // amount_out = amount_in * (1 - fee)
    let mut amount_out = amount_in;
    let amount_out_fee = amount_out * fee as u64 / constants::MAX_POOL_FEE as u64;
    amount_out -= amount_out_fee;

    // Check amount_out >= min_amount_out
    require!(amount_out >= min_amount_out, error::Error::MinAmountOut);

    let (pool_in, pool_out, payer_in, payer_out) = if a_for_b {
        (
            &ctx.accounts.pool_a,
            &ctx.accounts.pool_b,
            &ctx.accounts.payer_a,
            &ctx.accounts.payer_b,
        )
    } else {
        (
            &ctx.accounts.pool_b,
            &ctx.accounts.pool_a,
            &ctx.accounts.payer_b,
            &ctx.accounts.payer_a,
        )
    };

    // Transfer token in from user to pool
    common::transfer(
        &ctx.accounts.token_program,
        payer_in,
        pool_in,
        &ctx.accounts.payer,
        amount_in,
    )?;

    // Transfer token out from pool to user
    let pool_bump = ctx.bumps.pool;
    let seeds = &[
        constants::POOL_AUTH_SEED_PREFIX,
        &ctx.accounts.mint_a.key().to_bytes(),
        &ctx.accounts.mint_b.key().to_bytes(),
        &fee.to_le_bytes(),
        &[pool_bump],
    ];
    common::transfer_from_pool(
        &ctx.accounts.token_program,
        pool_out,
        payer_out,
        &ctx.accounts.pool,
        amount_out,
        seeds,
    )?;

    Ok(())
}
