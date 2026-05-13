import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, PieChart, Pie, Cell
} from 'recharts';
import { 
  AlertCircle, TrendingUp, DollarSign, Package, Activity, Calendar, FileText, Layers, History, Filter, AlertTriangle, ShieldAlert, CheckCircle, Loader2, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadData, DashboardData, trendMultipliers } from './utils/dataParser';
import bctLogo from './assets/bct_logo.png';

const COLORS = ['#0085ff', '#ff6b6b', '#fca311'];

const internationalIndices = [
  { month: '1월', 경유: 100, 윤활유: 100, 요소수: 100 },
  { month: '2월', 경유: 102, 윤활유: 101, 요소수: 102 },
  { month: '3월', 경유: 110, 윤활유: 102, 요소수: 105 },
  { month: '4월', 경유: 125, 윤활유: 104, 요소수: 110 },
  { month: '5월', 경유: 145.5, 윤활유: 104, 요소수: 110 },
  { month: '6월', 경유: 146, 윤활유: 106, 요소수: 115 },
  { month: '7월', 경유: 146.5, 윤활유: 108, 요소수: 121 },
  { month: '8월', 경유: 147, 윤활유: 109, 요소수: 126 },
  { month: '9월', 경유: 147.5, 윤활유: 110, 요소수: 137 },
  { month: '10월', 경유: 148, 윤활유: 110, 요소수: 148 },
  { month: '11월', 경유: 148.5, 윤활유: 112, 요소수: 159 },
  { month: '12월', 경유: 149, 윤활유: 114, 요소수: 165 },
];

const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(value || 0);

const formatMoneyKrSplit = (value: number) => {
  const val = value || 0;
  if (val >= 100000000) return { num: new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val / 100000000), unit: '억원' };
  return { num: new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val / 1000000), unit: '백만원' };
};

