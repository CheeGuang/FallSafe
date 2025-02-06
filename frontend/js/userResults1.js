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
        `http://127.0.0.1:5100/api/v1/user/getAUserFESResults?user_id=${user_id}`
      ),
      fetchData(
        `http://127.0.0.1:5100/api/v1/user/getAUserTestResults?user_id=${user_id}`
      ),
    ]);

    if (!fesResults || !testResults) {
      alert("Error fetching data");
      return;
    }

    displayActionableInsights(
      fesResults.actionable_insights.response,
      testResults.actionable_insights.response
    );
    const overallRisk = calculateOverallRisk(
      fesResults.fes_results,
      testResults.self_assessment_results
    );
    displayRiskResult(overallRisk);
    generateCharts(fesResults.fes_results);

    populateDropdown(fesResults.fes_results);
    updateCharts(fesResults.fes_results, fesResults.fes_results.length - 1);
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

  document.getElementById("actionable-insights").innerHTML = `
    <h3>FES Recommendations:</h3><p>${formatText(fesInsights)}</p><br>
    <h3>Self-Assessment Recommendations:</h3><p>${formatText(testInsights)}</p>
  `;

  console.log(formatText(fesInsights));
  console.log(formatText(testInsights));
}

function calculateOverallRisk(fesResults, testResults) {
  const latestFES = fesResults.reduce(
    (prev, curr) =>
      new Date(prev.response_date) > new Date(curr.response_date) ? prev : curr,
    fesResults[0]
  );
  const latestTest = testResults.reduce(
    (prev, curr) =>
      new Date(prev.test_date) > new Date(curr.test_date) ? prev : curr,
    testResults[0]
  );

  const fesScore = latestFES.total_score / 100;
  const testRiskScore = getRiskScore(latestTest.risk_level);

  const overallRiskPercentage = ((fesScore + testRiskScore) / 2) * 100;
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
    "fes-average-score",
    "Average FES Score Per Question Over Time",
    labels,
    averageScores
  );

  createCategorizedBarChart(
    "fes-latest-question-scores",
    "Question Scores in Latest Test",
    questionLabels,
    questionScores
  );

  // New muscle group chart
  generateMuscleGroupChart(fesResults);
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
      responsive: true,
      scales: {
        y: {
          min: 16,
          max: 64,
        },
      },
      plugins: {
        title: {
          display: true,
          text: title,
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

  dropdown.addEventListener("change", function () {
    updateCharts(fesResults, this.value);
  });
}

function updateCharts(fesResults, selectedIndex) {
  const selectedTest = fesResults[selectedIndex];
  const questionScores = selectedTest.response_details.map(
    (q) => q.response_score
  );
  const questionLabels = Array.from({ length: 16 }, (_, i) => `Q${i + 1}`);

  const muscleGroups = {
    "Lower Body": [6, 7, 8, 11, 13, 14, 15],
    Core: [1, 3, 9, 10],
    "Upper Body": [2, 4, 5, 9],
    "Full-Body Coordination": [12, 16],
  };

  const muscleGroupScores = {};
  Object.keys(muscleGroups).forEach((group) => {
    const scores = muscleGroups[group].map(
      (qIndex) => selectedTest.response_details[qIndex - 1].response_score || 0
    );
    muscleGroupScores[group] =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
  });

  const muscleLabels = Object.keys(muscleGroupScores);
  const muscleData = Object.values(muscleGroupScores);

  // Get the new test numbering
  const testNumber = parseInt(selectedIndex) + 1;

  createCategorizedBarChart(
    "fes-latest-question-scores",
    `Question Scores in Test ${testNumber}`,
    questionLabels,
    questionScores
  );

  createCategorizedBarChart(
    "fes-muscle-group-scores",
    `Average Score per Muscle Group in Test ${testNumber}`,
    muscleLabels,
    muscleData
  );
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
    if (value <= 1) return "rgba(134, 255, 148, 0.8)"; // Light Green
    if (value <= 2) return "rgba(128, 174, 255, 0.8)"; // Light Blue
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
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 20 },
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
}
function generateMuscleGroupChart(fesResults) {
  // Define muscle groups and the corresponding question indices
  const muscleGroups = {
    "Lower Body": [6, 7, 8, 11, 13, 14, 15],
    Core: [1, 3, 9, 10],
    "Upper Body": [2, 4, 5, 9],
    "Full-Body Coordination": [12, 16],
  };

  // Calculate average scores for each muscle group
  const muscleGroupScores = {};
  Object.keys(muscleGroups).forEach((group) => {
    const questions = muscleGroups[group];
    const scores = questions.map((qIndex) => {
      return (
        fesResults[fesResults.length - 1].response_details[qIndex - 1]
          .response_score || 0
      );
    });

    const avgScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    muscleGroupScores[group] = avgScore;
  });

  // Extract labels and values
  const labels = Object.keys(muscleGroupScores);
  const data = Object.values(muscleGroupScores);

  // Create muscle group bar chart
  createCategorizedBarChart(
    "fes-muscle-group-scores",
    "Average Score per Muscle Group",
    labels,
    data
  );
}
