import { PublicClient, WalletClient, formatUnits, parseUnits } from "viem";
import { WBTC, WBTC_DECIMALS, BLOCKS_PER_MINUTE } from "./constants";
import { fetchUniswapRouteAndBuildPayload } from "./uniswap";
import { getLeverageAddresses } from "./utils";
import MULTIPOOL_STRATEGY_ABI from "./abis/MultiPoolStrategy.json";
import ERC20_ABI from "./abis/ERC20.json";
import {
  ClosePositionParams,
  LedgerEntry,
  LeverageAddressesResponse,
} from "./types";

export class LeverageActions {
  readonly publicClient: PublicClient;
  readonly walletClient: WalletClient;
  constructor(publicClient: PublicClient, walletClient: WalletClient) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  /**
   * Retrieves the current state of a position based on its NFT ID.
   * This function fetches the state of a position from the blockchain using the PositionLedger contract.
   *
   * @param {string} nftId - The NFT ID representing the position whose state is to be retrieved.
   *
   * @return {Promise<Object>} A promise that resolves to the state of the position,
   * including details such as position status, strategy shares, and expiration block.
   *
   * @throws {Error} Throws an error if unable to fetch leverage addresses or if the PositionLedger contract is not found.
   */
  getPositionState = async (nftId: string) => {
    if (this.publicClient.chain === undefined) {
      throw new Error("Please setup the wallet");
    }

    const leverageAddresses: LeverageAddressesResponse[] =
      await getLeverageAddresses(this.publicClient.chain.id);

    const positionLedger = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "PositionLedger"
    );

    if (!positionLedger) throw new Error("No position ledger found");

    const positionData: LedgerEntry = (await this.publicClient.readContract({
      address: positionLedger.address,
      abi: positionLedger.abi,
      functionName: "getPosition",
      args: [nftId],
    })) as unknown as LedgerEntry;

