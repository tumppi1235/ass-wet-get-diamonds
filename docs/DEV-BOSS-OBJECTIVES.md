# Boss exploration objectives — TR-137/138

Development-only follow-up to the field UI. Boss placement can optionally require
0–200 distinct observed GPS tiles per participant's one submitted activity.
Zero/absent preserves distance-only bosses. Positive values combine exploration
with the existing tier-specific distance minimum, boss-tile visit, deadline and
locked roster. Elevation objectives remain unsupported until reliable evidence
is available; unknown objective fields and invalid values are rejected.

The server counts distinct non-null tile IDs in accepted browser-GPS activity
receipts inside the encounter window. Repeats count once; past visits, other
activities, inaccurate/unaccepted fixes and interpolated gap tiles do not count.
Actual observed points after a gap can count as presence; missing mileage remains
missing. Counts expose no raw route or tile list to party members. This is a
browser consistency check, not hardware/provider attestation or access advice.

Objectives are copied into the placed boss and encounter snapshot. Existing
definitions, activities, wallets, claims and XP are unchanged. No new SQLite
migration is needed: optional document fields default to distance-only. Once
objective bosses are used, do not roll the server back to code that ignores them;
use a forward fix. Older clients cannot bypass the new server qualification rule.

Insufficient exploration may still deal physical damage, but earns no personal
loot/Fellowship. Zero HP without any qualified participant fails. A teammate's
qualified victory does not qualify an under-minimum player. Existing damage,
loot odds, immediate settlement, one-activity and idempotent-claim rules remain.

Admin placement and zero-write combat simulation accept the exploration minimum
and explicit synthetic per-player tile counts. Player details, completed activity
previews and party contributions display the locked objective and observed count.
Unknown evidence cannot satisfy a positive minimum. No extra XP/gold is awarded
for this objective beyond the existing rules.

Four added tests use real SQLite receipts and encounter/reward transactions plus
pure simulation/preview checks: legacy/default validation; distinct/windowed
counting; qualifying victory and loot replay; sufficient damage with insufficient
exploration and rejected loot. All 192 application regressions, mobile types/lint
and server types/lint pass. Physical/cooperative GPS acceptance remains pending.
