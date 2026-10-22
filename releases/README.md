# ملفات تمكين

- `android/Tamkeen_Admin.apk` — تطبيق الإدارة للجوال (أندرويد).
- `windows/parts/` — ملف تثبيت ويندوز مقسّم إلى أجزاء (GitHub لا يقبل ملفاً كبيراً واحداً).
  حمّل كل الأجزاء مع `join.bat` في مجلد واحد، ثم اضغط `join.bat` مرتين فيخرج لك `Tamkeen_Admin_Setup.exe`.
- `windows/source/` — ملفات بناء تطبيق ويندوز.
- `bot/Tamkeen_Bot_v45_WhatsApp_Telegram.json` — ملف البوت لـ n8n.
  المفاتيح محذوفة منه للأمان: ضع كلمة سر البوت مكان `PUT-BOT-SECRET-HERE` وتوكن تليجرام مكان `PUT-TELEGRAM-TOKEN-HERE`.
- `data/` — نسخة من بيانات الإدارة (العملاء، المحادثات، الطلبات، البلاغات، الفريق) و `schema/` لهيكل قاعدة البيانات.
