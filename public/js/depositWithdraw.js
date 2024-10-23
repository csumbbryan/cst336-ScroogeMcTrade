window.addEventListener("DOMContentLoaded", (event) => {
  document.querySelector('#submitButton').addEventListener("click", validateForm);
  document.querySelector('#amount').addEventListener("change", handleNegatives);
  console.log("go:", parseFloat(document.querySelector("#balance").innerHTML.replaceAll(",", "")));
});



function validateForm() {
  let error = document.querySelector(".error");
  let balance = parseFloat(document.querySelector("#balance").innerHTML.replaceAll(",", ""));
  console.log("balance:", balance);
  if (document.querySelector("#withdrawRadio").checked && document.querySelector("#amount").value > balance) {
    error.innerHTML = "Insufficient balance for this transaction.";
  } else {
    error.innerHTML = "";
    form = document.querySelector("#form");
    console.log("form:",form);
    form.submit();
    // document.querySelector("#form").submit();
  }
}

function handleNegatives() {
  document.querySelector('#amount').value = Math.abs(document.querySelector('#amount').value);
}