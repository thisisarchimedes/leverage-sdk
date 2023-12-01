import { AlphaRouter } from "@uniswap/smart-order-router";
import { CurrencyAmount, TradeType, Token } from "@uniswap/sdk-core";
import { Protocol } from "@uniswap/router-sdk";
import { parseUnits } from "viem";

/**
 * Function to retrieve the uniswap route from the router
 * @param {Object} router - The router instance
 * @param {string} amount - The amount to swap
 * @param {string} inputToken - The asset to swap from
 * @param {number} inputTokenDecimals - The asset decimals
 * @param {string} outputToken - The asset to swap to
 * @param {number} outputTokenDecimals - The asset decimals
 * @returns {Object} The uniswap route
 */
export const fetchUniswapRoute = async (
  router: AlphaRouter,
  amount: string,
  inputToken: string,
  inputTokenDecimals: number,
  outputToken: string,
  outputTokenDecimals: number
) => {
  try {
    // Primary token always will be WBTC for now
    const primaryAsset = new Token(1, inputToken, inputTokenDecimals);
    // Secondary token will be the strategy underlying asset
    const secondaryAsset = new Token(1, outputToken, outputTokenDecimals);
    // We only use V3 protocol for now
    const protocols = ["V3"] as Protocol[];
    if (!primaryAsset || !secondaryAsset) return "Please enter a valid asset";
    const amountBN = parseUnits(amount, inputTokenDecimals).toString();
    // We retrieve the route from the uniswap router
    const route: any = await router.route(
      CurrencyAmount.fromRawAmount(primaryAsset, amountBN),
      secondaryAsset,
      TradeType.EXACT_INPUT,
      undefined,
      { protocols }
    );
    return route;
  } catch (err) {
    console.log("fetchUniswapRoute err: ", err);
    throw err;
  }
};
