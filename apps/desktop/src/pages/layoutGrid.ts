export type GridColumnCount = 1 | 2 | 3;

const splitGridColumnsClassName: Record<GridColumnCount, string> = {
  1: "grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
};

const cardGridColumnsClassName: Record<GridColumnCount, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
};

export function getSplitGridClassName(columns: GridColumnCount) {
  return `grid items-start gap-6 ${splitGridColumnsClassName[columns]}`;
}

export function getCardGridClassName(columns: GridColumnCount) {
  return `grid auto-rows-fr items-stretch gap-4 ${cardGridColumnsClassName[columns]}`;
}
