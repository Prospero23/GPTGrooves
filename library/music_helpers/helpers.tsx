export function scaleValue(
  x: number,
  a: number,
  b: number,
  c: number,
  d: number,
) {
  return c + ((x - a) * (d - c)) / (b - a);
}

export function scaleExponential(
  input: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  exponent: number,
) {
  const normalizedValue = (input - inMin) / (inMax - inMin);
  const scaledExponentialValue = Math.pow(normalizedValue, exponent);
  return outMin + scaledExponentialValue * (outMax - outMin);
}
