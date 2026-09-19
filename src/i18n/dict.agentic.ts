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
  'ag.tab': { en: 'AI Agents', mn: 'ХИ агентууд' },
  'ag.title': { en: 'Agent console', mn: 'Агентын консол' },
  'ag.roster': { en: 'Agents on watch', mn: 'Ажиглаж буй агентууд' },
  'ag.queue': { en: 'Awaiting your decision', mn: 'Таны шийдвэрийг хүлээж байна' },
  'ag.decided': { en: 'Decided', mn: 'Шийдвэрлэсэн' },
  'ag.findings': { en: '{n} open finding(s)', mn: '{n} нээлттэй илрүүлэлт' },
  'ag.idle': { en: 'Nothing abnormal', mn: 'Хэвийн бус зүйл алга' },
  'ag.thinking': { en: 'Reasoning', mn: 'Дүгнэж байна' },
  'ag.noAutonomy': {
    en: 'Agents detect, reason and recommend. Only an operator approves — nothing here executes.',
    mn: 'Агентууд илрүүлж, дүгнэж, зөвлөнө. Зөвхөн оператор зөвшөөрнө — энд юу ч автоматаар хэрэгжихгүй.',
  },
  'ag.humanGate': {
    en: 'Operator validation is mandatory; PTCC is not a command authority.',
    mn: 'Операторын баталгаажуулалт заавал шаардлагатай; PTCC нь тушаал өгөх эрх бүхий байгууллага биш.',
  },

  // ---------------------------------------------------------------- lifecycle
  'ag.stage.detected': { en: 'Detected', mn: 'Илрүүлсэн' },
  'ag.stage.reasoning': { en: 'Reasoned', mn: 'Дүгнэсэн' },
  'ag.stage.recommended': { en: 'Recommended', mn: 'Зөвлөсөн' },
  'ag.stage.approved': { en: 'Approved', mn: 'Зөвшөөрсөн' },
  'ag.stage.rejected': { en: 'Dismissed', mn: 'Татгалзсан' },
  'ag.stage.completed': { en: 'Completed', mn: 'Дууссан' },
  'ag.by.ai': { en: 'AI', mn: 'ХИ' },
  'ag.by.human': { en: 'Human', mn: 'Хүн' },
  'ag.approve': { en: 'Approve', mn: 'Зөвшөөрөх' },
  'ag.modify': { en: 'Modify', mn: 'Засварлах' },
  'ag.dismiss': { en: 'Dismiss', mn: 'Татгалзах' },
  'ag.approvedBy': { en: 'Approved by {role} · {at}', mn: 'Зөвшөөрсөн: {role} · {at}' },
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
    mn: 'Хэмжилт босгоосоо хэр давсныг илэрхийлнэ — загвар ч биш, таамаглал ч биш. Логик дүн (тийм/үгүй) телеметрийн тэмдэг нь бодитоор ажиглагдсан тул дүүрэн харагдана.',
  },
  'ag.why': { en: 'Why?', mn: 'Яагаад?' },
  'ag.whyNote': {
    en: 'Every figure below is the value the rule engine actually read.',
    mn: 'Доорх бүх тоо нь дүрмийн систем бодитоор уншсан утга юм.',
  },
  'ag.thresholdShort': { en: 'threshold', mn: 'босго' },
  'ag.r.observed': {
    en: 'Rule {rule} read {name} = {value}{unit} on {subject}',
    mn: '{rule} дүрэм {subject} дээр {name} = {value}{unit} гэж уншив',
  },
  'ag.r.flag': {
    en: '{subject} raised the {name} flag — a boolean telemetry signal, not an estimate',
    mn: '{subject} нь {name} дохиог өгөв — энэ нь тооцоолол биш, шууд телеметрийн дохио',
  },
  'ag.r.threshold': {
    en: 'Configured threshold is {threshold}{unit} ({table}); the reading is {over}× it',
    mn: 'Тохируулсан босго {threshold}{unit} ({table}); хэмжилт үүнээс {over} дахин их',
  },
  'ag.r.impact': {
    en: '{pax} passengers on the affected service · impact score {score}',
    mn: 'Нөлөөлөлд өртсөн үйлчилгээнд {pax} зорчигч · нөлөөллийн оноо {score}',
  },
  'ag.r.alone': { en: 'No other open alert on {subject}', mn: '{subject} дээр өөр нээлттэй сэрэмжлүүлэг алга' },
  'ag.r.corroborate': {
    en: '{n} other open alert(s) on {subject} corroborate it',
    mn: '{subject} дээрх бусад {n} сэрэмжлүүлэг үүнийг нотолж байна',
  },

  // ---------------------------------------------------------------- recommendation
  'ag.rec': { en: 'Recommends', mn: 'Зөвлөж байна' },
  'ag.rationale': { en: 'Because', mn: 'Учир нь' },
  'ag.effect': { en: 'If you approve', mn: 'Хэрэв та зөвшөөрвөл' },
  'ag.playbookActions': { en: 'Playbook actions — the operator performs them', mn: 'Зааврын арга хэмжээ — операторыг гүйцэтгэнэ' },
  'ag.rec.validate': {
    en: 'Validate as event “{type}” · severity {sev} · playbook {playbook}',
    mn: '“{type}” үйл явдал болгон баталгаажуулах · зэрэглэл {sev} · заавар {playbook}',
  },
  'ag.rec.rationale': {
    en: 'Rule {rule} fired: {value}{unit} against a threshold of {threshold}{unit}',
    mn: '{rule} дүрэм ажиллав: {threshold}{unit} босгын эсрэг {value}{unit}',
  },
  'ag.rec.rationaleFlag': {
    en: 'Rule {rule} fired on a direct telemetry flag from {subject}',
    mn: '{subject}-аас ирсэн шууд телеметрийн дохиогоор {rule} дүрэм ажиллав',
  },
  'ag.rec.effect': {
    en: 'Opens the {playbook} playbook — {n} recommended and {c} compulsory actions, target response {min} min. The operator performs them; the system records them.',
    mn: '{playbook} зааврыг нээнэ — {n} зөвлөмжит, {c} заавал биелүүлэх арга хэмжээ, хариу арга хэмжээний хугацаа {min} мин. Операторыг гүйцэтгэж, систем бүртгэнэ.',
  },

  // ---------------------------------------------------------------- agents
  'ag.agent.regularity': { en: 'Regularity Agent', mn: 'Тогтмол байдлын агент' },
  'ag.remit.regularity': {
    en: 'Headway gaps, bunching and schedule deviation on every active route',
    mn: 'Идэвхтэй чиглэл бүрийн завсрын зөрүү, бөөгнөрөл, хуваарийн хазайлт',
  },
  'ag.agent.crowding': { en: 'Crowding Agent', mn: 'Ачааллын агент' },
  'ag.remit.crowding': {
    en: 'Passenger load against the Slide 8 heat-map bands',
    mn: '8-р слайдын дулааны зурагийн бүслүүрийн дагуу зорчигчийн ачаалал',
  },
  'ag.agent.safety': { en: 'Safety Agent', mn: 'Аюулгүй байдлын агент' },
  'ag.remit.safety': {
    en: 'T-Box safety flags: panic, accident, breakdown, route deviation, harsh braking, overspeed',
    mn: 'T-Box аюулгүй байдлын дохио: яаралтай дуудлага, осол, эвдрэл, маршрутын хазайлт, огцом тормослолт, хурд хэтрэлт',
  },
  'ag.agent.equipment': { en: 'Equipment Agent', mn: 'Тоног төхөөрөмжийн агент' },
  'ag.remit.equipment': {
    en: 'AFC, CCTV and T-Box device state on in-service buses',
    mn: 'Үйлчилгээн дэх автобусны AFC, CCTV, T-Box төхөөрөмжийн төлөв',
  },
  'ag.agent.pattern': { en: 'Pattern Agent', mn: 'Хэв шинжийн агент' },
  'ag.remit.pattern': {
    en: 'Repeated equipment failures concentrated on one operator (Tier 3 pattern, not a threshold breach)',
    mn: 'Нэг операторт төвлөрсөн давтагдсан гэмтэл (3-р түвшний хэв шинж, босго давсан хэрэг биш)',
  },
  'ag.agent.response': { en: 'Response Agent', mn: 'Хариу арга хэмжээний агент' },
  'ag.remit.response': {
    en: 'The four documented response playbooks and their compulsory items',
    mn: 'Баримтжуулсан дөрвөн хариу арга хэмжээний заавар ба тэдгээрийн заавал биелүүлэх зүйлс',
  },
  'ag.agent.console': { en: 'Console router', mn: 'Консолын чиглүүлэгч' },
  'ag.remit.console': {
    en: 'Routes the question to the store that already holds the answer',
    mn: 'Асуултыг хариултыг нь аль хэдийн агуулсан өгөгдөл рүү чиглүүлнэ',
  },

  // ---------------------------------------------------------------- copilot console
  'ag.answeredBy': { en: 'Answered by', mn: 'Хариулсан' },
  'ag.facts': { en: 'Figures used', mn: 'Ашигласан тоо' },
  'ag.factsNote': {
    en: 'Every number in the answer appears here, traced to the record it came from.',
    mn: 'Хариултад орсон бүх тоо эндээс, эх бичлэгээсээ мөшгөгдөнө.',
  },
  'ag.watching': { en: 'Watching', mn: 'Хянаж буй' },

  // ---------------------------------------------------------------- activity stream
  'ag.act.title': { en: 'Agent activity', mn: 'Агентын үйл ажиллагаа' },
  'ag.act.pipeline': {
    en: '{n} agents · detect → reason → recommend → you decide',
    mn: '{n} агент · илрүүлэх → дүгнэх → зөвлөх → та шийднэ',
  },
  'ag.act.operator': { en: 'Operator', mn: 'Оператор' },
  'ag.act.raised': { en: 'Rule {rule} fired on {subject}', mn: '{subject} дээр {rule} дүрэм ажиллав' },
  'ag.act.raisedDetail': {
    en: '{name} {value}{unit} against {threshold}{unit} · {pax} passengers affected',
    mn: '{name} {value}{unit} / босго {threshold}{unit} · {pax} зорчигчид нөлөөлөв',
  },
  'ag.act.raisedFlag': {
    en: 'Direct {name} telemetry flag · {pax} passengers affected',
    mn: 'Шууд {name} телеметрийн дохио · {pax} зорчигчид нөлөөлөв',
  },
  'ag.act.reasoning': { en: 'Reasoning over {rule}', mn: '{rule}-ийг дүгнэж байна' },
  'ag.act.recommended': { en: 'Recommendation ready for {rule}', mn: '{rule}-д зөвлөмж бэлэн' },
  'ag.act.approved': { en: 'Operator approved the {rule} recommendation', mn: 'Оператор {rule} зөвлөмжийг зөвшөөрөв' },
  'ag.act.rejected': { en: 'Operator dismissed the {rule} recommendation', mn: 'Оператор {rule} зөвлөмжөөс татгалзав' },
  'ag.act.completed': { en: 'Closed out through the operator event flow', mn: 'Операторын үйл явдлын урсгалаар хаагдав' },
  'ag.act.conf': { en: 'Breach margin {pct} % · {id}', mn: 'Босго давсан хэмжээ {pct} % · {id}' },
  'ag.act.byRole': { en: '{role} · {id}', mn: '{role} · {id}' },
  'ag.act.audit': { en: 'Audit: {action}', mn: 'Аудит: {action}' },
  'ag.act.auditDetail': { en: '{actor} · {target} {detail}', mn: '{actor} · {target} {detail}' },
  'ag.act.commsDraft': { en: 'Passenger message drafted · {id}', mn: 'Зорчигчид зориулсан мессеж бэлтгэв · {id}' },
  'ag.act.commsSent': { en: 'Passenger message approved for dispatch · {id}', mn: 'Зорчигчийн мессежийг илгээхийг зөвшөөрөв · {id}' },
  'ag.act.commsDetail': { en: '{category} · {channels}', mn: '{category} · {channels}' },
  'ag.act.commsCoord': { en: 'Coordination message sent · {id}', mn: 'Зохицуулалтын мессеж илгээв · {id}' },
  'ag.act.commsCoordDetail': { en: '{type} → {to}', mn: '{type} → {to}' },

  // ---------------------------------------------------------------- grouping
  'ag.group.more': { en: '+{n} similar finding(s)', mn: '+{n} ижил төрлийн илрүүлэлт' },
  'ag.modifyHandoff': {
    en: 'Open the alert in Alerts and write your own event — the agent proposal is only a starting point.',
    mn: 'Сэрэмжлүүлгийг Сэрэмжлүүлэг хэсэгт нээж, өөрийн тохиолдлыг бичнэ үү — агентын санал зөвхөн эхлэл юм.',
  },
  'ag.group.rule': { en: '{label} · rule {rule}', mn: '{label} · дүрэм {rule}' },
  'ag.group.topBy': { en: 'Highest impact shown first', mn: 'Нөлөө өндөр нь эхэлж харагдана' },

  // ---------------------------------------------------------------- roster stats
  'ag.stat.findings': { en: 'Open findings', mn: 'Нээлттэй илрүүлэлт' },
  'ag.stat.awaiting': { en: 'Awaiting your decision', mn: 'Таны шийдвэрийг хүлээж буй' },
  'ag.stat.rules': { en: 'Rules owned', mn: 'Хариуцсан дүрэм' },
  'ag.stat.playbooks': { en: 'Playbooks owned', mn: 'Хариуцсан заавар' },
  'ag.stat.openEvents': { en: 'Open events watched', mn: 'Хянаж буй нээлттэй үйл явдал' },

  // ---------------------------------------------------------------- honest empty states
  // Each one says WHAT the panel will show and WHAT makes it appear. An empty approval
  // queue is GOOD NEWS (tone="ok"): nothing is waiting on the operator.
  'ag.noQueueTitle': { en: 'Nothing is waiting on you', mn: 'Таныг хүлээж буй зүйл алга' },
  'ag.noQueueHint': {
    en: 'Every agent recommendation has been decided. The moment a rule breaches, the finding, its reasoning and a pre-filled proposal appear here for you to approve, modify or dismiss. Run or speed up the simulation, or relax a threshold in Settings, to see one.',
    mn: 'Агентын бүх зөвлөмж шийдэгдсэн. Дүрэм зөрчигдөх тэр мөчид илрүүлэлт, түүний үндэслэл, урьдчилан бөглөсөн санал энд гарч ирж, таны зөвшөөрөл, засвар эсвэл татгалзлыг хүлээнэ. Симуляцыг эхлүүлэх/хурдасгах, эсвэл тохиргоонд босгыг сулруулж үзнэ үү.',
  },
  'ag.noDecidedTitle': { en: 'No decision recorded yet', mn: 'Одоогоор бүртгэгдсэн шийдвэр алга' },
  'ag.noDecidedHint': {
    en: 'Approving, modifying or dismissing a recommendation above records it here with who decided and when, and writes a row to the audit log.',
    mn: 'Дээрх зөвлөмжийг зөвшөөрөх, засах, татгалзах бүрд хэн хэзээ шийдсэн нь энд бүртгэгдэж, аудитын бүртгэлд мөр бичигдэнэ.',
  },
  'ag.actNoneTitle': { en: 'The activity stream is quiet', mn: 'Үйл ажиллагааны урсгал нам гүм байна' },
  'ag.actNoneHint': {
    en: 'Every agent detection and every operator decision is listed here with its simulation timestamp. Start or speed up the simulation to see entries arrive.',
    mn: 'Агент бүрийн илрүүлэлт, оператор бүрийн шийдвэр симуляцын цагийн тэмдэгтэй хамт энд бүртгэгдэнэ. Симуляцыг эхлүүлэх буюу хурдасгавал бичлэгүүд гарч ирнэ.',
  },

  // ---------------------------------------------------------------- decision log table
  'ag.col.decision': { en: 'Decision', mn: 'Шийдвэр' },
  'ag.col.agent': { en: 'Agent', mn: 'Агент' },
  'ag.col.alert': { en: 'Alert', mn: 'Сэрэмжлүүлэг' },
  'ag.col.by': { en: 'Decided by · at', mn: 'Шийдсэн · хэзээ' },
} as const satisfies Record<string, Entry>;
