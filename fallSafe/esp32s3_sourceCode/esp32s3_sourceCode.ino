#include "secrets.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"
#include <Wire.h>
#include <math.h>

// AWS IoT Topics
#define AWS_IOT_PUBLISH_TOPIC   "esp32s3/pub"
#define AWS_IOT_SUBSCRIBE_TOPIC "esp32s3/sub"

// MPU9250 (GY91) I2C Address
#define MPU9250_ADDRESS 0x68

// Thresholds for detecting abrupt movements based solely on angle difference
#define ANGLE_DIFF_THRESHOLD 20.0 // Degrees (maximum allowable difference in angle between consecutive readings)

// Variables for MPU9250 data
float accelX, accelY, accelZ;
float gyroX, gyroY, gyroZ;

// Previous angle for calculating changes
float prevAngle = 0;

// AWS IoT Variables
WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

void connectAWS()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.println("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWi-Fi Connected.");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Configure WiFiClientSecure to use the AWS IoT device credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  // Connect to the MQTT broker on the AWS endpoint
  client.setServer(AWS_IOT_ENDPOINT, 8883);

  // Create a message handler
  client.setCallback(messageHandler);

  Serial.println("Connecting to AWS IoT");

  while (!client.connect(THINGNAME))
  {
    Serial.print(".");
    delay(100);
  }

  if (!client.connected())
  {
    Serial.println("AWS IoT Timeout!");
    return;
  }

  // Subscribe to a topic
  client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);

  Serial.println("AWS IoT Connected!");
}

void publishMessage(float accelX, float accelY, float accelZ, float gyroX, float gyroY, float gyroZ, float angleDiff)
{
  // Create JSON payload with raw metrics
  StaticJsonDocument<200> doc;
  doc["accelX"] = accelX;
  doc["accelY"] = accelY;
  doc["accelZ"] = accelZ;
  doc["gyroX"] = gyroX;
  doc["gyroY"] = gyroY;
  doc["gyroZ"] = gyroZ;
  doc["angleDifference"] = angleDiff;

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  // Publish to AWS IoT
  client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer);
}


void messageHandler(char* topic, byte* payload, unsigned int length)
{
  Serial.print("Incoming: ");
  Serial.println(topic);

  StaticJsonDocument<200> doc;
  deserializeJson(doc, payload);
  const char* message = doc["message"];
  Serial.println(message);
}

void initMPU9250()
{
  Wire.beginTransmission(MPU9250_ADDRESS);
  Wire.write(0x6B); // Power management register
  Wire.write(0);    // Wake up MPU9250
  Wire.endTransmission(true);
}

void readMPU9250()
{
  Wire.beginTransmission(MPU9250_ADDRESS);
  Wire.write(0x3B); // Starting register for accelerometer data
  Wire.endTransmission(false);
  Wire.requestFrom(MPU9250_ADDRESS, 14, true); // Request 14 bytes (Accel + Gyro)

  // Read accelerometer data
  accelX = (Wire.read() << 8 | Wire.read()) / 16384.0;
  accelY = (Wire.read() << 8 | Wire.read()) / 16384.0;
  accelZ = (Wire.read() << 8 | Wire.read()) / 16384.0;

  // Skip temperature data (2 bytes)
  Wire.read();
  Wire.read();

  // Read gyroscope data
  gyroX = (Wire.read() << 8 | Wire.read()) / 131.0;
  gyroY = (Wire.read() << 8 | Wire.read()) / 131.0;
  gyroZ = (Wire.read() << 8 | Wire.read()) / 131.0;
}

float calculateAngle()
{
  // Calculate tilt angle using accelerometer data
  return atan2(sqrt(accelX * accelX + accelY * accelY), accelZ) * 180.0 / M_PI;
}

void detectMovement()
{
  // Calculate the current angle
  float currentAngle = calculateAngle();
  float angleDiff = abs(currentAngle - prevAngle);

  // Determine if the movement is abrupt based solely on angle difference
  bool isAbruptMovement = (angleDiff > ANGLE_DIFF_THRESHOLD);

  // Movement type
  const char* movementType = isAbruptMovement ? "=========================== Abrupt" : "Smooth";

  // Print result to Serial Monitor
  Serial.print("Movement Type: ");
  Serial.println(movementType);
  Serial.print("Angle Difference: ");
  Serial.println(angleDiff);

  // Publish the result to AWS IoT
  publishMessage(accelX, accelY, accelZ, gyroX, gyroY, gyroZ, angleDiff);

  // Update previous angle
  prevAngle = currentAngle;
}

void setup()
{
  Serial.begin(115200);
  Wire.begin(8, 18); // SDA = GPIO8, SCL = GPIO18 (as per your connection)

  Serial.println("Initializing MPU9250...");
  initMPU9250();
  Serial.println("MPU9250 initialized successfully.");

  connectAWS();
}

void loop()
{
  // Read MPU9250 sensor data
  readMPU9250();

  // Detect movement type based solely on angle difference
  detectMovement();

  // Keep the MQTT connection alive
  client.loop();
  delay(700); // Increased delay for less frequent readings
}
