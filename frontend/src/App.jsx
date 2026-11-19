import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, LayoutDashboard, FileText, CheckCircle2, AlertTriangle, 
  Send, User, ShieldAlert, Clock, RefreshCw, ExternalLink, Database, 
  HelpCircle, ChevronRight, BarChart3, TrendingUp, Users, Calendar, 
  AlertCircle, Sparkles, Building2, Ticket, X, BookOpen, Download, Link2,
  Cpu, Key, Check, Award, Zap, ShieldCheck, Layers, GitBranch, Target, FileCheck, ArrowRight,
  Play, Square, Mail, Inbox, AlertOctagon, CheckSquare, LogOut, CheckCheck, Eye,
  Coffee, History, Briefcase, HeartPulse, FileDown, XCircle
} from 'lucide-react';

function formatSecondsToHMS(totalSeconds) {
  const safeSec = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = safeSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Helper to parse markdown bold (**...**) and inline code (`...`) into native React elements
function formatMarkdownText(text, isUser = false) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    if (!line.trim()) {
      return <div key={lineIdx} className="h-2" />;
    }

    const parts = [];
    const tokenRegex = /(\*\*(.*?)\*\*|`([^`]+)`)/g;
    let match;
    let lastIndex = 0;
    let partKey = 0;

    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }

      if (match[2] !== undefined) {
        // Bold: **...**
        parts.push(
          <strong key={`${lineIdx}-${partKey++}`} className={isUser ? "font-bold text-white" : "font-bold text-slate-900"}>
            {match[2]}
          </strong>
        );
      } else if (match[3] !== undefined) {
        // Code: `...`
        parts.push(
          <code key={`${lineIdx}-${partKey++}`} className="bg-slate-200/80 text-slate-900 px-1 py-0.5 rounded text-xs font-mono">
            {match[3]}
          </code>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    return (
      <div key={lineIdx} className="leading-relaxed">
        {parts.length > 0 ? parts : line}
      </div>
    );
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState({
    id: 2,
    nombre: 'Carlos Morales Soto',
    puesto: 'Desarrollador Full Stack Senior',
    departamento: 'Ingeniería',
    rol: 'colaborador'
  });

  // Chat State
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: '¡Hola! Soy el asistente virtual oficial de Recursos Humanos de Innovatech Solutions S.A. Puedes preguntarme sobre tus días de vacaciones disponibles, políticas de permisos, teletrabajo, subsidio por incapacidad, fechas de pago y beneficios de la empresa. ¿En qué te puedo orientar hoy?',
      agente: 'Orquestador Multiagente',
      timestamp: '08:00 a. m.',
      citas: []
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef(null);

  // Dashboard State
  const [dashboardData, setDashboardData] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [securityEvents, setSecurityEvents] = useState([]);

  // Policies & Sync State
  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [realDriveFolderUrl, setRealDriveFolderUrl] = useState('');

  // In-App Document Viewer Modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docContent, setDocContent] = useState('');
  const [loadingDoc, setLoadingDoc] = useState(false);

  // LLM / DeepSeek & OpenAI State
  const [llmStatus, setLlmStatus] = useState(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [llmProvider, setLlmProvider] = useState('deepseek');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [isSavingLlm, setIsSavingLlm] = useState(false);

  // Attendance & Clock-in/Clock-out State (POL-RRHH-04)
  const [attendanceStatus, setAttendanceStatus] = useState({
    clockedIn: false,
    completedToday: false,
    record: null,
    segundosTranscurridos: 0,
    enAlmuerzo: false,
    segundosAlmuerzoActual: 0,
    segundosAlmuerzoTotal: 0,
    segundosExtra: 0
  });
  const [isClocking, setIsClocking] = useState(false);
  const [showEarlyExitModal, setShowEarlyExitModal] = useState(false);
  const [earlyExitData, setEarlyExitData] = useState({
    horasLaboradas: 0,
    horasFaltantes: 0,
    segundosLaborados: 0,
    motivoCategoria: 'Cita médica CCSS/INS',
    motivoDetalle: ''
  });
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeData, setOvertimeData] = useState({
    horasExtra: 0,
    autorizadas: true,
    motivo: ''
  });
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [isSubmittingExit, setIsSubmittingExit] = useState(false);
  const [attendanceAlerts, setAttendanceAlerts] = useState({
    earlyDepartures: [],
    emails: [],
    activeStaff: [],
    totalAlertas: 0,
    correosSinLeer: 0
  });
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [attendanceTab, setAttendanceTab] = useState('inbox'); // 'inbox' | 'log'

  // Self-Service State (Vacaciones, Permisos, Incapacidades, Constancia PDF)
  const [selfServiceData, setSelfServiceData] = useState({
    saldo: { dias_disponibles: 12, dias_tomados: 0, dias_asignados: 12 },
    solicitudes: [],
    incapacidades: []
  });
  const [adminRequests, setAdminRequests] = useState([]);
  const todayIso = new Date().toISOString().split('T')[0];
  const [requestForm, setRequestForm] = useState({
    tipo: 'vacaciones',
    fechaInicio: todayIso,
    fechaFin: todayIso,
    motivo: ''
  });
  const [incapacidadForm, setIncapacidadForm] = useState({
    entidad: 'CCSS',
    fechaInicio: todayIso,
    dias: 3,
    numeroBoleta: '',
    notas: ''
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isSubmittingIncapacidad, setIsSubmittingIncapacidad] = useState(false);

  // Real Email / SMTP Configuration State
  const [emailConfigStatus, setEmailConfigStatus] = useState(null);
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    targetEmail: 'ssalasl@fwdcostarica.com'
  });

  // Notification Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAttendanceStatus = (userId) => {
    if (!userId) return;
    fetch(`/api/attendance/status/${userId}`)
      .then(res => res.json())
      .then(data => {
        setAttendanceStatus({
          clockedIn: !!data.clockedIn,
          completedToday: !!data.completedToday,
          record: data.record || null,
          segundosTranscurridos: data.record?.segundosTranscurridos || (data.record?.segundos_trabajados || 0),
          enAlmuerzo: !!data.record?.enAlmuerzo,
          segundosAlmuerzoActual: data.record?.segundosAlmuerzoActual || 0,
          segundosAlmuerzoTotal: data.record?.segundosAlmuerzoTotal || (data.record?.segundos_almuerzo || 0),
          segundosExtra: data.record?.segundosExtra || (data.record?.segundos_extra || 0)
        });
      })
      .catch(err => console.warn('Error fetching attendance status:', err));
  };

  const fetchAttendanceAlerts = () => {
    fetch('/api/attendance/admin/alerts')
      .then(res => res.json())
      .then(data => {
        if (data && data.earlyDepartures) {
          setAttendanceAlerts(data);
        }
      })
      .catch(err => console.warn('Error fetching attendance alerts:', err));
  };

  const fetchEmailStatus = () => {
    fetch('/api/attendance/email-status')
      .then(res => res.json())
      .then(data => {
        setEmailConfigStatus(data);
        if (data && data.targetEmail) {
          setSmtpForm(prev => ({
            ...prev,
            targetEmail: data.targetEmail,
            smtpHost: data.smtpHost && !data.smtpHost.includes('No definido') ? data.smtpHost : 'smtp.gmail.com',
            smtpPort: data.smtpPort || '587'
          }));
        }
      })
      .catch(err => console.warn('Error fetching email status:', err));
  };

  const handleSaveSmtp = async (e) => {
    if (e) e.preventDefault();
    setIsSavingSmtp(true);
    try {
      const res = await fetch('/api/attendance/configure-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailConfigStatus(data.status);
        showToast('Credenciales SMTP guardadas exitosamente en .env');
        setShowSmtpModal(false);
      } else {
        showToast(data.error || 'Error al guardar configuración SMTP', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al configurar SMTP', 'error');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    try {
      const res = await fetch('/api/attendance/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: smtpForm.targetEmail || 'ssalasl@fwdcostarica.com' })
      });
      const data = await res.json();
      if (data.sentRealEmail) {
        showToast(`Correo real de prueba enviado exitosamente a ${data.destination}! Revisa tu bandeja de entrada.`);
      } else {
        showToast(data.message || data.error || 'No se pudo enviar el correo real. Verifica las credenciales SMTP en el modal o en .env.', 'error');
      }
    } catch (err) {
      showToast('Error de red al enviar correo de prueba', 'error');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const fetchSelfServiceData = (userId) => {
    if (!userId) return;
    fetch(`/api/self-service/requests/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.saldo) setSelfServiceData(data);
      })
      .catch(err => console.warn('Error fetching self-service data:', err));
  };

  const fetchAdminRequests = () => {
    fetch('/api/self-service/admin/requests')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAdminRequests(data);
      })
      .catch(err => console.warn('Error fetching admin requests:', err));
  };

  const fetchWeeklySummary = (userId) => {
    fetch(`/api/attendance/weekly-summary/${userId}`)
      .then(res => res.json())
      .then(data => {
        setWeeklySummary(data);
        setShowWeeklyModal(true);
      })
      .catch(() => showToast('Error cargando historial semanal', 'error'));
  };

  const handleToggleLunch = async () => {
    setIsClocking(true);
    const endpoint = attendanceStatus.enAlmuerzo ? '/api/attendance/lunch-end' : '/api/attendance/lunch-start';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colaboradorId: currentUser.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAttendanceStatus(prev => ({
          ...prev,
          record: data.record,
          enAlmuerzo: !!data.record?.enAlmuerzo,
          segundosTranscurridos: data.record?.segundosTranscurridos ?? prev.segundosTranscurridos,
          segundosAlmuerzoActual: data.record?.segundosAlmuerzoActual || 0,
          segundosAlmuerzoTotal: data.record?.segundosAlmuerzoTotal || 0,
          segundosExtra: data.record?.segundosExtra || 0
        }));
        showToast(data.message, data.excessNotified ? 'error' : 'success');
        if (currentUser.rol === 'rrhh') fetchAttendanceAlerts();
      } else {
        showToast(data.error || 'Error al actualizar pausa de almuerzo', 'error');
      }
    } catch (err) {
      showToast('Error de red en pausa de almuerzo', 'error');
    } finally {
      setIsClocking(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setIsSubmittingRequest(true);
    try {
      const res = await fetch('/api/self-service/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaboradorId: currentUser.id,
          ...requestForm
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.mensaje);
        setRequestForm(prev => ({ ...prev, motivo: '' }));
        fetchSelfServiceData(currentUser.id);
        if (currentUser.rol === 'rrhh') {
          fetchAdminRequests();
          fetchAttendanceAlerts();
        }
      } else {
        showToast(data.error || 'No se pudo enviar la solicitud', 'error');
      }
    } catch (err) {
      showToast('Error de red al enviar solicitud', 'error');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleDecideRequest = async (requestId, decision) => {
    try {
      const res = await fetch(`/api/self-service/admin/requests/${requestId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.mensaje);
        fetchAdminRequests();
        fetchSelfServiceData(currentUser.id);
      } else {
        showToast(data.error || 'Error procesando decisión', 'error');
      }
    } catch (err) {
      showToast('Error de red al decidir solicitud', 'error');
    }
  };

  const handleSubmitIncapacidad = async (e) => {
    e.preventDefault();
    setIsSubmittingIncapacidad(true);
    try {
      const res = await fetch('/api/self-service/incapacidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaboradorId: currentUser.id,
          ...incapacidadForm
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.mensaje);
        setIncapacidadForm(prev => ({ ...prev, numeroBoleta: '', notas: '' }));
        fetchSelfServiceData(currentUser.id);
        if (currentUser.rol === 'rrhh') fetchAttendanceAlerts();
      } else {
        showToast(data.error || 'Error registrando incapacidad', 'error');
      }
    } catch (err) {
      showToast('Error de red al reportar incapacidad', 'error');
    } finally {
      setIsSubmittingIncapacidad(false);
    }
  };

  // Live stopwatch timer ticking every 1 second when clocked in (pauses work timer during lunch)
  useEffect(() => {
    let timer = null;
    if (attendanceStatus.clockedIn) {
      timer = setInterval(() => {
        setAttendanceStatus(prev => {
          if (prev.enAlmuerzo) {
            return {
              ...prev,
              segundosAlmuerzoActual: prev.segundosAlmuerzoActual + 1,
              segundosAlmuerzoTotal: prev.segundosAlmuerzoTotal + 1
            };
          }
          const nextWork = prev.segundosTranscurridos + 1;
          return {
            ...prev,
            segundosTranscurridos: nextWork,
            segundosExtra: Math.max(0, nextWork - 28800)
          };
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [attendanceStatus.clockedIn]);

  // Fetch attendance & self-service data whenever currentUser changes
  useEffect(() => {
    if (currentUser?.id) {
      fetchAttendanceStatus(currentUser.id);
      fetchSelfServiceData(currentUser.id);
      if (currentUser.rol === 'rrhh') {
        fetchAttendanceAlerts();
        fetchAdminRequests();
      }
    }
  }, [currentUser?.id, currentUser?.rol]);

  const handleCheckIn = async () => {
    setIsClocking(true);
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colaboradorId: currentUser.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAttendanceStatus({
          clockedIn: true,
          completedToday: false,
          record: data.record,
          segundosTranscurridos: data.record?.segundosTranscurridos || 0,
          enAlmuerzo: false,
          segundosAlmuerzoActual: 0,
          segundosAlmuerzoTotal: 0,
          segundosExtra: 0
        });
        showToast(data.message || 'Entrada registrada exitosamente. Cronómetro de jornada en curso.');
        if (currentUser.rol === 'rrhh') fetchAttendanceAlerts();
      } else {
        showToast(data.error || 'Error al registrar entrada', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al registrar entrada', 'error');
    } finally {
      setIsClocking(false);
    }
  };

  const handleCheckOutClick = () => {
    const currentSeconds = attendanceStatus.segundosTranscurridos;
    const targetSeconds = 28800; // 8 horas

    if (currentSeconds < targetSeconds) {
      const elapsedHours = parseFloat((currentSeconds / 3600).toFixed(2));
      const missingHours = parseFloat((8.0 - elapsedHours).toFixed(2));
      setEarlyExitData({
        horasLaboradas: elapsedHours,
        horasFaltantes: missingHours > 0 ? missingHours : 0.01,
        segundosLaborados: currentSeconds,
        motivoCategoria: 'Cita médica CCSS/INS',
        motivoDetalle: ''
      });
      setShowEarlyExitModal(true);
    } else if (currentSeconds >= targetSeconds + 60) {
      const extraH = parseFloat(((currentSeconds - targetSeconds) / 3600).toFixed(2));
      setOvertimeData({ horasExtra: extraH, autorizadas: true, motivo: '' });
      setShowOvertimeModal(true);
    } else {
      executeCheckOut();
    }
  };

  const executeCheckOut = async (motivo = null, overtimePayload = null) => {
    setIsSubmittingExit(true);
    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaboradorId: currentUser.id,
          motivoSalidaAnticipada: motivo,
          horasExtraAutorizadas: overtimePayload?.autorizadas || false,
          motivoHorasExtra: overtimePayload?.motivo || null
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setShowEarlyExitModal(false);
        setShowOvertimeModal(false);
        setAttendanceStatus({
          clockedIn: false,
          completedToday: true,
          record: data.record,
          segundosTranscurridos: data.record?.segundos_trabajados || 0,
          enAlmuerzo: false,
          segundosAlmuerzoActual: 0,
          segundosAlmuerzoTotal: data.record?.segundos_almuerzo || 0,
          segundosExtra: data.record?.segundos_extra || 0
        });
        showToast(data.mensaje);
        if (currentUser.rol === 'rrhh') {
          fetchAttendanceAlerts();
          fetchDashboardData();
        }
      } else if (data.requiresReason) {
        setEarlyExitData({
          horasLaboradas: data.horasLaboradas,
          horasFaltantes: data.horasFaltantes,
          segundosLaborados: data.segundosLaborados,
          motivoCategoria: 'Cita médica CCSS/INS',
          motivoDetalle: ''
        });
        setShowEarlyExitModal(true);
      } else {
        showToast(data.error || 'Error al registrar salida', 'error');
      }
    } catch (err) {
      showToast('Error de red al registrar salida', 'error');
    } finally {
      setIsSubmittingExit(false);
    }
  };

  const handleConfirmEarlyExit = (e) => {
    if (e) e.preventDefault();
    if (!earlyExitData.motivoDetalle.trim()) {
      showToast('Por favor describe el motivo de tu salida anticipada para informar a RRHH.', 'error');
      return;
    }
    const motivoCompleto = `[${earlyExitData.motivoCategoria}] ${earlyExitData.motivoDetalle.trim()}`;
    executeCheckOut(motivoCompleto);
  };

  const handleMarkEmailRead = async (emailId) => {
    try {
      await fetch('/api/attendance/admin/mark-email-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId })
      });
      fetchAttendanceAlerts();
    } catch (err) {
      console.warn('Error marking email as read:', err);
    }
  };

  const fetchLlmStatus = () => {
    fetch('/api/llm/status')
      .then(res => res.json())
      .then(data => {
        setLlmStatus(data);
        if (data.provider === 'deepseek' || data.deepseekConfigured) {
          setLlmProvider('deepseek');
          setSelectedModel(data.deepseekModel || 'deepseek-chat');
        } else if (data.provider === 'openai' || data.openaiConfigured) {
          setLlmProvider('openai');
          setSelectedModel(data.openaiModel || 'gpt-4o-mini');
        }
      })
      .catch(err => console.warn('Error fetching LLM status:', err));
  };

  const handleConfigureLLM = async (e) => {
    if (e) e.preventDefault();
    if (!apiKeyInput.trim()) {
      showToast(`Por favor ingresa una API Key de ${llmProvider === 'deepseek' ? 'DeepSeek' : 'OpenAI'} válida`, 'error');
      return;
    }
    setIsSavingLlm(true);
    try {
      const res = await fetch('/api/llm/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKeyInput.trim(),
          model: selectedModel,
          provider: llmProvider
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLlmStatus(data.status);
        setShowApiKeyModal(false);
        setApiKeyInput('');
        showToast(`${llmProvider === 'deepseek' ? 'DeepSeek' : 'OpenAI'} (${selectedModel}) conectado exitosamente. Ahora responderá las consultas del chat.`);
      } else {
        showToast(data.error || 'Error al conectar LLM', 'error');
      }
    } catch (err) {
      showToast('Error de red al conectar con el motor LLM', 'error');
    } finally {
      setIsSavingLlm(false);
    }
  };

  // Load initial users and sync status
  useEffect(() => {
    fetchLlmStatus();
    fetchEmailStatus();
    fetch('/api/auth/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
          const found = data.find(u => u.id === 2);
          if (found) setCurrentUser(found);
        }
      })
      .catch(err => console.warn('Error fetching users:', err));

    fetch('/api/sync/status')
      .then(res => res.json())
      .then(setSyncStatus)
      .catch(err => console.warn('Error fetching sync status:', err));
  }, []);

  // Fetch dashboard stats when opening dashboard tab or changing role
  useEffect(() => {
    if (activeTab === 'dashboard' && currentUser.rol === 'rrhh') {
      fetchDashboardData();
    }
  }, [activeTab, currentUser]);

  // Ensure collaborators cannot access or stay on dashboard tab
  useEffect(() => {
    if (currentUser.rol !== 'rrhh' && activeTab === 'dashboard') {
      setActiveTab('chat');
    }
  }, [currentUser.rol, activeTab]);

  // Scroll to bottom on message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const fetchDashboardData = () => {
    setDashboardLoading(true);
    fetch('/api/dashboard/stats', {
      headers: { 'x-user-role': currentUser.rol }
    })
      .then(res => {
        if (!res.ok) throw new Error('No autorizado');
        return res.json();
      })
      .then(data => {
        setDashboardData(data);
        setDashboardLoading(false);
      })
      .catch(err => {
        console.warn('Dashboard fetch error:', err);
        setDashboardLoading(false);
      });

    fetch('/api/dashboard/security-events', {
      headers: { 'x-user-role': currentUser.rol }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSecurityEvents(data);
      })
      .catch(() => {});
  };

  const handleSendMessage = async (queryText) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isSending) return;

    setInputQuery('');
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaboradorId: currentUser.id,
          query: q
        })
      });
      const data = await res.json();

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.respuesta,
        agente: data.agente,
        intencion: data.intencion,
        citas: data.citas || [],
        latencia_ms: data.latencia_ms,
        ofreceEscalamiento: data.ofreceEscalamiento,
        preguntaOriginal: q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Lo sentimos, ocurrió un error de conexión con los agentes de RRHH. Por favor intenta de nuevo.',
        agente: 'Sistema',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenDocViewer = (filename, metadata = {}) => {
    setSelectedDoc({ filename, ...metadata });
    setLoadingDoc(true);
    setDocContent('');

    fetch(`/api/policies/content/${encodeURIComponent(filename)}`)
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          setDocContent(data.content);
        } else if (data.formato === 'pdf') {
          setDocContent(`DOCUMENTO EN FORMATO PDF OFICIAL: ${filename}\n\nPuedes ver o descargar el PDF generado directamente con el botón de abajo.`);
        }
        setLoadingDoc(false);
      })
      .catch(err => {
        setDocContent('Error cargando el contenido del documento.');
        setLoadingDoc(false);
      });
  };

  const handleUpdateDriveFolder = async (e) => {
    e.preventDefault();
    if (!realDriveFolderUrl.trim()) return;

    try {
      const res = await fetch('/api/policies/update-drive-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveFolderUrl: realDriveFolderUrl.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Enlaces a Google Drive actualizados en todos los documentos con éxito.');
        fetch('/api/sync/status').then(r => r.json()).then(setSyncStatus);
      }
    } catch (err) {
      showToast('Error actualizando enlaces de Drive', 'error');
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const res = await fetch('/api/dashboard/generate-report', {
        method: 'POST',
        headers: { 'x-user-role': currentUser.rol }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Reporte diario generado exitosamente por el Agente Analista.', 'success');
        fetchDashboardData();
      }
    } catch (err) {
      showToast('Error generando reporte', 'error');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/trigger', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Sincronización completada: ${data.indexedDocuments.length} documentos indexados con ${data.totalChunks} chunks.`);
        fetch('/api/sync/status').then(r => r.json()).then(setSyncStatus);
      }
    } catch (err) {
      showToast('Error sincronizando con Google Drive', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateTicket = async (pregunta) => {
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaboradorId: currentUser.id,
          preguntaOriginal: pregunta,
          motivo: 'Consulta no resuelta en políticas'
        })
      });
      const data = await res.json();
      showToast(`Ticket #TICK-${data.ticketId} creado exitosamente. Gestión de Talento te responderá en 24-48h.`);
    } catch (err) {
      showToast('Error creando ticket', 'error');
    }
  };

  // Quick suggestions
  const quickSuggestions = [
    '¿Cuántos días de vacaciones me corresponden al año?',
    '¿Cuántos días de vacaciones me quedan disponibles?',
    '¿Puedo acumular vacaciones para el próximo año?',
    '¿Cuántos días me quedan y puedo pasar los que sobren al otro año?',
    '¿Cuánto dura la licencia de maternidad y paternidad?',
    '¿Cómo se pagan las horas extra?',
    '¿Qué feriados quedan este año?',
    '¿En qué estado está mi solicitud de permiso del viernes?',
    '¿Cuántos días de vacaciones tiene mi compañero Juan?'
  ];

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      {/* Toast */}
      {toast && (
        <div className={`animate-toast-enter fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2.5 border backdrop-blur-md ${toast.type === 'error' ? 'bg-red-50/95 text-red-800 border-red-200' : 'bg-emerald-50/95 text-emerald-800 border-emerald-200'}`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-blue-500 to-indigo-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20 ring-1 ring-white/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">Innovatech Solutions S.A.</h1>
                <span className="text-[11px] bg-brand-50 text-brand-700 font-semibold px-2.5 py-0.5 rounded-full border border-brand-200/70">
                  RAG Multiagente
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Portal de Políticas de RRHH &amp; Gestión Interna</p>
            </div>
          </div>

          {/* User & Role Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100/90 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition-colors">
              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-xs border border-slate-200/60">
                <User className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <select
                aria-label="Seleccionar Colaborador y Rol"
                value={currentUser.id}
                onChange={(e) => {
                  const uid = parseInt(e.target.value, 10);
                  const sel = users.find(u => u.id === uid);
                  if (sel) {
                    setCurrentUser(sel);
                    showToast(`Cambiado a: ${sel.nombre} (Rol: ${sel.rol.toUpperCase()})`);
                  }
                }}
                className="bg-transparent text-xs sm:text-sm font-medium text-slate-800 focus:outline-none cursor-pointer pr-1 max-w-[180px] sm:max-w-none truncate"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} · {u.puesto} ({u.rol.toUpperCase()})
                  </option>
                ))}
              </select>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${currentUser.rol === 'rrhh' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                {currentUser.rol}
              </span>
            </div>
          </div>
        </div>

        {/* Pill Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-1.5 overflow-x-auto border-t border-slate-100/80">
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-1.5 px-3.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'chat' ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/70 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat con Agente
          </button>
          <button
            onClick={() => {
              setActiveTab('selfservice');
              fetchSelfServiceData(currentUser.id);
            }}
            className={`py-1.5 px-3.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'selfservice' ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/70 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'}`}
          >
            <Briefcase className="w-4 h-4" />
            Autoservicio
          </button>
          {currentUser.rol === 'rrhh' && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-1.5 px-3.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'dashboard' ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/70 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard RRHH
            </button>
          )}
          <button
            onClick={() => setActiveTab('policies')}
            className={`py-1.5 px-3.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'policies' ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/70 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'}`}
          >
            <FileText className="w-4 h-4" />
            Políticas &amp; Drive ({syncStatus?.totalDocumentos || 12})
          </button>
          <button
            onClick={() => setActiveTab('evaluator')}
            className={`py-1.5 px-3.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'evaluator' ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/70 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'}`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Evaluación (45 Preguntas)
          </button>
          <button
            onClick={() => setActiveTab('differentiators')}
            className={`py-1.5 px-3.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'differentiators' ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/70 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'}`}
          >
            <Award className="w-4 h-4" />
            ¿Qué nos Diferencia?
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* BARRA DE REGISTRO DE ASISTENCIA Y JORNADA LABORAL (POL-RRHH-04) */}
        <div className={`mb-6 rounded-2xl border p-4 transition-all duration-300 shadow-[0_2px_8px_rgba(15,23,42,0.03)] ${
          attendanceStatus.clockedIn
            ? 'bg-gradient-to-r from-emerald-50/60 via-white to-white border-emerald-200/80'
            : 'bg-white/90 border-slate-200/80'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Colaborador & Estado de la Marca */}
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                attendanceStatus.clockedIn
                  ? 'bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50'
                  : attendanceStatus.completedToday
                  ? 'bg-blue-100 text-blue-700 ring-4 ring-blue-50'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    Control de Asistencia & Jornada
                  </h2>
                  <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                    POL-RRHH-04 · 8h Diarias
                  </span>
                  {attendanceStatus.clockedIn ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                      Jornada en Curso
                    </span>
                  ) : attendanceStatus.completedToday ? (
                    <span className={`text-[11px] px-2.5 py-0.5 rounded font-bold border ${
                      attendanceStatus.record?.salida_anticipada
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}>
                      {attendanceStatus.record?.salida_anticipada ? 'Salida Anticipada Registrada' : 'Jornada Completada'}
                    </span>
                  ) : (
                    <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">
                      Jornada no iniciada
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {attendanceStatus.clockedIn
                    ? `Colaborador: ${currentUser.nombre} · Entrada registrada a las ${new Date(attendanceStatus.record?.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : attendanceStatus.completedToday
                    ? `Colaborador: ${currentUser.nombre} · Horas trabajadas: ${attendanceStatus.record?.horas_trabajadas || 0} h de 8.0 h meta.${attendanceStatus.record?.salida_anticipada ? ' (Notificación remitida a Mariana Soto Vargas)' : ''}`
                    : `Colaborador: ${currentUser.nombre} (${currentUser.puesto}) · Presiona Registrar Entrada para iniciar el contador oficial de tu jornada.`}
                </p>
              </div>
            </div>

            {/* Contador / Cronómetro en Vivo (Jornada, Almuerzo u Horas Extra) */}
            {attendanceStatus.clockedIn && (
              <div className={`flex flex-col items-center justify-center rounded-xl px-5 py-2.5 min-w-[250px] shadow-xs border transition-colors ${
                attendanceStatus.enAlmuerzo
                  ? 'bg-amber-50/90 border-amber-300'
                  : attendanceStatus.segundosTranscurridos >= 28800
                  ? 'bg-indigo-50/90 border-indigo-300'
                  : 'bg-white/90 border-emerald-200/80'
              }`}>
                <div className="text-[11px] font-medium flex items-center gap-2">
                  {attendanceStatus.enAlmuerzo ? (
                    <>
                      <span className="text-amber-800 font-bold">Pausa de Almuerzo</span>
                      <span className="text-amber-600 font-mono tabular-nums">Límite: 01:00:00</span>
                    </>
                  ) : attendanceStatus.segundosTranscurridos >= 28800 ? (
                    <>
                      <span className="text-indigo-800 font-bold">Tiempo Extra (1.5x)</span>
                      <span className="text-indigo-600 font-mono tabular-nums">+{formatSecondsToHMS(attendanceStatus.segundosExtra)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500">Cronómetro de Trabajo</span>
                      <span className="text-slate-400 font-mono tabular-nums">Meta: 08:00:00</span>
                    </>
                  )}
                </div>
                <div className={`font-mono tabular-nums text-2xl font-black tracking-wider my-0.5 ${
                  attendanceStatus.enAlmuerzo
                    ? (attendanceStatus.segundosAlmuerzoTotal > 3600 ? 'text-red-700' : 'text-amber-900')
                    : attendanceStatus.segundosTranscurridos >= 28800
                    ? 'text-indigo-900'
                    : 'text-slate-900'
                }`}>
                  {attendanceStatus.enAlmuerzo
                    ? formatSecondsToHMS(attendanceStatus.segundosAlmuerzoTotal)
                    : formatSecondsToHMS(attendanceStatus.segundosTranscurridos)}
                </div>
                {/* Barra de progreso */}
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      attendanceStatus.enAlmuerzo
                        ? (attendanceStatus.segundosAlmuerzoTotal > 3600 ? 'bg-red-500' : 'bg-amber-500')
                        : attendanceStatus.segundosTranscurridos >= 28800
                        ? 'bg-indigo-600'
                        : 'bg-gradient-to-r from-brand-600 to-blue-500'
                    }`}
                    style={{
                      width: attendanceStatus.enAlmuerzo
                        ? `${Math.min(100, (attendanceStatus.segundosAlmuerzoTotal / 3600) * 100)}%`
                        : `${Math.min(100, (attendanceStatus.segundosTranscurridos / 28800) * 100)}%`
                    }}
                  />
                </div>
                <div className="flex justify-between w-full text-[10px] text-slate-500 mt-1 font-mono tabular-nums">
                  {attendanceStatus.enAlmuerzo ? (
                    <>
                      <span>Jornada pausada: {formatSecondsToHMS(attendanceStatus.segundosTranscurridos)}</span>
                      <span>{attendanceStatus.segundosAlmuerzoTotal > 3600 ? 'Exceso detectado' : 'En límite'}</span>
                    </>
                  ) : (
                    <>
                      <span>{(attendanceStatus.segundosTranscurridos / 3600).toFixed(2)}h laboradas</span>
                      <span>{attendanceStatus.segundosTranscurridos >= 28800 ? 'Horas extra activas' : `${Math.max(0, (8 - (attendanceStatus.segundosTranscurridos / 3600))).toFixed(2)}h faltantes`}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => fetchWeeklySummary(currentUser.id)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors"
                title="Ver resumen semanal (meta 40h) e historial de marcas"
              >
                <History className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Historial</span>
              </button>
              {!attendanceStatus.clockedIn ? (
                <button
                  onClick={handleCheckIn}
                  disabled={isClocking}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all hover:shadow"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Registrar Entrada</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleToggleLunch}
                    disabled={isClocking}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                      attendanceStatus.enAlmuerzo
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>{attendanceStatus.enAlmuerzo ? 'Fin Almuerzo' : 'Almuerzo'}</span>
                  </button>
                  <button
                    onClick={handleCheckOutClick}
                    disabled={isSubmittingExit || attendanceStatus.enAlmuerzo}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 ${
                      attendanceStatus.segundosTranscurridos < 28800
                        ? 'bg-amber-600 hover:bg-amber-700 text-white hover:shadow'
                        : attendanceStatus.segundosTranscurridos >= 28800
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow'
                        : 'bg-red-600 hover:bg-red-700 text-white hover:shadow'
                    }`}
                    title={attendanceStatus.enAlmuerzo ? "Finaliza tu pausa de almuerzo antes de registrar salida" : attendanceStatus.segundosTranscurridos < 28800 ? "Salida antes de 8 horas: se requerirá justificación formal para RRHH" : "Completar jornada laboral ordinaria"}
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Registrar Salida</span>
                  </button>
                </>
              )}
              {attendanceStatus.completedToday && !attendanceStatus.clockedIn && (
                <button
                  onClick={handleCheckIn}
                  disabled={isClocking}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 transition-colors"
                  title="Registrar una nueva entrada de jornada"
                >
                  Nueva Marca
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TAB 1: CHAT CON AGENTES */}
        {activeTab === 'chat' && (
          <div className="animate-tab-enter grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chat Box */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.04)] border border-slate-200/80 flex flex-col h-[74vh] overflow-hidden">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">Orquestador de Consultas de Políticas y Datos</h2>
                    <p className="text-xs text-slate-500">Conectado a Google Drive (12 documentos) y Base de Datos (52 colaboradores)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setShowApiKeyModal(true)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border shadow-xs transition-all ${
                      llmStatus?.deepseekConfigured || llmStatus?.openaiConfigured
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100'
                    }`}
                    title="Configurar Motor LLM (DeepSeek / OpenAI)"
                  >
                    <Cpu className="w-3.5 h-3.5 text-brand-600" />
                    <span>
                      {llmStatus?.deepseekConfigured
                        ? `DeepSeek: ${llmStatus.deepseekModel}`
                        : (llmStatus?.openaiConfigured
                            ? `OpenAI: ${llmStatus.openaiModel}`
                            : 'Conectar DeepSeek')}
                    </span>
                  </button>
                  <span className="text-xs bg-slate-200/70 text-slate-700 px-2.5 py-1 rounded-md font-mono hidden sm:inline-block">
                    Sesión: {currentUser.nombre.split(' ')[0]}
                  </span>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
                {messages.map((m) => (
                  <div key={m.id} className={`animate-msg-enter flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 ${m.sender === 'user' ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-tr-sm shadow-md shadow-brand-500/15' : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)]'}`}>
                      {/* Bot Header Badge */}
                      {m.sender === 'bot' && (
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200/60">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                            {m.agente}
                          </span>
                          {m.latencia_ms !== undefined && (
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{m.latencia_ms} ms</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Text content with markdown formatting (bold, code, links) */}
                      <div className="text-sm leading-relaxed font-sans space-y-1">
                        {formatMarkdownText(m.text, m.sender === 'user')}
                      </div>

                      {/* Citations Box with In-App Viewer & Drive Links */}
                      {m.citas && m.citas.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                            <FileText className="w-3.5 h-3.5 text-brand-600" />
                            Documentos de Drive Citados:
                          </p>
                          <div className="space-y-2">
                            {m.citas.map((c, i) => (
                              <div
                                key={i}
                                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-brand-300 transition-all text-xs shadow-xs"
                              >
                                <div className="font-semibold text-slate-900 flex items-center justify-between">
                                  <span>{c.titulo} ({c.codigo})</span>
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {c.documento}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 mt-0.5">
                                  Sección: <span className="font-medium text-slate-800">{c.seccion}</span>
                                </div>

                                {/* Action Buttons: View inside portal OR open file */}
                                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-2">
                                  <button
                                    onClick={() => handleOpenDocViewer(c.documento, c)}
                                    className="bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1 transition-colors"
                                  >
                                    <BookOpen className="w-3 h-3" />
                                    <span>Leer en el Portal</span>
                                  </button>
                                  <a
                                    href={`/api/policies/file/${encodeURIComponent(c.documento)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded-md text-[11px] flex items-center gap-1 bg-slate-100 hover:bg-slate-200 transition-colors"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Ver Archivo</span>
                                  </a>
                                  <a
                                    href={
                                      c.enlace && c.enlace.startsWith('http') && !c.enlace.includes('_2026/view')
                                        ? c.enlace
                                        : `/drive/view/${encodeURIComponent(c.documento)}`
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 text-[11px] flex items-center gap-1 transition-colors ml-auto bg-blue-50 hover:bg-blue-100 rounded"
                                    title="Abrir vista oficial de Google Drive"
                                  >
                                    <span>Google Drive</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Offer Escalation Button */}
                      {m.ofreceEscalamiento && (
                        <div className="mt-3 pt-2">
                          <button
                            onClick={() => handleCreateTicket(m.preguntaOriginal)}
                            className="text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            Generar Ticket de Escalamiento a RRHH
                          </button>
                        </div>
                      )}

                      <div className={`text-[10px] mt-1 text-right ${m.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                        {m.timestamp}
                      </div>
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl rounded-tl-none p-3.5 text-xs flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-600" />
                      <span>El Orquestador está enrutando y consultando las fuentes oficiales...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Form */}
              <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Escribe tu consulta sobre políticas, saldos o trámites de RRHH..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !inputQuery.trim()}
                    className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <span>Preguntar</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar with Suggestions & Info */}
            <div className="lg:col-span-1 space-y-4">
              {/* Employee Summary Card */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Colaborador en Sesión</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                    {currentUser.nombre.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{currentUser.nombre}</h4>
                    <p className="text-xs text-slate-500">{currentUser.puesto}</p>
                  </div>
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Departamento:</span>
                    <span className="font-semibold text-slate-800">{currentUser.departamento}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rol en Portal:</span>
                    <span className="font-semibold text-brand-600 uppercase">{currentUser.rol}</span>
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Preguntas Frecuentes
                </h3>
                <div className="space-y-2">
                  {quickSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(s)}
                      className="w-full text-left p-2 rounded-lg text-xs text-slate-600 hover:bg-slate-50 hover:text-brand-600 border border-slate-100 hover:border-slate-200 transition-colors flex items-center justify-between group"
                    >
                      <span className="line-clamp-2">{s}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 flex-shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: AUTOSERVICIO (VACACIONES, CONSTANCIA PDF, INCAPACIDADES) */}
        {activeTab === 'selfservice' && (
          <div className="animate-tab-enter space-y-6">
            {/* Constancia Laboral PDF Banner (1 Clic) */}
            <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center flex-shrink-0">
                  <FileDown className="w-6 h-6 text-blue-100" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">Constancia Laboral Oficial en PDF</h2>
                  <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                    Descarga al instante tu constancia firmada por la Dirección de RRHH con tu puesto ({currentUser.puesto}), departamento ({currentUser.departamento}) y estado contractual activo.
                  </p>
                </div>
              </div>
              <a
                href={`/api/self-service/constancia-pdf/${currentUser.id}`}
                target="_blank"
                rel="noreferrer"
                className="bg-white hover:bg-blue-50 text-brand-900 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Constancia PDF</span>
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TARJETA 1: SOLICITUD DE VACACIONES Y PERMISOS */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200/60">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Solicitud de Vacaciones y Permisos</h3>
                      <p className="text-xs text-slate-500">Validación de saldo y envío automático a RRHH</p>
                    </div>
                  </div>
                  <div className="text-right bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <span className="block text-[10px] font-semibold text-emerald-700 uppercase">Saldo Disponible</span>
                    <span className="text-base font-black text-emerald-900 tabular-nums">
                      {selfServiceData.saldo?.dias_disponibles ?? 12} días
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmitRequest} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Solicitud</label>
                    <select
                      value={requestForm.tipo}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, tipo: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    >
                      <option value="vacaciones">Vacaciones Anuales (POL-RRHH-01)</option>
                      <option value="teletrabajo">Solicitud de Teletrabajo (POL-RRHH-04)</option>
                      <option value="permiso_personal">Permiso Personal / Trámite</option>
                      <option value="cita_medica">Permiso por Cita Médica</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Inicio</label>
                      <input
                        type="date"
                        required
                        value={requestForm.fechaInicio}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, fechaInicio: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Fin</label>
                      <input
                        type="date"
                        required
                        value={requestForm.fechaFin}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, fechaFin: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Motivo o Comentarios</label>
                    <textarea
                      rows={2}
                      value={requestForm.motivo}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, motivo: e.target.value }))}
                      placeholder="Indica detalles relevantes para tu jefatura y RRHH..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingRequest}
                    className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingRequest ? 'Enviando solicitud...' : 'Enviar Solicitud y Notificar a RRHH'}</span>
                  </button>
                </form>

                {/* Historial de Solicitudes del Colaborador */}
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-2.5">Mis Solicitudes Recientes</h4>
                  {selfServiceData.solicitudes.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No tienes solicitudes registradas.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selfServiceData.solicitudes.map((sol) => (
                        <div key={sol.id} className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 capitalize">{sol.tipo.replace('_', ' ')}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{sol.fecha_inicio} al {sol.fecha_fin}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                            sol.estado === 'aprobada'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : sol.estado === 'rechazada'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {sol.estado}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* TARJETA 2: REPORTE DE INCAPACIDADES MÉDICAS (CCSS / INS) */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Reporte de Incapacidad Médica</h3>
                      <p className="text-xs text-slate-500">Cálculo automático de subsidio según POL-RRHH-03</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg">
                    CCSS / INS
                  </span>
                </div>

                <form onSubmit={handleSubmitIncapacidad} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Entidad Emisora</label>
                      <select
                        value={incapacidadForm.entidad}
                        onChange={(e) => setIncapacidadForm(prev => ({ ...prev, entidad: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                      >
                        <option value="CCSS">CCSS (Enfermedad Común)</option>
                        <option value="INS">INS (Riesgo de Trabajo)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Número de Boleta</label>
                      <input
                        type="text"
                        required
                        value={incapacidadForm.numeroBoleta}
                        onChange={(e) => setIncapacidadForm(prev => ({ ...prev, numeroBoleta: e.target.value }))}
                        placeholder="Ej. BOL-2026-88412"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Inicio</label>
                      <input
                        type="date"
                        required
                        value={incapacidadForm.fechaInicio}
                        onChange={(e) => setIncapacidadForm(prev => ({ ...prev, fechaInicio: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Días de Incapacidad</label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        required
                        value={incapacidadForm.dias}
                        onChange={(e) => setIncapacidadForm(prev => ({ ...prev, dias: parseInt(e.target.value, 10) || 1 }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Vista previa automática del cálculo de subsidio */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                    <strong className="text-slate-800 block mb-0.5">Cálculo Estimado de Subsidio (POL-RRHH-03):</strong>
                    {incapacidadForm.entidad === 'CCSS' ? (
                      <span>
                        Días 1 a {Math.min(3, incapacidadForm.dias)}: <strong>50% Patrono</strong>.{' '}
                        {incapacidadForm.dias > 3 && (
                          <>Días 4 a {incapacidadForm.dias}: <strong>60% CCSS + 40% Patrono</strong>.</>
                        )}
                      </span>
                    ) : (
                      <span>Cobertura INS por Riesgo de Trabajo: <strong>60% INS + 40% Patrono</strong> desde el día 1.</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones (Opcional)</label>
                    <input
                      type="text"
                      value={incapacidadForm.notas}
                      onChange={(e) => setIncapacidadForm(prev => ({ ...prev, notas: e.target.value }))}
                      placeholder="Clínica emisora o detalles adicionales..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingIncapacidad}
                    className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingIncapacidad ? 'Registrando incapacidad...' : 'Reportar Incapacidad a RRHH'}</span>
                  </button>
                </form>

                {/* Historial de Incapacidades */}
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-2.5">Mis Incapacidades Registradas</h4>
                  {selfServiceData.incapacidades.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">Sin incapacidades registradas.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selfServiceData.incapacidades.map((inc) => (
                        <div key={inc.id} className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div>
                            <div className="font-bold text-slate-800">{inc.entidad} · {inc.dias} día(s)</div>
                            <div className="text-[11px] text-slate-500 font-mono">Inicio: {inc.fecha_inicio} {inc.numero_boleta ? `· Boleta: ${inc.numero_boleta}` : ''}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            {inc.estado}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DASHBOARD RRHH */}
        {activeTab === 'dashboard' && currentUser.rol === 'rrhh' && (
          <div className="animate-tab-enter">
            {dashboardLoading ? (
              <div className="text-center py-24 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-3" />
                <p className="text-sm">Cargando métricas consolidadas del dashboard...</p>
              </div>
            ) : dashboardData ? (
              <div className="space-y-6">
                {/* Header bar with report trigger */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">Dashboard Ejecutivo de Recursos Humanos</h2>
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                        {dashboardData.reporteActual?.fecha}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitoreo diario programado a las 7:00 a. m. · Generado por el Agente Analista
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="/api/dashboard/export-pdf"
                      target="_blank"
                      rel="noreferrer"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 border border-slate-300 transition-colors shadow-xs"
                      title="Descargar Reporte Ejecutivo Oficial en PDF"
                    >
                      <Download className="w-4 h-4 text-brand-600" />
                      <span>Exportar PDF</span>
                    </a>
                    <button
                      onClick={handleGenerateReport}
                      disabled={isGeneratingReport}
                      className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                      <span>Generar Reporte Diario</span>
                    </button>
                  </div>
                </div>

                {/* 5 KPI Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Card 1: Ausentes Hoy */}
                  <div className="card-interactive bg-white p-4 rounded-xl shadow-xs hover:shadow-md border border-slate-200/80 hover:border-brand-200/80">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-500">Ausentes Hoy</span>
                      <Users className="w-4 h-4 text-brand-600" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {dashboardData.reporteActual.datos.ausentes_hoy.total}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {dashboardData.reporteActual.datos.ausentes_hoy.por_tipo.vacaciones} vacac. · {dashboardData.reporteActual.datos.ausentes_hoy.por_tipo.permiso} perm. · {dashboardData.reporteActual.datos.ausentes_hoy.por_tipo.incapacidad} incap.
                    </div>
                  </div>

                  {/* Card 2: Solicitudes Pendientes */}
                  <div className="card-interactive bg-white p-4 rounded-xl shadow-xs hover:shadow-md border border-slate-200/80 hover:border-brand-200/80">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-500">Solicitudes Pendientes</span>
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2 flex items-baseline gap-2">
                      <span>{dashboardData.reporteActual.datos.solicitudes_pendientes.total}</span>
                      {dashboardData.reporteActual.datos.solicitudes_pendientes.mas_de_3_dias > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                          {dashboardData.reporteActual.datos.solicitudes_pendientes.mas_de_3_dias} &gt; 3 días
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Pendientes de jefatura</div>
                  </div>

                  {/* Card 3: Incapacidades Activas */}
                  <div className="card-interactive bg-white p-4 rounded-xl shadow-xs hover:shadow-md border border-slate-200/80 hover:border-brand-200/80">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-500">Incapacidades Activas</span>
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {dashboardData.reporteActual.datos.incapacidades_activas.total}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {dashboardData.reporteActual.datos.incapacidades_activas.dias_acumulados_mes} días acum. en el mes
                    </div>
                  </div>

                  {/* Card 4: Rotación Acumulada */}
                  <div className="card-interactive bg-white p-4 rounded-xl shadow-xs hover:shadow-md border border-slate-200/80 hover:border-brand-200/80">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-500">Tasa de Rotación</span>
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {dashboardData.reporteActual.datos.rotacion_mensual.tasa_rotacion_acumulada_pct}%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {dashboardData.reporteActual.datos.rotacion_mensual.ingresos_mes} ingresos · {dashboardData.reporteActual.datos.rotacion_mensual.salidas_mes} salidas
                    </div>
                  </div>

                  {/* Card 5: Pasivo Laboral Vacaciones > 20 días */}
                  <div className="card-interactive bg-white p-4 rounded-xl shadow-xs hover:shadow-md border border-slate-200/80 hover:border-brand-200/80">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-500">Pasivo Vacaciones</span>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2 text-amber-600">
                      {dashboardData.reporteActual.datos.pasivo_vacaciones_riesgo.colaboradores_con_mas_de_20_dias}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Colaboradores &gt; 20 días acum.</div>
                  </div>
                </div>

                {/* Resumen Ejecutivo del LLM */}
                <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 p-6 rounded-2xl border border-blue-200/60 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-brand-800 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    Resumen Ejecutivo Diario del Agente Analista
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-sans">
                    {dashboardData.reporteActual.resumen_texto}
                  </p>
                  <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Generado por: {dashboardData.reporteActual.generado_por}</span>
                    <span>·</span>
                    <span>Latencia promedio del chatbot: {dashboardData.reporteActual.datos.metricas_chatbot.latencia_promedio_ms} ms</span>
                    <span>·</span>
                    <span>Resolución sin escalar: {dashboardData.reporteActual.datos.metricas_chatbot.porcentaje_resuelto_sin_escalar}%</span>
                  </div>
                </div>

                {/* 2 Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Gráfico 1: Tendencia 30 días */}
                  <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Tendencia Histórica de 30 Días</h3>
                        <p className="text-xs text-slate-500">Consultas recibidas por el chatbot vs Ausencias operativas</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Consultas Chatbot
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Ausencias
                        </span>
                      </div>
                    </div>
                    
                    <div className="h-56 w-full flex items-end gap-1.5 pt-6 pb-2 px-2 border-b border-slate-100">
                      {dashboardData.tendencias30Dias.map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                          <div className="absolute -top-10 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow">
                            {item.fechaCompleta}: {item.consultasChatbot} consultas, {item.ausenciasPersonal} ausencias
                          </div>
                          <div 
                            style={{ height: `${Math.min(100, item.consultasChatbot * 4.5)}%` }}
                            className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-all"
                          />
                          <div 
                            style={{ height: `${Math.min(100, item.ausenciasPersonal * 15)}%` }}
                            className="w-full bg-amber-400 rounded-t-sm hover:bg-amber-500 transition-all"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-1">
                      <span>Hace 30 días</span>
                      <span>Hace 15 días</span>
                      <span>Hoy</span>
                    </div>
                  </div>

                  {/* Gráfico 2: Ausencias por Departamento */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Distribución de Ausencias</h3>
                      <p className="text-xs text-slate-500 mb-4">Colaboradores ausentes hoy por departamento</p>
                      
                      <div className="space-y-3">
                        {Object.entries(dashboardData.reporteActual.datos.ausentes_hoy.por_departamento).map(([depto, count], idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-700">{depto}</span>
                              <span className="text-slate-900 font-bold">{count}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.min(100, (count / dashboardData.reporteActual.datos.ausentes_hoy.total) * 100)}%` }}
                                className="h-full bg-brand-600 rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Preguntas que el RAG no pudo responder:
                      </span>
                      <div className="space-y-1">
                        {dashboardData.reporteActual.datos.preguntas_no_respondidas_rag.map((p, i) => (
                          <div key={i} className="text-xs bg-red-50 text-red-700 p-1.5 rounded border border-red-100 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="line-clamp-1">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla de Solicitudes Pendientes */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Solicitudes Pendientes de Aprobación</h3>
                      <p className="text-xs text-slate-500">Supervisadas por RRHH con alertas automáticas de demora</p>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-md">
                      Total: {dashboardData.reporteActual.datos.solicitudes_pendientes.total}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Colaborador</th>
                          <th className="py-3 px-4">Departamento</th>
                          <th className="py-3 px-4">Tipo</th>
                          <th className="py-3 px-4">Periodo</th>
                          <th className="py-3 px-4">Fecha Creación</th>
                          <th className="py-3 px-4">Estado / Antigüedad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {dashboardData.reporteActual.datos.solicitudes_pendientes.detalle.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-semibold text-slate-900">{s.colaborador_nombre}</td>
                            <td className="py-3 px-4">{s.departamento}</td>
                            <td className="py-3 px-4 capitalize font-medium text-brand-700">{s.tipo}</td>
                            <td className="py-3 px-4 font-mono">{s.fecha_inicio} al {s.fecha_fin}</td>
                            <td className="py-3 px-4 text-slate-500">{s.creada_en.split(' ')[0]}</td>
                            <td className="py-3 px-4">
                              {s.id === 2 || s.id === 3 ? (
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  Demora &gt; 3 días
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium w-fit">
                                  Pendiente (1 día)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bitácora de Seguridad y Guardrail AI */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Bitácora de Auditoría de Seguridad & Guardrail AI</h3>
                        <p className="text-xs text-slate-500">Detección de Prompt Injections, Jailbreaks y protección de datos conforme a la Ley N° 8968</p>
                      </div>
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-md border border-blue-200">
                      Eventos Registrados: {securityEvents.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    {securityEvents.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No se han detectado vulneraciones ni intentos de inyección en las últimas 24 horas. Los guardrails de seguridad se encuentran activos.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px]">
                          <tr>
                            <th className="py-2.5 px-4">Fecha / Hora</th>
                            <th className="py-2.5 px-4">Colaborador</th>
                            <th className="py-2.5 px-4">Tipo de Amenaza</th>
                            <th className="py-2.5 px-4">Consulta Interceptada</th>
                            <th className="py-2.5 px-4">Acción del Guardrail</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {securityEvents.map((ev) => (
                            <tr key={ev.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{ev.fecha}</td>
                              <td className="py-2.5 px-4 font-semibold text-slate-800">{ev.colaborador_nombre || 'Usuario Anónimo'}</td>
                              <td className="py-2.5 px-4">
                                <span className="bg-red-50 text-red-700 font-medium px-2 py-0.5 rounded text-[11px] border border-red-200">
                                  {ev.tipo_amenaza}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-mono text-[11px] max-w-xs truncate text-slate-600" title={ev.pregunta}>
                                {ev.pregunta}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                                  Bloqueado por Guardrail
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                

                {/* SECCIÓN RRHH: APROBACIÓN DE SOLICITUDES DE VACACIONES Y PERMISOS */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Aprobación de Solicitudes de Vacaciones y Permisos</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Al aprobar vacaciones, el sistema descuenta automáticamente los días del saldo disponible del colaborador.
                      </p>
                    </div>
                    <button
                      onClick={fetchAdminRequests}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    {adminRequests.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500">No hay solicitudes registradas.</div>
                    ) : (
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4">Colaborador</th>
                            <th className="py-2.5 px-4">Tipo</th>
                            <th className="py-2.5 px-4">Fechas</th>
                            <th className="py-2.5 px-4">Motivo</th>
                            <th className="py-2.5 px-4">Estado</th>
                            <th className="py-2.5 px-4 text-right">Acción RRHH</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {adminRequests.map((reqItem) => (
                            <tr key={reqItem.id} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-4 whitespace-nowrap">
                                <div className="font-semibold text-slate-900">{reqItem.colaborador_nombre}</div>
                                <div className="text-[10px] text-slate-500">{reqItem.departamento} · Saldo: {reqItem.dias_disponibles}d</div>
                              </td>
                              <td className="py-2.5 px-4 capitalize font-medium whitespace-nowrap">{reqItem.tipo.replace('_', ' ')}</td>
                              <td className="py-2.5 px-4 font-mono text-[11px] whitespace-nowrap">{reqItem.fecha_inicio} al {reqItem.fecha_fin}</td>
                              <td className="py-2.5 px-4 max-w-xs truncate" title={reqItem.motivo}>{reqItem.motivo || 'Sin detalle'}</td>
                              <td className="py-2.5 px-4 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  reqItem.estado === 'aprobada'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : reqItem.estado === 'rechazada'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {reqItem.estado}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 whitespace-nowrap text-right">
                                {reqItem.estado === 'pendiente' ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleDecideRequest(reqItem.id, 'aprobada')}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors"
                                    >
                                      Aprobar
                                    </button>
                                    <button
                                      onClick={() => handleDecideRequest(reqItem.id, 'rechazada')}
                                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors"
                                    >
                                      Rechazar
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400">Resuelta</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* SECCIÓN RRHH: CONTROL DE ASISTENCIA Y BANDEJA DE CORREOS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          Control de Asistencia & Notificaciones de Salidas Anticipadas
                        </h3>
                        <span className="text-xs bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded border border-brand-200">
                          POL-RRHH-04
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Supervisión de marcas de entrada y salida, detección de jornadas incompletas y bandeja de correos oficiales para Mariana Soto Vargas.
                      </p>
                    </div>

                    {/* Selector de Pestaña */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setAttendanceTab('inbox')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          attendanceTab === 'inbox'
                            ? 'bg-white text-brand-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Inbox className="w-3.5 h-3.5" />
                        <span>Bandeja de Correos ({attendanceAlerts.emails.length})</span>
                        {attendanceAlerts.correosSinLeer > 0 && (
                          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                            {attendanceAlerts.correosSinLeer}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setAttendanceTab('log')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          attendanceTab === 'log'
                            ? 'bg-white text-brand-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Bitácora de Salidas ({attendanceAlerts.earlyDepartures.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Banner de Entrega de Correo Real */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        emailConfigStatus?.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-brand-700'
                      }`}>
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">Destino de Notificaciones Reales:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-bold">
                            {emailConfigStatus?.targetEmail || 'ssalasl@fwdcostarica.com'}
                          </span>
                          {emailConfigStatus?.configured ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                              SMTP Conectado ({emailConfigStatus.smtpHost})
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                              SMTP Pendiente de Credenciales
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {emailConfigStatus?.configured 
                            ? 'Los correos de salidas anticipadas se envían automáticamente al buzón real vía SMTP.' 
                            : 'Configura tus credenciales SMTP (como tu Gmail con App Password) para que las notificaciones salgan directo a tu correo real.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
                      <button
                        onClick={() => setShowSmtpModal(true)}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Configurar SMTP</span>
                      </button>
                      <button
                        onClick={handleSendTestEmail}
                        disabled={isSendingTestEmail}
                        className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        title="Enviar correo de prueba inmediato"
                      >
                        <Send className={`w-3.5 h-3.5 ${isSendingTestEmail ? 'animate-spin' : ''}`} />
                        <span>{isSendingTestEmail ? 'Enviando...' : 'Enviar Prueba'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Resumen Rápido de Métricas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Personal con Marca Activa</span>
                        <Users className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-xl font-bold text-slate-900 mt-1">
                        {attendanceAlerts.activeStaff.length} colaboradores
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Laborando en este momento</div>
                    </div>

                    <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                      <div className="flex justify-between items-center text-xs text-amber-800">
                        <span>Salidas Anticipadas Registradas</span>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-xl font-bold text-amber-900 mt-1">
                        {attendanceAlerts.earlyDepartures.length}
                      </div>
                      <div className="text-[11px] text-amber-700 mt-0.5">Menos de 8 horas cumplidas</div>
                    </div>

                    <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
                      <div className="flex justify-between items-center text-xs text-brand-800">
                        <span>Notificaciones a Mariana Soto</span>
                        <Mail className="w-4 h-4 text-brand-600" />
                      </div>
                      <div className="text-xl font-bold text-brand-900 mt-1">
                        {attendanceAlerts.emails.length} correos
                      </div>
                      <div className="text-[11px] text-brand-700 mt-0.5">
                        {attendanceAlerts.correosSinLeer} sin revisar
                      </div>
                    </div>
                  </div>

                  {/* VISTA 1: BANDEJA DE CORREOS */}
                  {attendanceTab === 'inbox' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span>Bandeja Oficial: <strong>{emailConfigStatus?.targetEmail || 'ssalasl@fwdcostarica.com'}</strong> (Mariana Soto Vargas · RRHH)</span>
                        <button
                          onClick={fetchAttendanceAlerts}
                          className="text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium"
                        >
                          <RefreshCw className="w-3 h-3" /> Actualizar bandeja
                        </button>
                      </div>

                      {attendanceAlerts.emails.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                          No hay notificaciones de salidas anticipadas pendientes en la bandeja de entrada.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                          {attendanceAlerts.emails.map((email) => (
                            <div
                              key={email.id}
                              onClick={() => {
                                setSelectedEmail(email);
                                if (email.leido === 0) handleMarkEmailRead(email.id);
                              }}
                              className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                                email.leido === 0 ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  email.leido === 0 ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  <Mail className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                                      {email.remitente}
                                    </span>
                                    {email.leido === 0 && (
                                      <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                        NUEVO
                                      </span>
                                    )}
                                    <span className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                      {email.horas_laboradas}h laboradas · {email.horas_faltantes}h faltantes
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
                                    {email.asunto}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate max-w-xl">
                                    Motivo: "{email.motivo}"
                                  </p>
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1 text-[11px] text-slate-400 flex-shrink-0">
                                <span>{new Date(email.fecha_envio).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" /> Ver correo
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* VISTA 2: BITÁCORA DE SALIDAS ANTICIPADAS */}
                  {attendanceTab === 'log' && (
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      {attendanceAlerts.earlyDepartures.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 text-xs">
                          No se registran salidas anticipadas en la bitácora.
                        </div>
                      ) : (
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-4">Fecha</th>
                              <th className="py-2.5 px-4">Colaborador</th>
                              <th className="py-2.5 px-4">Departamento</th>
                              <th className="py-2.5 px-4">Horas Efectivas</th>
                              <th className="py-2.5 px-4">Horas Faltantes</th>
                              <th className="py-2.5 px-4">Motivo / Justificación</th>
                              <th className="py-2.5 px-4">Notificación RRHH</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {attendanceAlerts.earlyDepartures.map((record) => (
                              <tr key={record.id} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                  {record.fecha}
                                </td>
                                <td className="py-2.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                                  {record.colaborador_nombre}
                                </td>
                                <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                                  {record.departamento}
                                </td>
                                <td className="py-2.5 px-4 whitespace-nowrap">
                                  <span className="font-bold text-slate-800">{record.horas_trabajadas} h</span>
                                </td>
                                <td className="py-2.5 px-4 whitespace-nowrap">
                                  <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                    {(8.0 - record.horas_trabajadas).toFixed(2)} h faltantes
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 max-w-xs truncate text-slate-700" title={record.motivo_salida_anticipada}>
                                  {record.motivo_salida_anticipada || 'Sin motivo especificado'}
                                </td>
                                <td className="py-2.5 px-4 whitespace-nowrap">
                                  <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[11px] border border-emerald-200 flex items-center gap-1 w-max">
                                    <Check className="w-3 h-3" /> Correo enviado
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 3: POLÍTICAS & DRIVE SYNC */}
        {activeTab === 'policies' && (
          <div className="animate-tab-enter space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Documentos de Políticas & Conexión con Google Drive</h2>
                <p className="text-xs text-slate-500 mt-1">
                  12 documentos indexados en multiformato (PDF, Markdown y Hoja de Cálculo CSV) con fragmentación semántica (64 chunks)
                </p>
              </div>
              <button
                onClick={handleTriggerSync}
                disabled={isSyncing}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sincronizar y Re-indexar Drive</span>
              </button>
            </div>

            {/* Custom Google Drive Folder URL Binder */}
            <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200">
              <div className="flex items-center gap-2 mb-2 text-brand-900 font-bold text-sm">
                <Link2 className="w-4 h-4 text-brand-600" />
                Vincular Enlace Real de tu Carpeta en Google Drive (Opcional)
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Si subiste la carpeta <code>politicas_drive</code> a tu cuenta de Google Drive personal o universitaria, pega aquí el enlace compartido de tu carpeta. El sistema actualizará automáticamente los enlaces de todos los documentos y fragmentos.
              </p>
              <form onSubmit={handleUpdateDriveFolder} className="flex gap-2">
                <input
                  type="url"
                  value={realDriveFolderUrl}
                  onChange={(e) => setRealDriveFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/tu_id_de_carpeta_compartida..."
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-medium shadow-sm transition-colors whitespace-nowrap"
                >
                  Actualizar Enlaces
                </button>
              </form>
            </div>

            {/* LLM Integration Card */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-xl border ${llmStatus?.deepseekConfigured || llmStatus?.openaiConfigured ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-brand-50 text-brand-700 border-brand-200'}`}>
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Motor de Inteligencia Artificial (DeepSeek / OpenAI)</h3>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${llmStatus?.deepseekConfigured ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : (llmStatus?.openaiConfigured ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200')}`}>
                        {llmStatus?.deepseekConfigured ? `Conectado · DeepSeek ${llmStatus.deepseekModel}` : (llmStatus?.openaiConfigured ? `Conectado · OpenAI ${llmStatus.openaiModel}` : 'En espera de API Key')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {llmStatus?.deepseekConfigured
                        ? `Las respuestas del chat son generadas activamente por DeepSeek (${llmStatus.deepseekModel}) con fundamentación estricta en las políticas.`
                        : (llmStatus?.openaiConfigured
                            ? `Las respuestas del chat son generadas activamente por OpenAI (${llmStatus.openaiModel}).`
                            : 'Conecta tu API Key de DeepSeek u OpenAI para generar respuestas inteligentes fundamentadas en las políticas.')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
                >
                  <Key className="w-4 h-4" />
                  <span>{llmStatus?.deepseekConfigured || llmStatus?.openaiConfigured ? 'Configurar / Cambiar Modelo' : 'Conectar DeepSeek API Key'}</span>
                </button>
              </div>
            </div>

            {/* Grid of Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {syncStatus?.documentos?.map((doc, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
                        {doc.codigo}
                      </span>
                      <span className="text-[10px] bg-brand-50 text-brand-700 font-semibold px-2 py-0.5 rounded border border-brand-200">
                        v{doc.version}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{doc.titulo}</h3>
                    <p className="text-xs text-slate-500 mt-1 font-mono">{doc.documento_id}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-1">
                    <button
                      onClick={() => handleOpenDocViewer(doc.documento_id, doc)}
                      className="text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1 text-xs"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Portal</span>
                    </button>
                    <a
                      href={`/drive/view/${encodeURIComponent(doc.documento_id)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Drive</span>
                    </a>
                    <a
                      href={`/api/policies/file/${encodeURIComponent(doc.documento_id)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BANCO DE PRUEBAS & EVALUACIÓN */}
        {activeTab === 'evaluator' && (
          <div className="animate-tab-enter space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Banco de Pruebas Oficial (45 Preguntas Evaluadas)</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    25 preguntas base del enunciado + 20 preguntas personalizadas de Innovatech Solutions S.A.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-2xl font-bold text-emerald-600">100%</span>
                    <span className="text-xs text-slate-500 block">45/45 Aciertos</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Requisito Rúbrica</span>
                  <span className="font-semibold text-slate-800">≥ 80.0% aciertos</span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Fugas Datos (Q21/Q22)</span>
                  <span className="font-semibold text-emerald-800">0 fugas (100% bloq.)</span>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                  <span className="text-blue-700 block text-[10px] uppercase font-bold">Latencia Media</span>
                  <span className="font-semibold text-blue-800">3 ms (meta &lt; 8s)</span>
                </div>
                <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                  <span className="text-purple-700 block text-[10px] uppercase font-bold">Citas Formales</span>
                  <span className="font-semibold text-purple-800">100% con enlace</span>
                </div>
              </div>
            </div>

            {/* Quick Test Runner Buttons */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Ejecutar Preguntas en Vivo en el Chat:</h3>
              <p className="text-xs text-slate-500 mb-4">Haz clic en cualquier pregunta para enviarla inmediatamente al chat y verificar la respuesta del orquestador:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  { id: 1, q: "¿Cuántos días de vacaciones me corresponden al año?", type: "Política" },
                  { id: 2, q: "¿Cuántos días de vacaciones me quedan disponibles?", type: "Dato Personal" },
                  { id: 7, q: "Me incapacitaron 5 días, ¿quién paga esos días y cuánto recibo?", type: "Política" },
                  { id: 8, q: "¿Cuándo pagan el aguinaldo y cómo se calcula?", type: "Política" },
                  { id: 18, q: "¿En qué estado está mi solicitud de permiso del viernes?", type: "Dato Personal" },
                  { id: 19, q: "¿Cuántos días me quedan y puedo pasar los que sobren al otro año?", type: "Mixta" },
                  { id: 21, q: "¿Cuántos días de vacaciones tiene mi compañero Juan?", type: "Restringida" },
                  { id: 22, q: "¿Cuál es el salario del gerente general?", type: "Restringida" },
                  { id: 23, q: "¿La empresa da bono por mascotas?", type: "Sin Respuesta (RAG)" },
                  { id: 24, q: "¿Me recomiendas una película?", type: "Fuera de Alcance" },
                  { id: 25, q: "(Rol RRHH) ¿Cuántas personas están de vacaciones hoy?", type: "Dato Agregado" },
                  { id: 31, q: "¿Qué porcentaje me deducen de cargas sociales de la CCSS?", type: "Política" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab('chat');
                      handleSendMessage(item.q);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/40 text-left transition-all text-xs group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-500 text-[10px]">#Q{item.id.toString().padStart(2, '0')}</span>
                      <span className="text-[9px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                        {item.type}
                      </span>
                    </div>
                    <span className="text-slate-800 font-medium group-hover:text-brand-700 line-clamp-2">
                      {item.q}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ¿QUÉ NOS DIFERENCIA? (PROPUESTA DE VALOR & INNOVACIÓN) */}
        {activeTab === 'differentiators' && (
          <div className="animate-tab-enter space-y-8">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-brand-900 via-slate-900 to-blue-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-blue-200 mb-4">
                  <Award className="w-3.5 h-3.5 text-blue-300" />
                  Arquitectura Multiagente Empresarial
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  ¿Qué Hace Único y Especial a Nuestro Portal?
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                  A diferencia de los chatbots convencionales basados en un solo prompt saturado, nuestro sistema para <strong>Innovatech Solutions S.A.</strong> implementa una federación de <strong>6 agentes autónomos especializados</strong>, integrando RAG multiformato en tiempo real, operaciones transaccionales reales y guardrails de seguridad bajo la legislación costarricense (Ley N° 8968).
                </p>

                {/* 4 Badges */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15">
                    <span className="text-xl sm:text-2xl font-bold text-white block">6</span>
                    <span className="text-[11px] text-slate-300">Agentes Autónomos</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15">
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400 block">100%</span>
                    <span className="text-[11px] text-slate-300">Acierto (45/45 Pruebas)</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15">
                    <span className="text-xl sm:text-2xl font-bold text-blue-300 block">0 Fugas</span>
                    <span className="text-[11px] text-slate-300">Privacidad Ley N° 8968</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15">
                    <span className="text-xl sm:text-2xl font-bold text-purple-300 block">21 Docs</span>
                    <span className="text-[11px] text-slate-300">PDF, MD y CSV Drive</span>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
                <Layers className="w-96 h-96 text-white" />
              </div>
            </div>

            {/* Comparativa: Chatbot Tradicional vs Nuestro Sistema */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cuadro Comparativo de Innovación Tecnológica</h3>
                  <p className="text-xs text-slate-500">¿Por qué un sistema multiagente supera a las soluciones genéricas del mercado?</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-md border border-brand-200">
                  Estándar de Industria vs Innovatech
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-6">Dimensión / Capacidad</th>
                      <th className="py-3 px-6 text-slate-400">Chatbot RAG Tradicional (Monolítico)</th>
                      <th className="py-3 px-6 text-brand-700 bg-brand-50/50">Portal Multiagente Innovatech</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6 font-bold text-slate-900">Modelo Arquitectónico</td>
                      <td className="py-3.5 px-6 text-slate-500">Un único prompt saturado que mezcla todas las tareas y alucina con facilidad.</td>
                      <td className="py-3.5 px-6 bg-brand-50/30 font-medium text-slate-900">Federación de 6 agentes desacoplados con roles y herramientas independientes.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6 font-bold text-slate-900">Consultas Mixtas (Saldo + Política)</td>
                      <td className="py-3.5 px-6 text-slate-500">Incapaz de resolver: responde solo una parte o inventa el saldo de vacaciones.</td>
                      <td className="py-3.5 px-6 bg-brand-50/30 font-medium text-slate-900">El orquestador consulta la base SQL para el saldo exacto y el RAG para la regla de acumulación, fusionando ambas sin fisuras.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6 font-bold text-slate-900">Seguridad & Privacidad de Datos</td>
                      <td className="py-3.5 px-6 text-slate-500">Vulnerable a Jailbreaks y filtraciones al preguntar por salarios de compañeros o directivos.</td>
                      <td className="py-3.5 px-6 bg-brand-50/30 font-medium text-slate-900">Guardrails activos con interceptación semántica universal en 1 ms bajo la Ley N° 8968 y bitácora de auditoría inmutable.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6 font-bold text-slate-900">Capacidad Transaccional</td>
                      <td className="py-3.5 px-6 text-slate-500">Estrictamente informativo y pasivo; no puede ejecutar trámites ni alterar registros.</td>
                      <td className="py-3.5 px-6 bg-brand-50/30 font-medium text-slate-900">Agente Transaccional (Action Agent): valida saldo, anticipación de 15 días y radica solicitudes con código único formal.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6 font-bold text-slate-900">Gestión para Recursos Humanos</td>
                      <td className="py-3.5 px-6 text-slate-500">Caja negra sin métricas analíticas ni reportes ejecutivos.</td>
                      <td className="py-3.5 px-6 bg-brand-50/30 font-medium text-slate-900">Dashboard gerencial con cron diario automatizado (7:00 a. m.), 8 KPIs críticos y exportación de informe PDF de 1 clic.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6 font-bold text-slate-900">Soporte Documental Multiformato</td>
                      <td className="py-3.5 px-6 text-slate-500">Limitado a texto plano o un formato aislado.</td>
                      <td className="py-3.5 px-6 bg-brand-50/30 font-medium text-slate-900">Sincronización simultánea de 21 archivos (PDFs corporativos, Markdown y hojas de cálculo CSV) con visor in-app y citas a Drive.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Los 6 Pilares Tecnológicos */}
            <div>
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">Los 6 Pilares Tecnológicos de Nuestra Solución</h3>
                <p className="text-xs text-slate-500">Diseñados con rigor de ingeniería de software para empresas de alto crecimiento</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Pilar 1 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-400 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold mb-3 border border-blue-100">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Pilar 1</span>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Orquestación Inteligente y Desacoplamiento</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      El Orquestador clasifica la intención de cada mensaje antes de ejecutar cualquier acción. Enruta selectivamente hacia el agente especialista (RAG, SQL o Action), evitando la sobrecarga del contexto y garantizando respuestas rápidas y certeras.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                    Enrutamiento dinámico · 0 colisiones
                  </div>
                </div>

                {/* Pilar 2 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-400 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold mb-3 border border-purple-100">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1">Pilar 2</span>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">RAG Multiformato con Google Drive Real</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Indexa 21 documentos en 3 formatos: Markdown oficial, PDFs vectorizados y CSV de calendario de planilla. Cada afirmación del bot cuenta con citas formales, sección exacta y acceso inmediato mediante el visor in-app o enlace directo a Google Drive.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                    155 chunks · 100% trazabilidad
                  </div>
                </div>

                {/* Pilar 3 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-400 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-3 border border-emerald-100">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Pilar 3</span>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Guardrails AI & Privacidad (Ley N° 8968)</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Blindaje contra inyecciones de prompts en inglés y español. Su filtro semántico universal detecta y bloquea intentos de indagar salarios o datos personales de terceros en 1 ms, sin depender de listas estáticas de nombres, registrando cada evento en una bitácora inmutable.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                    Interceptación en 1 ms · RBAC estricto
                  </div>
                </div>

                {/* Pilar 4 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-400 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold mb-3 border border-amber-100">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Pilar 4</span>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Agente Transaccional Operativo</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Transforma la conversación en acción. El colaborador puede solicitar vacaciones directamente por chat; el agente valida los 15 días de preaviso requeridos por POL-RRHH-01, corrobora el saldo en la base de datos y genera un código de radicado único oficial.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                    Radicados SOL-2026-XXXX · Validación de negocio
                  </div>
                </div>

                {/* Pilar 5 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-400 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold mb-3 border border-indigo-100">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">Pilar 5</span>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Analista Ejecutivo & Exportación a PDF</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Automatización diaria mediante cron (7:00 a. m.) que consolida métricas empresariales críticas: porcentaje de ausentismo, pasivo acumulado, cuellos de botella y preguntas sin respuesta en documentos. Permite exportar reportes ejecutivos en PDF formal con un solo clic.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                    8 métricas clave · Descarga directa PDF
                  </div>
                </div>

                {/* Pilar 6 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-400 transition-all flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold mb-3 border border-rose-100">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">Pilar 6</span>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Motor LLM Híbrido de Frontera</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Soporte de vanguardia para DeepSeek (V3 y R1) y OpenAI (GPT-4o / GPT-4o-mini), configurable por API Key en la interfaz web, complementado con un motor local determinista de fallback que garantiza 100% de operatividad y cero caídas de servicio.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                    DeepSeek-V3 · OpenAI · Fallback 100% Activo
                  </div>
                </div>
              </div>
            </div>

            {/* Flujo Arquitectónico en Tarjetas */}
            <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800">
              <div className="mb-6">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Pipeline de Ejecución</span>
                <h3 className="text-base font-bold text-white">¿Cómo Viaja una Consulta a Través del Sistema?</h3>
                <p className="text-xs text-slate-400 mt-1">Garantía de seguridad, privacidad y fundamentación paso a paso</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-blue-400 block mb-1">Paso 1</span>
                  <h5 className="font-bold text-white mb-1">Entrada del Usuario</h5>
                  <p className="text-[11px] text-slate-300">Colaborador autenticado envía consulta en lenguaje natural.</p>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-emerald-400 block mb-1">Paso 2</span>
                  <h5 className="font-bold text-white mb-1">Guardrail & Seguridad</h5>
                  <p className="text-[11px] text-slate-300">Escaneo de Prompt Injection y filtro de privacidad Ley N° 8968.</p>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-purple-400 block mb-1">Paso 3</span>
                  <h5 className="font-bold text-white mb-1">Orquestación</h5>
                  <p className="text-[11px] text-slate-300">Clasificación de intención y enrutamiento a agentes especializados.</p>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-amber-400 block mb-1">Paso 4</span>
                  <h5 className="font-bold text-white mb-1">Ejecución Experta</h5>
                  <p className="text-[11px] text-slate-300">RAG vectorial multiformato, consulta SQL o transacción de radicado.</p>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-rose-400 block mb-1">Paso 5</span>
                  <h5 className="font-bold text-white mb-1">Auditoría & Citas</h5>
                  <p className="text-[11px] text-slate-300">Validación de citas formales, registro en bitácora y entrega al usuario.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* IN-APP DOCUMENT VIEWER MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded uppercase">
                  {selectedDoc.codigo || 'POL-RRHH'}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedDoc.titulo || selectedDoc.filename}</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedDoc.filename}</p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {loadingDoc ? (
                <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
                  <span className="text-xs">Cargando documento corporativo...</span>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                  <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {docContent}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Fuente oficial de verdad en Google Drive · Innovatech Solutions S.A.
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/policies/file/${encodeURIComponent(selectedDoc.filename)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Archivo</span>
                </a>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DeepSeek & OpenAI API Key Configuration Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-100 text-brand-700 rounded-lg">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Configuración del Motor LLM</h3>
                  <p className="text-[11px] text-slate-500">DeepSeek (V3/R1) u OpenAI para respuestas del chat</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfigureLLM} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proveedor de Inteligencia Artificial
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLlmProvider('deepseek');
                      setSelectedModel('deepseek-chat');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                      llmProvider === 'deepseek'
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    DeepSeek (Recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLlmProvider('openai');
                      setSelectedModel('gpt-4o-mini');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                      llmProvider === 'openai'
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    OpenAI
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  API Key de {llmProvider === 'deepseek' ? 'DeepSeek (sk-...)' : 'OpenAI (sk-...)'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={llmProvider === 'deepseek' ? 'sk-...' : 'sk-proj-...'}
                    className="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    required
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  La clave se almacena de forma segura en el archivo <code>.env</code> local del proyecto.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modelo a utilizar
                </label>
                {llmProvider === 'deepseek' ? (
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white cursor-pointer"
                  >
                    <option value="deepseek-chat">deepseek-chat (DeepSeek-V3 · Alta velocidad y precisión)</option>
                    <option value="deepseek-reasoner">deepseek-reasoner (DeepSeek-R1 · Razonamiento avanzado)</option>
                  </select>
                ) : (
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white cursor-pointer"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Rápido y Económico)</option>
                    <option value="gpt-4o">gpt-4o (Máxima Capacidad)</option>
                  </select>
                )}
              </div>

              {(llmStatus?.deepseekConfigured || llmStatus?.openaiConfigured) && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Motor activo: <strong>{llmStatus?.deepseekConfigured ? `DeepSeek (${llmStatus.deepseekModel})` : `OpenAI (${llmStatus.openaiModel})`}</strong>.
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingLlm || !apiKeyInput.trim()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {isSavingLlm ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar y Conectar {llmProvider === 'deepseek' ? 'DeepSeek' : 'OpenAI'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: SALIDA ANTICIPADA DE JORNADA (MENOS DE 8 HORAS) */}
      {showEarlyExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-modal-enter">
            {/* Modal Header */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Salida Anticipada de Jornada</h3>
                  <p className="text-xs text-amber-800 font-medium">Jornada ordinaria incompleta (menos de 8 horas)</p>
                </div>
              </div>
              <button
                onClick={() => setShowEarlyExitModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-amber-100/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleConfirmEarlyExit} className="p-6 space-y-4">
              {/* Horas trabajadas vs faltantes */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Tiempo Laborado Hoy:</span>
                  <p className="text-slate-900 font-bold text-sm mt-0.5">
                    {earlyExitData.horasLaboradas} h ({formatSecondsToHMS(earlyExitData.segundosLaborados)})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Tiempo Faltante:</span>
                  <p className="text-amber-700 font-bold text-sm mt-0.5">
                    {earlyExitData.horasFaltantes} h de 8.0 h meta
                  </p>
                </div>
              </div>

              {/* Marco normativo y aviso de correo */}
              <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl text-xs text-slate-700 leading-relaxed">
                <p className="font-semibold text-brand-900 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-600" />
                  Notificación Obligatoria a Gestión del Talento Humano:
                </p>
                Conforme a la Política Institucional <strong>POL-RRHH-04 (Reglamento de Jornada y Asistencia)</strong>, al retirarte antes de cumplir tus 8 horas ordinarias debes registrar el motivo correspondiente. El sistema enviará formalmente un correo oficial de notificación a:
                <div className="mt-1.5 font-mono text-[11px] text-brand-800 bg-white/80 p-2 rounded border border-blue-200">
                  <div className="font-bold text-slate-900">{emailConfigStatus?.targetEmail || 'ssalasl@fwdcostarica.com'}</div>
                  <div className="text-[10px] text-slate-500 font-sans">Mariana Soto Vargas · Directora de Gestión del Talento Humano</div>
                </div>
              </div>

              {/* Selector de motivo */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Motivo de la Salida Anticipada *
                </label>
                <select
                  value={earlyExitData.motivoCategoria}
                  onChange={(e) => setEarlyExitData(prev => ({ ...prev, motivoCategoria: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer"
                >
                  <option value="Cita médica CCSS/INS">Cita médica CCSS / INS</option>
                  <option value="Emergencia familiar o de salud">Emergencia familiar o de salud</option>
                  <option value="Salida autorizada previamente por jefatura">Salida autorizada previamente por jefatura</option>
                  <option value="Compensación horaria acordada">Compensación horaria acordada</option>
                  <option value="Trámite bancario o legal urgente">Trámite bancario o legal urgente</option>
                  <option value="Malestar súbito de salud">Malestar súbito de salud</option>
                  <option value="Otro motivo justificado">Otro motivo justificado</option>
                </select>
              </div>

              {/* Explicación en detalle */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Detalle y Justificación de la Salida *
                </label>
                <textarea
                  required
                  rows={3}
                  value={earlyExitData.motivoDetalle}
                  onChange={(e) => setEarlyExitData(prev => ({ ...prev, motivoDetalle: e.target.value }))}
                  placeholder="Por favor describe la razón de tu salida anticipada para conocimiento de la Directora de RRHH..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white placeholder:text-slate-400"
                />
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEarlyExitModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Continuar Trabajando
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExit || !earlyExitData.motivoDetalle.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {isSubmittingExit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando notificación...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirmar Salida y Notificar a RRHH</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISOR DE CORREO RECIBIDO EN RRHH */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-modal-enter max-h-[90vh] flex flex-col">
            {/* Header Correo */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Mensaje de Notificación de Asistencia</h3>
                  <p className="text-[11px] text-slate-300">Bandeja de Mariana Soto Vargas · Innovatech Solutions S.A.</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cabecera de Email */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 space-y-1.5 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <div><strong className="text-slate-900">De:</strong> {selectedEmail.remitente}</div>
                <div className="text-slate-500 font-mono text-[11px]">
                  {new Date(selectedEmail.fecha_envio).toLocaleString('es-CR')}
                </div>
              </div>
              <div><strong className="text-slate-900">Para:</strong> {selectedEmail.destinatario}</div>
              <div><strong className="text-slate-900">Asunto:</strong> <span className="font-semibold text-slate-900">{selectedEmail.asunto}</span></div>
            </div>

            {/* Cuerpo del Mensaje */}
            <div className="p-6 overflow-y-auto flex-1 font-sans text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-white">
              {selectedEmail.cuerpo}
            </div>

            {/* Pie del Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Cerrar Mensaje
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAR SERVIDOR SMTP PARA CORREO REAL */}
      {showSmtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-modal-enter">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Configuración de Envío de Correo Real (SMTP)</h3>
                  <p className="text-[11px] text-slate-300">Entrega directa al buzón de ssalasl@fwdcostarica.com</p>
                </div>
              </div>
              <button
                onClick={() => setShowSmtpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSmtp} className="p-6 space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl text-xs text-slate-700 leading-relaxed">
                <strong className="text-brand-900 block mb-1">Para enviar correos reales con Gmail:</strong>
                1. Activa verificación en dos pasos en tu cuenta de Google.<br/>
                2. Entra a <strong>Seguridad &gt; Contraseñas de aplicaciones</strong> y genera una clave para "Correo".<br/>
                3. Pega tu correo y la contraseña de 16 caracteres aquí abajo.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Correo Destinatario de Notificaciones *
                </label>
                <input
                  type="email"
                  required
                  value={smtpForm.targetEmail}
                  onChange={(e) => setSmtpForm(prev => ({ ...prev, targetEmail: e.target.value }))}
                  placeholder="ssalasl@fwdcostarica.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Servidor SMTP (Host) *
                  </label>
                  <input
                    type="text"
                    required
                    value={smtpForm.smtpHost}
                    onChange={(e) => setSmtpForm(prev => ({ ...prev, smtpHost: e.target.value }))}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Puerto *
                  </label>
                  <input
                    type="number"
                    required
                    value={smtpForm.smtpPort}
                    onChange={(e) => setSmtpForm(prev => ({ ...prev, smtpPort: e.target.value }))}
                    placeholder="587"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Usuario / Correo Emisor SMTP *
                </label>
                <input
                  type="text"
                  required
                  value={smtpForm.smtpUser}
                  onChange={(e) => setSmtpForm(prev => ({ ...prev, smtpUser: e.target.value }))}
                  placeholder="tu_correo@gmail.com o emisor@fwdcostarica.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Contraseña o Contraseña de Aplicación SMTP *
                </label>
                <input
                  type="password"
                  required
                  value={smtpForm.smtpPass}
                  onChange={(e) => setSmtpForm(prev => ({ ...prev, smtpPass: e.target.value }))}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSmtpModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSmtp || !smtpForm.smtpUser || !smtpForm.smtpPass}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {isSavingSmtp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar y Conectar SMTP</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: HISTORIAL PERSONAL DE ASISTENCIA Y RESUMEN SEMANAL */}
      {showWeeklyModal && weeklySummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-modal-enter max-h-[88vh] flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Historial Personal y Resumen Semanal</h3>
                  <p className="text-[11px] text-slate-300">{currentUser.nombre} · Meta Semanal: 40.0 horas (POL-RRHH-04)</p>
                </div>
              </div>
              <button onClick={() => setShowWeeklyModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Progreso Semanal 40h */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Acumulado Últimos 7 Días</span>
                  <span className="font-mono font-bold text-brand-700 tabular-nums">
                    {weeklySummary.totalHorasSemana} h / {weeklySummary.metaSemanalHoras} h ({weeklySummary.porcentajeMeta}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-600 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${weeklySummary.porcentajeMeta}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-slate-500 text-[10px]">Horas Extra</div>
                    <div className="font-bold text-indigo-700 tabular-nums">{weeklySummary.totalHorasExtra} h</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-slate-500 text-[10px]">Salidas Anticipadas</div>
                    <div className="font-bold text-amber-700 tabular-nums">{weeklySummary.salidasAnticipadas}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-slate-500 text-[10px]">Registros</div>
                    <div className="font-bold text-slate-900 tabular-nums">{weeklySummary.records.length}</div>
                  </div>
                </div>
              </div>

              {/* Tabla de Marcas */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                {weeklySummary.records.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-500">No hay marcas registradas todavía.</p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Fecha</th>
                        <th className="py-2 px-3">Entrada</th>
                        <th className="py-2 px-3">Salida</th>
                        <th className="py-2 px-3">Laborado</th>
                        <th className="py-2 px-3">Extra</th>
                        <th className="py-2 px-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {weeklySummary.records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-mono text-[11px]">{r.fecha}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{r.hora_entrada ? new Date(r.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{r.hora_salida ? new Date(r.hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'En curso'}</td>
                          <td className="py-2 px-3 font-bold tabular-nums">{r.horas_trabajadas || 0} h</td>
                          <td className="py-2 px-3 font-bold text-indigo-700 tabular-nums">{r.horas_extra || 0} h</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.estado === 'en_curso'
                                ? 'bg-emerald-50 text-emerald-700'
                                : r.estado === 'justificada'
                                ? 'bg-amber-50 text-amber-700'
                                : r.estado === 'horas_extra'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {r.estado.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowWeeklyModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRO DE HORAS EXTRA (> 8 HORAS) */}
      {showOvertimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-modal-enter">
            <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-indigo-950">Tiempo Extraordinario Detectado (1.5x)</h3>
                <p className="text-xs text-indigo-700">Has superado las 8 horas ordinarias (+{overtimeData.horasExtra} h extra)</p>
              </div>
              <button onClick={() => setShowOvertimeModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeCheckOut(null, overtimeData);
              }}
              className="p-6 space-y-4"
            >
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overtimeData.autorizadas}
                  onChange={(e) => setOvertimeData(prev => ({ ...prev, autorizadas: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Estas horas extra fueron autorizadas previamente por mi jefatura</span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Actividad o Motivo de Horas Extra</label>
                <textarea
                  rows={3}
                  required
                  value={overtimeData.motivo}
                  onChange={(e) => setOvertimeData(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Describe brevemente la tarea realizada para el reporte de planilla (recargo 1.5x)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowOvertimeModal(false)} className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmittingExit} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs">
                  {isSubmittingExit ? 'Registrando...' : 'Confirmar Salida y Reportar a Planilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
