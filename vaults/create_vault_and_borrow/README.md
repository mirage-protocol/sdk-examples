# create_vault_and_borrow

This example creates an APT-mUSD vault on testnet and adds collateral to it, then borrows from it.

first edit add in your private key here in src/index.ts

```
const account = await Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey("0xdeadbeef") })
```

then run the following

```
pnpm i

pnpm example
```

Ensure your account has enough APT to deposit as collateral.