const token = localStorage.getItem("token");
console.log(token);
if (!token) {
  // Redirect to the login page if no token is found
  window.location.href = "./login.html";
}

// Store the fetched data globally for use in filtering and rendering
let dashboardData = {
  users: [],
  fesLastResList: [],
  faLastResList: [],
  tableFullData: [],
  filteredTableData: [], //save as global, will be referencing to this
};
//Pages for the table
let currentPage = 1;
const usersPerPage = 10;

/*  sample data for last fes
    {
        "user_id": 1,
        "days_since_last_fesres": 3
    },
    sample data for last fa
    {
        "user_id": 1,
        "days_since_last_fares": 7
    },
    sample data format for users
    {
        "user_id": 1,
        "name": "Alice Tan",
        "email" "alice@example.com"
        "age": "61"
    },
    sample data format for fesLatestRiskList
    {
        "user_id": 1,
        "risk_level": "low"
    }
    sample data format for faLatestRiskList
    {
        "user_id": 1,
        "overall_risk_level": "high"
    }
    
*/

// Initialize dashboard
document.addEventListener("DOMContentLoaded", function () {
  initializeDashboard();
  setupEventListeners();
});

async function initializeDashboard() {
  try {
    const [
      users,
      fesLastResList,
      faLastResList,
      fesLatestRiskList,
      faLatestRiskList,
    ] = await Promise.all([
      fetchUsersFromAPI(),
      fetchFESLastResponseDate(),
      fetchFallAssessmentLastResponseDate(),
      fetchLatestFESUserRiskFromAPI(),
      fetchLatestFAUserRiskFromAPI(),
    ]);

    // Store the fetched data
    dashboardData.users = users;
    dashboardData.fesLastResList = fesLastResList;
    dashboardData.faLastResList = faLastResList;
    dashboardData.fesLatestRiskList = fesLatestRiskList;
    dashboardData.faLatestRiskList = faLatestRiskList;

    console.log(users);
    console.log(fesLastResList);
    console.log(faLastResList);

    updateDashboard("age", "all"); // Load initial data for all elderly
  } catch (error) {
    console.error("Error initializing dashboard:", error);
    showCustomAlert("Failed to load data. Please try again later.");
  }
}

// Function to fetch users from API
async function fetchUsersFromAPI() {
  try {
    console.log(token);
    const response = await fetch(
      "http://18.143.103.158:5200/api/v1/admin/getAllElderlyUser",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Error: ${errorDetails || "Failed to fetch users"}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching users:", error.message);
    showCustomAlert("Error fetching user's list");
    throw error;
  }
}

// Function to fetch the last response date and days since response from the API
async function fetchFESLastResponseDate() {
  try {
    // API endpoint to get the user ID and days since the last response
    const response = await fetch(
      "http://18.143.103.158:5200/api/v1/admin/getAllLastResFES",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Add Authorization token if required
        },
      }
    );

    // Check if the response is successful
    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `Error: ${errorDetails || "Failed to fetch last response date"}`
      );
    }

    // Parse the JSON response and return it
    return await response.json();
  } catch (error) {
    // Log and display the error
    console.error("Error fetching FES last response date:", error.message);
    showCustomAlert("Error fetching the last response date");
    throw error;
  }
}

// Function to fetch the last fall assessment date and days since response from the API
async function fetchFallAssessmentLastResponseDate() {
  try {
    // API endpoint to get the user ID and days since the last fall assessment response
    const response = await fetch(
      "http://18.143.103.158:5200/api/v1/admin/getAllLastResFA",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Add Authorization token if required
        },
      }
    );

    // Check if the response is successful
    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `Error: ${
          errorDetails || "Failed to fetch last fall assessment response date"
        }`
      );
    }

    // Parse the JSON response and return it
    return await response.json();
  } catch (error) {
    // Log and display the error
    console.error(
      "Error fetching Fall assessment last response date:",
      error.message
    );
    showCustomAlert("Error fetching the last fall assessment response date");
    throw error;
  }
}

