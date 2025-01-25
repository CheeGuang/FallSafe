document.addEventListener("DOMContentLoaded", function () {
  // Retrieve the token from localStorage
  const token = localStorage.getItem("token");

  // Check if the token exists
  if (!token) {
    window.location.href = "./login.html"; // Redirect to login if no token is found
    return;
  }

  try {
    // Decode the token to extract user information
    const decodedToken = parseJwt(token);

    // Update the title dynamically with the user's name
    const userName = decodedToken.name || "User"; // Default to "User" if no name is found
    
    // Update the results section title
    const resultsTitleElement = document.getElementById("userResultsTitle");
    if (resultsTitleElement) {
      resultsTitleElement.innerText = `Here are your results, ${userName}:`;
    }

    // Update the history section title
    const historyTitleElement = document.getElementById("historyTitle");
    if (historyTitleElement) {
      historyTitleElement.innerText = `Test History for ${userName}`;
    }

    // Check if the token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedToken.exp < currentTime) {
      showCustomAlert("Your session has expired. Please log in again.");
      localStorage.removeItem("token");
      window.location.href = "./login.html";
      return;
    }

    // Fetch user test results using the extracted userID
    fetchTestResults(decodedToken.user_id);
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

  // Function to fetch user test results
  function fetchTestResults(userID) {
    fetch(`http://127.0.0.1:5100/api/v1/user/getUserResults?userID=${userID}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, // Include JWT token
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to fetch test results");
        }
        return response.json();
      })
      .then(data => {
        const aggregatedData = aggregateTestResults(data);
        renderCharts(aggregatedData);
        displayDetailedData(data);
      })
      .catch(error => console.error("Error:", error));
  }

  // Function to aggregate test results (calculate averages for duplicate test names)
  function aggregateTestResults(results) {
    const aggregatedResults = {};

    // Loop through the results and aggregate by test_name
    results.forEach(result => {
      if (!aggregatedResults[result.test_name]) {
        aggregatedResults[result.test_name] = { totalScore: 0, count: 0 };
      }
      aggregatedResults[result.test_name].totalScore += result.score;
      aggregatedResults[result.test_name].count++;
    });

    // Convert aggregated results into an array of averages
    return Object.keys(aggregatedResults).map(testName => {
      const { totalScore, count } = aggregatedResults[testName];
      return {
        test_name: testName,
        score: totalScore / count, // Average score
      };
    });
  }

  // Function to render charts using Chart.js
  function renderCharts(results) {
    if (!results || results.length === 0) {
      console.warn("No data available for chart.");
      return;
    }

    const ctxBar = document.getElementById("barChart").getContext("2d");
    const ctxRadar = document.getElementById("radarChart").getContext("2d");

    // Extract test names and scores
    const testNames = results.map(result => result.test_name);
    const scores = results.map(result => result.score);

    // Fall risk calculation
    const fallRisk = getFallRisk(scores);
    const fallRiskElement = document.getElementById("fallRisk");
    if (fallRiskElement) {
      fallRiskElement.innerHTML = `<p>Fall Risk: <strong>${fallRisk}</strong></p>`;
    }

    // Bar Chart (Show Scores for Each Test)
    new Chart(ctxBar, {
      type: "bar",
      data: {
        labels: testNames,
        datasets: [{
          label: "Test Scores",
          data: scores,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100 // Assuming score is out of 100
          }
        }
      }
    });

    // Radar Chart (Comparing Scores Across Tests)
    new Chart(ctxRadar, {
      type: "radar",
      data: {
        labels: testNames,
        datasets: [{
          label: "Test Scores",
          data: scores,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            angleLines: {
              display: true
            },
            suggestedMin: 0,
            suggestedMax: 100,
          }
        }
      }
    });
  }

  // Function to determine fall risk based on scores
  function getFallRisk(scores) {
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    if (averageScore > 70) {
      return "Low Fall Risk";
    } else if (averageScore >= 50) {
      return "Medium Fall Risk";
    } else {
      return "High Fall Risk";
    }
  }

  // Function to display detailed test results in a table
  function displayDetailedData(results) {
    const detailedDataContainer = document.getElementById("detailedData");

    if (!results || results.length === 0) {
      detailedDataContainer.innerHTML = "<tr><td colspan='3'>No data available.</td></tr>";
      return;
    }

    detailedDataContainer.innerHTML = results.map((result, index) => `
      <tr>
        <td>${index + 1}</td> <!-- Sequential Number -->
        <td>${result.test_name}</td>
        <td>${result.score}</td>
        <td>${result.test_date}</td>
      </tr>
    `).join("");
  }

  // Toggle button click event
  const toggleButton = document.getElementById("toggleDataView");
  toggleButton.addEventListener("click", function () {
    const dataTableContainer = document.getElementById("dataTableContainer");

    if (dataTableContainer.style.display === "none") {
      dataTableContainer.style.display = "block";
      toggleButton.innerText = "Hide All Data";
    } else {
      dataTableContainer.style.display = "none";
      toggleButton.innerText = "Show All Data";
    }
  });
});
