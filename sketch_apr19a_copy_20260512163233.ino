const int SENSOR_PIN = 14; 
const int LED_RED = 27;
const int BUZZER = 26;

int lastState = -1;

void setup() {
  pinMode(SENSOR_PIN, INPUT_PULLUP);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  digitalWrite(LED_RED, LOW);
  digitalWrite(BUZZER, LOW);

  Serial.begin(115200);
}

void loop() {
  int sensorState = digitalRead(SENSOR_PIN);

  if (sensorState != lastState) {
    lastState = sensorState;

    if (sensorState == HIGH) {
      Serial.println("OPEN");
    } else {
      Serial.println("CLOSED");
    }
  }

  if (sensorState == HIGH) {
    digitalWrite(LED_RED, HIGH);
    digitalWrite(BUZZER, HIGH);  
  } else {
    digitalWrite(LED_RED, LOW);
    digitalWrite(BUZZER, LOW);
  }

  delay(50);
}