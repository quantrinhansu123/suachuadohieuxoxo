import React, { useState } from 'react';
import { Plus, GitMerge, MoreHorizontal, Settings, Layers, Building2, Package, X } from 'lucide-react';
import { MOCK_WORKFLOWS, MOCK_INVENTORY } from '../constants';
import { ServiceType, WorkflowDefinition, InventoryItem } from '../types';

// Helper to group workflows by department
const groupBy = <T, K extends keyof any>(list: T[], getKey: (item: T) => K) =>
  list.reduce((previous, currentItem) => {
    const group = getKey(currentItem);
    if (!previous[group]) previous[group] = [];
    previous[group].push(currentItem);
    return previous;
  }, {} as Record<K, T[]>);

export const Workflows: React.FC = () => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const workflowsByDept = groupBy(MOCK_WORKFLOWS, (wf) => wf.department);

  const handleOpenConfig = (wf: WorkflowDefinition) => {
    setSelectedWorkflow(wf);
    setIsConfigModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100">Quản Lý Quy Trình</h1>
          <p className="text-slate-500 mt-1">Thiết lập các luồng xử lý và định mức nguyên vật liệu.</p>
        </div>
        <button className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all">
          <Plus size={18} />
          <span>Tạo Quy Trình Mới</span>
        </button>
      </div>

      <div className="space-y-8">
        {Object.entries(workflowsByDept).map(([dept, workflows]) => (
          <div key={dept}>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100 mb-4 px-1">
              <Building2 size={20} className="text-gold-500" />
              <span>Phòng {dept}</span>
              <span className="text-xs font-normal text-slate-400 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-full">{workflows.length} quy trình</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {workflows.map((wf) => (
                <div key={wf.id} className="bg-neutral-900 rounded-lg border border-neutral-800 shadow-lg shadow-black/20 hover:border-gold-500/30 transition-all group flex flex-col">
                  {/* Compact Header */}
                  <div className="p-4 flex items-start justify-between">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${wf.color}`}>
                           <GitMerge size={20} />
                        </div>
                        <div>
                           <h4 className="font-bold text-slate-200 text-sm leading-tight">{wf.label}</h4>
                           <span className="text-[10px] text-slate-500 font-mono">ID: {wf.id}</span>
                        </div>
                     </div>
                     <button className="text-slate-600 hover:text-slate-300">
                        <MoreHorizontal size={18} />
                     </button>
                  </div>

                  {/* Body */}
                  <div className="px-4 pb-2 flex-1">
                     <p className="text-xs text-slate-500 line-clamp-2 h-8">{wf.description}</p>
                  </div>

                  {/* Footer Stats */}
                  <div className="px-4 py-3 border-t border-neutral-800 mt-2 bg-neutral-800/30 rounded-b-lg flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-neutral-900 border border-neutral-700 px-1.5 py-0.5 rounded">
                           {wf.types.length > 0 ? wf.types.length + ' DV' : 'All'}
                        </span>
                        {wf.materials && wf.materials.length > 0 && (
                           <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1" title="Nguyên liệu đã cấu hình">
                              <Package size={12} /> {wf.materials.length}
                           </span>
                        )}
                     </div>
                     <button 
                        onClick={() => handleOpenConfig(wf)}
                        className="text-xs font-medium text-slate-500 hover:text-gold-500 flex items-center gap-1 transition-colors"
                     >
                       <Settings size={12} /> Cấu hình
                     </button>
                  </div>
                </div>
              ))}
              
              {/* Add New Placeholder (Per Dept) */}
              <button className="border-2 border-dashed border-neutral-800 rounded-lg p-4 flex flex-col items-center justify-center text-slate-600 hover:border-gold-500/50 hover:text-gold-500 hover:bg-neutral-900 transition-all min-h-[160px]">
                 <Plus size={24} className="mb-2 opacity-50" />
                 <span className="text-xs font-medium">Thêm quy trình {dept}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {isConfigModalOpen && selectedWorkflow && (
        <WorkflowConfigModal 
           workflow={selectedWorkflow} 
           onClose={() => setIsConfigModalOpen(false)} 
        />
      )}
    </div>
  );
};

// --- Sub-component: Config Modal ---
const WorkflowConfigModal: React.FC<{ workflow: WorkflowDefinition, onClose: () => void }> = ({ workflow, onClose }) => {
   const [materials, setMaterials] = useState(workflow.materials || []);
   const [selectedInventoryId, setSelectedInventoryId] = useState('');
   const [quantity, setQuantity] = useState('');

   // Helper to find inventory details
   const getInventoryItem = (id: string) => MOCK_INVENTORY.find(i => i.id === id);

   const handleAddMaterial = () => {
      if (!selectedInventoryId || !quantity) return;
      
      const newItem = {
         inventoryItemId: selectedInventoryId,
         quantity: parseFloat(quantity)
      };
      
      setMaterials([...materials, newItem]);
      setSelectedInventoryId('');
      setQuantity('');
   };

   const handleRemoveMaterial = (index: number) => {
      const newMaterials = [...materials];
      newMaterials.splice(index, 1);
      setMaterials(newMaterials);
   };

   return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
         <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-neutral-800">
            <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
               <div>
                  <h3 className="font-bold text-lg text-slate-100">Cấu Hình Quy Trình</h3>
                  <p className="text-xs text-slate-500">{workflow.label}</p>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-slate-400">
                  <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {/* 1. General Info (Read-only for now) */}
               <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-900/30 text-sm space-y-2">
                  <div className="flex justify-between">
                     <span className="text-slate-500">Phòng ban:</span>
                     <span className="font-medium text-slate-200">{workflow.department}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-slate-500">Áp dụng cho:</span>
                     <span className="font-medium text-slate-200">{workflow.types.join(', ') || 'Tất cả'}</span>
                  </div>
               </div>

               {/* 2. Materials Configuration */}
               <div>
                  <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                     <Package size={18} className="text-gold-500" />
                     Định Mức Nguyên Vật Liệu
                  </h4>
                  
                  {/* Add Form */}
                  <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800 mb-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="md:col-span-2">
                           <label className="text-xs font-medium text-slate-500 mb-1 block">Chọn vật tư trong kho</label>
                           <select 
                              className="w-full p-2 border border-neutral-700 rounded text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                              value={selectedInventoryId}
                              onChange={(e) => setSelectedInventoryId(e.target.value)}
                           >
                              <option value="">-- Chọn vật tư --</option>
                              {MOCK_INVENTORY.map(item => (
                                 <option key={item.id} value={item.id}>
                                    {item.name} (Tồn: {item.quantity} {item.unit})
                                 </option>
                              ))}
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-medium text-slate-500 mb-1 block">Định mức / SP</label>
                           <div className="flex">
                              <input 
                                 type="number" 
                                 step="0.01"
                                 className="w-full p-2 border border-neutral-700 rounded-l text-sm outline-none focus:border-gold-500 bg-neutral-900 text-slate-200"
                                 placeholder="0.00"
                                 value={quantity}
                                 onChange={(e) => setQuantity(e.target.value)}
                              />
                              <span className="bg-neutral-800 px-3 py-2 text-xs flex items-center rounded-r border-y border-r border-neutral-700 text-slate-400">
                                 {selectedInventoryId ? getInventoryItem(selectedInventoryId)?.unit : 'Đơn vị'}
                              </span>
                           </div>
                        </div>
                     </div>
                     
                     {/* Show selected item details preview */}
                     {selectedInventoryId && (
                        <div className="flex items-center gap-3 mb-3 bg-neutral-900 p-2 rounded border border-neutral-800">
                           <img 
                              src={getInventoryItem(selectedInventoryId)?.image} 
                              alt="" 
                              className="w-8 h-8 rounded object-cover opacity-80" 
                           />
                           <div className="text-xs">
                              <span className="font-medium text-slate-200">{getInventoryItem(selectedInventoryId)?.name}</span>
                              <div className="text-slate-500">
                                 Tồn kho hiện tại: <span className="font-bold text-emerald-500">{getInventoryItem(selectedInventoryId)?.quantity}</span> {getInventoryItem(selectedInventoryId)?.unit}
                              </div>
                           </div>
                        </div>
                     )}

                     <button 
                        onClick={handleAddMaterial}
                        disabled={!selectedInventoryId || !quantity}
                        className="w-full py-2 bg-slate-100 hover:bg-white disabled:bg-neutral-800 text-black rounded text-sm font-medium transition-colors"
                     >
                        + Thêm vào quy trình
                     </button>
                  </div>

                  {/* List */}
                  <div className="space-y-2">
                     {materials.length === 0 && (
                        <div className="text-center py-4 text-slate-600 text-sm border border-dashed border-neutral-800 rounded-lg">
                           Chưa có định mức vật tư
                        </div>
                     )}
                     {materials.map((mat, idx) => {
                        const itemDetails = getInventoryItem(mat.inventoryItemId);
                        return (
                           <div key={idx} className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-lg shadow-sm">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded bg-neutral-800 overflow-hidden flex-shrink-0">
                                    <img src={itemDetails?.image} alt="" className="w-full h-full object-cover opacity-80" />
                                 </div>
                                 <div>
                                    <h5 className="font-medium text-sm text-slate-200">{itemDetails?.name}</h5>
                                    <p className="text-xs text-slate-500">{itemDetails?.sku}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="text-right">
                                    <div className="font-bold text-slate-200 text-sm">{mat.quantity} <span className="text-xs font-normal text-slate-500">{itemDetails?.unit}</span></div>
                                    <div className="text-[10px] text-slate-500">định mức</div>
                                 </div>
                                 <button 
                                    onClick={() => handleRemoveMaterial(idx)}
                                    className="text-slate-500 hover:text-red-500 p-1"
                                 >
                                    <X size={16} />
                                 </button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>

            <div className="p-5 border-t border-neutral-800 bg-neutral-900 flex justify-end gap-3">
               <button onClick={onClose} className="px-4 py-2 border border-neutral-700 rounded-lg text-slate-400 hover:bg-neutral-800 text-sm font-medium">Đóng</button>
               <button onClick={onClose} className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-black rounded-lg text-sm font-medium shadow-lg shadow-gold-900/20">Lưu Cấu Hình</button>
            </div>
         </div>
      </div>
   );
};