export const countPattern: RegExp = /^(\d*[1-9]\d*([.,]\d+)?|\d+[.,]\d*[1-9]\d*)$/;

export function isValidCount(count: number | undefined): count is number {
  return count !== undefined && count > 0;
}
