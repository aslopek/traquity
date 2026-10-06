/** The parts of a file an import reads: the name it carries, the type it states of itself, and its bytes. */
export type ImportedFile = Pick<File, "name" | "type" | "arrayBuffer">;

const PDF_TYPE: string = "application/pdf";

export function isPdf(file: Pick<ImportedFile, "name" | "type">): boolean {
  return file.type === PDF_TYPE || file.name.toLowerCase().endsWith(".pdf");
}
