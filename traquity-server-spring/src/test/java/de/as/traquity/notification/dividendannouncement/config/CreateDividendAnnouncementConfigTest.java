package de.as.traquity.notification.dividendannouncement.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementConfigCreateDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementConfigReadDto;
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
class CreateDividendAnnouncementConfigTest {

  private static final String ENDPOINT = "/notifications/dividend-announcements/configs/%d";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private DividendAnnouncementConfigRepository dividendAnnouncementConfigRepository;

  @Autowired
  private MockMvc mockMvc;

  private DividendAnnouncementConfigCreateDto requestBody;

  @BeforeEach
  void beforeEach() {
    requestBody = new DividendAnnouncementConfigCreateDto();
    requestBody.setDataSourceId(102L);
    requestBody.setExternalSecurityId("US56035L1044");
    requestBody.setIsActive(true);
  }

  @Test
  void createConfig_ok() throws Exception {
    long count = dividendAnnouncementConfigRepository.count();
    long id = 18;

    MvcResult mvcResult = postConfig(id).andExpect(status().isCreated()).andReturn();

    String locationHeader = mvcResult.getResponse().getHeader("Location");
    String expectedLocationHeader = String.format(ENDPOINT, id);
    assertThat(locationHeader).isEqualTo(expectedLocationHeader);

    DividendAnnouncementConfigReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendAnnouncementConfigReadDto.class);
    assertThat(responseBody.getDataSourceId()).isEqualTo(requestBody.getDataSourceId());
    assertThat(responseBody.getExternalSecurityId()).isEqualTo(requestBody.getExternalSecurityId());

    assertThat(dividendAnnouncementConfigRepository.count()).isEqualTo(count + 1);
    DividendAnnouncementConfigEntity entity = dividendAnnouncementConfigRepository.findBySecurityId(id).orElseThrow();
    assertThat(entity.getDataSourceId()).isEqualTo(requestBody.getDataSourceId());
    assertThat(entity.getExternalSecurityId()).isEqualTo(requestBody.getExternalSecurityId());
    assertThat(entity.isActive()).isEqualTo(requestBody.getIsActive());
    assertThat(entity.getVersion()).isZero();
  }

  @Test
  void createConfig_isinKeyedSource_withExternalSecurityId_storesNoIdentifier_ok() throws Exception {
    requestBody.setDataSourceId(104L);
    requestBody.setExternalSecurityId("ignored-value");
    requestBody.setIsActive(false);

    MvcResult mvcResult = postConfig(SecurityIds.AMD).andExpect(status().isCreated()).andReturn();
    DividendAnnouncementConfigReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendAnnouncementConfigReadDto.class);
    assertThat(responseBody.getExternalSecurityId()).isEqualTo("US0079031078");

    DividendAnnouncementConfigEntity entity =
        dividendAnnouncementConfigRepository.findBySecurityId(SecurityIds.AMD).orElseThrow();
    assertThat(entity.getExternalSecurityId()).isNull();
  }

  @Test
  void createConfig_isinKeyedSource_withoutExternalSecurityId_storesNoIdentifier_ok() throws Exception {
    requestBody.setDataSourceId(104L);
    requestBody.setExternalSecurityId(null);
    requestBody.setIsActive(false);

    MvcResult mvcResult = postConfig(SecurityIds.AMD).andExpect(status().isCreated()).andReturn();
    DividendAnnouncementConfigReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendAnnouncementConfigReadDto.class);
    assertThat(responseBody.getExternalSecurityId()).isEqualTo("US0079031078");

    DividendAnnouncementConfigEntity entity =
        dividendAnnouncementConfigRepository.findBySecurityId(SecurityIds.AMD).orElseThrow();
    assertThat(entity.getExternalSecurityId()).isNull();
  }

  @Test
  void createConfig_duplicateSecurityId_conflict() throws Exception {
    runNegativeTestCase(1, HttpStatus.CONFLICT);
  }

  @Test
  void createConfig_securityDoesNotExist_notFound() throws Exception {
    runNegativeTestCase(999, HttpStatus.NOT_FOUND);
  }

  @Test
  void createConfig_missingDataSourceId_badRequest() throws Exception {
    requestBody.setDataSourceId(null);
    runNegativeTestCase(18, HttpStatus.BAD_REQUEST);
  }

  @Test
  void createConfig_dataSourceDoesNotExist_badRequest() throws Exception {
    requestBody.setDataSourceId(999L);
    runNegativeTestCase(18, HttpStatus.BAD_REQUEST);
  }

  @Test
  void createConfig_missingExternalSecurityId_badRequest() throws Exception {
    requestBody.setExternalSecurityId(null);
    runNegativeTestCase(18, HttpStatus.BAD_REQUEST);
  }

  @Test
  void createConfig_emptyExternalSecurityId_badRequest() throws Exception {
    requestBody.setExternalSecurityId("");
    runNegativeTestCase(18, HttpStatus.BAD_REQUEST);
  }

  @Test
  void createConfig_blankExternalSecurityId_badRequest() throws Exception {
    requestBody.setExternalSecurityId(" ");
    runNegativeTestCase(18, HttpStatus.BAD_REQUEST);
  }

  @Test
  void createConfig_missingIsActive_badRequest() throws Exception {
    requestBody.setIsActive(null);
    runNegativeTestCase(18, HttpStatus.BAD_REQUEST);
  }

  void runNegativeTestCase(long securityId, HttpStatus expectedStatus) throws Exception {
    long count = dividendAnnouncementConfigRepository.count();
    MvcResult mvcResult = postConfig(securityId).andExpect(status().is(expectedStatus.value())).andReturn();
    assertThat(mvcResult.getResponse().containsHeader("Location")).isFalse();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(dividendAnnouncementConfigRepository.count()).isEqualTo(count);
  }

  private ResultActions postConfig(long securityId) throws Exception {
    String requestBodyAsString = objectMapper.writeValueAsString(requestBody);
    String url = String.format(ENDPOINT, securityId);
    return mockMvc.perform(post(url).content(requestBodyAsString).contentType(MediaType.APPLICATION_JSON));
  }
}
