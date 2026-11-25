import * as React from 'react';
const { useState, useEffect, useMemo, useCallback, useRef } = React;
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, setDoc, serverTimestamp, getDoc, runTransaction, where } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Plus, Calendar, PieChart, Home, Target, Users, Settings as SettingsIcon, BarChart2, Building2, Clock, ClipboardList, PenTool, Layers, Wallet } from 'lucide-react';
import { ToastProvider, useToast } from './components/Toast';
import { GroupSettingsEditor, RecurringManagerModal } from './components/settings';
import QuickAddSheet from './components/QuickAddSheet';
import { CalculatorInput, ConfirmationModal, GlassButton, InputField, LoadingScreen, ModalWrapper, NoteQuickPicks } from './components/ui';
import { DEFAULT_SETTINGS, GLASS_CARD, GLASS_INPUT, INCOME_CATEGORIES } from './lib/constants';
import { LEDGER_ID, appId, auth, db } from './lib/firebase';
import { getTodayString, haptic, toLocalISOString } from './lib/utils';
import HomeV2 from './views/HomeV2';
import LedgerView from './views/LedgerView';
import BudgetView from './views/BudgetView';
import BucketAnalysis from './views/BucketAnalysis';
import { FLEX_DEFAULT } from './lib/budget';
import { IncomeView } from './views/IncomeView';
import { InvestmentTabView } from './views/InvestmentTabView';
import { MortgageView } from './views/MortgageView';
import { PartnerView } from './views/PartnerView';
import { PrincipalView } from './views/PrincipalView';
import { StockGoalView } from './views/StockGoalView';
import { VisualizationView } from './views/VisualizationView';





