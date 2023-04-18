import { RedAlert } from "./RedAlert";

async function main() {
  const redAlert = await RedAlert.init();
  const data = await redAlert.read();
  console.log(data);
}

main();
