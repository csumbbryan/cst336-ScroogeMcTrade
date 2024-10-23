window.addEventListener("DOMContentLoaded", (event) => {
  const input = document.querySelector("#symbol");
  if (input) {
    input.addEventListener("change", showPrice);
  }
  document.querySelector('#submitButton').addEventListener("click", validateForm);
});



function checkValue() {
  if (document.querySelector("#symbol").value) {
    showPrice();
  }
}

checkValue();

async function showPrice() {
  console.log("showPrice entered");  
  let symbol = document.querySelector("#symbol").value;
  if(symbol == "" || symbol === undefined) {
    console.log("no stock symbol entered");
  } else {
    console.log("Symbol: " + symbol);
    document.querySelector("#currentPrice").value = "";
    document.querySelector("#currentPrice").placeholder = "Retrieving price...";
    let url = `/api/stockPrice/${symbol}`;
    let response = await fetch(url);
    let price = await response.json();
    console.log("Response: ", response);
    console.log("Price: " + price);
    document.querySelector("#currentPrice").value = price.toString();
  }
}

function validateForm() {
  let error = document.querySelector("#transactError");
  if (document.querySelector("#symbol").value.length == 0) {
    error.innerHTML = "Enter a stock symbol.";
  } else if (document.querySelector("#qty").value.length == 0) {
      error.innerHTML = "Enter a quantity.";
  } else if (document.querySelector("#currentPrice").value.length == 0) {
    error.innerHTML = "Please wait for stock price.";
  } else {
    error.innerHTML = "";
    document.querySelector("#form").submit();
  }
}