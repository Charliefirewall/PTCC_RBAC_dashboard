/**
 * Bilingual strings owned by the "roles" workstream.
 *
 * Split out of dict.ts so parallel work on different areas cannot clobber a shared
 * file. Merged into the main dictionary by dict.ts; keys must stay globally unique.
 *
 * Mongolian here is NOT from the client's deck - leave `r` unset so unreviewedKeys()
 * keeps reporting it for native review (plan risk R11).
 *
 * The English `role.fn.*` strings for six of the seven roles ARE verbatim from the
 * source (R2898-R2909, Table 39 "Command & Role Structure"). `role.fn.supervisor` is
 * not - the supervisor role is not in that table.
 */
import type { Entry } from './dict';

export const rolesDict = {
  // ---------------------------------------------------------------- nav
  'nav.dashboard': { en: 'My Dashboard', mn: 'Миний хянах самбар' },
  'nav.agentic': { en: 'Agent Console', mn: 'Агентын самбар' },

  // ---------------------------------------------------------------- role names (R2898-R2909)
  'role.operations_controller': { en: 'Operations Controller', mn: 'Үйл ажиллагааны хянагч' },
  'role.incident_manager': { en: 'PTCC Incident Manager', mn: 'PTCC-ийн ослын менежер' },
  'role.communication_controller': { en: 'Communication Controller', mn: 'Харилцаа холбооны хянагч' },
  'role.dispatcher': { en: 'Dispatcher', mn: 'Диспетчер' },
  'role.field_inspector': { en: 'Field Inspector', mn: 'Хээрийн хяналтын ажилтан' },
  'role.bus_operator_occ': { en: 'Bus Operator OCC', mn: 'Автобусны операторын төв' },
  'role.supervisor': { en: 'Supervisor', mn: 'Ахлах хянагч' },

  // ---------------------------------------------------------------- function column, verbatim
  'role.fn.operations_controller': { en: 'Fleet and service management', mn: 'Тээврийн хэрэгсэл, үйлчилгээний удирдлага' },
  'role.fn.incident_manager': { en: 'Internal coordination lead', mn: 'Дотоод зохицуулалтын ахлагч' },
  'role.fn.communication_controller': { en: 'All inter-agency + public messaging', mn: 'Байгууллага хоорондын болон нийтэд чиглэсэн мэдээлэл' },
  'role.fn.dispatcher': { en: 'Execute instructions to drivers', mn: 'Жолооч нарт заавар хүргэж гүйцэтгүүлэх' },
  'role.fn.field_inspector': { en: 'Ground verification', mn: 'Газар дээрх баталгаажуулалт' },
  'role.fn.bus_operator_occ': { en: 'Execute fleet deployment', mn: 'Тээврийн хэрэгслийн хуваарилалтыг гүйцэтгэх' },
  'role.fn.supervisor': { en: 'Override authority and audit review (not in the source role table)', mn: 'Хүчингүй болгох эрх ба аудитын хяналт (эх сурвалжийн хүснэгтэд байхгүй)' },

  // ---------------------------------------------------------------- what each role's screen leads with
  'role.focus.operations_controller': {
    en: 'Network health, operational KPIs, AI alerts and active incidents. Lands on the Command Centre.',
    mn: 'Сүлжээний төлөв, гүйцэтгэлийн үзүүлэлт, AI сэрэмжлүүлэг, идэвхтэй тохиолдол. Удирдлагын төв рүү нэвтэрнэ.',
  },
  'role.focus.incident_manager': {
    en: 'Incident queue by severity, incident detail, assessment, escalation and resolution workflow.',
    mn: 'Ноцтой байдлаар эрэмбэлсэн тохиолдлын жагсаалт, дэлгэрэнгүй, үнэлгээ, шатлан мэдээлэх ба шийдвэрлэх урсгал.',
  },
  'role.focus.communication_controller': {
    en: 'Passenger messages awaiting approval, and the inter-agency coordination log.',
    mn: 'Зөвшөөрөл хүлээж буй зорчигчийн мэдэгдэл, байгууллага хоорондын харилцааны бүртгэл.',
  },
  'role.focus.dispatcher': {
    en: 'Fleet availability, dispatch recommendations and the live map. Executes, does not approve.',
    mn: 'Тээврийн хэрэгслийн бэлэн байдал, илгээх зөвлөмж, шууд зураг. Гүйцэтгэнэ, батлахгүй.',
  },
  'role.focus.field_inspector': {
    en: 'Assigned incidents, location map, inspection checklist, field instructions and the evidence bundle.',
    mn: 'Хуваарилагдсан тохиолдол, байршлын зураг, үзлэгийн жагсаалт, хээрийн заавар, нотлох баримт.',
  },
  'role.focus.bus_operator_occ': {
    en: 'Fleet deployment by operator, vehicle availability and the incidents affecting them.',
    mn: 'Операторын тээврийн хэрэгслийн хуваарилалт, бэлэн байдал, нөлөөлж буй тохиолдлууд.',
  },
  'role.focus.supervisor': {
    en: 'Override review, audit trail and the whole network. The only role that may override a compulsory action (L1347).',
    mn: 'Хүчингүй болголтын хяналт, аудитын бүртгэл, бүх сүлжээ. Заавал хийх арга хэмжээг хүчингүй болгох цорын ганц эрх (L1347).',
  },

  // ---------------------------------------------------------------- permissions
  'role.permTitle': { en: 'Permissions for this role', mn: 'Энэ үүргийн эрх' },
  'role.permSummary': { en: '{n} of {total}', mn: '{total}-аас {n}' },
  'role.perm.acknowledge_alert': { en: 'Acknowledge alert', mn: 'Сэрэмжлүүлгийг хүлээн авах' },
  'role.perm.create_event': { en: 'Validate alert → create event', mn: 'Сэрэмжлүүлгийг баталгаажуулж үйл явдал үүсгэх' },
  'role.perm.advance_stage': { en: 'Advance workflow stage', mn: 'Ажлын урсгалын үе шатыг ахиулах' },
  'role.perm.complete_action': { en: 'Complete response action', mn: 'Хариу арга хэмжээг гүйцэтгэх' },
  'role.perm.escalate_event': { en: 'Escalate incident', mn: 'Тохиолдлыг шатлан мэдээлэх' },
  'role.perm.approve_message': { en: 'Approve passenger message', mn: 'Зорчигчийн мэдэгдлийг батлах' },
  'role.perm.send_coordination': { en: 'Send coordination message', mn: 'Зохицуулалтын мэдэгдэл илгээх' },
  'role.perm.assign_resource': { en: 'Assign vehicle or field unit', mn: 'Тээврийн хэрэгсэл, хээрийн нэгж хуваарилах' },
  'role.perm.upload_evidence': { en: 'Attach evidence', mn: 'Нотлох баримт хавсаргах' },
  'role.perm.configure_thresholds': { en: 'Change thresholds', mn: 'Босго утгыг өөрчлөх' },
  'role.perm.override_compulsory': { en: 'Override a compulsory action (L1347)', mn: 'Заавал хийх арга хэмжээг хүчингүй болгох (L1347)' },

  // ---------------------------------------------------------------- selection screen
  'role.selectTitle': { en: 'Select your operational role', mn: 'Үйл ажиллагааны үүргээ сонгоно уу' },
  'role.selectSub': {
    en: 'The platform is shared. What changes per role is the information hierarchy, the actions offered and the permissions behind them.',
    mn: 'Платформ нэг. Үүрэг тус бүрээр мэдээллийн эрэмбэ, санал болгох үйлдэл, тэдгээрийн ард байх эрх өөрчлөгдөнө.',
  },
  'role.notAuth': {
    en: 'This is not a login. Authentication and RBAC are deliberately out of scope for this demo — a role switcher stands in for them, and the role can be changed at any time from the top bar.',
    mn: 'Энэ бол нэвтрэлт биш. Нэвтрэлт танилт ба эрхийн хяналт энэ демонстрацид зориудаар багтаагүй — үүрэг солигч орлож байгаа бөгөөд дээд мөрнөөс хэдийд ч өөрчилж болно.',
  },
  'role.lastUsed': { en: 'last used', mn: 'сүүлд ашигласан' },
  'role.landsOn': { en: 'Lands on {screen}', mn: '{screen} дээр нээгдэнэ' },
  'role.modulesCount': { en: '{n} modules visible', mn: '{n} модуль харагдана' },
  'role.continueAs': { en: 'Continue as {role}', mn: '{role} болж үргэлжлүүлэх' },
  'role.skipHint': {
    en: 'Press Enter, or double-click a card. Add ?role=dispatcher to the URL to skip this screen entirely.',
    mn: 'Enter дарах эсвэл картыг давхар товшино уу. URL-д ?role=dispatcher нэмбэл энэ дэлгэцийг бүрэн алгасна.',
  },
  'role.roleSource': {
    en: 'The seven roles are taken from the design document’s Command & Role Structure table (R2898–R2909). Which screens and permissions each one gets is our reading of that table — graded on every card and every panel.',
    mn: 'Долоон үүргийг зохиомжийн баримт бичгийн Command & Role Structure хүснэгтээс (R2898–R2909) авсан. Аль дэлгэц, эрх олгохыг бид тайлбарласан бөгөөд карт, самбар бүр дээр үнэлгээг нь тэмдэглэсэн.',
  },

  // ---------------------------------------------------------------- dashboard chrome
  'role.compositionNote': { en: 'Widget composition for this role:', mn: 'Энэ үүргийн самбарын бүрдэл:' },
  'role.dashboardFooter': {
    en: 'Hiding a module hides it from the navigation only — the platform underneath is shared, and every URL still resolves. This demo has no security boundary.',
    mn: 'Модулийг нуух нь зөвхөн цэснээс нуух бөгөөд доорх платформ нэг хэвээр, бүх хаяг ажиллана. Энэ демонстрацид аюулгүй байдлын хязгаар байхгүй.',
  },

  // ---------------------------------------------------------------- widgets
  'rw.networkHealth': { en: 'Network health', mn: 'Сүлжээний төлөв' },
  'rw.opsKpi': { en: 'Operational KPIs', mn: 'Үйл ажиллагааны үзүүлэлт' },
  'rw.aiAlerts': { en: 'AI / analytics alerts', mn: 'AI шинжилгээний сэрэмжлүүлэг' },
  'rw.activeIncidents': { en: 'Active incidents', mn: 'Идэвхтэй тохиолдол' },
  'rw.incidentQueue': { en: 'Incident queue — by priority', mn: 'Тохиолдлын дараалал — эрэмбээр' },
  'rw.incidentDetail': { en: 'Incident detail', mn: 'Тохиолдлын дэлгэрэнгүй' },
  'rw.escalation': { en: 'Escalation & resolution', mn: 'Шатлан мэдээлэх ба шийдвэрлэх' },
  'rw.pendingApprovals': { en: 'Awaiting approval', mn: 'Зөвшөөрөл хүлээж буй' },
  'rw.commsLog': { en: 'Coordination log', mn: 'Зохицуулалтын бүртгэл' },
  'rw.resourceStatus': { en: 'Fleet availability', mn: 'Тээврийн хэрэгслийн бэлэн байдал' },
  'rw.dispatchRecs': { en: 'Dispatch recommendations', mn: 'Илгээх зөвлөмж' },
  'rw.assignedIncidents': { en: 'Assigned incidents', mn: 'Хуваарилагдсан тохиолдол' },
  'rw.inspectionChecklist': { en: 'Inspection checklist', mn: 'Үзлэгийн жагсаалт' },
  'rw.fieldInstructions': { en: 'Field instructions', mn: 'Хээрийн заавар' },
  'rw.evidenceBundle': { en: 'Evidence & documentation', mn: 'Нотлох баримт, бичиг баримт' },
  'rw.fleetDeployment': { en: 'Fleet deployment by operator', mn: 'Операторын хуваарилалт' },
  'rw.auditLog': { en: 'Audit trail', mn: 'Аудитын бүртгэл' },
  'rw.overrideReview': { en: 'Override review', mn: 'Хүчингүй болголтын хяналт' },

  // ---------------------------------------------------------------- widget content
  'rw.none': { en: 'Nothing outstanding.', mn: 'Хүлээгдэж буй зүйл алга.' },
  'rw.noPending': { en: 'No message is waiting for approval.', mn: 'Зөвшөөрөл хүлээж буй мэдэгдэл алга.' },
  'rw.noRecs': { en: 'No alert needs a dispatch decision.', mn: 'Илгээх шийдвэр шаардсан сэрэмжлүүлэг алга.' },
  'rw.noAssigned': { en: 'No incident is at a stage that needs ground verification. Run a scenario (keys 1–9) to create one.', mn: 'Газар дээр баталгаажуулах шаардлагатай тохиолдол алга. Хувилбар ажиллуулна уу (1–9 товч).' },
  'rw.noOverrides': { en: 'No compulsory action has been overridden.', mn: 'Хүчингүй болгосон заавал хийх арга хэмжээ алга.' },
  'rw.auditEmpty': { en: 'No action has been recorded yet.', mn: 'Бүртгэгдсэн үйлдэл алга.' },
  'rw.selectIncident': { en: 'Select an incident to see its detail. No incidents yet — run a scenario with keys 1–9.', mn: 'Дэлгэрэнгүйг харахын тулд тохиолдол сонгоно уу. Одоогоор байхгүй — 1–9 товчоор хувилбар ажиллуулна уу.' },
  'rw.uptime': { en: 'Network uptime', mn: 'Сүлжээний ажиллагаа' },
  'rw.devicesOffline': { en: 'Devices offline', mn: 'Холболтгүй төхөөрөмж' },
  'rw.onTime': { en: 'On time', mn: 'Хуваарийн дагуу' },
  'rw.meanDev': { en: 'Mean schedule deviation', mn: 'Хуваарийн дундаж хазайлт' },
  'rw.disrupted': { en: 'Routes disrupted', mn: 'Тасалдсан чиглэл' },
  'rw.bunching': { en: 'Bunching events', mn: 'Овоорсон тохиолдол' },
  'rw.inService': { en: 'In service', mn: 'Үйлчилгээнд' },
  'rw.outOfService': { en: 'Out of service', mn: 'Үйлчилгээнээс гадуур' },
  'rw.breakdown': { en: 'Breakdown', mn: 'Эвдрэлтэй' },
  'rw.operator': { en: 'Operator {op}', mn: '{op} оператор' },
  'rw.queueSummary': { en: '{n} open, {crit} at level 1–2', mn: '{n} нээлттэй, {crit} нь 1–2 түвшинд' },
  'rw.detectedBy': { en: 'Detection source', mn: 'Илрүүлсэн эх сурвалж' },
  'rw.location': { en: 'Location', mn: 'Байршил' },
  'rw.playbook': { en: 'Playbook', mn: 'Үйл ажиллагааны заавар' },
  'rw.compulsory': { en: 'Compulsory', mn: 'Заавал' },
  'rw.linkedAlerts': { en: 'Linked alerts', mn: 'Холбогдсон сэрэмжлүүлэг' },
  'rw.assessment': { en: 'Assessment', mn: 'Үнэлгээ' },
  'rw.assessmentText': {
    en: '{playbook} playbook applies. {n} compulsory action(s) still outstanding, {alerts} alert(s) linked. Current stage: {stage}.',
    mn: '{playbook} заавар хамаарна. Заавал хийх {n} арга хэмжээ дутуу, {alerts} сэрэмжлүүлэг холбогдсон. Одоогийн үе шат: {stage}.',
  },
  'rw.advance': { en: 'Advance stage', mn: 'Үе шат ахиулах' },
  // Ellipsis: both of these OPEN the screen where the action is completed, they do not
  // perform it. A verb with no ellipsis promises a state change that does not happen.
  'rw.escalate': { en: 'Escalate…', mn: 'Шатлуулах…' },
  'rw.openInAlerts': { en: 'Open full record', mn: 'Бүрэн бүртгэлийг нээх' },
  'rw.blockedBy': { en: 'Blocked — compulsory action(s) outstanding: {list}', mn: 'Хаагдсан — дутуу заавал хийх арга хэмжээ: {list}' },
  'rw.approve': { en: 'Approve', mn: 'Батлах' },
  'rw.assign': { en: 'Assign…', mn: 'Хуваарилах…' },
  'rw.blockedCompulsory': { en: 'Compulsory actions outstanding', mn: 'Дутуу заавал хийх арга хэмжээ' },
  'rw.upload': { en: 'Attach photo or note', mn: 'Зураг, тэмдэглэл хавсаргах' },
  'rw.uploadFuture': { en: 'No upload path exists in this demo — the evidence bundle is read-only here.', mn: 'Энэ демонстрацид байршуулах боломж байхгүй — нотлох баримт зөвхөн уншигдана.' },
  'rw.notPermitted': { en: 'Your role may not: {perm}', mn: 'Таны үүрэгт зөвшөөрөгдөөгүй: {perm}' },
  'rw.notPermittedShort': { en: 'Not permitted for this role.', mn: 'Энэ үүрэгт зөвшөөрөгдөөгүй.' },

  // Action vocabulary is the source's own (R2885 forbids vague instructions); the mapping
  // from an alert type to one of these lines is ours.
  'rw.recStandby': { en: 'Deploy standby buses', mn: 'Нөөц автобус гаргах' },
  'rw.recDiversion': { en: 'Activate diversion', mn: 'Тойрох замыг идэвхжүүлэх' },
  'rw.recInspector': { en: 'Dispatch field inspector', mn: 'Хээрийн хяналтын ажилтан илгээх' },
  'rw.recSwap': { en: 'Schedule vehicle swap on depot return', mn: 'Буцаж ирэхэд тээврийн хэрэгсэл солих' },

  'rw.fi1': { en: 'Proceed to {loc} and confirm access.', mn: '{loc} руу очиж нэвтрэх боломжийг тодруулна уу.' },
  'rw.fi2': { en: 'Verify the reported condition: {type}, severity level {level}.', mn: 'Мэдээлсэн нөхцөлийг шалгана уу: {type}, ноцтой байдлын түвшин {level}.' },
  'rw.fi3': { en: 'Report back to the PTCC Incident Manager before leaving the site.', mn: 'Талбайгаас гарахын өмнө PTCC-ийн ослын менежерт мэдэгдэнэ үү.' },

  // ---------------------------------------------------------------- top bar
  'top.signedInAs': { en: 'Role', mn: 'Үүрэг' },
  'top.switchRole': { en: 'Switch', mn: 'Солих' },
  'top.switchRoleHint': { en: 'Back to role selection', mn: 'Үүрэг сонгох руу буцах' },
  'top.theme': { en: 'Light / dark theme', mn: 'Гэрэлт / бараан загвар' },
  'top.playPause': { en: 'Pause or resume the simulation (Space)', mn: 'Загварчлалыг түр зогсоох / үргэлжлүүлэх (Space)' },
  'top.more': { en: 'More settings', mn: 'Нэмэлт тохиргоо' },
  'top.moreHint': { en: 'Presenter keys: H for help, W for video wall, L for language.', mn: 'Илтгэгчийн товч: H тусламж, W дэлгэцийн хана, L хэл.' },
  'top.preset': { en: 'Display preset', mn: 'Дэлгэцийн тохируулга' },
  'top.presetLaptop': { en: 'Laptop', mn: 'Зөөврийн компьютер' },
  'top.presetWs': { en: 'Workstation 32″', mn: 'Ажлын станц 32″' },
  'top.presetWall': { en: 'Video wall', mn: 'Дэлгэцийн хана' },
  'top.speed': { en: 'Simulation speed', mn: 'Загварчлалын хурд' },
  'top.wallMode': { en: 'Video-wall mode', mn: 'Дэлгэцийн ханын горим' },
  'top.evidenceMode': { en: 'Evidence mode', mn: 'Нотолгооны горим' },
  'top.on': { en: 'On', mn: 'Асаалттай' },
  'top.off': { en: 'Off', mn: 'Унтраалттай' },
} as const satisfies Record<string, Entry>;
