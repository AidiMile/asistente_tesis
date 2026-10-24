import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/auth.dart';

class _Dest {
  final String path, label;
  final IconData icon;
  const _Dest(this.path, this.label, this.icon);
}

const _user = [
  _Dest('/chat', 'Chat', Icons.chat_bubble_outline),
  _Dest('/history', 'Historial', Icons.history),
  _Dest('/profile', 'Perfil', Icons.person_outline),
];
const _admin = [
  _Dest('/admin', 'Dashboard', Icons.dashboard_outlined),
  _Dest('/admin/users', 'Usuarios', Icons.group_outlined),
  _Dest('/admin/idioms', 'Modismos', Icons.translate),
  _Dest('/admin/corpus', 'Corpus', Icons.library_books_outlined),
  _Dest('/admin/history', 'Historial global', Icons.manage_search),
  _Dest('/admin/metrics', 'Métricas', Icons.query_stats),
];

class AppShell extends StatelessWidget {
  final Widget child;
  final String location;
  const AppShell({super.key, required this.child, required this.location});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final dests = [..._user, if (auth.isAdmin) ..._admin];
    var idx = dests.indexWhere((d) => d.path == location);
    if (idx < 0) idx = 0;
    final wide = MediaQuery.of(context).size.width >= 800;
    void go(int i) => context.go(dests[i].path);
    final logout = IconButton(
        tooltip: 'Cerrar sesión', icon: const Icon(Icons.logout), onPressed: () => auth.logout());

    if (wide) {
      return Scaffold(
        body: Row(children: [
          NavigationRail(
            extended: MediaQuery.of(context).size.width >= 1100,
            selectedIndex: idx,
            onDestinationSelected: go,
            leading: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text('PLN-EC', style: Theme.of(context).textTheme.titleLarge),
            ),
            trailing: Expanded(child: Align(alignment: Alignment.bottomCenter, child: Padding(
                padding: const EdgeInsets.only(bottom: 16), child: logout))),
            destinations: [
              for (final d in dests)
                NavigationRailDestination(icon: Icon(d.icon), label: Text(d.label)),
            ],
          ),
          const VerticalDivider(width: 1),
          Expanded(child: child),
        ]),
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(dests[idx].label), actions: [logout]),
      drawer: Drawer(
        child: ListView(children: [
          DrawerHeader(child: Text('Asistente Virtual PLN-EC\n${auth.user?['nombre'] ?? ''}',
              style: Theme.of(context).textTheme.titleMedium)),
          for (var i = 0; i < dests.length; i++)
            ListTile(
              leading: Icon(dests[i].icon),
              title: Text(dests[i].label),
              selected: i == idx,
              onTap: () {
                Navigator.pop(context);
                go(i);
              },
            ),
        ]),
      ),
      body: child,
    );
  }
}
