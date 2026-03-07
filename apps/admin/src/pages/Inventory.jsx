import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  CubeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  XMarkIcon,
  PhotoIcon,
  EyeIcon,
  ArrowLeftIcon,
  ScissorsIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { getProductos, getCategorias, createProducto, updateProducto, deleteProducto, uploadProductImage, getInventarioItems, registrarEntradaInsumo, getEntradasInsumos, registrarSalidaInsumo, getSalidasInsumos, updateInsumo, deleteInsumo, ajustarStockInsumo, createConteoFisico, getConteoFisico, addItemToConteo, removeItemFromConteo, aplicarConteoFisico, cancelarConteoFisico, getConteosFisicos, getAlertasCaducidad } from '@shared/firebase/firestore'
import { useAuth } from '@shared/firebase/AuthContext'
import ModalPortal from '@shared/layout/ModalPortal'

// Aspect ratio 16:10 para coincidir con el h-40 de las cards
const CROP_ASPECT = 16 / 10

function getCroppedBlob(image, crop) {
  const canvas = document.createElement('canvas')
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  const pixelCrop = {
    x: crop.x * scaleX,
    y: crop.y * scaleY,
    width: crop.width * scaleX,
    height: crop.height * scaleY,
  }
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height,
  )
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9)
  })
}

