import { PublicClient } from "viem";

import { simulateContract } from "viem/actions/public/simulateContract";

interface ClientService {
  simulateOpenPosition(args: any): Promise<{ result: any; request: any }>;
}

class FakePublicClientService implements ClientService {
  simulateOpenPosition = async (args: any) => {
    return { result: "fake", request: args };
  };
}
