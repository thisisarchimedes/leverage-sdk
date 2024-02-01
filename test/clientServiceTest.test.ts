import {describe, it, expect} from 'vitest';
import {ClientService} from '../src/clientService';
import {publicClient, walletClient, CHAIN_ID} from './config';
describe('client Service test', () => {
  it('it should fetch chain id', () => {
    expect.assertions(1);
    const clientService = new ClientService(publicClient, walletClient);
    const chainId = clientService.getChainId();
    expect(chainId).toBe(CHAIN_ID);
  });
  it('it should fetch block number', async () => {
    expect.assertions(1);
    const clientService = new ClientService(publicClient, walletClient);
    const blockNumber = await clientService.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0);
  });
});
