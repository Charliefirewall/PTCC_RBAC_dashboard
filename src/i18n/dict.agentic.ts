/**
 * Bilingual strings owned by the "agentic" workstream.
 *
 * Split out of dict.ts so parallel work on different areas cannot clobber a shared
 * file. Merged into the main dictionary by dict.ts; keys must stay globally unique.
 *
 * Mongolian here is NOT from the client's deck - leave `r` unset so unreviewedKeys()
 * keeps reporting it for native review (plan risk R11).
 *
 * No template below contains a digit. Numbers can only reach the screen through a
 * `{param}`, and every param is filled from an Alert / threshold / playbook record.
 */
import type { Entry } from './dict';

export const agenticDict = {
  // ---------------------------------------------------------------- chrome
  'ag.tab': { en: 'AI Agents', mn: 'AI агентууд' },
  'ag.title': { en: 'Agent console', mn: 'Агентын самбар' },
  'ag.roster': { en: 'Agents on watch', mn: 'Хянаж буй агентууд' },
  'ag.queue': { en: 'Awaiting your decision', mn: 'Таны шийдвэрийг хүлээж буй' },
  'ag.decided': { en: 'Decided', mn: 'Шийдвэрлэсэн' },
  'ag.findings': { en: '{n} open finding(s)', mn: '{n} нээлттэй илрүүлэлт' },
  'ag.idle': { en: 'Nothing abnormal', mn: 'Хэвийн бус зүйл алга' },
  'ag.thinking': { en: 'Reasoning', mn: 'Дүгнэж байна' },
  'ag.noAutonomy': {
    en: 'Agents detect, reason and recommend. Only an operator approves — nothing here executes.',
    mn: 'Агентууд илрүүлж, дүгнэж, зөвлөмж өгнө. Зөвхөн оператор батална — энд юу ч автоматаар хийгдэхгүй.',
  },
  'ag.humanGate': {
    en: 'Operator validation is mandatory; PTCC is not a command authority.',
    mn: 'Операторын баталгаажуулалт заавал шаардлагатай; PTCC тушаал өгөх эрхгүй.',
  },

  // ---------------------------------------------------------------- lifecycle
  'ag.stage.detected': { en: 'Detected', mn: 'Илрүүлсэн' },
  'ag.stage.reasoning': { en: 'Reasoned', mn: 'Дүгнэсэн' },
  'ag.stage.recommended': { en: 'Recommended', mn: 'Зөвлөсөн' },
  'ag.stage.approved': { en: 'Approved', mn: 'Баталсан' },
  'ag.stage.rejected': { en: 'Dismissed', mn: 'Татгалзсан' },
  'ag.stage.completed': { en: 'Completed', mn: 'Дууссан' },
  'ag.by.ai': { en: 'AI', mn: 'ХО' },
  'ag.by.human': { en: 'Human', mn: 'Хүн' },
  'ag.approve': { en: 'Approve', mn: 'Батлах' },
  'ag.modify': { en: 'Modify', mn: 'Засах' },
  'ag.dismiss': { en: 'Dismiss', mn: 'Татгалзах' },
  'ag.approvedBy': { en: 'Approved by {role} · {at}', mn: 'Баталсан: {role} · {at}' },
  'ag.rejectedBy': { en: 'Dismissed by {role} · {at}', mn: 'Татгалзсан: {role} · {at}' },
  'ag.completedAs': { en: 'Completed · {id}', mn: 'Дууссан · {id}' },
  'ag.completedCleared': { en: 'Completed · condition cleared', mn: 'Дууссан · нөхцөл арилсан' },

  // ---------------------------------------------------------------- reasoning
  /**
   * Labelled "breach margin", not "confidence": `confidenceOf()` is a pure function of
   * how far the reading sits past its threshold, and for a boolean telemetry flag
   * (threshold 0) it is 1 by definition. Beside "AI · Reasoned", the word "confidence"
   * read as model certainty for something that was simply OBSERVED. `ag.confidence` is
   * kept because the activity feed's row detail still uses that wording.
   */
  'ag.breachMargin': { en: 'Breach margin', mn: 'Босго давсан хэмжээ' },
  'ag.confidence': { en: 'Breach margin', mn: 'Босго давсан хэмжээ' },
  'ag.confNote': {
    en: 'How far past its threshold the reading sits — not a model and not a prediction. A boolean telemetry flag is observed, so it reads full.',
    mn: 'Хэмжилт босгоос хэр давсныг заана — загвар ч, таамаглал ч биш. Тийм/үгүй телеметрийн дохио шууд ажиглагддаг тул бүтэн харагдана.',
  },
  'ag.why': { en: 'Why?', mn: 'Яагаад?' },
  'ag.whyNote': {
    en: 'Every figure below is the value the rule engine actually read.',
    mn: 'Доорх тоо бүр нь дүрмийн системийн бодитоор уншсан утга.',
  },
  'ag.thresholdShort': { en: 'threshold', mn: 'босго' },
  'ag.r.observed': {
    en: 'Rule {rule} read {name} = {value}{unit} on {subject}',
    mn: '{rule} дүрэм {subject}-д {name} = {value}{unit} гэж уншив',
  },
  'ag.r.flag': {
    en: '{subject} raised the {name} flag — a boolean telemetry signal, not an estimate',
    mn: '{subject}-аас {name} дохио ирэв — тооцоолол биш, тийм/үгүй телеметрийн дохио',
  },
  'ag.r.threshold': {
    en: 'Configured threshold is {threshold}{unit} ({table}); the reading is {over}× it',
    mn: 'Тохируулсан босго {threshold}{unit} ({table}); хэмжилт босгоос {over} дахин их',
  },
  'ag.r.impact': {
    en: '{pax} passengers on the affected service · impact score {score}',
    mn: 'Өртсөн үйлчилгээнд {pax} зорчигч · нөлөөллийн оноо {score}',
  },
  'ag.r.alone': { en: 'No other open alert on {subject}', mn: '{subject}-д өөр нээлттэй сэрэмжлүүлэг алга' },
  'ag.r.corroborate': {
    en: '{n} other open alert(s) on {subject} corroborate it',
    mn: '{subject}-д байгаа өөр {n} нээлттэй сэрэмжлүүлэг үүнийг баталж байна',
  },

  // ---------------------------------------------------------------- recommendation
  'ag.rec': { en: 'Recommends', mn: 'Зөвлөмж' },
  'ag.rationale': { en: 'Because', mn: 'Үндэслэл' },
  'ag.effect': { en: 'If you approve', mn: 'Батлавал' },
  'ag.playbookActions': { en: 'Playbook actions — the operator performs them', mn: 'Арга хэмжээний заавар — оператор гүйцэтгэнэ' },
  'ag.rec.validate': {
    en: 'Validate as event “{type}” · severity {sev} · playbook {playbook}',
    mn: '“{type}” үйл явдлаар баталгаажуулах · зэрэглэл {sev} · {playbook} заавар',
  },
  'ag.rec.rationale': {
    en: 'Rule {rule} fired: {value}{unit} against a threshold of {threshold}{unit}',
    mn: '{rule} дүрэм ажиллав: {value}{unit}, босго {threshold}{unit}',
  },
  'ag.rec.rationaleFlag': {
    en: 'Rule {rule} fired on a direct telemetry flag from {subject}',
    mn: '{subject}-аас ирсэн телеметрийн шууд дохиогоор {rule} дүрэм ажиллав',
  },
  'ag.rec.effect': {
    en: 'Opens the {playbook} playbook — {n} recommended and {c} compulsory actions, target response {min} min. The operator performs them; the system records them.',
    mn: '{playbook} зааврыг нээнэ — {n} зөвлөмж болгосон, {c} заавал хийх арга хэмжээ, хариу өгөх зорилтот хугацаа {min} мин. Оператор гүйцэтгэж, систем бүртгэнэ.',
  },

  // ---------------------------------------------------------------- agents
  'ag.agent.regularity': { en: 'Regularity Agent', mn: 'Тогтмол байдлын агент' },
  'ag.remit.regularity': {
    en: 'Headway gaps, bunching and schedule deviation on every active route',
    mn: 'Идэвхтэй чиглэл бүрийн үйлчилгээний завсар, бөөгнөрөл, хуваарийн зөрүү',
  },
  'ag.agent.crowding': { en: 'Crowding Agent', mn: 'Ачааллын агент' },
  'ag.remit.crowding': {
    en: 'Passenger load against the Slide 8 heat-map bands',
    mn: 'Зорчигчийн ачааллыг 8-р слайдын өнгөт зэрэглэлтэй харьцуулна',
  },
  'ag.agent.safety': { en: 'Safety Agent', mn: 'Аюулгүй байдлын агент' },
  'ag.remit.safety': {
    en: 'T-Box safety flags: panic, accident, breakdown, route deviation, harsh braking, overspeed',
    mn: 'T-Box аюулгүй байдлын дохио: яаралтай дохио, осол, эвдрэл, маршрутаас хазайлт, огцом тормослолт, хурд хэтрүүлэлт',
  },
  'ag.agent.equipment': { en: 'Equipment Agent', mn: 'Тоног төхөөрөмжийн агент' },
  'ag.remit.equipment': {
    en: 'AFC, CCTV and T-Box device state on in-service buses',
    mn: 'Үйлчилгээнд яваа автобусны AFC, хяналтын камер, T-Box төхөөрөмжийн төлөв',
  },
  'ag.agent.pattern': { en: 'Pattern Agent', mn: 'Хэв шинжийн агент' },
  'ag.remit.pattern': {
    en: 'Repeated equipment failures concentrated on one operator (Tier 3 pattern, not a threshold breach)',
    mn: 'Нэг операторт төвлөрсөн тоног төхөөрөмжийн давтагдсан гэмтэл (3-р түвшний хэв шинж, босго давалт биш)',
  },
  'ag.agent.response': { en: 'Response Agent', mn: 'Хариу арга хэмжээний агент' },
  'ag.remit.response': {
    en: 'The four documented response playbooks and their compulsory items',
    mn: 'Баримтжуулсан дөрвөн арга хэмжээний заавар, тэдгээрийн заавал хийх арга хэмжээ',
  },
  'ag.agent.console': { en: 'Console router', mn: 'Асуулт чиглүүлэгч' },
  'ag.remit.console': {
    en: 'Routes the question to the store that already holds the answer',
    mn: 'Асуултыг хариулт нь аль хэдийн байгаа өгөгдөл рүү чиглүүлнэ',
  },

  // ---------------------------------------------------------------- copilot console
  'ag.answeredBy': { en: 'Answered by', mn: 'Хариулсан' },
  'ag.facts': { en: 'Figures used', mn: 'Ашигласан тоо' },
  'ag.factsNote': {
    en: 'Every number in the answer appears here, traced to the record it came from.',
    mn: 'Хариултын тоо бүр энд эх бүртгэлийнхээ хамт харагдана.',
  },
  'ag.watching': { en: 'Watching', mn: 'Хянаж буй' },

  // ---------------------------------------------------------------- activity stream
  'ag.act.title': { en: 'Agent activity', mn: 'Агентын үйл ажиллагаа' },
  'ag.act.pipeline': {
    en: '{n} agents · detect → reason → recommend → you decide',
    mn: '{n} агент · илрүүлэх → дүгнэх → зөвлөх → та шийднэ',
  },
  'ag.act.operator': { en: 'Operator', mn: 'Оператор' },
  'ag.act.raised': { en: 'Rule {rule} fired on {subject}', mn: '{subject}-д {rule} дүрэм ажиллав' },
  'ag.act.raisedDetail': {
    en: '{name} {value}{unit} against {threshold}{unit} · {pax} passengers affected',
    mn: '{name} {value}{unit}, босго {threshold}{unit} · {pax} зорчигчид нөлөөлсөн',
  },
  'ag.act.raisedFlag': {
    en: 'Direct {name} telemetry flag · {pax} passengers affected',
    mn: '{name}: телеметрийн шууд дохио · {pax} зорчигчид нөлөөлсөн',
  },
  'ag.act.reasoning': { en: 'Reasoning over {rule}', mn: '{rule} — дүгнэж байна' },
  'ag.act.recommended': { en: 'Recommendation ready for {rule}', mn: '{rule} — зөвлөмж бэлэн' },
  'ag.act.approved': { en: 'Operator approved the {rule} recommendation', mn: 'Оператор {rule} дүрмийн зөвлөмжийг батлав' },
  'ag.act.rejected': { en: 'Operator dismissed the {rule} recommendation', mn: 'Оператор {rule} дүрмийн зөвлөмжөөс татгалзав' },
  'ag.act.completed': { en: 'Closed out through the operator event flow', mn: 'Операторын үйл явдлын урсгалаар хаагдав' },
  'ag.act.conf': { en: 'Breach margin {pct} % · {id}', mn: 'Босго давсан хэмжээ {pct} % · {id}' },
  'ag.act.byRole': { en: '{role} · {id}', mn: '{role} · {id}' },
  'ag.act.audit': { en: 'Audit: {action}', mn: 'Аудит: {action}' },
  'ag.act.auditDetail': { en: '{actor} · {target} {detail}', mn: '{actor} · {target} {detail}' },
  'ag.act.commsDraft': { en: 'Passenger message drafted · {id}', mn: 'Зорчигчийн мэдэгдэл бэлтгэв · {id}' },
  'ag.act.commsSent': { en: 'Passenger message approved for dispatch · {id}', mn: 'Зорчигчийн мэдэгдлийг илгээхээр батлав · {id}' },
  'ag.act.commsDetail': { en: '{category} · {channels}', mn: '{category} · {channels}' },
  'ag.act.commsCoord': { en: 'Coordination message sent · {id}', mn: 'Зохицуулалтын мэдэгдэл илгээв · {id}' },
  'ag.act.commsCoordDetail': { en: '{type} → {to}', mn: '{type} → {to}' },

  // ---------------------------------------------------------------- grouping
  'ag.group.more': { en: '+{n} similar finding(s)', mn: '+{n} ижил төрлийн илрүүлэлт' },
  'ag.modifyHandoff': {
    en: 'Open the alert in Alerts and write your own event — the agent proposal is only a starting point.',
    mn: 'Сэрэмжлүүлгийг Сэрэмжлүүлэг хэсэгт нээж, үйл явдлаа өөрөө бичнэ үү — агентын санал зөвхөн эхлэл.',
  },
  'ag.group.rule': { en: '{label} · rule {rule}', mn: '{label} · {rule} дүрэм' },
  'ag.group.topBy': { en: 'Highest impact shown first', mn: 'Нөлөө ихтэй нь эхэнд' },

  // ---------------------------------------------------------------- roster stats
  'ag.stat.findings': { en: 'Open findings', mn: 'Нээлттэй илрүүлэлт' },
  'ag.stat.awaiting': { en: 'Awaiting your decision', mn: 'Таны шийдвэрийг хүлээж буй' },
  'ag.stat.rules': { en: 'Rules owned', mn: 'Хариуцсан дүрэм' },
  'ag.stat.playbooks': { en: 'Playbooks owned', mn: 'Хариуцсан заавар' },
  'ag.stat.openEvents': { en: 'Open events watched', mn: 'Хянаж буй нээлттэй үйл явдал' },

  // ---------------------------------------------------------------- honest empty states
  // Each one says WHAT the panel will show and WHAT makes it appear. An empty approval
  // queue is GOOD NEWS (tone="ok"): nothing is waiting on the operator.
  'ag.noQueueTitle': { en: 'Nothing is waiting on you', mn: 'Таны шийдвэр хүлээж буй зүйл алга' },
  'ag.noQueueHint': {
    en: 'Every agent recommendation has been decided. The moment a rule breaches, the finding, its reasoning and a pre-filled proposal appear here for you to approve, modify or dismiss. Run or speed up the simulation, or relax a threshold in Settings, to see one.',
    mn: 'Агентын бүх зөвлөмж шийдвэрлэгдсэн. Дүрмийн босго давмагц илрүүлэлт, үндэслэл, урьдчилан бөглөсөн санал энд гарч, та батлах, засах эсвэл татгалзах боломжтой. Үүнийг харахын тулд загварчлалыг эхлүүлэх/хурдасгах, эсвэл Тохиргоонд босгыг сулруулна уу.',
  },
  'ag.noDecidedTitle': { en: 'No decision recorded yet', mn: 'Бүртгэгдсэн шийдвэр одоогоор алга' },
  'ag.noDecidedHint': {
    en: 'Approving, modifying or dismissing a recommendation above records it here with who decided and when, and writes a row to the audit log.',
    mn: 'Дээрх зөвлөмжийг батлах, засах, татгалзах бүрд хэн, хэзээ шийдсэн нь энд бүртгэгдэж, аудитын бүртгэлд мөр нэмэгдэнэ.',
  },
  'ag.actNoneTitle': { en: 'The activity stream is quiet', mn: 'Одоогоор үйл ажиллагаа алга' },
  'ag.actNoneHint': {
    en: 'Every agent detection and every operator decision is listed here with its simulation timestamp. Start or speed up the simulation to see entries arrive.',
    mn: 'Агентын илрүүлэлт, операторын шийдвэр бүр загварчлалын цагийн хамт энд бүртгэгдэнэ. Бичлэг харахын тулд загварчлалыг эхлүүлэх эсвэл хурдасгана уу.',
  },

  // ---------------------------------------------------------------- decision log table
  'ag.col.decision': { en: 'Decision', mn: 'Шийдвэр' },
  'ag.col.agent': { en: 'Agent', mn: 'Агент' },
  'ag.col.alert': { en: 'Alert', mn: 'Сэрэмжлүүлэг' },
  'ag.col.by': { en: 'Decided by · at', mn: 'Шийдсэн · цаг' },
} as const satisfies Record<string, Entry>;
