export function isPlaceholderName(value: string) {
  return /^(motiion|motion)\s+user$/i.test(value.trim());
}

export function initialProfileNames(fullName: string) {
  const name = isPlaceholderName(fullName) ? "" : fullName.trim();
  const [firstName = "", ...rest] = name.split(/\s+/);
  return { firstName, lastName: rest.join(" "), displayName: name };
}

type Names = { firstName: string; lastName: string; displayName: string };

export function normalizeProfileNames(names: Names): Names {
  const fullName = `${names.firstName} ${names.lastName}`.trim();
  return {
    firstName: isPlaceholderName(fullName) ? "" : names.firstName,
    lastName: isPlaceholderName(fullName) ? "" : names.lastName,
    displayName: !names.displayName.trim() || isPlaceholderName(names.displayName)
      ? (isPlaceholderName(fullName) ? "" : fullName)
      : names.displayName,
  };
}

/** Follow changes to the full name until the user supplies a custom display name. */
export function updateProfileNames(current: Names, patch: Partial<Names>): Names {
  const next = { ...current, ...patch };
  const previousFullName = `${current.firstName} ${current.lastName}`.trim();
  if (patch.displayName === undefined && (patch.firstName !== undefined || patch.lastName !== undefined)
    && (!current.displayName.trim() || current.displayName === previousFullName || isPlaceholderName(current.displayName))) {
    next.displayName = `${next.firstName.trim()} ${next.lastName.trim()}`.trim();
  }
  return next;
}
