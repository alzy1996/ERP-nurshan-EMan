// Lightweight i18n: English base + Arabic / Turkish / Persian dictionaries.
// Arabic and Persian are right-to-left. Strings not in a dictionary fall back to English.

export type Lang = "en" | "ar" | "tr" | "fa";

export const LANGS: { code: Lang; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "tr", label: "Türkçe", dir: "ltr" },
  { code: "fa", label: "فارسی", dir: "rtl" },
];

export function dirFor(lang: Lang): "ltr" | "rtl" {
  return LANGS.find((l) => l.code === lang)?.dir || "ltr";
}

const ar: Record<string, string> = {
  Dashboard: "لوحة التحكم", Projects: "المشاريع", Suppliers: "الموردون", Materials: "المواد",
  Services: "الخدمات", Offers: "العروض", "Purchase Requests": "طلبات الشراء",
  "Purchase Orders": "أوامر الشراء", Contracts: "العقود", Analytics: "التحليلات",
  Notifications: "الإشعارات", Timesheets: "سجلات الدوام", Attendance: "الحضور", Settings: "الإعدادات",
  Workspace: "مساحة العمل", Insights: "رؤى", "Sign in": "تسجيل الدخول", "Sign out": "تسجيل الخروج",
  "Welcome back": "مرحباً بعودتك", Username: "اسم المستخدم", Password: "كلمة المرور",
  "All sites": "كل المواقع", Search: "بحث", Add: "إضافة", Save: "حفظ", Cancel: "إلغاء", Delete: "حذف",
  Status: "الحالة", Active: "نشط", Pending: "قيد الانتظار", "Loading…": "جارٍ التحميل…",
  "Create administrator": "إنشاء مدير", "Full name": "الاسم الكامل", Language: "اللغة", Theme: "المظهر",
  Profile: "الملف الشخصي", Users: "المستخدمون", Sites: "المواقع", Approvals: "الموافقات",
  Administrator: "مدير", CEO: "الرئيس التنفيذي", Financial: "مالي", HR: "الموارد البشرية",
  "Project Manager": "مدير المشروع", "Site Engineer": "مهندس الموقع", Procurement: "المشتريات",
  Inventory: "المخزون", HSE: "الصحة والسلامة", Employee: "موظف",
};

const tr: Record<string, string> = {
  Dashboard: "Gösterge Paneli", Projects: "Projeler", Suppliers: "Tedarikçiler", Materials: "Malzemeler",
  Services: "Hizmetler", Offers: "Teklifler", "Purchase Requests": "Satın Alma Talepleri",
  "Purchase Orders": "Satın Alma Siparişleri", Contracts: "Sözleşmeler", Analytics: "Analitik",
  Notifications: "Bildirimler", Timesheets: "Mesai Çizelgeleri", Attendance: "Yoklama", Settings: "Ayarlar",
  Workspace: "Çalışma Alanı", Insights: "İçgörüler", "Sign in": "Giriş yap", "Sign out": "Çıkış yap",
  "Welcome back": "Tekrar hoş geldiniz", Username: "Kullanıcı adı", Password: "Şifre",
  "All sites": "Tüm sahalar", Search: "Ara", Add: "Ekle", Save: "Kaydet", Cancel: "İptal", Delete: "Sil",
  Status: "Durum", Active: "Aktif", Pending: "Beklemede", "Loading…": "Yükleniyor…",
  "Create administrator": "Yönetici oluştur", "Full name": "Tam ad", Language: "Dil", Theme: "Tema",
  Profile: "Profil", Users: "Kullanıcılar", Sites: "Sahalar", Approvals: "Onaylar",
  Administrator: "Yönetici", CEO: "Genel Müdür", Financial: "Finans", HR: "İnsan Kaynakları",
  "Project Manager": "Proje Müdürü", "Site Engineer": "Saha Mühendisi", Procurement: "Satın Alma",
  Inventory: "Envanter", HSE: "İSG", Employee: "Çalışan",
};

const fa: Record<string, string> = {
  Dashboard: "داشبورد", Projects: "پروژه‌ها", Suppliers: "تأمین‌کنندگان", Materials: "مواد",
  Services: "خدمات", Offers: "پیشنهادها", "Purchase Requests": "درخواست‌های خرید",
  "Purchase Orders": "سفارش‌های خرید", Contracts: "قراردادها", Analytics: "تحلیل‌ها",
  Notifications: "اعلان‌ها", Timesheets: "برگه‌های زمانی", Attendance: "حضور و غیاب", Settings: "تنظیمات",
  Workspace: "فضای کاری", Insights: "بینش‌ها", "Sign in": "ورود", "Sign out": "خروج",
  "Welcome back": "خوش آمدید", Username: "نام کاربری", Password: "رمز عبور",
  "All sites": "همه سایت‌ها", Search: "جستجو", Add: "افزودن", Save: "ذخیره", Cancel: "لغو", Delete: "حذف",
  Status: "وضعیت", Active: "فعال", Pending: "در انتظار", "Loading…": "در حال بارگذاری…",
  "Create administrator": "ایجاد مدیر", "Full name": "نام کامل", Language: "زبان", Theme: "پوسته",
  Profile: "پروفایل", Users: "کاربران", Sites: "سایت‌ها", Approvals: "تأییدها",
  Administrator: "مدیر", CEO: "مدیرعامل", Financial: "مالی", HR: "منابع انسانی",
  "Project Manager": "مدیر پروژه", "Site Engineer": "مهندس سایت", Procurement: "تدارکات",
  Inventory: "انبار", HSE: "ایمنی و بهداشت", Employee: "کارمند",
};

const DICT: Record<Lang, Record<string, string>> = { en: {}, ar, tr, fa };

/** Translate an English key for the given language (falls back to the key). */
export function t(key: string, lang: Lang): string {
  if (lang === "en") return key;
  return DICT[lang]?.[key] || key;
}
