import Navbar from './Navbar';
import BottomNav from './BottomNav';

const Layout = ({ children, showNav = true, showBottom = true }) => (
  <div className="min-h-screen bg-basket-light flex flex-col">
    {showNav && <Navbar />}
    <main className={`flex-1 max-w-lg mx-auto w-full ${showBottom ? 'pb-24' : 'pb-4'}`}>
      {children}
    </main>
    {showBottom && <BottomNav />}
  </div>
);

export default Layout;
