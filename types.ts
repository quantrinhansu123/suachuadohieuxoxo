export enum OrderStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  PROCESSING = 'Processing',
  DONE = 'Done',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled'
}

export enum ServiceType {
  CLEANING = 'Cleaning',
  REPAIR = 'Repair',
  PLATING = 'Plating',
  DYEING = 'Dyeing',
  CUSTOM = 'Custom',
  PRODUCT = 'Product'
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  tier: 'Standard' | 'VIP' | 'VVIP';
  totalSpent: number;
  lastVisit: string;
  notes?: string;
}

// Interface for tracking time and user per stage
export interface TaskHistory {
  stageId: string;
  stageName: string;
  enteredAt: number; // Timestamp when entered this stage
  leftAt?: number;   // Timestamp when left this stage
  duration?: number; // Duration in milliseconds
  performedBy: string; // User ID or Name
}

export interface TechnicalLog {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  stage: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  type: ServiceType;
  price: number;
  quantity: number;
  status: 'In Queue' | 'Cleaning' | 'Repairing' | 'QC' | 'Ready' | 'Done';
  technicianId?: string;
  beforeImage?: string;
  afterImage?: string;
  isProduct?: boolean;
  // New fields for tracking
  serviceId?: string; // Link back to Service Catalog ID to find Workflow
  history?: TaskHistory[];
  lastUpdated?: number;
  technicalLog?: TechnicalLog[]; // Added for persistent notes between stages
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: ServiceItem[];
  totalAmount: number;
  deposit: number;
  status: OrderStatus;
  createdAt: string;
  expectedDelivery: string;
  notes?: string;
}

export interface CRMTask {
  id: string;
  customerId: string;
  customerName: string;
  type: 'Call Day 3' | 'Call Day 5' | 'Call Day 7' | 'Warranty Check' | 'Birthday';
  dueDate: string;
  status: 'Pending' | 'Overdue' | 'Done';
}

export interface RevenueStat {
  name: string;
  value: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'Hoá chất' | 'Phụ kiện' | 'Dụng cụ' | 'Vật tư tiêu hao';
  quantity: number;
  unit: string;
  minThreshold: number;
  importPrice: number;
  supplier: string;
  lastImport: string;
  image?: string;
}

export interface Member {
  id: string;
  name: string;
  role: 'Quản lý' | 'Tư vấn viên' | 'Kỹ thuật viên' | 'QC';
  phone: string;
  email: string;
  status: 'Active' | 'Off';
  avatar?: string;
  specialty?: string;
}

export interface WorkflowMaterial {
  inventoryItemId: string;
  quantity: number;
}

export interface WorkflowDefinition {
  id: string;
  label: string;
  types: ServiceType[];
  description?: string;
  color: string;
  department: 'Kỹ Thuật' | 'Spa' | 'QA/QC' | 'Hậu Cần';
  materials?: WorkflowMaterial[];
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  desc: string;
  image: string;
  workflowId: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  desc?: string;
}

export interface CompanyConfig {
  name: string;
  slogan: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  themeColor: string;
}

export interface RoleConfig {
  id: string;
  name: string;
  permissions: {
    dashboard: boolean;
    customers: boolean;
    orders: boolean;
    inventory: boolean;
    settings: boolean;
  };
}

export interface SalaryConfig {
  roleId: string;
  baseSalary: number;
  allowance: number;
  commissionRate: {
    [key in ServiceType]?: number;
  };
}