import React, { useEffect, useState, useRef } from "react";
import Chart from "./Chart";
import { runLoadTest } from "./loadTest";

type LogLine = string;

interface DashboardStats {
  errorCount: number;
  infoCount: number;
  lastAnomaly?: string;
}

interface SensorMetrics {
  processing_ms: number;
  cpu_usage_before: number;
  cpu_usage_after: number;
  ram_used_before_kb: number;
  ram_used_after_kb: number;
}

interface SeqSensorMetrics {
  processing_ms: number;
}

const parseDashboardStats = (logs: LogLine[]): DashboardStats => {
  let errorCount = 0;
  let infoCount = 0;
  let lastAnomaly: string | undefined = undefined;
  logs.forEach((line) => {
    if (line.includes("ERROR")) errorCount++;
    if (line.includes("INFO")) infoCount++;
    if (line.includes("Anomalia global detectada")) lastAnomaly = line;
  });
  return { errorCount, infoCount, lastAnomaly };
};

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    errorCount: 0,
    infoCount: 0,
  });
  const [metrics, setMetrics] = useState<SensorMetrics | null>(null);
  const [seqMetrics, setSeqMetrics] = useState<SeqSensorMetrics | null>(null);
  const [parallelTest, setParallelTest] = useState<{ times: number[]; backendTimes: number[] } | null>(null);
  const [seqTest, setSeqTest] = useState<{ times: number[]; backendTimes: number[] } | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const wsRef = useRef<WebSocket | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch("http://localhost:8090/logs");
      const data = await res.json();
      setLogs(data);
      setStats(parseDashboardStats(data));
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
      setLogs(["Erro ao buscar logs do backend."]);
      setStats({ errorCount: 0, infoCount: 0 });
    }
  };

  // Exemplo de envio de atualização de sensor para obter métricas
  const sendSensorUpdate = async () => {
    const now = Date.now();
    const payload = {
      id: "frontend_test",
      value: Math.random() * 100,
      sensor_type: "Frontend",
      timestamp: Math.floor(now / 1000),
    };
    try {
      const res = await fetch("http://localhost:8090/sensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.processing_ms !== undefined) {
        setMetrics({
          processing_ms: data.processing_ms,
          cpu_usage_before: data.cpu_usage_before,
          cpu_usage_after: data.cpu_usage_after,
          ram_used_before_kb: data.ram_used_before_kb,
          ram_used_after_kb: data.ram_used_after_kb,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
      setMetrics(null);
    }
  };

  // Envio para endpoint sequencial
  const sendSensorUpdateSeq = async () => {
    const now = Date.now();
    const payload = {
      id: "frontend_seq_test",
      value: Math.random() * 100,
      sensor_type: "Frontend",
      timestamp: Math.floor(now / 1000),
    };
    try {
      const res = await fetch("http://localhost:8090/sensor_seq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.processing_ms !== undefined) {
        setSeqMetrics({
          processing_ms: data.processing_ms,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar logs (seq):", error);
      setSeqMetrics(null);
    }
  };

  const handleLoadTest = async (type: "parallel" | "seq") => {
    if (type === "parallel") {
      const result = await runLoadTest("http://localhost:8090/sensor", 50);
      setParallelTest(result);
    } else {
      const result = await runLoadTest("http://localhost:8090/sensor_seq", 50);
      setSeqTest(result);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);

    // WebSocket para logs em tempo real
    const ws = new WebSocket("ws://localhost:8090/ws/logs");
    wsRef.current = ws;
    ws.onmessage = (event) => {
      setLogs((prev) => {
        const newLogs = [...prev, event.data];
        // Mantém só os últimos 200 logs
        return newLogs.slice(-200);
      });
      setStats(() => parseDashboardStats([...logs, event.data]));
    };

    return () => {
      clearInterval(interval);
      ws.close();
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    document.body.style.background = theme === "dark" ? "#222" : "#f7f7f7";
    document.body.style.color = theme === "dark" ? "#eee" : "#222";
  }, [theme]);

  return (
    <div
      style={{
        background: theme === "dark" ? "#222" : "#f7f7f7",
        color: theme === "dark" ? "#eee" : "#222",
        minHeight: "100vh",
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100vw",
        boxSizing: "border-box",
        padding: "32px 0",
        transition: "background 0.3s, color 0.3s",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            style={{
              background: theme === "dark" ? "#333" : "#ddd",
              color: theme === "dark" ? "#eee" : "#222",
              border: "1px solid #888",
              borderRadius: 8,
              padding: "6px 18px",
              marginBottom: 8,
              cursor: "pointer",
              fontWeight: 600,
              transition: "background 0.3s, color 0.3s",
            }}
          >
            {theme === "dark" ? "🌞 Tema Claro" : "🌙 Tema Escuro"}
          </button>
        </div>
        <h1
          style={{ textAlign: "center", fontSize: "2.8rem", marginBottom: 0 }}
        >
          IoT Actor Dashboard
        </h1>
        <section
          style={{
            width: "100%",
            maxWidth: 1200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: theme === "dark" ? "#111" : "#fff",
              borderRadius: 16,
              boxShadow: theme === "dark" ? "0 2px 16px #0004" : "0 2px 16px #bbb4",
              border: theme === "dark" ? "none" : "1px solid #ddd",
              padding: 32,
              marginBottom: 24,
              width: "100%",
              maxWidth: 900,
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "background 0.3s, color 0.3s",
            }}
          >
            <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: 24 }}>
              Dashboard
            </h2>
            <div style={{ marginBottom: 16, fontSize: "1.2rem" }}>
              Errors: <span style={{ color: "#ff6b6b" }}>{stats.errorCount}</span>
            </div>
            <div style={{ marginBottom: 16, fontSize: "1.2rem" }}>
              Infos: <span style={{ color: "#4ecdc4" }}>{stats.infoCount}</span>
            </div>
            <div style={{ fontSize: "1.2rem" }}>
              Última Anomalia:{" "}
              <span style={{ color: "#ffd166" }}>
                {stats.lastAnomaly || "Nenhuma"}
              </span>
            </div>
          </div>
        </section>
        <section
          style={{
            width: "100%",
            maxWidth: 1200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: theme === "dark" ? "#111" : "#fff",
              borderRadius: 16,
              boxShadow: theme === "dark" ? "0 2px 16px #0004" : "0 2px 16px #bbb4",
              border: theme === "dark" ? "none" : "1px solid #ddd",
              padding: 32,
              marginBottom: 24,
              width: "100%",
              maxWidth: 900,
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "background 0.3s, color 0.3s",
            }}
          >
            <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: 24 }}>
              Métricas de Processamento
            </h2>
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "row",
                gap: 24,
                justifyContent: "center",
                alignItems: "stretch",
                flexWrap: "wrap",
              }}
            >
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                flex: 1,
                minWidth: 320,
                maxWidth: 420,
                justifyContent: "stretch"
              }}>
                <button
                  style={{
                    fontSize: "1rem",
                    padding: "8px 16px",
                    marginBottom: 8,
                    background: theme === "dark" ? "#222" : "#eee",
                    color: theme === "dark" ? "#eee" : "#222",
                    border: "1px solid #888",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.3s, color 0.3s",
                  }}
                  onClick={sendSensorUpdate}
                >
                  Enviar atualização de sensor (paralelo)
                </button>
                <div
                  style={{
                    background: theme === "dark" ? "#222" : "#f7f7f7",
                    padding: 16,
                    borderRadius: 8,
                    minHeight: 120,
                    fontSize: "1.05rem",
                    boxShadow: theme === "dark" ? "0 2px 8px #0002" : "0 2px 8px #bbb2",
                    border: theme === "dark" ? "none" : "1px solid #eee",
                    color: theme === "dark" ? "#eee" : "#222",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    height: "100%",
                  }}
                >
                  <div>
                    <b>Paralelo:</b>
                  </div>
                  {metrics ? (
                    <>
                      <div>
                        Tempo de resposta: <b>{metrics.processing_ms} ms</b>
                      </div>
                      <div>
                        CPU antes: <b>{metrics.cpu_usage_before.toFixed(2)}%</b>
                      </div>
                      <div>
                        CPU depois: <b>{metrics.cpu_usage_after.toFixed(2)}%</b>
                      </div>
                      <div>
                        RAM antes: <b>{metrics.ram_used_before_kb} KB</b>
                      </div>
                      <div>
                        RAM depois: <b>{metrics.ram_used_after_kb} KB</b>
                      </div>
                    </>
                  ) : (
                    <div style={{ opacity: 0.5 }}>Sem dados</div>
                  )}
                </div>
              </div>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                flex: 1,
                minWidth: 320,
                maxWidth: 420,
                justifyContent: "stretch"
              }}>
                <button
                  style={{
                    fontSize: "1rem",
                    padding: "8px 16px",
                    marginBottom: 8,
                    background: theme === "dark" ? "#222" : "#eee",
                    color: theme === "dark" ? "#eee" : "#222",
                    border: "1px solid #888",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.3s, color 0.3s",
                  }}
                  onClick={sendSensorUpdateSeq}
                >
                  Enviar atualização de sensor (sequencial)
                </button>
                <div
                  style={{
                    background: theme === "dark" ? "#222" : "#f7f7f7",
                    padding: 16,
                    borderRadius: 8,
                    minHeight: 120,
                    fontSize: "1.05rem",
                    boxShadow: theme === "dark" ? "0 2px 8px #0002" : "0 2px 8px #bbb2",
                    border: theme === "dark" ? "none" : "1px solid #eee",
                    color: theme === "dark" ? "#eee" : "#222",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    height: "100%",
                  }}
                >
                  <div>
                    <b>Sequencial:</b>
                  </div>
                  {seqMetrics ? (
                    <div>
                      Tempo de resposta: <b>{seqMetrics.processing_ms} ms</b>
                    </div>
                  ) : (
                    <div style={{ opacity: 0.5 }}>Sem dados</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        <section
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 24,
            justifyContent: "center",
            width: "100%",
            flexWrap: "wrap"
          }}
        >
          <div style={{
            flex: 1,
            minWidth: 350,
            maxWidth: 600,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: theme === "dark" ? "#111" : "#fff",
            borderRadius: 16,
            boxShadow: theme === "dark" ? "0 2px 16px #0004" : "0 2px 16px #bbb4",
            border: theme === "dark" ? "none" : "1px solid #ddd",
            paddingBottom: 16,
            transition: "background 0.3s, color 0.3s",
          }}>
            <h2 style={{ textAlign: "center", fontSize: "1.5rem", width: "100%" }}>
              Teste de Carga (Paralelo)
            </h2>
            <button
              style={{
                fontSize: "1rem",
                padding: "8px 16px",
                marginBottom: 16,
                display: "block",
                marginLeft: "auto",
                marginRight: "auto"
              }}
              onClick={() => handleLoadTest("parallel")}
            >
              Rodar teste de carga (paralelo)
            </button>
            {parallelTest && (
              <>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Chart title="Paralelo - Tempo de resposta (frontend)" data={parallelTest.times} color="#4ecdc4" />
                  <Chart title="Paralelo - processing_ms (backend)" data={parallelTest.backendTimes} color="#ffd166" />
                </div>
              </>
            )}
          </div>
          <div style={{
            flex: 1,
            minWidth: 350,
            maxWidth: 600,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: theme === "dark" ? "#111" : "#fff",
            borderRadius: 16,
            boxShadow: theme === "dark" ? "0 2px 16px #0004" : "0 2px 16px #bbb4",
            border: theme === "dark" ? "none" : "1px solid #ddd",
            paddingBottom: 16,
            transition: "background 0.3s, color 0.3s",
          }}>
            <h2 style={{ textAlign: "center", fontSize: "1.5rem", width: "100%" }}>
              Teste de Carga (Sequencial)
            </h2>
            <button
              style={{
                fontSize: "1rem",
                padding: "8px 16px",
                marginBottom: 16,
                display: "block",
                marginLeft: "auto",
                marginRight: "auto"
              }}
              onClick={() => handleLoadTest("seq")}
            >
              Rodar teste de carga (sequencial)
            </button>
            {seqTest && (
              <>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Chart title="Sequencial - Tempo de resposta (frontend)" data={seqTest.times} color="#ff6b6b" />
                  <Chart title="Sequencial - processing_ms (backend)" data={seqTest.backendTimes} color="#888" />
                </div>
              </>
            )}
          </div>
        </section>
        <section
          style={{
            width: "100%",
            maxWidth: 1200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: theme === "dark" ? "#111" : "#fff",
              borderRadius: 16,
              boxShadow: theme === "dark" ? "0 2px 16px #0004" : "0 2px 16px #bbb4",
              border: theme === "dark" ? "none" : "1px solid #ddd",
              padding: 32,
              marginBottom: 24,
              width: "100%",
              maxWidth: 900,
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "background 0.3s, color 0.3s",
            }}
          >
            <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: 24 }}>
              Logs em tempo real (WebSocket)
            </h2>
            <div
              style={{
                whiteSpace: "pre-wrap",
                background: theme === "dark" ? "#111" : "#fff",
                padding: 20,
                borderRadius: 12,
                maxHeight: "60vh",
                overflowY: "auto",
                width: "100%",
                minWidth: 0,
                maxWidth: 1200,
                boxSizing: "border-box",
                fontSize: "1.05rem",
                boxShadow: theme === "dark" ? "0 2px 16px #0004" : "0 2px 16px #bbb4",
                border: theme === "dark" ? "none" : "1px solid #ddd",
                transition: "background 0.3s, color 0.3s",
              }}
            >
              {logs.map((line, idx) => {
                if (line.includes("ERROR"))
                  return (
                    <div key={idx} style={{ color: "#ff6b6b" }}>
                      {line}
                    </div>
                  );
                if (line.includes("INFO"))
                  return (
                    <div key={idx} style={{ color: "#4ecdc4" }}>
                      {line}
                    </div>
                  );
                return <div key={idx}>{line}</div>;
              })}
            </div>
          </div>
        </section>
      </div>
      <style>
        {`
          @media (max-width: 900px) {
            h1 { font-size: 2rem !important; }
            section { padding: 16px !important; }
            .logs, .dashboard { max-width: 98vw !important; }
          }
          @media (max-width: 600px) {
            h1 { font-size: 1.3rem !important; }
            section { padding: 8px !important; }
            .logs, .dashboard { max-width: 100vw !important; }
          }
        `}
      </style>
    </div>
  );
};

export default App;
