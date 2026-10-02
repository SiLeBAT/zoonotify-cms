// Classifies every content type under src/api/*/content-types/ by pluralName.
// Generation fails on a type listed in neither group, so adding a content type
// forces a decision on whether it joins the Public Data API.
// `include` groups are tags defined in base.mjs; their order is the spec's order.

export default {
  include: {
    'Surveillance data': ['prevalences', 'resistances', 'multi-resistances'],
    'Reference vocabularies': [
      'microorganisms',
      'matrices',
      'matrix-groups',
      'matrix-details',
      'sample-origins',
      'super-category-sample-origins',
      'sampling-stages',
      'sample-types',
      'species',
      'antimicrobial-substances',
      'antibiotics',
      'resistance-tables',
    ],
  },
  exclude: [
    // Raw rows; exposing them is BfR's call.
    'isolates',
    // Curated publications rather than a data feed.
    'evaluations',
    // Internal or legacy data.
    'configurations',
    'prevelence-updates',
    'salmonellas',
    'sampling-contexts',
    'animal-species-food-categories',
    'animal-species-production-type-foods',
    'controlled-vocabularies',
    'microbial-counts',
    // Page content.
    'amr-pages',
    'amu-pages',
    'data-protection-declarations',
    'evaluation-informations',
    'explanations',
    'externallinks',
    'informations',
    'multi-resistance-informations',
    'prevalence-informations',
    'substance-informations',
    'trend-informations',
    'welcomes',
  ],
};
