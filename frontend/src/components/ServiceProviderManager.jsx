import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Building2, Wallet, DollarSign, Check, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { usePriceConverter } from '../hooks/usePriceConverter';

// Color classes mapping (Tailwind can't detect dynamic classes)
const colorClasses = {
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
  green: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
  red: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
};

// No default services - creators are added by admins

// Old SaaS service names to filter out (legacy migration)
const LEGACY_SERVICES = ['GPT Pro', 'Claude', 'Namecheap', 'GoDaddy', 'Spotify', 'Netflix', 'ChatGPT Pro'];

// Creator-focused service types
const SERVICE_TYPES = [
  'YouTube',
  'Newsletter', 
  'Community',
  'Discord',
  'Telegram',
  'Course',
  'Premium',
  'VIP',
  'Alpha',
];

const PLATFORM_FEE_PERCENT = 2;

function ServiceProviderManager({ onServicesUpdate }) {
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    type: '',
    amount: '',
    walletAddress: '',
    color: 'blue',
    active: true,
  });
  
  const toast = useToast();
  const { convertToUSD, xlmPrice } = usePriceConverter();

  // Load services from localStorage on mount (filter out legacy SaaS services)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('orbit-service-providers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy SaaS services
          const filtered = parsed.filter(s => !LEGACY_SERVICES.includes(s.name));
          
          // If we filtered something, update localStorage
          if (filtered.length !== parsed.length) {
            if (filtered.length > 0) {
              localStorage.setItem('orbit-service-providers', JSON.stringify(filtered));
            } else {
              localStorage.removeItem('orbit-service-providers');
            }
          }
          
          setServices(filtered);
        }
      }
    } catch (e) {
      console.error('Failed to load services:', e);
    }
  }, []);

  // Save to localStorage when services change
  useEffect(() => {
    if (services.length > 0) {
      localStorage.setItem('orbit-service-providers', JSON.stringify(services));
      if (onServicesUpdate) {
        onServicesUpdate(services);
      }
    }
  }, [services, onServicesUpdate]);

  const handleEdit = (service) => {
    setEditingId(service.id);
    setEditForm({ ...service });
  };

  const handleSaveEdit = () => {
    if (!editForm.name || !editForm.amount) {
      toast.error('Missing Info', 'Name and amount are required');
      return;
    }
    setServices(prev => prev.map(s => 
      s.id === editingId ? { ...editForm, amount: parseFloat(editForm.amount) } : s
    ));
    setEditingId(null);
    setEditForm({});
    toast.success('Updated', `${editForm.name} has been updated`);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id) => {
    const service = services.find(s => s.id === id);
    if (window.confirm(`Delete ${service.name}? This cannot be undone.`)) {
      setServices(prev => prev.filter(s => s.id !== id));
      toast.warning('Deleted', `${service.name} has been removed`);
    }
  };

  const handleToggleActive = (id) => {
    setServices(prev => prev.map(s => 
      s.id === id ? { ...s, active: !s.active } : s
    ));
  };

  const handleAddService = () => {
    if (!newService.name || !newService.amount || !newService.type) {
      toast.error('Missing Info', 'Name, type, and amount are required');
      return;
    }
    const service = {
      ...newService,
      id: Date.now(),
      amount: parseFloat(newService.amount),
    };
    setServices(prev => [...prev, service]);
    setNewService({ name: '', type: '', amount: '', walletAddress: '', color: 'blue', active: true });
    setShowAddForm(false);
    toast.success('Added', `${service.name} has been added`);
  };

  const calculateFee = (amount) => (amount * PLATFORM_FEE_PERCENT / 100).toFixed(4);
  const calculatePayout = (amount) => (amount - (amount * PLATFORM_FEE_PERCENT / 100)).toFixed(4);

  const getColor = (color) => colorClasses[color] || colorClasses.blue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wider">
            Content Creators
          </h2>
          <p className="text-orbit-gray text-sm mt-1">
            Manage creators and their wallet addresses • {PLATFORM_FEE_PERCENT}% platform fee
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-orbit-gold hover:bg-orbit-gold-light text-black py-2 px-4 rounded-lg font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Creator
        </button>
      </div>

      {/* XLM Price Info */}
      <div className="bg-[#14141A] border border-white/10 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign size={20} className="text-orbit-gold" />
          <span className="text-white font-medium">Current XLM Price:</span>
        </div>
        <span className="text-orbit-gold font-display font-bold text-lg">
          ${xlmPrice ? xlmPrice.toFixed(4) : '---'} USD
        </span>
      </div>

      {/* Add New Service Form */}
      {showAddForm && (
        <div className="bg-[#14141A] border border-orbit-gold/30 rounded-xl p-6">
          <h3 className="text-white font-display font-bold mb-4">Add New Creator</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Creator Name"
              value={newService.name}
              onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg bg-[#0D0D0F] border border-white/10 text-white placeholder-gray-500 focus:border-orbit-gold/50 focus:outline-none"
            />
            <select
              value={newService.type}
              onChange={(e) => setNewService(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg bg-[#0D0D0F] border border-white/10 text-white focus:border-orbit-gold/50 focus:outline-none"
            >
              <option value="" className="text-gray-500">Select Type</option>
              {SERVICE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount (XLM)"
              value={newService.amount}
              onChange={(e) => setNewService(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg bg-[#0D0D0F] border border-white/10 text-white placeholder-gray-500 focus:border-orbit-gold/50 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Wallet Address (G...)"
              value={newService.walletAddress}
              onChange={(e) => setNewService(prev => ({ ...prev, walletAddress: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg bg-[#0D0D0F] border border-white/10 text-white placeholder-gray-500 focus:border-orbit-gold/50 focus:outline-none font-mono text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="py-2 px-4 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddService}
              className="bg-orbit-gold hover:bg-orbit-gold-light text-black py-2 px-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors"
            >
              Add Service
            </button>
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="space-y-3">
        {services.map((service) => (
          <div
            key={service.id}
            className={`bg-[#14141A] border rounded-xl p-4 transition-all ${
              !service.active ? 'opacity-50 border-white/5' : 'border-white/10'
            } ${editingId === service.id ? 'border-orbit-gold/50' : ''}`}
          >
            {editingId === service.id ? (
              /* Edit Mode */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white focus:border-orbit-gold/50 focus:outline-none"
                    placeholder="Service Name"
                  />
                  <input
                    type="text"
                    value={editForm.type || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white focus:border-orbit-gold/50 focus:outline-none"
                    placeholder="Type"
                  />
                  <input
                    type="number"
                    value={editForm.amount || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white focus:border-orbit-gold/50 focus:outline-none"
                    placeholder="Amount (XLM)"
                  />
                  <input
                    type="text"
                    value={editForm.walletAddress || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, walletAddress: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-[#0D0D0F] border border-white/10 text-white focus:border-orbit-gold/50 focus:outline-none font-mono text-sm"
                    placeholder="Wallet Address (G...)"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                  >
                    <Save size={18} />
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${getColor(service.color).bg} ${getColor(service.color).border} border flex items-center justify-center`}>
                    <Building2 size={20} className={getColor(service.color).text} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{service.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#1A1A1F] text-gray-400">
                        {service.type}
                      </span>
                      {!service.walletAddress && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1">
                          <AlertCircle size={10} />
                          No wallet
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <p className="text-orbit-gold font-medium">
                        {service.amount} XLM
                        <span className="text-gray-500 text-xs ml-2">
                          (${convertToUSD ? convertToUSD(service.amount) : '---'} USD)
                        </span>
                      </p>
                      <span className="text-xs text-gray-500">
                        Fee: {calculateFee(service.amount)} XLM • 
                        Payout: {calculatePayout(service.amount)} XLM
                      </span>
                    </div>
                    {service.walletAddress && (
                      <p className="text-gray-600 text-xs font-mono mt-1 flex items-center gap-1">
                        <Wallet size={10} />
                        {service.walletAddress.slice(0, 8)}...{service.walletAddress.slice(-8)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(service.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      service.active
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-[#1A1A1F] text-gray-500'
                    }`}
                    title={service.active ? 'Active' : 'Inactive'}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-2 rounded-lg bg-[#1A1A1F] text-gray-400 hover:text-white transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-2 rounded-lg bg-[#1A1A1F] text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-10">
          <Building2 size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No creators added yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 text-orbit-gold hover:underline"
          >
            Add your first creator
          </button>
        </div>
      )}
    </div>
  );
}

export default ServiceProviderManager;
