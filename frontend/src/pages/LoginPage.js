import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Warehouse, EnvelopeSimple, Lock, Eye, EyeSlash, ArrowRight } from '@phosphor-icons/react';

const DEMO_USER = {
  name: 'Admin User',
  email: 'admin@ghostclear.io',
  role: 'Warehouse Manager',
  avatar: null,
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@ghostclear.io');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    setTimeout(() => {
      sessionStorage.setItem('gc_user', JSON.stringify({ ...DEMO_USER, email }));
      navigate('/', { replace: true });
    }, 600);
  };

  return (
    <div className="min-h-screen flex bg-[#0B0F19]">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col items-center justify-center p-12">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #F8FAFC 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/10 via-transparent to-[#10B981]/5" />

        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-[#3B82F6] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-[#3B82F6]/20">
            <Warehouse size={40} weight="bold" className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#F8FAFC] mb-3">GhostClear</h1>
          <p className="text-sm text-[#B0B8C4] leading-relaxed mb-8">
            Port container intelligence platform. Track, trace, and clear ghost cargo across global supply chains.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-[#4A5568]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span>Real-time Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              <span>AI Anomaly Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F97316]" />
              <span>Trust Scoring</span>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between text-[10px] text-[#2A3441] font-mono">
          <span>v2.4.1</span>
          <span>Port Alpha</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6] flex items-center justify-center">
              <Warehouse size={22} weight="bold" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#F8FAFC]">GhostClear</h1>
              <span className="text-[10px] text-[#4A5568]">Warehouse Storage</span>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Welcome back</h2>
          <p className="text-sm text-[#B0B8C4] mb-8">Sign in to access your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#B0B8C4] mb-1.5">Email</label>
              <div className="relative">
                <EnvelopeSimple size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5568]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#121620] border border-[#2A3441] rounded-lg text-sm text-[#F8FAFC] placeholder-[#4A5568] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 transition-colors"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B0B8C4] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5568]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-[#121620] border border-[#2A3441] rounded-lg text-sm text-[#F8FAFC] placeholder-[#4A5568] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5568] hover:text-[#B0B8C4] transition-colors">
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-[#EF4444]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg hover:bg-[#2563EB] disabled:opacity-60 transition-all duration-200"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={16} weight="bold" /></>
              )}
            </button>
          </form>

          <p className="text-[10px] text-[#2A3441] text-center mt-8 font-mono">
            Demo environment — any credentials accepted
          </p>
        </div>
      </div>
    </div>
  );
}
