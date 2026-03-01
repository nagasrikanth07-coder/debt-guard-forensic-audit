import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ShieldCheck, Zap, AlertCircle, Shield, Settings } from 'lucide-react';
import { pmt } from '../utils/finance';

interface DashboardProps {
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
  onVerifyQuote?: () => void;
  validationOffer?: {
    rate: number;
    emi: number;
    processingFee: number;
    verdict: 'green' | 'yellow' | 'red';
    verdictText: string;
    netMonthlyBenefit: number;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({
  actualRoi,
  statedRoi,
  netSavings,
  grossSavings,
  totalSwitchCosts,
  exitCosts,
  entryCosts,
  breakEvenMonths,
  foir,
  isHighStress,
  consolidationLoanRate,
  newConsolidatedEmi,
  cashFlowImprovement,
  totalDebt,
  totalOldEmi,
  confidenceScore,
  insiderTip,
  hiddenCharges,
  sourcePages,
  onVerifyQuote,
  validationOffer
}) => {
  const [tenure, setTenure] = useState(60);
  const isRoiHigher = actualRoi > statedRoi + 0.1;

  const monthlyRate = (consolidationLoanRate / 100) / 12;
  const dynamicConsolidatedEmi = Math.round(-pmt(monthlyRate, tenure, totalDebt));
  const dynamicCashFlowImprovement = totalOldEmi - dynamicConsolidatedEmi;

  const PageBadge = ({ field }: { field: string }) => {
    const page = sourcePages[field];
    if (!page) return null;
    return (
      <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold border border-slate-200">
        PG {page}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Final Validation Verdict */}
      {validationOffer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-8 rounded-3xl border-2 flex flex-col md:flex-row items-center gap-8 ${
            validationOffer.verdict === 'green' ? 'bg-emerald-50 border-emerald-200' :
            validationOffer.verdict === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}
        >
          <div className="shrink-0">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
              validationOffer.verdict === 'green' ? 'bg-emerald-500' :
              validationOffer.verdict === 'yellow' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}>
              {validationOffer.verdict === 'green' ? <ShieldCheck className="text-white w-10 h-10" /> :
               validationOffer.verdict === 'yellow' ? <Zap className="text-white w-10 h-10" /> :
               <AlertCircle className="text-white w-10 h-10" />}
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className={`text-2xl font-black mb-2 ${
              validationOffer.verdict === 'green' ? 'text-emerald-900' :
              validationOffer.verdict === 'yellow' ? 'text-yellow-900' :
              'text-red-900'
            }`}>
              {validationOffer.verdict === 'green' ? '✅ YES: GREAT DEAL' :
               validationOffer.verdict === 'yellow' ? '⚠️ WAIT: HIGH FEES' :
               '❌ NO: BAD DEAL'}
            </h3>
            <p className="text-slate-700 font-medium leading-relaxed">
              {validationOffer.verdictText}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 justify-center md:justify-start">
              <div className="px-4 py-2 bg-white/50 rounded-xl border border-black/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Bank's Interest Rate</span>
                <span className="text-lg font-bold text-slate-900">{validationOffer.rate}%</span>
              </div>
              <div className="px-4 py-2 bg-white/50 rounded-xl border border-black/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Current Total EMI</span>
                <span className="text-lg font-bold text-slate-900">₹{totalOldEmi.toLocaleString('en-IN')}</span>
              </div>
              <div className="px-4 py-2 bg-white/50 rounded-xl border border-black/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">New Offered EMI</span>
                <span className="text-lg font-bold text-slate-900">₹{validationOffer.emi.toLocaleString('en-IN')}</span>
              </div>
              <div className="px-4 py-2 bg-white/50 rounded-xl border border-black/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Extra Cash Every Month</span>
                <span className={`text-lg font-bold ${validationOffer.netMonthlyBenefit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {validationOffer.netMonthlyBenefit >= 0 ? '+' : ''}₹{validationOffer.netMonthlyBenefit.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <p className="mt-4 text-[10px] text-slate-500 italic">
              * Basis of Analysis: We compare your current total monthly payments (₹{totalOldEmi.toLocaleString('en-IN')}) against the new bank's monthly payment (₹{validationOffer.emi.toLocaleString('en-IN')}). If the new payment is higher, you lose monthly cash flow.
            </p>
          </div>
        </motion.div>
      )}

      {/* Hidden Charges Alert */}
      {hiddenCharges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 text-red-700 font-bold mb-4">
            <AlertCircle className="w-5 h-5" />
            Forensic Audit: Hidden Charges Detected
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hiddenCharges.map((charge, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center">
                    <span className="font-bold text-slate-900">{charge.name}</span>
                    <span className="ml-2 px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold border border-red-100">
                      PG {charge.pageNumber}
                    </span>
                  </div>
                  <span className="text-red-600 font-bold">₹{charge.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">{charge.type}</div>
                <p className="text-sm text-slate-600 leading-tight">{charge.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Actual ROI Metric */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Actual ROI (IRR)</span>
            </div>
            <TrendingUp className={`w-5 h-5 ${isRoiHigher ? 'text-red-500' : 'text-emerald-500'}`} />
          </div>
          <div>
            <div className="text-4xl font-bold text-slate-900">{actualRoi.toFixed(2)}%</div>
            <div className="text-sm mt-2 flex flex-wrap items-center gap-2">
              <span className="text-slate-500 flex items-center">
                Stated: {statedRoi}% <PageBadge field="statedRoi" />
              </span>
              {isRoiHigher && (
                <span className="text-red-600 font-medium flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" /> Hidden Cost Found!
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Net Savings Metric */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 bg-emerald-900 text-white border-none relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Net Final Profit</span>
              <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            </div>
            <div>
              <div className="text-4xl font-bold">₹{netSavings.toLocaleString('en-IN')}</div>
              <p className="text-sm text-emerald-200 mt-2">Pure profit after recovering all switching costs</p>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <TrendingUp size={120} />
          </div>
        </motion.div>

        {/* Data Quality Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Data Quality Score</span>
            <ShieldCheck className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-4xl font-bold text-slate-900">{(confidenceScore * 100).toFixed(0)}%</div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${
                  confidenceScore > 0.8 ? 'bg-emerald-500' : confidenceScore > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${confidenceScore * 100}%` }}
              />
            </div>
            {confidenceScore < 0.7 && (
              <p className="text-xs text-yellow-600 mt-2 font-medium italic">Some values were estimated. Please verify manually.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Consolidation & FOIR Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`glass-card p-8 border-2 ${isHighStress ? 'border-red-200 bg-red-50/30' : 'border-emerald-100 bg-emerald-50/30'}`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <AlertCircle className={isHighStress ? 'text-red-500' : 'text-emerald-500'} />
              Debt-to-Income (FOIR)
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${isHighStress ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {isHighStress ? 'High Stress' : 'Healthy'}
            </span>
          </div>
          <div className="flex items-end gap-2 mb-4">
            <span className={`text-5xl font-black ${isHighStress ? 'text-red-600' : 'text-emerald-600'}`}>{foir.toFixed(0)}%</span>
            <span className="text-slate-500 mb-2 font-medium">of income goes to EMIs</span>
          </div>
          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-6">
            <div 
              className={`h-full transition-all duration-1000 ${isHighStress ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, foir)}%` }}
            />
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {isHighStress 
              ? "Your EMIs exceed 50% of your take-home pay. Banks consider this high risk. Consolidation can lower your monthly burden immediately."
              : "Your debt ratio is within safe limits. You have good leverage to negotiate better rates for your existing loans."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-8 bg-slate-900 text-white border-none relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                <Zap className="text-yellow-400" />
                Consolidation Pitch
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">CIBIL Optimized</span>
            </div>
            <div className="space-y-6">
              <div>
                <div className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-1">New Single EMI</div>
                <div className="text-4xl font-black text-white">₹{dynamicConsolidatedEmi.toLocaleString('en-IN')}</div>
                <div className="text-xs text-emerald-400 font-bold mt-1">@ {consolidationLoanRate}% for {tenure} months</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Tenure</span>
                  <span className="text-xs font-bold text-emerald-400">{tenure} Months</span>
                </div>
                <input 
                  type="range" 
                  min="12" 
                  max="120" 
                  step="12" 
                  value={tenure} 
                  onChange={(e) => setTenure(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-tighter">
                  <span>1 Yr</span>
                  <span>3 Yrs</span>
                  <span>5 Yrs</span>
                  <span>7 Yrs</span>
                  <span>10 Yrs</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <div className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-1">Monthly Cash Flow Boost</div>
                <div className="text-3xl font-black text-yellow-400">+ ₹{dynamicCashFlowImprovement.toLocaleString('en-IN')}</div>
                <p className="text-xs text-slate-500 mt-2">Extra money in your pocket every single month</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-10">
            <TrendingUp size={200} />
          </div>
        </motion.div>
      </div>

      {/* Honest Math Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-8"
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" />
            The "Honest Math" Analysis
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-bottom border-slate-100">
              <span className="text-slate-600">Gross Interest Saved</span>
              <span className="font-bold text-emerald-600">+ ₹{grossSavings.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Exit Costs (Foreclosure + GST)</span>
              <span className="font-bold text-red-500">- ₹{exitCosts.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-bottom border-slate-100">
              <span className="text-slate-600">Entry Costs (Fees, Stamp, Legal)</span>
              <span className="font-bold text-red-500">- ₹{entryCosts.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
              <span className="text-lg font-bold text-slate-900">Final Net Profit</span>
              <span className="text-2xl font-black text-emerald-600">₹{netSavings.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-sm text-emerald-800 font-medium">
              🛡️ <span className="font-bold">Zero-Surprise Guarantee:</span> You'll save ₹{(grossSavings/100000).toFixed(1)}L in interest, but you'll spend ₹{(totalSwitchCosts/1000).toFixed(0)}k on fees today. Your actual profit is ₹{(netSavings/1000).toFixed(0)}k.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8 flex flex-col"
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Zap className="text-yellow-500" />
            Break-Even Timeline
          </h3>
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center">
                <span className="text-3xl font-black text-slate-900">{breakEvenMonths}</span>
              </div>
              <div className="absolute -bottom-2 bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                Months
              </div>
            </div>
            <p className="text-slate-600 max-w-xs">
              You recover all switching fees in <span className="font-bold text-slate-900">{breakEvenMonths} months</span>. Everything after that is <span className="text-emerald-600 font-bold">pure profit</span>.
            </p>
            <div className="w-full mt-8 space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Month 0</span>
                <span>Break-even</span>
                <span>End of Loan</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full relative overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000"
                  style={{ width: `${Math.min(100, (breakEvenMonths / 60) * 100)}%` }}
                />
                <div 
                  className="absolute top-0 h-full w-1 bg-yellow-500"
                  style={{ left: `${Math.min(100, (breakEvenMonths / 60) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Verify My Quote CTA */}
      {!validationOffer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="max-w-xl">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <Shield className="text-emerald-400" />
              Check Your Bank's Real Offer
            </h3>
            <p className="text-slate-400">
              Did the bank give you a final offer? Don't sign it yet! Tell us the details and we'll check if they've hidden any new fees or changed the interest rate.
            </p>
          </div>
          <button
            onClick={onVerifyQuote}
            className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-lg hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 whitespace-nowrap"
          >
            Verify My Quote <Zap size={20} className="fill-current" />
          </button>
        </motion.div>
      )}

      {/* Insider Tip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900 text-slate-100 p-8 rounded-3xl relative overflow-hidden"
      >
        <div className="relative z-10">
          <h3 className="text-emerald-400 font-serif italic text-xl mb-2">Insider Tip from Senior CA</h3>
          <p className="text-lg leading-relaxed opacity-90">"{insiderTip}"</p>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ShieldCheck size={120} />
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center"
      >
        <a
          href="https://top-secret-revenue-link.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-200 bg-emerald-600 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 hover:bg-emerald-700 shadow-2xl shadow-emerald-200"
        >
          <span className="relative flex items-center gap-2 text-xl">
            🔥 Claim Your ₹{netSavings.toLocaleString('en-IN')} Savings Now
          </span>
        </a>
      </motion.div>
      {/* Forensic Audit Trail */}
      {Object.keys(sourcePages).length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-8 border-t border-slate-200"
        >
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center">
            <ShieldCheck className="w-3 h-3 mr-2" /> Forensic Audit Trail (Source Verification)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.entries(sourcePages).map(([field, page]) => (
              <div key={field} className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                  {field.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-sm font-mono font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                  Page {page}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-6 italic">
            * Page numbers refer to the uploaded PDF document. Verify these sections for complete transparency.
          </p>
        </motion.div>
      )}
    </div>
  );
};
