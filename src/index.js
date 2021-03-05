// import { getErrorMessage } from "./utils";
// import commander = require("commander");

const {
  getLastBlockNumber,
  processBlock,
} = require('./processor');
const { getErrorMessage } = require('./utils');

const pjson = require("../package.json");
const VERSION = pjson.version;

const commander = require('commander');
commander
	.version(VERSION)
	.option("--start-block [number]", "The block number to start with")
	.option("--end-block [number]", "The block number to stop at")
	.parse(process.argv);
  
const elasticsearch = require('elasticsearch');
// console.log(`connecting to elasticsearch at: ${ process.env.ELASTICSEARCH }`);
// const elasticsearchClient = new elasticsearch.Client({
// 	host: process.env.ELASTICSEARCH,
// });
console.log("connecting to elasticsearch at: http://127.0.0.1:9200/");
const elasticsearchClient = new elasticsearch.Client({
	host: "http://127.0.0.1:9200/",
});

function createBulkEntry(transaction) {
	return [{
		index: {
			_index: `transactions-${ transaction.date.split('T')[0] }`,
			_type: "transaction",
			_id: transaction.hash
		}
	}, transaction];
}

function postTransactions(transactions) {
  if (transactions.length === 0) {
    console.log("\tempty block - skipping");
    return;
  }
	const bulkBody = transactions
		.map(createBulkEntry)
		.reduce((a, b) => a.concat(b), []);

	elasticsearchClient.bulk({
		body: bulkBody
	}, (err, resp) => {
		if (err) {
			console.log("\terror sending bulk: ", err);
		} else {
			console.log("\tbulk sent successfully");
		}
	});
}

async function iterator(current, end) {
  const latestBlockNumber = await getLastBlockNumber();

  end = Math.min(latestBlockNumber, end || latestBlockNumber);

  while (current <= end) {
    try {
      postTransactions(await processBlock(current));
      current++;
    } catch (e) {
      console.log(`failed to retrieve last block: ${ getErrorMessage(e) }`);
      return current;
    }
  }

  return current;
}

async function main() {
  let resolvePromise;
	const promise = new Promise(resolve => {
		resolvePromise = resolve;
	});

  // const endBlock = Number(commander.endBlock) || null;
	// const startBlock = Number(commander.startBlock) || null;
  const endBlock = null;
	const startBlock = 0;

  let lastProcessed = startBlock || startBlock === 0
    ? startBlock : await getLastBlockNumber();

	const thread = async () => {
		lastProcessed = await iterator(lastProcessed, endBlock);

		if (endBlock == null || lastProcessed < endBlock) {
			setTimeout(thread, 10000);
		} else {
			resolvePromise();
		}
	}
	await thread();

  return promise;
}

main().then(() => console.log("finished"));
