let latestQuestionChart = null;

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("User not authenticated");
    return;
  }

  try {
    const user_id = decodeToken(token).user_id;
    const [fesResults] = await Promise.all([
      fetchData(
        `http://47.129.56.155:5100/api/v1/user/getAUserFESResults?user_id=${user_id}`
      ),
    ]);

    if (!fesResults) {
      alert("Error fetching data");
      return;
    }

    // Calculate risk from fesResults.fes_results
    const riskResult = fesCalculateOverallRisk(fesResults.fes_results);
    displayRiskResult(riskResult);

    generateCharts(fesResults.fes_results);
    generateGaugeCharts(fesResults.fes_results);
    populateDropdown(fesResults.fes_results);
    updateCharts(fesResults.fes_results, fesResults.fes_results.length - 1);
    updateMuscleStrengthChart(
      fesResults.fes_results[fesResults.fes_results.length - 1]
    );
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
          borderColor: "rgba(100, 149, 237, 0.8)",
          backgroundColor: "rgba(173, 216, 230, 0.3)",
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
  if (!dropdown) {
    console.warn("Dropdown element not found");
    return;
  }

  dropdown.innerHTML = "";

  fesResults.sort(
    (a, b) => new Date(a.response_date) - new Date(b.response_date)
  );

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a Test";
  dropdown.appendChild(defaultOption);

  fesResults.forEach((test, index) => {
    const testNumber = index + 1;
    const dateObj = new Date(test.response_date);

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
      .toLowerCase();

    const option = document.createElement("option");
    option.value = index;
    option.textContent = `Test ${testNumber} - ${formattedDate}, ${formattedTime}`;
    dropdown.appendChild(option);
  });

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

  const testNumber = parseInt(selectedIndex) + 1;

  createCategorizedBarChart(
    "fes-latest-question-scores",
    `Question Scores in Test ${testNumber}`,
    questionLabels,
    questionScores
  );

  updateMuscleStrengthChart(selectedTest);
}

function createCategorizedBarChart(canvasId, title, labels, data) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  if (canvasId === "fes-latest-question-scores" && latestQuestionChart) {
    latestQuestionChart.destroy();
  }

  const colors = data.map((value) => {
    if (value <= 2) return "rgba(134, 255, 148, 0.8)";
    if (value <= 3) return "rgba(255, 234, 117, 0.8)";
    return "rgba(253, 82, 108, 0.8)";
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

  if (canvasId === "fes-latest-question-scores") {
    latestQuestionChart = chart;
  }

  const titleElement = document.getElementById("question-socres-in-title");
  if (titleElement) {
    titleElement.textContent = title;
  }
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

  const latestFES = fesResults[fesResults.length - 1];
  const secondLatestFES = fesResults[fesResults.length - 2];

  if (!latestFES || !secondLatestFES) {
    console.warn("Missing FES test data for gauge charts.");
    return;
  }

  const latestRisk = fesCalculateOverallRisk([latestFES]);
  const secondLatestRisk = fesCalculateOverallRisk([secondLatestFES]);

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
  const chartSize = 300;

  const colorMapping = {
    low: "rgba(134, 255, 148, 0.8)",
    moderate: "rgba(255, 234, 117, 0.8)",
    high: "rgba(253, 82, 108, 0.8)",
  };

  const color = colorMapping[level] || "rgba(200, 200, 200, 0.8)";

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

function fesCalculateOverallRisk(fesResults) {
  if (!fesResults || fesResults.length === 0) {
    console.warn("Insufficient data for risk calculation.");
    return { percentage: 0, level: "low" };
  }

  const latestFES = fesResults.reduce((prev, curr) =>
    new Date(prev.response_date) > new Date(curr.response_date) ? prev : curr
  );

  const fesScore = ((latestFES.total_score - 16) / 64) * 100;

  return {
    percentage: fesScore,
    level: fesDetermineRiskLevel(fesScore),
  };
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
  if (!muscleLabels) {
    console.warn("Muscle labels element not found");
    return;
  }

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
      Glutes: { top: "58%", left: "50%" },
      Arms: { top: "52%", left: "74%" },
      Shoulders: { top: "30%", left: "50%" },
      Core: { top: "43%", left: "50%" },
    };

    const pos = positionMap[group];
    if (pos) {
      const div = document.createElement("div");
      div.className = `muscle-status position-absolute ${color} text-center`;
      div.style.top = pos.top;
      div.style.left = pos.left;
      div.style.transform = "translate(-50%, -50%)";
      div.style.fontWeight = "bold";
      div.style.fontSize = "24px";

      const strengthSpan = document.createElement("span");
      strengthSpan.textContent = weakStrong;

      const groupSpan = document.createElement("div");
      groupSpan.textContent = group;
      groupSpan.style.fontSize = "16px";
      groupSpan.style.fontWeight = "normal";

      div.appendChild(strengthSpan);
      div.appendChild(groupSpan);
      muscleLabels.appendChild(div);
    }
  });
}
