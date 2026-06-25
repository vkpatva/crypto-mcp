// One-off smoke test (task 8.4). Run from the project root: `node scripts/smoke.mjs`
// Makes real Alchemy RPC calls against DEFAULT_NETWORK using .env.
import "dotenv/config";
import { loadConfig } from "../dist/config/config.js";
import { ChainContext } from "../dist/chain/context.js";
import { getNativeBalance, getGasPrice, getBlock } from "../dist/tools/read.js";
import { simulateTransaction } from "../dist/tools/write.js";

const mask = (a) =>
  typeof a === "string" && a.startsWith("0x") && a.length === 42
    ? a.slice(0, 6) + "…" + a.slice(-4)
    : a;
const parse = (r) => JSON.parse(r.content[0].text);

const cfg = loadConfig();
const ctx = new ChainContext(cfg);
console.log("network:", cfg.defaultNetwork, "| wallet:", mask(ctx.address));

const bal = parse(await getNativeBalance.handler({ address: ctx.address }, ctx));
console.log("native balance:", bal.formatted, bal.symbol, "(network:", bal.network + ")");

const gas = parse(await getGasPrice.handler({}, ctx));
console.log("gas price (wei):", gas.gasPrice);

const block = parse(await getBlock.handler({ block: "latest" }, ctx));
console.log("latest block:", block.number, "| txs:", block.transactionCount);

const sim = parse(
  await simulateTransaction.handler(
    { kind: "native", to: ctx.address, amount: "0" },
    ctx,
  ),
);
console.log(
  "simulate self-transfer:",
  sim.success ? "OK gas=" + sim.gasEstimate : "REVERT " + sim.revertReason,
);

console.log("\nSMOKE TEST PASSED");
