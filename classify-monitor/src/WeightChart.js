import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function WeightChart({ history }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    if (!history || history.length === 0) return;
    const labels = history.map((item, idx) => idx + 1);
    const data = history.map((item) => item.weight);
    const bgColors = history.map((item) => {
      const c = (item.color || "").trim().toLowerCase();
      if (c === "red") return "#ef4444";
      if (c === "green") return "#22c55e";
      if (c === "blue") return "#3b82f6";
      return "#e5e7eb";
    });
    chartInstance.current = new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Khối lượng (g)",
            data,
            backgroundColor: bgColors,
            borderRadius: 8,
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            title: { display: true, text: "Lần đo" },
          },
          y: {
            title: { display: true, text: "Khối lượng (g)" },
            beginAtZero: true,
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }, [history]);

  return (
    <div style={{height: 320, width: "100%", maxWidth: 600, margin: "0 auto"}}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
}
