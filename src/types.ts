import {Abi} from 'viem';

export interface LedgerEntry {
  collateralAmount: bigint;
  strategyAddress: `0x${string}`;
  strategyShares: bigint;
  wbtcDebtAmount: bigint;
  poistionOpenBlock: bigint;
  positionExpirationBlock: bigint;
  liquidationBuffer: bigint;
  state: bigint;
  claimableAmount: bigint;
}

export interface ClosePositionParams {
  nftId: string;
  minWBTC: bigint;
  swapRoute: string;
  swapData: string;
  exchange: string;
}

export interface LeverageAddressesResponse {
  name: string;
  address: `0x${string}`;
  abi: Abi;
}

export interface LeveragePosition {
  nftId: string;
  user: string;
  debtAmount: string;
  timestamp: number;
  currentPositionValue: string;
  strategyShares: string;
  strategy: string;
  blockNumber: number;
  positionExpireBlock: number;
  positionState: string;
  collateralAmount: string;
  claimableAmount: string;
}
