import * as React from 'react';
const { useState, useEffect, useMemo, useCallback, useRef } = React;
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, setDoc, serverTimestamp, updateDoc, getDoc, runTransaction, where } from 'firebase/firestore';
import { Menu, ChevronLeft, ChevronRight, Plus, Calendar, DollarSign, PieChart, Home, Target, Users, Settings as SettingsIcon, BarChart2, Building2, Clock, ClipboardList, PenTool, Layers } from 'lucide-react';
import icon from './assets/icon.png';
import { ToastProvider, useToast } from './components/Toast';
import { GroupSettingsEditor, RecurringManagerModal } from './components/settings';
import { CalculatorInput, ConfirmationModal, GlassButton, InputField, LoadingScreen, ModalWrapper, NoteQuickPicks } from './components/ui';
import { DEFAULT_SETTINGS, GLASS_CARD, GLASS_INPUT, INCOME_CATEGORIES, MENU_ITEMS_FLAT } from './lib/constants';
import { LEDGER_ID, appId, auth, db } from './lib/firebase';
import { getTodayString, haptic, toLocalISOString } from './lib/utils';
import { CalendarView } from './views/CalendarView';
import { HomeView } from './views/HomeView';
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
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [isAddSalaryModalOpen, setIsAddSalaryModalOpen] = useState(false);
  const [isAddPartnerTxModalOpen, setIsAddPartnerTxModalOpen] = useState(false);


  const [isAddMortgageExpModalOpen, setIsAddMortgageExpModalOpen] = useState(false);
  const [mortgageExpType, setMortgageExpType] = useState('down_payment');
  const [isAddMortgageAnalysisModalOpen, setIsAddMortgageAnalysisModalOpen] = useState(false);
  const [isAddMortgageFundingModalOpen, setIsAddMortgageFundingModalOpen] = useState(false);
  const [isAddExchangeModalOpen, setIsAddExchangeModalOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', title: '確認', confirmText: '確定', confirmColor: 'bg-slate-800', onConfirm: () => { } });

  const [currentView, setCurrentView] = useState('home');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [transitionClass, setTransitionClass] = useState('page-enter-fade');

  const TAB_ITEMS = [
    { id: 'home',          label: '總覽', icon: Home },
    { id: 'calendar',      label: '日曆', icon: Calendar },
    { id: 'visualization', label: '分析', icon: BarChart2 },
    { id: 'more',          label: '更多', icon: Menu },
  ];
  const MORE_ITEMS = [
    { id: 'income',      label: '收入管理', icon: DollarSign },
    { id: 'watchlist',   label: '持股組合', icon: Layers },
    { id: 'stock_goals', label: '存股計畫', icon: Target },
    { id: 'partner',     label: '佳欣儲蓄', icon: Users },
    { id: 'principal',   label: '資產淨值', icon: PieChart },
    { id: 'mortgage',    label: '房產投資', icon: Building2 },
    { id: 'settings',    label: '預算設定', icon: SettingsIcon },
  ];
  const TAB_ORDER = ['home', 'calendar', 'visualization'];

  const handleViewChange = (viewId) => {
    if (viewId === 'more') { haptic(10); setIsMoreSheetOpen(true); return; }
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
    setIsMoreSheetOpen(false);
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
      setNewTrans(prev => ({ ...prev, date: getTodayString() }));
      setIsAddTxModalOpen(true);
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
  const [newIncome, setNewIncome] = useState({ amount: '', category: '薪水', owner: 'myself', date: getTodayString(), note: '' });
  const [newSalaryRecord, setNewSalaryRecord] = useState({ amount: '', owner: 'myself', date: getTodayString(), note: '' });
  const [newPartnerTx, setNewPartnerTx] = useState({ amount: '', type: 'saving', date: getTodayString(), note: '' });

  const [newMortgageExp, setNewMortgageExp] = useState({ name: '', amount: '', date: getTodayString(), note: '', brand: '', type: 'down_payment' });
  const [newMortgageAnalysis, setNewMortgageAnalysis] = useState({ name: '', amount: '' });
  const [newMortgageFunding, setNewMortgageFunding] = useState({ source: '', amount: '', symbol: '', shares: '', rate: '', date: getTodayString(), note: '' }); // Added symbol
  const [newExchange, setNewExchange] = useState({ date: getTodayString(), usdAmount: '', rate: '', account: 'FT', type: 'buy' });

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
    const years = Array.from(new Set([year, currentYear]));

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
  }, [user, selectedDate.getFullYear()]);

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


  // --- Stats Calculations ---
  const calculateStats = (type) => {
    const groupsConfig = type === 'monthly' ? (settings.monthlyGroups || []) : (settings.annualGroups || []);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const relevantTrans = transactions.filter(t => {
      const tDate = new Date(t.date);
      return t.type === type && tDate.getFullYear() === year && (type === 'monthly' ? tDate.getMonth() === month : true);
    });
    let grandTotalBudget = 0, grandTotalUsed = 0;
    const groupsData = groupsConfig.map(group => {
      let groupBudget = 0, groupUsed = 0;
      const itemsData = group.items.map(item => {
        const itemBudget = Number(item.budget);
        const itemUsed = relevantTrans.filter(t => t.category === item.name && (!t.group || t.group === group.name)).reduce((sum, t) => sum + Number(t.amount), 0);
        groupBudget += itemBudget; groupUsed += itemUsed;
        return { name: item.name, budget: itemBudget, used: itemUsed };
      });
      return { name: group.name, budget: groupBudget, used: groupUsed, items: itemsData };
    });

    // Calculate totals strictly from the processed groups to ensure consistency
    grandTotalBudget = groupsData.reduce((sum, g) => sum + g.budget, 0);
    grandTotalUsed = groupsData.reduce((sum, g) => sum + g.used, 0);

    return { totalBudget: grandTotalBudget, totalUsed: grandTotalUsed, groups: groupsData };
  };
  const monthlyStats = useMemo(() => calculateStats('monthly'), [transactions, settings, selectedDate]);
  const annualStats = useMemo(() => calculateStats('annual'), [transactions, settings, selectedDate]);

  // Calculate annual total used including ALL monthly spending for the year + Annual spending
  const yearlyTotalStats = useMemo(() => {
    const year = selectedDate.getFullYear();
    // Filter all transactions for current year, regardless of type, but exclude salary/partner checks if any
    const yearlyTrans = transactions.filter(t => new Date(t.date).getFullYear() === year);

    // Sum all spending
    const totalUsed = yearlyTrans.reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate total budget = (Sum of all monthly group budgets * 12) + Sum of all annual group budgets
    const monthlyTotalBudget = (settings.monthlyGroups || []).reduce((acc, g) => acc + g.items.reduce((s, i) => s + Number(i.budget), 0), 0);
    const annualTotalBudget = (settings.annualGroups || []).reduce((acc, g) => acc + g.items.reduce((s, i) => s + Number(i.budget), 0), 0);
    const totalBudget = (monthlyTotalBudget * 12) + annualTotalBudget;

    return { totalBudget, totalUsed };
  }, [transactions, settings, selectedDate]);

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
  const deleteTransaction = (id) => requestDelete("確定刪除此筆支出紀錄？", () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions', id))));

  const handleAddIncome = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        commit(setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'incomes', editingId), { ...newIncome, amount: Number(newIncome.amount) }, { merge: true }));
      } else {
        commit(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'incomes'), { ...newIncome, amount: Number(newIncome.amount), createdAt: serverTimestamp() }));
      }
      haptic(15);
      showToast(editingId ? '已更新收入' : '已入帳');
      setNewIncome(prev => ({ ...prev, amount: '', note: '' }));
      setIsAddIncomeModalOpen(false);
      setEditingId(null);
    });
  };
  const handleDeleteIncome = (id) => requestDelete("確定刪除此筆收入紀錄？", () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'incomes', id))));

  const handleAddSalaryRecord = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        commit(setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'salary_history', editingId), { ...newSalaryRecord, amount: Number(newSalaryRecord.amount) }, { merge: true }));
      } else {
        commit(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'salary_history'), { ...newSalaryRecord, amount: Number(newSalaryRecord.amount), createdAt: serverTimestamp() }));
      }
      haptic(15);
      showToast(editingId ? '已更新調薪' : '已儲存調薪');
      setNewSalaryRecord(prev => ({ ...prev, amount: '', note: '' }));
      setIsAddSalaryModalOpen(false);
      setEditingId(null);
    });
  };
  const handleDeleteSalaryRecord = (id) => requestDelete("確定刪除此調薪紀錄？", () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'salary_history', id))));

  const handleAddPartnerTx = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        commit(setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'partner_savings', editingId), { ...newPartnerTx, amount: Number(newPartnerTx.amount) }, { merge: true }));
      } else {
        commit(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'partner_savings'), { ...newPartnerTx, amount: Number(newPartnerTx.amount), createdAt: serverTimestamp() }));
      }
      haptic(15);
      showToast(editingId ? '已更新紀錄' : '已儲存紀錄');
      setNewPartnerTx(prev => ({ ...prev, amount: '', note: '' }));
      setIsAddPartnerTxModalOpen(false);
      setEditingId(null);
    });
  };
  const deletePartnerTx = (id) => requestDelete("確定刪除此筆儲蓄/支出紀錄？", () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'partner_savings', id))));

  const handleAddMortgageExp = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        commit(updateDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_expenses', editingId), { ...newMortgageExp, amount: Number(newMortgageExp.amount), type: mortgageExpType }));
      } else {
        commit(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_expenses'), { ...newMortgageExp, amount: Number(newMortgageExp.amount), type: mortgageExpType, createdAt: serverTimestamp() }));
      }
      haptic(15);
      showToast(editingId ? '已更新項目' : '已儲存項目');
      setNewMortgageExp({ name: '', amount: '', date: getTodayString(), note: '', brand: '', type: mortgageExpType });
      setIsAddMortgageExpModalOpen(false);
      setEditingId(null);
    });
  };
  const deleteMortgageExp = (id) => requestDelete('刪除此項目？', () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_expenses', id))));

  const handleAddMortgageAnalysis = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        commit(updateDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_analysis', editingId), { ...newMortgageAnalysis, amount: Number(newMortgageAnalysis.amount) }));
      } else {
        commit(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_analysis'), { ...newMortgageAnalysis, amount: Number(newMortgageAnalysis.amount), createdAt: serverTimestamp() }));
      }
      haptic(15);
      showToast(editingId ? '已更新項目' : '已儲存項目');
      setNewMortgageAnalysis({ name: '', amount: '' });
      setIsAddMortgageAnalysisModalOpen(false);
      setEditingId(null);
    });
  };
  const deleteMortgageAnalysis = (id) => requestDelete('刪除此項目？', () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_analysis', id))));

  const handleAddMortgageFunding = (e) => {
    e.preventDefault();
    withSubmission(async () => {
      if (editingId) {
        commit(updateDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_funding', editingId), { ...newMortgageFunding, amount: Number(newMortgageFunding.amount) }));
      } else {
        commit(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_funding'), { ...newMortgageFunding, amount: Number(newMortgageFunding.amount), createdAt: serverTimestamp() }));
      }
      haptic(15);
      showToast(editingId ? '已更新來源' : '已儲存來源');
      setNewMortgageFunding({ source: '', amount: '', shares: '', rate: '', date: getTodayString(), note: '' });
      setIsAddMortgageFundingModalOpen(false);
      setEditingId(null);
    });
  };
  const deleteMortgageFunding = (id) => requestDelete('刪除此項目？', () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'mortgage_funding', id))));

  const handleAddStockGoalYear = () => {
    const maxYear = stockGoals.length > 0 ? stockGoals[0].year : 2021;
    const nextYear = maxYear + 1;
    commit(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'stock_goals'), { year: nextYear, roi: 0, firstrade: 0, ib: 0, withdrawal: 0, createdAt: serverTimestamp() }));
  };
  const handleDeleteStockGoalYear = (id) => requestDelete('確定刪除此年份的存股計畫？', () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'stock_goals', id))));
  const handleUpdateStockGoal = (id, field, value) => { commit(setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'stock_goals', id), { [field]: Number(value) }, { merge: true })); };

  const handleAddExchange = (e) => {
    e.preventDefault(); withSubmission(async () => {
      if (editingId) {
        commit(setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'usd_exchanges', editingId), { ...newExchange, updatedAt: serverTimestamp() }, { merge: true }));
      } else {
        commit(addDoc(collection(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'usd_exchanges'), { ...newExchange, createdAt: serverTimestamp() }));
      }
      haptic(15);
      showToast(editingId ? '已更新換匯' : '已儲存換匯');
      setNewExchange({ date: getTodayString(), usdAmount: '', rate: '', account: 'FT', type: 'buy' });
      setEditingId(null);
      setIsAddExchangeModalOpen(false);
    });
  };
  const handleDeleteExchange = (id) => requestDelete('刪除此換匯紀錄？', () => commit(deleteDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'usd_exchanges', id))));

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
      {/* Colour orbs behind the glass — cards are now more transparent, so these are
          kept pale (roughly 60% of the old strength) to avoid tinting the content.
          .bg-blob 讓深色模式再壓暗一階（同色球在深底上會變成柔和的極光）。 */}
      <div className="bg-blob absolute top-[-8%] left-[-15%] w-[65%] h-[40%] bg-[#8FD3F4]/28 rounded-full blur-[80px] pointer-events-none z-0"></div>
      <div className="bg-blob absolute top-[22%] right-[-15%] w-[55%] h-[35%] bg-[#B9C4F5]/25 rounded-full blur-[80px] pointer-events-none z-0"></div>
      <div className="bg-blob absolute top-[52%] left-[-10%] w-[60%] h-[35%] bg-[#9FE8D6]/24 rounded-full blur-[85px] pointer-events-none z-0"></div>
      <div className="bg-blob absolute bottom-[-8%] right-[-10%] w-[60%] h-[38%] bg-[#C9B6F0]/24 rounded-full blur-[85px] pointer-events-none z-0"></div>
      <div className="bg-blob absolute top-[78%] left-[25%] w-[55%] h-[28%] bg-[#F5D6B0]/18 rounded-full blur-[90px] pointer-events-none z-0"></div>

      {/* Loading Screen - completely covers viewport until done, then unmounts */}
      {appPhase === 'loading' && (
        <LoadingScreen progress={loadingProgress} isComplete={isDataReady} onDone={handleLoadingDone} />
      )}

      {/* Main App Content - only renders after LoadingScreen unmounts */}
      {appPhase === 'ready' && (
        <>
          {/* ── 「更多」底部抽屜 */}
          {isMoreSheetOpen && (
            <div className="fixed inset-0 z-[60] flex items-end justify-center">
              <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={() => setIsMoreSheetOpen(false)} />
              <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-t-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-300 border-t border-slate-200">
                <div className="flex justify-center pt-4 pb-2"><div className="w-12 h-1.5 rounded-full bg-slate-300" /></div>
                <div className="px-6 pt-2 pb-3"><h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">更多功能</h2></div>
                <div className="grid grid-cols-3 gap-3 p-5 pt-2">
                  {MORE_ITEMS.map(item => (
                    <button key={item.id} onClick={() => handleViewChange(item.id)}
                      className={`flex flex-col items-center gap-3 p-4 rounded-3xl transition-all active:scale-95 ${currentView === item.id ? 'bg-slate-800 text-white shadow-lg shadow-slate-400/30' : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200 border border-slate-200/50'}`}>
                      <item.icon className={`w-6 h-6 ${currentView === item.id ? 'text-slate-100' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold">{item.label}</span>
                    </button>
                  ))}
                </div>
                <div className="tab-bar-safe pb-8" />
              </div>
            </div>
          )}

          {/* ── Header (fixed positioning avoids sticky-in-flex glitch) */}
          <header className="bg-white/55 backdrop-blur-2xl backdrop-saturate-[1.8] px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-20 border-b border-white/40 animate-in fade-in duration-300 header-safe max-w-md mx-auto" style={{ paddingBottom: '0.75rem' }}>
            <div className="flex items-center gap-2 shrink-0">
              <img src={icon} className="w-7 h-7 rounded-lg shadow-sm" alt="Logo" />
            </div>
            <div className="flex-1 flex justify-center min-w-0 px-3">
              <h1 className="text-base font-bold text-slate-700 tracking-wide flex items-center gap-1.5 truncate">
                {MENU_ITEMS_FLAT.find(i => i.id === currentView)?.icon &&
                  React.createElement(MENU_ITEMS_FLAT.find(i => i.id === currentView).icon, { className: "w-4 h-4 text-slate-400" })}
                {MENU_ITEMS_FLAT.find(i => i.id === currentView)?.label ||
                  MORE_ITEMS.find(i => i.id === currentView)?.label}
              </h1>
            </div>
            <div className="w-auto min-w-[36px] flex justify-end shrink-0">
              {(currentView === 'home' || currentView === 'income' || currentView === 'settings') && (
                <div className="flex items-center bg-white/40 backdrop-blur-md rounded-full px-1 py-0.5 border border-white/20 shadow-sm">
                  <button onClick={() => handleDateNavigate(-1)} className="p-1 hover:bg-white/50 rounded-full transition-colors active:scale-95"><ChevronLeft className="w-3 h-3 text-slate-600" /></button>
                  <span className="text-xs font-bold text-slate-700 mx-1 tabular-nums whitespace-nowrap">{currentView === 'home' ? `${selectedDate.getMonth() + 1} 月` : `${selectedDate.getFullYear()} 年`}</span>
                  <button onClick={() => handleDateNavigate(1)} className="p-1 hover:bg-white/50 rounded-full transition-colors active:scale-95"><ChevronRight className="w-3 h-3 text-slate-600" /></button>
                </div>
              )}
            </div>
          </header>

          {/* Spacer to compensate for fixed header height (header-safe + ~3.5rem content) */}
          <div className="shrink-0 header-safe" style={{ paddingBottom: '3.5rem' }} />

          <main ref={mainRef} className="flex-1 overflow-y-auto p-5 scrollbar-hide relative z-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}>
            <div key={currentView} className={transitionClass}>
            {currentView === 'home' && <HomeView monthlyStats={monthlyStats} annualStats={annualStats} yearlyTotalStats={yearlyTotalStats} />}
            {/* 新增: Investment Tab View (持股檢視 + 占比計算) */}
            {currentView === 'watchlist' && <InvestmentTabView user={user} db={db} appId={appId} requestConfirmation={requestConfirmation} />}
            {currentView === 'stock_goals' && <StockGoalView loading={!loadingStates.stockGoals} goals={stockGoals} exchanges={usdExchanges} onUpdate={handleUpdateStockGoal} onAddYear={handleAddStockGoalYear} onDeleteYear={handleDeleteStockGoalYear} onDeleteExchange={handleDeleteExchange} onAddExchangeClick={() => setIsAddExchangeModalOpen(true)} onEditExchange={(item) => { setNewExchange({ ...item }); setEditingId(item.id); setIsAddExchangeModalOpen(true); }} />}
            {currentView === 'mortgage' && (
              <MortgageView
                loading={!loadingStates.mortgageExpenses}
                mortgageExpenses={mortgageExpenses}
                mortgageAnalysis={mortgageAnalysis}
                mortgageFunding={mortgageFunding}
                deleteMortgageExp={deleteMortgageExp}
                deleteMortgageAnalysis={deleteMortgageAnalysis}
                deleteMortgageFunding={deleteMortgageFunding}
                setMortgageExpType={setMortgageExpType}
                setIsAddMortgageExpModalOpen={setIsAddMortgageExpModalOpen}
                setIsAddMortgageAnalysisModalOpen={setIsAddMortgageAnalysisModalOpen}
                setIsAddMortgageFundingModalOpen={setIsAddMortgageFundingModalOpen}
                onEditExp={(item) => {
                  setNewMortgageExp({ ...item, amount: item.amount });
                  setMortgageExpType(item.type);
                  setEditingId(item.id);
                  setIsAddMortgageExpModalOpen(true);
                }}
                onEditAnalysis={(item) => {
                  setNewMortgageAnalysis({ ...item, amount: item.amount });
                  setEditingId(item.id);
                  setIsAddMortgageAnalysisModalOpen(true);
                }}
                onEditFunding={(item) => {
                  setNewMortgageFunding({ ...item, amount: item.amount });
                  setEditingId(item.id);
                  setIsAddMortgageFundingModalOpen(true);
                }}
              />
            )}
            {currentView === 'principal' && (
              <PrincipalView user={user} db={db} appId={appId} requestDelete={requestDelete} requestConfirmation={requestConfirmation} />
            )}
            {currentView === 'visualization' && <VisualizationView transactions={transactions} settings={settings} onRequestHistory={requestHistory} onEdit={(t) => { setNewTrans({ ...t, amount: t.amount }); setEditingId(t.id); setIsAddTxModalOpen(true); }} />}
            {currentView === 'income' && (
              <IncomeView
                loading={!loadingStates.incomes}
                incomes={incomes}
                salaryHistory={salaryHistory}
                onAddSalary={(own) => { setNewSalaryRecord(prev => ({ ...prev, owner: own })); setIsAddSalaryModalOpen(true); }}
                onDeleteSalary={handleDeleteSalaryRecord}
                onDeleteIncome={handleDeleteIncome}
                onAddIncome={(own, item = null) => {
                  if (item) {
                    setNewIncome({ ...item, amount: item.amount });
                    setEditingId(item.id);
                  } else {
                    setNewIncome(prev => ({ ...prev, owner: own, amount: '', category: '薪水', note: '', date: selectedDate ? toLocalISOString(selectedDate) : getTodayString() }));
                  }
                  setIsAddIncomeModalOpen(true);
                }}
                onEditSalary={(item) => {
                  setNewSalaryRecord({ ...item, amount: item.amount });
                  setEditingId(item.id);
                  setIsAddSalaryModalOpen(true);
                }}
                selectedDate={selectedDate}
              />
            )}
            {currentView === 'partner' && (
              <PartnerView
                loading={!loadingStates.partnerTransactions}
                partnerTransactions={partnerTransactions}
                onDelete={deletePartnerTx}
                onAdd={(item = null) => {
                  if (item && item.id) {
                    setNewPartnerTx({ ...item, amount: item.amount });
                    setEditingId(item.id);
                  } else {
                    setNewPartnerTx({ amount: '', type: 'saving', date: getTodayString(), note: '' });
                  }
                  setIsAddPartnerTxModalOpen(true);
                }}
                onEdit={(item) => {
                  setNewPartnerTx({ ...item, amount: item.amount });
                  setEditingId(item.id);
                  setIsAddPartnerTxModalOpen(true);
                }}
              />
            )}
            {currentView === 'calendar' && (
              <CalendarView
                transactions={transactions}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
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
                onAddExpense={(dateStr) => {
                  if (dateStr) setNewTrans(prev => ({ ...prev, date: dateStr }));
                  setIsAddTxModalOpen(true);
                }}
                onRequestHistory={requestHistory}
              />
            )}
            {currentView === 'settings' && (
              <div className="pb-24">
                <div className="bg-[#FEF9E7] border border-[#FCF3CF] rounded-xl p-4 mb-6 flex items-start gap-3">
                  <div className="p-2 bg-[#FCF3CF] rounded-lg text-[#9A7D0A]"><SettingsIcon className="w-5 h-5" /></div>
                  <div>
                    <h3 className="font-bold text-[#7D6608] text-sm">正在編輯 {selectedDate.getFullYear()} 年度預算</h3>
                    <p className="text-xs text-[#9A7D0A] mt-1">此處的變更僅會套用到 {selectedDate.getFullYear()} 年，不會影響其他年份的設定。</p>
                  </div>
                </div>
                <div className="mb-6">
                  <button onClick={() => setIsRecurringManagerOpen(true)} className={`w-full ${GLASS_CARD} p-4 flex items-center justify-between hover:border-slate-300 transition-all cursor-pointer`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-500"><ClipboardList className="w-5 h-5" /></div>
                      <div className="text-left"><h3 className="font-bold text-slate-700 text-sm">固定支出管理</h3><p className="text-xs text-slate-400">設定每月自動入帳的固定項目 ({(settings.recurringItems || []).filter(i => i.active).length} 項啟用中)</p></div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <GroupSettingsEditor title={`${selectedDate.getFullYear()}年月度預算配置`} groups={settings.monthlyGroups || []} onSave={(g) => updateSettings(g, 'monthly')} idPrefix="monthly" />
                <GroupSettingsEditor title={`${selectedDate.getFullYear()}年年度預算配置`} groups={settings.annualGroups || []} onSave={(g) => updateSettings(g, 'annual')} idPrefix="annual" />
              </div>
            )}
            </div>{/* /page-transition-wrapper */}
          </main>

          {/* ── Context-aware FAB */}
          {(currentView === 'home' || currentView === 'calendar' || currentView === 'income' || currentView === 'partner') && (
            <button
              onClick={() => {
                haptic(10);
                if (currentView === 'income') {
                  setNewIncome(prev => ({ ...prev, amount: '', category: '薪水', note: '', date: getTodayString() }));
                  setIsAddIncomeModalOpen(true);
                } else if (currentView === 'partner') {
                  setNewPartnerTx({ amount: '', type: 'saving', date: getTodayString(), note: '' });
                  setIsAddPartnerTxModalOpen(true);
                } else {
                  setIsAddTxModalOpen(true);
                }
              }}
              className="fixed right-5 bg-slate-800 text-white rounded-full shadow-2xl shadow-slate-400/40 flex items-center justify-center hover:bg-slate-900 hover:scale-105 transition-all active:scale-95 z-30"
              style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.75rem)', width: '3.25rem', height: '3.25rem' }}
            >
              <Plus className="w-6 h-6" />
            </button>
          )}

          {/* ── Bottom Tab Bar */}
          <nav className="tab-bar tab-bar-safe safe-x">
            <div className="flex items-center justify-around px-2 pt-2">
              {TAB_ITEMS.map(tab => {
                const isActive = tab.id === 'more' ? MORE_ITEMS.some(m => m.id === currentView) : currentView === tab.id;
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
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 border ${active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white/50 text-slate-500 border-white/60'}`}>
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


          {/* Other Modals... (Same structure) */}
          {
            isAddMortgageExpModalOpen && (
              <ModalWrapper title={mortgageExpType === 'down_payment' ? '新增頭期雜支' : '新增雜支紀錄'} onClose={() => { setIsAddMortgageExpModalOpen(false); setEditingId(null); }}>
                <form onSubmit={handleAddMortgageExp} className="space-y-4">
                  <InputField label="項目名稱" value={newMortgageExp.name} onChange={e => setNewMortgageExp({ ...newMortgageExp, name: e.target.value })} autoFocus required />
                  <InputField label="金額" type="number" value={newMortgageExp.amount} onChange={e => setNewMortgageExp({ ...newMortgageExp, amount: e.target.value })} required />
                  <InputField label="日期" type="date" value={newMortgageExp.date} onChange={e => setNewMortgageExp({ ...newMortgageExp, date: e.target.value })} required />
                  {mortgageExpType === 'misc_appliances' && (<InputField label="品牌" value={newMortgageExp.brand} onChange={e => setNewMortgageExp({ ...newMortgageExp, brand: e.target.value })} placeholder="品牌" />)}
                  <div>
                    <InputField label="備註" value={newMortgageExp.note} onChange={e => setNewMortgageExp({ ...newMortgageExp, note: e.target.value })} />
                    <NoteQuickPicks
                      records={mortgageExpenses.filter(e => e.type === mortgageExpType)}
                      onPick={(note) => setNewMortgageExp(prev => ({ ...prev, note }))}
                    />
                  </div>
                  <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '儲存'}</GlassButton>
                </form>
              </ModalWrapper>
            )
          }

          {
            isAddMortgageFundingModalOpen && (
              <ModalWrapper title="新增頭期款來源" onClose={() => { setIsAddMortgageFundingModalOpen(false); setEditingId(null); }}>
                <form onSubmit={handleAddMortgageFunding} className="space-y-4">
                  <InputField label="資金來源" value={newMortgageFunding.source} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, source: e.target.value })} placeholder=" " autoFocus required />
                  <InputField label="股票代碼 (選填)" value={newMortgageFunding.symbol} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, symbol: e.target.value })} placeholder=" " />
                  <div className="flex gap-2">
                    <div className="flex-1"><InputField label="金額/單價" type="number" value={newMortgageFunding.amount} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, amount: e.target.value })} required /></div>
                    <div className="w-24"><InputField label="匯率" type="number" value={newMortgageFunding.rate} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, rate: e.target.value })} placeholder="1.0" /></div>
                  </div>
                  <InputField label="股數 (選填)" type="number" value={newMortgageFunding.shares} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, shares: e.target.value })} placeholder="0" />
                  <InputField label="日期" type="date" value={newMortgageFunding.date} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, date: e.target.value })} required />
                  <div>
                    <InputField label="備註" value={newMortgageFunding.note} onChange={e => setNewMortgageFunding({ ...newMortgageFunding, note: e.target.value })} />
                    <NoteQuickPicks
                      records={mortgageFunding}
                      onPick={(note) => setNewMortgageFunding(prev => ({ ...prev, note }))}
                    />
                  </div>
                  <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '儲存'}</GlassButton>
                </form>
              </ModalWrapper>
            )
          }

          {
            isAddMortgageAnalysisModalOpen && (
              <ModalWrapper title="新增划算試算項目" onClose={() => { setIsAddMortgageAnalysisModalOpen(false); setEditingId(null); }}>
                <form onSubmit={handleAddMortgageAnalysis} className="space-y-4">
                  <InputField label="項目名稱" value={newMortgageAnalysis.name} onChange={e => setNewMortgageAnalysis({ ...newMortgageAnalysis, name: e.target.value })} autoFocus required />
                  <InputField label="金額" type="number" value={newMortgageAnalysis.amount} onChange={e => setNewMortgageAnalysis({ ...newMortgageAnalysis, amount: e.target.value })} required />
                  <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '儲存'}</GlassButton>
                </form>
              </ModalWrapper>
            )
          }

          {
            isAddIncomeModalOpen && (
              <ModalWrapper title={editingId ? "編輯收入" : "新增收入"} onClose={() => { setIsAddIncomeModalOpen(false); setEditingId(null); setNewIncome({ amount: '', category: '薪水', owner: 'myself', date: getTodayString(), note: '' }); }}>
                <form onSubmit={handleAddIncome} className="space-y-4">
                  <InputField label="金額" type="number" value={newIncome.amount} onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })} autoFocus required />
                  <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">分類</label><div className="relative"><select value={newIncome.category} onChange={(e) => setNewIncome({ ...newIncome, category: e.target.value })} className={`w-full p-4 ${GLASS_INPUT} text-slate-800 font-medium outline-none appearance-none text-sm`}>{INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
                  <InputField label="日期" type="date" value={newIncome.date} onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })} required />
                  <div>
                    <InputField label="備註" value={newIncome.note} onChange={(e) => setNewIncome({ ...newIncome, note: e.target.value })} placeholder="備註..." />
                    <NoteQuickPicks
                      records={incomes.filter(i => i.owner === newIncome.owner)}
                      label="常用備註 (點擊自動帶入分類)"
                      onPick={(note) => {
                        // 帶入備註，並套用該備註歷史上最常對應的收入分類
                        const counts = {};
                        incomes.forEach(i => {
                          if (i.owner === newIncome.owner && (i.note || '').trim() === note) {
                            counts[i.category] = (counts[i.category] || 0) + 1;
                          }
                        });
                        const bestCat = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
                        setNewIncome(prev => ({ ...prev, note, category: bestCat && INCOME_CATEGORIES.includes(bestCat) ? bestCat : prev.category }));
                      }}
                    />
                  </div>
                  <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '確認入帳'}</GlassButton>
                </form>
              </ModalWrapper>
            )
          }

          {
            isAddPartnerTxModalOpen && (
              <ModalWrapper title={editingId ? "編輯資金紀錄" : "新增資金紀錄"} onClose={() => { setIsAddPartnerTxModalOpen(false); setEditingId(null); setNewPartnerTx({ amount: '', type: 'saving', date: getTodayString(), note: '' }); }}>
                <form onSubmit={handleAddPartnerTx} className="space-y-6">
                  <div className="flex gap-2">
                    <GlassButton onClick={() => setNewPartnerTx({ ...newPartnerTx, type: 'saving' })} variant={newPartnerTx.type === 'saving' ? 'success' : 'ghost'} className="flex-1">存入資金</GlassButton>
                    <GlassButton onClick={() => setNewPartnerTx({ ...newPartnerTx, type: 'expense' })} variant={newPartnerTx.type === 'expense' ? 'danger' : 'ghost'} className="flex-1">支出/提領</GlassButton>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1">金額</label>
                    <div className="relative"><input type="number" value={newPartnerTx.amount} onChange={(e) => setNewPartnerTx({ ...newPartnerTx, amount: e.target.value })} className={`w-full p-4 ${GLASS_INPUT} text-slate-800 font-medium outline-none text-sm`} placeholder="0" autoFocus required /></div>
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">{[10000, 25000, 30000, 50000].map(amt => (<button key={amt} type="button" onClick={() => setNewPartnerTx({ ...newPartnerTx, amount: amt })} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 whitespace-nowrap transition-colors">${amt.toLocaleString()}</button>))}</div>
                  </div>
                  <InputField label="日期" type="date" value={newPartnerTx.date} onChange={(e) => setNewPartnerTx({ ...newPartnerTx, date: e.target.value })} required />
                  <div>
                    <InputField label="備註" value={newPartnerTx.note} onChange={(e) => setNewPartnerTx({ ...newPartnerTx, note: e.target.value })} placeholder="資金用途..." />
                    <NoteQuickPicks
                      records={partnerTransactions.filter(t => t.type === newPartnerTx.type)}
                      onPick={(note) => setNewPartnerTx(prev => ({ ...prev, note }))}
                    />
                  </div>
                  <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '確認儲存'}</GlassButton>
                </form>
              </ModalWrapper>
            )
          }

          {
            isAddSalaryModalOpen && (
              <ModalWrapper title="調薪紀錄" onClose={() => setIsAddSalaryModalOpen(false)}>
                <form onSubmit={handleAddSalaryRecord} className="space-y-6">
                  <InputField label="新薪資金額" type="number" value={newSalaryRecord.amount} onChange={(e) => setNewSalaryRecord({ ...newSalaryRecord, amount: e.target.value })} autoFocus required />
                  <InputField label="生效日期" type="date" value={newSalaryRecord.date} onChange={(e) => setNewSalaryRecord({ ...newSalaryRecord, date: e.target.value })} required />
                  <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '儲存調薪'}</GlassButton>
                </form>
              </ModalWrapper>
            )
          }

          {
            isAddExchangeModalOpen && (
              <ModalWrapper title={editingId ? "編輯換匯紀錄" : "新增換匯紀錄"} onClose={() => { setIsAddExchangeModalOpen(false); setEditingId(null); setNewExchange({ date: getTodayString(), usdAmount: '', rate: '', account: 'FT', type: 'buy' }); }}>
                <form onSubmit={handleAddExchange} className="space-y-4">
                  {/* Buy/Sell Toggle */}
                  <div className="flex gap-2">
                    <GlassButton type="button" onClick={() => setNewExchange({ ...newExchange, type: 'buy' })} variant={newExchange.type === 'buy' ? 'success' : 'ghost'} className="flex-1">買入美金</GlassButton>
                    <GlassButton type="button" onClick={() => setNewExchange({ ...newExchange, type: 'sell' })} variant={newExchange.type === 'sell' ? 'danger' : 'ghost'} className="flex-1">賣出美金</GlassButton>
                  </div>
                  {/* Account Toggle */}
                  <div className="flex gap-2">
                    <GlassButton type="button" onClick={() => setNewExchange({ ...newExchange, account: 'FT' })} variant={newExchange.account === 'FT' ? 'primary' : 'ghost'} className="flex-1">Firstrade</GlassButton>
                    <GlassButton type="button" onClick={() => setNewExchange({ ...newExchange, account: 'IB' })} variant={newExchange.account === 'IB' ? 'primary' : 'ghost'} className="flex-1">IB</GlassButton>
                  </div>
                  <InputField label={newExchange.type === 'sell' ? "賣出美金 (USD)" : "買入美金 (USD)"} type="number" value={newExchange.usdAmount} onChange={e => setNewExchange({ ...newExchange, usdAmount: e.target.value })} autoFocus required />
                  <InputField label="匯率 (TWD/USD)" type="number" value={newExchange.rate} onChange={e => setNewExchange({ ...newExchange, rate: e.target.value })} required />
                  <InputField label="日期" type="date" value={newExchange.date} onChange={e => setNewExchange({ ...newExchange, date: e.target.value })} required />
                  <GlassButton type="submit" disabled={isSubmitting} className="w-full py-4 text-base rounded-2xl mt-4">{isSubmitting ? '處理中...' : '確認紀錄'}</GlassButton>
                </form>
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
