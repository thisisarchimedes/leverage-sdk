import { describe, it, expect } from "vitest";
import {
  approveWBTCForPositionOpener,
  openLeveragedPosition,
  previewClosePosition,
  previewOpenPosition,
} from "../leverage";
import { publicClient, walletClient } from "./config";
import { WBTC, WETH } from "../constants";
import ERC20_ABI from "../abis/ERC20.json";
const FRAXBP_ALUSD_STRATEGY = "0xB888b8204Df31B54728e963ebA5465A95b695103";
describe("previewOpenPosition test", async () => {
  // it("should return preview result", async () => {
  //   const minimumExpectedShares = await previewOpenPosition(
  //     publicClient,
  //     "0.24",
  //     "0.24",
  //     FRAXBP_ALUSD_STRATEGY
  //   );
  //   console.log(minimumExpectedShares);
  // });

  it("should open position", async () => {
    const { minimumExpectedShares, payload } = await previewOpenPosition(
      publicClient,
      "0.24",
      "0.24",
      FRAXBP_ALUSD_STRATEGY
    );
    await approveWBTCForPositionOpener(
      publicClient,
      walletClient,
      walletClient.account.address,
      "0.24"
    );
    await openLeveragedPosition(
      publicClient,
      walletClient,
      "0.24",
      "0.24",
      minimumExpectedShares,
      FRAXBP_ALUSD_STRATEGY,
      payload,
      walletClient.account.address
    );
  });

  it("should close position", async () => {
    const { minimumExpectedShares, payload } = await previewOpenPosition(
      publicClient,
      "0.24",
      "0.24",
      FRAXBP_ALUSD_STRATEGY
    );
    await approveWBTCForPositionOpener(
      publicClient,
      walletClient,
      walletClient.account.address,
      "0.24"
    );
    await openLeveragedPosition(
      publicClient,
      walletClient,
      "0.24",
      "0.24",
      minimumExpectedShares,
      FRAXBP_ALUSD_STRATEGY,
      payload,
      walletClient.account.address
    );
  });
});
