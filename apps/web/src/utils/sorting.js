export function applySwap(values, left, right) {
  const next = [...values];
  [next[left], next[right]] = [next[right], next[left]];
  return next;
}

export function isSorted(values) {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1] > values[index]) {
      return false;
    }
  }
  return true;
}
