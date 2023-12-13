import axios from "axios";
import { LEVERAGE_ADDRESSES_URL } from "./constants";

export const getLeverageAddresses = async (chainId: number) => {
  const response = await axios.get(LEVERAGE_ADDRESSES_URL[chainId]);
  return response.data;
};
