import {
  PublicClient,
  WalletClient,
  formatUnits,
  parseUnits,
  zeroAddress,
} from 'viem'
import { WBTC, WBTC_DECIMALS, BLOCKS_PER_MINUTE } from './constants'
import { fetchUniswapRouteAndBuildPayload } from './uniswap'
import { getLeverageAddresses } from './utils'
import MULTIPOOL_STRATEGY_ABI from './abis/MultiPoolStrategy.json'
import ERC20_ABI from './abis/ERC20.json'
import { ClosePositionParams, LedgerEntry } from './types'

// Utility Functions

/**
 * Ensures that the public client is set up and retrieves leverage addresses.
 * This function checks if the public client is properly configured and then fetches leverage addresses for the current chain.
 * 
 * @param {PublicClient} publicClient - An instance of the PublicClient used for blockchain interactions.
 * 
 * @returns {Promise<Array>} A promise that resolves to an array of leverage addresses associated with the current chain ID.
 * 
 * @throws {Error} Throws an error if the public client is not set up.
 */
const ensureClientAndFetchAddresses = async (publicClient: PublicClient) => {
  if (publicClient.chain === undefined)
    throw new Error('Please setup the wallet')
  return await getLeverageAddresses(publicClient.chain.id)
}

/**
 * Finds a specific leverage contract from a list of leverage addresses.
 * This function searches for a contract with a specified name within the given leverage addresses.
 * 
 * @param {Array} leverageAddresses - An array of leverage address objects.
 * @param {string} name - The name of the contract to find within the leverage addresses.
 * 
 * @returns {Object} The leverage contract object that matches the specified name.
 * 
 * @throws {Error} Throws an error if the specified contract name is not found in the leverage addresses.
 */
const findLeverageContract = (leverageAddresses, name: string) => {
  const entry = leverageAddresses.find((item) => item.name === name)
  if (!entry) throw new Error(`No ${name} found`)
  return entry
}

/**
 * Processes a transaction using the public and wallet clients.
 * This function handles the entire lifecycle of a transaction, from simulation to sending the transaction and waiting for its receipt.
 * 
 * @param {PublicClient} publicClient - An instance of the PublicClient used for simulating the contract interaction.
 * @param {WalletClient} walletClient - An instance of the WalletClient used for writing the transaction to the blockchain.
 * @param {Object} contractDetails - The details of the contract interaction, including the address, ABI, function name, and arguments.
 * @param {string} account - The account address that will be used for the transaction.
 * 
 * @returns {Promise<Object>} A promise that resolves to the transaction receipt object.
 * 
 * @throws {Error} Throws an error if the transaction simulation fails, if the transaction hash is not found, or if the transaction receipt is not retrieved.
 */
const processTransaction = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractDetails,
  account,
) => {
  const { request } = await publicClient.simulateContract(contractDetails)
  if (!request) throw new Error('No request found')
  const hash = await walletClient.writeContract(request, account)
  if (!hash) throw new Error('No hash found')
  return await publicClient.waitForTransactionReceipt({ hash })
}

/**
 * Retrieves the current state of a position based on its NFT ID.
 * This function fetches the state of a position from the blockchain using the PositionLedger contract.
 * 
 * @param {PublicClient} publicClient - An instance of the PublicClient used for reading data from the blockchain.
 * @param {string} nftId - The NFT ID representing the position whose state is to be retrieved.
 * 
 * @returns {Promise<Object>} A promise that resolves to the state of the position, including details such as position status, strategy shares, and expiration block.
 * 
 * @throws {Error} Throws an error if unable to fetch leverage addresses or if the PositionLedger contract is not found.
 */
export const getPositionState = async (publicClient:PublicClient, nftId:string) => {
  const leverageAddresses = await ensureClientAndFetchAddresses(publicClient)
  const positionLedger = findLeverageContract(
    leverageAddresses,
    'PositionLedger',
  )
  const positionData = await publicClient.readContract({
    address: positionLedger.address,
    abi: positionLedger.abi,
    functionName: 'getPosition',
    args: [nftId],
  })
  return positionData.state
}

