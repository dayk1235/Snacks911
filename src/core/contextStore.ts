const store = new Map()

export function getContext(id: string) {
  if (!store.has(id)) {
    store.set(id, {
      cart: { items: [], total: 0 },
      history: []
    })
  }
  const ctx = store.get(id)

  if (!ctx.cart || !Array.isArray(ctx.cart.items)) {
    ctx.cart = { items: [], total: 0 }
  }

  return ctx
}

export function saveContext(id: string, ctx: any) {
  if (!ctx.cart || !Array.isArray(ctx.cart.items)) {
    ctx.cart = { items: [], total: 0 }
  }
  store.set(id, ctx)
}

export function clearContext(id: string) {
  store.delete(id)
}
