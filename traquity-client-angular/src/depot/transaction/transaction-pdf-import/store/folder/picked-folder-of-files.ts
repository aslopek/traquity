import {isPdf} from "../../../transaction-pdf/imported-file";
import {PickedPdfFile} from "../transaction-pdf-import.type";

export type PickedFolder = {
  /** The picked folder's fully qualified path or `null` if the directory is empty. */
  path: string | null
  /** The PDF files under it, in the order they were listed. */
  files: PickedPdfFile[]
};

/**
 * @param files every file the picker listed
 * @param pathOf a function to derive a file's fully qualified path
 */
export function pickedFolderOfFiles(files: File[], pathOf: (file: File) => string): PickedFolder {
  if (files.length === 0) {
    return {path: null, files: []};
  }

  const separator: string = separatorOf(files, pathOf);
  return {
    path: folderPathOf(files, pathOf, separator),
    files: files
      .filter((file: File): boolean => isPdf(file))
      .map((file: File): PickedPdfFile => ({path: pathOfFile(file, pathOf, separator), file}))
  };
}

function separatorOf(files: File[], pathOf: (file: File) => string): string {
  const absolute: string | undefined = files.map(pathOf).find((path: string): boolean => path.length > 0);
  return absolute !== undefined && absolute.includes("\\") ? "\\" : "/";
}

function folderPathOf(files: File[], pathOf: (file: File) => string, separator: string): string {
  for (const file of files) {
    const absolute: string = pathOf(file);
    const relative: string = relativePathOf(file, separator);
    if (absolute.length > 0 && absolute.endsWith(relative)) {
      const parent: string = absolute.slice(0, absolute.length - relative.length);
      return parent + firstSegmentOf(file);
    }
  }
  return firstSegmentOf(files[0]);
}

function pathOfFile(file: File, pathOf: (file: File) => string, separator: string): string {
  const absolute: string = pathOf(file);
  return absolute.length > 0 ? absolute : relativeToFolderOf(file, separator);
}

function relativePathOf(file: File, separator: string): string {
  return file.webkitRelativePath.split("/").join(separator);
}

function relativeToFolderOf(file: File, separator: string): string {
  return file.webkitRelativePath.split("/").slice(1).join(separator);
}

function firstSegmentOf(file: File): string {
  return file.webkitRelativePath.split("/")[0];
}
