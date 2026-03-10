import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/product/ProductCard';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import api from '@/api/axios';
import useDebounce from '@/hooks/useDebounce';

const CATEGORIES = [
  'All', 'Vegetables', 'Fruits', 'Dairy', 'Groceries',
  'Snacks', 'Beverages', 'Personal Care', 'Cleaning',
];

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'price:asc',      label: 'Price: Low → High' },
  { value: 'price:desc',     label: 'Price: High → Low' },
  { value: 'name:asc',       label: 'Name A–Z' },
];

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('createdAt:desc');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, true);
  }, [debouncedSearch, activeCategory, sortBy]);

  const fetchProducts = async (pageNum = 1, reset = false) => {
    setIsLoading(true);
    try {
      const [sortField, sortOrder] = sortBy.split(':');
      const params = new URLSearchParams({ page: pageNum, limit: 20, sort: sortField, order: sortOrder });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (activeCategory !== 'All') params.append('category', activeCategory);

      const { data } = await api.get(`/products?${params}`);
      const newProducts = data.data || [];

      setProducts((prev) => (reset ? newProducts : [...prev, ...newProducts]));
      setHasMore(data.pagination?.hasNextPage || false);
    } catch (_) {} finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="px-4 py-4 space-y-4">
        {/* Search + Sort */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={16} className="text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowSort((v) => !v)}
            className={`p-3 rounded-2xl border transition-colors ${
              showSort
                ? 'bg-basket-green border-basket-green text-white'
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Sort options */}
        {showSort && (
          <div className="card p-3 grid grid-cols-2 gap-2">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSortBy(opt.value); setShowSort(false); }}
                className={`text-xs font-medium py-2 px-3 rounded-xl border transition-colors ${
                  sortBy === opt.value
                    ? 'bg-basket-green text-white border-basket-green'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
                activeCategory === cat
                  ? 'bg-basket-green text-white border-basket-green'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Result count */}
        {!isLoading && (
          <p className="text-xs text-gray-400">
            {products.length} product{products.length !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Grid */}
        {isLoading && products.length === 0 ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🔍</p>
            <p className="text-gray-500 font-medium">No products found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  isLoading={isLoading}
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    fetchProducts(next);
                  }}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default ProductsPage;
