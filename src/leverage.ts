import {
  PublicClient,
  WalletClient,
  formatUnits,
  getContract,
  parseUnits,
} from "viem";
import { WBTC, WBTC_DECIMALS } from "./constants";
import { fetchUniswapRouteAndBuildPayload } from "./uniswap";
import { getLeverageAddresses } from "./utils";

import POSITION_CLOSER_ABI from "./abis/PositionCloser.json";
import POSITION_LEDGER_ABI from "./abis/PositionLedger.json";
import MULTIPOOL_STRATEGY_ABI from "./abis/MultiPoolStrategy.json";
import ERC20_ABI from "./abis/ERC20.json";
import { LedgerEntry } from "./types";

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

export const previewOpenPosition = async (
  publicClient: PublicClient,
  amount: string,
  amountToBorrow: string,
  strategyAddress: `0x${string}`,
  slippagePercentage?: string
) => {
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
  // TODO add slippage percentage
  const swapOutputAmountBN = parseUnits(swapOutputAmount, assetOutDecimals);
  const minimumExpectedShares: bigint = (await publicClient.readContract({
    address: strategyAddress,
    abi: MULTIPOOL_STRATEGY_ABI,
    functionName: "previewDeposit",
    args: [swapOutputAmountBN],
  })) as bigint;
  return {
    minimumExpectedShares: formatUnits(minimumExpectedShares, assetOutDecimals),
    payload: payload,
  };
};

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
  if (publicClient.chain === undefined)
    throw new Error("Please setup the wallet");
  const leverageAddresses = await getLeverageAddresses(publicClient.chain.id);
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

  // TODO add slippage
  // TODO add exit fee calculation
  const { payload, swapOutputAmount: minimumWBTC } =
    await fetchUniswapRouteAndBuildPayload(
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
