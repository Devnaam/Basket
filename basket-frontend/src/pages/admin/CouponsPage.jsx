import { useEffect, useState } from 'react';
import DataTable from '@/components/admin/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import useAdminStore from '@/store/adminStore';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  code: '', type: 'percentage', value: '', minOrderAmount: '0',
  maxDiscount: '', maxUses: '', expiresAt: '', description: '',
};

const CouponsPage = () => {
  const { coupons, isLoadingCoupons, fetchCoupons, createCoupon, updateCoupon, deleteCoupon } = useAdminStore();
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchCoupons(); }, []);

  const openCreate = () => { setEditingCoupon(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscount: coupon.maxDiscount || '',
      maxUses: coupon.maxUses || '',
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 10) : '',
      description: coupon.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.value) { toast.error('Code and value are required'); return; }
    setIsSaving(true);
    const payload = {
      ...form,
      code: form.code.toUpperCase(),
      value: parseFloat(form.value),
      minOrderAmount: parseFloat(form.minOrderAmount) || 0,
      maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : undefined,
      maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
      expiresAt: form.expiresAt || undefined,
    };
    const result = editingCoupon
      ? await updateCoupon(editingCoupon._id, payload)
      : await createCoupon(payload);

    setIsSaving(false);
    if (result.success) {
      toast.success(editingCoupon ? 'Coupon updated!' : 'Coupon created!');
      setShowModal(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleDeactivate = async (coupon) => {
    if (!window.confirm(`Deactivate coupon ${coupon.code}?`)) return;
    const result = await deleteCoupon(coupon._id);
    if (result.success) toast.success('Coupon deactivated');
    else toast.error(result.error);
  };

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const columns = [
    {
      key: 'code', header: 'Code',
      render: (row) => (
        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg text-sm">
          {row.code}
        </span>
      ),
    },
    {
      key: 'type', header: 'Type & Value',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {row.type === 'percentage' ? `${row.value}% OFF` : `₹${row.value} OFF`}
          </p>
          {row.maxDiscount && (
            <p className="text-xs text-gray-400">Max ₹{row.maxDiscount}</p>
          )}
        </div>
      ),
    },
    {
      key: 'minOrderAmount', header: 'Min Order',
      render: (row) => <span className="text-sm">₹{row.minOrderAmount}</span>,
    },
    {
      key: 'usage', header: 'Usage',
      render: (row) => (
        <span className="text-sm">
          {row.usedCount || 0}{row.maxUses ? ` / ${row.maxUses}` : ' uses'}
        </span>
      ),
    },
    {
      key: 'expiresAt', header: 'Expires',
      render: (row) => (
        <span className="text-xs text-gray-500">
          {row.expiresAt
            ? new Date(row.expiresAt).toLocaleDateString('en-IN')
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'isActive', header: 'Status', width: '90px',
      render: (row) => (
        <Badge variant={row.isActive ? 'green' : 'red'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: 'Actions', width: '120px',
      render: (row) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(row)} className="text-xs text-blue-600 font-semibold hover:underline">Edit</button>
          {row.isActive && (
            <button onClick={() => handleDeactivate(row)} className="text-xs text-red-500 font-semibold hover:underline">Disable</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>+ Create Coupon</Button>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4">
        <p className="text-sm text-gray-500 mb-3">{coupons.length} coupons</p>
        <DataTable columns={columns} data={coupons} isLoading={isLoadingCoupons} />
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editingCoupon ? `Edit — ${editingCoupon.code}` : 'Create Coupon'}>
        <div className="space-y-3">
          <Input label="Coupon Code *" name="code" value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
            placeholder="WELCOME50" />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Discount Type *</label>
              <select value={form.type} onChange={f('type')} className="input-field">
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
                <option value="free_delivery">Free Delivery</option>
              </select>
            </div>
            <Input label="Value *" name="value" type="number" value={form.value} onChange={f('value')}
              placeholder={form.type === 'percentage' ? '10 (%)' : '50 (₹)'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Min Order (₹)" name="minOrderAmount" type="number" value={form.minOrderAmount} onChange={f('minOrderAmount')} />
            <Input label="Max Discount (₹)" name="maxDiscount" type="number" value={form.maxDiscount} onChange={f('maxDiscount')} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Max Uses" name="maxUses" type="number" value={form.maxUses} onChange={f('maxUses')} placeholder="Leave empty = unlimited" />
            <Input label="Expires On" name="expiresAt" type="date" value={form.expiresAt} onChange={f('expiresAt')} />
          </div>
          <Input label="Description" name="description" value={form.description} onChange={f('description')} placeholder="50% off on first order!" />
          <Button fullWidth isLoading={isSaving} onClick={handleSave}>
            {editingCoupon ? 'Save Changes' : 'Create Coupon'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CouponsPage;
