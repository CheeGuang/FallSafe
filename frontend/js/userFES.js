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

function renderQuestions() {
  const container = document.getElementById("questions-container");
  container.innerHTML = "";

  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = Math.min(startIndex + questionsPerPage, questions.length);
  const questionsToDisplay = questions.slice(startIndex, endIndex);

  questionsToDisplay.forEach((question) => {
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
      <div class="option" data-risk="low">
        <label>
          <input type="radio" name="question-${question.id}" value="1" ${
      userAnswers[question.id] === 1 ? "checked" : ""
    }> 
          <span role="img" aria-label="Low risk" style="font-size: 2em;">🙂</span>
          <p style="margin: 0; text-align: center; font-size: 0.9em;">Highly Confident</p>
        </label>
      </div>
      <div class="option" data-risk="moderate">
        <label>
          <input type="radio" name="question-${question.id}" value="2" ${
      userAnswers[question.id] === 2 ? "checked" : ""
    }>
          <span role="img" aria-label="Moderate risk" style="font-size: 2em;">😐</span>
          <p style="margin: 0; text-align: center; font-size: 0.9em;">Moderately Confident</p>
        </label>
      </div>
      <div class="option" data-risk="high">
        <label>
          <input type="radio" name="question-${question.id}" value="3" ${
      userAnswers[question.id] === 3 ? "checked" : ""
    }>
          <span role="img" aria-label="High risk" style="font-size: 2em;">😟</span>
          <p style="margin: 0; text-align: center; font-size: 0.9em;">Somewhat Confident</p>
        </label>
      </div>
      <div class="option" data-risk="very-high">
        <label>
          <input type="radio" name="question-${question.id}" value="4" ${
      userAnswers[question.id] === 4 ? "checked" : ""
    }>
          <span role="img" aria-label="Very high risk" style="font-size: 2em;">😱</span>
          <p style="margin: 0; text-align: center; font-size: 0.9em;">Not Confident</p>
        </label>
      </div>
    </div>
  `;

    container.appendChild(questionDiv);

    //event listeners to save option after user selects
    const radioButtons = questionDiv.querySelectorAll('input[type="radio"]');
    radioButtons.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        userAnswers[question.id] = parseInt(e.target.value);
        checkAllQuestionsAnswered();
      });
    });
  });

  updatePaginationButtons();

  document.querySelectorAll(".play-button").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const text = event.target.closest("button").getAttribute("data-text");
      // Disable all play buttons
      const playButtons = document.querySelectorAll(".play-button");
      playButtons.forEach((button) => (button.disabled = true));
      await playTextToSpeech(text);
    });
  });
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

  // Scroll to the language dropdown
  const dropdownElement = document.getElementById("language-dropdown");
  if (dropdownElement) {
    dropdownElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

//save page answers to userAnswers object
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

  //language change handler
  document
    .getElementById("language-dropdown")
    .addEventListener("change", () => {
      //re-render questions to update text-to-speech buttons
      renderQuestions();
    });
});
