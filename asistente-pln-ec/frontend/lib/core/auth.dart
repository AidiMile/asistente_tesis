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
  bool get isAdmin => user?['rol'] == 'administrador';

  Future<void> restore() async {
    final p = await SharedPreferences.getInstance();
    api.token = p.getString('token');
    if (api.token != null) {
      try {
        user = Map<String, dynamic>.from(await api.get('/users/me'));
      } catch (_) {
        api.token = null;
        await p.remove('token');
      }
    }
    ready = true;
    notifyListeners();
  }

  Future<void> login(String correo, String password) async {
    final r = await api.post('/auth/login', body: {'correo': correo, 'password': password}, auth: false);
    api.token = r['access_token'];
    (await SharedPreferences.getInstance()).setString('token', api.token!);
    user = Map<String, dynamic>.from(r['usuario']);
    notifyListeners();
  }

  Future<void> refreshUser() async {
    user = Map<String, dynamic>.from(await api.get('/users/me'));
    notifyListeners();
  }

  Future<void> logout() async {
    api.token = null;
    user = null;
    (await SharedPreferences.getInstance()).remove('token');
    notifyListeners();
  }
}
