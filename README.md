# pt-v5-morpho-reward-script

Script to claim rewards for morpho prize vaults.

## Installation

Run `npm i`

## How to use

1. Set your environment variables for the RPC URLs and private keys that you want to use for each chain. See `.env.example` for naming details.
2. Create a config JSON file or use an existing one in `./config` that specifies the reward API and addresses to claim for.
3. Run `node src/claimRewards.js config/<YOUR_CONFIG_FILE_NAME>.json` to claim all available rewards.