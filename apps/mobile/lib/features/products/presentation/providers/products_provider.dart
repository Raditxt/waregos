import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/constants/api_constants.dart';

class ProductModel {
  final String id;
  final String name;
  final String? sku;
  final String? barcode;
  final String? categoryName;
  final String unitSymbol;
  final double? buyPrice;
  final double sellPrice;
  final int stock;
  final int minStock;
  final String? expiryDate;
  final String? expiryStatus;

  const ProductModel({
    required this.id,
    required this.name,
    this.sku,
    this.barcode,
    this.categoryName,
    required this.unitSymbol,
    this.buyPrice,
    required this.sellPrice,
    required this.stock,
    required this.minStock,
    this.expiryDate,
    this.expiryStatus,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] as String,
      name: json['name'] as String,
      sku: json['sku'] as String?,
      barcode: json['barcode'] as String?,
      categoryName: json['categoryName'] as String?,
      unitSymbol: json['unitSymbol'] as String,
      buyPrice: json['buyPrice'] != null
          ? (json['buyPrice'] as num).toDouble()
          : null,
      sellPrice: (json['sellPrice'] as num).toDouble(),
      stock: json['stock'] as int,
      minStock: json['minStock'] as int,
      expiryDate: json['expiryDate'] as String?,
      expiryStatus: json['expiryStatus'] as String?,
    );
  }

  bool get isLowStock => stock <= minStock;
  bool get isExpired => expiryStatus == 'expired';
  bool get isExpiringSoon => expiryStatus == 'expiring_soon';
}

class ProductsState {
  final List<ProductModel> products;
  final List<ProductModel> lowStock;
  final List<ProductModel> expiringSoon;
  final bool isLoading;
  final String? error;
  final String searchQuery;

  const ProductsState({
    this.products = const [],
    this.lowStock = const [],
    this.expiringSoon = const [],
    this.isLoading = false,
    this.error,
    this.searchQuery = '',
  });

  ProductsState copyWith({
    List<ProductModel>? products,
    List<ProductModel>? lowStock,
    List<ProductModel>? expiringSoon,
    bool? isLoading,
    String? error,
    String? searchQuery,
  }) {
    return ProductsState(
      products: products ?? this.products,
      lowStock: lowStock ?? this.lowStock,
      expiringSoon: expiringSoon ?? this.expiringSoon,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

class ProductsNotifier extends StateNotifier<ProductsState> {
  ProductsNotifier() : super(const ProductsState());

  Future<void> loadAll() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        ApiClient.get(ApiConstants.products, params: {'limit': '100'}),
        ApiClient.get(ApiConstants.lowStock),
        ApiClient.get(ApiConstants.expiringSoon),
      ]);

      final products = (results[0].data['data'] as List)
          .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
          .toList();

      final lowStock = (results[1].data['data'] as List)
          .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
          .toList();

      final expiringSoon = (results[2].data['data'] as List)
          .map((e) => ProductModel.fromJson({
                'id': e['id'],
                'name': e['name'],
                'unitSymbol': e['unit'],
                'sellPrice': 0,
                'stock': e['stock'],
                'minStock': 0,
                'expiryDate': e['expiryDate'],
                'expiryStatus': e['status'],
              }))
          .toList();

      state = state.copyWith(
        products: products,
        lowStock: lowStock,
        expiringSoon: expiringSoon,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Gagal memuat produk',
      );
    }
  }

  Future<void> search(String query) async {
    state = state.copyWith(searchQuery: query);
    if (query.isEmpty) {
      await loadAll();
      return;
    }
    try {
      final res = await ApiClient.get(
        ApiConstants.products,
        params: {'search': query, 'limit': '50'},
      );
      final products = (res.data['data'] as List)
          .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
          .toList();
      state = state.copyWith(products: products);
    } catch (_) {}
  }
}

final productsProvider =
    StateNotifierProvider<ProductsNotifier, ProductsState>((ref) {
  return ProductsNotifier();
});