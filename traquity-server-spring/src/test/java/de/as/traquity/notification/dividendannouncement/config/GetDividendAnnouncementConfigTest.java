package de.as.traquity.notification.dividendannouncement.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementConfigReadDto;
import integration.IntegrationTest;
import integration.SecurityIds;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class GetDividendAnnouncementConfigTest {

  private static final String ENDPOINT = "/notifications/dividend-announcements/configs/%d";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Test
  void getConfig_ok() throws Exception {
    MvcResult mvcResult = getConfig(3).andExpect(status().isOk()).andReturn();
    DividendAnnouncementConfigReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendAnnouncementConfigReadDto.class);
    assertThat(responseBody.getSecurityId()).isEqualTo(3);
    assertThat(responseBody.getDataSourceId()).isEqualTo(102);
    assertThat(responseBody.getExternalSecurityId()).isEqualTo("DE000HAG0005");
    assertThat(responseBody.getIsActive()).isTrue();
    assertThat(responseBody.getVersion()).isEqualTo(1);
  }

  @Test
  void getConfig_isinKeyed_ok() throws Exception {
    MvcResult mvcResult = getConfig(SecurityIds.PFE).andExpect(status().isOk()).andReturn();
    DividendAnnouncementConfigReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendAnnouncementConfigReadDto.class);
    assertThat(responseBody.getSecurityId()).isEqualTo(SecurityIds.PFE);
    assertThat(responseBody.getDataSourceId()).isEqualTo(104);
    assertThat(responseBody.getExternalSecurityId()).isEqualTo("US7170811035");
    assertThat(responseBody.getIsActive()).isFalse();
    assertThat(responseBody.getVersion()).isEqualTo(0);
  }

  @Test
  void getConfig_notFound() throws Exception {
    MvcResult mvcResult = getConfig(999).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  private ResultActions getConfig(long securityId) throws Exception {
    String url = String.format(ENDPOINT, securityId);
    return mockMvc.perform(get(url));
  }
}
