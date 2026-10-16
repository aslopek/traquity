package de.as.traquity.depot.performance.position;

import de.as.traquity.common.config.MapStructConfig;
import de.as.traquity.depot.performance.api.model.PositionPerformanceDto;
import org.mapstruct.Mapper;

@Mapper(config = MapStructConfig.class)
interface PositionPerformanceMapper {

  PositionPerformanceDto toDto(PositionPerformance positionPerformance);
}
