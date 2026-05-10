"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { getPayerBalance, getWalletInfo, sendSwap } from "@/lib/amm-client";
import { defaultFee, tokenList } from "@/lib/constants";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { ArrowDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Token } from "@/types/token";

type SwapSectionProps = {
  label: string;
  selectedToken: Token;
  balance: number;
  onTokenChange: (token: Token) => void;
  options: typeof tokenList;
  amount: number;
  onAmountChange: (amount: number) => void;
};

type WalletBalance = {
  balanceA: number;
  balanceB: number;
};

function SwapSection({
  label,
  selectedToken,
  balance,
  onTokenChange,
  options,
  amount,
  onAmountChange,
}: SwapSectionProps) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-4 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </label>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Balance: {balance} {selectedToken.symbol}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          className="flex-1 bg-transparent text-3xl font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
          placeholder="0"
          value={amount || ""}
          onChange={(e) => onAmountChange(Number(e.target.value))}
        />

        <NativeSelect
          value={selectedToken.symbol.toLowerCase()}
          className="shrink-0 [&_select]:h-10 [&_select]:w-auto [&_select]:border-none [&_select]:bg-slate-200/50 dark:[&_select]:bg-slate-800/50 [&_select]:rounded-full [&_select]:px-4 [&_select]:text-sm [&_select]:font-bold [&_select]:focus-visible:ring-0 [&_svg]:right-2 [&_svg]:size-4"
          onChange={(e) => {
            const token = options.find(
              (t) => t.symbol.toLowerCase() === e.target.value.toLowerCase(),
            );
            if (token) onTokenChange(token);
          }}
        >
          {options.map((token) => (
            <NativeSelectOption
              key={token.symbol}
              value={token.symbol.toLowerCase()}
            >
              {token.symbol}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}

export default function SwapPage() {
  const [sellAmount, setSellAmount] = useState<number>(0);
  const [buyAmount, setBuyAmount] = useState<number>(0);
  const [sellToken, setSellToken] = useState<Token>(tokenList[0]);
  const [buyToken, setBuyToken] = useState<Token>(tokenList[1]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance>({
    balanceA: 0,
    balanceB: 0,
  });

  const sellOptions = tokenList.filter(
    (token) => token.symbol !== buyToken.symbol,
  );
  const buyOptions = tokenList.filter(
    (token) => token.symbol !== sellToken.symbol,
  );

  const wallet = useAnchorWallet();
  const connection = useConnection();

  const provider = useMemo(() => {
    if (!wallet) {
      return null;
    }

    return new AnchorProvider(connection.connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
  }, [connection, wallet]);

  const handleSwapClick = async () => {
    if (!provider || !wallet?.publicKey) {
      toast.error("Connect a wallet before swapping.");
      return;
    }

    try {
      await sendSwap(provider, wallet.publicKey, {
        aForB: true,
        amountIn: sellAmount.toString(),
        minAmountOut: buyAmount.toString(),
        mintA: sellToken.mint!,
        mintB: buyToken.mint!,
        fee: defaultFee.toString(),
      });
      toast.success("Swap successful!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unknown swap error.",
      );
    }
  };

  const handleSwitchTokens = async() => {
    setSellToken(buyToken);
    setBuyToken(sellToken);
    setSellAmount(buyAmount);
    setBuyAmount(sellAmount);
    await loadWallet();
  };

  const loadWallet = async () => {
    if (!provider || !wallet) {
      return;
    }
    const sellBalance = await getPayerBalance(provider, wallet.publicKey, sellToken.mint!);
    const buyBalance = await getPayerBalance(provider, wallet.publicKey, buyToken.mint!);

    setWalletBalance({
      balanceA: Number(sellBalance),
      balanceB: Number(buyBalance),
    });
  }

  useEffect(() => {
    loadWallet();
  }, [provider, wallet, sellToken, buyToken]);

  return (
    <Card className="w-full border-none shadow-xl bg-white dark:bg-slate-950 rounded-[24px]">
      <CardContent className="p-2 flex flex-col gap-1">
        <div className="relative flex flex-col gap-1">
          <SwapSection
            label="You pay"
            selectedToken={sellToken}
            balance={walletBalance.balanceA}
            onTokenChange={setSellToken}
            options={sellOptions}
            amount={sellAmount}
            onAmountChange={setSellAmount}
          />
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button
              onClick={handleSwitchTokens}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md hover:scale-110 transition-transform group"
            >
              <ArrowDown className="size-4 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors" />
            </button>
          </div>

          <SwapSection
            label="You receive"
            selectedToken={buyToken}
            balance={walletBalance.balanceB}
            onTokenChange={setBuyToken}
            options={buyOptions}
            amount={buyAmount}
            onAmountChange={setBuyAmount}
          />
        </div>

        <Button
          className="w-full h-14 mt-1 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20"
          onClick={handleSwapClick}
        >
          Swap
        </Button>
      </CardContent>
    </Card>
  );
}
