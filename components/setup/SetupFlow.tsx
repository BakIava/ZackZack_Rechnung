"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import "./Setup.css";
import { SetupIcon } from "./SetupIcon";

// ── Types ─────────────────────────────────────────────────────────────────────

type Lang = "de" | "tr" | "ar";
type Phase = "entry" | "upload" | "scanning" | "review" | "wizard" | "done";

interface SetupFlowProps {
  lang?: Lang;
  dir?: "ltr" | "rtl";
  onComplete?: () => void;
  onDashboard?: () => void;
}

// ── Translations ──────────────────────────────────────────────────────────────

const T = {
  de: {
    setup: "Einrichtung",
    setupSub: "Einmalig — danach startklar",
    stepWord: "Schritt",
    ofWord: "von",
    next: "Weiter",
    back: "Zurück",
    finish: "Einrichtung abschließen",
    skip: "Jetzt überspringen",
    skipB: "später in Einstellungen ergänzen",
    req: "Pflicht",
    opt: "Optional",
    progNames: ["Betrieb", "Steuerdaten", "Bankverbindung", "Logo"],
    s1_t: "Dein Betrieb",
    s1_s: "Diese Angaben stehen rechtlich auf jeder Rechnung.",
    firma: "Firmenname",
    rechtsform: "Rechtsform",
    rf: [["einzel", "Einzel­unternehmen"], ["gbr", "GbR"], ["gmbh", "GmbH"]] as [string, string][],
    strasse: "Straße",
    hausnr: "Nr.",
    plz: "PLZ",
    ort: "Ort",
    s2_t: "Steuerdaten",
    s2_s: "Damit das Finanzamt deine Rechnungen anerkennt.",
    steuernr: "Steuernummer",
    steuernrHint: "Format wie",
    ku_t: "Kleinunternehmer (§19 UStG)",
    ku_s: "Du weist keine Mehrwertsteuer aus — das ist für die meisten Handwerker richtig.",
    s3_t: "Bankverbindung",
    s3_s: "Empfohlen, aber du kannst sie später ergänzen.",
    iban: "IBAN",
    inhaber: "Kontoinhaber",
    bankNote: "Erscheint auf deinen Rechnungen, damit Kunden überweisen können.",
    s4_t: "Logo",
    s4_s: "Gibt deinen Rechnungen ein professionelles Aussehen.",
    uploadT: "Logo hinzufügen",
    uploadS: "Foto aufnehmen oder aus Galerie wählen",
    wayCam: "Foto aufnehmen",
    wayGallery: "Galerie",
    logoNote: "Auch ohne Logo kannst du sofort loslegen.",
    uploaded: "Hochgeladen",
    change: "Ändern",
    remove: "Entfernen",
    doneT: "Alles eingerichtet!",
    doneS: "Erstelle jetzt deine erste Rechnung — in nur 3 Schritten.",
    sumBetrieb: "Betrieb",
    sumSteuer: "Steuernummer",
    sumKu: "Umsatzsteuer",
    sumBank: "Bankverbindung",
    sumLogo: "Logo",
    kuShort: "Kleinunternehmer §19",
    logoDone: "Hochgeladen",
    firstInvoice: "Erste Rechnung erstellen",
    toDash: "Zum Dashboard",
    dKicker: "Willkommen bei ZACK ZACK",
    dTitle: "Richte deinen Betrieb ein",
    dSub: "Wir brauchen ein paar Stammdaten für deine Rechnungen. Das dauert keine 2 Minuten.",
    dHelp: "Hilfe",
    allGood: "Alles vollständig — startklar",
    entryGreet: "Willkommen, Mehmet!",
    entryTitle: "Wie möchtest du starten?",
    entrySub: "Hast du schon eine Rechnung? Lade sie hoch — wir füllen alles automatisch aus.",
    tileUploadT: "Alte Rechnung hochladen",
    tileFast: "Schnell",
    tileUploadS: "Foto, Galerie oder PDF — wir lesen Firmenname, Adresse, Steuernummer & IBAN aus.",
    tileManualT: "Manuell eingeben",
    tileManualS: "Schritt für Schritt selbst eintragen — dauert keine 2 Minuten.",
    privacyA: "Die hochgeladene Rechnung nutzen wir nur zur Datenerkennung —",
    privacyB: "sie wird nicht gespeichert.",
    upTitle: "Rechnung hochladen",
    upIntro: "Wir lesen Firmenname, Adresse, Steuernummer und IBAN automatisch aus.",
    upCam: "Foto aufnehmen",
    upCamS: "Rechnung mit der Kamera abfotografieren",
    upGal: "Aus Galerie wählen",
    upGalS: "Vorhandenes Foto vom Gerät",
    upPdf: "PDF hochladen",
    upPdfS: "Rechnung als PDF-Datei",
    scanT: "Rechnung wird gelesen …",
    scanS: "Wir erkennen deine Daten — das dauert nur einen Moment.",
    scanFile: "rechnung-2024-0188.pdf",
    revTitle: "Daten prüfen",
    revBannerT: "Wir haben deine Rechnung gelesen.",
    revBannerS: "Bitte kurz prüfen — du kannst jedes Feld noch ändern.",
    detected: "Erkannt",
    todo: "Bitte ergänzen",
    grpBetrieb: "Betrieb",
    grpSteuer: "Steuer",
    grpBank: "Bank",
    rfTodo: "Nicht auf der Rechnung gefunden — bitte auswählen.",
    revApply: "Übernehmen & weiter",
    upStep1: "Hochladen",
    upStep2: "Erkennen",
    upStep3: "Prüfen",
  },
  tr: {
    setup: "Kurulum",
    setupSub: "Bir kere — sonra hazır",
    stepWord: "Adım",
    ofWord: "/",
    next: "İleri",
    back: "Geri",
    finish: "Kurulumu tamamla",
    skip: "Şimdi atla",
    skipB: "sonra ayarlarda ekle",
    req: "Zorunlu",
    opt: "İsteğe bağlı",
    progNames: ["İşletme", "Vergi", "Banka", "Logo"],
    s1_t: "İşletmen",
    s1_s: "Bu bilgiler her faturada yasal olarak yer alır.",
    firma: "Firma adı",
    rechtsform: "Hukuki form",
    rf: [["einzel", "Şahıs"], ["gbr", "Ortaklık"], ["gmbh", "Ltd."]] as [string, string][],
    strasse: "Sokak",
    hausnr: "No.",
    plz: "Posta kodu",
    ort: "Şehir",
    s2_t: "Vergi bilgileri",
    s2_s: "Vergi dairesinin faturalarını kabul etmesi için.",
    steuernr: "Vergi numarası",
    steuernrHint: "Format:",
    ku_t: "Küçük işletme (§19 UStG)",
    ku_s: "KDV beyan etmiyorsunuz — bu çoğu zanaatkâr için doğrudur.",
    s3_t: "Banka bilgileri",
    s3_s: "Tavsiye edilir, sonra da ekleyebilirsin.",
    iban: "IBAN",
    inhaber: "Hesap sahibi",
    bankNote: "Müşterilerin havale yapabilmesi için faturalarda görünür.",
    s4_t: "Logo",
    s4_s: "Faturalarına profesyonel bir görünüm katar.",
    uploadT: "Logo ekle",
    uploadS: "Fotoğraf çek veya galeriden seç",
    wayCam: "Fotoğraf çek",
    wayGallery: "Galeri",
    logoNote: "Logo olmadan da hemen başlayabilirsin.",
    uploaded: "Yüklendi",
    change: "Değiştir",
    remove: "Kaldır",
    doneT: "Her şey hazır!",
    doneS: "Şimdi ilk faturanı oluştur — sadece 3 adımda.",
    sumBetrieb: "İşletme",
    sumSteuer: "Vergi numarası",
    sumKu: "KDV",
    sumBank: "Banka",
    sumLogo: "Logo",
    kuShort: "Küçük işletme §19",
    logoDone: "Yüklendi",
    firstInvoice: "İlk faturayı oluştur",
    toDash: "Panele git",
    dKicker: "ZACK ZACK'e hoş geldin",
    dTitle: "İşletmeni kur",
    dSub: "Faturalar için birkaç temel veriye ihtiyacımız var. 2 dakikadan fazla sürmez.",
    dHelp: "Yardım",
    allGood: "Her şey tamam — hazır",
    entryGreet: "Hoş geldin, Mehmet!",
    entryTitle: "Nasıl başlamak istersin?",
    entrySub: "Eski bir faturan var mı? Yükle — her şeyi otomatik dolduralım.",
    tileUploadT: "Eski fatura yükle",
    tileFast: "Hızlı",
    tileUploadS: "Fotoğraf, galeri veya PDF — firma adı, adres, vergi no & IBAN okuruz.",
    tileManualT: "Manuel gir",
    tileManualS: "Adım adım kendin gir — 2 dakika sürmez.",
    privacyA: "Yüklenen faturayı yalnızca veri tanıma için kullanıyoruz —",
    privacyB: "kaydedilmez.",
    upTitle: "Fatura yükle",
    upIntro: "Firma adı, adres, vergi numarası ve IBAN'ı otomatik okuruz.",
    upCam: "Fotoğraf çek",
    upCamS: "Faturayı kamerayla fotoğrafla",
    upGal: "Galeriden seç",
    upGalS: "Cihazdaki mevcut fotoğraf",
    upPdf: "PDF yükle",
    upPdfS: "Fatura PDF dosyası olarak",
    scanT: "Fatura okunuyor …",
    scanS: "Verilerinizi tanıyoruz — bu sadece bir an sürer.",
    scanFile: "fatura-2024-0188.pdf",
    revTitle: "Verileri kontrol et",
    revBannerT: "Faturanı okuduk.",
    revBannerS: "Lütfen kontrol et — her alanı hâlâ değiştirebilirsin.",
    detected: "Tespit edildi",
    todo: "Lütfen ekle",
    grpBetrieb: "İşletme",
    grpSteuer: "Vergi",
    grpBank: "Banka",
    rfTodo: "Faturada bulunamadı — lütfen seçin.",
    revApply: "Al & devam et",
    upStep1: "Yükle",
    upStep2: "Tanı",
    upStep3: "Kontrol",
  },
  ar: {
    setup: "إعداد الشركة",
    setupSub: "مرة واحدة — ثم تكون جاهزاً",
    stepWord: "الخطوة",
    ofWord: "من",
    next: "التالي",
    back: "رجوع",
    finish: "إتمام الإعداد",
    skip: "تخطي الآن",
    skipB: "أضفها لاحقاً في الإعدادات",
    req: "إلزامي",
    opt: "اختياري",
    progNames: ["الشركة", "البيانات الضريبية", "الحساب البنكي", "الشعار"],
    s1_t: "بيانات الشركة",
    s1_s: "تظهر هذه البيانات على كل فاتورة بشكل قانوني.",
    firma: "اسم الشركة",
    rechtsform: "الشكل القانوني",
    rf: [["einzel", "مؤسسة فردية"], ["gbr", "شركة أشخاص"], ["gmbh", "ش.ذ.م.م"]] as [string, string][],
    strasse: "الشارع",
    hausnr: "رقم",
    plz: "الرمز البريدي",
    ort: "المدينة",
    s2_t: "البيانات الضريبية",
    s2_s: "لكي تعترف مصلحة الضرائب بفواتيرك.",
    steuernr: "الرقم الضريبي",
    steuernrHint: "التنسيق:",
    ku_t: "شركة صغيرة (§19 UStG)",
    ku_s: "لا تُظهر ضريبة القيمة المضافة — وهذا صحيح لمعظم الحرفيين.",
    s3_t: "الحساب البنكي",
    s3_s: "موصى به، لكن يمكنك إضافته لاحقاً.",
    iban: "IBAN",
    inhaber: "صاحب الحساب",
    bankNote: "يظهر على فواتيرك حتى يتمكن العملاء من التحويل.",
    s4_t: "الشعار",
    s4_s: "يمنح فواتيرك مظهراً احترافياً.",
    uploadT: "إضافة شعار",
    uploadS: "التقط صورة أو اختر من المعرض",
    wayCam: "التقط صورة",
    wayGallery: "المعرض",
    logoNote: "يمكنك البدء فوراً حتى بدون شعار.",
    uploaded: "تم الرفع",
    change: "تغيير",
    remove: "إزالة",
    doneT: "كل شيء جاهز!",
    doneS: "أنشئ أول فاتورة لك الآن — في 3 خطوات فقط.",
    sumBetrieb: "الشركة",
    sumSteuer: "الرقم الضريبي",
    sumKu: "ضريبة القيمة المضافة",
    sumBank: "الحساب البنكي",
    sumLogo: "الشعار",
    kuShort: "شركة صغيرة §19",
    logoDone: "تم الرفع",
    firstInvoice: "إنشاء أول فاتورة",
    toDash: "إلى لوحة التحكم",
    dKicker: "مرحباً بك في ZACK ZACK",
    dTitle: "إعداد شركتك",
    dSub: "نحتاج بعض البيانات الأساسية لفواتيرك. لن يستغرق ذلك أكثر من دقيقتين.",
    dHelp: "مساعدة",
    allGood: "كل شيء مكتمل — جاهز للانطلاق",
    entryGreet: "أهلاً، Mehmet!",
    entryTitle: "كيف تريد البدء؟",
    entrySub: "هل لديك فاتورة قديمة؟ ارفعها — سنملأ كل شيء تلقائياً.",
    tileUploadT: "رفع فاتورة قديمة",
    tileFast: "سريع",
    tileUploadS: "صورة أو PDF — نستخرج اسم الشركة والعنوان والرقم الضريبي وIBAN.",
    tileManualT: "إدخال يدوي",
    tileManualS: "أدخل البيانات خطوة بخطوة — لن يستغرق أكثر من دقيقتين.",
    privacyA: "نستخدم الفاتورة المرفوعة فقط لاستخراج البيانات —",
    privacyB: "ولا يتم حفظها.",
    upTitle: "رفع فاتورة",
    upIntro: "نستخرج اسم الشركة والعنوان والرقم الضريبي وIBAN تلقائياً.",
    upCam: "التقط صورة",
    upCamS: "صوّر الفاتورة بالكاميرا",
    upGal: "اختر من المعرض",
    upGalS: "صورة موجودة على الجهاز",
    upPdf: "رفع PDF",
    upPdfS: "الفاتورة كملف PDF",
    scanT: "جارٍ قراءة الفاتورة …",
    scanS: "نتعرف على بياناتك — سيستغرق ذلك لحظة فقط.",
    scanFile: "فاتورة-2024-0188.pdf",
    revTitle: "مراجعة البيانات",
    revBannerT: "قرأنا فاتورتك.",
    revBannerS: "يرجى المراجعة — لا يزال بإمكانك تعديل أي حقل.",
    detected: "تم التعرف",
    todo: "يرجى الإضافة",
    grpBetrieb: "الشركة",
    grpSteuer: "الضريبة",
    grpBank: "البنك",
    rfTodo: "لم يُعثر عليه في الفاتورة — يرجى الاختيار.",
    revApply: "قبول ومتابعة",
    upStep1: "رفع",
    upStep2: "تعرف",
    upStep3: "مراجعة",
  },
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  req?: boolean;
  badge?: ReactNode;
  hint?: ReactNode;
  error?: string;
  todo?: string;
  children: ReactNode;
}

