import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';

const NotFoundPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
    <span className="text-8xl mb-4">🛒</span>
    <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Page Not Found</h1>
    <p className="text-gray-500 mb-8">Looks like this aisle doesn't exist.</p>
    <Link to="/">
      <Button>Go to Home</Button>
    </Link>
  </div>
);

export default NotFoundPage;
