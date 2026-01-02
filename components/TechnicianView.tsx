import React, { useState, useMemo } from 'react';
import { CheckCircle2, Clock, AlertTriangle, Camera, Upload, Plus, Filter, Save, FileText, User } from 'lucide-react';
import { useAppStore } from '../context';
import { ServiceItem, Order } from '../types';
import { MOCK_MEMBERS } from '../constants';

// Current simulated user
const CURRENT_USER = MOCK_MEMBERS[1]; // Lê Bảo Trung (Kỹ thuật viên)

// Define steps based on Kanban COLUMNS (Synced)
const KANBAN_STEPS = [
  { id: 'In Queue', label: 'Chờ Xử Lý' },
  { id: 'Cleaning', label: 'Vệ Sinh' },
  { id: 'Repairing', label: 'Sửa Chữa' },
  { id: 'QC', label: 'Kiểm Tra (QC)' },
  { id: 'Ready', label: 'Hoàn Thành' }
];

const FILTER_OPTIONS = [
  { id: 'ALL', label: 'Tất Cả' },
  { id: 'In Queue', label: 'Chờ Xử Lý' },
  { id: 'Cleaning', label: 'Vệ Sinh' },
  { id: 'Repairing', label: 'Sửa Chữa' },
  { id: 'QC', label: 'Kiểm Tra' },
];

interface FlatTask extends ServiceItem {
  orderId: string;
  orderCode: string;
  customerName: string;
  expectedDelivery: string;
  orderNotes?: string;
}

