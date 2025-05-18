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
    const [fesResults, testResults] = await Promise.all([
      fetchData(
        `http://47.129.56.155:5100/api/v1/user/getAUserFESResults?user_id=${user_id}`
      ),
      fetchData(
        `http://47.129.56.155:5100/api/v1/user/getAUserTestResults?user_id=${user_id}`
      ),
    ]);

    if (!fesResults || !testResults) {
      alert("Error fetching data");
      return;
    }

    $(".nav-link").click(function (e) {
      e.preventDefault();
      $(".nav-link").removeClass("active");
      $(this).addClass("active");
      $(".tab-pane").removeClass("show active");
      $($(this).attr("href")).addClass("show active");
    });

    displayActionableInsights(
      fesResults.actionable_insights.response,
      testResults.actionable_insights.response
    );
    const overallRisk = calculateOverallRisk(
      fesResults.fes_results,
      testResults.self_assessment_results
    );

    console.log("testResults:", testResults);

    displayRiskResult(overallRisk);
    generateCharts(fesResults.fes_results);
    generateGaugeCharts(fesResults.fes_results);
    populateDropdown(fesResults.fes_results);
    updateCharts(fesResults.fes_results, fesResults.fes_results.length - 1);
    updateMuscleStrengthChart(
      fesResults.fes_results,
      fesResults.fes_results.length - 1
    );

    const allSessions = testResults.self_assessment_results.sort(
      (a, b) => new Date(b.session_date) - new Date(a.session_date)
    );

    populateFATestDropdown(allSessions); // Populate the new dropdown

    if (allSessions.length > 0) {
      updateLatestTestBreakdown(allSessions, 0); // Default to the latest test
    }

    generateSATotalScoreChart(allSessions);
    generateAbruptPercentageChart(allSessions);
    generateFATGaugeCharts(allSessions);
    generateTotalScoreChart(allSessions);
    generateComparisonBarChart(testResults.self_assessment_results);
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

function displayActionableInsights(fesInsights, testInsights) {
  const formatText = (text) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold formatting
      .replace(/^[\s\S]*?1\)/, "1)") // Remove everything before "1)"
      .replace(/\n/g, "") // Remove all newlines
      .replace(/(?<!<br>\s*)\b([2-9]|[1-9][0-9]+)\)/g, "<br>$1)"); // Add <br> if missing before numbers 2+)

  document.getElementById("actionable-insights-content").innerHTML = `
    <h3>FES Recommendations:</h3><p>${formatText(fesInsights)}</p><br>
    <h3>Self-Assessment Recommendations:</h3><p>${formatText(testInsights)}</p>
  `;

  console.log(formatText(fesInsights));
  console.log(formatText(testInsights));
}

function calculateOverallRisk(fesResults, testResults) {
  if (!fesResults.length || !testResults.length) {
    console.warn("Insufficient data for risk calculation.");
    return { percentage: 0, level: "low" };
  }

  // Get the latest FES result based on response date
  const latestFES = fesResults.reduce((prev, curr) =>
    new Date(prev.response_date) > new Date(curr.response_date) ? prev : curr
  );

  // Get the latest Test result based on test date
  const latestTest = testResults.reduce((prev, curr) =>
    new Date(prev.test_date) > new Date(curr.test_date) ? prev : curr
  );

  // Normalize FES Score to percentage
  const fesScore = ((latestFES.total_score - 16) / 64) * 100;

  // Convert risk level into a score
  const testRiskScore = latestTest.total_score.Int64; // Convert to percentage

  // Calculate overall risk percentage (weighted average)
  const overallRiskPercentage = (fesScore + testRiskScore) / 2;

  getRiskScore(overallRiskPercentage);
  return {
    percentage: overallRiskPercentage,
    level: determineRiskLevel(overallRiskPercentage),
  };
}

function getRiskScore(riskLevel) {
  const riskMapping = { low: 0.2, moderate: 0.5, high: 0.8 };
  return riskMapping[riskLevel] || 0;
}

function determineRiskLevel(percentage) {
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

function generateCharts(fesResults) {
  const labels = fesResults.map((res) =>
    new Date(res.response_date).toLocaleDateString()
  );
  const totalScores = fesResults.map((res) => res.total_score);
  const averageScores = fesResults.map(
    (res) =>
      res.response_details.reduce((sum, q) => sum + q.response_score, 0) /
      res.response_details.length
  );

  const questionScores = fesResults[fesResults.length - 1].response_details.map(
    (q) => q.response_score
  );
  const questionLabels = Array.from({ length: 16 }, (_, i) => `Q${i + 1}`);

  createLineChart(
    "fes-total-score",
    "Total FES Score Over Time",
    labels,
    totalScores,
    "Total Score"
  );

  createCategorizedBarChart(
    "fes-latest-question-scores",
    "Question Scores in Latest Test",
    questionLabels,
    questionScores
  );
}

function createLineChart(canvasId, title, labels, data, label) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: label,
          data: data,
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
          min: 16,
          max: 64,
          ticks: { font: { size: 16 } },
        },
        x: {
          ticks: { font: { size: 16 } },
        },
      },
    },
  });
}

