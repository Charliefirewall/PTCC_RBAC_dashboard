/**
 * Bilingual strings owned by the "copilot" workstream.
 *
 * Split out of dict.ts so parallel work on different areas cannot clobber a shared
 * file. Merged into the main dictionary by dict.ts; keys must stay globally unique.
 *
 * Mongolian here is NOT from the client's deck - leave `r` unset so unreviewedKeys()
 * keeps reporting it for native review (plan risk R11).
 *
 * The `cop.q.*` additions below are QUESTIONS THE ENGINE CAN ALREADY ANSWER: each one
 * is worded so that `routeIntent()` in agent/index.ts matches it, in BOTH languages,
 * without touching that file's PATTERNS table. Nothing here may contain a digit that
 * is not a placeholder - numbers reach prose only through `facts` (plan 10.3).
 */
import type { Entry } from './dict';

export const copilotDict = {
  // ---------------------------------------------------------------- ask bar (item 14)
  'cop.bar.label': { en: 'Ask the copilot', mn: 'Туслахаас асуух' },
  'cop.bar.hint': { en: 'Press / to ask from any screen', mn: 'Дурын дэлгэцээс асуухад / дарна' },
  'cop.drawer.sub': {
    en: 'Answered here — you have not left the screen',
    mn: 'Хариулт энд — та дэлгэцээ хаагаагүй',
  },
  'cop.drawer.full': { en: 'Open the full copilot', mn: 'Туслахыг бүтнээр нээх' },
  'cop.thinking': { en: 'Reading the current state…', mn: 'Одоогийн төлөвийг уншиж байна…' },

  // ---------------------------------------------------------------- empty state (item 44)
  'cop.greet.critical': {
    en: 'Critical alerts are open right now — start there.',
    mn: 'Одоо ноцтой сэрэмжлүүлэг нээлттэй байна — эндээс эхлээрэй.',
  },
  'cop.greet.alerts': {
    en: 'Alerts are open, none of them critical.',
    mn: 'Сэрэмжлүүлэг нээлттэй, ноцтой нь алга.',
  },
  'cop.greet.calm': {
    en: 'Nothing is breaching a threshold at the moment.',
    mn: 'Одоогоор босго давсан зүйл алга.',
  },
  'cop.empty.hint': {
    en: 'Tap a question or type your own. Every answer is read from the same rules the dashboards use.',
    mn: 'Асуултаа дарах эсвэл өөрөө бичнэ үү. Хариулт бүр хяналтын самбартай ижил дүрмээс уншина.',
  },
  'cop.seed.here': { en: 'Suggested for this screen', mn: 'Энэ дэлгэцэд тохирох' },

  // ---------------------------------------------------------------- capability table
  'cop.cap.title': { en: 'What the copilot can do', mn: 'Туслах юу хийж чадах' },
  'cop.cap.colWhat': { en: 'Capability', mn: 'Боломж' },
  'cop.cap.colAsk': { en: 'Example question', mn: 'Асуултын жишээ' },
  'cop.cap.attention': { en: 'Rank what needs attention now', mn: 'Одоо анхаарах зүйлийг эрэмбэлэх' },
  'cop.cap.delay': { en: 'Explain a route delay with its cause', mn: 'Чиглэлийн хоцролтыг шалтгаантай тайлбарлах' },
  'cop.cap.load': { en: 'Find routes over the load threshold', mn: 'Ачааллын босго давсан чиглэлийг олох' },
  'cop.cap.response': { en: 'Read the playbook for an open event', mn: 'Нээлттэй үйл явдлын зааврыг унших' },
  'cop.cap.equipment': { en: 'Count offline AFC, CCTV and T-Box devices', mn: 'Тасарсан AFC, CCTV, T-Box тоолох' },
  'cop.cap.brief': { en: 'Assemble the shift handover brief', mn: 'Ээлж хүлээлцэх товчоог бүрдүүлэх' },

  // ---------------------------------------------------------------- session history
  'cop.hist.title': { en: 'Asked this session', mn: 'Энэ ээлжинд асуусан' },
  'cop.hist.hint': { en: 'Click a question to ask it again', mn: 'Дахин асуухад асуулт дээр дарна' },

  // ------------------------------------------------- context-seeded questions (item 45)
  'cop.q.whereBus': { en: 'Where is bus {bus}?', mn: 'Автобус {bus} хаана байна?' },
  'cop.q.operators': {
    en: 'Compare operator on-time performance',
    mn: 'Операторуудын цагтаа явалтыг харьцуулах',
  },
  'cop.q.threshold': { en: 'Which thresholds are set?', mn: 'Ямар босго тогтоосон байна?' },
  'cop.q.events': { en: 'What events are open?', mn: 'Ямар үйл явдал нээлттэй байна?' },

  // ---------------------------------------------------------------- top bar profile menu
  'cop.top.lang': { en: 'Language', mn: 'Хэл' },
  'cop.top.profile': { en: 'Role, appearance and display settings', mn: 'Үүрэг, харагдац, дэлгэцийн тохиргоо' },

  // ---------------------------------------------------------------- comms hardening
  // An empty auto-draft list is GOOD NEWS: no open event currently warrants a message
  // to the Police, the Operator OCC or the TCC.
  'comms.noDraftsTitle': { en: 'No message is suggested right now', mn: 'Одоогоор санал болгох мэдэгдэл алга' },
  'comms.older': {
    en: '+{n} older message(s) not shown — the newest are listed first',
    mn: '+{n} хуучин мэдэгдэл харагдахгүй — шинэ нь эхэнд жагсаана',
  },
} as const satisfies Record<string, Entry>;
