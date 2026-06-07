"use client";
import { logoutUser } from '@/lib/auth';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  UserCheck, 
  FileText, 
  Bell, 
  MessageSquare, 
  MessageCircleQuestion,
  Settings,
  LogOut,
  Network,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    // Determine base route from the pathname 
    // e.g., /admin/dashboard -> /admin
    // e.g., /student/courses -> /student
    const basePath = pathname.split('/').slice(0, 2).join('/') || '/dashboard';

    const adminNavItems = [
        { name: 'Dashboard', icon: LayoutDashboard, href: `${basePath}/dashboard` },
        { name: 'Network Map', icon: Network, href: `${basePath}/network-map` },
        { name: 'Activity Heatmap', icon: Activity, href: `${basePath}/heatmap` },
        { name: 'Institute Setup', icon: Settings, href: `${basePath}/setup` },
    ];

    const advisorNavItems = [
        { name: 'Semester Overview', icon: LayoutDashboard, href: `${basePath}/dashboard` },
        { name: 'Add Students', icon: UserCheck, href: `${basePath}/students` },
        { name: 'Add Courses', icon: BookOpen, href: `${basePath}/courses` },
        { name: 'Add Professors', icon: UserCheck, href: `${basePath}/professors` },
        { name: 'Assign Professors', icon: FileText, href: `${basePath}/course-assignment` },
    ];

    const professorNavItems = [
        { name: 'Dashboard', icon: LayoutDashboard, href: `${basePath}/dashboard` },
        { name: 'Enrolled Students', icon: UserCheck, href: `${basePath}/students` },
        { name: 'Mark Attendance', icon: UserCheck, href: `${basePath}/attendance` },
        { name: 'Lecture Files', icon: BookOpen, href: `${basePath}/lectures` },
        { name: 'Assignments', icon: FileText, href: `${basePath}/assignments` },
        { name: 'Announcements', icon: Bell, href: `${basePath}/announcements` },
    ];

    const studentNavItems = [
        { name: 'Dashboard', icon: LayoutDashboard, href: `${basePath}/dashboard` },
        { name: 'Courses', icon: BookOpen, href: `${basePath}/courses` },
        { name: 'Attendance', icon: UserCheck, href: `${basePath}/attendance` },
        { name: 'Assignments', icon: FileText, href: `${basePath}/assignments` },
        { name: 'Announcements', icon: Bell, href: `${basePath}/announcements` },
        { name: 'Queries', icon: MessageCircleQuestion, href: `${basePath}/queries` },
        { name: 'Feedback', icon: MessageSquare, href: `${basePath}/feedback` },
    ];

    let navItems = studentNavItems;
    if (basePath === '/professor') navItems = professorNavItems;
    if (basePath === '/admin' || basePath === '/main-admin') navItems = adminNavItems;

    // Remove sidebar completely for faculty advisor 
    if (basePath === '/faculty-advisor') return null;

    const handleLogout = async () => {
        try {
            await fetch('http://localhost:5000/api/auth/logout', { method: 'POST' });
        } catch (e) {} // Error ignored for logout mostly
        logoutUser();
        router.push('/auth/login');
    };

    return (
        <aside className="w-20 md:w-64 flex-shrink-0 glass-panel m-4 rounded-[2rem] flex flex-col justify-between py-6 transition-all duration-300 z-20">
            <div>
                {/* Logo Area */}
                <div className="px-4 md:px-6 flex justify-center md:justify-start items-center mb-10">
                    <Link href="/" className="flex items-center gap-3 group">
                        <img 
                            src="/logo.png" 
                            alt="SACME Logo" 
                            className="w-12 h-12 object-contain aspect-square"
                        />
                        <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white hidden md:block select-none">SACME</span>
                    </Link>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-1 px-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname.startsWith(item.href);
                        
                        return (
                            <Link 
                                key={item.name} 
                                href={item.href} 
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors group relative",
                                    isActive 
                                      ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold shadow-sm" 
                                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-500 rounded-r-md"></div>
                                )}
                                <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300")} />
                                <span className="hidden md:block text-sm">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
            
            {/* Bottom Links */}
            <div className="px-3 space-y-1 mt-auto">
                 <Link href={`${basePath}/profile`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                    <Settings className="w-5 h-5 text-slate-500" />
                    <span className="hidden md:block text-sm">Profile & Settings</span>
                </Link>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-danger/10 hover:text-danger dark:hover:bg-danger/20 transition-colors">
                    <LogOut className="w-5 h-5" />
                    <span className="hidden md:block text-sm">Log Out</span>
                </button>
            </div>
        </aside>
    );
}
