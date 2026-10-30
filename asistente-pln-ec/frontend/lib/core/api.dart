import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';

typedef Json = Map<String, dynamic>;

class ApiException implements Exception {
  final int status;
  final String message;
  ApiException(this.status, this.message);
  @override
  String toString() => message;
}

class Api {
  String? token;
  void Function()? onUnauthorized;

  Uri _uri(String path, [Map<String, dynamic>? q]) {
    final u = Uri.parse('${AppConfig.apiBase}$path');
    if (q == null || q.isEmpty) return u;
    return u.replace(queryParameters: {
      ...u.queryParameters,
      ...q.map((k, v) => MapEntry(k, '$v')),
    });
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json; charset=utf-8',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  dynamic _handle(http.Response r, {bool auth = true}) {
    final body = r.bodyBytes.isEmpty ? '' : utf8.decode(r.bodyBytes);
    if (r.statusCode >= 200 && r.statusCode < 300) {
      return body.isEmpty ? null : jsonDecode(body);
    }
    if (r.statusCode == 401 && auth && token != null) onUnauthorized?.call();
    var msg = 'Error ${r.statusCode}';
    try {
      final d = jsonDecode(body)['detail'];
      if (d is String) {
        msg = d;
      } else if (d is List) {
        msg = d.map((e) => e['msg']).join('\n');
      }
    } catch (_) {}
    throw ApiException(r.statusCode, msg);
  }

  Future<T> _wrap<T>(Future<T> Function() f) async {
    try {
      return await f();
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException(0, 'No se pudo conectar con el servidor');
    }
  }

  Future<dynamic> get(String p, {Map<String, dynamic>? q}) =>
      _wrap(() async => _handle(await http.get(_uri(p, q), headers: _headers)));
  Future<dynamic> post(String p, {Object? body, Map<String, dynamic>? q, bool auth = true}) =>
      _wrap(() async => _handle(
          await http.post(_uri(p, q), headers: _headers, body: body == null ? null : jsonEncode(body)),
          auth: auth));
  Future<dynamic> put(String p, {Object? body}) =>
      _wrap(() async => _handle(await http.put(_uri(p), headers: _headers, body: jsonEncode(body))));
  Future<dynamic> delete(String p) =>
      _wrap(() async => _handle(await http.delete(_uri(p), headers: _headers)));

  Future<dynamic> upload(String p, List<int> bytes, String filename, {Map<String, String>? fields}) => _wrap(() async {
        final req = http.MultipartRequest('POST', _uri(p));
        if (token != null) req.headers['Authorization'] = 'Bearer $token';
        if (fields != null) req.fields.addAll(fields);
        req.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
        return _handle(await http.Response.fromStream(await req.send()));
      });
}
