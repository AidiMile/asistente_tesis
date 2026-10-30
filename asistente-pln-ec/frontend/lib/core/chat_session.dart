import 'package:flutter/foundation.dart';
import 'api.dart';

class ChatSession extends ChangeNotifier {
  int? currentChatId;
  Map<String, dynamic>? activeItem;
  List<Map<String, dynamic>> historyItems = [];
  bool loadingHistory = false;
  int newChatTrigger = 0;

  // 1. ESTADO INICIAL / NUEVO CHAT
  void newChat() {
    currentChatId = null;
    activeItem = null;
    newChatTrigger++;
    notifyListeners();
  }

  // 2. AL CARGAR UN CHAT DEL HISTORIAL
  void selectChat(Map<String, dynamic> item) {
    currentChatId = item['id_historial'];
    activeItem = item;
    notifyListeners();
  }

  void setCurrentChatId(int? id, [Map<String, dynamic>? item]) {
    currentChatId = id;
    if (item != null) activeItem = item;
    notifyListeners();
  }

  Future<void> fetchHistory(Api api, {bool isAdmin = false}) async {
    loadingHistory = true;
    notifyListeners();
    try {
      final r = await api.get(isAdmin ? '/admin/history' : '/history', q: {'limit': 60});
      final raw = (r['items'] as List?) ?? [];
      historyItems = raw.map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (_) {
      historyItems = [];
    } finally {
      loadingHistory = false;
      notifyListeners();
    }
  }

  // 4. ELIMINAR UN CHAT
  Future<bool> deleteChat(Api api, int idHistorial, {bool isAdmin = false}) async {
    try {
      await api.delete(isAdmin ? '/admin/history/$idHistorial' : '/history/$idHistorial');
      historyItems.removeWhere((e) => e['id_historial'] == idHistorial);
      if (currentChatId == idHistorial) {
        // VALIDACIÓN: Si el chat que se elimina es el que está abierto, limpiar pantalla y poner currentChatId en null
        newChat();
      } else {
        notifyListeners();
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  // 3. AL ENVIAR UN MENSAJE NUEVO
  void notifyMessageSent(Map<String, dynamic> result, String queryText, String replyText) {
    final int? id = result['id_historial'] ?? currentChatId;
    currentChatId = id;

    final idx = historyItems.indexWhere((e) => e['id_historial'] == id);
    if (idx != -1) {
      final existing = Map<String, dynamic>.from(historyItems[idx]);
      existing['respuesta'] = replyText;
      existing['fecha'] = DateTime.now().toIso8601String();
      if (result['mensajes'] != null) {
        existing['mensajes'] = result['mensajes'];
      }
      historyItems.removeAt(idx);
      historyItems.insert(0, existing);
      activeItem = existing;
    } else {
      final newItem = <String, dynamic>{
        'id_historial': id,
        'consulta': queryText,
        'respuesta': replyText,
        'fecha': DateTime.now().toIso8601String(),
        'tipo_entrada': result['tipo_entrada'] ?? 'texto',
        if (result['mensajes'] != null) 'mensajes': result['mensajes'],
      };
      historyItems.insert(0, newItem);
      activeItem = newItem;
    }
    notifyListeners();
  }
}
