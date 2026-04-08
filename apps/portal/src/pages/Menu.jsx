import { useState, useEffect, useMemo } from 'react'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'

function Menu() {
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('')
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const { getProductosPublicos } = await import('@shared/firebase/firestore')
        // getProductosPublicos usa where('disponible', '==', true) para funcionar sin auth
        const prods = await getProductosPublicos()
        setProductos(prods)
        // Extraer categorias unicas de los productos retornados
        const catsSet = new Set(prods.map(p => p.categoria).filter(Boolean))
        setCategorias([...catsSet].sort())
      } catch (e) {
        console.error('Error cargando menu:', e)
        setError('Error al cargar el menu. Intenta recargar la pagina.')
      } finally {
        setLoading(false)
      }
    }
    loadMenu()
  }, [])

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchesSearch = !search ||
        p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(search.toLowerCase())
      // categoria es un string, no categoriaId
      const matchesCat = !categoria || p.categoria === categoria
      return matchesSearch && matchesCat
    })
  }, [productos, search, categoria])

  const productosPorCategoria = useMemo(() => {
    const grouped = {}
    productosFiltrados.forEach(p => {
      const catName = p.categoria || 'Otros'
      if (!grouped[catName]) grouped[catName] = []
      grouped[catName].push(p)
    })
    return grouped
  }, [productosFiltrados])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ceviche-red" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="card-dark p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-2 rounded-lg"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in section-padding">
      <div className="container-limit mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-playfair font-semibold text-white mb-4">
            Nuestro Menu
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Descubre nuestra seleccion de platillos preparados con los mejores ingredientes frescos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Buscar platillos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-dark w-full pl-12"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-white/40" />
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="input-dark min-w-[180px]"
            >
              <option value="">Todas las categorias</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {Object.keys(productosPorCategoria).length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/50 text-lg">
              {productos.length === 0
                ? 'No hay productos disponibles en el menu.'
                : 'No se encontraron productos con los filtros seleccionados.'}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(productosPorCategoria).map(([catName, prods]) => (
              <section key={catName}>
                <h2 className="text-2xl font-playfair font-semibold text-ceviche-red-light mb-6 pb-2 border-b border-white/10">
                  {catName}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {prods.map(producto => (
                    <div key={producto.id} className="card-dark overflow-hidden group">
                      <div className="h-48 bg-ceviche-black/50 flex items-center justify-center border-b border-white/5">
                        {producto.imagenUrl ? (
                          <img
                            src={producto.imagenUrl}
                            alt={producto.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <div className="w-10 h-10 rounded-full bg-ceviche-red/20 flex items-center justify-center mb-2">
                              <svg className="w-5 h-5 text-ceviche-red-light" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </div>
                            <p className="text-white/30 text-sm">{producto.nombre}</p>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {producto.nombre}
                        </h3>
                        {producto.descripcion && (
                          <p className="text-white/50 text-sm mb-3 line-clamp-2">
                            {producto.descripcion}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-ceviche-red-light font-bold text-lg">
                            ₡{producto.precio?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Menu
