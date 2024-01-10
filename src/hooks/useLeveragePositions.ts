import axios from "axios";
import { useQuery } from "react-query";
import { LEVERAGE_POSITION_APIS } from "../constants";
import { LeveragePosition } from "../types";

export const LEVERAGE_POSITIONS_QUERY = "leveragePositions";
export const useLeveragePositions = (
  address: string,
  chainId: number
): {
  data: LeveragePosition[] | undefined;
  isLoading: boolean;
  isError: boolean;
} => {
  const result = useQuery(
    [LEVERAGE_POSITIONS_QUERY, address, chainId],
    async () => {
      const api = LEVERAGE_POSITION_APIS[chainId];
      const { data } = await axios.get(`${api}`, {
        params: {
          address: address.toLowerCase(),
        },
      });
      return data;
    }
  );
  return {
    data: result.data,
    isLoading: result.isLoading,
    isError: result.isError,
  };
};
