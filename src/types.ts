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
