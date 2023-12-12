import { createWalletClient, createPublicClient, http, Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
const tenderlyChain: Chain = {
  id: 1337,
  network: "tenderly-fork",
  name: "tenderly-fork",
  nativeCurrency: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
  },
  rpcUrls: {
    public: {
      http: [
        "https://rpc.tenderly.co/fork/e7270bef-7d0e-47f6-b2f0-d400256e64a3",
      ],
    },
    default: {
      http: [
        "https://rpc.tenderly.co/fork/e7270bef-7d0e-47f6-b2f0-d400256e64a3",
      ],
    },
  },
};
const account = privateKeyToAccount(
  "0xc29daa5cf3a2a7e7585254386235a969f289b4ef65b40045eb66d37e34bfe0dd"
);
export const walletClient = createWalletClient({
  account,
  transport: http(tenderlyChain.rpcUrls.default.http[0]),
  chain: tenderlyChain,
});

export const publicClient = createPublicClient({
  transport: http(tenderlyChain.rpcUrls.default.http[0]),
  chain: tenderlyChain,
});
