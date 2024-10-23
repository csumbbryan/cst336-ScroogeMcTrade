document.querySelector("#searchButton").addEventListener("click", showModal);
window.addEventListener("click", closeModal);
document.querySelector("#modalClose").addEventListener("click", closeModal);
document.querySelector("#searchForm").addEventListener("keypress", handleEnter);


document.querySelectorAll("td.dollar, td.percentage, span.dollar").forEach((element) => {
  if (element.innerHTML.includes("-")) {
    element.classList.add("negative");
  } else {
    element.classList.add("positive");
  }
});

function checkFormatting() {
  let path = window.location.pathname;
  console.log("Pathname: " + path);
  switch (path) {
    case "/transactStock":
      format("transactStock");
      break;
    case "/depositWithdraw":
      format("depositWithdraw");
      break;
    case "/tableview":
      format("tableView");
      break;
    case "/transactionLog":
      format("transactionLog");
      break;
    case "/":
      format("tableView");
      break;
    default:
      break;
  }
}

function format(format) {
  /*let buttons = document.querySelectorAll("button.navigation");
  buttons.forEach(function(btn) {
    btn.style.backgroundColor = "#898989";
    btn.style.color = "black";
  });*/
  let link = document.querySelector(`#${format}`);
  console.log("Format: " + `${format}`);
  link.style.backgroundColor = "#f0fff0";
  link.style.color = "white";
}

async function populateUserInfo() {
  let url = "/api/loggedInSession";
  let response = await fetch(url);
  let data = await response.json();
  if (data[0] == null) return;
  let name = data[0].firstName + " " + data[0].lastName;
  let accountId = data[1].accountId;
  let nameField = document.querySelector("#user_name");
  let accountIdField = document.querySelector("#account_number");
  nameField.innerHTML = `<a href="/userEdit">${name}</a>`;
  accountIdField.innerHTML = accountId;
}

async function showModal() {
  let input = document.querySelector("#searchInput").value;
  let modal = document.querySelector("#searchModal");
  let heading = document.querySelector("#searchHeading");
  let body = document.querySelector(".modal-body");
  console.log("input:", input.value);
  if (input == "") return;
  modal.style.display = "block";
  heading.innerHTML = "Searching...";
  body.innerHTML = "";
  let url = `/altStockSearchResults?search=${input}`;
  let response = await fetch(url);
  let data = await response.json();
  heading.innerHTML = `<h3>Search results: ${input}</h3>`;
  for (i in data.matches) {
    body.innerHTML += `<a href="/stockInfo?symbol=${data.matches[i]["1. symbol"]}"><b>${data.matches[i]["1. symbol"]}</b></a><br>${data.matches[i]["2. name"]}<br><br>`;
  }
}

function closeModal(event) {
  let modal = document.querySelector("#searchModal");
  let closeButton = document.querySelector("#modalClose");
  if (event.target == modal || event.target == closeButton) {
    modal.style.display = "none";
  }
}

function handleEnter(event) {
  if (event.charCode === 13) {
    event.preventDefault();
    showModal();
  }
}

checkFormatting();
populateUserInfo();