function Field({ label, req, badge, hint, error, todo, children }: FieldProps) {
  return (
    <div className="ob-field">
      <label className="ob-field-lbl">
        {label}
        {req && <span className="req">*</span>}
        {badge}
      </label>
      {children}
      {error ? (
        <div className="ob-err"><SetupIcon name="alert" size={14} />{error}</div>
      ) : todo ? (
        <div className="ob-hint ob-hint--todo"><SetupIcon name="alert" size={13} />{todo}</div>
      ) : hint ? (
        <div className="ob-hint">{hint}</div>
      ) : null}
    </div>
  );
}

interface TextInputProps {
  value?: string;
  placeholder?: string;
  valid?: boolean;
  error?: boolean;
  mono?: boolean;
  dir?: "ltr" | "rtl";
}

function TextInput({ value, placeholder, valid, error, mono, dir }: TextInputProps) {
  const cls = "ob-inp-wrap" + (valid ? " is-valid" : error ? " is-error" : "");
  return (
    <div className={cls}>
      <input
        className={"ob-inp" + (mono ? " ob-inp--mono" : "")}
        defaultValue={value}
        placeholder={placeholder}
        dir={dir}
      />
      {valid && (
        <span className="ob-inp-aff ob-inp-aff--ok">
          <SetupIcon name="check" size={14} weight="bold" />
        </span>
      )}
      {error && (
        <span className="ob-inp-aff ob-inp-aff--err">
          <SetupIcon name="x" size={13} />
        </span>
      )}
    </div>
  );
}

