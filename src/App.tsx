import React, { useState, useEffect } from "react";
import { Plus, Users, Receipt, Mail, RefreshCw } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email?: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  // Load from localStorage
  useEffect(() => {
    const savedMembers = localStorage.getItem("members");
    const savedExpenses = localStorage.getItem("expenses");
    if (savedMembers) setMembers(JSON.parse(savedMembers));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
  }, []);

  // Save and calculate whenever data changes
  useEffect(() => {
    localStorage.setItem("members", JSON.stringify(members));
    localStorage.setItem("expenses", JSON.stringify(expenses));
    calculateBalancesAndSettlements();
  }, [members, expenses]);

  // Add member
  const addMember = () => {
    const name = prompt("Enter member name");
    if (!name) return;
    const email = prompt("Enter member email (optional)");
    setMembers([...members, { id: Date.now().toString(), name, email: email || "" }]);
  };

  // Add expense (ensures sum of contributions = total)
  const addExpense = () => {
    if (members.length === 0) return alert("Add members first!");

    const description = prompt("Enter expense description") || "Expense";
    const totalAmount = Number(prompt("Enter total expense amount") || "0");
    if (totalAmount <= 0) return alert("Invalid expense amount!");

    const contributions: Record<string, number> = {};
    let sum = 0;
    members.forEach((m) => {
      const val = Number(prompt(`Amount paid by ${m.name}`) || "0");
      contributions[m.name] = val;
      sum += val;
    });

    if (sum !== totalAmount) {
      return alert(`Total paid (${sum}) does not equal total expense (${totalAmount})`);
    }

    // add expenses for each payer
    const newExpenses: Expense[] = [];
    members.forEach((m) => {
      if (contributions[m.name] > 0) {
        newExpenses.push({
          id: Date.now().toString() + Math.random(),
          description,
          amount: contributions[m.name],
          paidBy: m.name,
        });
      }
    });
    setExpenses((prev) => [...prev, ...newExpenses]);
  };

  // ✅ Calculate balances and settlements
  const calculateBalancesAndSettlements = () => {
    if (members.length === 0) return;

    const totals: Record<string, number> = {};
    members.forEach((m) => (totals[m.name] = 0));

    expenses.forEach((e) => {
      totals[e.paidBy] += e.amount;
    });

    const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
    const share = totalExpense / members.length;

    const bal: Record<string, number> = {};
    members.forEach((m) => {
      bal[m.name] = +(totals[m.name] - share).toFixed(2);
    });
    setBalances(bal);

    // settlements
    const pos: { name: string; bal: number }[] = [];
    const neg: { name: string; bal: number }[] = [];
    Object.entries(bal).forEach(([name, amt]) => {
      if (amt > 0) pos.push({ name, bal: amt });
      else if (amt < 0) neg.push({ name, bal: -amt });
    });

    const owes: Settlement[] = [];
    let i = 0,
      j = 0;
    while (i < pos.length && j < neg.length) {
      const amt = Math.min(pos[i].bal, neg[j].bal);
      owes.push({ from: neg[j].name, to: pos[i].name, amount: amt });
      pos[i].bal -= amt;
      neg[j].bal -= amt;
      if (pos[i].bal === 0) i++;
      if (neg[j].bal === 0) j++;
    }
    setSettlements(owes);
  };

  const resetData = () => {
    if (window.confirm("Reset everything?")) {
      setMembers([]);
      setExpenses([]);
      setBalances({});
      setSettlements([]);
      localStorage.clear();
    }
  };

  // Send settlements via backend email
  const emailSettlements = async () => {
    if (settlements.length === 0) return alert("No settlements to send");

    for (const s of settlements) {
      const from = members.find((m) => m.name === s.from);
      const to = members.find((m) => m.name === s.to);
      if (!from?.email || !to?.email) continue;

      const html = `Hi ${from.name},<br/>Please pay <b>₹${s.amount.toFixed(
        2
      )}</b> to ${to.name}.<br/>Thanks!`;

      await fetch("http://localhost:5000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: from.email,
          subject: "Settlement Reminder",
          html,
        }),
      });
    }
    alert("Emails sent!");
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Receipt /> Roommate Expense Splitter
      </h1>

      {/* Members */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users /> Members
        </h2>
        <ul>
          {members.map((m) => (
            <li key={m.id}>
              {m.name} {m.email && `(${m.email})`}
            </li>
          ))}
        </ul>
        <button onClick={addMember} className="mt-2 bg-indigo-500 text-white px-3 py-1 rounded">
          <Plus /> Add Member
        </button>
      </div>

      {/* Expenses */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Expenses</h2>
        <ul>
          {expenses.map((e) => (
            <li key={e.id}>
              {e.description} — ₹{e.amount} (by {e.paidBy})
            </li>
          ))}
        </ul>
        <button onClick={addExpense} className="mt-2 bg-green-500 text-white px-3 py-1 rounded">
          <Plus /> Add Expense
        </button>
      </div>

      {/* Balances */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Balances</h2>
        <ul>
          {members.map((m) => (
            <li key={m.id}>
              {m.name}: ₹{balances[m.name]?.toFixed(2) || "0.00"}
            </li>
          ))}
        </ul>
      </div>

      {/* Settlements */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Settlements</h2>
        <ul>
          {settlements.map((s, i) => (
            <li key={i}>
              {s.from} → {s.to}: ₹{s.amount.toFixed(2)}
            </li>
          ))}
        </ul>
        <button onClick={emailSettlements} className="mt-2 bg-blue-500 text-white px-3 py-1 rounded">
          <Mail /> Send Emails
        </button>
        <button onClick={resetData} className="mt-2 ml-2 bg-red-500 text-white px-3 py-1 rounded">
          <RefreshCw /> Reset
        </button>
      </div>
    </div>
  );
}

export default App;

