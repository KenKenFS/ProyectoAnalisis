export const menuItems = [
  {id:1, name:'Ceviche Mixto', category:'Ceviches', price:8.00, desc:'Pescado, camarones, calamar, cebolla roja, cilantro, limón'},
  {id:2, name:'Ceviche de Pescado', category:'Ceviches', price:7.00, desc:'Mero fresco, leche de tigre premium'},
  {id:3, name:'Ceviche de Camarón', category:'Ceviches', price:9.00, desc:'Camarones jumbo al punto'},
  {id:4, name:'Ceviche Negro', category:'Ceviches', price:10.00, desc:'Con tinta de calamar'},
  {id:5, name:'Arroz con Mariscos', category:'Platos principales', price:6.50, desc:'Porción abundante, garnish de limón'},
  {id:6, name:'Chifrijo', category:'Entradas', price:4.50, desc:'Entrada tradicional costarricense'},
  {id:7, name:'Tostones', category:'Acompañamientos', price:3.00, desc:'Plátanos fritos crujientes'},
  {id:8, name:'Limonada Fresca', category:'Bebidas', price:2.00, desc:'Receta casera refrescante'},
  {id:9, name:'Agua de Jamaica', category:'Bebidas', price:1.50, desc:'Tradicional'},
  {id:10, name:'Cerveza Importada', category:'Bebidas', price:3.50, desc:'Variedad de marcas'},
]

export const inventory = [
  {id:1, name:'Pescado fresco (kg)', qty:50, minQty:10, unit:'kg', lastRestock:'2025-12-01'},
  {id:2, name:'Camarones (kg)', qty:20, minQty:5, unit:'kg', lastRestock:'2025-12-01'},
  {id:3, name:'Limones', qty:120, minQty:30, unit:'uds', lastRestock:'2025-11-30'},
  {id:4, name:'Arroz (kg)', qty:15, minQty:5, unit:'kg', lastRestock:'2025-11-28'},
  {id:5, name:'Cebolla roja', qty:25, minQty:10, unit:'kg', lastRestock:'2025-11-29'},
  {id:6, name:'Cilantro fresco', qty:8, minQty:2, unit:'kg', lastRestock:'2025-12-02'},
]

export const orders = [
  {id:'ORD-001', table:3, items:[{name:'Ceviche Mixto', qty:2}], status:'pending', time:'14:32', total:16.00},
  {id:'ORD-002', table:1, items:[{name:'Limonada', qty:2},{name:'Ceviche Pescado', qty:1}], status:'ready', time:'14:15', total:11.00},
  {id:'ORD-003', table:5, items:[{name:'Ceviche de Camarón', qty:1},{name:'Tostones', qty:1}], status:'preparing', time:'14:35', total:12.00},
  {id:'ORD-004', table:7, items:[{name:'Arroz con Mariscos', qty:1}], status:'pending', time:'14:40', total:6.50},
]

export const reservations = [
  {id:'RES-001', name:'Carlos Méndez', date:'2025-12-03', time:'19:00', guests:4, phone:'8888-1234'},
  {id:'RES-002', name:'María López', date:'2025-12-03', time:'20:30', guests:2, phone:'8765-5678'},
  {id:'RES-003', name:'Juan Rojas', date:'2025-12-04', time:'18:00', guests:6, phone:'8456-7890'},
]

export const users = [
  {id:1, name:'Rosa Luz', email:'rosa@ceviche.cr', role:'Admin', status:'Activo'},
  {id:2, name:'Marcos Rodríguez', email:'marcos@ceviche.cr', role:'Cajero', status:'Activo'},
  {id:3, name:'Ana María Brenes', email:'ana@ceviche.cr', role:'Mesero', status:'Activo'},
  {id:4, name:'Luis Chen', email:'luis@ceviche.cr', role:'Cocina', status:'Activo'},
  {id:5, name:'Patricia Solís', email:'patricia@ceviche.cr', role:'Mesero', status:'Inactivo'},
]

export const promotions = [
  {id:1, title:'2x1 Ceviche Mixto (Martes)', desc:'Martes de ceviche, aplica para consumo en local', active:true, discount:'50%'},
  {id:2, title:'10% descuento a estudiantes', desc:'Presentar carnet válido', active:true, discount:'10%'},
  {id:3, title:'Happy Hour 3-5pm', desc:'Bebidas con 20% descuento', active:true, discount:'20%'},
  {id:4, title:'Combo Familiar', desc:'4 ceviches + 4 bebidas + entrada', active:false, discount:'15%'},
]

export const transactions = [
  {id:1, date:'2025-12-02', desc:'Venta ORD-001', amount:11200, type:'ingreso'},
  {id:2, date:'2025-12-02', desc:'Venta ORD-002', amount:7700, type:'ingreso'},
  {id:3, date:'2025-12-01', desc:'Compra pescado fresco', amount:-15000, type:'egreso'},
  {id:4, date:'2025-12-01', desc:'Pago servicios', amount:-8500, type:'egreso'},
  {id:5, date:'2025-11-30', desc:'Venta ORD-003', amount:8400, type:'ingreso'},
]

export const reports = {
  salesByDay: [ {day:'Lun', value:120}, {day:'Mar', value:220}, {day:'Mie', value:180}, {day:'Jue', value:240}, {day:'Vie', value:300}, {day:'Sab', value:420}, {day:'Dom', value:360} ],
  topItems: [ {name:'Ceviche Mixto', sold:45, rev:360}, {name:'Ceviche de Camarón', sold:30, rev:270}, {name:'Limonada', sold:80, rev:160}, {name:'Arroz con Mariscos', sold:28, rev:182} ],
  monthlyRevenue: 45600,
  monthlyExpenses: 18000,
}
