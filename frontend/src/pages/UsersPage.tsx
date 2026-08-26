import React from 'react';
import { Users, ShieldCheck } from 'lucide-react';

export default function UsersPage() {
  const users = [
    { name: "System Administrator", email: "admin@cityvision.bel.in", role: "System Administrator", badge: "BEL-ADM-01" },
    { name: "Traffic Police Officer", email: "police@cityvision.bel.in", role: "Traffic Police", badge: "VSP-TP-104" },
    { name: "Command Operator", email: "operator@cityvision.bel.in", role: "Control Room Operator", badge: "VSP-CR-02" },
    { name: "Special Crime Investigator", email: "investigator@cityvision.bel.in", role: "Authorized Investigator", badge: "CID-AP-89" },
    { name: "Urban Mobility Analyst", email: "analyst@cityvision.bel.in", role: "Traffic Analyst", badge: "VMRDA-AN-12" },
    { name: "GVMC Smart City Director", email: "authority@cityvision.bel.in", role: "Municipal/Smart City Authority", badge: "GVMC-DIR-01" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
          <Users className="w-5 h-5 text-purple-400" />
          <span>User Accounts & RBAC Role Directory</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Role-Based Access Control directory configured for Bharat Electronics Limited deployment
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[10px] uppercase">
              <tr>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">Email</th>
                <th className="p-2.5">Assigned Role</th>
                <th className="p-2.5">Badge Number</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {users.map((u, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition">
                  <td className="p-2.5 font-bold text-slate-100">{u.name}</td>
                  <td className="p-2.5 font-mono text-slate-400">{u.email}</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 border border-slate-800 text-cyan-400">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-slate-400">{u.badge}</td>
                  <td className="p-2.5">
                    <span className="flex items-center text-emerald-400 font-semibold text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
