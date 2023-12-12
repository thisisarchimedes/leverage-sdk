import { describe, it, expect } from "vitest";
import {
  openLeveragedPosition,
  previewClosePosition,
  previewOpenPosition,
} from "../leverage";
import { publicClient, walletClient } from "./config";
import { WETH } from "../constants";

const FRAXBP_ALUSD_STRATEGY = "0xB888b8204Df31B54728e963ebA5465A95b695103";
describe("previewOpenPosition test", async () => {
  it("should return preview result", async () => {
    const minimumExpectedShares = await previewOpenPosition(
      publicClient,
      "0.24",
      "0.24",
      FRAXBP_ALUSD_STRATEGY
    );
    console.log(minimumExpectedShares);
  });

  //   it("should open position", async () => {
  //     const minimumExpectedShares = await previewOpenPosition(
  //       publicClient,
  //       "1.24",
  //       "0.24",
  //       FRAXBP_ALUSD_STRATEGY
  //     );
  //     await openLeveragedPosition(
  //       publicClient,
  //       walletClient,
  //       "1.24",
  //       "0.24",
  //       minimumExpectedShares,
  //       FRAXBP_ALUSD_STRATEGY,
  //       walletClient.account.address
  //     );
  //   });
});
