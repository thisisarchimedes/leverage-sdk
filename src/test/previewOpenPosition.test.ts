import { describe, it, expect } from "vitest";
import { previewClosePosition, previewOpenPosition } from "../leverage";
import { publicClient, walletClient } from "./config";
import { WETH } from "../constants";

describe("previewOpenPosition test", async () => {
  it("should return preview result", async () => {
    const minimumExpectedShares = await previewOpenPosition(
      publicClient,
      "1.24",
      "0.24",
      "0xB888b8204Df31B54728e963ebA5465A95b695103"
    );
    console.log(minimumExpectedShares);
  });
});
