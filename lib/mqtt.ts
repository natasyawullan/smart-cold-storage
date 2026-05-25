import mqtt from 'mqtt';

// Pakai port 8884 (WebSocket Secure resmi HiveMQ Cloud)
const MQTT_HOST = 'wss://d7e6624c76994e888868849f933dee67.s1.eu.hivemq.cloud:8884/mqtt';

export const connectMQTT = () => {
  const client = mqtt.connect(MQTT_HOST, {
    username: 'cedepastibisa', 
    password: '@Kelompok07', // <-- GUA SAMAKAN DENGAN CODINGAN ESP32 LU!
    clean: true,
    connectTimeout: 5000,
    reconnectPeriod: 1000,
    path: '/mqtt',
    rejectUnauthorized: false // <-- MEMAKSA BROWSER TEMBUS BLOKIRAN SSL WINDOWS
  });

  return client;
};