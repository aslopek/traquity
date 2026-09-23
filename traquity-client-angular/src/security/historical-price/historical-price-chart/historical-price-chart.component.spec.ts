import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {Action, Store} from "@ngrx/store";
import {Observable, of, throwError} from "rxjs";
import {ConfigApi} from "../../../gen/api/configuration";
import {HistoricalSecurityPrice, HistoricalSecurityPriceApi} from "../../../gen/api/historical-security-price";
import {AppState} from "../../../store/app.state";
import {NotificationActions} from "../../../store/notification/notification.actions";
import {HistoricalPriceChartComponent} from "./historical-price-chart.component";

// `src/common`'s barrel reaches pdfjs-dist, which this component never touches and which jest cannot require as CJS.
jest.mock("pdfjs-dist", () => ({}));

type GetHistoricalSecurityPrices =
  (securityId: number, startDate?: string, currency?: string) => Observable<HistoricalSecurityPrice[]>;

type HistoricalSecurityPriceApiMock = {
  getHistoricalSecurityPrices: jest.Mock<GetHistoricalSecurityPrices>
};

type StoreMock = {
  dispatch: jest.Mock<(action: Action) => void>
};

describe("HistoricalPriceChartComponent", (): void => {
  const securityId: number = 7;
  let prices: HistoricalSecurityPrice[];
  let getHistoricalSecurityPrices: jest.Mock<GetHistoricalSecurityPrices>;
  let dispatch: jest.Mock<(action: Action) => void>;
  let component: HistoricalPriceChartComponent;

  beforeEach((): void => {
    prices = [
      {securityId, price: 12.5, currency: "EUR", date: "2023-12-01"}
    ];
    getHistoricalSecurityPrices = jest.fn<GetHistoricalSecurityPrices>((): Observable<HistoricalSecurityPrice[]> => of(prices));
    dispatch = jest.fn<(action: Action) => void>();

    component = new HistoricalPriceChartComponent(
      {getHistoricalSecurityPrices} satisfies HistoricalSecurityPriceApiMock as unknown as HistoricalSecurityPriceApi,
      {} as ConfigApi,
      {dispatch} satisfies StoreMock as unknown as Store<AppState>,
    );
    component.selectedSecurityId = securityId;
  });

  it("holds the arrived prices under the selected range", async (): Promise<void> => {
    await component.changeDataRange("max");

    expect(getHistoricalSecurityPrices).toHaveBeenCalledTimes(1);
    expect(getHistoricalSecurityPrices).toHaveBeenCalledWith(securityId, "1970-01-01", undefined);
    expect(component["prices"]()).toBe(prices);
    expect(component["dataRange"]()).toBe("max");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("requests the prices in the currency that was picked", async (): Promise<void> => {
    component["dataRange"].set("max");

    await component.changeCurrency("USD");

    expect(getHistoricalSecurityPrices).toHaveBeenCalledTimes(1);
    expect(getHistoricalSecurityPrices).toHaveBeenCalledWith(securityId, "1970-01-01", "USD");
    expect(component["selectedCurrency"]()).toBe("USD");
  });

  describe("when the request fails", (): void => {
    beforeEach((): void => {
      getHistoricalSecurityPrices.mockReturnValue(throwError((): Error => new Error("request failed")));
    });

    it("pushes an error notification", async (): Promise<void> => {
      await component.changeDataRange("max");

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(
        NotificationActions.addError({message: "The historical prices could not be loaded."}));
    });

    it("selects the range that was showing before", async (): Promise<void> => {
      await component.changeDataRange("max");

      expect(component["dataRange"]()).toBe("1y");
    });

    it("selects the currency that was showing before", async (): Promise<void> => {
      component["selectedCurrency"].set("EUR");

      await component.changeCurrency("USD");

      expect(component["selectedCurrency"]()).toBe("EUR");
    });
  });
});
