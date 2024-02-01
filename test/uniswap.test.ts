import {describe, it, expect} from 'vitest';
import {publicClient} from './config';
import {UniswapService} from '../src/uniswap';
import {FeeAmount} from '@uniswap/v3-sdk';
import {WBTC, WBTC_DECIMALS, WETH} from '../src/constants';
import {Pool} from '@uniswap/v3-sdk';
import {Token} from '@uniswap/sdk-core';
describe('uniswap Service test', () => {
  it('it should build path from uniswap data', () => {
    expect.assertions(1);
    const uniswapService = new UniswapService(publicClient);
    const correctEncodedPath =
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const wbtc = new Token(1, WBTC, WBTC_DECIMALS);
    const weth = new Token(1, WETH, 18);

    const pool = new Pool(
        wbtc,
        weth,
        FeeAmount.MEDIUM,
        '34434812900778534915362663973620107',
        '343616768281113873',
        259657,
    );
    const encodedPath = uniswapService.buildPathFromUniswapRouteDataAndEncode([pool], [wbtc, weth]);
    expect(encodedPath).toBe(correctEncodedPath);
  });
  it('it should  build payload', () => {
    expect.assertions(1);
    const uniswapService = new UniswapService(publicClient);
    const wbtc = new Token(1, WBTC, WBTC_DECIMALS);
    const weth = new Token(1, WETH, 18);

    const pool = new Pool(
        wbtc,
        weth,
        FeeAmount.MEDIUM,
        '34434812900778534915362663973620107',
        '343616768281113873',
        259657,
    );
    const encodedPath = uniswapService.buildPathFromUniswapRouteDataAndEncode([pool], [wbtc, weth]);
    const deadline = BigInt(1702502187);
    const swapOutputAmount = BigInt(1);
    const correctPayload =
      '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000657a1f2b0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002b2260fac5e5542a773aa44fbcfedf7c193bc2c599000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000'; // eslint-disable-line
    const payload = uniswapService.buildPayload(encodedPath, deadline, swapOutputAmount);
    expect(payload).toBe(correctPayload);
  });
});
