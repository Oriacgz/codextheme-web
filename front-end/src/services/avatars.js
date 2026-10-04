const COUNT = 24;
function randomChoices(selected, excluded) {
  const choices = [selected],
    seen = new Set([...excluded, selected]);
  const value = new Uint32Array(1);
  while (choices.length < COUNT) {
    crypto.getRandomValues(value);
    const seed = value[0] & 0x7fffffff;
    if (!seen.has(seed)) {
      seen.add(seed);
      choices.push(seed);
    }
  }
  return choices;
}
export function initialAvatarChoices(selected) {
  return selected < COUNT
    ? Array.from({ length: COUNT }, (_, index) => index)
    : randomChoices(selected, []);
}
export function shuffleAvatarChoices(selected, previous) {
  return randomChoices(selected, previous);
}
