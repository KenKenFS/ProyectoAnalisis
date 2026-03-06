import { createPortal } from 'react-dom'

export default function ModalPortal({ children, overlayClassName = '' }) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={`fixed top-0 left-0 w-screen h-screen bg-black/50 z-[200] p-4 ${overlayClassName}`}>
      {children}
    </div>,
    document.body
  )
}
