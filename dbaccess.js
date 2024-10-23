const mysql = require("mysql");
const bcrypt = require("bcrypt");
const { type } = require("os");

const pool = mysql.createPool({
  connectionLimit: 10,
  host: "u0zbt18wwjva9e0v.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
  user: "jzprqr5m07q2knkq",
  password: "aezln75z4dgyrxxi",
  database: "fhuv5cq9mobzb5bp",
});

async function executeSQL(sql, params) {
  return new Promise(function (resolve, reject) {
    pool.query(sql, params, function (err, rows, fields) {
      if (err) throw err;
      resolve(rows);
    });
  });
}

async function getAccount(userId) {
  let sql = `SELECT * FROM accounts 
            WHERE userId = ?`;
  rows = await executeSQL(sql, [userId]);
  return rows;
}

async function getUser(userId) {
  let sql = `SELECT * FROM userT 
            WHERE userId = ?`;
  rows = await executeSQL(sql, [userId]);
  return rows;
}

async function getAccountBalance(accountId) {
  let sql = `SELECT balance FROM accounts
            WHERE accountId = ?`;
  //console.log("accountId:", accountId);
  rows = await executeSQL(sql, [accountId]);
  //console.log("rows:", rows);
  return rows[0].balance;
}

async function getAccountTransactions(accountId) {
  let sql = `SELECT * FROM accountTransactions 
            WHERE accountId = ?
            ORDER BY aTransactionId DESC`;
  rows = await executeSQL(sql, [accountId]);
  return rows;
}

async function getStockTransactions(accountId) {
  let sql = `SELECT * FROM stockTransactions 
            WHERE accountId = ?
            ORDER BY sTransactionId DESC`;
  rows = await executeSQL(sql, [accountId]);
  return rows;
}

async function setAccountBalance(accountId, balance) {
  let sql = `UPDATE accounts
            SET balance = ?
            WHERE accountId = ?`;
  rows = await executeSQL(sql, [balance, accountId]);
  return rows;
}

const logStockTransaction = async (type, date, symbol, qty, sharePrice, accountId) => {
  let amount = qty * sharePrice
  amount > 0 && type != "buy" ? amount = amount : amount = -amount;
  let balance = await getAccountBalance(accountId) + amount;
  //console.log("Balance: ", balance);
  let sqlAccount = `INSERT INTO accountTransactions (aTransactionType, aTransactionDate, aTransactionAmount, aTransactionCBalance, accountId)
  VALUES (?, ?, ?, ?, ?)`;
  let paramsAccount = [type, date, amount, balance, accountId];
  let rowsAccount = await executeSQL(sqlAccount, paramsAccount);

  let rowsBalance = await setAccountBalance(accountId, balance);
  let sqlStock = `INSERT INTO stockTransactions (sTransactionType, sTransactionDate, sTransactionSymbol, sTransactionQty, sTransactionSharePrice, sTransactionAmount, accountId)
  VALUES (?, ?, ?, ?, ?, ?, ?)`;
  let paramsStock = [type, date, symbol, qty, sharePrice, amount, accountId];
  let rowsStock = await executeSQL(sqlStock, paramsStock);
  if (rowsAccount.affectedRows == 1 && rowsStock.affectedRows == 1 && rowsBalance.affectedRows == 1) {
    return true;
  }
  return false;
}

//NOT READY FOR USE -- REQUIRES UPDATE TO BALANCE HANDLING
const logDWTransaction = async (type, date, amount, accountId) => {
  amount < 0 ? -amount : amount;
  let balance = await getAccountBalance(accountId);
  let sqlAccount = `INSERT INTO accountTransactions (aTransactionType, aTransactionDate, aTransactionAmount, aTransactionCBalance, accountId)
  VALUES (?, ?, ?, ?, ?)`;
  let paramsAccount = [type, date, amount, balance, accountId];
  let rowsAccount = await executeSQL(sqlAccount, paramsAccount);
  if(rowsAccount.affectedRows == 1) {
    return true;
  }
}

const getStockFromAccount = async (req) => {
  //console.log(JSON.stringify(req));
  let account = req[0];
  let symbol = req[1];
  //console.log("Account: " + account);
  //console.log("Symbol: " + symbol);
  let sql = `SELECT *
    FROM stockList
    WHERE symbol = ? AND accountId = ?`;
  let params = [symbol, account];
  //console.log("Params: " + params);
  let rows = await executeSQL(sql, params);
  return rows;
};

