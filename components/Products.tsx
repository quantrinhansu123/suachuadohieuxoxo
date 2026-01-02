import React from 'react';
import { Search, Plus, ShoppingBag, Package, DollarSign } from 'lucide-react';
import { MOCK_PRODUCTS } from '../constants';

export const Products: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100">Sản Phẩm Bán Kèm</h1>
          <p className="text-slate-500 mt-1">Quản lý sản phẩm vật lý, combo chăm sóc và phụ kiện.</p>
        </div>
        <button className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all">
          <Plus size={18} />
          <span>Thêm Sản Phẩm</span>
        </button>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {MOCK_PRODUCTS.map((product) => (
          <div key={product.id} className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 overflow-hidden flex flex-col group hover:border-gold-900/30 transition-all duration-300">
            <div className="aspect-square bg-neutral-800 relative overflow-hidden">
               <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
               />
               <div className="absolute top-2 right-2 bg-neutral-950/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-gold-500 shadow-sm border border-neutral-800">
                  Tồn: {product.stock}
               </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
               <div className="text-xs text-gold-600 font-semibold uppercase tracking-wide mb-1">{product.category}</div>
               <h3 className="font-bold text-slate-200 text-sm mb-2 line-clamp-2 min-h-[40px]">{product.name}</h3>
               <p className="text-xs text-slate-500 mb-4 line-clamp-2 flex-1">{product.desc}</p>
               
               <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                  <div className="font-bold text-lg text-slate-100">
                     {product.price.toLocaleString()} ₫
                  </div>
                  <button className="p-2 bg-neutral-800 text-slate-400 rounded-lg hover:bg-gold-600 hover:text-black transition-colors">
                     <ShoppingBag size={18} />
                  </button>
               </div>
            </div>
          </div>
        ))}
        
        {/* Add New Placeholder Card */}
        <div className="bg-neutral-900/50 rounded-xl border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center p-6 text-slate-600 hover:border-gold-600/50 hover:text-gold-500 hover:bg-neutral-900 transition-colors min-h-[350px] cursor-pointer">
           <Plus size={40} strokeWidth={1.5} />
           <span className="mt-2 font-medium">Thêm sản phẩm mới</span>
        </div>
      </div>
    </div>
  );
};