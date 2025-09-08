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
  paidBy: string; // member name
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

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("members", JSON.stringify(members));
    localStorage.setItem("expenses", JSON.stringify(expenses));
    calculateBalances();
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
    const totalAmountStr = prompt("Enter total expense amount") || "0";
    const totalAmount = Number(totalAmountStr);
    if (totalAmount <= 0) return alert("Invalid total expense amount!");

    const paidMap: Record<string, number> = {};
    let totalPaid = 0;
    members.forEach((m) => {
      const amtStr = prompt(`Amount paid by ${m.name}`) || "0";
      const amt = Number(amtStr);
      paidMap[m.name] = amt;
      totalPaid += amt;
    });

    if (totalPaid !== totalAmount) {
      return alert(`Total paid by members (${totalPaid}) does not match total expense (${totalAmount})`);
    }

    // Create separate expense entries per payer
    members.forEach((m) => {
      if (paidMap[m.name] > 0) {
        setExpenses((prev) => [
          ...prev,
          {
            id: Date.now().toString() + Math.random(),
            description,
            amount: paidMap[m.name],
            paidBy: m.name,
          },
        ]);
      }
    });
  };

  // Calculate balances and settlements
  const calculateBalances = () => {
    const bal: Record<string, number> = {};
    members.forEach((m) => (bal[m.name] = 0));

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    if (members.length === 0) return;

    const perHead = total / members.length;

    const paidMap: Record<string, number> = {};
    members.forEach((m) => (paidMap[m.name] = 0));
    expenses.forEach((e) => {
      if (paidMap[e.paidBy] !== undefined) {
        paidMap[e.paidBy] += e.amount;
      }
    });

    members.forEach((m) => {
      bal[m.name] = +(paidMap[m.name] - perHead).toFixed(2);
    });

    setBalances(bal);
    calculateSettlements(bal);
  };

  const calculateSettlements = (bal: Record<string, number>) => {
    const pos: { name: string; bal: number }[] = [];
    const neg: { name: string; bal: number }[] = [];

    Object.entries(bal).forEach(([name, value]) => {
      if (value > 0) pos.push({ name, bal: value });
      else if (value < 0) neg.push({ name, bal: -value });
    });

    const owes: Settlement[] = [];
    let i = 0,
      j = 0;

    while (i < pos.length && j < neg.length) {
      const pay = Math.min(pos[i].bal, neg[j].bal);
      owes.push({ from: neg[j].name, to: pos[i].name, amount: pay });
      pos[i].bal -= pay;
      neg[j].bal -= pay;
      if (pos[i].bal === 0) i++;
      if (neg[j].bal === 0) j++;
    }

    setSettlements(owes);
  };

  // Reset all data
  const resetData = () => {
    if (window.confirm("Reset all data?")) {
      setMembers([]);
      setExpenses([]);
      setBalances({});
      setSettlements([]);
      localStorage.clear();
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

  const emailSettlements = () => {
    if (settlements.length === 0) return alert("No settlements to send!");
    settlements.forEach(({ from, to, amount }) => {
      const fromMember = members.find((m) => m.name === from);
      const toMember = members.find((m) => m.name === to);
      if (fromMember?.email && toMember?.email) {
        const html = `Hi ${fromMember.name},<br/>
          Please pay <b>₹${amount.toFixed(2)}</b> to ${toMember.name}.<br/>
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
        <button onClick={addMember} className="mt-2 bg-indigo-500 text-white px-4 py-1 rounded flex items-center gap-2">
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
              {e.description} — ₹{e.amount} (Paid by: {e.paidBy})
            </li>
          ))}
        </ul>
        <button onClick={addExpense} className="mt-2 bg-green-500 text-white px-4 py-1 rounded flex items-center gap-2">
          <Plus /> Add Expense
        </button>
      </div>

      {/* Balances */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Balances</h2>
        <ul>
          {members.map((m) => (
            <li key={m.id}>
              {m.name}: ₹{balances[m.name]?.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>

      {/* Settlements */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Settlements</h2>
        <ul>
          {settlements.map((s, i) => (
            <li key={i}>
              {s.from} pays ₹{s.amount.toFixed(2)} to {s.to}
            </li>
          ))}
        </ul>
        <button onClick={emailSettlements} className="mt-2 bg-blue-500 text-white px-4 py-1 rounded flex items-center gap-2">
          <Mail /> Send Emails
        </button>
        <button onClick={resetData} className="mt-2 ml-2 bg-red-500 text-white px-4 py-1 rounded flex items-center gap-2">
          <RefreshCw /> Reset
        </button>
      </div>
    </div>
  );
}

export default App;

