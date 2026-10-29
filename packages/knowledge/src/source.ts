/**
 * As únicas citações estruturadas válidas em todo o pacote — toda ficha/dica reexporta uma destas
 * constantes, nunca escreve `{ book, author }` solto (data-model.md). DDIA entrou no M4.3, para os
 * conceitos de system design.
 */
export type Source = { book: string; author: string };

export const CLEAN_ARCHITECTURE: Source = {
  book: 'Clean Architecture',
  author: 'Robert C. Martin',
};

export const FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE: Source = {
  book: 'Fundamentals of Software Architecture',
  author: 'Mark Richards & Neal Ford',
};

export const PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE: Source = {
  book: 'Patterns of Enterprise Application Architecture',
  author: 'Martin Fowler',
};

export const DESIGNING_DATA_INTENSIVE_APPLICATIONS: Source = {
  book: 'Designing Data-Intensive Applications',
  author: 'Martin Kleppmann',
};
