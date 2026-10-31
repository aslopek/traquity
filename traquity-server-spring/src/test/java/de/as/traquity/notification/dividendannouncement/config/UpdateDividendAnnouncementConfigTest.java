package de.as.traquity.notification.dividendannouncement.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementConfigReadDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementConfigUpdateDto;
import integration.IntegrationTest;
import integration.SecurityIds;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class UpdateDividendAnnouncementConfigTest {

  private static final String ENDPOINT = "/notifications/dividend-announcements/configs/%d";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private DividendAnnouncementConfigRepository dividendAnnouncementConfigRepository;

  @Autowired
  private MockMvc mockMvc;

  private DividendAnnouncementConfigUpdateDto requestBody;

  @BeforeEach
  void beforeEach() {
    requestBody = new DividendAnnouncementConfigUpdateDto();
    requestBody.setDataSourceId(102L);
    requestBody.setExternalSecurityId("DE000HAG0005");
    requestBody.setVersion(1L);
    requestBody.setIsActive(true);
  }

  @Test
  void updateNothing_ok() throws Exception {
    runPositiveTestCase(3);
  }

  @Test
  void wrongVersion_conflict() throws Exception {
    requestBody.setVersion(0L);
    runNegativeTestCase(3, HttpStatus.CONFLICT);
  }

  @Test
  void missingVersion_badRequest() throws Exception {
    requestBody.setVersion(null);
    runNegativeTestCase(3, HttpStatus.BAD_REQUEST);
  }

  @Test
  void securityIdDoesNotExist_notFound() throws Exception {
    runNegativeTestCase(999, HttpStatus.NOT_FOUND);
  }

  @Test
  void updateDataSourceId_ok() throws Exception {
    requestBody.setDataSourceId(101L);
    runPositiveTestCase(3);
  }

  @Test
  void updateDataSourceId_dataSourceDoesNotExist_badRequest() throws Exception {
    requestBody.setDataSourceId(999L);
    runNegativeTestCase(3, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateDataSourceId_missingDataSourceId_badRequest() throws Exception {
    requestBody.setDataSourceId(null);
    runNegativeTestCase(3, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateDataSourceId_isinKeyedSource_withExternalSecurityId_storesNoIdentifier_ok() throws Exception {
    requestBody.setDataSourceId(104L);
    requestBody.setExternalSecurityId("ignored-value");
    requestBody.setVersion(0L);
    requestBody.setIsActive(false);

    MvcResult mvcResult = putConfig(SecurityIds.PFE).andExpect(status().isOk()).andReturn();
    DividendAnnouncementConfigReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendAnnouncementConfigReadDto.class);
    assertThat(responseBody.getExternalSecurityId()).isEqualTo("US7170811035");

    DividendAnnouncementConfigEntity entity =
        dividendAnnouncementConfigRepository.findBySecurityId(SecurityIds.PFE).orElseThrow();
    assertThat(entity.getExternalSecurityId()).isNull();
    assertThat(entity.getVersion()).isOne();
  }

  @Test
  void updateDataSourceId_isinKeyedSource_withoutExternalSecurityId_storesNoIdentifier_ok() throws Exception {
    requestBody.setDataSourceId(104L);
    requestBody.setExternalSecurityId(null);
    requestBody.setVersion(0L);
    requestBody.setIsActive(false);

    MvcResult mvcResult = putConfig(SecurityIds.PFE).andExpect(status().isOk()).andReturn();
    DividendAnnouncementConfigReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendAnnouncementConfigReadDto.class);
    assertThat(responseBody.getExternalSecurityId()).isEqualTo("US7170811035");

    DividendAnnouncementConfigEntity entity =
        dividendAnnouncementConfigRepository.findBySecurityId(SecurityIds.PFE).orElseThrow();
    assertThat(entity.getExternalSecurityId()).isNull();
    assertThat(entity.getVersion()).isOne();
  }

  @Test
  void updateExternalSecurityId_ok() throws Exception {
    requestBody.setExternalSecurityId("HAG");
    runPositiveTestCase(3);
  }

  @Test
  void updateExternalSecurityId_missingExternalSecurityId_badRequest() throws Exception {
    requestBody.setExternalSecurityId(null);
    runNegativeTestCase(3, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateExternalSecurityId_emptyExternalSecurityId_badRequest() throws Exception {
    requestBody.setExternalSecurityId("");
    runNegativeTestCase(3, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateExternalSecurityId_blankExternalSecurityId_badRequest() throws Exception {
    requestBody.setExternalSecurityId(" ");
    runNegativeTestCase(3, HttpStatus.BAD_REQUEST);
  }

  @Test
  void update_setInactive_ok() throws Exception {
    requestBody.setIsActive(false);
    runPositiveTestCase(3);
  }

  @Test
  void update_missingActive_badRequest() throws Exception {
    requestBody.setIsActive(null);
    runNegativeTestCase(3, HttpStatus.BAD_REQUEST);
  }

  private void runNegativeTestCase(long securityId, HttpStatus expectedStatus) throws Exception {
    long count = dividendAnnouncementConfigRepository.count();
    MvcResult mvcResult = putConfig(securityId).andExpect(status().is(expectedStatus.value())).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(dividendAnnouncementConfigRepository.count()).isEqualTo(count);
  }

  private void runPositiveTestCase(long securityId) throws Exception {
    long count = dividendAnnouncementConfigRepository.count();

    MvcResult mvcResult = putConfig(securityId).andExpect(status().isOk()).andReturn();

    DividendAnnouncementConfigReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendAnnouncementConfigReadDto.class);
    assertThat(responseBody.getSecurityId()).isEqualTo(securityId);
    assertThat(responseBody.getDataSourceId()).isEqualTo(requestBody.getDataSourceId());
    assertThat(responseBody.getExternalSecurityId()).isEqualTo(requestBody.getExternalSecurityId());
    assertThat(responseBody.getIsActive()).isEqualTo(requestBody.getIsActive());
    assertThat(responseBody.getVersion()).isEqualTo(requestBody.getVersion() + 1);

    assertThat(dividendAnnouncementConfigRepository.count()).isEqualTo(count);
    DividendAnnouncementConfigEntity entity =
        dividendAnnouncementConfigRepository.findBySecurityId(securityId).orElseThrow();
    assertThat(entity.getDataSourceId()).isEqualTo(requestBody.getDataSourceId());
    assertThat(entity.getExternalSecurityId()).isEqualTo(requestBody.getExternalSecurityId());
    assertThat(entity.isActive()).isEqualTo(requestBody.getIsActive());
    assertThat(entity.getVersion()).isEqualTo(requestBody.getVersion() + 1);
  }

  private ResultActions putConfig(long securityId) throws Exception {
    String requestBodyAsString = objectMapper.writeValueAsString(requestBody);
    String url = String.format(ENDPOINT, securityId);
    return mockMvc.perform(put(url).content(requestBodyAsString).contentType(MediaType.APPLICATION_JSON));
  }
}
