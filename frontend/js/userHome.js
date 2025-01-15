document.addEventListener("DOMContentLoaded", function () {
  // Retrieve the token from localStorage
  const token = localStorage.getItem("token");

  // Check if the token exists
  if (!token) {
    // Redirect to the login page if no token is found
    window.location.href = "./login.html";
    return;
  }

  try {
    // Decode the token to extract user information
    const decodedToken = parseJwt(token);

    // Check if the token is expired
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    if (decodedToken.exp < currentTime) {
      showCustomAlert("Your session has expired. Please log in again.");
      localStorage.removeItem("token");
      window.location.href = "./login.html";
      return;
    }

    // Update the user name in the HTML
    const userNameSpan = document.getElementById("userName");
    userNameSpan.textContent = decodedToken.name;
  } catch (error) {
    console.error("Error decoding token:", error);
    showCustomAlert("An error occurred. Please log in again.");
    localStorage.removeItem("token");
    window.location.href = "./login.html";
  }

  // Function to decode JWT token
  function parseJwt(token) {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  }
});
