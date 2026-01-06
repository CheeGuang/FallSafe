let latestQuestionChart = null;
let muscleGroupChart = null;

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("User not authenticated");
    return;
  }

  try {
    const user_id = decodeToken(token).user_id;
    const testResults = await fetchData(
      `http://18.143.151.82:5100/api/v1/user/getAUserTestResults?user_id=${user_id}`
    );

    if (!testResults) {
      alert("Error fetching data");
      return;
    }

    console.log("testResults:", testResults);

    const latestSession = testResults.self_assessment_results[0];
    const allSessions = testResults.self_assessment_results.sort(
      (a, b) => new Date(b.session_date) - new Date(a.session_date)
    );

    // Calculate and display risk result
    const overallRisk = calculateOverallRisk(allSessions);
    displayRiskResult(overallRisk);

    displayActionableInsights(testResults.actionable_insights.response);

    generateSATotalScoreChart(allSessions);
    generateAbruptPercentageChart(allSessions);
    generateFATGaugeCharts(allSessions);
    generateLatestTestBreakdown(latestSession);
    generateComparisonBarChart(allSessions);
  } catch (error) {
    console.error("Error: ", error);
    alert("An error occurred while fetching data.");
  }
});

function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (error) {
    console.error("Invalid token", error);
    return null;
  }
}

async function fetchData(url) {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found, please log in.");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      alert("Unauthorized: Please log in again.");
      localStorage.removeItem("token");
      window.location.href = "/login.html";
      return null;
    }

    if (!response.ok) throw new Error(`Error: ${response.statusText}`);

    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

function displayActionableInsights(testInsights) {
  const formatText = (text) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold formatting
      .replace(/^[\s\S]*?1\)/, "1)") // Remove everything before "1)"
      .replace(/\n/g, "") // Remove all newlines
      .replace(/(?<!<br>\s*)\b([2-9]|[1-9][0-9]+)\)/g, "<br>$1)"); // Add <br> if missing before numbers 2+)

  document.getElementById("actionable-insights").innerHTML = `
    <h3>Self-Assessment Recommendations:</h3><p>${formatText(testInsights)}</p>
  `;

  console.log(formatText(testInsights));
}

function calculateOverallRisk(testResults) {
  if (!testResults.length) {
    console.warn("Insufficient data for risk calculation.");
    return { percentage: 0, level: "low" };
  }

  // Get the latest test result based on test date
  const latestTest = testResults[0];

  console.log("Latest test selected:", latestTest);

  // Extract risk score from the latest test
  const testRiskScore = latestTest.total_score?.Int64 ?? 0;

  console.log("Test risk score:", testRiskScore);

  console.log(
    "determineRiskLevel(100 - testRiskScore)",
    determineRiskLevel(100 - testRiskScore)
  );

  return {
    percentage: 100 - testRiskScore,
    level: determineRiskLevel(100 - testRiskScore),
  };
}

function getRiskScore(riskLevel) {
  const riskMapping = { low: 0.2, moderate: 0.5, high: 0.8 };
  return riskMapping[riskLevel] || 0;
}

function determineRiskLevel(percentage) {
  console.log("percentage", percentage);
  if (percentage < 30) return "low";
  if (percentage < 60) return "moderate";
  return "high";
}

function displayRiskResult({ percentage, level }) {
  const progressBar = document.getElementById("risk-progress");
  const riskLabel = document.getElementById("risk-label");

  let color;
  if (level === "low") {
    color = "bg-success";
  } else if (level === "moderate") {
    color = "bg-warning";
  } else {
    color = "bg-danger";
  }

  progressBar.style.width = `${percentage.toFixed(2)}%`;
  progressBar.className = `progress-bar ${color}`;
  riskLabel.innerHTML = `<strong>${level.toUpperCase()}</strong> - ${percentage.toFixed(
    2
  )}% Risk`;
}

