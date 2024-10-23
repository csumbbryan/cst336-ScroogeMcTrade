//let stockData = document.getElementById("stockData").innerHTML;
//stockData = JSON.parse(stockData);
addEventListener("resize", redrawArray);
let symbol = document.querySelector("#stockInfoSymbol").innerHTML;
let day = [];
let close = [];
let chart;
let resizeTimeout;
format();

function format() {
    let values = document.querySelectorAll("dollar");
    for (let value in values) {
        value.innerHTML = Number(value.innerHTML).toFixed(2);
    }
}

function formatChartButtons (term) {
    let button = document.querySelector(`#${term}`);
    button.style.backgroundColor = "white";
    button.style.fontWeight = "bold";
}

async function addData() {
    let term = document.querySelector("#chartTerm").innerHTML;
    let url = `/api/stockData/${symbol}/${term}`;
    formatChartButtons(term);
    console.log("URL: " + url);
    let response = await fetch(url);
    let stockData = await response.json();
    return stockData;
}

function redrawArray() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        createCloseArry();
    }, 800);
    //createCloseArry();
}

async function createCloseArry() {
    day = [];
    range = [];
    close = [];
    let i = 0; //counter
    let chartView = document.getElementById("chart");
    let stockData = await addData();
    console.log("Stock Data: " + JSON.stringify(stockData));
    console.log(day);
    console.log(close);
    console.log("Chart Offset Width: " + chartView.offsetWidth);
    for (let key in stockData) {
        if(chartView.offsetWidth < 200) {
            if(i % 4 == 0) {
                day.unshift(key);
                close.unshift(stockData[key]["4. close"]);
            }
        } else if(chartView.offsetWidth < 300) {
            if(i % 3 == 0) {
                day.unshift(key);
                close.unshift(stockData[key]["4. close"]);
            }
        } else if(chartView.offsetWidth < 400) {
            if(i % 2 == 0) {
                day.unshift(key);
                close.unshift(stockData[key]["4. close"]);
            }
        } else {
            day.unshift(key);
            close.unshift(stockData[key]["4. close"]);
        }
        i++;
    }
    close.unshift(symbol);

    chart = bb.generate({
        bindto: "#chart",
        data: {
            columns: [
                close
            ],
            types: "line",
            color: function () {
                return "green";
            }
        },
        axis: {
            x: {
                type: "category",
                categories: day,
                tick: {
                    culling: true,
                    multiline: false,
                    rotate: 45,
                    // autorotate: true
                }
            }
        }
    });
}

stockArry = createCloseArry();

