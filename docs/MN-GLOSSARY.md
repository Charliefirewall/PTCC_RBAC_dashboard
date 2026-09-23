# Mongolian (Khalkha, Cyrillic) glossary for the PTCC demo

Binding for every `mn` string in `src/i18n/dict*.ts`. Written for a Mongolian public-transport audience (PTPD / PTCC management and controllers) in formal but plain Khalkha. Where the client's own deck gives a term (entries marked `r: true` in `dict.ts`), **the deck wins**.

## 1. Style rules

1. **Plain, precise Khalkha.** Natural word order, not English order. No calques: write what a Mongolian controller would say.
2. **Buttons and actions** use the infinitive in -х: *Илгээх*, *Цуцлах*, *Баталгаажуулах*, *Нээх*.
3. **Headings and labels** are short noun phrases in sentence case: *Нэн тэргүүний сэрэмжлүүлэг*.
4. **Case suffixes after numbers, codes or Latin** go after a hyphen: *R7-ийн*, *5-аас*, *PTCC-ийн*, *TCC-д*. Placeholders follow the same rule: `{route}-ийн`.
5. **Keep every `{placeholder}` exactly.** Reorder them freely to fit Mongolian grammar.
6. **Numbers** keep "." as the decimal point (as on the rest of the screen). A space goes before units: *17 мин*.
7. **Do not translate** route ids (R7), bus ids (3-015), event ids, or the literal key names shown in hotkeys (P, N, Shift+P).
8. **Length:** stay close to the English length. Panels are sized for English; prefer the shorter correct phrase.

## 2. Acronyms and systems

| English | Mongolian |
|---|---|
| PTCC | **PTCC** (keep) |
| PTPD | **НТГ** (Нийтийн тээврийн газар), as in the deck |
| TCC / Traffic Control Centre / Traffic department | **ЗХУТ** (Замын хөдөлгөөний удирдлагын төв); full name on first use in long text |
| Traffic Police | Замын цагдаа |
| UB Card, T-Box, AFC, GPS, AVL, KPI, ROI, RUL, API | keep Latin (system and product names) |
| CCTV | Хяналтын камер (deck); "CCTV" only where space is very tight |
| SOP | **журам** in running text ("SOP-ийн дагуу" → *журмын дагуу*); badge labels **Т1 / Т2 / Т3** |
| OCC (bus operator control centre) | Автобусны операторын төв (deck) |
| LLM / AI | хиймэл оюун (AI); "LLM" keep Latin |

## 3. Core operations terms

| English | Mongolian |
|---|---|
| alert | сэрэмжлүүлэг |
| event (validated) | үйл явдал |
| incident | осол / зөрчил (by context); "Incident Info" = Ослын мэдээлэл (deck) |
| route | чиглэл |
| trip (one run of a bus) | **рейс** |
| stop | буудал |
| bus / vehicle | автобус / тээврийн хэрэгсэл |
| fleet | автобусны парк |
| driver | жолооч |
| bus operator (company) | автобусны оператор (deck); "operator" as a PTCC person = оператор / хянагч by context |
| dispatch / dispatcher | диспетчер |
| depot | бааз (автобусны бааз) |
| timetable / schedule | хуваарь |
| schedule deviation | хуваарийн зөрүү (deck) |
| delay / late | хоцролт / хоцорсон |
| early | эрт |
| on time | цагтаа |
| headway | **давтамж** (deck) |
| service gap | үйлчилгээний завсар (deck) |
| bunching | бөөгнөрөл (deck) |
| load / occupancy | ачаалал / зорчигчийн ачаалал (deck) |
| overcrowding | хэт ачаалал (deck) |
| passenger | зорчигч |
| ridership | зорчигчийн тоо (deck) |
| threshold | босго (deck) |
| severity | ноцтой байдал / зэрэглэл |
| Informational / Warning / Critical | Мэдээлэл / Анхааруулга / Ноцтой (deck) |
| level (SOP) | түвшин; badges Т1 / Т2 / Т3 |
| escalate | дээд шатанд шилжүүлэх |
| playbook | арга хэмжээний заавар |
| recommended / compulsory action | зөвлөмж болгосон / заавал хийх арга хэмжээ (deck) |
| validate / approve | баталгаажуулах / батлах |
| acknowledge | хүлээн авах (хүлээн авсныг баталгаажуулах) |
| draft | ноорог |
| send / sent | илгээх / илгээсэн |
| revoke | буцаан татах |
| cancel | болих |
| audit log | аудитын бүртгэл |
| road segment | замын хэсэг |
| corridor | коридор |
| hotspot (delay) | саатлын цэг |
| network | сүлжээ |
| map | газрын зураг |
| dashboard | хяналтын самбар |
| Command Centre | Удирдлагын төв |

## 4. Forecast and analytics

| English | Mongolian |
|---|---|
| forecast | таамаглал |
| chance / probability | магадлал |
| confidence (model) | итгэлийн түвшин |
| horizon (+15 min) | хугацаа (+15 мин) |
| normal / baseline ("the normal trip") | хэвийн / жишиг (хэвийн рейс) |
| normal range (p10–p90) | хэвийн муж (p10–p90) |
| trend | чиг хандлага |
| watch list | хяналтын жагсаалт |
| scorecard (forecast vs actual) | таамаглалын гүйцэтгэл |
| insight | дүгнэлт |
| before / during / after | өмнө / үед / дараа |
| recovery | сэргэлт |
| simulated | загварчилсан |
| synthetic | зохиомол |
| demo | демо |
| evidence / provenance | нотолгоо / эх сурвалж |

## 5. Units, time and days

| English | Mongolian |
|---|---|
| min / s / h | мин / сек / цаг |
| km, km/h | км, км/ц |
| d, wk | хоног, долоо хоног |
| % | % |
| Mon Tue Wed Thu Fri Sat Sun | Даваа, Мягмар, Лхагва, Пүрэв, Баасан, Бямба, Ням (short: Да, Мя, Лх, Пү, Ба, Бя, Ня) |
| AM peak / PM peak | өглөөний оргил цаг / оройн оргил цаг |
| midday / evening | өдрийн цаг / оройн цаг |
| now | одоо |
| today | өнөөдөр |

## 6. Rule and metric names (shown inside sentences)

| Code | Mongolian |
|---|---|
| service_gap | үйлчилгээний завсар |
| bunching | бөөгнөрөл |
| delay_sop | хоцролтын журам |
| delay_network | сүлжээний хоцролт |
| schedule_deviation | хуваарийн зөрүү |
| overcrowding | хэт ачаалал |
| vehicle_breakdown | эвдрэл |
| panic | яаралтай дохио |
| accident | осол |
| route_deviation | маршрутаас хазайлт |
| harsh_braking | огцом тормослолт |
| overspeed | хурд хэтрүүлэлт |
| equipment_afc / _cctv / _tbox | төлбөрийн систем / хяналтын камер / бортын төхөөрөмж тасарсан |
| repeated_failure | давтагдсан гэмтэл |
| headway_s / min_headway_s | давтамж / хамгийн бага давтамж |
| delay_min | хоцролт |
| routes_affected | нөлөөлсөн чиглэл |
| load_pct | ачаалал |
| offline_s | тасарсан хугацаа |
| Table 9 … Table 14 | Хүснэгт 9 … Хүснэгт 14 |
| PTCC input | PTCC-ийн өгсөн утга |
