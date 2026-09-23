/**
 * Mongolian for the technical codes that reach the screen INSIDE sentences.
 *
 * Rule ids, metric names, playbook ids, audit actions, units and source-table citations
 * are data, not dictionary keys: they arrive as `{param}` values ("service_gap дүрэм R18
 * дээр headway_s = 2619 s"). Translating them at every call site would mean dozens of
 * edits that the next feature forgets; translating them in the ONE place every string
 * passes through (t() params, plus tx() for raw data cells) fixes every screen at once.
 *
 * English is returned unchanged. Terms follow docs/MN-GLOSSARY.md.
 */

import { NODES } from '../data/corridors';
import type { Lang } from '../sim/types';
import { SCENARIO_MN } from './scenarios.mn';

export const CODES_MN: Record<string, string> = {
  // ---- rules
  service_gap: 'үйлчилгээний завсар',
  bunching: 'бөөгнөрөл',
  delay_sop: 'хоцролтын журам',
  delay_network: 'сүлжээний хоцролт',
  schedule_deviation: 'хуваарийн зөрүү',
  overcrowding: 'хэт ачаалал',
  vehicle_breakdown: 'эвдрэл',
  panic: 'яаралтай дохио',
  accident: 'осол',
  traffic_accident: 'зам тээврийн осол',
  route_deviation: 'маршрутаас хазайлт',
  harsh_braking: 'огцом тормослолт',
  overspeed: 'хурд хэтрүүлэлт',
  equipment_afc: 'төлбөрийн систем тасарсан',
  equipment_cctv: 'хяналтын камер тасарсан',
  equipment_tbox: 'бортын төхөөрөмж тасарсан',
  repeated_failure: 'давтагдсан гэмтэл',
  // ---- event types (validate dialog, audit detail)
  afc_failure: 'төлбөрийн системийн гэмтэл',
  cctv_failure: 'хяналтын камерын гэмтэл',
  tbox_failure: 'бортын төхөөрөмжийн гэмтэл',
  comms_failure: 'холбооны гэмтэл',
  other_system_failure: 'бусад системийн гэмтэл',
  passenger_conflict: 'зорчигчийн маргаан',
  vandalism: 'эд хөрөнгө эвдэх',
  suspicious_activity: 'сэжигтэй үйлдэл',
  driver_health_emergency: 'жолоочийн эрүүл мэндийн яаралтай байдал',
  flooding: 'үер',
  // ---- metrics
  headway_s: 'давтамж',
  min_headway_s: 'хамгийн бага давтамж',
  delay_min: 'хоцролт',
  routes_affected: 'нөлөөлсөн чиглэл',
  load_pct: 'ачаалал',
  offline_s: 'тасарсан хугацаа',
  devices_offline: 'тасарсан төхөөрөмж',
  speed: 'хурд',
  status: 'төлөв',
  // ---- playbooks
  generic: 'ерөнхий заавар',
  minor_equipment_failure: 'тоног төхөөрөмжийн бага гэмтэл',
  security_incident: 'хамгаалалтын зөрчил',
  delay_l1: 'хоцролт Т1',
  delay_l2: 'хоцролт Т2',
  delay_l3: 'хоцролт Т3',
  // ---- audit actions
  validate_alert: 'сэрэмжлүүлгийг баталгаажуулсан',
  create_manual_event: 'үйл явдлыг гараар үүсгэсэн',
  complete_action: 'арга хэмжээг гүйцэтгэсэн',
  approve_message: 'мессежийг баталсан',
  'OVERRIDE compulsory action': 'заавал хийх арга хэмжээг хүчингүй болгосон',
  approve_ai_recommendation: 'AI зөвлөмжийг баталсан',
  dismiss_ai_recommendation: 'AI зөвлөмжийг татгалзсан',
  modify_ai_recommendation: 'AI зөвлөмжийг өөрчилсөн',
  auto_exec_l1: 'Т1 мэдэгдлийг автоматаар илгээсэн',
  auto_exec_cancelled: 'автомат мэдэгдлийг зогсоосон',
  revoke_auto_comms: 'автомат мэдэгдлийг буцаан татсан',
  auto_draft_l3: 'ЗХУТ-д хүсэлтийн ноорог бэлтгэсэн',
  send_draft: 'хүсэлтийг илгээсэн',
  tcc_ack: 'ЗХУТ хүлээн авсан (загварчилсан)',
  // ---- workflow stages (for "advance:<stage>")
  detection: 'илрүүлэлт',
  validation: 'баталгаажуулалт',
  creation: 'бүртгэл',
  response_assignment: 'хариу арга хэмжээ хуваарилах',
  response_monitoring: 'хариу арга хэмжээний хяналт',
  resolution: 'шийдвэрлэлт',
  closure: 'хаалт',
  // ---- system actors, channels, message metadata
  system: 'систем',
  'system (SOP L1)': 'систем (журам Т1)',
  'system (SOP L3)': 'систем (журам Т3)',
  'OCC dispatch': 'Операторын диспетчер',
  'PTCC–TCC': 'PTCC–ЗХУТ',
  'PTCC analytics': 'PTCC шинжилгээ',
  'TCC (simulated)': 'ЗХУТ (загварчилсан)',
  net: 'сүлжээ',
  network: 'сүлжээ',
  offline: 'тасарсан',
  online: 'холбогдсон',
  // ---- equipment, alert types, message states
  TBOX: 'T-Box',
  CCTV: 'хяналтын камер',
  vehicle_id: 'автобусны дугаар',
  vehicle_safety: 'тээврийн хэрэгслийн аюулгүй байдал',
  security: 'хамгаалалт',
  draft: 'ноорог',
  pending_approval: 'батлахыг хүлээж буй',
  active: 'идэвхтэй',
  expired: 'хугацаа дууссан',
  sent: 'илгээсэн',
  revoked: 'буцаан татсан',
  // ---- seeded people (the stored value stays Latin; only the display follows the language)
  'B. Otgonbayar': 'Б. Отгонбаяр',
  // ---- speed-profile keys (Settings)
  centralPeak: 'Төв коридор, оргил цаг',
  centralOff: 'Төв коридор, оргил бус',
  arterialPeak: 'Гол зам, оргил цаг',
  arterialOff: 'Гол зам, оргил бус',
  feederPeak: 'Туслах зам, оргил цаг',
  feederOff: 'Туслах зам, оргил бус',
  suburbanPeak: 'Захын зам, оргил цаг',
  suburbanOff: 'Захын зам, оргил бус',
  freeFlow: 'Чөлөөт урсгал',
  // ---- sources and provenance
  'PTCC input': 'PTCC-ийн өгсөн утга',
  SIMULATED: 'ЗАГВАРЧИЛСАН',
  // ---- units (standalone and with a leading space, as ruleLine sends them)
  min: 'мин',
  s: 'сек',
  h: 'цаг',
  d: 'хоног',
  wk: 'долоо хоног',
  'km/h': 'км/ц',
  km: 'км',
};