function Seg3({ options, value }: { options: [string, string][]; value: string | null }) {
  const [sel, setSel] = useState<string | null>(value);
  return (
    <div className="ob-seg3">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          data-active={sel === id ? "true" : "false"}
          onClick={() => setSel(id)}
          dangerouslySetInnerHTML={{ __html: label }}
        />
      ))}
    </div>
  );
}

function Toggle19({ t }: { t: typeof T.de }) {
  const [on, setOn] = useState(true);
  return (
    <button
      type="button"
      className="ob-toggle"
      data-active={on ? "true" : "false"}
      onClick={() => setOn(!on)}
    >
      <div className="ob-toggle-ic">
        <SetupIcon name="shieldCheck" size={22} />
      </div>
      <div className="ob-toggle-tx">
        <div className="ob-toggle-t">{t.ku_t}</div>
        <div className="ob-toggle-s">{t.ku_s}</div>
      </div>
      <div className="ob-sw"><i /></div>
    </button>
  );
}

function Step1Fields({ t }: { t: typeof T.de }) {
  return (
    <div className="ob-form">
      <Field label={t.firma} req><TextInput value="Yılmaz Malerbetrieb" valid /></Field>
      <Field label={t.rechtsform} req><Seg3 options={t.rf} value="einzel" /></Field>
      <div className="ob-row2">
        <div className="ob-grow"><Field label={t.strasse} req><TextInput value="Hansastraße" /></Field></div>
        <div className="ob-hnr"><Field label={t.hausnr} req><TextInput value="22" /></Field></div>
      </div>
      <div className="ob-row2">
        <div className="ob-plz"><Field label={t.plz} req><TextInput value="60314" /></Field></div>
        <div className="ob-grow"><Field label={t.ort} req><TextInput value="Frankfurt am Main" /></Field></div>
      </div>
    </div>
  );
}

