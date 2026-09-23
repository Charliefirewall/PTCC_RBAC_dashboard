/** UX pass (Sept 2026) strings. Ours, not the deck's: `r` unset, on the native-review list. */
import type { Entry } from './dict';

export const uxrpDict = {
  // ---- route profile chart
  'rp.axis.stop': { en: 'Stop (travel order)', mn: 'Зогсоол (явах дарааллаар)' },
  'rp.axis.dev': { en: 'Deviation vs schedule (min)', mn: 'Хуваарьаас хазайлт (мин)' },
  'rp.axis.hop': { en: 'Added per hop (s)', mn: 'Зогсоол хооронд нэмэгдсэн (с)' },
  'rp.s.band': { en: '{dow} p10–p90', mn: '{dow} p10–p90' },
  'rp.s.mean': { en: '{dow} mean', mn: '{dow} дундаж' },
  'rp.s.hop': { en: '{dow} delay added per hop (s)', mn: '{dow} зогсоол хооронд нэмэгдсэн саатал (с)' },
  'rp.tt.planned': { en: 'planned {time}', mn: 'төлөвлөсөн {time}' },
  'rp.tt.diff': { en: '{a} vs {b}', mn: '{a} ба {b}' },
  'rp.tt.hop': { en: 'added on the hop to this stop', mn: 'энэ зогсоол хүртэлх хэсэгт нэмэгдсэн' },
  'rp.tt.range': { en: 'range {lo} to {hi}', mn: 'муж {lo} – {hi}' },

  // ---- insight strip
  'rp.ins.end': { en: 'Delay at last stop', mn: 'Эцсийн зогсоол дахь саатал' },
  'rp.ins.endSub': { en: '{dow} {time} start · likely {lo} to {hi} min', mn: '{dow} {time} эхлэл · магадгүй {lo} – {hi} мин' },
  'rp.ins.cmp': { en: 'Compared day', mn: 'Харьцуулсан өдөр' },
  'rp.ins.worse': { en: '{a} +{d} min worse than {b}', mn: '{a} нь {b}-аас +{d} мин муу' },
  'rp.ins.better': { en: '{a} {d} min better than {b}', mn: '{a} нь {b}-аас {d} мин сайн' },
  'rp.ins.same': { en: '{a} same as {b}', mn: '{a} нь {b}-тай ижил' },
  'rp.ins.cmpSub': { en: '{b} ends at {m} min', mn: '{b} эцэст нь {m} мин' },
  'rp.ins.quick': { en: 'Compare with another day:', mn: 'Өөр өдөртэй харьцуулах:' },
  'rp.ins.seg': { en: 'Segment adding most delay', mn: 'Хамгийн их саатуулдаг хэсэг' },
  'rp.ins.segSub': { en: '+{m} min · steepest into {stop} (+{s} s)', mn: '+{m} мин · {stop} хүртэл хамгийн огцом (+{s} с)' },
  'rp.ins.segNone': { en: 'No segment adds delay', mn: 'Саатал нэмдэг хэсэг алга' },
  'rp.ins.dur': { en: 'Trip duration vs plan', mn: 'Аяллын хугацаа ба төлөвлөгөө' },
  'rp.ins.durVal': { en: '{act} vs {plan} min', mn: '{act} / {plan} мин' },
  'rp.ins.durSub': { en: '{pct}% vs plan', mn: 'төлөвлөгөөнөөс {pct}%' },
  'rp.take.late': {
    en: '{dow} {time} trips typically reach {stop} {m} min late; most of it builds on {seg}.',
    mn: '{dow} {time} аяллууд {stop}-д ихэвчлэн {m} мин хоцордог; ихэнх нь {seg} дээр хуримтлагдана.',
  },
  'rp.take.onTime': {
    en: '{dow} {time} trips typically reach {stop} within a minute of schedule.',
    mn: '{dow} {time} аяллууд {stop}-д ихэвчлэн хуваарьаас нэг минутын дотор хүрдэг.',
  },
  'rp.take.early': {
    en: '{dow} {time} trips typically reach {stop} {m} min early — check the planned run time.',
    mn: '{dow} {time} аяллууд {stop}-д ихэвчлэн {m} мин эрт хүрдэг — төлөвлөсөн явах хугацааг шалгана уу.',
  },
} satisfies Record<string, Entry>;
