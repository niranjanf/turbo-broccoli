import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Users,
  Receipt,
  Mail,
  RefreshCw,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
  email?: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paid: Record<string, number>; // memberId -> amount paid
  date: string;
}

function App() {
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
  const addMember = () => {
    const name = prompt("Enter member name");
    const email = prompt("Enter member email (optional)");
    if (!name) return;
    setMembers([...members, { id: Date.now().toString(), name, email: email || "" }]);
  };

  // Add expense
  const addExpense = () => {
    if (members.length === 0) return alert("Add members first!");
    const description = prompt("Enter expense description") || "Expense";

    // Step 1: Enter total expense
    const totalAmountStr = prompt("Enter total expense amount") || "0";
    const totalAmount = Number(totalAmountStr);
    if (totalAmount <= 0) return alert("Invalid total expense!");

    // Step 2: Enter how much each member paid
    const paid: Record<string, number> = {};
    members.forEach((m) => {
      const amtStr = prompt(`Amount paid by ${m.name}`) || "0";
      paid[m.id] = Number(amtStr);
    });

    // Step 3: Validate total paid matches total amount
    const sumPaid = Object.values(paid).reduce((a, b) => a + b, 0);
    if (sumPaid !== totalAmount) {
      alert(`Total paid by members (${sumPaid}) does not match total expense (${totalAmount})`);
      return;
    }

    setExpenses([
      ...expenses,
      { id: Date.now().toString(), description, amount: totalAmount, paid, date: new Date().toISOString() },
    ]);
  };

  // Calculate balances (how much each member owes or is owed)
  const balances = useMemo(() => {
    const bal: Record<string, number> = {};
    if (members.length === 0 || expenses.length === 0) return bal;

    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    const perPerson = totalExpense / members.length;

    members.forEach((m) => {
      // Total paid by member
      const totalPaid = expenses.reduce((sum, e) => sum + (e.paid[m.id] || 0), 0);
      bal[m.id] = totalPaid - perPerson; // positive = member paid extra, negative = owes
    });

    return bal;
  }, [expenses, members]);

  // Calculate settlements
  const settlements = useMemo(() => {
    const owes: { from: string; to: string; amount: number }[] = [];
    const pos: { id: string; bal: number }[] = [];
    const neg: { id: string; bal: number }[] = [];

    Object.entries(balances).forEach(([id, b]) => {
      if (b > 0) pos.push({ id, bal: b });
      else if (b < 0) neg.push({ id, bal: -b });
    });

    let i = 0, j = 0;
    while (i < pos.length && j < neg.length) {
      const pay = Math.min(pos[i].bal, neg[j].bal);
      owes.push({ from: neg[j].id, to: pos[i].id, amount: pay });
      pos[i].bal -= pay;
      neg[j].bal -= pay;
      if (pos[i].bal === 0) i++;
      if (neg[j].bal === 0) j++;
    }

    return owes;
  }, [balances]);

  // Reset data
  const resetData = () => {
    if (window.confirm("Reset all data?")) {
      setMembers([]);
      setExpenses([]);
    }
  };

  // Send email through backend
  const sendEmail = async (memberEmail: string, subject: string, html: string) => {
    try {
      const res = await fetch("http://localhost:5000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: memberEmail, subject, html }),
      });
      const data = await res.json();
      if (data.success) alert(`✅ Email sent to ${memberEmail}`);
      else alert(`❌ Email failed: ${data.error || "Unknown error"}`);
    } catch (err) {
      console.error(err);
      alert("⚠️ Error sending email (check backend server).");
    }
  };

  // Send settlement emails
  const emailSettlements = () => {
    if (settlements.length === 0) return alert("No settlements to send!");
    settlements.forEach(({ from, to, amount }) => {
      const fromMember = members.find((m) => m.id === from);
      const toMember = members.find((m) => m.id === to);
      if (fromMember?.email && toMember?.email) {
        const html = `Hi ${fromMember.name},<br/>
          Please pay <b>₹${amount.toFixed(2)}</b> to ${toMember.name}.<br/>
          <br/>
          💰 Total expenses so far: ₹${expenses.reduce((a, e) => a + e.amount, 0)}.`;
        sendEmail(fromMember.email, "Expense Settlement", html);
      }
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
        <Receipt /> Roommate Expense Splitter
      </h1>

      {/* Members */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users /> Members
        </h2>
        <ul>
          {members.map((m) => (
            <li key={m.id}>
              {m.name} {m.email && `(${m.email})`}
            </li>
          ))}
        </ul>
        <button
          onClick={addMember}
          className="mt-2 bg-indigo-500 text-white px-4 py-1 rounded flex items-center gap-2"
        >
          <Plus /> Add Member
        </button>
      </div>

      {/* Expenses */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Receipt /> Expenses
        </h2>
        <ul>
          {expenses.map((e) => (
            <li key={e.id}>
              {e.description} — ₹{e.amount} (Date: {new Date(e.date).toLocaleDateString()})
            </li>
          ))}
        </ul>
        <button
          onClick={addExpense}
          className="mt-2 bg-green-500 text-white px-4 py-1 rounded flex items-center gap-2"
        >
          <Plus /> Add Expense
        </button>
      </div>

      {/* Balances */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Balances</h2>
        <ul>
          {members.map((m) => (
            <li key={m.id}>
              {m.name}: ₹{balances[m.id]?.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>

      {/* Settlements */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Settlements</h2>
        <ul>
          {settlements.map((s, i) => {
            const from = members.find((m) => m.id === s.from)?.name || "Unknown";
            const to = members.find((m) => m.id === s.to)?.name || "Unknown";
            return (
              <li key={i}>
                {from} pays ₹{s.amount.toFixed(2)} to {to}
              </li>
            );
          })}
        </ul>
        <button
          onClick={emailSettlements}
          className="mt-2 bg-blue-500 text-white px-4 py-1 rounded flex items-center gap-2"
        >
          <Mail /> Send Emails
        </button>
        <button
          onClick={resetData}
          className="mt-2 ml-2 bg-red-500 text-white px-4 py-1 rounded flex items-center gap-2"
        >
          <RefreshCw /> Reset
        </button>
      </div>
    </div>
  );
}

export default App;

