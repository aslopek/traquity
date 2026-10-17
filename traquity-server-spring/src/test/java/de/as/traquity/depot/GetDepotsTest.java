package de.as.traquity.depot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.depot.api.model.DepotReadDto;
import integration.IntegrationTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class GetDepotsTest {

  private static final String ENDPOINT = "/depots";
  private static final String LOGO_ENDPOINT = ENDPOINT + "/%d/logo";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = {"DELETE FROM DEPOT"})
  void getDepots_emptyDatabase() throws Exception {
    MvcResult mvcResult = getDepots().andExpect(status().isOk()).andReturn();
    List<DepotReadDto> depots =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
        });

    assertThat(depots).isEmpty();
  }

  @Test
  void getDepots_ok() throws Exception {
    MvcResult mvcResult = getDepots().andExpect(status().isOk()).andReturn();
    List<DepotReadDto> depots =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
        });

    assertThat(depots).hasSize(12);
    DepotReadDto depot = depots.getFirst();
    assertThat(depot.getId()).isEqualTo(1);
    assertThat(depot.getName()).isEqualTo("My first depot");
    assertThat(depot.getCurrency()).isEqualTo("EUR");
    assertThat(depot.getVersion()).isEqualTo(0);
    verifyLogoLink(depot, true);

    depot = depots.get(1);
    assertThat(depot.getId()).isEqualTo(2);
    assertThat(depot.getName()).isEqualTo("My other depot");
    assertThat(depot.getCurrency()).isEqualTo("EUR");
    assertThat(depot.getVersion()).isEqualTo(1);
    verifyLogoLink(depot, false);

    depot = depots.get(2);
    assertThat(depot.getId()).isEqualTo(3);
    assertThat(depot.getName()).isEqualTo("Empty depot");
    assertThat(depot.getCurrency()).isEqualTo("EUR");
    assertThat(depot.getVersion()).isEqualTo(0);
    verifyLogoLink(depot, true);

    depot = depots.get(3);
    assertThat(depot.getId()).isEqualTo(4);
    assertThat(depot.getName()).isEqualTo("ETF");
    assertThat(depot.getCurrency()).isEqualTo("EUR");
    assertThat(depot.getVersion()).isEqualTo(0);
    verifyLogoLink(depot, true);

    depot = depots.get(4);
    assertThat(depot.getId()).isEqualTo(5);
    assertThat(depot.getName()).isEqualTo("USD Depot 1");
    assertThat(depot.getCurrency()).isEqualTo("USD");
    assertThat(depot.getVersion()).isEqualTo(0);
    verifyLogoLink(depot, true);

    depot = depots.get(5);
    assertThat(depot.getId()).isEqualTo(6);
    assertThat(depot.getName()).isEqualTo("USD Depot 2");
    assertThat(depot.getCurrency()).isEqualTo("USD");
    assertThat(depot.getVersion()).isEqualTo(0);
    verifyLogoLink(depot, true);

    depot = depots.get(6);
    assertThat(depot.getId()).isEqualTo(7);
    assertThat(depot.getName()).isEqualTo("Grouped Securities");
    assertThat(depot.getCurrency()).isEqualTo("EUR");
    assertThat(depot.getVersion()).isEqualTo(1);
    verifyLogoLink(depot, true);

    depot = depots.get(7);
    assertThat(depot.getId()).isEqualTo(8);
    assertThat(depot.getName()).isEqualTo("Ungrouped Securities");
    assertThat(depot.getCurrency()).isEqualTo("EUR");
    assertThat(depot.getVersion()).isEqualTo(0);
    verifyLogoLink(depot, true);

    depot = depots.get(8);
    assertThat(depot.getId()).isEqualTo(9);
    assertThat(depot.getName()).isEqualTo("Buy In Zero");
    assertThat(depot.getCurrency()).isEqualTo("EUR");
    assertThat(depot.getVersion()).isEqualTo(0);
    verifyLogoLink(depot, true);

    depot = depots.get(9);
    assertThat(depot.getId()).isEqualTo(10);
    assertThat(depot.getName()).isEqualTo("Weekend First Transaction");
    assertThat(depot.getCurrency()).isEqualTo("EUR");
    assertThat(depot.getVersion()).isEqualTo(0);
    verifyLogoLink(depot, false);

    depot = depots.get(10);
    assertThat(depot.getId()).isEqualTo(11);
    assertThat(depot.getName()).isEqualTo("Position Performance");
    assertThat(depot.getCurrency()).isEqualTo("EUR");
    assertThat(depot.getVersion()).isEqualTo(0);
    verifyLogoLink(depot, false);

    depot = depots.get(11);
    assertThat(depot.getId()).isEqualTo(12);
    assertThat(depot.getName()).isEqualTo("Position Performance - Latest Price Fallback");
    assertThat(depot.getCurrency()).isEqualTo("EUR");
    assertThat(depot.getVersion()).isEqualTo(0);
    verifyLogoLink(depot, false);
  }

  private ResultActions getDepots() throws Exception {
    return mockMvc.perform(get(ENDPOINT));
  }

  private void verifyLogoLink(DepotReadDto responseBody, boolean shouldHaveLogo) {
    assertThat(responseBody.getLinks()).isNotNull();
    if (shouldHaveLogo) {
      assertThat(responseBody.getLinks().getLogo()).isEqualTo(String.format(LOGO_ENDPOINT, responseBody.getId()));
    } else {
      assertThat(responseBody.getLinks().getLogo()).isNull();
    }
  }
}
