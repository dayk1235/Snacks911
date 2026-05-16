export function getBusinessStatus() {
  const now = new Date();
  const cdmxOffset = -6;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const cdmxTime = new Date(utc + 3600000 * cdmxOffset);
  const total = cdmxTime.getHours() * 60 + cdmxTime.getMinutes();
  const isOpen = total >= 14 * 60 && total < 23 * 60;

  return {
    isOpen,
    label:    isOpen ? '🔥 Abierto ahora' : '😴 Abrimos a las 2 PM',
    sublabel: isOpen ? 'Entrega en 25-35 min' : 'Lun–Dom 2:00 PM a 11:00 PM',
    color:    isOpen ? 'var(--color-success)' : 'var(--color-muted)',
  };
}
