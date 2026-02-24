import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import useAdminStore from '@/store/adminStore';
import useDebounce from '@/hooks/useDebounce';
import toast from 'react-hot-toast';

const UsersPage = () => {
  const { users, usersPagination, isLoadingUsers, fetchUsers, toggleUser } = useAdminStore();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('customer');
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    fetchUsers({ role: roleFilter, search: debouncedSearch });
  }, [debouncedSearch, roleFilter]);

  const handleToggle = async (user) => {
    const action = user.isActive ? 'block' : 'unblock';
    if (!window.confirm(`${action} user ${user.name}?`)) return;
    const result = await toggleUser(user._id);
    if (result.success) toast.success(result.message);
    else toast.error(result.error);
  };

  const columns = [
    {
      key: 'name', header: 'User',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-basket-green flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{row.name?.[0]?.toUpperCase() || '?'}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{row.name || 'No name'}</p>
            <p className="text-xs text-gray-400">+91 {row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role', width: '90px',
      render: (row) => (
        <Badge variant={row.role === 'admin' ? 'purple' : row.role === 'rider' ? 'orange' : 'blue'}>
          {row.role}
        </Badge>
      ),
    },
    {
      key: 'isActive', header: 'Status', width: '90px',
      render: (row) => (
        <Badge variant={row.isActive ? 'green' : 'red'}>
          {row.isActive ? 'Active' : 'Blocked'}
        </Badge>
      ),
    },
    {
      key: 'basketPlus', header: 'Basket+', width: '90px',
      render: (row) => (
        row.basketPlus?.isActive
          ? <span className="text-xs font-semibold text-yellow-600">⭐ Active</span>
          : <span className="text-xs text-gray-400">—</span>
      ),
    },
    {
      key: 'createdAt', header: 'Joined',
      render: (row) => (
        <span className="text-xs text-gray-400">
          {new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Actions', width: '90px',
      render: (row) => row.role !== 'admin' ? (
        <button
          onClick={() => handleToggle(row)}
          className={`text-xs font-semibold hover:underline ${row.isActive ? 'text-red-500' : 'text-green-600'}`}
        >
          {row.isActive ? 'Block' : 'Unblock'}
        </button>
      ) : <span className="text-xs text-gray-300">Protected</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 space-y-3">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2.5">
          <Search size={16} className="text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <div className="flex gap-2">
          {['customer', 'rider', ''].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                roleFilter === r ? 'bg-basket-green text-white border-basket-green' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              {r || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4">
        <p className="text-sm text-gray-500 mb-3">{usersPagination?.totalItems ?? users.length} users</p>
        <DataTable columns={columns} data={users} isLoading={isLoadingUsers} />
      </div>
    </div>
  );
};

export default UsersPage;
