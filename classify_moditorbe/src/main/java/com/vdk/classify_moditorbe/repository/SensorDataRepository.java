package com.vdk.classify_moditorbe.repository;

import com.vdk.classify_moditorbe.entity.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SensorDataRepository extends JpaRepository<SensorData, UUID> {
    List<SensorData> findTop10ByOrderByTimestampDesc();
}