    return positionData.state;
  };

  /**
   * Estimates the expiration date of a leveraged position in minutes.
   * This function calculates the time until expiration of a position
   *  based on the current blockchain block number and the position's expiration block.
   *
   * @param {string} nftId - The NFT ID of the position for which the expiration date is being estimated.
   *
   * @return {Promise<number>} A promise that resolves to the estimated number of minutes until the position expires.
   *
   * @throws {Error} Throws an error if unable to fetch leverage addresses, if the PositionLedger contract is not found,
   *  or if there are issues in reading the contract data.
   */
  getEstimatedPositionExpirationDate = async (nftId: string) => {
    if (this.publicClient.chain === undefined) {
      throw new Error("Please setup the wallet");
    }

    const leverageAddresses: LeverageAddressesResponse[] =
      await getLeverageAddresses(this.publicClient.chain.id);

    const positionLedger = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "PositionLedger"
    );

    if (!positionLedger) throw new Error("No position ledger found");

    const positionData: LedgerEntry = (await this.publicClient.readContract({
      address: positionLedger.address,
      abi: positionLedger.abi,
      functionName: "getPosition",
      args: [nftId],
    })) as unknown as LedgerEntry;

    const currentBlock = await this.publicClient.getBlockNumber();
    const blocksDelta = positionData.positionExpirationBlock - currentBlock;
    const estimatedMinsToExpire =
      parseFloat(blocksDelta.toString()) / BLOCKS_PER_MINUTE;
    return estimatedMinsToExpire;
  };

  /**
   * Function to open a leveraged position
   * @param {string} amount - The amount to open with
   * @param {string} amountToBorrow - The amount to borrow
   * @param {string} minimumStrategyShares - The minimum strategy shares
   * @param {string} strategyAddress - The strategy address
   * @param {string} payload - The swap payload
   * @param {string} account - The account address
   * @return {Object} The result and transaction receipt
   */
  openLeveragedPosition = async (
    amount: string,
    amountToBorrow: string,
    minimumStrategyShares: string,
    strategyAddress: `0x${string}`,
    payload: string,
    account: `0x${string}`
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { strategyAsset: assetOut, assetDecimals: assetOutDecimals } =
      await this.getOutputAssetFromStrategy(strategyAddress);
    if (this.publicClient.chain === undefined) {
      throw new Error("Please setup the wallet");
    }
    const leverageAddresses = await getLeverageAddresses(
      this.publicClient.chain.id
    );

    const minimumStrategySharesBN = parseUnits(
      minimumStrategyShares,
      assetOutDecimals
    );
    const amountBN = parseUnits(amount, WBTC_DECIMALS);
    const amountToBorrowBN = parseUnits(amountToBorrow, WBTC_DECIMALS);
    const positionOpener = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "PositionOpener"
    );
    if (!positionOpener) throw new Error("No position opener found");
    const openPositionStruct = {
      collateralAmount: amountBN,
      wbtcToBorrow: amountToBorrowBN,
      strategy: strategyAddress,
      minStrategyShares: minimumStrategySharesBN,
      swapRoute: "0",
      swapData: payload,
      exchange: "0x0000000000000000000000000000000000000000",
    };
    const { request, result } = await this.publicClient.simulateContract({
      address: positionOpener.address,
      abi: positionOpener.abi,
      functionName: "openPosition",
      args: [openPositionStruct],
      account,
    });
    if (!request) return "No request found";
    const hash = await this.walletClient.writeContract(request);
    if (!hash) return "No hash found";
    const transactionReceipt =
      await this.publicClient.waitForTransactionReceipt({
        hash,
      });
    if (!transactionReceipt) return "No transaction receipt";
    return {
      result,
      transactionReceipt,
    };
  };

  /*
   * Preview the open position

   * @param {string} amount WBTC amount to open with
   * @param {string} amountToBorrow WBTC amount to borrow
   * @param {`0x${string}`} strategyAddress Underlying strategy address
   * @param {string} [slippagePercentage='50'] Slippage percentage in 10000 so 1% is 100. Default is 100
   * @returns {Promise<{ minimumExpectedShares: string; payload: any; }>} The minimum expected shares and the swap payload
   */
  previewOpenPosition = async (
    amount: string,
    amountToBorrow: string,
    strategyAddress: `0x${string}`,
    slippagePercentage = "50"
  ) => {
    if (Number(slippagePercentage) > 10000) {
      throw new Error("Slippage percentage cannot be greater than 10000");
    }
    const { strategyAsset: assetOut, assetDecimals: assetOutDecimals } =
      await this.getOutputAssetFromStrategy(strategyAddress);
    const totalAmount = (Number(amount) + Number(amountToBorrow)).toString();
    const { payload, swapOutputAmount } =
      await fetchUniswapRouteAndBuildPayload(
        this.publicClient,
        totalAmount,
        WBTC,
        WBTC_DECIMALS,
        assetOut,
        assetOutDecimals
      );
    const swapOutputAmountBN = parseUnits(swapOutputAmount, assetOutDecimals);
    let minimumExpectedShares: bigint = (await this.publicClient.readContract({
      address: strategyAddress,
      abi: MULTIPOOL_STRATEGY_ABI,
      functionName: "previewDeposit",
      args: [swapOutputAmountBN],
    })) as bigint;
    const slippagePercentageBN = BigInt(10000 - Number(slippagePercentage));
    minimumExpectedShares =
      (minimumExpectedShares * slippagePercentageBN) / BigInt(10000);
    return {
      minimumExpectedShares: formatUnits(
        minimumExpectedShares,
        assetOutDecimals
      ),
      payload: payload,
    };
  };

  /*
   * Function to close a leveraged position
   * @param {string} nftId nftId of the position
   * @param {string} minWBTC minWBTC to receive
   * @param {`0x${string}`} account wallet address of the user
   * @param {string} payload payload for the swap from the strategy asset to WBTC
   * @returns result and transaction receipt
   */
  closeLeveragedPosition = async (
    nftId: string,
    minWBTC: string,
    account: `0x${string}`,
    payload: string
  ) => {
    if (this.publicClient.chain === undefined) {
      throw new Error("Please setup the wallet");
    }
    const leverageAddresses = await getLeverageAddresses(
      this.publicClient.chain.id
    );
    const closePositionStruct: ClosePositionParams = {
      nftId: nftId,
      minWBTC: parseUnits(minWBTC, WBTC_DECIMALS),
      swapRoute: "0",
      swapData: payload,
      exchange: "0x0000000000000000000000000000000000000000",
    };
    const positionCloser = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "PositionCloser"
    );
    if (!positionCloser) throw new Error("No position closer found");
    const { request, result } = await this.publicClient.simulateContract({
      address: positionCloser.address,
      abi: positionCloser.abi,
      functionName: "closePosition",
      args: [closePositionStruct],
      account,
    });
    if (!request) return "No request found";
    const hash = await this.walletClient.writeContract(request);
    if (!hash) return "No hash found";
    const transactionReceipt =
      await this.publicClient.waitForTransactionReceipt({
        hash,
      });
    if (!transactionReceipt) return "No transaction receipt";
    return {
      result,
      transactionReceipt,
    };
  };

  /*
   * Preview the close position
   * @param {string} nftId nftId of the position
   * @param {string} slippagePercentage Slippage percentage in 10000 so 1% is 100. Default is 100
   * @return minimumWBTC and payload for the swap from the strategy asset to WBTC
   */
  previewClosePosition = async (nftId: string, slippagePercentage = "50") => {
    if (this.publicClient.chain === undefined) {
      throw new Error("Please setup the wallet");
    }
    const leverageAddresses = await getLeverageAddresses(
      this.publicClient.chain.id
    );
    const positionLedger = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "PositionLedger"
    );
    if (!positionLedger) throw new Error("No position ledger found");
    const positionData: LedgerEntry = (await this.publicClient.readContract({
      address: positionLedger.address,
      abi: positionLedger.abi,
      functionName: "getPosition",
      args: [nftId],
    })) as unknown as LedgerEntry;
    const minimumExpectedAssets = (await this.publicClient.readContract({
      address: positionData.strategyAddress,
      abi: MULTIPOOL_STRATEGY_ABI,
      functionName: "convertToAssets",
      args: [positionData.strategyShares],
    })) as bigint;
    const strategyAsset = (await this.publicClient.readContract({
      address: positionData.strategyAddress,
      abi: MULTIPOOL_STRATEGY_ABI,
      functionName: "asset",
    })) as `0x${string}`;

    const assetDecimals = (await this.publicClient.readContract({
      address: strategyAsset,
      abi: ERC20_ABI,
      functionName: "decimals",
    })) as number;

    const { payload, swapOutputAmount: minimumWBTC } =
      await fetchUniswapRouteAndBuildPayload(
        this.publicClient,
        formatUnits(minimumExpectedAssets, assetDecimals),
        strategyAsset,
        assetDecimals,
        WBTC,
        WBTC_DECIMALS
      );
    const slippagePercentageBN = BigInt(10000 - Number(slippagePercentage));
    const minimumWBTCBN = parseUnits(minimumWBTC, WBTC_DECIMALS);
    const minimumWBTCWithSlippage =
      (minimumWBTCBN * slippagePercentageBN) / BigInt(10000);

    return {
      minimumWBTC: formatUnits(minimumWBTCWithSlippage, WBTC_DECIMALS),
      payload,
    };
  };

  getOutputAssetFromStrategy = async (strategyAddress: `0x${string}`) => {
    const strategyAsset = (await this.publicClient.readContract({
      address: strategyAddress,
      abi: MULTIPOOL_STRATEGY_ABI,
      functionName: "asset",
    })) as `0x${string}`;
    const assetDecimals = (await this.publicClient.readContract({
      address: strategyAsset,
      abi: ERC20_ABI,
      functionName: "decimals",
    })) as number;
    return { strategyAsset, assetDecimals };
  };

  /*
   * Function to approve WBTC for the position opener
   * @param {`0x${string}`} account wallet address of the user
   * @param {string} amount amount to approve
   * @returns {Object} result and transaction receipt
   */
  approveWBTCForPositionOpener = async (
    account: `0x${string}`,
    amount: string
  ) => {
    if (this.publicClient.chain === undefined) {
      throw new Error("Please setup the wallet");
    }
    const leverageAddresses = await getLeverageAddresses(
      this.publicClient.chain.id
    );
    const positionOpener = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "PositionOpener"
    );
    const amountBN = parseUnits(amount, WBTC_DECIMALS);
    if (!positionOpener) throw new Error("No position opener found");
    const { request, result } = await this.publicClient.simulateContract({
      address: WBTC,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [positionOpener.address, amountBN],
      account,
    });
    if (!request) return "No request found";
    const hash = await this.walletClient.writeContract(request);
    if (!hash) return "No hash found";
    const transactionReceipt =
      await this.publicClient.waitForTransactionReceipt({
        hash,
      });
    if (!transactionReceipt) return "No transaction receipt";
    return {
      result,
      transactionReceipt,
    };
  };

  /*
   * Function to claim WBTC from expired vault after position is liquidated or expired
   * @param nftId nftId of the position
   * @param account wallet address of the user
   * @return {Object} result and transaction receipt
   */
  claimTokensBack = async (nftId: string, account: `0x${string}`) => {
    if (this.publicClient.chain === undefined) {
      throw new Error("Please setup the wallet");
    }
    const leverageAddresses = await getLeverageAddresses(
      this.publicClient.chain.id
    );
    const expiredVault = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "ExpiredVault"
    );
    if (!expiredVault) throw new Error("No expired vault found");
    const { request, result } = await this.publicClient.simulateContract({
      address: expiredVault.address,
      abi: expiredVault.abi,
      functionName: "claim",
      args: [parseUnits(nftId, 0)],
      account,
    });
    if (!request) return "No request found";
    const hash = await this.walletClient.writeContract(request);
    if (!hash) return "No hash found";
    const transactionReceipt =
      await this.publicClient.waitForTransactionReceipt({
        hash,
      });
    if (!transactionReceipt) return "No transaction receipt";
    return {
      result,
      transactionReceipt,
    };
  };
}
/*


opePosition
FE -> PreviewOpenPosition(SDK) -> Returns (minExpectedShares, payload)
FE->**OpenPosition(SDK)**->Node->OpenPosition(SmartContract)

1. Unit test (openPositionSDK)
* Fake ClientWallet (interface + fake + real implementation)
* Fake UniswapAPI (interface + fake + real implementation)


2. Interface test SDK->uniswap
* Build data send to Uniswap and check that we get what we expect (as much as possible)

3. Interface test FE->OpenPosition(SDK)
On the FE
* Call the SDK interface and expect some predefined result 


4. Interface test (OpenPosition(SDK)->OpenPosition(SmartContract))
Not an auto test - to run it we need to set a fresh node and deploy the contracts
* Deploy the SDK
* write interface test on the SustainableLeverage side - call the SDK and open a position with the data we get back
* what we have now just add assertions and print outs


*/
