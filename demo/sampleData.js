// Sample goals and tasks for demo users. Dates are computed relative to "today" in the
// user's time zone, so the demo always shows last week, this week, today and upcoming tasks.
const WEEK_START = 6; // Saturday, same as DEFAULT_PROFILE in the frontend

function resolveTz(tz, fallback = "Asia/Riyadh") {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return fallback;
  }
}

function dayIn(tz, base = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysIntoWeek(day, weekStart = WEEK_START) {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  return (dow - weekStart + 7) % 7;
}

const GOALS = [
  { key: "fitness", title: "Get back in shape", why: "More energy for work and life", status: "active", targetIn: 60 },
  { key: "career", title: "Land a developer role", why: "Turn self-study into a career", status: "active", targetIn: 90 },
  { key: "reading", title: "Read 12 books this year", why: "Build a steady reading habit", status: "paused", targetIn: null },
];

// Last week: lower completion (3 of 8) so this week looks like progress
const LAST_WEEK = [
  { title: "Morning run 5km", dow: 0, done: true, effort: "mid", goalKey: "fitness" },
  { title: "Update CV", dow: 1, done: false, effort: "low", goalKey: "career" },
  { title: "قراءة 20 صفحة من كتاب", dow: 1, done: true, effort: "low", goalKey: "reading" },
  { title: "Gym: upper body", dow: 2, done: false, effort: "high", goalKey: "fitness" },
  { title: "Finish React course module", dow: 3, done: true, effort: "mid", goalKey: "career" },
  { title: "Meal prep for the week", dow: 4, done: false, effort: "mid", goalKey: "fitness" },
  { title: "Apply to 3 jobs", dow: 5, done: false, effort: "mid", goalKey: "career" },
  { title: "Gym: lower body", dow: 6, done: false, effort: "high", goalKey: "fitness" },
];

// Earlier days of this week, counted back from today (only those inside the week are used)
const THIS_WEEK_PAST = [
  { title: "Write project README", back: 1, done: true, effort: "low", goalKey: "career" },
  { title: "Evening walk", back: 1, done: true, effort: "low", goalKey: "fitness" },
  { title: "Apply to 3 jobs", back: 2, done: true, effort: "mid", goalKey: "career" },
  { title: "Read 30 pages", back: 3, done: false, effort: "low", goalKey: "reading" },
  { title: "Gym: full body", back: 4, done: true, effort: "high", goalKey: "fitness" },
  { title: "Fix portfolio contact form", back: 5, done: true, effort: "mid", goalKey: "career" },
  { title: "Morning run 5km", back: 6, done: true, effort: "mid", goalKey: "fitness" },
];

const TODAY = [
  { title: "مراجعة أسئلة المقابلة التقنية", done: false, effort: "mid", goalKey: "career" },
  { title: "Evening walk", done: true, effort: "low", goalKey: "fitness" },
  { title: "Push code to GitHub", done: true, effort: "low", goalKey: "career" },
];

// Only one task tomorrow, the rest in next week, so open tasks barely pull this week down
const UPCOMING = [
  { title: "Deploy portfolio update", at: "tomorrow", effort: "high", goalKey: "career" },
  { title: "Gym: upper body", at: "nextWeek", dow: 0, effort: "high", goalKey: "fitness" },
  { title: "Mock interview with a friend", at: "nextWeek", dow: 1, effort: "mid", goalKey: "career" },
];

const BACKLOG = [
  { title: "Pick next book", effort: "low", goalKey: "reading" },
];

function buildSampleData(tz, now = new Date()) {
  const today = dayIn(resolveTz(tz), now);
  const into = daysIntoWeek(today);
  const thisWeek = addDays(today, -into);
  const lastWeek = addDays(thisWeek, -7);
  const nextWeek = addDays(thisWeek, 7);

  const goals = GOALS.map((g) => ({
    key: g.key,
    title: g.title,
    why: g.why,
    status: g.status,
    targetDate: g.targetIn === null ? null : addDays(today, g.targetIn),
  }));

  const task = (t, date, done = false) => ({
    title: t.title,
    date,
    done,
    effort: t.effort,
    goalKey: t.goalKey,
  });

  const tasks = [
    ...LAST_WEEK.map((t) => task(t, addDays(lastWeek, t.dow), t.done)),
    ...THIS_WEEK_PAST.filter((t) => t.back <= into).map((t) => task(t, addDays(today, -t.back), t.done)),
    ...TODAY.map((t) => task(t, today, t.done)),
    ...UPCOMING.map((t) =>
      task(t, t.at === "tomorrow" ? addDays(today, 1) : addDays(nextWeek, t.dow)),
    ),
    ...BACKLOG.map((t) => task(t, null)),
  ];

  return { goals, tasks };
}

module.exports = { buildSampleData, resolveTz, dayIn, addDays };