function AppContent() {
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const mainRef = useRef(null);
  const transactionSubsRef = useRef({});
  const transactionDataPartsRef = useRef({});
  const [extraYears, setExtraYears] = useState([]);
  const incomeSubsRef = useRef({});
  const incomeDataPartsRef = useRef({});
  const generalSubsRef = useRef({}); // Track general subscriptions

  // Drawer drag gesture for hamburger menu
  const sidebarRef = useRef(null);
  const backdropRef = useRef(null);
  const drawerContainerRef = useRef(null);
  const DRAWER_WIDTH = 256; // w-64 = 16rem = 256px

  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let isDragging = false;
    let directionLocked = false;
    let primaryTouchId = null;

    const setDrawerPosition = (offsetX) => {
      const clamped = Math.max(-DRAWER_WIDTH, Math.min(0, offsetX));
      const progress = 1 + clamped / DRAWER_WIDTH; // 0 (closed) to 1 (open)
      if (sidebarRef.current) sidebarRef.current.style.transform = `translateX(${clamped}px)`;
      if (backdropRef.current) backdropRef.current.style.opacity = `${progress}`;
      if (drawerContainerRef.current) drawerContainerRef.current.style.pointerEvents = progress > 0 ? 'auto' : 'none';
    };

    const enableTransition = () => {
      if (sidebarRef.current) sidebarRef.current.style.transition = 'transform 0.3s ease-out';
      if (backdropRef.current) backdropRef.current.style.transition = 'opacity 0.3s ease-out';
    };

    const disableTransition = () => {
      if (sidebarRef.current) sidebarRef.current.style.transition = 'none';
      if (backdropRef.current) backdropRef.current.style.transition = 'none';
    };

    const snapToNearest = (deltaX) => {
      enableTransition();
      if (isMenuOpen) {
        if (deltaX < -(DRAWER_WIDTH * 0.3)) {
          setDrawerPosition(-DRAWER_WIDTH);
          setIsMenuOpen(false);
        } else {
          setDrawerPosition(0);
        }
      } else {
        if (deltaX > DRAWER_WIDTH * 0.3) {
          setDrawerPosition(0);
          setIsMenuOpen(true);
        } else {
          setDrawerPosition(-DRAWER_WIDTH);
        }
      }
    };

    const handleTouchStart = (e) => {
      // Only track the first finger; ignore additional touches
      if (primaryTouchId !== null) return;
      const touch = e.touches[0];
      primaryTouchId = touch.identifier;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      isDragging = false;
      directionLocked = false;
      if (touchStartX < 30 || isMenuOpen) {
        disableTransition();
      }
    };

    const getTrackedTouch = (touches) => {
      for (let i = 0; i < touches.length; i++) {
        if (touches[i].identifier === primaryTouchId) return touches[i];
      }
      return null;
    };

    const handleTouchMove = (e) => {
      const touch = getTrackedTouch(e.touches);
      if (!touch) return;

      const currentX = touch.clientX;
      const currentY = touch.clientY;
      const deltaX = currentX - touchStartX;
      const deltaY = Math.abs(currentY - touchStartY);

      if (!directionLocked && (Math.abs(deltaX) > 10 || deltaY > 10)) {
        directionLocked = true;
        if (deltaY > Math.abs(deltaX)) { isDragging = false; return; }
        if (touchStartX < 30 || isMenuOpen) isDragging = true;
      }

      if (!isDragging) return;

      if (isMenuOpen) {
        setDrawerPosition(Math.min(0, deltaX));
      } else {
        setDrawerPosition(-DRAWER_WIDTH + Math.max(0, deltaX));
      }
    };

    const handleTouchEnd = (e) => {
      const touch = getTrackedTouch(e.changedTouches);
      if (!touch) return;
      primaryTouchId = null;
      if (!isDragging) return;
      isDragging = false;
      const deltaX = touch.clientX - touchStartX;
      snapToNearest(deltaX);
    };

    const handleTouchCancel = (e) => {
      // Only react if the cancelled touch is our tracked primary touch
      if (e && e.changedTouches) {
        const cancelled = getTrackedTouch(e.changedTouches);
        if (!cancelled) return; // A different finger was cancelled, ignore
      }
      if (isDragging) {
        isDragging = false;
        enableTransition();
        // Snap based on actual drawer position rather than stale isMenuOpen
        const currentTransform = sidebarRef.current ? sidebarRef.current.style.transform : '';
        const match = currentTransform.match(/translateX\((-?[\d.]+)px\)/);
        const currentOffset = match ? parseFloat(match[1]) : (isMenuOpen ? 0 : -DRAWER_WIDTH);
        const progress = 1 + currentOffset / DRAWER_WIDTH;
        if (progress > 0.5) {
          setDrawerPosition(0);
          setIsMenuOpen(true);
        } else {
          setDrawerPosition(-DRAWER_WIDTH);
          setIsMenuOpen(false);
        }
      } else {
        // Not dragging — just reset, snap to current logical state
        enableTransition();
        setDrawerPosition(isMenuOpen ? 0 : -DRAWER_WIDTH);
      }
      primaryTouchId = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isMenuOpen]);



  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  // 新版快速記帳抽屜（新增用；編輯既有紀錄仍走舊表單）。null = 關閉，否則 { date }
  const [quickAdd, setQuickAdd] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', title: '確認', confirmText: '確定', confirmColor: 'bg-slate-800', onConfirm: () => { } });

  const [currentView, setCurrentView] = useState('home');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transitionClass, setTransitionClass] = useState('page-enter-fade');

  // 2.0 導覽：5 個入口（總覽／明細／＋／分析／資產）。收入併入分析；
  // 持股、存股、佳欣儲蓄、淨值、房產併入資產；預算設定從總覽右上角進入。
  const TAB_ITEMS = [
    { id: 'home',          label: '總覽', icon: Home },
    { id: 'calendar',      label: '明細', icon: Calendar },
    { id: 'add',           label: '記一筆', icon: Plus },
    { id: 'visualization', label: '分析', icon: BarChart2 },
    { id: 'assets',        label: '資產', icon: Wallet },
  ];
  const VIEW_TITLES = {
    home: ['總覽', Home], calendar: ['明細', Calendar], visualization: ['分析', BarChart2],
    assets: ['資產', Wallet], settings: ['預算設定', SettingsIcon],
  };
  const ANALYSIS_TABS = [['spend', '支出'], ['income', '收入']];
  const ASSET_TABS = [['principal', '淨值', PieChart], ['watchlist', '持股', Layers], ['stock_goals', '存股', Target], ['partner', '佳欣儲蓄', Users], ['mortgage', '房產', Building2]];
  const [analysisTab, setAnalysisTab] = useState('spend');
  const [assetsTab, setAssetsTab] = useState('principal');
  const [ledgerFocus, setLedgerFocus] = useState(null);
  const clearLedgerFocus = useCallback(() => setLedgerFocus(null), []);
  // 各頁實際顯示的內容（分析、資產頁有子分頁）
  const activeView = currentView === 'visualization' ? (analysisTab === 'income' ? 'income' : 'visualization')
    : currentView === 'assets' ? assetsTab : currentView;
  const TAB_ORDER = ['home', 'calendar', 'visualization', 'assets'];

  const handleViewChange = (viewIdRaw) => {
    if (viewIdRaw === 'add') { haptic(10); setQuickAdd({ date: getTodayString() }); return; }
    // 舊頁面代號（深連結等）轉成新導覽
    let viewId = viewIdRaw;
    if (viewId === 'income') { setAnalysisTab('income'); viewId = 'visualization'; }
    else if (ASSET_TABS.some(([k]) => k === viewId)) { setAssetsTab(viewId); viewId = 'assets'; }
    const prevIdx = TAB_ORDER.indexOf(currentView);
    const nextIdx = TAB_ORDER.indexOf(viewId);
    setTransitionClass(
      prevIdx !== -1 && nextIdx !== -1
        ? (nextIdx > prevIdx ? 'page-enter-right' : 'page-enter-left')
        : 'page-enter-fade'
    );
    haptic(10);
    setCurrentView(viewId);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo(0, 0);
  }, [currentView]);

  // 移除強制 reload：Firestore onSnapshot 會自動 re-sync；reload 會摧毀 UI state

  const [transactions, setTransactions] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [partnerTransactions, setPartnerTransactions] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // 設定資料是否已與伺服器核對過（而非只來自本地快取）。
  // 固定支出提醒必須等這個為 true 才能判斷，否則會拿舊快取誤跳提醒。
  const [settingsFromServer, setSettingsFromServer] = useState(false);

  const [mortgageExpenses, setMortgageExpenses] = useState([]);
  const [mortgageAnalysis, setMortgageAnalysis] = useState([]);
  const [mortgageFunding, setMortgageFunding] = useState([]);
  const [stockGoals, setStockGoals] = useState([]);
  const [usdExchanges, setUsdExchanges] = useState([]);

  // Loading State Tracking
  const [loadingStates, setLoadingStates] = useState({
    auth: false,
    settings: false,
    transactions: false,
    incomes: false,
    salaryHistory: false,
    partnerTransactions: false,
    mortgageExpenses: false,
    mortgageFunding: false,
    mortgageAnalysis: false,
    stockGoals: false,
    usdExchanges: false,
  });

  // App Phase: 'loading' -> 'ready' (hard cut, no fade)
  const [appPhase, setAppPhase] = useState('loading');

  const isDataReady = loadingStates.auth && loadingStates.settings && loadingStates.transactions;

  const loadingProgress = useMemo(() => {
    const coreStates = [loadingStates.auth, loadingStates.settings, loadingStates.transactions];
    const loaded = coreStates.filter(Boolean).length;
    return (loaded / coreStates.length) * 100;
  }, [loadingStates.auth, loadingStates.settings, loadingStates.transactions]);

  // Remove HTML pre-loader on mount
  useEffect(() => {
    const preLoader = document.getElementById('pre-loader');
    if (preLoader) preLoader.remove();
    // React 成功掛載 — 重置看門狗旗標（見 index.html），下次異常仍可自救
    try { sessionStorage.removeItem('pl-reloaded'); } catch { /* ignore */ }
  }, []);

  const handleLoadingDone = useCallback(() => {
    setAppPhase('ready');
  }, []);

  // 保險絲：首次使用（快取全空）又遇到極差網路時，最多等 10 秒就先進入畫面，
  // 之後資料由 onSnapshot 陸續補上，避免載入條無限卡住
  useEffect(() => {
    if (appPhase !== 'loading') return;
    const timer = setTimeout(() => setAppPhase('ready'), 10000);
    return () => clearTimeout(timer);
  }, [appPhase]);

  // Deep link：主畫面捷徑（manifest shortcuts）帶 ?action=… 進來時直接跳到目標動作。
  // 處理完立刻清掉參數，避免之後重新整理重複觸發。
  useEffect(() => {
    if (appPhase !== 'ready') return;
    const action = new URLSearchParams(window.location.search).get('action');
    if (!action) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (action === 'add-expense') {
      setQuickAdd({ date: getTodayString() });
    } else if (action === 'analysis') {
      setCurrentView('visualization');
    }
  }, [appPhase]);

  // Service Worker 更新在「開啟 20 秒後」才完成時不自動重整（避免打斷輸入），
  // 改由 main.jsx 發出事件、這裡提示使用者
  useEffect(() => {
    const onSwUpdated = () => showToast('新版本已就緒，重新開啟 App 後生效', 'warning');
    window.addEventListener('sw-updated', onSwUpdated);
    return () => window.removeEventListener('sw-updated', onSwUpdated);
  }, [showToast]);

  // Recurring Manager State
  const [isRecurringManagerOpen, setIsRecurringManagerOpen] = useState(false);

  // Form States
  // Default amount 0 to prevent layout shift
  const [newTrans, setNewTrans] = useState({ amount: '0', type: 'monthly', group: '', category: '', note: '', date: getTodayString(), payer: 'myself' });


  // --- Auth ---
  // Rely on the persisted session: onAuthStateChanged fires immediately with the
  // restored user on restart (no network round-trip). Only sign in anonymously
  // when there is genuinely no session, avoiding a redundant cold-start auth call.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        if (u.uid !== user?.uid) setUser(u);
        setLoadingStates(prev => ({ ...prev, auth: true }));
      } else {
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged will fire again with the new user
        } catch (e) {
          console.warn('Anonymous sign-in failed:', e);
          setLoadingStates(prev => ({ ...prev, auth: true }));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 1. General Data Listeners (Lazy Loader)
  useEffect(() => {
    if (!user) return;
    const createSub = (col, setter, loadingKey, order = 'date', dir = 'desc') => {
      if (generalSubsRef.current[col]) return; // Already subscribed
      const q = query(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, col), orderBy(order, dir));
      generalSubsRef.current[col] = onSnapshot(q, (s) => {
        const rawData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        const seen = new Set();
        const uniqueData = [];
        rawData.forEach(item => {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            uniqueData.push(item);
          }
        });
        setter(uniqueData);
        if (loadingKey) setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
      }, (error) => console.error(`Error fetching ${col}:`, error));
    };

    // Prefetch every secondary collection once the home screen is ready, so other
    // tabs open with data already in hand instead of flashing an empty state.
    // Before "ready" we don't compete with the critical home load; if the user
    // somehow navigates first, the matching currentView still triggers its load.
    const prefetch = appPhase === 'ready';
    if (prefetch || currentView === 'income') {
      createSub('salary_history', setSalaryHistory, 'salaryHistory');
    }
    if (prefetch || currentView === 'partner') {
      createSub('partner_savings', setPartnerTransactions, 'partnerTransactions');
    }
    if (prefetch || currentView === 'mortgage') {
      createSub('mortgage_expenses', setMortgageExpenses, 'mortgageExpenses');
      createSub('mortgage_funding', setMortgageFunding, 'mortgageFunding');
      createSub('mortgage_analysis', setMortgageAnalysis, 'mortgageAnalysis', 'createdAt', 'asc');
    }
    if (prefetch || currentView === 'stock_goals') {
      createSub('stock_goals', setStockGoals, 'stockGoals', 'year', 'desc');
      createSub('usd_exchanges', setUsdExchanges, 'usdExchanges');
    }
  }, [user, currentView, appPhase]);

  // Clean up on user logout/unmount
  useEffect(() => {
    return () => {
      Object.values(generalSubsRef.current).forEach(u => u());
      generalSubsRef.current = {};
      Object.values(transactionSubsRef.current).forEach(u => u());
      transactionSubsRef.current = {};
      transactionDataPartsRef.current = {};
      Object.values(incomeSubsRef.current).forEach(u => u());
      incomeSubsRef.current = {};
      incomeDataPartsRef.current = {};
    };
  }, [user]);

  // 2. Transaction Lazy Loader (Run on year change OR when extra years requested)
  useEffect(() => {
    if (!user) return;
    const year = selectedDate.getFullYear();
    const currentYear = new Date().getFullYear();
    // Ensure we load both selected year, current year, and any requested history
    const years = Array.from(new Set([year, currentYear, ...extraYears]));

    years.forEach(y => {
      if (transactionSubsRef.current[y]) return; // Skip if already subscribed

      const start = `${y}-01-01`;
      const end = `${y}-12-31`;
      const q = query(
        collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions'),
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date', 'desc')
      );

      transactionSubsRef.current[y] = onSnapshot(q, (snapshot) => {
        try {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          if (transactionDataPartsRef.current) {
            transactionDataPartsRef.current[y] = docs;

            // K-way merge: each partition pre-sorted desc by Firestore orderBy
            const parts = Object.entries(transactionDataPartsRef.current)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([, p]) => p);
            const indices = parts.map(() => 0);
            const merged = [];
            while (true) {
              let bestIdx = -1;
              let bestDate = '';
              for (let i = 0; i < parts.length; i++) {
                if (indices[i] < parts[i].length) {
                  const d = String(parts[i][indices[i]].date || '');
                  if (bestIdx === -1 || d > bestDate) { bestIdx = i; bestDate = d; }
                }
              }
              if (bestIdx === -1) break;
              merged.push(parts[bestIdx][indices[bestIdx]]);
              indices[bestIdx]++;
            }
            setTransactions(merged);
            setLoadingStates(prev => ({ ...prev, transactions: true }));
          }
        } catch (err) {
          console.error("Merge Error:", err);
        }
      });
    });
  }, [user, selectedDate.getFullYear(), extraYears]);

  // 2b. Incomes Lazy Loader (same pattern as transactions)
  useEffect(() => {
    if (!user) return;
    const year = selectedDate.getFullYear();
    const currentYear = new Date().getFullYear();
    // 2.0 收入頁要和去年同期比，也可以切換年份：多載去年＋使用者翻到的年份
    const years = Array.from(new Set([year, currentYear, currentYear - 1, ...extraYears]));

    years.forEach(y => {
      if (incomeSubsRef.current[y]) return;
      const start = `${y}-01-01`;
      const end = `${y}-12-31`;
      const q = query(
        collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'incomes'),
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date', 'desc')
      );
      incomeSubsRef.current[y] = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        incomeDataPartsRef.current[y] = docs;
        const allIncomes = Object.values(incomeDataPartsRef.current).flat();
        allIncomes.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        setIncomes(allIncomes);
        setLoadingStates(prev => ({ ...prev, incomes: true }));
      });
    });
  }, [user, selectedDate.getFullYear(), extraYears]);

  const requestHistory = useCallback((year) => {
    setExtraYears(prev => {
      if (prev.includes(year)) return prev;
      return [...prev, year];
    });
  }, []);



  // Settings listener - depends on year, separate from data listeners
  useEffect(() => {
    if (!user) return;

    const viewYear = selectedDate.getFullYear();
    const settingsRef = doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', `config_${viewYear}`);

    // includeMetadataChanges: 即使資料內容和快取相同，伺服器核對完成時也會再收到
    // 一次 fromCache=false 的快照 — 固定支出提醒靠這個訊號避免誤判
    setSettingsFromServer(false);
    const unsubSettings = onSnapshot(settingsRef, { includeMetadataChanges: true }, async (docSnap) => {
      setSettingsFromServer(!docSnap.metadata.fromCache);
      if (docSnap.exists()) {
        setSettings(docSnap.data());
        // Mark settings as loaded
        setLoadingStates(prev => ({ ...prev, settings: true }));
      } else {
        // Migration: If config for this year doesn't exist, try to copy from config_v2 (legacy global)
        // or just use defaults.
        try {
          const globalRef = doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'config_v2');
          const globalSnap = await getDoc(globalRef);
          const initialData = globalSnap.exists() ? globalSnap.data() : DEFAULT_SETTINGS;

          // Initialise the new year's config
          await setDoc(settingsRef, initialData);
        } catch (e) {
          console.error("Migration failed:", e);
          setSettings(DEFAULT_SETTINGS);
        }
      }
    });

    return () => unsubSettings();
  }, [user, selectedDate.getFullYear()]);

  // 2.0 彈性額度：settings/budget_v2_{year}（新文件，不動正式版使用的 config_{year}）
  const [flexMonthly, setFlexMonthly] = useState(FLEX_DEFAULT);
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', `budget_v2_${selectedDate.getFullYear()}`);
    return onSnapshot(ref, (snap) => setFlexMonthly(Number(snap.data()?.flexMonthly) || FLEX_DEFAULT), () => {});
  }, [user, selectedDate.getFullYear()]);
  const handleSaveFlex = (n) => {
    commit(setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', `budget_v2_${selectedDate.getFullYear()}`), { flexMonthly: n, updatedAt: serverTimestamp() }, { merge: true }));
    showToast('已更新彈性額度');
  };

  // Recurring — 每月固定支出「全自動」入帳（不跳確認視窗）：
  // 觸發條件：檢視年份 = 今年、設定已與伺服器核對（避免快取舊狀態誤判）、
  // 本月尚未入帳。實際寫入用 Firestore transaction 原子鎖定當月 —
  // 多台裝置同時開啟也只會有一台成功入帳，其餘靜默跳過。
  const recurringRunMonthRef = useRef(''); // 本次開啟已嘗試過的月份（防重入）
  useEffect(() => {
    if (!settings.monthlyGroups) return;
    if (!settingsFromServer) return;
    if (selectedDate.getFullYear() !== new Date().getFullYear()) return;

    const currentMonth = getTodayString().substring(0, 7);
    if (settings.lastRecurringCheck === currentMonth) return;
    const activeItems = (settings.recurringItems || []).filter(i => i.active);
    if (activeItems.length === 0) return;
    if (recurringRunMonthRef.current === currentMonth) return;
    recurringRunMonthRef.current = currentMonth;

    const autoPost = async () => {
      const currentYear = new Date().getFullYear();
      const yearConfigRef = doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', `config_${currentYear}`);
      const globalConfigRef = doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'config_v2');
      const txCollection = collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions');
      try {
        const result = await runTransaction(db, async (tx) => {
          const snap = await tx.get(yearConfigRef);
          if (snap.exists() && snap.data().lastRecurringCheck === currentMonth) return null; // 另一台已完成

          let total = 0;
          for (const item of activeItems) {
            const day = parseInt(item.day || 1, 10);
            const [y, m] = currentMonth.split('-').map(Number);
            const daysInMonth = new Date(y, m, 0).getDate();
            const finalDate = `${currentMonth}-${String(Math.min(day, daysInMonth)).padStart(2, '0')}`;
            tx.set(doc(txCollection), {
              amount: Number(item.amount),
              type: 'monthly',
              group: item.group,
              category: item.category,
              note: item.name,
              date: finalDate,
              payer: item.payer || 'myself',
              createdAt: serverTimestamp()
            });
            total += Number(item.amount);
          }
          tx.set(yearConfigRef, { lastRecurringCheck: currentMonth }, { merge: true });
          tx.set(globalConfigRef, { lastRecurringCheck: currentMonth }, { merge: true });
          return { count: activeItems.length, total };
        });

        if (result) {
          haptic(15);
          showToast(`已自動入帳本月固定支出 ${result.count} 筆，共 $${result.total.toLocaleString()}`);
        }
      } catch (e) {
        // 離線或連線不穩：這次先跳過，允許下一次設定同步時重試
        console.warn('Auto recurring post failed (will retry):', e);
        recurringRunMonthRef.current = '';
      }
    };
    autoPost();
  }, [settings, settingsFromServer, selectedDate, showToast]);

  const handleSaveRecurring = (items) => {
    const year = selectedDate.getFullYear();
    const updates = { recurringItems: items };
    commit(setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', `config_${year}`), updates, { merge: true }));
    commit(setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', 'config_v2'), updates, { merge: true }));
  };

  // Form Defaults Logic
  useEffect(() => {
    const groups = newTrans.type === 'monthly' ? (settings.monthlyGroups || []) : (settings.annualGroups || []);
    if (groups && groups.length > 0) {
      const currentGroupValid = groups.find(g => g.name === newTrans.group);
      if (!newTrans.group || !currentGroupValid) {
        const firstGroup = groups[0];
        setNewTrans(prev => ({
          ...prev,
          group: firstGroup.name,
          category: firstGroup.items.length > 0 ? firstGroup.items[0].name : ''
        }));
      } else {
        const currentCategoryValid = currentGroupValid.items.find(i => i.name === newTrans.category);
        if (!newTrans.category || !currentCategoryValid) {
          setNewTrans(prev => ({
            ...prev,
            category: currentGroupValid.items.length > 0 ? currentGroupValid.items[0].name : ''
          }));
        }
      }
    }
  }, [settings, newTrans.type, newTrans.group]);


  // --- Action Wrapper ---
  // Firestore 的寫入 Promise 要等「伺服器回覆」才 resolve，但本地快取在呼叫當下
  // 就已寫入、onSnapshot 也立即更新畫面。因此 UI 流程不等網路：commit() 送出寫入
  // 後立刻返回，罕見的同步失敗（如權限被拒）才用 toast 提示。
  // 離線時 Promise 會持續等待（不會 reject），資料已排入本地佇列、連線後自動同步。
  const commit = useCallback((promise) => {
    promise.catch(e => {
      console.error('Firestore write failed:', e);
      showToast('資料同步失敗：' + e.message, 'error');
    });
  }, [showToast]);

  // 寫入改為非阻塞後 isSubmitting 幾乎立刻歸位，改用時間戳擋快速連點造成的重複送出
  const submitLockRef = useRef(0);
  const withSubmission = async (action) => {
    const now = Date.now();
    if (isSubmitting || now - submitLockRef.current < 400) return;
    submitLockRef.current = now;
    setIsSubmitting(true);
    try { await action(); } catch (e) { console.error(e); showToast('發生錯誤: ' + e.message, 'error'); } finally { setIsSubmitting(false); }
  };

  const requestConfirmation = ({ message, title = '確認', confirmText = '確定', confirmColor = 'bg-slate-800', onConfirm }) => {
    setConfirmModal({ isOpen: true, message, title, confirmText, confirmColor, onConfirm });
  };
  const requestDelete = (message, action) => requestConfirmation({ message, title: '確認刪除', confirmText: '刪除', confirmColor: 'bg-rose-500', onConfirm: action });

  // --- Handlers ---
  const handleAddTransaction = (e, options = {}) => {
    if (e) e.preventDefault();
    const { overrideTrans = null, keepOpen = false } = options;
    const saveTrans = overrideTrans || newTrans;

    withSubmission(async () => {
      if (editingId) {

        // Clean data: remove ID from body and ensure numeric amount
        const { id, ...updateData } = saveTrans;
        commit(setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions', editingId), { ...updateData, amount: Number(saveTrans.amount) }, { merge: true }));
      } else {

        const { id, ...createData } = saveTrans;
        commit(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions'), { ...createData, amount: Number(saveTrans.amount), createdAt: serverTimestamp() }));
      }
      haptic(15);
      // Clear amount + note for the next entry; keep group/category/payer/date as-is
      setNewTrans(prev => ({ ...prev, amount: '0', note: '' }));
      if (keepOpen && !editingId) {
        showToast('已記一筆，可繼續輸入');
      } else {
        showToast(editingId ? '已更新支出' : '已記一筆');
        setIsAddTxModalOpen(false);
        setEditingId(null);
      }
    });
  };
  // 快速記帳抽屜送出（新增）
  const handleQuickSave = (tx, { keepOpen = false, noSpend = false } = {}) => {
    withSubmission(async () => {
      commit(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions'), { ...tx, amount: Number(tx.amount), createdAt: serverTimestamp() }));
      haptic(15);
      const msg = noSpend ? `已標記：${tx.note}` : '已記一筆';
      if (keepOpen) showToast(`${msg}，可繼續輸入`);
      else { showToast(msg); setQuickAdd(null); }
    });
  };
  // 2.0 收入、資產各頁共用：有 id 就合併更新，沒有就新增
  const saveRecord = (col, data, id, msg) => {
    const ref = collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, col);
    commit(id ? setDoc(doc(ref, id), { ...data, updatedAt: serverTimestamp() }, { merge: true }) : addDoc(ref, { ...data, createdAt: serverTimestamp() }));
    haptic(15);
    showToast(msg || (id ? '已更新' : '已儲存'));
  };
  const removeRecord = (col, id, message) => requestDelete(message || '確定刪除？', () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, col, id))));
  const deleteTransaction = (id) => requestDelete("確定刪除此筆支出紀錄？", () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions', id))));

  const handleAddStockGoalYear = () => {
    const maxYear = stockGoals.length > 0 ? stockGoals[0].year : 2021;
    const nextYear = maxYear + 1;
    commit(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'stock_goals'), { year: nextYear, roi: 0, firstrade: 0, ib: 0, withdrawal: 0, createdAt: serverTimestamp() }));
  };
  const handleDeleteStockGoalYear = (id) => requestDelete('確定刪除此年份的存股計畫？', () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'stock_goals', id))));
  const updateSettings = (newGroups, type) => {
    const newSettings = { ...settings };
    if (type === 'monthly') newSettings.monthlyGroups = newGroups;
    else newSettings.annualGroups = newGroups;

    // Write to the currently selected year's config
    const viewYear = selectedDate.getFullYear();
    commit(setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'settings', `config_${viewYear}`), newSettings));
  };

  const handleDateNavigate = (direction) => { const newDate = new Date(selectedDate); if (currentView === 'income' || currentView === 'settings') newDate.setFullYear(selectedDate.getFullYear() + direction); else newDate.setMonth(selectedDate.getMonth() + direction); setSelectedDate(newDate); };

  // --- Main Render ---
  return (
    <div className="flex flex-col h-screen app-bg text-slate-800 tabular-nums overflow-hidden max-w-md mx-auto relative shadow-2xl">
      {/* Loading Screen - completely covers viewport until done, then unmounts */}
      {appPhase === 'loading' && (
        <LoadingScreen progress={loadingProgress} isComplete={isDataReady} onDone={handleLoadingDone} />
      )}

      {/* Main App Content - only renders after LoadingScreen unmounts */}
      {appPhase === 'ready' && (
        <>
          {/* ── Header (fixed positioning avoids sticky-in-flex glitch) */}
          <header className="app-header px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-20 animate-in fade-in duration-300 header-safe max-w-md mx-auto" style={{ paddingBottom: '0.75rem' }}>
            <div className="w-auto min-w-[36px] shrink-0" aria-hidden="true" />
            <div className="flex-1 flex justify-center min-w-0 px-3">
              <h1 className="text-base font-bold text-slate-700 tracking-wide flex items-center gap-1.5 truncate">
                {VIEW_TITLES[currentView] && React.createElement(VIEW_TITLES[currentView][1], { className: "w-4 h-4 text-slate-400" })}
                {VIEW_TITLES[currentView]?.[0]}
              </h1>
            </div>
            <div className="w-auto min-w-[36px] flex justify-end shrink-0">
              {currentView === 'settings' && (
                <button onClick={() => handleViewChange('home')} className="text-xs font-bold text-slate-500 px-2 py-1 rounded-full hover:bg-slate-100">完成</button>
              )}
              {currentView === 'home' && (
                <button onClick={() => handleViewChange('settings')} className="p-1.5 mr-1.5 rounded-full text-slate-400 hover:bg-slate-100 active:scale-95" aria-label="預算設定"><SettingsIcon className="w-4 h-4" /></button>
              )}
              {(currentView === 'home' || activeView === 'income') && (
                <div className="flex items-center bg-white rounded-full px-1 py-0.5 border border-slate-200 shadow-sm">
                  <button onClick={() => handleDateNavigate(-1)} className="p-1 hover:bg-slate-100 rounded-full transition-colors active:scale-95"><ChevronLeft className="w-3 h-3 text-slate-600" /></button>
                  <span className="text-xs font-bold text-slate-700 mx-1 tabular-nums whitespace-nowrap">{currentView === 'home' ? `${selectedDate.getMonth() + 1} 月` : `${selectedDate.getFullYear()} 年`}</span>
                  <button onClick={() => handleDateNavigate(1)} className="p-1 hover:bg-slate-100 rounded-full transition-colors active:scale-95"><ChevronRight className="w-3 h-3 text-slate-600" /></button>
                </div>
              )}
            </div>
          </header>

          {/* Spacer to compensate for fixed header height (header-safe + ~3.5rem content) */}
          <div className="shrink-0 header-safe" style={{ paddingBottom: '3.5rem' }} />

          <main ref={mainRef} className="flex-1 overflow-y-auto p-5 scrollbar-hide relative z-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}>
            <div key={currentView} className={transitionClass}>
            {/* 分析、資產頁的子分頁 */}
            {(currentView === 'visualization' || currentView === 'assets') && (
              <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-slate-100 rounded-full p-0.5 mb-5">
                {(currentView === 'visualization' ? ANALYSIS_TABS : ASSET_TABS).map(([k, label]) => {
                  const on = currentView === 'visualization' ? analysisTab === k : assetsTab === k;
                  return (
                    <button key={k} onClick={() => { haptic(8); if (currentView === 'visualization') setAnalysisTab(k); else setAssetsTab(k); }}
                      className={`flex-1 shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${on ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>{label}</button>
                  );
                })}
              </div>
            )}
            {currentView === 'home' && (
              <HomeV2
                transactions={transactions}
                settings={settings}
                flexMonthly={flexMonthly}
                selectedDate={selectedDate}
                onOpenDay={(ds) => { setLedgerFocus(ds); handleViewChange('calendar'); }}
                onOpenBudget={() => handleViewChange('settings')}
                onEdit={(t) => { setNewTrans({ ...t, amount: t.amount }); setEditingId(t.id); setIsAddTxModalOpen(true); }}
              />
            )}
            {/* 新增: Investment Tab View (持股檢視 + 占比計算) */}
            {activeView === 'watchlist' && <InvestmentTabView user={user} db={db} appId={appId} requestConfirmation={requestConfirmation} />}
            {activeView === 'stock_goals' && <StockGoalView loading={!loadingStates.stockGoals} goals={stockGoals} exchanges={usdExchanges} onAddYear={handleAddStockGoalYear} onDeleteYear={handleDeleteStockGoalYear} onSave={saveRecord} onRemove={removeRecord} />}
            {activeView === 'mortgage' && (
              <MortgageView loading={!loadingStates.mortgageExpenses} mortgageExpenses={mortgageExpenses} mortgageAnalysis={mortgageAnalysis} mortgageFunding={mortgageFunding} onSave={saveRecord} onRemove={removeRecord} />
            )}
            {activeView === 'principal' && (
              <PrincipalView user={user} db={db} appId={appId} requestDelete={requestDelete} requestConfirmation={requestConfirmation} />
            )}
            {activeView === 'visualization' && (
              <div className="mb-6">
                <BucketAnalysis transactions={transactions} settings={settings} flexMonthly={flexMonthly} onRequestHistory={requestHistory} />
                <div className="flex items-center gap-2 mt-8 mb-3 px-1"><span className="h-px flex-1 bg-slate-200" /><span className="text-xs font-bold text-slate-400">依預算群組看細項</span><span className="h-px flex-1 bg-slate-200" /></div>
              </div>
            )}
            {activeView === 'visualization' && <VisualizationView transactions={transactions} settings={settings} onRequestHistory={requestHistory} onEdit={(t) => { setNewTrans({ ...t, amount: t.amount }); setEditingId(t.id); setIsAddTxModalOpen(true); }} />}
            {activeView === 'income' && (
              <IncomeView loading={!loadingStates.incomes} incomes={incomes} salaryHistory={salaryHistory} selectedDate={selectedDate} onRequestHistory={requestHistory} onSave={saveRecord} onRemove={removeRecord} />
            )}
            {activeView === 'partner' && (
              <PartnerView loading={!loadingStates.partnerTransactions} partnerTransactions={partnerTransactions} onSave={saveRecord} onRemove={removeRecord} />
            )}
            {currentView === 'calendar' && (
              <LedgerView
                transactions={transactions}
                settings={settings}
                selectedDate={selectedDate}
                focusDate={ledgerFocus}
                onFocusConsumed={clearLedgerFocus}
                deleteTransaction={deleteTransaction}
                onEdit={(item) => {

                  if (!item.id) {
                    showToast('錯誤：此交易沒有有效ID，無法編輯', 'error');
                    return;
                  }
                  setNewTrans({ ...item, amount: item.amount });
                  setEditingId(item.id);

                  setIsAddTxModalOpen(true);
                }}
                onAddExpense={(dateStr) => setQuickAdd({ date: dateStr || getTodayString() })}
                onRequestHistory={requestHistory}
              />
            )}
            {currentView === 'settings' && (
              <BudgetView
                year={selectedDate.getFullYear()}
                settings={settings}
                flexMonthly={flexMonthly}
                transactions={transactions}
                onSaveFlex={handleSaveFlex}
                onOpenRecurring={() => setIsRecurringManagerOpen(true)}
                onSaveAnnualBudgets={(g) => { updateSettings(g, 'annual'); showToast('已更新年度預算'); }}
                advanced={(
                  <>
                    <div className="bg-[#FAF6EE] border border-[#F3EBDA] rounded-xl p-4 mb-6 text-xs text-[#8F7439]">
                      正在編輯 {selectedDate.getFullYear()} 年的分類設定，和正式版共用。月預算金額只在正式版（舊制）使用。
                    </div>
                    <GroupSettingsEditor title={`${selectedDate.getFullYear()}年月度分類`} groups={settings.monthlyGroups || []} onSave={(g) => updateSettings(g, 'monthly')} idPrefix="monthly" />
                    <GroupSettingsEditor title={`${selectedDate.getFullYear()}年年度分類`} groups={settings.annualGroups || []} onSave={(g) => updateSettings(g, 'annual')} idPrefix="annual" />
                  </>
                )}
              />
            )}
            </div>{/* /page-transition-wrapper */}
          </main>

          {/* ── Bottom Tab Bar */}
          <nav className="tab-bar tab-bar-safe safe-x">
            <div className="flex items-center justify-around px-2 pt-2">
              {TAB_ITEMS.map(tab => {
                if (tab.id === 'add') {
                  return (
                    <button key={tab.id} onClick={() => handleViewChange('add')} aria-label="記一筆"
                      className="-mt-5 w-14 h-14 rounded-full bg-slate-800 text-white shadow-lg shadow-slate-400/40 flex items-center justify-center active:scale-90 transition-transform">
                      <Plus className="w-6 h-6" />
                    </button>
                  );
                }
                const isActive = currentView === tab.id || (tab.id === 'home' && currentView === 'settings');
                return (
                  <button key={tab.id} onClick={() => handleViewChange(tab.id)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all active:scale-90 min-w-[3.5rem] ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                    <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-slate-100' : ''}`}>
                      <tab.icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'text-slate-800' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight transition-all duration-200 ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>



          {/* --- Modals --- */}
          {quickAdd && (
            <QuickAddSheet
              transactions={transactions}
              settings={settings}
              initialDate={quickAdd.date}
              isSubmitting={isSubmitting}
              onSave={handleQuickSave}
              onClose={() => setQuickAdd(null)}
            />
          )}
          {
            isAddTxModalOpen && (
              <ModalWrapper title={editingId ? "編輯支出" : "新增支出"} onClose={() => { setIsAddTxModalOpen(false); setEditingId(null); setNewTrans({ amount: '', type: 'monthly', group: '', category: '', note: '', date: getTodayString(), payer: 'myself' }); }}>
                {/* 檢查是否有設定預算群組，若無則提示 */}
                {((settings.monthlyGroups || []).length === 0 && (settings.annualGroups || []).length === 0) ? (
                  <div className="text-center py-10">
                    <p className="text-slate-500 mb-4">請先設定預算分類</p>
                    <GlassButton onClick={() => { setIsAddTxModalOpen(false); setCurrentView('settings'); }}>前往設定</GlassButton>
                  </div>
                ) : (
                  <form onSubmit={handleAddTransaction} className="space-y-0 relative">
                    {/* Ultimate Quick-Add Section */}
                    
                    {/* Amount Input (Main focus) */}
                    <div className="mb-6">
                      <CalculatorInput
                        value={newTrans.amount}
                        onChange={(val) => setNewTrans({ ...newTrans, amount: val })}
                      />
                    </div>

                    {/* Note Input (Always visible) */}
                    <div className="mb-6">
                      <div className="w-full relative mb-2.5">
                        <InputField value={newTrans.note} onChange={(e) => setNewTrans({ ...newTrans, note: e.target.value })} placeholder="輸入備註 (選填)..." />
                        <PenTool className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none z-10" />
                      </div>

                      {/* Top 5 Smart Notes (filtered by payer + group) */}
                      {(() => {
                        const noteStats = {};
                        transactions.forEach(t => {
                          if (t.payer !== newTrans.payer) return;
                          if (newTrans.group && t.group !== newTrans.group) return;
                          if (newTrans.category && t.category !== newTrans.category) return;
                          const n = (t.note || '').trim();
                          if (!n || n === '請客/自煮' || n === '減肥/斷食' || n === '減肥/沒吃') return;
                          if (!noteStats[n]) noteStats[n] = { count: 0, mappings: {} };
                          noteStats[n].count++;
                          const mappingKey = `${t.type}|${t.group}|${t.category}`;
                          noteStats[n].mappings[mappingKey] = (noteStats[n].mappings[mappingKey] || 0) + 1;
                        });

                        const top5Notes = Object.entries(noteStats)
                          .sort((a, b) => b[1].count - a[1].count)
                          .slice(0, 5)
                          .map(([note, data]) => {
                            let bestMapping = '';
                            let maxCount = 0;
                            Object.entries(data.mappings).forEach(([mk, count]) => {
                              if (count > maxCount) {
                                maxCount = count;
                                bestMapping = mk;
                              }
                            });
                            const [type, group, category] = bestMapping.split('|');
                            return { note, type, group, category, count: data.count };
                          });

                        if (top5Notes.length === 0) return null;

                        return (
                          <div>
                            <div className="flex items-center gap-1.5 mb-2 ml-1">
                              <Clock className="w-3 h-3 text-slate-300" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">常用備註 (點擊自動帶入分類)</span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                              {top5Notes.map(({ note, type, group, category }) => (
                                <button
                                  key={note}
                                  type="button"
                                  onClick={() => setNewTrans(prev => ({
                                    ...prev,
                                    note,
                                    type: type && type !== 'undefined' ? type : prev.type,
                                    group: group && group !== 'undefined' ? group : prev.group,
                                    category: category && category !== 'undefined' ? category : prev.category
                                  }))}
                                  className="flex-shrink-0 px-4 py-2 bg-slate-50/80 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95 border border-slate-200/60"
                                >
                                  {note}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="border-t border-slate-100 my-5"></div>

                    {/* Group & Category Grids */}
                    <div className="space-y-5 mb-2">
                      {/* Group Flow (Horizontal Scroll) */}
                      {(() => {
                        const monthlyGroups = (settings.monthlyGroups || []).map(g => ({ ...g, budgetType: 'monthly' }));
                        const annualGroups = (settings.annualGroups || []).map(g => ({ ...g, budgetType: 'annual' }));
                        
                        return (
                          <div>
                            <div className="flex justify-between items-end mb-2 ml-1">
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">分類群組</label>
                            </div>
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                              <div className="flex bg-slate-100/80 p-1 rounded-2xl">
                                {monthlyGroups.map(g => (
                                  <button key={`m-${g.name}`} type="button" onClick={() => {
                                    const firstItem = g.items?.[0]?.name || '';
                                    setNewTrans({ ...newTrans, type: 'monthly', group: g.name, category: firstItem });
                                  }} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                                    newTrans.group === g.name && newTrans.type === 'monthly'
                                      ? 'bg-white text-slate-800 shadow-sm'
                                      : 'text-slate-500 hover:text-slate-700'
                                  }`}>{g.name}</button>
                                ))}
                                {annualGroups.map(g => (
                                  <button key={`a-${g.name}`} type="button" onClick={() => {
                                    const firstItem = g.items?.[0]?.name || '';
                                    setNewTrans({ ...newTrans, type: 'annual', group: g.name, category: firstItem });
                                  }} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                                    newTrans.group === g.name && newTrans.type === 'annual'
                                      ? 'bg-white text-slate-800 shadow-sm'
                                      : 'text-slate-400 hover:text-slate-600'
                                  }`}>
                                    <span className="text-[9px] text-slate-400 mr-1">年</span>{g.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Category Grid */}
                      {(() => {
                        const currentGroups = newTrans.type === 'monthly' ? (settings.monthlyGroups || []) : (settings.annualGroups || []);
                        const currentGroup = currentGroups.find(g => g.name === newTrans.group);
                        const items = currentGroup?.items || [];
                        if (items.length === 0) return null;
                        return (
                          <div className="grid grid-cols-3 gap-2.5 mt-4">
                            {items.map(item => (
                              <button
                                key={item.name}
                                type="button"
                                onClick={() => setNewTrans({ ...newTrans, category: item.name })}
                                className={`py-3.5 px-2 rounded-xl text-xs font-bold transition-all active:scale-95 text-center truncate ${
                                  newTrans.category === item.name
                                    ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {item.name}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Payer & Date (secondary — defaults to 士程 / today) */}
                    <div className="border-t border-slate-100 my-5"></div>
                    <div className="flex gap-3 mb-1">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">付款人</label>
                        <div className="bg-slate-100/50 p-1 rounded-2xl flex h-[52px] items-center">
                          <button type="button" onClick={() => setNewTrans({ ...newTrans, payer: 'myself' })} className={`flex-1 h-full rounded-xl text-sm font-bold transition-all ${newTrans.payer === 'myself' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>士程</button>
                          <button type="button" onClick={() => setNewTrans({ ...newTrans, payer: 'partner' })} className={`flex-1 h-full rounded-xl text-sm font-bold transition-all ${newTrans.payer === 'partner' ? 'bg-white shadow-sm text-rose-500' : 'text-slate-400'}`}>佳欣</button>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">日期</label>
                        <input type="date" value={newTrans.date} onChange={(e) => setNewTrans({ ...newTrans, date: e.target.value })} required className={`${GLASS_INPUT} h-[52px] py-0`} />
                        {/* 日期快捷：補記昨天/前天的支出不用開日曆選 */}
                        <div className="flex gap-1.5 mt-2">
                          {[['今天', 0], ['昨天', 1], ['前天', 2]].map(([label, off]) => {
                            const d = new Date();
                            d.setDate(d.getDate() - off);
                            const val = toLocalISOString(d);
                            const active = newTrans.date === val;
                            return (
                              <button key={label} type="button" onClick={() => setNewTrans(prev => ({ ...prev, date: val }))}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 border ${active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white/50 text-slate-500 border-slate-200'}`}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2.5">
                      {!editingId && (
                        <GlassButton type="button" variant="ghost" disabled={isSubmitting} onClick={() => handleAddTransaction(null, { keepOpen: true })} className="flex-1 py-4 text-sm rounded-2xl whitespace-nowrap">
                          {isSubmitting ? '處理中...' : '儲存並再記一筆'}
                        </GlassButton>
                      )}
                      <GlassButton type="submit" disabled={isSubmitting} className={`${editingId ? 'w-full' : 'flex-1'} py-4 text-base rounded-2xl shadow-xl shadow-slate-300/50 whitespace-nowrap`}>{isSubmitting ? '處理中...' : '確認儲存'}</GlassButton>
                    </div>
                  </form>
                )}
              </ModalWrapper>
            )
          }


          <ConfirmationModal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            onConfirm={async () => {
              try {
                await confirmModal.onConfirm();
              } catch (e) {
                console.error("Action Failed:", e);
                showToast("操作失敗: " + e.message, 'error');
              } finally {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
              }
            }}
            message={confirmModal.message}
            title={confirmModal.title}
            confirmText={confirmModal.confirmText}
            confirmColor={confirmModal.confirmColor}
          />

          <RecurringManagerModal
            isOpen={isRecurringManagerOpen}
            onClose={() => setIsRecurringManagerOpen(false)}
            items={settings.recurringItems || []}
            onSave={handleSaveRecurring}
            groups={settings.monthlyGroups || []}
          />
        </>
      )
      }
    </div >
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
