import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/constants/api_constants.dart';

class DebtSummary {
  final String customerName;
  final double totalDebt;
  final String lastActivity;
  final int transactionCount;

  const DebtSummary({
    required this.customerName,
    required this.totalDebt,
    required this.lastActivity,
    required this.transactionCount,
  });

  factory DebtSummary.fromJson(Map<String, dynamic> json) {
    return DebtSummary(
      customerName: json['customerName'] as String,
      totalDebt: (json['totalDebt'] as num).toDouble(),
      lastActivity: json['lastActivity'] as String,
      transactionCount: json['transactionCount'] as int,
    );
  }
}

class DebtHistoryItem {
  final String id;
  final String type;
  final double amount;
  final double balance;
  final List<Map<String, dynamic>>? items;
  final String? notes;
  final String? invoiceNumber;
  final String createdBy;
  final String createdAt;

  const DebtHistoryItem({
    required this.id,
    required this.type,
    required this.amount,
    required this.balance,
    this.items,
    this.notes,
    this.invoiceNumber,
    required this.createdBy,
    required this.createdAt,
  });

  factory DebtHistoryItem.fromJson(Map<String, dynamic> json) {
    return DebtHistoryItem(
      id: json['id'] as String,
      type: json['type'] as String,
      amount: (json['amount'] as num).toDouble(),
      balance: (json['balance'] as num).toDouble(),
      items: (json['items'] as List?)
          ?.map((e) => e as Map<String, dynamic>)
          .toList(),
      notes: json['notes'] as String?,
      invoiceNumber: json['invoiceNumber'] as String?,
      createdBy: json['createdBy'] as String,
      createdAt: json['createdAt'] as String,
    );
  }
}

class DebtsState {
  final List<DebtSummary> debts;
  final bool isLoading;
  final String? error;

  const DebtsState({
    this.debts = const [],
    this.isLoading = false,
    this.error,
  });

  double get totalOutstanding =>
      debts.fold(0, (sum, d) => sum + d.totalDebt);

  DebtsState copyWith({
    List<DebtSummary>? debts,
    bool? isLoading,
    String? error,
  }) {
    return DebtsState(
      debts: debts ?? this.debts,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class DebtsNotifier extends StateNotifier<DebtsState> {
  DebtsNotifier() : super(const DebtsState());

  Future<void> loadDebts() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await ApiClient.get(ApiConstants.debts);
      final debts = (res.data['data'] as List)
          .map((e) => DebtSummary.fromJson(e as Map<String, dynamic>))
          .toList();
      state = state.copyWith(debts: debts, isLoading: false);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        error: 'Gagal memuat data hutang',
      );
    }
  }

  Future<Map<String, dynamic>?> getHistory(String customerName) async {
    try {
      final res = await ApiClient.get(
        '${ApiConstants.debts}/${Uri.encodeComponent(customerName)}',
      );
      return res.data['data'] as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<bool> addDebt({
    required String customerName,
    required double amount,
    String? notes,
  }) async {
    try {
      await ApiClient.post(ApiConstants.debts, data: {
        'customerName': customerName,
        'amount': amount,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      });
      await loadDebts();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> addPayment({
    required String customerName,
    required double amount,
    String? notes,
  }) async {
    try {
      await ApiClient.post(ApiConstants.debtPayment, data: {
        'customerName': customerName,
        'amount': amount,
        'notes': notes ?? 'Bayar hutang',
      });
      await loadDebts();
      return true;
    } catch (_) {
      return false;
    }
  }
}

final debtsProvider =
    StateNotifierProvider<DebtsNotifier, DebtsState>((ref) {
  return DebtsNotifier();
});