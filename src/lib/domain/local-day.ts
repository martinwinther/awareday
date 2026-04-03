export type LocalDayBounds = {
  startOfDay: Date;
  startOfNextDay: Date;
};

export function getLocalDayBounds(day: Date): LocalDayBounds {
  const startOfDay = new Date(day);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);

  return {
    startOfDay,
    startOfNextDay,
  };
}

export function isOnLocalDay(date: Date, day: Date): boolean {
  const { startOfDay, startOfNextDay } = getLocalDayBounds(day);
  return date >= startOfDay && date < startOfNextDay;
}
