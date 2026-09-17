import type { Cell } from "./types.js";

export function cell(row: number, col: number): Cell {
  return { row, col };
}

export function cellKey(value: Cell): string {
  return `${value.row},${value.col}`;
}

export function sameCell(a: Cell | undefined, b: Cell | undefined): boolean {
  return a?.row === b?.row && a?.col === b?.col;
}

export function columnLabel(col: number): string {
  if (!Number.isInteger(col) || col < 1) throw new Error(`Invalid column number: ${col}`);
  let value = col;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

export function letterNumberCoordinate(value: Cell): string {
  return `${columnLabel(value.col)}${value.row}`;
}

export function rowColumnCoordinate(value: Cell): string {
  return `第${value.row}行第${value.col}格`;
}

export function neighbors(value: Cell, rows: number, cols: number): Cell[] {
  return [
    cell(value.row - 1, value.col),
    cell(value.row + 1, value.col),
    cell(value.row, value.col - 1),
    cell(value.row, value.col + 1)
  ].filter((item) => item.row >= 1 && item.row <= rows && item.col >= 1 && item.col <= cols);
}
