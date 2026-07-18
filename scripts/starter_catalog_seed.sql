-- Reviewed MVP starter catalog (DE document text, TR/AR UI labels).
-- Requires scripts/onboarding_trades_starter_catalog.sql.
-- Re-running this seed updates only the central templates with the same stable id.
-- Existing personal services are never updated by this script.

INSERT INTO public.service_templates (
  id,
  trade_id,
  description_de,
  description_tr,
  description_ar,
  unit,
  sort_order,
  is_active,
  template_version
)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'painter', 'Wand- und Deckenanstrich', 'Duvar ve tavan boyama', 'دهان الجدران والأسقف', 'm²', 10, true, 1),
  ('10000000-0000-4000-8000-000000000002', 'painter', 'Wand- und Deckenspachtelung', 'Duvar ve tavan macunlama', 'معجنة الجدران والأسقف', 'm²', 20, true, 1),
  ('10000000-0000-4000-8000-000000000003', 'painter', 'Tapetendemontage', 'Duvar kâğıdı sökme', 'إزالة ورق الجدران', 'm²', 30, true, 1),
  ('10000000-0000-4000-8000-000000000004', 'painter', 'Tapetenmontage', 'Duvar kâğıdı kaplama', 'تركيب ورق الجدران', 'm²', 40, true, 1),
  ('10000000-0000-4000-8000-000000000005', 'painter', 'Türlackierung', 'Kapı boyama', 'طلاء الأبواب', 'Stk.', 50, true, 1),
  ('10000000-0000-4000-8000-000000000006', 'painter', 'Fensterlackierung', 'Pencere boyama', 'طلاء النوافذ', 'Stk.', 60, true, 1),
  ('10000000-0000-4000-8000-000000000007', 'painter', 'Fassadenanstrich', 'Cephe boyama', 'طلاء الواجهات', 'm²', 70, true, 1),
  ('10000000-0000-4000-8000-000000000008', 'painter', 'Anfahrt', 'Yol ücreti', 'رسوم الانتقال', 'Fahrt', 80, true, 1),
  ('10000000-0000-4000-8000-000000000009', 'painter', 'Kleinauftrag', 'Küçük iş', 'عمل صغير', 'Auftrag', 90, true, 1),

  ('20000000-0000-4000-8000-000000000001', 'carpenter', 'Möbelmontage', 'Mobilya montajı', 'تركيب الأثاث', 'Stk.', 10, true, 1),
  ('20000000-0000-4000-8000-000000000002', 'carpenter', 'Möbeldemontage', 'Mobilya sökümü', 'فك الأثاث', 'Stk.', 20, true, 1),
  ('20000000-0000-4000-8000-000000000003', 'carpenter', 'Küchenmontage', 'Mutfak montajı', 'تركيب المطبخ', 'Std.', 30, true, 1),
  ('20000000-0000-4000-8000-000000000004', 'carpenter', 'Küchendemontage', 'Mutfak sökümü', 'فك المطبخ', 'Std.', 40, true, 1),
  ('20000000-0000-4000-8000-000000000005', 'carpenter', 'Türmontage', 'Kapı montajı', 'تركيب الأبواب', 'Stk.', 50, true, 1),
  ('20000000-0000-4000-8000-000000000006', 'carpenter', 'Türdemontage', 'Kapı sökümü', 'فك الأبواب', 'Stk.', 60, true, 1),
  ('20000000-0000-4000-8000-000000000007', 'carpenter', 'Arbeitsplattenmontage', 'Tezgâh montajı', 'تركيب سطح العمل', 'lfm', 70, true, 1),
  ('20000000-0000-4000-8000-000000000008', 'carpenter', 'Reparaturarbeiten', 'Onarım işleri', 'أعمال الإصلاح', 'Std.', 80, true, 1),

  ('30000000-0000-4000-8000-000000000001', 'windows_doors', 'Fenstermontage', 'Pencere montajı', 'تركيب النوافذ', 'Stk.', 10, true, 1),
  ('30000000-0000-4000-8000-000000000002', 'windows_doors', 'Fensterdemontage', 'Pencere sökümü', 'فك النوافذ', 'Stk.', 20, true, 1),
  ('30000000-0000-4000-8000-000000000003', 'windows_doors', 'Haustürmontage', 'Dış kapı montajı', 'تركيب الباب الخارجي', 'Stk.', 30, true, 1),
  ('30000000-0000-4000-8000-000000000004', 'windows_doors', 'Haustürdemontage', 'Dış kapı sökümü', 'فك الباب الخارجي', 'Stk.', 40, true, 1),
  ('30000000-0000-4000-8000-000000000005', 'windows_doors', 'Innentürmontage', 'İç kapı montajı', 'تركيب الباب الداخلي', 'Stk.', 50, true, 1),
  ('30000000-0000-4000-8000-000000000006', 'windows_doors', 'Innentürdemontage', 'İç kapı sökümü', 'فك الباب الداخلي', 'Stk.', 60, true, 1),
  ('30000000-0000-4000-8000-000000000007', 'windows_doors', 'Fenstereinstellung', 'Pencere ayarı', 'ضبط النوافذ', 'Stk.', 70, true, 1),
  ('30000000-0000-4000-8000-000000000008', 'windows_doors', 'Rollladenreparatur', 'Panjur onarımı', 'إصلاح مصراع النافذة', 'Std.', 80, true, 1),

  ('40000000-0000-4000-8000-000000000001', 'electrician', 'Steckdosenmontage', 'Priz montajı', 'تركيب المقابس', 'Stk.', 10, true, 1),
  ('40000000-0000-4000-8000-000000000002', 'electrician', 'Lichtschaltermontage', 'Işık anahtarı montajı', 'تركيب مفاتيح الإنارة', 'Stk.', 20, true, 1),
  ('40000000-0000-4000-8000-000000000003', 'electrician', 'Leuchtenmontage', 'Aydınlatma armatürü montajı', 'تركيب وحدات الإنارة', 'Stk.', 30, true, 1),
  ('40000000-0000-4000-8000-000000000004', 'electrician', 'Leuchtendemontage', 'Aydınlatma armatürü sökümü', 'فك وحدات الإنارة', 'Stk.', 40, true, 1),
  ('40000000-0000-4000-8000-000000000005', 'electrician', 'Kabelverlegung', 'Kablo döşeme', 'تمديد الكابلات', 'lfm', 50, true, 1),
  ('40000000-0000-4000-8000-000000000006', 'electrician', 'Unterverteilungsmontage', 'Alt dağıtım panosu montajı', 'تركيب لوحة توزيع فرعية', 'Stk.', 60, true, 1),
  ('40000000-0000-4000-8000-000000000007', 'electrician', 'Sicherungsaustausch', 'Sigorta değişimi', 'استبدال القاطع الكهربائي', 'Stk.', 70, true, 1),
  ('40000000-0000-4000-8000-000000000008', 'electrician', 'Fehlersuche / Reparatur', 'Arıza tespiti / Onarım', 'اكتشاف الأعطال / الإصلاح', 'Einsatz', 80, true, 1),

  ('50000000-0000-4000-8000-000000000001', 'tiler', 'Fliesenverlegung', 'Fayans döşeme', 'تركيب البلاط', 'm²', 10, true, 1),
  ('50000000-0000-4000-8000-000000000002', 'tiler', 'Fliesendemontage', 'Fayans sökümü', 'إزالة البلاط', 'm²', 20, true, 1),
  ('50000000-0000-4000-8000-000000000003', 'tiler', 'Untergrundvorbereitung', 'Zemin hazırlığı', 'تجهيز السطح', 'm²', 30, true, 1),
  ('50000000-0000-4000-8000-000000000004', 'tiler', 'Abdichtungsarbeiten', 'Yalıtım işleri', 'أعمال العزل المائي', 'm²', 40, true, 1),
  ('50000000-0000-4000-8000-000000000005', 'tiler', 'Silikonfugenerneuerung', 'Silikon derz yenileme', 'تجديد فواصل السيليكون', 'lfm', 50, true, 1),
  ('50000000-0000-4000-8000-000000000006', 'tiler', 'Sockelfliesenmontage', 'Süpürgelik fayans montajı', 'تركيب بلاط الوزرة', 'lfm', 60, true, 1),
  ('50000000-0000-4000-8000-000000000007', 'tiler', 'Fliesenzuschnitt', 'Fayans kesimi', 'قص البلاط', 'Stk.', 70, true, 1),
  ('50000000-0000-4000-8000-000000000008', 'tiler', 'Reparaturarbeiten', 'Onarım işleri', 'أعمال الإصلاح', 'Std.', 80, true, 1),

  ('60000000-0000-4000-8000-000000000001', 'plumbing_heating', 'Waschbeckenmontage', 'Lavabo montajı', 'تركيب حوض الغسيل', 'Stk.', 10, true, 1),
  ('60000000-0000-4000-8000-000000000002', 'plumbing_heating', 'Waschbeckendemontage', 'Lavabo sökümü', 'فك حوض الغسيل', 'Stk.', 20, true, 1),
  ('60000000-0000-4000-8000-000000000003', 'plumbing_heating', 'WC-Montage', 'Klozet montajı', 'تركيب المرحاض', 'Stk.', 30, true, 1),
  ('60000000-0000-4000-8000-000000000004', 'plumbing_heating', 'WC-Demontage', 'Klozet sökümü', 'فك المرحاض', 'Stk.', 40, true, 1),
  ('60000000-0000-4000-8000-000000000005', 'plumbing_heating', 'Armaturenmontage', 'Sıhhi armatür montajı', 'تركيب الحنفيات', 'Stk.', 50, true, 1),
  ('60000000-0000-4000-8000-000000000006', 'plumbing_heating', 'Duschmontage', 'Duş montajı', 'تركيب الدش', 'Stk.', 60, true, 1),
  ('60000000-0000-4000-8000-000000000007', 'plumbing_heating', 'Heizkörpermontage', 'Radyatör montajı', 'تركيب المشعاع', 'Stk.', 70, true, 1),
  ('60000000-0000-4000-8000-000000000008', 'plumbing_heating', 'Wasserleitungsverlegung', 'Su borusu döşeme', 'تمديد أنابيب المياه', 'lfm', 80, true, 1),

  ('70000000-0000-4000-8000-000000000001', 'drywall', 'Trockenbaumontage', 'Kuru duvar montajı', 'تركيب الجدران الجافة', 'm²', 10, true, 1),
  ('70000000-0000-4000-8000-000000000002', 'drywall', 'Trockenbaudemontage', 'Kuru duvar sökümü', 'فك الجدران الجافة', 'm²', 20, true, 1),
  ('70000000-0000-4000-8000-000000000003', 'drywall', 'Gipskartonplattenmontage', 'Alçıpan levha montajı', 'تركيب ألواح الجبس', 'm²', 30, true, 1),
  ('70000000-0000-4000-8000-000000000004', 'drywall', 'Deckenkonstruktion / Abhängung', 'Asma tavan konstrüksiyonu', 'إنشاء سقف مستعار', 'm²', 40, true, 1),
  ('70000000-0000-4000-8000-000000000005', 'drywall', 'Dämmmontage', 'Yalıtım montajı', 'تركيب العزل', 'm²', 50, true, 1),
  ('70000000-0000-4000-8000-000000000006', 'drywall', 'Fugenverspachtelung', 'Derz dolgu', 'معالجة فواصل الجبس', 'm²', 60, true, 1),
  ('70000000-0000-4000-8000-000000000007', 'drywall', 'Türöffnung herstellen', 'Kapı boşluğu açma', 'إنشاء فتحة باب', 'Stk.', 70, true, 1),
  ('70000000-0000-4000-8000-000000000008', 'drywall', 'Reparaturarbeiten', 'Onarım işleri', 'أعمال الإصلاح', 'Std.', 80, true, 1),

  ('80000000-0000-4000-8000-000000000001', 'flooring', 'Laminatverlegung', 'Laminat döşeme', 'تركيب الأرضيات الخشبية المركبة', 'm²', 10, true, 1),
  ('80000000-0000-4000-8000-000000000002', 'flooring', 'Vinylbodenverlegung', 'Vinil zemin döşeme', 'تركيب أرضيات الفينيل', 'm²', 20, true, 1),
  ('80000000-0000-4000-8000-000000000003', 'flooring', 'Parkettverlegung', 'Parke döşeme', 'تركيب الباركيه', 'm²', 30, true, 1),
  ('80000000-0000-4000-8000-000000000004', 'flooring', 'Teppichverlegung', 'Halı döşeme', 'تركيب السجاد', 'm²', 40, true, 1),
  ('80000000-0000-4000-8000-000000000005', 'flooring', 'Bodenbelagsdemontage', 'Zemin kaplaması sökümü', 'إزالة أغطية الأرضيات', 'm²', 50, true, 1),
  ('80000000-0000-4000-8000-000000000006', 'flooring', 'Untergrundvorbereitung', 'Zemin hazırlığı', 'تجهيز السطح', 'm²', 60, true, 1),
  ('80000000-0000-4000-8000-000000000007', 'flooring', 'Sockelleistenmontage', 'Süpürgelik montajı', 'تركيب ألواح الحواف', 'lfm', 70, true, 1),
  ('80000000-0000-4000-8000-000000000008', 'flooring', 'Sockelleistendemontage', 'Süpürgelik sökümü', 'فك ألواح الحواف', 'lfm', 80, true, 1),

  ('90000000-0000-4000-8000-000000000001', 'gardening_landscaping', 'Zaunmontage', 'Çit montajı', 'تركيب السياج', 'lfm', 10, true, 1),
  ('90000000-0000-4000-8000-000000000002', 'gardening_landscaping', 'Zaundemontage', 'Çit sökümü', 'فك السياج', 'lfm', 20, true, 1),
  ('90000000-0000-4000-8000-000000000003', 'gardening_landscaping', 'Pflasterverlegung', 'Parke taşı döşeme', 'رصف البلاط الحجري', 'm²', 30, true, 1),
  ('90000000-0000-4000-8000-000000000004', 'gardening_landscaping', 'Pflasterdemontage', 'Parke taşı sökümü', 'إزالة البلاط الحجري', 'm²', 40, true, 1),
  ('90000000-0000-4000-8000-000000000005', 'gardening_landscaping', 'Rasenpflege', 'Çim bakımı', 'العناية بالعشب', 'm²', 50, true, 1),
  ('90000000-0000-4000-8000-000000000006', 'gardening_landscaping', 'Heckenschnitt', 'Çit budama', 'تقليم الأسيجة', 'lfm', 60, true, 1),
  ('90000000-0000-4000-8000-000000000007', 'gardening_landscaping', 'Baumschnitt', 'Ağaç budama', 'تقليم الأشجار', 'Stk.', 70, true, 1),
  ('90000000-0000-4000-8000-000000000008', 'gardening_landscaping', 'Gartenpflege', 'Bahçe bakımı', 'العناية بالحديقة', 'Std.', 80, true, 1),

  ('a0000000-0000-4000-8000-000000000001', 'cleaning', 'Unterhaltsreinigung', 'Periyodik temizlik', 'التنظيف الدوري', 'm²', 10, true, 1),
  ('a0000000-0000-4000-8000-000000000002', 'cleaning', 'Grundreinigung', 'Derinlemesine temizlik', 'التنظيف الشامل', 'm²', 20, true, 1),
  ('a0000000-0000-4000-8000-000000000003', 'cleaning', 'Fensterreinigung', 'Pencere temizliği', 'تنظيف النوافذ', 'm²', 30, true, 1),
  ('a0000000-0000-4000-8000-000000000004', 'cleaning', 'Treppenhausreinigung', 'Merdiven boşluğu temizliği', 'تنظيف السلالم', 'Std.', 40, true, 1),
  ('a0000000-0000-4000-8000-000000000005', 'cleaning', 'Bauendreinigung', 'İnşaat sonrası temizlik', 'التنظيف بعد أعمال البناء', 'm²', 50, true, 1),
  ('a0000000-0000-4000-8000-000000000006', 'cleaning', 'Büroreinigung', 'Ofis temizliği', 'تنظيف المكاتب', 'm²', 60, true, 1),
  ('a0000000-0000-4000-8000-000000000007', 'cleaning', 'Teppichreinigung', 'Halı temizliği', 'تنظيف السجاد', 'm²', 70, true, 1),
  ('a0000000-0000-4000-8000-000000000008', 'cleaning', 'Anfahrt', 'Yol ücreti', 'رسوم الانتقال', 'Fahrt', 80, true, 1),
  ('a0000000-0000-4000-8000-000000000009', 'cleaning', 'Kleinauftrag', 'Küçük iş', 'عمل صغير', 'Auftrag', 90, true, 1),

  ('b0000000-0000-4000-8000-000000000001', 'other', 'Montagearbeiten', 'Montaj işleri', 'أعمال التركيب', 'Std.', 10, true, 1),
  ('b0000000-0000-4000-8000-000000000002', 'other', 'Demontagearbeiten', 'Söküm işleri', 'أعمال الفك', 'Std.', 20, true, 1),
  ('b0000000-0000-4000-8000-000000000003', 'other', 'Reparaturarbeiten', 'Onarım işleri', 'أعمال الإصلاح', 'Std.', 30, true, 1),
  ('b0000000-0000-4000-8000-000000000004', 'other', 'Arbeitszeit', 'Çalışma saati', 'ساعة عمل', 'Std.', 40, true, 1),
  ('b0000000-0000-4000-8000-000000000005', 'other', 'Materialbeschaffung', 'Malzeme tedariki', 'توريد المواد', 'Std.', 50, true, 1),
  ('b0000000-0000-4000-8000-000000000006', 'other', 'Entsorgung', 'Atık bertarafı', 'التخلص من النفايات', 'm³', 60, true, 1),
  ('b0000000-0000-4000-8000-000000000007', 'other', 'Anfahrt', 'Yol ücreti', 'رسوم الانتقال', 'Fahrt', 70, true, 1),
  ('b0000000-0000-4000-8000-000000000008', 'other', 'Kleinauftrag', 'Küçük iş', 'عمل صغير', 'Auftrag', 80, true, 1)
