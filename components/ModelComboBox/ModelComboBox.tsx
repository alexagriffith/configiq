'use client'

import * as React from 'react'
import styles from './ModelComboBox.module.css'

export interface ComboBoxItem {
  value: string
  label: string
  group: string
}

interface ComboBoxProps {
  value: string
  onChange: (value: string) => void
  items: ComboBoxItem[]
  placeholder?: string
  id?: string
  allowCustom?: boolean
}

interface GroupedItems {
  group: string
  items: ComboBoxItem[]
}

function groupItems(items: ComboBoxItem[]): GroupedItems[] {
  const map = new Map<string, ComboBoxItem[]>()
  for (const item of items) {
    if (!map.has(item.group)) map.set(item.group, [])
    map.get(item.group)!.push(item)
  }
  return Array.from(map, ([group, items]) => ({ group, items }))
}

function highlightMatch(text: string, query: string) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span className={styles.matchHighlight}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

export function ComboBox({ value, onChange, items, placeholder, id, allowCustom = false }: ComboBoxProps) {
  const [open, setOpen] = React.useState(false)
  const [filter, setFilter] = React.useState('')
  const [focusIndex, setFocusIndex] = React.useState(-1)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const selectedItem = items.find(i => i.value === value)
  const displayValue = open ? filter : (selectedItem?.label ?? value)

  const filtered = React.useMemo(() => {
    if (!filter) return items
    const q = filter.toLowerCase()
    return items.filter(i =>
      i.label.toLowerCase().includes(q) ||
      i.value.toLowerCase().includes(q) ||
      i.group.toLowerCase().includes(q)
    )
  }, [items, filter])

  const groups = React.useMemo(() => groupItems(filtered), [filtered])

  const flatItems = React.useMemo(() => {
    const flat: ComboBoxItem[] = []
    for (const g of groups) flat.push(...g.items)
    return flat
  }, [groups])

  const exactMatch = items.some(i => i.value.toLowerCase() === filter.toLowerCase() || i.label.toLowerCase() === filter.toLowerCase())
  const showCustom = allowCustom && open && filter.trim() && !exactMatch

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setFilter('')
        setFocusIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  React.useEffect(() => {
    if (open && focusIndex >= 0 && menuRef.current) {
      const item = menuRef.current.querySelector(`[data-index="${focusIndex}"]`)
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, focusIndex])

  function select(val: string) {
    onChange(val)
    setOpen(false)
    setFilter('')
    setFocusIndex(-1)
    inputRef.current?.blur()
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFilter(e.target.value)
    setFocusIndex(-1)
    if (!open) setOpen(true)
  }

  function handleInputFocus() {
    setOpen(true)
    setFilter('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const totalItems = flatItems.length + (showCustom ? 1 : 0)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusIndex(prev => (prev + 1) % totalItems)
        if (!open) setOpen(true)
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusIndex(prev => (prev <= 0 ? totalItems - 1 : prev - 1))
        if (!open) setOpen(true)
        break
      case 'Enter':
        e.preventDefault()
        if (focusIndex >= 0 && focusIndex < flatItems.length) {
          select(flatItems[focusIndex].value)
        } else if (focusIndex === flatItems.length && showCustom) {
          select(filter.trim())
        } else if (allowCustom && filter.trim()) {
          select(filter.trim())
        } else if (flatItems.length === 1) {
          select(flatItems[0].value)
        }
        break
      case 'Escape':
        setOpen(false)
        setFilter('')
        setFocusIndex(-1)
        inputRef.current?.blur()
        break
      case 'Tab':
        setOpen(false)
        setFilter('')
        setFocusIndex(-1)
        break
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setFilter('')
    setFocusIndex(-1)
    inputRef.current?.focus()
  }

  function handleChevronClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (open) {
      setOpen(false)
      setFilter('')
      setFocusIndex(-1)
    } else {
      setOpen(true)
      setFilter('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={`${styles.toggle} ${open ? styles.toggleOpen : ''}`}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          className={styles.input}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Type or select...'}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-listbox` : undefined}
          aria-activedescendant={focusIndex >= 0 ? `opt-${focusIndex}` : undefined}
        />
        {value && !open && (
          <button
            type="button"
            className={styles.clear}
            onClick={handleClear}
            aria-label="Clear selection"
            tabIndex={-1}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <div
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          onClick={handleChevronClick}
          aria-hidden="true"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {open && (
        <div
          className={styles.menu}
          ref={menuRef}
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
        >
          {groups.length === 0 && !showCustom && (
            <div className={styles.empty}>No matches</div>
          )}

          {groups.map(group => (
            <React.Fragment key={group.group}>
              {group.group && (
                <div className={styles.groupLabel}>{group.group}</div>
              )}
              {group.items.map(item => {
                const idx = flatItems.indexOf(item)
                const isSelected = item.value === value
                const isFocused = idx === focusIndex
                return (
                  <div
                    key={item.value}
                    id={`opt-${idx}`}
                    data-index={idx}
                    role="option"
                    aria-selected={isSelected}
                    className={
                      `${styles.option}` +
                      `${isFocused ? ` ${styles.optionFocused}` : ''}` +
                      `${isSelected ? ` ${styles.optionSelected}` : ''}`
                    }
                    onMouseDown={e => { e.preventDefault(); select(item.value) }}
                    onMouseEnter={() => setFocusIndex(idx)}
                  >
                    <span className={styles.optionName}>
                      {highlightMatch(item.label, filter)}
                    </span>
                  </div>
                )
              })}
            </React.Fragment>
          ))}

          {showCustom && (
            <div
              id={`opt-${flatItems.length}`}
              data-index={flatItems.length}
              role="option"
              aria-selected={false}
              className={
                `${styles.option} ${styles.customOption}` +
                `${focusIndex === flatItems.length ? ` ${styles.optionFocused}` : ''}`
              }
              onMouseDown={e => { e.preventDefault(); select(filter.trim()) }}
              onMouseEnter={() => setFocusIndex(flatItems.length)}
            >
              <span className={styles.customOptionLabel}>Use:</span>
              {filter.trim()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
