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
