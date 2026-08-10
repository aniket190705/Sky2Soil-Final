const DB_NAME = "Sky2SoilDB";
const DB_VERSION = 1;

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(new Error("IndexedDB failed to open: " + event.target.error));
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store sensor readings by received timestamp
      if (!db.objectStoreNames.contains("sensorReadings")) {
        db.createObjectStore("sensorReadings", { keyPath: "receivedAt" });
      }
    };
  });
}

export async function saveSensorReading(reading) {
  if (!reading || !reading.receivedAt) {
    return;
  }
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["sensorReadings"], "readwrite");
    const store = transaction.objectStore("sensorReadings");
    const request = store.put(reading);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function getLatestSensorReading() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["sensorReadings"], "readonly");
    const store = transaction.objectStore("sensorReadings");
    const request = store.openCursor(null, "prev"); // Fetch newest reading first

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        resolve(cursor.value);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getSensorReadingsHistory() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["sensorReadings"], "readonly");
    const store = transaction.objectStore("sensorReadings");
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort history entries by receivedAt ascending
      const results = request.result || [];
      results.sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}
