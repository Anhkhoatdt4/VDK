import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";

Chart.register(zoomPlugin);

export default function WeightChart({
  history,
  fetchOlderHistory,
  timeRange,
  statistics,
}) {
  const recentChartRef = useRef(null);
  const weightChartRef = useRef(null);
  const colorChartRef = useRef(null);
  const statusChartRef = useRef(null);
  const recentChartInstance = useRef(null);
  const weightChartInstance = useRef(null);
  const colorChartInstance = useRef(null);
  const statusChartInstance = useRef(null);
  const [displayRange, setDisplayRange] = useState({ start: 0, end: 15 });
  const [noMoreData, setNoMoreData] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState([]);

  useEffect(() => {
    if (!history) return;

    let startTime;
    const endTime = new Date();
    if (timeRange === "1h") {
      startTime = new Date(endTime.getTime() - 3600 * 1000);
    } else if (timeRange === "1d") {
      startTime = new Date(endTime.getTime() - 24 * 3600 * 1000);
    } else {
      startTime = new Date(0);
    }

    const filtered = history.filter((item) => {
      const date = new Date(
        item.timestamp + (item.timestamp.endsWith("Z") ? "" : "Z")
      );
      return date >= startTime && date <= endTime;
    });
    console.log("[WeightChart] Raw history:", history);
    console.log(
      "[WeightChart] Time range:",
      timeRange,
      "Start:",
      startTime,
      "End:",
      endTime
    );
    console.log("[WeightChart] Filtered history:", filtered);
    setFilteredHistory(filtered);
  }, [history, timeRange]);

  // Recent 15 Records Chart
  useEffect(() => {
    if (!recentChartRef.current) return;
    if (recentChartInstance.current) {
      recentChartInstance.current.destroy();
    }
    if (!history || history.length === 0) return;

    const displayHistory = history
      .slice(displayRange.start, displayRange.end)
      .reverse();
    if (displayHistory.length === 0) return;

    console.log("[RecentChart] Display history:", displayHistory);
    console.log("[RecentChart] Display range:", displayRange);

    const labels = displayHistory.map((item) => {
      const date = new Date(
        item.timestamp + (item.timestamp.endsWith("Z") ? "" : "Z")
      );
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    });

    const data = displayHistory.map((item) => item.weight);
    const pointColors = displayHistory.map((item) => {
      const c = (item.color || "").trim().toLowerCase();
      if (c === "red") return "#ef4444";
      if (c === "green") return "#22c55e";
      if (c === "blue") return "#3b82f6";
      return "#e5e7eb";
    });

    recentChartInstance.current = new Chart(recentChartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Khối lượng (g)",
            data,
            borderColor: "#3b82f6",
            pointBackgroundColor: pointColors,
            pointBorderColor: "#fff",
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: false,
            tension: 0.4,
            borderWidth: 2,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const idx = context.dataIndex;
                const item = displayHistory[idx];
                const color =
                  (item.color || "").trim().toLowerCase() || "Không xác định";
                return `Khối lượng: ${context.parsed.y} g | Màu: ${color}`;
              },
              title: function (context) {
                return context[0].label;
              },
            },
          },
          zoom: {
            pan: {
              enabled: true,
              mode: "x",
              onPan: ({ chart }) => {
                console.log("[RecentChart] Panning, xAxis:", chart.scales.x);
                const xAxis = chart.scales.x;
                const step = 15;
                if (xAxis.min <= 0 && displayRange.start > 0) {
                  setDisplayRange((prev) => ({
                    start: Math.max(0, prev.start - step),
                    end: Math.max(step, prev.end - step),
                  }));
                  setNoMoreData(false);
                } else if (
                  xAxis.max >= labels.length - 1 &&
                  displayRange.end < history.length
                ) {
                  setDisplayRange((prev) => ({
                    start: Math.min(history.length - step, prev.start + step),
                    end: Math.min(history.length, prev.end + step),
                  }));
                }
              },
              onPanComplete: ({ chart }) => {
                const xAxis = chart.scales.x;
                if (xAxis.min <= 0 && displayRange.start === 0) {
                  console.log(
                    "[RecentChart] Reached oldest data, fetching more"
                  );
                  fetchOlderHistory();
                  setTimeout(() => {
                    if (history.length <= displayRange.end) {
                      setNoMoreData(true);
                    }
                  }, 1000);
                }
              },
            },
            limits: {
              x: { min: 0, max: labels.length - 1 },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Thời gian",
              color: "#1e293b",
            },
            ticks: {
              color: "#1e293b",
              maxRotation: 45,
              minRotation: 45,
            },
          },
          y: {
            title: {
              display: true,
              text: "Khối lượng (g)",
              color: "#1e293b",
            },
            ticks: {
              color: "#1e293b",
            },
            beginAtZero: true,
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    return () => {
      if (recentChartInstance.current) {
        recentChartInstance.current.destroy();
      }
    };
  }, [history, displayRange, fetchOlderHistory]);

  // Weight Line Chart
  useEffect(() => {
    if (!weightChartRef.current) return;
    if (weightChartInstance.current) {
      weightChartInstance.current.destroy();
    }
    console.log(
      "[WeightChart] Attempting to render Weight Chart with filteredHistory:",
      filteredHistory
    );
    if (!filteredHistory || filteredHistory.length === 0) {
      console.log("[WeightChart] No data to render Weight Chart");
      return;
    }

    const sortedHistory = [...filteredHistory].reverse();
    const labels = sortedHistory.map((item) => {
      const date = new Date(
        item.timestamp + (item.timestamp.endsWith("Z") ? "" : "Z")
      );
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    });

    const data = sortedHistory.map((item) => item.weight);
    console.log("[WeightChart] Labels for Weight Chart:", labels);
    console.log("[WeightChart] Data for Weight Chart:", data);

    weightChartInstance.current = new Chart(weightChartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Khối lượng (g)",
            data,
            borderColor: "#3b82f6",
            pointBackgroundColor: "#3b82f6",
            pointBorderColor: "#fff",
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false,
            tension: 0.4,
            borderWidth: 2,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Khối lượng: ${context.parsed.y} g`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Thời gian",
              color: "#1e293b",
            },
            ticks: {
              color: "#1e293b",
              maxRotation: 45,
              minRotation: 45,
            },
          },
          y: {
            title: {
              display: true,
              text: "Khối lượng (g)",
              color: "#1e293b",
            },
            ticks: {
              color: "#1e293b",
            },
            beginAtZero: true,
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    return () => {
      if (weightChartInstance.current) {
        weightChartInstance.current.destroy();
      }
    };
  }, [filteredHistory]);

  // Color Bar Chart
  useEffect(() => {
    if (!colorChartRef.current) return;
    if (colorChartInstance.current) {
      colorChartInstance.current.destroy();
    }
    if (!statistics || !statistics.colors) return;

    const colors = statistics.colors || {};
    const labels = ["RED", "GREEN", "BLUE", "UNKNOWN"];
    const data = labels.map((label) => colors[label] || 0);
    const backgroundColors = ["#ef4444", "#22c55e", "#3b82f6", "#e5e7eb"];

    colorChartInstance.current = new Chart(colorChartRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Số lượng",
            data,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Số lượng: ${context.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Màu sắc",
              color: "#1e293b",
            },
            ticks: {
              color: "#1e293b",
            },
          },
          y: {
            title: {
              display: true,
              text: "Số lượng",
              color: "#1e293b",
            },
            ticks: {
              color: "#1e293b",
              beginAtZero: true,
              stepSize: 1,
            },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    return () => {
      if (colorChartInstance.current) {
        colorChartInstance.current.destroy();
      }
    };
  }, [statistics]);

  // Status Pie Chart
  useEffect(() => {
    if (!statusChartRef.current) return;
    if (statusChartInstance.current) {
      statusChartInstance.current.destroy();
    }
    if (!statistics || !statistics.allStatuses) {
      console.log("[StatusChart] No allStatuses data available");
      return;
    }

    const statuses = statistics.allStatuses || {};
    const labels = [
      "LIGHT GREEN",
      "HEAVY GREEN",
      "LIGHT RED",
      "HEAVY RED",
      "BLUE",
      "UNKNOWN",
    ];
    const data = labels.map((label) => statuses[label] || 0);
    const backgroundColors = [
      "#22c55e",
      "#16a34a",
      "#ef4444",
      "#dc2626",
      "#3b82f6",
      "#e5e7eb",
    ];

    console.log("[StatusChart] All status data:", statuses);
    console.log("[StatusChart] Chart data:", data);

    statusChartInstance.current = new Chart(statusChartRef.current, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            label: "Phân bố theo Loại",
            data,
            backgroundColor: backgroundColors,
            borderColor: ["#ffffff"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: true,
            position: "right",
            labels: {
              color: "#1e293b",
              font: {
                size: 14,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed || 0;
                return `${label}: ${value} bản ghi`;
              },
            },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    return () => {
      if (statusChartInstance.current) {
        statusChartInstance.current.destroy();
      }
    };
  }, [statistics]);

  const resetPan = () => {
    setDisplayRange({ start: 0, end: 15 });
    setNoMoreData(false);
    if (recentChartInstance.current) {
      recentChartInstance.current.resetZoom();
    }
  };

  return (
    <div className="visualization-container">
      <div className="chart-container">
        <h3>Biểu đồ Khối lượng (15 bản ghi mới nhất)</h3>
        <div
          style={{
            height: 320,
            width: "100%",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          <canvas ref={recentChartRef}></canvas>
          {noMoreData && (
            <p
              style={{
                textAlign: "center",
                color: "#ef4444",
                marginTop: "10px",
              }}
            >
              Không còn dữ liệu cũ hơn
            </p>
          )}
          <button
            onClick={resetPan}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              display: "block",
              margin: "10px auto",
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <div className="chart-container">
        <h3>Biểu đồ Khối lượng (theo thời gian)</h3>
        <div
          style={{
            height: 320,
            width: "100%",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          {filteredHistory && filteredHistory.length > 0 ? (
            <canvas ref={weightChartRef}></canvas>
          ) : (
            <p style={{ textAlign: "center", color: "#ef4444" }}>
              Không có dữ liệu trong khoảng thời gian này
            </p>
          )}
        </div>
      </div>
      <div className="chart-container">
        <h3>Biểu đồ Phân bố Màu</h3>
        <div
          style={{
            height: 320,
            width: "100%",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          <canvas ref={colorChartRef}></canvas>
        </div>
      </div>
      <div className="chart-container">
        <h3>Biểu đồ Phân bố theo Loại</h3>
        <div
          style={{
            height: 320,
            width: "100%",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          {statistics &&
          statistics.allStatuses &&
          Object.keys(statistics.allStatuses).length > 0 ? (
            <canvas ref={statusChartRef}></canvas>
          ) : (
            <p style={{ textAlign: "center", color: "#ef4444" }}>
              Không có dữ liệu trạng thái
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
