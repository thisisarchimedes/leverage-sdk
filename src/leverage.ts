import { PublicClient, WalletClient, formatUnits, parseUnits } from "viem";
import { WBTC, WBTC_DECIMALS } from "./constants";
import { fetchUniswapRouteAndBuildPayload } from "./uniswap";
import { getLeverageAddresses } from "./utils";
import MULTIPOOL_STRATEGY_ABI from "./abis/MultiPoolStrategy.json";
import ERC20_ABI from "./abis/ERC20.json";
import { ClosePositionParams, LedgerEntry } from "./types";
import { publicClient } from "./test/config";

/**
 * Function to open a leveraged position
 * @param {Object} publicClient - The public client instance
 * @param {Object} walletClient - The wallet client instance
 * @param {string} amount - The amount to open with
 * @param {string} amountToBorrow - The amount to borrow
 * @param {string} minimumStrategyShares - The minimum strategy shares
 * @param {string} strategyAddress - The strategy address
 * @param {string} payload - The swap payload
 * @param {string} account - The account address
 * @returns {Object} The result and transaction receipt
 */
export const openLeveragedPosition = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  amount: string,
  amountToBorrow: string,
  minimumStrategyShares: string,
  strategyAddress: `0x${string}`,
  payload: string,
  account: `0x${string}`
) => {
  const { strategyAsset: assetOut, assetDecimals: assetOutDecimals } =
    await getOutputAssetFromStrategy(publicClient, strategyAddress);
  if (publicClient.chain === undefined)
    throw new Error("Please setup the wallet");
  const leverageAddresses = await getLeverageAddresses(publicClient.chain.id);

  const minimumStrategySharesBN = parseUnits(
    minimumStrategyShares,
    assetOutDecimals
  );
  const amountBN = parseUnits(amount, WBTC_DECIMALS);
  const amountToBorrowBN = parseUnits(amountToBorrow, WBTC_DECIMALS);
  const positionOpener = leverageAddresses.find(
    (item: any) => item.name === "PositionOpener"
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
  const { request, result } = await publicClient.simulateContract({
    address: positionOpener.address,
    abi: positionOpener.abi,
    functionName: "openPosition",
    args: [openPositionStruct],
    account,
  });
  if (!request) return "No request found";
  const hash = await walletClient.writeContract(request);
  if (!hash) return "No hash found";
  const transactionReceipt = await publicClient.waitForTransactionReceipt({
    hash,
  });
  if (!transactionReceipt) return "No transaction receipt";
  return {
    result,
    transactionReceipt,
  };
};

/**
 * Preview the open position
 * @param publicClient Viem public client instance
 * @param amount WBTC amount to open with
 * @param amountToBorrow WBTC amount to borrow
 * @param strategyAddress Underlying strategy address
 * @param slippagePercentage Slippage percentage in 10000 so 1% is 100. Default is 100
 * @returns The minimum expected shares and the swap payload
 */
export const previewOpenPosition = async (
  publicClient: PublicClient,
  amount: string,
  amountToBorrow: string,
  strategyAddress: `0x${string}`,
  slippagePercentage = "100"
) => {
  if (Number(slippagePercentage) > 10000)
    throw new Error("Slippage percentage cannot be greater than 10000");
  const { strategyAsset: assetOut, assetDecimals: assetOutDecimals } =
    await getOutputAssetFromStrategy(publicClient, strategyAddress);
  const totalAmount = (Number(amount) + Number(amountToBorrow)).toString();
  const { payload, swapOutputAmount } = await fetchUniswapRouteAndBuildPayload(
    publicClient,
    totalAmount,
    WBTC,
    WBTC_DECIMALS,
    assetOut,
    assetOutDecimals
  );
  const swapOutputAmountBN = parseUnits(swapOutputAmount, assetOutDecimals);
  let minimumExpectedShares: bigint = (await publicClient.readContract({
    address: strategyAddress,
    abi: MULTIPOOL_STRATEGY_ABI,
    functionName: "previewDeposit",
    args: [swapOutputAmountBN],
  })) as bigint;
  const slippagePercentageBN = BigInt(10000 - Number(slippagePercentage));
  minimumExpectedShares =
    (minimumExpectedShares * slippagePercentageBN) / BigInt(10000);
  return {
    minimumExpectedShares: formatUnits(minimumExpectedShares, assetOutDecimals),
    payload: payload,
  };
};

/**
 * Function to close a leveraged position
 * @param {PublicClient} publicClient Viem public client instance
 * @param {WalletClient} walletClient Viem wallet client instance
 * @param {string} nftId nftId of the position
 * @param {string} minWBTC minWBTC to receive
 * @param {`0x${string}`} account wallet address of the user
 * @param {string} payload payload for the swap from the strategy asset to WBTC
 * @returns result and transaction receipt
 */
export const closeLeveragedPosition = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  nftId: string,
  minWBTC: string,
  account: `0x${string}`,
  payload: string
) => {
  if (publicClient.chain === undefined)
    throw new Error("Please setup the wallet");
  const leverageAddresses = await getLeverageAddresses(publicClient.chain.id);
  const closePositionStruct: ClosePositionParams = {
    nftId: nftId,
    minWBTC: parseUnits(minWBTC, WBTC_DECIMALS),
    swapRoute: "0",
    swapData: payload,
    exchange: "0x0000000000000000000000000000000000000000",
  };
  const positionCloser = leverageAddresses.find(
    (item: any) => item.name === "PositionCloser"
  );
  if (!positionCloser) throw new Error("No position closer found");
  const { request, result } = await publicClient.simulateContract({
    address: positionCloser.address,
    abi: positionCloser.abi,
    functionName: "closePosition",
    args: [closePositionStruct],
    account,
  });
  if (!request) return "No request found";
  const hash = await walletClient.writeContract(request);
  if (!hash) return "No hash found";
  const transactionReceipt = await publicClient.waitForTransactionReceipt({
    hash,
  });
  if (!transactionReceipt) return "No transaction receipt";
  return {
    result,
    transactionReceipt,
  };
};