// Total Self-Assessment Score Over Time (Sorted by session_date in Ascending Order)
function generateSATotalScoreChart(data) {
  // Sort data by session_date in ascending order
  data.sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

  const labels = data.map((session) =>
    new Date(session.session_date).toLocaleDateString()
  );
  const totalScores = data.map((session) => session.total_score.Int64);

  new Chart(document.getElementById("FATestTotalSAScore"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total SA Score",
          data: totalScores,
          borderColor: "rgba(100, 149, 237, 0.8)", // Light Cornflower Blue
          backgroundColor: "rgba(173, 216, 230, 0.3)", // Light Blue
          fill: true,
        },
      ],
    },

    options: {
      width: 300,
      height: 900,
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { font: { size: 16 } },
        },
        x: {
          ticks: { font: { size: 16 } },
        },
      },
    },
  });
}

function generateAbruptPercentageChart(data) {
  const pastelColors = [
    "rgba(255, 150, 160, 0.8)", // Darker Pastel Pink
    "rgba(255, 200, 150, 0.8)", // Darker Pastel Orange
    "rgba(255, 245, 150, 0.8)", // Darker Pastel Yellow
    "rgba(150, 230, 170, 0.8)", // Darker Pastel Green
    "rgba(150, 200, 255, 0.8)", // Darker Pastel Blue
    "rgba(170, 170, 255, 0.8)", // Darker Pastel Purple
  ];

  const labels = data.map((session) =>
    new Date(session.session_date).toLocaleDateString()
  );

  const datasets = data[0].test_results.map((test, index) => ({
    label: test.test_name,
    data: data.map(
      (session) =>
        session.test_results.find((t) => t.test_id === test.test_id)
          .abrupt_percentage
    ),
    backgroundColor: pastelColors[index % pastelColors.length],
    borderColor: pastelColors[index % pastelColors.length].replace("0.7", "1"),
    borderWidth: 1,
  }));

  new Chart(document.getElementById("FATestAbruptPercentage"), {
    type: "bar",
    data: {
      labels,
      datasets,
      borderColor: "rgba(100, 149, 237, 0.8)", // Light Cornflower Blue
      backgroundColor: "rgba(173, 216, 230, 0.3)", // Light Blue
      fill: true,
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { font: { size: 16 } },
        },
        x: {
          ticks: { font: { size: 16 } },
        },
      },
    },
  });
}

// Generate FAT Fall Risk Level Gauge Charts
function generateFATGaugeCharts(data) {
  if (!data || data.length < 2) {
    console.warn("Not enough FAT test data for gauge charts.");
    return;
  }

  // Ensure we get the latest and second latest FAT results
  const latestFAT = data[data.length - 1];
  const secondLatestFAT = data[data.length - 2];

  if (!latestFAT || !secondLatestFAT) {
    console.warn("Missing FAT test data for gauge charts.");
    return;
  }

  // Calculate adjusted risk scores
  const latestRiskScore = 100 - calculateFATRiskScore(latestFAT).percentage;
  const secondLatestRiskScore =
    100 - calculateFATRiskScore(secondLatestFAT).percentage;

  // Determine risk levels
  const latestRiskLevel =
    latestRiskScore < 40 ? "Low" : latestRiskScore < 60 ? "Moderate" : "High";
  const secondLatestRiskLevel =
    secondLatestRiskScore < 40
      ? "Low"
      : secondLatestRiskScore < 60
      ? "Moderate"
      : "High";

  // Generate gauge charts with the new risk scores and levels
  createFATGaugeChart(
    "FATest-latest-test-risk",
    "Latest FAT Test Risk",
    latestRiskScore,
    latestRiskLevel
  );
  createFATGaugeChart(
    "FATest-second-latest-test-risk",
    "2nd Latest FAT Test Risk",
    secondLatestRiskScore,
    secondLatestRiskLevel
  );
}