function Step2Fields({ t }: { t: typeof T.de }) {
  return (
    <div className="ob-form">
      <Field
        label={t.steuernr}
        req
        hint={<><span>{t.steuernrHint}</span><span className="mono">123/456/78901</span></>}
      >
        <TextInput value="047/815/08150" valid mono />
      </Field>
      <Toggle19 t={t} />
    </div>
  );
}

function Step3Fields({ t }: { t: typeof T.de }) {
  return (
    <div className="ob-form">
      <Field label={t.iban} valid>
        <TextInput value="DE89 3704 0044 0532 0130 00" valid mono dir="ltr" />
      </Field>
      <Field label={t.inhaber}>
        <TextInput value="Mehmet Yılmaz" />
      </Field>
      <div className="ob-note">
        <div className="ob-note-ic"><SetupIcon name="info" size={18} /></div>
        <div className="ob-note-tx">{t.bankNote}</div>
      </div>
    </div>
  );
}

function LogoEmpty({ t }: { t: typeof T.de }) {
  return (
    <div className="ob-form">
      <button type="button" className="ob-upload">
        <div className="ob-upload-ic"><SetupIcon name="image" size={26} /></div>
        <div className="ob-upload-t">{t.uploadT}</div>
        <div className="ob-upload-s">{t.uploadS}</div>
        <div className="ob-upload-ways">
          <span className="ob-upload-way"><SetupIcon name="camera" size={17} />{t.wayCam}</span>
          <span className="ob-upload-way"><SetupIcon name="image" size={17} />{t.wayGallery}</span>
        </div>
      </button>
      <div className="ob-note">
        <div className="ob-note-ic"><SetupIcon name="info" size={18} /></div>
        <div className="ob-note-tx">{t.logoNote}</div>
      </div>
    </div>
  );
}

function LogoPreview({ t }: { t: typeof T.de }) {
  return (
    <div className="ob-form">
      <div className="ob-logo-pre">
        <div className="ob-logo-thumb">
          <Image src="/assets/zackzack-mark.png" alt="Logo" width={72} height={72} />
        </div>
        <div className="ob-logo-meta">
          <div className="ob-logo-name">logo-yilmaz.png</div>
          <div className="ob-logo-sub">
            <SetupIcon name="check" size={13} weight="bold" />{t.uploaded}
          </div>
        </div>
        <div className="ob-logo-actions">
          <button type="button" className="ob-logo-btn" title={t.change}>
            <SetupIcon name="pencil" size={16} />
          </button>
          <button type="button" className="ob-logo-btn del" title={t.remove}>
            <SetupIcon name="trash" size={16} />
          </button>
        </div>
      </div>
      <div className="ob-note">
        <div className="ob-note-ic"><SetupIcon name="info" size={18} /></div>
        <div className="ob-note-tx">{t.logoNote}</div>
      </div>
    </div>
  );
}

function ScanDoc() {
  return (
    <div className="ob-scan-doc">
      <div className="sd-logo" />
      <div className="sd-line" style={{ top: 38, width: "64%" }} />
      <div className="sd-line w" style={{ top: 52, width: "40%" }} />
      <div className="sd-line" style={{ top: 80, width: "82%" }} />
      <div className="sd-line" style={{ top: 94, width: "70%" }} />
      <div className="sd-line" style={{ top: 124, width: "52%" }} />
      <div className="sd-line w" style={{ top: 152, width: "60%" }} />
      <div className="ob-scan-beam" />
    </div>
  );
}

function Privacy({ t, flow }: { t: typeof T.de; flow?: boolean }) {
  return (
    <div className={"ob-privacy" + (flow ? " ob-privacy--flow" : "")}>
      <div className="ob-privacy-ic"><SetupIcon name="lock" size={17} /></div>
      <div className="ob-privacy-tx">
        {t.privacyA} <b>{t.privacyB}</b>
      </div>
    </div>
  );
}

