/**
 * Get a formatted time string in the America/New_York timezone.
 * @param date   A Date to convert (defaults to now)
 * @returns      Something like "11.30 am" or "4.05 pm"
 */
export function getTimeInEDT(date: Date = new Date()): string {
  // 1) Intl formatter for New York time, 12h clock
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // 2) format → "11:30 AM"
  const formatted = formatter.format(date);

  // 3) convert "11:30 AM" → "11.30 am"
  const [time, period] = formatted.split(" ");
  return `${time.replace(":", ".")} ${period.toLowerCase()}`;
}
