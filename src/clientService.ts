import {Abi, PublicClient, WalletClient, getContract} from 'viem';

type SimulateContractArgs = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: unknown[];
  account: `0x${string}`;
};

export class ClientService {
  readonly publicClient: PublicClient;
  readonly walletClient: WalletClient;

  constructor(publicClient: PublicClient, walletClient: WalletClient) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  simulateTransaction = async (args: SimulateContractArgs) => {
    return await this.publicClient.simulateContract(args);
  };

  getChainId = (): number => {
    if (this.publicClient.chain === undefined) {
      throw new Error('Please setup the wallet');
    }
    return this.publicClient.chain.id;
  };
  readContract = async (address: `0x${string}`, abi: Abi, functionName: string, args?: unknown[]) => {
    return await this.publicClient.readContract({
      address,
      abi,
      functionName,
      args,
    });
  };
  waitForTransactionReceipt = async (txHash: `0x${string}`) => {
    return await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
  };
  getBlockNumber = async () => {
    return await this.publicClient.getBlockNumber();
  };
  simulateContract = async (
      address: `0x${string}`,
      abi: Abi,
      functionName: string,
      args: unknown[],
      account: `0x${string}`,
  ) => {
    const {request, result} = await this.publicClient.simulateContract({
      address,
      abi,
      functionName,
      args,
      account,
    });
    return {request, result};
  };
  // eslint-disable-next-line
  writeContract = async (request: any) => {
    return await this.walletClient.writeContract(request);
  };

  getContract = (address: `0x${string}`, abi: Abi) => {
    return getContract({
      address: address,
      abi: abi,
      client: {public: this.publicClient, wallet: this.walletClient},
    });
  };

  getAccount = () => {
    if (this.walletClient.account === undefined) {
      throw new Error('Please setup the wallet');
    }
    return this.walletClient.account;
  };
}
