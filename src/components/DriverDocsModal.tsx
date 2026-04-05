import React, { useState, useEffect, useRef } from 'react';
import StandardModal from '@/components/StandardModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { motion } from 'framer-motion';
import { 
  UploadCloud, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  File, 
  Trash2, 
  Loader2, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DriverDoc {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  created_at: string;
  path: string;
}

interface DriverDocsModalProps {
  driver: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function DriverDocsModal({ driver, isOpen, onClose }: DriverDocsModalProps) {
  const { confirm, confirmState, closeConfirm, handleConfirm } = useConfirm();
  const [documents, setDocuments] = useState<DriverDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchDocs = async () => {
    const { data, error } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao buscar documentos:", JSON.stringify(error, null, 2));
      setError("Erro ao carregar documentos.");
    } else {
      setDocs(data as DriverDoc[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();

    // Set up real-time subscription
    const channel = supabase
      .channel(`driver-docs-${driverId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'driver_documents',
          filter: `driver_id=eq.${driverId}`
        },
        () => {
          fetchDocs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, supabase]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("O arquivo é muito grande. Máximo 10MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(10); // Start progress
    setError(null);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${driverId}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('driver-docs')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      const { data: { publicUrl } } = supabase.storage
        .from('driver-docs')
        .getPublicUrl(filePath);
      
      const { error: dbError } = await supabase
        .from('driver_documents')
        .insert([
          {
            driver_id: driverId,
            name: file.name,
            url: publicUrl,
            type: file.type,
            size: file.size,
            path: filePath
          }
        ]);

      if (dbError) throw dbError;

      setUploadProgress(100);
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error("Erro geral no upload:", err);
      setError(`Erro no upload: ${err.message || "Ocorreu um erro inesperado."}`);
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docObj: DriverDoc) => {
    const confirmed = await confirm({
      title: 'Excluir Documento',
      message: `Tem certeza que deseja excluir o documento "${docObj.type}"?`,
      confirmText: 'Sim, excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    
    if (!confirmed) return;

    try {
      // Delete from Storage
      const { error: storageError } = await supabase.storage
        .from('driver-docs')
        .remove([docObj.path]);

      if (storageError) throw storageError;

      // Delete from Database
      const { error: dbError } = await supabase
        .from('driver_documents')
        .delete()
        .eq('id', docObj.id);

      if (dbError) throw dbError;
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      setError(`Erro ao excluir: ${err.message || "Erro ao excluir o documento."}`);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="text-red-400" size={24} />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) 
      return <FileSpreadsheet className="text-emerald-400" size={24} />;
    if (type.includes('image')) return <ImageIcon className="text-blue-400" size={24} />;
    return <File className="text-gray-400" size={24} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <StandardModal
      onClose={onClose}
      title="Documentações"
      subtitle={`Motorista: ${driverName}`}
      icon={<FileText className="w-6 h-6 md:w-7 md:h-7" />}
      maxWidthClassName="max-w-3xl"
      bodyClassName="p-6 md:p-10 space-y-10"
      footer={
        <div className="p-6 md:p-8 bg-slate-50/80 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all text-xs uppercase tracking-[0.2em] shadow-sm"
          >
            Fechar Janela
          </button>
        </div>
      }
    >
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Upload Area */}
          <div className="space-y-6">
            <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
              <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                <UploadCloud size={20} className="text-slate-500" /> Upload de Arquivos
              </h3>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group relative overflow-hidden bg-slate-50/50"
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
                accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
              />
              <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                {uploading ? <Loader2 className="text-blue-600 animate-spin" size={32} /> : <UploadCloud className="text-blue-600" size={32} />}
              </div>
              <div className="text-center space-y-1">
                <p className="font-black text-slate-800 text-lg">Clique para fazer upload</p>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">PDF, Excel ou Imagens (Máx: 10MB)</p>
              </div>
              
              {uploading && (
                <div className="w-full max-w-sm mt-6 space-y-2 animate-in fade-in zoom-in">
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                    />
                  </div>
                  <p className="text-xs text-center font-black text-blue-600 uppercase tracking-widest">{Math.round(uploadProgress)}% concluído</p>
                </div>
              )}
            </div>
          </div>

          {/* Docs List */}
          <div className="space-y-6">
            <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
              <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                <FileText size={20} className="text-slate-500" /> Arquivos Enviados
              </h3>
            </div>
            
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-3xl border border-slate-100 border-dashed">
                <Loader2 className="animate-spin text-blue-500" size={32} />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando arquivos...</p>
              </div>
            ) : docs.length === 0 ? (
              <div className="py-20 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300">
                  <File size={32} />
                </div>
                <p className="text-slate-400 font-bold italic">Nenhum documento anexado ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {docs.map((docObj) => (
                  <div 
                    key={docObj.id}
                    className="bg-white border-2 border-slate-100 p-5 rounded-2xl flex items-center justify-between group hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        {getFileIcon(docObj.type)}
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-slate-800 text-[15px] line-clamp-1">{docObj.name}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">{formatSize(docObj.size)}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">{new Date(docObj.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <a 
                        href={docObj.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Visualizar/Abrir"
                      >
                        <ExternalLink size={20} />
                      </a>
                      <button 
                        onClick={() => handleDeleteDoc(docObj)}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
    </StandardModal>
    
    <ConfirmDialog
      isOpen={confirmState.isOpen}
      onClose={closeConfirm}
      onConfirm={handleConfirm}
      title={confirmState.title}
      message={confirmState.message}
      confirmText={confirmState.confirmText}
      cancelText={confirmState.cancelText}
      type={confirmState.type}
    />
  );
}
