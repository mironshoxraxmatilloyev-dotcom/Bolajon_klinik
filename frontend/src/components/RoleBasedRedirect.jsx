import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleBasedRedirect = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    // Support both nested role object and direct role_name field
    const roleName = (user.role?.name || user.role_name)?.toLowerCase();
    const currentPath = location.pathname;

    // Har bir role uchun sidebar'dagi birinchi sahifaga yo'naltirish
    // Faqat /dashboard yoki root path'da bo'lganda
    if (currentPath === '/dashboard' || currentPath === '/') {
      let defaultPath = '/dashboard'; // Admin va Manager uchun default

      // Role'ga qarab birinchi sahifani aniqlash
      if (roleName === 'doctor' || roleName === 'shifokor') {
        defaultPath = '/dashboard'; // Dashboard - birinchi
      } else if (roleName === 'chief_doctor') {
        defaultPath = '/chief-doctor'; // Bosh shifokor paneli - birinchi
      } else if (roleName === 'reception' || roleName === 'qabulxona' || roleName === 'receptionist') {
        defaultPath = '/patients'; // Bemorlar - birinchi
      } else if (roleName === 'cashier' || roleName === 'kassa') {
        defaultPath = '/cashier'; // Kassa - birinchi
      } else if (roleName === 'nurse' || roleName === 'hamshira') {
        defaultPath = '/ambulator'; // Xonalar - birinchi
      } else if (roleName === 'lab' || roleName === 'laborant') {
        defaultPath = '/lab'; // Laborant Dashboard - birinchi
      } else if (roleName === 'cleaner' || roleName === 'tozalovchi') {
        defaultPath = '/sanitar'; // Tozalovchi paneli - birinchi
      } else if (roleName === 'pharmacy' || roleName === 'dorixona' || roleName === 'pharmacist') {
        defaultPath = '/pharmacy'; // Dorixona - birinchi
      } else if (roleName === 'masseur' || roleName === 'massajchi') {
        defaultPath = '/masseur'; // Massajchi paneli - birinchi
      } else if (roleName === 'speechtherapist' || roleName === 'logoped' || roleName === 'speech_therapist') {
        defaultPath = '/speech-therapist'; // Logoped paneli - birinchi
      }

      // Faqat agar hozirgi path /dashboard yoki / bo'lsa, redirect qilish
      if (currentPath === '/dashboard' || currentPath === '/') {
        navigate(defaultPath, { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

  return children;
};

export default RoleBasedRedirect;
