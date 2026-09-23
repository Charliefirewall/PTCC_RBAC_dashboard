/**
 * Bilingual strings owned by the "kit" workstream.
 *
 * Split out of dict.ts so parallel work on different areas cannot clobber a shared
 * file. Merged into the main dictionary by dict.ts; keys must stay globally unique.
 *
 * Mongolian here is NOT from the client's deck - leave `r` unset so unreviewedKeys()
 * keeps reporting it for native review (plan risk R11).
 */
import type { Entry } from './dict';

export const kitDict = {
  // ---------------------------------------------------------------- KpiTile distribution foot
  // The stacked foot bar (§13.7 `dist`) is a picture; these give it words, because an
  // unlabelled three-colour bar is exactly the defect A-4 complains about.
  'kit.dist': {
    en: '{crit} critical · {warn} attention · {ok} normal',
    mn: '{crit} ноцтой · {warn} анхаарах · {ok} хэвийн',
  },

  // ---------------------------------------------------------------- DataTable
  'kit.empty.title': { en: 'Nothing to show', mn: 'Харуулах зүйл алга' },
  'kit.page.label': { en: 'Table pages', mn: 'Хүснэгтийн хуудас' },
  'kit.page.of': { en: '{from}–{to} of {total}', mn: '{from}–{to} / {total}' },
  'kit.page.prev': { en: 'Previous page', mn: 'Өмнөх хуудас' },
  'kit.page.next': { en: 'Next page', mn: 'Дараагийн хуудас' },

  // ---------------------------------------------------------------- Tooltip prose (defect A-7)
  // Every one of these replaces a native `title=`. A tooltip has to be a SENTENCE: the
  // defect this fixes was a pill whose entire tooltip content was the string "L1347".
  'kit.ev.CONFIRMED': {
    en: 'Confirmed — stated outright in the client’s own material. The figure is theirs, not ours.',
    mn: 'Батлагдсан — захиалагчийн өөрийн материалд шууд заасан. Энэ тоо манайх биш, тэднийх.',
  },
  'kit.ev.INFERRED': {
    en: 'Inferred — the intent is in the sources, the number is derived by us from them.',
    mn: 'Дүгнэсэн — санаа нь эх сурвалжид бий, тоог бид түүнээс гаргасан.',
  },
  'kit.ev.ASSUMPTION': {
    en: 'Assumption — no source gives this. It is a placeholder so the demo can be shown at all.',
    mn: 'Таамаг — эх сурвалжид байхгүй. Демог харуулах боломжтой болгох түр утга.',
  },
  'kit.ev.FUTURE': {
    en: 'Future — outside the scope of this demo; shown so the roadmap is visible.',
    mn: 'Ирээдүйд — энэ демогийн хүрээнээс гадуур; хөгжүүлэлтийн төлөвлөгөөг харуулахын тулд оруулсан.',
  },
  'kit.ev.source': { en: 'Source', mn: 'Эх сурвалж' },
  'kit.tip.stripMarker': {
    en: 'Bus {bus}, {dev} min against schedule, {load} % full. Opens this vehicle’s page.',
    mn: '{bus} автобус, хуваарийн зөрүү {dev} мин, {load} % дүүрэн. Энэ автобусны хуудсыг нээнэ.',
  },
  'kit.tip.simulated': {
    en: 'Generated for the demo from a fixed seed, so the same bus always shows the same figure. Not a measurement.',
    mn: 'Демод зориулж тогтмол анхны утгаас үүсгэсэн тул нэг автобус үргэлж ижил тоо харуулна. Хэмжилт биш.',
  },
  'kit.tip.healthScore': {
    en: 'Our own formula, printed beside the number on purpose: PTCC receives device status, never a score.',
    mn: 'Бидний өөрсдийн томьёо, тооны хажууд зориуд бичсэн: PTCC төхөөрөмжийн төлөвийг авдаг, оноо хэзээ ч авдаггүй.',
  },
  'kit.tip.exposure': {
    en: 'Risk multiplied by passenger exposure: how many people are affected if this bus fails today.',
    mn: 'Эрсдэлийг зорчигчийн өртөлтөөр үржүүлсэн: энэ автобус өнөөдөр эвдэрвэл хэдэн хүнд нөлөөлөх вэ.',
  },
  'kit.tip.variance': {
    en: 'Recorded revenue against the revenue the counted boardings imply. A gap usually means AFC validators are offline.',
    mn: 'Бүртгэгдсэн орлогыг тоологдсон зорчигчийн суултаас гарах орлоготой харьцуулна. Зөрүү ихэвчлэн AFC уншигч тасарсныг илтгэнэ.',
  },
  'kit.tip.gap': {
    en: 'Buses this route needs at peak, minus the buses on it now. Positive means short.',
    mn: 'Оргил цагт энэ чиглэлд шаардлагатай автобус хасах одоо явж буй автобус. Эерэг бол дутагдалтай.',
  },

  // Control labels. Every form control needs an accessible NAME, and reusing the
  // panel's own title as the label just says the same word twice.
  // `kit.label.savingPct` and `kit.trendUp/Down/Flat` were removed: nothing referenced
  // them. The trend words were superseded by KpiFootRow's `delta.text`, which already
  // carries a sentence, and the saving control was never built.
  'kit.label.peakSpeed': { en: 'Assumed peak speed', mn: 'Оргил цагийн тооцоот хурд' },

  // Handed to the roles workstream: RoleDashboard.tsx:48 still carries `title="L1347"`,
  // which is a source-line citation shown as the whole of a user-facing tooltip. That
  // file is not ours to edit; this is the prose it should use instead.
  'kit.tip.overrideCompulsory': {
    en: 'Only a supervisor may override a compulsory action, and the override is written to the audit log with a justification.',
    mn: 'Заавал хийх арга хэмжээг зөвхөн ахлах хянагч хүчингүй болгож болох ба энэ нь үндэслэлийн хамт аудитын бүртгэлд тэмдэглэгдэнэ.',
  },
} as const satisfies Record<string, Entry>;
