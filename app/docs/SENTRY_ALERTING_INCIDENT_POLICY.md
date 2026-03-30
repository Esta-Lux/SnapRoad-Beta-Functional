# Sentry Alerting and Incident Policy

## Alert thresholds

- Trigger `P1` when backend `5xx` rate is `>= 2%` for 5 minutes.
- Trigger `P2` when backend `4xx` rate is `>= 10%` for 10 minutes.
- Trigger `P1` for any unhandled exception spike over baseline (3x in 15 minutes).

## Routing

- Primary: on-call engineer.
- Secondary: backup engineer after 10 minutes of no acknowledgement.
- Escalation: PM/engineering lead after 20 minutes.

## Incident workflow

1. Acknowledge alert in Sentry.
2. Check deploy timeline and recent commits.
3. Confirm blast radius (auth, payments, webhooks, partner APIs).
4. If active regression, execute rollback runbook.
5. Open incident ticket with timeline and root-cause notes.
6. Complete postmortem for any `P1`.
