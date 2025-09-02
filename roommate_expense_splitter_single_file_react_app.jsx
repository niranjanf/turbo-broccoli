import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Download, Upload, RefreshCw, Users, Receipt, IndianRupee } from "lucide-react";

/**
 * Roommate Expense Splitter (single-file React app)
 * - Add roommates (dynamic count)
 * - Add expenses: description, amount, payer, involved members
 * - Split equally or by custom weights per participant
 * - See running balances and a simplified settlement plan (who pays whom)
 * - Persist data in localStorage; import/export JSON
 * - Clean Tailwind UI
 */

// ---------- Types ----------
interface Member { id: string; name: string }
interface ExpenseParticipant { memberId: string; weight: number; included: boolean }
interface Expense {
  id: string;
  description: string;
  amount: number; // in currency units
  payerId: string;
  participants: ExpenseParticipant[]; // only included=true are considered
  createdAt: number;
}

// ---------- Utils ----------
const uid = () => Math.random().toString(36).slice(2, 9);
const currency = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

function save(key: string, value: any) { localStorage.setItem(key, JSON.stringify(value)); }
function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback } catch { return fallback }
}

// Calculate balances: positive => others owe them; negative => they owe others
function calcBalances(members: Member[], expenses: Expense[]) {
  const bal: Record<string, number> = Object.fromEntries(members.map(m => [m.id, 0]));
  for (const e of expenses) {
    if (e.amount <= 0) continue;
    // payer paid full amount upfront
    bal[e.payerId] += e.amount;
    // compute shares for included participants
    const included = e.participants.filter(p => p.included);
    const totalWeight = included.reduce((acc, p) => acc + (p.weight || 0), 0) || included.length;
    for (const p of included) {
      const w = (p.weight || 0) || 1;
      const share = e.amount * (w / totalWeight);
      // each participant owes their share
      bal[p.memberId] -= share;
    }
  }
  return bal; // sum should be ~0
}

// Simplify settlements (greedy)
function simplify(balances: Record<string, number>) {
  const eps = 0.005; // tolerance (in INR)
  const debtors: { id: string; amt: number }[] = [];
  const creditors: { id: string; amt: number }[] = [];
  Object.entries(balances).forEach(([id, amt]) => {
    if (amt > eps) creditors.push({ id, amt });
    else if (amt < -eps) debtors.push({ id, amt: -amt });
  });
  // sort for deterministic output
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const txns: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const pay = Math.min(d.amt, c.amt);
    txns.push({ from: d.id, to: c.id, amount: pay });
    d.amt -= pay; c.amt -= pay;
    if (d.amt <= eps) i++;
    if (c.amt <= eps) j++;
  }
  return txns;
}

