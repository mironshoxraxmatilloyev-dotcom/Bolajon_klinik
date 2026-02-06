# ⚠️ MUHIM: QABULXONA UCHUN KIRISH

## Noto'g'ri ❌
`http://localhost:3000/login` - Bu xodimlar (shifokor, hamshira, admin) uchun!

## To'g'ri ✅
`http://localhost:3000/reception-login` - Bu qabulxona uchun!

---

## Qabulxona Paneli Kirish Ma'lumotlari

**URL:** `http://localhost:3000/reception-login`

**Login:** `qabulxona`  
**Parol:** `qabulxona2026`

---

## Qanday Kirish Kerak (3 usul)

### 1-usul: Bosh sahifadan
1. `http://localhost:3000` ga o'ting
2. Yuqoridagi menuda **"Qabulxona"** tugmasini bosing (ko'k rangda)
3. Login va parolni kiriting

### 2-usul: To'g'ridan-to'g'ri
1. Brauzerga `http://localhost:3000/reception-login` ni yozing
2. Login va parolni kiriting

### 3-usul: Login sahifasidan
1. Agar `/login` sahifasida bo'lsangiz
2. Brauzer manzil qatorida `/login` ni `/reception-login` ga o'zgartiring
3. Enter bosing

---

## Xatoliklar va Yechimlar

### "Tizimga kirishda xatolik yuz berdi" (401 Unauthorized)
**Sabab:** Siz `/login` sahifasidan kirishga urinayapsiz  
**Yechim:** `/reception-login` sahifasiga o'ting

### "Login yoki parol noto'g'ri"
**Sabab:** Login yoki parol xato yozilgan  
**Yechim:** 
- Login: `qabulxona` (kichik harflar, bo'sh joy yo'q)
- Parol: `qabulxona2026` (kichik harflar, raqamlar)

---

## Farqi Nima?

| Sahifa | Kimlar uchun | Backend kerakmi? |
|--------|--------------|------------------|
| `/login` | Shifokor, hamshira, admin, laborant, sanitar | ✅ Ha |
| `/reception-login` | Faqat qabulxona xodimi | ❌ Yo'q (kodda yozilgan) |

---

## Keyingi Qadamlar

Panel tayyor! Endi qanday funksiyalar kerakligini ayting:
- ✅ Bemorlarni ro'yxatdan o'tkazish
- ✅ Navbat boshqaruvi  
- ✅ To'lovlar
- ✅ Hisobotlar
- ✅ Boshqa funksiyalar

Qaysi birini birinchi qo'shamiz?
