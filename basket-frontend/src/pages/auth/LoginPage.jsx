import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link }           from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import Button       from '@/components/ui/Button';
import Input        from '@/components/ui/Input';
import toast        from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, isLoading, devOtp } = useAuthStore();

  const [step,        setStep]        = useState('phone');
  const [phone,       setPhone]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [phoneError,  setPhoneError]  = useState('');
  const [otpError,    setOtpError]    = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const devToastRef = useRef(null);

  useEffect(() => {
    if (devOtp && step === 'otp') {
      setOtp(devOtp);
      if (devToastRef.current) toast.dismiss(devToastRef.current);
      devToastRef.current = toast(
        <span>
          <strong>DEV MODE 🔐</strong><br />
          OTP: <strong className="text-green-700 text-lg tracking-widest">{devOtp}</strong>
        </span>,
        { duration: 60000, icon: '🧪' }
      );
    }
  }, [devOtp, step]);

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setPhoneError('');
    const result = await sendOTP(cleaned);
    if (result.success) {
      setStep('otp');
      startResendTimer();
      if (!result.devOtp) toast.success('OTP sent successfully!');
    } else {
      toast.error(result.error);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { setOtpError('Enter the 6-digit OTP'); return; }
    setOtpError('');

    const result = await verifyOTP(phone.replace(/\D/g, ''), otp);

    if (result.success) {
      if (devToastRef.current) toast.dismiss(devToastRef.current);

      // ── Block wrong role from using customer login ──────────────
      if (result.role === 'admin') {
        toast.error('Please use the Admin login page.');
        navigate('/admin/login', { replace: true });
        return;
      }
      if (result.role === 'rider') {
        toast.error('Please use the Rider login page.');
        navigate('/rider/login', { replace: true });
        return;
      }

      // ── New user → setup profile first ─────────────────────────
      if (result.isNewUser) {
        toast.success("Welcome to Basket! Let's set up your profile 🛒");
        navigate('/setup-profile', { replace: true });
      } else {
        toast.success('Welcome back! 👋');
        navigate('/', { replace: true });
      }
    } else {
      setOtpError(result.error);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    const result = await sendOTP(phone.replace(/\D/g, ''));
    if (result.success) {
      startResendTimer();
      setOtp('');
      toast.success(result.devOtp ? `DEV OTP: ${result.devOtp}` : 'OTP resent!');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-basket-green px-6 pt-16 pb-12 text-white">
        <h1 className="text-4xl font-extrabold mb-1">🛒 Basket</h1>
        <p className="text-green-100 text-base">Groceries in 20 minutes</p>
      </div>

      <div className="flex-1 px-6 pt-8 pb-6 max-w-sm mx-auto w-full">

        {/* ── STEP 1: Phone ──────────────────────────────────────── */}
        {step === 'phone' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Login / Register</h2>
              <p className="text-gray-500 text-sm">
                New or returning — just enter your mobile number
              </p>
            </div>

            <Input
              label="Mobile Number"
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                setPhoneError('');
              }}
              placeholder="98765 43210"
              prefix="+91"
              error={phoneError}
              maxLength={10}
              autoFocus
            />

            <Button
              fullWidth
              isLoading={isLoading}
              onClick={handleSendOTP}
              disabled={phone.length !== 10}
            >
              Send OTP
            </Button>

            {/* Other portals */}
            <div className="pt-4 border-t border-gray-100 text-center space-y-2">
              <p className="text-xs text-gray-400">Other portals</p>
              <div className="flex justify-center gap-6">
                <Link to="/admin/login" className="text-xs text-gray-400 hover:text-basket-green underline">
                  Admin Login
                </Link>
                <Link to="/rider/login" className="text-xs text-gray-400 hover:text-basket-green underline">
                  Rider Login
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: OTP ────────────────────────────────────────── */}
        {step === 'otp' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Enter OTP</h2>
              <p className="text-gray-500 text-sm">
                Sent to{' '}
                <span className="font-semibold text-gray-800">+91 {phone}</span>{' '}
                <button
                  onClick={() => { setStep('phone'); setOtp(''); setOtpError(''); }}
                  className="text-basket-green underline text-xs ml-1"
                >
                  Change
                </button>
              </p>
            </div>

            {/* DEV OTP banner */}
            {devOtp && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">🧪</span>
                <div>
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Dev Mode</p>
                  <p className="text-green-800 font-mono font-extrabold text-2xl tracking-widest mt-0.5">
                    {devOtp}
                  </p>
                </div>
              </div>
            )}

            <Input
              label="6-Digit OTP"
              name="otp"
              type="number"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                setOtpError('');
              }}
              placeholder="• • • • • •"
              error={otpError}
              maxLength={6}
              autoFocus
            />

            <Button
              fullWidth
              isLoading={isLoading}
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6}
            >
              Verify & Continue
            </Button>

            <div className="text-center text-sm text-gray-500">
              {resendTimer > 0 ? (
                <span>Resend OTP in <strong className="text-gray-700">{resendTimer}s</strong></span>
              ) : (
                <button onClick={handleResendOTP} className="text-basket-green font-semibold">
                  Resend OTP
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
