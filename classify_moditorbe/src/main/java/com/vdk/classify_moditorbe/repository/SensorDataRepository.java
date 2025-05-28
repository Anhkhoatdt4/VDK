package com.vdk.classify_moditorbe.repository;

import com.vdk.classify_moditorbe.entity.SensorData;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface SensorDataRepository extends JpaRepository<SensorData, Long> {

    // Lấy 15 bản ghi mới nhất
    List<SensorData> findTop15ByOrderByTimestampDesc();

    // Lấy bản ghi gần nhất trước thời điểm truyền vào
    Optional<SensorData> findTop1ByTimestampBeforeOrderByTimestampDesc(LocalDateTime time);

    // Truy vấn với giới hạn số lượng bản ghi (dynamic limit)
    @Query("SELECT s FROM SensorData s WHERE s.timestamp < :beforeTime ORDER BY s.timestamp DESC")
    List<SensorData> findSensorDataBeforeTime(LocalDateTime beforeTime, Pageable pageable);

    // Đếm số bản ghi theo color trong khoảng thời gian
    @Query("SELECT s.color AS color, COUNT(s) AS count FROM SensorData s WHERE s.timestamp BETWEEN :start AND :end GROUP BY s.color")
    List<Map<String, Object>> countByColorBetween(LocalDateTime start, LocalDateTime end);

    // Đếm số bản ghi theo status trong khoảng thời gian
    @Query("SELECT s.status AS status, COUNT(s) AS count FROM SensorData s WHERE s.timestamp BETWEEN :start AND :end GROUP BY s.status")
    List<Map<String, Object>> countByStatusBetween(LocalDateTime start, LocalDateTime end);
}
