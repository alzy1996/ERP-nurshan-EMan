export const DICT = {
  "Command Center": "مركز القيادة", "Dashboard": "لوحة التحكم", "Analytics": "التحليلات",
  "Materials": "المواد", "Suppliers": "الموردون", "Offers": "العروض",
  "Purchase Requests": "طلبات الشراء", "Contracts": "العقود", "Attendance": "الحضور",
  "Notifications": "الإشعارات", "Settings": "الإعدادات", "Sign out": "تسجيل الخروج",
  "Sign in": "تسجيل الدخول", "Welcome back": "مرحباً بعودتك", "Username": "اسم المستخدم",
  "Password": "كلمة المرور", "All sites": "كل المواقع", "Suppliers count": "عدد الموردين",
  "Active offers": "العروض النشطة", "Pending approvals": "الموافقات المعلقة",
  "Contracts": "العقود", "Recent activity": "النشاط الأخير", "Loading…": "جارٍ التحميل…",
  "Create administrator": "إنشاء مدير", "Full name": "الاسم الكامل"
};

/** Translate an English key for the current language. */
export function t(key, lang) {
  if (lang === "ar" && DICT[key]) return DICT[key];
  return key;
}
