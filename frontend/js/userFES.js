const API_FES_URL = "http://localhost:5300/api/v1"; // FES API URL
const API_OpenAI_URL = "http://localhost:5150/api/v1"; // openAI API URL

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
    const questions = await response.json();
    renderQuestions(questions);
  } catch (error) {
    console.error(error);
    alert("Error fetching questions. Please try again.");
  }
}

function renderQuestions(questions) {
  const container = document.getElementById("questions-container");
  container.innerHTML = "";

  questions.forEach((question) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question mb-4";

    questionDiv.innerHTML = `
            <p>${question.text}</p>
            <button class="play-button" data-id="${question.id}" data-text="${question.text}" aria-label="Play text" style="background: none; border: none; cursor: pointer;">
              <span role="img" aria-label="Speaker" style="font-size: 2.5em;">🔊</span>
            </button>
            <div class="options d-flex justify-content-between mt-3">
              <div class="option" data-risk="low">
                <label>
                  <input type="radio" name="question-${question.id}" value="1">
                  <span role="img" aria-label="Low risk" style="font-size: 2em;">🙂</span>
                </label>
              </div>
              <div class="option" data-risk="moderate">
                <label>
                  <input type="radio" name="question-${question.id}" value="2">
                  <span role="img" aria-label="Moderate risk" style="font-size: 2em;">😐</span>
                </label>
              </div>
              <div class="option" data-risk="high">
                <label>
                  <input type="radio" name="question-${question.id}" value="3">
                  <span role="img" aria-label="High risk" style="font-size: 2em;">😟</span>
                </label>
              </div>
              <div class="option" data-risk="very-high">
                <label>
                  <input type="radio" name="question-${question.id}" value="4">
                  <span role="img" aria-label="Very high risk" style="font-size: 2em;">😱</span>
                </label>
              </div>
            </div>
          `;
    container.appendChild(questionDiv);
  });

  // Add event listener to the speaker buttons
  document.querySelectorAll(".play-button").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const text = event.target.closest("button").getAttribute("data-text");
      await playTextToSpeech(text);
    });
  });
}

//play tts with TargetLanguage
async function playTextToSpeech(text) {
  const dropdown = document.getElementById("language-dropdown");
  const targetLanguage = dropdown.value;

  try {
    let translatedText = text;
    if (targetLanguage.toLowerCase() !== "en") {
      const translationResponse = await fetch(
        `${API_OpenAI_URL}/generateTranslation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`, // Retrieve token from localStorage
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
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Retrieve token from localStorage
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
  } catch (error) {
    console.error("Error during TTS process:", error);
  }
}

//generate response from openAI endpoint
async function generateResponse(prompt) {
  try {
    const response = await fetch(`${API_OpenAI_URL}/generateResponse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Retrieve token from localStorage
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

//generate translation from openAI endpoind

//submit responses to db
async function submitResponses() {
  const responses = [];
  document.querySelectorAll(".question").forEach((questionDiv) => {
    const questionId = questionDiv
      .querySelector(".options input")
      .name.split("-")[1];
    const selectedOption = questionDiv.querySelector(".options input:checked");

    if (selectedOption) {
      responses.push({
        question_id: parseInt(questionId, 10),
        score: parseInt(selectedOption.value, 10),
      });
    } else {
      alert("Please answer all questions before submitting.");
      throw new Error("Incomplete responses");
    }
  });

  const payload = {
    user_id: 1,
    responses,
  };

  try {
    const response = await fetch(`${API_FES_URL}/saveResponses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Retrieve token from localStorage
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to submit responses");
    }

    const result = await response.json();
    alert(result.message);
  } catch (error) {
    console.error(error);
    alert("Error submitting responses. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchQuestions();

  document
    .getElementById("submit-button")
    .addEventListener("click", submitResponses);
});
