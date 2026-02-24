import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, MapPin, Plus, Trash2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import AddressPicker from '@/components/maps/AddressPicker';  // ← Phase 9
import useAuthStore from '@/store/authStore';
import useSocket from '@/hooks/useSocket';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, addAddress, deleteAddress } = useAuthStore();
  const { disconnectSocket } = useSocket();

  const [showEditModal,     setShowEditModal]     = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);  // ← Phase 9
  const [editName,  setEditName]  = useState(user?.name || '');
  const [isSaving,  setIsSaving]  = useState(false);

  const handleLogout = async () => {
    disconnectSocket();
    await logout();
    navigate('/login', { replace: true });
    toast.success('Logged out!');
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    const result = await updateProfile({ name: editName.trim() });
    setIsSaving(false);
    if (result.success) {
      toast.success('Profile updated!');
      setShowEditModal(false);
    } else {
      toast.error(result.error);
    }
  };

  // ── Phase 9: Handle confirmed address from map picker ─────────────
  const handleAddressConfirmed = async (addressData) => {
    const result = await addAddress(addressData);
    if (result.success) {
      toast.success('📍 Address saved!');
      setShowAddressPicker(false);
    } else {
      toast.error(result.error);
    }
  };

  const MENU_ITEMS = [
    { icon: '📦', label: 'My Orders',      action: () => navigate('/orders')                    },
    { icon: '🎫', label: 'My Coupons',     action: () => toast('Coming soon!', { icon: '🎫' }) },
    { icon: '⭐', label: 'Basket Plus',    action: () => toast('Coming soon!', { icon: '⭐' }) },
    { icon: '💬', label: 'Help & Support', action: () => toast('Coming soon!', { icon: '💬' }) },
    { icon: '🔔', label: 'Notifications',  action: () => toast('Coming soon!', { icon: '🔔' }) },
  ];

  return (
    <>
      <Layout>
        <div className="px-4 py-4 space-y-4">

          {/* ── Profile header card ───────────────────────────── */}
          <div className="card flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-basket-green flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl font-extrabold">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-gray-900">{user?.name || 'Set your name'}</p>
              <p className="text-sm text-gray-500">+91 {user?.phone}</p>
              {user?.basketPlus?.isActive && (
                <div className="mt-1">
                  <Badge variant="green">⭐ Basket Plus Active</Badge>
                </div>
              )}
            </div>
            <button
              onClick={() => { setEditName(user?.name || ''); setShowEditModal(true); }}
              className="text-basket-green text-sm font-semibold"
            >
              Edit
            </button>
          </div>

          {/* ── Saved Addresses ───────────────────────────────── */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-basket-green" />
                <span className="text-sm font-bold text-gray-900">Saved Addresses</span>
              </div>
              <button
                onClick={() => setShowAddressPicker(true)}
                className="flex items-center gap-1 text-basket-green text-xs font-semibold"
              >
                <Plus size={14} /> Add on Map
              </button>
            </div>

            {user?.addresses?.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm mb-3">No saved addresses yet</p>
                <Button size="sm" onClick={() => setShowAddressPicker(true)}>
                  📍 Pick on Map
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {user?.addresses?.map((addr) => (
                  <div
                    key={addr._id}
                    className="flex items-start justify-between gap-2 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{addr.addressLine}</p>
                      {addr.landmark && (
                        <p className="text-xs text-gray-400 mt-0.5">Near {addr.landmark}</p>
                      )}
                      <p className="text-xs text-gray-400">PIN: {addr.pincode}</p>
                    </div>
                    <button
                      onClick={() => deleteAddress(addr._id).then(() => toast.success('Removed'))}
                      className="text-gray-300 hover:text-red-400 transition-colors mt-0.5 flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Menu items ────────────────────────────────────── */}
          <div className="card divide-y divide-gray-100">
            {MENU_ITEMS.map(({ icon, label, action }) => (
              <button key={label} onClick={action}
                className="w-full flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-base">{icon}</span>
                  <span className="text-sm font-medium text-gray-800">{label}</span>
                </div>
                <span className="text-gray-400 text-lg">›</span>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-gray-300">
            Basket v1.0.0 · Groceries in 20 min ⚡
          </p>

          <Button fullWidth variant="danger" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </Button>

          <div className="h-4" />
        </div>
      </Layout>

      {/* ── Edit name modal ───────────────────────────────── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Name">
        <div className="space-y-4">
          <Input
            label="Your Name"
            name="name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Enter your full name"
          />
          <Button fullWidth isLoading={isSaving} onClick={handleSaveName}>
            Save Changes
          </Button>
        </div>
      </Modal>

      {/* ── Phase 9: Full-screen map address picker ───────── */}
      {showAddressPicker && (
        <AddressPicker
          onClose={() => setShowAddressPicker(false)}
          onConfirm={handleAddressConfirmed}
        />
      )}
    </>
  );
};

export default ProfilePage;
