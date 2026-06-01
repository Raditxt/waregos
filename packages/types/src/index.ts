// ============================================
// AUTH TYPES
// ============================================
export interface JwtPayload {
  sub: string
  username: string
  role: 'ADMIN' | 'CASHIER'
  iat?: number
  exp?: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: UserDto
}

// ============================================
// USER TYPES
// ============================================
export interface UserDto {
  id: string
  name: string
  username: string
  role: 'ADMIN' | 'CASHIER'
  isActive: boolean
  createdAt: string
}

// ============================================
// PRODUCT TYPES
// ============================================
export interface ProductDto {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  categoryId: string | null
  categoryName: string | null
  unitId: string
  unitName: string
  unitSymbol: string
  buyPrice: number
  sellPrice: number
  stock: number
  minStock: number
  isActive: boolean
}

export interface CreateProductRequest {
  name: string
  sku?: string
  barcode?: string
  categoryId?: string
  unitId: string
  buyPrice: number
  sellPrice: number
  stock?: number
  minStock?: number
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

// ============================================
// TRANSACTION TYPES
// ============================================
export interface TransactionItemRequest {
  productId: string
  quantity: number
  sellPrice: number
}

export interface CreateTransactionRequest {
  items: TransactionItemRequest[]
  paymentMethod: 'CASH' | 'TRANSFER' | 'QRIS'
  paidAmount: number
  notes?: string
}

export interface TransactionDto {
  id: string
  invoiceNumber: string
  userId: string
  userName: string
  status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
  paymentMethod: 'CASH' | 'TRANSFER' | 'QRIS'
  totalAmount: number
  paidAmount: number
  changeAmount: number
  notes: string | null
  createdAt: string
  items: TransactionItemDto[]
}

export interface TransactionItemDto {
  id: string
  productId: string
  productName: string
  quantity: number
  buyPrice: number
  sellPrice: number
  subtotal: number
}

// ============================================
// PURCHASE TYPES
// ============================================
export interface PurchaseItemRequest {
  productId: string
  quantity: number
  buyPrice: number
}

export interface CreatePurchaseRequest {
  supplierId?: string
  items: PurchaseItemRequest[]
  notes?: string
  purchasedAt?: string
}

// ============================================
// API RESPONSE WRAPPER
// ============================================
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiError {
  success: false
  error: string
  message: string
  statusCode: number
}

// ============================================
// REPORT TYPES
// ============================================
export interface DailySummary {
  date: string
  totalTransactions: number
  totalRevenue: number
  totalProfit: number
  totalItemsSold: number
}

export interface LowStockProduct {
  id: string
  name: string
  stock: number
  minStock: number
  unit: string
}