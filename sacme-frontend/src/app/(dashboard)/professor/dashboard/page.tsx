"use client";
import { getAuthToken, logoutUser } from '@/lib/auth';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Users, FileText, CheckSquare, Megaphone, Folder, ArrowLeft, Loader2, ArrowRight, MessageCircle } from "lucide-react";
import AttendanceModule from "@/components/professor/AttendanceModule";
import AssignmentModule from "@/components/professor/AssignmentModule";
import MaterialModule from "@/components/professor/MaterialModule";
import StudentRosterModule from "@/components/professor/StudentRosterModule";
import QuizCreatorModule from "@/components/professor/QuizCreatorModule";
import ProfessorAnnouncementModule from "@/components/professor/ProfessorAnnouncementModule";
import ContactStudentModule from "@/components/professor/ContactStudentModule";
import MailComposerModal from "@/components/professor/MailComposerModal";
import ActivityTimeline from "@/components/shared/ActivityTimeline";

export default function ProfessorDashboardPage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [courseStats, setCourseStats] = useState<{ enrolledCount: number; avgAttendance: number } | null>(null);
    const [composerRecipients, setComposerRecipients] = useState<any[]>([]);
    const [composerOpen, setComposerOpen] = useState(false);

    const handleOpenComposer = (students: any[]) => {
        setComposerRecipients(students);
        setComposerOpen(true);
    };

    useEffect(() => {
        const storedCourse = sessionStorage.getItem('professor_selected_course');
        if (storedCourse) {
            try {
                setSelectedCourse(JSON.parse(storedCourse));
            } catch (e) {}
        }

        const fetchCourses = async () => {
            try {
                const token = getAuthToken();
                if (!token) return;

                const res = await fetch('http://localhost:5000/api/courses/my-courses', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCourses(data.courses || []);
                } else if (res.status === 401 || res.status === 403) {
                    console.error("Auth Error:", res.status);
                    logoutUser();
                    window.location.href = '/auth/login';
                } else {
                    const err = await res.json();
                    console.error("My Courses Error:", res.status, err);
                }
            } catch (err) {
                console.error("Failed to load courses", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            sessionStorage.setItem('professor_selected_course', JSON.stringify(selectedCourse));
            // Fetch real enrollment stats for the selected course
            const fetchCourseStats = async () => {
                try {
                    const token = getAuthToken();
                    const res = await fetch(`http://localhost:5000/api/students/course/${selectedCourse.id}/roster`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const students = data.students || [];
                        const avg = students.length === 0 ? 0 :
                            Math.round(students.reduce((sum: number, s: any) => sum + (s.attendancePercentage || 0), 0) / students.length);
                        setCourseStats({ enrolledCount: students.length, avgAttendance: avg });
                    }
                } catch (e) { /* keep previous stats */ }
            };
            fetchCourseStats();
        } else {
            sessionStorage.removeItem('professor_selected_course');
            setCourseStats(null);
        }
    }, [selectedCourse]);

    const courseTabs = [
        { id: "overview", label: "Overview", icon: BookOpen },
        { id: "attendance", label: "Attendance", icon: CheckSquare },
        { id: "assignments", label: "Assignments", icon: FileText },
        { id: "materials", label: "Materials", icon: Folder },
        { id: "students", label: "Students", icon: Users },
        { id: "quizzes", label: "Quizzes Exam Engine", icon: FileText },
        { id: "announcements", label: "Announcements", icon: Megaphone },
        { id: "contact", label: "Contact Student", icon: FileText }
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
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">My Courses</h2>
                                <p className="text-slate-500 mt-1">Select a course to manage academic workflows.</p>
                            </div>
                        </div>

                        {courses.length === 0 ? (
                            <Card className="glass-panel text-center py-12">
                                <CardContent>
                                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300">No Assignments Yet</h3>
                                    <p className="text-slate-500 mt-2">You haven't been assigned to any upcoming courses.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {courses.map((course: any) => (
                                    <motion.div whileHover={{ y: -4 }} key={course.id}>
                                        <Card className="glass-panel overflow-hidden border-t-4 border-t-primary cursor-pointer hover:shadow-lg transition-all" onClick={() => setSelectedCourse(course)}>
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-2 inline-block">
                                                            {course.code}
                                                        </span>
                                                        <CardTitle className="text-xl leading-tight">{course.name}</CardTitle>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                                                    <div className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        <span>Enrolled Students</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                                                        <span className="text-emerald-600 font-medium">Attendance</span>
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    className="w-full mt-6 py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group"
                                                >
                                                    Open Dashboard
                                                    <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                </button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
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
                        {/* Course Header Banner */}
                        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border border-primary/20 relative overflow-hidden">
                            <button 
                                onClick={() => setSelectedCourse(null)}
                                className="absolute top-6 right-6 p-2 bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-slate-800 rounded-full backdrop-blur-md transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </button>
                            
                            <div className="pr-12">
                                <span className="px-3 py-1 bg-white dark:bg-slate-800 text-primary text-xs font-bold rounded-full shadow-sm">
                                    Semester {selectedCourse.semester}
                                </span>
                                <h1 className="text-3xl font-bold mt-4 text-slate-900 dark:text-white">
                                    {selectedCourse.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-6 mt-4 text-sm font-medium">
                                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <BookOpen className="w-4 h-4" /> {selectedCourse.code}
                                    </span>
                                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <Users className="w-4 h-4 text-blue-500" /> {courseStats !== null ? courseStats.enrolledCount : '...'} Enrolled
                                    </span>
                                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <CheckSquare className="w-4 h-4 text-emerald-500" /> {courseStats !== null ? `${courseStats.avgAttendance}%` : '...'} Attendance Avg
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl rounded-b-none border-b-2 border-slate-200 dark:border-slate-700">
                            {courseTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                                        activeTab === tab.id 
                                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : 'opacity-70'}`} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Render Active Tab View */}
                        <div className="min-h-[400px]">
                            {activeTab === 'overview' && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4">
                                    <CardContent className="pt-6">
                                        <ActivityTimeline courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                            {activeTab === 'attendance' && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4 border-emerald-100 dark:border-emerald-900/50">
                                    <CardContent className="p-0">
                                        <AttendanceModule courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                            {activeTab === 'assignments' && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4 border-blue-100 dark:border-blue-900/50">
                                    <CardContent className="p-0">
                                        <AssignmentModule courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                            {activeTab === 'materials' && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4 border-indigo-100 dark:border-indigo-900/50">
                                    <CardContent className="p-0">
                                        <MaterialModule courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                            {activeTab === 'students' && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4 border-rose-100 dark:border-rose-900/50">
                                    <CardContent className="p-0">
                                        <StudentRosterModule courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                            {activeTab === 'quizzes' && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4 border-indigo-100 dark:border-indigo-900/50">
                                    <CardContent className="p-4 md:p-6">
                                        <QuizCreatorModule courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                            {activeTab === 'announcements' && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4 border-amber-100 dark:border-amber-900/50">
                                    <CardContent className="p-0">
                                        <ProfessorAnnouncementModule courseId={selectedCourse.id} />
                                    </CardContent>
                                </Card>
                            )}
                            {activeTab === 'contact' && (
                                <Card className="glass-panel animate-in fade-in slide-in-from-bottom-4 border-blue-100 dark:border-blue-900/50">
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center rounded-t-xl">
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white">Contact Students</h3>
                                            <p className="text-sm text-slate-500">View roster attendance, pending work, and send direct emails.</p>
                                        </div>
                                    </div>
                                    <CardContent className="p-0">
                                        <ContactStudentModule courseId={selectedCourse.id} onOpenComposer={handleOpenComposer} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Mail Composer Modal Holder */}
                        {composerOpen && (
                           <MailComposerModal 
                               recipients={composerRecipients} 
                               courseId={selectedCourse.id} 
                               onClose={() => setComposerOpen(false)} 
                           />
                        )}

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
