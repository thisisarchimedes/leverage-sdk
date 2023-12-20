import axios from "axios";
import { LEVERAGE_ADDRESSES_URL } from "./constants";
import { LeverageAddressesResponse } from "./types";
export const getLeverageAddresses = async (
  chainId: number
): Promise<LeverageAddressesResponse[]> => {
  if (!LEVERAGE_ADDRESSES_URL[chainId]) {
    throw new Error("Invalid chainId");
  }
  const response = await axios.get(LEVERAGE_ADDRESSES_URL[chainId]);

  return response.data as LeverageAddressesResponse[];
};
