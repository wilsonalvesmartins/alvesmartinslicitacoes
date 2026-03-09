import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, PlusCircle, Gavel, ThumbsDown, Trophy, 
  DollarSign, FileText, LogOut, Menu, X, Calendar, 
  Upload, Save, Download, Trash2, Loader2, Edit, CheckCircle, 
  AlertTriangle, TrendingUp, DollarSignIcon, Shield, FileSpreadsheet
} from 'lucide-react';

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

// --- FUNÇÕES AUXILIARES ---
const parseItems = (itemsData) => {
  if (!itemsData) return [];
  if (typeof itemsData === 'string') {
    try { return JSON.parse(itemsData); } 
    catch (e) { return [{ id: Date.now(), description: itemsData, referencePrice: 0, costPrice: 0, isWon: false, wonPrice: 0 }]; }
  }
  return itemsData;
};

// Leitor de CSV Avançado (Suporta "R$" e formatação com vírgulas)
const parseCSVRow = (text, separator = ',') => {
  let result = [];
  let startValueBnd = 0;
  let isQuote = false;
  
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') isQuote = !isQuote;
    if (text[i] === separator && !isQuote) {
      result.push(text.substring(startValueBnd, i));
      startValueBnd = i + 1;
    }
  }
  result.push(text.substring(startValueBnd));
  
  return result.map(v => v.replace(/^"|"$/g, '').trim());
};

