document.addEventListener("DOMContentLoaded", function () {
  const startTestButton = document.getElementById("startTestButton");
  const selfAssessmentContainer = document.getElementById(
    "selfAssessmentContainer"
  );
  const testNameElement = document.getElementById("title");
  const testDescriptionElement = document.getElementById("subtitle");
  const riskMetricsElement = document.getElementById("subtitle2");
  const stepsList = document.getElementById("stepsList");
  const testVideo = document.getElementById("testVideo");

  function decodeToken(token) {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid token format");
      }

      const payload = JSON.parse(atob(parts[1]));
      console.log("Decoded payload:", payload);

      return payload;
    } catch (error) {
      console.error("Failed to decode token:", error);
      return null;
    }
  }

  let ws;
  startTestButton.addEventListener("click", async () => {
    if (startTestButton.textContent.trim() === "Continue") {
      console.log("Starting test connection...");
      showCustomAlert("Testing connection to FallSafe device...");

      try {
        const token = localStorage.getItem("token");
        console.log("Token retrieved from localStorage:", token);

        if (!token) {
          showCustomAlert("Authentication token not found. Please log in.");
          console.error("Error: Token not found in localStorage.");
          return;
        }

        console.log("Testing connection to /api/v1/selfAssessment/test...");
        const testResponse = await fetch(
          "http://127.0.0.1:5250/api/v1/selfAssessment/test",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Test response status:", testResponse.status);

        if (testResponse.ok) {
          showCustomAlert(
            "Connection to FallSafe device successful. Initializing WebSocket..."
          );

          console.log("Initializing WebSocket connection...");
          ws = new WebSocket(
            `ws://127.0.0.1:5250/api/v1/selfAssessment/ws?token=${token}`
          );

          ws.onopen = () => {
            console.log("WebSocket connected successfully.");
            showCustomAlert("WebSocket connected successfully.");

            startTestButton.textContent = "Start Test";
          };

          ws.onmessage = (message) => {
            console.log("WebSocket message received:", message.data);
          };

          ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            showCustomAlert("Error connecting to WebSocket. Please try again.");
          };

          ws.onclose = (event) => {
            console.log("WebSocket connection closed:", event);
            showCustomAlert("WebSocket connection closed.");
          };
        } else {
          showCustomAlert(
            "Failed to connect to FallSafe device. Please try again."
          );
          console.error(
            "HTTP request failed with status:",
            testResponse.status
          );
          console.error("HTTP response:", await testResponse.text());
        }
      } catch (error) {
        showCustomAlert("An error occurred while testing the connection.");
        console.error("An error occurred:", error);
      }
    } else if (startTestButton.textContent.trim() === "Start Test") {
      console.log("Starting test session...");

      try {
        const token = localStorage.getItem("token");
        const decodedPayload = decodeToken(token);
        console.log("Extracted userID:", decodedPayload.user_id);
        const userID = decodedPayload.user_id;

        if (decodedPayload && decodedPayload.user_id) {
          console.log("Extracted userID:", userID);
        } else {
          console.error("userID not found in token payload");
        }

        if (!token || !userID) {
          showCustomAlert(
            "Authentication token or user ID not found. Please log in."
          );
          return;
        }

        const response = await fetch(
          `http://127.0.0.1:5250/api/v1/selfAssessment/startTest?userID=${userID}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log("Test session started:", result);
          showCustomAlert("Test session started successfully!");

          try {
            const tests = await fetchTests();
            if (tests && tests.length > 0) {
              displayTest(tests[0]);
            }

            document.getElementById("test-container").style.display = "none";
            selfAssessmentContainer.style.display = "block";
          } catch (error) {
            console.error("Error starting the test session:", error);
          }
        } else {
          console.error("Failed to start test session:", await response.text());
          showCustomAlert("Failed to start test session. Please try again.");
        }
      } catch (error) {
        console.error(
          "An error occurred while starting the test session:",
          error
        );
        showCustomAlert("An error occurred while starting the test session.");
      }
    }
  });

  async function fetchTests() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in.");
      }

      const response = await fetch(
        "http://127.0.0.1:5250/api/v1/selfAssessment/getAllTests",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tests from the server.");
      }

      const tests = await response.json();
      return tests;
    } catch (error) {
      console.error("Error fetching tests:", error);
      showCustomAlert("Error fetching tests. Please try again later.");
    }
  }

  function displayTest(test) {
    testNameElement.textContent = test.test_name;
    testDescriptionElement.textContent = test.description;
    riskMetricsElement.textContent = test.risk_metric;
    startTestButton.remove();

    stepsList.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
      const step = test[`step_${i}`];
      if (step) {
        const listItem = document.createElement("li");
        listItem.className = "list-group-item";
        listItem.textContent = step;
        stepsList.appendChild(listItem);
      }
    }

    testVideo.src = test.video_url;
    testVideo.load();
  }
});
