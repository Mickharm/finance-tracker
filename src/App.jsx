import * as React from 'react';
const { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } = React;
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, setDoc, serverTimestamp, getDoc, runTransaction, where } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, House, Settings as SettingsIcon, ChartNoAxesColumn, Wallet } from 'lucide-react';
import { ToastProvider, useToast } from './components/Toast';
import QuickAddSheet from './components/QuickAddSheet';
import { ConfirmationModal, LoadingScreen } from './components/ui';
import { DEFAULT_SETTINGS } from './lib/constants';
import { Aurora, Segmented } from './components/glass';
import { LEDGER_ID, appId, auth, db } from './lib/firebase';
import { getTodayString, haptic } from './lib/utils';
import HomeV2 from './views/HomeV2';
import LedgerView from './views/LedgerView';
import BudgetView from './views/BudgetView';
import BucketAnalysis from './views/BucketAnalysis';
import { FLEX_DEFAULT } from './lib/budget';
import { IncomeView } from './views/IncomeView';
import { InvestmentTabView } from './views/InvestmentTabView';
import { MortgageView } from './views/MortgageView';
import { PartnerView } from './views/PartnerView';
import { PetView } from './views/PetView';
import { PrincipalView } from './views/PrincipalView';
import { StockGoalView } from './views/StockGoalView';





