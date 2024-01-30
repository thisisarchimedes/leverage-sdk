import { PublicClient } from "viem";

import { simulateContract } from "viem/actions/public/simulateContract";

interface ClientService {

   simulateOpenPosition(args:any):Promise<{result:any,request:any}> ;

}

class PublicClientService implements ClientService
{

    publicClient:  PublicClient
    constructor(publicClient:PublicClient){
        this.publicClient=publicClient
    }
     simulateOpenPosition=async(args: any)=>{
        return this.simulateContract({...args})
    }
    simulateContract=async(args: any)=>{
        const {result,request} = await this.publicClient.simulateContract(args)
        return {result,request}
    }
     
}

class FakePublicClientService implements ClientService
{

    simulateOpenPosition= async (args:any)=>
    {
        return {result:"fake",request:args}
    }

}
/*
    