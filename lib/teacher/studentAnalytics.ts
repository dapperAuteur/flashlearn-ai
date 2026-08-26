import { Types } from 'mongoose';
import { FlashcardSet } from '@/models/FlashcardSet';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { StudySession } from '@/models/StudySession';

/**
 * One learner's study numbers, for whoever is allowed to see them.
 *
 * Everything here reads the two collections the learner's own screens read, so
 * a teacher and a student are never looking at two different figures for the
 * same thing:
 *
 *   StudySession   session count, correct and incorrect cards, session dates,
 *                  and the recent window. `/api/study/history` and the weekly
 *                  accuracy in `/api/study/analytics` come from here too.
 *   StudyAnalytics time studied, per-set average score, and the per-card
 *                  record. Keyed on `profile`, which is why the caller passes
 *                  profile ids rather than a user id for that half.
 *
 * `StudySession.userId` is the learner even when an adult ran the session; the
 * adult is in `proctorId`. So a proctored session counts toward the student and
 * never toward the teacher, with no special case anywhere in this file.
 *
 * Known duplication, to be paid off rather than forgotten: the two aggregations
 * below overlap with `app/api/study/stats/route.ts` and
 * `app/api/study/analytics/route.ts`, which compute the same shapes hardcoded
 * to the signed-in user. This module is where the shared version belongs. Those
 * two routes should call it with their own user id and profile ids, and were
 * left alone here only because they were outside this change.
 */

/** How far back "recent" reaches. Long enough to cover a teaching unit. */
export const RECENT_WINDOW_DAYS = 30;
/** Sessions listed by date. A teacher scanning before a lesson wants a page, not a log. */
export const RECENT_SESSION_LIMIT = 10;
/** How many cards the "keeps getting these wrong" list holds. */
export const PROBLEM_CARD_LIMIT = 20;
/** Card fronts are free text and can be long. This keeps a table row readable. */
const CARD_TEXT_LIMIT = 120;

interface ModePerformanceRow {
  mode?: string;
  direction?: string;
  correctCount?: number;
  incorrectCount?: number;
}

interface CardPerformanceRow {
  cardId?: Types.ObjectId;
  correctCount?: number;
  incorrectCount?: number;
  modePerformance?: ModePerformanceRow[];
}

interface AnalyticsRow {
  set?: Types.ObjectId;
  cardPerformance?: CardPerformanceRow[];
  setPerformance?: {
    totalStudySessions?: number;
    totalTimeStudied?: number;
    averageScore?: number;
  };
}

interface SessionRow {
  _id: Types.ObjectId;
  sessionId?: string;
  listId?: Types.ObjectId;
  setName?: string;
  startTime?: Date;
  endTime?: Date;
  correctCount?: number;
  incorrectCount?: number;
  studyMode?: string;
  proctorId?: Types.ObjectId | null;
}

interface SetTitleRow {
  _id: Types.ObjectId;
  title?: string;
  flashcards?: { _id?: Types.ObjectId; front?: string }[];
}

export interface StudentTotals {
  sessions: number;
  cardsAnswered: number;
  correct: number;
  incorrect: number;
  /**
   * Null when nothing has been answered. Zero is a claim about performance and
   * "we have nothing to go on" is not, so they must not share a value.
   */
  accuracy: number | null;
  timeStudiedSeconds: number;
  /** The per-set average score weighted by sessions, as on the learner's own dashboard. */
  averageSessionScore: number | null;
}

export interface StudentRecentTotals {
  windowDays: number;
  sessions: number;
  cardsAnswered: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  timeStudiedSeconds: number;
}

export interface StudentSessionRow {
  id: string;
  setId: string | null;
  setName: string;
  startedAt: string | null;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  durationSeconds: number | null;
  studyMode: string | null;
  /** True when an adult ran this session for the learner. */
  proctored: boolean;
}

export interface StudentSetRow {
  setId: string;
  setName: string;
  sessions: number;
  timeStudiedSeconds: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  averageScore: number | null;
  cardsTracked: number;
}

export interface StudentProblemCard {
  cardId: string;
  setId: string;
  setName: string;
  front: string | null;
  correct: number;
  incorrect: number;
  accuracy: number;
  weakestMode: { mode: string; direction: string; accuracy: number } | null;
}

export interface StudentAnalyticsReport {
  /**
   * False when this learner has no study history at all. The page shows an
   * empty state instead of a wall of zeros, which say something different.
   */
  hasStudied: boolean;
  totals: StudentTotals;
  recent: StudentRecentTotals;
  sessions: StudentSessionRow[];
  sets: StudentSetRow[];
  problemCards: StudentProblemCard[];
}