/** English corridor-node name -> Mongolian, for place names built in the rules layer. */
const NODE_MN = new Map(NODES.map((n) => [n.name_en, n.name_mn]));

function place(s: string): string | null {
  // "Bayangol 5" (a stop) or "Bayangol" (a node)
  const m = /^(.*?)(\s+\d+)?$/.exec(s);
  const mn = m ? NODE_MN.get(m[1]!) : undefined;
  return mn ? mn + (m![2] ?? '') : null;
}

/**
 * Mongolian for one code-like value; unchanged in English or when unknown. Handles:
 * exact codes, " · "-joined composites, " min"-style units, "Table 11", "advance:<stage>", "<rule>:<subject>" alert
 * ids, and "<place> – <place>" segment names.
 */
export function localizeValue(v: string, lang: Lang): string {
  if (lang !== 'mn' || !v) return v;
  const exact = CODES_MN[v] ?? SCENARIO_MN[v];
  if (exact) return exact;
  // composite citations ("L1053-L1055 · Table 11", "All sources · SYNTHETIC — ..."): each part on its own
  if (v.includes(' · ')) return v.split(' · ').map((p) => localizeValue(p, lang)).join(' · ');
  const trimmed = v.trim();
  if (trimmed !== v && CODES_MN[trimmed]) return v.replace(trimmed, CODES_MN[trimmed]!);
  let m = /^Table (\d+)$/.exec(v);
  if (m) return `Хүснэгт ${m[1]}`;
  m = /^advance:(\w+)$/.exec(v);
  if (m) return `шат ахиулсан: ${CODES_MN[m[1]!] ?? m[1]}`;
  m = /^([a-z_]+):(.+)$/.exec(v);
  if (m && CODES_MN[m[1]!]) return `${CODES_MN[m[1]!]} · ${CODES_MN[m[2]!] ?? m[2]}`;
  if (v.includes(' – ')) {
    const parts = v.split(' – ').map((p) => place(p));
    if (parts.every((p) => p !== null)) return parts.join(' – ');
  }
  const p = place(v);
  if (p) return p;
  // citations embedded in longer text ("L1175 · Table 9")
  return v
    .replace(/\bTables? (\d+(?:[-–]\d+)?)\b/g, 'Хүснэгт $1')
    .replace(/\bSlide (\d+)\b/g, 'Слайд $1')
    .replace(/^rules (?=[LRS§]\d)/, 'дүрэм ')
    .replace(/\bPTCC input\b/g, 'PTCC-ийн өгсөн утга');
}
