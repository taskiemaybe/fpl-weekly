# Data Sources

## FPL Official API

Base URL: `https://fantasy.premierleague.com/api/`

### Key Endpoints

| Endpoint | What it gives you |
|----------|-------------------|
| `/bootstrap-static/` | Everything — players, teams, GWs, game settings |
| `/fixtures/` | All fixtures with difficulty ratings |
| `/fixtures/?event={gw}` | Fixtures for specific gameweek |
| `/element-summary/{id}/` | Player history & upcoming fixtures |
| `/event/{gw}/live/` | Live points for a gameweek |
| `/entry/{team_id}/` | Manager's team info |
| `/entry/{team_id}/event/{gw}/picks/` | Manager's picks for a GW |

### Useful Fields from bootstrap-static

**Players (`elements`):**
- `web_name` — Display name
- `now_cost` — Current price (÷10 for actual)
- `cost_change_event` — Price change this GW
- `form` — Recent form rating
- `points_per_game` — PPG
- `selected_by_percent` — Ownership %
- `transfers_in_event` — Transfers in this GW
- `transfers_out_event` — Transfers out this GW
- `status` — a/d/i/s/u (available/doubtful/injured/suspended/unavailable)
- `news` — Injury/availability news text
- `news_added` — When news was added
- `chance_of_playing_next_round` — 0/25/50/75/100 or null

**Teams:**
- `name`, `short_name`
- `strength_attack_home/away`
- `strength_defence_home/away`

**Fixtures:**
- `team_h`, `team_a` — Home/away team IDs
- `team_h_difficulty`, `team_a_difficulty` — FDR 1-5
- `kickoff_time` — ISO timestamp

### Rate Limits

No official rate limit documented, but be reasonable. Cache aggressively.

## External Sources (Need Integration)

### Fantasy Football Scout
- **URL:** https://www.fantasyfootballscout.co.uk/
- **What they have:** Member stats, projected points, fixture ticker, set piece takers, underlying stats (xG, xA)
- **Notes:** Some content paywalled, but free tier still useful

### Injury News
- **Premier Injuries** (premierinjuries.com) — Dedicated injury tracker
- **FPL Twitter** (@OfficialFPL) — Official announcements
- **Physio Room** — Historical injury data

### Press Conferences
- Usually Friday afternoons (UK time)
- Transcripts on club sites or football.london, manchester evening news, etc.

### Rotation/Lineup Predictions
- **Ben Crellin** (@BenCrellin) — Rotation spreadsheets for Pep/rotation-heavy teams
- **FPL Focal** (@FPLFocal) — Predicted lineups, stats threads
- **FPL Harry** (@FPL_Harry) — Analysis and insights

### Price Change Predictors
- **FPL Statistics** (fplstatistics.co.uk) — Price rise/fall predictions
- **Fantasy Football Fix** — Similar predictions

## API Response Caching Strategy

| Data Type | Cache Duration | Reason |
|-----------|---------------|--------|
| Teams/Basic info | 24 hours | Rarely changes |
| Player stats | 1 hour | Updates throughout day |
| Fixtures | 6 hours | Set at season start |
| Transfers/Price changes | 30 mins | Changes frequently |
| Live GW data | 1 min | During matches only |

## Sample Code

```javascript
// Fetch all bootstrap data
const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
const data = await response.json();

// Get top transfers in
const topTransfersIn = data.elements
  .sort((a, b) => b.transfers_in_event - a.transfers_in_event)
  .slice(0, 10);

// Get injured/doubtful players
const injuries = data.elements
  .filter(p => p.status !== 'a' && p.selected_by_percent > 5)
  .map(p => ({
    name: p.web_name,
    status: p.status,
    news: p.news,
    chance: p.chance_of_playing_next_round
  }));
```
