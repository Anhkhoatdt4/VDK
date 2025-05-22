package com.vdk.classify_moditorbe.controller;

import com.vdk.classify_moditorbe.service.SensorDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

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
            return ResponseEntity.badRequest().body("Dữ liệu không hợp lệ");
        }
    }

    @GetMapping("/api/history")
    public ResponseEntity<?> getHistory() {
        try {
            return ResponseEntity.ok(sensorDataService.getLatestHistory());
        } catch (Exception e) {
            log.error("Lỗi khi lấy lịch sử dữ liệu: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Lỗi khi lấy lịch sử dữ liệu");
        }
    }


    @PostMapping("/api/control")
    public ResponseEntity<?> sendCommandToESP(@RequestBody Map<String, String> command) {
        String action = command.get("action");
        System.out.println("Received action: " + action);
        // Gửi lệnh xuống ESP (thông qua HTTP)
        RestTemplate rest = new RestTemplate();
        String espIp = "http://192.168.1.9"; // IP của ESP trong mạng LAN

        rest.postForObject(espIp + "/servo/" + action, null, String.class);

        return ResponseEntity.ok("Sent " + action + " to ESP");
    }
}
