const SHANGHAI = "Asia/Shanghai";

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHANGHAI,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function shanghaiDate(date: Date = new Date()): string {
  return dateFmt.format(date);
}

export function yesterdayShanghai(now: Date = new Date()): string {
  const today = shanghaiDate(now);
  const todayStart = new Date(`${today}T00:00:00+08:00`);
  const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  return shanghaiDate(yesterday);
}

export function shanghaiDateOf(isoOrDate: string | Date): string | null {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return shanghaiDate(date);
}

export function isOnShanghaiDate(isoOrDate: string | Date, ymd: string): boolean {
  return shanghaiDateOf(isoOrDate) === ymd;
}
