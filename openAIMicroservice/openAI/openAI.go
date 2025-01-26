package openAI

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

type TTSRequest struct {
	Model string `json:"model"`
	Voice string `json:"voice"`
	Input string `json:"input"`
}

type TTSResponse struct {
	AudioURL string `json:"audio_url"`
}

func init() {
	// Load environment variables
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}
}

func CallTTSModel(inputText string) ([]byte, error) {
	log.Println("Entering CallTTSModel...")

	apiKey := os.Getenv("OPENAI_APIKEY")
	if apiKey == "" {
		log.Println("OPENAI_APIKEY is not set.")
		return nil, fmt.Errorf("OPENAI_APIKEY environment variable is not set")
	}

	log.Printf("Preparing request for TTS with input: %s\n", inputText)
	ttsRequest := TTSRequest{
		Model: "tts-1",
		Voice: "alloy",
		Input: inputText,
	}

	requestBody, err := json.Marshal(ttsRequest)
	if err != nil {
		log.Printf("Error marshaling request body: %v\n", err)
		return nil, fmt.Errorf("error marshaling request body: %v", err)
	}
	log.Printf("Request body prepared: %s\n", string(requestBody))

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/audio/speech", bytes.NewBuffer(requestBody))
	if err != nil {
		log.Printf("Error creating request: %v\n", err)
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	log.Println("Request headers set successfully.")

	client := &http.Client{}
	log.Println("Sending request to OpenAI API...")
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending request: %v\n", err)
		return nil, fmt.Errorf("error sending request: %v", err)
	}
	defer resp.Body.Close()

	log.Printf("Response received with status code: %d\n", resp.StatusCode)
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := ioutil.ReadAll(resp.Body)
		log.Printf("API returned error: %s\n", string(bodyBytes))
		return nil, fmt.Errorf("API returned error: %s", string(bodyBytes))
	}

	// Read the raw binary data from the response body
	audioData, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading audio data: %v\n", err)
		return nil, fmt.Errorf("error reading audio data: %v", err)
	}

	log.Println("Audio data received successfully.")
	return audioData, nil
}

func GenerateSpeech(w http.ResponseWriter, r *http.Request) {
	log.Println("Entering GenerateSpeech...")

	var requestData struct {
		InputText      string `json:"input_text"`
		TargetLanguage string `json:"target_language"` // Add target language for translation
	}

	log.Println("Decoding incoming request body...")
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		log.Printf("Error decoding request body: %v\n", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}
	log.Printf("Request data received: %+v\n", requestData)

	// Call TranslateText function to translate the input text
	translatedText, err := TranslateText(requestData.TargetLanguage, requestData.InputText)
	if err != nil {
		log.Printf("Error translating text: %v\n", err)
		http.Error(w, "Failed to translate text", http.StatusInternalServerError)
		return
	}

	log.Printf("Translated text: %s\n", translatedText)

	log.Println("Calling CallTTSModel with translated text...")
	audioData, err := CallTTSModel(translatedText)
	if err != nil {
		log.Printf("Error generating speech: %v\n", err)
		http.Error(w, "Failed to generate speech", http.StatusInternalServerError)
		return
	}

	log.Println("Sending audio data back to client...")
	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Content-Disposition", "inline; filename=\"output.mp3\"")
	w.WriteHeader(http.StatusOK)

	// Write the raw binary audio data to the response
	_, err = w.Write(audioData)
	if err != nil {
		log.Printf("Error writing audio data to response: %v\n", err)
		http.Error(w, "Failed to send audio data", http.StatusInternalServerError)
	}
	log.Println("Exiting GenerateSpeech...")
}


type GPT4oRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type GPT4oResponse struct {
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func CallGPT4oMini(prompt string) (string, error) {
	log.Println("Entering CallGPT4oMini...")

	apiKey := os.Getenv("OPENAI_APIKEY")
	if apiKey == "" {
		log.Println("OPENAI_APIKEY is not set.")
		return "", fmt.Errorf("OPENAI_APIKEY environment variable is not set")
	}

	log.Printf("Preparing request for GPT-4o-mini with prompt: %s\n", prompt)
	gptRequest := GPT4oRequest{
		Model: "gpt-4o",
		Messages: []Message{
			{Role: "developer", Content: "You are a helpful assistant."},
			{Role: "user", Content: prompt},
		},
	}

	requestBody, err := json.Marshal(gptRequest)
	if err != nil {
		log.Printf("Error marshaling request body: %v\n", err)
		return "", fmt.Errorf("error marshaling request body: %v", err)
	}
	log.Printf("Request body prepared: %s\n", string(requestBody))

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(requestBody))
	if err != nil {
		log.Printf("Error creating request: %v\n", err)
		return "", fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	log.Println("Request headers set successfully.")

	client := &http.Client{}
	log.Println("Sending request to OpenAI API...")
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending request: %v\n", err)
		return "", fmt.Errorf("error sending request: %v", err)
	}
	defer resp.Body.Close()

	log.Printf("Response received with status code: %d\n", resp.StatusCode)
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := ioutil.ReadAll(resp.Body)
		log.Printf("API returned error: %s\n", string(bodyBytes))
		return "", fmt.Errorf("API returned error: %s", string(bodyBytes))
	}

	responseData, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response data: %v\n", err)
		return "", fmt.Errorf("error reading response data: %v", err)
	}

	var gptResponse GPT4oResponse
	if err := json.Unmarshal(responseData, &gptResponse); err != nil {
		log.Printf("Error unmarshaling response data: %v\n", err)
		return "", fmt.Errorf("error unmarshaling response data: %v", err)
	}

	log.Println("Response data unmarshaled successfully.")
	if len(gptResponse.Choices) == 0 || gptResponse.Choices[0].Message.Content == "" {
		return "", fmt.Errorf("no content returned in the response")
	}

	result := gptResponse.Choices[0].Message.Content
	log.Printf("GPT-4o-mini response: %s\n", result)
	return result, nil
}

