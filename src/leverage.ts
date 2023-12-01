import { WalletClient, parseUnits } from "viem";
import { WBTC, WBTC_DECIMALS } from "./constants";
import { fetchUniswapRouteAndBuildPayload } from "./uniswap";
/**
 * Function to open a leveraged position
 * @param {string} amount - The amount to open with
 * @param {string} amountToBorrow - The amount to borrow
 * @param {string} asset - The asset to swap to
 * @returns {string} The transaction hash
 */
export const openLeveragedPosition = async (
  client: WalletClient,
  amount: string,
  amountToBorrow: string,
  assetOut: string,
  assetOutDecimals: number,
  slippagePercentage?: string
) => {
  // TODO add leverageEngine contract

  const payload = fetchUniswapRouteAndBuildPayload(
    client,
    amount,
    WBTC,
    WBTC_DECIMALS,
    assetOut,
    assetOutDecimals
  );
  //   const minimumAmount = await selectedStrategy.contract.read.previewDeposit([
  //     toBigInt(`${0}`, 6),
  //   ]);

  //   console.log({
  //     bigIntAmount,
  //     bigIntAmountToBorrow,
  //     selectedStrategyAddress: selectedStrategy.address,
  //     minimumAmount,
  //     payload,
  //   });
  //   const { request } = await leverageEngineContract.simulate.openPosition(
  //     [
  //       bigIntAmount,
  //       bigIntAmountToBorrow,
  //       selectedStrategy.address,
  //       minimumAmount,
  //       // We only have one route for now, so we send 0
  //       0,
  //       payload,
  //       // This is address(0) for now
  //       "0x0000000000000000000000000000000000000000",
  //     ],
  //     { account: address }
  //   );
  //   if (!request) return "No request found";
  //   const hash = await walletClient.writeContract(request);
  //   console.log({ request, hash });
  //   if (!hash) return "No hash found";
  //   const transactionReceipt = await publicClient.waitForTransactionReceipt({
  //     hash,
  //   });
  //   console.log({ transactionReceipt });
  //   if (!transactionReceipt) return "No transaction receipt";
};
