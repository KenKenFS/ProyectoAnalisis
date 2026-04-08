import { createPortal } from 'react-dom'

export default function ModalPortal({ children, overlayClassName = '' }) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      data-app-portal
      className={`fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/50 p-4 ${overlayClassName}`}
    >
      {children}
    </div>,
    document.body
  )
}
