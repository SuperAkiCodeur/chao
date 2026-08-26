type ValidationResult =
  | { success: true }
  | { success: false; message: string };

export function validateBirthdayDate(day: number, month: number): ValidationResult {
  if (month < 1 || month > 12) {
    return { success: false, message: "❌ Le mois doit être compris entre 1 et 12." };
  }

  if (day < 1 || day > 31) {
    return { success: false, message: "❌ Le jour doit être compris entre 1 et 31." };
  }

  // 2024 est bissextile, ce qui permet de valider le 29 février.
  const parsedDate = new Date(2024, month - 1, day);

  if (parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) {
    return { success: false, message: "❌ Cette date n'existe pas." };
  }

  return { success: true };
}
