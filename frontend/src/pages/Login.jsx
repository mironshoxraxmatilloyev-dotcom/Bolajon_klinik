import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Always staff login (no patient login from web)
      const result = await login(formData.username, formData.password, false);
      
      if (result.success) {
        // Redirect based on role
        const roleName = result.user?.role?.name || result.user?.role_name;
        
        if (roleName === 'admin') {
          navigate('/dashboard');
        } else if (roleName === 'doctor') {
          navigate('/doctor');
        } else if (roleName === 'nurse') {
          navigate('/nurse');
        } else if (roleName === 'laborant') {
          navigate('/lab');
        } else if (roleName === 'pharmacist') {
          navigate('/pharmacy');
        } else if (roleName === 'sanitar') {
          navigate('/sanitar');
        } else if (roleName === 'receptionist') {
          navigate('/patients'); // Qabulxona to'g'ridan-to'g'ri Bemorlar sahifasiga
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.message || 'Login yoki parol noto\'g\'ri');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message || 
        'Tizimga kirishda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-emerald-900/20 dark:to-blue-900/20">
        {/* Animated Circles */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-300/30 dark:bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-300/30 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-300/20 dark:bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo va Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <img 
                src="/image.jpg?v=20250204"
                alt="Klinika Logo" 
                className="h-28 w-auto object-contain relative z-10 drop-shadow-2xl"
              />
            </div>
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
            Xush kelibsiz! 
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-base">
            Tizimga kirish uchun ma'lumotlaringizni kiriting
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/50 animate-slideUp">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                Login
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-2xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors z-10">
                  <span className="material-symbols-outlined text-xl">person</span>
                </span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  autoFocus
                  className="relative w-full pl-12 pr-4 py-4 bg-gray-50/50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 dark:focus:ring-emerald-500 dark:focus:border-emerald-500 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 font-medium"
                  placeholder="hamshira"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                Parol
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-2xl opacity-0 group-focus-within:opacity-20 blur transition-opacity"></div>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors z-10">
                  <span className="material-symbols-outlined text-xl">lock</span>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="relative w-full pl-12 pr-12 py-4 bg-gray-50/50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 dark:focus:ring-emerald-500 dark:focus:border-emerald-500 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors z-10"
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-2xl text-sm flex items-start gap-3 animate-fadeIn backdrop-blur-sm">
                <span className="material-symbols-outlined text-lg mt-0.5">error</span>
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold py-4 px-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transform overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {loading ? (
                <span className="relative flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Yuklanmoqda...
                </span>
              ) : (
                <span className="relative flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-xl">login</span>
                  Kirish
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
          >
            <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Bosh sahifaga qaytish
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          © 2026 Bolajon klinikasi. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  );
};

export default Login;
