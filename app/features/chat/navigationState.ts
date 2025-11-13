let lastChatRoute = '/(tabs)/chat';

export function getLastChatRoute() {
  return lastChatRoute;
}

export function setLastChatRoute(route: string) {
  if (!route) return;
  lastChatRoute = route;
}

