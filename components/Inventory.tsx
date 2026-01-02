import React from 'react';
import { Package, Search, AlertTriangle, Plus, Filter, ArrowDownUp, Image as ImageIcon } from 'lucide-react';
import { useAppStore } from '../context';

export const Inventory: React.FC = () => {
  const { inventory } = useAppStore(); 

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100">Quản Lý Kho Vận</h1>
          <p className="text-slate-500 mt-1">Theo dõi nguyên vật liệu, hoá chất và phụ tùng.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 hover:bg-neutral-700 hover:text-white transition-colors">
             <ArrowDownUp size={18} />
             <span>Xuất/Nhập</span>
           </button>
           <button className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all">
             <Plus size={18} />
             <span>Thêm Mới</span>
           </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 group">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-900/20 text-blue-500 rounded-lg border border-blue-900/30">
                <Package size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Tổng mặt hàng</p>
                <h3 className="text-2xl font-bold text-slate-100">{inventory.length}</h3>
              </div>
           </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 group">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-red-900/20 text-red-500 rounded-lg border border-red-900/30">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Cảnh báo sắp hết</p>
                <h3 className="text-2xl font-bold text-slate-100">
                  {inventory.filter(i => i.quantity <= i.minThreshold).length}
                </h3>
              </div>
           </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 group">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-gold-900/20 text-gold-500 rounded-lg border border-gold-900/30">
                <Search size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium group-hover:text-gold-500 transition-colors">Giá trị tồn kho</p>
                <h3 className="text-2xl font-bold text-slate-100">
                  {(inventory.reduce((acc, i) => acc + (i.quantity * i.importPrice), 0)).toLocaleString()} ₫
                </h3>
              </div>
           </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex gap-4">
           <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên, mã SKU..." 
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 hover:text-white transition-colors">
             <Filter size={16} />
             Lọc
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-800/50 border-b border-neutral-800">
                <th className="p-4 font-semibold text-slate-400 text-sm">Hình Ảnh</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">SKU / Tên Vật Tư</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Danh Mục</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Tồn Kho</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Đơn Vị</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Nhà Cung Cấp</th>
                <th className="p-4 font-semibold text-slate-400 text-sm">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-800 transition-colors">
                  <td className="p-4">
                    <div className="w-12 h-12 rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                           <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-200">{item.name}</div>
                    <div className="text-xs font-mono text-slate-500">{item.sku}</div>
                  </td>
                  <td className="p-4 text-slate-400 text-sm">{item.category}</td>
                  <td className="p-4 font-bold text-gold-500">
                     {Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(1)}
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{item.unit}</td>
                  <td className="p-4 text-slate-400 text-sm">{item.supplier}</td>
                  <td className="p-4">
                    {item.quantity <= item.minThreshold ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-900/20 text-red-500 border border-red-900/30">
                        <AlertTriangle size={12} /> Sắp hết
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-900/20 text-emerald-500 border border-emerald-900/30">
                        Sẵn sàng
                      </span>
                    )}
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