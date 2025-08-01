const ENDPOINT_PARALLEL = "http://localhost:8090/sensor";
const ENDPOINT_SEQ = "http://localhost:8090/sensor_seq";

async function sendRequest(endpoint: string, id: string) {
  const payload = {
    id,
    value: Math.random() * 100,
    sensor_type: "LoadTest",
    timestamp: Math.floor(Date.now() / 1000),
  };
  const start = performance.now();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  const elapsed = performance.now() - start;
  return { elapsed, backend: data.processing_ms };
}

export async function runLoadTest(endpoint: string, n: number) {
  const promises = [];
  for (let i = 0; i < n; i++) {
    promises.push(sendRequest(endpoint, `loadtest_${i}`));
  }
  const results = await Promise.all(promises);
  const times = results.map(r => r.elapsed);
  const backendTimes = results.map(r => r.backend);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const avgBackend = backendTimes.reduce((a, b) => a + b, 0) / backendTimes.length;
  const max = Math.max(...times);
  const min = Math.min(...times);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Requests: ${n}`);
  console.log(`Avg response time (frontend): ${avg.toFixed(2)} ms`);
  console.log(`Avg processing_ms (backend): ${avgBackend.toFixed(2)} ms`);
  console.log(`Min: ${min.toFixed(2)} ms, Max: ${max.toFixed(2)} ms`);
  return { times, backendTimes };
}

// Exemplo de uso no console:
// import { runLoadTest } from "./loadTest";
// runLoadTest("http://localhost:8090/sensor", 50);
// runLoadTest("http://localhost:8090/sensor_seq", 50);
