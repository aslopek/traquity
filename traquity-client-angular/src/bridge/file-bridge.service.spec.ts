import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {BridgeHost} from "./bridge-host.token";
import {FileBridgeService} from "./file-bridge.service";
import {TraQuityFileBridge} from "./file-bridge.type";

type PathForFile = (file: File) => string;

describe("FileBridgeService", (): void => {
  let path: string;
  let pathForFile: jest.Mock<PathForFile>;
  let file: File;
  let service: FileBridgeService;

  beforeEach((): void => {
    path = "C:\\broker\\statement.pdf";
    pathForFile = jest.fn<PathForFile>(() => path);
    file = new File(["%PDF-"], "statement.pdf", {type: "application/pdf"});

    const traquityFiles: TraQuityFileBridge = {pathForFile};
    const bridgeHost: BridgeHost = {traquityFiles};
    service = new FileBridgeService(bridgeHost);
  });

  it("reports the bridge as available", (): void => {
    expect(service.available).toBe(true);
  });

  it("forwards the file to the bridge and returns its path", (): void => {
    expect(service.pathForFile(file)).toBe(path);
    expect(pathForFile).toHaveBeenCalledWith(file);
    expect(pathForFile).toHaveBeenCalledTimes(1);
  });

  describe("without a bridge", (): void => {
    beforeEach((): void => {
      service = new FileBridgeService({});
    });

    it("reports the bridge as unavailable", (): void => {
      expect(service.available).toBe(false);
    });

    it("throws for pathForFile", (): void => {
      expect((): string => service.pathForFile(file)).toThrow("The traquity bridge is not available");
    });
  });
});