/** Rounded percentage, or null when there is nothing to divide. */
function accuracyOf(correct: number, incorrect: number): number | null {
  const total = correct + incorrect;
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

function truncate(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > CARD_TEXT_LIMIT ? `${clean.slice(0, CARD_TEXT_LIMIT - 1)}...` : clean;
}

interface SessionSums {
  sessions: number;
  correct: number;
  incorrect: number;
  timeMs: number;
}

/**
 * Sums over completed sessions. `$subtract` on a session with no end time gives
 * null, and `$sum` skips non-numbers, so an interrupted session adds no time
 * rather than a negative one.
 */
async function sumSessions(match: Record<string, unknown>): Promise<SessionSums> {
  const rows = await StudySession.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        sessions: { $sum: 1 },
        correct: { $sum: '$correctCount' },
        incorrect: { $sum: '$incorrectCount' },
        timeMs: { $sum: { $subtract: ['$endTime', '$startTime'] } },
      },
    },
  ]);

  const row = rows[0];
  return {
    sessions: row?.sessions ?? 0,
    correct: row?.correct ?? 0,
    incorrect: row?.incorrect ?? 0,
    timeMs: row?.timeMs ?? 0,
  };
}

export async function buildStudentAnalytics(params: {
  userId: Types.ObjectId;
  profileIds: Types.ObjectId[];
  now?: Date;
}): Promise<StudentAnalyticsReport> {
  const { userId, profileIds } = params;
  const now = params.now ?? new Date();
  const windowStart = new Date(now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const completed = { userId, status: 'completed' };

  const [allTime, recent, analyticsRows, latestSessions] = await Promise.all([
    sumSessions(completed),
    sumSessions({ ...completed, startTime: { $gte: windowStart } }),
    profileIds.length
      ? (StudyAnalytics.find({ profile: { $in: profileIds } })
          .select('set setPerformance cardPerformance')
          .lean() as Promise<AnalyticsRow[]>)
      : Promise.resolve([] as AnalyticsRow[]),
    StudySession.find(completed)
      .sort({ startTime: -1 })
      .limit(RECENT_SESSION_LIMIT)
      .select('sessionId listId setName startTime endTime correctCount incorrectCount studyMode proctorId')
      .lean<SessionRow[]>(),
  ]);

  // Per set, and per card inside each set. One pass over the analytics rows
  // fills both, because they read the same subdocuments.
  const setRows: StudentSetRow[] = [];
  const candidateCards: StudentProblemCard[] = [];
  let analyticsTimeSeconds = 0;
  let weightedScore = 0;
  let scoreWeight = 0;
  let trackedAttempts = 0;

  for (const row of analyticsRows) {
    const setId = row.set ? String(row.set) : '';
    const performance = row.setPerformance ?? {};
    const sessionsForSet = performance.totalStudySessions ?? 0;
    const timeForSet = performance.totalTimeStudied ?? 0;

    analyticsTimeSeconds += timeForSet;
    if (sessionsForSet > 0) {
      weightedScore += (performance.averageScore ?? 0) * sessionsForSet;
      scoreWeight += sessionsForSet;
    }

    let setCorrect = 0;
    let setIncorrect = 0;
    let cardsTracked = 0;

    for (const card of row.cardPerformance ?? []) {
      const correct = card.correctCount ?? 0;
      const incorrect = card.incorrectCount ?? 0;
      const attempts = correct + incorrect;
      if (attempts === 0) continue;

      setCorrect += correct;
      setIncorrect += incorrect;
      cardsTracked += 1;
      trackedAttempts += attempts;

      // Every card the learner has got wrong at least once is a candidate. The
      // learner's own analytics page needs two attempts before it calls a card
      // a problem, which is right for a "what should I revise" list. A teacher
      // is asking a different question, and a card missed on its only outing is
      // exactly the one to ask the student about.
      if (incorrect === 0 || !card.cardId) continue;

      let weakestMode: StudentProblemCard['weakestMode'] = null;
      for (const mode of card.modePerformance ?? []) {
        const modeCorrect = mode.correctCount ?? 0;
        const modeIncorrect = mode.incorrectCount ?? 0;
        const modeAccuracy = accuracyOf(modeCorrect, modeIncorrect);
        if (modeAccuracy === null || !mode.mode || !mode.direction) continue;
        if (!weakestMode || modeAccuracy < weakestMode.accuracy) {
          weakestMode = { mode: mode.mode, direction: mode.direction, accuracy: modeAccuracy };
        }
      }

      candidateCards.push({
        cardId: String(card.cardId),
        setId,
        setName: '',
        front: null,
        correct,
        incorrect,
        accuracy: accuracyOf(correct, incorrect) ?? 0,
        weakestMode,
      });
    }

    if (!setId) continue;

    setRows.push({
      setId,
      setName: '',
      sessions: sessionsForSet,
      timeStudiedSeconds: timeForSet,
      correct: setCorrect,
      incorrect: setIncorrect,
      accuracy: accuracyOf(setCorrect, setIncorrect),
      averageScore: sessionsForSet > 0 ? Math.round(performance.averageScore ?? 0) : null,
      cardsTracked,
    });
  }

  // Worst first, and where two cards are equally bad the one missed more often
  // leads, because it is the one the student keeps hitting.
  candidateCards.sort((a, b) => a.accuracy - b.accuracy || b.incorrect - a.incorrect);
  const problemCards = candidateCards.slice(0, PROBLEM_CARD_LIMIT);

  // Titles for every set named anywhere in the response, and card fronts only
  // for the handful of sets the problem list actually reaches. Fetching every
  // card of every set would be the whole library.
  const titleIds = new Set<string>();
  for (const row of setRows) titleIds.add(row.setId);
  for (const session of latestSessions) if (session.listId) titleIds.add(String(session.listId));
  const cardTextIds = new Set(problemCards.map((card) => card.setId).filter(Boolean));
  for (const id of cardTextIds) titleIds.add(id);

  const validIds = [...titleIds].filter((id) => Types.ObjectId.isValid(id));
  const titleOnlyIds = validIds.filter((id) => !cardTextIds.has(id));

  const [titleDocs, cardDocs] = await Promise.all([
    titleOnlyIds.length
      ? FlashcardSet.find({ _id: { $in: titleOnlyIds.map((id) => new Types.ObjectId(id)) } })
          .select('title')
          .lean<SetTitleRow[]>()
      : Promise.resolve([] as SetTitleRow[]),
    cardTextIds.size
      ? FlashcardSet.find({
          _id: { $in: [...cardTextIds].map((id) => new Types.ObjectId(id)) },
        })
          .select('title flashcards._id flashcards.front')
          .lean<SetTitleRow[]>()
      : Promise.resolve([] as SetTitleRow[]),
  ]);

  const titles = new Map<string, string>();
  const fronts = new Map<string, string>();
  for (const doc of [...titleDocs, ...cardDocs]) {
    titles.set(String(doc._id), doc.title ?? 'Untitled set');
    for (const card of doc.flashcards ?? []) {
      if (card._id && card.front) fronts.set(String(card._id), truncate(card.front));
    }
  }

  for (const row of setRows) {
    row.setName = titles.get(row.setId) ?? 'A set that has since been deleted';
  }
  setRows.sort((a, b) => {
    // Weakest sets first, so the answer to "who is stuck on what" is at the top.
    const left = a.accuracy ?? 101;
    const right = b.accuracy ?? 101;
    return left - right || a.setName.localeCompare(b.setName);
  });

  for (const card of problemCards) {
    card.setName = titles.get(card.setId) ?? 'A set that has since been deleted';
    card.front = fronts.get(card.cardId) ?? null;
  }

  const sessions: StudentSessionRow[] = latestSessions.map((session) => {
    const setId = session.listId ? String(session.listId) : null;
    const correct = session.correctCount ?? 0;
    const incorrect = session.incorrectCount ?? 0;
    const durationSeconds =
      session.endTime && session.startTime
        ? Math.max(
            0,
            Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000),
          )
        : null;

    return {
      id: session.sessionId ?? String(session._id),
      setId,
      setName:
        (setId ? titles.get(setId) : undefined) ?? session.setName ?? 'A set that has since been deleted',
      startedAt: session.startTime ? session.startTime.toISOString() : null,
      correct,
      incorrect,
      accuracy: accuracyOf(correct, incorrect),
      durationSeconds,
      studyMode: session.studyMode ?? null,
      proctored: Boolean(session.proctorId),
    };
  });

  const hasStudied =
    allTime.sessions > 0 || scoreWeight > 0 || trackedAttempts > 0 || analyticsTimeSeconds > 0;

  return {
    hasStudied,
    totals: {
      sessions: allTime.sessions,
      cardsAnswered: allTime.correct + allTime.incorrect,
      correct: allTime.correct,
      incorrect: allTime.incorrect,
      accuracy: accuracyOf(allTime.correct, allTime.incorrect),
      timeStudiedSeconds: Math.round(analyticsTimeSeconds),
      averageSessionScore: scoreWeight > 0 ? Math.round(weightedScore / scoreWeight) : null,
    },
    recent: {
      windowDays: RECENT_WINDOW_DAYS,
      sessions: recent.sessions,
      cardsAnswered: recent.correct + recent.incorrect,
      correct: recent.correct,
      incorrect: recent.incorrect,
      accuracy: accuracyOf(recent.correct, recent.incorrect),
      timeStudiedSeconds: Math.round(recent.timeMs / 1000),
    },
    sessions,
    sets: setRows,
    problemCards,
  };
}
