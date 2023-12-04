export interface LedgerEntry {
  collateralAmount: bigint;
  strategyAddress: `0x${string}`;
  strategyShares: bigint;
  wbtcDebtAmount: bigint;
  positionExpirationBlock: bigint;
  liquidationBuffer: bigint;
  state: bigint;
  claimableAmount: bigint;
}
