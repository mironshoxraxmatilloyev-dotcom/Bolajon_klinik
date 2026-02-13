# API Documentation

Bolajon Klinika Backend API hujjati.

## Base URL
```
Development: http://localhost:5001/api/v1
Production: https://api.bolajonklinika.uz/api/v1
```

## Authentication

Barcha himoyalangan endpoint'lar uchun JWT token kerak.

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user123",
      "username": "admin",
      "role": {
        "name": "Admin",
        "permissions": ["all"]
      }
    }
  }
}
```

## Patients (Bemorlar)

### Get All Patients
```http
GET /patients
```

**Query Parameters:**
- `page` (number): Sahifa raqami (default: 1)
- `limit` (number): Sahifa hajmi (default: 20)
- `search` (string): Qidiruv (ism, telefon, ID)

**Response:**
```json
{
  "success": true,
  "data": {
    "patients": [...],
    "pagination": {
      "total": 150,
      "page": 1,
      "pages": 8
    }
  }
}
```

### Get Patient by ID
```http
GET /patients/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "patient123",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+998901234567",
      "date_of_birth": "1990-01-01",
      "gender": "male"
    },
    "medicalRecords": [...],
    "invoices": [...],
    "labResults": [...],
    "admissions": [...]
  }
}
```

### Create Patient
```http
POST /patients
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+998901234567",
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "address": "Tashkent, Uzbekistan"
}
```

### Update Patient
```http
PUT /patients/:id
```

### Delete Patient
```http
DELETE /patients/:id
```

## Billing (Moliya)

### Get All Invoices
```http
GET /billing/invoices
```

**Query Parameters:**
- `patient_id` (string): Bemor ID
- `status` (string): pending | partial | paid
- `from_date` (date): Boshlanish sanasi
- `to_date` (date): Tugash sanasi

### Create Invoice
```http
POST /billing/invoices
```

**Request Body:**
```json
{
  "patient_id": "patient123",
  "items": [
    {
      "service_id": "service123",
      "quantity": 1
    }
  ],
  "payment_method": "cash",
  "paid_amount": 100000,
  "discount_amount": 0,
  "notes": "Izoh",
  "doctor_id": "doctor123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "invoice123",
      "invoice_number": "INV-20260213001",
      "patient_id": "patient123",
      "total_amount": 100000,
      "paid_amount": 100000,
      "payment_status": "paid",
      "items": [...]
    }
  }
}
```

### Add Payment to Invoice
```http
POST /billing/invoices/:id/payments
```

**Request Body:**
```json
{
  "amount": 50000,
  "payment_method": "cash",
  "notes": "Qisman to'lov"
}
```

### Get Billing Statistics
```http
GET /billing/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "todayRevenue": 1500000,
    "todayByMethod": {
      "cash": 1000000,
      "card": 500000
    },
    "pendingInvoices": 25,
    "totalDebt": 5000000,
    "monthRevenue": 45000000
  }
}
```

## Laboratory (Laboratoriya)

### Create Lab Order
```http
POST /laboratory/orders
```

**Request Body:**
```json
{
  "patient_id": "patient123",
  "tests": [
    {
      "test_id": "test123",
      "quantity": 1
    }
  ],
  "doctor_id": "doctor123",
  "priority": "normal",
  "notes": "Izoh"
}
```

### Update Lab Results
```http
PUT /laboratory/orders/:id/results
```

**Request Body:**
```json
{
  "results": [
    {
      "test_id": "test123",
      "result_value": "Normal",
      "reference_range": "0-10",
      "unit": "mg/dL"
    }
  ],
  "notes": "Natija izohi"
}
```

### Get Lab Order
```http
GET /laboratory/orders/:id
```

## Queue (Navbat)

### Get Queue List
```http
GET /queue
```

**Query Parameters:**
- `doctor_id` (string): Shifokor ID
- `date` (date): Sana (default: bugun)
- `status` (string): waiting | in_progress | completed | cancelled

### Add to Queue
```http
POST /queue
```

**Request Body:**
```json
{
  "patient_id": "patient123",
  "doctor_id": "doctor123",
  "appointment_type": "consultation",
  "notes": "Izoh"
}
```

### Update Queue Status
```http
PUT /queue/:id/status
```

**Request Body:**
```json
{
  "status": "in_progress"
}
```

## Inpatient (Statsionar)

### Admit Patient
```http
POST /inpatient/admissions
```

**Request Body:**
```json
{
  "patient_id": "patient123",
  "bed_id": "bed123",
  "doctor_id": "doctor123",
  "admission_reason": "Surgery",
  "notes": "Izoh"
}
```

### Discharge Patient
```http
POST /inpatient/admissions/:id/discharge
```

**Request Body:**
```json
{
  "discharge_reason": "Recovered",
  "discharge_notes": "Izoh"
}
```

### Get Available Beds
```http
GET /inpatient/beds/available
```

## Prescriptions (Retseptlar)

### Create Prescription
```http
POST /prescriptions
```

**Request Body:**
```json
{
  "patient_id": "patient123",
  "doctor_id": "doctor123",
  "medications": [
    {
      "medicine_name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "3 marta kuniga",
      "duration": "5 kun",
      "instructions": "Ovqatdan keyin"
    }
  ],
  "diagnosis": "Gripp",
  "notes": "Izoh"
}
```

### Get Patient Prescriptions
```http
GET /prescriptions/patient/:patientId
```

## Staff (Xodimlar)

### Get All Staff
```http
GET /staff
```

**Query Parameters:**
- `role` (string): Doctor | Nurse | Receptionist | ...
- `department` (string): Bo'lim nomi

### Create Staff
```http
POST /staff
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "password": "password123",
  "role": "Doctor",
  "phone": "+998901234567",
  "email": "john@example.com",
  "specialization": "Cardiologist",
  "salary": 5000000
}
```

## Tasks (Vazifalar)

### Get Tasks
```http
GET /tasks
```

**Query Parameters:**
- `assigned_to` (string): Xodim ID
- `status` (string): pending | in_progress | completed | verified | rejected

### Create Task
```http
POST /tasks
```

**Request Body:**
```json
{
  "title": "Vazifa nomi",
  "description": "Vazifa tavsifi",
  "assigned_to": "staff123",
  "task_type": "Umumiy",
  "priority": "medium",
  "due_date": "2026-02-20"
}
```

### Update Task Status
```http
PUT /tasks/:id/status
```

**Request Body:**
```json
{
  "status": "completed",
  "completion_notes": "Vazifa bajarildi"
}
```

### Verify Task (Admin)
```http
POST /tasks/:id/verify
```

**Request Body:**
```json
{
  "verification_notes": "Yaxshi bajarilgan"
}
```

## Reports (Hisobotlar)

### Daily Report
```http
GET /reports/daily
```

**Query Parameters:**
- `date` (date): Sana (default: bugun)

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-02-13",
    "revenue": {
      "total": 2500000,
      "cash": 1500000,
      "card": 1000000
    },
    "patients": {
      "new": 15,
      "returning": 45,
      "total": 60
    },
    "appointments": {
      "completed": 55,
      "cancelled": 5
    },
    "lab_tests": 30,
    "admissions": 5,
    "discharges": 3
  }
}
```

### Financial Report
```http
GET /reports/financial
```

**Query Parameters:**
- `from_date` (date): Boshlanish sanasi
- `to_date` (date): Tugash sanasi

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error: phone is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Token topilmadi"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Ruxsat yo'q"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Bemor topilmadi"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Server xatosi"
}
```

## Rate Limiting

- 100 requests per 15 minutes per IP
- 1000 requests per hour per authenticated user

## Pagination

Barcha list endpoint'lar pagination qo'llab-quvvatlaydi:

**Query Parameters:**
- `page` (number): Sahifa raqami (default: 1)
- `limit` (number): Sahifa hajmi (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 8,
    "limit": 20
  }
}
```

## Webhooks (Coming Soon)

Webhook'lar orqali real-time event'larni qabul qilish.

---

**Oxirgi yangilanish:** 2026-02-13
