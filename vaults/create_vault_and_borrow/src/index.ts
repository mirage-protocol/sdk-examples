import { Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk'
import { defaultAptosClient, MirageClient, MoveCoin, MoveToken } from '@mirage-protocol/sdk'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '.env') }) //load in env variables for private key

async function main() {
  // Initialize network and client
  const network = Network.TESTNET
  console.log(`Using ${network}`)

  const mirageClient = new MirageClient(network)
  const aptosClient = defaultAptosClient(network)

  // Create account from private key
  // WARNING: In production, use secure key management
  console.log("Environment variables loaded. PRIVATE_KEY:", process.env.PRIVATE_KEY)
  const account = await Account.fromPrivateKey({ 
    privateKey: new Ed25519PrivateKey(process.env.PRIVATE_KEY) 
  })
  console.log("Account:", account.accountAddress.toString())

  // Get vault collection for APT/mUSD pair
  const vaultCollection = mirageClient.addresses.getCollectionIdForVaultPair(
    MoveCoin.APT, 
    MoveToken.mUSD
  )

  // Set collateral and borrow amounts
  const collateralAmount = 0.1  // 0.1 APT
  const borrowAmount = 0.01     // 0.01 mUSD

  // Create transaction payload
  const txPayload = await mirageClient.vaultTransactions.createVaultAndAddCollateralAndBorrow(
    vaultCollection,
    collateralAmount,
    borrowAmount
  )

  // Build transaction
  const rawTx = await aptosClient.transaction.build.simple({
    sender: account.accountAddress.toStringLong(),
    data: txPayload,
  })

  // Sign transaction
  const signedTx = await aptosClient.transaction.sign({
    signer: account,
    transaction: rawTx,
  })

  // Submit transaction
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
  console.log(
    `Added ${collateralAmount} APT as collateral and borrowed ${borrowAmount} mUSD`
  )
}

// Execute the main function and handle any errors
main().catch(console.error)