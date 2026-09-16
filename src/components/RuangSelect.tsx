import React, { useState } from 'react';
import { MasterRuang } from '../types';

interface Props {
  value: string;
  onChange: (val: string) => void;
  spaces: string[];
  onQuickAddRuang?: (nama: string) => Promise<MasterRuang | void> | void;
  className?: string;
  required?: boolean;
  allowAddNew?: boolean;
}

export default function RuangSelect({ value, onChange, spaces, onQuickAddRuang, className, required, allowAddNew = true }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const confirmAdd = async () => {
    const name = draft.trim();
    if (!name) return;
    if (onQuickAddRuang) await onQuickAddRuang(name);
    onChange(name);
    setIsAdding(false);
    setDraft('');
  };

  if (isAdding) {
    return (
      <div className="flex gap-1">
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); confirmAdd(); }
            if (e.key === 'Escape') { setIsAdding(false); setDraft(''); }
          }}
          placeholder="Nama ruangan/lokasi baru..."
          className={className}
        />
        <button
          type="button"
          onClick={confirmAdd}
          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shrink-0"
        >
          Simpan
        </button>
        <button
          type="button"
          onClick={() => { setIsAdding(false); setDraft(''); }}
          className="px-2.5 py-1 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg text-[10px] font-semibold shrink-0"
        >
          Batal
        </button>
      </div>
    );
  }

  const currentIsKnown = spaces.includes(value);

  return (
    <select
      required={required}
      value={currentIsKnown ? value : (value ? '__unlisted__' : spaces[0] || '')}
      onChange={(e) => {
        if (e.target.value === '__add_new__') {
          setIsAdding(true);
        } else {
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      {!currentIsKnown && value && (
        <option value="__unlisted__">{value} (belum ada di Master Ruangan)</option>
      )}
      {spaces.map(sp => (
        <option key={sp} value={sp}>{sp}</option>
      ))}
      {allowAddNew && (
        <option value="__add_new__">+ Tambah Ruangan / Lokasi Baru...</option>
      )}
    </select>
  );
}
