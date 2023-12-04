import { PublicClient, WalletClient, getContract, parseUnits } from "viem";
import { WBTC, WBTC_DECIMALS } from "./constants";
import {
  fetchUniswapRouteAndBuildPayload,
  getUniswapOutputAmount,
} from "./uniswap";
import { getLeverageAddresses } from "./utils";
import POSITION_OPENER_ABI from "./abis/PositionOpener.json";

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
  assetOut: string,
  assetOutDecimals: number,
  strategy: string,
  account: `0x${string}`,
  strategyAddress: string,
  slippagePercentage?: string
) => {
  const leverageAddresses = await getLeverageAddresses();

  const payload = fetchUniswapRouteAndBuildPayload(
    publicClient,
    amount,
    WBTC,
    WBTC_DECIMALS,
    assetOut,
    assetOutDecimals
  );
  const minimumAmount = parseUnits("0", assetOutDecimals); // TODO change it to fetch from strategy
  const bigIntAmount = parseUnits(amount, WBTC_DECIMALS);
  const bigIntAmountToBorrow = parseUnits(amountToBorrow, WBTC_DECIMALS);
  const { request } = await publicClient.simulateContract({
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
};

export const previewOpenPosition = async (
  publicClient: PublicClient,
  amount: string,
  amountToBorrow: string,
  assetOut: string,
  assetOutDecimals: number,
  strategyAddress: string,
  slippagePercentage?: string
) => {
  const swapOutputAmount = await getUniswapOutputAmount(
    publicClient,
    amount,
    WBTC,
    WBTC_DECIMALS,
    assetOut,
    assetOutDecimals
  );
  const leverageAddresses = await getLeverageAddresses();
  const minimumExpectedShares = publicClient.readContract({
    address: leverageAddresses.positionOpener,
    abi: POSITION_OPENER_ABI,
    functionName: "previewOpenPosition",
    args: [
      parseUnits(amount, WBTC_DECIMALS),
      parseUnits(amountToBorrow, WBTC_DECIMALS),
      strategyAddress,
      swapOutputAmount,
    ],
  });
  return minimumExpectedShares;
};
