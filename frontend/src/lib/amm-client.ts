import { AnchorProvider, BN, Idl, Program } from "@coral-xyz/anchor";
import {
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";

import ammIdl from "@/idl/amm.json";

export const AMM_PROGRAM_ID = new PublicKey(ammIdl.address);

const POOL_AUTH_SEED = new TextEncoder().encode("pool_auth");
const POOL_MINT_SEED = new TextEncoder().encode("pool_mint");

export type AmmPoolInput = {
  mintA: string;
  mintB: string;
  fee: string;
};

export type SwapInput = AmmPoolInput & {
  aForB: boolean;
  amountIn: string;
  minAmountOut: string;
};

export type AddLiquidityInput = AmmPoolInput & {
  amountA: string;
  amountB: string;
};

export type RemoveLiquidityInput = AmmPoolInput & {
  shares: string;
  minAmountA: string;
  minAmountB: string;
};

type AmmAccounts = {
  payer: PublicKey;
  pool: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  poolA: PublicKey;
  poolB: PublicKey;
  mintPool: PublicKey;
  payerA: PublicKey;
  payerB: PublicKey;
  payerLiquidity: PublicKey;
  tokenProgram: PublicKey;
  associatedTokenProgram: PublicKey;
  systemProgram: PublicKey;
};

type AnchorMethodBuilder = {
  accountsStrict: (accounts: Record<string, PublicKey>) => {
    rpc: () => Promise<string>;
  };
};

type AnchorMethods = Record<string, (...args: unknown[]) => AnchorMethodBuilder>;

export function parsePublicKey(value: string) {
  try {
    return new PublicKey(value.trim());
  } catch {
    throw new Error(`${value} is not a valid Solana public key.`);
  }
}

export function parseU16(value: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`${value} must be an integer from 0 to 65535.`);
  }

  return parsed;
}

