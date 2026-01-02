import React from 'react';
import { Users, Search, Filter, MoreHorizontal, Star, Phone, Mail, MapPin, Plus } from 'lucide-react';
import { MOCK_CUSTOMERS } from '../constants';
import { Customer } from '../types';

export const Customers: React.FC = () => {
  const getTierColor = (tier: Customer['tier']) => {
    switch (tier) {
      case 'VVIP': return 'bg-gradient-to-r from-gold-600 to-gold-400 text-black border-gold-500 shadow-gold-900/50';
      case 'VIP': return 'bg-neutral-800 text-slate-200 border-neutral-700';
      default: return 'bg-neutral-900 text-slate-500 border-neutral-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100">Quản Lý Khách Hàng</h1>
          <p className="text-slate-500 mt-1">Hồ sơ khách hàng, lịch sử chi tiêu và hạng thành viên.</p>
        </div>
        <button className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all">
          <Plus size={18} />
          <span>Thêm Khách Mới</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex items-center justify-between group">
           <div>
              <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Tổng khách hàng</p>
              <h3 className="text-2xl font-bold text-slate-100">{MOCK_CUSTOMERS.length}</h3>
           </div>
           <div className="p-3 bg-blue-900/20 text-blue-500 rounded-lg border border-blue-900/30">
             <Users size={24} />
           </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex items-center justify-between group">
           <div>
              <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Khách hàng VVIP</p>
              <h3 className="text-2xl font-bold text-gold-500">
                {MOCK_CUSTOMERS.filter(c => c.tier === 'VVIP').length}
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
                {(MOCK_CUSTOMERS.reduce((acc, c) => acc + c.totalSpent, 0) / MOCK_CUSTOMERS.length / 1000000).toFixed(1)}M ₫
              </h3>
           </div>
           <div className="p-3 bg-emerald-900/20 text-emerald-500 rounded-lg border border-emerald-900/30">
             <div className="font-bold text-lg">₫</div>
           </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row gap-4 justify-between">
           <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên, SĐT, email..." 
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 hover:text-white transition-colors">
               <Filter size={16} />
               <span>Phân hạng</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 hover:text-white transition-colors">
               <Filter size={16} />
               <span>Chi tiêu</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-800/50 border-b border-neutral-800">
                <th className="p-4 font-semibold text-slate-400 text-sm w-16">ID</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Thông Tin Khách Hàng</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Hạng</th>
                <th className="p-4 font-semibold text-slate-400 text-sm text-right">Tổng Chi Tiêu</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Lần Cuối</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {MOCK_CUSTOMERS.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-800 transition-colors cursor-pointer group">
                  <td className="p-4 font-mono text-xs text-slate-600">{customer.id}</td>
                  <td className="p-4">
                    <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-slate-400 font-bold border border-neutral-700 shadow-sm">
                            {customer.name.charAt(0)}
                        </div>
                        <div>
                            <div className="font-semibold text-slate-200 group-hover:text-gold-400 transition-colors">{customer.name}</div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                <span className="flex items-center gap-1"><Phone size={10} /> {customer.phone}</span>
                                <span className="hidden sm:flex items-center gap-1"><Mail size={10} /> {customer.email}</span>
                            </div>
                        </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${getTierColor(customer.tier)}`}>
                      {customer.tier === 'VVIP' && <Star size={10} fill="currentColor" />}
                      {customer.tier}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="font-bold text-slate-200">{customer.totalSpent.toLocaleString()} ₫</div>
                    {customer.totalSpent > 50000000 && (
                        <div className="text-[10px] text-gold-500 font-medium">Top spender</div>
                    )}
                  </td>
                  <td className="p-4">
                     <div className="text-sm text-slate-400">{customer.lastVisit}</div>
                     {customer.address && (
                         <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1 truncate max-w-[150px]">
                            <MapPin size={10} />
                            {customer.address}
                         </div>
                     )}
                  </td>
                  <td className="p-4">
                    <button className="p-2 hover:bg-neutral-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
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