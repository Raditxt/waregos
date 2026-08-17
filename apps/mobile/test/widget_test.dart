import 'package:flutter_test/flutter_test.dart';
import 'package:waregos_mobile/main.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets('Waregos app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: WaregosMobileApp(),
      ),
    );
    expect(find.byType(WaregosMobileApp), findsOneWidget);
  });
}