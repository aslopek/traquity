package de.as.traquity.notification.dividendannouncement.config;

import static integration.SecurityIds.AAPL;
import static integration.SecurityIds.DEO;
import static integration.SecurityIds.DHR;
import static integration.SecurityIds.HAG;
import static integration.SecurityIds.MSFT;
import static integration.SecurityIds.PFE;
import static integration.SecurityIds.VW_STAMM;
import static integration.SecurityIds.VW_VZ;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementConfigReadDto;
import integration.IntegrationTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@IntegrationTest
class GetDividendAnnouncementConfigsTest {

  private static final String ENDPOINT = "/notifications/dividend-announcements/configs";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Test
  void getConfigs_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(ENDPOINT)).andExpect(status().isOk()).andReturn();
    List<DividendAnnouncementConfigReadDto> configs =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(configs).hasSize(8);
    DividendAnnouncementConfigReadDto config = configs.getFirst();
    assertThat(config.getSecurityId()).isEqualTo(MSFT);
    assertThat(config.getDataSourceId()).isEqualTo(101);
    assertThat(config.getExternalSecurityId()).isEqualTo("MSFT");
    assertThat(config.getIsActive()).isTrue();
    assertThat(config.getVersion()).isEqualTo(0);

    config = configs.get(1);
    assertThat(config.getSecurityId()).isEqualTo(AAPL);
    assertThat(config.getDataSourceId()).isEqualTo(101);
    assertThat(config.getExternalSecurityId()).isEqualTo("AAPL");
    assertThat(config.getIsActive()).isTrue();
    assertThat(config.getVersion()).isEqualTo(0);

    config = configs.get(2);
    assertThat(config.getSecurityId()).isEqualTo(HAG);
    assertThat(config.getDataSourceId()).isEqualTo(102);
    assertThat(config.getExternalSecurityId()).isEqualTo("DE000HAG0005");
    assertThat(config.getIsActive()).isTrue();
    assertThat(config.getVersion()).isEqualTo(1);

    config = configs.get(3);
    assertThat(config.getSecurityId()).isEqualTo(DHR);
    assertThat(config.getDataSourceId()).isEqualTo(101);
    assertThat(config.getExternalSecurityId()).isEqualTo("DHR");
    assertThat(config.getIsActive()).isFalse();
    assertThat(config.getVersion()).isEqualTo(1);

    config = configs.get(4);
    assertThat(config.getSecurityId()).isEqualTo(PFE);
    assertThat(config.getDataSourceId()).isEqualTo(104);
    assertThat(config.getExternalSecurityId()).isEqualTo("US7170811035");
    assertThat(config.getIsActive()).isFalse();
    assertThat(config.getVersion()).isEqualTo(0);

    config = configs.get(5);
    assertThat(config.getSecurityId()).isEqualTo(VW_VZ);
    assertThat(config.getDataSourceId()).isEqualTo(102);
    assertThat(config.getExternalSecurityId()).isEqualTo("DE0007664039");
    assertThat(config.getIsActive()).isTrue();
    assertThat(config.getVersion()).isEqualTo(0);

    config = configs.get(6);
    assertThat(config.getSecurityId()).isEqualTo(VW_STAMM);
    assertThat(config.getDataSourceId()).isEqualTo(102);
    assertThat(config.getExternalSecurityId()).isEqualTo("DE0007664005");
    assertThat(config.getIsActive()).isTrue();
    assertThat(config.getVersion()).isEqualTo(0);

    config = configs.get(7);
    assertThat(config.getSecurityId()).isEqualTo(DEO);
    assertThat(config.getDataSourceId()).isEqualTo(103);
    assertThat(config.getExternalSecurityId()).isEqualTo("ext-id-diageo");
    assertThat(config.getIsActive()).isTrue();
    assertThat(config.getVersion()).isEqualTo(0);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = "DELETE FROM DIVIDEND_ANNOUNCEMENT_CONFIG")
  void getConfigs_emptyDatabase_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(ENDPOINT)).andExpect(status().isOk()).andReturn();
    List<DividendAnnouncementConfigReadDto> configs =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});
    assertThat(configs).isEmpty();
  }
}
