/**
 * Bilingual strings for the PTCC precision enhancements (PTCC note, Sept 2026):
 * SOP ladder, drill-down trip view, short-term forecast, route profile, hotspots.
 *
 * None of this is the deck's wording, so `r` is unset everywhere and every key stays on
 * the native-review list (plan risk R11).
 */
import type { Entry } from './dict';

export const sopDict = {
  // ---------------------------------------------------------------- thresholds
  'th.delay_l1_min': { en: 'Delay — Level 1 (route level)', mn: 'Хоцролт — 1-р түвшин (чиглэл)' },
  'th.delay_l2_min': { en: 'Delay — Level 2 (medium)', mn: 'Хоцролт — 2-р түвшин (дунд)' },
  'th.delay_l3_min': { en: 'Delay — Level 3 (senior)', mn: 'Хоцролт — 3-р түвшин (ахлах)' },
  'th.routes_affected_l2': { en: 'Routes affected that raise the level', mn: 'Түвшин нэмэгдүүлэх нөлөөлөлд өртсөн чиглэл' },
  'th.forecast_min_probability_pct': { en: 'Forecast — minimum chance to list', mn: 'Таамаг — жагсаах доод магадлал' },
  'th.forecast_drift_tau_min': { en: 'Forecast — live-drift fade time', mn: 'Таамаг — шууд хазайлт бүдгэрэх хугацаа' },
  'th.forecast_refresh_s': { en: 'Forecast — refresh interval', mn: 'Таамаг — шинэчлэх давтамж' },

  // ---------------------------------------------------------------- alerts
  'alert.delay_network': { en: '{n} routes delayed — worst {min} min · {corridor}', mn: '{n} чиглэл хоцорч байна — хамгийн их {min} мин · {corridor}' },

  // ---------------------------------------------------------------- playbook actions
  'pb.monitor_recovery': { en: 'Monitor recovery for 15 min', mn: '15 минут сэргэлтийг хянах' },
  'pb.notify_driver_delay': { en: 'Notify driver of delay and hold instruction', mn: 'Жолоочид хоцролт, зогсоох зааврыг мэдэгдэх' },
  'pb.adjust_headway': { en: 'Adjust headway / hold following buses', mn: 'Интервал тохируулах / араас явах автобусыг саатуулах' },
  'pb.short_turn': { en: 'Short-turn a bus to fill the gap', mn: 'Завсрыг нөхөхөөр автобусыг богино эргүүлэх' },
  'pb.record_delay': { en: 'Record delay cause', mn: 'Хоцролтын шалтгааныг бүртгэх' },
  'pb.escalate_senior': { en: 'Escalate to senior duty manager', mn: 'Ахлах жижүүр менежерт шилжүүлэх' },
  'pb.notify_traffic_department': { en: 'Communicate with Traffic department (TCC)', mn: 'Замын хөдөлгөөний удирдлагын төвтэй холбогдох' },

  // ---------------------------------------------------------------- SOP
  'sop.level': { en: 'L{n}', mn: 'Т{n}' },
  'sop.level.1': { en: 'Route level — executed automatically', mn: 'Чиглэлийн түвшин — автоматаар гүйцэтгэсэн' },
  'sop.level.2': { en: 'Medium — proposed action, needs approval', mn: 'Дунд — санал болгосон арга хэмжээ, зөвшөөрөл шаардлагатай' },
  'sop.level.3': { en: 'Senior — escalate and communicate with Traffic department', mn: 'Ахлах — дээш шилжүүлж, замын хөдөлгөөний газартай холбогдох' },
  'sop.routesAffected': { en: '{n} routes affected', mn: '{n} чиглэл нөлөөлөлд өртсөн' },
  'sop.autoSent': { en: 'Auto-sent to driver / OCC', mn: 'Жолооч / OCC-д автоматаар илгээсэн' },
  'sop.autoOff': { en: 'Auto-send is off', mn: 'Автомат илгээлт унтраалттай' },
  'sop.revoke': { en: 'Revoke', mn: 'Цуцлах' },
  'sop.revoked': { en: 'Revoked', mn: 'Цуцалсан' },
  'sop.approve': { en: 'Approve action', mn: 'Арга хэмжээг батлах' },
  'sop.escalate': { en: 'Escalate', mn: 'Дээш шилжүүлэх' },
  'sop.trafficDraft': { en: 'Traffic draft', mn: 'Замын газарт ноорог' },
  'sop.draft': { en: 'Draft — not sent', mn: 'Ноорог — илгээгээгүй' },
  'sop.sendDraft': { en: 'Send', mn: 'Илгээх' },
  'sop.auto': { en: 'Auto (SOP L1)', mn: 'Автомат (SOP Т1)' },
  'sop.l1.msg': {
    en: 'PTCC SOP L1: route {route} running {min} min late. Driver of {bus}: continue in service, no layover extension; dispatch: hold next departure if headway < plan.',
    mn: 'PTCC SOP Т1: {route} чиглэл {min} минут хоцорч байна. {bus} жолооч: үйлчилгээгээ үргэлжлүүл, зогсолтыг сунгахгүй; диспетчер: интервал төлөвлөгөөнөөс бага бол дараагийн хөдөлгөөнийг саатуул.',
  },
  'sop.l3.draft': {
    en: 'PTCC coordination request: route {route} delayed {min} min. Request TCC signal-timing review and traffic assistance on the affected corridor.',
    mn: 'PTCC хамтын ажиллагааны хүсэлт: {route} чиглэл {min} минут хоцорсон. Нөлөөлөлд өртсөн коридорт гэрлэн дохионы хуваарь хянах, замын туслалцаа хүсье.',
  },
  'sop.l3.draftNet': {
    en: 'PTCC coordination request: {n} routes delayed (worst {min} min: {routes}), mainly on {corridor}. Request TCC signal-timing review and traffic assistance on that corridor.',
    mn: 'PTCC хамтын ажиллагааны хүсэлт: {n} чиглэл хоцорсон (хамгийн их {min} мин: {routes}), голчлон {corridor}. Тухайн коридорт гэрлэн дохионы хуваарь хянах, замын туслалцаа хүсье.',
  },
  'sop.tccAck': {
    en: 'TCC acknowledged (SIMULATED): signal-timing review started, traffic unit informed.',
    mn: 'ЗХУТ хүлээн авлаа (ЗАГВАРЧИЛСАН): гэрлэн дохионы хуваарийн хяналт эхэлсэн, замын хэсэгт мэдэгдсэн.',
  },
  'sop.policy': {
    en: 'L1 auto-sends a notification only — it never moves a bus or changes service. Every send is audited and can be revoked.',
    mn: 'Т1 зөвхөн мэдэгдэл автоматаар илгээнэ — автобус хөдөлгөх, үйлчилгээ өөрчлөхгүй. Илгээлт бүрийг аудитад бүртгэж, цуцлах боломжтой.',
  },
  'set.l1AutoExec': { en: 'SOP Level 1: send notification automatically', mn: 'SOP Т1: мэдэгдлийг автоматаар илгээх' },
  'set.dow': { en: 'Baseline day of week', mn: 'Суурь өдөр' },
  'role.perm.revoke_auto_action': { en: 'Revoke an automatic SOP notification', mn: 'Автомат SOP мэдэгдлийг цуцлах' },
  'role.perm.escalate_l3': { en: 'Escalate a Level 3 delay', mn: '3-р түвшний хоцролтыг дээш шилжүүлэх' },
  'hk.ptcc': { en: 'Run D10 — PTCC SOP ladder (N for next level)', mn: 'D10 — PTCC SOP шатыг ажиллуулах (дараагийн түвшин N)' },
  // ---------------------------------------------------------------- forecast (PTCC scenario 2)
  'fc.tab': { en: 'Forecast', mn: 'Таамаг' },
  'fc.horizon': { en: 'Horizon', mn: 'Хугацаа' },
  'fc.title.panel': { en: 'Possible alerts ahead (forecast)', mn: 'Болзошгүй сэрэмжлүүлэг (таамаг)' },
  'fc.title': { en: '{route} may pass {min} min delay within {h} min', mn: '{route} {h} минутын дотор {min} минутаас их хоцрох магадлалтай' },
  'fc.titleNet': { en: '{n} routes may be delayed within {h} min (≥{min} min)', mn: '{h} минутын дотор {n} чиглэл хоцрох магадлалтай (≥{min} мин)' },
  'fc.probConf': { en: 'chance {p}% · confidence {c} · +{h} min', mn: 'магадлал {p}% · итгэл {c} · +{h} мин' },
  'fc.tag': { en: 'SIMULATED FORECAST', mn: 'ЗАГВАРЧИЛСАН ТААМАГ' },
  'fc.drill': { en: 'Drill down', mn: 'Дэлгэрэнгүй' },
  'fc.minChance': { en: 'Listed if chance ≥ {p}% · baseline day {dow}', mn: 'Магадлал ≥ {p}% бол жагсаана · суурь өдөр {dow}' },
  'fc.note': {
    en: 'Extension — outside R1096 scope. Norm + fading live drift + live segment delay; no ML. Confidence capped at 0.6.',
    mn: 'Өргөтгөл — R1096-ийн хамрах хүрээнээс гадуур. Норм + бүдгэрэх шууд хазайлт + сегментийн шууд саатал; ML үгүй. Итгэл 0.6-аас хэтрэхгүй.',
  },
  'fc.none': { en: 'No delay alert forecast at +{h} min', mn: '+{h} минутад хоцролтын сэрэмжлүүлэг таамаглагдаагүй' },
  'fc.noneHint': {
    en: 'Nothing reaches the listing chance. Press P to run the PTCC SOP scenario, or lower the minimum chance in Settings.',
    mn: 'Жагсаах магадлалд хүрэх зүйл алга. PTCC SOP хувилбарыг ажиллуулахын тулд P дарах эсвэл Тохиргоонд доод магадлалыг бууруулна уу.',
  },
  'fc.legend': { en: 'Forecast', mn: 'Таамаг' },

  // ---------------------------------------------------------------- drill-down trip tab
  'trip.tab': { en: 'Trip', mn: 'Аялал' },
  'trip.driver': { en: 'Driver', mn: 'Жолооч' },
  'trip.driverNote': { en: 'Placeholder details — the source gives a driver id only', mn: 'Жишээ мэдээлэл — эх сурвалжид зөвхөн жолоочийн дугаар бий' },
  'trip.shift': { en: 'Shift', mn: 'Ээлж' },
  'trip.radio': { en: 'Radio', mn: 'Радио' },
  'trip.years': { en: 'Years driving', mn: 'Жолоодсон жил' },
  'trip.position': { en: 'Real-time position', mn: 'Бодит цагийн байршил' },
  'trip.openMap': { en: 'Open on map', mn: 'Газрын зураг дээр нээх' },
  'trip.speed': { en: 'Speed this trip', mn: 'Энэ аяллын хурд' },
  'trip.speedStats': { en: 'avg {avg} · max {max} km/h · {n} samples', mn: 'дундаж {avg} · дээд {max} км/ц · {n} хэмжилт' },
  'trip.stops': { en: 'Every stop — deviation from schedule', mn: 'Буудал бүр — хуваариас хазайлт' },
  'trip.stop': { en: 'Stop', mn: 'Буудал' },
  'trip.planned': { en: 'Planned', mn: 'Төлөвлөсөн' },
  'trip.actual': { en: 'Actual', mn: 'Бодит' },
  'trip.dev': { en: 'Deviation', mn: 'Хазайлт' },
  'trip.norm': { en: 'Normal (p10–p90)', mn: 'Хэвийн (p10–p90)' },
  'trip.vsNorm': { en: 'vs normal', mn: 'хэвийнтэй харьцуулахад' },
  'trip.segment': { en: 'Road segment', mn: 'Замын хэсэг' },
  'trip.forecastRow': { en: 'forecast', mn: 'таамаг' },
  'trip.chart': { en: 'This trip vs the normal trip at a similar time', mn: 'Энэ аялал ба ижил цагийн хэвийн аялал' },
  'trip.actualSeries': { en: 'This trip', mn: 'Энэ аялал' },
  'trip.normSeries': { en: 'Normal (mean)', mn: 'Хэвийн (дундаж)' },
  'trip.bandSeries': { en: 'Normal range p10–p90', mn: 'Хэвийн муж p10–p90' },
  'trip.prevSeries': { en: 'Previous trip', mn: 'Өмнөх аялал' },
  'trip.showPrev': { en: 'Compare previous trip', mn: 'Өмнөх аялалтай харьцуулах' },
  'trip.empty': { en: 'No stop served yet on this trip', mn: 'Энэ аялалд буудал үйлчлээгүй байна' },
  'trip.emptyHint': {
    en: 'The log starts when the demo starts. Buses already mid-route show the stops served since then.',
    mn: 'Бүртгэл демо эхлэхэд эхэлнэ. Замын дунд явсан автобусууд тэр цагаас хойших буудлуудыг харуулна.',
  },
  'trip.normNote': {
    en: 'Normal = synthetic 8-week baseline for {dow}, trip start {start} (formula, SIMULATED)',
    mn: 'Хэвийн = {dow}-ийн 8 долоо хоногийн загварчилсан суурь, аялал эхэлсэн {start} (томьёо, ЗАГВАРЧИЛСАН)',
  },
  'trip.fromAlert': { en: 'Opened from alert {id}', mn: '{id} сэрэмжлүүлгээс нээсэн' },
  'trip.min': { en: '{v} min', mn: '{v} мин' },
  'dow.0': { en: 'Mon', mn: 'Да' },
  'dow.1': { en: 'Tue', mn: 'Мя' },
  'dow.2': { en: 'Wed', mn: 'Лх' },
  'dow.3': { en: 'Thu', mn: 'Пү' },
  'dow.4': { en: 'Fri', mn: 'Ба' },
  'dow.5': { en: 'Sat', mn: 'Бя' },
  'dow.6': { en: 'Sun', mn: 'Ня' },
} satisfies Record<string, Entry>;
