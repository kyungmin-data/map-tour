'use client'

import Link from 'next/link'

interface PromptAction {
  label: string
  href?: string
  onClick?: () => void
  primary?: boolean
}

interface Props {
  message: string
  actions: PromptAction[]
  onDismiss: () => void
}

export default function PromptModal({ message, actions, onDismiss }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onDismiss}
    >
      <div
        className="bg-white rounded-2xl shadow-xl mx-4 max-w-xs w-full p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-gray-800 leading-7 whitespace-pre-line">{message}</p>
        <div className="space-y-2">
          {actions.map((action, i) =>
            action.href ? (
              <Link
                key={i}
                href={action.href}
                className={`block w-full text-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  action.primary
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={i}
                onClick={action.onClick}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  action.primary
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {action.label}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
