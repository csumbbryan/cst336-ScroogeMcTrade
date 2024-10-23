const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const bodyParser = require("body-parser");
const dbFunctions = require("./dbaccess");
const { DateTime } = require("luxon");
const app = express();
const port = 3000;
const checkForOpen = false;
//dayChange, gainLoss, priceChange calculated at runtime. Price and marketValue queried at runtime.

app.use(
  session({
    store: new FileStore({}),
    secret: "buy low sell high",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  }),
);


app.use(function (req, res, next) {
  res.locals.formatCurrency = formatCurrency; // Makes formatCurrency() accessible from within EJS
  res.locals.session = req.session; // Makes session accessible from within EJS
  next();
});

class stock {
  constructor(
    symbol,
    name,
    quantityOwned,
    currentPrice,
    priceChangeDol,
    priceChangePer,
    assetValue,
    dayChangeDol,
    dayChangePer,
    costBasis,
    gainLoss,
  ) {
    symbol === undefined ? (this.symbol = "") : (this.symbol = symbol);
    name === undefined ? (this.name = "") : (this.name = name);
    quantityOwned === undefined
      ? (this.quantityOwned = 0)
      : (this.quantityOwned = quantityOwned);
    currentPrice === undefined
      ? (this.currentPrice = 0)
      : (this.currentPrice = currentPrice);
    priceChangeDol === undefined
      ? (this.priceChangeDol = 0)
      : (this.priceChangeDol = priceChangeDol);
    priceChangePer === undefined
      ? (this.priceChangePer = 0)
      : (this.priceChangePer = priceChangePer);
    assetValue === undefined
      ? (this.assetValue = 0)
      : (this.assetValue = assetValue);
    dayChangeDol === undefined
      ? (this.dayChangeDol = 0)
      : (this.dayChangeDol = dayChangeDol);
    dayChangePer === undefined
      ? (this.dayChangePer = 0)
      : (this.dayChangePer = dayChangePer);
    costBasis === undefined
      ? (this.costBasis = 0)
      : (this.costBasis = costBasis);
    gainLoss === undefined ? (this.gainLoss = 0) : (this.gainLoss = gainLoss);
  }
  updateFromJSON(json) {
    //console.log(json);
    this.symbol = json.symbol;
    json.companyName === undefined ? {} : (this.name = json.companyName);
    json.quantityOwned === undefined
      ? {}
      : (this.quantityOwned = json.quantityOwned);
    json.currentPrice === undefined
      ? {}
      : (this.currentPrice = json.currentPrice);
    json.priceChangeDol === undefined
      ? {}
      : (this.priceChangeDol = json.priceChangeDol);
    json.priceChangePer === undefined
      ? {}
      : (this.priceChangePer = json.piceChangePer);
    json.assetValue === undefined ? {} : (this.assetValue = json.assetValue);
    json.dayChangeDol === undefined
      ? {}
      : (this.dayChangeDol = json.dayChangeDol);
    json.dayChangePer === undefined
      ? {}
      : (this.dayChangePer = json.dayChangePer);
    json.costBasis === undefined ? {} : (this.costBasis = json.costBasis);
    json.gainLoss === undefined ? {} : (this.gainLoss = json.gainLoss);
  }
}

class stockList {
  constructor(stockArray) {
    this.stockArray = stockArray;
    this.stockValueTotal = 0;
    this.dayChangePerTotal = 0;
    this.dayChangeDolTotal = 0;
    this.costBasisTotal = 0;
    this.gainLossTotal = 0;
    if (stockArray === undefined) {
      this.stockArray = [];
    } else {
      for (let i = 0; i < stockArray.length; i++) {
        this.stockValueTotal += stockArray[i].assetValue;
        this.dayChangeDolTotal += stockArray[i].dayChangeDol;
        this.costBasisTotal += stockArray[i].costBasis;
        this.gainLossTotal += stockArray[i].gainLoss;
      }
      this.dayChangePerTotal = this.dayChangeDolTotal / this.costBasisTotal;
    }
  }
  addStock(stock) {
    this.stockArray.push(stock);
  }
}