export default function Inventory() {
  const { user: currentAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('stock')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')

  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loadingProductos, setLoadingProductos] = useState(true)

  // Modal de creacion
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ nombre: '', descripcion: '', precio: '', categoria: '', nuevaCategoria: '' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [creating, setCreating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Modal de edicion
  const [editProduct, setEditProduct] = useState(null)
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', precio: '', categoria: '', nuevaCategoria: '' })
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState(null)
  const [editRemoveImage, setEditRemoveImage] = useState(false)
  const [editMotivoPrecio, setEditMotivoPrecio] = useState('')
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editing, setEditing] = useState(false)

  // Modal de eliminacion
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Cropper compartido (create y edit)
  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState(undefined)
  const [completedCrop, setCompletedCrop] = useState(null)
  const [cropTarget, setCropTarget] = useState(null)
  const cropImgRef = useRef(null)

  // Inventario (stock real)
  const [insumos, setInsumos] = useState([])
  const [loadingInsumos, setLoadingInsumos] = useState(true)
  const [stockSubTab, setStockSubTab] = useState('stock') // 'stock' | 'nueva' | 'salida' | 'alertas' | 'conteo' | 'historial'
  const [historyType, setHistoryType] = useState('entradas') // 'entradas' | 'salidas' | 'conteos'

  // Entradas
  const [entradas, setEntradas] = useState([])
  const [loadingEntradas, setLoadingEntradas] = useState(false)

  // Formulario de nueva entrada
  const [entradaForm, setEntradaForm] = useState({ nombre: '', cantidad: '', unidad: '', precioUnitario: '', fechaCaducidad: '' })
  const [entradaError, setEntradaError] = useState('')
  const [entradaSuccess, setEntradaSuccess] = useState('')
  const [registrando, setRegistrando] = useState(false)

  // Salidas
  const [salidas, setSalidas] = useState([])
  const [loadingSalidas, setLoadingSalidas] = useState(false)
  const [salidaForm, setSalidaForm] = useState({ insumoId: '', cantidad: '', motivo: '' })
  const [salidaError, setSalidaError] = useState('')
  const [salidaSuccess, setSalidaSuccess] = useState('')
  const [registrandoSalida, setRegistrandoSalida] = useState(false)

  // Edicion de insumo
  const [editInsumo, setEditInsumo] = useState(null)
  const [editInsumoForm, setEditInsumoForm] = useState({ nombre: '', unidad: '', minCantidad: '' })
  const [editInsumoError, setEditInsumoError] = useState('')
  const [savingInsumo, setSavingInsumo] = useState(false)

  // Eliminacion de insumo
  const [deleteInsumoTarget, setDeleteInsumoTarget] = useState(null)
  const [deletingInsumo, setDeletingInsumo] = useState(false)
  const [deleteInsumoError, setDeleteInsumoError] = useState('')

  // Ajuste manual de stock
  const [ajusteTarget, setAjusteTarget] = useState(null)
  const [ajusteCantidad, setAjusteCantidad] = useState('')
  const [ajusteError, setAjusteError] = useState('')
  const [ajustando, setAjustando] = useState(false)

  // Conteo fisico
  const [conteoId, setConteoId] = useState(null)
  const [conteoData, setConteoData] = useState(null)
  const [conteoForm, setConteoForm] = useState({ insumoId: '', cantidadContada: '' })
  const [conteoError, setConteoError] = useState('')
  const [conteoLoading, setConteoLoading] = useState(false)
  const [conteosHistorial, setConteosHistorial] = useState([])
  const [conteosHistorialLoading, setConteosHistorialLoading] = useState(false)
  const [conteoExpandedId, setConteoExpandedId] = useState(null)

  // Alertas de caducidad
  const [alertasCaducidad, setAlertasCaducidad] = useState([])
  const [loadingAlertas, setLoadingAlertas] = useState(false)
  const [alertasFiltro, setAlertasFiltro] = useState('todos')
  const [alertasVistas, setAlertasVistas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('alertas_caducidad_vistas') || '[]') } catch (_e) { return [] }
  })
  const [mostrarVistas, setMostrarVistas] = useState(false)

  const loadProductos = useCallback(async () => {
    setLoadingProductos(true)
    try {
      const [prods, cats] = await Promise.all([getProductos(), getCategorias()])
      setProductos(prods)
      setCategorias(cats)
    } catch (err) {
      console.error('Error cargando productos:', err.message)
    } finally {
      setLoadingProductos(false)
    }
  }, [])

  useEffect(() => { loadProductos() }, [loadProductos])

  const loadInsumos = useCallback(async () => {
    setLoadingInsumos(true)
    const data = await getInventarioItems()
    setInsumos(data)
    setLoadingInsumos(false)
  }, [])

  const loadEntradas = useCallback(async () => {
    setLoadingEntradas(true)
    const data = await getEntradasInsumos()
    setEntradas(data)
    setLoadingEntradas(false)
  }, [])

  useEffect(() => { loadInsumos() }, [loadInsumos])

  const lowStockCount = insumos.filter(i => (i.cantidad || 0) <= (i.minCantidad || 10)).length

  const filteredInventory = insumos.filter(i =>
    (i.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleRegistrarEntrada = async () => {
    setEntradaError('')
    setEntradaSuccess('')
    setRegistrando(true)
    try {
      await registrarEntradaInsumo({
        nombre: entradaForm.nombre.trim(),
        cantidad: entradaForm.cantidad,
        unidad: (entradaInsumoMatch?.unidad || entradaForm.unidad).trim(),
        precioUnitario: entradaForm.precioUnitario,
        fechaCaducidad: entradaForm.fechaCaducidad || null,
        adminUid: currentAdmin?.uid || '',
      })
      setEntradaSuccess('Entrada registrada exitosamente.')
      setEntradaForm({ nombre: '', cantidad: '', unidad: '', precioUnitario: '', fechaCaducidad: '' })
      loadInsumos()
      loadEntradas()
      setTimeout(() => setEntradaSuccess(''), 3000)
    } catch (err) {
      setEntradaError(err.message)
    } finally {
      setRegistrando(false)
    }
  }

  const UNIDADES = ['kg', 'g', 'litro', 'ml', 'unidad', 'docena', 'manojo', 'libra', 'onza', 'botella', 'caja', 'bolsa']
  const MOTIVOS_SALIDA = [
    { value: 'consumo', label: 'Consumo' },
    { value: 'desperdicio', label: 'Desperdicio' },
    { value: 'merma', label: 'Merma' },
    { value: 'vencimiento', label: 'Vencimiento' },
    { value: 'otro', label: 'Otro' },
  ]

  const insumosExistentes = useMemo(() => [...new Set(insumos.map(i => i.nombre).filter(Boolean))].sort(), [insumos])

  const entradaInsumoMatch = useMemo(() => {
    if (!entradaForm.nombre.trim()) return null
    return insumos.find(i => i.nombre?.toLowerCase() === entradaForm.nombre.trim().toLowerCase()) || null
  }, [insumos, entradaForm.nombre])

  const loadSalidas = useCallback(async () => {
    setLoadingSalidas(true)
    const data = await getSalidasInsumos()
    setSalidas(data)
    setLoadingSalidas(false)
  }, [])

  const selectedInsumo = useMemo(() => insumos.find(i => i.id === salidaForm.insumoId), [insumos, salidaForm.insumoId])

  const handleRegistrarSalida = async () => {
    setSalidaError('')
    setSalidaSuccess('')
    setRegistrandoSalida(true)
    try {
      await registrarSalidaInsumo({
        insumoId: salidaForm.insumoId,
        cantidad: salidaForm.cantidad,
        motivo: salidaForm.motivo,
        adminUid: currentAdmin?.uid || '',
      })
      setSalidaSuccess('Salida registrada exitosamente.')
      setSalidaForm({ insumoId: '', cantidad: '', motivo: '' })
      loadInsumos()
      loadSalidas()
      setTimeout(() => setSalidaSuccess(''), 3000)
    } catch (err) {
      setSalidaError(err.message)
    } finally {
      setRegistrandoSalida(false)
    }
  }

  const openEditInsumo = (item) => {
    setEditInsumo(item)
    setEditInsumoForm({ nombre: item.nombre || '', unidad: item.unidad || '', minCantidad: String(item.minCantidad ?? 10) })
    setEditInsumoError('')
  }

  const handleEditInsumo = async () => {
    setEditInsumoError('')
    setSavingInsumo(true)
    try {
      await updateInsumo(editInsumo.id, { ...editInsumoForm, adminUid: currentAdmin?.uid || '' })
      setEditInsumo(null)
      loadInsumos()
    } catch (err) {
      setEditInsumoError(err.message)
    } finally {
      setSavingInsumo(false)
    }
  }

  const handleDeleteInsumo = async () => {
    setDeleteInsumoError('')
    setDeletingInsumo(true)
    try {
      await deleteInsumo(deleteInsumoTarget.id, currentAdmin?.uid || '')
      setDeleteInsumoTarget(null)
      loadInsumos()
    } catch (err) {
      setDeleteInsumoError(err.message)
    } finally {
      setDeletingInsumo(false)
    }
  }

  const handleAjusteStock = async () => {
    setAjusteError('')
    setAjustando(true)
    try {
      await ajustarStockInsumo(ajusteTarget.id, ajusteCantidad, currentAdmin?.uid || '')
      setAjusteTarget(null)
      setAjusteCantidad('')
      loadInsumos()
    } catch (err) {
      setAjusteError(err.message)
    } finally {
      setAjustando(false)
    }
  }

  const iniciarConteo = async () => {
    setConteoError('')
    setConteoLoading(true)
    try {
      const id = await createConteoFisico(currentAdmin?.uid || '')
      setConteoId(id)
      const data = await getConteoFisico(id)
      setConteoData(data)
      setConteoForm({ insumoId: '', cantidadContada: '' })
    } catch (err) {
      setConteoError(err.message)
    } finally {
      setConteoLoading(false)
    }
  }

  const loadConteo = useCallback(async () => {
    if (!conteoId) return
    const data = await getConteoFisico(conteoId)
    setConteoData(data)
  }, [conteoId])

  useEffect(() => { loadConteo() }, [loadConteo])

  const agregarItemConteo = async () => {
    setConteoError('')
    if (!conteoForm.insumoId || conteoForm.cantidadContada === '') {
      setConteoError('Seleccione un insumo e ingrese la cantidad contada.')
      return
    }
    setConteoLoading(true)
    try {
      await addItemToConteo(conteoId, conteoForm.insumoId, conteoForm.cantidadContada)
      await loadConteo()
      setConteoForm({ insumoId: '', cantidadContada: '' })
    } catch (err) {
      setConteoError(err.message)
    } finally {
      setConteoLoading(false)
    }
  }

  const quitarItemConteo = async (insumoId) => {
    setConteoError('')
    setConteoLoading(true)
    try {
      await removeItemFromConteo(conteoId, insumoId)
      await loadConteo()
    } catch (err) {
      setConteoError(err.message)
    } finally {
      setConteoLoading(false)
    }
  }

  const aplicarConteo = async () => {
    setConteoError('')
    setConteoLoading(true)
    try {
      await aplicarConteoFisico(conteoId, currentAdmin?.uid || '')
      setConteoId(null)
      setConteoData(null)
      loadInsumos()
      loadConteosHistorial()
    } catch (err) {
      setConteoError(err.message)
    } finally {
      setConteoLoading(false)
    }
  }

  const cancelarConteo = async () => {
    setConteoError('')
    setConteoLoading(true)
    try {
      await cancelarConteoFisico(conteoId)
      setConteoId(null)
      setConteoData(null)
    } catch (err) {
      setConteoError(err.message)
    } finally {
      setConteoLoading(false)
    }
  }

  const loadConteosHistorial = useCallback(async () => {
    setConteosHistorialLoading(true)
    const data = await getConteosFisicos()
    setConteosHistorial(data)
    setConteosHistorialLoading(false)
  }, [])

  const loadAlertasCaducidad = useCallback(async () => {
    setLoadingAlertas(true)
    const data = await getAlertasCaducidad()
    setAlertasCaducidad(data)
    setLoadingAlertas(false)
  }, [])

  useEffect(() => { loadAlertasCaducidad() }, [loadAlertasCaducidad])

  useEffect(() => {
    if (stockSubTab !== 'historial') return
    if (historyType === 'entradas') loadEntradas()
    if (historyType === 'salidas') loadSalidas()
    if (historyType === 'conteos') loadConteosHistorial()
  }, [stockSubTab, historyType, loadEntradas, loadSalidas, loadConteosHistorial])

  const alertasFiltradas = useMemo(() => {
    let list = alertasCaducidad
    if (alertasFiltro === 'vencidos') list = list.filter(a => a.estado === 'vencido')
    else if (alertasFiltro === '3') list = list.filter(a => a.diasRestantes >= 0 && a.diasRestantes <= 3)
    else if (alertasFiltro === '7') list = list.filter(a => a.diasRestantes >= 0 && a.diasRestantes <= 7)
    else if (alertasFiltro === '15') list = list.filter(a => a.diasRestantes >= 0 && a.diasRestantes <= 15)
    else list = list.filter(a => a.estado !== 'ok')

    if (!mostrarVistas) list = list.filter(a => !alertasVistas.includes(a.id))
    return list
  }, [alertasCaducidad, alertasFiltro, alertasVistas, mostrarVistas])

  const marcarAlertaVista = (alertaId) => {
    const updated = [...alertasVistas, alertaId]
    setAlertasVistas(updated)
    localStorage.setItem('alertas_caducidad_vistas', JSON.stringify(updated))
  }

  const restaurarAlertas = () => {
    setAlertasVistas([])
    localStorage.removeItem('alertas_caducidad_vistas')
  }

  const alertasActivas = useMemo(() => {
    return alertasCaducidad.filter(a => a.estado !== 'ok' && !alertasVistas.includes(a.id)).length
  }, [alertasCaducidad, alertasVistas])

  const filteredProductos = useMemo(() => {
    return productos.filter(p => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchName = (p.nombre || '').toLowerCase().includes(q)
        const matchDesc = (p.descripcion || '').toLowerCase().includes(q)
        if (!matchName && !matchDesc) return false
      }
      if (filterCategoria && p.categoria !== filterCategoria) return false
      return true
    })
  }, [productos, searchTerm, filterCategoria])

  const hasFilters = searchTerm || filterCategoria
  const clearFilters = () => { setSearchTerm(''); setFilterCategoria('') }

  // --- Cropper ---

  const openCropper = (file, target) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      target === 'edit' ? setEditError('El archivo debe ser una imagen.') : setCreateError('El archivo debe ser una imagen.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      target === 'edit' ? setEditError('La imagen no debe superar 5 MB.') : setCreateError('La imagen no debe superar 5 MB.')
      return
    }
    setCropSrc(URL.createObjectURL(file))
    setCrop(undefined)
    setCompletedCrop(null)
    setCropTarget(target)
  }

  const onCropImageLoad = (e) => {
    cropImgRef.current = e.currentTarget
    const { width, height } = e.currentTarget
    const cropWidth = Math.min(width, height * CROP_ASPECT)
    const cropHeight = cropWidth / CROP_ASPECT
    setCrop({
      unit: 'px',
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    })
  }

  const handleCropConfirm = async () => {
    if (!cropImgRef.current || !completedCrop?.width || !completedCrop?.height) return
    const blob = await getCroppedBlob(cropImgRef.current, completedCrop)
    if (!blob) return
    const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' })
    const previewUrl = URL.createObjectURL(blob)

    if (cropTarget === 'create') {
      setImageFile(file)
      setImagePreviewUrl(previewUrl)
      setCreateError('')
    } else {
      setEditImageFile(file)
      setEditImagePreviewUrl(previewUrl)
      setEditRemoveImage(false)
      setEditError('')
    }
    closeCropper()
  }

  const closeCropper = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setCrop(undefined)
    setCompletedCrop(null)
    setCropTarget(null)
    cropImgRef.current = null
  }

  // --- Logica del formulario de creacion ---

  const categoriaFinal = createForm.categoria === '__nueva__' ? createForm.nuevaCategoria : createForm.categoria

  const formValid = createForm.nombre.trim()
    && createForm.descripcion.trim()
    && Number(createForm.precio) > 0
    && categoriaFinal.trim()

  const removeImage = () => {
    setImageFile(null)
    setImagePreviewUrl(null)
  }

  const handleShowPreview = () => {
    setCreateError('')
    if (!createForm.nombre.trim()) { setCreateError('El nombre del producto es obligatorio.'); return }
    if (!createForm.descripcion.trim()) { setCreateError('La descripcion es obligatoria.'); return }
    if (!Number(createForm.precio) || Number(createForm.precio) <= 0) { setCreateError('El precio debe ser mayor a cero.'); return }
    if (!categoriaFinal.trim()) { setCreateError('La categoria es obligatoria.'); return }
    setShowPreview(true)
  }

  const handleCreate = async () => {
    setCreating(true)
    setCreateError('')
    setCreateSuccess('')
    try {
      let imagenUrl = null
      if (imageFile) {
        imagenUrl = await uploadProductImage(imageFile)
      }
      await createProducto({
        nombre: createForm.nombre.trim(),
        descripcion: createForm.descripcion.trim(),
        precio: Number(createForm.precio),
        categoria: categoriaFinal.trim(),
        imagen: imagenUrl,
      })
      setCreateSuccess(`"${createForm.nombre.trim()}" creado correctamente.`)
      setCreateForm({ nombre: '', descripcion: '', precio: '', categoria: '', nuevaCategoria: '' })
      setImageFile(null)
      setImagePreviewUrl(null)
      setShowPreview(false)
      await loadProductos()
      setTimeout(() => { setCreateSuccess(''); setShowCreateModal(false) }, 1500)
    } catch (err) {
      setCreateError(err.message)
      setShowPreview(false)
    } finally {
      setCreating(false)
    }
  }

  const resetCreateModal = () => {
    setCreateForm({ nombre: '', descripcion: '', precio: '', categoria: '', nuevaCategoria: '' })
    setImageFile(null)
    setImagePreviewUrl(null)
    setCreateError('')
    setCreateSuccess('')
    setShowPreview(false)
    setShowCreateModal(false)
  }

  // --- Logica de edicion ---

  const openEditModal = (producto) => {
    setEditProduct(producto)
    setEditForm({
      nombre: producto.nombre || '',
      descripcion: producto.descripcion || '',
      precio: String(producto.precio || ''),
      categoria: producto.categoria || '',
      nuevaCategoria: '',
    })
    setEditImageFile(null)
    setEditImagePreviewUrl(producto.imagen || null)
    setEditRemoveImage(false)
    setEditMotivoPrecio('')
    setEditError('')
    setEditSuccess('')
  }

  const resetEditModal = () => {
    setEditProduct(null)
    setEditForm({ nombre: '', descripcion: '', precio: '', categoria: '', nuevaCategoria: '' })
    setEditImageFile(null)
    setEditImagePreviewUrl(null)
    setEditRemoveImage(false)
    setEditMotivoPrecio('')
    setEditError('')
    setEditSuccess('')
  }

  const editCategoriaFinal = editForm.categoria === '__nueva__' ? editForm.nuevaCategoria : editForm.categoria
  const precioChanged = editProduct && Number(editForm.precio) !== editProduct.precio
  const editFormValid = editForm.nombre.trim()
    && editForm.descripcion.trim()
    && editForm.descripcion.trim().length <= 500
    && Number(editForm.precio) > 0
    && editCategoriaFinal.trim()
    && (!precioChanged || editMotivoPrecio.trim())

  const handleEdit = async () => {
    setEditing(true)
    setEditError('')
    setEditSuccess('')
    try {
      let imagenValue = editProduct.imagen || null
      if (editImageFile) {
        imagenValue = await uploadProductImage(editImageFile)
      } else if (editRemoveImage) {
        imagenValue = null
      }

      await updateProducto(
        editProduct.id,
        {
          nombre: editForm.nombre.trim(),
          descripcion: editForm.descripcion.trim(),
          precio: Number(editForm.precio),
          categoria: editCategoriaFinal.trim(),
          imagen: imagenValue,
        },
        currentAdmin?.uid || '',
        editMotivoPrecio
      )
      setEditSuccess('Producto actualizado correctamente.')
      await loadProductos()
      setTimeout(() => resetEditModal(), 1500)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditing(false)
    }
  }

  // --- Logica de eliminacion ---

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteProducto(deleteTarget.id, currentAdmin?.uid || '')
      setDeleteTarget(null)
      await loadProductos()
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  // --- Card de producto ---
  const ProductCard = ({ producto }) => (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-all">
      {producto.imagen ? (
        <div className="h-40 bg-gray-100 overflow-hidden">
          <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-40 bg-gray-50 flex items-center justify-center">
          <PhotoIcon className="w-12 h-12 text-gray-300" />
        </div>
      )}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{producto.nombre}</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-sky-50 text-sky-600">{producto.categoria}</span>
          </div>
          <span className="font-bold text-lg text-emerald-600 ml-2 shrink-0">
            ₡{Number(producto.precio).toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{producto.descripcion}</p>
        <div className="flex gap-2 pt-3 mt-3 border-t border-gray-100">
          <button onClick={() => openEditModal(producto)}
            className="btn btn-ghost btn-sm flex-1 text-gray-500 gap-1">
            <PencilSquareIcon className="w-4 h-4" />
            Editar
          </button>
          <button onClick={() => { setDeleteTarget(producto); setDeleteError('') }}
            className="btn btn-ghost btn-sm text-rose-500">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  const PreviewCard = ({ producto }) => (
    <div className="bg-white border border-primary rounded-lg overflow-hidden shadow-lg">
      {producto.imagen ? (
        <div className="h-40 bg-gray-100 overflow-hidden">
          <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-40 bg-gray-50 flex items-center justify-center">
          <PhotoIcon className="w-12 h-12 text-gray-300" />
        </div>
      )}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{producto.nombre}</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-sky-50 text-sky-600">{producto.categoria}</span>
          </div>
          <span className="font-bold text-lg text-emerald-600 ml-2 shrink-0">
            ₡{Number(producto.precio).toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{producto.descripcion}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Inventario y Catalogo</h1>
          <p className="text-gray-600 text-sm">Gestion de stock y productos del menu</p>
        </div>
        {activeTab === 'menu' && (
          <button onClick={() => setShowCreateModal(true)}
            className="btn btn-sm md:btn-md gap-2 bg-emerald-600 hover:bg-emerald-700 border-0 text-white font-semibold">
            <PlusIcon className="w-5 h-5" />
            Nuevo producto
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <CubeIcon className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-800">{activeTab === 'stock' ? insumos.length : productos.length}</div>
              <div className="text-xs text-gray-400">{activeTab === 'stock' ? 'Insumos en inventario' : 'Productos en catalogo'}</div>
            </div>
          </div>
        </div>
        {activeTab === 'stock' ? (
          <>
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-gray-800">{lowStockCount}</div>
                  <div className="text-xs text-gray-400">Stock bajo / critico</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-gray-800">{entradas.length}</div>
                  <div className="text-xs text-gray-400">Entradas registradas</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-gray-800">{productos.filter(p => p.disponible !== false).length}</div>
                  <div className="text-xs text-gray-400">Disponibles</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                  <CubeIcon className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-gray-800">{categorias.length}</div>
                  <div className="text-xs text-gray-400">Categorias</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stock'
            ? 'border-gray-800 text-gray-800'
            : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          Stock
        </button>
        <button onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'menu'
            ? 'border-gray-800 text-gray-800'
            : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          Catalogo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder={activeTab === 'stock' ? 'Buscar insumo...' : 'Buscar por nombre o descripcion...'}
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="input input-bordered w-full pl-9 input-sm" />
        </div>
        {activeTab === 'menu' && (
          <>
            <select className="select select-bordered select-sm"
              value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}>
              <option value="">Todas las categorias</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {hasFilters && (
              <button onClick={clearFilters} className="btn btn-ghost btn-sm gap-1 text-gray-500">
                <XMarkIcon className="w-4 h-4" />
                Limpiar
              </button>
            )}
          </>
        )}
      </div>

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Sub-tabs de Stock */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {[
              { key: 'stock', label: 'Inventario' },
              { key: 'nueva', label: 'Registrar entrada' },
              { key: 'salida', label: 'Registrar salida' },
              { key: 'alertas', label: <>Caducidad {alertasActivas > 0 && <span className="ml-1 text-xs bg-rose-500 text-white px-1.5 py-0.5 rounded-full">{alertasActivas}</span>}</> },
              { key: 'conteo', label: 'Conteo fisico' },
              { key: 'historial', label: 'Historial' },
            ].map(t => (
              <button key={t.key}
                onClick={() => {
                  setStockSubTab(t.key)
                  if (t.key === 'alertas') loadAlertasCaducidad()
                  if (t.key === 'historial') {
                    if (historyType === 'entradas') loadEntradas()
                    if (historyType === 'salidas') loadSalidas()
                    if (historyType === 'conteos') loadConteosHistorial()
                  }
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${stockSubTab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {stockSubTab === 'historial' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Mostrar:</span>
              <select
                value={historyType}
                onChange={(e) => setHistoryType(e.target.value)}
                className="select select-bordered select-sm"
              >
                <option value="entradas">Historial de entradas</option>
                <option value="salidas">Historial de salidas</option>
                <option value="conteos">Historial de conteos</option>
              </select>
            </div>
          )}

          {/* Sub-tab: Inventario (tabla de stock) */}
          {stockSubTab === 'stock' && (
            loadingInsumos ? (
              <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center py-12">
                <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400">{searchTerm ? 'Sin resultados' : 'No hay insumos registrados'}</p>
                {!searchTerm && <button onClick={() => setStockSubTab('nueva')} className="btn btn-sm btn-ghost text-primary mt-2">Registrar primera entrada</button>}
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-xs font-medium text-gray-500">Insumo</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Stock</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Minimo</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Unidad</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Estado</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item) => {
                        const qty = item.cantidad || 0
                        const minQ = item.minCantidad || 10
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50">
                            <td className="font-medium text-gray-800 text-sm">{item.nombre}</td>
                            <td className="text-center font-semibold text-gray-700">{qty}</td>
                            <td className="text-center text-sm text-gray-500">{minQ}</td>
                            <td className="text-center text-sm text-gray-500">{item.unidad || '-'}</td>
                            <td className="text-center">
                              {qty <= minQ ? (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-600">Critico</span>
                              ) : qty < minQ * 2 ? (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-600">Bajo</span>
                              ) : (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">OK</span>
                              )}
                            </td>
                            <td className="text-center">
                              <div className="flex gap-1 justify-center">
                                <button onClick={() => openEditInsumo(item)} className="btn btn-ghost btn-xs text-sky-600 hover:bg-sky-50 tooltip" data-tip="Editar">
                                  <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setAjusteTarget(item); setAjusteCantidad(String(item.cantidad || 0)); setAjusteError('') }} className="btn btn-ghost btn-xs text-amber-600 hover:bg-amber-50 tooltip" data-tip="Ajustar stock">
                                  <ArrowPathIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setDeleteInsumoTarget(item); setDeleteInsumoError('') }} className="btn btn-ghost btn-xs text-rose-400 tooltip" data-tip="Eliminar">
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Sub-tab: Registrar entrada */}
          {stockSubTab === 'nueva' && (
            <div className="bg-white border border-gray-100 rounded-lg p-6 max-w-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Registrar entrada de insumo</h3>

              {entradaError && (
                <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-3 mb-4 flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{entradaError}</span>
                </div>
              )}
              {entradaSuccess && (
                <div className="bg-emerald-50 text-emerald-700 text-sm rounded-lg p-3 mb-4 flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{entradaSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre del insumo *</label>
                  <input list="insumos-list" type="text" placeholder="Ej: Camarones Grandes"
                    value={entradaForm.nombre} onChange={e => {
                      const val = e.target.value
                      const match = insumos.find(i => i.nombre?.toLowerCase() === val.trim().toLowerCase())
                      setEntradaForm(f => ({ ...f, nombre: val, unidad: match?.unidad || f.unidad }))
                    }}
                    className="input input-bordered w-full input-sm" />
                  <datalist id="insumos-list">
                    {insumosExistentes.map(n => <option key={n} value={n} />)}
                  </datalist>
                  {entradaInsumoMatch ? (
                    <p className="text-xs text-sky-500 mt-1">Insumo existente — unidad: <span className="font-medium">{entradaInsumoMatch.unidad}</span>, stock actual: <span className="font-medium">{entradaInsumoMatch.cantidad || 0}</span></p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Si el insumo no existe, se creara automaticamente.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Cantidad *</label>
                    <input type="number" min="0.01" step="0.01" placeholder="0"
                      value={entradaForm.cantidad} onChange={e => setEntradaForm(f => ({ ...f, cantidad: e.target.value }))}
                      className="input input-bordered w-full input-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Unidad de medida *</label>
                    <select value={entradaInsumoMatch ? entradaInsumoMatch.unidad : entradaForm.unidad}
                      onChange={e => setEntradaForm(f => ({ ...f, unidad: e.target.value }))}
                      disabled={!!entradaInsumoMatch}
                      className={`select select-bordered w-full select-sm ${entradaInsumoMatch ? 'bg-gray-100' : ''}`}>
                      <option value="">Seleccionar...</option>
                      {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Precio unitario *</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      value={entradaForm.precioUnitario} onChange={e => setEntradaForm(f => ({ ...f, precioUnitario: e.target.value }))}
                      className="input input-bordered w-full input-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Fecha de caducidad</label>
                    <input type="date"
                      value={entradaForm.fechaCaducidad} onChange={e => setEntradaForm(f => ({ ...f, fechaCaducidad: e.target.value }))}
                      className="input input-bordered w-full input-sm" />
                    <p className="text-xs text-gray-400 mt-1">Opcional</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={handleRegistrarEntrada} disabled={registrando} className="btn btn-sm btn-primary gap-1">
                    {registrando ? <span className="loading loading-spinner loading-xs" /> : <PlusIcon className="w-4 h-4" />}
                    Registrar entrada
                  </button>
                  <button onClick={() => { setEntradaForm({ nombre: '', cantidad: '', unidad: '', precioUnitario: '', fechaCaducidad: '' }); setEntradaError('') }}
                    className="btn btn-sm btn-ghost">Limpiar</button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Historial de entradas */}
          {(stockSubTab === 'historial' && historyType === 'entradas') && (
            loadingEntradas ? (
              <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></div>
            ) : entradas.length === 0 ? (
              <div className="text-center py-12">
                <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400">No hay entradas registradas</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-xs font-medium text-gray-500">Fecha</th>
                        <th className="text-xs font-medium text-gray-500">Insumo</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Cantidad</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Unidad</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Precio unit.</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Caducidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entradas.map(e => {
                        const ts = e.timestamp?.toDate?.() ? e.timestamp.toDate() : new Date(e.timestamp)
                        return (
                          <tr key={e.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50">
                            <td className="text-sm text-gray-600">{ts.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })} {ts.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="font-medium text-gray-800 text-sm">{e.insumoNombre}</td>
                            <td className="text-center font-semibold text-gray-700">{e.cantidad}</td>
                            <td className="text-center text-sm text-gray-500">{e.unidad}</td>
                            <td className="text-center text-sm text-gray-500">₡{e.precioUnitario?.toLocaleString?.() || e.precioUnitario}</td>
                            <td className="text-center text-sm text-gray-500">{e.fechaCaducidad || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Sub-tab: Registrar salida */}
          {stockSubTab === 'salida' && (
            <div className="bg-white border border-gray-100 rounded-lg p-6 max-w-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Registrar salida de insumo</h3>

              {salidaError && (
                <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-3 mb-4 flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{salidaError}</span>
                </div>
              )}
              {salidaSuccess && (
                <div className="bg-emerald-50 text-emerald-700 text-sm rounded-lg p-3 mb-4 flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{salidaSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Insumo *</label>
                  <select value={salidaForm.insumoId} onChange={e => setSalidaForm(f => ({ ...f, insumoId: e.target.value }))}
                    className="select select-bordered w-full select-sm">
                    <option value="">Seleccionar insumo...</option>
                    {insumos.map(i => (
                      <option key={i.id} value={i.id}>{i.nombre} — Stock: {i.cantidad || 0} {i.unidad || ''}</option>
                    ))}
                  </select>
                </div>

                {selectedInsumo && (
                  <div className="bg-slate-50 rounded-lg p-3 text-sm">
                    <span className="text-gray-500">Stock disponible:</span>{' '}
                    <span className="font-semibold text-gray-800">{selectedInsumo.cantidad || 0} {selectedInsumo.unidad || ''}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Cantidad a restar *</label>
                    <input type="number" min="0.01" step="0.01" placeholder="0"
                      value={salidaForm.cantidad} onChange={e => setSalidaForm(f => ({ ...f, cantidad: e.target.value }))}
                      className="input input-bordered w-full input-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Motivo *</label>
                    <select value={salidaForm.motivo} onChange={e => setSalidaForm(f => ({ ...f, motivo: e.target.value }))}
                      className="select select-bordered w-full select-sm">
                      <option value="">Seleccionar motivo...</option>
                      {MOTIVOS_SALIDA.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={handleRegistrarSalida} disabled={registrandoSalida} className="btn btn-sm btn-error text-white gap-1">
                    {registrandoSalida ? <span className="loading loading-spinner loading-xs" /> : <ArrowPathIcon className="w-4 h-4" />}
                    Registrar salida
                  </button>
                  <button onClick={() => { setSalidaForm({ insumoId: '', cantidad: '', motivo: '' }); setSalidaError('') }}
                    className="btn btn-sm btn-ghost">Limpiar</button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Alertas de caducidad */}
          {stockSubTab === 'alertas' && (
            loadingAlertas ? (
              <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <select value={alertasFiltro} onChange={e => setAlertasFiltro(e.target.value)}
                    className="select select-bordered select-sm">
                    <option value="todos">Vencidos y proximos</option>
                    <option value="vencidos">Solo vencidos</option>
                    <option value="3">Proximos 3 dias</option>
                    <option value="7">Proximos 7 dias</option>
                    <option value="15">Proximos 15 dias</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                    <input type="checkbox" checked={mostrarVistas} onChange={e => setMostrarVistas(e.target.checked)}
                      className="checkbox checkbox-xs" />
                    Mostrar marcadas como vistas
                  </label>
                  {alertasVistas.length > 0 && (
                    <button onClick={restaurarAlertas} className="btn btn-ghost btn-xs text-gray-500">Restaurar todas</button>
                  )}
                </div>

                {alertasFiltradas.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircleIcon className="w-12 h-12 text-emerald-300 mx-auto mb-2" />
                    <p className="text-gray-400">No hay alertas de caducidad pendientes</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="table w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-xs font-medium text-gray-500">Estado</th>
                            <th className="text-xs font-medium text-gray-500">Insumo</th>
                            <th className="text-xs font-medium text-gray-500 text-center">Cantidad entrada</th>
                            <th className="text-xs font-medium text-gray-500 text-center">Unidad</th>
                            <th className="text-xs font-medium text-gray-500 text-center">Fecha caducidad</th>
                            <th className="text-xs font-medium text-gray-500 text-center">Dias restantes</th>
                            <th className="text-xs font-medium text-gray-500 w-20"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {alertasFiltradas.map(a => (
                            <tr key={a.id} className={`border-b border-gray-50 ${a.estado === 'vencido' ? 'bg-rose-50/50' : a.estado === 'critico' ? 'bg-amber-50/50' : ''}`}>
                              <td>
                                {a.estado === 'vencido' ? (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">Vencido</span>
                                ) : a.estado === 'critico' ? (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">Critico</span>
                                ) : (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-sky-100 text-sky-700">Proximo</span>
                                )}
                              </td>
                              <td className="font-medium text-gray-800 text-sm">{a.insumoNombre}</td>
                              <td className="text-center text-sm text-gray-600">{a.cantidad}</td>
                              <td className="text-center text-sm text-gray-500">{a.unidad}</td>
                              <td className="text-center text-sm font-medium text-gray-700">{a.fechaCaducidad}</td>
                              <td className={`text-center font-semibold text-sm ${a.estado === 'vencido' ? 'text-rose-600' : a.estado === 'critico' ? 'text-amber-600' : 'text-sky-600'}`}>
                                {a.diasRestantes < 0 ? `${Math.abs(a.diasRestantes)}d vencido` : a.diasRestantes === 0 ? 'Hoy' : `${a.diasRestantes}d`}
                              </td>
                              <td>
                                {!alertasVistas.includes(a.id) && (
                                  <button onClick={() => marcarAlertaVista(a.id)} className="btn btn-ghost btn-xs text-gray-400 tooltip" data-tip="Marcar como vista">
                                    <EyeIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Sub-tab: Conteo fisico */}
          {stockSubTab === 'conteo' && (
            <div className="space-y-4">
              {conteoError && (
                <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-3 flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{conteoError}</span>
                </div>
              )}

              {!conteoId ? (
                <div className="bg-white border border-gray-100 rounded-lg p-8 max-w-md text-center">
                  <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Conteo fisico de inventario</h3>
                  <p className="text-sm text-gray-500 mb-4">Inicie un conteo para registrar cantidades reales y luego aplicar ajustes.</p>
                  <button onClick={iniciarConteo} disabled={conteoLoading} className="btn btn-sm btn-primary gap-1">
                    {conteoLoading ? <span className="loading loading-spinner loading-xs" /> : <PlusIcon className="w-4 h-4" />}
                    Iniciar conteo
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Conteo en progreso</h3>

                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex gap-2 items-center">
                      <label className="text-sm font-medium text-gray-700">Insumo</label>
                      <select value={conteoForm.insumoId} onChange={e => setConteoForm(f => ({ ...f, insumoId: e.target.value }))}
                        className="select select-bordered select-sm w-48">
                        <option value="">Seleccionar...</option>
                        {insumos.map(i => (
                          <option key={i.id} value={i.id}>{i.nombre} ({i.cantidad ?? 0} {i.unidad || ''})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center">
                      <label className="text-sm font-medium text-gray-700">Cantidad contada</label>
                      <input type="number" min="0" step="0.01" value={conteoForm.cantidadContada} onChange={e => setConteoForm(f => ({ ...f, cantidadContada: e.target.value }))}
                        className="input input-bordered input-sm w-28" placeholder="0" />
                    </div>
                    <button onClick={agregarItemConteo} disabled={conteoLoading} className="btn btn-sm btn-ghost btn-primary gap-1">
                      {conteoLoading ? <span className="loading loading-spinner loading-xs" /> : <PlusIcon className="w-4 h-4" />}
                      Agregar
                    </button>
                  </div>

                  {conteoData?.items?.length > 0 ? (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-gray-100 mb-4">
                        <table className="table table-sm w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-xs font-medium text-gray-500">Insumo</th>
                              <th className="text-xs font-medium text-gray-500 text-center">Registrado</th>
                              <th className="text-xs font-medium text-gray-500 text-center">Contado</th>
                              <th className="text-xs font-medium text-gray-500 text-center">Diferencia</th>
                              <th className="text-xs font-medium text-gray-500 w-16"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {conteoData.items.map(it => (
                              <tr key={it.insumoId} className="border-b border-gray-50">
                                <td className="font-medium text-sm">{it.insumoNombre}</td>
                                <td className="text-center text-sm">{it.cantidadRegistrada} {it.unidad}</td>
                                <td className="text-center font-semibold text-sm">{it.cantidadContada}</td>
                                <td className={`text-center font-semibold text-sm ${it.diferencia > 0 ? 'text-emerald-600' : it.diferencia < 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                                  {it.diferencia > 0 ? '+' : ''}{it.diferencia}
                                </td>
                                <td>
                                  <button onClick={() => quitarItemConteo(it.insumoId)} className="btn btn-ghost btn-xs text-rose-400" title="Quitar">
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={aplicarConteo} disabled={conteoLoading} className="btn btn-sm btn-primary gap-1">
                          {conteoLoading ? <span className="loading loading-spinner loading-xs" /> : <CheckCircleIcon className="w-4 h-4" />}
                          Aplicar ajustes
                        </button>
                        <button onClick={cancelarConteo} disabled={conteoLoading} className="btn btn-sm btn-ghost text-gray-500">
                          Cancelar conteo
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4">Agregue al menos un insumo con su cantidad contada para ver el resumen y aplicar.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab: Historial de salidas */}
          {(stockSubTab === 'historial' && historyType === 'salidas') && (
            loadingSalidas ? (
              <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></div>
            ) : salidas.length === 0 ? (
              <div className="text-center py-12">
                <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400">No hay salidas registradas</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-xs font-medium text-gray-500">Fecha</th>
                        <th className="text-xs font-medium text-gray-500">Insumo</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Cantidad</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Unidad</th>
                        <th className="text-xs font-medium text-gray-500 text-center">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salidas.map(s => {
                        const ts = s.timestamp?.toDate?.() ? s.timestamp.toDate() : new Date(s.timestamp)
                        const motivoLabel = MOTIVOS_SALIDA.find(m => m.value === s.motivo)?.label || s.motivo
                        const motivoColor = { consumo: 'bg-sky-50 text-sky-700', desperdicio: 'bg-amber-50 text-amber-700', merma: 'bg-orange-50 text-orange-700', vencimiento: 'bg-rose-50 text-rose-700', otro: 'bg-slate-50 text-slate-700' }[s.motivo] || 'bg-slate-50 text-slate-700'
                        return (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50">
                            <td className="text-sm text-gray-600">{ts.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })} {ts.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="font-medium text-gray-800 text-sm">{s.insumoNombre}</td>
                            <td className="text-center font-semibold text-rose-600">-{s.cantidad}</td>
                            <td className="text-center text-sm text-gray-500">{s.unidad}</td>
                            <td className="text-center"><span className={`text-xs font-medium px-2 py-0.5 rounded-md ${motivoColor}`}>{motivoLabel}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Sub-tab: Historial de conteos fisicos */}
          {(stockSubTab === 'historial' && historyType === 'conteos') && (
            conteosHistorialLoading ? (
              <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></div>
            ) : conteosHistorial.length === 0 ? (
              <div className="text-center py-12">
                <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400">No hay conteos registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conteosHistorial.map(c => {
                  const ts = c.timestamp?.toDate?.() ? c.timestamp.toDate() : new Date(c.timestamp)
                  const isExpanded = conteoExpandedId === c.id
                  const items = c.items || []
                  const conDiferencias = items.filter(i => i.diferencia !== 0).length
                  return (
                    <div key={c.id} className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setConteoExpandedId(isExpanded ? null : c.id)}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.estado === 'aplicado' ? 'bg-emerald-50' : c.estado === 'cancelado' ? 'bg-gray-100' : 'bg-amber-50'}`}>
                          <CubeIcon className={`w-4 h-4 ${c.estado === 'aplicado' ? 'text-emerald-600' : c.estado === 'cancelado' ? 'text-gray-500' : 'text-amber-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${c.estado === 'aplicado' ? 'bg-emerald-50 text-emerald-600' : c.estado === 'cancelado' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-600'}`}>
                            {c.estado === 'aplicado' ? 'Aplicado' : c.estado === 'cancelado' ? 'Cancelado' : 'En progreso'}
                          </span>
                          <p className="text-sm text-gray-600 mt-0.5">{items.length} insumos · {conDiferencias} con diferencias</p>
                        </div>
                        <div className="text-xs text-gray-400 shrink-0">
                          {ts.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })} {ts.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <ChevronDownIcon className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                      {isExpanded && items.length > 0 && (
                        <div className="px-4 pb-4">
                          <div className="overflow-x-auto rounded border border-gray-100">
                            <table className="table table-sm w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-xs font-medium text-gray-500">Insumo</th>
                                  <th className="text-xs font-medium text-gray-500 text-center">Registrado</th>
                                  <th className="text-xs font-medium text-gray-500 text-center">Contado</th>
                                  <th className="text-xs font-medium text-gray-500 text-center">Diferencia</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map(it => (
                                  <tr key={it.insumoId} className="border-b border-gray-50">
                                    <td className="text-sm">{it.insumoNombre}</td>
                                    <td className="text-center text-sm">{it.cantidadRegistrada} {it.unidad}</td>
                                    <td className="text-center font-semibold text-sm">{it.cantidadContada}</td>
                                    <td className={`text-center font-semibold text-sm ${it.diferencia > 0 ? 'text-emerald-600' : it.diferencia < 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                                      {it.diferencia > 0 ? '+' : ''}{it.diferencia}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* Catalogo Tab */}
      {activeTab === 'menu' && (
        loadingProductos ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : filteredProductos.length === 0 ? (
          <div className="text-center py-12">
            {hasFilters ? (
              <div className="space-y-2">
                <p className="text-gray-400">No se encontraron productos con los filtros aplicados</p>
                <button onClick={clearFilters} className="btn btn-sm btn-ghost text-primary">Limpiar filtros</button>
              </div>
            ) : (
              <div className="space-y-3">
                <PhotoIcon className="w-12 h-12 text-gray-300 mx-auto" />
                <p className="text-gray-400">No hay productos en el catalogo</p>
                <button onClick={() => setShowCreateModal(true)} className="btn btn-sm btn-ghost text-primary">
                  Crear el primer producto
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {hasFilters && (
              <p className="text-xs text-gray-400">
                {filteredProductos.length} de {productos.length} productos
                {filterCategoria && <> en <span className="font-medium text-gray-600">{filterCategoria}</span></>}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProductos.map(p => <ProductCard key={p.id} producto={p} />)}
            </div>
          </div>
        )
      )}

      {/* Modal de creacion */}
      {showCreateModal && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                {showPreview ? 'Previsualizacion' : 'Nuevo producto'}
              </h3>
              <button onClick={resetCreateModal} className="btn btn-ghost btn-sm btn-circle">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {createSuccess && (
                <div className="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg mb-4">{createSuccess}</div>
              )}
              {createError && (
                <div className="bg-rose-50 text-rose-700 text-sm px-3 py-2 rounded-lg mb-4">{createError}</div>
              )}

              {showPreview ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Asi se vera el producto en el catalogo:</p>
                  <div className="max-w-xs mx-auto">
                    <PreviewCard producto={{
                      nombre: createForm.nombre.trim(),
                      descripcion: createForm.descripcion.trim(),
                      precio: Number(createForm.precio),
                      categoria: categoriaFinal.trim(),
                      imagen: imagePreviewUrl,
                    }} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowPreview(false)}
                      className="btn btn-ghost btn-sm flex-1 gap-1">
                      <ArrowLeftIcon className="w-4 h-4" />
                      Editar
                    </button>
                    <button onClick={handleCreate} disabled={creating}
                      className="btn btn-sm flex-1 bg-emerald-600 hover:bg-emerald-700 border-0 text-white">
                      {creating ? <span className="loading loading-spinner loading-xs" /> : 'Confirmar y guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 block">Nombre *</label>
                    <input type="text" className="input input-bordered input-sm w-full"
                      placeholder="Ej: Ceviche Clasico"
                      value={createForm.nombre}
                      onChange={e => setCreateForm(f => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 block">Descripcion *</label>
                    <textarea className="textarea textarea-bordered textarea-sm w-full" rows={2}
                      placeholder="Descripcion del plato..."
                      value={createForm.descripcion}
                      onChange={e => setCreateForm(f => ({ ...f, descripcion: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 block">Precio (colones) *</label>
                    <input type="number" className="input input-bordered input-sm w-full"
                      placeholder="0" min="1"
                      value={createForm.precio}
                      onChange={e => setCreateForm(f => ({ ...f, precio: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 block">Categoria *</label>
                    <select className="select select-bordered select-sm w-full"
                      value={createForm.categoria}
                      onChange={e => setCreateForm(f => ({ ...f, categoria: e.target.value, nuevaCategoria: '' }))}>
                      <option value="">Seleccionar categoria</option>
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__nueva__">+ Nueva categoria</option>
                    </select>
                    {createForm.categoria === '__nueva__' && (
                      <input type="text" className="input input-bordered input-sm w-full mt-2"
                        placeholder="Nombre de la nueva categoria"
                        value={createForm.nuevaCategoria}
                        onChange={e => setCreateForm(f => ({ ...f, nuevaCategoria: e.target.value }))} />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 block">Imagen (opcional)</label>
                    {imagePreviewUrl ? (
                      <div className="relative w-full h-36 rounded-lg overflow-hidden bg-gray-100">
                        <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <label className="btn btn-circle btn-xs bg-black/50 border-0 text-white hover:bg-black/70 cursor-pointer"
                            title="Cambiar imagen">
                            <ArrowPathIcon className="w-3 h-3" />
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => { if (e.target.files?.[0]) openCropper(e.target.files[0], 'create') }} />
                          </label>
                          <button onClick={removeImage}
                            className="btn btn-circle btn-xs bg-black/50 border-0 text-white hover:bg-black/70"
                            title="Quitar imagen">
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                        <PhotoIcon className="w-8 h-8 text-gray-300" />
                        <span className="text-xs text-gray-400 mt-1">Clic para subir imagen (max 5 MB)</span>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { if (e.target.files?.[0]) openCropper(e.target.files[0], 'create') }} />
                      </label>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={resetCreateModal} className="btn btn-ghost btn-sm flex-1">Cancelar</button>
                    <button onClick={handleShowPreview} disabled={!formValid}
                      className="btn btn-sm flex-1 bg-sky-600 hover:bg-sky-700 border-0 text-white gap-1">
                      <EyeIcon className="w-4 h-4" />
                      Previsualizar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal de edicion */}
      {editProduct && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Editar producto</h3>
              <button onClick={resetEditModal} className="btn btn-ghost btn-sm btn-circle">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {editSuccess && (
                <div className="bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg">{editSuccess}</div>
              )}
              {editError && (
                <div className="bg-rose-50 text-rose-700 text-sm px-3 py-2 rounded-lg">{editError}</div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input type="text" className="input input-bordered input-sm w-full"
                  value={editForm.nombre}
                  onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">
                  Descripcion * <span className="text-gray-400 font-normal">({editForm.descripcion.length}/500)</span>
                </label>
                <textarea className="textarea textarea-bordered textarea-sm w-full" rows={3}
                  maxLength={500}
                  value={editForm.descripcion}
                  onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Precio (colones) *</label>
                <input type="number" className="input input-bordered input-sm w-full"
                  min="1"
                  value={editForm.precio}
                  onChange={e => setEditForm(f => ({ ...f, precio: e.target.value }))} />
                {precioChanged && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-xs text-amber-600 mb-1">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                      Precio anterior: ₡{editProduct.precio.toLocaleString()} → Nuevo: ₡{Number(editForm.precio).toLocaleString()}
                    </div>
                    <input type="text" className="input input-bordered input-sm w-full"
                      placeholder="Motivo del cambio de precio *"
                      value={editMotivoPrecio}
                      onChange={e => setEditMotivoPrecio(e.target.value)} />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Categoria *</label>
                <select className="select select-bordered select-sm w-full"
                  value={editForm.categoria}
                  onChange={e => setEditForm(f => ({ ...f, categoria: e.target.value, nuevaCategoria: '' }))}>
                  <option value="">Seleccionar categoria</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__nueva__">+ Nueva categoria</option>
                </select>
                {editForm.categoria === '__nueva__' && (
                  <input type="text" className="input input-bordered input-sm w-full mt-2"
                    placeholder="Nombre de la nueva categoria"
                    value={editForm.nuevaCategoria}
                    onChange={e => setEditForm(f => ({ ...f, nuevaCategoria: e.target.value }))} />
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Imagen</label>
                {(editImagePreviewUrl && !editRemoveImage) ? (
                  <div className="relative w-full h-36 rounded-lg overflow-hidden bg-gray-100">
                    <img src={editImagePreviewUrl} alt="Imagen actual" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <label className="btn btn-circle btn-xs bg-black/50 border-0 text-white hover:bg-black/70 cursor-pointer"
                        title="Cambiar imagen">
                        <ArrowPathIcon className="w-3 h-3" />
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { if (e.target.files?.[0]) openCropper(e.target.files[0], 'edit') }} />
                      </label>
                      <button onClick={() => { setEditRemoveImage(true); setEditImageFile(null); setEditImagePreviewUrl(null) }}
                        className="btn btn-circle btn-xs bg-black/50 border-0 text-white hover:bg-black/70"
                        title="Quitar imagen">
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                    <PhotoIcon className="w-8 h-8 text-gray-300" />
                    <span className="text-xs text-gray-400 mt-1">
                      {editRemoveImage ? 'Imagen eliminada - clic para subir nueva' : 'Clic para subir imagen (max 5 MB)'}
                    </span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) openCropper(e.target.files[0], 'edit') }} />
                  </label>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={resetEditModal} className="btn btn-ghost btn-sm flex-1">Cancelar</button>
                <button onClick={handleEdit} disabled={!editFormValid || editing}
                  className="btn btn-sm flex-1 bg-emerald-600 hover:bg-emerald-700 border-0 text-white">
                  {editing ? <span className="loading loading-spinner loading-xs" /> : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal de confirmacion de eliminacion */}
      {deleteTarget && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <TrashIcon className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Eliminar producto</h3>
                  <p className="text-sm text-gray-500">Esta accion no se puede deshacer.</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-800">{deleteTarget.nombre}</p>
                <p className="text-xs text-gray-400">{deleteTarget.categoria} - ₡{Number(deleteTarget.precio).toLocaleString()}</p>
              </div>
              {deleteError && (
                <div className="bg-rose-50 text-rose-700 text-sm px-3 py-2 rounded-lg">{deleteError}</div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost btn-sm flex-1">Cancelar</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="btn btn-sm flex-1 bg-rose-600 hover:bg-rose-700 border-0 text-white">
                  {deleting ? <span className="loading loading-spinner loading-xs" /> : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal de recorte de imagen */}
      {cropSrc && (
        <ModalPortal overlayClassName="flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ScissorsIcon className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-800">Recortar imagen</h3>
              </div>
              <button onClick={closeCropper} className="btn btn-ghost btn-sm btn-circle">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-gray-50">
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={c => setCompletedCrop(c)}
                aspect={CROP_ASPECT}
              >
                <img
                  src={cropSrc}
                  alt="Recortar"
                  onLoad={onCropImageLoad}
                  style={{ maxHeight: '400px' }}
                />
              </ReactCrop>
            </div>
            <div className="p-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-3">Arrastra para ajustar el area visible del producto.</p>
              <div className="flex gap-2">
                <button onClick={closeCropper} className="btn btn-ghost btn-sm flex-1">Cancelar</button>
                <button onClick={handleCropConfirm}
                  disabled={!completedCrop?.width || !completedCrop?.height}
                  className="btn btn-sm flex-1 bg-sky-600 hover:bg-sky-700 border-0 text-white gap-1">
                  <CheckCircleIcon className="w-4 h-4" />
                  Confirmar recorte
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal de edicion de insumo */}
      {editInsumo && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Editar insumo</h3>
              <button onClick={() => setEditInsumo(null)} className="btn btn-ghost btn-sm btn-circle"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {editInsumoError && (
                <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-3 flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{editInsumoError}</span>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre *</label>
                <input type="text" value={editInsumoForm.nombre} onChange={e => setEditInsumoForm(f => ({ ...f, nombre: e.target.value }))}
                  className="input input-bordered w-full input-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Unidad *</label>
                  <select value={editInsumoForm.unidad} onChange={e => setEditInsumoForm(f => ({ ...f, unidad: e.target.value }))}
                    className="select select-bordered w-full select-sm">
                    <option value="">Seleccionar...</option>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Stock minimo</label>
                  <input type="number" min="0" step="1" value={editInsumoForm.minCantidad} onChange={e => setEditInsumoForm(f => ({ ...f, minCantidad: e.target.value }))}
                    className="input input-bordered w-full input-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
              <button onClick={() => setEditInsumo(null)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={handleEditInsumo} disabled={savingInsumo} className="btn btn-sm btn-primary gap-1">
                {savingInsumo ? <span className="loading loading-spinner loading-xs" /> : <CheckCircleIcon className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal de eliminacion de insumo */}
      {deleteInsumoTarget && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="p-5 text-center">
              <ExclamationTriangleIcon className="w-12 h-12 text-rose-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Eliminar insumo</h3>
              <p className="text-sm text-gray-500 mb-1">Se eliminara permanentemente:</p>
              <p className="font-medium text-gray-800 mb-4">{deleteInsumoTarget.nombre}</p>
              {deleteInsumoError && (
                <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-3 mb-4">{deleteInsumoError}</div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setDeleteInsumoTarget(null)} className="btn btn-ghost btn-sm flex-1">Cancelar</button>
                <button onClick={handleDeleteInsumo} disabled={deletingInsumo} className="btn btn-sm btn-error text-white flex-1 gap-1">
                  {deletingInsumo ? <span className="loading loading-spinner loading-xs" /> : <TrashIcon className="w-4 h-4" />}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal de ajuste manual de stock */}
      {ajusteTarget && (
        <ModalPortal overlayClassName="flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Ajustar stock</h3>
              <button onClick={() => setAjusteTarget(null)} className="btn btn-ghost btn-sm btn-circle"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <span className="text-gray-500">Insumo:</span> <span className="font-medium text-gray-800">{ajusteTarget.nombre}</span>
                <br />
                <span className="text-gray-500">Stock actual:</span> <span className="font-semibold text-gray-800">{ajusteTarget.cantidad || 0} {ajusteTarget.unidad || ''}</span>
              </div>
              {ajusteError && (
                <div className="bg-rose-50 text-rose-700 text-sm rounded-lg p-3">{ajusteError}</div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nueva cantidad</label>
                <input type="number" min="0" step="0.01" value={ajusteCantidad} onChange={e => setAjusteCantidad(e.target.value)}
                  className="input input-bordered w-full input-sm" />
                <p className="text-xs text-gray-400 mt-1">Este ajuste no genera registro de entrada ni salida.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
              <button onClick={() => setAjusteTarget(null)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={handleAjusteStock} disabled={ajustando} className="btn btn-sm btn-primary gap-1">
                {ajustando ? <span className="loading loading-spinner loading-xs" /> : <ArrowPathIcon className="w-4 h-4" />}
                Ajustar
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