func GenerateResponse(w http.ResponseWriter, r *http.Request) {
	log.Println("Entering GenerateResponse...")

	var requestData struct {
		Prompt string `json:"prompt"`
	}

	log.Println("Decoding incoming request body...")
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		log.Printf("Error decoding request body: %v\n", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}
	log.Printf("Request data received: %+v\n", requestData)

	log.Println("Calling CallGPT4oMini...")
	response, err := CallGPT4oMini(requestData.Prompt)
	if err != nil {
		log.Printf("Error generating response: %v\n", err)
		http.Error(w, "Failed to generate response", http.StatusInternalServerError)
		return
	}

	log.Println("Sending response back to client...")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	responseBody := map[string]string{"response": response}
	if err := json.NewEncoder(w).Encode(responseBody); err != nil {
		log.Printf("Error writing response to client: %v\n", err)
		http.Error(w, "Failed to send response", http.StatusInternalServerError)
	}

	log.Println("Exiting GenerateResponse...")
}

func TranslateText(targetLanguage, inputText string) (string, error) {
	log.Println("Entering TranslateText...")

	apiKey := os.Getenv("OPENAI_APIKEY")
	if apiKey == "" {
		log.Println("OPENAI_APIKEY is not set.")
		return "", fmt.Errorf("OPENAI_APIKEY environment variable is not set")
	}

	prompt := fmt.Sprintf("Translate the following text to %s: %s", targetLanguage, inputText)
	log.Printf("Preparing request for GPT-4o-mini with prompt: %s\n", prompt)
	gptRequest := GPT4oRequest{
		Model: "gpt-4o",
		Messages: []Message{
			{Role: "developer", Content: "You are a helpful assistant."},
			{Role: "user", Content: prompt},
		},
	}

	requestBody, err := json.Marshal(gptRequest)
	if err != nil {
		log.Printf("Error marshaling request body: %v\n", err)
		return "", fmt.Errorf("error marshaling request body: %v", err)
	}
	log.Printf("Request body prepared: %s\n", string(requestBody))

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(requestBody))
	if err != nil {
		log.Printf("Error creating request: %v\n", err)
		return "", fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	log.Println("Request headers set successfully.")

	client := &http.Client{}
	log.Println("Sending request to OpenAI API...")
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending request: %v\n", err)
		return "", fmt.Errorf("error sending request: %v", err)
	}
	defer resp.Body.Close()

	log.Printf("Response received with status code: %d\n", resp.StatusCode)
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := ioutil.ReadAll(resp.Body)
		log.Printf("API returned error: %s\n", string(bodyBytes))
		return "", fmt.Errorf("API returned error: %s", string(bodyBytes))
	}

	responseData, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response data: %v\n", err)
		return "", fmt.Errorf("error reading response data: %v", err)
	}

	var gptResponse GPT4oResponse
	if err := json.Unmarshal(responseData, &gptResponse); err != nil {
		log.Printf("Error unmarshaling response data: %v\n", err)
		return "", fmt.Errorf("error unmarshaling response data: %v", err)
	}

	log.Println("Response data unmarshaled successfully.")
	if len(gptResponse.Choices) == 0 || gptResponse.Choices[0].Message.Content == "" {
		return "", fmt.Errorf("no content returned in the response")
	}

	result := gptResponse.Choices[0].Message.Content
	log.Printf("GPT-4o-mini response: %s\n", result)
	return result, nil
}

func GenerateTranslation(w http.ResponseWriter, r *http.Request) {
	log.Println("Entering GenerateTranslation...")

	var requestData struct {
		TargetLanguage string `json:"target_language"`
		InputText      string `json:"input_text"`
	}

	log.Println("Decoding incoming request body...")
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		log.Printf("Error decoding request body: %v\n", err)
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}
	log.Printf("Request data received: %+v\n", requestData)

	log.Println("Calling TranslateText...")
	response, err := TranslateText(requestData.TargetLanguage, requestData.InputText)
	if err != nil {
		log.Printf("Error generating translation: %v\n", err)
		http.Error(w, "Failed to generate translation", http.StatusInternalServerError)
		return
	}

	log.Println("Sending response back to client...")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	responseBody := map[string]string{"translation": response}
	if err := json.NewEncoder(w).Encode(responseBody); err != nil {
		log.Printf("Error writing response to client: %v\n", err)
		http.Error(w, "Failed to send response", http.StatusInternalServerError)
	}

	log.Println("Exiting GenerateTranslation...")
}