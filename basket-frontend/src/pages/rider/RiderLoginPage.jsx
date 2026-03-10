import { useState, useEffect, useRef } from 'react';
import { useNavigate }                 from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import Button       from '@/components/ui/Button';
import Input        from '@/components/ui/Input';
import toast        from 'react-hot-toast';

const RiderLoginPage = () => {
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, logout, isLoading, devOtp } = useAuthStore();

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
          OTP: <strong className="text-orange-700 text-lg tracking-widest">{devOtp}</strong>
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
      setPhoneError('Enter a valid 10-digit mobile number');
      return;
    }
    setPhoneError('');
    const result = await sendOTP(cleaned);
    if (result.success) {
      setStep('otp');
      startResendTimer();
      if (!result.devOtp) toast.success('OTP sent!');
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

      // Only riders allowed on this page
      if (result.role !== 'rider') {
        toast.error('This portal is for riders only. Contact your admin.');
        logout();
        setStep('phone');
        setOtp('');
        return;
      }

      toast.success('Welcome back, Rider! 🏍️');
      navigate('/rider', { replace: true });
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

      {/* Header — orange for rider */}
      <div className="bg-orange-500 px-6 pt-16 pb-12 text-white">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🏍️</span>
          <h1 className="text-3xl font-extrabold">Basket Rider</h1>
        </div>
        <p className="text-orange-100 text-base">Deliver. Earn. Repeat.</p>
      </div>

      <div className="flex-1 px-6 pt-8 pb-6 max-w-sm mx-auto w-full">

        {/* Info notice */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 mb-6 flex gap-3">
          <span className="text-xl flex-shrink-0">ℹ️</span>
          <p className="text-xs text-orange-700 leading-relaxed">
            Rider accounts are created by the admin. If you can't log in,
            contact your store manager to get registered.
          </p>
        </div>

        {/* STEP 1 — Phone */}
        {step === 'phone' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Rider Login</h2>
              <p className="text-gray-500 text-sm">Enter your registered mobile number</p>
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
              className="!bg-orange-500 hover:!bg-orange-600"
            >
              Send OTP
            </Button>
          </div>
        )}

        {/* STEP 2 — OTP */}
        {step === 'otp' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Enter OTP</h2>
              <p className="text-gray-500 text-sm">
                Sent to{' '}
                <span className="font-semibold text-gray-800">+91 {phone}</span>{' '}
                <button
                  onClick={() => { setStep('phone'); setOtp(''); setOtpError(''); }}
                  className="text-orange-500 underline text-xs ml-1"
                >
                  Change
                </button>
              </p>
            </div>

            {devOtp && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">🧪</span>
                <div>
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Dev Mode</p>
                  <p className="text-orange-800 font-mono font-extrabold text-2xl tracking-widest mt-0.5">
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
              className="!bg-orange-500 hover:!bg-orange-600"
            >
              Verify & Continue
            </Button>

            <div className="text-center text-sm text-gray-500">
              {resendTimer > 0 ? (
                <span>Resend in <strong>{resendTimer}s</strong></span>
              ) : (
                <button onClick={handleResendOTP} className="text-orange-500 font-semibold">
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

export default RiderLoginPage;
