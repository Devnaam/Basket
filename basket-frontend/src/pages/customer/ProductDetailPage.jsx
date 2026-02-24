import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, ShoppingCart } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import api from '@/api/axios';
import useCartStore from '@/store/cartStore';
import toast from 'react-hot-toast';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, updateQuantity, removeFromCart, getItemQuantity } = useCartStore();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  const quantity = product ? getItemQuantity(product._id) : 0;

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data.data);
      } catch (_) {
        toast.error('Product not found');
        navigate('/products');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }
  if (!product) return null;

  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <Layout showBottom={false}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900 line-clamp-1 flex-1">{product.name}</h1>
      </div>

      <div className="pb-28">
        {/* Image carousel */}
        <div className="bg-white">
          <div className="h-64 w-full overflow-hidden bg-gray-50 flex items-center justify-center">
            <img
              src={product.images?.[activeImage] || 'https://placehold.co/400x400?text=No+Image'}
              alt={product.name}
              className="h-full w-full object-contain"
            />
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2 justify-center p-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-colors ${
                    activeImage === i ? 'border-basket-green' : 'border-gray-200'
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {product.quantity} {product.unit}
                {product.brand && <span className="ml-1">· {product.brand}</span>}
              </p>
            </div>
            {discount > 0 && <Badge variant="green">{discount}% OFF</Badge>}
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-gray-900">₹{product.price}</span>
            {product.mrp > product.price && (
              <>
                <span className="text-base text-gray-400 line-through">₹{product.mrp}</span>
                <span className="text-sm text-green-600 font-semibold">
                  Save ₹{product.mrp - product.price}
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          {product.stock === 0 ? (
            <Badge variant="red">Out of Stock</Badge>
          ) : product.stock <= (product.lowStockThreshold || 10) ? (
            <Badge variant="orange">Only {product.stock} left!</Badge>
          ) : (
            <Badge variant="green">In Stock</Badge>
          )}

          {/* Description */}
          {product.description && (
            <div className="card">
              <h3 className="text-sm font-bold text-gray-900 mb-2">About this product</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 max-w-lg mx-auto">
        {product.stock === 0 ? (
          <Button fullWidth disabled variant="ghost">Out of Stock</Button>
        ) : quantity === 0 ? (
          <Button fullWidth onClick={() => addToCart(product._id, 1, product.name)}>
            <ShoppingCart size={18} /> Add to Cart
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 bg-basket-green rounded-xl px-5 py-3 flex-1 justify-between">
              <button
                onClick={() =>
                  quantity === 1
                    ? removeFromCart(product._id)
                    : updateQuantity(product._id, quantity - 1)
                }
                className="text-white"
              >
                <Minus size={20} />
              </button>
              <span className="text-white font-bold text-lg">{quantity}</span>
              <button
                onClick={() => updateQuantity(product._id, quantity + 1)}
                className="text-white"
              >
                <Plus size={20} />
              </button>
            </div>
            <Button onClick={() => navigate('/cart')}>View Cart</Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductDetailPage;
