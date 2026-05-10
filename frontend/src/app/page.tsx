import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletButton } from "@/components/solana/solana-provider";
import SwapPage from "./swap/page";
import LiquidityPage from "./liquidity/page";

export default function Home() {
  return (
    <main className="px-3 py-2">
      <Tabs defaultValue="swap">
        <div className="flex justify-between items-center">
          <TabsList variant="line" >
            <TabsTrigger value="swap" className="text-xl">Swap</TabsTrigger>
            <TabsTrigger value="pool" className="text-xl">Pool</TabsTrigger>
          </TabsList>
          <WalletButton />
        </div>
        <TabsContent value="swap">
          <SwapPage />
        </TabsContent>
        <TabsContent value="pool">
          <LiquidityPage />
        </TabsContent>
      </Tabs>
    </main>

  );
}
