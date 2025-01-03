import { Account, Aptos, AptosConfig, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk'
import { Deployment, getDefaultFullnodeUrl, getDefaultIndexerUrl, MirageClient, MirageConfig, OrderType, PositionSide } from '@mirage-protocol/sdk'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '.env') }) // Load env variables for private key

async function main() {
  // Initialize client with testnet configuration
  const config = new MirageConfig({ 
    deployment: Deployment.APTOS_TESTNET 
  })
  const mirageClient = new MirageClient(config)
  const aptosClient = new Aptos(
    new AptosConfig({
      fullnode: getDefaultFullnodeUrl(Deployment.APTOS_TESTNET),
      indexer: getDefaultIndexerUrl(Deployment.APTOS_TESTNET),
    })
  )
  
  // Create account from private key
  // WARNING: In production, use secure key management
  const account = await Account.fromPrivateKey({ 
    privateKey: new Ed25519PrivateKey(process.env.PRIVATE_KEY || '') 
  })
  console.log("Account:", account.accountAddress.toString())
  
  // Example market parameters
  const perpSymbol = "BTCPERP"
  const marginSymbol = "mUSD"
  const marginAmount = 1000
  const positionSize = 0.1
  const entryPrice = 101000
  const maxSlippage = 1000
  const takeProfitPrice = 105000
  const stopLossPrice = 95000
  
  // Create position with take profit and stop loss
  console.log("Opening position with take profit and stop loss...")
  const txPayload = await mirageClient.market.transactions.getCreatePositionWithOrderPayload(
    perpSymbol,
    marginSymbol,
    OrderType.MARKET,
    marginAmount,
    positionSize,
    PositionSide.LONG,
    entryPrice,
    maxSlippage,
    {
      takeProfit: takeProfitPrice,
      stopLoss: stopLossPrice
    }
  )

  const tx = await aptosClient.transaction.build.simple({
    sender: account.accountAddress,
    data: txPayload as any
  })

  console.log(tx)
  console.log(txPayload)
  
  // Submit transaction
  const submittedTx = await aptosClient.signAndSubmitTransaction(
    {
      signer: account,
      transaction: tx as any
    }
  )

  await aptosClient.waitForTransaction({
    transactionHash: submittedTx.hash
  })

  console.log(
    `Transaction: https://explorer.aptoslabs.com/txn/${submittedTx.hash}?network=testnet`
  )
}

// Execute the main function and handle any errors
main().catch(console.error)