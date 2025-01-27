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
    const userName = decodedToken.name || "User";

    // Update the title dynamically with the user's name
    document.getElementById("userResultsTitle").innerText = `Here are your results, ${userName}:`;
    document.getElementById("historyTitle").innerText = `Test History for ${userName}`;

    if (decodedToken.exp < Math.floor(Date.now() / 1000)) {
      showCustomAlert("Your session has expired. Please log in again.");
      localStorage.removeItem("token");
      window.location.href = "./login.html";
      return;
    }

    // Fetch user test results and FES results using the extracted userID
    fetchTestResults(decodedToken.user_id);
    fetchFESResults(decodedToken.user_id);
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

  // Function to fetch user test results for self assessment
  function fetchTestResults(userID) {
    fetch(`http://127.0.0.1:5100/api/v1/user/getAUserTestResults?user_id=${userID}`, {
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
        calculateFallRisk(data);
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
        aggregatedResults[result.test_name] = {
          totalTime: 0,
          totalAbrupt: 0,
          count: 0
        };
      }
      aggregatedResults[result.test_name].totalTime += result.time_taken;
      aggregatedResults[result.test_name].totalAbrupt += result.abrupt_percentage;
      aggregatedResults[result.test_name].count++;
    });

    // Convert aggregated results into an array of averages
    return Object.keys(aggregatedResults).map(testName => {
      const { totalTime, totalAbrupt, count } = aggregatedResults[testName];
      return {
        test_name: testName,
        avgTime: (totalTime / count).toFixed(2),
        avgAbrupt: (totalAbrupt / count).toFixed(2),
      };
    });
  }

  function calculateFallRisk(results) {
    if (!results.length) {
      document.getElementById("fallRisk").innerHTML = "<p>No data available to calculate fall risk.</p>";
      return;
    }
  
    // Risk level mapping from string to numeric values
    const riskLevelMapping = {
      low: 10,
      moderate: 30,
      high: 60
    };
  
    // Filter and map risk levels to numeric values
    const validResults = results.filter(result => {
      const risk = result.risk_level.toLowerCase();  // Convert to lowercase for consistency
      return riskLevelMapping[risk] !== undefined; // Only keep valid risk levels
    }).map(result => {
      const risk = result.risk_level.toLowerCase();
      return riskLevelMapping[risk];  // Map to numeric value
    });
  
    if (validResults.length === 0) {
      document.getElementById("fallRisk").innerHTML = "<p>No valid data to calculate fall risk.</p>";
      return;
    }
  
    // Calculate the average risk
    const totalRisk = validResults.reduce((sum, risk) => sum + risk, 0);
    const avgRisk = totalRisk / validResults.length;
  
    // Categorize the average risk level
    let riskCategory;
    if (avgRisk < 20) {
      riskCategory = "Low Risk";
    } else if (avgRisk < 50) {
      riskCategory = "Moderate Risk";
    } else {
      riskCategory = "High Risk";
    }
  
    // Display the result
    document.getElementById("fallRisk").innerHTML = `
      <p><strong>Average Fall Risk Level:</strong> ${riskCategory} (${avgRisk.toFixed(2)})</p>
    `;
  }
  
  function renderCharts(results) {
    if (!results || results.length === 0) {
      console.warn("No data available for chart.");
      return;
    }
  
    const testNames = results.map(result => result.test_name);
    const avgTimes = results.map(result => result.avgTime);
    const avgAbrupt = results.map(result => result.avgAbrupt);
  
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            font: { size: 18 }
          }
        },
        tooltip: {
          bodyFont: { size: 16 }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 16 } }
        },
        y: {
          ticks: { font: { size: 16 } }
        }
      }
    };
  
    // Bar Chart with specific options
    const barChartOptions = {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          title: {
            display: true,
            text: "Time (seconds)",
            font: { size: 16 }
          },
          beginAtZero: true, // Ensures that y-axis starts at 0
        }
      }
    };
  
    new Chart(document.getElementById("barChart").getContext("2d"), {
      type: "bar",
      data: {
        labels: testNames,
        datasets: [
          {
            label: "Avg Time Taken (seconds)",
            data: avgTimes,
            backgroundColor: "rgba(54, 162, 235, 0.6)", // Changed color for visibility
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
            barThickness: 35, // Increased bar thickness
          }
        ]
      },
      options: barChartOptions
    });
  
    // Set title for Bar Chart
    document.getElementById("barChartTitle").innerText = "Average Time Taken for Each Test (seconds)";
  
    // Radar Chart
    new Chart(document.getElementById("radarChart").getContext("2d"), {
      type: "radar",
      data: {
        labels: testNames,
        datasets: [
          {
            label: "Avg Abrupt Percentage",
            data: avgAbrupt,
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              font: { size: 18 }
            }
          },
          tooltip: {
            enabled: true,
            bodyFont: { size: 16 },
            callbacks: {
              label: function(tooltipItem) {
                const value = tooltipItem.raw;
                return `${tooltipItem.label}: ${value}%`;
              }
            }
          }
        },
        scales: {
          r: {
            ticks: { font: { size: 16 } },
            beginAtZero: true
          }
        },
        elements: {
          point: {
            radius: 5, // Makes points more visible
            hoverRadius: 7 // Increases the radius when hovered
          }
        }
      }
    });
  
    // Set title for Radar Chart
    document.getElementById("radarChartTitle").innerText = "Average Abrupt Percentage for Each Test";
  
    // Line Chart
    new Chart(document.getElementById("lineChart").getContext("2d"), {
      type: "line",
      data: {
        labels: testNames,
        datasets: [
          {
            label: "Avg Time Taken",
            data: avgTimes,
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderWidth: 2,
            fill: false,
            tension: 0.3 // Smooth the line slightly
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              font: { size: 18 }
            }
          },
          tooltip: {
            bodyFont: { size: 16 }
          }
        },
        scales: {
          x: {
            grid: {
              display: true
            },
            ticks: { font: { size: 16 } }
          },
          y: {
            grid: {
              display: true
            },
            ticks: { font: { size: 16 } }
          }
        },
        elements: {
          point: {
            radius: 5, // Makes points more visible
            hoverRadius: 7
          }
        }
      }
    });
  
    // Set title for Line Chart
    document.getElementById("lineChartTitle").innerText = "Average Time Taken Over Tests";
  
    // Distribution Chart (Pie Chart)
    const distributionChartOptions = {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        tooltip: {
          ...chartOptions.plugins.tooltip,
          callbacks: {
            label: function(tooltipItem) {
              const value = tooltipItem.raw;
              return ` ${tooltipItem.label}: ${value}%`; // Show value in tooltip
            }
          }
        }
      }
    };

    new Chart(document.getElementById("distributionChart").getContext("2d"), {
      type: "pie",
      data: {
        labels: testNames,
        datasets: [
          {
            data: avgAbrupt,
            backgroundColor: [
              "#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40"
            ], // Use more distinct colors
            borderWidth: 0, // Remove borders between slices
          }
        ]
      },
      options: distributionChartOptions
    });
  
    // Set title for Distribution Chart
    document.getElementById("distributionChartTitle").innerText = "Test Abrupt Percentage Distribution";
  }

  // FES data
  function fetchFESResults(userID) {
    fetch(`http://127.0.0.1:5100/api/v1/user/getAUserFESResults?user_id=${userID}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to fetch FES results");
        }
        return response.json();
      })
      .then(data => {
        if (data.length > 0) {
          processFESResults(data);
          populateFESTable(data);  // Populate the FES table
        } else {
          document.getElementById("fesChartContainer").innerHTML = "<p>No FES data available.</p>";
        }
      })
      .catch(error => console.error("Error fetching FES results:", error));
  }

  function processFESResults(fesResults) {
    fesResults.sort((a, b) => new Date(a.response_date) - new Date(b.response_date));

    const labels = fesResults.map(result => {
      const dateObj = new Date(result.response_date);
      return dateObj.toLocaleDateString('en-GB');  // 'en-GB' uses DD/MM/YYYY format
    });
    const scores = fesResults.map(result => result.total_score);
    
    // Calculate risk level from total_score
    const riskLevels = scores.map(score => {
      if (score <= 20) return "High Risk";
      if (score <= 40) return "Moderate Risk";
      return "Low Risk";
    });

    document.getElementById("fesRiskLevel").innerHTML = `
      <p><strong>Latest Fall Risk Level:</strong> ${riskLevels[riskLevels.length - 1]} (Score: ${scores[scores.length - 1]})</p>
    `;

    renderFESChart(labels, scores);
  }

  function renderFESChart(labels, scores) {
    const ctx = document.getElementById("fesChart").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "FES Total Score",
          data: scores,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderWidth: 2,
          fill: false,
          tension: 0.3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { size: 18 } } },
          tooltip: { bodyFont: { size: 16 } },
        },
        scales: {
          x: { ticks: { font: { size: 16 } } },
          y: { 
            ticks: { font: { size: 16 } },
            title: { display: true, text: "FES Score", font: { size: 16 } },
            beginAtZero: true,
            suggestedMax: 100,
          }
        },
        elements: {
          point: { radius: 5, hoverRadius: 7 }
        }
      }
    });

    document.getElementById("fesChartTitle").innerText = "Falls Efficacy Scale (FES) Score Over Time";
  }
  
  function formatDateWithTimeZone(date) {
    // Convert the input date to a Date object if it is a string
    const dateObj = new Date(date);
    
    // Get the time zone offset in minutes
    const timeZoneOffset = dateObj.getTimezoneOffset(); // Returns offset in minutes, e.g., -480 for GMT+8
    
    // Calculate the sign of the offset
    const sign = timeZoneOffset > 0 ? "-" : "+";
    
    // Convert offset to hours and minutes (e.g., -480 minutes = GMT+8)
    const offsetHours = Math.floor(Math.abs(timeZoneOffset) / 60);
    const offsetMinutes = Math.abs(timeZoneOffset) % 60;
    
    // Format the time zone as GMT+8, GMT-5, etc.
    const timeZoneName = `GMT${sign}${String(offsetHours).padStart(2, '0')}${String(offsetMinutes).padStart(2, '0')}`;
  
    // Format the date and time as e.g. '25/07/2024, 08:00 AM (GMT+8)'
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj);
  
    return `${formattedDate} (${timeZoneName})`;
  }

  function displayDetailedData(results) {
    const detailedDataContainer = document.getElementById("detailedData");
  
    if (!results || results.length === 0) {
      detailedDataContainer.innerHTML = "<tr><td colspan='5'>No data available.</td></tr>";
      return;
    }
  
    // Sort results by date (latest first)
    results.sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
  
    detailedDataContainer.innerHTML = results.map((result, index) => {
      const formattedDate = formatDateWithTimeZone(result.test_date); // Use the formatDateWithTimeZone function here
  
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${result.test_name}</td>
          <td>${result.time_taken} sec</td>
          <td>${result.abrupt_percentage}%</td>
          <td>${result.risk_level}</td>
          <td>${formattedDate}</td>
        </tr>
      `;
    }).join("");
  }

  function populateFESTable(fesResults) {
    const tableBody = document.getElementById("fesTableBody");
    tableBody.innerHTML = ""; // Clear existing data
  
    // Sort results by date (latest first)
    fesResults.sort((a, b) => new Date(b.response_date) - new Date(a.response_date));
  
    fesResults.forEach((result, index) => {
      const formattedDate = formatDateWithTimeZone(result.response_date);
      const riskLevel =
        result.total_score <= 20
          ? "High Risk"
          : result.total_score <= 40
          ? "Moderate Risk"
          : "Low Risk";
  
      const row = `
        <tr>
          <td>${index + 1}</td>
          <td>Falls Efficacy Scale (FES)</td>
          <td>${result.total_score}</td>
          <td>${riskLevel}</td>
          <td>${formattedDate}</td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
  }

  document.getElementById("toggleDataView").addEventListener("click", function () {
    const dataTableContainer = document.getElementById("dataTableContainer");
    dataTableContainer.style.display = dataTableContainer.style.display === "none" ? "block" : "none";
    this.innerText = dataTableContainer.style.display === "none" ? "Show All Data" : "Hide All Data";
  });
});