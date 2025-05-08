// AttendEase ESP8266 Beacon
// Emulates a Bluetooth beacon using WiFi

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <ArduinoJson.h>

// Configuration
const char* BEACON_SSID = "AttendEase-Beacon";  // Name that will appear in the list
const char* PASSWORD = "attendance123";         // WiFi password or empty for open network
const int LED_PIN = LED_BUILTIN;                // Built-in LED for status indication
String BEACON_ID = "ROOM-001";                  // Default room ID (will be updated with mac address)

ESP8266WebServer server(80);
unsigned long startTime = 0;
int clientCount = 0;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH); // ESP8266 LED is active LOW
  
  // Generate beacon ID from MAC address
  uint8_t mac[6];
  WiFi.macAddress(mac);
  BEACON_ID = String("ROOM-") + 
             String(mac[3], HEX) + 
             String(mac[4], HEX) + 
             String(mac[5], HEX);
  
  Serial.println("\n\n-------------------------------------");
  Serial.println("AttendEase Attendance Beacon Starting");
  Serial.println("-------------------------------------");
  
  // Set up WiFi access point
  WiFi.softAP(BEACON_SSID, PASSWORD);
  
  IPAddress myIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(myIP);
  Serial.print("SSID: ");
  Serial.println(BEACON_SSID);
  Serial.print("Beacon ID: ");
  Serial.println(BEACON_ID);
  
  // Setup MDNS responder
  if (MDNS.begin("attendease")) {
    Serial.println("MDNS responder started");
    MDNS.addService("http", "tcp", 80);
  }
  
  // Setup server routes
  server.on("/", handleRoot);
  server.on("/api/beacon-info", HTTP_GET, handleBeaconInfo);
  server.on("/api/ping", HTTP_GET, handlePing);
  server.onNotFound(handleNotFound);
  
  server.begin();
  Serial.println("HTTP server started");
  startTime = millis();
  
  // Flash LED to indicate successful setup
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, LOW);   // Turn on LED
    delay(200);
    digitalWrite(LED_PIN, HIGH);  // Turn off LED
    delay(200);
  }
}

void loop() {
  server.handleClient();
  MDNS.update();
  
  // Get connected client count
  int newClientCount = WiFi.softAPgetStationNum();
  if (newClientCount != clientCount) {
    clientCount = newClientCount;
    Serial.print("Connected clients: ");
    Serial.println(clientCount);
    
    // Flash LED when client connects/disconnects
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
  }
  
  // Heartbeat LED blink every 3 seconds
  if (millis() % 3000 < 100) {
    digitalWrite(LED_PIN, LOW);
  } else if (millis() % 3000 < 200) {
    digitalWrite(LED_PIN, HIGH);
  }
}

// Root page with HTML status
void handleRoot() {
  String html = "<html><head><title>AttendEase Beacon</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial,sans-serif;margin:20px;text-align:center;}";
  html += "h1{color:#3498db;}div{background:#f1f5f9;padding:15px;border-radius:5px;margin:10px auto;max-width:600px;}";
  html += "p{margin:10px 0;}</style></head><body>";
  html += "<h1>AttendEase Classroom Beacon</h1>";
  html += "<div><p><strong>Status:</strong> Active</p>";
  html += "<p><strong>Beacon ID:</strong> " + BEACON_ID + "</p>";
  html += "<p><strong>Connected clients:</strong> " + String(clientCount) + "</p>";
  html += "<p><strong>Uptime:</strong> " + String(millis() / 1000) + " seconds</p></div>";
  html += "</body></html>";
  
  server.send(200, "text/html", html);
}

// API endpoint to get beacon info
void handleBeaconInfo() {
  DynamicJsonDocument doc(1024);
  
  doc["beaconId"] = BEACON_ID;
  doc["name"] = BEACON_SSID;
  doc["type"] = "classroom";
  doc["uptime"] = millis() / 1000;
  
  String response;
  serializeJson(doc, response);
  
  server.send(200, "application/json", response);
  
  // Blink LED to indicate API call
  digitalWrite(LED_PIN, LOW);
  delay(50);
  digitalWrite(LED_PIN, HIGH);
}

// Simple ping endpoint for detection
void handlePing() {
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// 404 Not Found
void handleNotFound() {
  server.send(404, "text/plain", "Not found");
}