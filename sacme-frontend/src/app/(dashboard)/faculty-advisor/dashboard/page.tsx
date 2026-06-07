"use client";
import { getAuthToken } from '@/lib/auth';

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Users, UploadCloud, BookOpen, UserPlus, FileText, ArrowLeft, Loader2, AlertCircle, Trash2, Edit, Search, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function FacultyAdvisorDashboard() {
    // Top-Level State
    const [assignedSemesters, setAssignedSemesters] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
    const [loadingInit, setLoadingInit] = useState(true);

    // Dashboard State
    const [activeTab, setActiveTab] = useState("students");
    const [semesterData, setSemesterData] = useState<any>(null);
    const [professorsData, setProfessorsData] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedProfessor, setSelectedProfessor] = useState<any>(null);

    // Professor Roster filters
    const [profSearch, setProfSearch] = useState("");
    const [profPage, setProfPage] = useState(1);
    const PROFS_PER_PAGE = 8;

    // Initial Fetch (Assigned Semesters)
    useEffect(() => {
        fetchAssignedSemesters();
    }, []);

    const fetchAssignedSemesters = async () => {
        const token = getAuthToken();
        try {
            const res = await fetch(`http://localhost:5000/api/faculty-advisor/semesters`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAssignedSemesters(data.assignedSemesters);
                
                // Persistence Handling
                const savedId = localStorage.getItem("facultySemesterId");
                if (savedId && data.assignedSemesters.some((s: any) => s.semesterId === savedId)) {
                    setSelectedSemesterId(savedId);
                } else if (!savedId && data.assignedSemesters.length > 0) {
                    const firstYear = data.assignedSemesters[0].semester.academicYear.name;
                    setSelectedYear(firstYear);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingInit(false);
        }
    };

    // Load Active Semester Details when selected
    useEffect(() => {
        if (!selectedSemesterId) return;
        localStorage.setItem("facultySemesterId", selectedSemesterId);
        fetchActiveSemesterData();
    }, [selectedSemesterId]);

    const fetchActiveSemesterData = async () => {
        setRefreshing(true);
        const token = getAuthToken();
        try {
            const [semRes, profRes] = await Promise.all([
                fetch(`http://localhost:5000/api/semester/${selectedSemesterId}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`http://localhost:5000/api/faculty-advisor/professors`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            if (semRes.ok) {
                const sData = await semRes.json();
                setSemesterData(sData.semester);
            }
            if (profRes.ok) {
                const pData = await profRes.json();
                setProfessorsData(pData.professors);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    };

    // Derived Years for Filter
    const academicYears = useMemo(() => {
        const years = new Set<string>();
        assignedSemesters.forEach(sm => years.add(sm.semester.academicYear.name));
        return Array.from(years);
    }, [assignedSemesters]);

    const filteredSemestersToSelect = assignedSemesters.filter(sm => sm.semester.academicYear.name === selectedYear);

    // ==================
    // TAB: STUDENTS LOGIC
    // ==================
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [previewValid, setPreviewValid] = useState<any[]>([]);
    const [previewErrors, setPreviewErrors] = useState<string[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [studentLoading, setStudentLoading] = useState(false);
    const [studentForm, setStudentForm] = useState({ name: "", rollNo: "", email: "", phone: "" });
    const [manualStudentLoading, setManualStudentLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleManualStudentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setManualStudentLoading(true);
        const token = getAuthToken();
        const payload = [{
            ...studentForm,
            rollNo: studentForm.rollNo.toUpperCase().trim()
        }];
        try {
            const res = await fetch(`http://localhost:5000/api/faculty-advisor/import-students/${selectedSemesterId}`, {
                method: 'POST',
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ students: payload })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.failedRecords && data.failedRecords.length > 0) {
                   alert("Failed to add student: " + data.failedRecords[0].reason);
                } else {
                   setStudentForm({ name: "", rollNo: "", email: "", phone: "" });
                   alert("Student added successfully!");
                   fetchActiveSemesterData();
                }
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Upload failed.");
        }
        setManualStudentLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setCsvFile(e.target.files[0]);
            setPreviewValid([]);
            setPreviewErrors([]);
        }
    };

    const processPreview = () => {
        if (!csvFile) return;
        setStudentLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim() !== '');
            if (lines.length < 2) {
                setPreviewErrors(["File seems empty or missing headers."]);
                setStudentLoading(false);
                return;
            }
            
            const headers = lines[0].toLowerCase().split(',');
            const nameIdx = headers.findIndex(h => h.includes('name'));
            const rollIdx = headers.findIndex(h => h.includes('roll'));
            const emailIdx = headers.findIndex(h => h.includes('email'));
            const phoneIdx = headers.findIndex(h => h.includes('phone'));
            
            if (nameIdx === -1 || rollIdx === -1 || emailIdx === -1) {
                setPreviewErrors(["Invalid CSV headers. Need 'Name', 'RollNo', and 'Email'."]);
                setStudentLoading(false);
                return;
            }

            const payload = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.replace(/\r/g, ''));
                if (cols.length >= 3 && cols[nameIdx] && cols[rollIdx] && cols[emailIdx]) {
                    payload.push({
                        name: cols[nameIdx].trim(),
                        rollNo: cols[rollIdx].trim().toUpperCase(),
                        email: cols[emailIdx].trim(),
                        phone: phoneIdx !== -1 && cols[phoneIdx] ? cols[phoneIdx].trim() : ""
                    });
                }
            }

            const token = getAuthToken();
            try {
                const res = await fetch(`http://localhost:5000/api/faculty-advisor/preview-students`, {
                    method: 'POST',
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ students: payload })
                });
                const data = await res.json();
                if (res.ok) {
                    setPreviewValid(data.valid || []);
                    setPreviewErrors(data.errors || []);
                }
            } catch (err) {
                setPreviewErrors(["Network error during preview."]);
            }
            setStudentLoading(false);
        };
        reader.readAsText(csvFile);
    };

    const confirmStudentImport = async () => {
        if (previewValid.length === 0) return;
        setStudentLoading(true);
        const token = getAuthToken();
        try {
            const res = await fetch(`http://localhost:5000/api/faculty-advisor/import-students/${selectedSemesterId}`, {
                method: 'POST',
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ students: previewValid })
            });
            const data = await res.json();
            if (res.ok) {
                let failedLog = data.failedRecords && data.failedRecords.length > 0 
                  ? data.failedRecords.map((f: any) => `\nRollNo: ${f.rollNo}\nReason: ${f.reason}`).join('\n') 
                  : "0";
                
                alert(`Import Summary Report:\nTotal Rows Read: ${data.totalRows}\nSuccessfully Inserted: ${data.insertedCount}\nFailed Records: ${data.failedRecords ? data.failedRecords.length : 0}${failedLog !== "0" ? `\n\nFailed Log:${failedLog}` : ''}\n\n${data.message}`);
                setCsvFile(null);
                setPreviewValid([]);
                setPreviewErrors([]);
                if (fileInputRef.current) fileInputRef.current.value = "";
                fetchActiveSemesterData();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Upload failed.");
        }
        setStudentLoading(false);
    };

    const deleteStudent = async (id: string) => {
        if(!confirm("Remove this student?")) return;
        setStudentLoading(true);
        const token = getAuthToken();
        await fetch(`http://localhost:5000/api/faculty-advisor/students/${id}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
        });
        fetchActiveSemesterData();
        setStudentLoading(false);
    };

    // ==================
    // TAB: COURSES LOGIC
    // ==================
    const [courseForm, setCourseForm] = useState({ name: "", code: "", credits: "3", courseType: "THEORY" });
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [courseLoading, setCourseLoading] = useState(false);

    const handleCourseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCourseLoading(true);
        const token = getAuthToken();
        const url = editingCourseId 
            ? `http://localhost:5000/api/faculty-advisor/courses/${editingCourseId}`
            : `http://localhost:5000/api/faculty-advisor/courses/${selectedSemesterId}`;
        const method = editingCourseId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(courseForm)
            });
            const data = await res.json();
            if (res.ok) {
                setCourseForm({ name: "", code: "", credits: "3", courseType: "THEORY" });
                setEditingCourseId(null);
                fetchActiveSemesterData();
            } else {
                alert(data.error);
            }
        } catch (err) { }
        setCourseLoading(false);
    };

    const deleteCourse = async (id: string) => {
        if(!confirm("Delete this course and its assignments?")) return;
        setCourseLoading(true);
        const token = getAuthToken();
        await fetch(`http://localhost:5000/api/faculty-advisor/courses/${id}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
        });
        fetchActiveSemesterData();
        setCourseLoading(false);
    };

    // ==================
    // TAB: PROFESSORS LOGIC
    // ==================
    const [profForm, setProfForm] = useState({ name: "", email: "", phone: "", instructorId: "", department: "" });
    const [profLoading, setProfLoading] = useState(false);
    
    // Bulk Professor upload states
    const [profCsvFile, setProfCsvFile] = useState<File | null>(null);
    const [previewProfValid, setPreviewProfValid] = useState<any[]>([]);
    const [previewProfErrors, setPreviewProfErrors] = useState<string[]>([]);
    const profFileInputRef = useRef<HTMLInputElement>(null);

    const handleProfSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfLoading(true);
        const token = getAuthToken();
        try {
            const res = await fetch(`http://localhost:5000/api/faculty-advisor/professors`, {
                method: 'POST', headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(profForm)
            });
            const data = await res.json();
            if (res.ok) {
                setProfForm({ name: "", email: "", phone: "", instructorId: "", department: "" });
                alert("Professor Created. They must activate their account using the credentials provided via email.");
                fetchActiveSemesterData();
            } else {
                alert(data.error);
            }
        } catch (err) { }
        setProfLoading(false);
    };

    const handleProfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setProfCsvFile(e.target.files[0]);
            setPreviewProfValid([]);
            setPreviewProfErrors([]);
        }
    };

    const processProfPreview = () => {
        if (!profCsvFile) return;
        setProfLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim() !== '');
            if (lines.length < 2) {
                setPreviewProfErrors(["File empty or missing headers."]);
                setProfLoading(false);
                return;
            }
            
            const headers = lines[0].toLowerCase().split(',');
            const nameIdx = headers.findIndex(h => h.includes('name'));
            const idIdx = headers.findIndex(h => h.includes('id') || h.includes('instructor'));
            const deptIdx = headers.findIndex(h => h.includes('dept') || h.includes('department'));
            const emailIdx = headers.findIndex(h => h.includes('email'));
            const phoneIdx = headers.findIndex(h => h.includes('phone'));
            
            if (nameIdx === -1 || idIdx === -1 || deptIdx === -1 || emailIdx === -1) {
                setPreviewProfErrors(["Missing required headers: Name, ID, Department, Email."]);
                setProfLoading(false);
                return;
            }

            const payload = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',');
                if (cols.length >= 4) {
                    payload.push({
                        name: cols[nameIdx]?.trim(),
                        instructorId: cols[idIdx]?.trim(),
                        department: cols[deptIdx]?.trim(),
                        email: cols[emailIdx]?.trim(),
                        phone: phoneIdx !== -1 ? cols[phoneIdx]?.trim() : ''
                    });
                }
            }

            const token = getAuthToken();
            try {
                const res = await fetch(`http://localhost:5000/api/faculty-advisor/preview-professors`, {
                    method: 'POST', headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ professors: payload })
                });
                const data = await res.json();
                if (res.ok) {
                    setPreviewProfValid(data.valid || []);
                    setPreviewProfErrors(data.errors || []);
                }
            } catch (err) { setPreviewProfErrors(["Network error during preview."]); }
            setProfLoading(false);
        };
        reader.readAsText(profCsvFile);
    };

    const confirmProfImport = async () => {
        if (previewProfValid.length === 0) return;
        setProfLoading(true);
        const token = getAuthToken();
        try {
            const res = await fetch(`http://localhost:5000/api/faculty-advisor/import-professors`, {
                method: 'POST', headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ professors: previewProfValid })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                setProfCsvFile(null);
                setPreviewProfValid([]);
                setPreviewProfErrors([]);
                if (profFileInputRef.current) profFileInputRef.current.value = "";
                fetchActiveSemesterData();
            } else { alert(data.error); }
        } catch (err) {}
        setProfLoading(false);
    };


    // ==================
    // TAB: ASSIGNMENTS LOGIC
    // ==================
    const [assignmentForm, setAssignmentForm] = useState({ courseId: "", professorId: "" });
    const [assignLoading, setAssignLoading] = useState(false);

    const handleAssignmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!assignmentForm.courseId || !assignmentForm.professorId) return alert("Select both");
        
        setAssignLoading(true);
        const token = getAuthToken();
        try {
            const res = await fetch(`http://localhost:5000/api/faculty-advisor/course-assignment`, {
                method: 'POST', headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(assignmentForm)
            });
            const data = await res.json();
            if(!res.ok) alert(data.error);
            else {
                setAssignmentForm({courseId: "", professorId: ""});
                fetchActiveSemesterData();
            }
        } catch(err){}
        setAssignLoading(false);
    };

    // Derived properties for professor roster
    const filteredProfs = useMemo(() => {
        return professorsData.filter(p => 
            p.name.toLowerCase().includes(profSearch.toLowerCase()) || 
            (p.department?.toLowerCase() || "").includes(profSearch.toLowerCase())
        );
    }, [professorsData, profSearch]);
    const totalProfPages = Math.ceil(filteredProfs.length / PROFS_PER_PAGE) || 1;
    const displayedProfs = filteredProfs.slice((profPage - 1) * PROFS_PER_PAGE, profPage * PROFS_PER_PAGE);

    // Rendering Helpers
    if (loadingInit) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto p-4 animate-pulse pt-10">
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-64 mx-auto mb-10"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1,2,3].map(i => <div key={i} className="h-[250px] bg-slate-200 dark:bg-slate-800 rounded-[2rem]"></div>)}
                </div>
            </div>
        );
    }

    if (assignedSemesters.length === 0) {
        return <div className="p-10 text-center font-bold text-slate-500">You are not currently assigned as Faculty Advisor to any semesters.</div>;
    }

    // SCENE: SEMESTER SELECTION
    if (!selectedSemesterId) {
        return (
            <div className="space-y-8 max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-black mb-2">Select Your Workspace</h2>
                    <p className="text-slate-500">Choose an assigned semester to manage courses, students, and professors.</p>
                </div>
                
                <div className="flex justify-center mb-8">
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                        {academicYears.map(yr => (
                            <button key={yr} onClick={() => setSelectedYear(yr)} className={`px-6 py-2 rounded-lg font-bold text-sm ${selectedYear === yr ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                                {yr}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredSemestersToSelect.map((sm, idx) => {
                        const displayStatus = sm.semester.status === 'UPCOMING' ? 'CURRENT' : sm.semester.status;
                        return (
                        <motion.div key={sm.semesterId} initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} transition={{delay: idx*0.1}}>
                            <Card className="hover:border-blue-500/50 hover:shadow-lg cursor-pointer transition-all border-2 border-slate-100 dark:border-[#222]" onClick={() => setSelectedSemesterId(sm.semesterId)}>
                                <CardContent className="p-6 text-center">
                                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <BookOpen className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-1">Semester {sm.semester.semesterNumber}</h3>
                                    <p className="text-slate-500 font-medium mb-4">{sm.semester.branch.name} • {sm.semester.season}</p>
                                    <span className="inline-block bg-slate-100 dark:bg-[#333] text-xs font-bold px-3 py-1 rounded-full">{displayStatus}</span>
                                </CardContent>
                            </Card>
                        </motion.div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // SCENE: DASHBOARD VIEW
    if (!semesterData) {
        return (
            <div className="space-y-6 animate-pulse pt-6">
                <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-[2rem] w-full mb-6"></div>
                <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full max-w-lg mb-6"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[2rem]"></div>
                    <div className="h-[500px] bg-slate-200 dark:bg-slate-800 rounded-[2rem] lg:col-span-2"></div>
                </div>
            </div>
        );
    }

    const isLocked = semesterData.status === 'LOCKED' || semesterData.status === 'COMPLETED';
    const displaySemesterStatus = semesterData.status === 'UPCOMING' ? 'CURRENT' : semesterData.status;

    const totalStudents = semesterData.students.length;
    const totalCourses = semesterData.courses.length;
    const assignedCoursesCount = semesterData.courses.filter((c:any) => c.courseAssignments && c.courseAssignments.length > 0).length;
    const unassignedCoursesCount = totalCourses - assignedCoursesCount;

    // Filters for Student Table
    const filteredStudents = semesterData.students.filter((s:any) => 
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
        s.rollNo.toLowerCase().includes(studentSearch.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Nav Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => { setSelectedSemesterId(null); localStorage.removeItem("facultySemesterId"); }} className="text-slate-500 font-bold hover:bg-slate-100">
                    <ArrowLeft className="w-4 h-4 mr-2"/> Switch Semester
                </Button>
                {refreshing && <span className="text-sm font-bold text-slate-400 animate-pulse flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Syncing...</span>}
            </div>

            {/* Overview Widget */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 shadow-2xl shadow-blue-500/20">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black mb-1">Semester {semesterData.semesterNumber}</h2>
                        <p className="text-blue-200 font-medium">{semesterData.branch.name} • {semesterData.academicYear.name}</p>
                        <div className="mt-3 inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-md">
                            Status: <span className={isLocked ? "text-red-300" : "text-emerald-300"}>{displaySemesterStatus}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl text-center">
                            <div className="text-3xl font-black">{totalStudents}</div>
                            <div className="text-[10px] text-blue-200 uppercase tracking-widest font-bold mt-1">Students</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl text-center">
                            <div className="text-3xl font-black">{totalCourses}</div>
                            <div className="text-[10px] text-blue-200 uppercase tracking-widest font-bold mt-1">Courses</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl text-center">
                            <div className="text-3xl font-black">{professorsData.length}</div>
                            <div className="text-[10px] text-blue-200 uppercase tracking-widest font-bold mt-1">Professors</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl text-center border border-white/20">
                            <div className="text-3xl font-black text-amber-300">{unassignedCoursesCount}</div>
                            <div className="text-[10px] text-amber-200 uppercase tracking-widest font-bold mt-1">Unassigned Courses</div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-[#111] rounded-2xl overflow-x-auto overflow-y-hidden border border-slate-200 dark:border-[#222]">
                {[
                    { id: 'students', label: 'Students', icon: Users },
                    { id: 'courses', label: 'Courses', icon: BookOpen },
                    { id: 'professors', label: 'Professors', icon: UserPlus },
                    { id: 'assignments', label: 'Assignments', icon: FileText }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 whitespace-nowrap px-6 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-[#222]/50'}`}>
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            {/* ERROR ALERT IF LOCKED */}
            {isLocked && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-500 font-medium flex items-center gap-3 border border-amber-200 dark:border-amber-900">
                    <AlertCircle className="w-5 h-5"/>
                    This semester is marked as {displaySemesterStatus}. Add/Edit functionality is disabled to prevent data corruption.
                </div>
            )}

            {/* TAB CONTENT: STUDENTS */}
            {activeTab === 'students' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="border-slate-200 dark:border-[#333] shadow-lg rounded-[2rem] mb-6 bg-white dark:bg-[#111]">
                            <CardHeader><CardTitle>Manual Entry</CardTitle></CardHeader>
                            <CardContent>
                                <form onSubmit={handleManualStudentSubmit} className="space-y-4">
                                    <div className="space-y-1"><Label>Full Name</Label><Input disabled={isLocked} required value={studentForm.name} onChange={e=>setStudentForm({...studentForm, name: e.target.value})} className="rounded-xl" placeholder="John Doe"/></div>
                                    <div className="space-y-1"><Label>Roll No</Label><Input disabled={isLocked} required value={studentForm.rollNo} onChange={e=>setStudentForm({...studentForm, rollNo: e.target.value})} className="rounded-xl uppercase font-mono" placeholder="2301A105"/></div>
                                    <div className="space-y-1"><Label>Email</Label><Input disabled={isLocked} required type="email" value={studentForm.email} onChange={e=>setStudentForm({...studentForm, email: e.target.value})} className="rounded-xl" placeholder="john@college.edu"/></div>
                                    <div className="space-y-1"><Label>Phone (Opt)</Label><Input disabled={isLocked} value={studentForm.phone} onChange={e=>setStudentForm({...studentForm, phone: e.target.value})} className="rounded-xl"/></div>
                                    <Button disabled={manualStudentLoading || isLocked} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold mt-2">
                                        {manualStudentLoading ? <Loader2 className="animate-spin w-4 h-4"/> : "Add Student"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200 dark:border-[#333] shadow-lg rounded-[2rem] bg-white dark:bg-[#111]">
                            <CardHeader><CardTitle>Import Students</CardTitle></CardHeader>
                            <CardContent>
                                <div className="border-2 border-dashed border-slate-200 dark:border-[#333] rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors">
                                    <input disabled={isLocked} type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="csv-upload" />
                                    <Label htmlFor="csv-upload" className={isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>
                                        <UploadCloud className="w-10 h-10 mx-auto text-blue-500 mb-2"/>
                                        <h4 className="font-bold">{csvFile ? csvFile.name : "Select CSV"}</h4>
                                        <p className="text-xs text-slate-500 mt-1">Columns: Name, RollNo, (Opt: Email, Phone)</p>
                                    </Label>
                                    {csvFile && (
                                        <Button disabled={studentLoading || isLocked} onClick={processPreview} className="mt-4 w-full bg-slate-900 hover:bg-black text-white rounded-xl">
                                            {studentLoading ? <Loader2 className="animate-spin w-4 h-4"/> : "Analyze File"}
                                        </Button>
                                    )}
                                </div>
                                {previewErrors.length > 0 && (
                                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                                        <strong>Found {previewErrors.length} Errors:</strong>
                                        <ul className="list-disc pl-5 mt-1 max-h-32 overflow-y-auto">
                                            {previewErrors.map((e,i) => <li key={i}>{e}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {previewValid.length > 0 && (
                                    <div className="mt-4 p-4 border border-emerald-200 bg-emerald-50 rounded-xl">
                                        <p className="text-emerald-700 font-bold text-sm flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4"/> {previewValid.length} Valid Records Ready</p>
                                        <Button disabled={studentLoading || isLocked} onClick={confirmStudentImport} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                                            Confirm Import
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <Card className="border-slate-200 dark:border-[#333] shadow-lg rounded-[2rem] bg-white dark:bg-[#111] h-full">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222]">
                                <CardTitle>Student Directory</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                    <Input value={studentSearch} onChange={e=>setStudentSearch(e.target.value)} placeholder="Search by name or roll..." className="pl-9 rounded-xl bg-slate-50 border-slate-200 h-9 text-sm"/>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[600px] overflow-y-auto w-full">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-[#111] sticky top-0 border-b border-slate-200 dark:border-[#222]">
                                            <tr><th className="px-6 py-3">Roll No</th><th className="px-6 py-3">Name</th><th className="px-6 py-3">Email</th><th className="px-6 py-3 text-right">Action</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.length===0 && <tr><td colSpan={4} className="text-center py-8 text-slate-500">No students found.</td></tr>}
                                            {filteredStudents.map((s:any) => (
                                                <tr key={s.id} className="border-b border-slate-100 dark:border-[#222] hover:bg-slate-50 dark:hover:bg-[#1a1a1a]">
                                                    <td className="px-6 py-3 font-mono font-bold">{s.rollNo}</td>
                                                    <td className="px-6 py-3 font-medium">{s.name}</td>
                                                    <td className="px-6 py-3 text-slate-500">{s.email}</td>
                                                    <td className="px-6 py-3 text-right">
                                                        <Button disabled={isLocked || studentLoading} variant="ghost" size="sm" onClick={() => deleteStudent(s.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                            <Trash2 className="w-4 h-4"/>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: COURSES */}
            {activeTab === 'courses' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <Card className="border-slate-200 dark:border-[#333] shadow-lg rounded-[2rem]">
                            <CardHeader><CardTitle>{editingCourseId ? "Edit Course" : "Add Course"}</CardTitle></CardHeader>
                            <CardContent>
                                <form onSubmit={handleCourseSubmit} className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Course Name</Label>
                                        <Input disabled={isLocked} required value={courseForm.name} onChange={e=>setCourseForm({...courseForm, name: e.target.value})} className="rounded-xl" placeholder="Operating Systems"/>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Course Code</Label>
                                        <Input disabled={isLocked} required value={courseForm.code} onChange={e=>setCourseForm({...courseForm, code: e.target.value})} className="rounded-xl font-mono uppercase" placeholder="CS301"/>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Credits</Label>
                                        <Input disabled={isLocked} required type="number" min="1" max="10" value={courseForm.credits} onChange={e=>setCourseForm({...courseForm, credits: e.target.value})} className="rounded-xl"/>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Type</Label>
                                        <select disabled={isLocked} required value={courseForm.courseType} onChange={e=>setCourseForm({...courseForm, courseType: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-transparent">
                                            <option value="THEORY">Theory</option><option value="LAB">Lab</option><option value="LAB_THEORY">Lab & Theory</option><option value="ELECTIVE">Elective</option>
                                        </select>
                                    </div>
                                    <div className="pt-2 flex gap-2">
                                        {editingCourseId && <Button disabled={isLocked || courseLoading} type="button" variant="outline" className="w-1/3 rounded-xl" onClick={()=> {setEditingCourseId(null); setCourseForm({name:"", code:"", credits:"3", courseType:"THEORY"})}}>Cancel</Button>}
                                        <Button disabled={isLocked || courseLoading} type="submit" className={`flex-1 rounded-xl font-bold text-white ${editingCourseId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                            {courseLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : (editingCourseId ? "Save Changes" : "Create Course")}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {semesterData.courses.length === 0 && <div className="col-span-2 p-10 text-center text-slate-500 font-bold border-2 border-dashed rounded-[2rem]">No courses available.</div>}
                            {semesterData.courses.map((c:any) => (
                                <div key={c.id} className="p-5 rounded-2xl bg-white dark:bg-[#111] border border-slate-200 dark:border-[#333] shadow-sm hover:border-blue-500/50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-lg">{c.name}</h4>
                                            <div className="flex gap-2 items-center mt-1">
                                                <span className="font-mono text-xs bg-slate-100 dark:bg-[#222] px-2 py-0.5 rounded-md">{c.code}</span>
                                                <span className="text-xs text-slate-500">{c.credits} Credits • {c.courseType}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-[#222]">
                                        <Button disabled={isLocked} variant="ghost" size="sm" onClick={() => {setEditingCourseId(c.id); setCourseForm({name: c.name, code: c.code, credits: c.credits.toString(), courseType: c.courseType})}} className="text-amber-600 hover:bg-amber-50 rounded-lg"><Edit className="w-4 h-4 mr-1"/> Edit</Button>
                                        <Button disabled={isLocked} variant="ghost" size="sm" onClick={() => deleteCourse(c.id)} className="text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 mr-1"/> Delete</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: PROFESSORS */}
            {activeTab === 'professors' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="border-slate-200 dark:border-[#333] shadow-lg rounded-[2rem]">
                            <CardHeader><CardTitle>Manual Entry</CardTitle></CardHeader>
                            <CardContent>
                                <form onSubmit={handleProfSubmit} className="space-y-4">
                                    <div className="space-y-1"><Label>Full Name</Label><Input required value={profForm.name} onChange={e=>setProfForm({...profForm, name: e.target.value})} className="rounded-xl" placeholder="Dr. S. Kumar"/></div>
                                    <div className="space-y-1"><Label>Employee ID (Login)</Label><Input required value={profForm.instructorId} onChange={e=>setProfForm({...profForm, instructorId: e.target.value})} className="rounded-xl uppercase font-mono" placeholder="EMP001"/></div>
                                    <div className="space-y-1"><Label>Department</Label><Input required value={profForm.department} onChange={e=>setProfForm({...profForm, department: e.target.value})} className="rounded-xl" placeholder="Computer Science"/></div>
                                    <div className="space-y-1"><Label>Email</Label><Input required type="email" value={profForm.email} onChange={e=>setProfForm({...profForm, email: e.target.value})} className="rounded-xl" placeholder="kumar@college.edu"/></div>
                                    <div className="space-y-1"><Label>Phone</Label><Input required value={profForm.phone} onChange={e=>setProfForm({...profForm, phone: e.target.value})} className="rounded-xl"/></div>
                                    <Button disabled={profLoading} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold mt-2">Create Profile</Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Bulk Upload Professors */}
                        <Card className="border-slate-200 dark:border-[#333] shadow-lg rounded-[2rem]">
                            <CardHeader><CardTitle>Bulk Import</CardTitle></CardHeader>
                            <CardContent>
                                <div className="border-2 border-dashed border-slate-200 dark:border-[#333] rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors">
                                    <input type="file" accept=".csv" ref={profFileInputRef} onChange={handleProfFileChange} className="hidden" id="prof-csv-upload" />
                                    <Label htmlFor="prof-csv-upload" className="cursor-pointer">
                                        <UploadCloud className="w-10 h-10 mx-auto text-blue-500 mb-2"/>
                                        <h4 className="font-bold">{profCsvFile ? profCsvFile.name : "Select CSV"}</h4>
                                        <p className="text-xs text-slate-500 mt-1">Headers: Name, ID, Dept, Email, Phone</p>
                                    </Label>
                                    {profCsvFile && (
                                        <Button disabled={profLoading} onClick={processProfPreview} className="mt-4 w-full bg-slate-900 hover:bg-black text-white rounded-xl">
                                            {profLoading ? <Loader2 className="animate-spin w-4 h-4"/> : "Preview CSV"}
                                        </Button>
                                    )}
                                </div>
                                {previewProfErrors.length > 0 && (
                                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm max-h-32 overflow-y-auto">
                                        <ul className="list-disc pl-5 mt-1">{previewProfErrors.map((e,i) => <li key={i}>{e}</li>)}</ul>
                                    </div>
                                )}
                                {previewProfValid.length > 0 && (
                                    <div className="mt-4 p-4 border border-emerald-200 bg-emerald-50 rounded-xl">
                                        <p className="text-emerald-700 font-bold text-sm mb-3">✓ {previewProfValid.length} Profiles Ready</p>
                                        <Button disabled={profLoading} onClick={confirmProfImport} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">Import Professors</Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <Card className="border-slate-200 dark:border-[#333] shadow-lg rounded-[2rem] h-full flex flex-col">
                            <CardHeader className="flex flex-col sm:flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-[#222]">
                                <CardTitle className="mb-2 sm:mb-0">Professor Roster</CardTitle>
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                                    <Input value={profSearch} onChange={e=>{setProfSearch(e.target.value); setProfPage(1)}} placeholder="Search name or dept..." className="pl-9 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-9 text-sm"/>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start">
                                    {displayedProfs.length===0 && <div className="text-slate-500 col-span-2 text-center p-4">No professors found.</div>}
                                    {displayedProfs.map((p:any) => (
                                        <div key={p.id} onClick={() => setSelectedProfessor(p)} className="p-4 rounded-xl border border-slate-200 dark:border-[#333] flex items-center gap-4 bg-slate-50 dark:bg-[#111] hover:bg-slate-100 cursor-pointer transition-colors shadow-sm">
                                            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl border-2 border-white shadow-sm">
                                                {p.avatarUrl ? <img src={`http://localhost:5000${p.avatarUrl}`} alt="Avatar" loading="lazy" className="w-full h-full object-cover" /> : (p.name ? p.name.split(' ').map((n:string)=>n.charAt(0)).slice(0,2).join('').toUpperCase() : '?')}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm truncate max-w-[130px]">{p.name}</h4>
                                                <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{p.instructorId} • {p.department}</p>
                                                <p className="text-[10px] text-slate-400 mt-1 truncate">{p.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {totalProfPages > 1 && (
                                    <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-[#222]">
                                        <Button disabled={profPage === 1} onClick={() => setProfPage(p => p - 1)} variant="outline" size="sm" className="rounded-lg font-bold">Prev</Button>
                                        <span className="text-sm font-bold text-slate-500">Page {profPage} of {totalProfPages}</span>
                                        <Button disabled={profPage === totalProfPages} onClick={() => setProfPage(p => p + 1)} variant="outline" size="sm" className="rounded-lg font-bold">Next</Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ASSIGNMENTS */}
            {activeTab === 'assignments' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    {!isLocked && (
                        <Card className="border-slate-200 shadow-xl rounded-[2rem] bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
                            <CardContent className="p-6">
                                <form onSubmit={handleAssignmentSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full space-y-2">
                                        <Label className="text-indigo-900 font-bold dark:text-indigo-300">Target Course</Label>
                                        <select required value={assignmentForm.courseId} onChange={e=>setAssignmentForm({...assignmentForm, courseId: e.target.value})} className="w-full h-11 px-3 rounded-xl border border-indigo-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500">
                                            <option value="">-- Select Course --</option>
                                            {semesterData.courses.map((c:any) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1 w-full space-y-2">
                                        <Label className="text-indigo-900 font-bold dark:text-indigo-300">Assigning Professor</Label>
                                        <select required value={assignmentForm.professorId} onChange={e=>setAssignmentForm({...assignmentForm, professorId: e.target.value})} className="w-full h-11 px-3 rounded-xl border border-indigo-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500">
                                            <option value="">-- Select Professor --</option>
                                            {professorsData.map((p:any) => <option key={p.id} value={p.id}>{p.name} ({p.department})</option>)}
                                        </select>
                                    </div>
                                    <Button disabled={assignLoading} type="submit" className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl whitespace-nowrap">
                                        {assignLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Link Professor"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-[#333] shadow-lg rounded-[2rem] overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-[#222]">
                            <h3 className="text-xl font-bold flex items-center gap-2"><UserPlus className="text-indigo-500"/> Current Teaching Assignments</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {semesterData.courses.length === 0 && <p className="text-slate-500 text-center py-4">No courses available.</p>}
                            {semesterData.courses.map((c:any) => (
                                <div key={c.id} className="p-4 border border-slate-200 dark:border-[#333] rounded-2xl bg-slate-50 dark:bg-black flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h4 className="font-bold">{c.name} <span className="font-mono text-xs text-slate-500 ml-2">{c.code}</span></h4>
                                        <p className="text-xs text-slate-500 mt-1">{c.credits} Credits • {c.courseType}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(!c.courseAssignments || c.courseAssignments.length === 0) ? (
                                            <span className="text-xs font-bold text-amber-600 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> Unassigned</span>
                                        ) : (
                                            c.courseAssignments.map((ca:any) => (
                                                <div key={ca.id} className="text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                                    <div className="w-5 h-5 bg-indigo-200 rounded-full flex items-center justify-center text-[10px]">{ca.professor.name.charAt(0)}</div>
                                                    {ca.professor.name}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: PROFESSOR DETAILS */}
            {selectedProfessor && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 relative">
                        <button onClick={() => setSelectedProfessor(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">
                            <span className="sr-only">Close</span> ❌
                        </button>
                        
                        <div className="flex flex-col items-center mt-6 mb-6">
                            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg mb-4">
                                {selectedProfessor.avatarUrl ? (
                                    <img src={`http://localhost:5000${selectedProfessor.avatarUrl}`} loading="lazy" alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-700 text-3xl font-bold">{selectedProfessor.name ? selectedProfessor.name.split(' ').map((n:string)=>n.charAt(0)).slice(0,2).join('').toUpperCase() : '?'}</div>
                                )}
                            </div>
                            <h3 className="text-2xl font-black text-center">👤 {selectedProfessor.name}</h3>
                            <p className="text-sm font-bold text-slate-500 mt-1">🏫 {selectedProfessor.department}</p>
                        </div>
                        
                        <div className="space-y-4 text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                            <p><strong>📧 Email:</strong> {selectedProfessor.email}</p>
                            <p><strong>📞 Phone:</strong> {selectedProfessor.phone}</p>
                            <p><strong>🎯 Interests:</strong> {selectedProfessor.interests || 'Not specified'}</p>
                            <div>
                                <strong className="flex items-center gap-1 mb-1">📘 Courses:</strong>
                                <ul className="list-disc pl-5">
                                    {(semesterData.courses || []).filter((c:any) => c.courseAssignments?.some((ca:any) => ca.professorId === selectedProfessor.id)).map((c:any) => (
                                        <li key={c.id}>{c.name} ({c.code})</li>
                                    ))}
                                    {(semesterData.courses || []).filter((c:any) => c.courseAssignments?.some((ca:any)=> ca.professorId === selectedProfessor.id)).length === 0 && (
                                        <span className="text-slate-500 italic">No courses assigned this semester</span>
                                    )}
                                </ul>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <Button className="flex-1 rounded-xl" variant="outline" onClick={() => setSelectedProfessor(null)}>Close</Button>
                            <Button className="flex-1 rounded-xl bg-blue-600 text-white hover:bg-blue-700">Edit</Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
