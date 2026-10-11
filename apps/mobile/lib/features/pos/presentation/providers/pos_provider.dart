import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/constants/api_constants.dart';

class CartItem {
  final String productId;
  final String name;
  final String unitSymbol;
  final double sellPrice;
  final int stock;
  int quantity;

  CartItem({
    required this.productId,
    required this.name,
    required this.unitSymbol,
    required this.sellPrice,
    required this.stock,
    this.quantity = 1,
  });
}

class ProductResult {
  final String id;
  final String name;
  final String unitSymbol;
  final double sellPrice;
  final int stock;
  final int minStock;

  const ProductResult({
    required this.id,
    required this.name,
    required this.unitSymbol,
    required this.sellPrice,
    required this.stock,
    required this.minStock,
  });

  factory ProductResult.fromJson(Map<String, dynamic> json) {
    return ProductResult(
      id: json['id'] as String,
      name: json['name'] as String,
      unitSymbol: json['unitSymbol'] as String,
      sellPrice: (json['sellPrice'] as num).toDouble(),
      stock: json['stock'] as int,
      minStock: json['minStock'] as int,
    );
  }
}

class PosState {
  final List<CartItem> cart;
  final List<ProductResult> searchResults;
  final bool isLoading;
  final String? error;
  final Map<String, dynamic>? lastReceipt;

  const PosState({
    this.cart = const [],
    this.searchResults = const [],
    this.isLoading = false,
    this.error,
    this.lastReceipt,
  });

  double get totalAmount => cart.fold(
    0, (sum, item) => sum + item.sellPrice * item.quantity,
  );

  PosState copyWith({
    List<CartItem>? cart,
    List<ProductResult>? searchResults,
    bool? isLoading,
    String? error,
    Map<String, dynamic>? lastReceipt,
  }) {
    return PosState(
      cart: cart ?? this.cart,
      searchResults: searchResults ?? this.searchResults,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastReceipt: lastReceipt ?? this.lastReceipt,
    );
  }
}

class PosNotifier extends StateNotifier<PosState> {
  PosNotifier() : super(const PosState());

  final _uuid = const Uuid();

  // Kunci idempotency untuk checkout yang sedang berjalan.
  // Di-generate sekali per upaya checkout, di-reset setelah sukses
  // supaya transaksi berikutnya dapat kunci baru. Kalau request gagal,
  // kunci tetap sama → retry tidak akan dobel bikin transaksi.
  String? _checkoutKey;

  // "Sidik jari" isi checkout saat kunci dibuat. Dipakai buat deteksi kalau
  // user mengubah keranjang/metode/pelanggan setelah request gagal — kalau
  // berubah, kunci lama sudah tidak relevan dan harus diganti kunci baru.
  // Tanpa ini, kunci lama akan dipakai ulang untuk transaksi yang berbeda,
  // dan server bisa mengembalikan transaksi lama (replay) padahal user
  // berniat bikin transaksi baru.
  String? _checkoutFingerprint;

  // Ciri unik satu upaya checkout: isi keranjang + metode bayar + pelanggan.
  // Item di-sort by productId dulu supaya urutan tidak mempengaruhi hasil.
  String _fingerprint(String paymentMethod, String? customerName) {
    final items = [...state.cart]..sort((a, b) => a.productId.compareTo(b.productId));
    final lines = items.map((i) => '${i.productId}x${i.quantity}@${i.sellPrice}').join(',');
    return '$paymentMethod|${customerName ?? ''}|$lines';
  }

  Future<void> searchProducts(String query) async {
    if (query.isEmpty) {
      state = state.copyWith(searchResults: []);
      return;
    }
    try {
      final res = await ApiClient.get(
        ApiConstants.products,
        params: {'search': query, 'limit': '10'},
      );
      final data = res.data['data'] as List;
      state = state.copyWith(
        searchResults: data.map((e) => ProductResult.fromJson(e as Map<String, dynamic>)).toList(),
      );
    } catch (_) {
      state = state.copyWith(searchResults: []);
    }
  }

  void clearSearch() {
    state = state.copyWith(searchResults: []);
  }

  void addToCart(ProductResult product) {
    final existing = state.cart.indexWhere((i) => i.productId == product.id);
    if (existing >= 0) {
      final item = state.cart[existing];
      if (item.quantity >= product.stock) return;
      final newCart = [...state.cart];
      newCart[existing] = CartItem(
        productId: item.productId,
        name: item.name,
        unitSymbol: item.unitSymbol,
        sellPrice: item.sellPrice,
        stock: item.stock,
        quantity: item.quantity + 1,
      );
      state = state.copyWith(cart: newCart);
    } else {
      state = state.copyWith(
        cart: [
          ...state.cart,
          CartItem(
            productId: product.id,
            name: product.name,
            unitSymbol: product.unitSymbol,
            sellPrice: product.sellPrice,
            stock: product.stock,
          ),
        ],
      );
    }
  }

