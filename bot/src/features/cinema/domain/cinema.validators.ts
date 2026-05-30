export type CinemaValidationResult =
  | { success: true }
  | { success: false; message: string };

const CINEMA_DATE_REGEX = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/;
const CINEMA_TIME_REGEX = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;

export function isValidCinemaDateFormat(value: string): boolean {
  return CINEMA_DATE_REGEX.test(value.trim());
}

export function isValidCinemaTimeFormat(value: string): boolean {
  return CINEMA_TIME_REGEX.test(value.trim());
}

export function parseCinemaViewingDate(date: string, time: string): Date | null {
  const normalizedDate = date.trim();
  const normalizedTime = time.trim();

  if (!isValidCinemaDateFormat(normalizedDate) || !isValidCinemaTimeFormat(normalizedTime)) {
    return null;
  }

  const [dayRaw, monthRaw, yearRaw] = normalizedDate.split("/");
  const [hoursRaw, minutesRaw] = normalizedTime.split(":");

  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  const fullYear = yearRaw.length === 2 ? 2000 + year : year;

  const parsedDate = new Date(fullYear, month - 1, day, hours, minutes, 0, 0);

  const isSameDate =
    parsedDate.getFullYear() === fullYear &&
    parsedDate.getMonth() === month - 1 &&
    parsedDate.getDate() === day &&
    parsedDate.getHours() === hours &&
    parsedDate.getMinutes() === minutes;

  if (!isSameDate) {
    return null;
  }

  return parsedDate;
}

export function validateCinemaScheduleInput(
  date: string,
  time: string,
): CinemaValidationResult {
  if (!isValidCinemaDateFormat(date)) {
    return {
      success: false,
      message: "❌ Format de date invalide. Utilise par exemple 19/05/26.",
    };
  }

  if (!isValidCinemaTimeFormat(time)) {
    return {
      success: false,
      message: "❌ Format d’heure invalide. Utilise par exemple 21:00.",
    };
  }

  const viewingDate = parseCinemaViewingDate(date, time);

  if (!viewingDate) {
    return {
      success: false,
      message: "❌ Date ou heure invalide.",
    };
  }

  if (viewingDate.getTime() <= Date.now()) {
    return {
      success: false,
      message: "❌ Tu ne peux pas programmer un visionnage dans le passé.",
    };
  }

  return { success: true };
}

export function validateCinemaTitleInput(title: string): CinemaValidationResult {
  const normalizedTitle = title.trim();

  if (!normalizedTitle.length) {
    return {
      success: false,
      message: "❌ Le titre est obligatoire.",
    };
  }

  if (normalizedTitle.length < 2) {
    return {
      success: false,
      message: "❌ Le titre est trop court.",
    };
  }

  if (normalizedTitle.length > 150) {
    return {
      success: false,
      message: "❌ Le titre est trop long.",
    };
  }

  return { success: true };
}