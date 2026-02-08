# Qayta Qabul Chegirma Tizimi

## Umumiy ma'lumot

Klinikada bemorlar qayta qabulga kelganda avtomatik chegirma tizimi ishga tushadi. Bu tizim bemorlarning oxirgi qabul sanasiga qarab chegirma foizini avtomatik hisoblaydi.

## Chegirma qoidalari

### Bugungi qayta qabul (0 kun)
- **Chegirma:** 100% (BEPUL)
- **Izoh:** Agar bemor bugun allaqachon qabul bo'lgan bo'lsa, keyingi qabullar bepul
- **Misol:** Bemor ertalab qabulda bo'ldi va to'ladi, tushdan keyin yana kelsa - bepul

### 1-3 kun ichida qayta qabul
- **Chegirma:** 100% (BEPUL)
- **Izoh:** Bemor faqat birinchi marta to'laydi, keyingi qabullar bepul
- **Misol:** Agar bemor 2 kun oldin qabulda bo'lgan bo'lsa, bugungi qabul uchun to'lov talab qilinmaydi

### 4-7 kun ichida qayta qabul
- **Chegirma:** 50%
- **Izoh:** Bemor xizmat narxining faqat yarmini to'laydi
- **Misol:** Agar xizmat narxi 100,000 so'm bo'lsa, bemor 50,000 so'm to'laydi

### 8+ kun o'tgandan keyin
- **Chegirma:** Yo'q
- **Izoh:** Bemor to'liq narxni to'laydi
- **Misol:** Agar bemor 10 kun oldin qabulda bo'lgan bo'lsa, bugungi qabul uchun to'liq to'lov talab qilinadi

## Texnik implementatsiya

### Backend (MongoDB)

#### Patient Model
```javascript
last_visit_date: {
  type: Date
}
```

#### Billing Routes
Hisob-faktura yaratishda avtomatik chegirma hisoblash:

```javascript
// Oxirgi qabul sanasini tekshirish
if (patient.last_visit_date) {
  const lastVisit = new Date(patient.last_visit_date);
  lastVisit.setHours(0, 0, 0, 0); // Faqat sanani solishtirish
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Faqat sanani solishtirish
  
  const daysDiff = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    revisitDiscount = totalAmount; // 100% (bugungi qayta qabul)
  } else if (daysDiff >= 1 && daysDiff <= 3) {
    revisitDiscount = totalAmount; // 100%
  } else if (daysDiff >= 4 && daysDiff <= 7) {
    revisitDiscount = totalAmount * 0.50; // 50%
  }
}
```

#### Oxirgi qabul sanasini yangilash
Har safar hisob-faktura yaratilganda:

```javascript
await Patient.findByIdAndUpdate(
  patient_id,
  { 
    last_visit_date: new Date(),
    updated_at: new Date()
  }
);
```

### Frontend (React)

#### Bemor tanlanganda chegirma ko'rsatish
```jsx
{selectedPatient && (
  <div>
    {/* Bemor ma'lumotlari */}
    
    {/* Qayta qabul chegirmasi */}
    {(() => {
      const lastVisitDate = selectedPatient.last_visit_date;
      if (!lastVisitDate) return null;
      
      const daysDiff = calculateDaysDiff(lastVisitDate);
      
      if (daysDiff >= 1 && daysDiff <= 3) {
        return <div>🎉 100% chegirma (BEPUL)</div>;
      } else if (daysDiff >= 4 && daysDiff <= 7) {
        return <div>🎁 50% chegirma</div>;
      }
    })()}
  </div>
)}
```

## Test qilish

### 1. Test bemorni tayyorlash
```bash
cd backend
node set-patient-last-visit.js
```

Bu script:
- Birinchi faol bemorni topadi
- Oxirgi qabul sanasini 2 kun oldin qiladi
- Test uchun tayyor bo'ladi

### 2. Frontend'da test qilish
1. Kassaga kiring (CashierAdvanced sahifasi)
2. Test bemorni tanlang
3. Qayta qabul chegirmasi ko'rsatilishini tekshiring
4. Hisob-faktura yarating
5. Chegirma avtomatik qo'shilganligini tekshiring

### 3. Turli senarilarni test qilish
```bash
cd backend
node test-revisit-discount.js
```

Bu script:
- 2 kun oldin (100% chegirma)
- 5 kun oldin (50% chegirma)
- 10 kun oldin (chegirma yo'q)

Har bir ssenariyni test qiladi va natijalarni ko'rsatadi.

## Qo'shimcha ma'lumotlar

### Chegirma cheklovi
- Qabulxonachi faqat 20% gacha qo'shimcha chegirma bera oladi
- Qayta qabul chegirmasi bu cheklovdan tashqari (avtomatik)
- Admin cheksiz chegirma bera oladi

### Hisob-faktura izohida
Qayta qabul chegirmasi hisob-faktura izohida avtomatik saqlanadi:
- "Qayta qabul (2 kun ichida) - 100% chegirma"
- "Qayta qabul (5 kun ichida) - 50% chegirma"

### Metadata
Hisob-faktura metadata'sida qo'shimcha ma'lumot saqlanadi:
```javascript
metadata: {
  revisit_discount: 100000,
  revisit_discount_reason: "Qayta qabul (2 kun ichida) - 100% chegirma"
}
```

## Xatoliklarni bartaraf qilish

### Chegirma ko'rsatilmayapti
1. Bemorning `last_visit_date` maydonini tekshiring
2. Frontend'da bemor ma'lumotlari to'g'ri yuklanganligini tekshiring
3. Browser console'da xatoliklarni tekshiring

### Chegirma qo'shilmayapti
1. Backend log'larni tekshiring
2. Invoice yaratish jarayonida xatolik borligini tekshiring
3. Patient model'da `last_visit_date` mavjudligini tekshiring

### Test bemor yaratish
```bash
cd backend
node set-patient-last-visit.js
```

## Kelajakda qo'shilishi mumkin bo'lgan funksiyalar

1. **Chegirma tarixi:** Har bir bemorning chegirma tarixini saqlash
2. **Chegirma statistikasi:** Qancha chegirma berilganligini ko'rsatish
3. **Chegirma sozlamalari:** Admin paneldan chegirma foizlarini o'zgartirish
4. **SMS xabarnoma:** Bemorga chegirma haqida SMS yuborish
5. **Chegirma hisoboti:** Oylik/yillik chegirma hisobotlari
