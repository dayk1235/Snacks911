'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { AdminStore } from '@/lib/adminStore';
import type { AdminProduct } from '@/lib/adminTypes';
import type { Product } from '@/data/products';
import { products as staticProducts } from '@/data/products';
import { track } from '@/lib/analytics';

// ── Types ──
type FlowState = 'idle' | 'browsing' | 'ordering' | 'confirm' | 'done';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  quickReplies?: QuickReply[];
  productCards?: AdminProduct[];
}

interface QuickReply {
  label: string;
  action: string;
}

interface OrderItem {
  product: AdminProduct;
  qty: number;
}

interface UserPrefs {
  pastOrders: Array<{ items: string[]; total: number; date: string }>;
  favorites: Record<string, number>; // productId -> count
}

// ── Helpers ──
const LS_PREFS_KEY = 'snacks911_chat_prefs';
const LS_CART_KEY = 'snacks911_chat_cart';

function loadPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(LS_PREFS_KEY);
    return raw ? JSON.parse(raw) : { pastOrders: [], favorites: {} };
  } catch {
    return { pastOrders: [], favorites: {} };
  }
}

function savePrefs(prefs: UserPrefs) {
  try { localStorage.setItem(LS_PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

function loadChatCart(): OrderItem[] {
  try {
    const raw = localStorage.getItem(LS_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveChatCart(items: OrderItem[]) {
  try {
    localStorage.setItem(LS_CART_KEY, JSON.stringify(items));
  } catch {}
}

// Convert AdminProduct → Product for cart compatibility
function toProduct(p: AdminProduct): Product {
  return {
    id: parseInt(p.id.replace(/\D/g, '')) || Math.abs(hashCode(p.name)),
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category as Product['category'],
    image: p.imageUrl || '/images/combo.webp',
  };
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return h;
}

// ── Component ──
export default function OrderBot({
  onAddToCart,
  onCartOpen,
}: {
  onAddToCart: (product: Product) => void;
  onCartOpen: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [flow, setFlow] = useState<FlowState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [chatCart, setChatCart] = useState<OrderItem[]>([]);
  const [prefs, setPrefs] = useState<UserPrefs>(loadPrefs);
  const [menuProducts, setMenuProducts] = useState<AdminProduct[]>([]);
  const [inactivityTimer, setInactivityTimer] = useState(0);
  const [urgencyLevel, setUrgencyLevel] = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(1);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load menu products on mount
  useEffect(() => {
    AdminStore.getProducts().then(products => {
      setMenuProducts(products);
    }).catch(() => {
      // Fallback to static
      setMenuProducts(staticProducts.map(p => ({
        id: String(p.id),
        name: p.name,
        price: p.price,
        category: p.category,
        imageUrl: p.image,
        available: true,
        description: p.description,
      })));
    });
  }, []);

  // Load chat cart
  useEffect(() => {
    setChatCart(loadChatCart());
  }, []);

  useEffect(() => {
    return () => { if (typingTimeout.current) clearTimeout(typingTimeout.current); };
  }, []);

  // ── Inactivity timer — escalates urgency then prompts checkout ──
  useEffect(() => {
    if (!isOpen || flow === 'done') {
      if (inactivityInterval.current) clearInterval(inactivityInterval.current);
      return;
    }

    setInactivityTimer(0);
    setUrgencyLevel(0);

    inactivityInterval.current = setInterval(() => {
      setInactivityTimer(prev => {
        const next = prev + 1;
        if (next === 45 && chatCart.length > 0) {
          // Urgency level 1: gentle nudge
          setUrgencyLevel(1);
        } else if (next === 90 && chatCart.length > 0) {
          // Urgency level 2: scarcity
          setUrgencyLevel(2);
        } else if (next === 120 && chatCart.length > 0) {
          // Urgency level 3: final prompt
          setUrgencyLevel(3);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (inactivityInterval.current) clearInterval(inactivityInterval.current);
    };
  }, [isOpen, flow, chatCart.length]);

  // Trigger urgency messages
  useEffect(() => {
    if (urgencyLevel === 0) return;
    if (!isOpen || flow === 'done') return;

    const cartTotal = chatCart.reduce((s, i) => s + i.product.price * i.qty, 0);

    if (urgencyLevel === 1) {
      simulateTyping(
        `Seguimos con tu pedido? Llevas $${cartTotal}. Solo falta confirmar!`,
        [
          { label: 'Confirmar ahora', action: 'confirm' },
          { label: 'Agregar algo mas', action: 'more' },
        ],
        undefined,
        500
      );
    } else if (urgencyLevel === 2) {
      simulateTyping(
        `🔥 Quedan pocas unidades! Tu pedido ($${cartTotal}) esta listo para enviar. No te quedes sin el!`,
        [
          { label: 'Si, enviar ahora', action: 'send-wa' },
          { label: 'Ver carrito', action: 'view-cart' },
        ],
        undefined,
        400
      );
    } else if (urgencyLevel >= 3) {
      simulateTyping(
        `⚡ Ultimo aviso! Tu pedido ($${cartTotal}) se va a perder. Envialo ya por WhatsApp?`,
        [
          { label: 'Si, enviar!', action: 'send-wa' },
          { label: 'Cerrar sin enviar', action: 'close-chat' },
        ],
        undefined,
        300
      );
    }
  }, [urgencyLevel]);

  // Reset inactivity on any interaction
  const resetInactivity = useCallback(() => {
    setInactivityTimer(0);
    setUrgencyLevel(0);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (!panelRef.current) return;
    if (isOpen) {
      gsap.fromTo(panelRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.5)' }
      );
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 350);
      if (messages.length === 0) startFlow();
    }
  }, [isOpen]);

  // ── Bot messaging ──
  const botSay = useCallback((text: string, quickReplies?: QuickReply[], productCards?: AdminProduct[]) => {
    const id = idCounter.current++;
    setMessages(prev => [...prev, { id, text, sender: 'bot', quickReplies, productCards }]);
  }, []);

  const userSay = useCallback((text: string) => {
    const id = idCounter.current++;
    setMessages(prev => [...prev, { id, text, sender: 'user' }]);
  }, []);

  const simulateTyping = useCallback((text: string, quickReplies?: QuickReply[], productCards?: AdminProduct[], delay = 700) => {
    setTyping(true);
    typingTimeout.current = setTimeout(() => {
      setTyping(false);
      botSay(text, quickReplies, productCards);
    }, delay);
  }, [botSay]);

  // ── Revenue-boosting helpers ──

  // Micro-reward phrases randomized after adding items
  const getMicroReward = () => {
    const phrases = [
      'Buena eleccion! ',
      'Excelente! ',
      'Sabrosa eleccion! ',
      'Gran gusto! ',
      'Anotado! ',
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  // Price anchoring: show individual vs combo value
  const getPriceAnchor = (combo: AdminProduct) => {
    // Calculate what individual items would cost
    const individualTotal = combo.price + 35; // anchor: combo saves $35
    return `Antes: $${individualTotal} · Ahora: $${combo.price} (ahorras $${individualTotal - combo.price})`;
  };

  // Cross-sell: detect gaps in cart (no sides, no drinks)
  const getCrossSell = () => {
    const hasMain = chatCart.some(i => i.product.category === 'alitas' || i.product.category === 'boneless' || i.product.category === 'combos');
    const hasSide = chatCart.some(i => i.product.category === 'papas');
    const hasDrink = chatCart.some(i => i.product.name.toLowerCase().includes('refresco') || i.product.name.toLowerCase().includes('bebida'));

    if (hasMain && !hasSide) {
      const papas = menuProducts.find(p => p.category === 'papas' && p.available);
      if (papas) return { product: papas, message: `Te faltan las papas! ${papas.name} por $${papas.price} complementa perfecto.` };
    }
    if (hasMain && !hasDrink) {
      const drink = menuProducts.find(p => p.category === 'extras' && p.available && (p.name.toLowerCase().includes('refresco') || p.name.toLowerCase().includes('bebida')));
      if (drink) return { product: drink, message: `Con sed? ${drink.name} por $${drink.price} para acompanar.` };
    }
    return null;
  };

  // ── Recommendation engine (must be before startFlow) ──
  const getTopCombos = useCallback(() => {
    return menuProducts.filter(p => p.category === 'combos' && p.available).slice(0, 3);
  }, [menuProducts]);

  const getBestsellers = useCallback(() => {
    // Prioritize: combos first, then highest-priced available items
    return menuProducts
      .filter(p => p.available)
      .sort((a, b) => {
        const aCombo = a.category === 'combos' ? 1 : 0;
        const bCombo = b.category === 'combos' ? 1 : 0;
        return bCombo - aCombo || b.price - a.price;
      })
      .slice(0, 4);
  }, [menuProducts]);

  const getFavorites = useCallback(() => {
    const favIds = Object.entries(prefs.favorites)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
    return menuProducts.filter(p => favIds.includes(p.id));
  }, [menuProducts, prefs.favorites]);

  const suggestExtras = useCallback((mainProduct: AdminProduct) => {
    const extras = menuProducts.filter(p => p.category === 'extras' && p.available).slice(0, 2);
    return extras;
  }, [menuProducts]);

  const suggestUpgrade = useCallback((product: AdminProduct) => {
    if (product.category === 'alitas' || product.category === 'boneless') {
      const combos = getTopCombos();
      return combos[0] || null;
    }
    return null;
  }, [getTopCombos]);

  // ── Start flow ──
  const startFlow = useCallback(() => {
    setFlow('idle');
    setChatCart(loadChatCart());

    const favEntries = Object.entries(prefs.favorites)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    const defaultCombo = getTopCombos()[0];

    if (prefs.pastOrders.length > 0) {
      const lastOrder = prefs.pastOrders[prefs.pastOrders.length - 1];
      simulateTyping(
        `Hola de nuevo! Tu ultimo pedido: ${lastOrder.items.join(', ')} ($${lastOrder.total}).\n\nHoy te recomiendo el ${defaultCombo?.name || 'Combo 911'} ($${defaultCombo?.price || 115}) — ${getPriceAnchor(defaultCombo!)}.\n\nEl mas pedido!`,
        [
          { label: `Si, agregar $${defaultCombo?.price || 115}`, action: 'add-combo' },
          { label: 'Repetir ultimo', action: 'repeat' },
          { label: 'Ver menu', action: 'menu' },
        ],
        undefined,
        500
      );
    } else if (favEntries.length > 0) {
      const topFav = menuProducts.find(p => p.id === favEntries[0][0]);
      simulateTyping(
        `Hola! Vi que te gusta ${topFav?.name || 'nuestro menu'}.\n\nTe recomiendo el ${defaultCombo?.name || 'Combo 911'} ($${defaultCombo?.price || 115}) — ${getPriceAnchor(defaultCombo!)}.\n\nLo agregamos?`,
        [
          { label: `Si, agregar $${defaultCombo?.price || 115}`, action: 'add-combo' },
          { label: 'Ver combos', action: 'combos' },
          { label: 'Ver menu', action: 'menu' },
        ],
        undefined,
        500
      );
    } else {
      simulateTyping(
        `Hola! Soy el asistente de Snacks 911.\n\n🔥 ${defaultCombo?.name || 'Combo 911'} — ${getPriceAnchor(defaultCombo!)}.\n\nBoneless + Papas + Aderezo. El mas pedido!\n\nLo agregamos?`,
        [
          { label: `Si, agregar $${defaultCombo?.price || 115}`, action: 'add-combo' },
          { label: 'Ver otros combos', action: 'combos' },
          { label: 'Ver menu', action: 'menu' },
        ],
        undefined,
        500
      );
    }
  }, [prefs, simulateTyping, menuProducts, getTopCombos]);

  // ── Order system ──
  const addToChatCart = useCallback((product: AdminProduct) => {
    track('chatbot_add', { name: product.name, price: product.price });

    // Update favorites
    const newPrefs = { ...prefs };
    newPrefs.favorites[product.id] = (newPrefs.favorites[product.id] || 0) + 1;
    setPrefs(newPrefs);
    savePrefs(newPrefs);

    const updated = [...chatCart, { product, qty: 1 }];
    setChatCart(updated);
    saveChatCart(updated);

    // Also add to main cart
    onAddToCart(toProduct(product));

    const cartTotal = updated.reduce((s, i) => s + i.product.price * i.qty, 0);
    const crossSell = getCrossSell();
    const upgrade = suggestUpgrade(product);

    // Micro-reward feedback
    const reward = getMicroReward();

    let followUp = `${reward}${product.name} agregado! Total: $${cartTotal}. `;
    const replies: QuickReply[] = [];

    // Priority: combo upgrade > cross-sell > extras > checkout
    if (upgrade) {
      followUp += `Hazlo combo (+$${upgrade.price - product.price}): ${upgrade.name}. ${getPriceAnchor(upgrade)}`;
      replies.push({ label: `Si, combo $${upgrade.price}`, action: `upgrade-${upgrade.id}` });
      replies.push({ label: 'No, seguir', action: 'more' });
    } else if (crossSell) {
      followUp += crossSell.message;
      replies.push({ label: `Si, agregar +$${crossSell.product.price}`, action: `add-${crossSell.product.id}` });
      replies.push({ label: `Terminar ($${cartTotal})`, action: 'confirm' });
    } else {
      followUp += 'Algo mas o terminamos?';
      replies.push({ label: 'Agregar otro', action: 'more' });
      replies.push({ label: `Terminar ($${cartTotal})`, action: 'confirm' });
    }

    simulateTyping(followUp, replies);
    resetInactivity();
  }, [chatCart, prefs, suggestUpgrade, getCrossSell, getMicroReward, getPriceAnchor, onAddToCart, simulateTyping, resetInactivity]);

  const generateOrderSummary = useCallback(() => {
    const total = chatCart.reduce((s, i) => s + i.product.price * i.qty, 0);
    const lines = chatCart.map(i => `• ${i.qty}x ${i.product.name} — $${i.product.price * i.qty}`).join('\n');
    return { text: `Tu pedido:\n\n${lines}\n\nTotal: $${total}`, total };
  }, [chatCart]);

  const sendToWhatsApp = useCallback(() => {
    const summary = generateOrderSummary();
    const message = `🚨 *PEDIDO SNACKS 911*\n\n${summary.text.replace(/\n/g, '\n')}\n\n¡Quiero hacer este pedido!`;

    // Save to preferences
    const newPrefs = { ...prefs };
    newPrefs.pastOrders.push({
      items: chatCart.map(i => i.product.name),
      total: summary.total,
      date: new Date().toISOString(),
    });
    if (newPrefs.pastOrders.length > 20) newPrefs.pastOrders = newPrefs.pastOrders.slice(-20);
    setPrefs(newPrefs);
    savePrefs(newPrefs);

    // Clear chat cart
    setChatCart([]);
    saveChatCart([]);

    const cleanNum = (process.env.NEXT_PUBLIC_WHATSAPP || '525584507458').replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanNum}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    simulateTyping(
      `Pedido enviado por WhatsApp! Total: $${summary.total}. Gracias por tu compra!`,
      [{ label: 'Hacer otro pedido', action: 'restart' }],
      undefined,
      800
    );
    setFlow('done');
  }, [chatCart, prefs, generateOrderSummary, simulateTyping]);

  // ── Action handler ──
  const handleAction = useCallback((action: string) => {
    // Handle upgrade
    if (action.startsWith('upgrade-')) {
      const id = action.replace('upgrade-', '');
      const product = menuProducts.find(p => p.id === id);
      if (product) {
        userSay(`Si, quiero el ${product.name}`);
        addToChatCart(product);
      }
      return;
    }

    switch (action) {
      case 'order':
        userSay('Quiero pedir ahora');
        setFlow('ordering');
        if (chatCart.length > 0) {
          const summary = generateOrderSummary();
          simulateTyping(
            `Ya tienes ${chatCart.length} producto(s):\n\n${summary.text}\n\nConfirmamos?`,
            [
              { label: 'Confirmar y enviar', action: 'confirm' },
              { label: 'Agregar mas', action: 'more' },
              { label: 'Vaciar carrito', action: 'clear-cart' },
            ]
          );
        } else {
          const defaultCombo = getTopCombos()[0];
          simulateTyping(
            `Dale! El ${defaultCombo?.name || 'Combo 911'} ($${defaultCombo?.price || 115}) es el mas pedido — Boneless + Papas + Aderezo.\n\nLo agregamos?`,
            [
              { label: `Si, agregar $${defaultCombo?.price || 115}`, action: 'add-combo' },
              { label: 'Ver combos', action: 'combos' },
              { label: 'Ver populares', action: 'more' },
            ]
          );
        }
        break;

      case 'combos':
        userSay('Quiero ver los combos');
        setFlow('browsing');
        const combos = getTopCombos();
        const comboLines = combos.map(c => `• ${c.name} — $${c.price} (${getPriceAnchor(c).split('(')[1]}`);
        const comboText = combos.map(c => `• ${c.name} — $${c.price}`).join('\n');
        simulateTyping(
          `Combos con mejor valor:\n\n${comboText}\n\nCual quieres?`,
          undefined,
          combos
        );
        resetInactivity();
        break;

      case 'menu':
        userSay('Quiero ver el menu');
        setFlow('browsing');
        const cats = [...new Set(menuProducts.filter(p => p.available).map(p => p.category))];
        simulateTyping(
          `Categorias disponibles:\n\n${cats.map(c => `• ${c.charAt(0).toUpperCase() + c.slice(1)}`).join('\n')}\n\nCual te interesa?`,
          cats.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), action: `cat-${c}` }))
        );
        break;

      case 'repeat': {
        userSay('Repetir mi ultimo pedido');
        const lastOrder = prefs.pastOrders[prefs.pastOrders.length - 1];
        if (lastOrder) {
          const matched = lastOrder.items
            .map(name => menuProducts.find(p => p.name.toLowerCase().includes(name.toLowerCase())))
            .filter(Boolean) as AdminProduct[];

          if (matched.length > 0) {
            matched.forEach(p => {
              addToChatCart(p);
            });
            userSay(`Agregando: ${matched.map(p => p.name).join(', ')}`);
            const summary = generateOrderSummary();
            setTimeout(() => {
              simulateTyping(
                `Listo! ${summary.text}`,
                [
                  { label: 'Confirmar', action: 'confirm' },
                  { label: 'Agregar algo mas', action: 'more' },
                ]
              );
            }, 500);
            return;
          }
        }
        simulateTyping('No encontre tu ultimo pedido. Que quieres ordenar?');
        break;
      }

      case 'favorites': {
        userSay('Quiero ver mis favoritos');
        const favs = getFavorites();
        if (favs.length > 0) {
          const favText = favs.map(f => `• ${f.name} — $${f.price}`).join('\n');
          simulateTyping(
            `Tus favoritos:\n\n${favText}`,
            undefined,
            favs
          );
        } else {
          simulateTyping('Aun no tienes favoritos. Te recomiendo el Combo 911!', [
            { label: 'Agregar Combo 911', action: 'add-combo' },
          ]);
        }
        break;
      }

      case 'more':
        userSay('Quiero agregar algo mas');
        const best = getBestsellers();
        const cartTotal2 = chatCart.reduce((s, i) => s + i.product.price * i.qty, 0);
        const crossSell2 = getCrossSell();
        const urgencyMsg = cartTotal2 > 0
          ? `\n\nLlevas $${cartTotal2}. ${crossSell2 ? crossSell2.message : 'Agrega algo mas para completar!'}`
          : '';
        simulateTyping(
          `Lo mas pedido:${urgencyMsg}`,
          [{ label: `Terminar ($${cartTotal2})`, action: 'confirm' }],
          best
        );
        resetInactivity();
        break;

      case 'confirm':
        userSay('Confirmar pedido');
        setFlow('confirm');
        const summary = generateOrderSummary();
        simulateTyping(
          `${summary.text}\n\nSe enviara por WhatsApp y te confirmamos al instante. Procedemos?`,
          [
            { label: 'Si, enviar ahora', action: 'send-wa' },
            { label: 'Agregar algo mas', action: 'more' },
          ]
        );
        resetInactivity();
        break;

      case 'send-wa':
        userSay('Si, enviar pedido');
        sendToWhatsApp();
        resetInactivity();
        break;

      case 'view-cart':
        userSay('Ver mi carrito');
        if (chatCart.length === 0) {
          simulateTyping('Tu carrito esta vacio. Que quieres agregar?', [
            { label: 'Combos', action: 'combos' },
            { label: 'Populares', action: 'more' },
          ]);
        } else {
          const cartSummary = generateOrderSummary();
          simulateTyping(
            cartSummary.text,
            [
              { label: 'Confirmar pedido', action: 'confirm' },
              { label: 'Agregar mas', action: 'more' },
              { label: 'Vaciar carrito', action: 'clear-cart' },
            ]
          );
        }
        break;

      case 'clear-cart':
        userSay('Vaciar carrito');
        setChatCart([]);
        saveChatCart([]);
        simulateTyping('Carrito vaciado. Que quieres ordenar?', [
          { label: 'Pedir ahora', action: 'order' },
          { label: 'Ver combos', action: 'combos' },
        ]);
        break;

      case 'add-combo': {
        const combo = menuProducts.find(p => p.id === '7') || getTopCombos()[0];
        if (combo) {
          userSay(`Quiero el ${combo.name}`);
          addToChatCart(combo);
        }
        break;
      }

      case 'restart':
        setChatCart([]);
        saveChatCart([]);
        setMessages([]);
        startFlow();
        resetInactivity();
        break;

      case 'close-chat':
        userSay('Cerrar sin enviar');
        setChatCart([]);
        saveChatCart([]);
        simulateTyping('Pedido cancelado. Si cambias de opinion, aqui estamos!', [
          { label: 'Hacer pedido', action: 'restart' },
        ]);
        break;

      default: {
        // add-{id}
        if (action.startsWith('add-')) {
          const id = action.replace('add-', '');
          const product = menuProducts.find(p => p.id === id);
          if (product) {
            userSay(`Quiero ${product.name}`);
            addToChatCart(product);
          }
        }
        // cat-{category}
        else if (action.startsWith('cat-')) {
          const cat = action.replace('cat-', '');
          userSay(`Quiero ver ${cat}`);
          const catProducts = menuProducts.filter(p => p.category === cat && p.available);
          const catText = catProducts.map(p => `• ${p.name} — $${p.price}`).join('\n');
          simulateTyping(
            catText || 'No hay productos en esta categoria',
            undefined,
            catProducts
          );
        }
        break;
      }
    }
  }, [
    menuProducts, chatCart, prefs, getTopCombos, getBestsellers, getFavorites,
    generateOrderSummary, addToChatCart, sendToWhatsApp, startFlow,
    simulateTyping, userSay,
  ]);

  // ── Free text handler ──
  const handleFreeText = useCallback((text: string) => {
    userSay(text);
    const lower = text.toLowerCase();

    // Order intent (highest priority)
    if (lower.includes('pedir') || lower.includes('quiero') || lower.includes('ordenar') ||
        lower.includes('comprar') || lower.includes('dame') || lower.includes('manda')) {
      handleAction('order'); return;
    }

    // Combo intent
    if (lower.includes('combo') || lower.includes('paquete') || lower.includes('menu')) {
      handleAction('combos'); return;
    }

    // Specific product mention
    const mentionedProduct = menuProducts.find(p =>
      lower.includes(p.name.toLowerCase().split(' ')[0].toLowerCase())
    );
    if (mentionedProduct) {
      userSay(`Quiero ${mentionedProduct.name}`);
      addToChatCart(mentionedProduct);
      return;
    }

    // Price inquiry
    if (lower.includes('precio') || lower.includes('costo') || lower.includes('cuanto') || lower.includes('vale')) {
      const combos = getTopCombos();
      const priceList = combos.map(c => `• ${c.name}: $${c.price}`).join('\n');
      simulateTyping(
        `Precios:\n\n${priceList}\n\nEl Combo 911 ($115) es el mas pedido. Lo quieres?`,
        [{ label: 'Si, agregar', action: 'add-combo' }],
        combos
      );
      return;
    }

    // Urgency / delivery
    if (lower.includes('rapido') || lower.includes('urgente') || lower.includes('ya') || lower.includes('entrega')) {
      simulateTyping(
        'Entrega en ~30 min! El Combo 911 esta listo para enviar. Lo agregamos?',
        [
          { label: 'Si, pedir ahora', action: 'add-combo' },
          { label: 'Ver combos', action: 'combos' },
        ]
      );
      return;
    }

    // Schedule
    if (lower.includes('horario') || lower.includes('hora') || lower.includes('abierto')) {
      simulateTyping(
        'Lun-Mie: 1-10pm | Jue: 1-11pm | Vie-Sab: 12-12am | Dom: Cerrado\n\nAprovecha y pide ahora!',
        [
          { label: 'Pedir ahora', action: 'order' },
          { label: 'Ver combos', action: 'combos' },
        ]
      );
      return;
    }

    // Thanks
    if (lower.includes('gracias') || lower.includes('thanks')) {
      simulateTyping('De nada! Si quieres hacer otro pedido, aqui estoy!', [
        { label: 'Hacer otro pedido', action: 'restart' },
      ]);
      return;
    }

    // Hunger signals
    if (lower.includes('hambre') || lower.includes('antojo') || lower.includes('comer') || lower.includes('cenar')) {
      simulateTyping(
        'Te ayudo con eso! El Combo 911 ($115) es perfecto para el antojo: Boneless + Papas + Aderezo.',
        [
          { label: 'Si, agregar', action: 'add-combo' },
          { label: 'Ver otros combos', action: 'combos' },
        ]
      );
      return;
    }

    // Fallback → always guide to order with combo
    const defaultCombo = getTopCombos()[0];
    simulateTyping(
      `Te recomiendo el ${defaultCombo?.name || 'Combo 911'} ($${defaultCombo?.price || 115}) — es el mas pedido y llega en 30 min. Lo agregamos?`,
      [
        { label: `Si, agregar $${defaultCombo?.price || 115}`, action: 'add-combo' },
        { label: 'Ver combos', action: 'combos' },
        { label: 'Ver menu', action: 'menu' },
      ]
    );
  }, [userSay, simulateTyping, handleAction, getTopCombos, addToChatCart, menuProducts]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    handleFreeText(input.trim());
    setInput('');
  }, [input, handleFreeText]);

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            left: '1.5rem',
            width: '380px',
            maxWidth: 'calc(100vw - 3rem)',
            height: '540px',
            maxHeight: 'calc(100vh - 8rem)',
            zIndex: 500,
            borderRadius: '20px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(14,14,14,0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,69,0,0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(255,69,0,0.05)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '0.75rem 1.15rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,69,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF4500, #FFB800)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff' }}>
                  Asistente 911
                </div>
                <div style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  En linea
                  {chatCart.length > 0 && (
                    <span style={{ color: '#FF4500', marginLeft: '0.3rem' }}>
                      · ${chatCart.reduce((s, i) => s + i.product.price * i.qty, 0)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', width: '28px', height: '28px',
                cursor: 'pointer', color: '#888', fontSize: '0.75rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '0.75rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
          }}>
            {messages.map(msg => (
              <div key={msg.id}>
                <div
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    display: msg.sender === 'user' ? 'flex' : 'block',
                    justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: msg.sender === 'user'
                      ? '14px 14px 4px 14px'
                      : '14px 14px 14px 4px',
                    background: msg.sender === 'user'
                      ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                      : 'rgba(255,255,255,0.06)',
                    border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    color: msg.sender === 'user' ? '#fff' : '#ccc',
                    fontSize: '0.8rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                  }}>
                    {msg.text}
                  </div>
                </div>

                {/* Product cards */}
                {msg.productCards && msg.productCards.length > 0 && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '0.35rem',
                    marginTop: '0.35rem',
                  }}>
                    {msg.productCards.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleAction(`add-${p.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          padding: '0.5rem 0.7rem',
                          borderRadius: '10px',
                          background: 'rgba(255,69,0,0.06)',
                          border: '1px solid rgba(255,69,0,0.15)',
                          cursor: 'pointer', textAlign: 'left',
                          transition: 'transform 0.1s',
                          width: '100%',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.01)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                      >
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '8px',
                          overflow: 'hidden', flexShrink: 0, background: '#1a1a1a',
                        }}>
                          <Image
                            src={p.imageUrl || '/images/combo.webp'}
                            alt={p.name}
                            width={36}
                            height={36}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff' }}>{p.name}</div>
                          <div style={{ fontSize: '0.68rem', color: '#555' }}>{p.description?.slice(0, 40)}...</div>
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#FF4500', flexShrink: 0 }}>
                          ${p.price}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick replies */}
                {msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '0.3rem',
                    marginTop: '0.35rem',
                  }}>
                    {msg.quickReplies.map(qr => (
                      <button
                        key={qr.action}
                        onClick={() => handleAction(qr.action)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '10px',
                          background: qr.action.startsWith('add-') || qr.action.startsWith('upgrade-')
                            ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                            : 'rgba(255,69,0,0.1)',
                          border: qr.action.startsWith('add-') || qr.action.startsWith('upgrade-')
                            ? 'none'
                            : '1px solid rgba(255,69,0,0.2)',
                          color: '#fff',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'transform 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div style={{
                alignSelf: 'flex-start',
                padding: '0.6rem 0.9rem',
                borderRadius: '14px 14px 14px 4px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', gap: '4px', alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: '#888',
                    animation: `chatDot 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={e => { e.preventDefault(); handleSend(); }}
            style={{
              padding: '0.6rem 0.85rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', gap: '0.4rem',
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe aqui..."
              style={{
                flex: 1, padding: '0.55rem 0.8rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', color: '#fff',
                fontSize: '0.8rem', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              style={{
                padding: '0.55rem 0.75rem',
                background: input.trim()
                  ? 'linear-gradient(135deg, #FF4500, #FF6500)'
                  : 'rgba(255,255,255,0.05)',
                border: 'none', borderRadius: '10px',
                color: input.trim() ? '#fff' : '#555',
                fontWeight: 700, fontSize: '0.8rem',
                cursor: input.trim() ? 'pointer' : 'default',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.12, duration: 0.2, ease: 'back.out(1.7)' })}
        onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.2, ease: 'power2.out' })}
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '1.5rem',
          zIndex: 500,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: isOpen
            ? 'rgba(255,255,255,0.1)'
            : 'linear-gradient(135deg, #FF4500, #FF6500)',
          border: isOpen
            ? '1px solid rgba(255,255,255,0.15)'
            : '2px solid rgba(255,184,0,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isOpen ? 'none' : '0 4px 24px rgba(255,69,0,0.35)',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        )}

        {unread > 0 && !isOpen && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: '#FFB800', color: '#000',
            borderRadius: '50%', width: '20px', height: '20px',
            fontSize: '0.65rem', fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread}
          </span>
        )}
      </button>

      <style>{`
        @keyframes chatDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </>
  );
}
