package de.as.traquity.notification.dividendannouncement.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.util.ValueFormatService;
import de.as.traquity.notification.dividendannouncement.datasource.DividendAnnouncementDataSourceService;
import de.as.traquity.security.SecurityIsinService;
import de.as.traquity.security.SecurityService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

class DividendAnnouncementConfigServiceTest {

  private DividendAnnouncementConfigRepository dividendAnnouncementConfigRepository;
  private DividendAnnouncementConfigServiceImpl subject;

  @BeforeEach
  void beforeEach() {
    dividendAnnouncementConfigRepository = mock(DividendAnnouncementConfigRepository.class);
    subject = new DividendAnnouncementConfigServiceImpl(dividendAnnouncementConfigRepository,
        mock(DividendAnnouncementConfigMapper.class), mock(SecurityService.class), mock(SecurityIsinService.class),
        mock(DividendAnnouncementDataSourceService.class), mock(ValueFormatService.class));
  }

  @Test
  void deleteDividendAnnouncementConfig_optimisticLockFails_conflict() {
    when(dividendAnnouncementConfigRepository.findBySecurityId(1L))
        .thenReturn(Optional.of(mock(DividendAnnouncementConfigEntity.class)));
    doThrow(mock(ObjectOptimisticLockingFailureException.class)).when(dividendAnnouncementConfigRepository).flush();

    assertThatThrownBy(() -> subject.deleteDividendAnnouncementConfig(1L)).isInstanceOf(ConflictException.class);
  }
}
