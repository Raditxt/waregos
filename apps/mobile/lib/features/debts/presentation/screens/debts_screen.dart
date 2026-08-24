import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../providers/debts_provider.dart';

class DebtsScreen extends ConsumerStatefulWidget {
  const DebtsScreen({super.key});

  @override
  ConsumerState<DebtsScreen> createState() => _DebtsScreenState();
}

class _DebtsScreenState extends ConsumerState<DebtsScreen> {
  final _rupiahFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(debtsProvider.notifier).loadDebts();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(debtsProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        // Header summary
        if (state.debts.isNotEmpty)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.all(12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Total Outstanding',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: Colors.red.shade700,
                      ),
                    ),
                    Text(
                      _rupiahFormat.format(state.totalOutstanding),
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.red.shade700,
                      ),
                    ),
                  ],
                ),
                Text(
                  '${state.debts.length} pelanggan',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: Colors.red.shade600,
                  ),
                ),
              ],
            ),
          ),

        // Action buttons
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => _showAddDebtDialog(context),
                  icon: const Icon(Icons.add, size: 18),
                  label: Text(
                    'Catat Hutang',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _showPaymentDialog(context),
                  icon: const Icon(Icons.payments_outlined, size: 18),
                  label: Text(
                    'Catat Bayar',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 8),

        // List
        Expanded(
          child: state.isLoading
              ? const Center(child: CircularProgressIndicator())
              : state.error != null
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(state.error!),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: () =>
                                ref.read(debtsProvider.notifier).loadDebts(),
                            child: const Text('Coba Lagi'),
                          ),
                        ],
                      ),
                    )
                  : state.debts.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.check_circle_outline,
                                size: 64,
                                color: Colors.green.shade400,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Tidak ada hutang!',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: () =>
                              ref.read(debtsProvider.notifier).loadDebts(),
                          child: ListView.separated(
                            padding: const EdgeInsets.all(12),
                            itemCount: state.debts.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 8),
                            itemBuilder: (ctx, i) =>
                                _buildDebtCard(state.debts[i], colorScheme),
                          ),
                        ),
        ),
      ],
    );
  }

  Widget _buildDebtCard(DebtSummary debt, ColorScheme colorScheme) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outlineVariant),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showHistory(debt.customerName),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: Colors.red.shade100,
                child: Text(
                  debt.customerName.substring(0, 1).toUpperCase(),
                  style: GoogleFonts.inter(
                    color: Colors.red.shade700,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      debt.customerName,
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      '${debt.transactionCount} transaksi',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    _rupiahFormat.format(debt.totalDebt),
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Colors.red.shade700,
                    ),
                  ),
                  Text(
                    'belum lunas',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showHistory(String customerName) async {
    final data =
        await ref.read(debtsProvider.notifier).getHistory(customerName);
    if (data == null || !mounted) return;

    final history = (data['history'] as List)
        .map((e) => DebtHistoryItem.fromJson(e as Map<String, dynamic>))
        .toList();
    final totalDebt = (data['totalDebt'] as num).toDouble();

    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.95,
        minChildSize: 0.4,
        expand: false,
        builder: (ctx, scroll) => Column(
          children: [
            // Handle
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    customerName,
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    _rupiahFormat.format(totalDebt),
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.red.shade700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: FilledButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  _showPaymentDialog(context,
                      prefilledName: customerName);
                },
                icon: const Icon(Icons.payments_outlined, size: 16),
                label: const Text('Catat Pembayaran'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(double.infinity, 40),
                  backgroundColor: Colors.green.shade600,
                ),
              ),
            ),
            const Divider(height: 24),
            // History
            Expanded(
              child: ListView.separated(
                controller: scroll,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: history.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (ctx, i) {
                  final h = history[i];
                  final isDebt = h.type == 'DEBT';
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      color: isDebt
                          ? Colors.red.shade50
                          : Colors.green.shade50,
                      border: Border.all(
                        color: isDebt
                            ? Colors.red.shade200
                            : Colors.green.shade200,
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          isDebt
                              ? Icons.arrow_upward_rounded
                              : Icons.arrow_downward_rounded,
                          size: 18,
                          color: isDebt
                              ? Colors.red.shade600
                              : Colors.green.shade600,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isDebt ? 'Ambil hutang' : 'Bayar hutang',
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                              if (h.notes != null)
                                Text(
                                  h.notes!,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              if (h.items != null && h.items!.isNotEmpty)
                                ...h.items!.map((item) => Text(
                                      '• ${item['name']} ×${item['quantity']}',
                                      style: GoogleFonts.inter(
                                          fontSize: 11,
                                          color: Colors.grey.shade600),
                                    )),
                              Text(
                                DateFormat('d MMM yyyy, HH:mm').format(
                                    DateTime.parse(h.createdAt)
                                        .toLocal()),
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  color: Colors.grey.shade500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '${isDebt ? '+' : '-'}${_rupiahFormat.format(h.amount)}',
                              style: GoogleFonts.inter(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: isDebt
                                    ? Colors.red.shade700
                                    : Colors.green.shade700,
                              ),
                            ),
                            Text(
                              'sisa ${_rupiahFormat.format(h.balance)}',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                color: Colors.grey.shade500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddDebtDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final notesCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Catat Hutang', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: InputDecoration(
                labelText: 'Nama Pelanggan *',
                hintText: 'Bu Sari, Pak Budi...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Total Hutang *',
                prefixText: 'Rp ',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: notesCtrl,
              decoration: InputDecoration(
                labelText: 'Catatan (opsional)',
                hintText: 'Indomie 2, Aqua 1...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () async {
              final name = nameCtrl.text.trim();
              final amount = double.tryParse(amountCtrl.text) ?? 0;
              if (name.isEmpty || amount <= 0) return;

              final success = await ref
                  .read(debtsProvider.notifier)
                  .addDebt(
                    customerName: name,
                    amount: amount,
                    notes: notesCtrl.text.trim(),
                  );

              if (ctx.mounted) {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success
                        ? 'Hutang berhasil dicatat'
                        : 'Gagal mencatat hutang'),
                    backgroundColor: success ? Colors.green : Colors.red,
                  ),
                );
              }
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  void _showPaymentDialog(BuildContext context, {String? prefilledName}) {
    final nameCtrl = TextEditingController(text: prefilledName ?? '');
    final amountCtrl = TextEditingController();
    final notesCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Catat Pembayaran', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: InputDecoration(
                labelText: 'Nama Pelanggan *',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Jumlah Bayar *',
                prefixText: 'Rp ',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: notesCtrl,
              decoration: InputDecoration(
                labelText: 'Catatan (opsional)',
                hintText: 'Bayar sebagian, lunas...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () async {
              final name = nameCtrl.text.trim();
              final amount = double.tryParse(amountCtrl.text) ?? 0;
              if (name.isEmpty || amount <= 0) return;

              final success = await ref
                  .read(debtsProvider.notifier)
                  .addPayment(
                    customerName: name,
                    amount: amount,
                    notes: notesCtrl.text.trim(),
                  );

              if (ctx.mounted) {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success
                        ? 'Pembayaran berhasil dicatat'
                        : 'Gagal mencatat pembayaran'),
                    backgroundColor: success ? Colors.green : Colors.red,
                  ),
                );
              }
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }
}