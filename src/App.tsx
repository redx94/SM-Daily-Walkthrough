import React, { useState, useEffect } from 'react';
import { Printer, Mail, CheckCircle, Save, AlertTriangle, Calendar, User, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// --- Gemini API Setup ---
const callGemini = async (prompt: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    alert("To use the AI features, please configure the Gemini API key.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Wendy's Restaurant Manager assistant. Keep responses professional, concise, and focused on food safety and operational excellence."
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "Failed to generate content. Please check your internet connection and API key.";
  }
};

// --- Constants & Data Structure ---
const SHIFTS = ['7 AM', '10 AM', '1 PM', '4 PM', 'LN'];

const BOOLEAN_CHECKS = [
  { id: 'general_ill', label: 'No ill employees; No food/drink/gum/tobacco in food areas' },
  { id: 'general_pest', label: 'No pest activity; Food Safety Log filled out properly' },
  { id: 'sinks_clean', label: 'Hand Sinks: Clean, accessible, soap, paper towels, running water, drain properly' },
  { id: 'wash_tech', label: 'Handwashing: Proper technique; turn off water with paper towel' },
  { id: 'glove_use', label: 'Grill & Sandwich: Handwashing between tasks; Proper glove use' },
  { id: 'prep_clean', label: 'Prep Station: Tomato Slicer, Dicer & cutting boards detailed clean' },
  { id: 'sand_glove', label: 'Sandwich: No gloves stored at station (only at handwashing sink)' },
  { id: 'grill_lid', label: 'Grill: Lid on meat well, not overstocked' },
  { id: 'grill_tools', label: 'Grill: Pink towels/red spatula at grill only; Egg spatula only used by grill operator' },
];

const VALUE_CHECKS = [
  { id: 'sanitizer', label: 'Sanitizer ppm (3-comp & online)' },
  { id: 'chlorine', label: 'Chlorine ppm (Ware wash)' },
  { id: 'beef_temp', label: 'Raw Beef Temp (≤ 41°F) *10:30am check at 10 AM*' },
  { id: 'chili_temp', label: 'Chili Online (Time/Temp on lid)' },
  { id: 'frosty_temp', label: 'Frosty Hoppers: Choc / Vanilla (≤ 41°F)' },
  { id: 'creamer_temp', label: 'Creamer (≤ 41°F)' },
];

const DAY_DOT_CHECKS = [
  { id: 'tomatoes', label: 'Sliced Tomatoes (4-hr exp)' },
  { id: 'lettuce', label: 'Sandwich Lettuce (4-hr exp)' },
  { id: 'cheese', label: 'Sandwich Cheese (1hr temp + 7hr hold)' },
];

const DAILY_CHECKS = [
  { id: 'storage_rte', label: 'Proper storage: RTE foods stored above bacon, raw eggs, beef' },
  { id: 'storage_beef', label: 'Raw beef stored away from door' },
  { id: 'storage_emp', label: 'Employee food/drinks properly stored and labeled' },
  { id: 'cases_closed', label: 'Cases/bags closed & protected from overhead contamination' },
  { id: 'rapid_coolers', label: 'Rapid coolers clean, bagged, and frozen' },
  { id: 'rapikools', label: 'RapiKools clean and stored on bottom shelf in freezer' },
  { id: 'chili_prep', label: 'Chili Prep: Stirred, labeled, tracks to 165°F in 2 hrs' },
];

const INVENTORY_FREEZER = [
  { id: 'chickenClassic', label: 'Chicken - Classic', fields: ['Case', 'Bag', 'Each'] },
  { id: 'goldChiliMeatFreezer', label: 'Gold Chili Meat 5.25 Lb', fields: ['Bag'] },
  { id: 'chickenBreakfastCrispy', label: 'Chicken - Breakfast & Crispy', fields: ['Case', 'Bag', 'Each'] },
  { id: 'chickenSpicy', label: 'Chicken - Spicy', fields: ['Case', 'Bag', 'Each'] },
  { id: 'chickenNuggetsSpicy', label: 'Chicken Nuggets Spicy', fields: ['Case', 'Bag'] },
  { id: 'chickenNuggets', label: 'Chicken Nuggets', fields: ['Case', 'Bag'] },
  { id: 'chickenDicedFreezer', label: 'Chicken - Diced', fields: ['Case', 'Bag'] },
  { id: 'chickenTenders', label: 'Chicken - Tenders', fields: ['Case', 'Bag', 'Each'] },
  { id: 'sausageSquare', label: 'Sausage - Square', fields: ['Case', 'Bag', 'Lbs'] },
  { id: 'potatoFry', label: 'Potato Fry (French Fries)', fields: ['Case', 'Bag'] },
];

const INVENTORY_COOLER = [
  { id: 'goldChiliMeatCooler', label: 'Gold Chili Meat 5.25 Lb', fields: ['Bag'] },
  { id: 'chickenDicedCooler', label: 'Chicken - Diced', fields: ['Bag'] },
  { id: 'beef4ozPatty', label: 'Beef 4 oz Patty', fields: ['Case', 'Sleeve', 'Each'] },
  { id: 'beefSmPatty', label: 'Beef Sm Patty', fields: ['Case', 'Sleeve', 'Each'] },
  { id: 'goldChiliBatch', label: 'Gold Chili Batch (1/2)', fields: ['Batch'] },
  { id: 'eggsWholeShell', label: 'Eggs - Whole Shell', fields: ['Case', 'Doz', 'Each'] },
  { id: 'baconRoasted', label: 'Bacon - Roasted', fields: ['Case', 'Pack', 'Sheet'] },
];

const CLOSING_TASKS = [
  { id: 'countTills', label: 'Count Tills', section: 'Preclose Tasks' },
  { id: 'safeCount', label: 'Safe Count', section: 'After Close Cash' },
  { id: 'tills', label: 'Tills', section: 'After Close Cash' },
  { id: 'enterDeposits', label: 'Enter Deposits', section: 'After Close Cash' },
  { id: 'enterDailyInventoryCounts', label: 'Enter Daily Inventory Counts', section: 'After Close Inventory' },
];

const generateEmptyInventory = (items: any[]) => {
  return items.reduce((acc, item) => {
    acc[item.id] = item.fields.reduce((fAcc: any, field: string) => {
      fAcc[field.toLowerCase()] = '';
      return fAcc;
    }, {});
    return acc;
  }, {});
};

const EMPTY_CLOSING = {
  notes: '',
  checklist: CLOSING_TASKS.reduce((acc, task) => ({ ...acc, [task.id]: false }), {}),
  inventory: {
    freezer: generateEmptyInventory(INVENTORY_FREEZER),
    cooler: generateEmptyInventory(INVENTORY_COOLER),
  }
};

const EMPTY_SHIFT = {
  initials: '',
  ...BOOLEAN_CHECKS.reduce((acc, check) => ({ ...acc, [check.id]: false }), {}),
  ...VALUE_CHECKS.reduce((acc, check) => ({ ...acc, [check.id]: '' }), {}),
  ...DAY_DOT_CHECKS.reduce((acc, check) => ({ ...acc, [`${check.id}_start`]: '', [`${check.id}_end`]: '', [`${check.id}_new`]: false }), {}),
  shiftReport: {
    startTime: '',
    endTime: '',
    tasksCompleted: '',
    issuesEncountered: '',
    notes: ''
  }
};

const DEFAULT_DAY_DATA = {
  date: new Date().toISOString().split('T')[0],
  storeNumber: '283',
  shifts: SHIFTS.reduce((acc, shift) => ({ ...acc, [shift]: { ...EMPTY_SHIFT } }), {}),
  dailyChecks: DAILY_CHECKS.reduce((acc, check) => ({ ...acc, [check.id]: false }), {}),
  beefDate: '',
  correctiveActions: '',
  rootCause: '',
  closing: EMPTY_CLOSING
};

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeShift, setActiveShift] = useState('7 AM');
  const [activeTab, setActiveTab] = useState('walkthrough'); // 'walkthrough' | 'closing'
  const [dayData, setDayData] = useState<any>(DEFAULT_DAY_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState('form'); // 'form' or 'print'
  const [isGeneratingAction, setIsGeneratingAction] = useState(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- Server Data Loading ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`/api/walkthrough/${currentDate}`);
        if (response.ok) {
          const parsed = await response.json();
          if (parsed) {
            setDayData({
               ...DEFAULT_DAY_DATA,
               ...parsed,
               shifts: { ...DEFAULT_DAY_DATA.shifts, ...(parsed.shifts || {}) },
               dailyChecks: { ...DEFAULT_DAY_DATA.dailyChecks, ...(parsed.dailyChecks || {}) },
               closing: {
                 ...DEFAULT_DAY_DATA.closing,
                 ...(parsed.closing || {}),
                 checklist: { ...DEFAULT_DAY_DATA.closing.checklist, ...(parsed.closing?.checklist || {}) },
                 inventory: {
                   freezer: { ...DEFAULT_DAY_DATA.closing.inventory.freezer, ...(parsed.closing?.inventory?.freezer || {}) },
                   cooler: { ...DEFAULT_DAY_DATA.closing.inventory.cooler, ...(parsed.closing?.inventory?.cooler || {}) },
                 }
               }
            });
            return;
          }
        }
      } catch (e) {
        console.error("Error loading server data", e);
      }
      setDayData({ ...DEFAULT_DAY_DATA, date: currentDate });
    };
    loadData();
  }, [currentDate]);

  // --- Handlers ---
  const saveToServer = async (newData: any) => {
    setIsSaving(true);
    try {
      await fetch(`/api/walkthrough/${newData.date}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newData)
      });
    } catch (e) {
      console.error("Error saving to server", e);
    }
    setTimeout(() => setIsSaving(false), 500); // Visual feedback
  };

  const handleShiftUpdate = (field: string, value: any) => {
    const newData = {
      ...dayData,
      shifts: {
        ...dayData.shifts,
        [activeShift]: {
          ...dayData.shifts[activeShift],
          [field]: value
        }
      }
    };
    setDayData(newData);
    saveToServer(newData);
  };

  const handleDailyUpdate = (field: string, value: any) => {
    const newData = {
      ...dayData,
      [field]: value
    };
    setDayData(newData);
    saveToServer(newData);
  };

  const handleDailyCheckUpdate = (field: string, value: any) => {
    const newData = {
      ...dayData,
      dailyChecks: {
        ...dayData.dailyChecks,
        [field]: value
      }
    };
    setDayData(newData);
    saveToServer(newData);
  };

  const handleClosingUpdate = (field: string, value: any) => {
    const newData = {
      ...dayData,
      closing: {
        ...dayData.closing,
        [field]: value
      }
    };
    setDayData(newData);
    saveToServer(newData);
  };

  const handleClosingChecklistUpdate = (id: string, value: boolean) => {
    const newData = {
      ...dayData,
      closing: {
        ...dayData.closing,
        checklist: {
          ...dayData.closing.checklist,
          [id]: value
        }
      }
    };
    setDayData(newData);
    saveToServer(newData);
  };

  const handleInventoryUpdate = (section: 'freezer' | 'cooler', itemId: string, field: string, value: string) => {
    const newData = {
      ...dayData,
      closing: {
        ...dayData.closing,
        inventory: {
          ...dayData.closing.inventory,
          [section]: {
            ...dayData.closing.inventory[section],
            [itemId]: {
              ...dayData.closing.inventory[section][itemId],
              [field]: value
            }
          }
        }
      }
    };
    setDayData(newData);
    saveToServer(newData);
  };

  const handleShiftReportUpdate = (field: string, value: any) => {
    const newData = {
      ...dayData,
      shifts: {
        ...dayData.shifts,
        [activeShift]: {
          ...dayData.shifts[activeShift],
          shiftReport: {
            ...dayData.shifts[activeShift].shiftReport,
            [field]: value
          }
        }
      }
    };
    setDayData(newData);
    saveToServer(newData);
  };

  const handleGenerateActionPlan = async () => {
    setIsGeneratingAction(true);
    const prompt = `The shift manager recorded the following issue or immediate action: "${dayData.correctiveActions}". Based on this, generate a professional, brief 2-3 sentence Root Cause Analysis and Action Plan suitable for a formal report to the District Manager. Do not use formatting like markdown.`;
    const suggestion = await callGemini(prompt);
    if(suggestion) handleDailyUpdate('rootCause', suggestion);
    setIsGeneratingAction(false);
  };

  const handleGenerateEmail = async () => {
    setIsGeneratingEmail(true);
    let prompt = '';
    let subject = '';
    let emailBody = '';
    
    if (activeTab === 'walkthrough') {
      let summaryData = `Store #: ${dayData.storeNumber || '283'}\nDate: ${currentDate}\nShift: ${activeShift}\n`;
      
      const missing = BOOLEAN_CHECKS.filter(c => !dayData.shifts[activeShift][c.id]);
      if (missing.length > 0 && dayData.shifts[activeShift].initials) {
        summaryData += `Missed ${missing.length} checks during the ${activeShift} shift.\n`;
      }
      
      summaryData += `Issues/Actions Taken: ${dayData.correctiveActions}\nRoot Cause/Plan: ${dayData.rootCause}`;

      prompt = `Write a professional, encouraging email summary to the District Manager from the Store #${dayData.storeNumber || '283'} Team based on this end-of-shift data for the ${activeShift} shift: ${summaryData}. Keep it concise, highlight if things went well, or clearly summarize what corrective actions were taken if there were issues. Format the email without a subject line placeholder and do not use markdown formatting.`;
      subject = `Wendy's Walkthrough - Store #${dayData.storeNumber || '283'} - ${activeShift} Shift - ${currentDate}`;
      emailBody = await callGemini(prompt) || '';
    } else if (activeTab === 'shiftReport') {
      const report = dayData.shifts[activeShift].shiftReport;
      let reportData = `Store #: ${dayData.storeNumber || '283'}\nDate: ${currentDate}\nShift: ${activeShift}\n`;
      reportData += `Start Time: ${report.startTime}\nEnd Time: ${report.endTime}\n`;
      reportData += `Tasks Completed: ${report.tasksCompleted}\n`;
      reportData += `Issues Encountered: ${report.issuesEncountered}\n`;
      reportData += `Notes: ${report.notes}\n`;

      prompt = `Write a professional shift report email to the Store GM from the Shift Manager of Store #${dayData.storeNumber || '283'} for the ${activeShift} shift on ${currentDate}. Here is the data: ${reportData}. Keep it concise, professional, and do not use markdown formatting.`;
      subject = `Wendy's Shift Report - Store #${dayData.storeNumber || '283'} - ${activeShift} Shift - ${currentDate}`;
      emailBody = await callGemini(prompt) || '';
    } else {
      let closingData = `Store #: ${dayData.storeNumber || '283'}\nDate: ${currentDate}\n`;
      closingData += `Closing Notes: ${dayData.closing.notes || 'None'}\n`;
      
      const missingTasks = CLOSING_TASKS.filter(t => !dayData.closing.checklist[t.id]);
      if (missingTasks.length > 0) {
        closingData += `Incomplete Closing Tasks: ${missingTasks.map(t => t.label).join(', ')}\n`;
      } else {
        closingData += `All closing tasks completed.\n`;
      }

      // Add inventory data
      closingData += `\nInventory Counts:\n`;
      closingData += `Freezer:\n`;
      INVENTORY_FREEZER.forEach(item => {
        const counts = item.fields.map(f => `${f}: ${dayData.closing.inventory.freezer[item.id]?.[f.toLowerCase()] || '0'}`).join(', ');
        closingData += `- ${item.label}: ${counts}\n`;
      });
      closingData += `Cooler:\n`;
      INVENTORY_COOLER.forEach(item => {
        const counts = item.fields.map(f => `${f}: ${dayData.closing.inventory.cooler[item.id]?.[f.toLowerCase()] || '0'}`).join(', ');
        closingData += `- ${item.label}: ${counts}\n`;
      });

      prompt = `Write a professional end-of-day closing summary email to the Store GM and District Manager from the Closing Manager of Store #${dayData.storeNumber || '283'} for ${currentDate}. Here is the data: ${closingData}. Keep it concise, professional, and do not use markdown formatting. Make sure to include the inventory counts in a clear, readable format.`;
      subject = `Wendy's End of Day Closing Report - Store #${dayData.storeNumber || '283'} - ${currentDate}`;
      emailBody = await callGemini(prompt) || '';
    }
    
    setIsGeneratingEmail(false);
    
    if(emailBody) {
      try {
        const response = await fetch('/api/shift-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: currentDate,
            data: dayData,
            emailBody,
            subject
          })
        });
        const result = await response.json();
        if (result.success) {
          alert('Report successfully submitted and email sent (or logged to console if SMTP is not configured).');
        } else {
          alert('Failed to send email via server. Opening mail client instead.');
          const mailtoLink = `mailto:wendys283@divinellc.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
          window.location.href = mailtoLink;
        }
      } catch (e) {
        console.error('Error sending report:', e);
        const mailtoLink = `mailto:wendys283@divinellc.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailtoLink;
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '0000') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid PIN. Please try again.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="text-center mb-8">
            <div className="bg-[#E21B22] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#002D72]">Manager Login</h1>
            <p className="text-gray-500 mt-2">Enter your PIN to access the dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                placeholder="Enter PIN (e.g. 0000)"
                className="w-full p-4 text-center text-2xl tracking-widest border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#E21B22] focus:border-[#E21B22] outline-none transition"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
              {loginError && <p className="text-[#E21B22] text-sm mt-2 text-center font-medium">{loginError}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-[#002D72] text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-blue-900 transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Render Helpers ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20">
      
      {/* Header */}
      <header className="bg-[#E21B22] text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Wendy's Critical Walkthrough</h1>
            <div className="flex items-center space-x-4 text-red-100 text-sm mt-1">
              <div className="flex items-center">
                <span className="font-bold mr-1">Store #</span>
                <input
                  type="text"
                  value={dayData.storeNumber || ''}
                  onChange={(e) => handleDailyUpdate('storeNumber', e.target.value)}
                  className="bg-transparent border-b border-red-300 border-dashed outline-none text-white w-12 text-center focus:border-white transition-colors"
                />
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                <input 
                  type="date" 
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-white cursor-pointer"
                />
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setViewMode(viewMode === 'form' ? 'print' : 'form')}
              className="p-2 bg-white/20 rounded hover:bg-white/30 transition"
            >
              {viewMode === 'form' ? <Printer className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            </button>
            {viewMode === 'print' && (
               <button 
                 onClick={handleGenerateEmail}
                 disabled={isGeneratingEmail}
                 title={`✨ AI Draft ${activeShift} Email Summary`}
                 className={`p-2 bg-white text-[#E21B22] rounded hover:bg-gray-100 transition shadow flex items-center ${isGeneratingEmail ? 'opacity-70' : ''}`}
               >
                 {isGeneratingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
               </button>
            )}
          </div>
        </div>
      </header>

      {viewMode === 'print' ? (
        <PrintReport dayData={dayData} currentDate={currentDate} />
      ) : (
        <main className="max-w-3xl mx-auto p-4 space-y-6">
          
          {/* Tabs */}
          <div className="flex space-x-2 border-b border-gray-200 pb-2 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('walkthrough')}
              className={`px-4 py-2 font-bold rounded-t-lg transition whitespace-nowrap ${activeTab === 'walkthrough' ? 'bg-[#002D72] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
              Daily Walkthrough
            </button>
            <button 
              onClick={() => setActiveTab('shiftReport')}
              className={`px-4 py-2 font-bold rounded-t-lg transition whitespace-nowrap ${activeTab === 'shiftReport' ? 'bg-[#002D72] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
              Shift Report
            </button>
            <button 
              onClick={() => setActiveTab('closing')}
              className={`px-4 py-2 font-bold rounded-t-lg transition whitespace-nowrap ${activeTab === 'closing' ? 'bg-[#002D72] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
              Closing Duties
            </button>
          </div>

          {activeTab === 'walkthrough' ? (
            <>
              {/* Shift Selector */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex space-x-1 overflow-x-auto">
            {SHIFTS.map(shift => (
              <button
                key={shift}
                onClick={() => setActiveShift(shift)}
                className={`flex-1 min-w-[60px] py-2 px-3 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                  activeShift === shift 
                  ? 'bg-[#002D72] text-white shadow' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-50'
                }`}
              >
                {shift}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center px-1">
            <h2 className="text-2xl font-bold text-[#002D72]">{activeShift} Shift Check</h2>
            {isSaving && <span className="text-sm text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Saved to Cloud</span>}
          </div>

          {/* Form for Active Shift */}
          <div className="space-y-4">
            
            {/* Manager Initials */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <User className="w-4 h-4 mr-2 text-[#E21B22]"/>
                Shift Manager Initials
              </label>
              <input 
                type="text" 
                placeholder="Enter initials to sign off..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E21B22] focus:border-[#E21B22] outline-none uppercase"
                value={dayData.shifts[activeShift].initials || ''}
                onChange={(e) => handleShiftUpdate('initials', e.target.value)}
              />
            </div>

            {/* General & Hygiene */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-[#002D72] mb-3 border-b pb-2">1. General & Hygiene</h3>
              <div className="space-y-3">
                {BOOLEAN_CHECKS.map(check => (
                  <label key={check.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox"
                      className="mt-1 w-6 h-6 rounded text-[#E21B22] focus:ring-[#E21B22] cursor-pointer"
                      checked={dayData.shifts[activeShift][check.id] || false}
                      onChange={(e) => handleShiftUpdate(check.id, e.target.checked)}
                    />
                    <span className="text-sm text-gray-700 leading-snug">{check.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Values & Temps */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-[#002D72] mb-3 border-b pb-2">2. Logs & Temperatures</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {VALUE_CHECKS.map(check => (
                  <div key={check.id} className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-600 mb-1">{check.label}</label>
                    <input 
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002D72] outline-none"
                      placeholder="e.g. 200 or 38°"
                      value={dayData.shifts[activeShift][check.id] || ''}
                      onChange={(e) => handleShiftUpdate(check.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Day Dots */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-[#002D72] mb-3 border-b pb-2">3. Online Hold Times (Day Dots)</h3>
              <div className="space-y-4">
                {DAY_DOT_CHECKS.map(check => (
                  <div key={check.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-800 mb-2">{check.label}</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-bold">Created (S)</span>
                        <input 
                          type="time" 
                          className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none"
                          value={dayData.shifts[activeShift][`${check.id}_start`] || ''}
                          onChange={(e) => handleShiftUpdate(`${check.id}_start`, e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-bold">Expires (E)</span>
                        <input 
                          type="time" 
                          className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none"
                          value={dayData.shifts[activeShift][`${check.id}_end`] || ''}
                          onChange={(e) => handleShiftUpdate(`${check.id}_end`, e.target.value)}
                        />
                      </div>
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        className="w-5 h-5 text-[#E21B22] rounded"
                        checked={dayData.shifts[activeShift][`${check.id}_new`] || false}
                        onChange={(e) => handleShiftUpdate(`${check.id}_new`, e.target.checked)}
                      />
                      <span className="text-sm font-semibold text-gray-700">New day dot pulled during shift</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Walk-in Checks */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
               <h3 className="text-lg font-bold text-[#002D72] mb-3 border-b pb-2">4. Daily Walk-In Checks</h3>
               <p className="text-xs text-gray-500 mb-3">These apply to the whole day, regardless of shift.</p>
               
               <div className="mb-4">
                 <label className="text-xs font-semibold text-gray-600 mb-1 block">Raw Beef Date (from case)</label>
                 <input 
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-lg outline-none"
                    placeholder="e.g. 10/25"
                    value={dayData.beefDate || ''}
                    onChange={(e) => handleDailyUpdate('beefDate', e.target.value)}
                  />
               </div>

               <div className="space-y-3">
                 {DAILY_CHECKS.map(check => (
                    <label key={check.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input 
                        type="checkbox"
                        className="mt-1 w-6 h-6 rounded text-[#002D72] cursor-pointer"
                        checked={dayData.dailyChecks[check.id] || false}
                        onChange={(e) => handleDailyCheckUpdate(check.id, e.target.checked)}
                      />
                      <span className="text-sm text-gray-700 leading-snug">{check.label}</span>
                    </label>
                 ))}
               </div>
            </div>

            {/* Corrective Actions */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E21B22]/20">
               <h3 className="text-lg font-bold text-[#E21B22] mb-3 flex items-center">
                 <AlertTriangle className="w-5 h-5 mr-2" />
                 5. Corrective Actions
               </h3>
               <div className="space-y-3">
                 <div>
                   <label className="text-xs font-semibold text-gray-600 mb-1 block">Immediate actions taken:</label>
                   <textarea 
                     className="w-full p-2 border border-gray-300 rounded-lg outline-none h-20 resize-none"
                     placeholder="Document any failures and what was fixed..."
                     value={dayData.correctiveActions || ''}
                     onChange={(e) => handleDailyUpdate('correctiveActions', e.target.value)}
                   />
                 </div>
                 <div>
                   <div className="flex justify-between items-end mb-1">
                     <label className="text-xs font-semibold text-gray-600 block">Ongoing issues / Root Cause & Action Plan:</label>
                     <button
                        onClick={handleGenerateActionPlan}
                        disabled={isGeneratingAction || !dayData.correctiveActions}
                        className="text-xs bg-[#E21B22]/10 text-[#E21B22] font-bold px-2 py-1 rounded hover:bg-[#E21B22]/20 disabled:opacity-50 transition flex items-center"
                     >
                       {isGeneratingAction ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Sparkles className="w-3 h-3 mr-1"/>}
                       ✨ AI Draft Action Plan
                     </button>
                   </div>
                   <textarea 
                     className="w-full p-2 border border-gray-300 rounded-lg outline-none h-20 resize-none"
                     placeholder="Describe root cause..."
                     value={dayData.rootCause || ''}
                     onChange={(e) => handleDailyUpdate('rootCause', e.target.value)}
                   />
                 </div>
               </div>
            </div>

            {/* Complete Shift Button */}
            <div className="mt-8">
              <button 
                onClick={handleGenerateEmail}
                disabled={isGeneratingEmail}
                className={`w-full bg-[#E21B22] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition flex items-center justify-center ${isGeneratingEmail ? 'opacity-70' : ''}`}
              >
                {isGeneratingEmail ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Mail className="w-6 h-6 mr-2" />}
                Complete Shift & Email Summary
              </button>
              <p className="text-center text-sm text-gray-500 mt-2">
                This will generate an email to wendys283@divinellc.com with the shift details.
              </p>
            </div>

            {/* Quick Reference Guide */}
            <div className="bg-[#002D72] text-white p-4 rounded-xl shadow-sm mt-4">
               <h3 className="font-bold mb-2 text-center border-b border-white/20 pb-2">Temperature Reference Guide</h3>
               <div className="grid grid-cols-2 gap-4 text-xs">
                 <div>
                   <span className="block font-bold text-red-200 mb-1">Hot Holding ({'>'} 135°F)</span>
                   <p className="opacity-90 leading-tight">Cheese Sauce, Gravy, Diced/Breaded Chicken, Nuggets, Beef, Sausage, Eggs, Burrito</p>
                 </div>
                 <div>
                   <span className="block font-bold text-red-200 mb-1">Cooking / Reheat</span>
                   <ul className="list-disc pl-3 opacity-90 space-y-1">
                     <li>Chili: {'>'} 165°F in 2 hrs</li>
                     <li>Beef & Eggs: {'>'} 158°F</li>
                     <li>Breaded Chkn: {'>'} 165°F</li>
                   </ul>
                 </div>
               </div>
            </div>
          </div>
          </>
          ) : activeTab === 'shiftReport' ? (
            <div className="space-y-6">
              {/* Shift Selector */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex space-x-1 overflow-x-auto">
                {SHIFTS.map(shift => (
                  <button
                    key={shift}
                    onClick={() => setActiveShift(shift)}
                    className={`flex-1 min-w-[60px] py-2 px-3 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                      activeShift === shift 
                      ? 'bg-[#002D72] text-white shadow' 
                      : 'bg-transparent text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {shift}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center px-1">
                <h2 className="text-2xl font-bold text-[#002D72]">{activeShift} Shift Report</h2>
                {isSaving && <span className="text-sm text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Saved to Cloud</span>}
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                    <input 
                      type="time" 
                      className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#002D72]"
                      value={dayData.shifts[activeShift].shiftReport?.startTime || ''}
                      onChange={(e) => handleShiftReportUpdate('startTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                    <input 
                      type="time" 
                      className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#002D72]"
                      value={dayData.shifts[activeShift].shiftReport?.endTime || ''}
                      onChange={(e) => handleShiftReportUpdate('endTime', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tasks Completed</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none h-24 resize-none focus:ring-2 focus:ring-[#002D72]"
                    placeholder="List the main tasks completed during this shift..."
                    value={dayData.shifts[activeShift].shiftReport?.tasksCompleted || ''}
                    onChange={(e) => handleShiftReportUpdate('tasksCompleted', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Issues Encountered</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none h-24 resize-none focus:ring-2 focus:ring-[#002D72]"
                    placeholder="Describe any issues, call-outs, or equipment problems..."
                    value={dayData.shifts[activeShift].shiftReport?.issuesEncountered || ''}
                    onChange={(e) => handleShiftReportUpdate('issuesEncountered', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes for Next Shift / GM</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none h-24 resize-none focus:ring-2 focus:ring-[#002D72]"
                    placeholder="Any additional notes..."
                    value={dayData.shifts[activeShift].shiftReport?.notes || ''}
                    onChange={(e) => handleShiftReportUpdate('notes', e.target.value)}
                  />
                </div>
              </div>

              {/* Submit Shift Report Button */}
              <div className="mt-8">
                <button 
                  onClick={handleGenerateEmail}
                  disabled={isGeneratingEmail}
                  className={`w-full bg-[#E21B22] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition flex items-center justify-center ${isGeneratingEmail ? 'opacity-70' : ''}`}
                >
                  {isGeneratingEmail ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Mail className="w-6 h-6 mr-2" />}
                  Submit Shift Report
                </button>
                <p className="text-center text-sm text-gray-500 mt-2">
                  This will send the shift report to the GM and save it to the cloud.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-2xl font-bold text-[#002D72]">End of Day Closing</h2>
                {isSaving && <span className="text-sm text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Saved to Cloud</span>}
              </div>

              {/* Closing Notes */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#002D72] mb-3 border-b pb-2">Closing Recap & Notes</h3>
                <textarea 
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none h-32 resize-none focus:ring-2 focus:ring-[#002D72]"
                  placeholder="Leave notes about the shift, restaurant, or anything the GM/other managers should know..."
                  value={dayData.closing.notes || ''}
                  onChange={(e) => handleClosingUpdate('notes', e.target.value)}
                />
              </div>

              {/* Closing Checklist */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#002D72] mb-3 border-b pb-2">Closing Checklist</h3>
                
                {['Preclose Tasks', 'After Close Cash', 'After Close Inventory'].map(section => (
                  <div key={section} className="mb-4 last:mb-0">
                    <h4 className="font-semibold text-gray-700 mb-2 bg-gray-100 px-2 py-1 rounded">{section}</h4>
                    <div className="space-y-2 pl-2">
                      {CLOSING_TASKS.filter(t => t.section === section).map(task => (
                        <label key={task.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox"
                            className="w-5 h-5 rounded text-[#E21B22] focus:ring-[#E21B22] cursor-pointer"
                            checked={dayData.closing.checklist[task.id] || false}
                            onChange={(e) => handleClosingChecklistUpdate(task.id, e.target.checked)}
                          />
                          <span className="text-sm text-gray-800">{task.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Inventory Count */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#002D72] mb-3 border-b pb-2">Daily Inventory Count</h3>
                
                <div className="space-y-6">
                  {/* Freezer */}
                  <div>
                    <h4 className="font-bold text-white bg-gray-800 px-3 py-2 rounded-t-lg">1. Freezer</h4>
                    <div className="border border-gray-200 rounded-b-lg p-3 space-y-4">
                      {INVENTORY_FREEZER.map(item => (
                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                          <span className="font-semibold text-sm text-gray-700 mb-2 md:mb-0 md:w-1/2">{item.label}</span>
                          <div className="flex space-x-2 md:w-1/2 justify-end">
                            {item.fields.map(field => (
                              <div key={field} className="flex flex-col items-center w-16">
                                <span className="text-[10px] text-gray-500 uppercase mb-1">{field}</span>
                                <input 
                                  type="text"
                                  className="w-full p-1.5 text-center border border-gray-300 rounded outline-none focus:border-[#002D72] text-sm"
                                  value={dayData.closing.inventory.freezer[item.id]?.[field.toLowerCase()] || ''}
                                  onChange={(e) => handleInventoryUpdate('freezer', item.id, field.toLowerCase(), e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cooler */}
                  <div>
                    <h4 className="font-bold text-white bg-gray-800 px-3 py-2 rounded-t-lg">2. Cooler</h4>
                    <div className="border border-gray-200 rounded-b-lg p-3 space-y-4">
                      {INVENTORY_COOLER.map(item => (
                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                          <span className="font-semibold text-sm text-gray-700 mb-2 md:mb-0 md:w-1/2">{item.label}</span>
                          <div className="flex space-x-2 md:w-1/2 justify-end">
                            {item.fields.map(field => (
                              <div key={field} className="flex flex-col items-center w-16">
                                <span className="text-[10px] text-gray-500 uppercase mb-1">{field}</span>
                                <input 
                                  type="text"
                                  className="w-full p-1.5 text-center border border-gray-300 rounded outline-none focus:border-[#002D72] text-sm"
                                  value={dayData.closing.inventory.cooler[item.id]?.[field.toLowerCase()] || ''}
                                  onChange={(e) => handleInventoryUpdate('cooler', item.id, field.toLowerCase(), e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete Closing Button */}
              <div className="mt-8">
                <button 
                  onClick={handleGenerateEmail}
                  disabled={isGeneratingEmail}
                  className={`w-full bg-[#E21B22] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition flex items-center justify-center ${isGeneratingEmail ? 'opacity-70' : ''}`}
                >
                  {isGeneratingEmail ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Mail className="w-6 h-6 mr-2" />}
                  Submit Closing Report & Email
                </button>
                <p className="text-center text-sm text-gray-500 mt-2">
                  This will generate an end-of-day email to wendys283@divinellc.com.
                </p>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

// --- Print / Report View Component ---
function PrintReport({ dayData, currentDate }: { dayData: any, currentDate: string }) {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-white my-4 shadow-lg print:shadow-none print:m-0">
       <div className="text-center mb-6 border-b-2 border-black pb-4">
         <h1 className="text-2xl font-black uppercase tracking-wider">Wendy's Critical Walkthrough & Food Safety Log</h1>
         <p className="text-lg mt-2">Store #: <strong>{dayData.storeNumber || '283'}</strong> <span className="mx-2">|</span> Date: <strong>{currentDate}</strong></p>
       </div>

       {/* Signoffs */}
       <table className="w-full text-sm mb-6 border-collapse">
         <thead>
           <tr>
             <th className="border border-black p-2 bg-gray-200 text-left">Shift Manager Sign-off</th>
             {SHIFTS.map(s => <th key={s} className="border border-black p-2 bg-gray-200 text-center w-24">{s}</th>)}
           </tr>
         </thead>
         <tbody>
           <tr>
             <td className="border border-black p-2 font-semibold">Initials</td>
             {SHIFTS.map(s => <td key={s} className="border border-black p-2 text-center uppercase font-bold text-[#E21B22]">{dayData.shifts[s].initials}</td>)}
           </tr>
         </tbody>
       </table>

       {/* General Checks Table */}
       <h2 className="font-bold text-lg mb-2 bg-gray-200 p-1 border border-black border-b-0">1. General & Station Checks</h2>
       <table className="w-full text-xs mb-6 border-collapse">
         <tbody>
           {BOOLEAN_CHECKS.map(check => (
             <tr key={check.id}>
               <td className="border border-black p-1.5">{check.label}</td>
               {SHIFTS.map(s => (
                 <td key={s} className="border border-black p-1.5 text-center w-12 font-bold">
                   {dayData.shifts[s][check.id] ? '✓' : ''}
                 </td>
               ))}
             </tr>
           ))}
         </tbody>
       </table>

       {/* Temps & Day Dots Table */}
       <h2 className="font-bold text-lg mb-2 bg-gray-200 p-1 border border-black border-b-0">2. Hold Times & Temperatures</h2>
       <table className="w-full text-xs mb-6 border-collapse">
         <tbody>
           {VALUE_CHECKS.map(check => (
             <tr key={check.id}>
               <td className="border border-black p-1.5">{check.label}</td>
               {SHIFTS.map(s => (
                 <td key={s} className="border border-black p-1.5 text-center w-20">
                   {dayData.shifts[s][check.id] || '-'}
                 </td>
               ))}
             </tr>
           ))}
           {DAY_DOT_CHECKS.map(check => (
             <tr key={check.id}>
               <td className="border border-black p-1.5">{check.label}</td>
               {SHIFTS.map(s => {
                 const d = dayData.shifts[s];
                 const hasData = d[`${check.id}_start`] || d[`${check.id}_end`] || d[`${check.id}_new`];
                 return (
                   <td key={s} className="border border-black p-1 text-center text-[10px] leading-tight w-20">
                     {hasData ? (
                       <>
                         <div>S: {d[`${check.id}_start`] || '--'}</div>
                         <div>E: {d[`${check.id}_end`] || '--'}</div>
                         {d[`${check.id}_new`] && <div className="font-bold mt-0.5">NEW DOT ✓</div>}
                       </>
                     ) : '-'}
                   </td>
                 );
               })}
             </tr>
           ))}
         </tbody>
       </table>

       {/* Daily Checks & Actions Side-by-Side */}
       <div className="grid grid-cols-2 gap-4">
         <div>
            <h2 className="font-bold text-lg mb-2 bg-gray-200 p-1 border border-black border-b-0">3. Walk-In & Daily Checks</h2>
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr>
                  <td className="border border-black p-1.5">Raw Beef Date (from case)</td>
                  <td className="border border-black p-1.5 text-center font-bold">{dayData.beefDate}</td>
                </tr>
                {DAILY_CHECKS.map(check => (
                  <tr key={check.id}>
                    <td className="border border-black p-1.5">{check.label}</td>
                    <td className="border border-black p-1.5 text-center w-12 font-bold">{dayData.dailyChecks[check.id] ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
         <div>
            <h2 className="font-bold text-lg mb-2 bg-gray-200 p-1 border border-black border-b-0 text-[#E21B22]">4. Corrective Actions</h2>
            <div className="border border-black p-2 min-h-[100px] mb-4 text-sm whitespace-pre-wrap">
              <strong>Immediate Actions:</strong><br/>
              {dayData.correctiveActions || 'None'}
            </div>
            <div className="border border-black p-2 min-h-[100px] text-sm whitespace-pre-wrap">
              <strong>Root Cause & Plan:</strong><br/>
              {dayData.rootCause || 'None'}
            </div>
         </div>
       </div>

       {/* Print instructions hidden during actual printing */}
       <div className="mt-8 text-center print:hidden">
         <button 
            onClick={() => window.print()} 
            className="bg-[#002D72] text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-blue-900 flex items-center justify-center mx-auto"
         >
           <Printer className="w-5 h-5 mr-2" /> Print PDF / Save to Files
         </button>
       </div>
    </div>
  );
}
