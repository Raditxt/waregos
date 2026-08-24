import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/constants/api_constants.dart';

class DailySummary {
  final String date;
  final int totalTransactions;
  final double totalRevenue;
  final double totalProfit;
  final int totalItemsSold;

  const DailySummary({
    required this.date,
    required this.totalTransactions,
    required this.totalRevenue,
    required this.totalProfit,
    required this.totalItemsSold,
  });

  factory DailySummary.fromJson(Map<String, dynamic> json) {
    return DailySummary(
      date: json['date'] as String,
      totalTransactions: json['totalTransactions'] as int,
      totalRevenue: (json['totalRevenue'] as num).toDouble(),
      totalProfit: (json['totalProfit'] as num).toDouble(),
      totalItemsSold: json['totalItemsSold'] as int,
    );
  }
}

class ClosingData {
  final String date;
  final int totalTransactions;
  final int cancelledTransactions;
  final double totalRevenue;
  final double totalProfit;
  final int totalItems;
  final double expectedCash;
  final Map<String, dynamic> byPaymentMethod;
  final Map<String, dynamic>? lastTransaction;

  const ClosingData({
    required this.date,
    required this.totalTransactions,
    required this.cancelledTransactions,
    required this.totalRevenue,
    required this.totalProfit,
    required this.totalItems,
    required this.expectedCash,
    required this.byPaymentMethod,
    this.lastTransaction,
  });

  // ================== FACTORY DENGAN DEFENSIVE CHECK ==================
  factory ClosingData.fromJson(Map<String, dynamic> json) {
    // Pastikan semua payment method ada
    final byPaymentMethod = Map<String, dynamic>.from(
      json['byPaymentMethod'] as Map<String, dynamic>,
    );
    // Default kalau tidak ada
    for (final key in ['CASH', 'TRANSFER', 'QRIS', 'DEBT']) {
      byPaymentMethod.putIfAbsent(key, () => {'count': 0, 'total': 0});
    }

    // ===== PARSING lastTransaction SECARA EKSPLISIT =====
    final Map<String, dynamic>? lastTransaction = json['lastTransaction'] != null
        ? {
            'invoiceNumber': json['lastTransaction']['invoiceNumber'] as String,
            'createdAt': json['lastTransaction']['createdAt'] as String,
            'totalAmount': (json['lastTransaction']['totalAmount'] as num).toDouble(),
          }
        : null;

    return ClosingData(
      date: json['date'] as String,
      totalTransactions: json['totalTransactions'] as int,
      cancelledTransactions: json['cancelledTransactions'] as int,
      totalRevenue: (json['totalRevenue'] as num).toDouble(),
      totalProfit: (json['totalProfit'] as num).toDouble(),
      totalItems: json['totalItems'] as int,
      expectedCash: (json['expectedCash'] as num).toDouble(),
      byPaymentMethod: byPaymentMethod,
      lastTransaction: lastTransaction,
    );
  }
}

class ReportsState {
  final DailySummary? daily;
  final ClosingData? closing;
  final bool isLoadingDaily;
  final bool isLoadingClosing;
  final String selectedDate;

  const ReportsState({
    this.daily,
    this.closing,
    this.isLoadingDaily = false,
    this.isLoadingClosing = false,
    required this.selectedDate,
  });

  ReportsState copyWith({
    DailySummary? daily,
    ClosingData? closing,
    bool? isLoadingDaily,
    bool? isLoadingClosing,
    String? selectedDate,
  }) {
    return ReportsState(
      daily: daily ?? this.daily,
      closing: closing ?? this.closing,
      isLoadingDaily: isLoadingDaily ?? this.isLoadingDaily,
      isLoadingClosing: isLoadingClosing ?? this.isLoadingClosing,
      selectedDate: selectedDate ?? this.selectedDate,
    );
  }
}

class ReportsNotifier extends StateNotifier<ReportsState> {
  ReportsNotifier()
      : super(ReportsState(
          selectedDate: DateTime.now().toIso8601String().substring(0, 10),
        ));

  // ================== loadAll DENGAN SEQUENTIAL DAN DEBUG ==================
  Future<void> loadAll(String date) async {
    state = state.copyWith(
      isLoadingDaily: true,
      isLoadingClosing: true,
      selectedDate: date,
    );

    try {
      final summaryRes = await ApiClient.get(
        ApiConstants.reportSummary,
        params: {'date': date},
      );
      debugPrint('Summary OK: ${summaryRes.data}');

      final closingRes = await ApiClient.get(
        ApiConstants.reportClosing,
        params: {'date': date},
      );
      debugPrint('Closing OK: ${closingRes.data}');

      final daily = DailySummary.fromJson(
        summaryRes.data['data'] as Map<String, dynamic>,
      );
      debugPrint('Daily parsed OK');

      final closing = ClosingData.fromJson(
        closingRes.data['data'] as Map<String, dynamic>,
      );
      debugPrint('Closing parsed OK');

      state = state.copyWith(
        daily: daily,
        closing: closing,
        isLoadingDaily: false,
        isLoadingClosing: false,
      );
    } catch (e, stack) {
      debugPrint('=== REPORTS ERROR ===');
      debugPrint('Error: $e');
      debugPrint('Stack: $stack');
      debugPrint('====================');
      state = state.copyWith(
        isLoadingDaily: false,
        isLoadingClosing: false,
      );
    }
  }
}

final reportsProvider =
    StateNotifierProvider<ReportsNotifier, ReportsState>((ref) {
  return ReportsNotifier();
});