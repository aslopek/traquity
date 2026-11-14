package integration.sql;

import de.as.traquity.depot.transaction.Transaction;
import de.as.traquity.price.security.historical.HistoricalSecurityPrice;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Time;
import java.time.LocalDate;
import lombok.experimental.UtilityClass;

@UtilityClass
public class TestDataQuery {

  private static final String DB_CONNECTION = "jdbc:h2:mem:traquity";
  private static final String DB_USER = "test-user";
  private static final String DB_PASSWORD = "test-password";

  static {
    try {
      DriverManager.registerDriver(new org.h2.Driver());
    } catch (SQLException e) {
      throw new RuntimeException(e);
    }
  }

  public static long getDepotCount() {
    return getCount("SELECT COUNT(*) FROM DEPOT");
  }

  public static long getTransactionCount() {
    return getCount("SELECT COUNT(*) FROM TRANSACTION");
  }

  public static long getTransactionCountByDepotId(long depotId) {
    return getCount("SELECT COUNT(*) FROM TRANSACTION WHERE DEPOT_ID = ?", depotId);
  }

  public static long getTransactionCountByDepotIdOnOrBefore(long depotId, LocalDate date) {
    return getCount("SELECT COUNT(*) FROM TRANSACTION WHERE DEPOT_ID = ? AND DATE <= ?", depotId, date);
  }

  public static long getDividendAnnouncementCountBySecurityId(long securityId) {
    return getCount("SELECT COUNT(*) FROM DIVIDEND_ANNOUNCEMENT WHERE SECURITY_ID = ?", securityId);
  }

  public static long getDividendAnnouncementCountByDataSourceId(long dataSourceId) {
    return getCount("SELECT COUNT(*) FROM DIVIDEND_ANNOUNCEMENT WHERE DATA_SOURCE_ID = ?", dataSourceId);
  }

  public static long getDividendAnnouncementConfigCountBySecurityId(long securityId) {
    return getCount("SELECT COUNT(*) FROM DIVIDEND_ANNOUNCEMENT_CONFIG WHERE SECURITY_ID = ?", securityId);
  }

  public static long getDividendAnnouncementConfigCountByDataSourceId(long dataSourceId) {
    return getCount("SELECT COUNT(*) FROM DIVIDEND_ANNOUNCEMENT_CONFIG WHERE DATA_SOURCE_ID = ?", dataSourceId);
  }

  public static long getDividendAnnouncementDataSourceHeadersByDataSourceId(long dataSourceId) {
    return getCount("SELECT COUNT(*) FROM DIVIDEND_ANNOUNCEMENT_DATA_SOURCE_REQUEST_HEADER WHERE DATA_SOURCE_ID = ?", dataSourceId);
  }

  public static long getDividendAnnouncementDataSourceCurrencyMappingsByDataSourceId(long dataSourceId) {
    return getCount("SELECT COUNT(*) FROM DIVIDEND_ANNOUNCEMENT_DATA_SOURCE_CURRENCY_MAPPING WHERE DATA_SOURCE_ID = ?", dataSourceId);
  }

  public static Transaction getTransaction(long transactionId) {
    return querySingleRow("SELECT * FROM TRANSACTION WHERE ID = ?", result -> {
      Transaction transaction = new Transaction();
      transaction.setId(transactionId);
      transaction.setVersion(result.getLong("VERSION"));
      transaction.setDate(result.getDate("DATE").toLocalDate());
      Time time = result.getTime("TIME");
      if (time != null) {
        transaction.setTime(time.toLocalTime());
      }
      transaction.setDepotId(result.getLong("DEPOT_ID"));
      transaction.setSecurityId(result.getLong("SECURITY_ID"));
      transaction.setSecurityCountOriginal(result.getBigDecimal("SECURITY_COUNT_ORIGINAL"));
      transaction.setSecurityCountSplitAdjusted(result.getBigDecimal("SECURITY_COUNT_SPLIT_ADJUSTED"));
      transaction.setGrossValue(result.getBigDecimal("GROSS_VALUE"));
      transaction.setTax(result.getBigDecimal("TAX"));
      transaction.setFee(result.getBigDecimal("FEE"));
      return transaction;
    }, transactionId);
  }

  public static long getHistoricalSecurityPriceCountBySecurityId(long securityId) {
    return getCount("SELECT COUNT(*) FROM HISTORICAL_SECURITY_PRICE WHERE SECURITY_ID = ?", securityId);
  }

  public static HistoricalSecurityPrice getHistoricalSecurityPrice(long securityId, LocalDate date) {
    return querySingleRow("SELECT * FROM HISTORICAL_SECURITY_PRICE WHERE SECURITY_ID = ? AND DATE = ?", result -> {
      HistoricalSecurityPrice price = new HistoricalSecurityPrice();
      price.setSecurityId(securityId);
      price.setPrice(result.getBigDecimal("PRICE"));
      price.setCurrency(result.getString("CURRENCY"));
      price.setDate(date);
      price.setDataSourceId(result.getObject("DATA_SOURCE_ID", Long.class));
      return price;
    }, securityId, date);
  }

  public static long getHistoricalSecurityPriceCount() {
    return getCount("SELECT COUNT(*) FROM HISTORICAL_SECURITY_PRICE");
  }

  public static long getHistoricalSecurityPriceCountBySecurityIdAndDate(long securityId, LocalDate date) {
    return getCount("SELECT COUNT(*) FROM HISTORICAL_SECURITY_PRICE WHERE SECURITY_ID = ? AND DATE = ?", securityId, date);
  }

  private static long getCount(String sql, Object... parameters) {
    return querySingleRow(sql, result -> result.getLong(1), parameters);
  }

  /**
   * Runs {@code sql} as a prepared statement with {@code parameters} bound in order and maps the first row of its result.
   */
  private static <T> T querySingleRow(String sql, RowMapper<T> mapper, Object... parameters) {
    try (Connection connection = DriverManager.getConnection(DB_CONNECTION, DB_USER, DB_PASSWORD);
        PreparedStatement statement = connection.prepareStatement(sql)) {
      for (int i = 0; i < parameters.length; i++) {
        statement.setObject(i + 1, parameters[i]);
      }
      try (ResultSet result = statement.executeQuery()) {
        if (!result.next()) {
          throw new IllegalStateException("Query returned no row: " + sql);
        }
        return mapper.map(result);
      }
    } catch (SQLException e) {
      throw new RuntimeException(e);
    }
  }

  @FunctionalInterface
  private interface RowMapper<T> {

    T map(ResultSet result) throws SQLException;
  }
}
