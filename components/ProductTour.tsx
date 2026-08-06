// Stub — implement guided product tour

'use client'

import * as React from 'react'

export interface TourStep {
  target: string
  title: string
  content?: string
  description?: string
  position?: string
}

interface ProductTourProps {
  steps: TourStep[]
  tourId?: string
  isOpen?: boolean
  onClose?: () => void
  onComplete?: () => void
  [key: string]: unknown
}

export function ProductTour(_props: ProductTourProps) {
  return null
}