// Create FAT Gauge Chart (Similar to FES)
function createFATGaugeChart(canvasId, title, value, level) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  // Define standard size for all charts
  const chartSize = 300;

  // Map risk level to colors
  const colorMapping = {
    Low: "rgba(134, 255, 148, 0.8)", // Green
    Moderate: "rgba(255, 234, 117, 0.8)", // Yellow
    High: "rgba(253, 82, 108, 0.8)", // Red
  };

  const color = colorMapping[level] || "rgba(200, 200, 200, 0.8)";

  // Generate the chart
  new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [value, 100 - value],
          backgroundColor: [color, "#E0E0E0"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      width: chartSize,
      height: chartSize,
      rotation: -90,
      circumference: 180,
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
  });

  // Add risk level text below the chart
  const chartContainer = document.getElementById(canvasId).parentElement;
  let riskLabel = document.getElementById(`${canvasId}-risk-label`);

  if (!riskLabel) {
    riskLabel = document.createElement("div");
    riskLabel.id = `${canvasId}-risk-label`;
    riskLabel.style.textAlign = "center";
    riskLabel.style.fontSize = "18px";
    riskLabel.style.fontWeight = "bold";
    riskLabel.style.marginTop = "10px";
    chartContainer.appendChild(riskLabel);
  }

  riskLabel.textContent = `${level.toUpperCase()} FALL RISK`;
}

// 📊 Calculate FAT Risk Score
function calculateFATRiskScore(session) {
  const totalScore = session.total_score.Int64;
  const percentage = (totalScore / 100) * 100;

  return {
    percentage: percentage,
    level: determineRiskLevel(percentage),
  };
}

function generateTotalScoreChart(data) {
  const labels = data.map((session) =>
    new Date(session.session_date).toLocaleDateString()
  );
  const totalScores = data.map((session) => session.total_score.Int64);

  new Chart(document.getElementById("FATestTotalScore"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total Score",
          data: totalScores,
          borderColor: "blue",
          fill: false,
        },
      ],
    },
    options: { responsive: true },
  });
}

function calculateScore(timeTaken, abruptPercentage, testName) {
  // Define test-specific tolerances
  const tolerances = {
    "Timed Up and Go Test": { timeTolerance: 20, abruptTolerance: 30 },
    "Five Times Sit to Stand Test": { timeTolerance: 25, abruptTolerance: 40 },
    "Dynamic Gait Index (DGI)": { timeTolerance: 25, abruptTolerance: 20 },
    "4 Stage Balance Test": { timeTolerance: 40, abruptTolerance: 15 },
  };

  // Default tolerance values
  const testTolerance = tolerances[testName] || {
    timeTolerance: 12,
    abruptTolerance: 50,
  };

  const { timeTolerance, abruptTolerance } = testTolerance;

  let timeScore = 0;

  // Scoring logic based on test type
  switch (testName) {
    case "Timed Up and Go Test":
    case "Five Times Sit to Stand Test":
    case "Dynamic Gait Index (DGI)":
      // Lower time is better; scale based on time tolerance
      timeScore =
        timeTaken <= timeTolerance
          ? 100
          : Math.max(
              0,
              100 - ((timeTaken - timeTolerance) / timeTolerance) * 100
            );
      break;

    case "4 Stage Balance Test":
      // Higher time is better; score decreases as timeTaken decreases
      timeScore =
        timeTaken <= 0 ? 0 : Math.round((timeTaken / timeTolerance) * 100);
      if (timeScore > 100) timeScore = 100;
      break;

    default:
      console.warn("Unknown test type:", testName);
      timeScore = 50; // Default score for unknown tests
  }

  // Calculate abrupt movement score
  const abruptScore =
    abruptPercentage <= abruptTolerance
      ? 100
      : Math.max(
          0,
          100 - ((abruptPercentage - abruptTolerance) / abruptTolerance) * 100
        );

  // Weighted average: 70% time, 30% abruptness
  const finalScore = Math.round(timeScore * 0.7 + abruptScore * 0.3);

  console.log({
    testName,
    timeTaken,
    abruptPercentage,
    timeScore,
    abruptScore,
    finalScore,
  });

  return finalScore;
}

