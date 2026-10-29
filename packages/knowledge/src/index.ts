export {
  CLEAN_ARCHITECTURE,
  DESIGNING_DATA_INTENSIVE_APPLICATIONS,
  FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
  PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE,
  type Source,
} from './source.js';
export { ARCHITECTURE_CHARACTERISTICS, type ArchitectureCharacteristic, type Tradeoff } from './architecture-characteristic.js';
export { ARCHITECTURE_STYLES, type ArchitectureStyle, type TemplateId } from './architecture-style.js';
export { ALL_KNOWLEDGE_IDS, isKnownKnowledgeId } from './citation.js';
export {
  LIBRARY_CATEGORY_LABELS,
  LIBRARY_ENTRIES,
  CONCEPT_ENTRIES,
  getLibraryEntry,
  validateLibraryEntries,
  type LibraryCategory,
  type LibraryEntry,
  type TopologyRelation,
} from './library.js';
export {
  REFERENCE_ARCHITECTURES,
  getReferenceArchitecture,
  toDesign,
  validateReferenceArchitecture,
  type PresetEdge,
  type PresetNode,
  type ReferenceArchitecture,
  type WebSource,
} from './reference-architectures.js';
