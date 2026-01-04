import React, { useState, useEffect } from 'react';
import { X, Save, Tag, User, AlignLeft } from 'lucide-react';

export default function ContactModal({ isOpen, onClose, onSave, address, initialData = {} }) {
    const [nickname, setNickname] = useState('');
    const [labels, setLabels] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNickname(initialData.nickname || '');
            setLabels(initialData.labels ? initialData.labels.join(', ') : '');
            setNotes(initialData.notes || '');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(address, {
            nickname: nickname.trim(),
            labels: labels.split(',').map(l => l.trim()).filter(Boolean),
            notes: notes.trim()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0A0A0B] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-up">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h3 className="text-xl font-bold text-white">Edit Contact</h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <User className="w-3 h-3" /> Nickname
                        </label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="e.g. Alice (Work)"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Tag className="w-3 h-3" /> Labels
                        </label>
                        <input
                            type="text"
                            value={labels}
                            onChange={(e) => setLabels(e.target.value)}
                            placeholder="e.g. Friend, Developer, VIP"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                        <p className="text-[10px] text-slate-500">Comma separated</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <AlignLeft className="w-3 h-3" /> Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add private notes about this contact..."
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Contact
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
