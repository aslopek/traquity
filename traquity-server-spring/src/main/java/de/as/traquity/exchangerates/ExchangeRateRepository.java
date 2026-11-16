package de.as.traquity.exchangerates;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
interface ExchangeRateRepository extends JpaRepository<ExchangeRateEntity, Long> {

  Stream<ExchangeRateEntity> findAllByBaseCurrencyAndTargetCurrencyOrderByDateDesc(String baseCurrency,
                                                                                   String targetCurrency);

  Optional<ExchangeRateEntity> findFirstByBaseCurrencyAndTargetCurrencyOrderByDateAsc(String baseCurrency, String targetCurrency);

  List<ExchangeRateEntity> findAllByBaseCurrencyAndTargetCurrencyOrderByDateAsc(String baseCurrency,
                                                                                String targetCurrency);
}
