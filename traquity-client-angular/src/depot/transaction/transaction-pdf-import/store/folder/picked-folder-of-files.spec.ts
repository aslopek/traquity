import {describe, expect, it} from "@jest/globals";
import {pickedFolderOfFiles} from "./picked-folder-of-files";

function fileFactory(webkitRelativePath: string, type: string): File {
  const name: string = webkitRelativePath.split("/").at(-1)!;
  return {name, type, webkitRelativePath} as unknown as File;
}

describe("pickedFolderOfFiles", (): void => {
  it("states the Windows folder path and a nested PDF's own path", (): void => {
    const files: File[] = [fileFactory("Broker/2023/Q1/jan.pdf", "application/pdf")];
    const pathOf: (file: File) => string = (file: File): string => `C:\\Users\\user\\${file.webkitRelativePath.replaceAll("/", "\\")}`;

    expect(pickedFolderOfFiles(files, pathOf)).toEqual({
      path: "C:\\Users\\user\\Broker",
      files: [{path: "C:\\Users\\user\\Broker\\2023\\Q1\\jan.pdf", file: files[0]}]
    });
  });

  it("states the POSIX folder path and a nested PDF's own path", (): void => {
    const files: File[] = [fileFactory("Broker/2023/jan.pdf", "application/pdf")];
    const pathOf: (file: File) => string = (file: File): string => `/home/user/${file.webkitRelativePath}`;

    expect(pickedFolderOfFiles(files, pathOf)).toEqual({
      path: "/home/user/Broker",
      files: [{path: "/home/user/Broker/2023/jan.pdf", file: files[0]}]
    });
  });

  it("drops non-PDF entries while still stating the folder's own path", (): void => {
    const files: File[] = [fileFactory("Broker/notes.txt", "text/plain")];
    const pathOf: (file: File) => string = (file: File): string => `/home/user/${file.webkitRelativePath}`;

    expect(pickedFolderOfFiles(files, pathOf)).toEqual({path: "/home/user/Broker", files: []});
  });

  it("states no folder for an empty file list", (): void => {
    expect(pickedFolderOfFiles([], (): string => "")).toEqual({path: null, files: []});
  });

  it("names a file by its path relative to the picked folder when the host states no path at all", (): void => {
    const files: File[] = [fileFactory("Broker/2023/jan.pdf", "application/pdf")];

    expect(pickedFolderOfFiles(files, (): string => "")).toEqual({
      path: "Broker",
      files: [{path: "2023/jan.pdf", file: files[0]}]
    });
  });
});
