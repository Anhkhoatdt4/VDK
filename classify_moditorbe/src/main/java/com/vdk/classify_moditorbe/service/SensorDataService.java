package com.vdk.classify_moditorbe.service;

import com.vdk.classify_moditorbe.entity.SensorData;
import com.vdk.classify_moditorbe.repository.SensorDataRepository;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
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
            weight = Double.parseDouble(data.get("weight").toString());
        }

        String color = data.get("color") != null ? data.get("color").toString().trim().toUpperCase() : null;

        SensorData sensorData = SensorData.builder()
                .weight(weight)
                .color(color)
                .timestamp(LocalDateTime.now())
                .build();

        if (color != null && weight != null) {
            switch (color) {
                case "GREEN":
                    if (weight <= 50) {
                        sensorData.setStatus("LIGHT GREEN");
                    } else {
                        sensorData.setStatus("HEAVY GREEN");
                    }
                    break;
                case "RED":
                    if (weight <= 50) {
                        sensorData.setStatus("LIGHT RED");
                    } else {
                        sensorData.setStatus("HEAVY RED");
                    }
                    break;
                default:
                    sensorData.setStatus("NORMAL");
                    break;
            }
        } else {
            sensorData.setStatus("NORMAL");
        }

        messagingTemplate.convertAndSend("/topic/data", sensorData);

        // Lưu nếu status khác NORMAL (hoặc theo logic bạn muốn)
        if (!"NORMAL".equals(sensorData.getStatus())) {
            return sensorDataRepository.save(sensorData);
        }

        return sensorData;
    }


    public List<SensorData> getLatestHistory() {
        return sensorDataRepository.findTop10ByOrderByTimestampDesc();
    }
}
