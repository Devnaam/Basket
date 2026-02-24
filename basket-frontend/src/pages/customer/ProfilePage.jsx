import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, MapPin, Plus, Trash2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import useAuthStore from '@/store/authStore';
import useSocket from '@/hooks/useSocket';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, addAddress, deleteAddress } = useAuthStore();
  const { disconnectSocket } = useSocket();

  const [showEditModal, setShowEditModal]       = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editName, setEditName]   = useState(user?.name || '');
  const [isSaving, setIsSaving]   = useState(false);
  const [newAddress, setNewAddress] = useState({ addressLine: '', landmark: '', pincode: '' });

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

  const handleAddAddress = async () => {
    if (!newAddress.addressLine || !newAddress.pincode) {
      toast.error('Address and pincode are required');
      return;
    }
    const result = await addAddress({
      ...newAddress,
      location: { type: 'Point', coordinates: [79.4192, 13.6288] },
    });
    if (result.success) {
      toast.success('Address saved!');
      setShowAddressModal(false);
      setNewAddress({ addressLine: '', landmark: '', pincode: '' });
    } else {
      toast.error(result.error);
    }
  };

  const MENU_ITEMS = [
    { icon: '📦', label: 'My Orders',         action: () => navigate('/orders') },
    { icon: '🎫', label: 'My Coupons',         action: () => toast('Coming soon!', { icon: '🎫' }) },
    { icon: '⭐', label: 'Basket Plus',         action: () => toast('Coming soon!', { icon: '⭐' }) },
    { icon: '💬', label: 'Help & Support',     action: () => toast('Coming soon!', { icon: '💬' }) },
    { icon: '🔔', label: 'Notifications',      action: () => toast('Coming soon!', { icon: '🔔' }) },
  ];

  return (
    <Layout>
      <div className="px-4 py-4 space-y-4">
        {/* Profile header card */}
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
              <div className="mt-1"><Badge variant="green">⭐ Basket Plus Active</Badge></div>
            )}
          </div>
          <button
            onClick={() => { setEditName(user?.name || ''); setShowEditModal(true); }}
            className="text-basket-green text-sm font-semibold"
          >
            Edit
          </button>
        </div>

        {/* Addresses */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-basket-green" />
              <span className="text-sm font-bold text-gray-900">Saved Addresses</span>
            </div>
            <button
              onClick={() => setShowAddressModal(true)}
              className="flex items-center gap-1 text-basket-green text-xs font-semibold"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          {user?.addresses?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-2">No saved addresses yet</p>
          ) : (
            <div className="space-y-2">
              {user?.addresses?.map((addr) => (
                <div key={addr._id} className="flex items-start justify-between gap-2 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{addr.addressLine}</p>
                    {addr.landmark && <p className="text-xs text-gray-400 mt-0.5">Near {addr.landmark}</p>}
                    <p className="text-xs text-gray-400">PIN: {addr.pincode}</p>
                  </div>
                  <button
                    onClick={() => deleteAddress(addr._id).then(() => toast.success('Removed'))}
                    className="text-gray-300 hover:text-red-400 transition-colors mt-0.5"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Menu */}
        <div className="card divide-y divide-gray-100">
          {MENU_ITEMS.map(({ icon, label, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center justify-between py-3.5"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">{icon}</span>
                <span className="text-sm font-medium text-gray-800">{label}</span>
              </div>
              <span className="text-gray-400 text-lg">›</span>
            </button>
          ))}
        </div>

        {/* App version */}
        <p className="text-center text-xs text-gray-300">Basket v1.0.0 · Groceries in 20 min ⚡</p>

        {/* Logout */}
        <Button fullWidth variant="danger" onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </Button>

        <div className="h-4" />
      </div>

      {/* Edit name modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Name">
        <div className="space-y-4">
          <Input
            label="Your Name"
            name="name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Enter your full name"
          />
          <Button fullWidth isLoading={isSaving} onClick={handleSaveName}>Save Changes</Button>
        </div>
      </Modal>

      {/* Add address modal */}
      <Modal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} title="Add Address">
        <div className="space-y-4">
          <Input
            label="Full Address"
            name="addressLine"
            value={newAddress.addressLine}
            onChange={(e) => setNewAddress((p) => ({ ...p, addressLine: e.target.value }))}
            placeholder="Street, Area, City"
          />
          <Input
            label="Landmark (Optional)"
            name="landmark"
            value={newAddress.landmark}
            onChange={(e) => setNewAddress((p) => ({ ...p, landmark: e.target.value }))}
            placeholder="Near school, temple..."
          />
          <Input
            label="Pincode"
            name="pincode"
            type="number"
            value={newAddress.pincode}
            onChange={(e) => setNewAddress((p) => ({ ...p, pincode: e.target.value }))}
            placeholder="517501"
            maxLength={6}
          />
          <Button fullWidth onClick={handleAddAddress}>Save Address</Button>
        </div>
      </Modal>
    </Layout>
  );
};

export default ProfilePage;