//let stocksOwned = ["NVDA", "MSFT"]; Using database for this now

// Set the view engine to EJS
app.set("view engine", "ejs");

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static("public"));

const apiKey = "7W2OBS0RGFM10T9J";
const searchURL =
  "https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=";
const intradayURL =
  "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=";
const dailyURL =
  "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=";
const weeklyURL = 
  "https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY&symbol=";
const quoteURL =
  "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=";
const overviewURL =
  "https://www.alphavantage.co/query?function=OVERVIEW&symbol=";
const marketStatusURL = "https://www.alphavantage.co/query?function=MARKET_STATUS";
  "https://www.alphavantage.co/query?function=OVERVIEW&symbol=";
let interval = "5min";



/*
//HELPER FUNCTIONS
*/
//Checks if user has logged in, and if not redirects them to login page
function isLoggedIn(req, res) {
  if (req.session.userId >= 0) {
    return true;
  } else {
    res.render("userLogin");
    return false;
  }
}

//function used to add commas to numbers
function addCommas(num) {
  return num.toLocaleString("en", { useGrouping: true });
}

// Takes a number or number-like string (like those from the API) and returns a formatted string
function formatCurrency(input) {
  if (typeof input == "string") {
    return (
      parseFloat(input.replace(",", "")).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  } else if (typeof input == "number") {
    return formatCurrency(input.toString());
  }
}

function validateBuyTransaction(Qty, Price, account) {
  let valid = false;
  let cost = Qty * Price;
  if (account.balance >= cost) {
    valid = true;
  }
  return valid;
}

function validateSellTransaction(qtySelling, qtyOwned) {
  let valid = false;
  if (qtySelling <= qtyOwned) {
    valid = true;
  }
  return valid;
}

/*
//PARSE FUNCTIONS WITH API CALLS
*/

async function isMarketOpen() {
  let url = marketStatusURL + "&apikey=" + apiKey;
  let response = await fetch(url);
  let marketInfo = await response.json();
  let marketStatus = marketInfo["markets"];
  let marketStatusUSA = marketStatus[0];
  //console.log("Market Status: ", marketStatusUSA);
  return marketStatusUSA["current_status"] == "open" 
    ? true
    : false; 
}

async function parseStockSearch(symbol) {
  let url = searchURL + symbol + "&apikey=" + apiKey;
  //console.log(url);
  let response = await fetch(url);
  let stockInfo = await response.json();
  // console.log(stockInfo.length);
  // console.log(stockInfo);
  return stockInfo.bestMatches;
}

async function parseStockInfo(symbol) {
  let url = overviewURL + symbol + "&apikey=" + apiKey;
  let response = await fetch(url);
  let stockInfo = await response.json();
  return stockInfo;
}

async function parseIntraday(symbol) {
  let url =
    intradayURL + symbol + "&interval=" + interval + "&entitlement=delayed" + "&apikey=" + apiKey;
  //console.log(url);
  let dateCompare = DateTime.now().minus({ days: 1 });
  let response = await fetch(url);
  let stockInfo = await response.json();
  stockInfo = stockInfo["Time Series (5min)"];
  for (let key in stockInfo) {
    let date = new Date(key);
    //console.log(key);
    //console.log(stockInfo[key]);
    //console.log(date);
    if(date < dateCompare) {
      delete stockInfo[key];
    } else {
      let timeString = new Date(key).toLocaleTimeString('en-US');
      stockInfo[timeString] = stockInfo[key];
      delete stockInfo[key];
      //console.log(timeString);
    }
  }
  return stockInfo;
}

async function parseWeek(symbol) {
  let url = dailyURL + symbol + "&apikey=" + apiKey;
  //console.log(url);
  let dateCompare = DateTime.now().minus({ weeks: 1 });
  let response = await fetch(url);
  let stockInfo = await response.json();
  stockInfo = stockInfo["Time Series (Daily)"];
  for (let key in stockInfo) {
    let date = DateTime.fromISO(key);
    //console.log("Date: " + date);
    //console.log("Key: " + key);
    if (date < dateCompare) {
      //console.log("Difference: " + dateCompare.diff(date, "days"));
      //console.log("Key being deleted: " + key);
      delete stockInfo[key];
    }
  }
  return stockInfo;
}

async function parseMonth(symbol) {
  let url = dailyURL + symbol + "&apikey=" + apiKey;
  //console.log(url);
  let dateCompare = DateTime.now().minus({ months: 1 });
  let response = await fetch(url);
  let stockInfo = await response.json();
  stockInfo = stockInfo["Time Series (Daily)"];
  for (let key in stockInfo) {
    let date = DateTime.fromISO(key);
      if (date < dateCompare) {
        //console.log("Difference: " + dateCompare.diff(date, "days"));
        //console.log("Key being deleted: " + key);
        delete stockInfo[key];
      }
  }
  return stockInfo;
}

async function parseYear(symbol) {
  let url = weeklyURL + symbol + "&outputSize=" + "full" + "&apikey=" + apiKey;
  //console.log(url);
  let response = await fetch(url);
  let stockInfo = await response.json();
  stockInfo = stockInfo["Weekly Time Series"];
  let dateCompare = DateTime.now().minus({ years: 1 });
  for (let key in stockInfo) {
    //console.log("Key: " + key);
    let date = DateTime.fromISO(key);
    //console.log("Date: " + date.toISO() + " DateCompare: " + dateCompare.toISO());
    if (date < dateCompare) {
      //console.log("Difference: " + dateCompare.diff(date, "days"));
      //console.log("Key being deleted: " + key);
      delete stockInfo[key];
    }
  }
  return stockInfo;
}

async function parseQuote(symbol) {
  symbol = symbol.toUpperCase();
  let url = quoteURL + symbol + "&entitlement=delayed" + "&apikey=" + apiKey;
  let response = await fetch(url);
  stockInfo = await response.json();
  for (let key in stockInfo) {
    //console.log(key);
    //console.log(stockInfo[key]);
  }
  return stockInfo["Global Quote - DATA DELAYED BY 15 MINUTES"];
}

async function parseData(symbol, term) {
  let stock;
  if (term == "day") {
    stock = await parseIntraday(symbol.toUpperCase());
  } else if (term == "week") {
    stock = await parseWeek(symbol.toUpperCase());
  } else if (term == "month") {
    stock = await parseMonth(symbol.toUpperCase());
  } else if (term == "year") {
    stock = await parseYear(symbol.toUpperCase());
  } else {
    //do nothing
  }
  return stock;
}

/*
//ROUTES BELOW
*/

// Route to direct users to the home page
app.get("/", async (req, res) => {
  if (isLoggedIn(req, res)) {
    res.redirect("tableView");
  }
});

// Used for the modal search
app.get("/altStockSearchResults", async (req, res) => {
  const search = req.query.search;
  //console.log("input: ", search);
  stockData = await parseStockSearch(search);
  res.send({search: search, matches: stockData});
});

app.post("/stockDataResults", async (req, res) => {
  const symbol = req.body.symbol;
  term = req.body.term;
  //console.log("stockDataResults Term: " + term);
  if (typeof term === "undefined") term = "year";
  stockData = await parseQuote(symbol);
  stockInfo = await parseStockInfo(symbol);
  res.render("stockInfo", {
    stockInfo: stockInfo,
    stockData: stockData,
    symbol: symbol,
    term: term,
    changeDaily: Number(stockData["09. change"]),
  });
});

// Used in modal search
app.get("/stockInfo", async (req, res) => {
  const symbol = req.query.symbol;
  stockData = await parseQuote(symbol);
  stockInfo = await parseStockInfo(symbol);
  res.render("stockInfo", {
    stockInfo: stockInfo,
    stockData: stockData,
    symbol: symbol,
    term: "day",
    changeDaily: Number(stockData["09. change"]),
  });
});

//UPDATED: Change user query to include session, and modified to search by userId instead of accountId
app.get("/confirmation", async (req, res) => {
  //console.log("Confirmation Req: " + req.query.type);
  //console.log(JSON.stringify(req.query));
  let type = req.query.transactType;
  let symbol = req.query.symbol;
  let transactionQty = req.query.transactionQty;
  let transactionPrice = req.query.currentPrice;
  let userId = req.session.userId;
  let account = await dbFunctions.getAccount(userId);
  let balance = formatCurrency(account[0].balance);
  stockData = await parseStockSearch(symbol);
  if (checkForOpen && ! (await isMarketOpen())) {
    return res.render("transactStock", {
      balance: balance,
      error: "Market is closed. Please try again later."
    });
  }
  if (typeof stockData === "undefined") {
    return res.render("transactStock", {
      balance: balance,
      error: "Must select a stock symbol",
    });
  }
  //console.log("Stock Data: " + JSON.stringify(stockData[0]));
  if (stockData.length == 0) {
    return res.render("transactStock", {
      balance: balance,
      error: "Invalid Stock Symbol",
    });
  }
  let companyName = stockData[0]["2. name"];
  let params = [
    symbol,
    transactionQty,
    transactionPrice,
    account[0].accountId,
    companyName,
  ];
  //console.log(params);
  let stock = await dbFunctions.getStockFromAccount([
    account[0].accountId,
    symbol,
  ]);
  //console.log("stock:", stock);
  let isOwned = typeof stock != "undefined" && stock.length > 0 ? true : false;

  if (type == "buy" && isOwned) {
    const isValid = validateBuyTransaction(
      transactionQty,
      transactionPrice,
      account[0],
    );
    if (!isValid) {
      return res.render("transactStock", {
        balance: balance,
        error: "Insufficient Funds",
      });
    }
    await dbFunctions.purchaseExistingStock(params);
  } else if (type == "buy" && !isOwned) {
    const isValid = validateBuyTransaction(
      transactionQty,
      transactionPrice,
      account[0],
    );
    if (!isValid) {
      return res.render("transactStock", {
        balance: balance,
        error: "Insufficient Funds",
      });
    }
    await dbFunctions.purchaseNewStock(params);
  } else if (type == "sell" && isOwned) {
    const isValid = validateSellTransaction(
      transactionQty,
      stock[0].quantityOwned,
    );
    if (!isValid) {
      return res.render("transactStock", {
        balance: balance,
        error: "Insufficient Shares",
      });
    }
    if (stock[0].quantityOwned == transactionQty) {
      await dbFunctions.sellAllStock(params);
    } else {
      await dbFunctions.sellStock(params);
    }
  } else {
    return res.render("transactStock", {
      balance: balance,
      error: "You do not own this stock",
    });
  }

  res.redirect("/tableView");
});

app.get("/search", async (req, res) => {
  if (isLoggedIn(req, res)) {
    let userId = req.session.userId;
    let account = await dbFunctions.getAccount(userId);
    let user = await dbFunctions.getUser(userId);
    res.render("searchStock", { account: account[0], user: user[0] });
  }
});

app.get("/transactStock", async (req, res) => {
  if (isLoggedIn(req, res)) {
    let userId = req.session.userId;
    let account = await dbFunctions.getAccount(userId);
    let balance = formatCurrency(account[0].balance);
    res.render("transactStock", { balance: balance });
  }
});

app.post("/transactStock", async (req, res) => {
  let symbol = req.body.symbol;
  let userId = req.session.userId;
  let transactType = req.body.transactType;
  let account = await dbFunctions.getAccount(userId);
  let balance = formatCurrency(account[0].balance);
  res.render("transactStock", { symbol: symbol, balance : balance, transactType: transactType });
});

app.get("/depositWithdraw", async (req, res) => {
  if (isLoggedIn(req, res)) {
    let account = await dbFunctions.getAccount(req.session.userId);
    let rows = await dbFunctions.getAccountTransactions(account[0].accountId);
    res.render("depositWithdraw", { account: account[0], transactions: rows });
  }
});

app.post("/depositWithdraw", async (req, res) => {
  await dbFunctions.depositOrWithdraw(req);
  let account = await dbFunctions.getAccount(req.session.userId);
  let rows = await dbFunctions.getAccountTransactions(account[0].accountId);
  res.render("depositWithdraw", { account: account[0], transactions: rows });
});

app.get("/transactionLog", async (req, res) => {
  if (isLoggedIn(req, res)) {
    let account = await dbFunctions.getAccount(req.session.userId);
    let rows = await dbFunctions.getAccountTransactions(account[0].accountId);
    res.render("transactionLog", { account: account[0], transactions: rows });
  }
});

// Responds to request for account transaction data from transaction log page
app.get("/accountLog", async (req, res) => {
  let account = await dbFunctions.getAccount(req.session.userId);
  let rows = await dbFunctions.getAccountTransactions(account[0].accountId);
  res.send({rows: rows});
});

// Responds to request for stock transaction data from transaction log page
app.get("/stockLog", async (req, res) => {
  let account = await dbFunctions.getAccount(req.session.userId);
  let rows = await dbFunctions.getStockTransactions(account[0].accountId);
  res.send({rows: rows});
});

app.get("/userRegister", (req, res) => {
  res.render("userRegister");
});

app.post("/userRegister", async (req, res) => {
  let username = await dbFunctions.registerUser(req);
  if (username.length > 0) {
    // successful registration
    req.session.userId = username;
    res.redirect("/");
  } else {
    res.render("userRegister", { error: "User name invalid." });
  }
});

app.get("/userLogin", (req, res) => {
  if (req.session.userId >= 0) {
    res.redirect("/");
  } else {
    res.render("userLogin");
  }
});

app.post("/userLogin", async (req, res) => {
  let user = await dbFunctions.loginUser(req);
  if (user != -1) {
    // successful login
    req.session.userId = user.userId;
    //console.log("user:", user);
    let account = await dbFunctions.getAccount(user.userId);
    //console.log("login account:", account);
    req.session.accountId = account[0].accountId;
    res.redirect("/");
  } else {
    res.render("userLogin", { error: "Username or password incorrect." });
  }
});

app.get("/userEdit", async (req, res) => {
  if (isLoggedIn(req, res)) {
    let user = await dbFunctions.getUser(req.session.userId);
    res.render("userEdit", { user: user[0] });
  }
});

app.post("/userEdit", async (req, res) => {
  if (isLoggedIn(req, res)) {
    let username = await dbFunctions.editUser(req);
    let user = await dbFunctions.getUser(req.session.userId);
    if (username.length > 0) {
      // successful update
      res.render("userEdit", { user: user[0], error: "Account information updated." })
    } else {
      res.render("userEdit", { user: user[0], error: "Update failed." })
    }
  }
});

app.get("/userLogout", (req, res) => {
  req.session.userId = -1;
  req.session.accountId = -1;
  res.redirect("userLogin");
});

app.get("/chart", (req, res) => {
  res.render("chart");
});

app.get("/tableview", async (req, res) => {
  if (isLoggedIn(req, res)) {
    let stocks = new stockList();
    let accountId = `{"accountId": "${req.session.accountId}"}`;
    let balance = await dbFunctions.getAccountBalance(req.session.accountId);
    //console.log("balance:", balance);
    let stockPrice, previousClose;
    let stocksOwned = await dbFunctions.getStocksFromAccount(
      JSON.parse(accountId)
    );
    
    for (let i = 0; i < stocksOwned.length; i++) {
      let currentStock = new stock(
        stocksOwned[i].symbol,
        stocksOwned[i].companyName,
        stocksOwned[i].quantityOwned
      );
      currentStock.updateFromJSON(stocksOwned[i]);
      //console.log("Current Stock: " + currentStock);

      let stockInfo = await parseQuote(stocksOwned[i].symbol);
      stockPrice = stockInfo["05. price"];
      previousClose = stockInfo["08. previous close"];
      //console.log("Stock being processed: " + stockInfo["01. symbol"]);
      //console.log("Element Symbol: " + currentStock.symbol);
      //console.log("Stock Owned: " + stocksOwned[i].symbol);
      //console.log("Stock Info Price: " + stockPrice);
      //console.log("Stock price prev: " + previousClose);

      currentStock.currentPrice = addCommas(
        (Number(stockPrice)).toFixed(2),
      );
      currentStock.assetValue = addCommas(
        (Number(currentStock.quantityOwned * stockPrice)).toFixed(2),
      );
      currentStock.priceChangeDol =
        (Number(stockPrice-previousClose)).toFixed(2);
      currentStock.priceChangePer =
        (Number(((stockPrice - previousClose) / previousClose) * 100)).toFixed(2);
      currentStock.dayChangeDol =
        (Number(currentStock.priceChangeDol * currentStock.quantityOwned)).toFixed(2);
      currentStock.dayChangePer = currentStock.priceChangePer;
      currentStock.gainLoss = addCommas(
        (
          currentStock.currentPrice * currentStock.quantityOwned -
          currentStock.costBasis
        ).toFixed(2)
      );
      stocks.stockValueTotal +=
        currentStock.quantityOwned * stockPrice;
      stocks.dayChangeDolTotal += Number(currentStock.dayChangeDol);
      stocks.costBasisTotal += Number(currentStock.costBasis);
      stocks.gainLossTotal += Number(currentStock.gainLoss);
      //console.log("Cost Basis Total Cumulative: " + stocks.costBasisTotal);
      //console.log("Element Price: " + currentStock.currentPrice);
      //console.log("Element marketValue: " + currentStock.assetValue);
      //console.log("Price Change: " + currentStock.priceChangeDol);
      stocks.addStock(currentStock);
      dbFunctions.updateStockPricing(currentStock);
    }
    stocks.dayChangePerTotal = (
      (stocks.dayChangeDolTotal /
        (stocks.stockValueTotal - stocks.dayChangeDolTotal)) *
      100
    ).toFixed(2);
    stocks.stockValueTotal = addCommas(
      (Number(stocks.stockValueTotal)).toFixed(2)
    );
    res.render("tableView", {
      database: stocks.stockArray,
      stockValueTotal: stocks.stockValueTotal,
      dayChangeDolTotal: stocks.dayChangeDolTotal,
      dayChangePerTotal: stocks.dayChangePerTotal,
      costBasisTotal: stocks.costBasisTotal,
      gainLossTotal: stocks.gainLossTotal,
      balance: balance,
    });
  }
});

app.post("/chartRefresh", async (req, res) => {
  res.redirect("/stockDataResults")
});

/*
//LOCAL APIs -- Typically used to call datbase or external API for client side access
*/
app.get("/api/stock/:symbol&:accountId", async (req, res) => {
  let stocks = await dbFunctions.getStockFromAccount(req.params);
  res.send(stocks);
});

app.get("/api/stockPrice/:symbol", async (req, res) => {
  let symbol = req.params.symbol;
  //console.log("Symbol: " + symbol);
  let stock = await parseQuote(symbol.toUpperCase());
  //console.log(stock);
  if (stock === undefined) {
  } else {
    //console.log(stock["05. price"]);
    res.send(stock["05. price"]);
  }
});

app.get("/api/stocks/:accountId", async (req, res) => {
  let stocks = await dbFunctions.getStocksFromAccount(req.params);
  res.send(stocks);
});

app.get("/api/stockData/:symbol/:term", async (req, res) => {
  let symbol = req.params.symbol;
  let term = req.params.term;
  let stock = await parseData (symbol, term);
  res.send(stock);
  //console.log("Stock API called with term: " + term + " and symbol: " + symbol);
  
});

app.get("/api/loggedInSession", async (req, res) => {
  let user = await dbFunctions.getUser(req.session.userId);
  let account = await dbFunctions.getAccount(req.session.userId);
  let params = [user[0], account[0]];
  res.send(JSON.stringify(params));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