function generateLatestTestBreakdown(session) {
  const canvas = document.getElementById("FATestLatestTestBreakdown");
  const ctxCanvas = canvas.getContext("2d");

  // Adjusted canvas size
  canvas.width = 1200;
  canvas.height = 500;

  const latestTestResults = session.test_results.map((test) => {
    const score = calculateScore(
      test.time_taken,
      test.abrupt_percentage,
      test.test_name
    );
    return {
      name: test.test_name,
      score: score,
      min: 0,
      max: 100,
      status: score >= 80 ? "Healthy" : score >= 50 ? "Moderate" : "Unhealthy",
    };
  });

  latestTestResults.reverse();

  function drawGradientBar(ctx, x, y, width, height, min, max, value, status) {
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, "red");
    gradient.addColorStop(0.5, "yellow");
    gradient.addColorStop(1, "green");

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    // Adjust arrow position based on the updated canvas size
    const arrowX = x + ((value - min) / (max - min)) * width;
    const arrowSize = Math.max(10, width * 0.005); // Make arrow size responsive

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(arrowX, y + height + arrowSize);
    ctx.lineTo(arrowX - arrowSize, y + height + 2 * arrowSize);
    ctx.lineTo(arrowX + arrowSize, y + height + 2 * arrowSize);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.textAlign = "left";
    ctx.fillText(`${value} (${status})`, x + width + 20, y + height - 5);
  }

  ctxCanvas.clearRect(0, 0, canvas.width, canvas.height);
  ctxCanvas.font = "16px Arial";
  ctxCanvas.fillStyle = "black";

  let yOffset = 50;
  const barWidth = 900;
  const barHeight = 30;
  const startX = 100;

  latestTestResults.forEach((test) => {
    ctxCanvas.textAlign = "left";
    ctxCanvas.fillText(test.name, startX, yOffset - 15);
    drawGradientBar(
      ctxCanvas,
      startX,
      yOffset,
      barWidth,
      barHeight,
      test.min,
      test.max,
      test.score,
      test.status
    );
    yOffset += 100; // Increased spacing for better readability
  });
}

function generateComparisonBarChart(data) {
  if (data.length < 2) {
    console.warn("Not enough test data for comparison chart.");
    return;
  }

  console.log("Sorted test results for comparison:", data);

  const latest = data[data.length - 1].test_results.reverse();
  const previous = data[data.length - 2].test_results.reverse();

  console.log("Latest test results:", latest);
  console.log("Previous test results:", previous);

  new Chart(document.getElementById("FATestComparisonBarChart"), {
    type: "bar",
    data: {
      labels: latest.map((t) => t.test_name),
      datasets: [
        {
          label: "Previous",
          data: previous.map((t) =>
            calculateScore(t.time_taken, t.abrupt_percentage, t.test_name)
          ),
          backgroundColor: "rgba(255,0,0,0.7)",
        },
        {
          label: "Latest",
          data: latest.map((t) =>
            calculateScore(t.time_taken, t.abrupt_percentage, t.test_name)
          ),
          backgroundColor: "rgba(0,0,255,0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { font: { size: 14 } },
        },
        x: {
          ticks: { font: { size: 14 } },
        },
      },
    },
  });
}

// Function to populate the FAT test dropdown
function populateFATestDropdown(allSessions) {
  const dropdown = document.getElementById("FATestDropdown");
  dropdown.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a Test";
  dropdown.appendChild(defaultOption);

  allSessions.forEach((test, index) => {
    const testNumber = index + 1;
    const dateObj = new Date(test.session_date);
    const formattedDate = dateObj.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const formattedTime = dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const option = document.createElement("option");
    option.value = index;
    option.textContent = `Test ${testNumber} - ${formattedDate}, ${formattedTime}`;
    dropdown.appendChild(option);
  });

  // Select the latest test by default
  if (allSessions.length > 0) {
    dropdown.value = allSessions.length - 1;
    updateLatestTestBreakdown(allSessions, allSessions.length - 1);
  }

  dropdown.addEventListener("change", function () {
    if (this.value !== "") {
      updateLatestTestBreakdown(allSessions, this.value);
    }
  });
}

// Update the performance breakdown when a new test is selected
function updateLatestTestBreakdown(allSessions, selectedIndex) {
  const selectedTest = allSessions[selectedIndex];

  document.getElementById(
    "FATestPerformanceBreakdownTitle"
  ).textContent = `Test ${parseInt(selectedIndex) + 1} Performance Breakdown`;

  generateLatestTestBreakdown(selectedTest);
}
