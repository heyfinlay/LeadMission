export const clampScore = (score: number): number => {
  if (Number.isNaN(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};
