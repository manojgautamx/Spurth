// Web fallback for react-native-modal-datetime-picker, which has no web
// implementation and silently renders nothing there (isVisible toggling had
// no visual effect at all). Mirrors the native API surface actually used in
// this app: isVisible, mode ('date' | 'time'), date, onConfirm(Date), onCancel().
import React, { useState } from 'react';

const toDateInputValue = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toTimeInputValue = (d) => {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

export default function DateTimePickerModal({ isVisible, mode, date, maximumDate, minimumDate, onConfirm, onCancel }) {
  const isTime = mode === 'time';
  const initial = date instanceof Date && !isNaN(date) ? date : new Date();
  const [value, setValue] = useState(isTime ? toTimeInputValue(initial) : toDateInputValue(initial));

  if (!isVisible) return null;

  const handleConfirm = () => {
    if (!value) { onCancel?.(); return; }
    const result = new Date(initial);
    if (isTime) {
      const [h, m] = value.split(':').map(Number);
      result.setHours(h, m, 0, 0);
    } else {
      const [y, m, d] = value.split('-').map(Number);
      result.setFullYear(y, m - 1, d);
    }
    onConfirm?.(result);
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <input
          type={isTime ? 'time' : 'date'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          max={!isTime && maximumDate ? toDateInputValue(maximumDate) : undefined}
          min={!isTime && minimumDate ? toDateInputValue(minimumDate) : undefined}
          style={styles.input}
          autoFocus
        />
        <div style={styles.actions}>
          <button type="button" style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button type="button" style={styles.confirmBtn} onClick={handleConfirm}>OK</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  card: {
    background: '#1A1A1A',
    border: '1px solid #333',
    borderRadius: 16,
    padding: 22,
    width: 280,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    background: '#111',
    color: '#fff',
    border: '1px solid #333',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 15,
    colorScheme: 'dark',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 14,
    marginTop: 18,
  },
  cancelBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: 15,
    cursor: 'pointer',
    padding: '6px 8px',
  },
  confirmBtn: {
    background: '#D44FDD',
    border: 'none',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: 20,
    padding: '8px 18px',
  },
};
