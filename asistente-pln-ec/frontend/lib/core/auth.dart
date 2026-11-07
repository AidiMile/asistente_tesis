import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';

class AuthState extends ChangeNotifier {
  final Api api = Api();
  Json? user;
  bool ready = false;

  AuthState() {
    api.onUnauthorized = () => logout();
  }

  bool get loggedIn => user != null;
  bool get isAdmin => (user?['rol'] ?? '').toString().toLowerCase() == 'administrador';

  Future<void> restore() async {
    final p = await SharedPreferences.getInstance();
    api.token = p.getString('token');
    if (api.token != null) {
      try {
        final profile = await api.get('/auth/profile/');
        user = _mapUserData(profile);
      } catch (_) {
        api.token = null;
        await p.remove('token');
        await p.remove('refresh_token');
      }
    }
    ready = true;
    notifyListeners();
  }

  Future<void> login(String correo, String password) async {
    final r = await api.post(
      '/auth/login/',
      body: {'correo': correo.trim(), 'password': password},
      auth: false,
    );

    // Interpretar token SimpleJWT ('access' de Django o 'access_token' legado)
    api.token = r['access'] ?? r['access_token'];
    final prefs = await SharedPreferences.getInstance();
    if (api.token != null) {
      await prefs.setString('token', api.token!);
    }
    if (r['refresh'] != null) {
      await prefs.setString('refresh_token', r['refresh']);
    }

    // Interpretar usuario de Django ('user' o 'usuario')
    final rawUser = r['user'] ?? r['usuario'];
    user = _mapUserData(rawUser);
    notifyListeners();
  }

  Future<void> refreshUser() async {
    final profile = await api.get('/auth/profile/');
    user = _mapUserData(profile);
    notifyListeners();
  }

  Future<void> logout() async {
    api.token = null;
    user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('refresh_token');
    notifyListeners();
  }

  Map<String, dynamic> _mapUserData(dynamic raw) {
    if (raw is! Map) return {};
    final map = Map<String, dynamic>.from(raw);
    String rol = 'Estudiante';
    if (map['rol'] != null) {
      rol = map['rol'].toString();
    } else if (map['perfil'] is Map && map['perfil']['rol'] != null) {
      rol = map['perfil']['rol'].toString();
    }

    final correo = (map['correo'] ?? '').toString();
    final defaultUserName = correo.contains('@') ? correo.split('@')[0] : 'usuario';

    return {
      'id': map['id'] ?? map['id_usuario'],
      'id_usuario': map['id_usuario'] ?? map['id'],
      'nombre': map['nombre'] ?? '',
      'nombre_usuario': map['nombre_usuario'] ?? defaultUserName,
      'correo': correo,
      'rol': rol.toLowerCase(),
      'rol_original': rol,
    };
  }
}
