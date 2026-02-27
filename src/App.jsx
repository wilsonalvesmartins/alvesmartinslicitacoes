import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, PlusCircle, Gavel, ThumbsDown, Trophy, 
  DollarSign, FileText, LogOut, Menu, X, Calendar, 
  Upload, Save, Download, Trash2, Loader2, Edit, CheckCircle, 
  Sparkles, AlertTriangle, TrendingUp, DollarSignIcon, Shield, Copy
} from 'lucide-react';

// --- SISTEMA DE NOTIFICAÇÕES ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  };

  return (
    <div className={`fixed bottom-4 right-4 ${bgColors[type]} text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 z-50 animate-fade-in-up`}>
      {type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:text-gray-200"><X size={16} /></button>
    </div>
  );
};

// --- COMPONENTES UI REUTILIZÁVEIS ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", type = "button", disabled, title }) => {
  const baseStyle = "px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-700 text-white hover:bg-blue-800",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-100 text-red-700 hover:bg-red-200",
    success: "bg-green-100 text-green-700 hover:bg-green-200",
    outline: "border border-blue-700 text-blue-700 hover:bg-blue-50",
    ai: "bg-purple-600 text-white hover:bg-purple-700",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-red-600 px-2"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`} title={title}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" {...props} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" {...props}>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

// --- INTEGRAÇÃO GEMINI IA ---
const apiKey = ""; 

// Extração de PDF/Imagem
const extractWithGemini = async (base64Data, mimeType) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const prompt = `Analise este documento de licitação/edital. Extraia as informações e retorne ESTRITAMENTE em formato JSON, sem marcações markdown.
  Estrutura esperada:
  {
    "orgao": "Nome do Órgão",
    "cidade": "Cidade",
    "plataforma": "Plataforma (ex: Comprasnet, BLL)",
    "numeroPregao": "Número do Pregão",
    "processo": "Número do Processo",
    "data": "Data no formato YYYY-MM-DD",
    "horario": "Horário no formato HH:MM",
    "modalidade": "Pregão Eletrônico, Pregão Presencial, Dispensa Eletrônica, Chamamento Público ou Concorrência",
    "items": [
      { "description": "Descrição do Item", "referencePrice": valor_numerico_float }
    ]
  }`;

  const payload = {
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Data.split(',')[1] } }
      ]
    }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) return JSON.parse(textResponse);
      throw new Error("Resposta da IA vazia");
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise(res => setTimeout(res, delays[attempt]));
    }
  }
};

// Geração Genérica de Texto via LLM
const generateTextWithGemini = async (prompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) return textResponse;
      throw new Error("Resposta da IA vazia");
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise(res => setTimeout(res, delays[attempt]));
    }
  }
};

// --- FUNÇÕES AUXILIARES DE DADOS ---
const parseItems = (itemsData) => {
  if (!itemsData) return [];
  if (typeof itemsData === 'string') {
    try { return JSON.parse(itemsData); } 
    catch (e) { return [{ id: Date.now(), description: itemsData, referencePrice: 0, costPrice: 0, isWon: false, wonPrice: 0 }]; }
  }
  return itemsData;
};

// --- TELAS DO SISTEMA ---

const LoginScreen = ({ onLogin, notify }) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (user === "administrador" && pass === "odair123") onLogin();
    else notify("Credenciais inválidas", "error");
  };

  return (
    <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full inline-block mb-4">
            <Gavel size={40} className="text-blue-800" />
          </div>
          <h1 className="text-3xl font-bold text-blue-800">Alves Martins</h1>
          <p className="text-gray-500 mt-2">Gestão de Licitações</p>
        </div>
        <form onSubmit={handleLogin}>
          <Input label="Usuário" value={user} onChange={e => setUser(e.target.value)} placeholder="administrador"/>
          <Input label="Senha" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"/>
          <Button type="submit" className="w-full justify-center py-3 text-lg">Entrar no Painel</Button>
        </form>
      </Card>
    </div>
  );
};

