import { useState, useEffect, useCallback, useMemo } from 'react'
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
} from '@heroicons/react/24/outline'
import { getProductos, getCategorias, createProducto, uploadProductImage } from '@shared/firebase/firestore'

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('stock')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')

  // Productos reales
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

  // Datos mock de inventario/stock (se reemplazaran en HUs de inventario)
  const inventory = [
    { id: 1, name: 'Camarones Grandes', qty: 15, minQty: 10, unit: 'kg', lastRestock: '2025-01-15', category: 'Proteina' },
    { id: 2, name: 'Limon Fresco', qty: 3, minQty: 20, unit: 'docena', lastRestock: '2025-01-14', category: 'Frutas' },
    { id: 3, name: 'Cebolla Blanca', qty: 45, minQty: 30, unit: 'kg', lastRestock: '2025-01-13', category: 'Vegetales' },
    { id: 4, name: 'Cilantro Fresco', qty: 8, minQty: 5, unit: 'manojo', lastRestock: '2025-01-16', category: 'Hierbas' },
    { id: 5, name: 'Aji Rojo', qty: 120, minQty: 50, unit: 'kg', lastRestock: '2025-01-12', category: 'Vegetales' },
    { id: 6, name: 'Tomate Rojo', qty: 25, minQty: 15, unit: 'kg', lastRestock: '2025-01-15', category: 'Vegetales' },
    { id: 7, name: 'Ceviche Mix', qty: 8, minQty: 5, unit: 'kg', lastRestock: '2025-01-16', category: 'Proteina' },
    { id: 8, name: 'Leche de Coco', qty: 12, minQty: 8, unit: 'litro', lastRestock: '2025-01-14', category: 'Bebidas' },
    { id: 9, name: 'Sal Marina', qty: 5, minQty: 3, unit: 'kg', lastRestock: '2025-01-10', category: 'Condimentos' },
    { id: 10, name: 'Pimienta Negra', qty: 2, minQty: 2, unit: 'kg', lastRestock: '2025-01-08', category: 'Condimentos' },
  ]

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

  const lowStockCount = inventory.filter(i => i.qty <= i.minQty).length
  const warningStockCount = inventory.filter(i => i.qty > i.minQty && i.qty < 20).length

  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  // --- Logica del formulario de creacion ---

  const categoriaFinal = createForm.categoria === '__nueva__' ? createForm.nuevaCategoria : createForm.categoria

  const formValid = createForm.nombre.trim()
    && createForm.descripcion.trim()
    && Number(createForm.precio) > 0
    && categoriaFinal.trim()

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setCreateError('El archivo debe ser una imagen.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setCreateError('La imagen no debe superar 5 MB.')
      return
    }
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setCreateError('')
  }

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

  // --- Card de previsualizacion reutilizable ---
  const ProductCard = ({ producto, isPreview = false }) => (
    <div className={`bg-white border rounded-lg overflow-hidden ${isPreview ? 'border-primary shadow-lg' : 'border-gray-100 hover:border-gray-200'} transition-all`}>
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
        {!isPreview && (
          <div className="flex gap-2 pt-3 mt-3 border-t border-gray-100">
            <button className="btn btn-ghost btn-sm flex-1 text-gray-500 gap-1">
              <PencilSquareIcon className="w-4 h-4" />
              Editar
            </button>
            <button className="btn btn-ghost btn-sm text-rose-500">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
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
              <div className="text-xl font-semibold text-gray-800">{activeTab === 'stock' ? inventory.length : productos.length}</div>
              <div className="text-xs text-gray-400">{activeTab === 'stock' ? 'Items en stock' : 'Productos en catalogo'}</div>
            </div>
          </div>
        </div>
        {activeTab === 'stock' ? (
          <>
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-gray-800">{warningStockCount}</div>
                  <div className="text-xs text-gray-400">Stock bajo</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-gray-800">{lowStockCount}</div>
                  <div className="text-xs text-gray-400">Critico</div>
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
          <input type="text" placeholder={activeTab === 'stock' ? 'Buscar en stock...' : 'Buscar por nombre o descripcion...'}
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
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-xs font-medium text-gray-500">Producto</th>
                  <th className="text-xs font-medium text-gray-500 text-center">Stock</th>
                  <th className="text-xs font-medium text-gray-500 text-center">Minimo</th>
                  <th className="text-xs font-medium text-gray-500 text-center">Unidad</th>
                  <th className="text-xs font-medium text-gray-500 text-center">Categoria</th>
                  <th className="text-xs font-medium text-gray-500 text-center">Estado</th>
                  <th className="text-xs font-medium text-gray-500 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50">
                    <td className="font-medium text-gray-800 text-sm">{item.name}</td>
                    <td className="text-center font-semibold text-gray-700">{item.qty}</td>
                    <td className="text-center text-sm text-gray-500">{item.minQty}</td>
                    <td className="text-center text-sm text-gray-500">{item.unit}</td>
                    <td className="text-center">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600">{item.category}</span>
                    </td>
                    <td className="text-center">
                      {item.qty <= item.minQty ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-600">Critico</span>
                      ) : item.qty < 20 ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-600">Bajo</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">OK</span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="flex gap-1 justify-center">
                        <button className="btn btn-ghost btn-xs text-gray-400"><ArrowPathIcon className="w-4 h-4" /></button>
                        <button className="btn btn-ghost btn-xs text-gray-400"><PencilSquareIcon className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
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

              {/* Vista de previsualizacion */}
              {showPreview ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Asi se vera el producto en el catalogo:</p>
                  <div className="max-w-xs mx-auto">
                    <ProductCard
                      producto={{
                        nombre: createForm.nombre.trim(),
                        descripcion: createForm.descripcion.trim(),
                        precio: Number(createForm.precio),
                        categoria: categoriaFinal.trim(),
                        imagen: imagePreviewUrl,
                      }}
                      isPreview
                    />
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
                /* Formulario */
                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 block">Nombre *</label>
                    <input type="text" className="input input-bordered input-sm w-full"
                      placeholder="Ej: Ceviche Clasico"
                      value={createForm.nombre}
                      onChange={e => setCreateForm(f => ({ ...f, nombre: e.target.value }))} />
                  </div>

                  {/* Descripcion */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 block">Descripcion *</label>
                    <textarea className="textarea textarea-bordered textarea-sm w-full" rows={2}
                      placeholder="Descripcion del plato..."
                      value={createForm.descripcion}
                      onChange={e => setCreateForm(f => ({ ...f, descripcion: e.target.value }))} />
                  </div>

                  {/* Precio */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 block">Precio (colones) *</label>
                    <input type="number" className="input input-bordered input-sm w-full"
                      placeholder="0" min="1"
                      value={createForm.precio}
                      onChange={e => setCreateForm(f => ({ ...f, precio: e.target.value }))} />
                  </div>

                  {/* Categoria */}
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

                  {/* Imagen */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1 block">Imagen (opcional)</label>
                    {imagePreviewUrl ? (
                      <div className="relative w-full h-36 rounded-lg overflow-hidden bg-gray-100">
                        <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button onClick={removeImage}
                          className="absolute top-2 right-2 btn btn-circle btn-xs bg-black/50 border-0 text-white hover:bg-black/70">
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                        <PhotoIcon className="w-8 h-8 text-gray-300" />
                        <span className="text-xs text-gray-400 mt-1">Clic para subir imagen (max 5 MB)</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      </label>
                    )}
                  </div>

                  {/* Boton de preview */}
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
        </div>
      )}
    </div>
  )
}
