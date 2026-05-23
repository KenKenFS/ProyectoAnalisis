import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getFloorPlan, saveFloorPlan } from '@shared/firebase/firestore'
import {
  DEFAULT_SECTION_CANVAS_WIDTH,
  DEFAULT_SECTION_CANVAS_HEIGHT,
  clampCanvasSize,
  getDefaultSectionCanvasSize,
} from '../components/floorplan/canvasConfig'

const DEFAULT_CANVAS = getDefaultSectionCanvasSize()

function newSectionId() {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function freshSection(name = 'Salón Principal', color = '#bbf7d0', size = null) {
  const dims = size || getDefaultSectionCanvasSize()
  return {
    id: newSectionId(),
    name,
    color,
    canvasWidth: dims.width,
    canvasHeight: dims.height,
    elements: [],
  }
}

function freshDraft() {
  const principal = freshSection()
  return {
    sections: [principal],
    activeSectionId: principal.id,
  }
}

/**
 * Migra y normaliza un documento `floorPlan/main`.
 * Soporta el esquema anterior (sections como zonas dentro de un canvas único +
 * elements en la raíz) convirtiéndolo a secciones-como-planos independientes.
 */
function normalizeDraft(plan) {
  if (!plan) return freshDraft()

  // Esquema nuevo: secciones que ya contienen su propio canvas/elements
  if (Array.isArray(plan.sections) && plan.sections.length > 0 && plan.sections[0]?.elements != null) {
    const sections = plan.sections.map((s) => {
      const w = Number(s.canvasWidth)
      const h = Number(s.canvasHeight)
      const fallback = getDefaultSectionCanvasSize()
      return {
        id: s.id || newSectionId(),
        name: String(s.name || 'Sección'),
        color: String(s.color || '#bbf7d0'),
        canvasWidth: Number.isFinite(w) && w > 0 ? w : fallback.width,
        canvasHeight: Number.isFinite(h) && h > 0 ? h : fallback.height,
        elements: Array.isArray(s.elements) ? s.elements.map((e) => ({ ...e })) : [],
      }
    })
    const activeSectionId =
      sections.find((s) => s.id === plan.activeSectionId)?.id || sections[0].id
    return { sections, activeSectionId }
  }

  // Esquema antiguo: elements en raíz, sections como zonas decorativas.
  const legacyElements = Array.isArray(plan.elements)
    ? plan.elements.map((e) => ({ ...e }))
    : []
  const principal = freshSection('Salón Principal')
  const legacyW = Number(plan.canvasWidth)
  const legacyH = Number(plan.canvasHeight)
  const legacySize = clampCanvasSize(
    Number.isFinite(legacyW) && legacyW > 0 ? legacyW : DEFAULT_CANVAS.width,
    Number.isFinite(legacyH) && legacyH > 0 ? legacyH : DEFAULT_CANVAS.height
  )
  principal.canvasWidth = legacySize.width
  principal.canvasHeight = legacySize.height
  principal.elements = legacyElements.map((el) => {
    const cleaned = { ...el }
    delete cleaned.sectionId
    return cleaned
  })
  return { sections: [principal], activeSectionId: principal.id }
}

function stableSerialize(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function cloneDraftState(d) {
  return JSON.parse(JSON.stringify(d))
}

const MAX_UNDO = 50

/**
 * Estado editable del plano. Cada sección es un canvas independiente.
 *
 * API:
 *  - draft, activeSection, activeSectionId
 *  - dirty, loading, saving, error, success
 *  - setActiveSection(id)
 *  - addSection({name}), updateSection(id, patch), removeSection(id)
 *  - addElement(element) | updateElement(id, patch) | removeElement(id) → en sección activa
 *  - moveElementToSection(id, targetSectionId)
 *  - resetFromServer(), save()
 */
export function useFloorPlanDraft({ userUid = null } = {}) {
  const [draft, setDraft] = useState(freshDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const baselineRef = useRef(stableSerialize(freshDraft()))
  const undoStackRef = useRef([])
  const [canUndo, setCanUndo] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const plan = await getFloorPlan()
        const normalized = normalizeDraft(plan)
        if (!mounted) return
        setDraft(normalized)
        baselineRef.current = stableSerialize(normalized)
        undoStackRef.current = []
        setCanUndo(false)
        setError('')
      } catch (e) {
        if (mounted) setError(e?.message || 'No se pudo cargar el plano.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const dirty = useMemo(() => stableSerialize(draft) !== baselineRef.current, [draft])

  const activeSection = useMemo(
    () =>
      (draft.sections || []).find((s) => s.id === draft.activeSectionId) ||
      (draft.sections || [])[0] ||
      null,
    [draft]
  )

  const setActiveSection = useCallback((id) => {
    setDraft((prev) => ({ ...prev, activeSectionId: id }))
  }, [])

  const addSection = useCallback(({ name, color, canvasWidth, canvasHeight } = {}) => {
    let newId = null
    setDraft((prev) => {
      const count = (prev.sections || []).length + 1
      const dims = clampCanvasSize(
        canvasWidth ?? DEFAULT_SECTION_CANVAS_WIDTH,
        canvasHeight ?? DEFAULT_SECTION_CANVAS_HEIGHT
      )
      const section = freshSection(name || `Sección ${count}`, color, dims)
      newId = section.id
      return {
        ...prev,
        sections: [...(prev.sections || []), section],
        activeSectionId: section.id,
      }
    })
    return newId
  }, [])

  const updateSection = useCallback((id, patch) => {
    setDraft((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }, [])

  const removeSection = useCallback((id) => {
    setDraft((prev) => {
      const remaining = (prev.sections || []).filter((s) => s.id !== id)
      if (remaining.length === 0) {
        const principal = freshSection('Salón Principal')
        return { sections: [principal], activeSectionId: principal.id }
      }
      const nextActive =
        prev.activeSectionId === id ? remaining[0].id : prev.activeSectionId
      return { ...prev, sections: remaining, activeSectionId: nextActive }
    })
  }, [])

  const addElement = useCallback(
    (element) => {
      const targetId = draft.activeSectionId
      setDraft((prev) => ({
        ...prev,
        sections: (prev.sections || []).map((s) =>
          s.id === targetId ? { ...s, elements: [...s.elements, element] } : s
        ),
      }))
    },
    [draft.activeSectionId]
  )

  const updateElement = useCallback(
    (id, patch) => {
      const targetId = draft.activeSectionId
      setDraft((prev) => ({
        ...prev,
        sections: (prev.sections || []).map((s) =>
          s.id === targetId
            ? {
                ...s,
                elements: s.elements.map((el) =>
                  el.id === id ? { ...el, ...patch } : el
                ),
              }
            : s
        ),
      }))
    },
    [draft.activeSectionId]
  )

  const removeElement = useCallback(
    (id) => {
      const targetId = draft.activeSectionId
      setDraft((prev) => ({
        ...prev,
        sections: (prev.sections || []).map((s) =>
          s.id === targetId
            ? { ...s, elements: s.elements.filter((el) => el.id !== id) }
            : s
        ),
      }))
    },
    [draft.activeSectionId]
  )

  const moveElementToSection = useCallback((id, targetSectionId) => {
    setDraft((prev) => {
      let moved = null
      const sections = (prev.sections || []).map((s) => {
        const found = s.elements.find((el) => el.id === id)
        if (found) moved = found
        return { ...s, elements: s.elements.filter((el) => el.id !== id) }
      })
      if (!moved) return prev
      return {
        ...prev,
        sections: sections.map((s) =>
          s.id === targetSectionId ? { ...s, elements: [...s.elements, moved] } : s
        ),
        activeSectionId: targetSectionId,
      }
    })
  }, [])

  const setSectionCanvasSize = useCallback(
    ({ width, height }) => {
      const targetId = draft.activeSectionId
      const next = clampCanvasSize(
        width != null ? width : draft.sections?.find((s) => s.id === targetId)?.canvasWidth,
        height != null ? height : draft.sections?.find((s) => s.id === targetId)?.canvasHeight
      )
      setDraft((prev) => ({
        ...prev,
        sections: (prev.sections || []).map((s) =>
          s.id === targetId
            ? {
                ...s,
                canvasWidth: next.width,
                canvasHeight: next.height,
              }
            : s
        ),
      }))
    },
    [draft.activeSectionId, draft.sections]
  )

  const pushUndoSnapshot = useCallback(() => {
    setDraft((current) => {
      undoStackRef.current.push(cloneDraftState(current))
      if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift()
      setCanUndo(undoStackRef.current.length > 0)
      return current
    })
  }, [])

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop()
    if (prev) {
      setDraft(prev)
    }
    setCanUndo(undoStackRef.current.length > 0)
  }, [])

  const resetFromServer = useCallback(async () => {
    setLoading(true)
    setSuccess('')
    setError('')
    try {
      const plan = await getFloorPlan()
      const normalized = normalizeDraft(plan)
      setDraft(normalized)
      baselineRef.current = stableSerialize(normalized)
      undoStackRef.current = []
      setCanUndo(false)
    } catch (e) {
      setError(e?.message || 'No se pudo recargar el plano.')
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await saveFloorPlan(draft, userUid)
      baselineRef.current = stableSerialize(draft)
      setSuccess('Plano guardado.')
      setTimeout(() => setSuccess(''), 2500)
    } catch (e) {
      setError(e?.message || 'No se pudo guardar el plano.')
    } finally {
      setSaving(false)
    }
  }, [draft, saving, userUid])

  return {
    draft,
    activeSection,
    activeSectionId: draft.activeSectionId,
    loading,
    saving,
    error,
    success,
    dirty,
    setError,
    setActiveSection,
    addSection,
    updateSection,
    removeSection,
    setSectionCanvasSize,
    addElement,
    updateElement,
    removeElement,
    moveElementToSection,
    resetFromServer,
    save,
    pushUndoSnapshot,
    undo,
    canUndo,
  }
}
