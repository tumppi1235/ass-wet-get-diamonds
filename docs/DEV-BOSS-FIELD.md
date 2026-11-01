# Boss field encounters — TR-144/133/134

The user prioritized boss mechanics on 2026-11-01. This increment makes the
existing asynchronous activity-based encounters easier to find and understand.
It changes presentation and client readiness, not combat balance or rewards.

Active placed bosses now appear on the shared map while the drawer is closed.
Purple BOSS badges grow with tier and highlight the selected boss. Tapping opens
Encounters and selects its compass target. The native/raster fallback has the same
tap action. Queries are bounded, account-scoped, quantized to avoid GPS jitter,
and refreshed every 30 seconds while visible. No test boss is silently created.

Fresh accepted GPS in a boss's existing 250m tile shows **Boss tile reached**.
This is a review prompt only: arrival does not create a draft, activate a fight,
start a timer, record a contribution or award anything. Stale/inaccurate/future
GPS and adjacent tiles cannot trigger arrival. Inspecting a boss explains the
requirement; draft activation is disabled until the client's location is ready
and all invitees consent. Server presence, closure and revision checks remain
authoritative.

Completed server-recorded activity previews show projected damage, remaining HP,
personal loot qualification and minimum shortfall. A winning party contribution
does not qualify an under-minimum player for loot. Zero HP without any qualifying
participant is explicitly insufficient. The snapshot's movement factors and
capped weakness bonus remain unchanged; bonuses cannot lower the unmodified
personal minimum. Previewing changes no encounter or player data. The server
rechecks the activity, party and deadline at submission. Existing immediate
settlement and exactly-one-activity rules remain explicit.

Four new regressions cover tile boundaries/freshness, deterministic arrival and
minimal map properties, locked damage/qualification/no mutation, and rejected
repeat/wrong-roster/out-of-window/missing-visit forecasts. All 188 application
regressions and mobile types/lint pass before publication. Real phone arrival,
rotation/GPS quality and cooperative recording remain physical validation gates.
Distance/elevation/exploration objective combinations and Garmin/Strava remain
separate backlog work. Production version 10 is not modified by this increment.
