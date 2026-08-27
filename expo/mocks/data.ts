import { DayKey } from "@/components/DayOfWeekPicker";
import { weekdayOf } from "@/utils/date";

export type Priority = "high" | "medium" | "low";
export type WeekDay = DayKey;
export type SummitTerm = "short" | "long";
export type SummitStatus = "active" | "background" | "completed";

export interface Checkpoint {
  id: string;
  title: string;
  done: boolean;
  dueDate?: string;
  detail?: string;
}

export interface Summit {
  id: string;
  name: string;
  purpose: string;
  forWhom: string;
  term: SummitTerm;
  deadline?: string;
  details: string;
  priority: Priority;
  values: string[];
  status: SummitStatus;
  startedAt: string;
  completedAt?: string;
  /** Whether the user enabled a reward for completing this summit. */
  hasReward: boolean;
  /** The reward text the user entered. Shown when the summit is completed. */
  reward: string;
}

export type HabitStatus = "done" | "missed" | null;

export interface Objective {
  id: string;
  title: string;
  /** Summits this habit is tied to. A habit may support multiple summits. */
  summitIds: string[];
  /** Weight of the objective toward momentum, 1–3. */
  value: number;
  /** Why this habit matters — the user's motivation. */
  purpose: string;
  /** YYYY-MM-DD dates on which this habit was completed. */
  completions: string[];
  /** YYYY-MM-DD dates on which the habit was explicitly marked not completed. */
  misses: string[];
  /** Days of the week this habit is active. Empty = every day. */
  daysOfWeek: WeekDay[];
  /** YYYY-MM-DD date the habit was created. Logging is only allowed on/after this date. */
  createdAt: string;
}

/** Returns true when the habit was completed on the given YYYY-MM-DD date. */
export function isDoneOn(objective: Objective, dateKey: string): boolean {
  return objective.completions.includes(dateKey);
}

/** Returns true when the habit was explicitly marked not completed on the given date. */
export function isMissedOn(objective: Objective, dateKey: string): boolean {
  return objective.misses.includes(dateKey);
}

/** Returns the habit status for the given date: done, missed, or null (unlogged). */
export function habitStatusOn(objective: Objective, dateKey: string): HabitStatus {
  if (isDoneOn(objective, dateKey)) return "done";
  if (isMissedOn(objective, dateKey)) return "missed";
  return null;
}

/** Returns true when the habit has been logged (done or missed) on the given date. */
export function isLoggedOn(objective: Objective, dateKey: string): boolean {
  return isDoneOn(objective, dateKey) || isMissedOn(objective, dateKey);
}

/**
 * Returns the WeekDay key (sun–sat) for a YYYY-MM-DD date string,
 * computed in the user's local timezone.
 */
export function weekdayKeyFor(dateKey: string): WeekDay {
  const keys: WeekDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return keys[weekdayOf(dateKey)];
}

/**
 * Returns true when the habit is scheduled to run on the given YYYY-MM-DD date.
 * A habit with no daysOfWeek set runs every day.
 */
export function isActiveOnDate(objective: Objective, dateKey: string): boolean {
  if (objective.daysOfWeek.length === 0) return true;
  return objective.daysOfWeek.includes(weekdayKeyFor(dateKey));
}

export interface Verse {
  text: string;
  reference: string;
}

