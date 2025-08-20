document.addEventListener("DOMContentLoaded", function () {
  // Get the Send Code button
  const sendCodeButton = document.getElementById("sendCode");

  // Add a click event listener to the Send Code button
  sendCodeButton.addEventListener("click", function () {
    // Get the email input value
    const emailInput = document.getElementById("email");
    const email = emailInput.value.trim();

    // Check if the email is valid
    if (!validateEmail(email)) {
      showCustomAlert("Please enter a valid email address.");
      return;
    }

    // Disable the button to prevent multiple clicks
    sendCodeButton.disabled = true;

    // Construct the endpoint dynamically using window.location.origin
    const endpoint = `http://54.169.218.198:5050/api/v1/authentication/send-verification`;

    // Send a POST request to the backend API
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to send verification code.");
        }
        return response.json();
      })
      .then((data) => {
        showCustomAlert(data.message || "Verification code sent successfully!");
      })
      .catch((error) => {
        showCustomAlert(
          error.message ||
            "An error occurred while sending the verification code."
        );
      })
      .finally(() => {
        // Re-enable the button
        sendCodeButton.disabled = false;
      });
  });

  // Function to validate email format
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  document.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const verificationCode = document.getElementById("verificationCode").value;
    const name =
      document.getElementById("firstName").value +
      " " +
      document.getElementById("lastName").value;
    const password = document.getElementById("password").value;
    const age = parseInt(document.getElementById("age").value, 10); // Convert age to a number
    const phoneNumber = document.getElementById("phoneNumber").value;
    const address = document.getElementById("address").value;

    const response = await fetch(
      "http://54.169.218.198:5050/api/v1/authentication/register-user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          verification_code: verificationCode,
          name,
          password,
          phone_number: phoneNumber,
          address,
          age,
        }),
      }
    );

    const data = await response.json();
    if (response.ok) {
      showCustomAlert(data.message, "login.html");
    } else {
      showCustomAlert(`Error: ${data.message || "Failed to register"}`);
    }
  });
});
