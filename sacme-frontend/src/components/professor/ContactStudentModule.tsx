"use client";
import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/auth";
import { Loader2, Search, Mail } from "lucide-react";

export default function ContactStudentModule({ courseId, onOpenComposer }: { courseId: string, onOpenComposer: (students: any[]) => void }) {
    const [roster, setRoster] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchRoster = async () => {
            setLoading(true);
            setError("");
            try {
                const token = getAuthToken();
                const res = await fetch(`http://localhost:5000/api/communication/contacts/${courseId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setRoster(data.roster || []);
                } else {
                    setError("Failed to load students. Please try again.");
                }
            } catch (err) {
                console.error("Failed to fetch contact roster", err);
                setError("Network error. Please check if the server is running.");
            } finally {
                setLoading(false);
            }
        };
        if (courseId) fetchRoster();
    }, [courseId]);

    // Defensive search — safely handle null/undefined fields
    const filteredRoster = roster.filter(student => {
        const q = searchQuery.toLowerCase();
        const name = (student.name || "").toLowerCase();
        const rollNo = (student.rollNo || "").toLowerCase();
        const email = (student.email || "").toLowerCase();
        return name.includes(q) || rollNo.includes(q) || email.includes(q);
    });

    if (loading) return (
        <div className="flex justify-center items-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    if (error) return (
        <div className="p-6 text-center text-red-500">{error}</div>
    );

    return (
        <div className="space-y-4 p-4 md:p-6">
            {/* Search Bar */}
            <div className="flex justify-between items-center gap-4">
                <p className="text-sm text-slate-500">{roster.length} student{roster.length !== 1 ? 's' : ''} enrolled</p>
                <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, roll no, or email..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 text-sm outline-none transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase tracking-wide text-xs">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Email Address</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredRoster.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                                        {searchQuery
                                            ? `No students found for "${searchQuery}"`
                                            : "No students enrolled in this course."}
                                    </td>
                                </tr>
                            ) : (
                                filteredRoster.map(student => (
                                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-900 dark:text-white">{student.name || "—"}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{student.rollNo || "—"}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.email ? (
                                                <span className="text-slate-700 dark:text-slate-300">{student.email}</span>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">No email on record</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    if (!student.email) {
                                                        alert(`No email address on record for ${student.name}.`);
                                                        return;
                                                    }
                                                    onOpenComposer([student]);
                                                }}
                                                disabled={!student.email}
                                                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all
                                                    ${student.email
                                                        ? "bg-blue-50 hover:bg-blue-600 hover:text-white dark:bg-blue-900/30 dark:hover:bg-blue-600 text-blue-600 dark:text-blue-400"
                                                        : "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                                                    }`}
                                                title={student.email ? `Send email to ${student.name}` : "No email address available"}
                                            >
                                                <Mail className="w-4 h-4" />
                                                {student.email ? "Contact" : "No Email"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
