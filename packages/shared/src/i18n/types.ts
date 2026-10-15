export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

type Join<K extends string, P extends string> = `${K}.${P}`;
/** Toutes les clés "a.b.c" d'un dictionnaire, pour un t() typé. */
export type DotKeys<T> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, DotKeys<T[K]>>;
}[keyof T & string];
