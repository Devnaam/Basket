import { useState }  from 'react';
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

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Please enter your full name (min 2 characters)');
      return;
    }
    setNameError('');
    setIsSaving(true);

    const payload = { name: name.trim() };
    if (email.trim()) payload.email = email.trim().toLowerCase();

    const result = await updateProfile(payload);
    setIsSaving(false);

    if (result.success) {
      toast.success('Profile set up! Let\'s shop 🛒');
      navigate('/', { replace: true });
    } else {
      toast.error(result.error || 'Failed to save profile');
    }
  };

  const handleSkip = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <div className="bg-basket-green px-6 pt-16 pb-12 text-white">
        <h1 className="text-4xl font-extrabold mb-1">🛒 Basket</h1>
        <p className="text-green-100 text-base">Let's set up your profile</p>
      </div>

      <div className="flex-1 px-6 pt-8 pb-6 max-w-sm mx-auto w-full space-y-8">

        {/* Welcome message */}
        <div className="text-center py-4">
          <div className="w-20 h-20 rounded-full bg-basket-green mx-auto flex items-center justify-center text-4xl mb-4">
            👋
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome!</h2>
          <p className="text-gray-500 text-sm mt-1">
            You're registered with <strong>+91 {user?.phone}</strong>.
            <br />Just tell us your name to get started.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Input
            label="Your Name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError('');
            }}
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
            placeholder="you@email.com"
          />
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            fullWidth
            size="lg"
            isLoading={isSaving}
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            Save & Continue
          </Button>

          <button
            onClick={handleSkip}
            className="w-full text-center text-sm text-gray-400 py-2 hover:text-gray-600"
          >
            Skip for now
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          You can always update your profile later from the Profile page.
        </p>
      </div>
    </div>
  );
};

export default SetupProfilePage;
