import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar, Save, Activity, Sparkles, X, Loader2, MessageSquare, CheckCircle, Coins, Edit2, PieChart, ExternalLink, RefreshCw, BarChart3, Filter, Download, Upload, AlertTriangle, FileSpreadsheet, ArrowRightCircle } from 'lucide-react';

// StackBlitz 기본 설정과 충돌하지 않도록 컴포넌트 이름을 App으로 변경했습니다.
const App = () => {
  const apiKey = ""; 

  // --- 초기 데이터 로드 ---
  const loadInitialData = () => {
    try {
      const savedTrades = localStorage.getItem('fxTrades');
      return savedTrades ? JSON.parse(savedTrades) : [];
    } catch (e) {
      return [];
    }
  };

  const [trades, setTrades] = useState(loadInitialData);
  
  // --- 폼 상태 ---
  const [formData, setFormData] = useState({
    pair: 'USD',
    buyRate: '',    
    buyVol: '',     
    entryDate: new Date().toISOString().split('T')[0],
    memo: ''
  });

  // --- 통계용 날짜 필터 상태 (YYYY-MM) ---
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // --- 모달 상태 ---
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [sellFormData, setSellFormData] = useState({
    sellRate: '',
    sellVol: '',
    exitDate: new Date().toISOString().split('T')[0],
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  // 이월 모달 상태
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [rolloverFormData, setRolloverFormData] = useState(null);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiMode, setAiMode] = useState(''); 
  
  // 백업 파일 input ref
  const fileInputRef = useRef(null);

  // --- 환율 시세 상태 ---
  const [marketRates, setMarketRates] = useState([
    { id: 'DXY', name: '달러 인덱스', symbol: 'DXY', price: 104.50, change: 0.02, url: 'https://kr.tradingview.com/symbols/TVC-DXY/' },
    { id: 'USDJPY', name: '달러/엔', symbol: 'USD/JPY', price: 152.30, change: -0.05, url: 'https://kr.tradingview.com/symbols/USDJPY/' },
    { id: 'USDKRW', name: '원/달러', symbol: 'USD/KRW', price: 1435.50, change: 0.15, url: 'https://kr.tradingview.com/symbols/USDKRW/' },
    { id: 'JPYKRW', name: '원/엔', symbol: 'JPY/KRW', price: 942.15, change: 0.23, url: 'https://kr.tradingview.com/symbols/JPYKRW/' },
  ]);

  useEffect(() => {
    localStorage.setItem('fxTrades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMarketRates(prevRates => prevRates.map(rate => {
        const fluctuation = (Math.random() - 0.5) * (rate.id === 'JPYKRW' ? 0.5 : 0.1); 
        const newPrice = rate.price + fluctuation;
        const newChange = rate.change + fluctuation;
        return {
          ...rate,
          price: parseFloat(newPrice.toFixed(2)),
          change: parseFloat(newChange.toFixed(2))
        };
      }));
    }, 3000); 
    return () => clearInterval(interval);
  }, []);


  // --- 핸들러 ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSellInputChange = (e) => {
    const { name, value } = e.target;
    setSellFormData({ ...sellFormData, [name]: value });
  };

  const handleCurrencySelect = (currency) => {
    setFormData({ ...formData, pair: currency });
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  // --- 데이터 관리 (백업/복구/엑셀) ---
  const exportData = () => {
    const dataStr = JSON.stringify(trades, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `FX_Trading_Backup_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToCSV = () => {
    if (trades.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }
    const headers = ["ID", "통화", "매수 기준가", "매수 수량", "매수 총액", "매도 기준가", "매도 수량", "매도 총액", "수익금", "수익률(%)", "상태", "진입일", "청산일", "메모"];
    const rows = trades.map(t => [
      t.id, t.pair, t.buyRate, t.buyVol, t.totalBuyKrw,
      t.sellRate || '', t.sellVol || '', t.totalSellKrw || '',
      t.profit || '', t.yieldRate ? t.yieldRate.toFixed(2) : '',
      t.status === 'OPEN' ? '보유중' : '청산완료',
      t.entryDate, t.exitDate || '',
      `"${(t.memo || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `FX_Trading_Excel_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedTrades = JSON.parse(event.target.result);
        if (Array.isArray(importedTrades)) {
          if (window.confirm(`총 ${importedTrades.length}건의 데이터를 불러오시겠습니까? 기존 데이터에 덮어씌워집니다.`)) {
            setTrades(importedTrades);
            alert("데이터 복구가 완료되었습니다.");
          }
        } else {
          alert("올바르지 않은 파일 형식입니다.");
        }
      } catch (error) {
        alert("파일을 읽는 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };


  // --- 거래 로직 ---
  const addTrade = (e) => {
    e.preventDefault();
    if (!formData.buyRate || !formData.buyVol) return;

    const bRate = parseFloat(formData.buyRate);
    const bVol = parseFloat(formData.buyVol);
    const totalBuyKrw = bRate * bVol;

    const newTrade = {
      id: Date.now(),
      ...formData,
      buyRate: bRate,
      buyVol: bVol,
      totalBuyKrw,
      sellRate: null,
      sellVol: null,
      totalSellKrw: null,
      exitDate: null,
      profit: null,
      yieldRate: null,
      status: 'OPEN'
    };

    setTrades([newTrade, ...trades]);
    setFormData({ ...formData, buyRate: '', buyVol: '', memo: '' });
  };

  const openSellModal = (trade) => {
    setSelectedTradeId(trade.id);
    setSellFormData({
      sellRate: '',
      sellVol: trade.buyVol, 
      exitDate: new Date().toISOString().split('T')[0]
    });
    setShowSellModal(true);
  };

  const confirmSell = (e) => {
    e.preventDefault();
    if (!sellFormData.sellRate || !sellFormData.sellVol) return;

    const updatedTrades = trades.map(trade => {
      if (trade.id === selectedTradeId) {
        const sRate = parseFloat(sellFormData.sellRate);
        const sVol = parseFloat(sellFormData.sellVol);
        const totalSellKrw = sRate * sVol;
        let profit = totalSellKrw - trade.totalBuyKrw;
        let yieldRate = ((totalSellKrw - trade.totalBuyKrw) / trade.totalBuyKrw) * 100;

        return {
          ...trade,
          sellRate: sRate,
          sellVol: sVol,
          totalSellKrw,
          exitDate: sellFormData.exitDate,
          profit,
          yieldRate,
          status: 'CLOSED'
        };
      }
      return trade;
    });

    setTrades(updatedTrades);
    setShowSellModal(false);
  };

  // --- 이월(Rollover) 로직 ---
  const openRolloverModal = (trade) => {
    const entryDate = new Date(trade.entryDate);
    // 해당 월의 마지막 날 계산
    const lastDayOfMonth = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 0);
    // 다음 달 1일 계산
    const firstDayOfNextMonth = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 1);

    // 날짜 포맷팅 (YYYY-MM-DD)
    const formatDate = (date) => date.toISOString().split('T')[0];

    setRolloverFormData({
      trade,
      rolloverRate: '', // 사용자 입력 (평가 환율)
      closeDate: formatDate(lastDayOfMonth),
      nextEntryDate: formatDate(firstDayOfNextMonth)
    });
    setShowRolloverModal(true);
  };

  const handleRolloverChange = (e) => {
    setRolloverFormData({ ...rolloverFormData, rolloverRate: e.target.value });
  };

  const confirmRollover = (e) => {
    e.preventDefault();
    if (!rolloverFormData.rolloverRate) return;

    const rate = parseFloat(rolloverFormData.rolloverRate);
    const { trade, closeDate, nextEntryDate } = rolloverFormData;

    // 1. 기존 거래 청산 처리 (월말 날짜)
    const closedTrade = {
      ...trade,
      sellRate: rate,
      sellVol: trade.buyVol,
      totalSellKrw: rate * trade.buyVol,
      exitDate: closeDate,
      profit: (rate * trade.buyVol) - trade.totalBuyKrw,
      yieldRate: (((rate * trade.buyVol) - trade.totalBuyKrw) / trade.totalBuyKrw) * 100,
      status: 'CLOSED',
      memo: `${trade.memo ? trade.memo + ' / ' : ''}자동이월됨(${closeDate})`
    };

    // 2. 신규 거래 생성 (다음달 1일, 같은 가격)
    const newTrade = {
      id: Date.now(),
      pair: trade.pair,
      buyRate: rate, // 매도한 가격과 동일하게 매수
      buyVol: trade.buyVol,
      totalBuyKrw: rate * trade.buyVol,
      entryDate: nextEntryDate,
      sellRate: null,
      sellVol: null,
      totalSellKrw: null,
      exitDate: null,
      profit: null,
      yieldRate: null,
      status: 'OPEN',
      memo: `이월된 포지션(${trade.entryDate} 진입분)`
    };

    // 기존 리스트에서 원본 업데이트 + 신규 추가
    const updatedTrades = trades.map(t => t.id === trade.id ? closedTrade : t);
    setTrades([newTrade, ...updatedTrades]);
    
    setShowRolloverModal(false);
  };


  const openEditModal = (trade) => {
    setEditFormData({ ...trade });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const saveEdit = (e) => {
    e.preventDefault();
    if (!editFormData) return;

    const updatedTrades = trades.map(trade => {
      if (trade.id === editFormData.id) {
        const bRate = parseFloat(editFormData.buyRate);
        const bVol = parseFloat(editFormData.buyVol);
        const totalBuyKrw = bRate * bVol;
        let sRate = trade.sellRate;
        let sVol = trade.sellVol;
        let totalSellKrw = trade.totalSellKrw;
        let profit = trade.profit;
        let yieldRate = trade.yieldRate;
        let status = trade.status;
        let exitDate = trade.exitDate;

        if (trade.status === 'CLOSED') {
          sRate = parseFloat(editFormData.sellRate);
          sVol = parseFloat(editFormData.sellVol); 
          exitDate = editFormData.exitDate;
          totalSellKrw = sRate * sVol;
          profit = totalSellKrw - totalBuyKrw;
          yieldRate = ((totalSellKrw - totalBuyKrw) / totalBuyKrw) * 100;
        }

        return {
          ...trade, ...editFormData,
          buyRate: bRate, buyVol: bVol, totalBuyKrw,
          sellRate: sRate, sellVol: sVol, totalSellKrw,
          exitDate, profit, yieldRate, status
        };
      }
      return trade;
    });
    setTrades(updatedTrades);
    setShowEditModal(false);
  };

  const deleteTrade = (id) => {
    if(window.confirm('정말 이 기록을 삭제하시겠습니까?')) {
      setTrades(trades.filter(trade => trade.id !== id));
    }
  };

  // --- Gemini API ---
  const callGeminiCoach = async (prompt) => {
    setIsAiLoading(true);
    setShowAiModal(true);
    setAiResponse(null);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      const data = await response.json();
      if (data.candidates && data.candidates[0].content) {
        setAiResponse(data.candidates[0].content.parts[0].text);
      } else {
        setAiResponse("AI 응답을 가져오는데 실패했습니다.");
      }
    } catch (error) {
      setAiResponse("네트워크 오류가 발생했습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const analyzeJournal = () => {
    setAiMode('journal');
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    if (closedTrades.length === 0) {
      alert("분석할 '청산 완료' 거래 내역이 없습니다.");
      return;
    }
    const recentTrades = closedTrades.slice(0, 10);
    const summary = recentTrades.map(t => 
      `- [${t.pair}] ${t.entryDate} 매수(${t.buyRate}) -> ${t.exitDate} 매도(${t.sellRate}), 수익: ${formatNum(t.profit)}원 (${t.yieldRate.toFixed(2)}%)`
    ).join('\n');
    const prompt = `당신은 외환 투자 전문가입니다. 다음 투자 내역을 분석해 조언해주세요:\n${summary}`;
    callGeminiCoach(prompt);
  };

  const analyzeTrade = (trade) => {
    setAiMode('trade');
    const prompt = `다음 환율 거래에 대해 피드백해주세요:\n${JSON.stringify(trade)}`;
    callGeminiCoach(prompt);
  };

  // --- Helpers & Stats ---
  const formatNum = (num) => num ? new Intl.NumberFormat('ko-KR').format(Math.round(num)) : '0';
  const formatVol = (num) => num ? new Intl.NumberFormat('en-US').format(num) : '0';
  const formatRate = (num) => num ? num.toFixed(2) : '0.00';
  const previewBuyTotal = (formData.buyRate && formData.buyVol) ? Math.round(formData.buyRate * formData.buyVol) : 0;

  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const totalClosedTrades = closedTrades.length;
  const winningTrades = closedTrades.filter(t => t.profit > 0).length;
  const winRate = totalClosedTrades > 0 ? ((winningTrades / totalClosedTrades) * 100).toFixed(1) : 0;
  const totalProfit = closedTrades.reduce((acc, curr) => acc + curr.profit, 0);
  const openPositionsCount = trades.filter(t => t.status === 'OPEN').length;

  const [selYear, selMonth] = selectedMonth.split('-').map(Number);
  const monthlyEntries = trades.filter(t => {
    const d = new Date(t.entryDate);
    return d.getFullYear() === selYear && d.getMonth() + 1 === selMonth;
  });
  const monthlyClosed = trades.filter(t => {
    if (t.status !== 'CLOSED') return false;
    const d = new Date(t.exitDate);
    return d.getFullYear() === selYear && d.getMonth() + 1 === selMonth;
  });
  const monthlyProfit = monthlyClosed.reduce((acc, t) => acc + t.profit, 0);
  const monthlyInvestedClosed = monthlyClosed.reduce((acc, t) => acc + t.totalBuyKrw, 0);
  const monthlyYield = monthlyInvestedClosed > 0 ? ((monthlyProfit / monthlyInvestedClosed) * 100).toFixed(2) : '0.00';
  const monthlyTxCount = monthlyEntries.length;
  const monthlyVolume = monthlyEntries.reduce((acc, t) => acc + t.totalBuyKrw, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="text-indigo-600 bg-indigo-100 rounded-full p-1" size={32} />
              환율 투자 일지
            </h1>
            <p className="text-slate-500 mt-1">주요 환율 시세를 확인하고 나의 투자를 기록하세요.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex bg-white rounded-lg border border-slate-200 p-1 mr-2">
              <button onClick={exportData} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded transition" title="백업 (JSON)">
                <Download size={16} />
              </button>
              <div className="w-px bg-slate-200 mx-1"></div>
              <button onClick={exportToCSV} className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition" title="엑셀 (CSV)">
                <FileSpreadsheet size={16} />
              </button>
              <div className="w-px bg-slate-200 mx-1"></div>
              <button onClick={() => fileInputRef.current.click()} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded transition" title="복구 (불러오기)">
                <Upload size={16} />
              </button>
              <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />
            </div>
            <button onClick={analyzeJournal} className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-full font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm">
              <Sparkles size={16} className="animate-pulse"/> AI 분석
            </button>
          </div>
        </header>

        {/* --- 실시간 환율 시세 카드 --- */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="text-red-500" size={18} />
            <h3 className="font-bold text-slate-700">실시간 주요 환율 (Live Rates)</h3>
            <span className="text-xs text-slate-400 font-normal ml-auto flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin-slow" /> 실시간 갱신 중
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {marketRates.map((rate) => (
              <a key={rate.id} href={rate.url} target="_blank" rel="noopener noreferrer" className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{rate.symbol}</div>
                  <ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <div className="text-sm text-slate-500 mb-0.5">{rate.name}</div>
                <div className="flex items-end gap-2">
                  <div className="text-xl font-bold font-mono text-slate-800">{formatRate(rate.price)}</div>
                  <div className={`text-xs font-bold mb-1 ${rate.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{rate.change > 0 ? '+' : ''}{rate.change.toFixed(2)}</div>
                </div>
                {rate.id === 'JPYKRW' && <div className="text-[10px] text-slate-400 mt-1">* 100엔 기준</div>}
              </a>
            ))}
          </div>
        </section>

        {/* Dashboard - Top Cards (Total) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-1 text-sm"><Coins size={16} /><span className="font-medium">총 확정 손익 (누적)</span></div>
            <div className={`text-2xl font-bold ${totalProfit > 0 ? 'text-red-500' : totalProfit < 0 ? 'text-blue-500' : 'text-slate-800'}`}>{formatNum(totalProfit)} <span className="text-sm text-slate-400 font-normal">KRW</span></div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 mb-1 text-sm"><TrendingUp size={16} /><span className="font-medium">전체 승률</span></div>
            <div className="text-2xl font-bold text-slate-800">{winRate}% <span className="text-sm text-slate-400 font-normal">({winningTrades}/{totalClosedTrades})</span></div>
          </div>
           <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
             <div className="flex items-center gap-2 text-slate-500 mb-1 text-sm"><Calendar size={16} /><span className="font-medium">보유 중인 포지션</span></div>
            <div className="text-2xl font-bold text-indigo-600">{openPositionsCount} <span className="text-sm text-slate-400 font-normal">건</span></div>
          </div>
        </div>

        {/* Dashboard - Monthly Stats Header */}
        <div className="flex items-center gap-3 mb-3 mt-8">
          <Filter size={18} className="text-indigo-600" /><h3 className="font-bold text-slate-700">월별 성과 분석</h3>
          <input type="month" value={selectedMonth} onChange={handleMonthChange} className="ml-auto border border-slate-300 rounded-md px-3 py-1 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>

        {/* Dashboard - Monthly Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
           <div className="bg-indigo-50 p-5 rounded-xl shadow-sm border border-indigo-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 text-indigo-800 mb-1 text-sm"><PieChart size={16} /><span className="font-bold">{selMonth}월 수익률 (청산)</span></div>
            <div className={`text-xl font-bold ${parseFloat(monthlyYield) > 0 ? 'text-red-600' : parseFloat(monthlyYield) < 0 ? 'text-blue-600' : 'text-slate-700'}`}>{monthlyYield}%</div>
             <div className="text-xs text-indigo-400 mt-1">선택 월 실현 수익 기준</div>
          </div>
          <div className="bg-indigo-50 p-5 rounded-xl shadow-sm border border-indigo-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 text-indigo-800 mb-1 text-sm"><BarChart3 size={16} /><span className="font-bold">{selMonth}월 거래횟수 (진입)</span></div>
            <div className="text-xl font-bold text-slate-800">{monthlyTxCount} <span className="text-sm font-normal text-slate-500">회</span></div>
            <div className="text-xs text-indigo-400 mt-1">선택 월 매수 횟수</div>
          </div>
          <div className="bg-indigo-50 p-5 rounded-xl shadow-sm border border-indigo-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 text-indigo-800 mb-1 text-sm"><Coins size={16} /><span className="font-bold">{selMonth}월 거래금액 (진입)</span></div>
            <div className="text-xl font-bold text-slate-800">{formatNum(monthlyVolume)} <span className="text-sm font-normal text-slate-500">KRW</span></div>
             <div className="text-xs text-indigo-400 mt-1">선택 월 매수 총액</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Input Form */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus size={20} className="text-indigo-600"/> 새 투자 (매수)</h2>
              <form onSubmit={addTrade} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">통화 종류</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['USD', 'JPY', 'ETC'].map((currency) => (
                      <button key={currency} type="button" onClick={() => handleCurrencySelect(currency)} className={`py-2 rounded-lg text-sm font-bold border transition-all ${formData.pair === currency ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{currency === 'USD' ? '달러($)' : currency === 'JPY' ? '엔화(¥)' : '기타'}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-sm border-b border-blue-100 pb-2"><TrendingUp size={16} /> 매수 상세 (Buy)</div>
                  <div><label className="block text-[11px] font-semibold text-slate-500 mb-1">매수 기준가 (KRW)</label><input type="number" name="buyRate" step="0.01" value={formData.buyRate} onChange={handleInputChange} placeholder={formData.pair === 'JPY' ? "900" : "1450"} className="w-full border border-blue-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-base font-semibold" required /></div>
                  <div><label className="block text-[11px] font-semibold text-slate-500 mb-1">매수 수량 ({formData.pair === 'USD' ? '$' : formData.pair === 'JPY' ? '¥' : 'Unit'})</label><input type="number" name="buyVol" value={formData.buyVol} onChange={handleInputChange} placeholder="1000" className="w-full border border-blue-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-base" required /></div>
                  <div className="flex justify-between items-center pt-1"><span className="text-xs text-slate-500">예상 매수 총액</span><span className="font-mono font-bold text-blue-700">{formatNum(previewBuyTotal)} KRW</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-slate-500 mb-1">매수일</label><input type="date" name="entryDate" value={formData.entryDate} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2 text-sm" /></div>
                  <div><label className="block text-xs font-semibold text-slate-500 mb-1">메모</label><input type="text" name="memo" value={formData.memo} onChange={handleInputChange} placeholder="짧은 기록..." className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" /></div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"><Save size={18} /> 기록 저장하기</button>
              </form>
            </div>
          </div>

          {/* Trade List */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800">투자 내역 ({trades.length})</h2>
                <div className="flex gap-2 text-xs font-medium">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md border border-green-200">보유중 {openPositionsCount}</span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200">청산 {totalClosedTrades}</span>
                </div>
              </div>
              {trades.length === 0 ? (
                <div className="p-10 text-center text-slate-400 flex flex-col items-center justify-center h-64">
                  <Coins size={48} className="mb-4 text-slate-200" /><p>아직 투자 기록이 없습니다.</p><p className="text-sm mt-1">왼쪽에서 달러나 엔화를 매수해보세요.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="p-4 w-[120px]">통화/날짜</th>
                        <th className="p-4 text-right">매수(Buy)</th>
                        <th className="p-4 text-right">매도(Sell)</th>
                        <th className="p-4 text-right">손익(Profit)</th>
                        <th className="p-4 text-center w-[120px]">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4 align-top">
                            <div className="flex items-center gap-2 mb-1">
                               <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${trade.pair === 'USD' ? 'bg-green-50 text-green-600 border-green-200' : trade.pair === 'JPY' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{trade.pair}</span>
                              {trade.status === 'OPEN' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">{trade.entryDate}</div>
                            {trade.memo && <div className="text-xs text-slate-500 mt-1 truncate max-w-[100px]">{trade.memo}</div>}
                          </td>
                          <td className="p-4 text-right align-top">
                            <div className="text-sm font-semibold text-slate-700">@{formatNum(trade.buyRate)}</div>
                            <div className="text-xs text-slate-400">Vol: {formatVol(trade.buyVol)}</div>
                            <div className="text-xs text-blue-600 mt-1 bg-blue-50 inline-block px-1 rounded">{formatNum(trade.totalBuyKrw)}원</div>
                          </td>
                          <td className="p-4 text-right align-top">
                            {trade.status === 'OPEN' ? (
                              <div className="flex justify-end gap-1">
                                <button onClick={() => openSellModal(trade)} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors font-bold">매도</button>
                              </div>
                            ) : (
                              <>
                                <div className="text-sm font-semibold text-slate-700">@{formatNum(trade.sellRate)}</div>
                                <div className="text-xs text-slate-400">{trade.exitDate}</div>
                                <div className="text-xs text-red-600 mt-1 bg-red-50 inline-block px-1 rounded">{formatNum(trade.totalSellKrw)}원</div>
                              </>
                            )}
                          </td>
                          <td className="p-4 text-right align-top">
                            {trade.status === 'OPEN' ? <span className="text-xs text-slate-400 italic">미확정</span> : (
                              <>
                                <div className={`font-mono font-bold text-sm ${trade.profit > 0 ? 'text-red-500' : trade.profit < 0 ? 'text-blue-500' : 'text-slate-400'}`}>{trade.profit > 0 ? '+' : ''}{formatNum(trade.profit)}</div>
                                <div className={`text-xs font-bold ${trade.yieldRate > 0 ? 'text-red-500' : trade.yieldRate < 0 ? 'text-blue-500' : 'text-slate-400'}`}>{trade.yieldRate.toFixed(2)}%</div>
                              </>
                            )}
                          </td>
                          <td className="p-4 text-center align-middle">
                            <div className="flex justify-center gap-1">
                              {trade.status === 'OPEN' && (
                                <button onClick={() => openRolloverModal(trade)} className="text-orange-500 hover:text-orange-600 p-2 rounded-lg hover:bg-orange-50 transition-colors" title="다음달로 이월(Rollover)">
                                  <ArrowRightCircle size={16} />
                                </button>
                              )}
                              <button onClick={() => openEditModal(trade)} className="text-slate-400 hover:text-indigo-500 p-2 rounded-lg hover:bg-indigo-50 transition-colors" title="수정"><Edit2 size={16} /></button>
                              <button onClick={() => analyzeTrade(trade)} className="text-indigo-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors" title="AI 분석"><MessageSquare size={16} /></button>
                              <button onClick={() => deleteTrade(trade.id)} className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors" title="삭제"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sell Modal */}
        {showSellModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 p-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center gap-2 text-sm"><CheckCircle size={16} className="text-green-400"/> 수익 실현 (매도)</h3><button onClick={() => setShowSellModal(false)} className="hover:bg-white/20 p-1 rounded-full transition"><X size={18} /></button></div>
              <form onSubmit={confirmSell} className="p-6 space-y-4">
                <div><label className="block text-xs font-semibold text-slate-500 mb-1">매도 환율 (기준가)</label><input type="number" name="sellRate" step="0.01" value={sellFormData.sellRate} onChange={handleSellInputChange} placeholder="예: 1460" className="w-full border border-slate-300 rounded-lg p-3 pl-3 pr-12 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xl font-bold text-slate-800" autoFocus required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-slate-500 mb-1">매도 수량</label><input type="number" name="sellVol" value={sellFormData.sellVol} onChange={handleSellInputChange} className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm bg-slate-50" required /></div>
                   <div><label className="block text-xs font-semibold text-slate-500 mb-1">매도 날짜</label><input type="date" name="exitDate" value={sellFormData.exitDate} onChange={handleSellInputChange} className="w-full border border-slate-300 rounded-lg p-2 text-sm" /></div>
                </div>
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2">저장하기</button>
              </form>
            </div>
          </div>
        )}

        {/* Rollover Modal (New) */}
        {showRolloverModal && rolloverFormData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-orange-600 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold flex items-center gap-2 text-sm"><ArrowRightCircle size={16} /> 매매 이월 (Rollover)</h3>
                <button onClick={() => setShowRolloverModal(false)} className="hover:bg-white/20 p-1 rounded-full transition"><X size={18} /></button>
              </div>
              <form onSubmit={confirmRollover} className="p-6 space-y-4">
                <div className="text-sm text-slate-600 bg-orange-50 p-3 rounded">
                  <p className="font-bold mb-1">다음 달로 거래를 넘깁니다.</p>
                  <p>현재 포지션을 월말일자({rolloverFormData.closeDate})로 청산하고, 동일한 가격으로 다음달 1일({rolloverFormData.nextEntryDate})에 재진입합니다.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">이월 기준 환율 (월말 평가가)</label>
                  <input 
                    type="number" step="0.01" 
                    value={rolloverFormData.rolloverRate} 
                    onChange={handleRolloverChange}
                    placeholder="예: 1450.50" 
                    className="w-full border border-orange-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 outline-none font-mono text-xl font-bold text-slate-800"
                    autoFocus required 
                  />
                </div>
                <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2">
                  이월 실행
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editFormData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-700 p-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center gap-2 text-sm"><Edit2 size={16} /> 거래 내역 수정</h3><button onClick={() => setShowEditModal(false)} className="hover:bg-white/20 p-1 rounded-full transition"><X size={18} /></button></div>
              <form onSubmit={saveEdit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-blue-600 bg-blue-50 p-2 rounded">매수(진입) 정보</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold text-slate-500 mb-1">매수 기준가</label><input type="number" name="buyRate" step="0.01" value={editFormData.buyRate} onChange={handleEditChange} className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm" /></div>
                    <div><label className="block text-xs font-semibold text-slate-500 mb-1">매수 수량</label><input type="number" name="buyVol" value={editFormData.buyVol} onChange={handleEditChange} className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm" /></div>
                    <div><label className="block text-xs font-semibold text-slate-500 mb-1">매수 날짜</label><input type="date" name="entryDate" value={editFormData.entryDate} onChange={handleEditChange} className="w-full border border-slate-300 rounded-lg p-2 text-sm" /></div>
                     <div><label className="block text-xs font-semibold text-slate-500 mb-1">통화</label><select name="pair" value={editFormData.pair} onChange={handleEditChange} className="w-full border border-slate-300 rounded-lg p-2 text-sm"><option value="USD">USD</option><option value="JPY">JPY</option><option value="ETC">ETC</option></select></div>
                  </div>
                </div>
                {editFormData.status === 'CLOSED' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded">매도(청산) 정보</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs font-semibold text-slate-500 mb-1">매도 기준가</label><input type="number" name="sellRate" step="0.01" value={editFormData.sellRate} onChange={handleEditChange} className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm" /></div>
                      <div><label className="block text-xs font-semibold text-slate-500 mb-1">매도 수량</label><input type="number" name="sellVol" value={editFormData.sellVol} onChange={handleEditChange} className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm" /></div>
                       <div className="col-span-2"><label className="block text-xs font-semibold text-slate-500 mb-1">매도 날짜</label><input type="date" name="exitDate" value={editFormData.exitDate} onChange={handleEditChange} className="w-full border border-slate-300 rounded-lg p-2 text-sm" /></div>
                    </div>
                  </div>
                )}
                <div><label className="block text-xs font-semibold text-slate-500 mb-1">메모</label><textarea name="memo" value={editFormData.memo} onChange={handleEditChange} className="w-full border border-slate-300 rounded-lg p-2 text-sm resize-none" rows="2" /></div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-lg transition-colors">취소</button>
                  <button type="submit" className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors">수정 완료</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI Modal */}
        {showAiModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold flex items-center gap-2"><Sparkles size={18} /> {aiMode === 'journal' ? 'AI 투자 코치 리포트' : 'AI 투자 피드백'}</h3>
                <button onClick={() => setShowAiModal(false)} className="hover:bg-white/20 p-1 rounded-full transition"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto">
                {isAiLoading ? <div className="flex flex-col items-center justify-center py-12 text-slate-500"><Loader2 size={40} className="animate-spin text-indigo-500 mb-4" /><p>데이터를 분석하고 있습니다...</p></div> : <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">{aiResponse}</div>}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;
