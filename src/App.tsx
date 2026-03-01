/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  FileText, 
  Keyboard, 
  Settings, 
  Lock, 
  Info, 
  Loader2, 
  ChevronRight,
  Calculator,
  IndianRupee,
  TrendingUp,
  ShieldCheck,
  Zap,
  AlertCircle
} from 'lucide-react';
import { PDFUploader } from './components/PDFUploader';
import { Dashboard } from './components/Dashboard';
import { extractLoanMetadata, LoanMetadata } from './services/gemini';
import { rate, pmt, formatIndianCurrency, parseCurrency } from './utils/finance';
import { GoogleGenAI } from '@google/genai';

export default function App() {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    actualRoi: number;
    statedRoi: number;
    netSavings: number;
    grossSavings: number;
    totalSwitchCosts: number;
    exitCosts: number;
    entryCosts: number;
    breakEvenMonths: number;
    foir: number;
    isHighStress: boolean;
    consolidationLoanRate: number;
    newConsolidatedEmi: number;
    cashFlowImprovement: number;
    totalDebt: number;
    totalOldEmi: number;
    confidenceScore: number;
    insiderTip: string;
    hiddenCharges: any[];
    sourcePages: { [key: string]: number };
    validationOffer?: {
      rate: number;
      emi: number;
      processingFee: number;
      verdict: 'green' | 'yellow' | 'red';
      verdictText: string;
      netMonthlyBenefit: number;
    };
  } | null>(null);

  const [newOffer, setNewOffer] = useState({
    rate: 9.5,
    emi: 0,
    processingFee: 5000,
  });

  const [isValidationMode, setIsValidationMode] = useState(false);

  // Manual inputs
  const [manualData, setManualData] = useState<Omit<LoanMetadata, 'confidenceScore' | 'sourcePages'>>({
    principal: 500000,
    currentOutstanding: 450000,
    emiAmount: 15000,
    statedRoi: 10.5,
    remainingTenure: 48,
    foreclosurePenaltyPct: 2.0,
    processingFee: 5000,
    legalValuationCharges: 5000,
    stampDutyPct: 0.3,
    salary: 50000,
    cibilScore: 750,
    otherLoans: [],
    hiddenCharges: []
  });

  const [extractionSource, setExtractionSource] = useState<{[key: string]: 'ai' | 'manual'}>({});

  const handleTextExtracted = async (text: string) => {
    console.log("PDF Text Extracted, length:", text.length);
    setIsLoading(true);
    try {
      console.log("Calling Gemini for extraction...");
      const data = await extractLoanMetadata(text);
      console.log("Extraction successful:", data);
      setManualData(data);
      
      // Track which fields were extracted by AI
      const sources: any = {};
      Object.keys(data).forEach(key => {
        // If it's in sourcePages, it was definitely found by AI (even if it's 0)
        if (data.sourcePages && (data.sourcePages as any)[key] !== undefined) {
          sources[key] = 'ai';
        } else if ((data as any)[key] !== undefined && (data as any)[key] !== 0 && (data as any)[key] !== null) {
          // Fallback for fields not in sourcePages (like hiddenCharges or otherLoans)
          sources[key] = 'ai';
        }
      });
      setExtractionSource(sources);
      
      // We don't auto-calculate here to let user review the data
    } catch (error: any) {
      console.error("Extraction failed:", error);
      alert(`AI failed to read the document: ${error.message || 'Unknown error'}. Please enter details manually.`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setManualData({ ...manualData, [field]: value });
    setExtractionSource({ ...extractionSource, [field]: 'manual' });
  };

  const handleManualSubmit = () => {
    calculateResults(manualData as LoanMetadata);
  };

  const calculateResults = (data: LoanMetadata) => {
    const { 
      currentOutstanding, 
      emiAmount, 
      remainingTenure, 
      foreclosurePenaltyPct, 
      statedRoi, 
      processingFee, 
      legalValuationCharges,
      stampDutyPct,
      salary,
      cibilScore,
      otherLoans,
      hiddenCharges, 
      sourcePages 
    } = data;
    
    // 1. Calculate ACTUAL IRR
    const processingFeeWithGst = processingFee * 1.18;
    
    const upfrontCharges = hiddenCharges
      .filter(c => c.type === 'upfront')
      .reduce((sum, c) => sum + c.amount, 0) + processingFeeWithGst;
    
    const recurringCharges = hiddenCharges
      .filter(c => c.type === 'recurring')
      .reduce((sum, c) => sum + c.amount, 0);

    const effectiveEmi = emiAmount + recurringCharges;
    const netOutstanding = currentOutstanding - upfrontCharges; 
    
    const monthlyRate = rate(remainingTenure, -effectiveEmi, netOutstanding);
    const actualAnnualRoi = monthlyRate * 12 * 100;

    // 2. Calculate Savings at Market Rate (9.25%)
    const marketRate = 9.25;
    const marketMonthlyRate = (marketRate / 100) / 12;
    const newEmi = -pmt(marketMonthlyRate, remainingTenure, currentOutstanding);
    
    const monthlySaving = effectiveEmi - newEmi;
    const totalGrossSaving = monthlySaving * remainingTenure;

    // 3. Switching Cost Logic (The Honest Math)
    const exitCosts = (currentOutstanding * (foreclosurePenaltyPct / 100)) * 1.18;
    const newProcessingFee = 5000; 
    const entryCosts = (newProcessingFee * 1.18) + legalValuationCharges + (currentOutstanding * (stampDutyPct / 100));
    
    const totalSwitchCosts = exitCosts + entryCosts;
    const netSaving = totalGrossSaving - totalSwitchCosts;

    // 4. Break-even Analysis
    const breakEvenMonths = monthlySaving > 0 ? Math.ceil(totalSwitchCosts / monthlySaving) : 0;

    // 5. Consolidation Logic
    const totalOtherEmi = otherLoans.reduce((sum, loan) => sum + loan.emi, 0);
    const totalOtherBalance = otherLoans.reduce((sum, loan) => sum + loan.balance, 0);
    
    const totalOldEmi = effectiveEmi + totalOtherEmi;
    const totalDebt = currentOutstanding + totalOtherBalance;
    
    const foir = salary > 0 ? (totalOldEmi / salary) * 100 : 0;
    const isHighStress = foir > 50;

    // Recommend rate based on CIBIL
    let consolidationLoanRate = 14; // Default/Low CIBIL
    if (cibilScore >= 750) consolidationLoanRate = 10.5;
    else if (cibilScore >= 700) consolidationLoanRate = 12;
    
    const consolidationMonthlyRate = (consolidationLoanRate / 100) / 12;
    // Assume a fresh 60 month tenure for consolidation to ease cash flow
    const consolidationTenure = 60; 
    const newConsolidatedEmi = -pmt(consolidationMonthlyRate, consolidationTenure, totalDebt);
    
    const cashFlowImprovement = totalOldEmi - newConsolidatedEmi;

    // 6. Insider Tip
    const diff = actualAnnualRoi - statedRoi;
    let tip = "Your loan seems fairly priced. However, switching to a lower rate could still save you money.";
    
    if (isHighStress) {
      tip = `CRITICAL: Your Debt-to-Income ratio (FOIR) is ${foir.toFixed(0)}%. You are in the 'High Financial Stress' zone. Consolidation is urgent to avoid default and save ₹${cashFlowImprovement.toLocaleString('en-IN')} per month.`;
    } else if (hiddenCharges.length > 0) {
      tip = `Forensic audit found ${hiddenCharges.length} hidden charges totaling ₹${hiddenCharges.reduce((s, c) => s + c.amount, 0).toLocaleString('en-IN')}. These are inflating your real interest rate.`;
    } else if (diff > 1) {
      tip = `The bank is charging you ${diff.toFixed(2)}% more than the stated rate through hidden compounding or fees. Demand a rate reset or switch immediately.`;
    } else if (netSaving > 50000) {
      tip = "The high net savings indicate that even with the foreclosure penalty, you are losing significant wealth to interest. Refinance within this quarter.";
    }

    setResults({
      actualRoi: actualAnnualRoi,
      statedRoi: statedRoi,
      netSavings: Math.max(0, Math.round(netSaving)),
      grossSavings: Math.round(totalGrossSaving),
      totalSwitchCosts: Math.round(totalSwitchCosts),
      exitCosts: Math.round(exitCosts),
      entryCosts: Math.round(entryCosts),
      breakEvenMonths: breakEvenMonths,
      foir: foir,
      isHighStress: isHighStress,
      consolidationLoanRate: consolidationLoanRate,
      newConsolidatedEmi: Math.round(newConsolidatedEmi),
      cashFlowImprovement: Math.round(cashFlowImprovement),
      totalDebt: Math.round(totalDebt),
      totalOldEmi: Math.round(totalOldEmi),
      confidenceScore: data.confidenceScore,
      insiderTip: tip,
      hiddenCharges: hiddenCharges,
      sourcePages: sourcePages || {}
    });
  };

  const runFinalValidation = () => {
    if (!results) return;

    const { currentOutstanding, foreclosurePenaltyPct, legalValuationCharges, stampDutyPct } = manualData;
    const oldEmi = results.totalOldEmi;
    
    // Calculate switching costs for the NEW offer
    const exitCosts = (currentOutstanding * (foreclosurePenaltyPct / 100)) * 1.18;
    const entryCosts = (newOffer.processingFee * 1.18) + legalValuationCharges + (currentOutstanding * (stampDutyPct / 100));
    const totalSwitchCosts = exitCosts + entryCosts;

    // Monthly benefit
    const netMonthlyBenefit = oldEmi - newOffer.emi;
    
    // Decision Logic
    let verdict: 'green' | 'yellow' | 'red' = 'green';
    let verdictText = '';

    const marketRate = 9.25; // Our AI's ideal suggestion used in calculateResults
    const suggestedRate = results.consolidationLoanRate || marketRate;

    if (newOffer.rate > suggestedRate + 1) {
      verdict = 'red';
      verdictText = `Caution! The bank offered ${newOffer.rate}%, which is much more expensive than our goal of ${suggestedRate}%. At this rate, you are better off keeping your current loan.`;
    } else if (newOffer.processingFee > 20000) {
      verdict = 'yellow';
      verdictText = `Wait! The interest rate is good, but the bank is charging ₹${newOffer.processingFee.toLocaleString('en-IN')} just to start the loan. This "entry fee" is too high and will eat up your savings for a long time.`;
    } else if (netMonthlyBenefit < 500) {
      verdict = 'red';
      verdictText = `Don't do it! You'll only save about ₹${netMonthlyBenefit.toFixed(0)} each month. After paying all the bank's fees to switch, it's just not worth the headache.`;
    } else if (newOffer.rate <= suggestedRate) {
      verdict = 'green';
      verdictText = `Great news! The bank gave you a fair deal at ${newOffer.rate}%. This matches our goal perfectly. You should sign this offer today!`;
    } else {
      verdict = 'green';
      verdictText = `This is a solid offer. Even though it's slightly above our "perfect" goal, you'll still have ₹${netMonthlyBenefit.toLocaleString('en-IN')} extra in your pocket every month.`;
    }

    setResults({
      ...results,
      validationOffer: {
        rate: newOffer.rate,
        emi: newOffer.emi,
        processingFee: newOffer.processingFee,
        verdict,
        verdictText,
        netMonthlyBenefit
      }
    });
    setIsValidationMode(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-slate-900 text-white p-6 flex flex-col border-r border-slate-800">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 bg-emerald-500 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">DebtGuard AI</h1>
        </div>

        <div className="space-y-2">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Audit Workspace</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload documents to auto-fill or manually verify your loan terms.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Lock size={14} />
              <span>Privacy Mode</span>
            </div>
            <button
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                isPrivacyMode ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${
                  isPrivacyMode ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
          
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Info size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Security Note</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Documents are processed in-memory and never stored on our servers. 
              {isPrivacyMode && " Privacy mode active: no session data retained."}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <header className="mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              The Interest <span className="gradient-text">Truth Scanner</span>
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl">
              Banks often hide the true cost of debt in complex compounding. 
              We use IRR math to find your real ROI and potential savings.
            </p>
          </header>

          <AnimatePresence mode="wait">
            {!results ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Left Column: Audit Sheet */}
                <div className="lg:col-span-8 space-y-8">
                  <div className="glass-card p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="text-emerald-600" />
                        Forensic Audit Sheet
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto-Fill Ready</span>
                        <Zap size={14} className="text-yellow-500 fill-yellow-500" />
                      </div>
                    </div>

                    {/* PDF Dropzone Integration */}
                    <div className="mb-12 p-6 bg-emerald-50/50 border-2 border-dashed border-emerald-200 rounded-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                          <Zap size={16} className="text-yellow-500 fill-yellow-500" />
                          AI Fast-Track: Upload PDF to Auto-Fill
                        </h4>
                      </div>
                      <PDFUploader onTextExtracted={handleTextExtracted} isLoading={isLoading} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                        { label: 'Outstanding Balance (₹)', field: 'currentOutstanding', icon: <IndianRupee size={16} />, placeholder: 'e.g. 4,50,000' },
                        { label: 'Monthly EMI (₹)', field: 'emiAmount', icon: <Calculator size={16} />, placeholder: 'e.g. 15,000' },
                        { label: 'Tenure Remaining (Months)', field: 'remainingTenure', icon: <Settings size={16} />, placeholder: 'e.g. 48' },
                        { label: 'Stated ROI (%)', field: 'statedRoi', icon: <TrendingUp size={16} />, placeholder: 'e.g. 10.5' },
                        { label: 'Foreclosure Penalty (%)', field: 'foreclosurePenaltyPct', icon: <Shield size={16} />, placeholder: 'e.g. 2.0' },
                        { label: 'Processing Fee (₹)', field: 'processingFee', icon: <IndianRupee size={16} />, placeholder: 'e.g. 5,000' },
                      ].map((item) => (
                        <div key={item.field} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                              {item.label}
                            </label>
                            {extractionSource[item.field] === 'ai' && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <ShieldCheck size={10} /> AI Extracted
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                              {item.icon}
                            </div>
                            <input
                              type="text"
                              value={formatIndianCurrency((manualData as any)[item.field])}
                              onChange={(e) => updateField(item.field, parseCurrency(e.target.value))}
                              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                                extractionSource[item.field] === 'ai' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50 border-slate-200'
                              }`}
                              placeholder={item.placeholder}
                            />
                          </div>
                        </div>
                      ))}
                      
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Legal/Valuation (₹)</label>
                        <input
                          type="text"
                          value={formatIndianCurrency(manualData.legalValuationCharges)}
                          onChange={(e) => updateField('legalValuationCharges', parseCurrency(e.target.value))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Stamp Duty (%)</label>
                        <input
                          type="text"
                          value={formatIndianCurrency(manualData.stampDutyPct)}
                          onChange={(e) => updateField('stampDutyPct', parseCurrency(e.target.value))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <TrendingUp className="text-emerald-600" />
                        Financial Profile
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Monthly Take-Home Salary (₹)</label>
                            {extractionSource.salary === 'ai' && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">AI Extracted</span>}
                          </div>
                          <div className="relative">
                            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                              type="text"
                              value={formatIndianCurrency(manualData.salary)}
                              onChange={(e) => updateField('salary', parseCurrency(e.target.value))}
                              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Estimated CIBIL Score</label>
                            {extractionSource.cibilScore === 'ai' && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">AI Extracted</span>}
                          </div>
                          <input
                            type="text"
                            value={formatIndianCurrency(manualData.cibilScore)}
                            onChange={(e) => updateField('cibilScore', parseCurrency(e.target.value))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <Shield className="text-emerald-600" />
                          Debt Audit (Other Loans)
                        </h3>
                        <button
                          onClick={() => updateField('otherLoans', [...manualData.otherLoans, { type: 'Personal Loan', balance: 0, emi: 0, interestRate: 12 }])}
                          className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-all flex items-center gap-2"
                        >
                          + Add Another Loan
                        </button>
                      </div>

                      {manualData.otherLoans.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                          <p className="text-slate-400">No other loans added. AI will search for these in your PDF.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {manualData.otherLoans.map((loan, idx) => (
                            <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 relative group">
                              <button
                                onClick={() => {
                                  const newLoans = [...manualData.otherLoans];
                                  newLoans.splice(idx, 1);
                                  updateField('otherLoans', newLoans);
                                }}
                                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                Remove
                              </button>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Loan Type</label>
                                  <select
                                    value={loan.type}
                                    onChange={(e) => {
                                      const newLoans = [...manualData.otherLoans];
                                      newLoans[idx] = { ...newLoans[idx], type: e.target.value };
                                      updateField('otherLoans', newLoans);
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm"
                                  >
                                    <option>Credit Card</option>
                                    <option>Personal Loan</option>
                                    <option>App Loan</option>
                                    <option>Car Loan</option>
                                    <option>Other</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Balance (₹)</label>
                                  <input
                                    type="text"
                                    value={formatIndianCurrency(loan.balance)}
                                    onChange={(e) => {
                                      const newLoans = [...manualData.otherLoans];
                                      newLoans[idx] = { ...newLoans[idx], balance: parseCurrency(e.target.value) };
                                      updateField('otherLoans', newLoans);
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">EMI (₹)</label>
                                  <input
                                    type="text"
                                    value={formatIndianCurrency(loan.emi)}
                                    onChange={(e) => {
                                      const newLoans = [...manualData.otherLoans];
                                      newLoans[idx] = { ...newLoans[idx], emi: parseCurrency(e.target.value) };
                                      updateField('otherLoans', newLoans);
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Interest (%)</label>
                                  <input
                                    type="text"
                                    value={formatIndianCurrency(loan.interestRate)}
                                    onChange={(e) => {
                                      const newLoans = [...manualData.otherLoans];
                                      newLoans[idx] = { ...newLoans[idx], interestRate: parseCurrency(e.target.value) };
                                      updateField('otherLoans', newLoans);
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleManualSubmit}
                      disabled={!manualData.currentOutstanding || !manualData.emiAmount || !manualData.remainingTenure}
                      className="w-full mt-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                    >
                      Generate Forensic Audit Report
                      <ChevronRight />
                    </button>
                  </div>
                </div>

                {/* Right Column: AI Auditor Sidebar */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="sticky top-8">
                    <div className="glass-card p-6 bg-slate-900 text-white border-none">
                      <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-emerald-400">
                        <Zap size={20} className="text-yellow-400" />
                        AI Auditor Insights
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                          <p className="text-sm text-slate-300 italic">
                            {isLoading 
                              ? "Scanning document for hidden ROI traps and foreclosure penalties..." 
                              : extractionSource.principal 
                                ? "I've extracted the core terms. Please verify the 'Financial Profile' to optimize your consolidation rate."
                                : "I'm ready to scan your document. Upload a PDF to auto-fill the audit sheet."}
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Audit Checklist</h4>
                          {[
                            { label: 'Foreclosure Penalties', status: extractionSource.foreclosurePenaltyPct === 'ai' ? 'found' : 'pending' },
                            { label: 'Hidden ROI Components', status: (extractionSource.statedRoi === 'ai' || extractionSource.hiddenCharges === 'ai') ? 'found' : 'pending' },
                            { label: 'Salary Verification', status: extractionSource.salary === 'ai' ? 'found' : 'pending' },
                            { label: 'Other Debt Detection', status: (extractionSource.otherLoans === 'ai' || manualData.otherLoans.length > 0) ? 'found' : 'pending' },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">{item.label}</span>
                              <span className={`text-[10px] font-bold uppercase ${item.status === 'found' ? 'text-emerald-400' : 'text-yellow-500'}`}>
                                {item.status === 'found' ? 'Verified' : 'Waiting...'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 p-6 bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100">
                      <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <AlertCircle size={18} className="text-emerald-600" />
                        Smart Suggestions
                      </h4>
                      <div className="space-y-4 text-sm text-slate-600">
                        {!extractionSource.salary && (
                          <p>• We couldn't find your salary in the PDF. Adding it manually will help us calculate your FOIR stress level.</p>
                        )}
                        {manualData.otherLoans.length === 0 && (
                          <p>• Adding other existing loans (like credit cards) will unlock the 'Debt Consolidation' savings report.</p>
                        )}
                        {extractionSource.principal && (
                          <p className="text-emerald-600 font-medium">✨ AI identified your loan terms. Review the highlighted fields above.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-6 flex items-center justify-between">
                  <button
                    onClick={() => setResults(null)}
                    className="text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1"
                  >
                    ← Start New Scan
                  </button>
                  <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                    Analysis Complete
                  </div>
                </div>
                <Dashboard 
                  {...results} 
                  onVerifyQuote={() => setIsValidationMode(true)}
                  validationOffer={results.validationOffer}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validation Modal */}
          <AnimatePresence>
            {isValidationMode && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden"
                >
                  <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="text-emerald-400" />
                        Verify My Quote
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Compare the bank's real offer with our AI audit.</p>
                    </div>
                    <button 
                      onClick={() => setIsValidationMode(false)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Approved Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={newOffer.rate}
                          onChange={(e) => setNewOffer({ ...newOffer, rate: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Approved EMI (₹)</label>
                        <input
                          type="text"
                          value={formatIndianCurrency(newOffer.emi)}
                          onChange={(e) => setNewOffer({ ...newOffer, emi: parseCurrency(e.target.value) })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Final Processing Fee (₹)</label>
                        <input
                          type="text"
                          value={formatIndianCurrency(newOffer.processingFee)}
                          onChange={(e) => setNewOffer({ ...newOffer, processingFee: parseCurrency(e.target.value) })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={runFinalValidation}
                      className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                    >
                      Run Final Check <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {isLoading && (
            <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-emerald-600 animate-spin" />
                <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 w-6 h-6" />
              </div>
              <p className="mt-6 text-xl font-bold text-slate-900">Senior CA is Auditing...</p>
              <p className="text-slate-500 mt-2">Reconciling document terms with mathematical reality</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
