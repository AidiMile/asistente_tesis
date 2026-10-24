import 'package:flutter/foundation.dart';

class AppConfig {
  static const _env = String.fromEnvironment('API_BASE_URL');
  /// Docker/nginx usa '/api'. En desarrollo: --dart-define=API_BASE_URL=http://localhost:8000
  static String get apiBase =>
      _env.isNotEmpty ? _env : (kIsWeb ? 'http://localhost:8000' : 'http://10.0.2.2:8000');
  static const maxQueryChars = 500;
}
