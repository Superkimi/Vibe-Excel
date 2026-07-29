export interface CellPosition {
  row: number;
  column: number;
}

export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

export function columnToIndex(column: string): number {
  let result = 0;
  for (const letter of column.toUpperCase()) {
    result = result * 26 + letter.charCodeAt(0) - 64;
  }
  return result - 1;
}

export function indexToColumn(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

export function parseCellAddress(address: string): CellPosition {
  const match = /^([A-Z]+)([1-9][0-9]*)$/i.exec(address);
  if (!match) throw new Error(`Invalid cell address: ${address}`);
  return {
    column: columnToIndex(match[1]),
    row: Number(match[2]) - 1,
  };
}

export function toCellAddress(position: CellPosition): string {
  return `${indexToColumn(position.column)}${position.row + 1}`;
}

export function parseRangeAddress(range: string): CellRange {
  const [startAddress, endAddress = startAddress] = range.split(":");
  const start = parseCellAddress(startAddress);
  const end = parseCellAddress(endAddress);
  return {
    start: {
      row: Math.min(start.row, end.row),
      column: Math.min(start.column, end.column),
    },
    end: {
      row: Math.max(start.row, end.row),
      column: Math.max(start.column, end.column),
    },
  };
}

export function addressesInRange(range: string, limit = 100_000): string[] {
  const parsed = parseRangeAddress(range);
  const count = (parsed.end.row - parsed.start.row + 1) * (parsed.end.column - parsed.start.column + 1);
  if (count > limit) throw new Error(`Range ${range} exceeds ${limit.toLocaleString()} cells`);
  const addresses: string[] = [];
  for (let row = parsed.start.row; row <= parsed.end.row; row += 1) {
    for (let column = parsed.start.column; column <= parsed.end.column; column += 1) {
      addresses.push(toCellAddress({ row, column }));
    }
  }
  return addresses;
}
