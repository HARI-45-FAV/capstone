"use client";
import { getAuthToken, logoutUser } from '@/lib/auth';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Users, FileText, CheckSquare, Megaphone, Folder, ArrowLeft, Loader2, ArrowRight, Clock, MessageCircle } from "lucide-react";
import StudentAssignmentModule from "@/components/student/StudentAssignmentModule";
import StudentMaterialModule from "@/components/student/StudentMaterialModule";
import ActivityTimeline from "@/components/shared/ActivityTimeline";
import StudentTimeline from "@/components/student/StudentTimeline";
import StudentQuizViewerModule from "@/components/student/StudentQuizViewerModule";
import StudentAttendanceModule from "@/components/student/StudentAttendanceModule";
import StudentAnnouncementModule from "@/components/student/StudentAnnouncementModule";

const API = "http://localhost:5000";

import { io as socketIO, Socket } from 'socket.io-client';

export default function StudentDashboardPage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [globalStats, setGlobalStats] = useState<any>(null);
    const [globalProfile, setGlobalProfile] = useState<any>(null);
    const [globalTab, setGlobalTab] = useState<"courses" | "timeline">("courses");
    const [socket, setSocket] = useState<Socket | null>(null);
    const [detailedAttendances, setDetailedAttendances] = useState<any[]>([]);

    const fetchCourses = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;
            const [courseRes, statsRes] = await Promise.all([
                fetch(`${API}/api/courses/my-courses`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API}/api/profile/student/dashboard-stats`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (courseRes.ok) { 
                const data = await courseRes.json(); setCourses(data.courses || []); 
            } else if (courseRes.status === 401 || courseRes.status === 403) {
                console.error("Auth Error:", courseRes.status);
                logoutUser();
                window.location.href = '/auth/login';
            }

            if (statsRes.ok) { 
                const sData = await statsRes.json(); 
                setGlobalStats(sData.stats); 
                setGlobalProfile(sData.profile);
            }
        } catch (err) {
            console.error("Failed to load courses", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentAttendance = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;
            const res = await fetch(`${API}/api/attendance/student/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setDetailedAttendances(data.attendances || []);
                // If we're rendering percentages right now, we can optionally recalculate them or just rely on fetchCourses
                await fetchCourses(); 
            }
        } catch (error) {
            console.error("Failed to fetch detailed attendance", error);
        }
    };

    useEffect(() => {
        const storedCourse = sessionStorage.getItem('student_selected_course');
        if (storedCourse) {
            try {
                setSelectedCourse(JSON.parse(storedCourse));
            } catch (e) {}
        }
        
        // initialize socket connection globally for dashboard operations
        const newSocket = socketIO(API);
        setSocket(newSocket);

        fetchCourses();

        return () => {
             newSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            sessionStorage.setItem('student_selected_course', JSON.stringify(selectedCourse));
            
            // Rejoin rooms and prepare for real-time
            if (socket) {
                socket.emit("join_course_room", selectedCourse.id);
                
                socket.on("attendance_updated", () => {
                     fetchStudentAttendance();
                });
            }
            
            // Hydrate the initial attendance list when opening a course
            fetchStudentAttendance();

        } else {
            sessionStorage.removeItem('student_selected_course');
        }

        // Cleanup listener on unmount or tab switch
        return () => {
            if (socket) {
                socket.off("attendance_updated");
            }
        };
    }, [selectedCourse, socket]);

    const courseTabs = [
        { id: "overview", label: "Overview", icon: BookOpen },
        { id: "attendance", label: "Attendance", icon: CheckSquare },
        { id: "assignments", label: "Assignments", icon: FileText },
        { id: "materials", label: "Materials", icon: Folder },
        { id: "quizzes", label: "Examinations", icon: FileText },
        { id: "announcements", label: "Announcements", icon: Megaphone }
    ];

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AnimatePresence mode="wait">
                {!selectedCourse ? (
                    <motion.div
                        key="course-list"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        {/* Header + Tab Toggle */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">My Dashboard</h2>
                                <p className="text-slate-500 mt-1">Track your courses, assignments, and personal activity.</p>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                                <button onClick={() => setGlobalTab("courses")}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${globalTab === "courses" ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                                    <BookOpen className="w-4 h-4" /> My Courses
                                </button>
                                <button onClick={() => setGlobalTab("timeline")}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${globalTab === "timeline" ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                                    <Clock className="w-4 h-4" /> My Activity
                                </button>
                            </div>
                        </div>

                        {/* F7: Student Timeline View */}
                        {globalTab === "timeline" && (
                            <div className="glass-panel rounded-2xl p-6">
                                <StudentTimeline />
                            </div>
                        )}

                        {/* Courses View */}
                        {globalTab === "courses" && (
                            <>
                                {/* Summary Cards */}
                                {globalStats && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: "Pending", value: globalStats.assignmentsPending, color: "rose", Icon: CheckSquare },
                                            { label: "Attendance", value: `${globalStats.attendancePercentage}%`, color: "emerald", Icon: Users },
                                            { label: "Upcoming", value: globalStats.upcomingDeadlines, color: "amber", Icon: Clock },
                                            { label: "Submitted", value: globalStats.submissionsCount, color: "blue", Icon: FileText },
                                        ].map(card => (
                                            <Card key={card.label} className={`glass-panel border-l-4 border-l-${card.color}-500 hover:shadow-md transition-shadow`}>
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{card.label}</p>
                                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white">{card.value}</h3>
                                                    </div>
                                                    <div className={`w-10 h-10 rounded-full bg-${card.color}-50 dark:bg-${card.color}-500/10 flex items-center justify-center`}>
                                                        <card.Icon className={`w-5 h-5 text-${card.color}-500`} />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}

                                {/* Course Grid */}
                                {courses.length === 0 ? (
                                    <Card className="glass-panel text-center py-12">
                                        <CardContent>
                                            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                            <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300">No Courses Yet</h3>
                                            <p className="text-slate-500 mt-2">You haven't been enrolled in any courses yet.</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {courses.map((course: any) => (
                                            <motion.div whileHover={{ y: -4 }} key={course.id}>
                                                <Card className="glass-panel overflow-hidden border-t-4 border-t-blue-500 cursor-pointer hover:shadow-lg transition-all" onClick={() => setSelectedCourse(course)}>
                                                    <CardHeader className="pb-2">
                                                        <span className="px-2 py-1 bg-blue-500/10 text-blue-600 text-xs font-semibold rounded-full mb-2 inline-block">{course.code}</span>
                                                        <CardTitle className="text-xl leading-tight">{course.name}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                                                            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Prof. {course.professor || 'TBD'}</span>
                                                            <span className={`flex items-center gap-1 font-medium ${course.attendancePercentage < 75 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                                <CheckSquare className="w-4 h-4" /> {course.attendancePercentage}%
                                                            </span>
                                                        </div>
                                                        <button className="w-full mt-6 py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group">
                                                            Open Classroom
                                                            <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                        </button>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="course-dashboard"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                    >
                        {/* Enhanced Student Profile Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl text-white">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                            
                            <button onClick={() => setSelectedCourse(null)} className="absolute z-50 cursor-pointer top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md transition-all">
                                <ArrowLeft className="w-5 h-5 text-white" />
                            </button>
                            
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30 overflow-hidden shrink-0 shadow-lg">
                                     {globalProfile?.avatarUrl ? (
                                         <img src={`http://localhost:5000${globalProfile.avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
                                     ) : (
                                         <span className="text-3xl font-bold text-white shadow-sm">{globalProfile?.name?.charAt(0) || 'S'}</span>
                                     )}
                                </div>
                                <div className="flex-1 text-center md:text-left space-y-2">
                                     <h1 className="text-3xl font-bold tracking-tight">{globalProfile?.name || "Student Profile"}</h1>
                                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-medium text-blue-100">
                                          <span className="bg-blue-900/40 px-3 py-1 rounded-full border border-blue-400/30">Roll No: {globalProfile?.rollNo || "N/A"}</span>
                                          <span className="bg-blue-900/40 px-3 py-1 rounded-full border border-blue-400/30">Email: {globalProfile?.email || "N/A"}</span>
                                     </div>
                                     <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap items-center justify-center md:justify-start gap-6">
                                          <div className="flex items-center gap-2">
                                              <BookOpen className="w-5 h-5 text-blue-200" />
                                              <div>
                                                  <p className="text-xs text-blue-200 uppercase tracking-widest font-semibold">Course Enrolled</p>
                                                  <p className="font-bold text-lg">{selectedCourse.code} : {selectedCourse.name}</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-2 pl-6 border-l border-white/20 lg:border-none lg:pl-0">
                                              <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${selectedCourse.attendancePercentage >= 75 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                  {selectedCourse.attendancePercentage >= 75 ? '✔ Regular Student' : '⚠ Low Attendance'}
                                              </span>
                                          </div>
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* Course Tabs */}
                        <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl rounded-b-none border-b-2 border-slate-200 dark:border-slate-700">
                            {courseTabs.map((tab) => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                                        activeTab === tab.id
                                        ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                                    }`}>
                                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-blue-600" : "opacity-70"}`} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[400px]">
                            {activeTab === "overview" && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4">
                                    <CardContent className="pt-6">
                                        <ActivityTimeline courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                            {activeTab === "attendance" && (
                                <StudentAttendanceModule courseId={selectedCourse.id} />
                            )}
                            {activeTab === "assignments" && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4 border-blue-100 dark:border-blue-900/50">
                                    <CardContent className="p-0">
                                        <StudentAssignmentModule courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                            {activeTab === "materials" && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4 border-indigo-100 dark:border-indigo-900/50">
                                    <CardContent className="p-0">
                                        <StudentMaterialModule courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                            {activeTab === "quizzes" && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4 border-emerald-100 dark:border-emerald-900/50">
                                    <CardContent className="p-4 md:p-6">
                                        <StudentQuizViewerModule courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                            {activeTab === "announcements" && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4 border-amber-100 dark:border-amber-900/50">
                                    <CardContent className="p-0">
                                        <StudentAnnouncementModule courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
