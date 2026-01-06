const token = localStorage.getItem("token");
console.log(token);
if (!token) {
  // Redirect to the login page if no token is found
  window.location.href = "./login.html";
}

// Store the fetched data globally for use in filtering and rendering
let dashboardData = {
  users: [],
  userResponses: [],
  userResponseDetails: [], //array to store the response details
};

/*let UserIndividualResponse = [
    { response_id: 17, question_id: 1, response_score: 3 },
    { response_id: 17, question_id: 2, response_score: 3 },
];*/

// Function to fetch users from API
async function fetchUsersFromAPI() {
  try {
    console.log(token);
    const response = await fetch(
      `http://18.143.103.158:5200/api/v1/admin/getAllElderlyUser`,
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

// Function to fetch user responses from API
async function fetchUserResponseFromAPI() {
  try {
    const response = await fetch(
      `http://18.143.103.158:5200/api/v1/admin/getAllElderlyFESResponse`,
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
        `Error: ${errorDetails || "Failed to fetch user responses"}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user responses:", error.message);
    showCustomAlert("Error fetching userResponse's list");
    throw error;
  }
}

//Function to fetch user response details from API
async function fetchUserResponseDetailsFromAPI() {
  try {
    const response = await fetch(
      `http://18.143.103.158:5200/api/v1/admin/getAllElderlyFESResDetails`,
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
        `Error: ${errorDetails || "Failed to fetch user responses"}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user response details:", error.message);
    showCustomAlert("Error fetching userResponse's list of details");
    throw error;
  }
}

// Initialize dashboard
document.addEventListener("DOMContentLoaded", function () {
  initializeDashboard();
  setupEventListeners();
});

async function initializeDashboard() {
  try {
    const [users, userResponses, userResponseDetails] = await Promise.all([
      fetchUsersFromAPI(),
      fetchUserResponseFromAPI(),
      fetchUserResponseDetailsFromAPI(),
    ]);

    // Store the fetched data
    dashboardData.users = users;
    dashboardData.userResponses = userResponses;
    dashboardData.userResponseDetails = userResponseDetails;

    initializeCharts();
    updateDashboard("age", "all"); // Load initial data for all elderly
  } catch (error) {
    console.error("Error initializing dashboard:", error);
    showCustomAlert("Failed to load data. Please try again later.");
  }
}

function setupEventListeners() {
  const ageGroupSelector = document.getElementById("ageGroupSelector");
  const searchButton = document.getElementById("searchButton");
  const userIdInput = document.getElementById("individualSearch");
  const suggestionDropdown = document.getElementById("suggestionDropdown");

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
  const filteredResponses = dashboardData.userResponses.filter((response) =>
    userIds.includes(response.user_id)
  );
  //console.log("filtered:" + filteredResponses);
  // Update charts
  updateAverageScoreChart(filteredResponses);
  updateDistributionChart(filteredResponses);
  updateRadarChart(filteredResponses); // Add radar chart update
}

// Function to update the radar chart
function updateRadarChart(filteredResponses) {
  //FilteredResponses, gives the filtered UserResponses  then we extract the response_id applicable
  const questionScores = Array(16).fill(0); // Array to store total score for each question
  const questionCounts = Array(16).fill(0); // Array to store count for each question

  const latestResponses = filteredResponses.reduce((acc, current) => {
    // If the user doesn't exist in the accumulator or has a later response_date
    if (
      !acc[current.user_id] ||
      new Date(current.response_date) >
        new Date(acc[current.user_id].response_date)
    ) {
      acc[current.user_id] = current; // Save the latest response for this user
    }
    return acc;
  }, {});

  // Convert the result into an array
  const latestResponsesArray = Object.values(latestResponses);

  // Extract all response_ids from the latestResponsesArray
  const latestResponseIds = latestResponsesArray.map(
    (response) => response.response_id
  );

  // Filter UserIndividualResponse to only include responses that have a matching response_id
  const filteredUserResponses = dashboardData.userResponseDetails.filter(
    (response) => latestResponseIds.includes(response.response_id)
  );
  console.log(filteredUserResponses);

  // Iterate through the filtered responses to accumulate the scores
  filteredUserResponses.forEach((response) => {
    const questionId = response.question_id; // Access question_id from the response
    // Ensure valid question_id (1-16)
    if (questionId >= 1 && questionId <= 16) {
      questionScores[questionId - 1] += response.response_score; // Add score for the corresponding question
      questionCounts[questionId - 1] += 1; // Increment the count for the question
    }
  });
  // Calculate average scores for each question
  const averageScores = questionScores.map((score, index) => {
    return questionCounts[index] > 0
      ? (score / questionCounts[index]).toFixed(2)
      : 0; // Avoid division by zero
  });
  console.log(questionScores);

  // Update radar chart with average scores
  const radarChart = window.radarChart; // Reference to the radar chart
  radarChart.data.datasets[0].data = averageScores; // Set the new data
  radarChart.update(); // Update the chart
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

  filteredResponses.forEach((response) => {
    const month =
      response.response_date.slice(5, 7) +
      "-" +
      response.response_date.slice(0, 4); // Format as "MM-YYYY"
    if (!monthlyAverages[month]) {
      monthlyAverages[month] = { totalScore: 0, count: 0 };
    }
    monthlyAverages[month].totalScore += response.total_score;
    monthlyAverages[month].count += 1;
  });

  const labels = Object.keys(monthlyAverages).sort();
  const data = labels.map((month) =>
    (monthlyAverages[month].totalScore / monthlyAverages[month].count).toFixed(
      2
    )
  );

  // Convert months to numeric x-values (index-based)
  const xValues = labels.map((label, index) => index);
  const yValues = data.map(Number); // Convert the average scores to numbers

  // Calculate linear regression (slope and intercept) based on all available data
  const { slope, intercept } = linearRegression(xValues, yValues);

  // Find the latest month (last data point) and generate future months from there
  const latestMonth = labels[labels.length - 1]; // Get the latest month
  const futureMonthsCount = 6; // Predict for the next 6 months

  const futureXValues = [];
  const futureYValues = [];
  const futureLabels = [];

  // Calculate predictions for future months
  for (let i = 1; i <= futureMonthsCount; i++) {
    const futureMonth = getNextMonth(latestMonth, i);
    futureXValues.push(xValues.length + i - 1); // Generate next X-value index
    futureYValues.push(slope * (xValues.length + i - 1) + intercept);
    futureLabels.push(futureMonth); // Add predicted future month labels
  }

  // Combine current data and future predictions for x and y values
  const allXValues = [...xValues, ...futureXValues];
  const allYValues = [...yValues, ...futureYValues];
  const allLabels = [...labels, ...futureLabels];

  // Prepare chart data
  window.averageScoreChart.data.labels = allLabels;
  window.averageScoreChart.data.datasets[0].data = yValues; // Only current data for the main dataset

  // Ensure that datasets array exists
  if (!window.averageScoreChart.data.datasets) {
    window.averageScoreChart.data.datasets = [];
  }

  // Clear previous best fit line if exists
  window.averageScoreChart.data.datasets =
    window.averageScoreChart.data.datasets.filter(
      (dataset) => dataset.label !== "Best Fit Line"
    );

  // Add the best fit line (regression line) extending into the future with a dotted line
  window.averageScoreChart.data.datasets.push({
    label: "Best Fit Line",
    data: allYValues, // Both current and predicted values
    borderColor: "rgb(255, 99, 132)", // Different color for the regression line
    borderWidth: 2,
    borderDash: [5, 5], // Dotted line style
    tension: 0.1,
    fill: false,
  });

  window.averageScoreChart.update();
}

function updateDistributionChart(filteredResponses) {
  const latestResponses = {};

  filteredResponses.forEach((response) => {
    if (
      !latestResponses[response.user_id] ||
      new Date(response.response_date) >
        new Date(latestResponses[response.user_id].response_date)
    ) {
      latestResponses[response.user_id] = response;
    }
  });

  const riskCategories = { low: 0, medium: 0, high: 0 };

  Object.values(latestResponses).forEach((response) => {
    if (response.total_score <= 36) {
      riskCategories.low += 1;
    } else if (response.total_score <= 48) {
      riskCategories.medium += 1;
    } else {
      riskCategories.high += 1;
    }
  });

  window.distributionChart.data.datasets[0].data = [
    riskCategories.low,
    riskCategories.medium,
    riskCategories.high,
  ];
  window.distributionChart.update();
}

// Linear regression function to calculate the slope and intercept
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

function initializeCharts() {
  // Average Score Chart
  const avgCtx = document.getElementById("averageScoreChart").getContext("2d");
  window.averageScoreChart = new Chart(avgCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Average FES Score",
          data: [],
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false, // Disables the legend (removes the default filter option)
        },
        tooltip: {
          enabled: true,
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 16,
          max: 64,
          title: {
            display: true,
            text: "FES Score",
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

  // Distribution Chart
  const distCtx = document.getElementById("distributionChart").getContext("2d");
  window.distributionChart = new Chart(distCtx, {
    type: "bar",
    data: {
      labels: ["Low Risk (16-36)", "Medium Risk (37-48)", "High Risk (49-64)"],
      datasets: [
        {
          label: "Number of Elderly",
          data: [],
          backgroundColor: [
            "rgba(75, 192, 192, 0.2)",
            "rgba(255, 206, 86, 0.2)",
            "rgba(255, 99, 132, 0.2)",
          ],
          borderColor: [
            "rgba(75, 192, 192, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(255, 99, 132, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false, // Disables the legend (removes the default filter option)
        },
        tooltip: {
          enabled: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
          title: {
            display: true,
            text: "Number of Elderly",
          },
        },
      },
    },
  });

  // Radar Chart
  const radarCtx = document
    .getElementById("questionScoreChart")
    .getContext("2d");
  window.radarChart = new Chart(radarCtx, {
    type: "radar",
    data: {
      labels: [
        "Q1",
        "Q2",
        "Q3",
        "Q4",
        "Q5",
        "Q6",
        "Q7",
        "Q8",
        "Q9",
        "Q10",
        "Q11",
        "Q12",
        "Q13",
        "Q14",
        "Q15",
        "Q16",
      ],
      datasets: [
        {
          data: Array(16).fill(0), // Initial empty data
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          pointBackgroundColor: "rgba(75, 192, 192, 1)",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        r: {
          angleLines: {
            display: false,
          },
          suggestedMin: 0,
          suggestedMax: 4,
        },
      },
    },
  });
  console.log("Canvas Context:", radarCtx); // Should log a valid context
}
