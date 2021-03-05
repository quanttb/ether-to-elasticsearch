const Web3 = require('web3');
const web3Helper = require('web3-abi-helper').Web3Helper;

// const NODE_ADDRESS = `http://${process.env.PARITY}`;
const NODE_ADDRESS = "http://127.0.0.1:8545/";

const web3 = new Web3(new Web3.providers.HttpProvider(NODE_ADDRESS));

async function getLastBlockNumber() {
	return await web3.eth.getBlockNumber();
}

async function getBlock(blockId) {
  if (!blockId && blockId !== 0) {
    blockId = await getLastBlockNumber();
  }

  console.log(blockId);

  return await web3.eth.getBlock(blockId, true);
}

function normalizeNumber(num, decimals) {
	if (typeof num === "string") {
		num = Number(num);
	}

	return num / Math.pow(10, decimals);
}

function decode(input) {
	try {
		return web3Helper.decodeMethod(input);
	} catch(e) {
		return null;
	}
}

function processTransaction(transaction, date) {
  const decoded = decode(transaction.input);
  const overrides = {
		date,
		coin: "ETH",
		coinName: "Ether",
		decodedInput: decoded,
		sender: transaction.from,
		value: normalizeNumber(transaction.value, 18),
		gasPrice: normalizeNumber(transaction.gasPrice, 9)
	};

  if (decoded && decoded.method.name.startsWith("transfer")) {
		const token =  {
			symbol: "<UNK>",
			name: "Unknown",
			decimals: 18
		};

		overrides.coin = token.symbol;
		overrides.coinName = token.name;
		overrides.to = decoded.params.to;
		overrides.value = normalizeNumber(decoded.params.value, token.decimals);

		if (decoded.method.name.startsWith("transferFrom(")) {
			overrides.from = decoded.params.from;
		}
	}

	return Object.assign({}, transaction, overrides);
}

async function processBlock(block) {
  if (typeof block === "number") {
		block = await getBlock(block);
	}
	console.log(`analyzing block #${ block.number }`);

	const originalTransactions = block.transactions;
	const date = new Date(block.timestamp * 1000).toISOString();

	console.log(`\tcontaining ${ originalTransactions.length } transactions`);

	return originalTransactions.map(transaction => processTransaction(transaction, date));
}

module.exports = {
  getLastBlockNumber,
  processBlock,
}
