import React from 'react';
import { Search, Plus, Filter, MoreHorizontal, Layers, Briefcase, Tag } from 'lucide-react';
import { SERVICE_CATALOG, MOCK_WORKFLOWS } from '../constants';

export const Services: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100">Danh Mục Dịch Vụ</h1>
          <p className="text-slate-500 mt-1">Quản lý giá, mô tả và gán quy trình xử lý cho từng dịch vụ.</p>
        </div>
        <button className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all">
          <Plus size={18} />
          <span>Thêm Dịch Vụ</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 p-4 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm dịch vụ..." 
            className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none placeholder-slate-600"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors">
          <Filter size={18} />
          <span>Bộ lọc</span>
        </button>
      </div>

      {/* Services List */}
      <div className="grid grid-cols-1 gap-4">
        {SERVICE_CATALOG.map((service) => {
            const workflow = MOCK_WORKFLOWS.find(w => w.id === service.workflowId) || MOCK_WORKFLOWS[0];
            
            return (
                <div key={service.id} className="bg-neutral-900 p-4 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex gap-6 items-center hover:border-gold-900/30 transition-all">
                    <div className="w-24 h-24 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
                        <img src={service.image} alt={service.name} className="w-full h-full object-cover opacity-80" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-slate-100">{service.name}</h3>
                                <div className="flex items-center gap-3 text-sm mt-1">
                                    <span className="text-slate-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">{service.category}</span>
                                    <span className="font-mono text-slate-600 text-xs">#{service.id}</span>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-neutral-800 rounded-lg text-slate-500 hover:text-slate-300">
                                <MoreHorizontal size={20} />
                            </button>
                        </div>
                        <p className="text-slate-500 text-sm mt-2 line-clamp-1">{service.desc}</p>
                        
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 uppercase font-semibold">Quy trình:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${workflow.color}`}>
                                    <Layers size={12} />
                                    {workflow.label}
                                </span>
                            </div>
                            <div className="font-bold text-lg text-gold-500">
                                {service.price.toLocaleString()} ₫
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};