function EntryTiles({
  t,
  row,
  onUpload,
  onManual,
}: {
  t: typeof T.de;
  row?: boolean;
  onUpload?: () => void;
  onManual?: () => void;
}) {
  return (
    <div className={"ob-entry-tiles" + (row ? " ob-entry-tiles--row" : "")}>
      <button type="button" className="ob-entry-tile ob-entry-tile--up" onClick={onUpload}>
        <div className="ob-entry-tile-ic"><SetupIcon name="scan" size={28} /></div>
        <div className="ob-entry-tile-tx">
          <div className="ob-entry-tile-t">
            {t.tileUploadT}
            <span className="ob-tile-fast">{t.tileFast}</span>
          </div>
          <div className="ob-entry-tile-s">{t.tileUploadS}</div>
        </div>
        <div className="ob-entry-tile-aff"><SetupIcon name="chevronRight" size={20} /></div>
      </button>
      <button type="button" className="ob-entry-tile ob-entry-tile--man" onClick={onManual}>
        <div className="ob-entry-tile-ic"><SetupIcon name="pencil" size={26} /></div>
        <div className="ob-entry-tile-tx">
          <div className="ob-entry-tile-t">{t.tileManualT}</div>
          <div className="ob-entry-tile-s">{t.tileManualS}</div>
        </div>
        <div className="ob-entry-tile-aff"><SetupIcon name="chevronRight" size={20} /></div>
      </button>
    </div>
  );
}

function UploadOpts({
  t,
  onChoose,
}: {
  t: typeof T.de;
  onChoose?: () => void;
}) {
  const opts = [
    ["camera", t.upCam, t.upCamS],
    ["image", t.upGal, t.upGalS],
    ["file", t.upPdf, t.upPdfS],
  ] as const;
  return (
    <div className="ob-up-opts">
      {opts.map(([ic, title, sub]) => (
        <button type="button" className="ob-up-opt" key={ic} onClick={onChoose}>
          <div className="ob-up-opt-ic"><SetupIcon name={ic} size={22} /></div>
          <div className="ob-up-opt-tx">
            <div className="ob-up-opt-t">{title}</div>
            <div className="ob-up-opt-s">{sub}</div>
          </div>
          <div className="ob-up-opt-aff"><SetupIcon name="chevronRight" size={20} /></div>
        </button>
      ))}
    </div>
  );
}

function ReviewFields({ t }: { t: typeof T.de }) {
  const Detected = () => (
    <span className="ob-detected">
      <SetupIcon name="check" size={11} weight="bold" />{t.detected}
    </span>
  );
  const TodoBadge = () => (
    <span className="ob-detected ob-detected--todo">{t.todo}</span>
  );

  return (
    <div className="ob-form">
      <div className="ob-group-lbl">{t.grpBetrieb}</div>
      <Field label={t.firma} req badge={<Detected />}>
        <TextInput value="Yılmaz Malerbetrieb" valid />
      </Field>
      <Field label={t.rechtsform} req badge={<TodoBadge />} todo={t.rfTodo}>
        <Seg3 options={t.rf} value={null} />
      </Field>
      <div className="ob-row2">
        <div className="ob-grow">
          <Field label={t.strasse} req badge={<Detected />}>
            <TextInput value="Hansastraße" valid />
          </Field>
        </div>
        <div className="ob-hnr">
          <Field label={t.hausnr} req>
            <TextInput value="22" valid />
          </Field>
        </div>
      </div>
      <div className="ob-row2">
        <div className="ob-plz">
          <Field label={t.plz} req>
            <TextInput value="60314" valid />
          </Field>
        </div>
        <div className="ob-grow">
          <Field label={t.ort} req badge={<Detected />}>
            <TextInput value="Frankfurt am Main" valid />
          </Field>
        </div>
      </div>
      <div className="ob-group-lbl">{t.grpSteuer}</div>
      <Field label={t.steuernr} req badge={<Detected />}>
        <TextInput value="047/815/08150" valid mono />
      </Field>
      <div className="ob-group-lbl">{t.grpBank}</div>
      <Field label={t.iban} badge={<Detected />}>
        <TextInput value="DE89 3704 0044 0532 0130 00" valid mono dir="ltr" />
      </Field>
    </div>
  );
}

// ── Desktop ──────────────────────────────────────────────────────────────────

function DesktopBar({ t }: { t: typeof T.de }) {
  return (
    <div className="ob-d-bar">
      <div className="ob-d-brand">
        <Image src="/assets/zackzack-logo.png" alt="ZACK ZACK RECHNUNG" width={120} height={26} style={{ height: 26, width: "auto" }} />
      </div>
      <div className="ob-d-help"><SetupIcon name="info" size={17} />{t.dHelp}</div>
    </div>
  );
}

function UpProgress({ t, upIndex }: { t: typeof T.de; upIndex: number }) {
  const names = [t.upStep1, t.upStep2, t.upStep3];
  return (
    <div className="ob-d-steps">
      {names.map((nm, i) => {
        const n = i + 1;
        const isDone = n < upIndex;
        const state = isDone ? "done" : n === upIndex ? "now" : "off";
        return (
          <span key={i} style={{ display: "contents" }}>
            <div className="ob-d-step" data-state={state}>
              <div className="ob-d-step-dot">
                {isDone ? <SetupIcon name="check" size={15} weight="bold" /> : n}
              </div>
              <div className="ob-d-step-lbl">{nm}</div>
            </div>
            {i < 2 && <div className="ob-d-step-line" data-state={isDone ? "done" : "off"} />}
          </span>
        );
      })}
    </div>
  );
}

// ── Main Flow ─────────────────────────────────────────────────────────────────

