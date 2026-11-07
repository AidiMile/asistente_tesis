import 'package:flutter/foundation.dart';

class AppConfig {
  static const _env = String.fromEnvironment('API_BASE_URL');

  /// URL base para conectar Flutter con el backend Django de PLN-EC (/api/).
  ///
  /// Reglas de red para Android:
  /// - Emulador Android (AVD): 10.0.2.2 apunta al host (laptop de desarrollo).
  /// - Dispositivo físico USB: ejecutar `adb reverse tcp:8000 tcp:8000` y usar localhost:8000/api.
  /// - Dispositivo físico Wi-Fi: compilar con `--dart-define=API_BASE_URL=http://<IP_LAN>:8000/api`.
  static String get apiBase {
    if (_env.isNotEmpty) {
      final trimmed = _env.endsWith('/') ? _env.substring(0, _env.length - 1) : _env;
      return trimmed.endsWith('/api') ? trimmed : '$trimmed/api';
    }
    return kIsWeb ? 'http://localhost:8000/api' : 'http://10.0.2.2:8000/api';
  }

  static const maxQueryChars = 500;
}
