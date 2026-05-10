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
    <div className="flex flex-col gap-6 px-3 py-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Liquidity</h1>
        <AddLiquidityDialog onSuccess={loadLiquidity} />
      </div>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Liquidity</TableHead>
                <TableHead>Supply</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin size-4" />
                      Loading positions...
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.position}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {item.amountA}
                        </span>
                        <span className="mx-1">/</span>
                        <span className="text-muted-foreground">
                          {item.amountB}
                        </span>
                      </TableCell>
                      <TableCell>{item.liquidity}</TableCell>
                      <TableCell>{item.supply}</TableCell>
                      <TableCell className="text-right">
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
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No positions found.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((p: number) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
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
