import fs from "fs"
import { createPublicClient, createWalletClient, encodeFunctionData, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import * as chains from 'viem/chains'

const configPath = process.argv[2]
if (!configPath) throw new Error("No config path variable provided")

const config = JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" }))

console.log(`Starting claim process with the following config:`)
console.log(JSON.stringify(config, null, " "))

function getChain(chainId) {
  return Object.values(chains).filter(x => x.id === chainId)[0]
}

const walletClients = {}
const publicClients = {}
const getWalletClient = (chainId) => {
  if (!walletClients[chainId]) {
    walletClients[chainId] = createWalletClient({
      chain: getChain(chainId),
      transport: http(process.env[`RPC_URL_${chainId}`]),
      account: privateKeyToAccount(process.env[`PRIVATE_KEY_${chainId}`])
    })
  }
  return walletClients[chainId]
}
const getPublicClient = (chainId) => {
  if (!publicClients[chainId]) {
    publicClients[chainId] = createPublicClient({
      chain: getChain(chainId),
      transport: http(process.env[`RPC_URL_${chainId}`])
    })
  }
  return publicClients[chainId]
}

const main = async () => {
  for (const prizeVault of config.prizeVaults) {
    try {
      const distributionEndpoint = `${config.rewardApi}/users/${prizeVault.boosterAddress}/distributions`
      console.log(`Fetching reward distributions for booster (${prizeVault.boosterAddress}) via (${distributionEndpoint})...`)
      const distributions = await (await fetch(distributionEndpoint)).json()
      if (distributions.data) {
        console.log(`${distributions.data.length} distributions found!`)
        for(const distribution of distributions.data) {
          try {
            const chainId = distribution.distributor.chain_id
            const client = getWalletClient(chainId)
            const hash = await client.sendTransaction({
              account: client.account,
              to: distribution.distributor.address,
              data: encodeFunctionData({
                abi: parseAbi(["function claim(address,address,uint256,bytes32[]) external returns (uint256)"]),
                functionName: 'claim',
                args: [
                  prizeVault.boosterAddress,
                  distribution.asset.address,
                  BigInt(distribution.claimable),
                  distribution.proof
                ]
              })
            })
            await getPublicClient(chainId).waitForTransactionReceipt({ hash, confirmations: 3 })
            console.log(`Sent claim tx for ${distribution.claimable} of token ${distribution.asset.address} on ${chainId}: ${client.chain.blockExplorers.default.url}/tx/${hash}`)
          } catch(err) {
            console.error(err)
            console.log(`[Error] Failed to claim rewards for distribution: ${JSON.stringify(distribution)}`)
          }
        }
      }
    } catch(err) {
      console.error(err)
      console.log(`[Error] Failed to fetch distributions for ${prizeVault.boosterAddress}.`)
    }
  }
}
main().catch(console.error)