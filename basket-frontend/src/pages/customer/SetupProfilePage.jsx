import { useState }    from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore    from '@/store/authStore';
import Button          from '@/components/ui/Button';
import Input           from '@/components/ui/Input';
import toast           from 'react-hot-toast';

const SetupProfilePage = () => {
  const navigate = useNavigate();
  const { updateProfile, user } = useAuthStore();

  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [nameError, setNameError] = useState('');
  const [isSaving,  setIsSaving]  = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Please enter your full name (at least 2 characters)');
      return;
    }
    setNameError('');
    setIsSaving(true);

    const payload = { name: name.trim() };
    if (email.trim()) payload.email = email.trim().toLowerCase();

    const result = await updateProfile(payload);
    setIsSaving(false);

    if (result.success) {
      toast.success("You're all set! Let's shop 🛒");
      navigate('/', { replace: true });
    } else {
      toast.error(result.error || 'Failed to save. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <div className="bg-basket-green px-6 pt-16 pb-12 text-white">
        <h1 className="text-4xl font-extrabold mb-1">🛒 Basket</h1>
        <p className="text-green-100 text-base">Almost there!</p>
      </div>

      <div className="flex-1 px-6 pt-8 pb-8 max-w-sm mx-auto w-full flex flex-col justify-between">

        <div className="space-y-8">
          {/* Welcome */}
          <div className="text-center pt-4">
            <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-basket-green mx-auto flex items-center justify-center text-4xl mb-4">
              👋
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome!</h2>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
              Registered with <strong className="text-gray-700">+91 {user?.phone}</strong>.
              <br />Just tell us your name to get started.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <Input
              label="Your Name *"
              name="name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="e.g. Rahul Sharma"
              error={nameError}
              autoFocus
            />
            <Input
              label="Email (optional)"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-8">
          <Button
            fullWidth
            size="lg"
            isLoading={isSaving}
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save & Start Shopping
          </Button>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full text-center text-sm text-gray-400 py-2 hover:text-gray-600"
          >
            Skip for now
          </button>
          <p className="text-center text-xs text-gray-300">
            You can update your profile anytime from the Profile page
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetupProfilePage;
