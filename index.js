require("dotenv").config();
const axios = reqiure("axios");
const ccxt = require("ccxt");

const tick = async (config, binanceClient) => {
  const { assest, base, allocation, spread } = config;
  const market = `${assest}/${base}`;

  const orders = await binanceClient.fetchOpenOrders(market);
  orders.forEach(async order => {
      await binanceClient.cancelOrder(order.id);
  });
  
  const results = await Promise.all([
      axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
      axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
  ]);
  const marketPrice = results[0].data.bitcoin.usd / results[1].data.tether.usd;
  
  const sellPrice = marketPrice * (1 + spread);
  const buyPrice = marketPrice * (1 - spread);
  const balances = await binanceClient.fetchBalance();
  const assetBalance = balances.free[assest];
  const baseBalance = balances.free[base];
  const sellVolume = assestBalance * allocation;
  const buyVolume = (baseBalance * allocation) / marketPrice;

  await binanceClient.creatLimitSellOrder(market, sellVolume, sellPrice);
  await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice);

  console.log(`
    New tick...
    Market: ${market}
    Sell Order: ${sellVolume} @ ${sellPrice}
    Buy Order: ${buyVolume} @ ${buyPrice}
  `);
};

const run = () => {
  const config = {
    assest: "BTC",
    base: "USDT",
    allocation: 0.1, // % funds to trade
    spread: 0.2, // % above and below market price for sell and buy orders
    tickInterval: 2000, // time between ticks
  };

  const binanceClient = new ccxt.binance({
    apiKey: process.env.API_KEY,
    secret: process.env.API_SECRET,
  });

  tick(config, binanceClient);
  setInterval(tick, config.tickInterval, config, binanceClient);
};

run();
