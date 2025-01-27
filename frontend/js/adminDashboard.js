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
    userResponseDetails: []  //array to store the response details
};

/*let UserIndividualResponse = [
    { response_id: 17, question_id: 1, response_score: 3 },
    { response_id: 17, question_id: 2, response_score: 3 },
];*/

// Function to fetch users from API
async function fetchUsersFromAPI() {
    try {
        console.log(token);
        const response = await fetch('http://localhost:5200/api/v1/admin/getAllElderlyUser', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`Error: ${errorDetails || 'Failed to fetch users'}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching users:', error.message);
        showCustomAlert("Error fetching user's list");
        throw error;
    }
}

// Function to fetch user responses from API
async function fetchUserResponseFromAPI() {
    try {
        const response = await fetch('http://localhost:5200/api/v1/admin/getAllElderlyFESResponse', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`Error: ${errorDetails || 'Failed to fetch user responses'}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching user responses:', error.message);
        showCustomAlert("Error fetching userResponse's list");
        throw error;
    }
}

//Function to fetch user response details from API
async function fetchUserResponseDetailsFromAPI() {
    try {
        const response = await fetch('http://localhost:5200/api/v1/admin/getAllElderlyFESResDetails', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`Error: ${errorDetails || 'Failed to fetch user responses'}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching user response details:', error.message);
        showCustomAlert("Error fetching userResponse's list of details");
        throw error;
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
});

async function initializeDashboard() {
    try {
        const [users, userResponses, userResponseDetails] = await Promise.all([fetchUsersFromAPI(), fetchUserResponseFromAPI(), fetchUserResponseDetailsFromAPI()]);

        // Store the fetched data
        dashboardData.users = users;
        dashboardData.userResponses = userResponses;
        dashboardData.userResponseDetails = userResponseDetails;

        initializeCharts();
        updateDashboard('age', 'all'); // Load initial data for all elderly
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showCustomAlert('Failed to load data. Please try again later.');
    }
}

function setupEventListeners() {
    const ageGroupSelector = document.getElementById('ageGroupSelector');
    const searchButton = document.getElementById('searchButton');
    const userIdInput = document.getElementById('individualSearch');

    // Handle age group selection
    ageGroupSelector.addEventListener('change', function () {
        const selectedAgeGroup = ageGroupSelector.value;

        if (selectedAgeGroup === 'all') {
            if (userIdInput.value !== '') {
                userIdInput.value = ''; // Clear the User ID input
                updateDashboard('all'); // Fetch and display all users
            } else {
                userIdInput.disabled = false; // Enable User ID input
                updateDashboard('all'); // Display all users if no previous search was done
            }
        } else {
            userIdInput.value = ''; // Clear User ID input
            userIdInput.disabled = true; // Disable User ID input
            updateDashboard('age', selectedAgeGroup); // Filter by age group
        }
    });

    // Handle the "ALL" button click separately to reset the filter
    document.getElementById('ageGroupSelector').addEventListener('click', function () {
        const selectedAgeGroup = ageGroupSelector.value;

        // If the "ALL" option is clicked and the User ID input has value, clear it
        if (selectedAgeGroup === 'all') {
            if (userIdInput.value !== '') {
                userIdInput.value = ''; // Clear the User ID input
                updateDashboard('all'); // Reset dashboard to show all users
            }
        }
    });

    // Handle user ID search
    searchButton.addEventListener('click', function () {
        const userId = parseInt(userIdInput.value, 10);
        const selectedAgeGroup = ageGroupSelector.value;

        if (selectedAgeGroup === 'all') {
            if (!isNaN(userId)) {
                updateDashboard('user', userId);
            } else {
                showCustomAlert('Please enter a valid User ID.');
            }
        } else {
            showCustomAlert('Age range is selected. Search by User ID is disabled.');
        }
    });
}

function updateDashboard(filterType, filterValue) {
    let filteredUsers;

    if (filterType === 'all') {
        // Display all users
        filteredUsers = dashboardData.users;
    }
    // Filter by age group
    else if (filterType === 'age') {
        if (filterValue === 'all') {
            filteredUsers = dashboardData.users; // All users if 'all' is selected
        } else {
            const [minAge, maxAge] = filterValue === '90+' ? [90, Infinity] : filterValue.split('-').map(Number);
            filteredUsers = dashboardData.users.filter(user => user.age >= minAge && user.age <= maxAge);
        }
    }

    // Filter by User ID
    else if (filterType === 'user') {
        filteredUsers = dashboardData.users.filter(user => user.user_id === filterValue);
    }

    const userIds = filteredUsers.map(user => user.user_id);
    const filteredResponses = dashboardData.userResponses.filter(response => userIds.includes(response.user_id));

    // Update charts
    updateAverageScoreChart(filteredResponses);
    updateDistributionChart(filteredResponses);
    updateRadarChart(filteredResponses); // Add radar chart update
}

// Function to update the radar chart
function updateRadarChart(filteredResponses) { //FilteredResponses, gives the filtered UserResponses  then we extract the response_id applicable
    const questionScores = Array(16).fill(0); // Array to store total score for each question
    const questionCounts = Array(16).fill(0); // Array to store count for each question

    const latestResponses = filteredResponses.reduce((acc, current) => {
        // If the user doesn't exist in the accumulator or has a later response_date
        if (!acc[current.user_id] || new Date(current.response_date) > new Date(acc[current.user_id].response_date)) {
            acc[current.user_id] = current;  // Save the latest response for this user
        }
        return acc;
    }, {});
    
    // Convert the result into an array
    const latestResponsesArray = Object.values(latestResponses);

    // Extract all response_ids from the latestResponsesArray
    const latestResponseIds = latestResponsesArray.map(response => response.response_id);

    // Filter UserIndividualResponse to only include responses that have a matching response_id
    const filteredUserResponses = dashboardData.userResponseDetails.filter(response => latestResponseIds.includes(response.response_id));
    //console.log(filteredUserResponses); //test

    // Iterate through the filtered responses to accumulate the scores
    filteredUserResponses.forEach(response => {
        const questionId = response.question_id; // Access question_id from the response
        // Ensure valid question_id (1-16)
        if (questionId >= 1 && questionId <= 16) {
            questionScores[questionId - 1] += response.response_score; // Add score for the corresponding question
            questionCounts[questionId - 1] += 1; // Increment the count for the question
        }
    });
    // Calculate average scores for each question
    const averageScores = questionScores.map((score, index) => {
        return questionCounts[index] > 0 ? (score / questionCounts[index]).toFixed(2) : 0; // Avoid division by zero
    });
    console.log(questionScores);

    // Update radar chart with average scores
    const radarChart = window.radarChart; // Reference to the radar chart
    radarChart.data.datasets[0].data = averageScores; // Set the new data
    radarChart.update(); // Update the chart
}

// Chart update functions remain the same
function updateAverageScoreChart(filteredResponses) {
    const monthlyAverages = {};

    filteredResponses.forEach(response => {
        const month = response.response_date.slice(0, 7); // Extract "YYYY-MM"
        if (!monthlyAverages[month]) {
            monthlyAverages[month] = { totalScore: 0, count: 0 };
        }
        monthlyAverages[month].totalScore += response.total_score;
        monthlyAverages[month].count += 1;
    });

    const labels = Object.keys(monthlyAverages).sort();
    const data = labels.map(month => (monthlyAverages[month].totalScore / monthlyAverages[month].count).toFixed(2));

    window.averageScoreChart.data.labels = labels;
    window.averageScoreChart.data.datasets[0].data = data;
    window.averageScoreChart.update();
}

function updateDistributionChart(filteredResponses) {
    const latestResponses = {};

    filteredResponses.forEach(response => {
        if (
            !latestResponses[response.user_id] ||
            new Date(response.response_date) > new Date(latestResponses[response.user_id].response_date)
        ) {
            latestResponses[response.user_id] = response;
        }
    });

    const riskCategories = { low: 0, medium: 0, high: 0 };

    Object.values(latestResponses).forEach(response => {
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
        riskCategories.high
    ];
    window.distributionChart.update();
}

function initializeCharts() {
    // Average Score Chart
    const avgCtx = document.getElementById('averageScoreChart').getContext('2d');
    window.averageScoreChart = new Chart(avgCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Average FES Score',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false // Disables the legend (removes the default filter option)
                },
                tooltip: {
                    enabled: true 
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 64,
                    title: {
                        display: true,
                        text: 'FES Score'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                }
            },
        }
    });

    // Distribution Chart
    const distCtx = document.getElementById('distributionChart').getContext('2d');
    window.distributionChart = new Chart(distCtx, {
        type: 'bar',
        data: {
            labels: ['Low Risk (16-36)', 'Medium Risk (37-48)', 'High Risk (49-64)'],
            datasets: [{
                label: 'Number of Elderly',
                data: [],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(255, 99, 132, 0.2)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false // Disables the legend (removes the default filter option)
                },
                tooltip: {
                    enabled: true 
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: 'Number of Elderly'
                    }
                }
            },
        }
    });

    // Radar Chart
    const radarCtx = document.getElementById("questionScoreChart").getContext("2d");
    window.radarChart = new Chart(radarCtx, {
        type: "radar",
        data: {
            labels: [
                "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8",
                "Q9", "Q10", "Q11", "Q12", "Q13", "Q14", "Q15", "Q16"
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
                    display: false
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: false
                    },
                    suggestedMin: 0,
                    suggestedMax: 4
                }
            }
        }
    });
    console.log("Canvas Context:", radarCtx);  // Should log a valid context

}
