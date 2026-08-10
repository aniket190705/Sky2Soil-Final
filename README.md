# SkyToSoil Agricultural Intelligence Platform

An integrated IoT-enabled agricultural intelligence platform that connects real-time soil/weather sensors (from ESP32) to a Node.js/Express backend, executes machine learning models in Python to predict crop yields, and visualizes field analytics on a React dashboard.

The ML models, backend APIs, and frontend panels have been streamlined to use exactly 4 features for predictions:
* **Temperature**
* **Humidity**
* **Soil Moisture**
* **Crop Type**

Other fields (rainfall, nutrients, and wind speed) have been removed from the prediction interface, backend validation, and model inputs to simplify operation.

---

## 1. Prerequisites
Make sure you have the following installed:
* [Node.js](https://nodejs.org/) (v16+)
* [Python 3.12](https://www.python.org/) with these packages:
  * `pandas`
  * `numpy`
  * `joblib`
  * `scikit-learn`
  * `xgboost`

---

## 2. Setup & Execution

### Step 1: Start the Backend Server
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd "sky2soil backend/backend"
   ```
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`.

### Step 2: Start the Frontend App
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd "sky2soil-final-frontend"
   ```
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 3. Connecting the ESP32 Hardware
1. Open the file `esp32_code/esp32_code.ino` in the Arduino IDE.
2. Update the `ssid` and `password` variables to match your Wi-Fi credentials.
3. Update `serverURL` to target your laptop's local IP address on your network:
   ```cpp
   const char* serverURL = "http://<YOUR_LAPTOP_IP>:5000/api/sensor";
   ```
4. Upload the code to your ESP32 board.
5. Once connected, your ESP32 will periodically send sensor readings. You'll see the dashboard dynamically switch from "Demo Fallback" to "Live API" mode.
# Sky2Soil
