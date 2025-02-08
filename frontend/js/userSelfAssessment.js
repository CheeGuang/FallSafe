document.addEventListener("DOMContentLoaded", function () {
  let eligibleForVoucher = false; // Track eligibility before test

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

  fetchUserAssessmentResults();

  startTestButton.addEventListener("click", async () => {
    if (startTestButton.textContent.trim() === "Continue") {
      startTestButton.disabled = true;
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
            startTestButton.disabled = false;
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
          startTestButton.disabled = false;

          console.error(
            "HTTP request failed with status:",
            testResponse.status
          );
          console.error("HTTP response:", await testResponse.text());
        }
      } catch (error) {
        showCustomAlert("An error occurred while testing the connection.");
        startTestButton.disabled = false;
        console.error("An error occurred:", error);
      }
    } else if (startTestButton.textContent.trim() === "Start Test") {
      startTestButton.disabled = true;
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
    $("#test-container").remove();
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
        listItem.innerHTML = `<strong>Step ${i}:</strong> ${step}`; // Use innerHTML for rendering bold text
        stepsList.appendChild(listItem);
      }
    }

    testVideo.src = test.video_url;
    testVideo.load();

    nextTestButton.textContent = "Next Test";
  }

  // Stopwatch Variables
  let stopwatchInterval;
  let elapsedTime = 0; // In milliseconds

  // Update Stopwatch Display
  function updateStopwatchDisplay() {
    const stopwatchTime = document.getElementById("stopwatchTime");
    const minutes = Math.floor(elapsedTime / (1000 * 60));
    const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
    stopwatchTime.textContent = `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }

  // Start Stopwatch
  function startStopwatch() {
    const startTime = Date.now() - elapsedTime;
    stopwatchInterval = setInterval(() => {
      elapsedTime = Date.now() - startTime;
      updateStopwatchDisplay();
    }, 10); // Update every 10ms for precision
  }

  // Stop Stopwatch
  function stopStopwatch() {
    clearInterval(stopwatchInterval);
  }

  // Reset Stopwatch
  function resetStopwatch() {
    clearInterval(stopwatchInterval);
    elapsedTime = 0;
    updateStopwatchDisplay();
  }

  function calculateRiskLevel(score) {
    if (score < 40) {
      return "High";
    } else if (score < 70) {
      return "Moderate";
    }
    return "Low";
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
    startStopwatch();
    testStartTime = Date.now(); // Start the timer
    startButton.disabled = true;
    stopButton.disabled = false;
    restartButton.disabled = true;
    nextTestButton.disabled = true; // Disable "Next Test" button
  });

  stopButton.addEventListener("click", () => {
    sendWebSocketCommand("stop", selfAssessmentContainer.dataset.testId);
    stopStopwatch();
    startButton.disabled = true;
    stopButton.disabled = true;
    restartButton.disabled = false;
    nextTestButton.disabled = false; // Enable "Next Test" button
  });

  restartButton.addEventListener("click", () => {
    // sendWebSocketCommand("restart", selfAssessmentContainer.dataset.testId);
    resetStopwatch();
    startButton.disabled = false;
    stopButton.disabled = true;
    restartButton.disabled = true;
    nextTestButton.disabled = true; // Disable "Next Test" button
  });

  nextTestButton.addEventListener("click", async () => {
    if (currentTestIndex + 1 < allTests.length) {
      // Save current test results before proceeding
      if (storedResults[testID]) {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            throw new Error("Authentication token not found. Please log in.");
          }

          // Calculate score and risk level
          const score = calculateScore(
            storedResults[testID],
            allTests[currentTestIndex]
          );
          const riskLevel = calculateRiskLevel(score);
          storedResults[testID].riskLevel = riskLevel; // Overwrite riskLevel in stored results

          // Debugging output to verify the updated storedResults object
          console.log("Updated storedResults:", storedResults[testID]);

          // Send result to saveTestResult endpoint
          const response = await fetch(
            "http://127.0.0.1:5250/api/v1/selfAssessment/saveTestResult",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(storedResults[testID]), // Include recalculated riskLevel
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
      resetStopwatch();
    } else {
      // Only save final test results if the button is not in "View Results" mode
      if (
        storedResults[testID] &&
        nextTestButton.textContent !== "View Results"
      ) {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            throw new Error("Authentication token not found. Please log in.");
          }

          // Calculate score and risk level
          const score = calculateScore(
            storedResults[testID],
            allTests[currentTestIndex]
          );
          const riskLevel = calculateRiskLevel(score);
          storedResults[testID].riskLevel = riskLevel; // Overwrite riskLevel in stored results

          console.log("Final updated storedResults:", storedResults[testID]);

          // Send result to saveTestResult endpoint
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
      "Timed Up and Go Test": { timeTolerance: 12, abruptTolerance: 20 },
      "Five Times Sit to Stand Test": {
        timeTolerance: 14,
        abruptTolerance: 20,
      },
      "Dynamic Gait Index (DGI)": { timeTolerance: 20, abruptTolerance: 20 },
      "4 Stage Balance Test": { timeTolerance: 40, abruptTolerance: 15 },
    };

    const testTolerance = tolerances[test_name] || {
      timeTolerance: 12, // Default time tolerance
      abruptTolerance: 50, // Default abrupt tolerance
    };

    const { timeTolerance, abruptTolerance } = testTolerance;

    // Scoring logic based on test type
    switch (test_name) {
      case "Timed Up and Go Test":
        // Lower time is better; scale based on time tolerance
        timeScore =
          timeTaken <= timeTolerance
            ? 100
            : Math.max(
                0,
                100 - ((timeTaken - timeTolerance) / timeTolerance) * 100
              );
        break;

      case "Five Times Sit to Stand Test":
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

      case "4 Stage Balance Test":
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

  function displayResults() {
    // Remove the selfAssessmentContainer
    const selfAssessmentContainer = document.getElementById(
      "selfAssessmentContainer"
    );
    if (selfAssessmentContainer) {
      selfAssessmentContainer.style.display = "none"; // Hide the container
    }

    testNameElement.textContent = "Your Self Assessment Results";
    testDescriptionElement.textContent = "Feel free to consult your doctor";
    riskMetricsElement.remove();

    // Select the result container
    const resultContainer = document.getElementById("result-container");

    if (resultContainer) {
      // Clear any existing content
      resultContainer.innerHTML = "";

      // Make the container visible
      resultContainer.style.display = "block";

      // Create table for detailed results
      const table = document.createElement("table");
      table.classList.add("table", "table-bordered", "mt-4");
      const thead = `<thead>
          <tr>
            <th>Test Name</th>
            <th>Description</th>
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
        const riskLevel = calculateRiskLevel(score);

        // Add data to the table
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${test?.test_name || "Unknown Test"}</td>
           <td>${test?.description || "No description available"}</td>
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

      // Render the chart
      const ctx = chartCanvas.getContext("2d");
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
              labels: {
                font: {
                  size: 16, // Legend font size
                },
              },
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
                font: {
                  size: 18, // Y-axis title font size
                },
              },
              ticks: {
                font: {
                  size: 14, // Y-axis tick font size
                },
              },
            },
            x: {
              title: {
                display: true,
                text: "Tests",
                font: {
                  size: 18, // X-axis title font size
                },
              },
              ticks: {
                font: {
                  size: 14, // X-axis tick font size
                },
              },
            },
          },
        },
      });
    } else {
      console.error("Result container not found in the DOM.");
    }

    // Add a container div for centring the button
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("d-flex", "justify-content-center", "mt-3");

    // Create the "Download as PDF" button
    const downloadPdfButton = document.createElement("button");
    downloadPdfButton.id = "downloadPdfButton";
    downloadPdfButton.classList.add("btn", "btn-primary");
    downloadPdfButton.textContent = "Download Results as PDF";

    // Append the button to the container
    buttonContainer.appendChild(downloadPdfButton);

    // Append the container to the result container
    resultContainer.appendChild(buttonContainer);
    downloadPdfButton.addEventListener("click", async () => {
      const { jsPDF } = window.jspdf;

      // Select the result container
      const resultContainer = document.getElementById("result-container");

      if (resultContainer) {
        // Temporarily hide the download button to exclude it from the screenshot
        const downloadButton = document.getElementById("downloadPdfButton");
        if (downloadButton) {
          downloadButton.style.visibility = "hidden"; // Use visibility instead of display
        }

        // Use html2canvas to capture the result container as an image
        const canvas = await html2canvas(resultContainer, {
          scale: 2, // Increase scale for better image quality
        });

        // Restore the download button visibility
        if (downloadButton) {
          downloadButton.style.visibility = "visible"; // Restore visibility
        }

        const imgData = canvas.toDataURL("image/png");

        // Create a new jsPDF instance
        const doc = new jsPDF();

        // Add today's date
        const today = new Date();
        const dateString = today.toLocaleDateString();

        // Get the token from localStorage and decode it
        const token = localStorage.getItem("token");
        const userDetails = decodeToken(token);

        // Add FallSafe logo
        const img = new Image();
        img.src = "./img/FallSafe.png";

        // Wait for the image to load before proceeding
        img.onload = () => {
          const logoWidth = 40; // Adjust width as needed
          const logoHeight = (img.height / img.width) * logoWidth; // Maintain aspect ratio
          doc.addImage(
            img,
            "PNG",
            doc.internal.pageSize.getWidth() - logoWidth - 10, // Top-right corner
            10,
            logoWidth,
            logoHeight
          );

          // Add user details
          doc.setFontSize(12);
          doc.text(`Name: ${userDetails.name}`, 10, 20); // Adjust Y-axis as needed
          doc.text(`Email: ${userDetails.email}`, 10, 28);
          doc.text(`Age: ${userDetails.age}`, 10, 36);

          // Add today's date
          doc.text(`Date: ${dateString}`, 10, 44);

          // Get the PDF page dimensions
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();

          // Calculate scaling to fit the image slightly smaller within the PDF page
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;

          // Reduce the scaling factor to make the image slightly smaller
          const scaleFactor = Math.min(
            (pageWidth / imgWidth) * 0.9, // Reduce the width scaling to 90%
            (pageHeight / imgHeight) * 0.9 // Reduce the height scaling to 90%
          );

          const scaledWidth = imgWidth * scaleFactor;
          const scaledHeight = imgHeight * scaleFactor;

          // Center the image on the page (below the header content)
          const xOffset = (pageWidth - scaledWidth) / 2;
          const yOffset = 60; // Adjust to position below the user details and logo

          // Add the scaled image to the PDF
          doc.addImage(
            imgData,
            "PNG",
            xOffset,
            yOffset,
            scaledWidth,
            scaledHeight
          );

          // Save the PDF
          doc.save("Self_Assessment_Results.pdf");
        };
      } else {
        console.error("Result container not found in the DOM.");
      }
    });
  }

  // Trigger results display when "View Results" is clicked
  nextTestButton.addEventListener("click", () => {
    if (nextTestButton.textContent === "View Results") {
      handleSendVoucherEmail();
      // displayResults();
    }
  });
});