/**
 * Estimates the expiration date of a leveraged position in minutes.
 * This function calculates the time until expiration of a position based on the current blockchain block number and the position's expiration block.
 * 
 * @param {PublicClient} publicClient - An instance of the PublicClient used for blockchain interactions.
 * @param {string} nftId - The NFT ID of the position for which the expiration date is being estimated.
 * 
 * @returns {Promise<number>} A promise that resolves to the estimated number of minutes until the position expires.
 * 
 * @throws {Error} Throws an error if unable to fetch leverage addresses, if the PositionLedger contract is not found, or if there are issues in reading the contract data.
 */
export const getEstimatedPositionExpirationDate = async (
  publicClient: PublicClient,
  nftId: string,
) => {
  const leverageAddresses = await ensureClientAndFetchAddresses(publicClient)
  const positionLedger = findLeverageContract(
    leverageAddresses,
    'PositionLedger',
  )
  const positionData = await publicClient.readContract({
    address: positionLedger.address,
    abi: positionLedger.abi,
    functionName: 'getPosition',
    args: [nftId],
  })
  const currentBlock = await publicClient.getBlockNumber()
  const blocksDelta = positionData.positionExpirationBlock - currentBlock
  const estimatedMinsToExpire =
    parseFloat(blocksDelta.toString()) / BLOCKS_PER_MINUTE
  return estimatedMinsToExpire
}

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
  const leverageAddresses = await ensureClientAndFetchAddresses(publicClient)
  const positionOpener = findLeverageContract(
    leverageAddresses,
    'PositionOpener',
  )

  const {
    strategyAsset: assetOut,
    assetDecimals: assetOutDecimals,
  } = await getOutputAssetFromStrategy(publicClient, strategyAddress)

  const minimumStrategySharesBN = parseUnits(
    minimumStrategyShares,
    assetOutDecimals,
  )
  const amountBN = parseUnits(amount, WBTC_DECIMALS)
  const amountToBorrowBN = parseUnits(amountToBorrow, WBTC_DECIMALS)

  const openPositionStruct = {
    collateralAmount: amountBN,
    wbtcToBorrow: amountToBorrowBN,
    strategy: strategyAddress,
    minStrategyShares: minimumStrategySharesBN,
    swapRoute: '0',
    swapData: payload,
    exchange: zeroAddress,
  }

  const transactionReceipt = await processTransaction(
    publicClient,
    walletClient,
    {
      address: positionOpener.address,
      abi: positionOpener.abi,
      functionName: 'openPosition',
      args: [openPositionStruct],
      account,
    },
    account,
  )

  return transactionReceipt
}

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
  slippagePercentage = "50"
) => {
  if (Number(slippagePercentage) > 10000)
    throw new Error('Slippage percentage cannot be greater than 10000')

  const {
    strategyAsset: assetOut,
    assetDecimals: assetOutDecimals,
  } = await getOutputAssetFromStrategy(publicClient, strategyAddress)

  const totalAmount = (Number(amount) + Number(amountToBorrow)).toString()
  const { payload, swapOutputAmount } = await fetchUniswapRouteAndBuildPayload(
    publicClient,
    totalAmount,
    WBTC,
    WBTC_DECIMALS,
    assetOut,
    assetOutDecimals,
  )

  const swapOutputAmountBN = parseUnits(swapOutputAmount, assetOutDecimals)
  let minimumExpectedShares = await publicClient.readContract({
    address: strategyAddress,
    abi: MULTIPOOL_STRATEGY_ABI,
    functionName: 'previewDeposit',
    args: [swapOutputAmountBN],
  })

  const slippagePercentageBN = BigInt(10000 - Number(slippagePercentage))
  minimumExpectedShares =
    (minimumExpectedShares * slippagePercentageBN) / BigInt(10000)

  return {
    minimumExpectedShares: formatUnits(minimumExpectedShares, assetOutDecimals),
    payload,
  }
}

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
  const leverageAddresses = await ensureClientAndFetchAddresses(publicClient)
  const positionCloser = findLeverageContract(
    leverageAddresses,
    'PositionCloser',
  )

  const closePositionStruct = {
    nftId: nftId,
    minWBTC: parseUnits(minWBTC, WBTC_DECIMALS),
    swapRoute: '0',
    swapData: payload,
    exchange: zeroAddress,
  }

  const transactionReceipt = await processTransaction(
    publicClient,
    walletClient,
    {
      address: positionCloser.address,
      abi: positionCloser.abi,
      functionName: 'closePosition',
      args: [closePositionStruct],
      account,
    },
    account,
  )

  return transactionReceipt
}

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
  slippagePercentage = "50"
) =>{
  if (Number(slippagePercentage) > 10000)
    throw new Error('Slippage percentage cannot be greater than 10000')

  const leverageAddresses = await ensureClientAndFetchAddresses(publicClient)
  const positionLedger = findLeverageContract(
    leverageAddresses,
    'PositionLedger',
  )

  const positionData = await publicClient.readContract({
    address: positionLedger.address,
    abi: positionLedger.abi,
    functionName: 'getPosition',
    args: [nftId],
  })

  const minimumExpectedAssets = await publicClient.readContract({
    address: positionData.strategyAddress,
    abi: MULTIPOOL_STRATEGY_ABI,
    functionName: 'convertToAssets',
    args: [positionData.strategyShares],
  })

  const strategyAsset = await publicClient.readContract({
    address: positionData.strategyAddress,
    abi: MULTIPOOL_STRATEGY_ABI,
    functionName: 'asset',
  })

  const assetDecimals = await publicClient.readContract({
    address: strategyAsset,
    abi: ERC20_ABI,
    functionName: 'decimals',
  })

  const {
    payload,
    swapOutputAmount: minimumWBTC,
  } = await fetchUniswapRouteAndBuildPayload(
    publicClient,
    formatUnits(minimumExpectedAssets, assetDecimals),
    strategyAsset,
    assetDecimals,
    WBTC,
    WBTC_DECIMALS,
  )

  const slippagePercentageBN = BigInt(10000 - Number(slippagePercentage))
  const minimumWBTCBN = parseUnits(minimumWBTC, WBTC_DECIMALS)
  const minimumWBTCWithSlippage =
    (minimumWBTCBN * slippagePercentageBN) / BigInt(10000)

  return {
    minimumWBTC: formatUnits(minimumWBTCWithSlippage, WBTC_DECIMALS),
    payload,
  }
}

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
) =>  {
  const leverageAddresses = await ensureClientAndFetchAddresses(publicClient)
  const positionOpener = findLeverageContract(
    leverageAddresses,
    'PositionOpener',
  )

  const amountBN = parseUnits(amount, WBTC_DECIMALS)

  const transactionReceipt = await processTransaction(
    publicClient,
    walletClient,
    {
      address: WBTC,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [positionOpener.address, amountBN],
      account,
    },
    account,
  )

  return transactionReceipt
}

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
  const leverageAddresses = await ensureClientAndFetchAddresses(publicClient)
  const expiredVault = findLeverageContract(leverageAddresses, 'ExpiredVault')

  const transactionReceipt = await processTransaction(
    publicClient,
    walletClient,
    {
      address: expiredVault.address,
      abi: expiredVault.abi,
      functionName: 'claim',
      args: [nftId],
      account,
    },
    account,
  )

  return transactionReceipt
}

/**
 * Retrieves the asset and its decimal count associated with a given strategy.
 * This function is intended to provide details about the asset that a strategy operates with.
 * 
 * @param {PublicClient} publicClient - An instance of the PublicClient used for reading data from the blockchain.
 * @param {string} strategyAddress - The blockchain address of the strategy contract from which the asset details are to be fetched.
 * 
 * @returns {Object} An object containing two properties: 
 *                    - `strategyAsset`: The address of the asset used in the strategy.
 *                    - `assetDecimals`: The number of decimal places used for the asset.
 *
 * @throws {Error} Throws an error if the public client fails to read from the contract.
 */
export const getOutputAssetFromStrategy = async (
  publicClient: PublicClient,
  strategyAddress: string,
) => {
  const strategyAsset = await publicClient.readContract({
    address: strategyAddress,
    abi: MULTIPOOL_STRATEGY_ABI,
    functionName: 'asset',
  })

  const assetDecimals = await publicClient.readContract({
    address: strategyAsset,
    abi: ERC20_ABI,
    functionName: 'decimals',
  })

  return { strategyAsset, assetDecimals }
}
