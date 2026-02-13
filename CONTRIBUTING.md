# Contributing Guide

Loyihaga hissa qo'shish uchun qo'llanma.

## Kod Standartlari

### JavaScript/React

#### Naming Conventions
```javascript
// Variables va functions - camelCase
const patientName = 'John Doe';
const calculateTotal = () => {};

// Components - PascalCase
const PatientProfile = () => {};

// Constants - UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:5001';

// Private functions - underscore prefix
const _helperFunction = () => {};
```

#### File Structure
```
ComponentName.jsx
├── Imports
├── Constants
├── Component Definition
│   ├── State declarations
│   ├── Effects
│   ├── Event handlers
│   ├── Helper functions
│   └── Render
└── Export
```

#### Comments
```javascript
/**
 * Bemorning umumiy qarzini hisoblash
 * @param {Array} invoices - Hisob-fakturalar ro'yxati
 * @returns {number} Umumiy qarz miqdori
 */
const calculateTotalDebt = (invoices) => {
  return invoices
    .filter(inv => inv.payment_status !== 'paid')
    .reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0);
};
```

### Backend API

#### Route Structure
```javascript
// 1. Imports
import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

// 2. Router initialization
const router = express.Router();

// 3. Validation schemas
const createSchema = Joi.object({...});

// 4. Routes (CRUD order: GET, POST, PUT, DELETE)
router.get('/', authenticate, async (req, res) => {});
router.post('/', authenticate, async (req, res) => {});
router.put('/:id', authenticate, async (req, res) => {});
router.delete('/:id', authenticate, async (req, res) => {});

// 5. Export
export default router;
```

#### Error Handling
```javascript
try {
  // Business logic
  const result = await someOperation();
  
  res.json({
    success: true,
    data: result,
    message: 'Muvaffaqiyatli'
  });
} catch (error) {
  console.error('Operation error:', error);
  res.status(500).json({
    success: false,
    error: error.message
  });
}
```

## Git Workflow

### Branch Naming
```
feature/patient-timeline    # Yangi funksiya
bugfix/invoice-calculation  # Bug fix
hotfix/security-patch       # Tezkor tuzatish
refactor/api-services       # Refactoring
```

### Commit Messages
```
feat: Bemor faoliyati timeline qo'shildi
fix: Hisob-faktura yaratishda xatolik tuzatildi
refactor: API service'lar birlashtrildi
docs: README yangilandi
style: Kod formatlash
test: Unit testlar qo'shildi
chore: Dependencies yangilandi
```

### Pull Request Template
```markdown
## Tavsif
Qisqacha tavsif

## O'zgarishlar
- [ ] Feature 1
- [ ] Feature 2

## Test
Qanday test qilindi

## Screenshots
Agar kerak bo'lsa
```

## Testing

### Unit Tests
```javascript
describe('calculateTotalDebt', () => {
  it('should calculate total debt correctly', () => {
    const invoices = [
      { total_amount: 100, paid_amount: 50, payment_status: 'partial' },
      { total_amount: 200, paid_amount: 0, payment_status: 'pending' }
    ];
    
    expect(calculateTotalDebt(invoices)).toBe(250);
  });
});
```

### Integration Tests
```javascript
describe('POST /api/v1/billing/invoices', () => {
  it('should create invoice with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/billing/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patient_id: 'patient123',
        items: [{ service_id: 'service123', quantity: 1 }]
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

## Code Review Checklist

### Functionality
- [ ] Kod ishlaydi va talablarga javob beradi
- [ ] Edge case'lar ko'rib chiqilgan
- [ ] Error handling to'g'ri amalga oshirilgan

### Code Quality
- [ ] Kod o'qilishi oson
- [ ] Naming conventions to'g'ri
- [ ] No magic numbers/strings
- [ ] DRY principle (Don't Repeat Yourself)
- [ ] SOLID principles

### Performance
- [ ] Database query'lar optimallashtirilgan
- [ ] N+1 query muammosi yo'q
- [ ] Unnecessary re-renders yo'q (React)

### Security
- [ ] Input validation
- [ ] Authentication/Authorization
- [ ] SQL/NoSQL injection himoyasi
- [ ] XSS himoyasi
- [ ] Sensitive data exposure yo'q

### Documentation
- [ ] Complex logic izohlar bilan
- [ ] API documentation yangilangan
- [ ] README yangilangan (agar kerak bo'lsa)

## Performance Best Practices

### Frontend
```javascript
// ❌ Bad - har render'da yangi array
const items = data.map(item => ({ ...item }));

// ✅ Good - useMemo ishlatish
const items = useMemo(() => 
  data.map(item => ({ ...item })), 
  [data]
);

// ❌ Bad - inline function
<Button onClick={() => handleClick(id)} />

// ✅ Good - useCallback
const handleButtonClick = useCallback(() => {
  handleClick(id);
}, [id]);
```

### Backend
```javascript
// ❌ Bad - N+1 query
const patients = await Patient.find();
for (const patient of patients) {
  patient.invoices = await Invoice.find({ patient_id: patient._id });
}

// ✅ Good - populate yoki aggregate
const patients = await Patient.find().populate('invoices');
```

## Security Best Practices

### Input Validation
```javascript
// Har doim input validation
const schema = Joi.object({
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+998\d{9}$/).required(),
  amount: Joi.number().min(0).required()
});

const { error, value } = schema.validate(req.body);
if (error) {
  return res.status(400).json({ error: error.details[0].message });
}
```

### Authentication
```javascript
// Har doim token tekshirish
router.get('/sensitive-data',
  authenticate,  // Token tekshirish
  authorize('admin', 'doctor'),  // Role tekshirish
  async (req, res) => {
    // Business logic
  }
);
```

### Data Sanitization
```javascript
// XSS himoyasi
import xss from 'xss';

const sanitizedInput = xss(userInput);
```

## Debugging Tips

### Frontend
```javascript
// React DevTools ishlatish
// Console.log o'rniga debugger
useEffect(() => {
  debugger; // Browser DevTools ochiladi
  console.log('Data:', data);
}, [data]);

// Network tab'da API so'rovlarni kuzatish
```

### Backend
```javascript
// Detailed logging
console.log('Request body:', JSON.stringify(req.body, null, 2));
console.log('User:', req.user);
console.log('Query result:', result);

// MongoDB query'larni log qilish
mongoose.set('debug', true);
```

## Common Patterns

### Loading States
```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);

const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    const response = await api.get('/endpoint');
    setData(response.data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Form Handling
```javascript
const [form, setForm] = useState({ name: '', email: '' });

const handleChange = (e) => {
  const { name, value } = e.target;
  setForm(prev => ({ ...prev, [name]: value }));
};

const handleSubmit = async (e) => {
  e.preventDefault();
  // Submit logic
};
```

## Resources

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-notes/)
- [JavaScript Style Guide](https://github.com/airbnb/javascript)

---

Savollar bo'lsa, team lead bilan bog'laning.
