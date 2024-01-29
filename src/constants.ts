export const WBTC_DECIMALS = 8;
export const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
export const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const BLOCKS_PER_MINUTE = 4.3;
export const LEVERAGE_ADDRESSES_URL: {
  [key: number]: string
} = {
  1: 'https://smart-contract-backend-config.s3.amazonaws.com/abis/tenderly_fork_leverage_abis.json',
  1337: 'https://smart-contract-backend-config.s3.amazonaws.com/abis/tenderly_fork_leverage_abis.json',
  11: 'https://smart-contract-backend-config.s3.amazonaws.com/abis/demo_leverage_abis.json',
  12: 'https://smart-contract-backend-config.s3.amazonaws.com/abis/stable_leverage_abis.json',
  31337: 'https://smart-contract-backend-config.s3.us-east-1.amazonaws.com/abis/oleg_test_fork_leverage_abis.json',
};

export const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

export const LEVERAGE_POSITION_APIS: {
  [key: number]: string
} = {
  1: 'https://2wl1ljv33k.execute-api.us-east-1.amazonaws.com/prod/positions',
  1337: 'https://2wl1ljv33k.execute-api.us-east-1.amazonaws.com/prod/positions',
  11: 'https://2wl1ljv33k.execute-api.us-east-1.amazonaws.com/prod/positions',
  12: 'https://2wl1ljv33k.execute-api.us-east-1.amazonaws.com/prod/positions',
  31337: 'https://2wl1ljv33k.execute-api.us-east-1.amazonaws.com/prod/positions',
};
