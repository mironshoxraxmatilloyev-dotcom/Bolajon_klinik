import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRedirect from './components/RoleBasedRedirect';

// Eager load - critical pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import PatientLayout from './layouts/PatientLayout';

// Lazy load - non-critical pages with prefetch hints
const Dashboard = lazy(() => import(/* webpackPrefetch: true */ './pages/Dashboard'));
const DoctorPanel = lazy(() => import(/* webpackPrefetch: true */ './pages/DoctorPanel'));
const ChiefDoctorPanel = lazy(() => import(/* webpackPrefetch: true */ './pages/ChiefDoctorPanel'));
const OnDutyDoctors = lazy(() => import(/* webpackPrefetch: true */ './pages/OnDutyDoctors'));
const Patients = lazy(() => import(/* webpackPrefetch: true */ './pages/Patients'));
const PatientProfile = lazy(() => import('./pages/PatientProfile'));
const PatientEdit = lazy(() => import('./pages/PatientEdit'));
const PatientPrescriptions = lazy(() => import('./pages/PatientPrescriptions'));
const Queue = lazy(() => import(/* webpackPrefetch: true */ './pages/Queue'));
const QueueManagement = lazy(() => import(/* webpackPrefetch: true */ './pages/QueueManagement'));
const CashierAdvanced = lazy(() => import('./pages/CashierAdvanced'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Inpatient = lazy(() => import('./pages/Inpatient'));
const StaffManagementAdvanced = lazy(() => import('./pages/StaffManagementAdvanced'));
const Laboratory = lazy(() => import('./pages/Laboratory'));
const LabResultView = lazy(() => import('./pages/LabResultView'));
const LaborantPanel = lazy(() => import('./pages/LaborantPanel'));
const LabPharmacy = lazy(() => import('./pages/LabPharmacy'));
const NursePanel = lazy(() => import('./pages/NursePanel'));
const SanitarPanel = lazy(() => import('./pages/SanitarPanel'));
const PharmacyPanel = lazy(() => import('./pages/PharmacyPanel'));
const ReceptionPanel = lazy(() => import('./pages/ReceptionPanel'));
const MasseurPanel = lazy(() => import('./pages/MasseurPanel'));
const SpeechTherapistPanel = lazy(() => import('./pages/SpeechTherapistPanel'));
const AmbulatorRoom = lazy(() => import('./pages/AmbulatorRoom'));
const Communications = lazy(() => import('./pages/Communications'));
const Reports = lazy(() => import('./pages/Reports'));
const CashierReports = lazy(() => import('./pages/CashierReports'));
const Expenses = lazy(() => import('./pages/Expenses'));
const PayrollManagement = lazy(() => import('./pages/PayrollManagement'));
const MySalary = lazy(() => import('./pages/MySalary'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const Settings = lazy(() => import('./pages/Settings'));
const PatientPortal = lazy(() => import('./pages/PatientPortal'));
const PatientSettings = lazy(() => import('./pages/PatientSettings'));

// Optimized loading component - minimal va tez
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Initialize theme on app load
    const savedTheme = localStorage.getItem('theme') || 'auto';
    
    const getAutoTheme = () => {
      const hour = new Date().getHours();
      // 7:00 - 19:00 = light, 19:00 - 7:00 = dark
      const isDark = hour < 7 || hour >= 19;
      return isDark ? 'dark' : 'light';
    };

    let appliedTheme = savedTheme;
    if (savedTheme === 'auto') {
      appliedTheme = getAutoTheme();
    }

    if (appliedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Initialize language on app load
    const savedLanguage = localStorage.getItem('language') || 'uz';
    i18n.changeLanguage(savedLanguage);
    document.documentElement.lang = savedLanguage;
  }, [i18n]);

  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <RoleBasedRedirect>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Login />} />
              
              {/* Reception Routes */}
              <Route path="/reception" element={<ProtectedRoute><DashboardLayout><ReceptionPanel /></DashboardLayout></ProtectedRoute>} />
              
              {/* Patient Portal Routes - TEMPORARILY DISABLED 
              <Route path="/patient/portal" element={<PatientLayout><PatientPortal /></PatientLayout>} />
              <Route path="/patient/dashboard" element={<PatientLayout><PatientPortal /></PatientLayout>} />
              <Route path="/patient/profile" element={<PatientLayout><PatientPortal /></PatientLayout>} />
              <Route path="/patient/appointments" element={<PatientLayout><PatientPortal /></PatientLayout>} />
              <Route path="/patient/prescriptions" element={<PatientLayout><PatientPortal /></PatientLayout>} />
              <Route path="/patient/queue" element={<PatientLayout><PatientPortal /></PatientLayout>} />
              <Route path="/patient/notifications" element={<PatientLayout><PatientPortal /></PatientLayout>} />
              <Route path="/patient/settings" element={<PatientLayout><PatientSettings /></PatientLayout>} />
              */}
              
              {/* Protected Dashboard Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
              <Route path="/doctor" element={<ProtectedRoute><DashboardLayout><DoctorPanel /></DashboardLayout></ProtectedRoute>} />
              <Route path="/chief-doctor" element={<ProtectedRoute><DashboardLayout><ChiefDoctorPanel /></DashboardLayout></ProtectedRoute>} />
              <Route path="/on-duty-doctors" element={<ProtectedRoute><DashboardLayout><OnDutyDoctors /></DashboardLayout></ProtectedRoute>} />
              <Route path="/patients" element={<ProtectedRoute><DashboardLayout><Patients /></DashboardLayout></ProtectedRoute>} />
              <Route path="/patients/:id" element={<ProtectedRoute><DashboardLayout><PatientProfile /></DashboardLayout></ProtectedRoute>} />
              <Route path="/patients/:id/edit" element={<ProtectedRoute><DashboardLayout><PatientEdit /></DashboardLayout></ProtectedRoute>} />
              <Route path="/patients/:id/prescriptions" element={<ProtectedRoute><DashboardLayout><PatientPrescriptions /></DashboardLayout></ProtectedRoute>} />
              <Route path="/queue" element={<ProtectedRoute><DashboardLayout><QueueManagement /></DashboardLayout></ProtectedRoute>} />
              <Route path="/queue/simple" element={<ProtectedRoute><DashboardLayout><Queue /></DashboardLayout></ProtectedRoute>} />
              <Route path="/ambulator" element={<ProtectedRoute><DashboardLayout><AmbulatorRoom /></DashboardLayout></ProtectedRoute>} />
              <Route path="/cashier" element={<ProtectedRoute><DashboardLayout><CashierAdvanced /></DashboardLayout></ProtectedRoute>} />
              <Route path="/cashier/advanced" element={<ProtectedRoute><DashboardLayout><CashierAdvanced /></DashboardLayout></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><DashboardLayout><Invoices /></DashboardLayout></ProtectedRoute>} />
              <Route path="/inpatient" element={<ProtectedRoute><DashboardLayout><Inpatient /></DashboardLayout></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute><DashboardLayout><StaffManagementAdvanced /></DashboardLayout></ProtectedRoute>} />
              <Route path="/lab" element={<ProtectedRoute><DashboardLayout><LaborantPanel /></DashboardLayout></ProtectedRoute>} />
              <Route path="/nurse" element={<ProtectedRoute><DashboardLayout><NursePanel /></DashboardLayout></ProtectedRoute>} />
              <Route path="/sanitar" element={<ProtectedRoute><DashboardLayout><SanitarPanel /></DashboardLayout></ProtectedRoute>} />
              <Route path="/pharmacy" element={<ProtectedRoute><DashboardLayout><PharmacyPanel /></DashboardLayout></ProtectedRoute>} />
              <Route path="/masseur" element={<ProtectedRoute><DashboardLayout><MasseurPanel /></DashboardLayout></ProtectedRoute>} />
              <Route path="/speech-therapist" element={<ProtectedRoute><DashboardLayout><SpeechTherapistPanel /></DashboardLayout></ProtectedRoute>} />
              <Route path="/laboratory" element={<ProtectedRoute><DashboardLayout><Laboratory /></DashboardLayout></ProtectedRoute>} />
              <Route path="/laboratory/result/:orderId" element={<ProtectedRoute><LabResultView /></ProtectedRoute>} />
              <Route path="/lab-pharmacy" element={<ProtectedRoute><DashboardLayout><LabPharmacy /></DashboardLayout></ProtectedRoute>} />
              <Route path="/communications" element={<ProtectedRoute><DashboardLayout><Communications /></DashboardLayout></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><DashboardLayout><Reports /></DashboardLayout></ProtectedRoute>} />
              <Route path="/cashier-reports" element={<ProtectedRoute><DashboardLayout><CashierReports /></DashboardLayout></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><DashboardLayout><Expenses /></DashboardLayout></ProtectedRoute>} />
              <Route path="/payroll" element={<ProtectedRoute><DashboardLayout><PayrollManagement /></DashboardLayout></ProtectedRoute>} />
              <Route path="/my-salary" element={<ProtectedRoute><DashboardLayout><MySalary /></DashboardLayout></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><DashboardLayout><TaskManagement /></DashboardLayout></ProtectedRoute>} />
              <Route path="/my-tasks" element={<ProtectedRoute><DashboardLayout><MyTasks /></DashboardLayout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
              
              {/* Redirect unknown routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RoleBasedRedirect>
      </Router>
    </AuthProvider>
  );
}

export default App;
