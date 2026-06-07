"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, ShieldCheck, Zap, BookOpen, Users, LayoutDashboard, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  const [showDevModal, setShowDevModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#f9f9fb] dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-blue-200 dark:selection:bg-blue-900 relative">
      
      {/* Header - Clean & Flat */}
      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-9 h-9 object-contain"
            />
            <span className="font-bold text-xl tracking-tight">SACME</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/auth" className="hidden sm:block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Sign in
            </Link>
            <Link href="/auth">
              <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 shadow-sm border-0">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col items-center overflow-hidden">
        {/* Hero Section */}
        <section className="w-full max-w-7xl mx-auto px-6 pt-24 pb-16 lg:pt-32 lg:pb-24 text-center flex flex-col items-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight max-w-5xl leading-[1.05] mb-8 text-slate-900 dark:text-white"
          >
            Manage academic workflows,<br />
            <span className="text-blue-600">all in one place.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10 font-medium"
          >
            SACME is the unified, role-based ecosystem that connects administrators, professors, and students to streamline education delivery.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <Link href="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-8 h-14 border-0">
                Get started for free
              </Button>
            </Link>
            <Button 
              size="lg" 
              className="w-full sm:w-auto rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-lg px-8 h-14"
              onClick={() => setShowDevModal(true)}
            >
              Developer Details
            </Button>
            <p className="text-sm font-medium text-slate-500 hidden sm:block">No credit card required.</p>
          </motion.div>
        </section>

        {/* Dashboard Mockup Section (Airtable style prominent UI preview) */}
        <section className="w-full max-w-6xl mx-auto px-6 pb-24">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="w-full aspect-[16/9] md:aspect-[21/9] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative flex flex-col"
          >
            {/* Mockup Header */}
            <div className="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-2 bg-slate-50 dark:bg-slate-950">
              <div className="w-3 h-3 rounded-full bg-rose-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            </div>
            {/* Mockup Body */}
            <div className="flex-1 flex p-4 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
              {/* Fake Sidebar */}
              <div className="w-48 hidden md:flex flex-col gap-2">
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
                <div className="space-y-2 mt-2">
                  <div className="h-8 w-full bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-900/50"></div>
                  <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
              </div>
              {/* Fake Main Content */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="h-12 w-full bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-100 dark:border-slate-700 flex items-center px-4 justify-between">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
                <div className="flex-1 bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col gap-4">
                  <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="flex gap-4">
                    <div className="flex-1 h-28 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800"></div>
                    <div className="flex-1 h-28 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800"></div>
                    <div className="flex-1 h-28 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800"></div>
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded flex flex-col mt-2 border border-slate-100 dark:border-slate-800 p-4 gap-3">
                    <div className="h-8 w-full bg-white dark:bg-slate-800 rounded shadow-sm"></div>
                    <div className="h-8 w-full bg-white dark:bg-slate-800 rounded shadow-sm"></div>
                    <div className="h-8 w-full bg-white dark:bg-slate-800 rounded shadow-sm"></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features / Value Props Section */}
        <section className="w-full max-w-7xl mx-auto px-6 py-24 mb-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white">Everything you need to succeed</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Built for isolation and scale, SACME enforces strict boundaries while delivering a beautiful experience across all academic roles.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                icon: <ShieldCheck className="w-8 h-8 text-rose-500" />,
                title: "Strict Role Isolation",
                desc: "Secure boundaries between Admin, Faculty, and Students ensure data privacy and targeted workflows.",
                color: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
              },
              {
                icon: <BookOpen className="w-8 h-8 text-blue-500" />,
                title: "Curriculum Management",
                desc: "Effortlessly upload materials, distribute assignments, and construct courses in a centralized hub.",
                color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              },
              {
                icon: <LayoutDashboard className="w-8 h-8 text-emerald-500" />,
                title: "Performance Tracking",
                desc: "Real-time analytics and visual dashboards keep performance, attendance, and grades beautifully organized.",
                color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-start bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full bg-blue-600 dark:bg-blue-900 text-white py-24 text-center px-6 border-b border-blue-700 dark:border-blue-950">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Ready to unite your campus?</h2>
          <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto font-medium">Join the next generation of academic management platforms today.</p>
          <Link href="/auth">
            <Button size="lg" className="rounded-full bg-white text-blue-600 hover:bg-slate-50 font-bold text-lg px-10 h-14 shadow-xl border-0">
              Sign up today
            </Button>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white dark:bg-slate-950 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-7 h-7 object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all"
            />
            <span className="font-bold text-slate-900 dark:text-white">SACME</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
            <Link href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

      {showDevModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Developer Information</h3>
              <button 
                onClick={() => setShowDevModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center text-center">
              <img 
                src="/logo.png" 
                alt="Developer Logo" 
                className="w-40 h-40 object-contain mb-6 drop-shadow-md"
              />
              <h2 className="text-3xl font-black mb-2 text-slate-900 dark:text-white">K Hari Prasad</h2>
              <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                IIT PATNA
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
