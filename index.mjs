import { loadStdlib } from "@reach-sh/stdlib";
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib({REACH_NO_WARN: 'Y'});
const MIN_PRICE = 10;
const USERS = 10;
const FAILS = 2;

const accA = await stdlib.newTestAccount(stdlib.parseCurrency(5000));
const ctcA = accA.contract(backend);
const loyalTok = await stdlib.launchToken(accA, "Loyalty", "LYL", {supply: USERS});

console.log(`Welcome to the point-of-sale machine. This machine processes
payments of varying amounts and rewards each purchase with a loyalty token.
The pos will also process refunds, which return non-network tokens to the customer,
and loyalty tokens to the contract.\n`);

const startBuyers = async () => {
  const runBuyer = async (i) => {
    const acc = await stdlib.newTestAccount(stdlib.parseCurrency(100));
    const ctc = acc.contract(backend, ctcA.getInfo());
    let cost = Math.floor(Math.random() * 100) + MIN_PRICE;
    await acc.tokenAccept(loyalTok.id);
    cost = (i == 0 ? 0 : cost)// forcing a min cost error
    try{
      await ctc.apis.Buyer.purchase(cost);
      const tokensLeft = await ctcA.v.available();
      const bank = await ctcA.v.bank();
      const ev = await ctc.e.Purchase.next();
      const sales = await ctcA.v.sold();
      console.log(`
      Purchase number: ${sales[1]}
      There are ${tokensLeft[1]} loyalty tokens left
      The seller has made ${bank[1]}`);
      //console.log(`Purchase event at ${ev.when} for ${ev.what}`);
    } catch (e) {
      console.log(`${e}`);
    }
    if(i == 1){// 1 wants a refund
      const amt = await ctc.apis.Buyer.refund();
      const left = await ctcA.v.available();
      const sales = await ctcA.v.sold();
      console.log(`
      Customer ${i} is getting a refund of ${amt}
      There are ${left[1]} loyalty tokens left
      Purchase number: ${sales[1]}`);
    }
  }// end of runBuyer
  // 1 refund, 1 amount too low fail
  for(let i = 0; i < USERS + FAILS; i++){
    await runBuyer(i);
  }
}// end of startBuyers

await ctcA.p.Admin({
  params: {
    tok: loyalTok.id,
    min: MIN_PRICE,
    supply: USERS,
  },
  launched: async (contract) => {
    console.log(`Ready at contract: ${contract}\n`);
    await startBuyers();
  },
}),
console.log('Exiting...');