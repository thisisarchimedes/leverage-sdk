import axios from "axios";
import { useQuery } from "react-query";
import { LEVERAGE_POSITION_APIS } from "../constants";
import { LeveragePosition } from "../types";

export const useLeveragePositions = (
  address: string,
  chainId: number
): LeveragePosition[] => {
  const result = useQuery(["leveragePositions", address, chainId], async () => {
    const api = LEVERAGE_POSITION_APIS[chainId];
    const { data } = await axios.get(`${api}`, {
      params: {
        address: address.toLowerCase(),
      },
    });
    return data;
  });
  return result.data;
};