const getStocksFromAccount = async (req) => {
  let account = req.accountId;
  //console.log("Account: " + account);
  let sql = `SELECT symbol, companyName, quantityOwned, currentPrice, pricePurchased, assetValue, costBasis
    FROM stockList
    WHERE accountId = ?`;
  let params = [account];
  let rows = await executeSQL(sql, params);
  //console.log(rows);
  return rows;
};

const updateStockPricing = async (req) => {
  //console.log(req.symbol);
  let symbol = req.symbol;
  let quantityOwned = req.quantityOwned;
  let currentPrice = req.currentPrice;
  let assetValue = req.quantityOwned * req.currentPrice;
  let sql = `UPDATE stockList
    SET quantityOwned = ?, currentPrice = ?, assetValue = ?
    WHERE symbol = ?`;
  let params = [quantityOwned, currentPrice, assetValue, symbol];
  let rows = await executeSQL(sql, params);
  return rows;
};

const purchaseExistingStock = async (req) => {
  //console.log(req);
  let symbol = req[0];
  symbol = symbol.toUpperCase();
  let transactionQty = req[1];
  let transactionSharePrice = req[2];
  let transactionDate = new Date().toISOString().split("T")[0];
  let accountId = req[3];
  //console.log("Updating buy transaction");
  if(logStockTransaction("buy", 
                         transactionDate, 
                         symbol, 
                         transactionQty, 
                         transactionSharePrice, 
                         accountId)) {
      //console.log("updating stockList");
      let sqlUpdate = `UPDATE stockList
        SET quantityOwned = quantityOwned + ?, currentPrice = ?, 
          pricePurchased = (pricePurchased * quantityOwned + ? * ?) / (quantityOwned + ?),
          costBasis = costBasis + ? * ?
          WHERE symbol = ?;`;
      let paramsUpdate = [
        transactionQty,
        transactionSharePrice,
        transactionQty,
        transactionSharePrice,
        transactionQty,
        transactionQty,
        transactionSharePrice,
        symbol,
      ];
      let rowsUpdate = await executeSQL(sqlUpdate, paramsUpdate);
      return rowsUpdate;
  } else {
    console.log("Error logging stock transaction while buying existing stock.");
  }  
  return null;
};

