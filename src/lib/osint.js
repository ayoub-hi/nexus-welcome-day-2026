export function normalizeAnswer(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isCorrectAnswer(submitted, acceptableAnswersJson) {
  const acceptable = JSON.parse(acceptableAnswersJson);
  const normalizedSubmitted = normalizeAnswer(submitted);
  return acceptable.some((a) => normalizeAnswer(a) === normalizedSubmitted);
}
