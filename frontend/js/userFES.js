const API_FES_URL = "http://localhost:5300/api/v1"; // FES API URL
const API_OpenAI_URL = "http://localhost:5150/api/v1"; // openAI API URL

let questions = [];
let currentPage = 1;
const questionsPerPage = 4;
let userAnswers = {}; //store user responses in userAnwsers object
let eligibleForVoucher = false; // Track eligibility before test

async function fetchQuestions() {
  try {
    const response = await fetch(`${API_FES_URL}/questions`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch questions");
    }

    questions = await response.json();
    renderQuestions();
  } catch (error) {
    console.error(error);
    showCustomAlert("Error fetching questions. Please try again.");
  }
}

// Modify renderQuestions to restore selections when navigating
function renderQuestions() {
  const container = document.getElementById("questions-container");
  container.innerHTML = "";

  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = Math.min(startIndex + questionsPerPage, questions.length);
  const questionsToDisplay = questions.slice(startIndex, endIndex);

  questionsToDisplay.forEach((question) => {
    const selectedValue = userAnswers[question.id] || null; // Check if an answer exists

    const questionDiv = document.createElement("div");
    questionDiv.className = "question mb-4";

    questionDiv.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center">
        <p style="margin: 0;" class="question-title">Q${question.id}: ${
      question.text
    }</p>
          <button class="play-button" data-id="${question.id}" data-text="${
      question.text
    }" aria-label="Play text" style="background: none; border: none; cursor: pointer;">
        <span role="img" aria-label="Speaker" style="font-size: 2.5em; cursor: pointer;">🔊</span>
      </button>
      </div>
      
      <div class="options d-flex justify-content-between mt-3">
        ${createOptionHTML(
          question.id,
          1,
          "🙂",
          "Highly Confident",
          selectedValue
        )}
        ${createOptionHTML(
          question.id,
          2,
          "😐",
          "Moderately Confident",
          selectedValue
        )}
        ${createOptionHTML(
          question.id,
          3,
          "😟",
          "Somewhat Confident",
          selectedValue
        )}
        ${createOptionHTML(
          question.id,
          4,
          "😱",
          "Not Confident",
          selectedValue
        )}
      </div>
    `;

    container.appendChild(questionDiv);
  });

  updatePaginationButtons();
  checkAllQuestionsAnswered(); // Re-check after rendering
}

// Helper function to generate option HTML
function createOptionHTML(questionId, value, emoji, text, selectedValue) {
  return `
    <div class="option ${selectedValue === value ? "selected" : ""}">
      <label>
        <input type="radio" name="question-${questionId}" value="${value}" ${
    selectedValue === value ? "checked" : ""
  }>
        <span role="img" aria-label="${text}" style="font-size: 2em;">${emoji}</span>
        <p style="margin: 0; text-align: center; font-size: 0.9em;">${text}</p>
      </label>
    </div>
  `;
}
function updatePaginationButtons() {
  const backButton = document.getElementById("back-button");
  const nextButton = document.getElementById("next-button");

  backButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage * questionsPerPage >= questions.length;
}

function handlePageChange(direction) {
  if (direction === "next") {
    // Ensure all questions on the current page are answered before proceeding
    const startIndex = (currentPage - 1) * questionsPerPage;
    const endIndex = Math.min(startIndex + questionsPerPage, questions.length);
    const currentQuestions = questions.slice(startIndex, endIndex);

    const allAnswered = currentQuestions.every(
      (question) => userAnswers[question.id] !== undefined
    );

    if (!allAnswered) {
      showCustomAlert("Please answer all questions before proceeding.");
      return;
    }

    if (currentPage * questionsPerPage < questions.length) {
      currentPage++;
    }
  } else if (direction === "back" && currentPage > 1) {
    currentPage--;
  }

  renderQuestions();

  // Scroll to the FES header after page change
  const fesHeader = document.getElementById("fes-header");
  if (fesHeader) {
    fesHeader.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Save answers to userAnswers object before navigating
function savePageAnswers() {
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = Math.min(startIndex + questionsPerPage, questions.length);
  const currentQuestions = questions.slice(startIndex, endIndex);

  currentQuestions.forEach((question) => {
    const selectedOption = document.querySelector(
      `input[name="question-${question.id}"]:checked`
    );
    if (selectedOption) {
      userAnswers[question.id] = parseInt(selectedOption.value);
    }
  });
}

// Function to check if all questions are answered
function checkAllQuestionsAnswered() {
  const totalQuestions = questions.length;
  const answeredQuestions = Object.keys(userAnswers).length;

  const submitButton = document.getElementById("submit-button");
  submitButton.disabled = answeredQuestions < totalQuestions;
}

async function playTextToSpeech(text, button) {
  const playButtons = document.querySelectorAll(".play-button");
  playButtons.forEach((button) => (button.disabled = true)); // Disable all play buttons

  let targetLanguage = "en";
  const googtrans = document.cookie
    .split("; ")
    .find((row) => row.startsWith("googtrans="));
  if (googtrans) {
    let language = googtrans.split("=")[1].replace("/auto/", "");
    if (language === "zh-CN") {
      language = "zh";
    }
    targetLanguage = language;
    console.log(targetLanguage); // Output the final targetLanguage
  }

  try {
    let translatedText = text;
    if (targetLanguage.toLowerCase() !== "en") {
      const translationResponse = await fetch(
        `${API_OpenAI_URL}/generateTranslation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            input_text: text,
            target_language: targetLanguage,
          }),
        }
      );

      if (!translationResponse.ok) {
        throw new Error("Failed to generate translation");
      }

      const translationData = await translationResponse.json();
      translatedText = translationData.translation;
      console.log("Translated text:", translatedText);
    }

    const ttsResponse = await fetch(`${API_OpenAI_URL}/generateSpeech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        input_text: translatedText,
        target_language: targetLanguage,
      }),
    });

    if (!ttsResponse.ok) {
      throw new Error("Failed to generate speech");
    }

    const audioBlob = await ttsResponse.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.play();

    // Enable button after audio finishes playing
    audio.addEventListener("ended", () => {
      const playButtons = document.querySelectorAll(".play-button");
      playButtons.forEach((button) => (button.disabled = false)); // Disable all play buttons
    });
  } catch (error) {
    console.error("Error during TTS process:", error);
    const playButtons = document.querySelectorAll(".play-button");
    playButtons.forEach((button) => (button.disabled = false)); // Disable all play buttons
  }
}

async function submitResponses() {
  savePageAnswers();

  const submitButton = document.getElementById("submit-button");
  submitButton.disabled = true; // Disable submit button

  const responses = [];
  questions.forEach((question) => {
    if (userAnswers[question.id]) {
      responses.push({
        question_id: question.id,
        score: userAnswers[question.id],
      });
    }
  });

  if (responses.length !== questions.length) {
    showCustomAlert("Please answer all questions before submitting.");
    submitButton.disabled = false; // Re-enable submit button
    return;
  }

  // Decode JWT token to get user email
  const token = localStorage.getItem("token");
  if (!token) {
    showCustomAlert("Authentication required. Please log in again.");
    submitButton.disabled = false;
    return;
  }

  const tokenPayload = JSON.parse(atob(token.split(".")[1])); // Decode JWT
  const userEmail = tokenPayload.email; // Extract user email

  if (!userEmail) {
    showCustomAlert(
      "Unable to retrieve email from session. Please log in again."
    );
    submitButton.disabled = false;
    return;
  }

  const payload = {
    user_id: tokenPayload.user_id, // Extracted from token
    responses,
  };

  try {
    const response = await fetch(`${API_FES_URL}/saveResponses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to submit responses");
    }

    const result = await response.json();

    // Check if user is eligible for a voucher
    if (eligibleForVoucher) {
      showCustomAlert(
        "🎉 Congratulations! A $10 NTUC Voucher will be emailed to you."
      );

      // Call the voucher email API
      await sendVoucherEmail(userEmail, 1); // Sending 1 NTUC $10 voucher
    } else {
      showCustomAlert(result.message, "userFESResults.html");
    }
  } catch (error) {
    console.error(error);
    showCustomAlert("Error submitting responses. Please try again.");
    submitButton.disabled = false; // Re-enable submit button only if submission fails
  }
}
async function sendVoucherEmail(email, voucherCount) {
  try {
    const response = await fetch(
      `https://8l5ekaokyh.execute-api.ap-southeast-1.amazonaws.com/prod/sendVoucherEmail`,
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

async function generateResponse(prompt) {
  try {
    const response = await fetch(`${API_OpenAI_URL}/generateResponse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ prompt: prompt }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate response");
    }

    const data = await response.json();
    console.log("Generated response:", data.response);
  } catch (error) {
    console.error("Error generating response:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const lastTakenDate = await fetchLastAssessmentDate();
  updateCountdown(lastTakenDate);

  // Start button event listener
  document.getElementById("start-button").addEventListener("click", () => {
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("questions-screen").style.display = "block";
    fetchQuestions(); // Only fetch questions when starting the assessment
  });

  document.getElementById("next-button").addEventListener("click", () => {
    handlePageChange("next");
  });

  document.getElementById("back-button").addEventListener("click", () => {
    handlePageChange("back");
  });

  document
    .getElementById("submit-button")
    .addEventListener("click", submitResponses);

  // Handle option selection
  document.addEventListener("click", (event) => {
    const label = event.target.closest(".option label");
    if (label) {
      const input = label.querySelector("input[type='radio']");
      if (input) {
        input.checked = true;
        userAnswers[input.name.split("-")[1]] = parseInt(input.value); // Save selection
        updateSelectionUI(input);
        checkAllQuestionsAnswered();
      }
    }
  });
  // Add event listener for play buttons
  document.addEventListener("click", (event) => {
    const playButton = event.target.closest(".play-button");
    if (playButton) {
      const questionText = playButton.getAttribute("data-text");
      playTextToSpeech(questionText, playButton);
    }
  });
});

async function fetchLastAssessmentDate() {
  try {
    // Get JWT token and decode it to get user ID
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token found");
    }

    // Decode JWT token to get user ID
    const tokenPayload = JSON.parse(atob(token.split(".")[1]));
    const userId = tokenPayload.user_id;

    if (!userId) {
      throw new Error("User ID not found in token");
    }

    // Add user_id as a query parameter
    const response = await fetch(
      `${API_FES_URL}/fes/getLastAssessment?user_id=${userId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // No previous assessment found - this is a valid case
        return {
          message: "No assessments found for this user",
        };
      }
      throw new Error("Failed to fetch last assessment date");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching last assessment date:", error);
    // Return a structured response even in case of error
    return {
      message: "No assessments found for this user",
    };
  }
}

function updateCountdown(assessmentData) {
  const lastAssessmentInfo = document.getElementById("last-assessment-info");
  const countdownTimer = document.getElementById("countdown-timer");
  const voucherStatus = document.getElementById("voucher-status");
  const monthsDaysAgoElement = document.getElementById("months-days-ago");

  if (
    !assessmentData ||
    assessmentData.message === "No assessments found for this user"
  ) {
    lastAssessmentInfo.innerHTML = "<p>No previous assessment found</p>";
    countdownTimer.style.display = "none";
    voucherStatus.style.display = "none";
    return;
  }

  // Parse the ISO date string from the JSON response
  const lastTaken = new Date(assessmentData.response_date);
  document.getElementById("last-taken-date").textContent =
    lastTaken.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  // Calculate the time difference in months and days
  const today = new Date();
  let monthsAgo =
    today.getMonth() -
    lastTaken.getMonth() +
    12 * (today.getFullYear() - lastTaken.getFullYear());
  let daysAgo = today.getDate() - lastTaken.getDate();

  eligibleForVoucher = monthsAgo >= 6;

  if (daysAgo < 0) {
    monthsAgo -= 1;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
    daysAgo += prevMonth.getDate();
  }

  // Display "Today" if the assessment was taken today
  if (monthsAgo === 0 && daysAgo === 0) {
    monthsDaysAgoElement.innerHTML = "<span> (Today)</span>";
  } else {
    monthsDaysAgoElement.innerHTML = `<span>(${monthsAgo} months, ${daysAgo} days ago)</span>`;
  }

  // Calculate the next recommended assessment date
  const nextAssessment = new Date(lastTaken);
  nextAssessment.setMonth(nextAssessment.getMonth() + 6);

  function updateTimer() {
    const now = new Date();
    const difference = nextAssessment - now;

    if (difference <= 0) {
      document.getElementById("voucher-status").style.display = "block";
      document.getElementById("countdown-timer").innerHTML =
        "<p>It's time for your next assessment!";
      return;
    }

    if (difference <= 0) {
      voucherStatus.style.display = "block";
      return;
    }

    // Hide voucher status if not eligible
    voucherStatus.style.display = "none";

    const remainingMonths = Math.floor(difference / (1000 * 60 * 60 * 24 * 30));
    const remainingDays = Math.floor(
      (difference % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)
    );

    document.getElementById("months").textContent = remainingMonths;
    document.getElementById("days").textContent = remainingDays;
  }

  updateTimer();
  setInterval(updateTimer, 1000 * 60 * 60); // Update every hour
}

// Function to update the UI based on the selection
function updateSelectionUI(selectedInput) {
  const questionId = selectedInput.name.split("-")[1];

  // Remove selection from all options in the same question
  document
    .querySelectorAll(`input[name="question-${questionId}"]`)
    .forEach((input) => {
      input.closest(".option").classList.remove("selected");
    });

  // Add selection class to the selected option
  selectedInput.closest(".option").classList.add("selected");

  checkAllQuestionsAnswered(); // Check if submit button should be enabled
}
