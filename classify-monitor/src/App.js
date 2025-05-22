import { useEffect, useState } from "react";
import "./App.css";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import WeightChart from "./WeightChart";

function App() {
  const [weight, setWeight] = useState("--");
  const [color, setColor] = useState("--");
  const [timestamp, setTimestamp] = useState("--");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const socket = new SockJS("http://localhost:8080/ws");
    const stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str),
      reconnectDelay: 0,
      onConnect: (frame) => {
        console.log("Connected: " + frame);
        stompClient.subscribe("/topic/data", (message) => {
          const data = JSON.parse(message.body);
          setWeight(data.weight);

          setColor((data.color || "").trim().toLowerCase());
          const date = new Date(data.timestamp);
          const formatted = `${date.toLocaleTimeString()} - ${date.toLocaleDateString(
            "vi-VN"
          )}`;
          setTimestamp(formatted);
        });
      },
      onStompError: (frame) => {
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
      },
    });

    stompClient.activate();

    // Lấy lịch sử cảm biến khi load trang
    fetch("http://localhost:8080/api/history")
      .then((res) => res.json())
      .then((data) => {
        console.log("Lịch sử cảm biến trả về:", data);
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Lỗi khi lấy lịch sử cảm biến:", err);
        setHistory([]);
      });

    return () => {
      stompClient.deactivate();
    };
  }, []);

  function startSystem() {
    fetch("http://localhost:8080/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
  }

  function stopSystem() {
    fetch("http://localhost:8080/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
  }

  function resetSystem() {
    fetch("http://localhost:8080/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
  }

  function toggleConveyor() {
    fetch("http://localhost:8080/api/conveyor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
  }

  return (
    <>
      <header>
        <h1>Hệ thống phân loại sản phẩm</h1>
      </header>

      <main>
        <section className="controls smart-panel">
          <h2><span role="img" aria-label="remote">🕹️</span> Điều khiển từ xa</h2>
          <div className="control-buttons">
            <button onClick={startSystem} className="start-btn smart-btn">
              <span role="img" aria-label="play">▶️</span> Bắt đầu
            </button>
            <button onClick={stopSystem} className="stop-btn smart-btn">
              <span role="img" aria-label="stop">⏹️</span> Dừng
            </button>
            <button onClick={resetSystem} className="reset-btn smart-btn">
              <span role="img" aria-label="reset">🔄</span> Đặt lại
            </button>
          </div>
          <div className="conveyor-control">
            <h3><span role="img" aria-label="conveyor">🛤️</span> Điều khiển băng tải</h3>
            <button onClick={toggleConveyor} className="conveyor-btn smart-btn">
              <span role="img" aria-label="conveyor-toggle">🔁</span> Bật/Tắt băng tải
            </button>
          </div>
        </section>

        <section className="realtime">
          <h2>Dữ liệu thời gian thực</h2>
          <div id="alert" className="alert">
            Cảnh báo: Dữ liệu bất thường!
          </div>
          <div className="card-grid">
            <div className="card">
              <h3>Khối lượng (g)</h3>
              <p id="weight">{weight}</p>
            </div>
            <div
              className="card"
              style={{
                backgroundColor:
                  color === "red" ? "red" : color === "green" ? "green" : "#eee",
                color: color === "red" || color === "green" ? "white" : "black",
              }}
            >
              <h3>Màu sắc</h3>
              <p id="color">
                {color === "--" || !color ? "Không xác định" : color}
              </p>
            </div>
            <div className="card">
              <h3>Thời gian</h3>
              <p id="timestamp">{timestamp}</p>
            </div>
          </div>
        </section>

        <section className="visualization">
          <h2>Trực quan hóa dữ liệu</h2>
          <WeightChart history={history} />
        </section>

        <section className="history">
          <h2>Lịch sử cảm biến</h2>
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Khối lượng (g)</th>
                <th>Màu sắc</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody id="historyTable">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="4">Không có dữ liệu</td>
                </tr>
              ) : (
                history.map((item, idx) => {
                  // Xử lý timestamp: thêm 'Z' nếu thiếu để đảm bảo new Date hoạt động đúng
                  let ts = item.timestamp;
                  if (typeof ts === "string" && !ts.endsWith("Z")) ts = ts + "Z";
                  const dateObj = new Date(ts);
                  return (
                    <tr key={idx}>
                      <td>
                        {dateObj.toLocaleTimeString()} -{" "}
                        {dateObj.toLocaleDateString("vi-VN")}
                      </td>
                      <td>{item.weight}</td>
                      <td
                        className="color-cell"
                        style={{
                          backgroundColor:
                            (item.color || "").trim().toLowerCase() === "red"
                              ? "red"
                              : (item.color || "").trim().toLowerCase() === "green"
                              ? "green"
                              : "#eee",
                          color:
                            (item.color || "").trim().toLowerCase() === "red" ||
                            (item.color || "").trim().toLowerCase() === "green"
                              ? "white"
                              : "black",
                          border: "1px solid #ccc",
                          width: "80px",
                          textAlign: "center",
                          borderRadius: "30px",
                          fontSize: "0.95em",
                          padding: "2px 0",
                          height: "30px",
                        }}
                      >
                        {(item.color || "").trim().toLowerCase()}
                      </td>
                      <td>{item.status || "--"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </main>

      <footer>
        <p>© 2025 Hệ thống phân loại tự động</p>
      </footer>
    </>
  );
}

export default App;
