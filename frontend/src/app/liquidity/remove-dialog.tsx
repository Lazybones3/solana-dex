import { useMemo, useState } from "react";
import { sendRemoveLiquidity } from "@/lib/amm-client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Token } from "@/types/token";
import { defaultFee } from "@/lib/constants";
import { toast } from "sonner";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function RemoveLiquidityDialog({
  tokenA,
  tokenB,
  shares,
  onSuccess,
}: {
  tokenA: Token;
  tokenB: Token;
  shares: string;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawParams, setWithdrawParams] = useState({
    minAmountA: "0",
    minAmountB: "0",
    shares: "0",
  });
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

  const handleRemoveLiquidity = async () => {
    if (!provider || !wallet) {
      return;
    }

    try {
      setIsSubmitting(true);
      await sendRemoveLiquidity(provider, wallet.publicKey, {
        mintA: tokenA.mint,
        mintB: tokenB.mint,
        fee: defaultFee.toString(),
        shares: withdrawParams.shares,
        minAmountA: withdrawParams.minAmountA,
        minAmountB: withdrawParams.minAmountB,
      });

      toast.success(`Removed liquidity for ${tokenA.symbol}/${tokenB.symbol}`);
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Remove liquidity failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove Liquidity</DialogTitle>
        </DialogHeader>
        <FieldGroup>
            <Field>
                <FieldLabel htmlFor="token-a">
                    {tokenA.symbol}
                </FieldLabel>
                <Input
                    id="token-a"
                    type="number"
                    placeholder="0.00"
                    required
                    min={0}
                    value={withdrawParams.minAmountA}
                    onChange={(e) => setWithdrawParams({ ...withdrawParams, minAmountA: e.target.value })}
                />
            </Field>
            <Field>
                <FieldLabel htmlFor="token-b">
                    {tokenB.symbol}
                </FieldLabel>
                <Input
                    id="token-b"
                    type="number"
                    placeholder="0.00"
                    required
                    min={0}
                    value={withdrawParams.minAmountB}
                    onChange={(e) => setWithdrawParams({ ...withdrawParams, minAmountB: e.target.value })}
                />
            </Field>
            <Field>
                <FieldLabel htmlFor="lp-shares">
                    LP Shares: {shares}
                </FieldLabel>
                <Input
                    id="lp-shares"
                    type="number"
                    placeholder="0.00"
                    required
                    min={0}
                    value={withdrawParams.shares}
                    onChange={(e) => setWithdrawParams({ ...withdrawParams, shares: e.target.value })}
                />
            </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRemoveLiquidity}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Withdrawing..." : "Confirm Withdrawal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