const detectSeparator = (lines) => {
  if (lines.length === 0) return ',';
  const commaCount = (lines[0].match(/,/g) || []).length;
  const semicolonCount = (lines[0].match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
};

const parseCurrencyToFloat = (valueStr) => {
  if (!valueStr) return 0;
  // Remove "R$", espaços, pontos de milhar, e troca vírgula por ponto
  let cleanedStr = valueStr.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  let val = parseFloat(cleanedStr);
  return isNaN(val) ? 0 : val;
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
          {bids.filter(b => b.status === 'pending')
            .sort((a, b) => {
              const dateA = new Date(a.data + 'T' + (a.horario || '00:00'));
              const dateB = new Date(b.data + 'T' + (b.horario || '00:00'));
              return dateA - dateB; // Mais recente primeiro
            })
            .slice(0, 5)
            .map(bid => (
            <div key={bid.id} className="flex justify-between items-center py-3 border-b last:border-0">
              <div>
                <p className="font-medium text-gray-800">{bid.modalidade} - {bid.orgao} - {bid.cidade}</p>
                <p className="text-sm text-gray-500">{new Date(bid.data).toLocaleDateString()} - {bid.horario}</p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full shadow-sm">{bid.plataforma || 'N/A'}</span>
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
  const [csvLoading, setCsvLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [items, setItems] = useState([]);
  
  const [formData, setFormData] = useState({ 
    orgao: '', cidade: '', plataforma: '', numeroPregao: '', processo: '', data: '', horario: '', modalidade: 'Pregão Eletrônico' 
  });

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        const newItems = [];
        const separator = detectSeparator(lines);
        
        // Pula o cabeçalho (começa do índice 1)
        for (let i = 1; i < lines.length; i++) {
          const row = parseCSVRow(lines[i], separator);
          
          if (row.length >= 2) {
            let desc = row[0];
            let valStr = row[row.length - 1]; // Assume que o valor é a última coluna na planilha
            
            let val = parseCurrencyToFloat(valStr);
            
            if (val > 0) {
              newItems.push({
                id: Date.now() + i,
                description: desc,
                referencePrice: val,
                costPrice: 0,
                isWon: false,
                wonPrice: 0
              });
            }
          }
        }

        if (newItems.length > 0) {
          setItems(prevItems => [...prevItems, ...newItems]);
          notify(`${newItems.length} itens importados com sucesso da planilha!`, "success");
        } else {
          notify("Nenhum item com valor válido encontrado. Verifique se o formato da planilha tem 2 colunas: Descrição e Valor.", "error");
        }
      } catch (error) {
        console.error(error);
        notify("Erro ao processar o arquivo CSV. Verifique o formato.", "error");
      } finally {
        setCsvLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
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
      notify("Erro ao guardar: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="bg-gradient-to-r from-blue-800 to-blue-700 text-white border-0">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="text-blue-200"/> Importação Rápida de Planilha</h2>
            <p className="text-blue-100 text-sm mt-1">Carregue um arquivo .CSV com duas colunas (Descrição do Item e Valor) para preencher a lista automaticamente.</p>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleCsvUpload} className="hidden" accept=".csv" />
          <Button variant="secondary" onClick={() => fileInputRef.current.click()} disabled={csvLoading} className="whitespace-nowrap shadow-lg text-blue-900">
            {csvLoading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />} 
            {csvLoading ? 'Lendo Planilha...' : 'Carregar CSV'}
          </Button>
        </div>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4 border-b pb-2">Dados Principais (Preenchimento Manual)</h3>
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
            <Button variant="outline" onClick={addItem} className="text-sm py-1"><PlusCircle size={16}/> Adicionar Item Manual</Button>
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
            {items.length === 0 && <p className="text-center text-gray-400 py-6 border-2 border-dashed rounded">A lista de itens está vazia. Carregue uma planilha CSV ou adicione manualmente.</p>}
          </div>
        </Card>

        <Button type="submit" disabled={loading} className="w-full justify-center py-4 text-lg shadow-md">
          {loading ? <Loader2 className="animate-spin"/> : <Save />} Guardar Processo Licitatório
        </Button>
      </form>
    </div>
  );
};

const EditBidForm = ({ bid, onSave, onCancel, onDelete, notify }) => {
  const [localBid, setLocalBid] = useState(bid);
  const [items, setItems] = useState(parseItems(bid.items));

  const updateItem = (id, field, value) => {
    setItems(items.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const handleSave = () => {
    const finalValue = items.reduce((acc, it) => acc + (parseFloat(it.wonPrice) || 0), 0);

    onSave({
      ...localBid,
      value: localBid.status === 'pending' ? localBid.value : finalValue,
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
        <h5 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp size={18}/> Itens, Custos e Valores Ofertados</h5>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th className="px-4 py-3 rounded-tl">Descrição</th>
                <th className="px-4 py-3">Ref. (R$)</th>
                <th className="px-4 py-3 bg-blue-50">Custo (R$)</th>
                <th className="px-4 py-3 bg-green-50">Alvo (+37%)</th>
                {localBid.status !== 'pending' && <th className="px-4 py-3 bg-yellow-50">Valor Fechado</th>}
                <th className="px-4 py-3 rounded-tr">Status / Margem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const refPrice = parseFloat(item.referencePrice) || 0;
                const costPrice = parseFloat(item.costPrice) || 0;
                const expectedPrice = costPrice > 0 ? costPrice * 1.37 : 0;
                const isViable = expectedPrice > 0 && expectedPrice <= refPrice;

                return (
                  <tr key={item.id || idx} className="border-b">
                    <td className="px-4 py-2 font-medium text-gray-900 truncate max-w-[200px]" title={item.description}>{item.description}</td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" className="w-24 p-1 border rounded bg-white text-right" value={item.referencePrice || ''} onChange={e => updateItem(item.id, 'referencePrice', e.target.value)} placeholder="0.00"/>
                    </td>
                    <td className="px-4 py-2 bg-blue-50">
                      <input type="number" step="0.01" className="w-24 p-1 border rounded bg-white text-right" value={item.costPrice || ''} onChange={e => updateItem(item.id, 'costPrice', e.target.value)} placeholder="0.00"/>
                    </td>
                    <td className="px-4 py-2 bg-green-50 font-mono font-bold text-green-700">
                      {expectedPrice > 0 ? expectedPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                    </td>
                    {localBid.status !== 'pending' && (
                      <td className="px-4 py-2 bg-yellow-50">
                        <input type="number" step="0.01" className="w-24 p-1 border rounded bg-white text-right" value={item.wonPrice || ''} onChange={e => updateItem(item.id, 'wonPrice', e.target.value)} placeholder="0.00"/>
                      </td>
                    )}
                    <td className="px-4 py-2">
                      {costPrice === 0 ? <span className="text-gray-400 text-xs">-</span> : 
                       isViable ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Viável</span> : 
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
          <Button onClick={handleSave}><Save size={18}/> Guardar Processo</Button>
        </div>
      </div>
    </Card>
  );
};

const ProcessTracking = ({ bids, onUpdateStatus, onDelete, onUpdateData, notify }) => {
  const [viewPast, setViewPast] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [winModal, setWinModal] = useState(null); 
  const [winItems, setWinItems] = useState([]);

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
    
    notify(`Processo registado como ${winModal.type === 'won' ? 'Vencido' : 'Parcial'}!`, 'success');
    setWinModal(null);
  };

  const filteredBids = bids.filter(b => b.status === 'pending').sort((a, b) => {
    const dateA = new Date(a.data + 'T' + (a.horario || '00:00'));
    const dateB = new Date(b.data + 'T' + (b.horario || '00:00'));
    return viewPast ? dateB - dateA : dateA - dateB;
  });
  const now = new Date();

  return (
    <div className="space-y-6">
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
                 <button onClick={() => setEditingId(bid.id)} className="p-2 text-gray-500 bg-gray-100 rounded hover:bg-blue-100 hover:text-blue-600 transition" title="Editar Itens e Custos"><Edit size={16}/></button>
               </div>

               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xl text-gray-800">{bid.orgao}</span>
                    <span className="text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-600 border">Pregão: {bid.numeroPregao}</span>
                  </div>
                  <p className="text-gray-600 font-medium">{bid.modalidade} - {bid.cidade} - {bid.plataforma}</p>
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
                 {winModal.type === 'won' ? 'Registar Vitória (Todos os Itens)' : 'Registar Vitória Parcial'}
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
                 <Button onClick={confirmWin} variant="success"><CheckCircle size={18}/> Guardar Vitória</Button>
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
      {Object.keys(grouped).length === 0 && <p className="text-gray-500">Nenhum registo encontrado nesta categoria.</p>}
      
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
             <Button onClick={handleSave} className="flex items-center gap-2"><Save size={18} /> Guardar Prazos</Button>
           </>
        )}
      </div>
    </Card>
  );
};

const Payments = ({ bids, onUpdateBid, onDelete, onUpdateData, notify }) => {
  const delivered = bids.filter(b => ['delivered', 'paid'].includes(b.status));
  const total = delivered.filter(b => b.status === 'delivered').reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);
  const [editingId, setEditingId] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b pb-4">
        <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2"><DollarSignIcon size={28}/> Pagamentos e Recebíveis</h2>
        <div className="text-right bg-yellow-50 px-6 py-2 rounded-lg border border-yellow-200 shadow-inner">
          <p className="text-sm text-yellow-800 font-medium">Total a Receber</p>
          <p className="text-2xl font-bold text-yellow-700">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
      </div>
      
      {delivered.length === 0 && <p className="text-gray-500">Nenhum processo a aguardar pagamento.</p>}
      
      {delivered.map(bid => {
        if (editingId === bid.id) {
            return <EditBidForm key={bid.id} bid={bid} showFinancials={true} onCancel={() => setEditingId(null)} onDelete={onDelete} notify={notify} onSave={(updated) => { onUpdateData(updated, {}); setEditingId(null); notify("Atualizado", "success"); }} />;
        }
        return (
          <Card key={bid.id} className={`transition-all relative ${bid.status === 'paid' ? 'opacity-50 bg-gray-50' : 'border-l-4 border-green-500 shadow-md'}`}>
            <div className="absolute top-4 right-4 flex gap-2">
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
    } catch (error) { console.error("Sem ligação", error); }
  };
  useEffect(() => { fetchFiles(); }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', `certidao|${validity}`); 

    setLoading(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) { notify("Certidão arquivada com sucesso!", "success"); fetchFiles(); setValidity(''); }
      else notify("Erro ao enviar arquivo.", "error");
    } catch (error) { notify("Erro de ligação ao servidor.", "error"); } finally { setLoading(false); fileInputRef.current.value = ''; }
  };

  const handleDeleteFile = async (id) => {
    if(!confirm("Tem a certeza que deseja apagar esta certidão?")) return;
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) { notify("Ficheiro excluído", "success"); fetchFiles(); }
    } catch(e) { notify("Erro de ligação ao servidor.", "error"); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2"><Shield /> Controlo de Certidões</h2>
      
      <Card className="bg-blue-50 border border-blue-100">
        <h3 className="font-bold text-blue-800 mb-3">Adicionar Novo Documento</h3>
        <div className="flex flex-col md:flex-row items-end gap-4">
           <div className="w-full md:w-1/3">
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Validade (Opcional)</label>
             <input type="date" value={validity} onChange={(e) => setValidity(e.target.value)} className="w-full p-2 border rounded" />
           </div>
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,image/*" />
           <Button onClick={() => fileInputRef.current.click()} disabled={loading} className="w-full md:w-auto">
             {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />} Selecionar Ficheiro e Guardar
           </Button>
        </div>
      </Card>

      <Card className="min-h-[300px]">
        <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Documentos da Empresa</h3>
        <div className="space-y-3">
          {files.length === 0 && <p className="text-center py-10 text-gray-400">Nenhuma certidão registada.</p>}
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
    } catch (error) { console.error("Sem ligação à base de dados", error); }
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
      else notify("Erro ao enviar ficheiro.", "error");
    } catch (error) { notify("Erro de ligação.", "error"); } finally { setLoading(false); fileInputRef.current.value = ''; }
  };

  const handleDeleteFile = async (id) => {
    if(!confirm("Tem a certeza que deseja apagar esta nota?")) return;
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) { notify("Ficheiro excluído", "success"); fetchFiles(); }
    } catch(e) { notify("Erro de ligação.", "error"); }
  };

  const currentFiles = files[tab];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-900">Gestão de Notas Fiscais</h2>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,image/*" />
      <div className="flex border-b border-gray-200">
        <button className={`px-6 py-3 font-medium ${tab === 'entry' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`} onClick={() => setTab('entry')}>Notas de Entrada (Custos)</button>
        <button className={`px-6 py-3 font-medium ${tab === 'exit' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`} onClick={() => setTab('exit')}>Notas de Saída (Faturação)</button>
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
    notify(`Estado atualizado para ${newStatus === 'won' ? 'Vencido' : newStatus === 'lost' ? 'Perdido' : 'Parcial'}`, 'success');
  };

  const handleDeleteBid = async (id) => {
    if (!confirm("Tem a certeza que deseja apagar permanentemente este processo?")) return;
    try {
      await fetch(`/api/bids/${id}`, { method: 'DELETE' });
      await loadData();
      notify("Processo apagado.", "info");
    } catch(e) { setBids(bids.filter(b => b.id !== id)); notify("Removido localmente.", "info"); }
  };

  const handleSaveBid = async (updatedBid, shouldDeliver) => {
    if (shouldDeliver) {
      updatedBid.status = 'delivered';
      notify("Concluído! Encaminhado para Faturação.", "success");
      setCurrentPage('payments');
    } else {
      notify("Informações guardadas com sucesso.", "success");
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
