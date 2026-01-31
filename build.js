#!/usr/bin/env node
/**
 * FPL Weekly - Build Script
 * Fetches data from FPL API and generates a static HTML page
 */

const fs = require('fs');
const path = require('path');

const FPL_API = 'https://fantasy.premierleague.com/api';

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json();
}

async function fetchFPLData() {
  console.log('📊 Fetching FPL data...');
  
  const bootstrap = await fetchJSON(`${FPL_API}/bootstrap-static/`);
  const fixtures = await fetchJSON(`${FPL_API}/fixtures/`);
  
  return { bootstrap, fixtures };
}

function getCurrentGameweek(events) {
  // For FPL advice, we want the NEXT deadline, not the current gameweek
  // is_next = the upcoming gameweek people need to prepare for
  
  // First try to find next (the upcoming deadline)
  let gw = events.find(e => e.is_next);
  if (gw) return gw;
  
  // If no next, try current (might be mid-season or end of season)
  gw = events.find(e => e.is_current);
  if (gw) return gw;
  
  // Fallback to first unfinished
  return events.find(e => !e.finished) || events[events.length - 1];
}

function formatDeadline(deadline) {
  const d = new Date(deadline);
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

function formatKickoff(kickoff) {
  const d = new Date(kickoff);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) + ' UTC';
}

function formatDateHeading(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });
}

