import type { Schema, Attribute } from '@strapi/strapi';

export interface AntibioticDataAntibioticCutOffData extends Schema.Component {
  collectionName: 'components_antibiotic_cut_off';
  info: {
    displayName: 'AntibioticCutOffData';
    description: '';
  };
  attributes: {
    year: Attribute.Integer;
    antibiotic: Attribute.Relation<
      'antibiotic-data.antibiotic-cut-off-data',
      'oneToOne',
      'api::antibiotic.antibiotic'
    >;
    substanzklasse: Attribute.Enumeration<
      [
        'Aminoglycoside',
        'Amphenicole',
        'Penicilline',
        'Cephalosporine',
        'Carbapeneme',
        '(Fluor)chinolone',
        'Polymyxine',
        'Tetrazykline',
        'Glycylcycline',
        'Azalide',
        'Folatsynthesehemmer',
        'Sulfonamide',
        'Makrolide',
        'Ansamycine',
        'Lincosamide',
        'Glykopeptide',
        'Oxazolidinone',
        'Pleuromutiline',
        'Pseudomonische S\u00E4uren',
        'Streptogramine',
        'Triterpens\u00E4uren',
        'Lipopeptide'
      ]
    >;
    bacteria: Attribute.Enumeration<
      [
        'Escherichia coli',
        'Salmonella spp',
        'Campylobacter jejuni',
        'Campylobacter coli',
        'methicillin-resistant Staphylococcus aureus',
        'Enterococcus faecalis',
        'Enterococcus faecium'
      ]
    >;
    min: Attribute.Decimal;
    max: Attribute.Decimal;
    cutOff: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'antibiotic-data.antibiotic-cut-off-data': AntibioticDataAntibioticCutOffData;
    }
  }
}
