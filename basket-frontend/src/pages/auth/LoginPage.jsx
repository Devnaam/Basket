import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, isLoading } = useAuthStore();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Countdown timer for resend
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
      toast.success('OTP sent successfully!');
    } else {
      toast.error(result.error);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setOtpError('Enter the 6-digit OTP');
      return;
    }
    setOtpError('');

    const result = await verifyOTP(phone.replace(/\D/g, ''), otp);
    if (result.success) {
      toast.success(result.isNewUser ? 'Welcome to Basket! 🛒' : 'Welcome back!');
      navigate('/', { replace: true });
    } else {
      setOtpError(result.error);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    const result = await sendOTP(phone.replace(/\D/g, ''));
    if (result.success) {
      startResendTimer();
      toast.success('OTP resent!');
      setOtp('');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-basket-green px-6 pt-16 pb-12 text-white">
        <h1 className="text-4xl font-extrabold mb-1">🛒 Basket</h1>
        <p className="text-green-100 text-base">Groceries in 20 minutes</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-8 pb-6 max-w-sm mx-auto w-full">
        {step === 'phone' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Enter your number</h2>
              <p className="text-gray-500 text-sm">We'll send a 6-digit OTP to verify</p>
            </div>
            <Input
              label="Mobile Number"
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="98765 43210"
              prefix="+91"
              error={phoneError}
              maxLength={10}
            />
            <Button
              fullWidth
              isLoading={isLoading}
              onClick={handleSendOTP}
              disabled={phone.length !== 10}
            >
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Verify OTP</h2>
              <p className="text-gray-500 text-sm">
                Sent to{' '}
                <span className="font-semibold text-gray-800">+91 {phone}</span>{' '}
                <button
                  onClick={() => { setStep('phone'); setOtp(''); }}
                  className="text-basket-green underline text-xs ml-1"
                >
                  Change
                </button>
              </p>
            </div>
            <Input
              label="6-Digit OTP"
              name="otp"
              type="number"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="• • • • • •"
              error={otpError}
              maxLength={6}
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
                <button
                  onClick={handleResendOTP}
                  className="text-basket-green font-semibold"
                >
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
