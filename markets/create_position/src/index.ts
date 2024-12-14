import { Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk'
import { defaultAptosClient, MirageClient, MoveToken, Perpetual, PositionSide } from '@mirage-protocol/sdk'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '.env') }) // Load env variables for private key

async function main() {
  // Initialize network and client
  const network = Network.TESTNET
  console.log(`Using ${network}`)
  const mirageClient = new MirageClient(network)
  const aptosClient = defaultAptosClient(network)

  // Create account from private key
  // WARNING: In production, use secure key management
  const account = await Account.fromPrivateKey({ 
    privateKey: new Ed25519PrivateKey(process.env.PRIVATE_KEY) 
  })
  console.log("Account:", account.accountAddress.toString())

  // Example market parameters
  const marketAddress = mirageClient.addresses.getCollectionIdForPerpPair(MoveToken.mUSD, Perpetual.BTCPERP)
  const marginAmount = 1000
  const positionSize = 0.1
  const entryPrice = 101000
  const maxSlippage = 1000
  const takeProfitPrice = 105000
  const stopLossPrice = 95000

  // Open a long position with TPSL
  console.log("Opening position with take profit and stop loss...")
  const openPositionTx = await mirageClient.marketTransactions.openPositionWithTpsl(
    marketAddress,
    marginAmount,
    positionSize,
    PositionSide.LONG,
    entryPrice,
    maxSlippage,
    takeProfitPrice,
    stopLossPrice
  )

  // Build transaction
  const rawTx = await aptosClient.transaction.build.simple({
    sender: account.accountAddress.toStringLong(),
    data: openPositionTx,
  })

  // Sign and submit transaction
  const signedTx = await aptosClient.transaction.sign({
    signer: account,
    transaction: rawTx,
  })

  const submittedTx = await aptosClient.transaction.submit.simple({
    transaction: rawTx,
    senderAuthenticator: signedTx,
  })

  // Wait for confirmation
  await aptosClient.waitForTransaction({
    transactionHash: submittedTx.hash,
  })

  console.log(
    `Transaction: https://explorer.aptoslabs.com/txn/${submittedTx.hash}?network=testnet`
  )

  // Get position information
  const positions = await mirageClient.marketViews.getPositionIdsByMarketAndOwner(
    MoveToken.mUSD,
    Perpetual.BTCPERP,
    account.accountAddress.toString()
  )

  if (positions.length > 0) {
    const positionInfo = await mirageClient.marketViews.getAllPositionInfo(
      positions[0],    // Get first position
      entryPrice,      // Current BTC price
      1                // mUSD price
    )

    console.log("\nPosition Information:")
    console.log(`Market Address: ${positionInfo.marketObjectAddress}`)
    console.log(`Opening Price: $${positionInfo.openingPrice}`)
    console.log(`Position Direction: ${positionInfo.isLong ? 'Long' : 'Short'}`)
    console.log(`Margin Amount: ${positionInfo.marginAmount} USDC`)
    console.log(`Position Size: ${positionInfo.positionSize} BTC`)
    console.log(`Liquidation Price: $${positionInfo.liquidationPrice}`)
    console.log(`Maintenance Margin: $${positionInfo.maintenanceMarginUsd}`)
    console.log(`Outstanding Funding: ${positionInfo.outstandingFunding}`)
  }

  // Example of placing a limit order
  console.log("\nPlacing limit order...")
  const limitOrderTx = await mirageClient.marketTransactions.placeLimitOrder(
    positions[0],           // Position address
    Perpetual.BTCPERP,
    marginAmount,
    positionSize * 0.5,    // Add 50% to position
    true,                  // Long position
    103000,                 // Trigger at 103,000
    maxSlippage,
    true,                  // Increase position
    true,                  // Trigger above price
    BigInt(Math.floor(Date.now() / 1000) + 86400)  // 24h expiration
  )

  // Build, sign and submit limit order transaction
  const rawLimitTx = await aptosClient.transaction.build.simple({
    sender: account.accountAddress.toStringLong(),
    data: limitOrderTx,
  })

  const signedLimitTx = await aptosClient.transaction.sign({
    signer: account,
    transaction: rawLimitTx,
  })

  const submittedLimitTx = await aptosClient.transaction.submit.simple({
    transaction: rawLimitTx,
    senderAuthenticator: signedLimitTx,
  })

  await aptosClient.waitForTransaction({
    transactionHash: submittedLimitTx.hash,
  })

  console.log(
    `Limit Order Transaction: https://explorer.aptoslabs.com/txn/${submittedLimitTx.hash}?network=testnet`
  )
}

// Execute the main function and handle any errors
main().catch(console.error)