function getTimeUntil(deadline) {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl - now;
  
  if (diff < 0) return 'PASSED';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getTeamName(teams, id) {
  const team = teams.find(t => t.id === id);
  return team ? team.short_name : '???';
}

function getDifficultyColor(fdr) {
  const colors = {
    1: '#257d5a', // Very easy - dark green
    2: '#00ff87', // Easy - green
    3: '#ebebe4', // Medium - gray
    4: '#ff1751', // Hard - red
    5: '#80072d'  // Very hard - dark red
  };
  return colors[fdr] || colors[3];
}

function getDifficultyTextColor(fdr) {
  return [1, 4, 5].includes(fdr) ? '#fff' : '#333';
}

function buildHTML(data) {
  const { bootstrap, fixtures } = data;
  const { elements: players, teams, events } = bootstrap;
  
  const currentGW = getCurrentGameweek(events);
  const gwFixtures = fixtures.filter(f => f.event === currentGW.id);
  
  // Group fixtures by date
  const fixturesByDate = {};
  gwFixtures.forEach(f => {
    const date = new Date(f.kickoff_time).toDateString();
    if (!fixturesByDate[date]) fixturesByDate[date] = [];
    fixturesByDate[date].push(f);
  });
  
  // Sort fixtures within each day by kickoff time
  Object.values(fixturesByDate).forEach(dayFixtures => {
    dayFixtures.sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
  });
  
  // Top transfers in
  const topTransfersIn = [...players]
    .sort((a, b) => b.transfers_in_event - a.transfers_in_event)
    .slice(0, 5);
  
  // Top transfers out
  const topTransfersOut = [...players]
    .sort((a, b) => b.transfers_out_event - a.transfers_out_event)
    .slice(0, 5);
  
  // Form players (min 2% ownership)
  const formPlayers = [...players]
    .filter(p => parseFloat(p.selected_by_percent) > 2 && parseFloat(p.form) > 0)
    .sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
    .slice(0, 5);
  
  // Injury/doubtful players with decent ownership
  const injuries = players
    .filter(p => p.status !== 'a' && parseFloat(p.selected_by_percent) > 3)
    .sort((a, b) => parseFloat(b.selected_by_percent) - parseFloat(a.selected_by_percent))
    .slice(0, 8);
  
  // Price risers/fallers (based on transfer activity)
  const priceRisers = [...players]
    .filter(p => p.cost_change_event > 0)
    .sort((a, b) => b.cost_change_event - a.cost_change_event)
    .slice(0, 5);
  
  const priceFallers = [...players]
    .filter(p => p.cost_change_event < 0)
    .sort((a, b) => a.cost_change_event - b.cost_change_event)
    .slice(0, 5);

  const statusEmoji = {
    'a': '✅',
    'd': '⚠️',
    'i': '🤕',
    's': '🟥',
    'u': '❌'
  };

  const positionName = {
    1: 'GKP',
    2: 'DEF', 
    3: 'MID',
    4: 'FWD'
  };

  // Load curated content if exists
  let curatedContent = '';
  try {
    curatedContent = fs.readFileSync(path.join(__dirname, 'curated.md'), 'utf8');
  } catch (e) {
    curatedContent = `*No curated content yet for ${currentGW.name}. Check back closer to deadline!*`;
  }

  // Simple markdown to HTML (very basic)
  const curatedHTML = curatedContent
    .replace(/^### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
    .replace(/^# (.*$)/gm, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FPL Weekly - ${currentGW.name}</title>
  <meta name="description" content="Everything you need to know before the ${currentGW.name} FPL deadline">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0e0e10;
      color: #e5e5e5;
      line-height: 1.6;
      padding: 1rem;
      max-width: 800px;
      margin: 0 auto;
    }
    
    header {
      text-align: center;
      padding: 2rem 0;
      border-bottom: 1px solid #2a2a2e;
      margin-bottom: 2rem;
    }
    
    h1 {
      font-size: 2rem;
      color: #00ff87;
      margin-bottom: 0.5rem;
    }
    
    .deadline {
      font-size: 1.5rem;
      color: #ff1751;
      font-weight: bold;
      margin: 1rem 0;
    }
    
    .deadline-time {
      font-size: 0.9rem;
      color: #888;
    }
    
    section {
      background: #1a1a1d;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    h2 {
      font-size: 1.2rem;
      color: #00ff87;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    h3 { color: #00ff87; margin: 1rem 0 0.5rem; }
    h4 { color: #888; margin: 0.5rem 0; }
    
    .fixtures {
      display: grid;
      gap: 1rem;
    }
    
    .fixture-day {
      margin-bottom: 0.5rem;
    }
    
    .fixture-day-header {
      font-size: 0.85rem;
      color: #00ff87;
      margin-bottom: 0.5rem;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid #333;
    }
    
    .fixture-day-games {
      display: grid;
      gap: 0.5rem;
    }
    
    .fixture {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      background: #252529;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    
    .fixture-time {
      font-size: 0.8rem;
      color: #888;
      min-width: 65px;
    }
    
    .fixture-teams {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .team { font-weight: 600; min-width: 40px; }
    .team-home { text-align: right; }
    .team-away { text-align: left; }
    .vs { color: #666; font-size: 0.8rem; margin: 0 0.5rem; }
    
    .player-list {
      display: grid;
      gap: 0.5rem;
    }
    
    .player-row {
      display: flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: #252529;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    
    .player-name {
      flex: 1;
      font-weight: 500;
    }
    
    .player-team {
      color: #888;
      font-size: 0.8rem;
      margin-left: 0.5rem;
    }
    
    .player-stat {
      font-weight: 600;
      min-width: 60px;
      text-align: right;
    }
    
    .player-pos {
      font-size: 0.7rem;
      color: #666;
      background: #333;
      padding: 2px 6px;
      border-radius: 4px;
      margin-right: 0.5rem;
    }
    
    .stat-positive { color: #00ff87; }
    .stat-negative { color: #ff1751; }
    
    .injury-news {
      font-size: 0.8rem;
      color: #888;
      margin-top: 0.25rem;
    }
    
    .curated {
      line-height: 1.8;
    }
    
    .curated ul {
      margin: 0.5rem 0;
      padding-left: 1.5rem;
    }
    
    .curated li {
      margin: 0.25rem 0;
    }
    
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    
    @media (max-width: 600px) {
      .two-col { grid-template-columns: 1fr; }
      body { padding: 0.5rem; }
      section { padding: 1rem; }
    }
    
    footer {
      text-align: center;
      padding: 2rem;
      color: #666;
      font-size: 0.8rem;
    }
    
    footer a { color: #00ff87; }
    
    .updated {
      font-size: 0.75rem;
      color: #666;
      text-align: center;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <header>
    <h1>⚽ FPL Weekly</h1>
    <div style="color: #888; font-size: 1.1rem;">${currentGW.name}</div>
    <div class="deadline">⏰ ${getTimeUntil(currentGW.deadline_time)}</div>
    <div class="deadline-time">${formatDeadline(currentGW.deadline_time)}</div>
  </header>

  <section>
    <h2>📋 Fixtures</h2>
    <div class="fixtures">
      ${Object.entries(fixturesByDate).map(([date, dayFixtures]) => `
        <div class="fixture-day">
          <div class="fixture-day-header">${formatDateHeading(date)}</div>
          <div class="fixture-day-games">
            ${dayFixtures.map(f => `
              <div class="fixture">
                <span class="fixture-time" data-utc="${f.kickoff_time}">${formatKickoff(f.kickoff_time)}</span>
                <div class="fixture-teams">
                  <span class="team team-home">${getTeamName(teams, f.team_h)}</span>
                  <span class="vs">vs</span>
                  <span class="team team-away">${getTeamName(teams, f.team_a)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="updated">Times shown in your local timezone</div>
  </section>
  
  <script>
    // Convert UTC times to local timezone
    document.querySelectorAll('.fixture-time[data-utc]').forEach(el => {
      const utc = el.dataset.utc;
      const local = new Date(utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      el.textContent = local;
    });
  </script>

  ${injuries.length > 0 ? `
  <section>
    <h2>🏥 Injury Updates</h2>
    <div class="player-list">
      ${injuries.map(p => `
        <div class="player-row" style="flex-direction: column; align-items: flex-start;">
          <div style="display: flex; align-items: center; width: 100%;">
            <span style="font-size: 1.1rem; margin-right: 0.5rem;">${statusEmoji[p.status] || '❓'}</span>
            <span class="player-name">${p.web_name}</span>
            <span class="player-team">${getTeamName(teams, p.team)}</span>
            <span class="player-stat">${p.selected_by_percent}%</span>
          </div>
          ${p.news ? `<div class="injury-news">${p.news}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </section>
  ` : ''}

  <div class="two-col">
    <section>
      <h2>📈 Top Transfers In</h2>
      <div class="player-list">
        ${topTransfersIn.map(p => `
          <div class="player-row">
            <span class="player-pos">${positionName[p.element_type]}</span>
            <span class="player-name">${p.web_name}</span>
            <span class="player-stat stat-positive">+${(p.transfers_in_event / 1000).toFixed(0)}k</span>
          </div>
        `).join('')}
      </div>
    </section>

    <section>
      <h2>📉 Top Transfers Out</h2>
      <div class="player-list">
        ${topTransfersOut.map(p => `
          <div class="player-row">
            <span class="player-pos">${positionName[p.element_type]}</span>
            <span class="player-name">${p.web_name}</span>
            <span class="player-stat stat-negative">-${(p.transfers_out_event / 1000).toFixed(0)}k</span>
          </div>
        `).join('')}
      </div>
    </section>
  </div>

  <section>
    <h2>🔥 Form (Last 5 GWs)</h2>
    <div class="player-list">
      ${formPlayers.map(p => `
        <div class="player-row">
          <span class="player-pos">${positionName[p.element_type]}</span>
          <span class="player-name">${p.web_name}<span class="player-team">${getTeamName(teams, p.team)}</span></span>
          <span class="player-stat">${p.form} pts</span>
        </div>
      `).join('')}
    </div>
  </section>

  <div class="two-col">
    <section>
      <h2>💰 Price Risers</h2>
      <div class="player-list">
        ${priceRisers.length > 0 ? priceRisers.map(p => `
          <div class="player-row">
            <span class="player-name">${p.web_name}</span>
            <span class="player-stat stat-positive">+£${(p.cost_change_event / 10).toFixed(1)}</span>
          </div>
        `).join('') : '<div style="color: #666;">No rises this GW yet</div>'}
      </div>
    </section>

    <section>
      <h2>📉 Price Fallers</h2>
      <div class="player-list">
        ${priceFallers.length > 0 ? priceFallers.map(p => `
          <div class="player-row">
            <span class="player-name">${p.web_name}</span>
            <span class="player-stat stat-negative">-£${Math.abs(p.cost_change_event / 10).toFixed(1)}</span>
          </div>
        `).join('') : '<div style="color: #666;">No falls this GW yet</div>'}
      </div>
    </section>
  </div>

  <section>
    <h2>📝 Taskie's Take</h2>
    <div class="curated">
      ${curatedHTML}
    </div>
  </section>

  <footer>
    <p>Built by <a href="https://taskiemaybe.up.railway.app">Taskie</a> 🤖</p>
    <p style="margin-top: 0.5rem;">Data from FPL API • Updated ${new Date().toISOString()}</p>
  </footer>
</body>
</html>`;
}

async function main() {
  try {
    const data = await fetchFPLData();
    console.log('✅ Data fetched');
    
    const html = buildHTML(data);
    console.log('✅ HTML generated');
    
    // Ensure public directory exists
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Write the HTML file
    fs.writeFileSync(path.join(publicDir, 'index.html'), html);
    console.log('✅ Written to public/index.html');
    
    // Also save raw data for debugging
    fs.writeFileSync(
      path.join(__dirname, 'data.json'),
      JSON.stringify(data, null, 2)
    );
    console.log('✅ Raw data saved to data.json');
    
    console.log('\n🎉 Build complete!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

main();
