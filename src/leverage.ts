import {
  PublicClient,
  WalletClient,
  formatUnits,
  getContract,
  parseUnits,
} from "viem";
import { WBTC, WBTC_DECIMALS } from "./constants";
import {
  fetchUniswapRouteAndBuildPayload,
  getUniswapOutputAmount,
} from "./uniswap";
import { getLeverageAddresses } from "./utils";
import POSITION_OPENER_ABI from "./abis/PositionOpener.json";
import POSITION_CLOSER_ABI from "./abis/PositionCloser.json";
import POSITION_LEDGER_ABI from "./abis/PositionLedger.json";
import MULTIPOOL_STRATEGY_ABI from "./abis/MultipoolStrategy.json";
import ERC20_ABI from "./abis/ERC20.json";
import { LedgerEntry } from "./types";

/**
 * Function to open a leveraged position
 * @param {string} amount - The amount to open with
 * @param {string} amountToBorrow - The amount to borrow
 * @param {string} asset - The asset to swap to
 * @returns {string} The transaction hash
 */
export const openLeveragedPosition = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  amount: string,
  amountToBorrow: string,
  minimumStrategyShares: string,
  strategyAddress: `0x${string}`,
  account: `0x${string}`
) => {
  const { strategyAsset: assetOut, assetDecimals: assetOutDecimals } =
    await getOutputAssetFromStrategy(publicClient, strategyAddress);

  const leverageAddresses = await getLeverageAddresses();

  const payload = fetchUniswapRouteAndBuildPayload(
    publicClient,
    amount,
    WBTC,
    WBTC_DECIMALS,
    assetOut,
    assetOutDecimals
  );
  const minimumAmount = parseUnits(minimumStrategyShares, assetOutDecimals);
  const bigIntAmount = parseUnits(amount, WBTC_DECIMALS);
  const bigIntAmountToBorrow = parseUnits(amountToBorrow, WBTC_DECIMALS);
  const { request, result } = await publicClient.simulateContract({
    address: leverageAddresses.positionOpener,
    abi: POSITION_OPENER_ABI,
    functionName: "openPosition",
    args: [
      bigIntAmount,
      bigIntAmountToBorrow,
      strategyAddress,
      minimumAmount,
      // We only have one route for now, so we send 0
      0,
      payload,
      // This is address(0) for now
      "0x0000000000000000000000000000000000000000",
    ],
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

export const previewOpenPosition = async (
  publicClient: PublicClient,
  amount: string,
  amountToBorrow: string,
  strategyAddress: `0x${string}`,
  slippagePercentage?: string
) => {
  const { strategyAsset: assetOut, assetDecimals: assetOutDecimals } =
    await getOutputAssetFromStrategy(publicClient, strategyAddress);

  const swapOutputAmount = await getUniswapOutputAmount(
    publicClient,
    amount + amountToBorrow,
    WBTC,
    WBTC_DECIMALS,
    assetOut,
    assetOutDecimals
  );

  // TODO add slippage percentage
  const leverageAddresses = await getLeverageAddresses();
  const positionOpener = leverageAddresses.find(
    (item: any) => item.name === "PositionOpener"
  );

  const minimumExpectedShares = await publicClient.readContract({
    address: strategyAddress,
    abi: MULTIPOOL_STRATEGY_ABI,
    functionName: "previewDeposit",
    args: [swapOutputAmount],
  });
  return minimumExpectedShares;
};

export const closeLeveragedPosition = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  nftId: string,
  minWBTC: string,
  account: `0x${string}`,
  payload: string
) => {
  const leverageAddresses = await getLeverageAddresses();
  const { request, result } = await publicClient.simulateContract({
    address: leverageAddresses.positionCloser,
    abi: POSITION_CLOSER_ABI,
    functionName: "closePosition",
    args: [
      nftId,
      parseUnits(minWBTC, WBTC_DECIMALS),
      0,
      payload,
      "0x0000000000000000000000000000000000000000",
    ],
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

export const previewClosePosition = async (
  publicClient: PublicClient,
  nftId: string
) => {
  const leverageAddresses = await getLeverageAddresses();
  const positionData: LedgerEntry = (await publicClient.readContract({
    address: leverageAddresses.positionLedger,
    abi: POSITION_LEDGER_ABI,
    functionName: "getPosition",
    args: [nftId],
  })) as LedgerEntry;
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
  formatUnits;
  const minimumWBTC = await getUniswapOutputAmount(
    publicClient,
    formatUnits(minimumExpectedAssets, assetDecimals),
    strategyAsset,
    assetDecimals,
    WBTC,
    WBTC_DECIMALS
  );
  // TODO add slippage
  // TODO add exit fee calculation
  const payload = fetchUniswapRouteAndBuildPayload(
    publicClient,
    formatUnits(minimumExpectedAssets, assetDecimals),
    strategyAsset,
    assetDecimals,
    WBTC,
    WBTC_DECIMALS
  );
  return { minimumWBTC, payload };
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
