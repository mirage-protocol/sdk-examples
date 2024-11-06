import { Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk'
import { AptosAccount, BCS, HexString } from 'aptos'
import { aptosClient, createVaultAndAddCollateralAndBorrow, getCollectionIdForVaultPair, MoveCoin, MoveToken } from '@mirage-protocol/sdk';
import { env } from 'process'


const network = Network.TESTNET
console.log(`Using ${network}`);
const APTOS_CLIENT = aptosClient(network)

// WARNING: do not do this in production code, use a secure method to inject your private keys to your runtime
const account = await Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey("0xdeadbeef") })

console.log("Account", account.accountAddress.toString())

const aptMUSDVaultCollection = getCollectionIdForVaultPair(MoveCoin.APT, MoveToken.mUSD, network)

const collateralToAdd = 0.1
const borrowToTake = 0.01

const payload = await createVaultAndAddCollateralAndBorrow(
    aptMUSDVaultCollection,
    MoveCoin.APT,
    MoveToken.mUSD,
    collateralToAdd,
    borrowToTake,
    network
  )

const rawTx = await APTOS_CLIENT.transaction.build.simple({
    sender: account.accountAddress.toStringLong(),
    data: payload,
  })

const signedTx = await APTOS_CLIENT.transaction.sign({
        signer: account,
        transaction: rawTx,
    })

const sentTx = await APTOS_CLIENT.transaction.submit.simple({
    transaction: rawTx,
    senderAuthenticator: signedTx,
  })



await APTOS_CLIENT.waitForTransaction({
    transactionHash: sentTx.hash,
  })
  
console.log(`Add collateral transaction: https://explorer.aptoslabs.com/txn/${sentTx.hash}?network=testnet`)
  
console.log(`${collateralToAdd} added ${borrowToTake} borrowed!`)

