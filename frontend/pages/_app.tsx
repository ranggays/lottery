import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { MoralisProvider } from "react-moralis";
import { NotificationProvider } from "web3uikit";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Decentralized Lottery | Web3 Draw Protocol</title>
        <meta name="description" content="A trustless, decentralized lottery powered by Chainlink VRF on Sepolia testnet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <MoralisProvider initializeOnMount={false}>
        <NotificationProvider>
          <Component {...pageProps} />
        </NotificationProvider>
      </MoralisProvider>
    </>
  );
}