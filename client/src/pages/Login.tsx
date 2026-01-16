import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Rocket, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-lcars-orange rounded-full mb-4">
            <Rocket size={32} className="text-black" />
          </div>
          <h1 className="text-3xl font-bold text-lcars-orange">SOTFA Builder</h1>
          <p className="text-lcars-tan mt-2">State of the Federation Address</p>
          <p className="text-gray-500 text-sm">Starbase 118 Fleet</p>
        </div>

        {/* Login Form */}
        <div className="lcars-panel p-6">
          <div className="lcars-header px-4 py-2 text-black font-bold mb-6">
            AUTHENTICATION REQUIRED
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-lcars-red/20 border border-lcars-red p-3 rounded mb-4 text-lcars-red">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-lcars-tan text-sm mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="lcars-input"
                required
              />
            </div>

            <div>
              <label className="block text-lcars-tan text-sm mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="lcars-input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="lcars-button w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="spinner w-5 h-5 border-2"></div>
              ) : (
                'Access System'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Contact your SOTFA Committee administrator for access
        </p>
      </div>
    </div>
  );
}
