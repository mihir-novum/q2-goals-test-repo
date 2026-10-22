import { clsx, type ClassValue } from "clsx";
import { type Route } from "next";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* eslint-disable */
export function typed_route<T extends string>(route: T): Route<T> {
  return route as Route<T>;
}
/* eslint-enable */
