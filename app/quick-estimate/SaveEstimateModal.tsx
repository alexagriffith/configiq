// Stub — implement save/export estimate modal

'use client'

import * as React from 'react'

interface SaveEstimateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; tags: string; notes: string }) => void
  [key: string]: unknown
}

export function SaveEstimateModal({ isOpen, onClose, onSave }: SaveEstimateModalProps) {
  const [name, setName] = React.useState('')

  if (!isOpen) return null

  return (
    <div role="dialog" aria-modal="true">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Estimate name" />
      <button onClick={() => { onSave({ name, tags: '', notes: '' }); onClose() }}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  )
}
