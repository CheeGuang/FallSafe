document.addEventListener("DOMContentLoaded", function () {

  const userBadge = document.getElementById('userBadge');
  const adminBadge = document.getElementById('adminBadge');
  const currentRole = document.getElementById('currentRole');


  const form = document.querySelector("form");

  // Add a submit event listener to the login form
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission

    // Get email and password from the form inputs
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Get the selected role
    const selectedRole = document.getElementById("currentRole").textContent;

    // Validate the inputs
    if (!validateEmail(email)) {
      showCustomAlert("Please enter a valid email address.");
      return;
    }
    if (!password) {
      showCustomAlert("Please enter your password.");
      return;
    }

    // API endpoint for login
    let endpoint;
    if (selectedRole === "User") {
      endpoint = "http://localhost:5050/api/v1/authentication/user/login";
    } else if (selectedRole === "Admin") {
      endpoint = "http://localhost:5050/api/v1/authentication/admin/login";
    } else {
      showCustomAlert("Invalid role selected. Please try again.");
      return;
    }

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
        if (selectedRole == "User"){ //only for normal User
          showCustomAlert("Login successful!", "./userHome.html");
        } else if (selectedRole === "Admin") {
          showCustomAlert("Admin login successful", "./adminHome.html");
        }
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
  //Function to dynamically update role when clicked the button
  function selectRole(role) {
    if (role === 'User') {
      userBadge.classList.remove('d-none');
      adminBadge.classList.add('d-none');
    } else if (role === 'Admin') {
      adminBadge.classList.remove('d-none');
      userBadge.classList.add('d-none');
    }

    // Update the alert message
    currentRole.textContent = role;
  }

  // Attach event listeners to the buttons
   document.getElementById('userBtn').addEventListener('click', () => selectRole('User'));
   document.getElementById('adminBtn').addEventListener('click', () => selectRole('Admin'));
});
