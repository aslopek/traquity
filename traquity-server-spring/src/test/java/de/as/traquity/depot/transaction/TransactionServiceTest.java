package de.as.traquity.depot.transaction;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static integration.Arithmetic.MATH_CONTEXT;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import de.as.traquity.common.error.ConflictException;
import de.as.traquity.depot.DepotService;
import jakarta.persistence.EntityManager;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

class TransactionServiceTest {

  private TransactionRepository transactionRepository;
  private TransactionServiceImpl subject;

  @BeforeEach
  void beforeEach() {
    transactionRepository = mock(TransactionRepository.class);
    subject = new TransactionServiceImpl(mock(TransactionMapper.class), transactionRepository, mock(DepotService.class),
        MATH_CONTEXT, mock(EntityManager.class));
  }

  @Test
  void deleteTransaction_optimisticLockFails_conflict() {
    when(transactionRepository.findByIdAndDepotId(2L, 1L)).thenReturn(Optional.of(mock(TransactionEntity.class)));
    doThrow(mock(ObjectOptimisticLockingFailureException.class)).when(transactionRepository).flush();

    assertThatThrownBy(() -> subject.deleteTransaction(1L, 2L)).isInstanceOf(ConflictException.class);
  }
}
