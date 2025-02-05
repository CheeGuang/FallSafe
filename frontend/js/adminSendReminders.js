const token = localStorage.getItem("token");
console.log(token);
if (!token) {
    // Redirect to the login page if no token is found
    window.location.href = "./login.html";
}

// Store the fetched data globally for use in filtering and rendering
let dashboardData = {
    users: [],
    fesLastResList: [],
    faLastResList:[],
    tableFullData: [],
    filteredTableData: [], //save as global, will be referencing to this 
};
//Pages for the table
let currentPage = 1;
const usersPerPage = 10;

/*  sample data for last fes
    {
        "user_id": 1,
        "days_since_last_fesres": 3
    },
    sample data for last fa
    {
        "user_id": 1,
        "days_since_last_fares": 7
    },
    sample data format for users
    {
        "user_id": 1,
        "name": "Alice Tan",
        "email" "alice@example.com"
        "age": "61"
    },
    
*/

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
});

async function initializeDashboard() {
    try {
        const [users, fesLastResList, faLastResList] = await Promise.all([fetchUsersFromAPI(),fetchFESLastResponseDate(), fetchFallAssessmentLastResponseDate()]);

        // Store the fetched data
        dashboardData.users = users;
        dashboardData.fesLastResList = fesLastResList;
        dashboardData.faLastResList = faLastResList;

        console.log(users);
        console.log(fesLastResList);
        console.log(faLastResList);

        updateDashboard('age', 'all'); // Load initial data for all elderly
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showCustomAlert('Failed to load data. Please try again later.');
    }
}

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

// Function to fetch the last response date and days since response from the API
async function fetchFESLastResponseDate() {
    try {
        // API endpoint to get the user ID and days since the last response
        const response = await fetch('http://localhost:5200/api/v1/admin/getAllLastResFES', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // Add Authorization token if required
            },
        });

        // Check if the response is successful
        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`Error: ${errorDetails || 'Failed to fetch last response date'}`);
        }

        // Parse the JSON response and return it
        return await response.json();
    } catch (error) {
        // Log and display the error
        console.error('Error fetching FES last response date:', error.message);
        showCustomAlert("Error fetching the last response date");
        throw error;
    }
}

// Function to fetch the last fall assessment date and days since response from the API
async function fetchFallAssessmentLastResponseDate() {
    try {
        // API endpoint to get the user ID and days since the last fall assessment response
        const response = await fetch('http://localhost:5200/api/v1/admin/getAllLastResFA', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // Add Authorization token if required
            },
        });

        // Check if the response is successful
        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`Error: ${errorDetails || 'Failed to fetch last fall assessment response date'}`);
        }

        // Parse the JSON response and return it
        return await response.json();
    } catch (error) {
        // Log and display the error
        console.error('Error fetching Fall assessment last response date:', error.message);
        showCustomAlert("Error fetching the last fall assessment response date");
        throw error;
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
    //Combines my fragmented data of the database.
    const mergedData = dashboardData.users.map(user => {
        // Find the corresponding FES and Fall Assessment data for each user
        const fes = dashboardData.fesLastResList.find(fesItem => fesItem.user_id === user.user_id);
        const fallAssessment = dashboardData.faLastResList.find(faItem => faItem.user_id === user.user_id);

        // Get days from FES or Fall Assessment, default to 0 if not available
        const fesDays = fes ? fes.days_since_last_fesres : 0;
        const faDays = fallAssessment ? fallAssessment.days_since_last_fares : 0;

        // Return merged object with the largest number of days
        return {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            last_fes_date: fes ? fes.days_since_last_fesres : 'N/A',
            last_fall_assessment_date: fallAssessment ? fallAssessment.days_since_last_fares : 'N/A',
            longest_day: Math.max(fesDays, faDays), // Use the largest number of days
        };
    });
    // Sort the data by the largest number of days (longest_day) in descending order
    const sortedData = mergedData.sort((a, b) => b.longest_day - a.longest_day);
    // Remove the 'longest_day' field before sending data to table
    const finalData = sortedData.map(({ longest_day, ...rest }) => rest);
    console.log(finalData); //Ready in the correct sort position

    const givenListTable = finalData.filter(response => userIds.includes(response.user_id))

    dashboardData.filteredTableData = givenListTable; //save as global, will be referencing to this
    renderTable(givenListTable)
}

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    // Paginate data
    const start = (currentPage - 1) * usersPerPage;
    const paginatedUsers = data.slice(start, start + usersPerPage);

    paginatedUsers.forEach(user => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${user.user_id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.last_fes_date}</td>
            <td>
                <button 
                    class="btn btn-sm btn-primary email-btn"
                    data-email="${user.email}"
                    data-type="Falls Efficacy Scale"
                    data-days="${user.last_fes_date}"
                    onclick="sendEmail(this)">
                    Send FES Email
                </button>
            </td>
            <td>${user.last_fall_assessment_date}</td>
            <td>
                <button 
                    class="btn btn-sm btn-success email-btn"
                    data-email="${user.email}"
                    data-type="Fall Assessment"
                    data-days="${user.last_fall_assessment_date}"
                    onclick="sendEmail(this)">
                    Send Fall Assessment Email
                </button>
            </td>
        `;
    });

    // Update pagination
    renderPagination(data.length);
}

function renderPagination(totalUsers) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalUsers / usersPerPage);

    // Previous button
    if (currentPage > 1) {
        pagination.innerHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>`;
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        pagination.innerHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>`;
    }

    // Next button
    if (currentPage < totalPages) {
        pagination.innerHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>`;
    }
}

function changePage(page) {
    currentPage = page;
    renderTable(dashboardData.filteredTableData);
}

//function to Send Email, handled by the Microservice in Admin
async function sendEmail(button) {
    const email = button.getAttribute("data-email");
    const type = button.getAttribute("data-type");
    const daysSinceLast = button.getAttribute("data-days") || "N/A";

    if (!email) {
        console.error("Email is missing.");
        showCustomAlert("Email address is missing.");
        return;
    }
    try {
        const response = await fetch("http://localhost:5200/api/v1/admin/sendEmailAssesRemind", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // Ensure `token` is defined
            },
            body: JSON.stringify({ email, type, daysSinceLast })
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`Failed to send email: ${errorDetails}`);
        }

        const result = await response.json();
        showCustomAlert(`Email sent successfully to ${email}!`);
        console.log("Email Response:", result);
    } catch (error) {
        console.error("Error sending email:", error.message);
        showCustomAlert("Failed to send email. Please try again.");
    }
}
