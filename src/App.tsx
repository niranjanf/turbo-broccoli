import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Users,
  Receipt,
  IndianRupee,
  RefreshCw,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
}

interface Payer {
  memberId: string;
  amountPaid: number;
}

interface Expense {
  id: string;
  description: string;
  paidBy: Payer[]; // multiple payers
  splitAmong: string[];
  date: string;
}

export default function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load from localStorage
  useEffect(() => {
    const savedMembers = localStorage.getItem("members");
    const savedExpenses = localStorage.getItem("expenses");
    if (savedMembers) setMembers(JSON.parse(savedMembers));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("members", JSON.stringify(members));
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }, [members, expenses]);

  // Add member
  const addMember = (name: string) => {
    if (!name.trim()) return;
    setMembers([...members, { id: Date.now().toString(), name }]);
  };

  // Add expense
  const addExpense = () => {
    if (members.length === 0) {
      alert("Add members first");
      return;
    }

    const description = prompt("Expense description") || "Expense";

    // Collect paid amounts per member
    const payers: Payer[] = [];
    for (const m of members) {
      const amtStr = prompt(`Amount paid by ${m.name} (0 if none)`) || "0";
      const amt = parseFloat(amtStr);
      if (amt > 0) payers.push({ memberId: m.id, amountPaid: amt });
    }

    if (payers.length === 0) {
      alert("At least one member must pay something");
      return;
    }

    // Split among selected members (default: all)
    const splitAmong = members.map((m) => m.id);

    const newExp: Expense = {
      id: Date.now().toString(),
      description,
      paidBy: payers,
      splitAmong,
      date: new Date().toISOString(),
    };

    setExpenses([newExp, ...expenses]);
  };

  // Calculate balances
  const balances = useMemo(() => {
    const bal: Record<string, number> = {};
    members.forEach((m) => (bal[m.id] = 0));

    for (const exp of expenses) {
      const totalAmountPaid = exp.paidBy.reduce(
        (sum, p) => sum + p.amountPaid,
        0
      );
      const sharePerMember = totalAmountPaid / exp.splitAmong.length;

      exp.splitAmong.forEach((id) => {
        bal[id] -= sharePerMember;
      });

      exp.paidBy.forEach((p) => {
        bal[p.memberId] += p.amountPaid;
      });
    }

    return bal;
  }, [members, expenses]);

  // Compute settlements (who pays whom)
  const settlements = useMemo(() => {
    const eps = 0.01;
    const creditors: { id: string; amt: number }[] = [];
    const debtors: { id: string; amt: number }[] = [];

    Object.entries(balances).forEach(([id, amt]) => {
      if (amt > eps) creditors.push({ id, amt });
      else if (amt < -eps) debtors.push({ id, amt: -amt });
    });

    creditors.sort((a, b) => b.amt - a.amt);
    debtors.sort((a, b) => b.amt - a.amt);

    const txns: { from: string; to: string; amount: number }[] = [];
    let i = 0,
      j = 0;
    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const pay = Math.min(d.amt, c.amt);
      txns.push({ from: d.id, to: c.id, amount: pay });
      d.amt -= pay;
      c.amt -= pay;
      if (d.amt <= eps) i++;
      if (c.amt <= eps) j++;
    }

    return txns;
  }, [balances]);

  const resetAll = () => {
    if (confirm("Clear all members and expenses?")) {
      setMembers([]);
      setExpenses([]);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Receipt /> Roommate Expense Splitter
      </h1>

      {/* Members */}
      <div className="mt-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Users /> Members
        </h2>
        <ul>
          {members.map((m) => (
            <li key={m.id}>{m.name}</li>
          ))}
        </ul>
        <button
          className="mt-2 bg-indigo-500 text-white px-3 py-1 rounded flex items-center gap-1"
          onClick={() => addMember(prompt("Enter member name") || "")}
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* Expenses */}
      <div className="mt-6">
        <h2 className="font-semibold flex items-center gap-2">
          <IndianRupee /> Expenses
        </h2>
        <ul>
          {expenses.map((e) => (
            <li key={e.id}>
              {e.description} — ₹
              {e.paidBy.reduce((sum, p) => sum + p.amountPaid, 0).toFixed(2)} (
              {e.paidBy
                .map(
                  (p) =>
                    `${members.find((m) => m.id === p.memberId)?.name || "?"}: ₹${p.amountPaid.toFixed(
                      2
                    )}`
                )
                .join(", ")}
              )
            </li>
          ))}
        </ul>
        <button
          className="mt-2 bg-green-500 text-white px-3 py-1 rounded flex items-center gap-1"
          onClick={addExpense}
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Balances */}
      <div className="mt-6">
        <h2 className="font-semibold">Balances</h2>
        <ul>
          {members.map((m) => (
            <li key={m.id}>
              {m.name}:{" "}
              {balances[m.id] >= 0
                ? `should receive ₹${balances[m.id].toFixed(2)}`
                : `owes ₹${Math.abs(balances[m.id]).toFixed(2)}`}
            </li>
          ))}
        </ul>
      </div>

      {/* Settlements */}
      <div className="mt-6">
        <h2 className="font-semibold">Settlement Plan</h2>
        {settlements.length === 0 ? (
          <p>All settled or not enough data yet.</p>
        ) : (
          <ul>
            {settlements.map((s, idx) => (
              <li key={idx}>
                {members.find((m) => m.id === s.from)?.name || "?"} pays{" "}
                {members.find((m) => m.id === s.to)?.name || "?"} ₹
                {s.amount.toFixed(2)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        className="mt-4 bg-rose-500 text-white px-3 py-1 rounded flex items-center gap-1"
        onClick={resetAll}
      >
        <RefreshCw size={16} /> Reset All
      </button>
    </div>
  );
}

