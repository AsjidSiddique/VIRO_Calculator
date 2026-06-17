'use client'
import { useState, useEffect, createContext, useContext, useCallback } from 'react'

const ToastCtx = createContext(null)

let _addToast = null

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  useEffect(() => { _addToast = add }, [add])

  const icons = { success: '✅', error: '❌', info: 'ℹ️' }
  const colors = {
    success: 'bg-white border-green-200 text-gray-800',
    error:   'bg-white border-red-200   text-gray-800',
    info:    'bg-white border-blue-200  text-gray-800',
  }

  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-lg text-sm font-medium slide-up pointer-events-auto ${colors[t.type]}`}>
            <span>{icons[t.type]}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const toast = {
  success: (msg) => _addToast?.(msg, 'success'),
  error:   (msg) => _addToast?.(msg, 'error'),
  info:    (msg) => _addToast?.(msg, 'info'),
}
