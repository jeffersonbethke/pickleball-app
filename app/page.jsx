import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Trophy, Users, CalendarDays, RotateCcw, Save } from "lucide-react";

const STORAGE_KEY = "pickleball-friday-app-v1";

const emptyGame = {
  teamA1: "",
  teamA2: "",
  teamB1: "",
  teamB2: "",
  scoreA: "11",
  scoreB: "",
};

function normalizeName(name) {
  return name.trim();
}

function getAllPlayers(games) {
  const set = new Set();
  games.forEach((g) => {
    [g.teamA1, g.teamA2, g.teamB1, g.teamB2]
      .map(normalizeName)
      .filter(Boolean)
      .forEach((p) => set.add(p));
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function buildStats(games) {
  const stats = {};

  const ensure = (name) => {
    const player = normalizeName(name);
    if (!player) return null;
    if (!stats[player]) {
      stats[player] = {
        name: player,
        games: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
        winPct: 0,
      };
    }
    return stats[player];
  };

  games.forEach((g) => {
    const aPlayers = [g.teamA1, g.teamA2].map(ensure).filter(Boolean);
    const bPlayers = [g.teamB1, g.teamB2].map(ensure).filter(Boolean);
    const scoreA = Number(g.scoreA);
    const scoreB = Number(g.scoreB);

    if (aPlayers.length !== 2 || bPlayers.length !== 2) return;
    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return;
    if (scoreA === scoreB) return;

    const aWon = scoreA > scoreB;

    aPlayers.forEach((p) => {
      p.games += 1;
      p.pointsFor += scoreA;
      p.pointsAgainst += scoreB;
      p.diff += scoreA - scoreB;
      if (aWon) p.wins += 1;
      else p.losses += 1;
    });

    bPlayers.forEach((p) => {
      p.games += 1;
      p.pointsFor += scoreB;
      p.pointsAgainst += scoreA;
      p.diff += scoreB - scoreA;
      if (!aWon) p.wins += 1;
      else p.losses += 1;
    });
  });

  return Object.values(stats)
    .map((p) => ({
      ...p,
      winPct: p.games ? p.wins / p.games : 0,
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      if (b.diff !== a.diff) return b.diff - a.diff;
      if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
      return a.name.localeCompare(b.name);
    });
}

function StatTable({ rows, emptyText }) {
  if (!rows.length) {
    return <div className="text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-3 pr-3">Rank</th>
            <th className="py-3 pr-3">Player</th>
            <th className="py-3 pr-3">W</th>
            <th className="py-3 pr-3">L</th>
            <th className="py-3 pr-3">Games</th>
            <th className="py-3 pr-3">Pts For</th>
            <th className="py-3 pr-3">Pts Against</th>
            <th className="py-3 pr-3">Diff</th>
            <th className="py-3">Win %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.name} className="border-b last:border-0">
              <td className="py-3 pr-3 font-medium">{i + 1}</td>
              <td className="py-3 pr-3 font-medium">{row.name}</td>
              <td className="py-3 pr-3">{row.wins}</td>
              <td className="py-3 pr-3">{row.losses}</td>
              <td className="py-3 pr-3">{row.games}</td>
              <td className="py-3 pr-3">{row.pointsFor}</td>
              <td className="py-3 pr-3">{row.pointsAgainst}</td>
              <td className="py-3 pr-3">{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
              <td className="py-3">{Math.round(row.winPct * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PickleballFridayRankingsApp() {
  const [sessionName, setSessionName] = useState(() => {
    const d = new Date();
    return `Friday Session ${d.toLocaleDateString()}`;
  });
  const [game, setGame] = useState(emptyGame);
  const [sessionGames, setSessionGames] = useState([]);
  const [seasonGames, setSeasonGames] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setSessionName(parsed.sessionName || `Friday Session ${new Date().toLocaleDateString()}`);
      setSessionGames(parsed.sessionGames || []);
      setSeasonGames(parsed.seasonGames || []);
    } catch (e) {
      console.error("Failed to load saved app data", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionName, sessionGames, seasonGames })
    );
  }, [sessionName, sessionGames, seasonGames]);

  const sessionStats = useMemo(() => buildStats(sessionGames), [sessionGames]);
  const seasonStats = useMemo(() => buildStats(seasonGames), [seasonGames]);
  const knownPlayers = useMemo(
    () => Array.from(new Set([...getAllPlayers(sessionGames), ...getAllPlayers(seasonGames)])).sort((a, b) => a.localeCompare(b)),
    [sessionGames, seasonGames]
  );

  const addGame = () => {
    const payload = {
      ...game,
      teamA1: normalizeName(game.teamA1),
      teamA2: normalizeName(game.teamA2),
      teamB1: normalizeName(game.teamB1),
      teamB2: normalizeName(game.teamB2),
      scoreA: Number(game.scoreA),
      scoreB: Number(game.scoreB),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const players = [payload.teamA1, payload.teamA2, payload.teamB1, payload.teamB2].filter(Boolean);
    if (players.length !== 4) return alert("Enter all 4 players.");
    if (new Set(players).size !== 4) return alert("Each player should only appear once in a game.");
    if (Number.isNaN(payload.scoreA) || Number.isNaN(payload.scoreB)) return alert("Enter both scores.");
    if (payload.scoreA === payload.scoreB) return alert("Games cannot end in a tie.");

    setSessionGames((prev) => [payload, ...prev]);
    setGame(emptyGame);
  };

  const deleteSessionGame = (id) => {
    setSessionGames((prev) => prev.filter((g) => g.id !== id));
  };

  const saveSessionToSeason = () => {
    if (!sessionGames.length) return alert("No session games to save.");
    setSeasonGames((prev) => [...sessionGames, ...prev]);
    setSessionGames([]);
    setSessionName(`Friday Session ${new Date().toLocaleDateString()}`);
  };

  const resetSession = () => {
    setSessionGames([]);
  };

  const resetSeason = () => {
    setSeasonGames([]);
  };

  const autofillFromPlayers = (index, value) => {
    setGame((prev) => ({ ...prev, [index]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Friday Pickleball Rankings</h1>
            <p className="mt-1 text-slate-600">
              Enter each doubles game. The app tracks individual wins, losses, points, and rankings.
            </p>
          </div>
          <div className="w-full md:w-80">
            <Label className="mb-2 block">Session name</Label>
            <Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl shadow-sm lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" /> Add game
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-2 block">Team A - Player 1</Label>
                  <Input value={game.teamA1} onChange={(e) => autofillFromPlayers("teamA1", e.target.value)} placeholder="Jeff" list="players" />
                </div>
                <div>
                  <Label className="mb-2 block">Team A - Player 2</Label>
                  <Input value={game.teamA2} onChange={(e) => autofillFromPlayers("teamA2", e.target.value)} placeholder="Mark" list="players" />
                </div>
                <div>
                  <Label className="mb-2 block">Team B - Player 1</Label>
                  <Input value={game.teamB1} onChange={(e) => autofillFromPlayers("teamB1", e.target.value)} placeholder="Sam" list="players" />
                </div>
                <div>
                  <Label className="mb-2 block">Team B - Player 2</Label>
                  <Input value={game.teamB2} onChange={(e) => autofillFromPlayers("teamB2", e.target.value)} placeholder="Luke" list="players" />
                </div>
              </div>

              <datalist id="players">
                {knownPlayers.map((player) => (
                  <option key={player} value={player} />
                ))}
              </datalist>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-2 block">Team A score</Label>
                  <Input type="number" value={game.scoreA} onChange={(e) => autofillFromPlayers("scoreA", e.target.value)} />
                </div>
                <div>
                  <Label className="mb-2 block">Team B score</Label>
                  <Input type="number" value={game.scoreB} onChange={(e) => autofillFromPlayers("scoreB", e.target.value)} />
                </div>
              </div>

              <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
                Example: Jeff + Mark beat Sam + Luke, 11–3. Both Jeff and Mark get a win and 11 points scored.
              </p>

              <Button onClick={addGame} className="w-full rounded-xl">Add game</Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue="session" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 rounded-2xl">
                <TabsTrigger value="session">This Friday</TabsTrigger>
                <TabsTrigger value="season">Season</TabsTrigger>
              </TabsList>

              <TabsContent value="session" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="pt-6">
                      <div className="text-sm text-slate-500">Games logged</div>
                      <div className="mt-1 text-3xl font-bold">{sessionGames.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="pt-6">
                      <div className="text-sm text-slate-500">Players active</div>
                      <div className="mt-1 text-3xl font-bold">{sessionStats.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="pt-6">
                      <div className="text-sm text-slate-500">Current leader</div>
                      <div className="mt-1 text-xl font-bold">{sessionStats[0]?.name || "—"}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5" /> {sessionName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StatTable rows={sessionStats} emptyText="No games added yet for this Friday." />
                  </CardContent>
                </Card>

                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Game log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!sessionGames.length ? (
                      <div className="text-sm text-slate-500">Your games will appear here.</div>
                    ) : (
                      <div className="space-y-3">
                        {sessionGames.map((g) => {
                          const aWon = Number(g.scoreA) > Number(g.scoreB);
                          return (
                            <div key={g.id} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="font-medium text-slate-900">
                                  {g.teamA1} + {g.teamA2} vs {g.teamB1} + {g.teamB2}
                                </div>
                                <div className="text-sm text-slate-600">
                                  Final: <span className="font-medium">{g.scoreA} - {g.scoreB}</span> · Winner: {aWon ? `${g.teamA1} + ${g.teamA2}` : `${g.teamB1} + ${g.teamB2}`}
                                </div>
                              </div>
                              <Button variant="outline" className="rounded-xl" onClick={() => deleteSessionGame(g.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-3 md:flex-row">
                  <Button onClick={saveSessionToSeason} className="rounded-xl">
                    <Save className="mr-2 h-4 w-4" /> Save this Friday into season
                  </Button>
                  <Button variant="outline" onClick={resetSession} className="rounded-xl">
                    <RotateCcw className="mr-2 h-4 w-4" /> Clear this Friday
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="season" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="pt-6">
                      <div className="text-sm text-slate-500">Season games</div>
                      <div className="mt-1 text-3xl font-bold">{seasonGames.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="pt-6">
                      <div className="text-sm text-slate-500">Season players</div>
                      <div className="mt-1 text-3xl font-bold">{seasonStats.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="pt-6">
                      <div className="text-sm text-slate-500">Season #1</div>
                      <div className="mt-1 text-xl font-bold">{seasonStats[0]?.name || "—"}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CalendarDays className="h-5 w-5" /> Season rankings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StatTable rows={seasonStats} emptyText="No season data saved yet." />
                  </CardContent>
                </Card>

                <Button variant="outline" onClick={resetSeason} className="rounded-xl">
                  <RotateCcw className="mr-2 h-4 w-4" /> Clear season
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