// Function to fetch all user risk levels of the latest, FOR Fall Assessment
async function fetchLatestFAUserRiskFromAPI() {
  try {
    const response = await fetch(
      "http://18.143.103.158:5250/api/v1/selfAssessment/getAllUserRisk",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `Error: ${errorDetails || "Failed to fetch user risk levels"}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user risk levels:", error.message);
    showCustomAlert("Error fetching user risk levels");
    throw error;
  }
}

// Function to fetch all user risk levels of the latest, FOR User Response
async function fetchLatestFESUserRiskFromAPI() {
  try {
    const response = await fetch(
      "http://18.143.103.158:5200/api/v1/admin/getAllFESUserRisk",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Use the actual token you are sending with the request
        },
      }
    );

    // Check if the response is successful (status code 200)
    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `Error: ${errorDetails || "Failed to fetch user risk levels"}`
      );
    }

    // Parse and return the JSON response
    return await response.json();
  } catch (error) {
    console.error("Error fetching user risk levels:", error.message);
    showCustomAlert("Error fetching user risk levels"); // Implement this function to show alerts
    throw error;
  }
}

function setupEventListeners() {
  const ageGroupSelector = document.getElementById("ageGroupSelector");
  const searchButton = document.getElementById("searchButton");
  const userIdInput = document.getElementById("individualSearch");

  // Handle age group selection
  ageGroupSelector.addEventListener("change", function () {
    const selectedAgeGroup = ageGroupSelector.value;

    if (selectedAgeGroup === "all") {
      if (userIdInput.value !== "") {
        userIdInput.value = ""; // Clear the User ID input
        updateDashboard("all"); // Fetch and display all users
      } else {
        userIdInput.disabled = false; // Enable User ID input
        updateDashboard("all"); // Display all users if no previous search was done
      }
    } else {
      userIdInput.value = ""; // Clear User ID input
      userIdInput.disabled = true; // Disable User ID input
      updateDashboard("age", selectedAgeGroup); // Filter by age group
    }
  });

  // Handle the "ALL" button click separately to reset the filter
  document
    .getElementById("ageGroupSelector")
    .addEventListener("click", function () {
      const selectedAgeGroup = ageGroupSelector.value;

      // If the "ALL" option is clicked and the User ID input has value, clear it
      if (selectedAgeGroup === "all") {
        if (userIdInput.value !== "") {
          userIdInput.value = ""; // Clear the User ID input
          updateDashboard("all"); // Reset dashboard to show all users
        }
      }
    });

  // Handle name search and update dropdown dynamically
  userIdInput.addEventListener("input", function () {
    const userName = userIdInput.value.trim().toLowerCase();
    const selectedAgeGroup = ageGroupSelector.value;

    if (selectedAgeGroup === "all") {
      if (userName !== "") {
        const filteredUsers = dashboardData.users.filter(
          (user) => user.name.toLowerCase().includes(userName) // Case-insensitive match
        );
        updateDropdown(filteredUsers);
      } else {
        suggestionDropdown.style.display = "none"; // Hide dropdown if input is empty
        updateDashboard("all"); // Reset dashboard when input is empty
      }
    } else {
      suggestionDropdown.style.display = "none"; // Hide dropdown when age group filter is active
    }
  });

  // Handle the "Search" button click to search and update dashboard
  searchButton.addEventListener("click", function () {
    const userName = userIdInput.value.trim();
    const selectedAgeGroup = ageGroupSelector.value;

    if (selectedAgeGroup === "all") {
      if (userName !== "") {
        updateDashboard("user", userName);
      } else {
        showCustomAlert("Please enter a valid name.");
      }
    } else {
      showCustomAlert("Age range is selected. Search by Name is disabled.");
    }
  });

  // Update the dropdown with filtered users
  function updateDropdown(filteredUsers) {
    suggestionDropdown.innerHTML = ""; // Clear previous suggestions

    if (filteredUsers.length === 0) {
      suggestionDropdown.style.display = "none"; // Hide if no results
    } else {
      suggestionDropdown.style.display = "block"; // Show dropdown
      filteredUsers.forEach((user) => {
        const listItem = document.createElement("li");
        listItem.classList.add("dropdown-item");
        listItem.textContent = user.name;
        listItem.onclick = function () {
          userIdInput.value = user.name; // Populate the input field with selected name
          suggestionDropdown.style.display = "none"; // Hide dropdown after selection
        };
        suggestionDropdown.appendChild(listItem);
      });
    }
  }
}

function updateDashboard(filterType, filterValue) {
  let filteredUsers;
  if (filterType === "all") {
    // Display all users
    filteredUsers = dashboardData.users;
  }
  // Filter by age group
  else if (filterType === "age") {
    if (filterValue === "all") {
      filteredUsers = dashboardData.users; // All users if 'all' is selected
    } else {
      const [minAge, maxAge] =
        filterValue === "90+"
          ? [90, Infinity]
          : filterValue.split("-").map(Number);
      filteredUsers = dashboardData.users.filter(
        (user) => user.age >= minAge && user.age <= maxAge
      );
    }
  }

  // Filter by User Name (allowing partial match)
  else if (filterType === "user") {
    filteredUsers = dashboardData.users.filter(
      (user) => user.name.toLowerCase().includes(filterValue.toLowerCase()) // Case-insensitive partial match
    );

    if (filteredUsers.length > 1) {
      showCustomAlert(
        `Multiple users found (${filteredUsers.length} matches). Please refine your search.`
      );
    } else if (filteredUsers.length === 0) {
      showCustomAlert("No user found. Please try a different name.");
      return; // Stop further processing
    } else {
      // Show alert for the selected user
      const selectedUser = filteredUsers[0];
      showCustomAlert(
        `Showing results for: ${selectedUser.name} (User ID: ${selectedUser.user_id})`
      );
    }
  }

  const userIds = filteredUsers.map((user) => user.user_id);

  //Combines my fragmented data of the database.
  const mergedData = dashboardData.users.map((user) => {
    // Find the corresponding FES and Fall Assessment data for each user
    const fes = dashboardData.fesLastResList.find(
      (fesItem) => fesItem.user_id === user.user_id
    );
    const fallAssessment = dashboardData.faLastResList.find(
      (faItem) => faItem.user_id === user.user_id
    );

    // Get days from FES or Fall Assessment, default to 0 if not available
    const fesDays = fes ? fes.days_since_last_fesres : 0;
    const faDays = fallAssessment ? fallAssessment.days_since_last_fares : 0;

    // Get the risk levels from FES and Fall Assessment
    const fesRisk = dashboardData.fesLatestRiskList.find(
      (fesRiskItem) => fesRiskItem.user_id === user.user_id
    )?.risk_level;

    const faRisk = dashboardData.faLatestRiskList.find(
      (faRiskItem) => faRiskItem.user_id === user.user_id
    )?.overall_risk_level;

    // Determine the overall risk level based on available data
    const overallBothRisk = getOverallRiskLevel(fesRisk, faRisk);

    // Return merged object with the largest number of days and the combined risk level
    return {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      last_fes_date: fes ? fes.days_since_last_fesres : "FES not taken",
      last_fall_assessment_date: fallAssessment
        ? fallAssessment.days_since_last_fares
        : "Fall Assessment not taken",
      longest_day: Math.max(fesDays, faDays), // Use the largest number of days
      overall_both_risk: overallBothRisk, // New risk attribute
    };
  });
  // Sort the data by the largest number of days (longest_day) in descending order
  const sortedData = mergedData.sort((a, b) => b.longest_day - a.longest_day);
  // Remove the 'longest_day' field before sending data to table
  const finalData = sortedData.map(({ longest_day, ...rest }) => rest);
  console.log(finalData); //Ready in the correct sort position

  const givenListTable = finalData.filter((response) =>
    userIds.includes(response.user_id)
  );

  dashboardData.filteredTableData = givenListTable; //save as global, will be referencing to this
  renderTable(givenListTable);
}

// Function to determine the overall risk level
function getOverallRiskLevel(fesRisk, faRisk) {
  if (fesRisk && faRisk) {
    // If both are available, take the higher risk level
    return getMaxRiskLevel(fesRisk, faRisk);
  } else if (fesRisk) {
    // If only FES is available, take FES risk
    return fesRisk;
  } else if (faRisk) {
    // If only FA is available, take FA risk
    return faRisk;
  } else {
    // If neither test is available, return "NA"
    return "NA";
  }
}

// Function to get the highest risk level
function getMaxRiskLevel(fesRisk, faRisk) {
  const riskLevels = ["low", "moderate", "high"];
  return riskLevels[
    Math.max(riskLevels.indexOf(fesRisk), riskLevels.indexOf(faRisk))
  ];
}

function renderTable(data) {
  const tableBody = document.getElementById("tableBody");
  tableBody.innerHTML = "";

  // Paginate data
  const start = (currentPage - 1) * usersPerPage;
  const paginatedUsers = data.slice(start, start + usersPerPage);

  paginatedUsers.forEach((user) => {
    const row = tableBody.insertRow();
    let riskBadge = "";
    switch (user.overall_both_risk.toLowerCase()) {
      case "high":
        riskBadge = `<span class="badge bg-danger rounded-pill">High</span>`;
        break;
      case "moderate":
        riskBadge = `<span class="badge bg-warning text-dark rounded-pill">Moderate</span>`;
        break;
      case "low":
        riskBadge = `<span class="badge bg-success rounded-pill">Low</span>`;
        break;
      case "na":
        riskBadge = `<span class="badge bg-dark text-white rounded-pill">N/A</span>`;
        break;
      default:
        riskBadge = `<span class="badge bg-secondary rounded-pill">Unknown</span>`;
    }
    row.innerHTML = `
            <td>${user.user_id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${riskBadge}</td>
            <td>${user.last_fes_date}</td>
            <td>${user.last_fall_assessment_date}</td>
            <td>
                <button 
                    class="btn btn-sm btn-primary email-btn"
                    data-email="${user.email}"
                    data-lastFADay="${user.last_fall_assessment_date}"
                    data-lastFESDay="${user.last_fes_date}"
                    data-user="${user.name}"
                    onclick="openEmailModal(this)">
                    Send Email Reminder
                </button>
            </td>
        `;
  });

  // Update pagination
  renderPagination(data.length);
}

function renderPagination(totalUsers) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";
  const totalPages = Math.ceil(totalUsers / usersPerPage);

  // Previous button
  if (currentPage > 1) {
    pagination.innerHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${
                  currentPage - 1
                })">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>`;
  }

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    pagination.innerHTML += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>`;
  }

  // Next button
  if (currentPage < totalPages) {
    pagination.innerHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${
                  currentPage + 1
                })">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>`;
  }
}

function changePage(page) {
  currentPage = page;
  renderTable(dashboardData.filteredTableData);
}

function openEmailModal(button) {
  // Extract data from button
  const email = button.getAttribute("data-email");
  const lastFADay = button.getAttribute("data-lastFADay") || "Not Available";
  const lastFESDay = button.getAttribute("data-lastFESDay") || "Not Available";
  const userName = button.getAttribute("data-user");

  // Set the modal content

  const modalFESParent = document.querySelector(
    "#fesCheck + .form-check-label .last-date"
  );
  const modalFAParent = document.querySelector(
    "#faCheck + .form-check-label .last-date"
  );

  if (lastFESDay.includes("not taken")) {
    modalFESParent.innerHTML = `Last completed: <span id="modalFES"> Not taken before</span>`;
  } else {
    modalFESParent.innerHTML = `Last completed: <span id="modalFES">${lastFESDay}</span> days ago`;
  }

  // Re-fetch modalFES after modification
  //const modalFES = document.getElementById("modalFES");

  if (lastFADay.includes("not taken")) {
    modalFAParent.innerHTML = `Last completed: <span id="modalFA"> Not taken before</span>`;
  } else {
    modalFAParent.innerHTML = `Last completed: <span id="modalFA">${lastFADay}</span> days ago`;
  }

  // Re-fetch modalFA after modification
  const modalFA = document.getElementById("modalFA");

  document.getElementById("modalEmail").textContent = email;
  //document.getElementById("modalFES").textContent = lastFESDay;
  //document.getElementById("modalFA").textContent = lastFADay;
  document.getElementById("userNameDisplay").textContent = userName;

  // Show the Bootstrap modal
  $("#emailModal").modal("show");
}

//To prepare the information to send Over
function confirmSendEmail(button) {
  const email = document.getElementById("modalEmail").textContent; // Corrected to 'textContent'
  const userName = document.getElementById("userNameDisplay").textContent; // Get the user's name
  const fesCheck = document.getElementById("fesCheck");
  const faCheck = document.getElementById("faCheck");
  const fesDays = document.getElementById("modalFES").innerText;
  const faDays = document.getElementById("modalFA").innerText;

  const selectedTests = [];

  // Check if the "Falls Efficacy Scale" checkbox is selected
  if (fesCheck.checked) {
    selectedTests.push({
      testType: "Falls Efficacy Scale", // Corrected to Falls Efficacy Scale
      lastCompletedDays: fesDays,
    });
  }

  // Check if the "Fall Assessment" checkbox is selected
  if (faCheck.checked) {
    selectedTests.push({
      testType: "Fall Assessment", // Kept as Fall Assessment
      lastCompletedDays: faDays,
    });
  }

  // If no checkbox is selected, you can either send a message or skip sending
  if (selectedTests.length === 0) {
    showCustomAlert(
      "Please select at least one assessment to send a reminder."
    );
    return; // Exit the function if no tests are selected
  }

  // Prepare the request body with userName, email, and selectedTests
  const requestBody = {
    userName: userName,
    email: email,
    selectedTests: selectedTests,
  };
  console.log(requestBody);

  // Send the data to the backend
  fetch("http://18.143.103.158:5200/api/v1/admin/sendEmailAssesRemind", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // Ensure `token` is defined
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Reminder sent successfully:", data);
      // Close modal or give feedback to user
      $("#emailModal").modal("hide"); // Close the modal after successful reminder
      showCustomAlert(`Email sent sucessfully to ${email}`);
    })
    .catch((error) => {
      console.error("Error sending reminder:", error);
      // Handle error (optional)
      showCustomAlert("Error sending reminder. Please try again.");
    });
}

//function to Send Email, handled by the Microservice in Admin
async function sendEmail(button) {
  const email = button.getAttribute("data-email");
  const type = button.getAttribute("data-type");
  const daysSinceLast = button.getAttribute("data-days") || "N/A";

  if (!email) {
    console.error("Email is missing.");
    showCustomAlert("Email address is missing.");
    return;
  }
  try {
    const response = await fetch(
      "http://18.143.103.158:5200/api/v1/admin/sendEmailAssesRemind",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Ensure `token` is defined
        },
        body: JSON.stringify({ email, type, daysSinceLast }),
      }
    );

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Failed to send email: ${errorDetails}`);
    }

    const result = await response.json();
    showCustomAlert(`Email sent successfully to ${email}!`);
    console.log("Email Response:", result);
  } catch (error) {
    console.error("Error sending email:", error.message);
    showCustomAlert("Failed to send email. Please try again.");
  }
}
