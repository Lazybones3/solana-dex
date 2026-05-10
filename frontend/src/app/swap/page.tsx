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
    <div className="rounded-[28px] border border-black/6 bg-[#f7f7f8] px-6 py-6">
      <label className="text-[1.05rem] font-medium text-slate-700">
        {label}
      </label>

      <div className="mt-3 mb-5 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            className="w-full border-0 bg-transparent text-5xl leading-none font-light tracking-tight text-slate-400 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none"
            value={Number(amount)}
            onChange={(e) => onAmountChange(Number(e.target.value))}
          />
        </div>

        <NativeSelect
          value={selectedToken.symbol.toLowerCase()}
          className="shrink-0 [&_select]:h-auto [&_select]:w-auto [&_select]:border-0 [&_select]:bg-transparent [&_select]:py-0 [&_select]:pr-6 [&_select]:pl-0 [&_select]:text-2xl [&_select]:font-semibold [&_select]:text-slate-900 [&_select]:focus-visible:border-transparent [&_select]:focus-visible:ring-0 [&_svg]:right-0 [&_svg]:size-5 [&_svg]:text-slate-500"
          onChange={(e) => {
            const token = options.find(
              (t) => t.symbol.toLowerCase() === e.target.value.toLowerCase(),
            );
            console.log(token);
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

      <div className="flex items-center justify-end text-[1.05rem] text-slate-600">
        <span>
          {balance} {selectedToken.symbol.toLowerCase()}
        </span>
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
    <Card className="mx-auto w-full max-w-xl rounded-[32px] py-0">
      <CardContent className="p-3">
        <div className="relative">
          <div className="space-y-1.5">
            <SwapSection
              label="Sell"
              selectedToken={sellToken}
              balance={walletBalance.balanceA}
              onTokenChange={setSellToken}
              options={sellOptions}
              amount={sellAmount}
              onAmountChange={setSellAmount}
            />
            <SwapSection
              label="Buy"
              selectedToken={buyToken}
              balance={walletBalance.balanceB}
              onTokenChange={setBuyToken}
              options={buyOptions}
              amount={buyAmount}
              onAmountChange={setBuyAmount}
            />
          </div>

          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
            <button
              onClick={handleSwitchTokens}
              className="group flex size-14 items-center justify-center rounded-2xl border border-black/5 bg-[#f3f3f4] text-slate-900 shadow-sm transition-all hover:bg-white active:scale-95"
            >
              <ArrowDown className="size-7 transition-transform" />
            </button>
          </div>
        </div>

        <Button
          className="mt-1.5 h-16 w-full rounded-[24px] bg-[#ff38c7] text-[1.15rem] font-semibold text-white shadow-none hover:bg-[#f429bc]"
          onClick={handleSwapClick}
        >
          Swap
        </Button>
      </CardContent>
    </Card>
  );
}