const purchaseNewStock = async (req) => {
  //console.log(JSON.stringify(req));
  let symbol = req[0];
  symbol = symbol.toUpperCase();
  let transactionQty = req[1];
  let transactionSharePrice = req[2];
  let transactionDate = new Date().toISOString().split("T")[0];
  let accountId = req[3];
  let companyName = req[4];
  //console.log("Updating buy transaction");
  
  if (logStockTransaction("buy",
                         transactionDate, 
                         symbol,
                         transactionQty,
                         transactionSharePrice,
                         accountId)) {
    //console.log("updating stockList");
    let sqlInsert = `INSERT INTO stockList (symbol, companyName, quantityOwned, currentPrice, pricePurchased, assetValue, costBasis, accountId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;
    let paramsInsert = [
      symbol,
      companyName,
      transactionQty,
      transactionSharePrice,
      transactionSharePrice,
      transactionQty * transactionSharePrice,
      transactionQty * transactionSharePrice,
      accountId,
    ];
    let rowsInsert = await executeSQL(sqlInsert, paramsInsert);
    return rowsInsert;
  } else {
    console.log ("Error logging stock transaction while buying new stock.");
  }
  return null;
};

//TODO: Sell stock doesn't look like it adjusts stock list for cost basis and asset value
const sellStock = async (req) => {
  //console.log(req);
  let symbol = req[0];
  symbol = symbol.toUpperCase();
  let transactionQty = req[1];
  let transactionSharePrice = req[2];
  let transactionDate = new Date().toISOString().split("T")[0];
  let accountId = req[3];
  //console.log("Updating sell transaction");
  if (logStockTransaction("sell",
                         transactionDate,
                         symbol,
                         transactionQty,
                         transactionSharePrice,
                         accountId)) {
    //console.log("updating stockList");
    let sqlUpdate = `UPDATE stockList
      SET quantityOwned = quantityOwned - ? , currentPrice = ?,
      pricePurchased = (pricePurchased * quantityOwned - ? * ?) / (quantityOwned - ?),
      costBasis = costBasis - ? * ?, assetValue = assetValue - ? * ?
      WHERE symbol = ?;`;
    let paramsUpdate = [
      transactionQty,
      transactionSharePrice,
      transactionQty,
      transactionSharePrice,
      transactionQty,
      transactionQty,
      transactionSharePrice,
      transactionQty,
      transactionSharePrice,
      symbol,
    ];
    let rowsUpdate = await executeSQL(sqlUpdate, paramsUpdate);
    return rowsUpdate;
  } else {
    console.log("Error logging stock transaction while selling stock.");
  }
};

async function sellAllStock(req) {
  //console.log(JSON.stringify(req));
  let symbol = req[0];
  symbol = symbol.toUpperCase();
  let transactionQty = req[1];
  let transactionSharePrice = req[2];
  let transactionDate = new Date().toISOString().split("T")[0];
  let accountId = req[3];
  if (logStockTransaction("sell",
                         transactionDate,
                         symbol,
                         transactionQty,
                         transactionSharePrice,
                         accountId)) {
    //console.log("updating stockList");
    let sqlDelete = `DELETE FROM stockList
      WHERE symbol = ? AND accountId = ?;`;
    let paramsDelete = [symbol, accountId];
    let rowsDelete = await executeSQL(sqlDelete, paramsDelete);
    return rowsDelete;
  }
}

async function depositOrWithdraw(req) {
  let amount = req.body.transferAmount;
  let transactionType = req.body.transactType;
  if (transactionType === "W") amount = -amount;
  let accountId = req.session.accountId; // placeholder
  let date = new Date();
  let sql = "update accounts set balance = balance + ? where accountId = ?;";
  let params = [amount, accountId];
  rows = await executeSQL(sql, params);
  sql = "select balance from accounts where accountId = ?";
  params = [accountId];
  rows = await executeSQL(sql, params);
  let balance = rows[0].balance;
  sql =
    "insert into accountTransactions (aTransactionType, aTransactionDate, aTransactionAmount, aTransactionCBalance, accountId) values (?, ?, ?, ?, ?);";
  params = [transactionType, date, amount, balance, accountId];
  rows = await executeSQL(sql, params);
  sql = "select * from accounts where accountId = 1;";
  rows = await executeSQL(sql);
}

async function hashPassword(userId, password) {
  bcrypt.hash(password, 10, function (err, hash) {});
}

async function registerUser(req) {
  let userName = req.body.userName;
  let pw = req.body.pw;
  let firstName = req.body.firstName;
  let lastName = req.body.lastName;
  let sql = "select * from userT where userName = ?";
  let params = [userName];
  rows = await executeSQL(sql, params);
  if (rows.length == 0) {
    let hashPw = await bcrypt.hash(pw, 10);
    sql =
      "insert into userT (userName, pw, firstName, lastName) values (?, ?, ?, ?);";
    params = [userName, hashPw, firstName, lastName];
    rows = await executeSQL(sql, params);
    // if (rows.insertId )
    sql =
      "insert into accounts (userId, dateOpened, status, balance) values (?, ?, 'O', 0)";
    params = [rows.insertId, new Date()];
    rows = await executeSQL(sql, params);
    //console.log("Response on register: ", rows);
    return userName;
  } else {
    return "";
  }
}

async function loginUser(req) {
  let userName = req.body.userName;
  let pw = req.body.pw;
  let sql = "select * from userT where userName = ?";
  let params = [userName];
  rows = await executeSQL(sql, params);
  if (rows.length == 0) return -1;
  //console.log(`comparing ${pw} to ${rows[0].pw}`);
  pwMatch = await bcrypt.compare(pw, rows[0].pw);
  //console.log("pwmatch: ", pwMatch);
  if (pwMatch) {
    return rows[0];
  } else {
    console.log("passwords did not match");
    return -1;
  }
}



async function editUser(req) {
  let userName = req.body.userName;
  let pw = req.body.pw;
  let firstName = req.body.firstName;
  let lastName = req.body.lastName;
  let sql = "select * from userT where userName = ?";
  let params = [userName];
  rows = await executeSQL(sql, params);
  if (rows.length == 1) {
    if (pw == "     ") { // Password field unchanged so skip updating that
      sql = "update userT set firstName = ?, lastName = ? where userName = ?";
      params = [firstName, lastName, userName];
      rows = await executeSQL(sql, params);
    } else {
      let hashPw = await bcrypt.hash(pw, 10);
      sql = "update userT set pw = ?, firstName = ?, lastName = ? where userName = ?";
      params = [hashPw, firstName, lastName, userName];
      rows = await executeSQL(sql, params);
    }
    //console.log("Response on account edit: ", rows);
    return userName;
  } else {
    return "";
  }
}

module.exports = {
  executeSQL,
  getStockFromAccount,
  getStocksFromAccount,
  updateStockPricing,
  purchaseExistingStock,
  depositOrWithdraw,
  registerUser,
  loginUser,
  editUser,
  purchaseNewStock,
  sellStock,
  getAccount,
  getUser,
  getAccountBalance,
  getAccountTransactions,
  getStockTransactions,
  sellAllStock,
};
