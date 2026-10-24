import 'package:go_router/go_router.dart';
import '../screens/admin/corpus_screen.dart';
import '../screens/admin/dashboard_screen.dart';
import '../screens/admin/idioms_screen.dart';
import '../screens/admin/metrics_screen.dart';
import '../screens/admin/users_screen.dart';
import '../screens/auth/forgot_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/chat_screen.dart';
import '../screens/history_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/shell.dart';
import '../screens/welcome_screen.dart';
import 'auth.dart';

const _public = ['/', '/login', '/register', '/forgot', '/reset', '/verify'];

GoRouter buildRouter(AuthState auth) => GoRouter(
      initialLocation: '/',
      refreshListenable: auth,
      redirect: (ctx, state) {
        final p = state.uri.path;
        if (!auth.loggedIn) return _public.contains(p) ? null : '/login';
        if (auth.loggedIn && (p == '/login' || p == '/register' || p == '/forgot')) return '/chat';
        if (p.startsWith('/admin') && !auth.isAdmin) return '/chat';
        return null;
      },
      routes: [
        GoRoute(path: '/', builder: (_, __) => const WelcomeScreen()),
        GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
        GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
        GoRoute(path: '/forgot', builder: (_, __) => const ForgotScreen()),
        GoRoute(path: '/reset', builder: (_, s) => ForgotScreen(token: s.uri.queryParameters['token'])),
        GoRoute(path: '/verify', builder: (_, s) => VerifyScreen(token: s.uri.queryParameters['token'] ?? '')),
        ShellRoute(
          builder: (_, state, child) => AppShell(location: state.uri.path, child: child),
          routes: [
            GoRoute(path: '/chat', builder: (_, __) => const ChatScreen()),
            GoRoute(path: '/history', builder: (_, __) => const HistoryScreen()),
            GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
            GoRoute(path: '/admin', builder: (_, __) => const DashboardScreen()),
            GoRoute(path: '/admin/users', builder: (_, __) => const UsersScreen()),
            GoRoute(path: '/admin/idioms', builder: (_, __) => const IdiomsScreen()),
            GoRoute(path: '/admin/corpus', builder: (_, __) => const CorpusScreen()),
            GoRoute(path: '/admin/history', builder: (_, __) => const HistoryScreen(global: true)),
            GoRoute(path: '/admin/metrics', builder: (_, __) => const MetricsScreen()),
          ],
        ),
      ],
    );
