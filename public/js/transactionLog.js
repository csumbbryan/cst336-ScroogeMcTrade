document.querySelector("#accountRadio").addEventListener("change", showAccountLog);
document.querySelector("#stockRadio").addEventListener("change", showStockLog);

showAccountLog();

async function showAccountLog() {
	let url = `/accountLog`;
	let response = await fetch(url);
	let data = await response.json();
	let table = document.querySelector("#logTable");
	console.log(data);
	let tableHtml = `<table class="standard">
		<tr class="t_headers">
			<td>Transaction type</td>
			<td>Date</td>
			<td>Amount</td>
			<td>Resulting balance</td>
		</tr>`;
	for (record of data.rows) {
		tableHtml += 
			`<tr>
				<td>${getFullString(record.aTransactionType)}</td>
				<td>${new Date(record.aTransactionDate).toLocaleDateString()}</td>
				<td class="dollar">${formatCurrency(record.aTransactionAmount)}</td>
				<td class="dollar">${formatCurrency(record.aTransactionCBalance)}</td>
			</tr>`
	}
	tableHtml += "</table>";
	table.innerHTML = tableHtml;
	colorCurrencies();
}

async function showStockLog() {
	let url = `/stockLog`;
	let response = await fetch(url);
	let data = await response.json();
	let table = document.querySelector("#logTable");
	console.log(data);
	let tableHtml = `<table class="standard">
		<tr class="t_headers">
			<td>Transaction type</td>
			<td>Date</td>
			<td>Stock symbol</td>
			<td>Quantity</td>
			<td>Share price</td>
			<td>Transaction amount</td>
		</tr>`;
	for (record of data.rows) {
		tableHtml +=
			`<tr>
				<td>${getFullString(record.sTransactionType)}</td>
				<td>${new Date(record.sTransactionDate).toLocaleDateString()}</td>
				<td>${record.sTransactionSymbol}</td>
				<td>${record.sTransactionQty}</td>
				<td class="dollar">${formatCurrency(record.stransactionSharePrice)}</td>
				<td class="dollar">${formatCurrency(record.sTransactionAmount)}</td>
			</tr>`
	}
	tableHtml += "</table>";
	table.innerHTML = tableHtml;
	colorCurrencies();
}

function getFullString(str) {
	switch (str) {
		case "D": return "Deposit";
		case "W": return "Withdrawal";
		case "buy": return "Purchase";
		case "sel": return "Sale";
		default: return str;
	}
}

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

function colorCurrencies() {
	document.querySelectorAll("td.dollar, td.percentage, span.dollar").forEach((element) => {
		if (element.innerHTML.includes("-")) {
			element.classList.add("negative");
		} else {
			element.classList.add("positive");
		}
	});
}