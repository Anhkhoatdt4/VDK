import {
  useEffect,
  useState,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useWebSocket } from "./useWebSocket";

const WeightChart = lazy(() => import("./WeightChart"));

function App() {
  const [weight, setWeight] = useState("--");
  const [color, setColor] = useState("--");
  const [timestamp, setTimestamp] = useState("--");
  const [fullHistory, setFullHistory] = useState([]);
  const [displayCount, setDisplayCount] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [timeRange, setTimeRange] = useState("1h");
  const [statistics, setStatistics] = useState({
    colors: {},
    statuses: {},
    allStatuses: {},
  });
  const [filterColor, setFilterColor] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });
  const [showScrollTop, setShowScrollTop] = useState(false);

  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const historyTableRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  useEffect(() => {
    const handleScroll = () => {
      if (historyTableRef.current.scrollTop > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    const tableDiv = historyTableRef.current;
    tableDiv.addEventListener("scroll", handleScroll);
    return () => tableDiv.removeEventListener("scroll", handleScroll);
  }, []);

  const { connected } = useWebSocket((data) => {
    setWeight(data.weight || "--");
    const receivedColor = (data.color || "").trim().toLowerCase();
    setColor(receivedColor);

    if (receivedColor === "blue") {
      setShowAlert(true);
    } else {
      setShowAlert(false);
    }

    const date = new Date(
      data.timestamp + (data.timestamp.endsWith("Z") ? "" : "Z")
    );
    const formatted = `${date.toLocaleTimeString()} - ${date.toLocaleDateString(
      "vi-VN"
    )}`;
    setTimestamp(formatted);

    const newRecord = {
      weight: data.weight,
      color: data.color,
      timestamp: data.timestamp,
      status: data.status || "--",
    };

    setFullHistory((prev) => {
      if (prev.some((item) => item.timestamp === newRecord.timestamp))
        return prev;
      return [newRecord, ...prev];
    });
  });

  useEffect(() => {
    fetch("http://192.168.1.8:8080/api/history?limit=15")
      .then((res) => res.json())
      .then((data) => {
        const fetchedHistory = Array.isArray(data) ? data : [];
        setFullHistory(fetchedHistory);
      })
      .catch((err) => {
        console.error("[Fetch] Lỗi lấy lịch sử: ", err);
        setFullHistory([]);
      });
  }, []);

  useEffect(() => {
    let start,
      end = new Date().toISOString();
    if (timeRange === "1h") {
      start = new Date(Date.now() - 3600 * 1000).toISOString();
    } else if (timeRange === "1d") {
      start = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    } else {
      start = new Date(0).toISOString();
    }

    fetch(
      `http://192.168.1.8:8080/api/statistics?start=${encodeURIComponent(
        start
      )}&end=${encodeURIComponent(end)}`
    )
      .then((res) => res.json())
      .then((data) => {
        setStatistics((prev) => ({
          ...prev,
          colors: data.colors || {},
          statuses: data.statuses || {},
        }));
      })
      .catch((err) => {
        console.error("[Fetch] Error fetching stats: ", err.message);
        setStatistics((prev) => ({ ...prev, colors: {}, statuses: {} }));
      });

    fetch(
      `http://192.168.1.8:8080/api/all-statuses?start=${encodeURIComponent(
        start
      )}&end=${encodeURIComponent(end)}`
    )
      .then((res) => res.json())
      .then((data) => {
        console.log("[Fetch] All statuses received: ", data);
        setStatistics((prev) => ({ ...prev, allStatuses: data }));
      })
      .catch((err) => {
        console.error("[Fetch] Error fetching all statuses: ", err.message);
        setStatistics((prev) => ({ ...prev, allStatuses: {} }));
      });
  }, [timeRange]);

  const fetchOlderHistory = useCallback(() => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    const oldest = fullHistory[fullHistory.length - 1]?.timestamp;
    fetch(
      `http://192.168.1.8:8080/api/history${
        oldest ? `?before=${encodeURIComponent(oldest)}&limit=15` : "?limit=15"
      }`
    )
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFullHistory((prev) => {
            const newRecords = data.filter(
              (d) => !prev.some((p) => p.timestamp === d.timestamp)
            );
            if (newRecords.length === 0) {
              setHasMore(false);
            }
            return [...prev, ...newRecords];
          });
          setDisplayCount((prev) => prev + 15);
        } else {
          setHasMore(false);
        }
      })
      .catch((err) => {
        console.error("[Fetch] Error fetching history: ", err);
        setHasMore(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isLoading, hasMore, fullHistory]);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchOlderHistory();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreRef.current, hasMore, isLoading, fetchOlderHistory]);

  const handleAlertChoice = (action) => {
    const actionType = action === "continue" ? "blue_continue" : "blue_discard";
    fetch("http://192.168.1.8:8080/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionType }),
    })
      .then(() => {
        toast.success(`Hành động ${action} thành công!`);
        setShowAlert(false);
      })
      .catch(() => {
        toast.error(`Hành động ${action} thất bại!`);
        setShowAlert(false);
      });
  };

  function sendControlCommand(action) {
    fetch("http://192.168.1.8:8080/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
      .then(() => toast.success(`Hành động ${action} thành công!`))
      .catch(() => toast.error(`Hành động ${action} thất bại!`));
  }

  function toggleConveyor() {
    fetch("http://192.168.1.8:8080/api/conveyor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    })
      .then(() => toast.success("Đã bật/tắt băng tải!"))
      .catch(() => toast.error("Bật/tắt băng tải thất bại!"));
  }

  const filteredHistory = fullHistory
    .filter((item) =>
      filterColor
        ? (item.color || "").trim().toLowerCase() === filterColor.toLowerCase()
        : true
    )
    .filter((item) =>
      filterStatus
        ? (item.status || "").trim().toLowerCase() ===
          filterStatus.toLowerCase()
        : true
    );

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <button
        onClick={() => setDarkMode(!darkMode)}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          padding: "10px",
          backgroundColor: darkMode ? "#fff" : "#333",
          color: darkMode ? "#333" : "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        {darkMode ? "Chế độ sáng" : "Chế độ tối"}
      </button>

      <header>
        <h1>Hệ thống phân loại sản phẩm</h1>
      </header>

      <main>
        <section className="controls smart-panel">
          <h2>🕹️ Điều khiển từ xa</h2>
          <div className="control-buttons">
            <button
              onClick={() => sendControlCommand("start")}
              className="start-btn smart-btn"
            >
              ▶️ Bắt đầu
            </button>
            <button
              onClick={() => sendControlCommand("stop")}
              className="stop-btn smart-btn"
            >
              ⏹️ Dừng
            </button>
            <button
              onClick={() => sendControlCommand("reset")}
              className="reset-btn smart-btn"
            >
              🔄 Đặt lại
            </button>
          </div>
          <div className="conveyor-control">
            <h3>🛤️ Điều khiển băng tải</h3>
            <button onClick={toggleConveyor} className="conveyor-btn smart-btn">
              🔁 Bật/Tắt băng tải
            </button>
          </div>
        </section>

        <section className="realtime">
          <h2>Dữ liệu thời gian thực</h2>
          {showAlert && (
            <div className="alert">
              <p>
                <strong>Cảnh báo:</strong> Phát hiện vật màu xanh dương!
              </p>
              <button onClick={() => handleAlertChoice("continue")}>
                Tiếp tục
              </button>
              <button onClick={() => handleAlertChoice("discard")}>
                Bỏ ra
              </button>
            </div>
          )}
          <div className="card-grid">
            <div className="card">
              <h3>Khối lượng (g)</h3>
              <p id="weight">{weight}</p>
            </div>
            <div
              className="card"
              style={{
                backgroundColor:
                  color === "red"
                    ? "red"
                    : color === "green"
                    ? "green"
                    : color === "blue"
                    ? "#007bff"
                    : "#eee",
                color: ["red", "green", "blue"].includes(color)
                  ? "white"
                  : "black",
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
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="timeRange">Chọn khoảng thời gian:</label>
            <select
              id="timeRange"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{ marginLeft: "10px", padding: "8px" }}
            >
              <option value="1h">1 giờ</option>
              <option value="1d">1 ngày</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
          <Suspense fallback={<div>Đang tải biểu đồ...</div>}>
            <WeightChart
              history={fullHistory}
              fetchOlderHistory={fetchOlderHistory}
              timeRange={timeRange}
              statistics={statistics}
            />
          </Suspense>
        </section>

        <section className="history">
          <h2>Lịch sử cảm biến</h2>
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="filterColor">Lọc theo màu sắc: </label>
            <select
              id="filterColor"
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
              style={{
                marginLeft: "10px",
                marginRight: "20px",
                padding: "8px",
              }}
            >
              <option value="">Tất cả</option>
              <option value="red">Red</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
            </select>

            <label htmlFor="filterStatus">Lọc theo trạng thái: </label>
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ marginLeft: "10px", padding: "8px" }}
            >
              <option value="">Tất cả</option>
              <option value="LIGHT GREEN">Light Green</option>
              <option value="HEAVY GREEN">Heavy Green</option>
              <option value="LIGHT RED">Light Red</option>
              <option value="HEAVY RED">Heavy Red</option>
              <option value="BLUE">Blue</option>
              <option value="UNKNOWN">Unknown</option>
              <option value="INVALID">Invalid</option>
            </select>
          </div>
          <div
            ref={historyTableRef}
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              position: "relative",
            }}
          >
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
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="4">Không có dữ liệu</td>
                  </tr>
                ) : (
                  filteredHistory.slice(0, displayCount).map((item, idx) => {
                    const ts = item.timestamp.endsWith("Z")
                      ? item.timestamp
                      : item.timestamp + "Z";
                    const date = new Date(ts);
                    const colorStr = (item.color || "").trim().toLowerCase();
                    return (
                      <tr key={idx}>
                        <td>
                          {date.toLocaleTimeString()} -{" "}
                          {date.toLocaleDateString("vi-VN")}
                        </td>
                        <td>{item.weight}</td>
                        <td
                          style={{
                            backgroundColor:
                              colorStr === "red"
                                ? "red"
                                : colorStr === "green"
                                ? "green"
                                : colorStr === "blue"
                                ? "#007bff"
                                : "#eee",
                            color: ["red", "green", "blue"].includes(colorStr)
                              ? "white"
                              : "black",
                            borderRadius: "30px",
                            textAlign: "center",
                          }}
                        >
                          {colorStr || "Không xác định"}
                        </td>
                        <td>{item.status || "--"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div
              ref={loadMoreRef}
              style={{ height: "20px", textAlign: "center" }}
            >
              {isLoading && <p>Đang tải...</p>}
              {!hasMore && filteredHistory.length > 0 && (
                <p>Không còn dữ liệu để tải</p>
              )}
            </div>
            {showScrollTop && (
              <button
                onClick={() =>
                  historyTableRef.current.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  })
                }
                style={{
                  position: "sticky",
                  bottom: "20px",
                  right: "20px",
                  float: "right",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  cursor: "pointer",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                }}
              >
                ↑
              </button>
            )}
          </div>
        </section>
      </main>

      <footer>
        <p>© 2025 Hệ thống phân loại tự động</p>
      </footer>
    </>
  );
}

export default App;
