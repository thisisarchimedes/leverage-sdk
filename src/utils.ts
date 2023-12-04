import axios from "axios";
import { LEVERAGE_ADDRESSES_URL } from "./constants";

export const getLeverageAddresses = async () => {
  const response = await axios.get(LEVERAGE_ADDRESSES_URL);
  return response.data;
};
