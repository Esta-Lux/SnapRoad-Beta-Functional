/// App-wide constants
class AppConstants {
  // Driving event thresholds
  static const double speedingThresholdKmh = 10.0; // Above speed limit
  static const double hardBrakeThresholdG = 0.5;
  static const double rapidAccelThresholdG = 0.4;

  // Rewards
  static const int baseGemsPerTrip = 5;
  static const int gemsPerKm = 1;
  static const int perfectScoreBonus = 10;
  static const int streakBonusMultiplier = 2;

  // Subscription tiers
  static const String tierFree = 'free';
  static const String tierPremium = 'premium';
  static const String tierFamily = 'family';

  // Incident types
  static const String incidentAccident = 'accident';
  static const String incidentHazard = 'hazard';
  static const String incidentViolation = 'violation';
  static const String incidentConstruction = 'construction';
  static const String incidentOther = 'other';

  // API endpoints
  static const String authEndpoint = '/auth';
  static const String tripsEndpoint = '/trips';
  static const String incidentsEndpoint = '/incidents';
  static const String rewardsEndpoint = '/rewards';
  static const String offersEndpoint = '/offers';
  static const String vehiclesEndpoint = '/vehicles';
}
