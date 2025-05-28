package com.vdk.classify_moditorbe.controller;

import com.vdk.classify_moditorbe.service.SensorDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping()
@RequiredArgsConstructor
@Slf4j
@CrossOrigin
public class DataController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    @Autowired
    private SensorDataService sensorDataService;

    @PostMapping("/api/data")
    public ResponseEntity<?> receiveData(@RequestBody Map<String, Object> data) {
        try {
            log.info("Raw data received: {}", data);
            sensorDataService.saveAndProcess(data);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Lỗi khi xử lý dữ liệu: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Dữ liệu không hợp lệ"));
        }
    }

    @GetMapping("/api/history")
    public ResponseEntity<?> getHistory(
            @RequestParam(value = "before", required = false) String before,
            @RequestParam(value = "limit", defaultValue = "15") int limit
    ) {
        try {
            return ResponseEntity.ok(sensorDataService.getHistory(before, limit));
        } catch (Exception e) {
            log.error("Lỗi khi lấy lịch sử dữ liệu: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Lỗi khi lấy lịch sử dữ liệu"));
        }
    }

    @GetMapping("/api/statistics")
    public ResponseEntity<?> getStatistics(
            @RequestParam(value = "start") String start,
            @RequestParam(value = "end") String end
    ) {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE_TIME;
            LocalDateTime startTime = LocalDateTime.parse(start, formatter);
            LocalDateTime endTime = LocalDateTime.parse(end, formatter);
            Map<String, Object> stats = new HashMap<>();
            stats.put("colors", sensorDataService.getColorStatistics(startTime, endTime));
            stats.put("statuses", sensorDataService.getStatusStatistics(startTime, endTime));
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Lỗi khi lấy thống kê: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Lỗi khi lấy thống kê: " + e.getMessage()));
        }
    }

    @PostMapping("/api/control")
    public ResponseEntity<?> sendCommandToESP(@RequestBody Map<String, String> command) {
        String action = command.get("action");
        System.out.println("Received action: " + action);
        RestTemplate rest = new RestTemplate();
        String espIp = "http://192.168.1.11";
        rest.postForObject(espIp + "/servo/" + action, null, String.class);
        return ResponseEntity.ok("Sent " + action + " to ESP");
    }
    @GetMapping("/api/all-statuses")
    public ResponseEntity<?> getAllStatuses(
            @RequestParam(value = "start") String start,
            @RequestParam(value = "end") String end
    ) {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE_TIME;
            LocalDateTime startTime = LocalDateTime.parse(start, formatter);
            LocalDateTime endTime = LocalDateTime.parse(end, formatter);
            Map<String, Long> statusCounts = sensorDataService.getStatusStatistics(startTime, endTime);
            return ResponseEntity.ok(statusCounts);
        } catch (Exception e) {
            log.error("Lỗi khi lấy tất cả trạng thái: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Lỗi khi lấy trạng thái: " + e.getMessage()));
        }
    }

}