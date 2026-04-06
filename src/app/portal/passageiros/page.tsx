'use client';

import React, { useMemo, useState } from 'react';
import { useData, Passageiro, PassageiroEndereco, NovoPassageiroInput } from '@/context/DataContext';
import StandardModal from '@/components/StandardModal';
import {
  Plus,
  Search,
  UserSquare2,
  Mail,
  Phone,
  Hash,
  MapPin,
  PlusCircle,
  Trash2,
  Layers,
  ChevronRight
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';

interface NewPassengerForm extends Omit<NovoPassageiroInput, 'enderecos'> {
  enderecos: Array<Omit<PassageiroEndereco, 'id'>>;
}

const initialEndereco = { rotulo: 'Residencial', enderecoCompleto: '', referencia: '' };

const initialForm: NewPassengerForm = {
  nomeCompleto: '',
  email: '',
  celular: '',
  cpf: '',
  enderecos: [{ ...initialEndereco }]
};

export default function PassageirosPage() {
  const { passageiros, addPassageiro } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<NewPassengerForm>(initialForm);

  const filteredPassageiros = useMemo(() => {
    return passageiros.filter((passageiro) => {
      const term = searchTerm.toLowerCase();
      return (
        passageiro.nomeCompleto.toLowerCase().includes(term) ||
        passageiro.cpf.replace(/\D/g, '').includes(term.replace(/\D/g, '')) ||
        passageiro.email.toLowerCase().includes(term)
      );
    });
  }, [passageiros, searchTerm]);

  const handleAddEndereco = () => {
    setFormData((prev) => ({
      ...prev,
      enderecos: [...prev.enderecos, { ...initialEndereco, rotulo: `Endereço ${prev.enderecos.length + 1}` }]
    }));
  };

  const handleRemoveEndereco = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      enderecos: prev.enderecos.filter((_, idx) => idx !== index)
    }));
  };

  const handleEnderecoChange = (index: number, field: keyof Omit<PassageiroEndereco, 'id'>, value: string) => {
    setFormData((prev) => ({
      ...prev,
      enderecos: prev.enderecos.map((endereco, idx) =>
        idx === index ? { ...endereco, [field]: value } : endereco
      )
    }));
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanedEnderecos = formData.enderecos.filter((endereco) => endereco.enderecoCompleto.trim());

    if (!cleanedEnderecos.length) {
      return;
    }

    try {
      await addPassageiro({
        nomeCompleto: formData.nomeCompleto.trim(),
        email: formData.email.trim(),
        celular: formData.celular.trim(),
        cpf: formData.cpf.trim(),
        enderecos: cleanedEnderecos.map((endereco) => ({
          rotulo: endereco.rotulo.trim() || 'Endereço',
          enderecoCompleto: endereco.enderecoCompleto.trim(),
          referencia: endereco.referencia?.trim() || ''
        }))
      });

      setFormData(initialForm);
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o passageiro.');
    }
  };

  const handleInputChange = (field: keyof Omit<NewPassengerForm, 'enderecos'>, value: string) => {
    let formattedValue = value;

    if (field === 'cpf') {
      formattedValue = formatCPF(value);
    }

    if (field === 'celular') {
      formattedValue = formatPhone(value);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Passageiros Cadastrados"
        icon={<UserSquare2 size={20} />}
        buttonText="Novo Passageiro"
        onButtonClick={() => setIsModalOpen(true)}
        buttonIcon={<Plus size={18} />}
      />

      <DataTable
        data={filteredPassageiros}
        columns={[
          {
            key: 'nomeCompleto',
            title: 'Passageiro',
            render: (value: unknown) => (
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-bold text-slate-800">{String(value)}</p>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Passageiro cadastrado</p>
                </div>
              </div>
            )
          },
          {
            key: 'contato',
            title: 'Contato',
            render: (value: unknown, item: Passageiro) => {
              void value;

              return (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={14} className="text-blue-500" />
                  <span className="font-medium">{item.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={14} className="text-blue-500" />
                  <span className="font-medium">{item.celular}</span>
                </div>
              </div>
              );
            }
          },
          {
            key: 'cpf',
            title: 'CPF',
            render: (value: unknown) => (
              <span className="text-sm font-bold text-slate-600">{String(value)}</span>
            )
          },
          {
            key: 'enderecos',
            title: 'Endereços',
            render: (value: unknown, item: Passageiro) => {
              void value;

              return (
              <div className="space-y-2">
                {item.enderecos.slice(0, 2).map((endereco) => (
                  <div key={endereco.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      <MapPin size={12} className="text-blue-500" />
                      {endereco.rotulo}
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-700 leading-snug">{endereco.enderecoCompleto}</p>
                  </div>
                ))}
                {item.enderecos.length > 2 && (
                  <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">
                    <Layers size={12} />
                    +{item.enderecos.length - 2} endereços
                  </div>
                )}
              </div>
              );
            }
          }
        ]}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nome, CPF ou e-mail"
        emptyMessage="Nenhum passageiro encontrado."
        emptyIcon={<UserSquare2 size={48} />}
      />

      {isModalOpen && (
        <StandardModal
          onClose={() => setIsModalOpen(false)}
          title="Novo Passageiro"
          subtitle="Cadastro prioritário e monitoramento de endereços habituais"
          icon={<UserSquare2 className="w-6 h-6 md:w-7 md:h-7" />}
          maxWidthClassName="max-w-6xl"
          bodyClassName="p-6 md:p-10 pb-16 space-y-12"
        >
          <form onSubmit={handleSubmit} className="space-y-12">
            <section className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <UserSquare2 size={20} className="text-slate-500" /> Detalhes do Passageiro
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome completo</label>
                  <input
                    required
                    placeholder="Ex: Marina Costa"
                    value={formData.nomeCompleto}
                    onChange={(event) => handleInputChange('nomeCompleto', event.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">E-mail</label>
                    <input
                      type="email"
                      required
                      placeholder="contato@exemplo.com"
                      value={formData.email}
                      onChange={(event) => handleInputChange('email', event.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Celular</label>
                    <input
                      required
                      placeholder="(22) 99999-0000"
                      value={formData.celular}
                      onChange={(event) => handleInputChange('celular', event.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">CPF</label>
                    <input
                      required
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(event) => handleInputChange('cpf', event.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2 px-6 py-4 bg-blue-50 border-2 border-blue-100 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Base monitorada</p>
                      <p className="text-lg font-black text-slate-800">{formData.enderecos.length} endereço(s)</p>
                    </div>
                    <ChevronRight size={20} className="text-blue-500" />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <div>
                  <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                    <MapPin size={20} className="text-blue-600" /> Endereços monitorados
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">Registre bases fixas, hotéis, residências e referências operacionais.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddEndereco}
                  className="flex items-center gap-3 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-200 transition-all shadow-sm"
                >
                  <PlusCircle size={14} /> Adicionar endereço
                </button>
              </div>

              <div className="space-y-5 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                {formData.enderecos.map((endereco, index) => (
                  <div key={index} className="relative rounded-[2rem] border-2 border-slate-200 bg-white p-6 shadow-sm">
                    {formData.enderecos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEndereco(index)}
                        className="absolute top-5 right-5 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        aria-label="Remover endereço"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Endereço {index + 1}</p>
                        <p className="text-base font-black text-slate-800">Ponto de apoio / destino recorrente</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Rótulo</label>
                        <input
                          placeholder="Residencial, Base, Hotel..."
                          value={endereco.rotulo}
                          onChange={(event) => handleEnderecoChange(index, 'rotulo', event.target.value)}
                          className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Referência</label>
                        <input
                          placeholder="Portaria azul, torre B, etc"
                          value={endereco.referencia || ''}
                          onChange={(event) => handleEnderecoChange(index, 'referencia', event.target.value)}
                          className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 mt-6">
                      <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Endereço completo</label>
                      <input
                        required
                        placeholder="Rua, número, bairro, cidade - UF"
                        value={endereco.enderecoCompleto}
                        onChange={(event) => handleEnderecoChange(index, 'enderecoCompleto', event.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-12 py-4 bg-[var(--color-geolog-blue)] text-white font-black rounded-xl shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Salvar passageiro
              </button>
            </div>
          </form>
        </StandardModal>
      )}
    </div>
  );
}
