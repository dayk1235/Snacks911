export interface UserContext {
  lastIntent?: string;
  lastCategory?: string;
  constraints: string[];
  lastProductsShown: string[];
}

const userContextStore = new Map<string, UserContext>();

export function getContext(userId: string): UserContext {
  if (!userContextStore.has(userId)) {
    userContextStore.set(userId, {
      constraints: [],
      lastProductsShown: [],
    });
  }
  return userContextStore.get(userId)!;
}

export function updateContext(userId: string, data: Partial<UserContext>): void {
  const currentContext = getContext(userId);
  userContextStore.set(userId, {
    ...currentContext,
    ...data,
  });
}
