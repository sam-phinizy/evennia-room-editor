import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Capitalizes the first letter of a string
 * Useful for converting JavaScript boolean values to Python format
 * e.g., "true" -> "True", "false" -> "False"
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str || typeof str !== 'string') return str
  return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase()
}
