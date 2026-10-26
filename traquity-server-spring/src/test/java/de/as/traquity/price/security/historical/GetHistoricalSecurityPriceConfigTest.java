package de.as.traquity.price.security.historical;


import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceConfigReadDto;
import integration.IntegrationTest;
import integration.SecurityIds;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@IntegrationTest
class GetHistoricalSecurityPriceConfigTest {

  private static final String ENDPOINT = "/securities/%d/historical-prices/config";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Test
  void getConfig_dataSource101_ok() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, SecurityIds.AMZN))).andExpect(status().isOk()).andReturn();
    HistoricalSecurityPriceConfigReadDto config =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(config.getExternalSecurityId()).isEqualTo("AMZN");
    assertThat(config.getIsActive()).isTrue();
    assertThat(config.getVersion()).isZero();
  }

  @Test
  void getConfig_dataSource102_ok() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, SecurityIds.PINS))).andExpect(status().isOk()).andReturn();
    HistoricalSecurityPriceConfigReadDto config =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(config.getExternalSecurityId()).isEqualTo("US72352L1061.XETR");
    assertThat(config.getIsActive()).isTrue();
    assertThat(config.getVersion()).isZero();
  }

  @Test
  void getConfig_dataSource105_isinKeyed_ok() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, SecurityIds.EQIX))).andExpect(status().isOk()).andReturn();
    HistoricalSecurityPriceConfigReadDto config =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(config.getExternalSecurityId()).isEqualTo("US29444U7000");
    assertThat(config.getIsActive()).isFalse();
    assertThat(config.getVersion()).isZero();
  }

  @Test
  void getConfig_inactive_ok() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, SecurityIds.CRM))).andExpect(status().isOk()).andReturn();
    HistoricalSecurityPriceConfigReadDto config =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(config.getExternalSecurityId()).isEqualTo("CRM");
    assertThat(config.getIsActive()).isFalse();
    assertThat(config.getVersion()).isOne();
  }

  @Test
  void getConfig_securityExists_configDoesNotExist_notFound() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, SecurityIds.MSFT))).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getConfig_securityDoesNotExist_notFound() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, 999))).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }
}