const formatMoneyKr = (value: number) => {
  const val = value || 0;
  if (val >= 100000000) return `${new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val / 100000000)}억원`;
  return `${new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val / 1000000)}백만원`;
};

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const isDark = className.includes('bg-slate-900');
  const baseBg = isDark ? '' : 'bg-white/80 backdrop-blur-xl';
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`${baseBg} rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 hover:shadow-[0_8px_30px_rgb(0,133,255,0.08)] transition-shadow duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
};

const TabButton = ({ active, icon: Icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`relative flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all duration-300 ${
      active ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    <Icon size={18} className={active ? 'text-primary-500' : ''} /> {label}
    {active && (
      <motion.div 
        layoutId="activeTab" 
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" 
      />
    )}
  </button>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('전체');
  const [indexCarouselIdx, setIndexCarouselIdx] = useState(0);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData().then(parsed => {
      setData(parsed);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load Excel data:", err);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-800 animate-pulse">데이터를 파싱하고 있습니다...</h2>
        <p className="text-slate-500 text-sm mt-2">전쟁임팩트.xlsx 파일을 분석 중입니다.</p>
      </div>
    );
  }

  const { impactDataSummary, monthlyTrendData, itemDetails, deliveryHistory } = data;

  const currentKPI = impactDataSummary[categoryFilter] || { ytd: 0, forecast: 0, budget: 0 };
  
  const budgetVal = currentKPI.budget || 0;
  const excessVal = currentKPI.ytd + currentKPI.forecast;
  const expectedVal = budgetVal + excessVal;
  const ratioVal = budgetVal > 0 ? (((expectedVal - budgetVal) / budgetVal) * 100).toFixed(1) : "0.0";
  
  let cumulative = 0;
  const filteredTrendData = monthlyTrendData.map((d, i) => {
    let ytd = 0, fc = 0;
    let dieselFc = 0, lubeFc = 0, ureaFc = 0;
    if (categoryFilter === '전체' || categoryFilter === '경유') { ytd += d.경유_YTD || 0; fc += d.경유_FC || 0; dieselFc = d.경유_FC || 0; }
    if (categoryFilter === '전체' || categoryFilter === '윤활유') { ytd += d.윤활유_YTD || 0; fc += d.윤활유_FC || 0; lubeFc = d.윤활유_FC || 0; }
    if (categoryFilter === '전체' || categoryFilter === '요소수') { ytd += d.요소수_YTD || 0; fc += d.요소수_FC || 0; ureaFc = d.요소수_FC || 0; }
    
    // 1, 2월은 전쟁 발발 이전이므로 금액 0 처리
    if (i < 2) {
      ytd = 0; fc = 0; dieselFc = 0; lubeFc = 0; ureaFc = 0;
    }
    
    const bestCase = fc > 0 ? fc * 0.85 : null;
    const worstCase = fc > 0 ? fc * 1.3 : null;
    
    cumulative += (ytd + fc);

    return { 
      month: d.month, 
      ytd: ytd > 0 ? ytd : null, 
      fc: fc > 0 ? fc : null,
      dieselFc, lubeFc, ureaFc,
      bestCase,
      worstCase,
      fcRange: fc > 0 ? [bestCase, worstCase] : null,
      cumulative,
      baseline: 0
    };
  });

  const ytdPieData = [
    { name: '경유', value: impactDataSummary['경유']?.ytd || 0 },
    { name: '윤활유', value: impactDataSummary['윤활유']?.ytd || 0 },
    { name: '요소수', value: impactDataSummary['요소수']?.ytd || 0 },
  ].filter(d => d.value > 0);

  const filteredHistory = deliveryHistory.filter(h => historyCategoryFilter === '전체' || h.category === historyCategoryFilter);

  const renderDashboard = () => (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-8"
    >
      <div className="flex gap-2 p-1 bg-white/50 backdrop-blur shadow-sm w-fit rounded-xl border border-slate-200/60">
        {['전체', '경유', '윤활유', '요소수'].map(cat => (
          <button 
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              categoryFilter === cat ? 'bg-primary-500 shadow-md text-white' : 'text-slate-500 hover:text-primary-600 hover:bg-primary-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="w-full mb-4 px-2">
        <div className="flex justify-between items-end mb-3">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Layers size={20} className="text-primary-500" /> 총 소요 예산 대비 비용 증가 시뮬레이션
            </h3>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-slate-500 mr-2">증가비율</span>
            <span className="text-2xl font-black text-red-500">+{ratioVal}%</span>
          </div>
        </div>
        
        <div className="relative h-12 bg-slate-100 rounded-2xl overflow-hidden shadow-inner flex">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${budgetVal > 0 ? (budgetVal / expectedVal) * 100 : 0}%` }} 
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-slate-700 to-slate-800 relative flex items-center px-4"
          >
             <span className="text-white font-bold text-sm z-10 whitespace-nowrap drop-shadow-md">예산 (Base): {formatMoneyKr(budgetVal)}</span>
          </motion.div>
          
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${expectedVal > 0 ? (excessVal / expectedVal) * 100 : 0}%` }} 
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-red-500 to-red-600 relative flex items-center justify-end px-4 border-l-2 border-white/20"
            style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)' }}
          >
             <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)" }}></div>
             <span className="text-white font-black text-sm z-10 drop-shadow-md whitespace-nowrap">+ 초과비용: {formatMoneyKr(excessVal)}</span>
          </motion.div>
        </div>
        
        <div className="flex justify-between mt-3 text-sm">
          <div className="text-slate-500 font-semibold px-1">정상 납품 시 예산 (예상수량 × 기준단가)</div>
          <div className="text-slate-500 font-semibold flex items-center gap-1.5 px-1">
             <AlertTriangle size={16} className="text-red-500" />
             최종 예상 금액 (예산 + 초과비용): <span className="text-red-500 font-bold">{formatMoneyKr(expectedVal)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle size={64} className="text-red-500" />
          </div>
          <p className="text-sm font-bold text-red-500 mb-2 flex items-center gap-1.5 whitespace-nowrap">
            <AlertTriangle size={16}/> 현재 누적 임팩트
          </p>
          <motion.h2 
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} 
            className="text-4xl font-black text-slate-900 mb-2 tracking-tight"
          >
            {formatMoneyKrSplit(currentKPI.ytd).num}<span className="text-lg text-slate-400 font-medium ml-1">{formatMoneyKrSplit(currentKPI.ytd).unit}</span>
          </motion.h2>
          <p className="text-xs text-slate-500 font-medium bg-red-50 text-red-600 px-2 py-1 rounded w-fit">1월~4월 발생 비용</p>
        </Card>
        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-primary-500" />
          </div>
          <p className="text-sm font-bold text-primary-600 mb-2 flex items-center gap-1.5"><TrendingUp size={16}/> 추가금액 예측 (Forecast)</p>
          <motion.h2 
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} 
            className="text-4xl font-black text-slate-900 mb-2 tracking-tight"
          >
            {formatMoneyKrSplit(currentKPI.forecast).num}<span className="text-lg text-slate-400 font-medium ml-1">{formatMoneyKrSplit(currentKPI.forecast).unit}</span>
          </motion.h2>
          <p className="text-xs text-slate-500 font-medium bg-primary-50 text-primary-600 px-2 py-1 rounded w-fit">5월~12월 추가 발생 예상액</p>
        </Card>
        <div className="relative h-full">
          
          <Card className="h-full relative overflow-hidden bg-slate-900 text-white border-none group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Layers size={64} className="text-white" />
          </div>
          <p className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-1.5"><Layers size={16}/> 총 리스크 규모 (Total)</p>
          <motion.h2 
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} 
            className="text-4xl font-black text-white mb-2 tracking-tight"
          >
            {formatMoneyKrSplit(currentKPI.ytd + currentKPI.forecast).num}<span className="text-lg text-slate-400 font-medium ml-1">{formatMoneyKrSplit(currentKPI.ytd + currentKPI.forecast).unit}</span>
          </motion.h2>
          <p className="text-xs text-slate-400 font-medium bg-slate-800 px-2 py-1 rounded w-fit">현재 누적 + Forecast 합산</p>
        </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 h-[450px] flex flex-col">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">[{categoryFilter}] 비용 증가 추이</h3>
              <p className="text-sm text-slate-500 font-medium">실제 발생 및 향후 예측(Forecast) 비용 트렌드 (단위: 백만원)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredTrendData} margin={{ top: 40, right: 20, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} 
                cursor={{ fill: '#f8fafc' }}
                itemSorter={(item) => item.name.includes('Baseline') ? -1 : 1}
                formatter={(value: any, name: string) => {
                  if (name.includes('Baseline') || name.includes('예산 기준선')) return [null, null];
                  if (Array.isArray(value)) return [`${Number(value[0]).toFixed(1)} ~ ${Number(value[1]).toFixed(1)}백만원`, name];
                  return [`${Number(value).toFixed(1)}백만원`, name];
                }} 
              />
              <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px', fontWeight: 600 }} iconType="circle" />
              <Line type="monotone" dataKey="baseline" name="예산 기준선 (Baseline)" stroke="#94a3b8" strokeWidth={2} dot={false} activeDot={false} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="ytd" name="실제 추가금액 (Actual)" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, fill: '#0f172a' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="fc" name="추가금액 (Forecast)" stroke="#f59e0b" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
              <Area type="monotone" dataKey="fcRange" name="예측 범위(Best~Worst)" stroke="none" fill="#fde68a" fillOpacity={0.4} />
              <Line type="monotone" dataKey="worstCase" name="Worst 추가금액" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1.5} dot={{ r: 2, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-[450px] flex flex-col">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-800 mb-1">국제 원자재 단가 예측 모델</h3>
              <p className="text-sm text-slate-500 font-medium">품목별 단가 상승 추이 시뮬레이션 (Index)</p>
            </div>

            {categoryFilter === '전체' && (
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-lg mb-3">
                <button onClick={() => setIndexCarouselIdx(prev => prev === 0 ? 2 : prev - 1)} className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-500 transition-all"><ChevronLeft size={16} /></button>
                <span className="text-xs font-bold text-slate-600">{indexCarouselIdx + 1} / 3</span>
                <button onClick={() => setIndexCarouselIdx(prev => prev === 2 ? 0 : prev + 1)} className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-500 transition-all"><ChevronRight size={16} /></button>
              </div>
            )}

            <div className="flex-1 w-full flex flex-col overflow-hidden">
              {[
                { key: '경유', title: '국제 경유가격 추이 (경유)', color: '#0085ff' },
                { key: '윤활유', title: '아시아 기유 추이 (윤활유)', color: '#fca311' },
                { key: '요소수', title: '요소 과립 FOB 중동 (요소수)', color: '#ff6b6b' },
              ].filter((item, idx) => categoryFilter === '전체' ? idx === indexCarouselIdx : item.key === categoryFilter).map(item => (
                <div key={item.key} className="flex-1 bg-slate-50 rounded-xl p-4 flex flex-col border border-slate-100">
                  <p className="text-sm font-bold text-slate-800 mb-4 bg-white py-2 px-3 rounded-lg shadow-sm border border-slate-100/80 text-center">{item.title}</p>
                  <div className="flex-1 w-full min-h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={internationalIndices} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} dy={10} interval={0} />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', padding: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: '4px' }} />
                        <Line type="monotone" dataKey={item.key} name="Index" stroke={item.color} strokeWidth={3} dot={{ r: 4, fill: item.color, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </Card>
      </div>

      <div className="mt-4 mb-2 px-2">
        <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5"><AlertCircle size={14}/> ※ 본 예측액은 국제 경유가격 추이, 아시아 기유 추이, 요소 과립 FOB 중동 시장 지수 트렌드를 기반으로 가중치를 적용하여 산출되었습니다.</p>
      </div>

      {/* 월별 예측액 계산 내역 표 */}
      {categoryFilter === '전체' ? (
        <Card className="mt-8 overflow-hidden p-0">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 mb-1">월별 예측액 계산 내역</h3>
            <p className="text-xs text-slate-500 font-medium">전쟁 발발 이후(3월~) 월별 예측액(Base) 및 누적 임팩트 명세</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-100/80">
                <tr>
                  <th className="px-5 py-3 font-bold uppercase">월(Month)</th>
                  <th className="px-5 py-3 font-bold uppercase text-right">경유 예상액</th>
                  <th className="px-5 py-3 font-bold uppercase text-right">윤활유 예상액</th>
                  <th className="px-5 py-3 font-bold uppercase text-right">요소수 예상액</th>
                  <th className="px-5 py-3 font-bold uppercase text-right text-primary-600">총 예상/실제초과액</th>
                  <th className="px-5 py-3 font-bold uppercase text-right text-red-500">누적 초과 비용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrendData.filter((_, i) => i >= 2).map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-bold text-slate-700">{row.month}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{row.dieselFc ? `${row.dieselFc.toFixed(1)}` : '-'}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{row.lubeFc ? `${row.lubeFc.toFixed(1)}` : '-'}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{row.ureaFc ? `${row.ureaFc.toFixed(1)}` : '-'}</td>
                    <td className="px-5 py-3 text-right font-bold text-primary-600">{(row.fc || row.ytd) ? `${((row.fc || row.ytd) || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}백만원` : '-'}</td>
                    <td className="px-5 py-3 text-right font-black text-red-500">{row.cumulative.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}백만원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="mt-8 overflow-hidden p-0">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 mb-1">[{categoryFilter}] 아이템별 월별 예측액 세부 산출 내역</h3>
            <p className="text-xs text-slate-500 font-medium">품명 기준 월별(5~12월) 지수(Index) 연동 추가 비용 시뮬레이션</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-100/80 whitespace-nowrap">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase">품명</th>
                  <th className="px-4 py-3 font-bold uppercase text-right">예상수량</th>
                  <th className="px-4 py-3 font-bold uppercase text-right">납품수량</th>
                  <th className="px-4 py-3 font-bold uppercase text-right text-slate-600 bg-slate-200/50">월할당(잔여/8)</th>
                  <th className="px-4 py-3 font-bold uppercase text-right">기준단가</th>
                  {['5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'].map(m => (
                    <th key={m} className="px-4 py-3 font-bold uppercase text-right">{m}</th>
                  ))}
                  <th className="px-4 py-3 font-bold uppercase text-right text-primary-600">총 추가비용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemDetails.filter(i => i.category === categoryFilter).map(item => {
                  const monthlyQty = item.remainingQty / 8;
                  const multipliers = trendMultipliers[categoryFilter as keyof typeof trendMultipliers] || Array(8).fill(100);
                  
                  let totalExtraCost = 0;
                  const monthlyCalcs = multipliers.map(idx => {
                    const impactPrice = item.base * (idx / 100);
                    let extraCost = 0;
                    if (impactPrice > item.base) {
                      extraCost = (impactPrice - item.base) * monthlyQty;
                    }
                    totalExtraCost += extraCost;
                    return { impactPrice, extraCost };
                  });

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-bold text-slate-700 whitespace-nowrap max-w-[200px] truncate" title={item.name}>{item.name}</td>
                      <td className="px-4 py-4 text-right text-slate-500">{item.expectedQty.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right text-slate-500">{item.deliveredQty.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right font-bold text-slate-600 bg-slate-50">{Math.round(monthlyQty).toLocaleString()}</td>
                      <td className="px-4 py-4 text-right text-slate-500">₩{formatCurrency(item.base)}</td>
                      {monthlyCalcs.map((calc, i) => (
                        <td key={i} className="px-4 py-4 text-right whitespace-nowrap border-l border-slate-100/50">
                          <div className="text-xs text-slate-400 mb-0.5">단가: ₩{formatCurrency(calc.impactPrice)}</div>
                          <div className={`font-semibold ${calc.extraCost > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                            {calc.extraCost > 0 ? `+${formatMoneyKr(calc.extraCost)}` : '-'}
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-4 text-right font-black text-primary-600 bg-primary-50/30 whitespace-nowrap">
                        {totalExtraCost > 0 ? formatMoneyKr(totalExtraCost) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 예측 시나리오 통합 영역 */}
      <div className="mt-12 space-y-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 flex items-start gap-5">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
              <ShieldAlert size={36} className="text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-3 tracking-tight">[{categoryFilter}] 거시경제 및 지정학적 리스크 기반 Forecast 시나리오</h2>
              <p className="text-base text-slate-300 leading-relaxed max-w-none font-medium">
                {categoryFilter === '전체' && "블룸버그 인텔리전스(BI) 및 주요 증권가 리서치의 분석 방법론을 차용하여 3가지 시나리오를 도출했습니다. 이란-이스라엘 보복 공방에 따른 지정학적 프리미엄을 Base Case로 적용했습니다."}
                {categoryFilter === '경유' && "호르무즈 해협 리스크 프리미엄(배럴당 $10~$15)을 적용한 WTI 유가 상승률을 기반으로 국내 정유사 초저황경유 납품단가 연동 시나리오를 도출했습니다."}
                {categoryFilter === '윤활유' && "아시아 기유 시장 수급 동향 및 해상 물류비 급등 프리미엄을 반영하여, 향후 윤활유 베이스오일 원가 상승 시나리오를 도출했습니다."}
                {categoryFilter === '요소수' && "중국발 요소 수출 통제 리스크 및 중동 지역 요소 과립 FOB 단가 폭등을 고려하여 요소수 수급 비상 시나리오를 도출했습니다."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div whileHover={{ y: -5 }}>
            <Card className="h-full border-t-4 border-t-emerald-500 relative overflow-hidden bg-gradient-to-b from-white to-emerald-50/30">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Best Case</h3>
                <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm">확률 15%</span>
              </div>
              <ul className="text-sm space-y-4 mb-8 text-slate-600 font-medium">
                {categoryFilter === '전체' && (
                  <>
                    <li className="flex gap-3 items-start"><CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5"/> <span>중동 휴전 협상 타결 및 긴장 완화</span></li>
                    <li className="flex gap-3 items-start"><CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5"/> <span>국제 원자재 및 유가 안정세 회복</span></li>
                  </>
                )}
                {categoryFilter === '경유' && (
                  <>
                    <li className="flex gap-3 items-start"><CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5"/> <span>국제유가(WTI) $70대 회귀</span></li>
                    <li className="flex gap-3 items-start"><CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5"/> <span>하반기 경유 단가 1,400원선 안정화</span></li>
                  </>
                )}
                {categoryFilter === '윤활유' && (
                  <>
                    <li className="flex gap-3 items-start"><CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5"/> <span>아시아 기유 공급망 완전 정상화</span></li>
                    <li className="flex gap-3 items-start"><CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5"/> <span>하반기 원가 인상분 동결 합의</span></li>
                  </>
                )}
                {categoryFilter === '요소수' && (
                  <>
                    <li className="flex gap-3 items-start"><CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5"/> <span>중국발 요소 수출 통제 전면 해제</span></li>
                    <li className="flex gap-3 items-start"><CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5"/> <span>중동발 물류비 및 단가 하락 안정세</span></li>
                  </>
                )}
              </ul>
              <div className="pt-6 border-t border-slate-100/80 mt-auto">
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">예상 누적 리스크 (연말)</p>
                <p className="text-3xl font-black text-slate-800">{formatMoneyKrSplit(impactDataSummary[categoryFilter].forecast * 0.3).num}<span className="text-base text-slate-400 ml-1">{formatMoneyKrSplit(impactDataSummary[categoryFilter].forecast * 0.3).unit}</span></p>
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }}>
            <Card className="h-full border-t-4 border-t-primary-500 ring-4 ring-primary-50 shadow-2xl transform scale-105 z-10 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl"></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-2xl font-black text-primary-700 tracking-tight flex items-center gap-2">Base Case <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-md font-bold ml-1">현재 적용</span></h3>
                <span className="bg-primary-100 text-primary-700 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm">확률 65%</span>
              </div>
              <ul className="text-sm space-y-4 mb-8 text-slate-700 font-semibold relative z-10">
                {categoryFilter === '전체' && (
                  <>
                    <li className="flex gap-3 items-start"><Activity size={18} className="text-primary-500 shrink-0 mt-0.5"/> <span>국지적 분쟁 장기화 (현 상태 유지)</span></li>
                    <li className="flex gap-3 items-start"><Activity size={18} className="text-primary-500 shrink-0 mt-0.5"/> <span>지정학적 프리미엄 연말까지 지속 반영</span></li>
                  </>
                )}
                {categoryFilter === '경유' && (
                  <>
                    <li className="flex gap-3 items-start"><Activity size={18} className="text-primary-500 shrink-0 mt-0.5"/> <span>지정학적 프리미엄 배럴당 +$10 유지</span></li>
                    <li className="flex gap-3 items-start"><Activity size={18} className="text-primary-500 shrink-0 mt-0.5"/> <span>경유 단가 1,900~2,000원 박스권 횡보</span></li>
                  </>
                )}
                {categoryFilter === '윤활유' && (
                  <>
                    <li className="flex gap-3 items-start"><Activity size={18} className="text-primary-500 shrink-0 mt-0.5"/> <span>점진적인 원가 인상분 순차적 반영</span></li>
                    <li className="flex gap-3 items-start"><Activity size={18} className="text-primary-500 shrink-0 mt-0.5"/> <span>하반기 기유 가격 10% 내외 상승 추이</span></li>
                  </>
                )}
                {categoryFilter === '요소수' && (
                  <>
                    <li className="flex gap-3 items-start"><Activity size={18} className="text-primary-500 shrink-0 mt-0.5"/> <span>중동발 요소 과립 수급 점진적 불안정화</span></li>
                    <li className="flex gap-3 items-start"><Activity size={18} className="text-primary-500 shrink-0 mt-0.5"/> <span>완만한 단가 상승세 (Index 160선 접근)</span></li>
                  </>
                )}
              </ul>
              <div className="pt-6 border-t border-slate-200 relative z-10 mt-auto">
                <p className="text-xs font-bold text-primary-600 mb-2 uppercase tracking-wider">예상 누적 리스크 (연말)</p>
                <p className="text-4xl font-black text-primary-600 tracking-tight">{formatMoneyKrSplit(impactDataSummary[categoryFilter].forecast).num}<span className="text-xl text-primary-400 ml-1">{formatMoneyKrSplit(impactDataSummary[categoryFilter].forecast).unit}</span></p>
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }}>
            <Card className="h-full border-t-4 border-t-red-500 relative overflow-hidden bg-gradient-to-b from-white to-red-50/30">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Worst Case</h3>
                <span className="bg-red-100 text-red-700 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm">확률 20%</span>
              </div>
              <ul className="text-sm space-y-4 mb-8 text-slate-600 font-medium">
                {categoryFilter === '전체' && (
                  <>
                    <li className="flex gap-3 items-start"><AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/> <span>확전 및 호르무즈 해협 전면 봉쇄</span></li>
                    <li className="flex gap-3 items-start"><AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/> <span>글로벌 물류 마비 및 수입 단가 폭등</span></li>
                  </>
                )}
                {categoryFilter === '경유' && (
                  <>
                    <li className="flex gap-3 items-start"><AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/> <span>호르무즈 해협 봉쇄로 글로벌 오일쇼크</span></li>
                    <li className="flex gap-3 items-start"><AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/> <span>원-달러 환율 급등으로 수입 단가 가중치 폭발</span></li>
                  </>
                )}
                {categoryFilter === '윤활유' && (
                  <>
                    <li className="flex gap-3 items-start"><AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/> <span>기유 생산 차질 및 글로벌 해상 물류비 폭등</span></li>
                    <li className="flex gap-3 items-start"><AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/> <span>연말 기준 30% 이상 원가 폭등 강제 반영</span></li>
                  </>
                )}
                {categoryFilter === '요소수' && (
                  <>
                    <li className="flex gap-3 items-start"><AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/> <span>중동 수출 완전 통제 및 아시아 공급망 마비</span></li>
                    <li className="flex gap-3 items-start"><AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/> <span>겨울철 디젤 차량 수요와 겹쳐 제2의 요소수 대란 발생</span></li>
                  </>
                )}
              </ul>
              <div className="pt-6 border-t border-slate-100/80 mt-auto">
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">예상 누적 리스크 (연말)</p>
                <p className="text-3xl font-black text-red-500">{formatMoneyKrSplit(impactDataSummary[categoryFilter].forecast * 3.1).num}<span className="text-base text-red-400 ml-1">{formatMoneyKrSplit(impactDataSummary[categoryFilter].forecast * 3.1).unit}+</span></p>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );



  const renderHistory = () => (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-8"
    >
      <div className="flex gap-2 p-1 bg-white/50 backdrop-blur shadow-sm w-fit rounded-xl border border-slate-200/60 mb-2">
        {['전체', '경유', '윤활유', '요소수'].map(cat => (
          <button 
            key={cat}
            onClick={() => setHistoryCategoryFilter(cat)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              historyCategoryFilter === cat ? 'bg-slate-800 shadow-md text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {cat} 필터링
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden border-slate-200">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">상세 납품 내역 (Delivery Logs)</h3>
            <p className="text-sm text-slate-500 font-medium">엑셀 원천 데이터 기반 실시간 로드 내역</p>
          </div>
          <button className="text-sm bg-primary-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-[0_4px_14px_0_rgba(0,133,255,0.39)] hover:shadow-[0_6px_20px_rgba(0,133,255,0.23)] hover:bg-primary-600 transition-all duration-300">
            CSV 내보내기
          </button>
        </div>
        
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-slate-500 bg-slate-100/80 sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider uppercase">입고일</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase">구매번호/ID</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase">항목</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase">품명</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase">업체</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase text-right">수량</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase text-right">기준단가</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase text-right">실입고단가</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase text-right text-red-500">추가금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredHistory.slice(0, 100).map((row, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={row.id + i} 
                    className="hover:bg-primary-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 text-slate-600 font-medium">{row.date}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400 group-hover:text-primary-600 transition-colors">{row.id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        row.category === '경유' ? 'bg-slate-800 text-white' : 
                        row.category === '윤활유' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{row.item}</td>
                    <td className="px-6 py-4 text-slate-600">{row.vendor}</td>
                    <td className="px-6 py-4 text-right font-medium">{row.qty.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-slate-400">₩{formatCurrency(row.unitBase)}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">₩{formatCurrency(row.unitActual)}</td>
                    <td className={`px-6 py-4 text-right font-black ${row.penalty > 0 ? 'text-red-500 bg-red-50/50' : 'text-slate-300'}`}>
                      {row.penalty > 0 ? `+₩${formatCurrency(row.penalty)}` : '-'}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredHistory.length > 100 && (
            <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 border-t border-slate-100 font-medium">
              최근 100건만 표시됩니다.
            </div>
          )}
        </div>
      </Card>
      
      <Card className="p-0 overflow-hidden border-slate-200">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800 mb-1">영향도 세부 명세 (Impact.csv 기준)</h3>
          <p className="text-sm text-slate-500 font-medium">품목별 Forecast 비용 배분 명세</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-100/80">
              <tr>
                <th className="px-6 py-4 font-bold tracking-wider uppercase">품명</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase text-right">기준단가</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase text-right">현재/예상단가</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase text-right text-red-500">누적 임팩트</th>
                <th className="px-6 py-4 font-bold tracking-wider uppercase text-right text-primary-600">Forecast</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemDetails.filter(i => historyCategoryFilter === '전체' || i.category === historyCategoryFilter).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                  <td className="px-6 py-4 text-right text-slate-500 font-medium">₩{formatCurrency(item.base)}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-700">₩{formatCurrency(item.current)}</td>
                  <td className="px-6 py-4 text-right text-red-500 font-black">₩{formatCurrency(item.ytdCost)}</td>
                  <td className="px-6 py-4 text-right text-primary-600 font-black">₩{formatCurrency(item.forecastCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-primary-500 selection:text-white">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-400/5 blur-[120px]"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-red-400/5 blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-8 pt-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded tracking-widest flex items-center gap-1.5 uppercase shadow-sm">
                <AlertCircle size={12} strokeWidth={3} /> Confidential
              </span>
              <span className="text-primary-600 text-sm font-bold bg-primary-50 px-3 py-1 rounded-full">공급망 리스크 경영 보고서</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              지정학적 이슈: <span className="text-slate-400 font-light ml-2">비용 급등 리스크 분석</span>
            </h1>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="text-right flex flex-col items-end pt-2"
          >
            <img src={bctLogo} alt="BCT Logo" className="h-12 object-contain mb-1" />
            <div 
              className="text-slate-400 flex items-center justify-end" 
              style={{ fontFamily: "'paperlogy Light', sans-serif", fontSize: '0.65rem', letterSpacing: '0.02em' }}
            >
              데이터 기준일 2026. 04. 30
            </div>
          </motion.div>
        </header>

        <div className="flex mb-8 border-b border-slate-200">
          <TabButton active={activeTab === 'dashboard'} icon={Activity} label="리스크 분석" onClick={() => setActiveTab('dashboard')} />
          <TabButton active={activeTab === 'history'} icon={History} label="상세 납품 내역 (Logs)" onClick={() => setActiveTab('history')} />
        </div>

        <main className="pb-20">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <motion.div key="dashboard">{renderDashboard()}</motion.div>}
            {activeTab === 'history' && <motion.div key="history">{renderHistory()}</motion.div>}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
