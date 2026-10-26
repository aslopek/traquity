package de.as.traquity.notification.dividendannouncement.datasource;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.NotFoundException;
import java.util.List;

public interface DividendAnnouncementDataSourceService {

  DividendAnnouncementDataSource createDataSource(DividendAnnouncementDataSource dataSource)
      throws BadRequestException, ConflictException;

  DividendAnnouncementDataSource updateDataSource(DividendAnnouncementDataSource dataSource)
      throws BadRequestException, ConflictException, NotFoundException;

  void deleteDataSource(long id) throws BadRequestException, ConflictException, NotFoundException;

  List<DividendAnnouncementDataSource> getDataSources();

  DividendAnnouncementDataSource getDataSource(long id) throws NotFoundException;
}
