class ApiConstants {
  // Default IP — bisa diubah dari settings di dalam app
  static const String defaultBaseUrl = 'http://192.168.56.1:3001/api';
  static const String settingsKey = 'waregos_server_url';
  
  // Auth
  static const String login = '/auth/login';
  static const String me = '/auth/me';
  static const String changePassword = '/auth/change-password';
  
  // Products
  static const String products = '/products';
  static const String lowStock = '/products/low-stock';
  static const String expiringSoon = '/products/expiring-soon';
  
  // Transactions
  static const String transactions = '/transactions';
  
  // Debts
  static const String debts = '/debts';
  static const String debtPayment = '/debts/payment';
  static const String debtSearch = '/debts/search';
  
  // Reports
  static const String reportSummary = '/reports/summary';
  static const String reportClosing = '/reports/closing';
  
  // Catalog
  static const String categories = '/catalog/categories';
  static const String units = '/catalog/units';
}