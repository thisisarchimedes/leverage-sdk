import { Abi, PublicClient, WalletClient, formatUnits, parseUnits } from "viem";
import { WBTC, WBTC_DECIMALS, BLOCKS_PER_MINUTE } from "./constants";
import { UniswapService } from "./uniswap";
import { getLeverageAddresses } from "./utils";
import MULTIPOOL_STRATEGY_ABI from "./abis/MultiPoolStrategy.json";
import ERC20_ABI from "./abis/ERC20.json";
import {
  ClosePositionParams,
  LedgerEntry,
  LeverageAddressesResponse,
} from "./types";
import { ClientService } from "./clientService";

export class LeverageActions {
  readonly clientService: ClientService;
  readonly uniswapService: UniswapService;
  constructor(publicClient: PublicClient, walletClient: WalletClient) {
    this.clientService = new ClientService(publicClient, walletClient);
    this.uniswapService = new UniswapService(publicClient);
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
    const leverageAddresses: LeverageAddressesResponse[] =
      await getLeverageAddresses(this.clientService.getChainId());

    const positionLedger = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "PositionLedger"
    );

    if (!positionLedger) throw new Error("No position ledger found");

    const positionData: LedgerEntry = (await this.clientService.readContract(
      positionLedger.address,
      positionLedger.abi,
      "getPosition",
      [nftId]
    )) as unknown as LedgerEntry;

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
    const leverageAddresses: LeverageAddressesResponse[] =
      await getLeverageAddresses(this.clientService.getChainId());

    const positionLedger = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "PositionLedger"
    );

    if (!positionLedger) throw new Error("No position ledger found");

    const positionData: LedgerEntry = (await this.clientService.readContract(
      positionLedger.address,
      positionLedger.abi,
      "getPosition",
      [nftId]
    )) as unknown as LedgerEntry;

    const currentBlock = await this.clientService.getBlockNumber();
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

    const leverageAddresses = await getLeverageAddresses(
      this.clientService.getChainId()
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
    const { request, result } = await this.clientService.simulateContract(
      positionOpener.address,
      positionOpener.abi,
      "openPosition",
      [openPositionStruct],
      account
    );
    if (!request) return "No request found";
    const hash = await this.clientService.writeContract(request);
    if (!hash) return "No hash found";
    const transactionReceipt =
      await this.clientService.waitForTransactionReceipt(hash);
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
      await this.uniswapService.fetchUniswapRouteAndBuildPayload(
        totalAmount,
        WBTC,
        WBTC_DECIMALS,
        assetOut,
        assetOutDecimals
      );
    const swapOutputAmountBN = parseUnits(swapOutputAmount, assetOutDecimals);
    let minimumExpectedShares: bigint = (await this.clientService.readContract(
      strategyAddress,
      MULTIPOOL_STRATEGY_ABI as Abi,
      "previewDeposit",
      [swapOutputAmountBN]
    )) as bigint;
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
    const leverageAddresses = await getLeverageAddresses(
      this.clientService.getChainId()
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
    const { request, result } = await this.clientService.simulateContract(
      positionCloser.address,
      positionCloser.abi,
      "closePosition",
      [closePositionStruct],
      account
    );
    if (!request) return "No request found";
    const hash = await this.clientService.writeContract(request);
    if (!hash) return "No hash found";
    const transactionReceipt =
      await this.clientService.waitForTransactionReceipt(hash);
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
    const leverageAddresses = await getLeverageAddresses(
      this.clientService.getChainId()
    );
    const positionLedger = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "PositionLedger"
    );
    if (!positionLedger) throw new Error("No position ledger found");
    const positionData: LedgerEntry = (await this.clientService.readContract(
      positionLedger.address,
      positionLedger.abi,
      "getPosition",
      [nftId]
    )) as unknown as LedgerEntry;
    const minimumExpectedAssets = (await this.clientService.readContract(
      positionData.strategyAddress,
      MULTIPOOL_STRATEGY_ABI as Abi,
      "convertToAssets",
      [positionData.strategyShares]
    )) as bigint;
    const strategyAsset = (await this.clientService.readContract(
      positionData.strategyAddress,
      MULTIPOOL_STRATEGY_ABI as Abi,
      "asset"
    )) as `0x${string}`;

    const assetDecimals = (await this.clientService.readContract(
      strategyAsset,
      ERC20_ABI as Abi,
      "decimals"
    )) as number;

    const { payload, swapOutputAmount: minimumWBTC } =
      await this.uniswapService.fetchUniswapRouteAndBuildPayload(
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
    const strategyAsset = (await this.clientService.readContract(
      strategyAddress,
      MULTIPOOL_STRATEGY_ABI as Abi,
      "asset"
    )) as `0x${string}`;
    const assetDecimals = (await this.clientService.readContract(
      strategyAsset,
      ERC20_ABI as Abi,
      "decimals"
    )) as number;
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
    const leverageAddresses = await getLeverageAddresses(
      this.clientService.getChainId()
    );
    const positionOpener = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "PositionOpener"
    );
    const amountBN = parseUnits(amount, WBTC_DECIMALS);
    if (!positionOpener) throw new Error("No position opener found");
    const { request, result } = await this.clientService.simulateContract(
      WBTC,
      ERC20_ABI as Abi,
      "approve",
      [positionOpener.address, amountBN],
      account
    );
    if (!request) return "No request found";
    const hash = await this.clientService.writeContract(request);
    if (!hash) return "No hash found";
    const transactionReceipt =
      await this.clientService.waitForTransactionReceipt(hash);
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
    const leverageAddresses = await getLeverageAddresses(
      this.clientService.getChainId()
    );
    const expiredVault = leverageAddresses.find(
      (item: LeverageAddressesResponse) => item.name === "ExpiredVault"
    );
    if (!expiredVault) throw new Error("No expired vault found");
    const { request, result } = await this.clientService.simulateContract(
      expiredVault.address,
      expiredVault.abi,
      "claim",
      [parseUnits(nftId, 0)],
      account
    );
    if (!request) return "No request found";
    const hash = await this.clientService.writeContract(request);
    if (!hash) return "No hash found";
    const transactionReceipt =
      await this.clientService.waitForTransactionReceipt(hash);
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
