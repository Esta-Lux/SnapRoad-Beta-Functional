import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// Import screens (to be created)
// import '../../features/auth/screens/splash_screen.dart';
// import '../../features/auth/screens/login_screen.dart';
// import '../../features/auth/screens/register_screen.dart';
// import '../../features/navigation/screens/map_screen.dart';
// import '../../features/trips/screens/trip_history_screen.dart';
// import '../../features/incidents/screens/report_incident_screen.dart';
// import '../../features/rewards/screens/rewards_screen.dart';
// import '../../features/offers/screens/offers_screen.dart';
// import '../../features/profile/screens/profile_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    routes: [
      // Splash & Auth
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const _PlaceholderScreen(title: 'Splash'),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const _PlaceholderScreen(title: 'Login'),
      ),
      GoRoute(
        path: '/register',
        name: 'register',
        builder: (context, state) => const _PlaceholderScreen(title: 'Register'),
      ),
      GoRoute(
        path: '/onboarding',
        name: 'onboarding',
        builder: (context, state) => const _PlaceholderScreen(title: 'Onboarding'),
      ),

      // Main App Shell
      ShellRoute(
        builder: (context, state, child) {
          return _MainShell(child: child);
        },
        routes: [
          GoRoute(
            path: '/home',
            name: 'home',
            builder: (context, state) => const _PlaceholderScreen(title: 'Map/Navigation'),
          ),
          GoRoute(
            path: '/trips',
            name: 'trips',
            builder: (context, state) => const _PlaceholderScreen(title: 'Trip History'),
          ),
          GoRoute(
            path: '/rewards',
            name: 'rewards',
            builder: (context, state) => const _PlaceholderScreen(title: 'Rewards'),
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (context, state) => const _PlaceholderScreen(title: 'Profile'),
          ),
        ],
      ),

      // Standalone screens
      GoRoute(
        path: '/trip/:id',
        name: 'tripDetail',
        builder: (context, state) => _PlaceholderScreen(
          title: 'Trip ${state.pathParameters['id']}',
        ),
      ),
      GoRoute(
        path: '/report-incident',
        name: 'reportIncident',
        builder: (context, state) => const _PlaceholderScreen(title: 'Report Incident'),
      ),
      GoRoute(
        path: '/offers',
        name: 'offers',
        builder: (context, state) => const _PlaceholderScreen(title: 'Nearby Offers'),
      ),
      GoRoute(
        path: '/offer/:id',
        name: 'offerDetail',
        builder: (context, state) => _PlaceholderScreen(
          title: 'Offer ${state.pathParameters['id']}',
        ),
      ),
      GoRoute(
        path: '/leaderboard',
        name: 'leaderboard',
        builder: (context, state) => const _PlaceholderScreen(title: 'Leaderboard'),
      ),
      GoRoute(
        path: '/vehicles',
        name: 'vehicles',
        builder: (context, state) => const _PlaceholderScreen(title: 'My Vehicles'),
      ),
      GoRoute(
        path: '/subscription',
        name: 'subscription',
        builder: (context, state) => const _PlaceholderScreen(title: 'Subscription'),
      ),
    ],
  );
});

/// Placeholder screen for unimplemented features
class _PlaceholderScreen extends StatelessWidget {
  final String title;

  const _PlaceholderScreen({required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.construction,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Coming soon...',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Main app shell with bottom navigation
class _MainShell extends StatelessWidget {
  final Widget child;

  const _MainShell({required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map),
            label: 'Navigate',
          ),
          NavigationDestination(
            icon: Icon(Icons.route_outlined),
            selectedIcon: Icon(Icons.route),
            label: 'Trips',
          ),
          NavigationDestination(
            icon: Icon(Icons.diamond_outlined),
            selectedIcon: Icon(Icons.diamond),
            label: 'Rewards',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
        onDestinationSelected: (index) {
          final routes = ['/home', '/trips', '/rewards', '/profile'];
          context.go(routes[index]);
        },
      ),
    );
  }
}
