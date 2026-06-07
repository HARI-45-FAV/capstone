import { useState } from "react";
import { getAuthToken } from "@/lib/auth";
import { X, Send, Loader2 } from "lucide-react";

export default function MailComposerModal({ recipients, courseId, onClose }: { recipients: any[], courseId: string, onClose: () => void }) {
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!subject.trim() || !message.trim()) {
            alert("Subject and Message are required");
            return;
        }

        setSending(true);
        try {
            const token = getAuthToken();
            const res = await fetch('http://localhost:5000/api/communication/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    courseId,
                    recipients: recipients.map(r => ({ id: r.id, email: r.email, name: r.name })),
                    subject,
                    message
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(`Success: ${data.message}`);
                onClose();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to send email");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Compose Custom Email</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block tracking-wider text-xs font-bold text-slate-500 mb-2 uppercase">To ({recipients.length} Recipient{recipients.length > 1 ? 's' : ''})</label>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            {recipients.map(r => (
                                <span key={r.id} className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-700 shadow-sm rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    {r.name}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block tracking-wider text-xs font-bold text-slate-500 mb-2 uppercase">Subject</label>
                        <input 
                            type="text" 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Enter email subject"
                        />
                    </div>

                    <div>
                        <label className="block tracking-wider text-xs font-bold text-slate-500 mb-2 uppercase">Message</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                            placeholder="Write your email content here..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSend}
                        disabled={sending}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending ? "Sending..." : "Send Mail"}
                    </button>
                </div>
            </div>
        </div>
    );
}
