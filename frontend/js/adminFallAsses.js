const token = localStorage.getItem("token");
console.log(token);
if (!token) {
  // Redirect to the login page if no token is found
  window.location.href = "./login.html";
}

// Store the fetched data globally for use in filtering and rendering
let dashboardData = {
  users: [],
  totalScoreList: [],
  TimeTakenList: [],
  tableDatafullList: [], //original data set to be compared
  tableDatafilteredList: [], //will used this as the global one for filtered
};
//Pages for the table
let currentPage = 1;
const usersPerPage = 5;

//sample data format for users
/*{
    "user_id": 1,
    "name": "Alice Tan",
    "email" ""
    "age": "61"
},
//sample data for totalScoreTestSession
{
    "session_id": 1,
    "user_id": 1,
    "session_date": "2022-07-27T00:00:00Z",
    "total_score": 22
},
//sample data for timeTakenChart
{
    "result_id": 1,
    "test_name": "Timed Up and Go Test",
    "user_id": 1,
    "time_taken": 25.5,
    "session_date": "2022-07-27T00:00:00Z"
},
{
    "result_id": 5,
    "test_name": "Timed Up and Go Test",
    "user_id": 1,
    "time_taken": 23,
    "session_date": "2023-01-27T00:00:00Z"
},
//sample schema for table
{
    "user_id": 1,
    "overall_risk_level": "high"
},
*/

// Initialize dashboard
document.addEventListener("DOMContentLoaded", function () {
  initializeDashboard();
  setupEventListeners();
});

async function initializeDashboard() {
  try {
    const [users, totalScoreList, TimeTakenList, latestOverallRisk] =
      await Promise.all([
        fetchUsersFromAPI(),
        fetchFATotalScoreFromAPI(),
        fetchFAAvgTimeFromAPI(),
        fetchAllUserRiskFromAPI(),
      ]);

    // Store the fetched data
    dashboardData.users = users;
    dashboardData.totalScoreList = totalScoreList;
    dashboardData.TimeTakenList = TimeTakenList;

    const mergedList = mergeUserRiskData(users, latestOverallRisk);
    dashboardData.tableDatafullList = mergedList;

    console.log(users);
    initializeCharts();
    updateDashboard("age", "all"); // Load initial data for all elderly
  } catch (error) {
    console.error("Error initializing dashboard:", error);
    showCustomAlert("Failed to load data. Please try again later.");
  }
}
//to populate risk data for table
function mergeUserRiskData(userDetailsList, riskLevelsList) {
  return riskLevelsList
    .map((risk) => {
      // Find the corresponding user details by user_id
      const user = userDetailsList.find(
        (user) => user.user_id === risk.user_id
      );

      if (user) {
        return {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          age: user.age,
          overall_risk_level: risk.overall_risk_level,
        };
      }
      return null;
    })
    .filter((user) => user !== null); // Remove null values
}