export function parseU64(value: string) {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${value} must be a raw integer amount.`);
  }

  return new BN(trimmed);
}

export function createAmmProgram(provider: AnchorProvider) {
  return new Program(ammIdl as Idl, provider);
}

export function deriveAmmAccounts(input: AmmPoolInput, payer: PublicKey): AmmAccounts {
  const mintA = parsePublicKey(input.mintA);
  const mintB = parsePublicKey(input.mintB);
  const fee = parseU16(input.fee);
  const feeSeed = new Uint8Array([fee & 0xff, (fee >> 8) & 0xff]);

  const [pool] = PublicKey.findProgramAddressSync(
    [POOL_AUTH_SEED, mintA.toBuffer(), mintB.toBuffer(), feeSeed],
    AMM_PROGRAM_ID
  );
  const [mintPool] = PublicKey.findProgramAddressSync(
    [POOL_MINT_SEED, mintA.toBuffer(), mintB.toBuffer(), feeSeed],
    AMM_PROGRAM_ID
  );

  return {
    payer,
    pool,
    mintA,
    mintB,
    poolA: getAssociatedTokenAddressSync(mintA, pool, true),
    poolB: getAssociatedTokenAddressSync(mintB, pool, true),
    mintPool,
    payerA: getAssociatedTokenAddressSync(mintA, payer),
    payerB: getAssociatedTokenAddressSync(mintB, payer),
    payerLiquidity: getAssociatedTokenAddressSync(mintPool, payer),
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
}

export async function sendSwap(
  provider: AnchorProvider,
  payer: PublicKey,
  input: SwapInput
) {
  const program = createAmmProgram(provider);
  const accounts = deriveAmmAccounts(input, payer);

  return program.methods
    .swap(
      parseU16(input.fee),
      input.aForB,
      parseU64(input.amountIn),
      parseU64(input.minAmountOut)
    )
    .accountsStrict(accounts as unknown as Record<string, PublicKey>)
    .rpc();
}

export async function sendAddLiquidity(
  provider: AnchorProvider,
  payer: PublicKey,
  input: AddLiquidityInput
) {
  const program = createAmmProgram(provider);
  const accounts = deriveAmmAccounts(input, payer);

  return (program.methods as AnchorMethods)
    .addLiquidity(
      parseU16(input.fee),
      parseU64(input.amountA),
      parseU64(input.amountB)
    )
    .accountsStrict(accounts as unknown as Record<string, PublicKey>)
    .rpc();
}

export async function sendRemoveLiquidity(
  provider: AnchorProvider,
  payer: PublicKey,
  input: RemoveLiquidityInput
) {
  const program = createAmmProgram(provider);
  const accounts = deriveAmmAccounts(input, payer);
  return program.methods
    .removeLiquidity(
      parseU16(input.fee),
      parseU64(input.shares),
      parseU64(input.minAmountA),
      parseU64(input.minAmountB)
    )
    .accountsStrict(accounts as unknown as Record<string, PublicKey>)
    .rpc();
}

export async function getPoolInfo(
  provider: AnchorProvider,
  payer: PublicKey,
) {
  // const program = createAmmProgram(provider);
  // const accounts = deriveAmmAccounts(input, payer);

  const tokenAccounts = await provider.connection.getTokenAccountsByOwner(
    payer,
    { programId: TOKEN_PROGRAM_ID }
  );
  tokenAccounts.value.forEach((tokenAccount) => {
    const accountData = AccountLayout.decode(tokenAccount.account.data);
    console.log(`${new PublicKey(accountData.mint)}   ${accountData.amount}`);
  })

  // const mintInfo = await program.methods.get_mint_info(accounts.mint_pool).rpc();
  // console.log(mintInfo);
  // return mintInfo;
}

export async function initPool(
  provider: AnchorProvider,
  payer: PublicKey,
  input: AmmPoolInput
) {
  const program = createAmmProgram(provider);
  const accounts = deriveAmmAccounts(input, payer);

  return program.methods
    .initPool(
      parseU16(input.fee),
    )
    .accountsStrict(accounts as unknown as Record<string, PublicKey>)
    .rpc();
}

export async function checkPoolExist(
  provider: AnchorProvider,
  input: AmmPoolInput
) {
  const mintA = parsePublicKey(input.mintA);
  const mintB = parsePublicKey(input.mintB);
  const fee = parseU16(input.fee);
  const feeSeed = new Uint8Array([fee & 0xff, (fee >> 8) & 0xff]);

  // pool account
  const [pool] = PublicKey.findProgramAddressSync(
    [POOL_AUTH_SEED, mintA.toBuffer(), mintB.toBuffer(), feeSeed],
    AMM_PROGRAM_ID
  );
  const accountInfo = await provider.connection.getAccountInfo(pool);

  return accountInfo !== null;
}

export async function getWalletInfo(
  provider: AnchorProvider,
  payer: PublicKey,
  input: {
    mintA: string;
    mintB: string;
    fee: string;
  }
) {
  const mintA = parsePublicKey(input.mintA);
  const mintB = parsePublicKey(input.mintB);
  const fee = parseU16(input.fee);
  const feeSeed = new Uint8Array([fee & 0xff, (fee >> 8) & 0xff]);

  const connection = provider.connection;

  // mint pool
  const [mintPool] = PublicKey.findProgramAddressSync(
    [POOL_MINT_SEED, mintA.toBuffer(), mintB.toBuffer(), feeSeed],
    AMM_PROGRAM_ID
  );
  const lpMint = await getMint(connection, mintPool);

  // pool account
  const [pool] = PublicKey.findProgramAddressSync(
    [POOL_AUTH_SEED, mintA.toBuffer(), mintB.toBuffer(), feeSeed],
    AMM_PROGRAM_ID
  );

  // pool a token account
  const poolA = getAssociatedTokenAddressSync(mintA, pool, true);
  const poolAAccount = await getAccount(connection, poolA);

  // pool b token account
  const poolB = getAssociatedTokenAddressSync(mintB, pool, true);
  const poolBAccount = await getAccount(connection, poolB);

  // lp token account
  const payerLiquidity = getAssociatedTokenAddressSync(mintPool, payer);
  const lpAccount = await getAccount(connection, payerLiquidity);

  const userLpShares = lpAccount.amount;
  const totalLpSupply = lpMint.supply;
  const poolAmountA = poolAAccount.amount;
  const poolAmountB = poolBAccount.amount;

  const amountA =
    totalLpSupply === BigInt(0) ? BigInt(0) : (poolAmountA * userLpShares) / totalLpSupply;

  const amountB =
    totalLpSupply === BigInt(0) ? BigInt(0) : (poolAmountB * userLpShares) / totalLpSupply;

  return {
    shares: userLpShares.toString(),
    totalSupply: totalLpSupply.toString(),
    amountA: amountA.toString(),
    amountB: amountB.toString(),
  };
}

export async function getPayerBalance(
  provider: AnchorProvider,
  payer: PublicKey,
  mintAddress: string,
) {
  const connection = provider.connection;
  const mint = parsePublicKey(mintAddress);

  try {
    // 1. Derive the Associated Token Account (ATA) address for the payer and mint
    const ata = getAssociatedTokenAddressSync(mint, payer);

    // 2. Fetch the account info for that ATA
    const accountInfo = await getAccount(connection, ata);

    // 3. Return the amount as a formatted string with 2 decimal places
    return (Number(accountInfo.amount) / LAMPORTS_PER_SOL).toFixed(2);
  } catch (e) {
    // If the account doesn't exist, the balance is 0
    return 0;
  }
}
