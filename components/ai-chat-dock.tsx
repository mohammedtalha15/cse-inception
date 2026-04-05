"use client";

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AiChatDock() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="bg-neutral-900 text-neutral-100 p-3 sm:p-4 flex items-center justify-center border border-neutral-700 shadow-2xl hover:bg-neutral-800 transition-colors"
        >
          {isOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 h-[500px] max-h-[calc(100vh-8rem)] bg-neutral-950 border border-neutral-800 shadow-2xl flex flex-col"
          >
            <div className="p-3 border-b border-neutral-800 bg-neutral-900 text-xs font-mono text-neutral-400 uppercase tracking-widest flex justify-between items-center">
              <span>Ayuq Explainable AI</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto text-sm text-neutral-300 font-mono space-y-4">
              <div className="bg-neutral-900 p-3 border-l-2 border-green-500">
                <span className="text-green-500 font-bold tracking-wider mr-2">SYS{">"}</span>
                Ayuq Intelligence initialized. I can explain the contextual factors of your recent hypoglycemia risk alerts.
              </div>
            </div>

            <div className="p-3 border-t border-neutral-800 bg-neutral-900">
              <input 
                type="text" 
                placeholder="Ask about your risk score..." 
                className="w-full bg-neutral-950 border border-neutral-700 p-3 text-sm text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