// ---------- App ----------
export default function App() {
  const [members, setMembers] = useState<Member[]>(() => load<Member[]>("rm_members", []));
  const [expenses, setExpenses] = useState<Expense[]>(() => load<Expense[]>("rm_expenses", []));
  const [memberName, setMemberName] = useState("");

  useEffect(() => save("rm_members", members), [members]);
  useEffect(() => save("rm_expenses", expenses), [expenses]);

  const balances = useMemo(() => calcBalances(members, expenses), [members, expenses]);
  const settlements = useMemo(() => simplify(balances), [balances]);

  function addMember() {
    const name = memberName.trim();
    if (!name) return;
    const m: Member = { id: uid(), name };
    setMembers(prev => [...prev, m]);
    setMemberName("");
  }
  function removeMember(id: string) {
    // Remove member and their participation from expenses
    setMembers(prev => prev.filter(m => m.id !== id));
    setExpenses(prev => prev.map(e => ({
      ...e,
      participants: e.participants.filter(p => p.memberId !== id),
      payerId: e.payerId === id ? (members.find(m => m.id !== id)?.id || e.payerId) : e.payerId,
    })).filter(e => e.participants.length > 0));
  }

  function addExpense(e: Expense) { setExpenses(prev => [e, ...prev]); }
  function deleteExpense(id: string) { setExpenses(prev => prev.filter(x => x.id !== id)); }
  function resetAll() { if (confirm("Clear all members & expenses?")) { setMembers([]); setExpenses([]); } }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ members, expenses }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `roommate-expenses-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data.members) && Array.isArray(data.expenses)) {
          setMembers(data.members);
          setExpenses(data.expenses);
        } else alert("Invalid file format.");
      } catch { alert("Failed to read file."); }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Users className="w-6 h-6" /> Roommate Expense Splitter
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={exportJSON} className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 flex items-center gap-2"><Download className="w-4 h-4"/>Export</button>
            <label className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4"/>Import
              <input type="file" accept="application/json" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) importJSON(f)}}/>
            </label>
            <button onClick={resetAll} className="px-3 py-2 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 flex items-center gap-2"><RefreshCw className="w-4 h-4"/>Reset</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Members & New Expense */}
        <section className="lg:col-span-1 space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold">Roommates</h2>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{members.length}</span>
            </div>
            <div className="flex gap-2">
              <input value={memberName} onChange={e=>setMemberName(e.target.value)} placeholder="Add name"
                     onKeyDown={(e)=>{ if(e.key==='Enter') addMember() }}
                     className="flex-1 px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-200"/>
              <button onClick={addMember} className="px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"><Plus className="w-4 h-4"/>Add</button>
            </div>
            <ul className="mt-3 space-y-2">
              {members.map(m => (
                <li key={m.id} className="flex items-center justify-between bg-slate-100 rounded-xl px-3 py-2">
                  <span>{m.name}</span>
                  <button onClick={()=>removeMember(m.id)} className="p-1 text-slate-500 hover:text-rose-600"><Trash2 className="w-5 h-5"/></button>
                </li>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-slate-500">Add your roommates to get started.</p>
              )}
            </ul>
          </Card>

          <NewExpenseCard members={members} onAdd={addExpense} />
        </section>

        {/* Right column: Balances & Expenses */}
        <section className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-3"><Receipt className="w-5 h-5"/><h2 className="text-lg font-semibold">Balances</h2></div>
            {members.length === 0 ? (
              <p className="text-sm text-slate-500">Add members to compute balances.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {members.map(m => {
                  const b = balances[m.id] || 0;
                  return (
                    <div key={m.id} className={`rounded-xl border px-4 py-3 ${b>0?"bg-emerald-50 border-emerald-200":""} ${b<0?"bg-rose-50 border-rose-200":""}`}>
                      <div className="text-sm text-slate-500">{m.name}</div>
                      <div className="text-xl font-semibold">{currency(b)}</div>
                      <div className="text-xs text-slate-500">{b>0?"To Receive":b<0?"To Pay":"Settled"}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold mb-3">Settlement Plan</h2>
            {settlements.length === 0 ? (
              <p className="text-sm text-slate-500">All settled or not enough data yet.</p>
            ) : (
              <ul className="space-y-2">
                {settlements.map((t,i)=> (
                  <li key={i} className="flex items-center justify-between bg-white rounded-xl border px-4 py-2">
                    <span>
                      <strong>{members.find(m=>m.id===t.from)?.name || "?"}</strong>
                      {" pays "}
                      <strong>{members.find(m=>m.id===t.to)?.name || "?"}</strong>
                    </span>
                    <span className="font-semibold">{currency(t.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold mb-3">All Expenses</h2>
            {expenses.length === 0 ? (
              <p className="text-sm text-slate-500">No expenses yet.</p>
            ) : (
              <ul className="space-y-3">
                {expenses.map(e => (
                  <li key={e.id} className="rounded-2xl border bg-white">
                    <div className="px-4 py-3 flex items-center justify-between border-b">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-4 h-4"/>
                        <div>
                          <div className="font-medium">{e.description || "(No description)"}</div>
                          <div className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="text-lg font-semibold">{currency(e.amount)}</div>
                    </div>
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
                      <span className="px-2 py-1 rounded-full bg-slate-100">Paid by: <strong>{members.find(m=>m.id===e.payerId)?.name || "?"}</strong></span>
                      <div className="flex flex-wrap gap-2">
                        {e.participants.filter(p=>p.included).map(p => (
                          <span key={p.memberId} className="px-2 py-1 rounded-full bg-indigo-50 border border-indigo-200">
                            {members.find(m=>m.id===p.memberId)?.name || "?"}
                            {p.weight ? <em className="text-xs text-slate-500"> × {p.weight}</em> : null}
                          </span>
                        ))}
                      </div>
                      <div className="ml-auto">
                        <button onClick={()=>deleteExpense(e.id)} className="px-3 py-1.5 rounded-xl border text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center gap-2"><Trash2 className="w-4 h-4"/>Delete</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl p-6 text-center text-xs text-slate-500">
        Built for quick splitting — data stays in your browser.
      </footer>
    </div>
  );
}

// ---------- Components ----------
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">{children}</div>
  );
}

function NewExpenseCard({ members, onAdd }: { members: Member[], onAdd: (e: Expense) => void }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [payerId, setPayerId] = useState<string>("");
  const [splitMode, setSplitMode] = useState<"equal"|"weights">("equal");
  const [participants, setParticipants] = useState<Record<string, ExpenseParticipant>>({});

  useEffect(() => {
    // ensure any new member is added as included by default
    const next: Record<string, ExpenseParticipant> = { ...participants };
    for (const m of members) {
      if (!next[m.id]) next[m.id] = { memberId: m.id, included: true, weight: 1 };
    }
    // remove deleted members
    for (const k of Object.keys(next)) {
      if (!members.find(m => m.id === k)) delete next[k];
    }
    setParticipants(next);
    if (!payerId && members[0]) setPayerId(members[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length]);

  function toggleInclude(id: string) {
    setParticipants(prev => ({ ...prev, [id]: { ...prev[id], included: !prev[id].included } }));
  }
  function setWeight(id: string, w: number) {
    setParticipants(prev => ({ ...prev, [id]: { ...prev[id], weight: isFinite(w) && w>0 ? w : 1 } }));
  }

  function canSubmit() {
    const amt = parseFloat(amount);
    const hasAmt = isFinite(amt) && amt > 0;
    const hasPayer = !!payerId;
    const included = Object.values(participants).filter(p => p.included);
    return hasAmt && hasPayer && included.length > 0;
  }

  function handleAdd() {
    if (!canSubmit()) return;
    const amt = parseFloat(amount);
    const e: Expense = {
      id: uid(),
      description: description.trim(),
      amount: amt,
      payerId,
      participants: Object.values(participants),
      createdAt: Date.now(),
    };
    onAdd(e);
    setDescription(""); setAmount("");
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-2">Add Expense</h2>
      {members.length === 0 ? (
        <p className="text-sm text-slate-500">Add at least one roommate to create expenses.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">Description</label>
              <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="e.g., Groceries, Electricity bill"
                     className="px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-200"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">Amount (INR)</label>
              <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" inputMode="decimal"
                     className="px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-200"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">Paid by</label>
              <select value={payerId} onChange={e=>setPayerId(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-200">
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">Split mode</label>
              <div className="flex gap-2">
                <button onClick={()=>setSplitMode("equal")} className={`px-3 py-2 rounded-xl border ${splitMode==='equal'? 'bg-indigo-600 text-white border-indigo-600':'border-slate-300'}`}>Equal</button>
                <button onClick={()=>setSplitMode("weights")} className={`px-3 py-2 rounded-xl border ${splitMode==='weights'? 'bg-indigo-600 text-white border-indigo-600':'border-slate-300'}`}>Weights</button>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-600 mb-1">Participants</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {members.map(m => {
                const p = participants[m.id];
                if (!p) return null;
                return (
                  <label key={m.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${p.included? 'bg-indigo-50 border-indigo-200':'bg-white border-slate-300'}`}>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={p.included} onChange={()=>toggleInclude(m.id)} />
                      <span>{m.name}</span>
                    </div>
                    {splitMode==='weights' && p.included && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">×</span>
                        <input type="number" min={0.01} step={0.01} value={p.weight}
                               onChange={e=>setWeight(m.id, parseFloat(e.target.value))}
                               className="w-24 px-2 py-1 rounded-lg border border-slate-300"/>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
            {splitMode==='weights' && (
              <p className="text-xs text-slate-500 mt-1">Weights are relative shares (e.g., 1, 1, 2 means the third person pays 2x share).</p>
            )}
          </div>

          <div className="flex justify-end">
            <button disabled={!canSubmit()} onClick={handleAdd}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
              Add Expense
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
