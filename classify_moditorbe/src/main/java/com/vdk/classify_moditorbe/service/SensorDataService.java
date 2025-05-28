package com.vdk.classify_moditorbe.service;

import com.vdk.classify_moditorbe.entity.SensorData;
import com.vdk.classify_moditorbe.repository.SensorDataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class SensorDataService {
    @Autowired
    private SensorDataRepository sensorDataRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public SensorData saveAndProcess(Map<String, Object> data) {
        Double weight = null;
        if (data.get("weight") != null) {
            try {
                weight = Double.parseDouble(data.get("weight").toString());
            } catch (NumberFormatException e) {
                weight = null;
            }
        }

        String color = data.get("color") != null ? data.get("color").toString().trim().toUpperCase() : null;

        SensorData sensorData = SensorData.builder()
                .weight(weight)
                .color(color)
                .timestamp(LocalDateTime.now())
                .build();

        if (color != null && weight != null && weight > 0) {
            switch (color) {
                case "GREEN":
                    sensorData.setStatus(weight <= 50 ? "LIGHT GREEN" : "HEAVY GREEN");
                    break;
                case "RED":
                    sensorData.setStatus(weight <= 50 ? "LIGHT RED" : "HEAVY RED");
                    break;
                case "BLUE":
                    sensorData.setStatus("BLUE");
                    break;
                default:
                    sensorData.setStatus("UNKNOWN");
                    break;
            }
        } else {
            sensorData.setStatus("INVALID");
        }

        messagingTemplate.convertAndSend("/topic/data", sensorData);

        // Lưu tất cả bản ghi, kể cả khi status là INVALID hoặc UNKNOWN
        return sensorDataRepository.save(sensorData);
    }

    public List<SensorData> getLatestHistory() {
        return sensorDataRepository.findTop15ByOrderByTimestampDesc();
    }

    public List<SensorData> getHistory(String before, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        if (before == null) {
            // Lấy limit bản ghi mới nhất
            return sensorDataRepository.findSensorDataBeforeTime(LocalDateTime.now(), pageable);
        }
        try {
            LocalDateTime beforeTime = LocalDateTime.parse(before);
            return sensorDataRepository.findSensorDataBeforeTime(beforeTime, pageable);
        } catch (Exception e) {
            return sensorDataRepository.findSensorDataBeforeTime(LocalDateTime.now(), pageable);
        }
    }


    public Map<String, Long> getColorStatistics(LocalDateTime start, LocalDateTime end) {
        List<Map<String, Object>> results = sensorDataRepository.countByColorBetween(start, end);
        Map<String, Long> stats = new java.util.HashMap<>();
        for (Map<String, Object> result : results) {
            String color = result.get("color") != null ? result.get("color").toString() : "UNKNOWN";
            Long count = ((Number) result.get("count")).longValue();
            stats.put(color, count);
        }
        return stats;
    }

    public Map<String, Long> getStatusStatistics(LocalDateTime start, LocalDateTime end) {
        List<Map<String, Object>> results = sensorDataRepository.countByStatusBetween(start, end);
        Map<String, Long> stats = new java.util.HashMap<>();
        for (Map<String, Object> result : results) {
            String status = result.get("status") != null ? result.get("status").toString() : "UNKNOWN";
            Long count = ((Number) result.get("count")).longValue();
            stats.put(status, count);
        }
        return stats;
    }
}