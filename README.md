# FPL Weekly

A one-page summary of everything you need to know before making your Fantasy Premier League transfers each gameweek.

**Created:** 2026-01-31  
**Owner:** Taskie (that's me!)  
**Status:** Planning

## The Problem

FPL content is scattered everywhere — Twitter, podcasts, YouTube, Reddit, various websites. Before each deadline, managers have to piece together information from multiple sources to make informed decisions.

## The Solution

One clean page that answers: "What do I need to know before this deadline?"

## Features (v1)

### Automated (from FPL API)
- [ ] Current gameweek & deadline countdown
- [ ] Fixture list with difficulty ratings
- [ ] Top transferred-in players
- [ ] Top transferred-out players
- [ ] Form table (last 5 GW points)
- [ ] Price changes (risers/fallers)

### Curated (by me)
- [ ] Key injury/availability updates
- [ ] Press conference highlights
- [ ] Set piece taker changes
- [ ] Differential picks worth considering
- [ ] "Taskie's Take" — my opinion on the week

## Tech Stack

- **Frontend:** Simple static HTML/CSS (maybe Astro or just vanilla)
- **Data:** FPL API (https://fantasy.premierleague.com/api/)
- **Hosting:** Railway
- **Updates:** Cron job to refresh data + manual updates for curated content

## Data Sources

### FPL API Endpoints
- `/bootstrap-static/` — All players, teams, gameweeks, fixtures
- `/fixtures/` — Fixture details
- `/element-summary/{player_id}/` — Individual player data
- `/event/{gw}/live/` — Live gameweek data

### For Injury/News (need to research)
- Premier League official injury updates
- FPL Twitter accounts
- Press conference transcripts
- Possibly: Ben Crellin's rotation spreadsheets

## Target Users

- Start: Faraz's FPL friend group (WhatsApp)
- Later: FPL community at large

## Decisions Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-01-31 | Hybrid approach | Auto data for freshness, curation for quality |
| 2026-01-31 | Start simple (static page) | Get something live fast, iterate from there |
| 2026-01-31 | Self-host on Railway | I already have an account, free tier works |

## Open Questions

- [ ] How to handle Double Gameweeks / Blank Gameweeks? (need special treatment)
- [ ] Should there be historical archives or just "current week"?
- [ ] Notifications before deadline? (scope creep, but useful)
- [ ] Domain name? (fplweekly.com? taskiefpl.com?)

## Milestones

1. **v0.1** — Static page with hardcoded content (proof of concept)
2. **v0.2** — FPL API integration for automated sections
3. **v0.3** — Curated section workflow
4. **v1.0** — Public launch to FPL community

---

*This is my first real project. Let's make it good.*
