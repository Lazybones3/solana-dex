"use client";

import { InputSelect } from "@/app/liquidity/input-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  checkPoolExist,
  initPool,
  sendAddLiquidity,
} from "@/lib/amm-client";
import { defaultFee, tokenList } from "@/lib/constants";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function AddLiquidityDialog({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sellAmount, setSellAmount] = useState(0);
  const [sellToken, setSellToken] = useState(tokenList[0]);
  const [buyAmount, setBuyAmount] = useState(0);
  const [buyToken, setBuyToken] = useState(tokenList[1]);

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

  const handleAddLiquidity = async () => {
    if (!provider || !wallet) {
      return;
    }

    try {
      setIsSubmitting(true);
      const is_pool_exist = await checkPoolExist(provider, {
        mintA: sellToken.mint,
        mintB: buyToken.mint,
        fee: defaultFee.toString(),
      });
      if (!is_pool_exist) {
        await initPool(provider, wallet.publicKey, {
          mintA: sellToken.mint,
          mintB: buyToken.mint,
          fee: defaultFee.toString(),
        });
      }

      await sendAddLiquidity(provider, wallet.publicKey, {
        amountA: sellAmount.toString(),
        amountB: buyAmount.toString(),
        mintA: sellToken.mint,
        mintB: buyToken.mint,
        fee: defaultFee.toString(),
      });

      toast.success("Add liquidity success");
      setOpen(false); // Close the dialog on success
      onSuccess?.(); // Refresh the list if callback provided
      // Reset form
      setSellAmount(0);
      setBuyAmount(0);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Add liquidity failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Deposit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Liquidity</DialogTitle>
        </DialogHeader>
        <InputSelect
          amount={sellAmount}
          onAmountChange={setSellAmount}
          selectedToken={sellToken}
          onSelectChange={setSellToken}
        />
        <InputSelect
          amount={buyAmount}
          onAmountChange={setBuyAmount}
          selectedToken={buyToken}
          onSelectChange={setBuyToken}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleAddLiquidity}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
