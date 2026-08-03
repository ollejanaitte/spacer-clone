# Checksum / STALE

`buildInputChecksum` includes `appurtenanceConfiguration` and sorted `haunchConfiguration.girders`.

NOT_PROVIDED vs EXPLICIT_NONE produce different digests.
Mutators `withAppurtenanceConfiguration` / `withHaunchConfiguration` null `generatedAt` → STALE until regenerate.
