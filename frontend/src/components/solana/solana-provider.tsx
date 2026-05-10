'use client'

import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base'
import { ConnectionProvider, useWallet, WalletProvider } from '@solana/wallet-adapter-react'
import { useWalletModal, WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { ReactNode, useCallback, useMemo } from 'react'
import '@solana/wallet-adapter-react-ui/styles.css'
import { clusterApiUrl } from '@solana/web3.js'
import { LogOut, Wallet } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function WalletButton() {
  const { connected, disconnect, publicKey } = useWallet()
  const { setVisible } = useWalletModal()

  if (connected) {
    return (
      <Button variant="outline" onClick={() => disconnect()}>
        <LogOut />
        {publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : 'Disconnect'}
      </Button>
    )
  }

  return (
    <Button onClick={() => setVisible(true)}>
      <Wallet />
      Connect Wallet
    </Button>
  )
}

export function SolanaProvider({ children }: { children: ReactNode }) {
  // const network = WalletAdapterNetwork.Devnet
  // const endpoint = useMemo(() => clusterApiUrl(network), [network])
  const endpoint = process.env.NEXT_PUBLIC_HELIUS_URL || "";

  const onError = useCallback((error: WalletError) => {
    console.error(error)
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} onError={onError} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