export const VERSES: Verse[] = [
  {
    text: "Stand fast therefore in the liberty wherewith Christ hath made us free, and be not entangled again with the yoke of bondage.",
    reference: "Galatians 5:1",
  },
  {
    text: "Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us lay aside every weight, and the sin which doth so easily beset us, and let us run with patience the race that is set before us,",
    reference: "Hebrews 12:1",
  },
  {
    text: "Holding forth the word of life; that I may rejoice in the day of Christ, that I have not run in vain, neither laboured in vain.",
    reference: "Philippians 2:16",
  },
  {
    text: "I therefore so run, not as uncertainly; so fight I, not as one that beateth the air:",
    reference: "1 Corinthians 9:26",
  },
  {
    text: "But I keep under my body, and bring it into subjection: lest that by any means, when I have preached to others, I myself should be a castaway.",
    reference: "1 Corinthians 9:27",
  },
  {
    text: "Know ye not that they which run in a race run all, but one receiveth the prize? So run, that ye may obtain.",
    reference: "1 Corinthians 9:24",
  },
  {
    text: "Let us labour therefore to enter into that rest, lest any man fall after the same example of unbelief.",
    reference: "Hebrews 4:11",
  },
  {
    text: "For therefore we both labour and suffer reproach, because we trust in the living God, who is the Saviour of all men, specially of those that believe.",
    reference: "1 Timothy 4:10",
  },
  {
    text: "In all labour there is profit: but the talk of the lips tendeth only to penury.",
    reference: "Proverbs 14:23",
  },
  {
    text: "Go to the ant, thou sluggard; consider her ways, and be wise:",
    reference: "Proverbs 6:6",
  },
  {
    text: "For the LORD shall be thy confidence, and shall keep thy foot from being taken.",
    reference: "Proverbs 3:26",
  },
  {
    text: "Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ:",
    reference: "Philippians 1:6",
  },
  {
    text: "And we know that all things work together for good to them that love God, to them that are the called according to his purpose.",
    reference: "Romans 8:28",
  },
  {
    text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
    reference: "Matthew 6:33",
  },
  {
    text: "And the LORD, he it is that doth go before thee; he will be with thee, he will not fail thee, neither forsake thee: fear not, neither be dismayed.",
    reference: "Deuteronomy 31:8",
  },
  {
    text: "Above all, taking the shield of faith, wherewith ye shall be able to quench all the fiery darts of the wicked.",
    reference: "Ephesians 6:16",
  },
  {
    text: "But this I say, He which soweth sparingly shall reap also sparingly; and he which soweth bountifully shall reap also bountifully.",
    reference: "2 Corinthians 9:6",
  },
  {
    text: "Be not deceived; God is not mocked: for whatsoever a man soweth, that shall he also reap.",
    reference: "Galatians 6:7",
  },
  {
    text: "Whether therefore ye eat, or drink, or whatsoever ye do, do all to the glory of God.",
    reference: "1 Corinthians 10:31",
  },
  {
    text: "But to do good and to communicate forget not: for with such sacrifices God is well pleased.",
    reference: "Hebrews 13:16",
  },
  {
    text: "With good will doing service, as to the Lord, and not to men:",
    reference: "Ephesians 6:7",
  },
  {
    text: "As we have therefore opportunity, let us do good unto all men, especially unto them that are of the household of faith.",
    reference: "Galatians 6:10",
  },
  {
    text: "Knowing that whatsoever good thing any man doeth, the same shall he receive of the Lord, whether he be bond or free.",
    reference: "Ephesians 6:8",
  },
  {
    text: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.",
    reference: "John 14:27",
  },
  {
    text: "For whatsoever is born of God overcometh the world: and this is the victory that overcometh the world, even our faith.",
    reference: "1 John 5:4",
  },
  {
    text: "I can do all things through Christ which strengtheneth me.",
    reference: "Philippians 4:13",
  },
  {
    text: "Death and life are in the power of the tongue: and they that love it shall eat the fruit thereof.",
    reference: "Proverbs 18:21",
  },
  {
    text: "The mouth of the just bringeth forth wisdom: but the froward tongue shall be cut out.",
    reference: "Proverbs 10:31",
  },
  {
    text: "They that forsake the law praise the wicked: but such as keep the law contend with them.",
    reference: "Proverbs 28:4",
  },
  {
    text: "Be not overcome of evil, but overcome evil with good.",
    reference: "Romans 12:21",
  },
  {
    text: "O give thanks unto the LORD; call upon his name: make known his deeds among the people.",
    reference: "Psalm 105:1",
  },
  {
    text: "There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it.",
    reference: "1 Corinthians 10:13",
  },
  {
    text: "Casting down imaginations, and every high thing that exalteth itself against the knowledge of God, and bringing into captivity every thought to the obedience of Christ;",
    reference: "2 Corinthians 10:5",
  },
  {
    text: "A man's pride shall bring him low: but honour shall uphold the humble in spirit.",
    reference: "Proverbs 29:23",
  },
  {
    text: "Let another man praise thee, and not thine own mouth; a stranger, and not thine own lips.",
    reference: "Proverbs 27:2",
  },
  {
    text: "In all thy ways acknowledge him, and he shall direct thy paths.",
    reference: "Proverbs 3:6",
  },
  {
    text: "When thou liest down, thou shalt not be afraid: yea, thou shalt lie down, and thy sleep shall be sweet.",
    reference: "Proverbs 3:24",
  },
  {
    text: "Submit yourselves therefore to God. Resist the devil, and he will flee from you.",
    reference: "James 4:7",
  },
  {
    text: "All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness:",
    reference: "2 Timothy 3:16",
  },
  {
    text: "His lord said unto him, Well done, thou good and faithful servant: thou hast been faithful over a few things, I will make thee ruler over many things: enter thou into the joy of thy lord.",
    reference: "Matthew 25:21",
  },
  {
    text: "Withhold not good from them to whom it is due, when it is in the power of thine hand to do it.",
    reference: "Proverbs 3:27",
  },
  {
    text: "For which of you, intending to build a tower, sitteth not down first, and counteth the cost, whether he have sufficient to finish it?",
    reference: "Luke 14:28",
  },
  {
    text: "For we brought nothing into this world, and it is certain we can carry nothing out.",
    reference: "1 Timothy 6:7",
  },
  {
    text: "Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof.",
    reference: "Matthew 6:34",
  },
  {
    text: "And not only so, but we glory in tribulations also: knowing that tribulation worketh patience;",
    reference: "Romans 5:3",
  },
  {
    text: "But rejoice, inasmuch as ye are partakers of Christ's sufferings; that, when his glory shall be revealed, ye may be glad also with exceeding joy.",
    reference: "1 Peter 4:13",
  },
  {
    text: "My brethren, count it all joy when ye fall into divers temptations; Knowing this, that the trying of your faith worketh patience. But let patience have her perfect work, that ye may be perfect and entire, wanting nothing.",
    reference: "James 1:2-4",
  },
  {
    text: "And have no fellowship with the unfruitful works of darkness, but rather reprove them.",
    reference: "Ephesians 5:11",
  },
  {
    text: "Be ye not unequally yoked together with unbelievers: for what fellowship hath righteousness with unrighteousness? and what communion hath light with darkness?",
    reference: "2 Corinthians 6:14",
  },
  {
    text: "He that loveth silver shall not be satisfied with silver; nor he that loveth abundance with increase: this is also vanity.",
    reference: "Ecclesiastes 5:10",
  },
  {
    text: "This is my commandment, That ye love one another, as I have loved you.",
    reference: "John 15:12",
  },
  {
    text: "And let us consider one another to provoke unto love and to good works:",
    reference: "Hebrews 10:24",
  },
  {
    text: "All things are lawful for me, but all things are not expedient: all things are lawful for me, but all things edify not.",
    reference: "1 Corinthians 10:23",
  },
  {
    text: "Let no corrupt communication proceed out of your mouth, but that which is good to the use of edifying, that it may minister grace unto the hearers.",
    reference: "Ephesians 4:29",
  },
  {
    text: "But ye, brethren, be not weary in well doing.",
    reference: "2 Thessalonians 3:13",
  },
  {
    text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not.",
    reference: "Galatians 6:9",
  },
  {
    text: "And ye shall know the truth, and the truth shall make you free.",
    reference: "John 8:32",
  },
];

export const VALUE_OPTIONS: string[] = [
  "Faith",
  "Love",
  "Service",
  "Patience",
  "Gratitude",
  "Purpose",
  "Charity",
];

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
