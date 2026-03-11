import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
// ✅ REMOVE: import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/product/ProductCard';
import Spinner from '@/components/ui/Spinner';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';

const CATEGORIES = [
  { id: 'all',           label: 'All',      emoji: '🛒' },
  { id: 'Vegetables',    label: 'Veggies',  emoji: '🥦' },
  { id: 'Fruits',        label: 'Fruits',   emoji: '🍎' },
  { id: 'Dairy',         label: 'Dairy',    emoji: '🥛' },
  { id: 'Groceries',     label: 'Grocery',  emoji: '🌾' },
  { id: 'Snacks',        label: 'Snacks',   emoji: '🍿' },
  { id: 'Beverages',     label: 'Drinks',   emoji: '🥤' },
  { id: 'Personal Care', label: 'Personal', emoji: '🧴' },
  { id: 'Cleaning',      label: 'Cleaning', emoji: '🧹' },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [activeCategory]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: 20 });
      if (activeCategory !== 'all') params.append('category', activeCategory);
      const { data } = await api.get(`/products?${params}`);
      setProducts(data.data || []);
    } catch (_) {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  // ✅ REMOVE <Layout> wrapper — Layout is already applied by the router in App.jsx
  return (
    <div className="px-4 py-4 space-y-5">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900">Hey {firstName}! 👋</h2>
        <p className="text-gray-500 text-sm mt-0.5">What do you need today?</p>
      </div>

      {/* Search bar — navigates to Products page */}
      <button
        onClick={() => navigate('/products')}
        className="w-full flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3"
      >
        <Search size={18} className="text-gray-400 flex-shrink-0" />
        <span className="text-gray-400 text-sm">Search for products...</span>
      </button>

      {/* Promo banner */}
      <div className="bg-gradient-to-r from-basket-green to-primary-700 rounded-2xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-200 mb-1">
          ⚡ Express Delivery
        </p>
        <h3 className="text-xl font-extrabold mb-1">Groceries in 20 min</h3>
        <p className="text-sm text-green-100">Free delivery on orders above ₹199</p>
      </div>

      {/* Category chips */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">Categories</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl
                          border text-xs font-medium transition-all ${
                            activeCategory === cat.id
                              ? 'bg-basket-green text-white border-basket-green shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200'
                          }`}
            >
              <span className="text-xl">{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900">
            {activeCategory === 'all' ? 'All Products' : activeCategory}
          </h3>
          <button
            onClick={() => navigate('/products')}
            className="text-basket-green text-sm font-semibold"
          >
            See all
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-gray-500 text-sm">No products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
