import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:asistente_pln_ec/core/auth.dart';
import 'package:asistente_pln_ec/screens/welcome_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('flutter_tts'), (_) async => 1);
  });

  testWidgets('muestra la bienvenida y el botón de inicio', (tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => AuthState(),
        child: const MaterialApp(home: WelcomeScreen()),
      ),
    );
    await tester.pump();

    expect(find.textContaining('Tu voz, tus palabras'), findsOneWidget);
    expect(find.text('Iniciar'), findsOneWidget);
    expect(find.byIcon(Icons.volume_up_rounded), findsOneWidget);
  });
}
