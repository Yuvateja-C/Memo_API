import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as Lucide from 'lucide-react';

const API_BASE = "https://creditsentinel-kkg7.onrender.com";

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiConnected, setApiConnected] = useState(false);

  // Stats Data
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Applications Table State
  const [applications, setApplications] = useState([]);
  const [totalApps, setTotalApps] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterDecision, setFilterDecision] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [tableLoading, setTableLoading] = useState(false);

  // Selected Application Details
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedAppDetails, setSelectedAppDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // What-If Simulation State
  const [simCibil, setSimCibil] = useState(700);
  const [simFoir, setSimFoir] = useState(30.0);
  const [simAmount, setSimAmount] = useState(100000);

  // Underwriting Memo State
  const [memoTemplate, setMemoTemplate] = useState('executive');
  const [memoText, setMemoText] = useState('');
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoTime, setMemoTime] = useState(0);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatThoughts, setChatThoughts] = useState('');
  const [chatStreamText, setChatStreamText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState([
    "Show statistical summary of all loans",
    "Find details for APP-000004",
    "What is the average CIBIL score?"
  ]);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Dark/Light Theme Toggle
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Check API health on load
  useEffect(() => {
    axios.get(`${API_BASE}/`)
      .then(() => setApiConnected(true))
      .catch(() => setApiConnected(false));
  }, []);

  // Fetch Global Stats
  const fetchStats = () => {
    setStatsLoading(true);
    axios.get(`${API_BASE}/api/stats`)
      .then(res => {
        setStats(res.data);
        setStatsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stats:", err);
        setStatsLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch Applications List
  const fetchApplications = () => {
    setTableLoading(true);
    axios.get(`${API_BASE}/api/applications`, {
      params: {
        page: currentPage,
        page_size: pageSize,
        search: searchTerm,
        risk_level: filterRisk,
        decision: filterDecision,
        sort_by: sortField,
        sort_order: sortOrder
      }
    })
      .then(res => {
        setApplications(res.data.applications);
        setTotalApps(res.data.total);
        setTableLoading(false);
      })
      .catch(err => {
        console.error("Error fetching applications:", err);
        setTableLoading(false);
      });
  };

  useEffect(() => {
    fetchApplications();
  }, [currentPage, searchTerm, filterRisk, filterDecision, sortField, sortOrder]);

  // Fetch single application details on selection
  const handleSelectApp = (app) => {
    setSelectedApp(app);
    setDetailsLoading(true);
    setMemoText('');
    setSelectedAppDetails(null);
    axios.get(`${API_BASE}/api/applications/${app.application_id}`)
      .then(res => {
        setSelectedAppDetails(res.data);
        setSimCibil(res.data.cibil_score);
        setSimFoir(res.data.foir);
        setSimAmount(res.data.requested_loan_amount);
        setDetailsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching app details:", err);
        setDetailsLoading(false);
      });
  };

  // What-if simulator calculations
  const calculateSimulatedRisk = () => {
    const cibilComponent = (simCibil - 300) / 600;
    const foirComponent = (100 - simFoir) / 100;
    const riskScore = (cibilComponent * 0.55 + foirComponent * 0.45) * 0.72;

    let riskLevel = "HIGH";
    if (riskScore >= 0.70) riskLevel = "LOW";
    else if (riskScore >= 0.50) riskLevel = "MEDIUM";

    let decision = "REJECT";
    if (riskLevel === "LOW") decision = "APPROVE";
    else if (riskLevel === "MEDIUM") decision = "APPROVE WITH CONDITIONS";

    return {
      score: riskScore,
      level: riskLevel,
      decision: decision
    };
  };

  const simResult = calculateSimulatedRisk();

  // Generate underwriting memo
  const handleGenerateMemo = () => {
    if (!selectedApp) return;
    setMemoLoading(true);
    setMemoText('');
    const start = Date.now();

    axios.post(`${API_BASE}/api/memo?template=${memoTemplate}`, {
      application_id: selectedApp.application_id
    })
      .then(res => {
        setMemoLoading(false);
        setMemoTime(round(res.data.generation_time_seconds || (Date.now() - start) / 1000, 2));

        // Format the raw API output into a beautiful Markdown document
        if (res.data.error) {
          setMemoText(`### ❌ Error Generating Memo\n\n${res.data.error}`);
          return;
        }

        const data = res.data;
        let md = `# UNDERWRITING MEMORANDUM\n\n`;
        md += `**Application ID:** \`${data.application_id}\`  \n`;
        md += `**Applicant Name:** ${data.applicant_name}  \n`;
        md += `**Recommendation:** \`${data.decision}\` (${data.risk_level} Risk Tier)  \n`;
        md += `**Evaluation Score:** \`${data.risk_score}\`  \n`;
        if (data.confidence) md += `**Model Confidence:** ${data.confidence}  \n`;
        md += `\n---\n\n`;

        if (data.profile) {
          md += `## 👤 Applicant Profile\n${data.profile}\n\n`;
        }
        if (data.risk_assessment) {
          md += `## ⚠️ Risk & Credit Evaluation\n${data.risk_assessment}\n\n`;
        }
        if (data.credit_history) {
          md += `**Credit Standing:** ${data.credit_history}\n\n`;
        }
        if (data.repayment_capacity) {
          md += `**Repayment Evaluation:** ${data.repayment_capacity}\n\n`;
        }
        if (data.risk_factors) {
          md += `## 📄 Underwriting Key Findings\n${data.risk_factors}\n\n`;
        }
        if (data.recommendation) {
          md += `## 💡 Final Recommendation Summary\n**${data.recommendation}**\n\n`;
        }

        // Handle compliance schema keys if template compliance is chosen
        if (data.credit_bureau_information) {
          md += `## 📊 Credit Bureau Details\n`;
          md += `- CIBIL Score: \`${data.credit_bureau_information.cibil_score}\`\n`;
          md += `- 90d Inquiries: \`${data.credit_bureau_information.credit_inquiries_90d}\`\n`;
          md += `- Historical Default Flag: \`${data.credit_bureau_information.has_previous_default === 1 ? 'Yes' : 'No'}\`\n\n`;
        }

        if (data.regulatory_checks) {
          md += `## 🏛️ Regulatory Obligation Audit\n`;
          md += `- FOIR: \`${data.regulatory_checks.foir}%\`\n`;
          md += `- Debt Default Probability: \`${data.regulatory_checks.repayment_history?.default_probability_actual || 'N/A'}\`\n\n`;
        }

        if (data.audit_trail) {
          md += `\n---\n*Audit Timestamp: ${data.audit_trail.timestamp} | Backend Latency: ${data.latency_ms || data.audit_trail.latency_ms} ms*`;
        }

        setMemoText(md);
      })
      .catch(err => {
        setMemoLoading(false);
        setMemoText(`### ❌ Connection Error\n\nUnable to generate memo from server. Ensure FastAPI backend is running.`);
        console.error(err);
      });
  };

  // Dynamic input resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [chatMessage]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatStreamText, chatThoughts]);

  // Streaming Chat Assistant SSE loop
  const handleSendChat = (messageText) => {
    const textToSend = messageText || chatMessage;
    if (!textToSend.trim() || isChatLoading) return;

    setChatMessage('');
    setIsChatLoading(true);
    setChatThoughts('');
    setChatStreamText('');

    const newHistory = [...chatHistory, { role: 'user', content: textToSend }];
    setChatHistory(newHistory);

    // Call SSE streaming API
    fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: textToSend,
        history: chatHistory
      })
    })
      .then(response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function read() {
          reader.read().then(({ done, value }) => {
            if (done) {
              setIsChatLoading(false);
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop(); // keep partial line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.substring(6).trim();
                if (dataStr === '[DONE]') {
                  // Finish stream
                  setChatHistory(prev => {
                    const updated = [...prev];
                    // Find if model message already exists and combine, or add new
                    updated.push({ role: 'model', content: chatStreamTextRef.current });
                    return updated;
                  });
                  setChatStreamText('');
                  setChatThoughts('');
                  setIsChatLoading(false);
                  return;
                }

                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.type === 'THOUGHT') {
                    setChatThoughts(prev => prev + parsed.content);
                  } else if (parsed.type === 'FINAL_RESPONSE') {
                    setChatStreamText(prev => prev + parsed.content);
                    chatStreamTextRef.current = (chatStreamTextRef.current || '') + parsed.content;
                  } else if (parsed.type === 'SUGGESTION') {
                    setChatSuggestions(prev => {
                      // Keep max 3 suggestions, avoid duplicates
                      const filtered = prev.filter(s => s !== parsed.content);
                      return [...filtered, parsed.content].slice(-3);
                    });
                  }
                } catch (e) {
                  // ignore JSON parse errors on partial streams
                }
              }
            }
            read();
          });
        }
        chatStreamTextRef.current = '';
        read();
      })
      .catch(err => {
        console.error("Chat streaming error:", err);
        setChatHistory(prev => [...prev, { role: 'model', content: "❌ Error connecting to chat server. Make sure uvicorn is running." }]);
        setIsChatLoading(false);
      });
  };

  // Ref sync to track live stream text inside callback closure
  const chatStreamTextRef = useRef('');

  const handleSuggestionClick = (sug) => {
    handleSendChat(sug);
  };

  // Chart configs helper
  const getDecisionDonutOption = () => {
    if (!stats) return {};
    const data = [
      { value: stats.decisions.APPROVE || 0, name: 'Approved', itemStyle: { color: '#10b981' } },
      { value: stats.decisions['APPROVE WITH CONDITIONS'] || 0, name: 'Approved w/ Cond.', itemStyle: { color: '#f59e0b' } },
      { value: stats.decisions.REJECT || 0, name: 'Rejected', itemStyle: { color: '#ef4444' } },
    ];
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: {
        bottom: '0%',
        textStyle: { color: theme === 'dark' ? '#a1a1aa' : '#71717a', fontFamily: 'Outfit' }
      },
      series: [
        {
          name: 'Decision',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 8, borderColor: theme === 'dark' ? '#0c0c0f' : '#ffffff', borderWidth: 2 },
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
          data: data
        }
      ]
    };
  };

  const getPurposeBarOption = () => {
    if (!stats) return {};
    const purposes = Object.keys(stats.purposes);
    const counts = Object.values(stats.purposes);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '5%', containLabel: true },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: theme === 'dark' ? '#1e1e24' : '#e4e4e7' } },
        axisLabel: { color: theme === 'dark' ? '#a1a1aa' : '#71717a' }
      },
      yAxis: {
        type: 'category',
        data: purposes,
        axisLabel: { color: theme === 'dark' ? '#a1a1aa' : '#71717a', fontSize: 10 }
      },
      series: [
        {
          name: 'Applications',
          type: 'bar',
          data: counts,
          itemStyle: {
            color: '#3b82f6',
            borderRadius: [0, 4, 4, 0]
          }
        }
      ]
    };
  };

  const getScatterOption = () => {
    if (!stats) return {};
    const lowPoints = stats.scatter_data.filter(d => d.risk_level === 'LOW').map(d => [d.monthly_income, d.requested_loan_amount]);
    const medPoints = stats.scatter_data.filter(d => d.risk_level === 'MEDIUM').map(d => [d.monthly_income, d.requested_loan_amount]);
    const highPoints = stats.scatter_data.filter(d => d.risk_level === 'HIGH').map(d => [d.monthly_income, d.requested_loan_amount]);

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => `Income: ₹${params.value[0]}<br/>Loan: ₹${params.value[1]}`
      },
      legend: {
        right: '10%',
        textStyle: { color: theme === 'dark' ? '#a1a1aa' : '#71717a', fontFamily: 'Outfit' }
      },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '15%', containLabel: true },
      xAxis: {
        name: 'Monthly Income',
        nameTextStyle: { color: theme === 'dark' ? '#a1a1aa' : '#71717a' },
        type: 'value',
        splitLine: { lineStyle: { color: theme === 'dark' ? '#1e1e24' : '#e4e4e7' } },
        axisLabel: { color: theme === 'dark' ? '#a1a1aa' : '#71717a' }
      },
      yAxis: {
        name: 'Requested Loan',
        nameTextStyle: { color: theme === 'dark' ? '#a1a1aa' : '#71717a' },
        type: 'value',
        splitLine: { lineStyle: { color: theme === 'dark' ? '#1e1e24' : '#e4e4e7' } },
        axisLabel: { color: theme === 'dark' ? '#a1a1aa' : '#71717a' }
      },
      series: [
        { name: 'Low Risk', type: 'scatter', symbolSize: 8, data: lowPoints, itemStyle: { color: '#10b981' } },
        { name: 'Medium Risk', type: 'scatter', symbolSize: 8, data: medPoints, itemStyle: { color: '#f59e0b' } },
        { name: 'High Risk', type: 'scatter', symbolSize: 8, data: highPoints, itemStyle: { color: '#ef4444' } }
      ]
    };
  };

  const getRiskSparklineStyle = (score) => {
    const widthPct = Math.min(Math.max(score * 100, 0), 100);
    let color = 'bg-rose-500';
    if (score >= 0.70) color = 'bg-emerald-500';
    else if (score >= 0.50) color = 'bg-amber-500';

    return {
      width: `${widthPct}%`,
      colorClass: color
    };
  };

  const round = (val, dec) => Math.round(val * Math.pow(10, dec)) / Math.pow(10, dec);

  return (
    <div className="min-h-screen flex text-zinc-900 dark:text-zinc-50 bg-zinc-50 dark:bg-[#09090b] transition-colors duration-300">

      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] flex flex-col justify-between shrink-0 p-6">
        <div>
          {/* Logo block */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Lucide.ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-sans tracking-tight text-zinc-950 dark:text-zinc-50">CreditSentinel</h2>
              <span className="text-xs text-zinc-400 font-mono">Underwriting Hub</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
            >
              <Lucide.LayoutDashboard className="h-4 w-4" />
              Overview Analytics
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'applications'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
            >
              <Lucide.TableProperties className="h-4 w-4" />
              Applications Explorer
            </button>
          </nav>
        </div>

        {/* Sidebar Footer details */}
        <div className="space-y-4">
          {/* API Server status indicator */}
          <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center gap-3">
            <span className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${apiConnected ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${apiConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              {apiConnected ? "Backend Connected" : "Backend Disconnected"}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-all"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Lucide.Sun className="h-4 w-4" /> : <Lucide.Moon className="h-4 w-4" />}
            </button>

            {/* Chat Assistant Open Button */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow transition-all"
            >
              <Lucide.MessageSquareQuote className="h-3.5 w-3.5" />
              Chat Support
            </button>
          </div>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-[#0c0c0f]">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight m-0 text-zinc-900 dark:text-zinc-50">
              {activeTab === 'dashboard' ? 'Credit Intelligence Dashboard' : 'Loan Application Registries'}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {activeTab === 'dashboard'
                ? 'High-level predictive distributions and approval ratings over 15,000 requests.'
                : 'Interactive underwriter workbench. Click any application to adjust parameters, analyze bureau, or generate AI memos.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-all"
              title="Reload Stats"
            >
              <Lucide.RotateCw className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Dynamic tab contents */}
        <div className="p-8 flex-1">
          {activeTab === 'dashboard' ? (
            /* Dashboard View */
            <div className="space-y-8">
              {/* KPI cards row */}
              {statsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 rounded-xl skeleton" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* KPI 1 */}
                  <div className="p-6 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Applications</span>
                      <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">{stats?.total_applications.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                      <Lucide.FileText className="h-6 w-6" />
                    </div>
                  </div>

                  {/* KPI 2 */}
                  <div className="p-6 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Avg CIBIL score</span>
                      <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">{stats?.average_cibil}</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                      <Lucide.Activity className="h-6 w-6" />
                    </div>
                  </div>

                  {/* KPI 3 */}
                  <div className="p-6 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Avg FOIR ratio</span>
                      <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">{stats?.average_foir}%</h3>
                    </div>
                    <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
                      <Lucide.Gauge className="h-6 w-6" />
                    </div>
                  </div>

                  {/* KPI 4 */}
                  <div className="p-6 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Approval Rate</span>
                      <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">{stats?.approval_rate}%</h3>
                    </div>
                    <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-500">
                      <Lucide.Sparkles className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Visualization Grid */}
              {statsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="h-96 rounded-xl skeleton" />
                  <div className="h-96 rounded-xl skeleton" />
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Donut Chart card */}
                    <div className="p-6 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Decision Allocations</h3>
                        <span className="text-xs font-mono text-zinc-400">Underwriter ratios</span>
                      </div>
                      <div className="h-72">
                        <ReactECharts option={getDecisionDonutOption()} style={{ height: '100%' }} />
                      </div>
                    </div>

                    {/* Bar Chart card */}
                    <div className="p-6 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Requested Purpose Distribution</h3>
                        <span className="text-xs font-mono text-zinc-400">Total volume</span>
                      </div>
                      <div className="h-72">
                        <ReactECharts option={getPurposeBarOption()} style={{ height: '100%' }} />
                      </div>
                    </div>
                  </div>

                  {/* Scatter plot chart (Single chart per row rule) */}
                  <div className="p-6 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Loan Size vs. Income Scatter Map</h3>
                      <span className="text-xs font-mono text-zinc-400">Sample of 500 applications</span>
                    </div>
                    <div className="h-[400px]">
                      <ReactECharts option={getScatterOption()} style={{ height: '100%' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Applications Tab View (Dual screen split pane) */
            <div className="flex gap-8 items-start h-full">
              {/* Applications Table (Left Side, 2/3 width) */}
              <div className={`transition-all duration-300 ${selectedApp ? 'w-2/3' : 'w-full'} space-y-4`}>

                {/* Search / Filter toolbar */}
                <div className="p-4 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-1 min-w-[200px] items-center gap-2 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 bg-zinc-50 dark:bg-[#09090b]">
                    <Lucide.Search className="h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search ID or Applicant Name..."
                      value={searchTerm}
                      onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="bg-transparent border-none outline-none text-sm w-full text-zinc-900 dark:text-zinc-50 focus:ring-0"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={filterRisk}
                      onChange={e => { setFilterRisk(e.target.value); setCurrentPage(1); }}
                      className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="">All Risk Levels</option>
                      <option value="LOW">Low Risk</option>
                      <option value="MEDIUM">Medium Risk</option>
                      <option value="HIGH">High Risk</option>
                    </select>

                    <select
                      value={filterDecision}
                      onChange={e => { setFilterDecision(e.target.value); setCurrentPage(1); }}
                      className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="">All Decisions</option>
                      <option value="APPROVE">Approved</option>
                      <option value="APPROVE WITH CONDITIONS">Conditional Approved</option>
                      <option value="REJECT">Rejected</option>
                    </select>

                    {(searchTerm || filterRisk || filterDecision) && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setFilterRisk('');
                          setFilterDecision('');
                          setCurrentPage(1);
                        }}
                        className="text-xs text-red-500 hover:text-red-600 font-semibold px-2 py-1"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Primary Data Table */}
                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto max-h-[600px] relative">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900/80 backdrop-blur-md text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 z-10">
                        <tr>
                          <th className="px-6 py-4">Application ID</th>
                          <th className="px-6 py-4">Applicant Name</th>
                          <th className="px-6 py-4 text-center">CIBIL</th>
                          <th className="px-6 py-4 text-center">FOIR (%)</th>
                          <th className="px-6 py-4">Loan Requested</th>
                          <th className="px-6 py-4">Risk Score</th>
                          <th className="px-6 py-4 text-center">Decision</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50 text-sm">
                        {tableLoading ? (
                          [...Array(6)].map((_, i) => (
                            <tr key={i}>
                              {[...Array(7)].map((_, j) => (
                                <td key={j} className="px-6 py-4"><div className="h-4 rounded skeleton" /></td>
                              ))}
                            </tr>
                          ))
                        ) : applications.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-6 py-12 text-center text-zinc-500">No applications matched filters.</td>
                          </tr>
                        ) : (
                          applications.map(app => {
                            const isSelected = selectedApp?.application_id === app.application_id;
                            const sparkline = getRiskSparklineStyle(app.risk_score);
                            let decisionBadge = "text-rose-500 bg-rose-500/10 border-rose-500/20";
                            if (app.decision === 'APPROVE') decisionBadge = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                            else if (app.decision === 'APPROVE WITH CONDITIONS') decisionBadge = "text-amber-500 bg-amber-500/10 border-amber-500/20";

                            return (
                              <tr
                                key={app.application_id}
                                onClick={() => handleSelectApp(app)}
                                className={`cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-colors ${isSelected ? 'bg-blue-500/5 dark:bg-blue-600/10 border-l-4 border-blue-600' : ''
                                  }`}
                              >
                                <td className="px-6 py-4 font-mono text-zinc-400 font-semibold">{app.application_id}</td>
                                <td className="px-6 py-4 font-bold text-zinc-800 dark:text-zinc-200">{app.applicant_name}</td>
                                <td className="px-6 py-4 text-center font-mono">{app.cibil_score}</td>
                                <td className="px-6 py-4 text-center font-mono">{round(app.foir, 1)}%</td>
                                <td className="px-6 py-4 font-semibold">₹{app.requested_loan_amount.toLocaleString()}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3 w-32">
                                    <div className="w-16 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                      <div className={`h-full ${sparkline.colorClass}`} style={{ width: sparkline.width }} />
                                    </div>
                                    <span className="font-mono text-xs text-zinc-400">{round(app.risk_score, 4)}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${decisionBadge}`}>
                                    {app.decision}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/30 text-xs">
                    <span className="text-zinc-500">
                      Showing Page {currentPage} of {Math.ceil(totalApps / pageSize) || 1} ({totalApps} entries)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-500"
                      >
                        <Lucide.ChevronsLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-500"
                      >
                        <Lucide.ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalApps / pageSize)))}
                        disabled={currentPage === Math.ceil(totalApps / pageSize) || totalApps === 0}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-500"
                      >
                        <Lucide.ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.ceil(totalApps / pageSize))}
                        disabled={currentPage === Math.ceil(totalApps / pageSize) || totalApps === 0}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-500"
                      >
                        <Lucide.ChevronsRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Side Panel (Right Side, 1/3 width) */}
              {selectedApp && (
                <div className="w-1/3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] rounded-xl shadow-lg flex flex-col max-h-[750px] overflow-hidden shrink-0">
                  <header className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-start bg-zinc-50 dark:bg-zinc-900/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-zinc-400 font-semibold">{selectedApp.application_id}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase tracking-wide">
                          {selectedApp.loan_purpose}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 mt-1">{selectedApp.applicant_name}</h2>
                    </div>
                    <button
                      onClick={() => setSelectedApp(null)}
                      className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Lucide.X className="h-4 w-4" />
                    </button>
                  </header>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {detailsLoading ? (
                      <div className="space-y-4">
                        <div className="h-24 skeleton rounded-lg" />
                        <div className="h-32 skeleton rounded-lg" />
                        <div className="h-16 skeleton rounded-lg" />
                      </div>
                    ) : (
                      <>
                        {/* Tab Switcher inside details panel */}
                        <div className="space-y-4">
                          {/* Segmented control */}
                          <div className="flex flex-col gap-4">
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800/80">
                              <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Demographic Profile</span>
                              <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                                <div>
                                  <span className="text-zinc-500">Gender / Age:</span>
                                  <p className="font-semibold">{selectedAppDetails?.gender || 'N/A'}, {selectedAppDetails?.age || 'N/A'} yrs</p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Marital / Dependents:</span>
                                  <p className="font-semibold">{selectedAppDetails?.marital_status || 'N/A'} ({(selectedAppDetails?.dependents !== undefined) ? selectedAppDetails.dependents : 'N/A'})</p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">City tier:</span>
                                  <p className="font-semibold">{selectedAppDetails?.city || 'N/A'} (Tier {selectedAppDetails?.city_tier || 'N/A'})</p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Employment:</span>
                                  <p className="font-semibold">{selectedAppDetails?.employment_type || 'N/A'} ({selectedAppDetails?.employment_years || 'N/A'} yrs exp)</p>
                                </div>
                              </div>
                            </div>

                            {/* Credit Bureau Details */}
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800/80">
                              <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Credit standing</span>
                              <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                                <div>
                                  <span className="text-zinc-500">CIBIL:</span>
                                  <p className="font-semibold font-mono text-emerald-500">{selectedAppDetails?.cibil_score || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Outstanding Debt:</span>
                                  <p className="font-semibold font-mono">₹{selectedAppDetails?.total_outstanding_debt?.toLocaleString() || '0'}</p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Credit utilization:</span>
                                  <p className="font-semibold font-mono">{selectedAppDetails?.credit_utilization_pct || '0'}%</p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Recent Inquiries (90d):</span>
                                  <p className="font-semibold font-mono">{selectedAppDetails?.num_credit_inquiries_90d || '0'}</p>
                                </div>
                              </div>
                            </div>

                            {/* Repayment History details */}
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800/80">
                              <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Repayment standing</span>
                              <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                                <div>
                                  <span className="text-zinc-500">Defaults:</span>
                                  <p className={`font-semibold ${selectedAppDetails?.repayment_history?.is_default === 1 ? 'text-red-500 font-bold' : 'text-emerald-500'}`}>
                                    {selectedAppDetails?.repayment_history?.is_default === 1 ? 'Yes' : 'None'}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Max DPD (Days Past Due):</span>
                                  <p className={`font-semibold font-mono ${selectedAppDetails?.repayment_history?.max_days_past_due > 30 ? 'text-red-400' : ''}`}>
                                    {selectedAppDetails?.repayment_history?.max_days_past_due || 0} days
                                  </p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Completed Payments:</span>
                                  <p className="font-semibold font-mono">{selectedAppDetails?.repayment_history?.total_payments_made || 0}</p>
                                </div>
                                <div>
                                  <span className="text-zinc-500">Default Probability:</span>
                                  <p className="font-semibold font-mono">{round((selectedAppDetails?.repayment_history?.default_probability_actual || 0) * 100, 1)}%</p>
                                </div>
                              </div>
                            </div>

                            {/* What-If Simulator Panel */}
                            <div className="p-4 bg-blue-500/5 dark:bg-blue-600/5 border border-blue-200/50 dark:border-blue-600/20 rounded-xl space-y-4">
                              <div className="flex items-center gap-2">
                                <Lucide.Gauge className="h-4 w-4 text-blue-500" />
                                <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider">Manual Underwriting Simulation</span>
                              </div>

                              <div className="space-y-3">
                                {/* CIBIL Slider */}
                                <div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-zinc-400">Simulate CIBIL Score</span>
                                    <span className="font-mono font-bold text-blue-500">{simCibil}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="300"
                                    max="900"
                                    value={simCibil}
                                    onChange={e => setSimCibil(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                  />
                                </div>

                                {/* FOIR Slider */}
                                <div>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-zinc-400">Simulate FOIR Ratio</span>
                                    <span className="font-mono font-bold text-blue-500">{round(simFoir, 1)}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={simFoir}
                                    onChange={e => setSimFoir(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                  />
                                </div>
                              </div>

                              {/* Simulated Outcomes */}
                              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex justify-between items-center text-xs">
                                <div>
                                  <span className="text-zinc-400">Simulated Risk Score:</span>
                                  <p className="font-mono font-semibold mt-0.5 text-zinc-300">{round(simResult.score, 4)}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-zinc-400">Outcome Decision:</span>
                                  <span className={`block font-bold mt-0.5 text-[11px] px-2 py-0.5 rounded-full border ${simResult.decision === 'APPROVE'
                                      ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                      : simResult.decision === 'APPROVE WITH CONDITIONS'
                                        ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                                        : 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                                    }`}>
                                    {simResult.decision}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Underwriting Memo Panel */}
                            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/80 space-y-4">
                              <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider block">AI Generated Credit Memo</span>

                              <div className="flex gap-2">
                                <select
                                  value={memoTemplate}
                                  onChange={e => setMemoTemplate(e.target.value)}
                                  className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 rounded-lg px-3 py-2 outline-none"
                                >
                                  <option value="executive">Executive Summary</option>
                                  <option value="detailed">Detailed Analysis</option>
                                  <option value="compliance">Compliance Audit</option>
                                </select>
                                <button
                                  onClick={handleGenerateMemo}
                                  disabled={memoLoading}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition-all flex items-center gap-2"
                                >
                                  {memoLoading ? (
                                    <>
                                      <Lucide.Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Structuring...
                                    </>
                                  ) : (
                                    <>
                                      <Lucide.Sparkles className="h-3.5 w-3.5" />
                                      Generate Memo
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Memo markdown area */}
                              {memoLoading && (
                                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800/80">
                                  <div className="h-6 w-2/3 skeleton rounded" />
                                  <div className="h-4 skeleton rounded" />
                                  <div className="h-4 skeleton rounded" />
                                  <div className="h-4 w-5/6 skeleton rounded" />
                                  <div className="h-4 skeleton rounded" />
                                </div>
                              )}

                              {memoText && (
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg text-xs leading-relaxed max-h-[350px] overflow-y-auto">
                                  <div className="prose prose-invert max-w-none text-zinc-700 dark:text-zinc-300">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{memoText}</ReactMarkdown>
                                  </div>
                                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-4 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                                    Generated in {memoTime}s using LLaMA 3.1
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Floating Chatbot Overlay Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-[450px] bg-white dark:bg-[#0c0c0f] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col z-50 transition-all duration-300 ease-in-out transform ${isChatOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Chat Header */}
        <header className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded-md text-white">
              <Lucide.Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">Underwriting Copilot</h3>
              <span className="text-[10px] text-emerald-500 font-mono">Gemini Analytics Engine</span>
            </div>
          </div>
          <button
            onClick={() => setIsChatOpen(false)}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400"
          >
            <Lucide.X className="h-4 w-4" />
          </button>
        </header>

        {/* Conversation Message logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="p-4 bg-blue-500/5 rounded-full text-blue-500">
                <Lucide.MessageSquare className="h-8 w-8" />
              </div>
              <h4 className="font-bold text-sm">Welcome to CreditSentinel Chat</h4>
              <p className="text-xs text-zinc-500 max-w-xs">
                Ask analytical questions across our 15,000 loans. Ask about averages, reject details, or specific IDs (e.g. *APP-000001*).
              </p>
            </div>
          )}

          {chatHistory.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs shadow-sm ${msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800'
                }`}>
                {msg.role === 'model' ? (
                  <div className="prose prose-invert max-w-none text-zinc-800 dark:text-zinc-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {/* Streaming Live Thoughts Box */}
          {chatThoughts && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl px-4 py-3 bg-blue-500/5 dark:bg-blue-600/5 border border-blue-200/50 dark:border-blue-600/20 text-zinc-700 dark:text-zinc-400 text-xs">
                <div className="flex items-center gap-2 text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-2">
                  <Lucide.Loader2 className="h-3 w-3 animate-spin" />
                  Streamed Thoughts Process
                </div>
                <div className="font-mono whitespace-pre-wrap text-[11px] leading-relaxed">{chatThoughts}</div>
              </div>
            </div>
          )}

          {/* Streaming Live response box */}
          {chatStreamText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 text-xs shadow-sm">
                <div className="prose prose-invert max-w-none text-zinc-800 dark:text-zinc-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{chatStreamText}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Prompt Chips */}
        {chatSuggestions.length > 0 && (
          <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-wrap gap-2 bg-zinc-50 dark:bg-zinc-900/10">
            {chatSuggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(sug)}
                className="text-[10px] font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-full px-3 py-1 transition-all"
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input panel */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows="1"
              value={chatMessage}
              onChange={e => setChatMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder="Ask about approvals, default probability..."
              className="flex-1 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none text-zinc-950 dark:text-zinc-100 resize-none max-h-[200px]"
            />
            <button
              onClick={() => handleSendChat()}
              disabled={!chatMessage.trim() || isChatLoading}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-all"
            >
              <Lucide.Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
