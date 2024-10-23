window.addEventListener("DOMContentLoaded", (event) => {
	document.querySelector('#submitButton').addEventListener("click", validateForm);
});


function validateForm() {
	let error = document.querySelector("#error");
	if (document.querySelector("#userName").value.length == 0) {
		error.innerHTML = "Enter a username.";
	} else if (document.querySelector("#pw").value.length == 0) {
		error.innerHTML = "Enter a password.";
	} else if (document.querySelector("#pw").value != document.querySelector("#pw2").value) {
		error.innerHTML = "Passwords do not match.";
	} else if (document.querySelector("#firstName").value.length == 0) {
		error.innerHTML = "Enter a first name.";
	} else if (document.querySelector("#lastName").value.length == 0) {
		error.innerHTML = "Enter a last name.";
	} else {
		error.innerHTML = "";
		document.querySelector("#form").submit();
	}
}