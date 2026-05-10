import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletButton } from "@/components/solana/solana-provider";
import SwapPage from "./swap/page";
import LiquidityPage from "./liquidity/page";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
      <Tabs defaultValue="swap" className="w-full flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <TabsList variant="line" className="bg-transparent border-none">
            <TabsTrigger value="swap" className="text-lg px-8 font-bold text-slate-400 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 transition-colors">Swap</TabsTrigger>
            <TabsTrigger value="pool" className="text-lg px-8 font-bold text-slate-400 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 transition-colors">Pool</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="swap" className="mt-0 outline-none w-full max-w-[480px]">
          <SwapPage />
        </TabsContent>
        
        <TabsContent value="pool" className="mt-0 outline-none w-full max-w-[640px]">
          <LiquidityPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
