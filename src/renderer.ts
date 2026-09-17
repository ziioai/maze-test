import { cell, cellKey, columnLabel, sameCell } from "./coordinates.js";
import { terrainAt } from "./maze.js";
import type { Language, Maze } from "./types.js";

const SYMBOLS = { key: "K", chest: "B", trap: "T", medicine: "H", potion: "P" } as const;

export function renderCharacterMaze(maze: Maze, language: Language = "en"): string {
  const rowWidth = String(maze.rows).length;
  const prefix = " ".repeat(rowWidth + 1);
  const objects = new Map(
    maze.objects.map((item) => [cellKey(item.position), SYMBOLS[item.type]])
  );
  const doors = new Set(maze.doors.map((item) => cellKey(item.position)));
  const heading = Array.from({ length: maze.cols }, (_, index) =>
    center(columnLabel(index + 1), 2)
  ).join("");
  const lines = [`${prefix}${heading}`.trimEnd()];
  for (let row = 1; row <= maze.rows; row += 1) {
    let line = `${String(row).padStart(rowWidth, " ")} `;
    for (let col = 1; col <= maze.cols; col += 1) {
      const position = cell(row, col);
      let symbol = " ";
      if (terrainAt(maze, position) === "#") symbol = "█";
      else if (sameCell(position, maze.entry)) symbol = "S";
      else if (sameCell(position, maze.goal)) symbol = "G";
      else if (doors.has(cellKey(position))) symbol = "D";
      else symbol = objects.get(cellKey(position)) ?? " ";
      line += symbol === "█" ? "██" : `${symbol} `;
    }
    lines.push(line.trimEnd());
  }
  lines.push("");
  lines.push(
    language === "zh"
      ? "图例：实心方块为墙格；空白为通路格；S入口；G终点；D门；K钥匙；B宝箱；T陷阱；H药品房；P药水。左上角为A1。"
      : "Legend: solid blocks are walls; blank cells are passages; S entry; G goal; D door; K key; B chest; T trap; H medicine room; P potion. The top-left cell is A1."
  );
  return `${lines.join("\n")}\n`;
}

function center(value: string, width: number): string {
  const left = Math.floor((width - value.length) / 2);
  return `${" ".repeat(Math.max(0, left))}${value}${" ".repeat(
    Math.max(0, width - value.length - left)
  )}`;
}
