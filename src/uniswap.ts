import { AlphaRouter } from "@uniswap/smart-order-router";
import { CurrencyAmount, TradeType, Token } from "@uniswap/sdk-core";
import { Protocol } from "@uniswap/router-sdk";
import { PublicClient, parseUnits } from "viem";
import { Pool } from "@uniswap/v3-sdk";
import { WalletClient, encodePacked, encodeAbiParameters } from "viem";
import { providers } from "ethers";
/**
 * Initializes the uniswap router instance
 * @returns {Object} The router instance
 */
const initializeRouter = (client: PublicClient) => {
  if (!client.chain?.rpcUrls?.default || !client.chain.id || !client.chain.name)
    throw new Error("Please setup the wallet");
  const network = {
    chainId: client.chain.id,
    name: client.chain.name,
  };
  const rpcUrl = client.chain.rpcUrls.default.http[0];
  const ethersProvider = new providers.JsonRpcProvider(rpcUrl, network);
  const router = new AlphaRouter({
    chainId: 1,
    provider: ethersProvider,
  });
  return router;
};
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
export const fetchUniswapRouteAndBuildPayload = async (
  client: PublicClient,
  amount: string,
  inputToken: string,
  inputTokenDecimals: number,
  outputToken: string,
  outputTokenDecimals: number
) => {
  try {
    const router = initializeRouter(client);
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
    const { pools, tokenPath, swapOutputAmount } = mapRouteData(route);
    const { dataTypes, dataValues } = buildPathFromUniswapRouteData(
      pools,
      tokenPath
    );
    const encodedPath = encodePacked(dataTypes, dataValues);
    const deadline = BigInt(131241242); // TODO change it
    const payload = encodeAbiParameters(
      [
        {
          components: [
            {
              name: "path",
              type: "bytes",
            },
            {
              name: "deadline",
              type: "uint256",
            },
          ],
          name: "UniswapV3Data",
          type: "tuple",
        },
      ],
      [
        {
          path: encodedPath,
          deadline: deadline,
        },
      ]
    );
    return payload;
  } catch (err) {
    console.log("fetchUniswapRoute err: ", err);
    throw err;
  }
};

/**
 * Builds the path data for a Uniswap route
 * @param pools The pools to build the path from
 * @param tokens The tokens to build the path from
 */
const buildPathFromUniswapRouteData = (pools: Pool[], tokens: Token[]) => {
  const dataTypes = [];
  const dataValues = tokens.map((t) => t.address);
  let feeIndex = 1;
  for (let i = 0; i < pools.length; i++) {
    const currentPool: any = pools[i];
    if (i === 0) {
      dataTypes.push("address", "uint24", "address");
    } else {
      dataTypes.push("string", "address");
    }
    dataValues.splice(feeIndex, 0, currentPool.fee);
    feeIndex += 2;
  }
  return { dataTypes, dataValues };
};

/**
 * Function to map the route data from uniswap
 * @param {Object} route - The route data
 * @returns {Object} Formatted route data with the necessary data such as pools, token path and swap output amount
 */
const mapRouteData = (route: any) => {
  if (!route) throw new Error("Please enter a valid route");
  const pools = route.route[0].route.pools;
  const tokenPath = route.route[0].route.tokenPath;
  const swapOutputAmount = route.trade.swaps[0].outputAmount.numerator[0] || 0;
  return { pools, tokenPath, swapOutputAmount };
};

export const getUniswapOutputAmount = async (
  client: PublicClient,
  amount: string,
  inputToken: string,
  inputTokenDecimals: number,
  outputToken: string,
  outputTokenDecimals: number
) => {
  const router = initializeRouter(client);
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
  const { pools, tokenPath, swapOutputAmount } = mapRouteData(route);
  return swapOutputAmount;
};
