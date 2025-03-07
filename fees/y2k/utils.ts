import { CHAIN } from "../../helpers/chains";
import * as sdk from "@defillama/sdk";
import { getPrices } from "../../utils/prices";
import { ethers } from "ethers";

const tokens = [
  "0x912ce59144191c1204e64559fe8253a0e49e6548", // ARB
  "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", // WETH
];
const treasury = "0x5c84cf4d91dc0acde638363ec804792bb2108258";
const topic0_transfer = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const event_transfer = "event Transfer (address indexed from, address indexed to, uint256 amount)";

export interface ITx {
  topics: string[];
  data: string;
  transactionHash: string;
}

const transfer_interface = new ethers.utils.Interface([event_transfer]);

export const getFees = async (
  vaults: string[],
  fromBlock: number,
  toBlock: number,
  timestamp: number
): Promise<number> => {
  const coins: string[] = [...new Set(tokens.map((token) => `${CHAIN.ARBITRUM}:${token}`))];
  const prices = await getPrices(coins, timestamp);

  let dailyFees = 0;
  for (const token of tokens) {
    const price = prices[`${CHAIN.ARBITRUM}:${token}`].price;
    const decimals = prices[`${CHAIN.ARBITRUM}:${token}`].decimals;
    for (const vault of vaults) {
      const logs_transfer_treasury: ITx[] = (
        await sdk.api.util.getLogs({
          target: token,
          topic: "",
          fromBlock: fromBlock,
          toBlock: toBlock,
          topics: [topic0_transfer, ethers.utils.hexZeroPad(vault, 32), ethers.utils.hexZeroPad(treasury, 32)],
          keys: [],
          chain: CHAIN.ARBITRUM,
        })
      ).output as ITx[];

      const transfer_treasury = logs_transfer_treasury.map((e) => transfer_interface.parseLog(e).args);
      const fee = transfer_treasury.reduce((a, b) => a + Number(b.amount), 0);
      dailyFees += (Number(fee) / 10 ** decimals) * price;
    }
  }
  return dailyFees;
};
