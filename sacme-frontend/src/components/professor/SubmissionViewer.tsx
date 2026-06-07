"use client";
import { getAuthToken } from '@/lib/auth';

import { useState, useEffect } from "react";
import { Loader2, Download, Search, FileText, XCircle, CheckCircle, Clock, AlertTriangle, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

export default function SubmissionViewer({ assignment, courseId }: { assignment: any, courseId: string }) {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL"); // ALL | SUBMITTED | LATE | PENDING
    const [search, setSearch] = useState("");
    const [uploadingCsv, setUploadingCsv] = useState(false);
    const [downloadingZip, setDownloadingZip] = useState(false);
    const [dynamicAssignment, setDynamicAssignment] = useState(assignment);

    useEffect(() => {
        const fetchRoster = async () => {
            try {
                const token = getAuthToken();
                const res = await fetch(`http://localhost:5000/api/courses/${courseId}/students?take=200`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStudents(data.students || []);
                }
                // Fetch assignments natively to hot-swap real-time submissions
                const assignRes = await fetch(`http://localhost:5000/api/assignments/course/${courseId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (assignRes.ok) {
                    const assignData = await assignRes.json();
                    const latestAssignment = assignData.assignments?.find((a: any) => a.id === assignment.id);
                    if (latestAssignment) setDynamicAssignment(latestAssignment);
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchRoster();
        const pollInterval = setInterval(() => {
            if (document.visibilityState === "visible") fetchRoster();
        }, 10000);
        return () => clearInterval(pollInterval);
    }, [courseId, assignment.id]);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

    const rosterMap = students.map(student => {
        const submission = dynamicAssignment.submissions?.find((s: any) => 
            s.studentId === student.id || s.members?.some((m: any) => m.studentId === student.id)
        );
        let status = 'PENDING';
        if (submission) {
            status = submission.status.toUpperCase(); // SUBMITTED | LATE
        } else if (new Date() > new Date(dynamicAssignment.dueDate)) {
            status = 'NOT SUBMITTED'; 
        }

        return {
            id: student.id,
            name: student.name,
            rollNo: student.rollNo,
            status,
            fileUrl: submission?.fileUrl || null,
            submittedAt: submission?.submittedAt || null
        };
    });

    const filteredRoster = rosterMap.filter(s => {
        const matchesFilter = filter === "ALL" || s.status === filter;
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const displayRoster = filteredRoster.filter(s => {
        // Prevent duplicate cards by hiding "member only" students (they will be listed under the main submitter's card)
        const isMemberOnly = dynamicAssignment.submissions?.some((sub: any) => 
            sub.studentId !== s.id && sub.members?.some((m: any) => m.studentId === s.id)
        );
        return !isMemberOnly;
    }).map(s => {
        const submission = dynamicAssignment.submissions?.find((sub: any) => sub.studentId === s.id);
        return {
            ...s,
            members: submission?.members || []
        };
    });

    const submittedCount = rosterMap.filter(s => s.status === 'SUBMITTED').length;
    const pendingCount = rosterMap.filter(s => s.status === 'PENDING').length;
    const lateCount = rosterMap.filter(s => s.status === 'LATE').length;
    const notSubmittedCount = rosterMap.filter(s => s.status === 'NOT SUBMITTED').length;
    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploadingCsv(true);
        try {
            const formData = new FormData();
            formData.append("csvFile", e.target.files[0]);
            formData.append("resultsVisible", "true");
            
            const token = getAuthToken();
            const res = await fetch(`http://localhost:5000/api/assignments/${assignment.id}/upload-csv`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) alert("CSV grades uploaded and published successfully!");
            else alert("Failed to upload grades");
        } catch (error) {
            console.error(error);
        } finally {
            setUploadingCsv(false);
        }
    };

    const handleDownloadZip = async () => {
        setDownloadingZip(true);
        try {
            const token = getAuthToken();
            const res = await fetch(`http://localhost:5000/api/assignments/${assignment.id}/download-all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(`Download failed: ${data.error || 'Server error'}`);
                setDownloadingZip(false);
                return;
            }
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `assignment_${assignment.id}_submissions.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (err) {
            console.error(err);
            alert("An error occurred during download.");
        } finally {
            setDownloadingZip(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-50 dark:bg-slate-800 p-4 rounded-xl flex-wrap gap-4">
                <div>
                    <h3 className="font-bold text-lg">{assignment.title} - Analytics</h3>
                    <p className="text-xs text-slate-500">View performance or mass-upload grades via CSV</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleDownloadZip}
                        disabled={downloadingZip}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center min-w-[220px] disabled:opacity-50"
                    >
                        {downloadingZip ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : null}
                        {downloadingZip ? "Preparing ZIP..." : "Download All Submissions (ZIP)"}
                    </button>
                    <label className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white cursor-pointer px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                        {uploadingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" /> Upload Grades CSV</>}
                        <input type="file" className="hidden" accept=".csv" onChange={handleCsvUpload} disabled={uploadingCsv} />
                    </label>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="glass-panel border-l-4 border-l-emerald-500">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Submitted</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{submittedCount}</p>
                        </div>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600"><CheckCircle className="w-5 h-5" /></div>
                    </CardContent>
                </Card>
                <Card className="glass-panel border-l-4 border-l-amber-500">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
                        </div>
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600"><Clock className="w-5 h-5" /></div>
                    </CardContent>
                </Card>
                <Card className="glass-panel border-l-4 border-l-rose-500">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Late</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{lateCount}</p>
                        </div>
                        <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg text-rose-600"><AlertTriangle className="w-5 h-5" /></div>
                    </CardContent>
                </Card>
                <Card className="glass-panel border-l-4 border-l-slate-500">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Missing</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{notSubmittedCount}</p>
                        </div>
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600"><XCircle className="w-5 h-5" /></div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search student..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg w-full md:w-auto overflow-x-auto hide-scrollbar">
                    {['ALL', 'SUBMITTED', 'PENDING', 'LATE', 'NOT SUBMITTED'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${filter === f ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {f === 'NOT SUBMITTED' ? 'MISSING' : f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayRoster.map(student => (
                    <div key={student.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{student.name}</h4>
                                <span className="text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full mt-1 inline-block">{student.rollNo}</span>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                                <span className={`text-[10px] font-bold px-2 py-1 uppercase rounded-md border ${
                                    student.status === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    student.status === 'LATE' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                    student.status === 'NOT SUBMITTED' ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700' :
                                    'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                    {student.status === 'NOT SUBMITTED' ? 'MISSING' : student.status}
                                </span>
                                {student.members.length > 0 && (
                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 text-[10px] font-bold rounded-md">
                                        Group Submission
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {student.members.length > 0 && (
                            <div className="mb-3">
                                <p className="text-xs font-semibold text-slate-600 mb-1">Team Members:</p>
                                <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                                    {student.members.map((m: any) => (
                                        <li key={m.id}>{m.student.name} ({m.student.rollNo})</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {student.fileUrl ? (
                            <a 
                                href={student.fileUrl.startsWith('http') ? student.fileUrl : `http://localhost:5000${student.fileUrl}`} 
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 text-sm font-semibold rounded-lg transition-colors"
                            >
                                <Download className="w-4 h-4" /> Download Scope
                            </a>
                        ) : (
                            <div className="mt-2 text-center text-xs text-slate-400 py-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                                No Document Payload
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {displayRoster.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                    No students match the current filters.
                </div>
            )}
        </div>
    );
}
