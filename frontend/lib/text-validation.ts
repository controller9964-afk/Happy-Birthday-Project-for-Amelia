export function validateText(value: string, maximumLength: number): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "This field cannot be blank.";
  if (trimmed.length > maximumLength) return `Use no more than ${maximumLength} characters.`;
  const hasUnsupportedControl = Array.from(trimmed).some((character) => {
    const code = character.charCodeAt(0);
    return (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
  });
  if (hasUnsupportedControl) {
    return "This field contains unsupported control characters.";
  }
  return null;
}
