// Arduino code for ESP32 soil moisture sensor
export const arduinoCode = `
#include <WiFi.h>
#include <HTTPClient.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server endpoint (update with your actual server URL)
const char* serverUrl = "http://YOUR_SERVER_IP:3000/api/soil-moisture/ingest";

// Soil moisture sensor pin
const int soilMoisturePin = 34; // Analog pin (ADC1)

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Connect to WiFi
  Serial.println();
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Read soil moisture sensor
  int soilMoistureValue = analogRead(soilMoisturePin);

  // Print to serial monitor
  Serial.print("Soil Moisture Raw Value: ");
  Serial.println(soilMoistureValue);

  // Send data to server
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Create JSON payload
    String jsonPayload = "{\\"value\\":" + String(soilMoistureValue) + "}";

    // Send POST request
    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("Server Response: ");
      Serial.println(response);
    } else {
      Serial.print("Error sending data. HTTP Code: ");
      Serial.println(httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.reconnect();
  }

  // Wait 1 second before next reading
  delay(1000);
}
`;
