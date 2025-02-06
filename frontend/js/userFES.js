const API_FES_URL = "http://localhost:5300/api/v1"; // FES API URL
const API_OpenAI_URL = "http://localhost:5150/api/v1"; // openAI API URL

let questions = [];
let currentPage = 1;
const questionsPerPage = 4;
let userAnswers = {}; //store user responses in userAnwsers object

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
  savePageAnswers(); // Save answers before page change

  if (
    direction === "next" &&
    currentPage * questionsPerPage < questions.length
  ) {
    currentPage++;
  } else if (direction === "back" && currentPage > 1) {
    currentPage--;
  }

  renderQuestions();

  // Scroll to the subtitle after page change
  const subtitle = document.getElementById("subtitle");
  if (subtitle) {
    subtitle.scrollIntoView({ behavior: "smooth", block: "start" });
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

async function playTextToSpeech(text) {
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

  const playButtons = document.querySelectorAll(".play-button");

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
    audio.addEventListener("ended", () => {
      // Re-enable all play buttons after audio is done
      playButtons.forEach((button) => (button.disabled = false));
    });
  } catch (error) {
    console.error("Error during TTS process:", error);
    // Re-enable all play buttons in case of an error
    playButtons.forEach((button) => (button.disabled = false));
  }
}

async function submitResponses() {
  savePageAnswers();

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
    return;
  }

  const payload = {
    user_id: 1,
    responses,
  };

  try {
    const response = await fetch(`${API_FES_URL}/saveResponses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to submit responses");
    }

    const result = await response.json();
    showCustomAlert(result.message, "userHome.html");
  } catch (error) {
    console.error(error);
    showCustomAlert("Error submitting responses. Please try again.");
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

document.addEventListener("DOMContentLoaded", () => {
  fetchQuestions();

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
});

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