function populateDropdown(fesResults) {
  const dropdown = document.getElementById("testDropdown");
  dropdown.innerHTML = "";

  // Sort tests by date (oldest first)
  fesResults.sort(
    (a, b) => new Date(a.response_date) - new Date(b.response_date)
  );

  // Create "Select a Test" option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a Test";
  dropdown.appendChild(defaultOption);

  // Add test options
  fesResults.forEach((test, index) => {
    const testNumber = index + 1; // Oldest test is Test 1, increments
    const dateObj = new Date(test.response_date);

    // Format date as "DDDD MMMM YYYY" and time as "h:mm a"
    const formattedDate = dateObj.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const formattedTime = dateObj
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase(); // Ensures "am/pm" is lowercase

    const option = document.createElement("option");
    option.value = index;
    option.textContent = `Test ${testNumber} - ${formattedDate}, ${formattedTime}`;
    dropdown.appendChild(option);
  });

  // Automatically select the latest test if available
  if (fesResults.length > 0) {
    dropdown.value = fesResults.length - 1;
    updateCharts(fesResults, fesResults.length - 1);
  }

  dropdown.addEventListener("change", function () {
    if (this.value !== "") {
      updateCharts(fesResults, this.value);
    }
  });
}

function updateCharts(fesResults, selectedIndex) {
  const selectedTest = fesResults[selectedIndex];
  const questionScores = selectedTest.response_details.map(
    (q) => q.response_score
  );
  const questionLabels = Array.from({ length: 16 }, (_, i) => `Q${i + 1}`);

  const muscleGroups = {
    Legs: [7, 8, 11, 13, 14, 15],
    Glutes: [6],
    Arms: [9, 10, 1, 2, 3],
    Shoulders: [4],
    Core: [5, 12, 16],
  };

  const muscleGroupScores = {};
  Object.keys(muscleGroups).forEach((group) => {
    const scores = muscleGroups[group].map(
      (qIndex) =>
        selectedTest.response_details.find((q) => q.question_id === qIndex)
          ?.response_score || 0
    );
    muscleGroupScores[group] =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
  });

  // Get the new test numbering
  const testNumber = parseInt(selectedIndex) + 1;

  createCategorizedBarChart(
    "fes-latest-question-scores",
    `Question Scores in Test ${testNumber}`,
    questionLabels,
    questionScores
  );

  // Update Muscle Strength Chart based on latest selected test
  updateMuscleStrengthChart(selectedTest);
}

function createCategorizedBarChart(canvasId, title, labels, data) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  // Destroy the existing chart before creating a new one
  if (canvasId === "fes-latest-question-scores" && latestQuestionChart) {
    latestQuestionChart.destroy();
  }
  if (canvasId === "fes-muscle-group-scores" && muscleGroupChart) {
    muscleGroupChart.destroy();
  }

  const colors = data.map((value) => {
    if (value <= 2) return "rgba(134, 255, 148, 0.8)"; // Light Blue
    if (value <= 3) return "rgba(255, 234, 117, 0.8)"; // Peach
    return "rgba(253, 82, 108, 0.8)"; // Light Pink
  });

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Score",
          data: data,
          backgroundColor: colors,
          borderColor: "rgba(200, 200, 200, 0.5)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 4,
          ticks: { font: { size: 16 } },
        },
        x: {
          ticks: { font: { size: 16 } },
        },
      },
    },
  });

  // Store the chart instance globally
  if (canvasId === "fes-latest-question-scores") {
    latestQuestionChart = chart;
  }
  if (canvasId === "fes-muscle-group-scores") {
    muscleGroupChart = chart;
  }

  document.getElementById("question-socres-in-title").textContent = title;
}

function fesCalculateOverallRisk(fesResults) {
  if (!fesResults || fesResults.length === 0) {
    console.warn("Insufficient data for risk calculation.");
    return { percentage: 0, level: "low" };
  }

  // Get the latest FES result based on response date
  const latestFES = fesResults.reduce((prev, curr) =>
    new Date(prev.response_date) > new Date(curr.response_date) ? prev : curr
  );

  // Normalize FES Score to percentage
  const fesScore = ((latestFES.total_score - 16) / 64) * 100;

  return {
    percentage: fesScore,
    level: fesDetermineRiskLevel(fesScore),
  };
}

