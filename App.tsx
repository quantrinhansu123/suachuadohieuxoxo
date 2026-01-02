import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  Package, 
  Wrench, 
  Settings, 
  Search, 
  Bell, 
  Menu,
  ChevronRight,
  LogOut,
  Columns,
  Layers,
  Tag,
  GitMerge
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Orders } from './components/Orders';
import { TechnicianView } from './components/TechnicianView';
import { KanbanBoard } from './components/KanbanBoard';
import { Inventory } from './components/Inventory';
import { Customers } from './components/Customers';
import { Services } from './components/Services';
import { Products } from './components/Products';
import { Workflows } from './components/Workflows';
import { Settings as SettingsPage } from './components/Settings'; 
import { DEFAULT_COMPANY_CONFIG } from './constants'; 
import { AppProvider } from './context'; 

// --- Sidebar Component ---
const SidebarItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border ${
        isActive 
          ? 'bg-neutral-800 border-gold-900/50 text-gold-400 shadow-lg shadow-black/40' 
          : 'border-transparent text-slate-500 hover:bg-neutral-900 hover:text-slate-300'
      }`}
    >
      <Icon size={20} className={isActive ? 'text-gold-500' : 'text-slate-600'} />
      <span className="font-medium">{label}</span>
      {isActive && <ChevronRight size={16} className="ml-auto opacity-80 text-gold-600" />}
    </Link>
  );
};

const Sidebar = () => (
  <div className="w-64 h-screen bg-neutral-950 border-r border-neutral-900 flex flex-col fixed left-0 top-0 z-20 shadow-2xl shadow-black">
    <div className="p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gold-600 rounded-lg flex items-center justify-center text-black font-serif font-bold text-xl overflow-hidden shadow-lg shadow-gold-900/20">
           {DEFAULT_COMPANY_CONFIG.logoUrl.includes('placeholder') ? 'X' : <img src={DEFAULT_COMPANY_CONFIG.logoUrl} alt="Logo" />}
        </div>
        <div>
          <h1 className="font-serif font-bold text-lg text-slate-100 tracking-tight leading-tight">{DEFAULT_COMPANY_CONFIG.name}</h1>
          <p className="text-[10px] uppercase tracking-widest text-gold-500">Luxury ERP</p>
        </div>
      </div>
    </div>

    <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 mb-2 mt-4">Trung Tâm</div>
      <SidebarItem to="/" icon={LayoutDashboard} label="Tổng quan" />
      
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 mb-2 mt-6">Kinh Doanh</div>
      <SidebarItem to="/orders" icon={ShoppingBag} label="Đơn hàng" />
      <SidebarItem to="/customers" icon={Users} label="Khách hàng (CRM)" />
      
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 mb-2 mt-6">Quản Lý</div>
      <SidebarItem to="/services" icon={Layers} label="Dịch vụ & Bảng giá" />
      <SidebarItem to="/workflows" icon={GitMerge} label="Quy trình xử lý" />
      <SidebarItem to="/products" icon={Tag} label="Sản phẩm bán" />
      <SidebarItem to="/inventory" icon={Package} label="Kho vật tư" />
      
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 mb-2 mt-6">Kỹ Thuật</div>
      <SidebarItem to="/kanban" icon={Columns} label="Bảng Kanban" />
      <SidebarItem to="/technician" icon={Wrench} label="Khu vực kỹ thuật" />
      
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 mb-2 mt-6">Hệ Thống</div>
      <SidebarItem to="/settings" icon={Settings} label="Cài đặt" />
    </nav>

    <div className="p-4 border-t border-neutral-900">
      <button className="flex items-center gap-3 w-full px-4 py-2 text-slate-500 hover:text-red-500 transition-colors">
        <LogOut size={18} />
        <span className="font-medium">Đăng xuất</span>
      </button>
    </div>
  </div>
);

// --- Header Component ---
const Header = () => (
  <header className="h-16 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-900 fixed top-0 right-0 left-64 z-10 px-8 flex items-center justify-between">
    <div className="flex items-center gap-4 w-96">
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Tìm kiếm đơn hàng, khách hàng..." 
          className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-full text-sm text-slate-200 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all placeholder-slate-600"
        />
      </div>
    </div>
    
    <div className="flex items-center gap-6">
      <button className="relative text-slate-400 hover:text-gold-400 transition-colors">
        <Bell size={20} />
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full border-2 border-neutral-950"></span>
      </button>
      <div className="flex items-center gap-3 pl-6 border-l border-neutral-800">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-200">Quản trị viên</p>
          <p className="text-xs text-slate-500">Quản lý trung tâm</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 shadow-sm overflow-hidden">
          <img src="https://i.pravatar.cc/150?u=admin" alt="User" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  </header>
);

// --- Main App Component ---
const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <div className="min-h-screen bg-neutral-950 font-sans text-slate-300">
          <Sidebar />
          <Header />
          
          <main className="ml-64 pt-24 px-8 pb-12">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/kanban" element={<KanbanBoard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/technician" element={<TechnicianView />} />
              <Route path="/services" element={<Services />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/products" element={<Products />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-600">
                  <Wrench size={48} className="mb-4 opacity-20" />
                  <h2 className="text-xl font-semibold text-slate-400">Chức năng đang phát triển</h2>
                  <p>Tính năng này thuộc phiên bản đầy đủ của XOXO.</p>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </AppProvider>
  );
};

export default App;