# Boss and discovered-artefact ideas — TR-096

Ideas can include up to three currently available nearby bosses and three
already-discovered artefacts. Fresh accepted GPS is required for personal finds.
An explicitly selected sourced public origin enables a boss-only preview, without
moving the player or showing hidden artefacts. Existing conditional XP estimates
are unchanged and no plan-completion bonus is introduced.

Boss queries remain bounded to a nearby area. Artefacts must be in that owner's
stored reveal set AND have a current, unremoved, unclaimed, owner-visible spawn
record. Search/collection history, expiry, configured closures and conservative
terrain/access settings still apply. Planning does not hydrate or generate spawns,
create missing profiles, record visits, reserve encounters or award anything.
The public preview and ordinary no-GPS estimates have distinct labels.

Cards show a straight-line minimum return, never an invented route. Boss cards
show the locked solo effort reference for the chosen movement, exploration
requirements and a reminder to inspect the party/window in Encounters. A short
navigation trip to a boss is not its completed activity requirement. The source
query is a bounded selection, not a census of every Finland opportunity.

**Use path** is offered only for an exact matching sourced catalog coordinate.
It selects that public path, movement and explicit preview origin in the existing
route planner. No guessed connector is generated for an offset artefact. Every
selection clears the old plan and aborts pending navigation work, including
selecting the same card again. The user reviews settings and explicitly plans.
The route service rechecks current access/GPS and keeps plans/GPX separate from
recorded trails and encounter evidence. Opportunity status can change after a
preview; recheck Quest/Encounters before collecting or activating.

Four new tests cover freshness, visibility and exact coordinates, bounded public
previews/physical requirements, and real SQLite current-spawn ownership/status
filters with full snapshot equality before/after. All 196 application tests pass.
Physical navigation, boss activity submission and independent provider evidence
remain separate validation gates. Production remains version 10.

## Released as private dev 30

[Shared dev](https://trail-relics-dev.tuomasl.chatgpt.site/shared) now runs this
increment. [Exact release, archive and CI evidence](evidence/dev30-opportunity-ideas-release.json)
records successful publication, 196 regressions and four green GitHub workflows.
Owner-private access, runtime revision 2 and all player data are preserved. Both
archive limits passed at 198,487,356 input / 265,952,256 expanded bytes.

Actual browser QA explicitly selected Kirkkopuisto for a public boss preview.
It showed both existing bosses, the 20 equivalent km solo references and Harju
Kivenkulkija's eight-tile requirement. **Use path** selected the Kirkkopuisto origin,
Harju destination and Foot movement. Explicit planning returned **0.59 km** mapped
with displayed offsets **1m/1m**, excluded from the route. Selecting the same
opportunity again cleared the old plan; explicit replanning succeeded. Show route
collapsed the drawer and rendered the gold-dashed plan separately from the trail.

Tumppi retained 0 gold, 0.00 km, 0 finds, tile 0,0, levels 1/1/1 and stopped quest.
No activity/GPS, capture, claim, encounter or administrative operation was used.
This desktop public preview is not a physical GPS/navigation or phone-layout pass.
Production remains public version 10; main was not pushed.
