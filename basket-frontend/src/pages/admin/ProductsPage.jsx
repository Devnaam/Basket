import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import useAdminStore from '@/store/adminStore';
import useDebounce from '@/hooks/useDebounce';
import toast from 'react-hot-toast';

const CATEGORIES = ['Vegetables','Fruits','Dairy','Groceries','Snacks','Beverages','Personal Care','Cleaning'];

const EMPTY_FORM = {
  name: '', category: 'Vegetables', subcategory: '', brand: '',
  price: '', mrp: '', unit: 'kg', quantity: '1',
  description: '', stock: '', lowStockThreshold: '10',
  darkStore: '', images: [],
};

const ProductsPage = () => {
  const { products, productsPagination, isLoadingProducts, fetchProducts, createProduct, updateProduct, toggleProduct } = useAdminStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    fetchProducts({ search: debouncedSearch, category: categoryFilter });
  }, [debouncedSearch, categoryFilter]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category: product.category,
      subcategory: product.subcategory || '',
      brand: product.brand || '',
      price: product.price,
      mrp: product.mrp,
      unit: product.unit,
      quantity: product.quantity,
      description: product.description || '',
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold || 10,
      darkStore: product.darkStore?._id || product.darkStore || '',
      images: product.images || [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.mrp || !form.stock) {
      toast.error('Name, price, MRP and stock are required');
      return;
    }
    setIsSaving(true);
    const payload = {
      ...form,
      price: parseFloat(form.price),
      mrp: parseFloat(form.mrp),
      stock: parseInt(form.stock),
      quantity: parseFloat(form.quantity),
      lowStockThreshold: parseInt(form.lowStockThreshold),
    };

    const result = editingProduct
      ? await updateProduct(editingProduct._id, payload)
      : await createProduct(payload);

    setIsSaving(false);
    if (result.success) {
      toast.success(editingProduct ? 'Product updated!' : 'Product created!');
      setShowModal(false);
      fetchProducts({ search: debouncedSearch, category: categoryFilter });
    } else {
      toast.error(result.error);
    }
  };

  const handleToggle = async (product) => {
    const action = product.isActive ? 'deactivate' : 'activate';
    const result = await toggleProduct(product._id);
    if (result.success) toast.success(`Product ${action}d`);
    else toast.error(result.error);
  };

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const columns = [
    {
      key: 'image', header: '', width: '50px',
      render: (row) => (
        <img
          src={row.images?.[0] || 'https://placehold.co/40x40?text=N'}
          alt={row.name}
          className="w-10 h-10 rounded-xl object-cover bg-gray-100"
        />
      ),
    },
    {
      key: 'name', header: 'Product',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-gray-900 max-w-[180px] truncate">{row.name}</p>
          <p className="text-xs text-gray-400">{row.category} · {row.brand || '—'}</p>
        </div>
      ),
    },
    {
      key: 'price', header: 'Price', width: '100px',
      render: (row) => (
        <div>
          <p className="font-semibold text-sm">₹{row.price}</p>
          <p className="text-xs text-gray-400 line-through">₹{row.mrp}</p>
        </div>
      ),
    },
    {
      key: 'stock', header: 'Stock', width: '90px',
      render: (row) => (
        <span className={`text-sm font-bold ${
          row.stock === 0 ? 'text-red-500' :
          row.stock <= row.lowStockThreshold ? 'text-orange-500' :
          'text-gray-900'
        }`}>
          {row.stock}
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
          <button
            onClick={() => handleToggle(row)}
            className={`text-xs font-semibold hover:underline ${row.isActive ? 'text-red-500' : 'text-green-600'}`}
          >
            {row.isActive ? 'Disable' : 'Enable'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2.5">
            <Search size={16} className="text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..." className="flex-1 bg-transparent text-sm outline-none" />
          </div>
          <Button size="sm" onClick={openCreate}>+ Add Product</Button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['', ...CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                categoryFilter === c ? 'bg-basket-green text-white border-basket-green' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              {c || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4">
        <p className="text-sm text-gray-500 mb-3">{productsPagination?.totalItems ?? products.length} products</p>
        <DataTable columns={columns} data={products} isLoading={isLoadingProducts} />
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg"
        title={editingProduct ? `Edit — ${editingProduct.name}` : 'Add New Product'}>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <Input label="Product Name *" name="name" value={form.name} onChange={f('name')} placeholder="Fresh Tomatoes" />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Category *</label>
              <select value={form.category} onChange={f('category')} className="input-field">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Subcategory" name="subcategory" value={form.subcategory} onChange={f('subcategory')} placeholder="Leafy Greens" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Brand" name="brand" value={form.brand} onChange={f('brand')} placeholder="Farm Fresh" />
            <Input label="Unit" name="unit" value={form.unit} onChange={f('unit')} placeholder="kg / g / ltr / pack" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Price (₹) *" name="price" type="number" value={form.price} onChange={f('price')} />
            <Input label="MRP (₹) *" name="mrp" type="number" value={form.mrp} onChange={f('mrp')} />
            <Input label="Quantity" name="quantity" type="number" value={form.quantity} onChange={f('quantity')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Stock *" name="stock" type="number" value={form.stock} onChange={f('stock')} />
            <Input label="Low Stock Threshold" name="lowStockThreshold" type="number" value={form.lowStockThreshold} onChange={f('lowStockThreshold')} />
          </div>
          <Input label="Description" name="description" value={form.description} onChange={f('description')} placeholder="Brief product description..." />
          <Input label="Image URL" name="image" value={form.images?.[0] || ''} onChange={(e) => setForm((p) => ({ ...p, images: [e.target.value] }))} placeholder="https://..." />
        </div>
        <div className="mt-4">
          <Button fullWidth isLoading={isSaving} onClick={handleSave}>
            {editingProduct ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