/**
 * Preview the close position
 * @param {PublicClient} publicClient Viem public client instance
 * @param {string} nftId nftId of the position
 * @param {string} slippagePercentage Slippage percentage in 10000 so 1% is 100. Default is 100
 * @returns minimumWBTC and payload for the swap from the strategy asset to WBTC
 */
export const previewClosePosition = async (
  publicClient: PublicClient,
  nftId: string,
  slippagePercentage = "100"
) => {
  if (publicClient.chain === undefined)
    throw new Error("Please setup the wallet");
  const leverageAddresses = await getLeverageAddresses(publicClient.chain.id);
  const positionLedger = leverageAddresses.find(
    (item: any) => item.name === "PositionLedger"
  );
  if (!positionLedger) throw new Error("No position ledger found");
  const positionData: LedgerEntry = (await publicClient.readContract({
    address: positionLedger.address,
    abi: positionLedger.abi,
    functionName: "getPosition",
    args: [nftId],
  })) as unknown as LedgerEntry;
  const minimumExpectedAssets = (await publicClient.readContract({
    address: positionData.strategyAddress,
    abi: MULTIPOOL_STRATEGY_ABI,
    functionName: "convertToAssets",
    args: [positionData.strategyShares],
  })) as bigint;
  const strategyAsset = (await publicClient.readContract({
    address: positionData.strategyAddress,
    abi: MULTIPOOL_STRATEGY_ABI,
    functionName: "asset",
  })) as `0x${string}`;

  const assetDecimals = (await publicClient.readContract({
    address: strategyAsset,
    abi: ERC20_ABI,
    functionName: "decimals",
  })) as number;

  const { payload, swapOutputAmount: minimumWBTC } =
    await fetchUniswapRouteAndBuildPayload(
      publicClient,
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

const getOutputAssetFromStrategy = async (
  publicClient: PublicClient,
  strategyAddress: `0x${string}`
) => {
  const strategyAsset = (await publicClient.readContract({
    address: strategyAddress,
    abi: MULTIPOOL_STRATEGY_ABI,
    functionName: "asset",
  })) as `0x${string}`;
  const assetDecimals = (await publicClient.readContract({
    address: strategyAsset,
    abi: ERC20_ABI,
    functionName: "decimals",
  })) as number;
  return { strategyAsset, assetDecimals };
};

/**
 * Function to approve WBTC for the position opener
 * @param {PublicClient} publicClient Viem public client instance
 * @param {WalletClient} walletClient Viem wallet client instance
 * @param {`0x${string}`} account wallet address of the user
 * @param {string} amount amount to approve
 * @returns {Object} result and transaction receipt
 */
export const approveWBTCForPositionOpener = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: `0x${string}`,
  amount: string
) => {
  if (publicClient.chain === undefined)
    throw new Error("Please setup the wallet");
  const leverageAddresses = await getLeverageAddresses(publicClient.chain.id);
  const positionOpener = leverageAddresses.find(
    (item: any) => item.name === "PositionOpener"
  );
  const amountBN = parseUnits(amount, WBTC_DECIMALS);
  if (!positionOpener) throw new Error("No position opener found");
  const { request, result } = await publicClient.simulateContract({
    address: WBTC,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [positionOpener.address, amountBN],
    account,
  });
  if (!request) return "No request found";
  const hash = await walletClient.writeContract(request);
  if (!hash) return "No hash found";
  const transactionReceipt = await publicClient.waitForTransactionReceipt({
    hash,
  });
  if (!transactionReceipt) return "No transaction receipt";
  return {
    result,
    transactionReceipt,
  };
};

/**
 * Function to claim WBTC from expired vault after position is liquidated or expired
 * @param {PublicClient} publicClient Viem public client instance
 * @param {WalletClient} walletClient Viem wallet client instance
 * @param nftId nftId of the position
 * @param account wallet address of the user
 * @returns {Object} result and transaction receipt
 */
export const claimTokensBack = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  nftId: string,
  account: `0x${string}`
) => {
  if (publicClient.chain === undefined)
    throw new Error("Please setup the wallet");
  const leverageAddresses = await getLeverageAddresses(publicClient.chain.id);
  const expiredVault = leverageAddresses.find(
    (item: any) => item.name === "ExpiredVault"
  );
  if (!expiredVault) throw new Error("No expired vault found");
  const { request, result } = await publicClient.simulateContract({
    address: expiredVault.address,
    abi: expiredVault.abi,
    functionName: "claim",
    args: [nftId],
    account,
  });
  if (!request) return "No request found";
  const hash = await walletClient.writeContract(request);
  if (!hash) return "No hash found";
  const transactionReceipt = await publicClient.waitForTransactionReceipt({
    hash,
  });
  if (!transactionReceipt) return "No transaction receipt";
  return {
    result,
    transactionReceipt,
  };
};