const WorkflowStep: React.FC<{ title: string; status: string; index: number; currentIndex: number }> = ({ title, status, index, currentIndex }) => {
  // Determine visual state based on index comparisons
  let isActive = false;
  let isCompleted = false;

  if (index < currentIndex) {
      isCompleted = true;
  } else if (index === currentIndex) {
      isActive = true;
  }

  return (
    <div className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
        isActive 
            ? 'bg-neutral-800 border-gold-600 shadow-md shadow-black/30 scale-[1.02] z-10' 
            : isCompleted 
                ? 'bg-emerald-900/20 border-emerald-900/50 opacity-90' 
                : 'bg-neutral-900 border-neutral-800 opacity-60'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isCompleted ? 'bg-emerald-600 text-white' : isActive ? 'bg-gold-500 text-black' : 'bg-neutral-800 text-slate-500'
      }`}>
        {isCompleted ? <CheckCircle2 size={16} /> : <Clock size={16} />}
      </div>
      <div className="flex-1">
        <h4 className={`font-medium text-sm ${isActive ? 'text-slate-100' : 'text-slate-500'}`}>{title}</h4>
      </div>
      {isActive && (
        <span className="px-2 py-0.5 bg-gold-600 text-black rounded text-[10px] font-bold shadow-sm uppercase">Đang làm</span>
      )}
    </div>
  );
};

export const TechnicianView: React.FC = () => {
  const { orders, addTechnicianNote, updateOrderItemStatus } = useAppStore();
  
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [noteInput, setNoteInput] = useState('');

  // Flatten orders to tasks assigned to me (Simulated logic: In a real app, we filter by assignee. Here we show all active items)
  const myTasks: FlatTask[] = useMemo(() => {
    return orders.flatMap(order => 
      order.items
        .filter(item => !item.isProduct && item.status !== 'Done' && item.status !== 'Delivered') // Filter out finished/products
        .map(item => ({
          ...item,
          orderId: order.id,
          orderCode: order.id,
          customerName: order.customerName,
          expectedDelivery: order.expectedDelivery,
          orderNotes: order.notes
        }))
    );
  }, [orders]);

  const filteredTasks = useMemo(() => {
    if (filterStatus === 'ALL') return myTasks;
    return myTasks.filter(task => task.status === filterStatus);
  }, [myTasks, filterStatus]);

  const activeTask = useMemo(() => 
    myTasks.find(t => t.id === activeTaskId) || myTasks[0] || null
  , [myTasks, activeTaskId]);

  const currentStepIndex = activeTask 
    ? KANBAN_STEPS.findIndex(step => step.id === activeTask.status)
    : -1;

  const handleSaveNote = () => {
    if (!activeTask || !noteInput.trim()) return;
    addTechnicianNote(activeTask.orderId, activeTask.id, noteInput, CURRENT_USER.name);
    setNoteInput('');
  };

  const handleCompleteStep = () => {
    if (!activeTask) return;
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < KANBAN_STEPS.length) {
       updateOrderItemStatus(activeTask.orderId, activeTask.id, KANBAN_STEPS[nextStepIndex].id, CURRENT_USER.name, "Hoàn thành bước " + KANBAN_STEPS[currentStepIndex].label);
    } else {
       // Final step logic
       updateOrderItemStatus(activeTask.orderId, activeTask.id, 'Ready', CURRENT_USER.name, "Hoàn thành quy trình");
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-100 flex items-center gap-3">
             <User className="text-gold-500" size={28} />
             Công Việc Của Tôi
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Xin chào {CURRENT_USER.name}, chúc bạn một ngày làm việc hiệu quả.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List Sidebar */}
        <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 overflow-hidden h-[calc(100vh-12rem)] flex flex-col">
          <div className="p-4 border-b border-neutral-800 bg-neutral-900 space-y-3">
            <h2 className="font-semibold text-slate-200">Danh Sách ({filteredTasks.length})</h2>
            
            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
               {FILTER_OPTIONS.map(opt => (
                 <button
                   key={opt.id}
                   onClick={() => setFilterStatus(opt.id)}
                   className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                     filterStatus === opt.id 
                       ? 'bg-gold-600 text-black border-gold-600' 
                       : 'bg-neutral-800 text-slate-400 border-neutral-700 hover:border-slate-500'
                   }`}
                 >
                   {opt.label}
                 </button>
               ))}
            </div>
          </div>
          
          <div className="divide-y divide-neutral-800 overflow-y-auto flex-1">
            {filteredTasks.length === 0 ? (
               <div className="p-8 text-center text-slate-500 text-sm">Không có công việc nào</div>
            ) : (
              filteredTasks.map((task) => (
                <div 
                  key={task.id} 
                  onClick={() => setActiveTaskId(task.id)}
                  className={`p-4 hover:bg-neutral-800 cursor-pointer transition-colors ${
                    (activeTask?.id === task.id) ? 'bg-gold-900/10 border-l-4 border-gold-500' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between mb-1">
                    <span className={`font-medium line-clamp-1 ${(activeTask?.id === task.id) ? 'text-gold-400' : 'text-slate-300'}`}>{task.name}</span>
                    <span className="text-xs font-mono text-slate-500 ml-2">#{task.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-500 mt-2">
                    <span className="text-xs bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">{task.status}</span>
                    <span className="text-xs flex items-center gap-1">
                      <Clock size={10} /> {task.expectedDelivery}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {activeTask ? (
            <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 h-full flex flex-col">
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-neutral-800">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{activeTask.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                      <span className="text-slate-500 text-sm bg-neutral-800 px-2 py-1 rounded">Đơn: {activeTask.orderCode}</span>
                      <span className="text-slate-500 text-sm bg-neutral-800 px-2 py-1 rounded">Khách: {activeTask.customerName}</span>
                  </div>
                  {activeTask.orderNotes && (
                     <div className="mt-3 text-sm text-orange-400 flex items-center gap-2 bg-orange-900/10 px-3 py-2 rounded border border-orange-900/30">
                        <AlertTriangle size={14} /> 
                        Lưu ý từ đơn hàng: "{activeTask.orderNotes}"
                     </div>
                  )}
                </div>
                <span className="px-3 py-1 bg-blue-900/20 text-blue-400 rounded-full text-sm font-medium border border-blue-900/50">
                  {activeTask.type}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-y-auto">
                {/* Workflow Column */}
                <div className="space-y-6">
                   <div>
                      <h3 className="font-semibold text-slate-300 mb-4 px-1 flex items-center gap-2">
                         <Filter size={16} className="text-gold-500" /> Quy Trình Xử Lý
                      </h3>
                      <div className="space-y-3 relative">
                         <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-neutral-800 -z-10"></div>
                         {KANBAN_STEPS.map((step, idx) => (
                             <WorkflowStep 
                                key={step.id} 
                                title={step.label} 
                                status={step.id} 
                                index={idx}
                                currentIndex={currentStepIndex}
                             />
                         ))}
                      </div>
                   </div>
                   
                   <div className="pt-4 border-t border-neutral-800">
                      <button 
                         onClick={handleCompleteStep}
                         className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-3 rounded-lg font-bold transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                      >
                         <CheckCircle2 size={20} />
                         Hoàn Thành Bước Này
                      </button>
                   </div>
                </div>

                {/* Evidence & Notes Column */}
                <div className="flex flex-col gap-4">
                  {/* Images */}
                  <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800">
                    <h3 className="font-semibold text-slate-300 mb-3 flex items-center gap-2 text-sm">
                      <Camera size={16} className="text-gold-500" /> Hình Ảnh Hiện Trường
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="relative aspect-square bg-neutral-800 rounded overflow-hidden group">
                          <img src={activeTask.beforeImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Before" />
                          <span className="absolute bottom-1 left-1 text-[10px] bg-black/80 text-white px-1.5 py-0.5 rounded">Trước</span>
                       </div>
                       <div className="relative aspect-square bg-neutral-900 border-2 border-dashed border-neutral-700 rounded flex flex-col items-center justify-center text-slate-500 hover:border-gold-500 hover:text-gold-500 cursor-pointer transition-colors">
                          <Upload size={24} />
                          <span className="text-xs mt-1">Tải ảnh Sau</span>
                       </div>
                    </div>
                  </div>

                  {/* Tech Logs / Notes */}
                  <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800 flex-1 flex flex-col">
                    <h3 className="font-semibold text-slate-300 mb-3 flex items-center gap-2 text-sm">
                      <FileText size={16} className="text-gold-500" /> Nhật Ký Kỹ Thuật
                    </h3>
                    
                    {/* Log History */}
                    <div className="flex-1 min-h-[150px] max-h-[300px] overflow-y-auto space-y-3 mb-4 pr-1 scrollbar-thin">
                       {(!activeTask.technicalLog || activeTask.technicalLog.length === 0) ? (
                          <div className="text-xs text-slate-600 text-center py-4 italic">Chưa có ghi chú nào</div>
                       ) : (
                          activeTask.technicalLog.map((log) => (
                             <div key={log.id} className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 text-xs">
                                <div className="flex justify-between text-slate-500 mb-1">
                                   <span className="font-bold text-slate-400">{log.author}</span>
                                   <span>{log.timestamp}</span>
                                </div>
                                <div className="text-slate-300">{log.content}</div>
                                <div className="mt-1 text-[10px] text-gold-600 uppercase font-medium bg-gold-900/10 inline-block px-1 rounded">
                                   Giai đoạn: {log.stage}
                                </div>
                             </div>
                          ))
                       )}
                    </div>

                    {/* Input */}
                    <div className="mt-auto">
                       <textarea 
                          className="w-full p-2 text-sm bg-neutral-900 border border-neutral-700 text-slate-200 rounded-lg h-20 focus:ring-1 focus:ring-gold-500 outline-none placeholder-slate-600 resize-none" 
                          placeholder="Nhập mô tả/lưu ý cho giai đoạn sau..."
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                       ></textarea>
                       <button 
                          onClick={handleSaveNote}
                          disabled={!noteInput.trim()}
                          className="w-full mt-2 bg-neutral-800 hover:bg-neutral-700 text-slate-200 py-2 rounded-lg font-medium transition-colors text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                       >
                          <Save size={14} /> Lưu Ghi Chú
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-900 p-6 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 h-full flex flex-col items-center justify-center text-slate-600">
               <User size={48} className="mb-4 opacity-20" />
               <p>Chọn một công việc từ danh sách để bắt đầu xử lý.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};