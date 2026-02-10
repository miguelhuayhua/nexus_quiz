function normalizePrimitive(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim().toLowerCase();
}

function normalizeChoiceValue(value: unknown): string {
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;

    if (candidate.value !== undefined) {
      return normalizePrimitive(candidate.value);
    }

    if (candidate.url !== undefined) {
      return normalizePrimitive(candidate.url);
    }
  }

  return normalizePrimitive(value);
}

export function parseRespuesta(raw: unknown, kind?: string): unknown {
  if (raw === null || raw === undefined) return null;

  const rawText = typeof raw === "string" ? raw.trim() : String(raw).trim();
  if (!rawText) return null;

  if (kind === "NUMBER") {
    const n = Number(rawText);
    return Number.isFinite(n) ? n : null;
  }

  if (kind === "CHOICE_MULTI") {
    try {
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed)) return null;

      const normalized = parsed
        .map((item) => normalizeChoiceValue(item))
        .filter((item) => item.length > 0);

      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  }

  return normalizeChoiceValue(rawText);
}

export function normalizeSolucion(value: unknown, kind?: string): unknown {
  if (value === null || value === undefined) return null;

  if (kind === "NUMBER") {
    const numericValue =
      typeof value === "number"
        ? value
        : Number(
            typeof value === "object" && value !== null && "value" in (value as Record<string, unknown>)
              ? (value as Record<string, unknown>).value
              : value,
          );

    return Number.isFinite(numericValue) ? numericValue : null;
  }

  if (kind === "CHOICE_MULTI") {
    const source = Array.isArray(value) ? value : [value];

    const normalized = source
      .map((item) => normalizeChoiceValue(item))
      .filter((item) => item.length > 0);

    return normalized.length > 0 ? normalized : null;
  }

  if (kind === "CHOICE_SINGLE") {
    const source = Array.isArray(value) ? value[0] : value;
    const normalized = normalizeChoiceValue(source);
    return normalized.length > 0 ? normalized : null;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => normalizeChoiceValue(item))
      .filter((item) => item.length > 0);

    if (normalized.length === 0) return null;
    return normalized.length === 1 ? normalized[0] : normalized;
  }

  const normalized = normalizeChoiceValue(value);
  return normalized.length > 0 ? normalized : null;
}

export function compareRespuesta(userValue: unknown, correctValue: unknown): boolean {
  if (userValue === null || correctValue === null) return false;

  if (typeof userValue === "number" || typeof correctValue === "number") {
    return Number(userValue) === Number(correctValue);
  }

  if (Array.isArray(userValue) || Array.isArray(correctValue)) {
    const userArray = (Array.isArray(userValue) ? userValue : [userValue])
      .map((item) => normalizeChoiceValue(item))
      .filter((item) => item.length > 0);
    const correctArray = (Array.isArray(correctValue) ? correctValue : [correctValue])
      .map((item) => normalizeChoiceValue(item))
      .filter((item) => item.length > 0);

    if (userArray.length !== correctArray.length) return false;

    const userSet = new Set(userArray);
    return correctArray.every((item) => userSet.has(item));
  }

  return normalizeChoiceValue(userValue) === normalizeChoiceValue(correctValue);
}