const Dashboard = ({ bids }) => {
  const stats = {
    total: bids.length,
    pending: bids.filter(b => b.status === 'pending').length,
    won: bids.filter(b => ['won', 'partial', 'delivered', 'paid'].includes(b.status)).length,
    lost: bids.filter(b => b.status === 'lost').length,
    receivable: bids.filter(b => ['won', 'partial', 'delivered'].includes(b.status)).reduce((acc, curr) => acc + (parseFloat(curr.value || 0)), 0)
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard de Licitações</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-blue-500"><p className="text-gray-500 text-sm">Total de Pregões</p><p className="text-3xl font-bold text-blue-800">{stats.total}</p></Card>
        <Card className="border-l-4 border-green-500"><p className="text-gray-500 text-sm">Processos Vencidos</p><p className="text-3xl font-bold text-green-700">{stats.won}</p></Card>
        <Card className="border-l-4 border-red-500"><p className="text-gray-500 text-sm">Processos Perdidos</p><p className="text-3xl font-bold text-red-700">{stats.lost}</p></Card>
        <Card className="border-l-4 border-yellow-500"><p className="text-gray-500 text-sm">A Receber (R$)</p><p className="text-3xl font-bold text-yellow-700">{stats.receivable.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <h3 className="font-bold text-lg mb-4 text-blue-900">Próximos Pregões</h3>
          {bids.filter(b => b.status === 'pending').slice(0, 5).map(bid => (
            <div key={bid.id} className="flex justify-between items-center py-3 border-b last:border-0">
              <div>
                <p className="font-medium text-gray-800">{bid.orgao}</p>
                <p className="text-sm text-gray-500">{new Date(bid.data).toLocaleDateString()} - {bid.horario}</p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{bid.modalidade}</span>
            </div>
          ))}
          {bids.filter(b => b.status === 'pending').length === 0 && <p className="text-gray-500">Nenhum pregão agendado no momento.</p>}
        </Card>
      </div>
    </div>
  );
};

const InsertBid = ({ onAdd, notify }) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [items, setItems] = useState([]);
  
  const [formData, setFormData] = useState({ 
    orgao: '', cidade: '', plataforma: '', numeroPregao: '', processo: '', data: '', horario: '', modalidade: 'Pregão Eletrônico' 
  });

  const handleAIUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAiLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64data = reader.result;
        notify("Analisando edital com IA... Aguarde.", "info");
        const extractedData = await extractWithGemini(base64data, file.type);
        
        setFormData(prev => ({
          ...prev,
          orgao: extractedData.orgao || prev.orgao,
          cidade: extractedData.cidade || prev.cidade,
          plataforma: extractedData.plataforma || prev.plataforma,
          numeroPregao: extractedData.numeroPregao || prev.numeroPregao,
          processo: extractedData.processo || prev.processo,
          data: extractedData.data || prev.data,
          horario: extractedData.horario || prev.horario,
          modalidade: extractedData.modalidade || prev.modalidade
        }));

        if (extractedData.items && Array.isArray(extractedData.items)) {
          const formattedItems = extractedData.items.map((it, idx) => ({
            id: Date.now() + idx,
            description: it.description || '',
            referencePrice: parseFloat(it.referencePrice) || 0,
            costPrice: 0,
            isWon: false,
            wonPrice: 0
          }));
          setItems(formattedItems);
        }

        notify("Dados extraídos com sucesso!", "success");
      } catch (error) {
        console.error(error);
        notify("Erro ao processar documento com IA. Tente preencher manualmente.", "error");
      } finally {
        setAiLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: '', referencePrice: 0, costPrice: 0, isWon: false, wonPrice: 0 }]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const removeItem = (id) => {
    setItems(items.filter(it => it.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const totalValue = items.reduce((acc, curr) => acc + (parseFloat(curr.referencePrice) || 0), 0);

      await onAdd({
        ...formData,
        id: Date.now().toString(),
        status: 'pending',
        value: totalValue,
        items: JSON.stringify(items),
        deadlines: { docs: '', sign: '', delivery: '' },
        paymentDeadline: '',
        isPaid: false
      });

      setFormData({ orgao: '', cidade: '', plataforma: '', numeroPregao: '', processo: '', data: '', horario: '', modalidade: 'Pregão Eletrônico' });
      setItems([]);
      notify("Pregão cadastrado com sucesso!", "success");
    } catch (error) {
      notify("Erro ao salvar: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="bg-gradient-to-r from-blue-900 to-blue-800 text-white border-0">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="text-yellow-400"/> Assistente IA de Edital</h2>
            <p className="text-blue-200 text-sm mt-1">Faça upload do edital (PDF/Imagem) para preencher os dados e itens automaticamente.</p>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleAIUpload} className="hidden" accept="application/pdf,image/*" />
          <Button variant="ai" onClick={() => fileInputRef.current.click()} disabled={aiLoading} className="whitespace-nowrap shadow-lg">
            {aiLoading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />} 
            {aiLoading ? 'Analisando Edital...' : 'Carregar Edital'}
          </Button>
        </div>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4 border-b pb-2">Dados Principais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Órgão" required value={formData.orgao} onChange={e => setFormData({...formData, orgao: e.target.value})} />
            <Input label="Cidade" required value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} />
            <Input label="Plataforma" required value={formData.plataforma} onChange={e => setFormData({...formData, plataforma: e.target.value})} />
            <Input label="Nº do Pregão" required value={formData.numeroPregao} onChange={e => setFormData({...formData, numeroPregao: e.target.value})} />
            <Input label="Processo" required value={formData.processo} onChange={e => setFormData({...formData, processo: e.target.value})} />
            <Select label="Modalidade" options={['Pregão Eletrônico', 'Pregão Presencial', 'Dispensa Eletrônica', 'Chamamento Público', 'Concorrência']} value={formData.modalidade} onChange={e => setFormData({...formData, modalidade: e.target.value})} />
            <Input label="Data" type="date" required value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
            <Input label="Horário" type="time" required value={formData.horario} onChange={e => setFormData({...formData, horario: e.target.value})} />
          </div>
        </Card>

        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-lg font-bold text-blue-900">Itens da Licitação</h3>
            <Button variant="outline" onClick={addItem} className="text-sm py-1"><PlusCircle size={16}/> Adicionar Item</Button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="flex flex-col md:flex-row gap-3 items-start bg-gray-50 p-3 rounded border">
                <div className="w-full md:w-2/3">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição do Item {index + 1}</label>
                  <input type="text" className="w-full p-2 border rounded" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} required />
                </div>
                <div className="w-full md:w-1/3 flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Referência (R$)</label>
                    <input type="number" step="0.01" className="w-full p-2 border rounded font-mono" value={item.referencePrice} onChange={e => updateItem(item.id, 'referencePrice', e.target.value)} required />
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} className="p-2 mb-1 text-red-500 hover:bg-red-100 rounded" title="Remover item"><Trash2 size={20}/></button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-center text-gray-400 py-6 border-2 border-dashed rounded">Nenhum item cadastrado. Adicione manualmente ou use a IA.</p>}
          </div>
        </Card>

        <Button type="submit" disabled={loading} className="w-full justify-center py-4 text-lg shadow-md">
          {loading ? <Loader2 className="animate-spin"/> : <Save />} Salvar Processo Licitatório
        </Button>
      </form>
    </div>
  );
};

