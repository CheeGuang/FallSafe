document.addEventListener("DOMContentLoaded", function () {
  const startTestButton = document.getElementById("startTestButton");
  const selfAssessmentContainer = document.getElementById(
    "selfAssessmentContainer"
  );
  const testNameElement = document.getElementById("title");
  const testDescriptionElement = document.getElementById("subtitle");
  const riskMetricsElement = document.getElementById("subtitle2");
  const stepsList = document.getElementById("stepsList");
  const testVideo = document.getElementById("testVideo");
  const nextTestButton = document.getElementById("nextTestButton");
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const restartButton = document.getElementById("restartButton");
  const userID = decodeToken(localStorage.getItem("token")).user_id;
  let testSessionID;
  let currentTestIndex = 0;
  let allTests = [];
  let ws;
  let storedResults = {}; // Object to store results with test ID
  let testID;
  let testStartTime; // Variable to track the start time of the test

  function decodeToken(token) {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid token format");
      }
      const payload = JSON.parse(atob(parts[1]));
      console.log("Decoded payload:", payload);
      return payload;
    } catch (error) {
      console.error("Failed to decode token:", error);
      return null;
    }
  }

  startTestButton.addEventListener("click", async () => {
    if (startTestButton.textContent.trim() === "Continue") {
      console.log("Starting test connection...");
      showCustomAlert("Testing connection to FallSafe device...");

      try {
        const token = localStorage.getItem("token");
        console.log("Token retrieved from localStorage:", token);

        if (!token) {
          showCustomAlert("Authentication token not found. Please log in.");
          console.error("Error: Token not found in localStorage.");
          return;
        }

        console.log("Testing connection to /api/v1/selfAssessment/test...");
        const testResponse = await fetch(
          "http://127.0.0.1:5250/api/v1/selfAssessment/test",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Test response status:", testResponse.status);

        if (testResponse.ok) {
          showCustomAlert(
            "Connection to FallSafe device successful. Initializing WebSocket..."
          );

          console.log("Initializing WebSocket connection...");
          ws = new WebSocket(
            `ws://127.0.0.1:5250/api/v1/selfAssessment/ws?token=${token}`
          );

          ws.onopen = () => {
            console.log("WebSocket connected successfully.");
            showCustomAlert("WebSocket connected successfully.");
            startTestButton.textContent = "Start Test";
          };

          ws.onmessage = (message) => {
            console.log("WebSocket message received:", message.data);

            if (!storedResults[testID]) storedResults[testID] = {};
            storedResults[testID].websocketData = message.data;
            console.log("Result stored:", storedResults);
          };

          ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            showCustomAlert("Error connecting to WebSocket. Please try again.");
          };

          ws.onclose = (event) => {
            console.log("WebSocket connection closed:", event);
            showCustomAlert("WebSocket connection closed.");
          };
        } else {
          showCustomAlert(
            "Failed to connect to FallSafe device. Please try again."
          );
          console.error(
            "HTTP request failed with status:",
            testResponse.status
          );
          console.error("HTTP response:", await testResponse.text());
        }
      } catch (error) {
        showCustomAlert("An error occurred while testing the connection.");
        console.error("An error occurred:", error);
      }
    } else if (startTestButton.textContent.trim() === "Start Test") {
      console.log("Starting test session...");
      const token = localStorage.getItem("token");
      try {
        if (!token || !userID) {
          showCustomAlert(
            "Authentication token or user ID not found. Please log in."
          );
          return;
        }

        const response = await fetch(
          `http://127.0.0.1:5250/api/v1/selfAssessment/startTest?userID=${userID}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json(); // Parse the JSON response
          console.log("Test session started:", result);
          showCustomAlert("Test session started successfully!");

          testSessionID = result.sessionID; // Set testSessionID from the result

          const tests = await fetchTests();
          if (tests && tests.length > 0) {
            allTests = tests;
            currentTestIndex = 0;
            displayTest(allTests[currentTestIndex]);
          }

          document.getElementById("test-container").style.display = "none";
          selfAssessmentContainer.style.display = "block";
        } else {
          console.error("Failed to start test session:", await response.text());
          showCustomAlert("Failed to start test session. Please try again.");
        }
      } catch (error) {
        console.error(
          "An error occurred while starting the test session:",
          error
        );
        showCustomAlert("An error occurred while starting the test session.");
      }
    }
  });

  async function fetchTests() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in.");
      }

      const response = await fetch(
        "http://127.0.0.1:5250/api/v1/selfAssessment/getAllTests",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tests from the server.");
      }

      const tests = await response.json();
      return tests;
    } catch (error) {
      console.error("Error fetching tests:", error);
      showCustomAlert("Error fetching tests. Please try again later.");
    }
  }

  function displayTest(test) {
    startTestButton.remove();
    testNameElement.textContent = `Test ${test.test_id}: ` + test.test_name;
    testDescriptionElement.textContent = test.description;
    riskMetricsElement.textContent = test.risk_metric;

    // Assign testID properly here
    testID = test.test_id;
    selfAssessmentContainer.dataset.testId = test.test_id;

    stepsList.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const step = test[`step_${i}`];
      if (step) {
        const listItem = document.createElement("li");
        listItem.className = "list-group-item";
        listItem.textContent = step;
        stepsList.appendChild(listItem);
      }
    }

    testVideo.src = test.video_url;
    testVideo.load();

    nextTestButton.textContent = "Next Test";
  }

  function sendWebSocketCommand(command, testID) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected. Unable to send command.");
      showCustomAlert("WebSocket is not connected. Please try again.");
      return;
    }

    const commandMessage = { command: command };
    ws.send(JSON.stringify(commandMessage));
    console.log(`Command sent: ${command}`);

    if (command === "stop") {
      const testEndTime = Date.now(); // Stop the timer
      const timeTaken = (testEndTime - testStartTime) / 1000; // Time in seconds
      console.log(`Test completed in ${timeTaken} seconds.`);
      if (!storedResults[testID]) storedResults[testID] = {};
      storedResults[testID].testID = parseInt(testID, 10); // Ensure it's an integer
      storedResults[testID].testSessionID = testSessionID;
      storedResults[testID].userID = userID;
      storedResults[testID].timeTaken = timeTaken;
    } else if (command === "restart") {
      testStartTime = Date.now(); // Restart the timer
      console.log("Test timer restarted.");
    }
  }

  startButton.addEventListener("click", () => {
    sendWebSocketCommand("start", selfAssessmentContainer.dataset.testId);
    testStartTime = Date.now(); // Start the timer
    startButton.disabled = true;
    stopButton.disabled = false;
    restartButton.disabled = true;
    nextTestButton.disabled = true; // Disable "Next Test" button
  });

  stopButton.addEventListener("click", () => {
    sendWebSocketCommand("stop", selfAssessmentContainer.dataset.testId);
    startButton.disabled = true;
    stopButton.disabled = true;
    restartButton.disabled = false;
    nextTestButton.disabled = false; // Enable "Next Test" button
  });

  restartButton.addEventListener("click", () => {
    // sendWebSocketCommand("restart", selfAssessmentContainer.dataset.testId);
    startButton.disabled = false;
    stopButton.disabled = true;
    restartButton.disabled = true;
    nextTestButton.disabled = true; // Disable "Next Test" button
  });

  nextTestButton.addEventListener("click", async () => {
    if (currentTestIndex + 1 < allTests.length) {
      // Send the current test results to the backend before moving to the next test
      if (storedResults[testID]) {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            throw new Error("Authentication token not found. Please log in.");
          }

          const response = await fetch(
            "http://127.0.0.1:5250/api/v1/selfAssessment/saveTestResult",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(storedResults[testID]),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to save test results to the server.");
          }

          console.log("Results saved successfully for test ID:", testID);
          showCustomAlert("Results saved successfully!");
        } catch (error) {
          console.error("Error saving test results:", error);
          showCustomAlert("Failed to save results. Please try again.");
        }
      }

      // Proceed to the next test
      currentTestIndex++;
      displayTest(allTests[currentTestIndex]);
      startButton.disabled = false;
      stopButton.disabled = true;
      restartButton.disabled = true;
      nextTestButton.disabled = true; // Disable "Next Test" button
    } else {
      // Send the final test results to the backend
      if (storedResults[testID]) {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            throw new Error("Authentication token not found. Please log in.");
          }

          const response = await fetch(
            "http://127.0.0.1:5250/api/v1/selfAssessment/saveTestResult",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(storedResults[testID]),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to save final test results to the server.");
          }

          console.log("Final results saved successfully for test ID:", testID);
          showCustomAlert("Final results saved successfully!");
        } catch (error) {
          console.error("Error saving final test results:", error);
          showCustomAlert("Failed to save final results. Please try again.");
        }
      }

      nextTestButton.textContent = "View Results";
      startButton.disabled = true;
      stopButton.disabled = true;
      restartButton.disabled = true;
      nextTestButton.disabled = false;
      console.log("All results:", storedResults);
    }
  });

  if (ws) {
    ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        if (!storedResults[testID]) storedResults[testID] = {};
        storedResults[testID].websocketData = data.trim(); // Add WebSocket data to results
        console.log("WebSocket response:", data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", message.data, error);
      }
    };
  }

  function calculateScore(result, test) {
    const abruptPercentage = result.websocketData
      ? JSON.parse(result.websocketData)?.abrupt_percentage || 0
      : 0; // Default to 0 if websocketData is missing
    const timeTaken = result.timeTaken || 0; // Default to 0 if timeTaken is missing
    const { test_name } = test || {}; // Ensure test is defined
    let timeScore = 0;

    // Set test-specific tolerances for fair scoring
    const tolerances = {
      "Timed Up and Go (TUG) Test": { timeTolerance: 12, abruptTolerance: 20 },
      "Five Times Sit-to-Stand Test (5x Sit-To-Stand Test)": {
        timeTolerance: 14,
        abruptTolerance: 20,
      },
      "Dynamic Gait Index (DGI)": { timeTolerance: 20, abruptTolerance: 20 },
      "Four-Stage Balance Test": { timeTolerance: 40, abruptTolerance: 15 },
    };

    const testTolerance = tolerances[test_name] || {
      timeTolerance: 12, // Default time tolerance
      abruptTolerance: 50, // Default abrupt tolerance
    };

    const { timeTolerance, abruptTolerance } = testTolerance;

    // Scoring logic based on test type
    switch (test_name) {
      case "Timed Up and Go (TUG) Test":
        // Lower time is better; scale based on time tolerance
        timeScore =
          timeTaken <= timeTolerance
            ? 100
            : Math.max(
                0,
                100 - ((timeTaken - timeTolerance) / timeTolerance) * 100
              );
        break;

      case "Five Times Sit-to-Stand Test (5x Sit-To-Stand Test)":
        // Lower time is better for completing 5 repetitions
        timeScore =
          timeTaken <= timeTolerance
            ? 100
            : Math.max(
                0,
                100 - ((timeTaken - timeTolerance) / timeTolerance) * 100
              );
        break;

      case "Dynamic Gait Index (DGI)":
        // Shorter time is better; scale fairly for higher tolerance
        timeScore =
          timeTaken <= timeTolerance
            ? 100
            : Math.max(
                0,
                100 - ((timeTaken - timeTolerance) / timeTolerance) * 100
              );
        break;

      case "Four-Stage Balance Test":
        // Shorter time is worse; score decreases as timeTaken decreases
        timeScore =
          timeTaken <= 0
            ? 0 // Minimum score if no time is recorded
            : Math.round((timeTaken / timeTolerance) * 100);
        if (timeScore > 100) timeScore = 100; // Cap the score at 100
        break;

      default:
        console.warn("Unknown test type:", test_name);
        timeScore = 50; // Fallback score
    }

    // Calculate abrupt movement score
    const abruptScore =
      abruptPercentage <= abruptTolerance
        ? 100
        : Math.max(
            0,
            100 - ((abruptPercentage - abruptTolerance) / abruptTolerance) * 100
          );

    // Weighted average (time has more weight, e.g., 70% time, 30% abruptness)
    const finalScore = Math.round(timeScore * 0.7 + abruptScore * 0.3);

    console.log({
      test_name,
      timeTaken,
      abruptPercentage,
      timeScore,
      abruptScore,
      finalScore,
    });

    return finalScore;
  }

  // Determine risk level based on abrupt movements
  function determineRiskLevel(abruptPercentage) {
    if (abruptPercentage > 30) {
      return "High";
    } else if (abruptPercentage > 15) {
      return "Moderate";
    }
    return "Low";
  }

  // Function to determine risk level based on abrupt movements
  function determineRiskLevel(abruptPercentage) {
    if (abruptPercentage > 30) {
      return "High";
    } else if (abruptPercentage > 15) {
      return "Moderate";
    }
    return "Low";
  }

  function displayResults() {
    // Remove the selfAssessmentContainer
    const selfAssessmentContainer = document.getElementById(
      "selfAssessmentContainer"
    );
    if (selfAssessmentContainer) {
      selfAssessmentContainer.style.display = "none"; // Hide the container
      // Or use selfAssessmentContainer.remove(); to completely remove it from the DOM
    }

    // Remove any existing result container
    const existingResultContainer = document.getElementById("result-container");
    if (existingResultContainer) existingResultContainer.remove();

    // Create a new result container
    const resultContainer = document.createElement("div");
    resultContainer.id = "result-container";
    resultContainer.classList.add("container", "mt-5");

    // Title
    const resultTitle = document.createElement("h2");
    resultTitle.textContent = "Your Test Results";
    resultContainer.appendChild(resultTitle);

    // Create table for detailed results
    const table = document.createElement("table");
    table.classList.add("table", "table-bordered", "mt-4");
    const thead = `<thead>
        <tr>
          <th>Test Name</th>
          <th>Time Taken (s)</th>
          <th>Abrupt Movements (%)</th>
          <th>Score</th>
          <th>Risk Level</th>
        </tr>
      </thead>`;
    table.innerHTML = thead;
    const tbody = document.createElement("tbody");

    // Variables to store data for the chart
    const labels = [];
    const scores = [];
    const riskLevels = [];

    for (const [testID, result] of Object.entries(storedResults)) {
      const test = allTests.find((t) => t.test_id === parseInt(testID));
      const abruptPercentage =
        JSON.parse(result.websocketData)?.abrupt_percentage || 0;
      const score = calculateScore(result, test);
      const riskLevel = determineRiskLevel(abruptPercentage);

      // Add data to the table
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${test?.test_name || "Unknown Test"}</td>
        <td>${result.timeTaken.toFixed(2)}</td>
        <td>${abruptPercentage.toFixed(2)}</td>
        <td>${score}</td>
        <td>${riskLevel}</td>
      `;
      tbody.appendChild(row);

      // Populate chart data
      labels.push(test?.test_name || "Unknown Test");
      scores.push(score);
      riskLevels.push(riskLevel);
    }
    table.appendChild(tbody);
    resultContainer.appendChild(table);

    // Create a canvas for the chart
    const chartContainer = document.createElement("div");
    chartContainer.classList.add("mt-5");
    const chartCanvas = document.createElement("canvas");
    chartCanvas.id = "resultsChart";
    chartContainer.appendChild(chartCanvas);
    resultContainer.appendChild(chartContainer);

    document.body.appendChild(resultContainer);

    // Render the chart
    const ctx = document.getElementById("resultsChart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Test Scores",
            data: scores,
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: (tooltipItem) => {
                const index = tooltipItem.dataIndex;
                return `Score: ${scores[index]}, Risk Level: ${riskLevels[index]}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Scores",
            },
          },
          x: {
            title: {
              display: true,
              text: "Tests",
            },
          },
        },
      },
    });
  }

  // Trigger results display when "View Results" is clicked
  nextTestButton.addEventListener("click", () => {
    if (nextTestButton.textContent === "View Results") {
      displayResults();
    }
  });

  // Trigger results display when "View Results" is clicked
  nextTestButton.addEventListener("click", () => {
    if (nextTestButton.textContent === "View Results") {
      displayResults();
    }
  });
});
