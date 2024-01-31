import { describe, it, expect } from "vitest";
import { ClientService } from "../src/clientService";
import { publicClient, walletClient, CHAIN_ID } from "./config";
describe("Client Service test", () => {
  it("it should fetch chain id", async () => {
    const clientService = new ClientService(publicClient, walletClient);
    const chainId = clientService.getChainId();
    expect(chainId).toBe(CHAIN_ID);
  });
  it("it should fetch block number", async () => {
    const clientService = new ClientService(publicClient, walletClient);
    const blockNumber = await clientService.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0);
  });
});
