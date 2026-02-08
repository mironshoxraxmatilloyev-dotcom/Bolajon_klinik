import jwt from 'jsonwebtoken';
import Staff from '../models/Staff.js';
import Patient from '../models/Patient.js';
import { AppError } from '../utils/errors.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('Authentication required', 401);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Agar bemor token'i bo'lsa
    if (decoded.type === 'patient') {
      const patient = await Patient.findOne({
        _id: decoded.userId,
        status: 'active'
      }).select('-password -refresh_token');
      
      if (!patient) {
        throw new AppError('Patient not found or inactive', 401);
      }
      
      req.user = {
        id: patient._id.toString(),
        patient_id: patient._id.toString(),
        patient_number: patient.patient_number,
        username: patient.username || patient.patient_number,
        first_name: patient.first_name,
        last_name: patient.last_name,
        phone: patient.phone,
        role_name: 'Bemor',
        type: 'patient'
      };
      
      return next();
    }
    
    // Aks holda staff/admin token'i
    const staff = await Staff.findOne({
      _id: decoded.userId,
      status: 'active'
    }).select('-password -two_factor_secret -refresh_token');
    
    if (!staff) {
      throw new AppError('User not found or inactive', 401);
    }
    
    req.user = {
      id: staff._id.toString(),
      username: staff.username,
      email: staff.email,
      first_name: staff.first_name,
      last_name: staff.last_name,
      full_name: staff.full_name,
      role_name: staff.role,
      role: staff.role,
      phone: staff.phone,
      department: staff.department,
      specialization: staff.specialization,
      profile_image: staff.profile_image
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    // Role name mapping - support both old and new role names
    const roleMapping = {
      'admin': ['Admin', 'Administrator', 'admin'],
      'Admin': ['Admin', 'Administrator', 'admin'],
      'Administrator': ['Admin', 'Administrator', 'admin'],
      'Manager': ['Manager', 'Menejer'],
      'Menejer': ['Manager', 'Menejer'],
      'doctor': ['Doctor', 'Shifokor', 'doctor'],
      'Doctor': ['Doctor', 'Shifokor', 'doctor'],
      'Shifokor': ['Doctor', 'Shifokor', 'doctor'],
      'nurse': ['Nurse', 'Hamshira', 'nurse'],
      'Nurse': ['Nurse', 'Hamshira', 'nurse'],
      'Hamshira': ['Nurse', 'Hamshira', 'nurse'],
      'receptionist': ['Reception', 'Qabulxona', 'Registrator', 'receptionist'],
      'Reception': ['Reception', 'Qabulxona', 'Registrator', 'receptionist'],
      'Qabulxona': ['Reception', 'Qabulxona', 'Registrator', 'receptionist'],
      'Registrator': ['Reception', 'Qabulxona', 'Registrator', 'receptionist'],
      'cashier': ['Cashier', 'Kassa', 'cashier', 'Kassir'],
      'Cashier': ['Cashier', 'Kassa', 'cashier', 'Kassir'],
      'Kassa': ['Cashier', 'Kassa', 'cashier', 'Kassir'],
      'Kassir': ['Cashier', 'Kassa', 'cashier', 'Kassir'],
      'laborant': ['Lab', 'Laborant', 'laborant'],
      'Lab': ['Lab', 'Laborant', 'laborant'],
      'Laborant': ['Lab', 'Laborant', 'laborant'],
      'sanitar': ['Cleaner', 'Tozalovchi', 'sanitar'],
      'Cleaner': ['Cleaner', 'Tozalovchi', 'sanitar'],
      'Tozalovchi': ['Cleaner', 'Tozalovchi', 'sanitar'],
      'pharmacist': ['Pharmacy', 'Dorixona', 'pharmacist'],
      'Pharmacy': ['Pharmacy', 'Dorixona', 'pharmacist'],
      'Dorixona': ['Pharmacy', 'Dorixona', 'pharmacist'],
      'masseur': ['Masseur', 'Massajchi', 'masseur'],
      'Masseur': ['Masseur', 'Massajchi', 'masseur'],
      'Massajchi': ['Masseur', 'Massajchi', 'masseur'],
      'speech_therapist': ['SpeechTherapist', 'Logoped', 'speech_therapist'],
      'SpeechTherapist': ['SpeechTherapist', 'Logoped', 'speech_therapist'],
      'Logoped': ['SpeechTherapist', 'Logoped', 'speech_therapist'],
      'patient': ['Bemor', 'Patient', 'patient'],
      'Bemor': ['Bemor', 'Patient', 'patient'],
      'Patient': ['Bemor', 'Patient', 'patient']
    };
    
    // Get user's actual role
    const userRole = req.user.role_name || req.user.role;
    
    console.log('=== AUTHORIZE CHECK ===');
    console.log('User role:', userRole);
    console.log('Allowed roles:', allowedRoles);
    console.log('User object:', req.user);
    
    // Check if user's role matches any of the allowed roles (considering aliases)
    const hasPermission = allowedRoles.some(allowedRole => {
      const allowedAliases = roleMapping[allowedRole] || [allowedRole];
      const userAliases = roleMapping[userRole] || [userRole];
      
      // Check if any user alias matches any allowed alias
      return userAliases.some(userAlias => allowedAliases.includes(userAlias));
    });
    
    console.log('Has permission:', hasPermission);
    
    if (!hasPermission) {
      return next(new AppError('Insufficient permissions', 403));
    }
    
    next();
  };
};

export const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      
      // MongoDB'da permission system'i hali yo'q
      // Hozircha faqat role-based authorization ishlatamiz
      next();
    } catch (error) {
      next(error);
    }
  };
};
