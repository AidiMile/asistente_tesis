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
    currentChatId = item['id_conversacion'] ?? item['id_historial'];
    activeItem = item;
    notifyListeners();
  }

  void setCurrentChatId(int? id, [Map<String, dynamic>? item]) {
    currentChatId = id;
    if (item != null) activeItem = item;
    notifyListeners();
  }

  /// Recupera el historial de conversaciones desde Django (/api/asistente/conversaciones/)
  Future<void> fetchHistory(Api api, {bool isAdmin = false}) async {
    loadingHistory = true;
    notifyListeners();
    try {
      final dynamic r = await api.get('/asistente/conversaciones/');
      final List rawList = r is List ? r : ((r is Map && r['items'] is List) ? r['items'] : []);
      historyItems = rawList.map((e) {
        final m = Map<String, dynamic>.from(e as Map);
        final id = m['id_conversacion'] ?? m['id_historial'];
        return <String, dynamic>{
          'id_conversacion': id,
          'id_historial': id,
          'consulta': m['titulo'] ?? m['consulta'] ?? 'Conversación $id',
          'fecha': m['fecha_actualizacion'] ?? m['fecha_creacion'] ?? m['fecha'] ?? DateTime.now().toIso8601String(),
          'total_mensajes': m['total_mensajes'] ?? 0,
        };
      }).toList();
    } catch (_) {
      historyItems = [];
    } finally {
      loadingHistory = false;
      notifyListeners();
    }
  }

  // 4. ELIMINAR UN CHAT (Desconectado de endpoints incompatibles)
  Future<bool> deleteChat(Api api, int idHistorial, {bool isAdmin = false}) async {
    try {
      historyItems.removeWhere((e) => (e['id_conversacion'] ?? e['id_historial']) == idHistorial);
      if (currentChatId == idHistorial) {
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
    final int? id = result['id_conversacion'] ?? result['id_historial'] ?? currentChatId;
    currentChatId = id;

    final idx = historyItems.indexWhere((e) => (e['id_conversacion'] ?? e['id_historial']) == id);
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
        'id_conversacion': id,
        'id_historial': id,
        'consulta': queryText,
        'respuesta': replyText,
        'fecha': DateTime.now().toIso8601String(),
        'tipo_entrada': result['tipo_entrada'] ?? 'Texto',
        if (result['mensajes'] != null) 'mensajes': result['mensajes'],
      };
      historyItems.insert(0, newItem);
      activeItem = newItem;
    }
    notifyListeners();
  }
}
