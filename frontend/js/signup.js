document.addEventListener("DOMContentLoaded", function () {
  // Original code - Send Code button functionality
  const sendCodeButton = document.getElementById("sendCode");

  // Add a click event listener to the Send Code button
  sendCodeButton.addEventListener("click", function () {
    // Get the email input value
    const emailInput = document.getElementById("email");
    const email = emailInput.value.trim();

    // Check if the email is valid
    if (!validateEmail(email)) {
      showCustomAlert("Please enter a valid email address.");
      return;
    }

    // Disable the button to prevent multiple clicks
    sendCodeButton.disabled = true;

    // Construct the endpoint dynamically using window.location.origin
    const endpoint = `http://18.143.103.158:5050/api/v1/authentication/send-verification`;

    // Send a POST request to the backend API
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to send verification code.");
        }
        return response.json();
      })
      .then((data) => {
        showCustomAlert(data.message || "Verification code sent successfully!");
      })
      .catch((error) => {
        showCustomAlert(
          error.message ||
            "An error occurred while sending the verification code."
        );
      })
      .finally(() => {
        // Re-enable the button
        sendCodeButton.disabled = false;
      });
  });

  // Function to validate email format
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Original form submit event
  document.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Only process form submission if we're on the final step
    if (!document.getElementById("step3").classList.contains("active")) {
      return;
    }

    // Validate password fields
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    
    if (password !== confirmPassword) {
      document.getElementById("confirmPassword-error").style.display = "block";
      return;
    }
    
    // Validate password strength
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      document.getElementById("password-error").style.display = "block";
      return;
    }

    const email = document.getElementById("email").value;
    const verificationCode = document.getElementById("verificationCode").value;
    const name =
      document.getElementById("firstName").value +
      " " +
      document.getElementById("lastName").value;
    const age = parseInt(document.getElementById("age").value, 10); // Convert age to a number
    const phoneNumber = document.getElementById("phoneNumber").value;
    const address = document.getElementById("address").value;

    const response = await fetch(
      `http://18.143.103.158:5050/api/v1/authentication/register-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          verification_code: verificationCode,
          name,
          password,
          phone_number: phoneNumber,
          address,
          age,
        }),
      }
    );

    const data = await response.json();
    if (response.ok) {
      showCustomAlert(data.message, "login.html");
    } else {
      showCustomAlert(`Error: ${data.message || "Failed to register"}`);
    }
  });

  // NEW CODE BELOW - Step-by-step functionality
  
  // Get all step containers
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  
  // Get navigation buttons
  const step1Next = document.getElementById('step1Next');
  const step2Back = document.getElementById('step2Back');
  const step2Next = document.getElementById('step2Next');
  const step3Back = document.getElementById('step3Back');
  
  // Get step indicators
  const stepIndicator1 = document.getElementById('step-indicator-1');
  const stepIndicator2 = document.getElementById('step-indicator-2');
  const stepIndicator3 = document.getElementById('step-indicator-3');
  const connector12 = document.getElementById('connector-1-2');
  const connector23 = document.getElementById('connector-2-3');
  
  // Step 1 validation and navigation
  step1Next.addEventListener('click', function() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const age = document.getElementById('age').value;
    
    let isValid = true;
    
    // Validate first name
    if (firstName === '') {
      document.getElementById('firstName-error').style.display = 'block';
      isValid = false;
    } else {
      document.getElementById('firstName-error').style.display = 'none';
    }
    
    // Validate last name
    if (lastName === '') {
      document.getElementById('lastName-error').style.display = 'block';
      isValid = false;
    } else {
      document.getElementById('lastName-error').style.display = 'none';
    }
    
    // Validate age
    if (age === '' || parseInt(age) < 18) {
      document.getElementById('age-error').style.display = 'block';
      isValid = false;
    } else {
      document.getElementById('age-error').style.display = 'none';
    }
    
    // If all fields are valid, move to step 2
    if (isValid) {
      step1.classList.remove('active');
      step2.classList.add('active');
      stepIndicator1.classList.remove('active');
      stepIndicator1.classList.add('completed');
      stepIndicator2.classList.add('active');
      connector12.classList.add('active');
    }
  });
  
  // Step 2 back button
  step2Back.addEventListener('click', function() {
    step2.classList.remove('active');
    step1.classList.add('active');
    stepIndicator2.classList.remove('active');
    stepIndicator1.classList.remove('completed');
    stepIndicator1.classList.add('active');
    connector12.classList.remove('active');
  });
  
  // Step 2 validation and navigation
  step2Next.addEventListener('click', function() {
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const address = document.getElementById('address').value.trim();
    const email = document.getElementById('email').value.trim();
    const verificationCode = document.getElementById('verificationCode').value.trim();
    
    let isValid = true;
    
    // Validate phone number (basic validation)
    if (phoneNumber === '' || phoneNumber.length < 8) {
      document.getElementById('phoneNumber-error').style.display = 'block';
      isValid = false;
    } else {
      document.getElementById('phoneNumber-error').style.display = 'none';
    }
    
    // Validate address
    if (address === '') {
      document.getElementById('address-error').style.display = 'block';
      isValid = false;
    } else {
      document.getElementById('address-error').style.display = 'none';
    }
    
    // Validate email (using existing validateEmail function)
    if (!validateEmail(email)) {
      document.getElementById('email-error').style.display = 'block';
      isValid = false;
    } else {
      document.getElementById('email-error').style.display = 'none';
    }
    
    // Validate verification code
    if (verificationCode === '') {
      document.getElementById('verificationCode-error').style.display = 'block';
      isValid = false;
    } else {
      document.getElementById('verificationCode-error').style.display = 'none';
    }
    
    // If all fields are valid, move to step 3
    if (isValid) {
      step2.classList.remove('active');
      step3.classList.add('active');
      stepIndicator2.classList.remove('active');
      stepIndicator2.classList.add('completed');
      stepIndicator3.classList.add('active');
      connector23.classList.add('active');
    }
  });
  
  // Step 3 back button
  step3Back.addEventListener('click', function() {
    step3.classList.remove('active');
    step2.classList.add('active');
    stepIndicator3.classList.remove('active');
    stepIndicator2.classList.remove('completed');
    stepIndicator2.classList.add('active');
    connector23.classList.remove('active');
  });
  
  // Password live validation
  document.getElementById('confirmPassword').addEventListener('input', function() {
    const password = document.getElementById('password').value;
    const confirmPassword = this.value;
    
    if (password !== confirmPassword) {
      document.getElementById('confirmPassword-error').style.display = 'block';
    } else {
      document.getElementById('confirmPassword-error').style.display = 'none';
    }
  });
  
  document.getElementById('password').addEventListener('input', function() {
    const password = this.value;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    
    if (!passwordRegex.test(password)) {
      document.getElementById('password-error').style.display = 'block';
    } else {
      document.getElementById('password-error').style.display = 'none';
      
      // Also check confirm password match if it has a value
      const confirmPassword = document.getElementById('confirmPassword').value;
      if (confirmPassword) {
        if (password !== confirmPassword) {
          document.getElementById('confirmPassword-error').style.display = 'block';
        } else {
          document.getElementById('confirmPassword-error').style.display = 'none';
        }
      }
    }
  });
});