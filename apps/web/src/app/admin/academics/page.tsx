'use client';

import { useState } from 'react';
import { Plus, ChevronRight } from 'lucide-react';

export default function AdminAcademicsPage() {
  const [selectedFaculty, setSelectedFaculty] = useState('Faculty of Science');

  const faculties = [
    { name: 'Faculty of Science', depts: 6, programmes: 14, courses: 48 },
    { name: 'Faculty of Engineering', depts: 5, programmes: 10, courses: 42 },
    { name: 'Faculty of Arts', depts: 7, programmes: 12, courses: 38 },
    { name: 'Faculty of Law', depts: 2, programmes: 3, courses: 18 },
  ];

  const courses = [
    { code: 'CSC 101', name: 'Introduction to Computing', level: 100, units: 3, semester: 1, enrolled: 310 },
    { code: 'CSC 201', name: 'Data Structures and Algorithms I', level: 200, units: 3, semester: 1, enrolled: 220 },
    { code: 'CSC 301', name: 'Data Structures and Algorithms II', level: 300, units: 3, semester: 1, enrolled: 184 },
    { code: 'CSC 302', name: 'Operating Systems', level: 300, units: 3, semester: 2, enrolled: 162 },
    { code: 'CSC 401', name: 'Software Engineering Principles', level: 400, units: 3, semester: 1, enrolled: 120 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Academic Structure & Course Communities
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hierarchical mapping of Faculties, Departments, Degree Programmes, and Course communities.
          </p>
        </div>
        <button className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs">
          <Plus className="w-3.5 h-3.5" />
          Add Course Community
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Faculties Column */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 mb-3">
            Faculties
          </h3>
          {faculties.map((f) => {
            const isSelected = selectedFaculty === f.name;
            return (
              <button
                key={f.name}
                onClick={() => setSelectedFaculty(f.name)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-50 border border-blue-200 text-blue-900 font-semibold'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-bold">{f.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{f.courses} Courses</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            );
          })}
        </div>

        {/* Course Communities Column */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">{selectedFaculty}</h2>
              <p className="text-xs text-slate-400">Connected Course Communities & Student Hubs</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700">
              Department of Computer Science
            </span>
          </div>

          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Course Title</th>
                  <th className="px-5 py-3">Level</th>
                  <th className="px-5 py-3">Units</th>
                  <th className="px-5 py-3">Enrolled Peers</th>
                  <th className="px-5 py-3 text-right">Hub</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {courses.map((c) => (
                  <tr key={c.code} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-blue-600">{c.code}</td>
                    <td className="px-5 py-3.5 text-slate-900">{c.name}</td>
                    <td className="px-5 py-3.5">{c.level}L</td>
                    <td className="px-5 py-3.5">{c.units} Units</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{c.enrolled} students</td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="text-xs font-bold text-blue-600 hover:underline">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
