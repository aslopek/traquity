package de.as.traquity.depot.performance.position;

import de.as.traquity.depot.performance.api.controller.DepotPerformancePositionApiDelegate;
import de.as.traquity.depot.performance.api.model.PositionPerformanceDto;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
class PositionPerformanceController implements DepotPerformancePositionApiDelegate {

  private final PositionPerformanceService positionPerformanceService;
  private final PositionPerformanceMapper positionPerformanceMapper;

  @Override
  public ResponseEntity<PositionPerformanceDto> getPositionPerformance(List<Long> depotIds, List<Long> securityIds) {
    PositionPerformance performance = positionPerformanceService.getPositionPerformance(Set.copyOf(depotIds),
        securityIds == null ? null : Set.copyOf(securityIds));
    return ResponseEntity.ok(positionPerformanceMapper.toDto(performance));
  }
}
