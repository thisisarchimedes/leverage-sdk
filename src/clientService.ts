import { Abi, PublicClient, WalletClient } from "viem";

export class ClientService {
  readonly publicClient: PublicClient;
  readonly walletClient: WalletClient;

  constructor(publicClient: PublicClient, walletClient: WalletClient) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  simulateTransaction = async (args: any) => {
    return await this.publicClient.simulateContract({ ...args });
  };

  getChainId = (): number => {
    if (this.publicClient.chain === undefined) {
      throw new Error("Please setup the wallet");
    }
    return this.publicClient.chain.id;
  };
  readContract = async (
    address: `0x${string}`,
    abi: Abi,
    functionName: string,
    args?: any[]
  ) => {
    return await this.publicClient.readContract({
      address,
      abi,
      functionName,
      args,
    });
  };
  waitForTransactionReceipt = async (txHash: `0x${string}`) => {
    return await this.publicClient.waitForTransactionReceipt({ hash: txHash });
  };
  getBlockNumber = async () => {
    return await this.publicClient.getBlockNumber();
  };
  simulateContract = async (
    address: `0x${string}`,
    abi: Abi,
    functionName: string,
    args: any[],
    account: `0x${string}`
  ) => {
    const { request, result } = await this.publicClient.simulateContract({
      address,
      abi,
      functionName,
      args,
      account,
    });
    return { request, result };
  };
  writeContract = async (request: any) => {
    return await this.walletClient.writeContract(request);
  };
}
