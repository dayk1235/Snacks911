# order-alert

Add full-screen blocking order alert for admin/orders.

## Steps

1. Create `OrderAlertModal.tsx` component in `src/components/`
2. Modal: fixed fullscreen overlay, blocks all interaction
3. Shows when new order arrives (listen to Supabase real-time or poll)
4. Requires manual "Aceptar" click to dismiss
5. Shows order details: items, total, customer phone, time
6. Sound plays until accepted (see order-sound command)
7. Integrate into `orders/page.tsx` and `admin/page.tsx`
8. Build and verify