// Componente para Edição com Calculadora de Custo (Margem 37%)
const EditBidForm = ({ bid, onSave, onCancel, onDelete, notify }) => {
  const [localBid, setLocalBid] = useState(bid);
  const [items, setItems] = useState(parseItems(bid.items));

  const updateItem = (id, field, value) => {
    setItems(items.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const handleSave = () => {
    // Valor final da licitação é baseado nos itens que foram vencidos (isWon = true)
    const finalValue = items.filter(it => it.isWon).reduce((acc, it) => {
      return acc + (parseFloat(it.wonPrice) || 0);
    }, 0);

    onSave({
      ...localBid,
      value: finalValue,
      items: JSON.stringify(items)
    });
  };

  return (
    <Card className="border-2 border-blue-300 shadow-xl bg-white">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h4 className="font-bold text-xl text-blue-900 flex items-center gap-2"><Edit size={24}/> Editar Processo e Itens</h4>
        <button onClick={onCancel} className="text-gray-500 hover:text-red-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Input label="Órgão" value={localBid.orgao} onChange={e => setLocalBid({...localBid, orgao: e.target.value})} />
        <Input label="Cidade" value={localBid.cidade} onChange={e => setLocalBid({...localBid, cidade: e.target.value})} />
        <Input label="Pregão" value={localBid.numeroPregao} onChange={e => setLocalBid({...localBid, numeroPregao: e.target.value})} />
        <Input label="Processo" value={localBid.processo} onChange={e => setLocalBid({...localBid, processo: e.target.value})} />
        <Input label="Plataforma" value={localBid.plataforma} onChange={e => setLocalBid({...localBid, plataforma: e.target.value})} />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Data" type="date" value={localBid.data} onChange={e => setLocalBid({...localBid, data: e.target.value})} />
          <Input label="Horário" type="time" value={localBid.horario} onChange={e => setLocalBid({...localBid, horario: e.target.value})} />
        </div>
      </div>

      <div className="mb-6">
        <h5 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp size={18}/> Itens, Custos e Valores Vencidos</h5>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th className="px-3 py-3 text-center rounded-tl">Ganhamos?</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Referência</th>
                <th className="px-4 py-3 bg-blue-50">Custo (Seu Preço)</th>
                <th className="px-4 py-3 bg-green-50">Valor Vencido (Ofertado)</th>
                <th className="px-4 py-3 rounded-tr">Status / Margem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const refPrice = parseFloat(item.referencePrice) || 0;
                const costPrice = parseFloat(item.costPrice) || 0;
                const wonPrice = parseFloat(item.wonPrice) || 0;
                const expectedPrice = costPrice * 1.37;
                
                // Se venceu por menos que a referência e compensa o custo
                const isViable = wonPrice > 0 && wonPrice >= expectedPrice && wonPrice <= refPrice;
                // Se venceu, mas a margem está abaixo dos 37% calculados
                const marginWarning = item.isWon && wonPrice > 0 && wonPrice < expectedPrice;

                return (
                  <tr key={item.id || idx} className={`border-b ${item.isWon ? 'bg-green-50/30' : ''}`}>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={item.isWon} onChange={e => updateItem(item.id, 'isWon', e.target.checked)} className="w-5 h-5 text-green-600 rounded focus:ring-green-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900 truncate max-w-[200px]" title={item.description}>{item.description}</td>
                    <td className="px-4 py-2 font-mono text-gray-500">{refPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-4 py-2 bg-blue-50">
                      <input type="number" step="0.01" className="w-24 p-1 border rounded bg-white text-right" value={item.costPrice || ''} onChange={e => updateItem(item.id, 'costPrice', e.target.value)} placeholder="0.00"/>
                    </td>
                    <td className="px-4 py-2 bg-green-50">
                      <input type="number" step="0.01" disabled={!item.isWon} className={`w-28 p-1 border rounded text-right font-bold ${item.isWon ? 'bg-white text-green-700 border-green-300' : 'bg-gray-100 text-gray-400'}`} value={item.wonPrice || ''} onChange={e => updateItem(item.id, 'wonPrice', e.target.value)} placeholder="0.00"/>
                    </td>
                    <td className="px-4 py-2">
                      {!item.isWon ? <span className="text-gray-400 text-xs">-</span> : 
                       isViable ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Boa Margem</span> : 
                       marginWarning ? <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold" title={`Margem ideal era R$ ${expectedPrice.toFixed(2)}`}>Abaixo 37%</span> :
                       <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">Acima Ref.</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length === 0 && <p className="text-gray-500 text-sm mt-2">Os itens deste processo não foram cadastrados detalhadamente.</p>}
        </div>
      </div>

      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-b-lg -mx-6 -mb-6">
        <Button variant="danger" onClick={() => onDelete(bid.id)}><Trash2 size={16}/> Excluir Processo</Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleSave}><Save size={18}/> Salvar Processo</Button>
        </div>
      </div>
    </Card>
  );
};

// Modal Genérico de IA
const AIAnalysisModal = ({ isOpen, onClose, title, content, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl shadow-2xl relative border-t-4 border-purple-500">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
        <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2 mb-4">
          <Sparkles className="text-purple-500"/> {title}
        </h3>
        <div className="bg-purple-50 p-4 rounded-lg min-h-[150px] whitespace-pre-wrap text-gray-700">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-purple-600">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Processando inteligência artificial...</p>
            </div>
          ) : content}
        </div>
      </Card>
    </div>
  );
};

const ProcessTracking = ({ bids, onUpdateStatus, onDelete, onUpdateData, notify }) => {
  const [viewPast, setViewPast] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Modal de confirmação de vitória (Total ou Parcial)
  const [winModal, setWinModal] = useState(null); // { bid, type: 'won' | 'partial' }
  const [winItems, setWinItems] = useState([]);

  // IA Strategy Modal
  const [aiModalInfo, setAiModalInfo] = useState({ isOpen: false, content: '', loading: false });

  useEffect(() => {
    if (winModal) {
      const parsed = parseItems(winModal.bid.items);
      setWinItems(parsed.map(it => {
        const cost = parseFloat(it.costPrice) || 0;
        const ref = parseFloat(it.referencePrice) || 0;
        const suggestedWon = cost > 0 ? (cost * 1.37).toFixed(2) : ref.toFixed(2);
        return {
          ...it,
          isWon: winModal.type === 'won',
          wonPrice: it.wonPrice || suggestedWon
        };
      }));
    }
  }, [winModal]);

  const handleWinItemChange = (id, field, value) => {
    setWinItems(winItems.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const confirmWin = () => {
    const finalValue = winItems.filter(it => it.isWon).reduce((acc, it) => acc + (parseFloat(it.wonPrice) || 0), 0);
    
    onUpdateData(winModal.bid, {
      status: winModal.type,
      items: JSON.stringify(winItems),
      value: finalValue
    });
    
    notify(`Processo registrado como ${winModal.type === 'won' ? 'Vencido' : 'Parcial'}!`, 'success');
    setWinModal(null);
  };

  const handleAIStrategy = async (bid) => {
    setAiModalInfo({ isOpen: true, content: '', loading: true });
    try {
      const itemsList = parseItems(bid.items).map(i => `- ${i.description} (Ref: R$ ${i.referencePrice} / Custo Previsto: R$ ${i.costPrice || 'Não informado'})`).join('\n');
      const prompt = `Você é um consultor especialista em licitações públicas no Brasil atuando pela empresa Alves Martins Licitações.
      Avalie o seguinte pregão iminente:
      Órgão: ${bid.orgao} (Pregão ${bid.numeroPregao} - ${bid.modalidade})
      Plataforma: ${bid.plataforma}
      
      Itens cotados:
      ${itemsList}

      A margem de lucro padrão almejada pela empresa é de 37% acima do custo previsto.
      Forneça uma breve análise (no máximo 3 parágrafos curtos) avaliando a atratividade deste pregão, sugerindo estratégias de lances (agressividade ou cautela) e pontos de atenção com base nos valores informados.`;
      
      const analysis = await generateTextWithGemini(prompt);
      setAiModalInfo({ isOpen: true, content: analysis, loading: false });
    } catch (error) {
      setAiModalInfo({ isOpen: true, content: "Ocorreu um erro ao gerar a estratégia com a IA. Verifique sua conexão.", loading: false });
    }
  };

  const filteredBids = bids.filter(b => b.status === 'pending').sort((a, b) => {
    const dateA = new Date(a.data + 'T' + a.horario);
    const dateB = new Date(b.data + 'T' + b.horario);
    return viewPast ? dateB - dateA : dateA - dateB;
  });
  const now = new Date();

  return (
    <div className="space-y-6">
      <AIAnalysisModal 
        isOpen={aiModalInfo.isOpen} 
        onClose={() => setAiModalInfo({ ...aiModalInfo, isOpen: false })} 
        title="Análise Estratégica IA" 
        content={aiModalInfo.content} 
        isLoading={aiModalInfo.loading} 
      />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-900">Acompanhamento e Estratégia</h2>
        <div className="bg-gray-200 p-1 rounded-lg flex">
          <button onClick={() => setViewPast(false)} className={`px-4 py-2 rounded-md text-sm font-medium ${!viewPast ? 'bg-white shadow text-blue-800' : 'text-gray-600'}`}>Próximos</button>
          <button onClick={() => setViewPast(true)} className={`px-4 py-2 rounded-md text-sm font-medium ${viewPast ? 'bg-white shadow text-blue-800' : 'text-gray-600'}`}>Passados</button>
        </div>
      </div>
      
      <div className="grid gap-4">
        {filteredBids.map(bid => {
          const bidDate = new Date(bid.data + 'T' + bid.horario);
          if (!viewPast && bidDate < now) return null;

          if (editingId === bid.id) {
            return (
              <EditBidForm key={bid.id} bid={bid} onCancel={() => setEditingId(null)} onDelete={onDelete} notify={notify}
                onSave={(updated) => { onUpdateData(updated, {}); setEditingId(null); notify("Atualizado!", "success"); }} />
            );
          }

          return (
            <Card key={bid.id} className="relative border-l-4 border-blue-500 hover:shadow-lg transition">
               <div className="absolute top-4 right-4 flex gap-2">
                 <Button variant="ai" className="px-2 py-1 text-xs shadow" onClick={() => handleAIStrategy(bid)} title="Consultar IA sobre estratégia">
                   <Sparkles size={14}/> ✨ IA
                 </Button>
                 <button onClick={() => setEditingId(bid.id)} className="p-2 text-gray-500 bg-gray-100 rounded hover:bg-blue-100 hover:text-blue-600 transition" title="Editar Itens e Custos"><Edit size={16}/></button>
               </div>

               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xl text-gray-800">{bid.orgao}</span>
                    <span className="text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-600 border">Pregão: {bid.numeroPregao}</span>
                  </div>
                  <p className="text-gray-600">{bid.cidade} - {bid.plataforma}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm font-medium text-gray-600 bg-gray-50 p-2 rounded inline-flex">
                    <span className="flex items-center gap-1"><Calendar size={16} className="text-blue-500"/> {new Date(bid.data).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 text-blue-800">🕒 {bid.horario}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-4 md:pt-0 border-t md:border-0 w-full md:w-auto mt-4 md:mt-0">
                  <Button variant="success" onClick={() => setWinModal({ bid, type: 'won' })} className="flex-1 md:flex-none justify-center">Vencido</Button>
                  <Button variant="outline" onClick={() => setWinModal({ bid, type: 'partial' })} className="flex-1 md:flex-none justify-center">Parcial</Button>
                  <Button variant="danger" onClick={() => onUpdateStatus(bid, 'lost')} className="flex-1 md:flex-none justify-center">Perdido</Button>
                </div>
              </div>
            </Card>
          );
        })}
        {filteredBids.length === 0 && <p className="text-center text-gray-500 py-8">Nenhum processo na lista de acompanhamento.</p>}
      </div>

      {/* Modal de Registro de Vitória / Itens */}
      {winModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
             <div className="flex justify-between items-center mb-6 border-b pb-4">
               <h3 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                 <Trophy className={winModal.type === 'won' ? 'text-yellow-500' : 'text-blue-500'} />
                 {winModal.type === 'won' ? 'Registrar Vitória (Todos os Itens)' : 'Registrar Vitória Parcial'}
               </h3>
               <button onClick={() => setWinModal(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} className="text-gray-600"/></button>
             </div>
             
             <p className="text-gray-600 mb-4">
               {winModal.type === 'won' ? 'Confirme os valores arrematados para cada item.' : 'Selecione QUAIS itens você venceu e informe o valor final arrematado.'}
             </p>

             <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-lg border">
               {winItems.length === 0 && <p className="text-center text-gray-500">Este processo não possui itens detalhados. Você pode editar o processo para adicionar itens.</p>}
               {winItems.map((it, idx) => (
                  <div key={it.id || idx} className={`flex flex-col md:flex-row items-start md:items-center gap-4 p-3 border rounded transition ${it.isWon ? 'bg-white border-green-300 shadow-sm' : 'bg-transparent border-gray-200 opacity-70'}`}>
                     <label className="flex items-center gap-3 cursor-pointer mt-1 md:mt-0">
                       <input type="checkbox" checked={it.isWon} onChange={e => handleWinItemChange(it.id, 'isWon', e.target.checked)} className="w-6 h-6 text-green-600 rounded focus:ring-green-500"/>
                     </label>
                     <div className="flex-1 w-full">
                        <p className="font-medium text-gray-800 line-clamp-2" title={it.description}>{it.description}</p>
                        <p className="text-xs text-gray-500 mt-1">Ref: R$ {parseFloat(it.referencePrice).toFixed(2)} | Custo Est.: R$ {parseFloat(it.costPrice).toFixed(2)}</p>
                     </div>
                     <div className="w-full md:w-40 flex-shrink-0">
                        <label className="text-xs font-bold text-gray-500 block mb-1">Valor Vencido (R$)</label>
                        <input type="number" step="0.01" value={it.wonPrice} disabled={!it.isWon} onChange={e => handleWinItemChange(it.id, 'wonPrice', e.target.value)} className={`w-full p-2 border rounded font-bold text-right ${it.isWon ? 'bg-green-50 text-green-800 border-green-300' : 'bg-gray-100 text-gray-400'}`} placeholder="0.00" />
                     </div>
                  </div>
               ))}
             </div>
             
             <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
               <div>
                 <p className="text-sm text-blue-800 font-bold uppercase">Total Ofertado/Vencido</p>
                 <p className="text-2xl font-black text-blue-900">
                   {winItems.filter(it => it.isWon).reduce((acc, it) => acc + (parseFloat(it.wonPrice) || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                 </p>
               </div>
               <div className="flex gap-3">
                 <Button variant="secondary" onClick={() => setWinModal(null)}>Cancelar</Button>
                 <Button onClick={confirmWin} variant="success"><CheckCircle size={18}/> Salvar Vitória</Button>
               </div>
             </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const GenericBidList = ({ title, bids, filterStatus, onSaveBid, onDeleteBid, onStatusChange, notify }) => {
  const filteredBids = bids.filter(b => b.status === filterStatus);
  const grouped = filteredBids.reduce((acc, bid) => { (acc[bid.cidade] = acc[bid.cidade] || []).push(bid); return acc; }, {});

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-900">{title}</h2>
      {Object.keys(grouped).length === 0 && <p className="text-gray-500">Nenhum registro encontrado nesta categoria.</p>}
      
      {Object.keys(grouped).map(city => (
        <div key={city} className="space-y-4">
          <h3 className="font-bold text-lg text-white bg-blue-800 px-4 py-2 rounded-md shadow">{city}</h3>
          {grouped[city].map(bid => (
             <GenericBidCard 
               key={bid.id} bid={bid} onSave={onSaveBid} onDelete={onDeleteBid} onStatusChange={onStatusChange} notify={notify}
             />
          ))}
        </div>
      ))}
    </div>
  );
};

const GenericBidCard = ({ bid, onSave, onDelete, onStatusChange, notify }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localBid, setLocalBid] = useState(bid);
  const [isDelivered, setIsDelivered] = useState(false);

  useEffect(() => { setLocalBid(bid); }, [bid]);

  const handleSave = () => {
    onSave(localBid, isDelivered);
    setIsEditing(false);
  };

  if (isEditing) {
    return <EditBidForm bid={bid} onCancel={() => setIsEditing(false)} onDelete={onDelete} notify={notify} onSave={(updated) => { onSave(updated, isDelivered); setIsEditing(false); }} />;
  }

  const isLost = bid.status === 'lost';

  return (
    <Card className={`border-l-4 ${isLost ? 'border-red-500' : 'border-green-500'} hover:shadow-lg transition`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-bold text-xl text-gray-800">{localBid.orgao}</h4>
          <p className="text-sm text-gray-600 mt-1">Pregão: <span className="font-medium text-gray-800">{localBid.numeroPregao}</span> | Processo: {localBid.processo}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${isLost ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
             {isLost ? 'Perdido' : localBid.status === 'won' ? 'Total' : 'Parcial'}
           </div>
           <div className="flex gap-2 bg-gray-50 rounded p-1">
             <button onClick={() => setIsEditing(true)} className="p-1 text-gray-500 hover:text-blue-600" title="Editar Itens e Prazos"><Edit size={16}/></button>
             <button onClick={() => onDelete(bid.id)} className="p-1 text-gray-500 hover:text-red-600" title="Excluir Processo"><Trash2 size={16}/></button>
           </div>
        </div>
      </div>

      {!isLost && (
        <>
          <div className="bg-gray-50 p-3 rounded mb-4 border flex justify-between items-center">
            <span className="text-sm font-bold text-gray-600 uppercase">Valor Fechado (Ganhos)</span>
            <span className="text-lg font-black text-green-700">{parseFloat(localBid.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <Input label="Prazo Documentos" type="date" value={localBid.deadlines?.docs || ''} onChange={(e) => setLocalBid({ ...localBid, deadlines: {...localBid.deadlines, docs: e.target.value}})} />
            <Input label="Assinatura Ata" type="date" value={localBid.deadlines?.sign || ''} onChange={(e) => setLocalBid({ ...localBid, deadlines: {...localBid.deadlines, sign: e.target.value}})} />
            <Input label="Prazo Entrega" type="date" value={localBid.deadlines?.delivery || ''} onChange={(e) => setLocalBid({ ...localBid, deadlines: {...localBid.deadlines, delivery: e.target.value}})} />
          </div>
        </>
      )}

      <div className="flex flex-wrap justify-end items-center gap-4 mt-4 pt-4 border-t border-gray-100">
        {isLost ? (
           <Button variant="outline" className="text-xs" onClick={() => onStatusChange(bid, 'won')}>Recuperar (Mudar para Vencido)</Button>
        ) : (
           <>
             <Button variant="danger" className="text-xs" onClick={() => onStatusChange(bid, 'lost')}>Mudar para Perdido</Button>
             <label className="flex items-center gap-2 cursor-pointer select-none px-4 py-2 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 ml-auto transition">
               <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" checked={isDelivered} onChange={(e) => setIsDelivered(e.target.checked)} />
               <span className="text-sm font-bold text-gray-700">Produtos Entregues</span>
             </label>
             <Button onClick={handleSave} className="flex items-center gap-2"><Save size={18} /> Salvar Prazos</Button>
           </>
        )}
      </div>
    </Card>
  );
};

const EmailDraftModal = ({ isOpen, onClose, bid, isLoading, emailText }) => {
  if (!isOpen) return null;

  const handleCopy = () => {
    // navigator.clipboard.writeText is more standard but document.execCommand is required in some iframes
    const textArea = document.createElement("textarea");
    textArea.value = emailText;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      alert("Copiado para a área de transferência!");
    } catch (err) {
      console.error('Falha ao copiar', err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl shadow-2xl relative border-t-4 border-blue-600">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
        <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2 mb-4">
          <Sparkles className="text-blue-500"/> E-mail Gerado por IA
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          A Inteligência Artificial rascunhou este e-mail de cobrança baseado nos dados do processo. Edite se necessário antes de enviar.
        </p>
        <div className="bg-gray-50 p-4 rounded-lg min-h-[200px] border border-gray-200 relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-blue-600">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Escrevendo o e-mail...</p>
            </div>
          ) : (
            <>
              <button onClick={handleCopy} className="absolute top-2 right-2 bg-white border shadow-sm p-2 rounded hover:bg-gray-50 text-gray-600 transition" title="Copiar E-mail">
                <Copy size={16}/>
              </button>
              <textarea 
                className="w-full h-full min-h-[200px] bg-transparent resize-none outline-none text-gray-700" 
                defaultValue={emailText} 
                readOnly
              />
            </>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Concluído</Button>
        </div>
      </Card>
    </div>
  );
};

const Payments = ({ bids, onUpdateBid, onDelete, onUpdateData, notify }) => {
  const delivered = bids.filter(b => ['delivered', 'paid'].includes(b.status));
  const total = delivered.filter(b => b.status === 'delivered').reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);
  const [editingId, setEditingId] = useState(null);

  // Estados do Modal do E-mail
  const [emailModalState, setEmailModalState] = useState({ isOpen: false, bid: null, loading: false, text: '' });

  const handleGenerateEmail = async (bid) => {
    setEmailModalState({ isOpen: true, bid, loading: true, text: '' });
    try {
      const prompt = `Você é um representante comercial da empresa "Alves Martins Licitações". Escreva um e-mail formal, educado e direto para o órgão público responsável "${bid.orgao}".
      O assunto deve referenciar claramente o Pregão ${bid.numeroPregao}.
      O corpo do e-mail deve comunicar que os produtos foram devidamente entregues e recebidos pelo órgão, e solicitar cordialmente uma previsão ou confirmação do pagamento do valor total fechado de ${parseFloat(bid.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.
      Deixe os espaços de assinatura vazios [Seu Nome/Departamento] para preenchimento. Não use formatações markdown.`;

      const generatedText = await generateTextWithGemini(prompt);
      setEmailModalState({ isOpen: true, bid, loading: false, text: generatedText });
    } catch (error) {
      setEmailModalState({ isOpen: true, bid, loading: false, text: 'Erro ao gerar o e-mail pela IA. Verifique sua conexão.' });
    }
  };

  return (
    <div className="space-y-6">
      <EmailDraftModal 
        isOpen={emailModalState.isOpen} 
        onClose={() => setEmailModalState({ ...emailModalState, isOpen: false })} 
        bid={emailModalState.bid} 
        isLoading={emailModalState.loading} 
        emailText={emailModalState.text} 
      />

      <div className="flex justify-between items-end border-b pb-4">
        <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2"><DollarSignIcon size={28}/> Pagamentos e Recebíveis</h2>
        <div className="text-right bg-yellow-50 px-6 py-2 rounded-lg border border-yellow-200 shadow-inner">
          <p className="text-sm text-yellow-800 font-medium">Total a Receber</p>
          <p className="text-2xl font-bold text-yellow-700">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
      </div>
      
      {delivered.length === 0 && <p className="text-gray-500">Nenhum processo aguardando pagamento.</p>}
      
      {delivered.map(bid => {
        if (editingId === bid.id) {
            return <EditBidForm key={bid.id} bid={bid} showFinancials={true} onCancel={() => setEditingId(null)} onDelete={onDelete} notify={notify} onSave={(updated) => { onUpdateData(updated, {}); setEditingId(null); notify("Atualizado", "success"); }} />;
        }
        return (
          <Card key={bid.id} className={`transition-all relative ${bid.status === 'paid' ? 'opacity-50 bg-gray-50' : 'border-l-4 border-green-500 shadow-md'}`}>
            <div className="absolute top-4 right-4 flex gap-2">
                 {!bid.status.includes('paid') && (
                   <Button variant="ai" className="px-2 py-1 text-xs shadow hidden md:flex" onClick={() => handleGenerateEmail(bid)} title="Criar E-mail de Cobrança com IA">
                     <Sparkles size={14}/> ✨ E-mail IA
                   </Button>
                 )}
                 <button onClick={() => setEditingId(bid.id)} className="p-1 text-gray-400 hover:text-blue-600 bg-white rounded shadow-sm"><Edit size={16}/></button>
            </div>
            <div className="flex flex-col md:flex-row justify-between gap-4 mt-6 md:mt-0">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`font-bold text-lg ${bid.status === 'paid' ? 'text-gray-500' : 'text-gray-800'}`}>{bid.orgao}</h4>
                  {bid.status === 'paid' && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-bold">PAGO</span>}
                </div>
                <p className="text-gray-600 text-sm mt-1">{bid.cidade} | Pregão: {bid.numeroPregao}</p>
                <p className="mt-3 font-mono text-xl font-bold text-blue-900">
                  {parseFloat(bid.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                
                {/* Botão de IA Visível no Mobile */}
                {!bid.status.includes('paid') && (
                   <Button variant="ai" className="mt-3 px-3 py-1 text-xs shadow md:hidden w-full justify-center" onClick={() => handleGenerateEmail(bid)}>
                     <Sparkles size={14}/> ✨ Escrever E-mail de Cobrança
                   </Button>
                )}
              </div>
              <div className="flex items-end gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100 mt-4 md:mt-0">
                <div className="w-full md:w-48">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Previsão Pagamento</label>
                  <input type="date" className="w-full text-sm border rounded p-2 focus:ring focus:ring-blue-200 outline-none" value={bid.paymentDeadline || ''} onChange={(e) => onUpdateBid(bid, { paymentDeadline: e.target.value })} disabled={bid.status === 'paid'} />
                </div>
                <div className="flex items-center h-10">
                  <label className={`flex items-center gap-2 cursor-pointer select-none px-4 py-2 rounded-md transition ${bid.status === 'paid' ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}>
                    <input type="checkbox" className="hidden" checked={bid.status === 'paid'} onChange={(e) => onUpdateBid(bid, { status: e.target.checked ? 'paid' : 'delivered' })} />
                    <CheckCircle size={20} className={bid.status === 'paid' ? 'text-white' : 'text-gray-400'} />
                    <span className="font-bold">{bid.status === 'paid' ? 'Recebido' : 'Marcar Recebido'}</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// --- MÓDULO DE CERTIDÕES ---
const Certificates = ({ notify }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [validity, setValidity] = useState('');

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (!res.ok) throw new Error("Erro na rede");
      const data = await res.json();
      setFiles(data.filter(f => f.type && f.type.startsWith('certidao')));
    } catch (error) { console.error("Sem conexão", error); }
  };
  useEffect(() => { fetchFiles(); }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    // Guarda a data de validade no "type" do arquivo na VPS para não precisarmos alterar o banco
    formData.append('type', `certidao|${validity}`); 

    setLoading(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) { notify("Certidão arquivada com sucesso!", "success"); fetchFiles(); setValidity(''); }
      else notify("Erro ao enviar arquivo.", "error");
    } catch (error) { notify("Erro de conexão.", "error"); } finally { setLoading(false); fileInputRef.current.value = ''; }
  };

  const handleDeleteFile = async (id) => {
    if(!confirm("Tem certeza que deseja apagar esta certidão?")) return;
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) { notify("Arquivo excluído", "success"); fetchFiles(); }
    } catch(e) { notify("Erro de conexão.", "error"); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2"><Shield /> Controle de Certidões</h2>
      
      <Card className="bg-blue-50 border border-blue-100">
        <h3 className="font-bold text-blue-800 mb-3">Adicionar Novo Documento</h3>
        <div className="flex flex-col md:flex-row items-end gap-4">
           <div className="w-full md:w-1/3">
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Validade (Opcional)</label>
             <input type="date" value={validity} onChange={(e) => setValidity(e.target.value)} className="w-full p-2 border rounded" />
           </div>
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,image/*" />
           <Button onClick={() => fileInputRef.current.click()} disabled={loading} className="w-full md:w-auto">
             {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />} Selecionar Arquivo e Salvar
           </Button>
        </div>
      </Card>

      <Card className="min-h-[300px]">
        <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Documentos da Empresa</h3>
        <div className="space-y-3">
          {files.length === 0 && <p className="text-center py-10 text-gray-400">Nenhuma certidão cadastrada.</p>}
          {files.map(file => {
            const [baseType, expDate] = file.type.split('|');
            let isExpired = false;
            let isClose = false;
            
            if (expDate) {
               const expiration = new Date(expDate);
               const today = new Date();
               isExpired = expiration < today;
               const diffTime = Math.abs(expiration - today);
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
               isClose = !isExpired && diffDays <= 30; // 30 dias para vencer
            }

            return (
              <div key={file.id} className={`flex justify-between items-center p-4 border rounded-lg transition ${isExpired ? 'bg-red-50 border-red-200' : isClose ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200 hover:shadow-md'}`}>
                <div className="flex items-center gap-4">
                  <FileText className={isExpired ? "text-red-500" : isClose ? "text-yellow-500" : "text-blue-500"} size={24} />
                  <div>
                    <span className="font-bold text-gray-800 block">{file.originalName}</span>
                    <div className="flex gap-3 text-xs mt-1">
                       <span className="text-gray-400">Adicionado: {new Date(file.createdAt).toLocaleDateString()}</span>
                       {expDate && (
                          <span className={`font-bold px-2 rounded-full ${isExpired ? 'bg-red-200 text-red-800' : isClose ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                            {isExpired ? `Vencida em ${new Date(expDate).toLocaleDateString()}` : `Válida até ${new Date(expDate).toLocaleDateString()}`}
                          </span>
                       )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => window.open(`/api/download/${file.filename}`, '_blank')} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded font-medium flex items-center gap-2 transition"><Download size={16}/> Baixar</button>
                  <button onClick={() => handleDeleteFile(file.id)} className="text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 rounded transition" title="Apagar"><Trash2 size={18}/></button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

const Invoices = ({ notify }) => {
  const [tab, setTab] = useState('entry');
  const [files, setFiles] = useState({ entry: [], exit: [] });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (!res.ok) throw new Error("Erro na rede");
      const data = await res.json();
      setFiles({ entry: data.filter(f => f.type === 'entry'), exit: data.filter(f => f.type === 'exit') });
    } catch (error) { console.error("Sem conexão com banco", error); }
  };
  useEffect(() => { fetchFiles(); }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', tab);

    setLoading(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) { notify("Nota Fiscal arquivada com sucesso!", "success"); fetchFiles(); }
      else notify("Erro ao enviar arquivo.", "error");
    } catch (error) { notify("Erro de conexão.", "error"); } finally { setLoading(false); fileInputRef.current.value = ''; }
  };

  const handleDeleteFile = async (id) => {
    if(!confirm("Tem certeza que deseja apagar esta nota?")) return;
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) { notify("Arquivo excluído", "success"); fetchFiles(); }
    } catch(e) { notify("Erro de conexão.", "error"); }
  };

  const currentFiles = files[tab];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-900">Gestão de Notas Fiscais</h2>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,image/*" />
      <div className="flex border-b border-gray-200">
        <button className={`px-6 py-3 font-medium ${tab === 'entry' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`} onClick={() => setTab('entry')}>Notas de Entrada (Custos)</button>
        <button className={`px-6 py-3 font-medium ${tab === 'exit' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`} onClick={() => setTab('exit')}>Notas de Saída (Faturamento)</button>
      </div>
      <Card className="min-h-[300px]">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">Arquivo Digital Nuvem</p>
          <Button onClick={() => fileInputRef.current.click()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />} Novo Documento
          </Button>
        </div>
        <div className="space-y-2">
          {currentFiles.length === 0 && <p className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg bg-gray-50">Nenhum documento anexado nesta pasta.</p>}
          {currentFiles.map(file => (
            <div key={file.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 shadow-sm rounded-lg hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="bg-red-50 p-3 rounded-lg"><FileText className="text-red-500" size={24} /></div>
                <div>
                  <span className="font-bold text-gray-800 block">{file.originalName}</span>
                  <span className="text-sm text-gray-400">Adicionado em {new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.open(`/api/download/${file.filename}`, '_blank')} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded font-medium flex items-center gap-2 transition"><Download size={16}/> Baixar</button>
                <button onClick={() => handleDeleteFile(file.id)} className="text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 rounded transition" title="Apagar"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bids, setBids] = useState([]);
  const [toast, setToast] = useState(null);

  const notify = (message, type = 'success') => setToast({ message, type });

  const loadData = async () => {
    try {
      const res = await fetch('/api/bids');
      if (res.ok) { const data = await res.json(); setBids(data); }
    } catch (e) { console.error("Modo Offline/Demonstração", e); }
  };

  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated, currentPage]);

  const addBid = async (newBid) => {
    try {
      const res = await fetch('/api/bids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBid) });
      if (res.ok) await loadData();
    } catch(e) { setBids([...bids, newBid]); } 
  };

  const updateBidData = async (bid, updates) => {
    const updated = { ...bid, ...updates };
    try {
      await fetch(`/api/bids/${bid.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      await loadData();
    } catch(e) { setBids(bids.map(b => b.id === bid.id ? updated : b)); }
  };

  const updateBidStatus = async (bid, newStatus) => {
    await updateBidData(bid, { status: newStatus });
    notify(`Status atualizado para ${newStatus === 'won' ? 'Vencido' : newStatus === 'lost' ? 'Perdido' : 'Parcial'}`, 'success');
  };

  const handleDeleteBid = async (id) => {
    if (!confirm("Tem certeza que deseja apagar permanentemente este processo?")) return;
    try {
      await fetch(`/api/bids/${id}`, { method: 'DELETE' });
      await loadData();
      notify("Processo apagado.", "info");
    } catch(e) { setBids(bids.filter(b => b.id !== id)); notify("Removido localmente.", "info"); }
  };

  const handleSaveBid = async (updatedBid, shouldDeliver) => {
    if (shouldDeliver) {
      updatedBid.status = 'delivered';
      notify("Concluído! Encaminhado para Faturamento.", "success");
      setCurrentPage('payments');
    } else {
      notify("Informações salvas com sucesso.", "success");
    }
    await updateBidData(updatedBid, {});
  };

  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} notify={notify} />;

  const NavItem = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setCurrentPage(id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${currentPage === id ? 'bg-blue-800 text-white border-r-4 border-blue-400 font-bold' : 'text-blue-100 hover:bg-blue-800'}`}>
      <Icon size={20} /><span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <aside className="hidden md:flex w-64 bg-blue-900 flex-col shadow-xl z-20">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-xl font-bold text-white tracking-wide uppercase leading-tight">Alves Martins<br/><span className="text-sm font-normal text-blue-300">Licitações</span></h1>
        </div>
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="insert" icon={PlusCircle} label="Inserir Pregão" />
          <NavItem id="tracking" icon={Gavel} label="Acompanhamento" />
          <NavItem id="won" icon={Trophy} label="Vencidos" />
          <NavItem id="lost" icon={ThumbsDown} label="Perdidos" />
          <NavItem id="payments" icon={DollarSign} label="Pagamentos" />
          <NavItem id="certidoes" icon={Shield} label="Certidões e Docs" />
          <NavItem id="invoices" icon={FileText} label="Notas Fiscais" />
        </nav>
        <div className="p-4 border-t border-blue-800"><button onClick={() => setIsAuthenticated(false)} className="flex items-center gap-2 text-blue-200 hover:text-white transition w-full"><LogOut size={18} /> Sair do Sistema</button></div>
      </aside>
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10"><span className="font-bold text-blue-900">Alves Martins Licitações</span><button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? <X /> : <Menu />}</button></header>
        {isMobileMenuOpen && (
          <div className="absolute inset-0 bg-blue-900 z-50 flex flex-col md:hidden"><div className="flex justify-end p-4"><button onClick={() => setIsMobileMenuOpen(false)} className="text-white"><X size={28}/></button></div><nav className="flex-1 overflow-y-auto"><NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" /><NavItem id="insert" icon={PlusCircle} label="Inserir Pregão" /><NavItem id="tracking" icon={Gavel} label="Acompanhamento" /><NavItem id="won" icon={Trophy} label="Vencidos" /><NavItem id="lost" icon={ThumbsDown} label="Perdidos" /><NavItem id="payments" icon={DollarSign} label="Pagamentos" /><NavItem id="certidoes" icon={Shield} label="Certidões e Docs" /><NavItem id="invoices" icon={FileText} label="Notas Fiscais" /></nav></div>
        )}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {currentPage === 'dashboard' && <Dashboard bids={bids} />}
          {currentPage === 'insert' && <InsertBid onAdd={addBid} notify={notify} />}
          {currentPage === 'tracking' && <ProcessTracking bids={bids} onUpdateStatus={updateBidStatus} onDelete={handleDeleteBid} onUpdateData={updateBidData} notify={notify} />}
          {currentPage === 'won' && <GenericBidList title="Processos Vencidos" filterStatus="won" bids={bids} onSaveBid={handleSaveBid} onDeleteBid={handleDeleteBid} onStatusChange={updateBidStatus} notify={notify} />}
          {currentPage === 'lost' && <GenericBidList title="Processos Perdidos" filterStatus="lost" bids={bids} onSaveBid={handleSaveBid} onDeleteBid={handleDeleteBid} onStatusChange={updateBidStatus} notify={notify} />}
          {currentPage === 'payments' && <Payments bids={bids} onUpdateBid={updateBidData} onDelete={handleDeleteBid} onUpdateData={updateBidData} notify={notify} />}
          {currentPage === 'certidoes' && <Certificates notify={notify} />}
          {currentPage === 'invoices' && <Invoices notify={notify} />}
        </main>
      </div>
    </div>
  );
}