ON CONFLICT (id) DO UPDATE SET
  trade_id = EXCLUDED.trade_id,
  description_de = EXCLUDED.description_de,
  description_tr = EXCLUDED.description_tr,
  description_ar = EXCLUDED.description_ar,
  unit = EXCLUDED.unit,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  template_version = EXCLUDED.template_version,
  updated_at = now();

-- Net unit-price recommendations in cents. They are only starting points: each
-- company can change its copied service price independently.
UPDATE public.service_templates
SET default_price = CASE id
  WHEN '10000000-0000-4000-8000-000000000001' THEN 1200
  WHEN '10000000-0000-4000-8000-000000000002' THEN 1800
  WHEN '10000000-0000-4000-8000-000000000003' THEN 800
  WHEN '10000000-0000-4000-8000-000000000004' THEN 1600
  WHEN '10000000-0000-4000-8000-000000000005' THEN 9500
  WHEN '10000000-0000-4000-8000-000000000006' THEN 12000
  WHEN '10000000-0000-4000-8000-000000000007' THEN 2200
  WHEN '10000000-0000-4000-8000-000000000008' THEN 3500
  WHEN '10000000-0000-4000-8000-000000000009' THEN 8000
  WHEN '20000000-0000-4000-8000-000000000001' THEN 8500
  WHEN '20000000-0000-4000-8000-000000000002' THEN 5500
  WHEN '20000000-0000-4000-8000-000000000003' THEN 7500
  WHEN '20000000-0000-4000-8000-000000000004' THEN 6000
  WHEN '20000000-0000-4000-8000-000000000005' THEN 18000
  WHEN '20000000-0000-4000-8000-000000000006' THEN 7500
  WHEN '20000000-0000-4000-8000-000000000007' THEN 9500
  WHEN '20000000-0000-4000-8000-000000000008' THEN 6500
  WHEN '30000000-0000-4000-8000-000000000001' THEN 22000
  WHEN '30000000-0000-4000-8000-000000000002' THEN 7000
  WHEN '30000000-0000-4000-8000-000000000003' THEN 38000
  WHEN '30000000-0000-4000-8000-000000000004' THEN 12000
  WHEN '30000000-0000-4000-8000-000000000005' THEN 15000
  WHEN '30000000-0000-4000-8000-000000000006' THEN 6500
  WHEN '30000000-0000-4000-8000-000000000007' THEN 5500
  WHEN '30000000-0000-4000-8000-000000000008' THEN 8500
  WHEN '40000000-0000-4000-8000-000000000001' THEN 6500
  WHEN '40000000-0000-4000-8000-000000000002' THEN 5500
  WHEN '40000000-0000-4000-8000-000000000003' THEN 8500
  WHEN '40000000-0000-4000-8000-000000000004' THEN 3500
  WHEN '40000000-0000-4000-8000-000000000005' THEN 1500
  WHEN '40000000-0000-4000-8000-000000000006' THEN 32000
  WHEN '40000000-0000-4000-8000-000000000007' THEN 4500
  WHEN '40000000-0000-4000-8000-000000000008' THEN 9500
  WHEN '50000000-0000-4000-8000-000000000001' THEN 6500
  WHEN '50000000-0000-4000-8000-000000000002' THEN 2500
  WHEN '50000000-0000-4000-8000-000000000003' THEN 2200
  WHEN '50000000-0000-4000-8000-000000000004' THEN 1800
  WHEN '50000000-0000-4000-8000-000000000005' THEN 1400
  WHEN '50000000-0000-4000-8000-000000000006' THEN 2200
  WHEN '50000000-0000-4000-8000-000000000007' THEN 800
  WHEN '50000000-0000-4000-8000-000000000008' THEN 6500
  WHEN '60000000-0000-4000-8000-000000000001' THEN 18000
  WHEN '60000000-0000-4000-8000-000000000002' THEN 5500
  WHEN '60000000-0000-4000-8000-000000000003' THEN 19000
  WHEN '60000000-0000-4000-8000-000000000004' THEN 7500
  WHEN '60000000-0000-4000-8000-000000000005' THEN 8500
  WHEN '60000000-0000-4000-8000-000000000006' THEN 28000
  WHEN '60000000-0000-4000-8000-000000000007' THEN 16000
  WHEN '60000000-0000-4000-8000-000000000008' THEN 3000
  WHEN '70000000-0000-4000-8000-000000000001' THEN 5500
  WHEN '70000000-0000-4000-8000-000000000002' THEN 2000
  WHEN '70000000-0000-4000-8000-000000000003' THEN 4800
  WHEN '70000000-0000-4000-8000-000000000004' THEN 6500
  WHEN '70000000-0000-4000-8000-000000000005' THEN 2800
  WHEN '70000000-0000-4000-8000-000000000006' THEN 1800
  WHEN '70000000-0000-4000-8000-000000000007' THEN 18000
  WHEN '70000000-0000-4000-8000-000000000008' THEN 6500
  WHEN '80000000-0000-4000-8000-000000000001' THEN 2800
  WHEN '80000000-0000-4000-8000-000000000002' THEN 3200
  WHEN '80000000-0000-4000-8000-000000000003' THEN 5500
  WHEN '80000000-0000-4000-8000-000000000004' THEN 2500
  WHEN '80000000-0000-4000-8000-000000000005' THEN 1800
  WHEN '80000000-0000-4000-8000-000000000006' THEN 2000
  WHEN '80000000-0000-4000-8000-000000000007' THEN 1200
  WHEN '80000000-0000-4000-8000-000000000008' THEN 800
  WHEN '90000000-0000-4000-8000-000000000001' THEN 5500
  WHEN '90000000-0000-4000-8000-000000000002' THEN 2000
  WHEN '90000000-0000-4000-8000-000000000003' THEN 5500
  WHEN '90000000-0000-4000-8000-000000000004' THEN 2500
  WHEN '90000000-0000-4000-8000-000000000005' THEN 300
  WHEN '90000000-0000-4000-8000-000000000006' THEN 1800
  WHEN '90000000-0000-4000-8000-000000000007' THEN 12000
  WHEN '90000000-0000-4000-8000-000000000008' THEN 5500
  WHEN 'a0000000-0000-4000-8000-000000000001' THEN 250
  WHEN 'a0000000-0000-4000-8000-000000000002' THEN 400
  WHEN 'a0000000-0000-4000-8000-000000000003' THEN 500
  WHEN 'a0000000-0000-4000-8000-000000000004' THEN 4500
  WHEN 'a0000000-0000-4000-8000-000000000005' THEN 800
  WHEN 'a0000000-0000-4000-8000-000000000006' THEN 250
  WHEN 'a0000000-0000-4000-8000-000000000007' THEN 800
  WHEN 'a0000000-0000-4000-8000-000000000008' THEN 2500
  WHEN 'a0000000-0000-4000-8000-000000000009' THEN 7500
  WHEN 'b0000000-0000-4000-8000-000000000001' THEN 6500
  WHEN 'b0000000-0000-4000-8000-000000000002' THEN 5000
  WHEN 'b0000000-0000-4000-8000-000000000003' THEN 6500
  WHEN 'b0000000-0000-4000-8000-000000000004' THEN 6000
  WHEN 'b0000000-0000-4000-8000-000000000005' THEN 5500
  WHEN 'b0000000-0000-4000-8000-000000000006' THEN 8500
  WHEN 'b0000000-0000-4000-8000-000000000007' THEN 3500
  WHEN 'b0000000-0000-4000-8000-000000000008' THEN 7500
  ELSE default_price
END;

-- Existing companies retain manually entered prices. Price-free services copied
-- from a starter template receive the current recommendation once.
UPDATE public.services AS service
SET default_price = template.default_price
FROM public.service_templates AS template
WHERE service.starter_template_id = template.id
  AND service.default_price IS NULL;
