const palette = [
  "#2563EB",
  "#7C3AED",
  "#EA580C",
  "#16A34A",
  "#DB2777",
  "#0EA5E9",
  "#F59E0B",
  "#EF4444",
  "#14B8A6",
  "#8B5CF6",
];

export const colorFromText = (input: string) => {
  if (!input) return palette[0];
  let hash = 0;
  for (let index = 0; index < input.length; index++) {
    hash = input.charCodeAt(index) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % palette.length;
  return palette[colorIndex];
};

