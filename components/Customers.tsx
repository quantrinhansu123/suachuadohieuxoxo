import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Search, Filter, MoreHorizontal, Star, Phone, Mail, MapPin, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { Customer } from '../types';
import { useAppStore } from '../context';
import { TableFilter, FilterState, filterByDateRange } from './TableFilter';

// Action Menu Component with Portal
const ActionMenu: React.FC<{
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  itemName: string;
}> = ({ onView, onEdit, onDelete, itemName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 150; // Estimated width
      setCoords({
        top: rect.bottom + 4,
        left: rect.right - menuWidth
      });
    }
    setIsOpen(!isOpen);
  };

  // Close when scrolling or resizing
  useEffect(() => {
    const handleScroll = () => { if (isOpen) setIsOpen(false); };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="p-2 hover:bg-neutral-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
      >
        <MoreHorizontal size={20} />
      </button>

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          />
          <div
            className="fixed bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-[9999] w-[150px] overflow-hidden"
            style={{
              top: coords.top,
              left: coords.left
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
            >
              <Eye size={16} />
              Xem
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
            >
              <Edit size={16} />
              Sửa
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Bạn có chắc chắn muốn xóa "${itemName}"?`)) {
                  onDelete();
                }
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={16} />
              Xóa
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export const Customers: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useAppStore();
  const [filter, setFilter] = useState<FilterState>({ locNhanh: 'all', thoiGian: { tuNgay: null, denNgay: null } });
  const [searchText, setSearchText] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    tier: 'Standard' as Customer['tier'],
    notes: ''
  });

  // Lọc dữ liệu theo thời gian và tìm kiếm
  const filteredCustomers = useMemo(() => {
    let result = customers || [];

    // Time filter might not be applicable if `customers` list doesn't have `updatedAt` for filtering?
    // Wait, mock data had `lastVisit`. `context` map creates `lastVisit` string.
    // filterByDateRange expects `lastVisit`.
    // Assuming format YYYY-MM-DD.

    result = filterByDateRange(result, filter, 'lastVisit');

    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        (c.email && c.email.toLowerCase().includes(search))
      );
    }

    return result;
  }, [customers, filter, searchText]);

  const getTierColor = (tier: Customer['tier']) => {
    switch (tier) {
      case 'VVIP': return 'bg-gradient-to-r from-gold-600 to-gold-400 text-black border-gold-500 shadow-gold-900/50';
      case 'VIP': return 'bg-neutral-800 text-slate-200 border-neutral-700';
      default: return 'bg-neutral-900 text-slate-500 border-neutral-800';
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert('Vui lòng nhập tên và số điện thoại!');
      return;
    }

    try {
      const customerData: Customer = {
        id: `CUS-${Date.now()}`,
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email || '',
        address: newCustomer.address || '',
        tier: newCustomer.tier,
        notes: newCustomer.notes || '',
        totalSpent: 0,
        lastVisit: new Date().toISOString().split('T')[0]
      };

      await addCustomer(customerData);

      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        address: '',
        tier: 'Standard',
        notes: ''
      });
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Lỗi khi thêm khách hàng:', error);
      alert('Lỗi khi thêm khách hàng: ' + (error?.message || String(error)));
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !editingCustomer.name || !editingCustomer.phone) {
      alert('Vui lòng nhập tên và số điện thoại!');
      return;
    }

    try {
      await updateCustomer(editingCustomer.id, editingCustomer);
      setShowEditModal(false);
      setEditingCustomer(null);
    } catch (error: any) {
      console.error('Lỗi khi cập nhật khách hàng:', error);
      alert('Lỗi cập nhật: ' + error.message);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      await deleteCustomer(id);
    } catch (error: any) {
      console.error('Lỗi khi xóa khách hàng:', error);
      alert('Lỗi xóa: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal Thêm Khách Hàng */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Thêm Khách Hàng Mới</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="0909 123 456"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="example@gmail.com"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Địa chỉ</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Quận 1, TP.HCM"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Hạng khách hàng</label>
                <select
                  value={newCustomer.tier}
                  onChange={(e) => setNewCustomer({ ...newCustomer, tier: e.target.value as Customer['tier'] })}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                >
                  <option value="Standard">Standard</option>
                  <option value="VIP">VIP</option>
                  <option value="VVIP">VVIP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Ghi chú</label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  placeholder="Ghi chú về khách hàng..."
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAddCustomer}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
              >
                Thêm Khách Hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa Khách Hàng */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold text-slate-100">Sửa Khách Hàng</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCustomer(null);
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    placeholder="0909 123 456"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                <input
                  type="email"
                  value={editingCustomer.email || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  placeholder="example@gmail.com"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Địa chỉ</label>
                <input
                  type="text"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  placeholder="Quận 1, TP.HCM"
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Hạng khách hàng</label>
                <select
                  value={editingCustomer.tier}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, tier: e.target.value as Customer['tier'] })}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                >
                  <option value="Standard">Standard</option>
                  <option value="VIP">VIP</option>
                  <option value="VVIP">VVIP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Ghi chú</label>
                <textarea
                  value={editingCustomer.notes || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  placeholder="Ghi chú về khách hàng..."
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCustomer(null);
                }}
                className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateCustomer}
                className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100">Quản Lý Khách Hàng</h1>
          <p className="text-slate-500 mt-1">Hồ sơ khách hàng, lịch sử chi tiêu và hạng thành viên.</p>
        </div>
        <div style={{ position: 'relative', zIndex: 1000 }}>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Thêm Khách Mới</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex items-center justify-between group">
          <div>
            <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Tổng khách hàng</p>
            <h3 className="text-2xl font-bold text-slate-100">{customers.length}</h3>
          </div>
          <div className="p-3 bg-blue-900/20 text-blue-500 rounded-lg border border-blue-900/30">
            <Users size={24} />
          </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex items-center justify-between group">
          <div>
            <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Khách hàng VVIP</p>
            <h3 className="text-2xl font-bold text-gold-500">
              {customers.filter(c => c.tier === 'VVIP').length}
            </h3>
          </div>
          <div className="p-3 bg-gold-900/20 text-gold-500 rounded-lg border border-gold-900/30">
            <Star size={24} />
          </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex items-center justify-between group">
          <div>
            <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Doanh thu trung bình</p>
            <h3 className="text-2xl font-bold text-slate-100">
              {customers.length > 0 ? (customers.reduce((acc, c) => acc + c.totalSpent, 0) / customers.length / 1000000).toFixed(1) : 0}M ₫
            </h3>
          </div>
          <div className="p-3 bg-emerald-900/20 text-emerald-500 rounded-lg border border-emerald-900/30">
            <div className="font-bold text-lg">₫</div>
          </div>
        </div>
      </div>

      {/* Customers List - Table View */}
      <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex flex-col overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, email..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <TableFilter onFilterChange={setFilter} />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-neutral-800/50">
                <th className="p-4 min-w-[250px]">Khách hàng</th>
                <th className="p-4">Hạng</th>
                <th className="p-4 hidden md:table-cell">Địa chỉ</th>
                <th className="p-4 text-right">Tổng chi tiêu</th>
                <th className="p-4 hidden sm:table-cell">Lần cuối</th>
                <th className="p-4 w-14 sticky right-0 bg-neutral-900/90 backdrop-blur-sm z-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Không tìm thấy khách hàng nào phù hợp
                  </td>
                </tr>
              ) : filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-800/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-slate-400 font-bold border border-neutral-700 text-sm">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 block">{customer.name}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                          <span>{customer.phone}</span>
                          {customer.email && <span className="hidden lg:inline">• {customer.email}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${getTierColor(customer.tier)}`}>
                      {customer.tier === 'VVIP' && <Star size={10} fill="currentColor" />}
                      {customer.tier}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-400 hidden md:table-cell max-w-[200px] truncate">
                    {customer.address || '-'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="font-bold text-slate-200">{customer.totalSpent.toLocaleString()} ₫</div>
                  </td>
                  <td className="p-4 text-sm text-slate-400 hidden sm:table-cell">
                    {customer.lastVisit || '-'}
                  </td>
                  <td className="p-4 text-right sticky right-0 bg-neutral-900/90 backdrop-blur-sm group-hover:bg-neutral-800 transition-colors z-10">
                    <ActionMenu
                      itemName={customer.name}
                      onView={() => alert(`Xem chi tiết khách hàng: ${customer.name}\n\nID: ${customer.id}\nHạng: ${customer.tier}\nSĐT: ${customer.phone}\nEmail: ${customer.email || 'N/A'}\nĐịa chỉ: ${customer.address || 'Chưa có'}\nTổng chi tiêu: ${customer.totalSpent.toLocaleString()} ₫\nLần cuối: ${customer.lastVisit || 'Chưa có'}\nGhi chú: ${customer.notes || 'Không có'}`)}
                      onEdit={() => {
                        setEditingCustomer({ ...customer });
                        setShowEditModal(true);
                      }}
                      onDelete={() => handleDeleteCustomer(customer.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};