  void updateQty(String productId, int delta) {
    final newCart = state.cart.map((item) {
      if (item.productId != productId) return item;
      final newQty = item.quantity + delta;
      if (newQty <= 0 || newQty > item.stock) return item;
      return CartItem(
        productId: item.productId,
        name: item.name,
        unitSymbol: item.unitSymbol,
        sellPrice: item.sellPrice,
        stock: item.stock,
        quantity: newQty,
      );
    }).toList();
    state = state.copyWith(cart: newCart);
  }

  void removeFromCart(String productId) {
    state = state.copyWith(
      cart: state.cart.where((i) => i.productId != productId).toList(),
    );
  }

  void clearCart() {
    state = state.copyWith(cart: []);
  }

  Future<bool> checkout({
    required String paymentMethod,
    required double paidAmount,
    String? customerName,
  }) async {
    if (state.cart.isEmpty) return false;

    if (paymentMethod == 'CASH' && paidAmount < state.totalAmount) {
      state = state.copyWith(error: 'Uang bayar kurang dari total');
      return false;
    }

    if (paymentMethod == 'DEBT' && (customerName == null || customerName.isEmpty)) {
      state = state.copyWith(error: 'Nama pelanggan wajib diisi');
      return false;
    }

    state = state.copyWith(isLoading: true, error: null);

    // Kunci dibuat sekali per upaya checkout. Kalau user klik bayar dua kali
    // (double-tap) atau retry karena timeout, kunci yang sama dikirim ulang →
    // server mengenali sebagai replay dan tidak membuat transaksi duplikat.
    //
    // Tapi kalau keranjang/metode/pelanggan sudah berubah sejak kunci terakhir
    // dibuat, berarti ini adalah transaksi yang berbeda — bukan retry. Buat
    // kunci baru supaya server tidak salah menganggapnya replay.
    final fp = _fingerprint(paymentMethod, customerName);
    if (_checkoutKey == null || _checkoutFingerprint != fp) {
      _checkoutKey = _uuid.v4();
      _checkoutFingerprint = fp;
    }

    try {
      final res = await ApiClient.post(
        ApiConstants.transactions,
        data: {
          'items': state.cart.map((i) => {
            'productId': i.productId,
            'quantity': i.quantity,
            'sellPrice': i.sellPrice,
          }).toList(),
          'paymentMethod': paymentMethod,
          'paidAmount': paymentMethod == 'CASH' ? paidAmount : 0,
          if (paymentMethod == 'DEBT') 'customerName': customerName,
          'idempotencyKey': _checkoutKey,
        },
      );

      final trx = res.data['data'] as Map<String, dynamic>;
      final receipt = {
        'invoiceNumber': trx['invoiceNumber'],
        'totalAmount': trx['totalAmount'],
        'paidAmount': trx['paidAmount'],
        'changeAmount': trx['changeAmount'],
        'paymentMethod': trx['paymentMethod'],
        'customerName': customerName,
        'items': state.cart.map((i) => {
          'name': i.name,
          'quantity': i.quantity,
          'subtotal': i.sellPrice * i.quantity,
        }).toList(),
      };

      // Reset kunci DAN fingerprint HANYA setelah sukses → transaksi
      // berikutnya dapat kunci baru.
      _checkoutKey = null;
      _checkoutFingerprint = null;
      state = PosState(lastReceipt: receipt);
      return true;
    } on DioException catch (e) {
      // Tampilkan pesan dari server (mis. "Stok ... tidak cukup"), bukan teks generik
      final data = e.response?.data;
      final serverMessage = (data is Map && data['message'] is String)
          ? data['message'] as String
          : null;
      state = state.copyWith(
        isLoading: false,
        error: serverMessage ?? 'Transaksi gagal. Periksa koneksi ke server.',
      );
      // Sengaja TIDAK reset _checkoutKey / _checkoutFingerprint di sini.
      // Kalau errornya karena network timeout dan sebenarnya server sudah
      // memproses transaksi, user bisa tekan Bayar lagi dengan isi keranjang
      // yang sama → server akan mengenali sebagai replay. Kalau isi keranjang
      // berubah, fingerprint beda → kunci baru dibuat di percobaan berikutnya.
      return false;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        error: 'Transaksi gagal. Periksa koneksi ke server.',
      );
      return false;
    }
  }
}

final posProvider = StateNotifierProvider<PosNotifier, PosState>((ref) {
  return PosNotifier();
});