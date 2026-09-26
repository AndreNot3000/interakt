'use client';

import { useState } from 'react';
import { Search, CheckCircle, XCircle, ShieldCheck, Filter } from 'lucide-react';

export default function UsersAdminPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  const pendingStudents = [
    {
      id: 'usr_1',
      name: 'David Adeyemi',
      email: 'david@student.unilag.edu.ng',
      studentId: '190408012',
      faculty: 'Science',
      department: 'Computer Science',
      level: 300,
      method: 'STUDENT_ID',
      submittedDate: '2 hours ago',
    },
    {
      id: 'usr_2',
      name: 'Fatima Al-Hassan',
      email: 'fatima@student.unilag.edu.ng',
      studentId: '200405089',
      faculty: 'Engineering',
      department: 'Electrical Engineering',
      level: 200,
      method: 'EMAIL_DOMAIN',
      submittedDate: '4 hours ago',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Student Management & Verification
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review student identity proof, issue university verification badges, and manage student accounts.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Pending Verifications
          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full font-bold">
            2
          </span>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          All Enrolled Students (1,420)
        </button>
      </div>

      {activeTab === 'pending' ? (
        <div className="space-y-4">
          {pendingStudents.map((st) => (
            <div
              key={st.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg">
                  {st.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{st.name}</h3>
                    <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-medium">
                      Method: {st.method}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{st.email}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 font-medium">
                    <span>Faculty of {st.faculty}</span>
                    <span>•</span>
                    <span>Dept: {st.department}</span>
                    <span>•</span>
                    <span>Level: {st.level}L</span>
                    <span>•</span>
                    <span>ID: {st.studentId}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button
                  onClick={() => alert(`Verification rejected for ${st.name}`)}
                  className="px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => alert(`Verification approved for ${st.name}! ✓ Verified Student badge granted.`)}
                  className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Verification
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Student Name</th>
                <th className="px-6 py-3">Faculty / Department</th>
                <th className="px-6 py-3">Level</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                  David Adeyemi
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </td>
                <td className="px-6 py-4">Science / Computer Science</td>
                <td className="px-6 py-4">300L</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    VERIFIED
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-xs font-semibold text-rose-600 hover:underline">
                    Suspend Access
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