function fesDetermineRiskLevel(percentage) {
  if (percentage < 30) return "low";
  if (percentage < 60) return "moderate";
  return "high";
}

function generateGaugeCharts(fesResults) {
  if (!fesResults || fesResults.length < 2) {
    console.warn("Not enough FES test data for gauge charts.");
    return;
  }

  // Ensure we get the latest and second latest FES results
  const latestFES = fesResults[fesResults.length - 1];
  const secondLatestFES = fesResults[fesResults.length - 2];

  if (!latestFES || !secondLatestFES) {
    console.warn("Missing FES test data for gauge charts.");
    return;
  }

  // Calculate risk scores and log results
  const latestRisk = fesCalculateOverallRisk([latestFES]);
  const secondLatestRisk = fesCalculateOverallRisk([secondLatestFES]);

  // Generate gauge charts
  createGaugeChart(
    "fes-latest-test-risk",
    "Latest Test Risk",
    latestRisk.percentage,
    latestRisk.level
  );
  createGaugeChart(
    "fes-second-latest-test-risk",
    "2nd Latest Test Risk",
    secondLatestRisk.percentage,
    secondLatestRisk.level
  );
}

function createGaugeChart(canvasId, title, value, level) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  // Define standard size for all charts
  const chartSize = 300; // Ensures uniformity

  // Map risk level to colors
  const colorMapping = {
    low: "rgba(134, 255, 148, 0.8)", // Green
    moderate: "rgba(255, 234, 117, 0.8)", // Yellow
    high: "rgba(253, 82, 108, 0.8)", // Red
  };

  const color = colorMapping[level] || "rgba(200, 200, 200, 0.8)";

  // Generate the chart
  new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [value, 100 - value],
          backgroundColor: [color, "#E0E0E0"], // Main color + grey
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: false, // Fixed size
      maintainAspectRatio: false, // Prevents distortion
      width: chartSize,
      height: chartSize,
      rotation: -90, // Starts from bottom
      circumference: 180, // Half-circle (180 degrees)
      cutout: "70%", // Adjusts thickness of the gauge
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

function updateMuscleStrengthChart(selectedTest) {
  if (!selectedTest || !selectedTest.response_details) {
    console.error("Invalid test data provided:", selectedTest);
    return;
  }

  const muscleGroups = {
    Legs: [7, 8, 11, 13, 14, 15],
    Glutes: [6],
    Arms: [9, 10, 1, 2, 3],
    Shoulders: [4],
    Core: [5, 12, 16],
  };

  const muscleLabels = document.getElementById("muscle-strength-labels");
  muscleLabels.innerHTML = "";

  Object.keys(muscleGroups).forEach((group) => {
    const indices = muscleGroups[group];

    const scores = selectedTest.response_details
      .filter((q) => indices.includes(q.question_id))
      .map((q) => q.response_score);

    const totalScore = scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;
    const weakStrong = totalScore > 2 ? "Weak" : "Strong";
    const color = totalScore > 2 ? "text-danger" : "text-success";

    const positionMap = {
      Legs: { top: "78%", left: "50%" },
      Glutes: { top: "56%", left: "50%" },
      Arms: { top: "50%", left: "74%" },
      Shoulders: { top: "28%", left: "50%" },
      Core: { top: "43%", left: "50%" },
    };

    const pos = positionMap[group];
    if (pos) {
      const div = document.createElement("div");
      div.className = `muscle-status position-absolute ${color} text-center`;
      div.style.top = pos.top;
      div.style.left = pos.left;
      div.style.transform = "translate(-50%, -50%)"; // Center the element
      div.style.fontWeight = "bold";
      div.style.fontSize = "24px";

      // Create a span for strength label (Weak/Strong)
      const strengthSpan = document.createElement("span");
      strengthSpan.textContent = weakStrong;

      // Create a div for group name
      const groupSpan = document.createElement("div");
      groupSpan.textContent = group;
      groupSpan.style.fontSize = "16px";
      groupSpan.style.fontWeight = "normal";

      // Append both elements inside the div
      div.appendChild(strengthSpan);
      div.appendChild(groupSpan);
      muscleLabels.appendChild(div);
    }
  });
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

// 🎨 Utility Function for Risk Level Determination
function determineRiskLevel(percentage) {
  if (percentage < 30) return "low";
  if (percentage < 60) return "moderate";
  return "high";
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

// Function to generate the latest test performance breakdown chart
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
