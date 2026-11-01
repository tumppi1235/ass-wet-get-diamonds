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

## Released as private dev 28

[Open shared dev](https://trail-relics-dev.tuomasl.chatgpt.site/shared).
[Exact source, archive, deployment and CI evidence](evidence/dev28-boss-field-release.json)
records successful publication, preserved owner-private access/runtime revision 2,
188 regressions and all four successful GitHub workflows. Both archive limits pass
at 197,107,431 compressed / 260,913,152 expanded bytes.

An explicit admin placement made a Lesser Metsänvartija available at the sourced
Kirkkopuisto paths (tile -1,-1) until November 8, 20:26 as displayed. It is an
intentional dev field-test boss, not an automatic seed or a production change.
Hosted browser QA verified the badge, tap-to-Encounters, selected compass at 99m,
and party form showing solo target 20 equivalent km / personal minimum 5 km.
The form was closed without creating a draft. With no fresh GPS, no arrival prompt
appeared. Tumppi retained 0 gold, 0.00 km, 0 finds, tile 0,0, levels 1/1/1 and
stopped quest. No activity, activation, contribution, reward, claim, access change
or recovery operation was performed.

Desktop map/panel QA passed at the actual 1280×720 viewport. The attempted 390×844
override did not change the rendered viewport; it was reset and is not recorded
as a phone-layout pass. Physical and phone-size validation remain pending. Native
Site inspection confirmed production still public version 10; main was not pushed.