function AppContent() {
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mainRef = useRef(null);
  const transactionSubsRef = useRef({});
  const transactionDataPartsRef = useRef({});
  const [extraYears, setExtraYears] = useState([]);
  const incomeSubsRef = useRef({});
  const incomeDataPartsRef = useRef({});
  const generalSubsRef = useRef({}); // Track general subscriptions

  // 新版快速記帳抽屜（新增用；編輯既有紀錄仍走舊表單）。null = 關閉，否則 { date }
  const [quickAdd, setQuickAdd] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', title: '確認', confirmText: '確定', confirmColor: 'bg-slate-800', onConfirm: () => { } });

  const [currentView, setCurrentView] = useState('home');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 2.0 導覽：5 個入口（總覽／明細／＋／分析／資產）。收入併入分析；
  // 持股、存股、佳欣儲蓄、淨值、房產併入資產；預算設定從總覽右上角進入。
  const TAB_ITEMS = [
    { id: 'home',          label: '總覽', icon: House },
    { id: 'calendar',      label: '明細', icon: CalendarDays },
    { id: 'visualization', label: '分析', icon: ChartNoAxesColumn },
    { id: 'assets',        label: '資產', icon: Wallet },
  ];
  // 每頁的大標題與上方的小字
  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
  const todayLabel = (() => { const d = new Date(); return `${d.getMonth() + 1} 月 ${d.getDate()} 日・週${WEEKDAYS[d.getDay()]}`; })();
  const VIEW_TITLES = {
    home: ['總覽', todayLabel], calendar: ['明細', '每一天的紀錄'], visualization: ['分析', '支出與收入'],
    assets: ['資產', '資產與負債'], settings: ['預算設定', `${selectedDate.getFullYear()} 年`],
  };
  const ANALYSIS_TABS = [['spend', '支出'], ['income', '收入']];
  const ASSET_TABS = [['principal', '淨值'], ['watchlist', '持股'], ['stock_goals', '存股'], ['partner', '佳欣儲蓄'], ['mortgage', '房產'], ['pet', '阿奇']];
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
    haptic(10);
    setCurrentView(viewId);
  };

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo(0, 0);
  }, [currentView]);

  // 頁首浮在內容上方：量它的高度給內容留白（--header-h），內容捲到它底下時才出現霧面
  const rootRef = useRef(null);
  const headerRef = useRef(null);
  const onMainScroll = useCallback((e) => {
    if (headerRef.current) headerRef.current.dataset.scrolled = e.currentTarget.scrollTop > 6 ? 'true' : 'false';
  }, []);

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
  const [petRecords, setPetRecords] = useState([]); // 阿奇的紀錄（看診、洗澡、驅蟲、體重…）

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
    petRecords: false,
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

  // Form States
  // Default amount 0 to prevent layout shift


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
    if (prefetch || currentView === 'assets') {
      createSub('pet_records', setPetRecords, 'petRecords');
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
  // 記帳抽屜送出：新增，或編輯既有紀錄（整筆覆寫，取消的餐別／一起吃會一併移除）
  const handleQuickSave = (tx, { keepOpen = false, noSpend = false, edit = null } = {}) => {
    if (edit) {
      withSubmission(async () => {
        const { id, ...rest } = edit;
        const next = { ...rest, ...tx, amount: Number(tx.amount), updatedAt: serverTimestamp() };
        if (!tx.meal) delete next.meal;
        if (!tx.together) delete next.together;
        commit(setDoc(doc(db, 'artifacts', appId, 'ledgers', LEDGER_ID, 'transactions', id), next));
        haptic(15);
        showToast('已更新');
        setQuickAdd(null);
      });
      return;
    }
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

  // 總覽右上角切換月份（用每月 1 號計算，避免 31 號跳過小月）
  const handleDateNavigate = (direction) => { setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + direction, 1)); };

  // App 在手機背景放很久（例如跨月）再打開：回到「今天」，不停留在舊的月份
  const lastActiveDayRef = useRef(getTodayString());
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const today = getTodayString();
      if (today !== lastActiveDayRef.current) { lastActiveDayRef.current = today; setSelectedDate(new Date()); }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const header = headerRef.current;
    if (!root || !header) return undefined;
    const set = () => root.style.setProperty('--header-h', `${header.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(header);
    return () => ro.disconnect();
  }, [appPhase, currentView]);

  const activeTabIdx = Math.max(0, TAB_ORDER.indexOf(currentView === 'settings' ? 'home' : currentView));
  const subTabs = currentView === 'visualization' ? ANALYSIS_TABS : currentView === 'assets' ? ASSET_TABS : null;

  // --- Main Render ---
  return (
    <div ref={rootRef} className="relative mx-auto max-w-md h-[100dvh] overflow-hidden text-slate-900 tabular-nums shadow-2xl">
      <Aurora />

      {/* Loading Screen - completely covers viewport until done, then unmounts */}
      {appPhase === 'loading' && (
        <LoadingScreen progress={loadingProgress} isComplete={isDataReady} onDone={handleLoadingDone} />
      )}

      {/* Main App Content - only renders after LoadingScreen unmounts */}
      {appPhase === 'ready' && (
        <>
          {/* ── 內容：整個畫面都能捲，頁首與底部導覽浮在上面 */}
          <main ref={mainRef} onScroll={onMainScroll} className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden scrollbar-hide px-4"
            style={{ paddingTop: 'calc(var(--header-h) + 4px)', paddingBottom: 'calc(max(12px, env(safe-area-inset-bottom, 0px) - 10px) + 100px)' }}>
            <div key={activeView}>
            {currentView === 'home' && (
              <HomeV2
                transactions={transactions}
                settings={settings}
                flexMonthly={flexMonthly}
                selectedDate={selectedDate}
                onOpenDay={(ds) => { setLedgerFocus(ds); handleViewChange('calendar'); }}
                onOpenBudget={() => handleViewChange('settings')}
                onEdit={(t) => setQuickAdd({ edit: t })}
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
              <BucketAnalysis transactions={transactions} settings={settings} flexMonthly={flexMonthly} onRequestHistory={requestHistory} onEdit={(t) => setQuickAdd({ edit: t })} />
            )}
            {activeView === 'income' && (
              <IncomeView loading={!loadingStates.incomes} incomes={incomes} salaryHistory={salaryHistory} onRequestHistory={requestHistory} onSave={saveRecord} onRemove={removeRecord} />
            )}
            {activeView === 'pet' && (
              <PetView loading={!loadingStates.petRecords} records={petRecords} onSave={saveRecord} onRemove={removeRecord} />
            )}
            {activeView === 'partner' && (
              <PartnerView loading={!loadingStates.partnerTransactions} partnerTransactions={partnerTransactions} onSave={saveRecord} onRemove={removeRecord} />
            )}
            {currentView === 'calendar' && (
              <LedgerView
                transactions={transactions}
                settings={settings}
                focusDate={ledgerFocus}
                onFocusConsumed={clearLedgerFocus}
                deleteTransaction={deleteTransaction}
                onEdit={(t) => setQuickAdd({ edit: t })}
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
                onSaveGroups={(g, type) => { updateSettings(g, type); showToast('已更新分類'); }}
                onSaveRecurring={(items) => { handleSaveRecurring(items); showToast('已更新固定支出'); }}
                requestDelete={requestDelete}
              />
            )}
            </div>
          </main>

          {/* ── 頁首：大標題＋玻璃按鈕；分析、資產頁多一條子分頁 */}
          <header ref={headerRef} className="topbar" data-scrolled="false">
            <div className="topbar-fade" aria-hidden="true" />
            <div className="topbar-row">
              <div key={currentView} className="min-w-0 fade-up">
                <div className="topbar-sub">{VIEW_TITLES[currentView]?.[1]}</div>
                <h1 className="topbar-title truncate">{VIEW_TITLES[currentView]?.[0]}</h1>
              </div>
              <div className="flex items-center gap-2 shrink-0 pb-0.5">
                {currentView === 'settings' && (
                  <button onClick={() => handleViewChange('home')} className="btn btn-ink h-[38px] px-4 text-sm">完成</button>
                )}
                {currentView === 'home' && (
                  <>
                    <div className="glass flex items-center h-[38px] rounded-full px-0.5">
                      <button onClick={() => handleDateNavigate(-1)} className="icon-btn !w-[34px] !h-[34px]" aria-label="上個月"><ChevronLeft className="w-[18px] h-[18px]" strokeWidth={2.4} /></button>
                      <span className="font-num text-sm font-bold text-slate-800 tabular-nums whitespace-nowrap min-w-[2.9rem] text-center">{selectedDate.getFullYear() !== new Date().getFullYear() ? `${selectedDate.getFullYear()}/` : ''}{selectedDate.getMonth() + 1} 月</span>
                      <button onClick={() => handleDateNavigate(1)} className="icon-btn !w-[34px] !h-[34px]" aria-label="下個月"><ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.4} /></button>
                    </div>
                    <button onClick={() => handleViewChange('settings')} className="icon-btn glass" aria-label="預算設定"><SettingsIcon className="w-[18px] h-[18px]" strokeWidth={2.1} /></button>
                  </>
                )}
              </div>
            </div>
            {subTabs && (
              <div className="relative px-4 pb-2.5" data-subtabs>
                <Segmented float scroll options={subTabs} value={currentView === 'visualization' ? analysisTab : assetsTab}
                  onChange={(k) => { haptic(8); if (currentView === 'visualization') setAnalysisTab(k); else setAssetsTab(k); if (mainRef.current) mainRef.current.scrollTo(0, 0); }} />
              </div>
            )}
          </header>

          {/* ── 底部導覽：玻璃膠囊（選中的那格有一片會滑動的玻璃）＋墨色玻璃的「記一筆」 */}
          <div className="bottom-fade" aria-hidden="true" />
          <nav className="tabbar">
            <div className="tabbar-capsule glass">
              <span className="tabbar-thumb" style={{ '--i': activeTabIdx }} aria-hidden="true"><i key={activeTabIdx} /></span>
              {TAB_ITEMS.map(tab => {
                const isActive = currentView === tab.id || (tab.id === 'home' && currentView === 'settings');
                return (
                  <button key={tab.id} onClick={() => handleViewChange(tab.id)} className="tab" aria-current={isActive ? 'page' : undefined}>
                    <tab.icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                    <span className="tab-label">{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => handleViewChange('add')} aria-label="記一筆" className="fab glass-ink">
              <Plus className="w-7 h-7" strokeWidth={2.4} />
            </button>
          </nav>

          {/* --- Modals --- */}
          {quickAdd && (
            <QuickAddSheet
              key={quickAdd.edit?.id || 'new'}
              transactions={transactions}
              settings={settings}
              initialDate={quickAdd.date}
              editing={quickAdd.edit || null}
              isSubmitting={isSubmitting}
              onSave={handleQuickSave}
              onDelete={(t) => { setQuickAdd(null); deleteTransaction(t.id); }}
              onClose={() => setQuickAdd(null)}
            />
          )}

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
