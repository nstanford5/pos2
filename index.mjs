import { loadStdlib } from "@reach-sh/stdlib";
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib({REACH_NO_WARN: 'Y'});
stdlib.setWalletFallback(stdlib.walletFallback({
  providerEnv: {
    ETH_NODE_URI: 'https://api.s0.b.hmny.io',
  }
}));
const MIN_PRICE = 0.0001;
const USERS = 4;
const FAILS = 2;
const GAS_LIMIT = 5000000;


const accA = await stdlib.newAccountFromMnemonic('gas festival emerge olive topic blue zoo trouble chimney supply young anchor');
accA.setGasLimit(GAS_LIMIT);
const ctcA = accA.contract(backend);
const loyalTok = await stdlib.launchToken(accA, "Loyalty", "LYL", {supply: USERS});

console.log(`Welcome to the point-of-sale machine. This machine processes
payments of varying amounts and rewards each purchase with a loyalty token.
The pos will also process refunds, which return network tokens to the customer,
and loyalty tokens to the contract.\n`);

const getPurchasePrice = (i) => {
  const price = Math.random() * 0.005 + MIN_PRICE;
  return (i == 0 ? 0 : price)
};

const startBuyers = async () => {
  const runBuyer = async (i) => {
    const acc = await stdlib.createAccount();
    await stdlib.transfer(accA, acc, stdlib.parseCurrency(1));
    acc.setGasLimit(GAS_LIMIT);
    const ctc = acc.contract(backend, ctcA.getInfo());
    const cost = getPurchasePrice(i);
    await acc.tokenAccept(loyalTok.id);
    try{
      const txns = await ctc.apis.Buyer.purchase(stdlib.parseCurrency(cost));
      console.log(`Purchase number: ${txns}`);
    } catch (e) {
      console.log(`${e}`);
    }
    if(i == 1){// 1 wants a refund
      const amt = await ctc.apis.Buyer.refund();
      console.log(`Customer ${i} is getting a refund of ${stdlib.formatCurrency(amt)}`);
    }
  }// end of runBuyer
  // 1 refund, 1 amount too low fail
  for(let i = 0; i < USERS + FAILS; i++){
    await runBuyer(i);
  }
}// end of startBuyers

await ctcA.p.Admin({
  params: {
    min: stdlib.parseCurrency(MIN_PRICE),
    tok: loyalTok.id,
    supply: USERS,
  },
  launched: async (contract) => {
    console.log(`Ready at contract: ${contract}\n`);
    await startBuyers();
  },
});
console.log('Exiting...');