export function SetupFlow({ lang = "de", dir = "ltr", onComplete, onDashboard }: SetupFlowProps) {
  const t = T[lang];
  const TOTAL = 4;
  const [phase, setPhase] = useState<Phase>("entry");
  const [step, setStep] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Auto-advance scanning
  useEffect(() => {
    if (phase !== "scanning") return;
    const id = setTimeout(() => setPhase("review"), 2400);
    return () => clearTimeout(id);
  }, [phase]);

  const goManual = () => { setStep(1); setPhase("wizard"); };
  const goComplete = onComplete ?? (() => {});
  const goDash = onDashboard ?? (() => {});

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    if (phase === "entry") {
      return (
        <div className="ob-root" dir={dir}>
          <div className="ob-top">
            <button className="ob-back" disabled>
              <SetupIcon name="chevronLeft" size={20} />
            </button>
            <div className="ob-top-mid">
              <div className="ob-top-brand">
                <Image src="/assets/zackzack-mark.png" alt="" width={18} height={18} style={{ height: 18, width: "auto" }} />
                {t.setup}
              </div>
              <div className="ob-top-sub">{t.setupSub}</div>
            </div>
            <div className="ob-top-spacer" />
          </div>
          <div className="ob-entry">
            <div className="ob-entry-head">
              <div className="ob-entry-greet">{t.entryGreet}</div>
              <div className="ob-entry-title">{t.entryTitle}</div>
              <div className="ob-entry-sub">{t.entrySub}</div>
            </div>
            <EntryTiles t={t} onUpload={() => setPhase("upload")} onManual={goManual} />
            <Privacy t={t} />
          </div>
        </div>
      );
    }

    if (phase === "upload") {
      return (
        <div className="ob-root" dir={dir}>
          <div className="ob-top">
            <button className="ob-back" onClick={() => setPhase("entry")}>
              <SetupIcon name="chevronLeft" size={20} />
            </button>
            <div className="ob-top-mid">
              <div className="ob-top-brand">
                <Image src="/assets/zackzack-mark.png" alt="" width={18} height={18} style={{ height: 18, width: "auto" }} />
                {t.setup}
              </div>
              <div className="ob-top-sub">{t.setupSub}</div>
            </div>
            <div className="ob-top-spacer" />
          </div>
          <div className="ob-body">
            <div className="ob-intro">
              <div className="ob-intro-ic"><SetupIcon name="scan" size={26} /></div>
              <div className="ob-intro-tx">
                <div className="ob-intro-t">{t.upTitle}</div>
                <div className="ob-intro-s">{t.upIntro}</div>
              </div>
            </div>
            <UploadOpts t={t} onChoose={() => setPhase("scanning")} />
            <Privacy t={t} flow />
          </div>
        </div>
      );
    }

    if (phase === "scanning") {
      return (
        <div className="ob-root" dir={dir}>
          <div className="ob-top">
            <button className="ob-back" disabled>
              <SetupIcon name="chevronLeft" size={20} />
            </button>
            <div className="ob-top-mid">
              <div className="ob-top-brand">
                <Image src="/assets/zackzack-mark.png" alt="" width={18} height={18} style={{ height: 18, width: "auto" }} />
                {t.setup}
              </div>
              <div className="ob-top-sub">{t.setupSub}</div>
            </div>
            <div className="ob-top-spacer" />
          </div>
          <div className="ob-scan">
            <ScanDoc />
            <div className="ob-scan-t">{t.scanT}</div>
            <div className="ob-scan-s">{t.scanS}</div>
            <div className="ob-scan-file"><SetupIcon name="file" size={15} />{t.scanFile}</div>
            <div className="ob-scan-dots"><i /><i /><i /></div>
          </div>
        </div>
      );
    }

    if (phase === "review") {
      return (
        <div className="ob-root" dir={dir}>
          <div className="ob-top">
            <button className="ob-back" onClick={() => setPhase("upload")}>
              <SetupIcon name="chevronLeft" size={20} />
            </button>
            <div className="ob-top-mid">
              <div className="ob-top-brand">
                <Image src="/assets/zackzack-mark.png" alt="" width={18} height={18} style={{ height: 18, width: "auto" }} />
                {t.revTitle}
              </div>
              <div className="ob-top-sub">{t.setupSub}</div>
            </div>
            <div className="ob-top-spacer" />
          </div>
          <div className="ob-body">
            <div className="ob-review-banner">
              <div className="ob-review-banner-ic"><SetupIcon name="sparkle" size={20} /></div>
              <div>
                <div className="ob-review-banner-t">{t.revBannerT}</div>
                <div className="ob-review-banner-s">{t.revBannerS}</div>
              </div>
            </div>
            <ReviewFields t={t} />
          </div>
          <div className="ob-foot">
            <button className="ob-next" onClick={() => setPhase("done")}>
              <SetupIcon name="check" size={20} weight="bold" />{t.revApply}
            </button>
          </div>
        </div>
      );
    }

    if (phase === "done") {
      const sumRows = [
        { ic: "building", lbl: t.sumBetrieb, val: "Yılmaz Malerbetrieb" },
        { ic: "idcard", lbl: t.sumSteuer, val: "047/815/08150" },
        { ic: "shieldCheck", lbl: t.sumKu, val: t.kuShort },
        { ic: "bank", lbl: t.sumBank, val: "DE89 3704 … 0130 00" },
        { ic: "brush", lbl: t.sumLogo, val: t.logoDone },
      ];
      return (
        <div className="ob-root" dir={dir}>
          <div className="ob-done">
            <div className="ob-done-check">
              <SetupIcon name="check" size={46} weight="bold" />
            </div>
            <div className="ob-done-t">{t.doneT}</div>
            <div className="ob-done-s">{t.doneS}</div>
            <div className="ob-summary">
              {sumRows.map((r, i) => (
                <div className="ob-sum-row" key={i}>
                  <div className="ob-sum-ic"><SetupIcon name={r.ic} size={19} /></div>
                  <div className="ob-sum-tx">
                    <div className="ob-sum-lbl">{r.lbl}</div>
                    <div className="ob-sum-val">{r.val}</div>
                  </div>
                  <div className="ob-sum-check">
                    <SetupIcon name="check" size={14} weight="bold" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="ob-done-foot">
            <button className="ob-next ob-next--gold" onClick={goComplete}>
              <SetupIcon name="plus" size={20} weight="bold" />{t.firstInvoice}
            </button>
            <button className="ob-skip" onClick={goDash}><b>{t.toDash}</b></button>
          </div>
        </div>
      );
    }

    // Mobile wizard step
    const optional = step === 3 || step === 4;
    const stepMeta: Record<number, { ic: string; key: "s1" | "s2" | "s3" | "s4" }> = {
      1: { ic: "building", key: "s1" },
      2: { ic: "idcard", key: "s2" },
      3: { ic: "bank", key: "s3" },
      4: { ic: "brush", key: "s4" },
    };
    const meta = stepMeta[step];
    const titleKey = `${meta.key}_t` as "s1_t" | "s2_t" | "s3_t" | "s4_t";
    const subKey = `${meta.key}_s` as "s1_s" | "s2_s" | "s3_s" | "s4_s";

    const StepBodyMobile = () => {
      if (step === 1) return <Step1Fields t={t} />;
      if (step === 2) return <Step2Fields t={t} />;
      if (step === 3) return <Step3Fields t={t} />;
      return <LogoEmpty t={t} />;
    };

    return (
      <div className="ob-root" dir={dir}>
        <div className="ob-top">
          <button
            className="ob-back"
            disabled={step === 1 && phase === "wizard"}
            onClick={() => (step === 1 ? setPhase("entry") : setStep(step - 1))}
          >
            <SetupIcon name="chevronLeft" size={20} />
          </button>
          <div className="ob-top-mid">
            <div className="ob-top-brand">
              <Image src="/assets/zackzack-mark.png" alt="" width={18} height={18} style={{ height: 18, width: "auto" }} />
              {t.setup}
            </div>
            <div className="ob-top-sub">{t.setupSub}</div>
          </div>
          <div className="ob-top-spacer" />
        </div>

        <div className="ob-prog">
          <div className="ob-prog-head">
            <div className="ob-prog-step">
              {t.stepWord} <b>{step}</b> {t.ofWord} {TOTAL}
            </div>
            <div className="ob-prog-name">{t.progNames[step - 1]}</div>
          </div>
          <div className="ob-prog-bar">
            {Array.from({ length: TOTAL }).map((_, i) => {
              const state = i + 1 < step ? "done" : i + 1 === step ? "now" : "off";
              return (
                <span key={i} className="ob-prog-seg" data-state={state}>
                  <i />
                </span>
              );
            })}
          </div>
        </div>

        <div className="ob-body">
          <div className="ob-intro">
            <div className="ob-intro-ic"><SetupIcon name={meta.ic} size={26} /></div>
            <div className="ob-intro-tx">
              <div className="ob-intro-t">
                {t[titleKey]}
                <span className={"ob-badge " + (optional ? "ob-badge--opt" : "ob-badge--req")}>
                  {optional ? t.opt : t.req}
                </span>
              </div>
              <div className="ob-intro-s">{t[subKey]}</div>
            </div>
          </div>
          <StepBodyMobile />
        </div>

        <div className="ob-foot">
          <button
            className="ob-next"
            onClick={() => (step === TOTAL ? setPhase("done") : setStep(step + 1))}
          >
            {t.next}<SetupIcon name="arrowRight" size={20} weight="bold" />
          </button>
          {optional && (
            <button className="ob-skip" onClick={() => (step === TOTAL ? setPhase("done") : setStep(step + 1))}>
              {t.skip} — <b>{t.skipB}</b>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── DESKTOP ─────────────────────────────────────────────────────────────────

  if (phase === "entry") {
    return (
      <div className="ob-d" dir={dir}>
        <DesktopBar t={t} />
        <div className="ob-d-scroll" style={{ display: "flex", flexDirection: "column" }}>
          <div className="ob-entry-d">
            <div className="ob-d-head">
              <div className="ob-d-kicker">{t.entryGreet}</div>
              <div className="ob-d-title">{t.entryTitle}</div>
              <div className="ob-d-sub">{t.entrySub}</div>
            </div>
            <EntryTiles t={t} row onUpload={() => setPhase("upload")} onManual={goManual} />
            <Privacy t={t} flow />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "upload") {
    return (
      <div className="ob-d" dir={dir}>
        <DesktopBar t={t} />
        <div className="ob-d-scroll">
          <div className="ob-d-wrap">
            <div className="ob-d-head">
              <div className="ob-d-kicker">{t.tileUploadT}</div>
              <div className="ob-d-title">{t.upTitle}</div>
              <div className="ob-d-sub">{t.upIntro}</div>
            </div>
            <UpProgress t={t} upIndex={1} />
            <div className="ob-d-card">
              <UploadOpts t={t} onChoose={() => setPhase("scanning")} />
              <Privacy t={t} flow />
            </div>
            <div className="ob-d-wfoot">
              <button className="ob-d-back" onClick={() => setPhase("entry")}>
                <SetupIcon name="chevronLeft" size={19} />{t.back}
              </button>
              <div className="ob-d-wfoot-r">
                <button className="ob-d-skip" onClick={goManual}>{t.tileManualT}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "scanning") {
    return (
      <div className="ob-d" dir={dir}>
        <DesktopBar t={t} />
        <div className="ob-d-scroll">
          <div className="ob-d-wrap">
            <div className="ob-d-head">
              <div className="ob-d-kicker">{t.tileUploadT}</div>
              <div className="ob-d-title">{t.scanT}</div>
            </div>
            <UpProgress t={t} upIndex={2} />
            <div className="ob-d-card">
              <div className="ob-scan" style={{ padding: "26px 20px 30px" }}>
                <ScanDoc />
                <div className="ob-scan-s">{t.scanS}</div>
                <div className="ob-scan-file"><SetupIcon name="file" size={15} />{t.scanFile}</div>
                <div className="ob-scan-dots"><i /><i /><i /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "review") {
    return (
      <div className="ob-d" dir={dir}>
        <DesktopBar t={t} />
        <div className="ob-d-scroll">
          <div className="ob-d-wrap">
            <div className="ob-d-head">
              <div className="ob-d-kicker">{t.tileUploadT}</div>
              <div className="ob-d-title">{t.revTitle}</div>
            </div>
            <UpProgress t={t} upIndex={3} />
            <div className="ob-d-card">
              <div className="ob-review-banner">
                <div className="ob-review-banner-ic"><SetupIcon name="sparkle" size={20} /></div>
                <div>
                  <div className="ob-review-banner-t">{t.revBannerT}</div>
                  <div className="ob-review-banner-s">{t.revBannerS}</div>
                </div>
              </div>
              <ReviewFields t={t} />
            </div>
            <div className="ob-d-wfoot">
              <button className="ob-d-back" onClick={() => setPhase("upload")}>
                <SetupIcon name="chevronLeft" size={19} />{t.back}
              </button>
              <div className="ob-d-wfoot-r">
                <button className="ob-d-btn" onClick={() => setPhase("done")}>
                  <SetupIcon name="check" size={19} weight="bold" />{t.revApply}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const sumRows = [
      { lbl: t.sumBetrieb, val: "Yılmaz Malerbetrieb" },
      { lbl: t.sumSteuer, val: "047/815/08150" },
      { lbl: t.sumKu, val: t.kuShort },
      { lbl: t.sumBank, val: "DE89 3704 … 0130 00" },
      { lbl: t.sumLogo, val: t.logoDone },
    ];
    return (
      <div className="ob-d" dir={dir}>
        <DesktopBar t={t} />
        <div className="ob-d-scroll">
          <div className="ob-d-wrap">
            <div className="ob-d-done">
              <div className="ob-d-done-check">
                <SetupIcon name="check" size={44} weight="bold" />
              </div>
              <div className="ob-d-done-t">{t.doneT}</div>
              <div className="ob-d-done-s">{t.doneS}</div>
              <div className="ob-d-done-sum">
                {sumRows.map((r, i) => (
                  <div className="ob-sum-row" key={i}>
                    <div className="ob-sum-ic">
                      <SetupIcon name="check" size={17} weight="bold" />
                    </div>
                    <div className="ob-sum-tx">
                      <div className="ob-sum-lbl">{r.lbl}</div>
                      <div className="ob-sum-val">{r.val}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="ob-d-done-cta">
                <button className="ob-d-btn ob-d-btn--accent" onClick={goComplete}>
                  <SetupIcon name="plus" size={19} weight="bold" />{t.firstInvoice}
                </button>
                <button className="ob-d-back" onClick={goDash}>{t.toDash}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop wizard (step-by-step)
  const optional = step === 3 || step === 4;
  const sections: Record<number, { key: "s1" | "s2" | "s3" | "s4"; req: boolean }> = {
    1: { key: "s1", req: true },
    2: { key: "s2", req: true },
    3: { key: "s3", req: false },
    4: { key: "s4", req: false },
  };
  const cur = sections[step];
  const titleKey = `${cur.key}_t` as "s1_t" | "s2_t" | "s3_t" | "s4_t";
  const subKey = `${cur.key}_s` as "s1_s" | "s2_s" | "s3_s" | "s4_s";

  const StepBodyDesktop = () => {
    if (step === 1) return <Step1Fields t={t} />;
    if (step === 2) return <Step2Fields t={t} />;
    if (step === 3) return <Step3Fields t={t} />;
    return <LogoPreview t={t} />;
  };

  return (
    <div className="ob-d" dir={dir}>
      <DesktopBar t={t} />
      <div className="ob-d-scroll">
        <div className="ob-d-wrap">
          <div className="ob-d-head">
            <div className="ob-d-kicker">{t.dKicker}</div>
            <div className="ob-d-title">{t.dTitle}</div>
            <div className="ob-d-sub">{t.dSub}</div>
          </div>

          <div className="ob-d-steps">
            {t.progNames.map((nm, i) => {
              const n = i + 1;
              const isDone = n < step;
              const state = isDone ? "done" : n === step ? "now" : "off";
              return (
                <span key={i} style={{ display: "contents" }}>
                  <div
                    className={"ob-d-step" + (isDone ? " is-done" : "")}
                    data-state={state}
                    onClick={() => { if (isDone) setStep(n); }}
                  >
                    <div className="ob-d-step-dot">
                      {isDone ? <SetupIcon name="check" size={15} weight="bold" /> : n}
                    </div>
                    <div className="ob-d-step-lbl">{nm}</div>
                  </div>
                  {i < 3 && <div className="ob-d-step-line" data-state={isDone ? "done" : "off"} />}
                </span>
              );
            })}
          </div>

          <div className="ob-d-card">
            <div className="ob-d-sechead">
              <div className="ob-d-secnum">{step}</div>
              <div className="ob-d-sectx">
                <div className="ob-d-sect">
                  {t[titleKey]}
                  <span className={"ob-badge " + (cur.req ? "ob-badge--req" : "ob-badge--opt")}>
                    {cur.req ? t.req : t.opt}
                  </span>
                </div>
                <div className="ob-d-secs">{t[subKey]}</div>
              </div>
            </div>
            <StepBodyDesktop />
          </div>

          <div className="ob-d-wfoot">
            <button className="ob-d-back" onClick={() => (step === 1 ? setPhase("entry") : setStep(step - 1))}>
              <SetupIcon name="chevronLeft" size={19} />{t.back}
            </button>
            <div className="ob-d-wfoot-r">
              {optional && (
                <button className="ob-d-skip" onClick={() => (step === TOTAL ? setPhase("done") : setStep(step + 1))}>
                  {t.skip}
                </button>
              )}
              <button className="ob-d-btn" onClick={() => (step === TOTAL ? setPhase("done") : setStep(step + 1))}>
                {step === TOTAL ? t.finish : t.next}
                <SetupIcon name="arrowRight" size={20} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
