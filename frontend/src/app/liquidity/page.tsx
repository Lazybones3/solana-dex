"use client";

import { useEffect, useMemo, useState } from "react";

import AddLiquidityDialog from "./add-dialog";
import RemoveLiquidityDialog from "./remove-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getWalletInfo } from "@/lib/amm-client";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { defaultFee, tokenList } from "@/lib/constants";
import { Token } from "@/types/token";

type LiquidityItem = {
  id: string;
  position: string;
  amountA: string;
  amountB: string;
  liquidity: string;
  supply: string;
  tokenA: Token;
  tokenB: Token;
};

const PAGE_SIZE = 5;

export default function LiquidityPage() {
  const [page, setPage] = useState(0);
  const [liquidityItems, setLiquidityItems] = useState<LiquidityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const connection = useConnection();
  const wallet = useAnchorWallet();
  const provider = useMemo(() => {
    if (!wallet) {
      return null;
    }
    return new AnchorProvider(connection.connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
  }, [connection, wallet]);

  const getLiquidity = async (sellToken: Token, buyToken: Token) => {
    if (!provider || !wallet) {
      return null;
    }

    try {
      const liquidity = await getWalletInfo(provider, wallet.publicKey, {
        mintA: sellToken.mint,
        mintB: buyToken.mint,
        fee: defaultFee.toString(),
      });
      if (BigInt(liquidity.shares) > BigInt(0)) {
            return {
              id: `${sellToken.symbol}-${buyToken.symbol}`,
              position: `${sellToken.symbol}/${buyToken.symbol}`,
              amountA: liquidity.amountA,
              amountB: liquidity.amountB,
              liquidity: liquidity.shares,
              supply: liquidity.totalSupply,
              tokenA: sellToken,
              tokenB: buyToken,
            }
          }
    } catch (e) {
      // Pool or ATA might not exist, skip silently for this pair
      console.log("Error fetching liquidity:", e);
    }
    return null;
  };

  const loadLiquidity = async () => {
    if (!provider || !wallet) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const items: LiquidityItem[] = [];

      for (let i = 0; i < tokenList.length; i++) {
        for (let j = i + 1; j < tokenList.length; j++) {
          const sellToken = tokenList[i];
          const buyToken = tokenList[j];
          console.log(
            `Fetching liquidity for ${sellToken.symbol}/${buyToken.symbol}`,
          );
          const liquidity = await getLiquidity(sellToken, buyToken);
          if (liquidity) {
            items.push(liquidity);
          }
          const reverseLiquidity = await getLiquidity(buyToken, sellToken);
          if (reverseLiquidity) {
            items.push(reverseLiquidity);
          }
        }
      }
      setLiquidityItems(items);
    } catch (error) {
      console.error("Failed to fetch liquidity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLiquidity();
  }, [provider, wallet]);

  const totalPages = Math.ceil(liquidityItems.length / PAGE_SIZE);
  const paginatedItems = liquidityItems.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Positions</h1>
        <AddLiquidityDialog onSuccess={loadLiquidity} />
      </div>

      <Card className="border-none shadow-lg bg-white dark:bg-slate-950 rounded-[24px] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-slate-500">Position</TableHead>
                <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-slate-500">Amount</TableHead>
                <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-12 text-muted-foreground border-none"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin size-6 text-primary" />
                      <span className="text-sm font-medium">Loading your positions...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-slate-100 dark:border-slate-900 transition-colors">
                      <TableCell className="py-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {item.position}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                          Liquidity: {item.liquidity}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {item.amountA} <span className="text-[10px] text-slate-400 ml-1">{item.tokenA.symbol}</span>
                          </div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {item.amountB} <span className="text-[10px] text-slate-400 ml-1">{item.tokenB.symbol}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <RemoveLiquidityDialog
                          tokenA={item.tokenA}
                          tokenB={item.tokenB}
                          shares={item.liquidity}
                          onSuccess={loadLiquidity}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedItems.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-12 text-muted-foreground border-none"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-medium">No positions found</span>
                          <span className="text-xs">Your active liquidity positions will appear here.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-900/30">
              <span className="text-xs font-medium text-slate-500">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-lg border-slate-200 dark:border-slate-800"
                  onClick={() => setPage((p: number) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-lg border-slate-200 dark:border-slate-800"
                  onClick={() =>
                    setPage((p: number) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
