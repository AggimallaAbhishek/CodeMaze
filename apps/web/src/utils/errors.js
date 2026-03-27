function extractMessage(error) {
  if (!error) {
    return "";
  }
  if (typeof error === "string") {
    return error.trim();
  }
  if (typeof error.message === "string") {
    return error.message.trim();
  }
  return "";
}

export function toActionableError(error, fallbackMessage) {
  const message = extractMessage(error);

  if (!message) {
    return fallbackMessage;
  }

  if (
    /failed to fetch|networkerror|load failed|request failed(\s*\(\d+\))?\.?$/i.test(message) ||
    /network request failed/i.test(message)
  ) {
    return fallbackMessage;
  }

  return message;
}