// Function to fetch users from API
async function fetchUsersFromAPI() {
  try {
    console.log(token);
    const response = await fetch(
      "http://18.143.151.82:5200/api/v1/admin/getAllElderlyUser",
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

// Function to fetch average scores from API
async function fetchFATotalScoreFromAPI() {
  try {
    console.log(token);
    const response = await fetch(
      "http://18.143.151.82:5200/api/v1/admin/getAllFATotalScore",
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
        `Error: ${errorDetails || "Failed to fetch average scores"}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching average scores:", error.message);
    showCustomAlert("Error fetching average scores");
    throw error;
  }
}

// Function to fetch all user test time taken
async function fetchFAAvgTimeFromAPI() {
  try {
    const response = await fetch(
      "http://18.143.151.82:5200/api/v1/admin/getAllFATime",
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
        `Error: ${errorDetails || "Failed to fetch test results"}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching test results:", error.message);
    showCustomAlert("Error fetching test results");
    throw error;
  }
}

// Function to fetch all user risk levels, latest
async function fetchAllUserRiskFromAPI() {
  try {
    const response = await fetch(
      "http://18.143.151.82:5200//api/v1/admin/getAllFAUserRisk",
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
  const filteredResponsesTotalScore = dashboardData.totalScoreList.filter(
    (response) => userIds.includes(response.user_id)
  );
  const filteredResponsesAvgTime = dashboardData.TimeTakenList.filter(
    (response) => userIds.includes(response.user_id)
  );
  //filtering of TABLE
  const riskLevels = {
    low: 1,
    moderate: 2,
    high: 3,
  };

  const givenListTable = dashboardData.tableDatafullList
    .filter((response) => userIds.includes(response.user_id))
    .sort(
      (a, b) =>
        riskLevels[b.overall_risk_level] - riskLevels[a.overall_risk_level]
    );

  dashboardData.tableDatafilteredList = givenListTable; //save as global, will be referencing to this
  console.log(givenListTable);
  updateAverageScoreChart(filteredResponsesTotalScore);
  updateTimeTakenChart(filteredResponsesAvgTime);
  renderTable(givenListTable);
}

function updateAverageScoreChart(filteredResponses) {
  if (!Array.isArray(filteredResponses) || filteredResponses.length === 0) {
    console.warn("No data available. Clearing the chart.");

    // Clear the chart data
    window.averageSessionScoreChart.data.labels = [];
    window.averageSessionScoreChart.data.datasets.forEach((dataset) => {
      dataset.data = [];
    });

    // Update the chart to reflect the cleared state
    window.averageSessionScoreChart.update();
    return;
  }
  const monthlyAverages = {};

  // Aggregate total scores and count per month
  filteredResponses.forEach((response) => {
    const month =
      response.session_date.slice(5, 7) +
      "-" +
      response.session_date.slice(0, 4); // "MM-YYYY"
    if (!monthlyAverages[month]) {
      monthlyAverages[month] = { totalScore: 0, count: 0 };
    }
    monthlyAverages[month].totalScore += response.total_score;
    monthlyAverages[month].count += 1;
  });

  // Generate sorted labels (months) and compute averages
  const labels = Object.keys(monthlyAverages).sort();
  const data = labels.map((month) =>
    (monthlyAverages[month].totalScore / monthlyAverages[month].count).toFixed(
      2
    )
  );

  // Convert labels to index-based x-values for linear regression
  const xValues = labels.map((_, index) => index);
  const yValues = data.map(Number); // Convert averages to numbers

  // Compute linear regression
  const { slope, intercept } = linearRegression(xValues, yValues);

  // Generate predicted future months
  const numMonthsToPredict = 6;
  const futureLabels = [];
  const futureXValues = [];
  const futureYValues = [];

  let lastMonth = labels[labels.length - 1];

  for (let i = 1; i <= numMonthsToPredict; i++) {
    lastMonth = getNextMonth(lastMonth, 1); // Get next month in "MM-YYYY" format
    futureLabels.push(lastMonth);
    futureXValues.push(xValues.length + i - 1); // Continue indexing from last known x-value
    futureYValues.push(slope * (xValues.length + i - 1) + intercept);
  }

  // Combine historical and future data
  const allLabels = [...labels, ...futureLabels];
  const bestFitLine = [...yValues, ...futureYValues]; // Best fit line for historical & predicted data

  // Update chart labels
  window.averageSessionScoreChart.data.labels = allLabels;

  // Update historical dataset
  window.averageSessionScoreChart.data.datasets[0].data = yValues;

  // Ensure that datasets exist before updating
  if (!window.averageSessionScoreChart.data.datasets[1]) {
    window.averageSessionScoreChart.data.datasets.push({});
  }

  // Update or create best fit line dataset
  window.averageSessionScoreChart.data.datasets[1] = {
    label: "Best Fit Line",
    data: bestFitLine,
    borderColor: "rgb(255, 99, 132)", // Red for best fit line
    borderWidth: 2,
    borderDash: [5, 5], // Dotted line
    fill: false,
  };

  // Update the chart
  window.averageSessionScoreChart.update();
}

// Linear Regression Function
function linearRegression(xValues, yValues) {
  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, idx) => sum + x * yValues[idx], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// Function to get the next month from the latest month
function getNextMonth(latestMonth, monthsToAdd) {
  const date = new Date(
    latestMonth.split("-")[1],
    parseInt(latestMonth.split("-")[0], 10) - 1,
    1
  ); // Convert "MM-YYYY" to Date
  date.setMonth(date.getMonth() + monthsToAdd); // Add the required number of months
  const options = { year: "numeric", month: "2-digit" }; // Format the month as "MM-YYYY"
  return date.toLocaleDateString("en-US", options).replace(/\//g, "-"); // Change the format to MM-YYYY
}

function updateTimeTakenChart(filteredResponses) {
  // Compute average time taken per test name
  const testAvgTime = {};
  const testCount = {};

  filteredResponses.forEach(({ test_name, time_taken }) => {
    if (!testAvgTime[test_name]) {
      testAvgTime[test_name] = 0;
      testCount[test_name] = 0;
    }
    testAvgTime[test_name] += time_taken;
    testCount[test_name] += 1;
  });

  // Calculate final averages
  const testNames = Object.keys(testAvgTime);
  const avgTimes = testNames.map((test) =>
    (testAvgTime[test] / testCount[test]).toFixed(2)
  );

  // Update the Chart.js dataset
  window.timeTakenChart.data.labels = testNames;
  window.timeTakenChart.data.datasets[0].data = avgTimes;
  window.timeTakenChart.update();
}

function initializeCharts() {
  /*const mockTestResults = [
        { test_name: "Balance Test", avg_time: 12.5 },
        { test_name: "Strength Test", avg_time: 18.7 },
        { test_name: "Cognitive Test", avg_time: 22.3 },
        { test_name: "Endurance Test", avg_time: 15.4 },
    ];*/

  // Line Chart: Average Session Score Over Time
  const avgCtx = document
    .getElementById("averageSessionScoreChart")
    .getContext("2d");
  window.averageSessionScoreChart = new Chart(avgCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Total Session Score",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { title: { display: true, text: "Total Score" } },
        x: { title: { display: true, text: "Date" } },
      },
      plugins: {
        legend: {
          display: false, // Hide the label (legend)
        },
        tooltip: {
          enabled: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: "Total Score",
          },
        },
        x: {
          title: {
            display: true,
            text: "Month",
          },
        },
      },
    },
  });

  // Bar Chart: Average Time Taken per Test
  const timeCtx = document.getElementById("timeTakenChart").getContext("2d");
  window.timeTakenChart = new Chart(timeCtx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Avg Time (s)",
          data: [],
          backgroundColor: "rgba(255, 99, 132, 0.5)",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { title: { display: true, text: "Time (seconds)" } },
        x: { title: { display: true, text: "Test Name" } },
      },
      plugins: {
        legend: {
          display: false, // Hide the label (legend)
        },
        tooltip: {
          enabled: true,
        },
      },
    },
  });

  //Table chart, to initialise, nothing yet until table
}

function renderTable(filteredUsers) {
  const tableBody = document.getElementById("tableBody");
  tableBody.innerHTML = "";

  // Paginate data
  const start = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(start, start + usersPerPage);

  // Insert table rows
  paginatedUsers.forEach((user) => {
    let riskBadge = "";
    switch (user.overall_risk_level.toLowerCase()) {
      case "high":
        riskBadge = `<span class="badge bg-danger rounded-pill">High</span>`;
        break;
      case "moderate":
        riskBadge = `<span class="badge bg-warning text-dark rounded-pill">Moderate</span>`;
        break;
      case "low":
        riskBadge = `<span class="badge bg-success rounded-pill">Low</span>`;
        break;
    }

    const row = `
            <tr>
                <td>${user.name}</td>
                <td>${user.age}</td>
                <td>${user.email}</td>
                <td>${riskBadge}</td>
            </tr>`;
    tableBody.innerHTML += row;
  });

  // Update pagination
  renderPagination(filteredUsers.length);
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
  renderTable(dashboardData.tableDatafilteredList);
}
