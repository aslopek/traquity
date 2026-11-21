package de.as.traquity.security;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static integration.Arithmetic.MATH_CONTEXT;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.image.ImageService;
import de.as.traquity.configuration.ServerConfigurationService;
import de.as.traquity.price.security.historical.HistoricalSecurityPriceService;
import java.time.Clock;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

class SecurityServiceTest {

  private SecurityRepository securityRepository;
  private SecurityServiceImpl subject;

  @BeforeEach
  void beforeEach() {
    securityRepository = mock(SecurityRepository.class);
    subject = new SecurityServiceImpl(mock(Clock.class), mock(SecurityMapper.class), securityRepository, mock(SecurityLogoRepository.class),
        mock(HistoricalSecurityPriceService.class), mock(ServerConfigurationService.class), mock(ImageService.class), MATH_CONTEXT);
  }

  @Test
  void deleteSecurity_optimisticLockFails_conflict() {
    when(securityRepository.findById(1L)).thenReturn(Optional.of(mock(SecurityEntity.class)));
    doThrow(mock(ObjectOptimisticLockingFailureException.class)).when(securityRepository).flush();

    assertThatThrownBy(() -> subject.deleteSecurity(1L)).isInstanceOf(ConflictException.class);
  }
}
