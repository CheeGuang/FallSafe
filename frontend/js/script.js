document.addEventListener("DOMContentLoaded", () => {
  const loadComponent = (url, placeholderId) => {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${url}.`);
        }
        return response.text();
      })
      .then((data) => {
        document.getElementById(placeholderId).innerHTML = data;
      })
      .catch((error) => console.error("Error loading component:", error));
  };

  // Check for token in localStorage and load the appropriate navbar
  const token = localStorage.getItem("token");
  const navbarUrl = token ? "./memberNavbar.html" : "./navbar.html";
  loadComponent(navbarUrl, "navbar-container");

  // Load Footer
  loadComponent("./footer.html", "footer-container");

  // Load the customAlert.html into the container
  $("#customAlertContainer").load("./customAlert.html");

  // Define the showCustomAlert function globally
  window.showCustomAlert = function (message, redirectUrl) {
    console.log("showCustomAlert called with:", { message, redirectUrl }); // Debug: Function called

    var $alert = $("#customAlert");

    if (!$alert.length) {
      console.error("Error: #customAlert not found in the DOM!"); // Debug: Check if #customAlert exists
      return;
    }

    // Update alert message and show the alert
    console.log("Updating alert message and showing alert."); // Debug: Before showing the alert
    $alert.text(message).fadeIn();

    // Determine the display duration (1 second if redirectUrl is provided, 5 seconds otherwise)
    var displayDuration = redirectUrl ? 1000 : 5000;
    console.log("Display duration set to:", displayDuration); // Debug: Display duration

    // Hide the alert after the specified duration
    setTimeout(function () {
      console.log("Hiding alert."); // Debug: Before hiding the alert
      $alert.fadeOut(function () {
        console.log("Alert hidden."); // Debug: After hiding the alert

        if (redirectUrl) {
          console.log("Redirecting to:", redirectUrl); // Debug: Redirect URL provided
          window.location.href = redirectUrl;
        } else {
          console.log("No redirect URL provided."); // Debug: No redirect URL
        }
      });
    }, displayDuration);
  };
});
