import type { Schema, Attribute } from '@strapi/strapi';

export interface AdminPermission extends Schema.CollectionType {
  collectionName: 'admin_permissions';
  info: {
    name: 'Permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Attribute.JSON & Attribute.DefaultTo<{}>;
    subject: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    properties: Attribute.JSON & Attribute.DefaultTo<{}>;
    conditions: Attribute.JSON & Attribute.DefaultTo<[]>;
    role: Attribute.Relation<'admin::permission', 'manyToOne', 'admin::role'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminUser extends Schema.CollectionType {
  collectionName: 'admin_users';
  info: {
    name: 'User';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    firstname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    username: Attribute.String;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.Private &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Attribute.String & Attribute.Private;
    registrationToken: Attribute.String & Attribute.Private;
    isActive: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    roles: Attribute.Relation<'admin::user', 'manyToMany', 'admin::role'> &
      Attribute.Private;
    blocked: Attribute.Boolean & Attribute.Private & Attribute.DefaultTo<false>;
    preferedLanguage: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface AdminRole extends Schema.CollectionType {
  collectionName: 'admin_roles';
  info: {
    name: 'Role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    code: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String;
    users: Attribute.Relation<'admin::role', 'manyToMany', 'admin::user'>;
    permissions: Attribute.Relation<
      'admin::role',
      'oneToMany',
      'admin::permission'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface AdminApiToken extends Schema.CollectionType {
  collectionName: 'strapi_api_tokens';
  info: {
    name: 'Api Token';
    singularName: 'api-token';
    pluralName: 'api-tokens';
    displayName: 'Api Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    type: Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Attribute.Required &
      Attribute.DefaultTo<'read-only'>;
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Attribute.DateTime;
    permissions: Attribute.Relation<
      'admin::api-token',
      'oneToMany',
      'admin::api-token-permission'
    >;
    expiresAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_api_token_permissions';
  info: {
    name: 'API Token Permission';
    description: '';
    singularName: 'api-token-permission';
    pluralName: 'api-token-permissions';
    displayName: 'API Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Attribute.Relation<
      'admin::api-token-permission',
      'manyToOne',
      'admin::api-token'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferToken extends Schema.CollectionType {
  collectionName: 'strapi_transfer_tokens';
  info: {
    name: 'Transfer Token';
    singularName: 'transfer-token';
    pluralName: 'transfer-tokens';
    displayName: 'Transfer Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Attribute.DateTime;
    permissions: Attribute.Relation<
      'admin::transfer-token',
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    expiresAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    name: 'Transfer Token Permission';
    description: '';
    singularName: 'transfer-token-permission';
    pluralName: 'transfer-token-permissions';
    displayName: 'Transfer Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Attribute.Relation<
      'admin::transfer-token-permission',
      'manyToOne',
      'admin::transfer-token'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFile extends Schema.CollectionType {
  collectionName: 'files';
  info: {
    singularName: 'file';
    pluralName: 'files';
    displayName: 'File';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    alternativeText: Attribute.String;
    caption: Attribute.String;
    width: Attribute.Integer;
    height: Attribute.Integer;
    formats: Attribute.JSON;
    hash: Attribute.String & Attribute.Required;
    ext: Attribute.String;
    mime: Attribute.String & Attribute.Required;
    size: Attribute.Decimal & Attribute.Required;
    url: Attribute.String & Attribute.Required;
    previewUrl: Attribute.String;
    provider: Attribute.String & Attribute.Required;
    provider_metadata: Attribute.JSON;
    related: Attribute.Relation<'plugin::upload.file', 'morphToMany'>;
    folder: Attribute.Relation<
      'plugin::upload.file',
      'manyToOne',
      'plugin::upload.folder'
    > &
      Attribute.Private;
    folderPath: Attribute.String &
      Attribute.Required &
      Attribute.Private &
      Attribute.SetMinMax<{
        min: 1;
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFolder extends Schema.CollectionType {
  collectionName: 'upload_folders';
  info: {
    singularName: 'folder';
    pluralName: 'folders';
    displayName: 'Folder';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<{
        min: 1;
      }>;
    pathId: Attribute.Integer & Attribute.Required & Attribute.Unique;
    parent: Attribute.Relation<
      'plugin::upload.folder',
      'manyToOne',
      'plugin::upload.folder'
    >;
    children: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.folder'
    >;
    files: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.file'
    >;
    path: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<{
        min: 1;
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesRelease extends Schema.CollectionType {
  collectionName: 'strapi_releases';
  info: {
    singularName: 'release';
    pluralName: 'releases';
    displayName: 'Release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    releasedAt: Attribute.DateTime;
    actions: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Schema.CollectionType {
  collectionName: 'strapi_release_actions';
  info: {
    singularName: 'release-action';
    pluralName: 'release-actions';
    displayName: 'Release Action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    type: Attribute.Enumeration<['publish', 'unpublish']> & Attribute.Required;
    entry: Attribute.Relation<
      'plugin::content-releases.release-action',
      'morphToOne'
    >;
    contentType: Attribute.String & Attribute.Required;
    release: Attribute.Relation<
      'plugin::content-releases.release-action',
      'manyToOne',
      'plugin::content-releases.release'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginI18NLocale extends Schema.CollectionType {
  collectionName: 'i18n_locale';
  info: {
    singularName: 'locale';
    pluralName: 'locales';
    collectionName: 'locales';
    displayName: 'Locale';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.SetMinMax<{
        min: 1;
        max: 50;
      }>;
    code: Attribute.String & Attribute.Unique;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Schema.CollectionType {
  collectionName: 'up_permissions';
  info: {
    name: 'permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String & Attribute.Required;
    role: Attribute.Relation<
      'plugin::users-permissions.permission',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Schema.CollectionType {
  collectionName: 'up_roles';
  info: {
    name: 'role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    description: Attribute.String;
    type: Attribute.String & Attribute.Unique;
    permissions: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    users: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsUser extends Schema.CollectionType {
  collectionName: 'up_users';
  info: {
    name: 'user';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    username: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Attribute.String;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Attribute.String & Attribute.Private;
    confirmationToken: Attribute.String & Attribute.Private;
    confirmed: Attribute.Boolean & Attribute.DefaultTo<false>;
    blocked: Attribute.Boolean & Attribute.DefaultTo<false>;
    role: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAnimalSpeciesFoodTopCategoryAnimalSpeciesFoodTopCategory
  extends Schema.CollectionType {
  collectionName: 'animal_species_food_top_categories';
  info: {
    singularName: 'animal-species-food-top-category';
    pluralName: 'animal-species-food-top-categories';
    displayName: 'DEPRECATED Animal Species Food Top Category';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    name: Attribute.String;
    iri: Attribute.String;
    isolates: Attribute.Relation<
      'api::animal-species-food-top-category.animal-species-food-top-category',
      'oneToMany',
      'api::isolate.isolate'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::animal-species-food-top-category.animal-species-food-top-category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::animal-species-food-top-category.animal-species-food-top-category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAnimalSpeciesProductionDirectionFoodAnimalSpeciesProductionDirectionFood
  extends Schema.CollectionType {
  collectionName: 'animal-species-production-direction-foods';
  info: {
    singularName: 'animal-species-production-direction-food';
    pluralName: 'animal-species-production-direction-foods';
    displayName: 'DEPRECATED Animal Species Production Direction Food';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    name: Attribute.String;
    iri: Attribute.String;
    direction_isolates: Attribute.Relation<
      'api::animal-species-production-direction-food.animal-species-production-direction-food',
      'oneToMany',
      'api::isolate.isolate'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::animal-species-production-direction-food.animal-species-production-direction-food',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::animal-species-production-direction-food.animal-species-production-direction-food',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAntibioticAntibiotic extends Schema.CollectionType {
  collectionName: 'antibiotics';
  info: {
    singularName: 'antibiotic';
    pluralName: 'antibiotics';
    displayName: 'Antibiotic';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    name: Attribute.String;
    shortName: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::antibiotic.antibiotic',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::antibiotic.antibiotic',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiConfigurationConfiguration extends Schema.SingleType {
  collectionName: 'configurations';
  info: {
    singularName: 'configuration';
    pluralName: 'configurations';
    displayName: 'Configuration';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    supportEmail: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::configuration.configuration',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::configuration.configuration',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiEvaluationEvaluation extends Schema.CollectionType {
  collectionName: 'evaluations';
  info: {
    singularName: 'evaluation';
    pluralName: 'evaluations';
    displayName: 'Evaluation';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    title: Attribute.Text &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    description: Attribute.RichText &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    diagram: Attribute.Media &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    division: Attribute.Enumeration<
      ['TIERE', 'FUTTERMITTEL', 'LEBENSMITTEL', 'MULTIPLE']
    > &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    microorganism: Attribute.Enumeration<
      [
        'E_COLI',
        'CAMPYLOBACTER_SPP',
        'ESBL_AMPC_E_COLI',
        'LISTERIA_MONOCYTOGENES',
        'MRSA',
        'SALMONELLA_SPP',
        'STEC',
        'CARBA_E_COLI',
        'ENTEROCOCCUS_SPP'
      ]
    > &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    category: Attribute.Enumeration<
      ['HUHN', 'PUTE', 'SCHWEIN', 'RIND', 'DIVERSE']
    > &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    diagramType: Attribute.Enumeration<
      ['MDR', 'ERREGERCHARAK', 'SUBSTANZ_GRAPH', 'TREND_DIAGRAMM']
    > &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    productionType: Attribute.Enumeration<
      [
        'LEGEHENNEN',
        'MASTHAEHNCHEN',
        'MASTKALB_JUNGRIND',
        'MASTRIND',
        'MASTPUTEN',
        'MASTSCHWEIN',
        'RIND',
        'ZUCHTHUEHNER_LEGE_UND_MASTLINIE',
        'MILCHRIND',
        'DIVERSE'
      ]
    > &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    matrix: Attribute.Enumeration<
      [
        'BLINDDARMINHALT',
        'FRISCHES_FLEISCH',
        'HACKFLEISCH',
        'KOT_STAUB',
        'SCHLACHTKOERPER',
        'HALS_HAUT',
        'MILCH',
        'MULTIPLE'
      ]
    > &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    csv_data: Attribute.Media &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::evaluation.evaluation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::evaluation.evaluation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    localizations: Attribute.Relation<
      'api::evaluation.evaluation',
      'oneToMany',
      'api::evaluation.evaluation'
    >;
    locale: Attribute.String;
  };
}

export interface ApiEvaluationInformationEvaluationInformation
  extends Schema.SingleType {
  collectionName: 'evaluation_informations';
  info: {
    singularName: 'evaluation-information';
    pluralName: 'evaluation-informations';
    displayName: 'Evaluation Information';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    content: Attribute.RichText &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::evaluation-information.evaluation-information',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::evaluation-information.evaluation-information',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    localizations: Attribute.Relation<
      'api::evaluation-information.evaluation-information',
      'oneToMany',
      'api::evaluation-information.evaluation-information'
    >;
    locale: Attribute.String;
  };
}

export interface ApiExplanationExplanation extends Schema.CollectionType {
  collectionName: 'explanations';
  info: {
    singularName: 'explanation';
    pluralName: 'explanations';
    displayName: 'Explanation';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    title: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    section: Attribute.Enumeration<
      ['GRAPHIKEN', 'METHODEN', 'HINTERGRUND', 'DATEN']
    > &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    description: Attribute.RichText &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::explanation.explanation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::explanation.explanation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    localizations: Attribute.Relation<
      'api::explanation.explanation',
      'oneToMany',
      'api::explanation.explanation'
    >;
    locale: Attribute.String;
  };
}

export interface ApiExternallinkExternallink extends Schema.CollectionType {
  collectionName: 'externallinks';
  info: {
    singularName: 'externallink';
    pluralName: 'externallinks';
    displayName: 'External Link';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    link: Attribute.String &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    category: Attribute.Enumeration<
      [
        'LEGAL_REGULATION',
        'REPORTS',
        'ORGANIZATION_AND_INSTITUTES',
        'ONLINE_TOOLS'
      ]
    > &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    priority: Attribute.Integer &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::externallink.externallink',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::externallink.externallink',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    localizations: Attribute.Relation<
      'api::externallink.externallink',
      'oneToMany',
      'api::externallink.externallink'
    >;
    locale: Attribute.String;
  };
}

export interface ApiIsolateIsolate extends Schema.CollectionType {
  collectionName: 'isolates';
  info: {
    singularName: 'isolate';
    pluralName: 'isolates';
    displayName: 'DEPRECATED isolate';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    samplingYear: Attribute.BigInteger;
    microorganism: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::microorganism.microorganism'
    >;
    samplingContext: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::sampling-objective.sampling-objective'
    >;
    samplingStage: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::sampling-point.sampling-point'
    >;
    sampleType: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::sampling-origin.sampling-origin'
    >;
    matrix: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::matrix.matrix'
    >;
    matrixDetail: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::matrix-detail.matrix-detail'
    >;
    animalSpeciesProductionTypeFood: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::animal-species-production-direction-food.animal-species-production-direction-food'
    >;
    salmonella: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::salmonella.salmonella'
    >;
    bfrIsolatNr: Attribute.String;
    dbId: Attribute.String;
    nrl: Attribute.String;
    zomoProgramm: Attribute.String;
    berichte: Attribute.String;
    mrsaSpaTyp: Attribute.String;
    mrsaKlonaleGruppe: Attribute.String;
    enteroSpez: Attribute.String;
    campySpez: Attribute.String;
    listeriaSerotyp: Attribute.String;
    stecSerotyp: Attribute.String;
    stx1Gen: Attribute.String;
    stx2Gen: Attribute.String;
    eaeGen: Attribute.String;
    e_hlyGen: Attribute.String;
    ESBL_AmpC_Carba_Phanotyp: Attribute.String;
    WGS: Attribute.String;
    keine_Gene_oder_Mutationen_gefunden: Attribute.String;
    ESBL_Gene: Attribute.String;
    nicht_ESBL_Beta_Laktamase_Gene: Attribute.String;
    AmpC_Gene: Attribute.String;
    AmpC_Punktmutation: Attribute.String;
    Carbapenemase_Gene: Attribute.String;
    Gene_noch_zu_bestimmen: Attribute.String;
    AK_Res_quant: Attribute.String;
    GEN_Res_quant: Attribute.String;
    KAN_Res_quant: Attribute.String;
    STR_Res_quant: Attribute.String;
    CHL_Res_quant: Attribute.String;
    FFN_Res_quant: Attribute.String;
    PEN_Res_quant: Attribute.String;
    AMP_Res_quant: Attribute.String;
    FOT_Res_quant: Attribute.String;
    FOX_Res_quant: Attribute.String;
    TAZ_Res_quant: Attribute.String;
    MERO_Res_quant: Attribute.String;
    CIP_Res_quant: Attribute.String;
    NAL_Res_quant: Attribute.String;
    COL_Res_quant: Attribute.String;
    TET_Res_quant: Attribute.String;
    TGC_Res_quant: Attribute.String;
    RIF_Res_quant: Attribute.String;
    CLI_Res_quant: Attribute.String;
    AZI_Res_quant: Attribute.String;
    ERY_Res_quant: Attribute.String;
    TEC_Res_quant: Attribute.String;
    VAN_Res_quant: Attribute.String;
    DAP_Res_quant: Attribute.String;
    LZD_Res_quant: Attribute.String;
    TIA_Res_quant: Attribute.String;
    MUP_Res_quant: Attribute.String;
    SYN_Res_quant: Attribute.String;
    FUS_Res_quant: Attribute.String;
    TMP_Res_quant: Attribute.String;
    SMX_Res_quant: Attribute.String;
    AK_Res_qual: Attribute.String;
    GEN_Res_qual: Attribute.String;
    KAN_Res_qual: Attribute.String;
    STR_Res_qual: Attribute.String;
    CHL_Res_qual: Attribute.String;
    FFN_Res_qual: Attribute.String;
    PEN_Res_qual: Attribute.String;
    AMP_Res_qual: Attribute.String;
    FOT_Res_qual: Attribute.String;
    FOX_Res_qual: Attribute.String;
    TAZ_Res_qual: Attribute.String;
    MERO_Res_qual: Attribute.String;
    CIP_Res_qual: Attribute.String;
    NAL_Res_qual: Attribute.String;
    COL_Res_qual: Attribute.String;
    TET_Res_qual: Attribute.String;
    TGC_Res_qual: Attribute.String;
    RIF_Res_qual: Attribute.String;
    CLI_Res_qual: Attribute.String;
    AZI_Res_qual: Attribute.String;
    ERY_Res_qual: Attribute.String;
    TEC_Res_qual: Attribute.String;
    VAN_Res_qual: Attribute.String;
    DAP_Res_qual: Attribute.String;
    LZD_Res_qual: Attribute.String;
    TIA_Res_qual: Attribute.String;
    MUP_Res_qual: Attribute.String;
    SYN_Res_qual: Attribute.String;
    FUS_Res_qual: Attribute.String;
    TMP_Res_qual: Attribute.String;
    SMX_Res_qual: Attribute.String;
    ETP_Res_qual: Attribute.String;
    ETP_Res_quant: Attribute.String;
    Datum_der_Datenextraktion: Attribute.String;
    DB_Version: Attribute.String;
    animal_species_food_top_category: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::animal-species-food-top-category.animal-species-food-top-category'
    >;
    matrix_detail: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::matrix-detail.matrix-detail'
    >;
    sampling_objective: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::sampling-objective.sampling-objective'
    >;
    sampling_point: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::sampling-point.sampling-point'
    >;
    sampling_origin: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::sampling-origin.sampling-origin'
    >;
    animal_species_production_direction_food: Attribute.Relation<
      'api::isolate.isolate',
      'manyToOne',
      'api::animal-species-production-direction-food.animal-species-production-direction-food'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::isolate.isolate',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::isolate.isolate',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMatrixMatrix extends Schema.CollectionType {
  collectionName: 'matrices';
  info: {
    singularName: 'matrix';
    pluralName: 'matrices';
    displayName: 'MD Matrix';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    name: Attribute.String;
    iri: Attribute.String;
    isolates: Attribute.Relation<
      'api::matrix.matrix',
      'oneToMany',
      'api::isolate.isolate'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::matrix.matrix',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::matrix.matrix',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMatrixDetailMatrixDetail extends Schema.CollectionType {
  collectionName: 'matrix_details';
  info: {
    singularName: 'matrix-detail';
    pluralName: 'matrix-details';
    displayName: 'MD Matrix Detail';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    name: Attribute.String;
    iri: Attribute.String;
    isolates: Attribute.Relation<
      'api::matrix-detail.matrix-detail',
      'oneToMany',
      'api::isolate.isolate'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::matrix-detail.matrix-detail',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::matrix-detail.matrix-detail',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMicroorganismMicroorganism extends Schema.CollectionType {
  collectionName: 'microorganisms';
  info: {
    singularName: 'microorganism';
    pluralName: 'microorganisms';
    displayName: 'MD Microorganism';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    name: Attribute.String;
    iri: Attribute.String;
    isolates: Attribute.Relation<
      'api::microorganism.microorganism',
      'oneToMany',
      'api::isolate.isolate'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::microorganism.microorganism',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::microorganism.microorganism',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiResistanceTableResistanceTable
  extends Schema.CollectionType {
  collectionName: 'resistance_tables';
  info: {
    singularName: 'resistance-table';
    pluralName: 'resistance-tables';
    displayName: 'Resistance_Table';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    table_id: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Attribute.SetMinMaxLength<{
        maxLength: 5;
      }>;
    description: Attribute.RichText &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    title: Attribute.RichText &
      Attribute.Required &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    cut_offs: Attribute.Component<
      'antibiotic-data.antibiotic-cut-off-data',
      true
    > &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::resistance-table.resistance-table',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::resistance-table.resistance-table',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    localizations: Attribute.Relation<
      'api::resistance-table.resistance-table',
      'oneToMany',
      'api::resistance-table.resistance-table'
    >;
    locale: Attribute.String;
  };
}

export interface ApiSalmonellaSalmonella extends Schema.CollectionType {
  collectionName: 'salmonellas';
  info: {
    singularName: 'salmonella';
    pluralName: 'salmonellas';
    displayName: 'DEPRECATED Salmonella';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    name: Attribute.String;
    iri: Attribute.String;
    isolates: Attribute.Relation<
      'api::salmonella.salmonella',
      'oneToMany',
      'api::isolate.isolate'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::salmonella.salmonella',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::salmonella.salmonella',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiSamplingObjectiveSamplingObjective
  extends Schema.CollectionType {
  collectionName: 'sampling_objectives';
  info: {
    singularName: 'sampling-objective';
    pluralName: 'sampling-objectives';
    displayName: 'DEPRECATED Sampling Objective';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    name: Attribute.String;
    iri: Attribute.String;
    isolates: Attribute.Relation<
      'api::sampling-objective.sampling-objective',
      'oneToMany',
      'api::isolate.isolate'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::sampling-objective.sampling-objective',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::sampling-objective.sampling-objective',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiSamplingOriginSamplingOrigin extends Schema.CollectionType {
  collectionName: 'sampling_origins';
  info: {
    singularName: 'sampling-origin';
    pluralName: 'sampling-origins';
    displayName: 'DEPRECATED  Sampling Origin';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    name: Attribute.String;
    iri: Attribute.String;
    isolates: Attribute.Relation<
      'api::sampling-origin.sampling-origin',
      'oneToMany',
      'api::isolate.isolate'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::sampling-origin.sampling-origin',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::sampling-origin.sampling-origin',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiSamplingPointSamplingPoint extends Schema.CollectionType {
  collectionName: 'sampling_points';
  info: {
    singularName: 'sampling-point';
    pluralName: 'sampling-points';
    displayName: 'DEPRECATED  sampling point';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    name: Attribute.String;
    iri: Attribute.String;
    isolates: Attribute.Relation<
      'api::sampling-point.sampling-point',
      'oneToMany',
      'api::isolate.isolate'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::sampling-point.sampling-point',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::sampling-point.sampling-point',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiWelcomeWelcome extends Schema.SingleType {
  collectionName: 'welcomes';
  info: {
    singularName: 'welcome';
    pluralName: 'welcomes';
    displayName: 'Welcome';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    subheading: Attribute.Text &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    content: Attribute.RichText &
      Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::welcome.welcome',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::welcome.welcome',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    localizations: Attribute.Relation<
      'api::welcome.welcome',
      'oneToMany',
      'api::welcome.welcome'
    >;
    locale: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface ContentTypes {
      'admin::permission': AdminPermission;
      'admin::user': AdminUser;
      'admin::role': AdminRole;
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
      'api::animal-species-food-top-category.animal-species-food-top-category': ApiAnimalSpeciesFoodTopCategoryAnimalSpeciesFoodTopCategory;
      'api::animal-species-production-direction-food.animal-species-production-direction-food': ApiAnimalSpeciesProductionDirectionFoodAnimalSpeciesProductionDirectionFood;
      'api::antibiotic.antibiotic': ApiAntibioticAntibiotic;
      'api::configuration.configuration': ApiConfigurationConfiguration;
      'api::evaluation.evaluation': ApiEvaluationEvaluation;
      'api::evaluation-information.evaluation-information': ApiEvaluationInformationEvaluationInformation;
      'api::explanation.explanation': ApiExplanationExplanation;
      'api::externallink.externallink': ApiExternallinkExternallink;
      'api::isolate.isolate': ApiIsolateIsolate;
      'api::matrix.matrix': ApiMatrixMatrix;
      'api::matrix-detail.matrix-detail': ApiMatrixDetailMatrixDetail;
      'api::microorganism.microorganism': ApiMicroorganismMicroorganism;
      'api::resistance-table.resistance-table': ApiResistanceTableResistanceTable;
      'api::salmonella.salmonella': ApiSalmonellaSalmonella;
      'api::sampling-objective.sampling-objective': ApiSamplingObjectiveSamplingObjective;
      'api::sampling-origin.sampling-origin': ApiSamplingOriginSamplingOrigin;
      'api::sampling-point.sampling-point': ApiSamplingPointSamplingPoint;
      'api::welcome.welcome': ApiWelcomeWelcome;
    }
  }
}
