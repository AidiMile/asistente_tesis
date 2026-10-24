import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/auth.dart';
import 'core/router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final auth = AuthState();
  await auth.restore();
  runApp(ChangeNotifierProvider.value(value: auth, child: const App()));
}

class App extends StatefulWidget {
  const App({super.key});
  @override
  State<App> createState() => _AppState();
}

class _AppState extends State<App> {
  late final router = buildRouter(context.read<AuthState>());
  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF075E54),
      primary: const Color(0xFF075E54),
      secondary: const Color(0xFFF4B400),
      surface: const Color(0xFFF7FAF9),
    );
    return MaterialApp.router(
        title: 'Asistente Virtual PLN-EC',
        debugShowCheckedModeBanner: false,
        themeMode: ThemeMode.light,
        theme: ThemeData(
          colorScheme: scheme,
          useMaterial3: true,
          scaffoldBackgroundColor: const Color(0xFFF7FAF9),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFD7E4E0))),
          ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ),
        routerConfig: router,
      );
  }
}