async function fetchUserAssessmentResults() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token found");
    }

    // Decode JWT to get user ID
    const tokenPayload = JSON.parse(atob(token.split(".")[1]));
    const userId = tokenPayload.user_id;

    if (!userId) {
      throw new Error("User ID not found in token");
    }

    // Fetch user results
    const response = await fetch(
      `http://127.0.0.1:5250/api/v1/selfAssessment/getUserResults?user_id=${userId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user assessment results");
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      document.getElementById("last-assessment-info").innerHTML =
        "<p>No previous assessment found</p>";
      document.getElementById("countdown-timer").style.display = "none";
      document.getElementById("voucher-status").style.display = "none";
      return;
    }

    // Get the latest assessment based on session_date
    const latestAssessment = data.reduce((latest, current) => {
      return new Date(current.session_date) > new Date(latest.session_date)
        ? current
        : latest;
    });

    // Display the latest assessment date
    const lastTakenDate = new Date(latestAssessment.session_date);
    document.getElementById("last-taken-date").textContent =
      lastTakenDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

    // Calculate the time difference in months and days
    const today = new Date();
    let monthsAgo =
      today.getMonth() -
      lastTakenDate.getMonth() +
      12 * (today.getFullYear() - lastTakenDate.getFullYear());
    let daysAgo = today.getDate() - lastTakenDate.getDate();

    // Determine voucher eligibility
    eligibleForVoucher = monthsAgo >= 6;

    if (daysAgo < 0) {
      monthsAgo -= 1;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      daysAgo += prevMonth.getDate();
    }

    // Display time since last assessment
    document.getElementById("months-days-ago").innerHTML =
      monthsAgo === 0 && daysAgo === 0
        ? "<span>(Today)</span>"
        : `<span>(${monthsAgo} months, ${daysAgo} days ago)</span>`;

    // Calculate the next recommended assessment date
    const nextAssessment = new Date(lastTakenDate);
    nextAssessment.setMonth(nextAssessment.getMonth() + 6);

    function updateTimer() {
      const now = new Date();
      const difference = nextAssessment - now;

      if (difference <= 0) {
        document.getElementById("voucher-status").style.display = "block";
        document.getElementById("countdown-timer").innerHTML =
          "<p>It's time for your next assessment!</p>";
        return;
      }

      document.getElementById("voucher-status").style.display = "none";

      const remainingMonths = Math.floor(
        difference / (1000 * 60 * 60 * 24 * 30)
      );
      const remainingDays = Math.floor(
        (difference % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)
      );

      document.getElementById("months").textContent = remainingMonths;
      document.getElementById("days").textContent = remainingDays;

      if (remainingMonths === 0 && remainingDays === 0) {
        document.getElementById("countdown-timer").innerHTML =
          "<p>It's time for your next assessment! 🎉 Take it now to stay on track!</p>";
      }
    }

    updateTimer();
    setInterval(updateTimer, 1000 * 60 * 60);

    // Show NTUC voucher eligibility message if assessment is older than 6 months
    if (monthsAgo >= 6) {
      document.getElementById("voucher-status").style.display = "block";
    }
  } catch (error) {
    console.error("Error fetching user assessment results:", error);
  }
}

async function handleSendVoucherEmail() {
  if (eligibleForVoucher) {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("Authentication token not found.");
      return;
    }

    const tokenPayload = JSON.parse(atob(token.split(".")[1]));
    const userEmail = tokenPayload.email;

    showCustomAlert(
      "🎉 Congratulations! A $10 NTUC Voucher will be emailed to you.",
      "userFATResults.html"
    );

    await sendVoucherEmail(userEmail, 2); // Sending 2 vouchers
  }
}

async function sendVoucherEmail(email, voucherCount) {
  try {
    const response = await fetch(
      `http://127.0.0.1:5100/api/v1/user/sendVoucherEmail`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          email: email,
          voucher_count: voucherCount,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to send voucher email");
    }
  } catch (error) {
    console.error("Error sending voucher email:", error);
  }
}
