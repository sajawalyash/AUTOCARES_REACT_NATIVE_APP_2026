import { router, type Href } from 'expo-router';

/** Typed-routes-safe navigation helper for dynamic paths. */
export function go(href: string) {
  router.push(href as Href);
}

export function replace(href: string) {
  router.replace(href as Href);
}
