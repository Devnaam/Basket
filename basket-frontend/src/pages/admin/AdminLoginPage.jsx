import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, isAuthenticated, user, isLoading } = useAuthStore();

  // Already logged in as admin
  if (isAuthenticated && user?.role === 'admin') {
    navigate('/admin', { replace: true });
    return null;
  }

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const startTimer = () => {
    setResendTimer(60);
    const iv = setInterval(() => {
      setResendTimer((t) => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; });
    }, 1000);
  };

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    const result = await sendOTP(cleaned);
    if (result.success) { setStep('otp'); startTimer(); }
    else setError(result.error);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setError('');
    const result = await verifyOTP(phone.replace(/\D/g, ''), otp);
    if (result.success) {
      const { user: loggedUser } = useAuthStore.getState();
      if (loggedUser?.role !== 'admin') {
        toast.error('Access denied. Admin accounts only.');
        useAuthStore.getState().logout();
        return;
      }
      toast.success('Welcome back, Admin! 👑');
      navigate('/admin', { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-basket-green rounded-2xl mb-4">
            <span className="text-3xl">🛒</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Basket Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Admin access only</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'phone' ? 'Enter Admin Phone' : 'Verify OTP'}
          </h2>

          {step === 'phone' ? (
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9999999999"
              prefix="+91"
            />
          ) : (
            <div className="space-y-2">
              <Input
                label="6-Digit OTP"
                name="otp"
                type="number"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
              />
              <p className="text-xs text-gray-400">
                Sent to <span className="font-semibold">+91 {phone}</span>{' '}
                <button onClick={() => setStep('phone')} className="text-basket-green underline ml-1">
                  Change
                </button>
              </p>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button
            fullWidth
            isLoading={isLoading}
            onClick={step === 'phone' ? handleSendOTP : handleVerifyOTP}
            disabled={step === 'phone' ? phone.length !== 10 : otp.length !== 6}
          >
            {step === 'phone' ? 'Send OTP' : 'Login to Dashboard'}
          </Button>

          {step === 'otp' && resendTimer > 0 && (
            <p className="text-center text-xs text-gray-400">
              Resend in <span className="font-bold text-gray-600">{resendTimer}s</span>
            </p>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Seeded admin phone: <span className="font-mono text-gray-400">9999999999</span>
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
