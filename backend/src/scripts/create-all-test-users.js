import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from '../models/Staff.js';

dotenv.config();

const testUsers = [
  {
    username: 'admin',
    password: 'admin123',
    email: 'admin@clinic.uz',
    phone: '+998901111111',
    first_name: 'Admin',
    last_name: 'Adminov',
    role: 'admin',
    department: 'Boshqaruv',
    salary: 10000000,
    description: 'Administrator - Tizim boshqaruvchisi'
  },
  {
    username: 'bosshifokor',
    password: 'chiefDoctor2024!',
    email: 'chief@clinic.uz',
    phone: '+998901234567',
    first_name: 'Bosh',
    last_name: 'Shifokor',
    role: 'chief_doctor',
    specialization: 'Bosh shifokor',
    department: 'Boshqaruv',
    salary: 15000000,
    description: 'Bosh shifokor - Klinika rahbari'
  },
  {
    username: 'shifokor',
    password: 'doctor123',
    email: 'doctor@clinic.uz',
    phone: '+998902222222',
    first_name: 'Shifokor',
    last_name: 'Shifokorov',
    role: 'doctor',
    specialization: 'Terapevt',
    department: 'Terapiya',
    salary: 8000000,
    description: 'Shifokor - Bemorlarni davolash'
  },
  {
    username: 'hamshira',
    password: 'nurse123',
    email: 'nurse@clinic.uz',
    phone: '+998903333333',
    first_name: 'Hamshira',
    last_name: 'Hamshirova',
    role: 'nurse',
    department: 'Hamshiralik',
    salary: 5000000,
    description: 'Hamshira - Bemorlarni parvarish qilish'
  },
  {
    username: 'qabulxona',
    password: 'reception123',
    email: 'reception@clinic.uz',
    phone: '+998904444444',
    first_name: 'Qabulxona',
    last_name: 'Qabulxonachi',
    role: 'reception',
    department: 'Qabulxona',
    salary: 4000000,
    description: 'Qabulxonachi - Bemorlarni qabul qilish'
  },
  {
    username: 'kassa',
    password: 'cashier123',
    email: 'cashier@clinic.uz',
    phone: '+998905555555',
    first_name: 'Kassa',
    last_name: 'Kassir',
    role: 'cashier',
    department: 'Kassa',
    salary: 4500000,
    description: 'Kassir - To\'lovlarni qabul qilish'
  },
  {
    username: 'laborant',
    password: 'lab123',
    email: 'lab@clinic.uz',
    phone: '+998906666666',
    first_name: 'Laborant',
    last_name: 'Laborantov',
    role: 'lab',
    department: 'Laboratoriya',
    salary: 6000000,
    description: 'Laborant - Tahlillar o\'tkazish'
  },
  {
    username: 'dorixona',
    password: 'pharmacy123',
    email: 'pharmacy@clinic.uz',
    phone: '+998907777777',
    first_name: 'Dorixona',
    last_name: 'Dorixonachi',
    role: 'pharmacist',
    department: 'Dorixona',
    salary: 5500000,
    description: 'Dorixonachi - Dori-darmonlarni berish'
  },
  {
    username: 'tozalovchi',
    password: 'cleaner123',
    email: 'cleaner@clinic.uz',
    phone: '+998908888888',
    first_name: 'Tozalovchi',
    last_name: 'Tozalovchiyev',
    role: 'cleaner',
    department: 'Xizmat',
    salary: 3000000,
    description: 'Tozalovchi - Klinikani tozalash'
  },
  {
    username: 'massajchi',
    password: 'masseur123',
    email: 'masseur@clinic.uz',
    phone: '+998909999999',
    first_name: 'Massajchi',
    last_name: 'Massajchiyev',
    role: 'masseur',
    department: 'Fizioterapiya',
    salary: 5000000,
    description: 'Massajchi - Massaj xizmatlari'
  },
  {
    username: 'logoped',
    password: 'logoped123',
    email: 'lo