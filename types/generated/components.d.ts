import type { Schema, Attribute } from '@strapi/strapi';

export interface AntibioticDataAntibioticCutOffData extends Schema.Component {
  collectionName: 'components_antibiotic_cut_off';
  info: {
    displayName: 'AntibioticCutOffData';
    description: '';
  };
  attributes: {
    antibiotic: Attribute.Relation<
      'antibiotic-data.antibiotic-cut-off-data',
      'oneToOne',
      'api::antibiotic.antibiotic'
    >;
    min: Attribute.Decimal;
    max: Attribute.Decimal;
    cutOff: Attribute.Decimal;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'antibiotic-data.antibiotic-cut-off-data': AntibioticDataAntibioticCutOffData;
    }
  }
}
