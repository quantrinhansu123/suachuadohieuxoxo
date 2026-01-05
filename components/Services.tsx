import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Filter, MoreHorizontal, Layers, Briefcase, Tag, Eye, Edit, Trash2, ArrowUp, ArrowDown, GripVertical, ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';
import { SERVICE_CATALOG, MOCK_WORKFLOWS } from '../constants';
import { TableFilter, FilterState } from './TableFilter';
import { ref, set, remove, get, onValue } from 'firebase/database';
import { db, DB_PATHS } from '../firebase';
import { ServiceCatalogItem, WorkflowDefinition, ServiceCategory } from '../types';

// Define 4-level category structure
const CATEGORY_TREE: ServiceCategory[] = [];

// Action Menu Component around Portal
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
      setCoords({
        top: rect.bottom + 4,
        left: rect.right - 150
      });
    }
    setIsOpen(!isOpen);
  };

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
          <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div
            className="fixed bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-[9999] w-[150px] overflow-hidden"
            style={{ top: coords.top, left: coords.left }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onView(); setIsOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
            >
              <Eye size={16} /> Xem
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
            >
              <Edit size={16} /> Sửa
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (window.confirm(`Xóa dịch vụ "${itemName}"?`)) onDelete(); setIsOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={16} /> Xóa
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

// Category Sidebar Component
const CategorySidebar: React.FC<{
  categories: ServiceCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}> = ({ categories, selectedCategory, onSelectCategory }) => {
  // Auto-expand all level 1 categories
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    categories.forEach(cat => {
      if (cat.level === 1) initial.add(cat.id);
    });
    return initial;
  });

  // Update expanded nodes when categories change (only add new level 1 categories)
  useEffect(() => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      categories.forEach(cat => {
        if (cat.level === 1) {
          newExpanded.add(cat.id);
        }
      });
      return newExpanded;
    });
  }, [categories.map(c => c.id).join(',')]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderCategory = (category: ServiceCategory, depth: number = 0) => {
    const isExpanded = expandedNodes.has(category.id);
    const isSelected = selectedCategory === category.id;
    const hasChildren = category.children && category.children.length > 0;

    const paddingLeft = depth * 16 + 8;

    return (
      <div key={category.id}>
        <div
          className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all hover:bg-neutral-800 ${isSelected ? 'bg-gold-900/20 text-gold-400 border-l-2 border-gold-500' : 'text-slate-300'
            }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => onSelectCategory(isSelected ? null : category.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(category.id);
              }}
              className="p-0.5 hover:bg-neutral-700 rounded"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          {category.icon && <span className="text-sm">{category.icon}</span>}

          <span className={`text-sm flex-1 ${category.level === 1 ? 'font-bold' : category.level === 2 ? 'font-semibold' : ''} ${category.color || ''}`}>
            {category.name}
          </span>

          {category.level === 4 && (
            <span className="text-xs text-slate-500 bg-neutral-800 px-1.5 py-0.5 rounded">L4</span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-neutral-900 border-r border-neutral-800 p-4 overflow-y-auto">
      <div className="mb-4">
        <h3 className="font-bold text-slate-100 mb-2">
          Danh Mục Dịch Vụ
        </h3>
        <p className="text-xs text-slate-500">4 cấp phân loại</p>
      </div>

      <button
        onClick={() => onSelectCategory(null)}
        className={`w-full mb-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === null
          ? 'bg-gold-600 text-black'
          : 'bg-neutral-800 text-slate-300 hover:bg-neutral-700'
          }`}
      >
        Tất Cả Dịch Vụ
      </button>

      <div className="space-y-1">
        {categories.map((category) => renderCategory(category, 0))}
      </div>
    </div>
  );
};

export const Services: React.FC = () => {
  const [filter, setFilter] = useState<FilterState>({ locNhanh: 'all', thoiGian: { tuNgay: null, denNgay: null } });
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [workflowSearch, setWorkflowSearch] = useState('');
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newService, setNewService] = useState({
    name: '',
    category: '',
    image: '',
    price: '',
    desc: '',
    workflows: [] as Array<{ id: string; order: number }>
  });
  const [categoryPath, setCategoryPath] = useState<string[]>([]);
  const [customLevels, setCustomLevels] = useState<Record<number, boolean>>({});
  const [dynamicCategories, setDynamicCategories] = useState<ServiceCategory[]>([]);

  // Build dynamic categories from services
  const buildDynamicCategories = (services: ServiceCatalogItem[]): ServiceCategory[] => {
    const categoryMap = new Map<string, ServiceCategory>();
    let customIdCounter = 10000; // Start from high number to avoid conflicts

    services.forEach(service => {
      if (!service.categoryPath || service.categoryPath.length === 0) return;

      // Build category tree from path
      let currentLevel = categoryMap;
      let parentId: string | undefined = undefined;

      service.categoryPath.forEach((pathItem, index) => {
        const level = index + 1;
        const categoryId = `custom-${customIdCounter++}`;
        
        // Check if category already exists at this level
        let category: ServiceCategory | undefined;
        for (const [id, cat] of categoryMap.entries()) {
          if (cat.name === pathItem && cat.level === level && cat.parentId === parentId) {
            category = cat;
            break;
          }
        }

        if (!category) {
          category = {
            id: categoryId,
            name: pathItem,
            level: level,
            parentId: parentId,
            children: [],
            color: level === 1 ? 'text-emerald-400' : undefined
          };
          categoryMap.set(categoryId, category);
        }

        parentId = category.id;
      });
    });

    // Build tree structure
    const rootCategories: ServiceCategory[] = [];
    const allCategories = Array.from(categoryMap.values());

    allCategories.forEach(cat => {
      if (cat.level === 1) {
        // Check if root category already exists
        if (!rootCategories.find(c => c.id === cat.id)) {
          rootCategories.push(cat);
        }
      } else if (cat.parentId) {
        const parent = allCategories.find(c => c.id === cat.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          // Check if child already exists
          if (!parent.children.find(c => c.id === cat.id)) {
            parent.children.push(cat);
          }
        }
      }
    });

    return rootCategories;
  };

  // Merge static and dynamic categories
  const mergedCategories = useMemo(() => {
    // Check if dynamic categories already exist in static tree
    const staticCategoryNames = new Set<string>();
    const collectNames = (cats: ServiceCategory[]) => {
      cats.forEach(cat => {
        staticCategoryNames.add(cat.name);
        if (cat.children) collectNames(cat.children);
      });
    };
    collectNames(CATEGORY_TREE);

    // Only add dynamic categories that don't exist in static tree
    const newDynamicCategories = dynamicCategories.filter(dynCat => {
      // Check if a category with same name and level exists in static tree
      const exists = Array.from(staticCategoryNames).some(name => name === dynCat.name);
      return !exists;
    });

    return [...CATEGORY_TREE, ...newDynamicCategories];
  }, [dynamicCategories]);

  // Helper tìm path từ tên category
  const findCategoryPathByName = (name: string, nodes: ServiceCategory[]): string[] | null => {
    for (const node of nodes) {
      if (node.name === name) return [node.id];
      if (node.children) {
        const childPath = findCategoryPathByName(name, node.children);
        if (childPath) return [node.id, ...childPath];
      }
    }
    return null;
  };

  // Helper tìm path từ ID category
  const findCategoryPathById = (id: string, nodes: ServiceCategory[]): string[] | null => {
    for (const node of nodes) {
      if (node.id === id) return [node.id];
      if (node.children) {
        const childPath = findCategoryPathById(id, node.children);
        if (childPath) return [node.id, ...childPath];
      }
    }
    return null;
  };

  // Helper lấy danh sách category con dựa trên path
  const getCategoriesAtLevel = (level: number): ServiceCategory[] => {
    if (level === 0) return mergedCategories;

    let currentNodes = mergedCategories;
    for (let i = 0; i < level; i++) {
      const nodeId = categoryPath[i];
      if (!nodeId) return [];
      const node = currentNodes.find(n => n.id === nodeId || n.name === nodeId);
      if (!node || !node.children) return [];
      currentNodes = node.children;
    }
    return currentNodes;
  };

  // Handle select change
  const handleCategoryChange = (level: number, value: string, isCustom: boolean = false) => {
    const newPath = [...categoryPath.slice(0, level), value];
    setCategoryPath(newPath);

    if (isCustom) {
      const newCustoms = { ...customLevels, [level]: true };
      for (let i = level + 1; i < 4; i++) delete newCustoms[i];
      setCustomLevels(newCustoms);
    }

    let currentNodes = mergedCategories;
    let selectedName = '';

    for (let i = 0; i < newPath.length; i++) {
      const idOrName = newPath[i];
      const node = currentNodes.find(n => n.id === idOrName || n.name === idOrName);
      if (node) {
        selectedName = node.name;
        currentNodes = node.children || [];
      } else {
        selectedName = idOrName;
        currentNodes = [];
      }
    }

    setNewService(prev => ({ ...prev, category: selectedName }));
  };

  const toggleCustom = (level: number, isCustom: boolean) => {
    setCustomLevels(prev => ({ ...prev, [level]: isCustom }));
    if (isCustom) {
      const newPath = [...categoryPath];
      newPath[level] = '';
      newPath.splice(level + 1);
      setCategoryPath(newPath);
      setNewService(prev => ({ ...prev, category: '' }));
    }
  };

  // No tiers


  // Load services from Firebase
  useEffect(() => {
    const loadServices = async () => {
      try {
        const snapshot = await get(ref(db, DB_PATHS.SERVICES));

        const mergedServices = new Map<string, ServiceCatalogItem>();

        // Merge với data từ Firebase (ưu tiên Firebase nếu trùng ID)
        if (snapshot.exists()) {
          const data = snapshot.val();
          Object.keys(data).forEach(key => {
            const svc = data[key];
            const serviceId = svc.id || key;
            const catPath = svc.categoryPath || [];
            mergedServices.set(serviceId, {
              id: serviceId,
              name: svc.name || '',
              category: svc.category || '',
              categoryPath: catPath || [],
              price: svc.price || 0,
              desc: svc.desc || '',
              image: svc.image || '',
              workflowId: svc.workflowId || '',
              workflows: svc.workflows || undefined
            } as ServiceCatalogItem);
          });
        }

        const servicesList = Array.from(mergedServices.values());
        setServices(servicesList);
        
        // Build dynamic categories from services
        const dynamicCats = buildDynamicCategories(servicesList);
        setDynamicCategories(dynamicCats);
      } catch (error) {
        console.error('Error loading services:', error);
        setServices([]);
        setDynamicCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadServices();

    // Listen for real-time updates
    const servicesRef = ref(db, DB_PATHS.SERVICES);
    const unsubscribe = onValue(servicesRef, (snapshot) => {
      try {
        const mergedServices = new Map<string, ServiceCatalogItem>();

        // Merge với data từ Firebase (ưu tiên Firebase nếu trùng ID)
        if (snapshot.exists()) {
          const data = snapshot.val();
          Object.keys(data).forEach(key => {
            const svc = data[key];
            const serviceId = svc.id || key;
            const catPath = svc.categoryPath || [];
            mergedServices.set(serviceId, {
              id: serviceId,
              name: svc.name || '',
              category: svc.category || '',
              categoryPath: catPath || [],
              price: svc.price || 0,
              desc: svc.desc || '',
              image: svc.image || '',
              workflowId: svc.workflowId || '',
              workflows: svc.workflows || undefined
            } as ServiceCatalogItem);
          });
        }

        const servicesList = Array.from(mergedServices.values());
        setServices(servicesList);
        
        // Build dynamic categories from services
        const dynamicCats = buildDynamicCategories(servicesList);
        setDynamicCategories(dynamicCats);
      } catch (error) {
        console.error('Error in real-time listener:', error);
        setServices([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load workflows from Firebase
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const snapshot = await get(ref(db, DB_PATHS.WORKFLOWS));
        if (snapshot.exists()) {
          const data = snapshot.val();
          const workflowsList: WorkflowDefinition[] = Object.keys(data).map(key => {
            const wf = data[key] as any;
            return {
              id: wf.id || key,
              label: wf.label || '',
              description: wf.description || '',
              department: wf.department || 'Kỹ Thuật',
              types: wf.types || [],
              color: wf.color || 'bg-blue-900/30 text-blue-400 border-blue-800',
              materials: wf.materials || undefined,
              stages: wf.stages || undefined,
              assignedMembers: wf.assignedMembers || undefined
            } as WorkflowDefinition;
          });
          console.log('Services: Loaded workflows from Firebase:', workflowsList);
          setWorkflows(workflowsList);
        } else {
          console.log('Services: No workflows in Firebase');
          setWorkflows([]);
        }
      } catch (error) {
        console.error('Error loading workflows:', error);
        setWorkflows([]);
      }
    };

    loadWorkflows();

    // Listen for real-time updates
    const workflowsRef = ref(db, DB_PATHS.WORKFLOWS);
    const unsubscribe = onValue(workflowsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const workflowsList: WorkflowDefinition[] = Object.keys(data).map(key => {
            const wf = data[key] as any;
            return {
              id: wf.id || key,
              label: wf.label || '',
              description: wf.description || '',
              department: wf.department || 'Kỹ Thuật',
              types: wf.types || [],
              color: wf.color || 'bg-blue-900/30 text-blue-400 border-blue-800',
              materials: wf.materials || undefined,
              stages: wf.stages || undefined,
              assignedMembers: wf.assignedMembers || undefined
            } as WorkflowDefinition;
          });
          console.log('Services: Real-time workflows update:', workflowsList);
          setWorkflows(workflowsList);
        } else {
          console.log('Services: Real-time update - no workflows');
          setWorkflows([]);
        }
      } catch (error) {
        console.error('Error in real-time listener:', error);
        setWorkflows([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Lấy danh sách danh mục unique
  const categories = useMemo(() => {
    const cats = [...new Set(services.map(s => s.category))];
    return ['all', ...cats];
  }, [services]);

  // Helper function to check if service belongs to selected category
  const isServiceInCategory = (service: ServiceCatalogItem, categoryId: string): boolean => {
    if (!service.categoryPath || service.categoryPath.length === 0) return false;
    return service.categoryPath.includes(categoryId);
  };

  // Lọc dịch vụ theo tìm kiếm, danh mục và cấp độ
  const filteredServices = useMemo(() => {
    let result = [...services];
    
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(search) ||
        s.desc.toLowerCase().includes(search)
      );
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter(s => s.category === categoryFilter);
    }

    if (selectedCategory) {
      result = result.filter(s => {
        if (!s.categoryPath) return false;
        return s.categoryPath.includes(selectedCategory);
      });
    }
    
    return result;
  }, [services, searchText, categoryFilter, selectedCategory]);

  // Group services by tier


  const handleAddService = async () => {
    if (!newService.name || !newService.category || !newService.price || newService.workflows.length === 0) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc và chọn ít nhất một quy trình!');
      return;
    }

    try {
      // Tạo ID tự động từ tên dịch vụ
      const serviceId = `SVC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Tạo đối tượng dịch vụ
      const serviceData: any = {
        id: serviceId,
        name: newService.name,
        category: newService.category,
        categoryPath: categoryPath,
        price: parseInt(newService.price),
        desc: newService.desc || '',
        image: newService.image || '',
        workflows: newService.workflows.sort((a, b) => a.order - b.order)
      };

      // Lưu vào Firebase
      await set(ref(db, `${DB_PATHS.SERVICES}/${serviceId}`), serviceData);

      const workflowLabels = newService.workflows
        .sort((a, b) => a.order - b.order)
        .map(w => workflows.find(wf => wf.id === w.id)?.label)
        .filter(Boolean);

      alert(`Thêm dịch vụ thành công!\n\nTên: ${newService.name}\nDanh mục: ${newService.category}\nGiá: ${parseInt(newService.price).toLocaleString()} ₫\nQuy trình: ${workflowLabels.join(' → ')}\n\nĐã lưu vào Firebase!`);

      setNewService({
        name: '',
        category: '',
        price: '',
        desc: '',
        workflows: [],
        image: ''
      });
      setWorkflowSearch('');
      setShowAddModal(false);
      // Services will be updated automatically via Firebase listener
    } catch (error: any) {
      console.error('Lỗi khi lưu dịch vụ:', error);
      const errorMessage = error?.message || String(error);
      alert('Lỗi khi lưu dịch vụ vào Firebase:\n' + errorMessage + '\n\nVui lòng kiểm tra kết nối Firebase và thử lại.');
    }
  };

  const handleViewService = (service: any) => {
    setSelectedService(service);
    setShowViewModal(true);
  };

  const handleEditService = (service: any) => {
    setSelectedService(service);
    // Chuyển đổi workflowId (có thể là string hoặc string[]) thành mảng với thứ tự
    let workflowIds: string[] = [];
    if (Array.isArray(service.workflowId)) {
      workflowIds = service.workflowId;
    } else if (service.workflowId) {
      workflowIds = [service.workflowId];
    }

    // Nếu service có workflows với order, dùng luôn, nếu không thì tạo mới
    let workflows: Array<{ id: string; order: number }> = [];
    if (service.workflows && Array.isArray(service.workflows)) {
      workflows = service.workflows;
    } else {
      workflows = workflowIds.map((id, index) => ({ id, order: index + 1 }));
    }

    setNewService({
      name: service.name,
      category: service.category,
      price: service.price.toString(),
      desc: service.desc,
      workflows: workflows,
      image: service.image
    });

    // Khôi phục path cho edit modal
    // Khôi phục path cho edit modal
    const path = service.categoryPath || findCategoryPathByName(service.category, mergedCategories);
    if (path) {
      setCategoryPath(path);
      setCustomLevels({});
    } else if (service.category) {
      // Nếu không có trong tree, set là custom category level 0
      setCategoryPath([service.category]);
      setCustomLevels({ 0: true });
    } else {
      setCategoryPath([]);
      setCustomLevels({});
    }

    setWorkflowSearch('');
    setShowEditModal(true);
  };

  const handleUpdateService = async () => {
    if (!newService.name || !newService.category || !newService.price || newService.workflows.length === 0) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc và chọn ít nhất một quy trình!');
      return;
    }

    if (!selectedService || !selectedService.id) {
      alert('Không tìm thấy dịch vụ để cập nhật!');
      return;
    }

    try {
      // Cập nhật đối tượng dịch vụ
      const serviceData: any = {
        id: selectedService.id,
        name: newService.name,
        category: newService.category,
        categoryPath: categoryPath,
        price: parseInt(newService.price),
        desc: newService.desc || '',
        workflows: newService.workflows.sort((a, b) => a.order - b.order),
        image: newService.image || ''
      };

      // Lưu vào Firebase
      await set(ref(db, `${DB_PATHS.SERVICES}/${selectedService.id}`), serviceData);

      const workflowLabels = newService.workflows
        .sort((a, b) => a.order - b.order)
        .map(w => workflows.find(wf => wf.id === w.id)?.label)
        .filter(Boolean);

      alert(`Cập nhật dịch vụ thành công!\n\nTên: ${newService.name}\nDanh mục: ${newService.category}\nGiá: ${parseInt(newService.price).toLocaleString()} ₫\nQuy trình: ${workflowLabels.join(' → ')}\n\nĐã lưu vào Firebase!`);

      setNewService({
        name: '',
        category: '',
        price: '',
        desc: '',
        workflows: [],
        image: ''
      });
      setWorkflowSearch('');
      setShowEditModal(false);
      setSelectedService(null);
      // Services will be updated automatically via Firebase listener
    } catch (error: any) {
      console.error('Lỗi khi cập nhật dịch vụ:', error);
      const errorMessage = error?.message || String(error);
      alert('Lỗi khi cập nhật dịch vụ vào Firebase:\n' + errorMessage + '\n\nVui lòng kiểm tra kết nối Firebase và thử lại.');
    }
  };

  const handleDeleteService = async (service: any) => {
    if (!service || !service.id) {
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${service.name}"?`)) {
      return;
    }

    try {
      // Kiểm tra xem dịch vụ có trong Firebase không
      const snapshot = await get(ref(db, `${DB_PATHS.SERVICES}/${service.id}`));

      if (snapshot.exists()) {
        // Xóa từ Firebase nếu có
        await remove(ref(db, `${DB_PATHS.SERVICES}/${service.id}`));
        // Services will be updated automatically via Firebase listener
      } else {
        // Nếu không có trong Firebase, chỉ xóa khỏi state local (MOCK data)
        setServices(prev => prev.filter(s => s.id !== service.id));
      }
    } catch (error: any) {
      console.error('Lỗi khi xóa dịch vụ:', error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-8 -mb-12">
      {/* Sidebar */}
      <CategorySidebar
        categories={mergedCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Modal Xem Dịch Vụ */}
        {showViewModal && selectedService && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
                <h2 className="text-xl font-serif font-bold text-slate-100">Chi Tiết Dịch Vụ</h2>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedService(null);
                  }}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex gap-6">
                  <div className="w-32 h-32 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
                    <img src={selectedService.image} alt={selectedService.name} className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-2xl text-slate-100 mb-2">{selectedService.name}</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-slate-400 bg-neutral-800 px-3 py-1 rounded border border-neutral-700">{selectedService.category}</span>
                      <span className="font-mono text-slate-600 text-sm">#{selectedService.id}</span>
                    </div>
                    <div className="font-bold text-2xl text-gold-500">
                      {selectedService.price.toLocaleString()} ₫
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-6 space-y-4">
        <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Quy trình xử lý</label>
                    {(() => {
                      // Xử lý workflows có thể là mảng object {id, order} hoặc mảng string
                      let svcWorkflows: Array<{ id: string; order: number }> = [];

                      if (selectedService.workflows && Array.isArray(selectedService.workflows)) {
                        svcWorkflows = selectedService.workflows;
                      } else {
                        const workflowIds = Array.isArray(selectedService.workflowId)
                          ? selectedService.workflowId
                          : [selectedService.workflowId].filter(Boolean);
                        svcWorkflows = workflowIds.map((id, index) => ({ id, order: index + 1 }));
                      }

                      if (svcWorkflows.length === 0) {
                        return <span className="text-slate-500">Chưa gán quy trình</span>;
                      }

                      return (
                        <div className="space-y-2">
                          {svcWorkflows
                            .sort((a, b) => a.order - b.order)
                            .map((w, idx) => {
                              const workflow = workflows.find(wf => wf.id === w.id);
                              return workflow ? (
                                <div key={w.id} className={`px-3 py-2 rounded-lg border flex items-center gap-3 ${workflow.color}`}>
                                  <div className="w-6 h-6 rounded-full bg-gold-600/20 border border-gold-600/50 flex items-center justify-center text-gold-500 font-bold text-xs">
                                    {w.order}
        </div>
                                  <Layers size={14} />
                                  <span className="font-semibold text-sm">{workflow.label}</span>
                                  <span className="text-xs opacity-75">({workflow.department})</span>
                                </div>
                              ) : null;
                            })}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Mô tả</label>
                    <p className="text-slate-300 bg-neutral-800 p-4 rounded-lg border border-neutral-700 whitespace-pre-wrap">
                      {selectedService.desc || 'Không có mô tả'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
        <button 
          onClick={() => {
                    setShowViewModal(false);
                    setSelectedService(null);
          }}
                  className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
        >
                  Đóng
        </button>
      </div>
            </div>
          </div>
        )}

        {/* Modal Sửa Dịch Vụ */}
        {showEditModal && selectedService && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
                <h2 className="text-xl font-serif font-bold text-slate-100">Sửa Dịch Vụ</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedService(null);
                    setNewService({
                      name: '',
                      category: '',
                      price: '',
                      desc: '',
                      workflows: [],
                      image: ''
                    });
                    setCategoryPath([]);
                    setCustomLevels({});
                    setWorkflowSearch('');
                  }}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Tên dịch vụ <span className="text-red-500">*</span>
                  </label>
          <input 
            type="text" 
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    placeholder="VD: Spa Túi Xách Premium"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
          />
        </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Danh mục <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2 mb-2">
                      {[0, 1, 2, 3].map((level) => {
                        const isCustom = customLevels[level];
                        // Chỉ hiện nếu là level 0 hoặc level trước đã được chọn
                        if (level > 0 && !categoryPath[level - 1]) return null;

                        const options = getCategoriesAtLevel(level);
                        const levelName = ['Nhóm dịch vụ', 'Loại dịch vụ', 'Chi tiết', 'Gói dịch vụ'][level];

                        return (
                          <div key={level} className="flex gap-2 items-center mb-2 last:mb-0">
                            {isCustom ? (
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  placeholder={`Nhập tên kỹ thuật mới...`}
                                  value={categoryPath[level] || ''}
                                  onChange={(e) => handleCategoryChange(level, e.target.value, true)}
                                  className="flex-1 px-4 py-2 bg-neutral-800 border border-gold-500/50 rounded-lg text-slate-200 outline-none text-sm focus:ring-1 focus:ring-gold-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => toggleCustom(level, false)}
                                  className="px-3 py-2 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 rounded-lg text-slate-400 text-sm whitespace-nowrap transition-colors"
                                  title="Quay lại danh sách"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
          <select
                                value={categoryPath[level] || ''}
                                onChange={(e) => {
                                  if (e.target.value === '__NEW__') toggleCustom(level, true);
                                  else handleCategoryChange(level, e.target.value, false);
                                }}
                                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all text-sm"
                              >
                                <option value="">-- Chọn {levelName} --</option>
                                {options.map(opt => (
                                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                                ))}
                                <option value="__NEW__" className="text-gold-500 font-semibold">+ ➕ Thêm mới {levelName}</option>
          </select>
                            )}
        </div>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={newService.category}
                      readOnly
                      className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-slate-500 text-sm italic"
                      placeholder="Danh mục đã chọn..."
                    />
      </div>



                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Giá dịch vụ (₫) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                      placeholder="1500000"
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                    />
          </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Quy trình xử lý <span className="text-red-500">*</span>
                    <span className="text-xs text-slate-500 ml-2">(Có thể chọn nhiều, sắp xếp theo thứ tự)</span>
                  </label>

                  {/* Tìm kiếm quy trình */}
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="text"
                        value={workflowSearch}
                        onChange={(e) => setWorkflowSearch(e.target.value)}
                        placeholder="Tìm kiếm quy trình..."
                        className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 text-sm"
                      />
                    </div>
                  </div>

                  {/* Danh sách quy trình để chọn */}
                  <div className="max-h-64 overflow-y-auto border border-neutral-700 rounded-lg bg-neutral-800/50 p-3 space-y-2 mb-3">
                    {workflows.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 text-sm">
                        Đang tải quy trình từ Firebase...
                      </div>
                    ) : (
                      workflows
                        .filter(wf => {
                          if (!workflowSearch.trim()) return true;
                          const search = workflowSearch.toLowerCase();
                          return wf.label.toLowerCase().includes(search) ||
                            wf.department.toLowerCase().includes(search) ||
                            (wf.description && wf.description.toLowerCase().includes(search));
                        })
                        .map(wf => {
                          const isSelected = newService.workflows.some(w => w.id === wf.id);
            return (
                            <label key={wf.id} className="flex items-start gap-3 p-2 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const maxOrder = newService.workflows.length > 0
                                      ? Math.max(...newService.workflows.map(w => w.order))
                                      : 0;
                                    setNewService({
                                      ...newService,
                                      workflows: [...newService.workflows, { id: wf.id, order: maxOrder + 1 }]
                                    });
                                  } else {
                                    setNewService({
                                      ...newService,
                                      workflows: newService.workflows
                                        .filter(w => w.id !== wf.id)
                                        .map((w, idx) => ({ ...w, order: idx + 1 }))
                                    });
                                  }
                                }}
                                className="mt-1 w-4 h-4 text-gold-600 rounded focus:ring-gold-500 border-neutral-600 bg-neutral-900 accent-gold-600 cursor-pointer"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Layers size={14} className="text-gold-500" />
                                  <span className="text-sm font-medium text-slate-300">{wf.label}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs border ${wf.color}`}>
                                    {wf.department}
                                  </span>
                                </div>
                                {wf.description && (
                                  <p className="text-xs text-slate-500 mt-1">{wf.description}</p>
                                )}
                              </div>
                            </label>
                          );
                        })
                    )}
                  </div>

                  {/* Danh sách quy trình đã chọn với thứ tự */}
                  {newService.workflows.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-slate-400 mb-2">Thứ tự thực hiện:</p>
                      {newService.workflows
                        .sort((a, b) => a.order - b.order)
                        .map((w, idx) => {
                          const wf = workflows.find(workflow => workflow.id === w.id);
                          if (!wf) return null;
                          return (
                            <div key={w.id} className="flex items-center gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                              <div className="flex items-center gap-2">
                                <GripVertical size={16} className="text-slate-600" />
                                <div className="w-8 h-8 rounded-full bg-gold-600/20 border border-gold-600/50 flex items-center justify-center text-gold-500 font-bold text-sm">
                                  {w.order}
                                </div>
                    </div>
                    <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Layers size={14} className="text-gold-500" />
                                  <span className="text-sm font-medium text-slate-300">{wf.label}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs border ${wf.color}`}>
                                    {wf.department}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {idx > 0 && (
                                  <button
                                    onClick={() => {
                                      const sorted = [...newService.workflows].sort((a, b) => a.order - b.order);
                                      [sorted[idx].order, sorted[idx - 1].order] = [sorted[idx - 1].order, sorted[idx].order];
                                      setNewService({ ...newService, workflows: sorted });
                                    }}
                                    className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                                    title="Lên trước"
                                  >
                                    <ArrowUp size={14} />
                                  </button>
                                )}
                                {idx < newService.workflows.length - 1 && (
                                  <button
                                    onClick={() => {
                                      const sorted = [...newService.workflows].sort((a, b) => a.order - b.order);
                                      [sorted[idx].order, sorted[idx + 1].order] = [sorted[idx + 1].order, sorted[idx].order];
                                      setNewService({ ...newService, workflows: sorted });
                                    }}
                                    className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                                    title="Xuống sau"
                                  >
                                    <ArrowDown size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                            <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Hình ảnh</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (!file.type.startsWith('image/')) {
                          alert('Vui lòng chọn file ảnh!');
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          alert('File quá lớn! Vui lòng chọn file nhỏ hơn 5MB.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          setNewService({ ...newService, image: base64 });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold-600 file:text-black hover:file:bg-gold-500 file:cursor-pointer"
                  />
                  {newService.image && (
                    <div className="mt-2">
                      <img src={newService.image} alt="Preview" className="w-32 h-32 rounded-lg object-cover border border-neutral-700" />
                                </div>
                  )}
                            </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Mô tả</label>
                  <textarea
                    value={newService.desc}
                    onChange={(e) => setNewService({ ...newService, desc: e.target.value })}
                    placeholder="Mô tả dịch vụ..."
                    rows={3}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 resize-none"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
                            <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedService(null);
                    setNewService({
                      name: '',
                      category: '',
                      price: '',
                      desc: '',
                      workflows: [],
                      image: ''
                    });
                    setCategoryPath([]);
                    setCustomLevels({});
                    setWorkflowSearch('');
                  }}
                  className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateService}
                  className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
                >
                  Cập Nhật
                            </button>
                        </div>
            </div>
          </div>
        )}

        {/* Modal Thêm Dịch Vụ */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-6 flex justify-between items-center">
                <h2 className="text-xl font-serif font-bold text-slate-100">Thêm Dịch Vụ Mới</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Tên dịch vụ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    placeholder="VD: Spa Túi Xách Premium"
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Danh mục <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2 mb-2">
                      {[0, 1, 2, 3].map((level) => {
                        const isCustom = customLevels[level];
                        // Chỉ hiện nếu là level 0 hoặc level trước đã được chọn
                        if (level > 0 && !categoryPath[level - 1]) return null;

                        const options = getCategoriesAtLevel(level);
                        const levelName = ['Nhóm dịch vụ', 'Loại dịch vụ', 'Chi tiết', 'Gói dịch vụ'][level];

                        return (
                          <div key={level} className="flex gap-2 items-center mb-2 last:mb-0">
                            {isCustom ? (
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  placeholder={`Nhập tên tùy chỉnh...`}
                                  value={categoryPath[level] || ''}
                                  onChange={(e) => handleCategoryChange(level, e.target.value, true)}
                                  className="flex-1 px-4 py-2 bg-neutral-800 border border-gold-500/50 rounded-lg text-slate-200 outline-none text-sm focus:ring-1 focus:ring-gold-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => toggleCustom(level, false)}
                                  className="px-3 py-2 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 rounded-lg text-slate-400 text-sm whitespace-nowrap transition-colors"
                                >
                                  List
                                </button>
                              </div>
                            ) : (
                              <select
                                value={categoryPath[level] || ''}
                                onChange={(e) => {
                                  if (e.target.value === '__NEW__') toggleCustom(level, true);
                                  else handleCategoryChange(level, e.target.value, false);
                                }}
                                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all text-sm"
                              >
                                <option value="">-- Chọn {levelName} --</option>
                                {options.map(opt => (
                                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                                ))}
                                <option value="__NEW__" className="text-gold-500 font-semibold">+ Thêm mới...</option>
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={newService.category}
                      readOnly
                      className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-slate-500 text-sm italic"
                      placeholder="Danh mục đã chọn..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Giá dịch vụ (₫) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                      placeholder="1500000"
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Quy trình xử lý <span className="text-red-500">*</span>
                    <span className="text-xs text-slate-500 ml-2">(Có thể chọn nhiều, sắp xếp theo thứ tự)</span>
                  </label>

                  {/* Tìm kiếm quy trình */}
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="text"
                        value={workflowSearch}
                        onChange={(e) => setWorkflowSearch(e.target.value)}
                        placeholder="Tìm kiếm quy trình..."
                        className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 text-sm"
                      />
                    </div>
                  </div>

                  {/* Danh sách quy trình để chọn */}
                  <div className="max-h-64 overflow-y-auto border border-neutral-700 rounded-lg bg-neutral-800/50 p-3 space-y-2 mb-3">
                    {workflows.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 text-sm">
                        Đang tải quy trình từ Firebase...
                      </div>
                    ) : (
                      workflows
                        .filter(wf => {
                          if (!workflowSearch.trim()) return true;
                          const search = workflowSearch.toLowerCase();
                          return wf.label.toLowerCase().includes(search) ||
                            wf.department.toLowerCase().includes(search) ||
                            (wf.description && wf.description.toLowerCase().includes(search));
                        })
                        .map(wf => {
                          const isSelected = newService.workflows.some(w => w.id === wf.id);
                          return (
                            <label key={wf.id} className="flex items-start gap-3 p-2 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const maxOrder = newService.workflows.length > 0
                                      ? Math.max(...newService.workflows.map(w => w.order))
                                      : 0;
                                    setNewService({
                                      ...newService,
                                      workflows: [...newService.workflows, { id: wf.id, order: maxOrder + 1 }]
                                    });
                                  } else {
                                    setNewService({
                                      ...newService,
                                      workflows: newService.workflows
                                        .filter(w => w.id !== wf.id)
                                        .map((w, idx) => ({ ...w, order: idx + 1 }))
                                    });
                                  }
                                }}
                                className="mt-1 w-4 h-4 text-gold-600 rounded focus:ring-gold-500 border-neutral-600 bg-neutral-900 accent-gold-600 cursor-pointer"
                              />
                              <div className="flex-1">
                            <div className="flex items-center gap-2">
                                  <Layers size={14} className="text-gold-500" />
                                  <span className="text-sm font-medium text-slate-300">{wf.label}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs border ${wf.color}`}>
                                    {wf.department}
                                </span>
                            </div>
                                {wf.description && (
                                  <p className="text-xs text-slate-500 mt-1">{wf.description}</p>
                                )}
                            </div>
                            </label>
                          );
                        })
                    )}
                        </div>

                  {/* Danh sách quy trình đã chọn với thứ tự */}
                  {newService.workflows.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-slate-400 mb-2">Thứ tự thực hiện:</p>
                      {newService.workflows
                        .sort((a, b) => a.order - b.order)
                        .map((w, idx) => {
                          const wf = workflows.find(workflow => workflow.id === w.id);
                          if (!wf) return null;
                          return (
                            <div key={w.id} className="flex items-center gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                              <div className="flex items-center gap-2">
                                <GripVertical size={16} className="text-slate-600" />
                                <div className="w-8 h-8 rounded-full bg-gold-600/20 border border-gold-600/50 flex items-center justify-center text-gold-500 font-bold text-sm">
                                  {w.order}
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Layers size={14} className="text-gold-500" />
                                  <span className="text-sm font-medium text-slate-300">{wf.label}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs border ${wf.color}`}>
                                    {wf.department}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {idx > 0 && (
                                  <button
                                    onClick={() => {
                                      const sorted = [...newService.workflows].sort((a, b) => a.order - b.order);
                                      [sorted[idx].order, sorted[idx - 1].order] = [sorted[idx - 1].order, sorted[idx].order];
                                      setNewService({ ...newService, workflows: sorted });
                                    }}
                                    className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                                    title="Lên trước"
                                  >
                                    <ArrowUp size={14} />
                                  </button>
                                )}
                                {idx < newService.workflows.length - 1 && (
                                  <button
                                    onClick={() => {
                                      const sorted = [...newService.workflows].sort((a, b) => a.order - b.order);
                                      [sorted[idx].order, sorted[idx + 1].order] = [sorted[idx + 1].order, sorted[idx].order];
                                      setNewService({ ...newService, workflows: sorted });
                                    }}
                                    className="p-1.5 hover:bg-neutral-800 rounded text-slate-500 hover:text-slate-300"
                                    title="Xuống sau"
                                  >
                                    <ArrowDown size={14} />
                                  </button>
                                )}
                    </div>
                </div>
            );
        })}
      </div>
                  )}
    </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Hình ảnh</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (!file.type.startsWith('image/')) {
                          alert('Vui lòng chọn file ảnh!');
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          alert('File quá lớn! Vui lòng chọn file nhỏ hơn 5MB.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          setNewService({ ...newService, image: base64 });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold-600 file:text-black hover:file:bg-gold-500 file:cursor-pointer"
                  />
                  {newService.image && (
                    <div className="mt-2">
                      <img src={newService.image} alt="Preview" className="w-32 h-32 rounded-lg object-cover border border-neutral-700" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Mô tả</label>
                  <textarea
                    value={newService.desc}
                    onChange={(e) => setNewService({ ...newService, desc: e.target.value })}
                    placeholder="Mô tả dịch vụ..."
                    rows={3}
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-gold-500 outline-none transition-all placeholder-slate-600 resize-none"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-6 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewService({
                      name: '',
                      category: '',
                      price: '',
                      desc: '',
                      workflows: [],
                      image: ''
                    });
                    setCategoryPath([]);
                    setCustomLevels({});
                    setWorkflowSearch('');
                  }}
                  className="px-6 py-2.5 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddService}
                  className="px-6 py-2.5 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded-lg shadow-lg shadow-gold-900/20 transition-all"
                >
                  Thêm Dịch Vụ
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 p-4 space-y-4 flex-shrink-0">
          {/* ROW 1: Search & Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm dịch vụ (Tên, Mô tả...)"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-200 focus:ring-1 focus:ring-gold-500 outline-none transition-all placeholder-slate-600"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  let initialCategory = '';
                  let initialPath: string[] = [];

                  if (selectedCategory) {
                    const path = findCategoryPathById(selectedCategory, CATEGORY_TREE);
                    if (path) {
                      initialPath = path;
                      // Tìm tên category cuối cùng trong path để điền vào newService
                      let currentNodes = CATEGORY_TREE;
                      for (const pid of path) {
                        const node = currentNodes.find(n => n.id === pid);
                        if (node) {
                          initialCategory = node.name;
                          currentNodes = node.children || [];
                        }
                      }
                    }
                  }

                  setNewService({
                    name: '',
                    category: initialCategory,
                    image: '',
                    price: '',
                    desc: '',
                    workflows: []
                  });
                  setCategoryPath(initialPath);
                  setCustomLevels({});
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 bg-gold-600 hover:bg-gold-700 text-black font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-gold-900/20 transition-all font-bold"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Thêm Dịch Vụ</span>
              </button>
            </div>
          </div>

          {/* ROW 2: Filters */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-800">
            <TableFilter onFilterChange={setFilter} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-slate-300 text-sm focus:ring-1 focus:ring-gold-500 outline-none"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.filter(c => c !== 'all').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Services List by Tier */}
        {/* Services Table Layout */}
        <div className="bg-neutral-900 rounded-xl shadow-lg shadow-black/20 border border-neutral-800 flex flex-col overflow-hidden min-h-0 flex-1">
          <div className="overflow-auto flex-1 h-[600px]">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-20 bg-neutral-900 shadow-sm">
                <tr className="border-b border-neutral-800 text-slate-500 text-xs font-bold uppercase tracking-wider bg-neutral-800/50">
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4 min-w-[200px]">Dịch Vụ</th>
                  <th className="p-4">Danh Mục</th>
                  <th className="p-4">Quy Trình</th>
                  <th className="p-4 text-right">Đơn Giá</th>
                  <th className="p-4 w-12 sticky right-0 bg-neutral-900 z-30"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500">Đang tải dịch vụ...</td></tr>
                ) : filteredServices.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500">Không tìm thấy dịch vụ nào phù hợp</td></tr>
                ) : filteredServices.map((service, index) => {

                  // Xử lý workflows logic
                  let svcWorkflows: Array<{ id: string; order: number }> = [];
                  if (service.workflows && Array.isArray(service.workflows)) {
                    svcWorkflows = service.workflows;
                  } else {
                    const workflowIds = Array.isArray(service.workflowId)
                      ? service.workflowId
                      : [service.workflowId].filter(Boolean);
                    svcWorkflows = workflowIds.map((id, idx) => ({ id, order: idx + 1 }));
                  }

                  const sortedWorkflows = svcWorkflows
                    .sort((a, b) => a.order - b.order)
                    .map(w => workflows.find(wf => wf.id === w.id))
                    .filter(Boolean);

                  return (
                    <tr key={service.id} className="transition-colors cursor-pointer group hover:bg-neutral-800/50" onClick={() => handleViewService(service)}>
                      <td className="p-4 text-center text-slate-600 text-xs">{index + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg border border-neutral-700 overflow-hidden bg-neutral-800 flex-shrink-0">
                            {service.image ? (
                              <img src={service.image} className="w-full h-full object-cover" alt={service.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600"><Briefcase size={20} /></div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-200">{service.name}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">#{service.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-300 bg-neutral-800 px-2 py-1 rounded border border-neutral-700">
                          {service.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {sortedWorkflows.length > 0 ? (
                            sortedWorkflows.map((workflow, idx) => {
                              if (!workflow) return null;
                              return (
                                <span key={workflow.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${workflow.color}`}>
                                  {workflow.label}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-slate-500 italic">--</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-gold-400">
                        {service.price.toLocaleString()} ₫
                      </td>
                      <td className="p-4 sticky right-0 bg-neutral-900/95 backdrop-blur-sm group-hover:bg-neutral-800 transition-colors z-20">
                        <ActionMenu
                          itemName={service.name}
                          onView={() => handleViewService(service)}
                          onEdit={() => handleEditService(service)}
                          onDelete={() => handleDeleteService(service)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

};