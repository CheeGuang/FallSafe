document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");

  // Add a submit event listener to the login form
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission

    // Get email and password from the form inputs
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Validate the inputs
    if (!validateEmail(email)) {
      showCustomAlert("Please enter a valid email address.");
      return;
    }
    if (!password) {
      showCustomAlert("Please enter your password.");
      return;
    }

    // API endpoint for user login
    const endpoint = "http://localhost:5050/api/v1/authentication/admin/login";

    try {
      // Send a POST request to the login endpoint
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json(); // Parse the response JSON

      if (response.ok) {
        // If login is successful, store the JWT token
        localStorage.setItem("token", data.token);
        showCustomAlert("Login successful!", "./adminHome.html");
      } else {
        // If login fails, show an error message
        showCustomAlert(
          data.message || "Invalid email or password. Please try again."
        );
      }
    } catch (error) {
      console.error("Error during login:", error);
      showCustomAlert("An error occurred while logging in. Please try again.");
    }
  });

  // Function to validate email format
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
});
