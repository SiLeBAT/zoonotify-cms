
import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

// Define a type for the resistance entity object
interface ResistanceEntity {
  dbId: string;
  zomoProgram: string | null;
  samplingYear: number | null;
  AMP_Res_quant: number | null;
  AZI_Res_quant: number | null;
  CHL_Res_quant: number | null;
  CIP_Res_quant: number | null;
  CLI_Res_quant: number | null;
  COL_Res_quant: number | null;
  DAP_Res_quant: number | null;
  ERY_Res_quant: number | null;
  ETP_Res_quant: number | null;
  FFN_Res_quant: number | null;
  FOT_Res_quant: number | null;
  FOX_Res_quant: number | null;
  FUS_Res_quant: number | null;
  GEN_Res_quant: number | null;
  KAN_Res_quant: number | null;
  LZD_Res_quant: number | null;
  MERO_Res_quant: number | null;
  MUP_Res_quant: number | null;
  NAL_Res_quant: number | null;
  PEN_Res_quant: number | null;
  RIF_Res_quant: number | null;
  SMX_Res_quant: number | null;
  STR_Res_quant: number | null;
  SYN_Res_quant: number | null;
  TAZ_Res_quant: number | null;
  TEC_Res_quant: number | null;
  TET_Res_quant: number | null;
  TGC_Res_quant: number | null;
  TIA_Res_quant: number | null;
  TMP_Res_quant: number | null;
  VAN_Res_quant: number | null;
  AK_Res_qual: number | null;
  AMP_Res_qual: number | null;
  AZI_Res_qual: number | null;
  CHL_Res_qual: number | null;
  CIP_Res_qual: number | null;
  CLI_Res_qual: number | null;
  COL_Res_qual: number | null;
  DAP_Res_qual: number | null;
  ERY_Res_qual: number | null;
  ETP_Res_qual: number | null;
  FFN_Res_qual: number | null;
  FOT_Res_qual: number | null;
  FOX_Res_qual: number | null;
  FUS_Res_qual: number | null;
  GEN_Res_qual: number | null;
  KAN_Res_qual: number | null;
  LZD_Res_qual: number | null;
  MERO_Res_qual: number | null;
  MUP_Res_qual: number | null;
  NAL_Res_qual: number | null;
  PEN_Res_qual: number | null;
  RIF_Res_qual: number | null;
  SMX_Res_qual: number | null;
  STR_Res_qual: number | null;
  SYN_Res_qual: number | null;
  TAZ_Res_qual: number | null;
  TEC_Res_qual: number | null;
  TET_Res_qual: number | null;
  TGC_Res_qual: number | null;
  TIA_Res_qual: number | null;
  TMP_Res_qual: number | null;
  VAN_Res_qual: number | null;
  matrix: number | null;
  matrixGroup: number | null;
  microorganism: number | null;
  sampleType: number | null;
  samplingStage: number | null;
  sampleOrigin: number | null;
  superCategorySampleOrigin: number | null;
  locale: string;
}

/**
 * 1) parseNumeric:
 *    - If the cell is blank, "-" or "_" => return null.
 *    - Otherwise, replace all commas with dots (e.g. "2,6" => "2.6").
 *    - Parse using parseFloat or parseInt.
 *    - If parsing fails (NaN), return null instead of NaN.
 */
function parseNumeric(cell, parser) {
  if (cell === '' || cell === null || cell === '-' || cell === '_') {
    return null;
  }
  const normalized = String(cell).replace(/,/g, '.');
  const value = parser(normalized);
  if (Number.isNaN(value)) {
    return null;
  }
  return value;
}

/**
 * 2) removeNulls:
 *    - Removes any keys whose value is null,
 *      so Strapi doesn't receive fields with null.
 */
function removeNulls(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null)
  );
}

/**
 * Main function: importAndCleanupResistances
 *    - Imports antibiotic resistance data from Excel,
 *    - Then removes any duplicate German records.
 */
export async function importAndCleanupResistances(strapi) {
  await importResistances(strapi);
  await cleanupGermanDuplicates(strapi);
}

/**
 * (A) importResistances:
 *    - Reads rows from an Excel file,
 *    - Creates English records,
 *    - Creates German records as localized versions using the same documentId if data is present,
 *    - Rows with missing relational data are logged as failures and skipped.
 */
export async function importResistances(strapi) {
  const filePath = path.join(__dirname, '../../../data/master-data/ZooNotify_amr_DB_DE_EN_2025-02-27.xlsx');
  const outFilePath = path.join(__dirname, '../../../data/resistances-import-result.json');

  const importLog = {
    FileFound: false,
    SheetFound: false,
    SheetName: null,
    TotalRowsInSheet: 0,
    TotalRecordsProcessed: 0,
    EnglishSaved: 0,
    EnglishUpdated: 0,
    GermanSaved: 0,
    GermanUpdated: 0,
    RowsImported: 0,
    Failures: []
  };

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    importLog.FileFound = false;
    fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
    return;
  }
  importLog.FileFound = true;

  const buffer = fs.readFileSync(filePath);
  const dataFromExcel = xlsx.parse(buffer);

  const resistanceData = dataFromExcel.find(sheet => sheet.name === 'Sheet 1');
  if (!resistanceData) {
    console.error('Resistances sheet not found in the file');
    importLog.SheetFound = false;
    fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
    return;
  }
  importLog.SheetFound = true;
  importLog.SheetName = resistanceData.name;
  importLog.TotalRowsInSheet = resistanceData.data.length - 1;

  if (resistanceData.data.length <= 1) {
    console.error('No data found in the Resistances sheet');
    fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
    return;
  }

  const dataList = resistanceData.data.slice(1).map((row, index) => {
    const rowNumber = index + 2; // Header is row 1
    return {
      rowNumber,
      dbId: String(row[24]), // This will be checked for blank below
      zomoProgram: row[0],
      samplingYear: parseNumeric(row[1], parseInt),
      microorganism_de: row[3],
      microorganism_en: row[4],
      sampleType_de: row[5],
      sampleType_en: row[6],
      superCategorySampleOrigin_de: row[7],
      superCategorySampleOrigin_en: row[8],
      sampleOrigin_de: row[9],
      sampleOrigin_en: row[10],
      samplingStage_de: row[11],
      samplingStage_en: row[12],
      matrixGroup_de: row[13],
      matrixGroup_en: row[14],
      matrix_de: row[15],
      matrix_en: row[16],
      AMP_Res_quant: parseNumeric(row[49], parseFloat),
      AZI_Res_quant: parseNumeric(row[50], parseInt),
      CHL_Res_quant: parseNumeric(row[51], parseInt),
      CIP_Res_quant: parseNumeric(row[52], parseFloat),
      CLI_Res_quant: parseNumeric(row[53], parseFloat),
      COL_Res_quant: parseNumeric(row[54], parseFloat),
      DAP_Res_quant: parseNumeric(row[55], parseFloat),
      ERY_Res_quant: parseNumeric(row[56], parseFloat),
      ETP_Res_quant: parseNumeric(row[57], parseFloat),
      FFN_Res_quant: parseNumeric(row[58], parseInt),
      FOT_Res_quant: parseNumeric(row[59], parseFloat),
      FOX_Res_quant: parseNumeric(row[60], parseFloat),
      FUS_Res_quant: parseNumeric(row[61], parseFloat),
      GEN_Res_quant: parseNumeric(row[62], parseFloat),
      KAN_Res_quant: parseNumeric(row[63], parseFloat),
      LZD_Res_quant: parseNumeric(row[64], parseFloat),
      MERO_Res_quant: parseNumeric(row[65], parseFloat),
      MUP_Res_quant: parseNumeric(row[66], parseFloat),
      NAL_Res_quant: parseNumeric(row[67], parseInt),
      PEN_Res_quant: parseNumeric(row[68], parseFloat),
      RIF_Res_quant: parseNumeric(row[69], parseFloat),
      SMX_Res_quant: parseNumeric(row[70], parseInt),
      STR_Res_quant: parseNumeric(row[71], parseInt),
      SYN_Res_quant: parseNumeric(row[72], parseFloat),
      TAZ_Res_quant: parseNumeric(row[73], parseFloat),
      TEC_Res_quant: parseNumeric(row[74], parseFloat),
      TET_Res_quant: parseNumeric(row[75], parseFloat),
      TGC_Res_quant: parseNumeric(row[76], parseFloat),
      TIA_Res_quant: parseNumeric(row[77], parseFloat),
      TMP_Res_quant: parseNumeric(row[78], parseFloat),
      VAN_Res_quant: parseNumeric(row[79], parseInt),
      AK_Res_qual: parseNumeric(row[80], parseInt),
      AMP_Res_qual: parseNumeric(row[81], parseInt),
      AZI_Res_qual: parseNumeric(row[82], parseInt),
      CHL_Res_qual: parseNumeric(row[83], parseInt),
      CIP_Res_qual: parseNumeric(row[84], parseInt),
      CLI_Res_qual: parseNumeric(row[85], parseInt),
      COL_Res_qual: parseNumeric(row[86], parseInt),
      DAP_Res_qual: parseNumeric(row[87], parseInt),
      ERY_Res_qual: parseNumeric(row[88], parseInt),
      ETP_Res_qual: parseNumeric(row[89], parseInt),
      FFN_Res_qual: parseNumeric(row[90], parseInt),
      FOT_Res_qual: parseNumeric(row[91], parseInt),
      FOX_Res_qual: parseNumeric(row[92], parseInt),
      FUS_Res_qual: parseNumeric(row[93], parseInt),
      GEN_Res_qual: parseNumeric(row[94], parseInt),
      KAN_Res_qual: parseNumeric(row[95], parseInt),
      LZD_Res_qual: parseNumeric(row[96], parseInt),
      MERO_Res_qual: parseNumeric(row[97], parseInt),
      MUP_Res_qual: parseNumeric(row[98], parseInt),
      NAL_Res_qual: parseNumeric(row[99], parseInt),
      PEN_Res_qual: parseNumeric(row[100], parseInt),
      RIF_Res_qual: parseNumeric(row[101], parseInt),
      SMX_Res_qual: parseNumeric(row[102], parseInt),
      STR_Res_qual: parseNumeric(row[103], parseInt),
      SYN_Res_qual: parseNumeric(row[104], parseInt),
      TAZ_Res_qual: parseNumeric(row[105], parseInt),
      TEC_Res_qual: parseNumeric(row[106], parseInt),
      TET_Res_qual: parseNumeric(row[107], parseInt),
      TGC_Res_qual: parseNumeric(row[108], parseInt),
      TIA_Res_qual: parseNumeric(row[109], parseInt),
      TMP_Res_qual: parseNumeric(row[110], parseInt),
      VAN_Res_qual: parseNumeric(row[111], parseInt),
    };
  });

  importLog.TotalRecordsProcessed = dataList.length;

  const service = strapi.entityService;
  const collection = 'api::resistance.resistance';

  for (const item of dataList) {
    try {
      let hasMissingRelations = false;
      const missingRelations = [];

      // Check for blank dbId
      if (!item.dbId || item.dbId === 'undefined' || item.dbId === 'null') {
        missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: dbId is blank`);
        hasMissingRelations = true;
      }

      // Check for blank English relational fields
      if (!item.matrix_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English matrix is blank`);
      if (!item.matrixGroup_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English matrixGroup is blank`);
      if (!item.microorganism_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English microorganism is blank`);
      if (!item.sampleType_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English sampleType is blank`);
      if (!item.samplingStage_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English samplingStage is blank`);
      if (!item.sampleOrigin_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English sampleOrigin is blank`);
      if (!item.superCategorySampleOrigin_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: English superCategorySampleOrigin is blank`);

      // English relations lookup
      const matrixId_en = await findEntityIdByName(strapi, 'api::matrix.matrix', item.matrix_en, 'en');
      const matrixGroupId_en = await findEntityIdByName(strapi, 'api::matrix-group.matrix-group', item.matrixGroup_en, 'en');
      const microorganismId_en = await findEntityIdByName(strapi, 'api::microorganism.microorganism', item.microorganism_en, 'en');
      const sampleTypeId_en = await findEntityIdByName(strapi, 'api::sample-type.sample-type', item.sampleType_en, 'en');
      const samplingStageId_en = await findEntityIdByName(strapi, 'api::sampling-stage.sampling-stage', item.samplingStage_en, 'en');
      const sampleOriginId_en = await findEntityIdByName(strapi, 'api::sample-origin.sample-origin', item.sampleOrigin_en, 'en');
      const superCategorySampleOriginId_en = await findEntityIdByName(
        strapi,
        'api::super-category-sample-origin.super-category-sample-origin',
        item.superCategorySampleOrigin_en,
        'en'
      );

      // Check for missing English relations (not found in database)
      if (item.matrix_en && !matrixId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English matrix '${item.matrix_en}'`);
      if (item.matrixGroup_en && !matrixGroupId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English matrixGroup '${item.matrixGroup_en}'`);
      if (item.microorganism_en && !microorganismId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English microorganism '${item.microorganism_en}'`);
      if (item.sampleType_en && !sampleTypeId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English sampleType '${item.sampleType_en}'`);
      if (item.samplingStage_en && !samplingStageId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English samplingStage '${item.samplingStage_en}'`);
      if (item.sampleOrigin_en && !sampleOriginId_en) missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English sampleOrigin '${item.sampleOrigin_en}'`);
      if (item.superCategorySampleOrigin_en && !superCategorySampleOriginId_en) {
        missingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing English superCategorySampleOrigin '${item.superCategorySampleOrigin_en}'`);
      }

      // If any English relations are missing, mark as failure
      if (missingRelations.length > 0) {
        hasMissingRelations = true;
        importLog.Failures.push({
          rowNumber: item.rowNumber,
          dbId: item.dbId,
          error: `Missing relations: ${missingRelations.join(', ')}`
        });
      }

      // Skip import if there are missing relations
      if (hasMissingRelations) {
        continue;
      }

      // Proceed with English record creation/update
      const dataEn = removeNulls({
        dbId: item.dbId,
        zomoProgram: item.zomoProgram,
        samplingYear: item.samplingYear,
        AMP_Res_quant: item.AMP_Res_quant,
        AZI_Res_quant: item.AZI_Res_quant,
        CHL_Res_quant: item.CHL_Res_quant,
        CIP_Res_quant: item.CIP_Res_quant,
        CLI_Res_quant: item.CLI_Res_quant,
        COL_Res_quant: item.COL_Res_quant,
        DAP_Res_quant: item.DAP_Res_quant,
        ERY_Res_quant: item.ERY_Res_quant,
        ETP_Res_quant: item.ETP_Res_quant,
        FFN_Res_quant: item.FFN_Res_quant,
        FOT_Res_quant: item.FOT_Res_quant,
        FOX_Res_quant: item.FOX_Res_quant,
        FUS_Res_quant: item.FUS_Res_quant,
        GEN_Res_quant: item.GEN_Res_quant,
        KAN_Res_quant: item.KAN_Res_quant,
        LZD_Res_quant: item.LZD_Res_quant,
        MERO_Res_quant: item.MERO_Res_quant,
        MUP_Res_quant: item.MUP_Res_quant,
        NAL_Res_quant: item.NAL_Res_quant,
        PEN_Res_quant: item.PEN_Res_quant,
        RIF_Res_quant: item.RIF_Res_quant,
        SMX_Res_quant: item.SMX_Res_quant,
        STR_Res_quant: item.STR_Res_quant,
        SYN_Res_quant: item.SYN_Res_quant,
        TAZ_Res_quant: item.TAZ_Res_quant,
        TEC_Res_quant: item.TEC_Res_quant,
        TET_Res_quant: item.TET_Res_quant,
        TGC_Res_quant: item.TGC_Res_quant,
        TIA_Res_quant: item.TIA_Res_quant,
        TMP_Res_quant: item.TMP_Res_quant,
        VAN_Res_quant: item.VAN_Res_quant,
        AK_Res_qual: item.AK_Res_qual,
        AMP_Res_qual: item.AMP_Res_qual,
        AZI_Res_qual: item.AZI_Res_qual,
        CHL_Res_qual: item.CHL_Res_qual,
        CIP_Res_qual: item.CIP_Res_qual,
        CLI_Res_qual: item.CLI_Res_qual,
        COL_Res_qual: item.COL_Res_qual,
        DAP_Res_qual: item.DAP_Res_qual,
        ERY_Res_qual: item.ERY_Res_qual,
        ETP_Res_qual: item.ETP_Res_qual,
        FFN_Res_qual: item.FFN_Res_qual,
        FOT_Res_qual: item.FOT_Res_qual,
        FOX_Res_qual: item.FOX_Res_qual,
        FUS_Res_qual: item.FUS_Res_qual,
        GEN_Res_qual: item.GEN_Res_qual,
        KAN_Res_qual: item.KAN_Res_qual,
        LZD_Res_qual: item.LZD_Res_qual,
        MERO_Res_qual: item.MERO_Res_qual,
        MUP_Res_qual: item.MUP_Res_qual,
        NAL_Res_qual: item.NAL_Res_qual,
        PEN_Res_qual: item.PEN_Res_qual,
        RIF_Res_qual: item.RIF_Res_qual,
        SMX_Res_qual: item.SMX_Res_qual,
        STR_Res_qual: item.STR_Res_qual,
        SYN_Res_qual: item.SYN_Res_qual,
        TAZ_Res_qual: item.TAZ_Res_qual,
        TEC_Res_qual: item.TEC_Res_qual,
        TET_Res_qual: item.TET_Res_qual,
        TGC_Res_qual: item.TGC_Res_qual,
        TIA_Res_qual: item.TIA_Res_qual,
        TMP_Res_qual: item.TMP_Res_qual,
        VAN_Res_qual: item.VAN_Res_qual,
        matrix: matrixId_en,
        matrixGroup: matrixGroupId_en,
        microorganism: microorganismId_en,
        sampleType: sampleTypeId_en,
        samplingStage: samplingStageId_en,
        sampleOrigin: sampleOriginId_en,
        superCategorySampleOrigin: superCategorySampleOriginId_en,
        locale: 'en'
      });

      const existingEn = await service.findMany(collection, {
        filters: { dbId: item.dbId },
        locale: 'en',
        populate: ['localizations']
      });

      let defaultEntry; // The final English record
      let englishId, englishDocumentId;
      if (existingEn && existingEn.length > 0) {
        englishId = existingEn[0].id;
        englishDocumentId = existingEn[0].documentId; // Get the documentId
        // Check if any field has changed (excluding locale)
        const hasChanges = Object.keys(dataEn).some(key => 
          key !== 'locale' && JSON.stringify(existingEn[0][key]) !== JSON.stringify(dataEn[key])
        );
        if (hasChanges) {
          defaultEntry = await service.update(collection, englishId, {
            data: dataEn,
            locale: 'en'
          });
          importLog.EnglishUpdated++;
        } else {
          defaultEntry = existingEn[0];
        }
      } else {
        defaultEntry = await service.create(collection, {
          data: dataEn,
          locale: 'en'
        });
        importLog.EnglishSaved++;
      }
      englishId = defaultEntry.id;
      englishDocumentId = defaultEntry.documentId;
      importLog.RowsImported++;

      // German record
      const hasGermanData =
        item.microorganism_de ||
        item.sampleType_de ||
        item.samplingStage_de ||
        item.sampleOrigin_de ||
        item.superCategorySampleOrigin_de ||
        item.matrixGroup_de ||
        item.matrix_de;

      if (hasGermanData) {
        const germanMissingRelations = [];

        // Check for blank German relational fields
        if (!item.matrix_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German matrix is blank`);
        if (!item.matrixGroup_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German matrixGroup is blank`);
        if (!item.microorganism_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German microorganism is blank`);
        if (!item.sampleType_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German sampleType is blank`);
        if (!item.samplingStage_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German samplingStage is blank`);
        if (!item.sampleOrigin_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German sampleOrigin is blank`);
        if (!item.superCategorySampleOrigin_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: German superCategorySampleOrigin is blank`);

        const matrixId_de = await findEntityIdByName(strapi, 'api::matrix.matrix', item.matrix_de, 'de');
        const matrixGroupId_de = await findEntityIdByName(strapi, 'api::matrix-group.matrix-group', item.matrixGroup_de, 'de');
        const microorganismId_de = await findEntityIdByName(strapi, 'api::microorganism.microorganism', item.microorganism_de, 'de');
        const sampleTypeId_de = await findEntityIdByName(strapi, 'api::sample-type.sample-type', item.sampleType_de, 'de');
        const samplingStageId_de = await findEntityIdByName(strapi, 'api::sampling-stage.sampling-stage', item.samplingStage_de, 'de');
        const sampleOriginId_de = await findEntityIdByName(strapi, 'api::sample-origin.sample-origin', item.sampleOrigin_de, 'de');
        const superCategorySampleOriginId_de = await findEntityIdByName(
          strapi,
          'api::super-category-sample-origin.super-category-sample-origin',
          item.superCategorySampleOrigin_de,
          'de'
        );

        // Check for missing German relations (not found in database)
        if (item.matrix_de && !matrixId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German matrix '${item.matrix_de}'`);
        if (item.matrixGroup_de && !matrixGroupId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German matrixGroup '${item.matrixGroup_de}'`);
        if (item.microorganism_de && !microorganismId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German microorganism '${item.microorganism_de}'`);
        if (item.sampleType_de && !sampleTypeId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German sampleType '${item.sampleType_de}'`);
        if (item.samplingStage_de && !samplingStageId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German samplingStage '${item.samplingStage_de}'`);
        if (item.sampleOrigin_de && !sampleOriginId_de) germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German sampleOrigin '${item.sampleOrigin_de}'`);
        if (item.superCategorySampleOrigin_de && !superCategorySampleOriginId_de) {
          germanMissingRelations.push(`Row ${item.rowNumber}-DB-ID:${item.dbId}: Missing German superCategorySampleOrigin '${item.superCategorySampleOrigin_de}'`);
        }

        // If any German relations are missing, mark as failure
        if (germanMissingRelations.length > 0) {
          importLog.Failures.push({
            rowNumber: item.rowNumber,
            dbId: item.dbId,
            error: `Missing German relations: ${germanMissingRelations.join(', ')}`
          });
          continue;
        }

        const dataDe = removeNulls({
          dbId: item.dbId,
          zomoProgram: item.zomoProgram,
          samplingYear: item.samplingYear,
          AMP_Res_quant: item.AMP_Res_quant,
          AZI_Res_quant: item.AZI_Res_quant,
          CHL_Res_quant: item.CHL_Res_quant,
          CIP_Res_quant: item.CIP_Res_quant,
          CLI_Res_quant: item.CLI_Res_quant,
          COL_Res_quant: item.COL_Res_quant,
          DAP_Res_quant: item.DAP_Res_quant,
          ERY_Res_quant: item.ERY_Res_quant,
          ETP_Res_quant: item.ETP_Res_quant,
          FFN_Res_quant: item.FFN_Res_quant,
          FOT_Res_quant: item.FOT_Res_quant,
          FOX_Res_quant: item.FOX_Res_quant,
          FUS_Res_quant: item.FUS_Res_quant,
          GEN_Res_quant: item.GEN_Res_quant,
          KAN_Res_quant: item.KAN_Res_quant,
          LZD_Res_quant: item.LZD_Res_quant,
          MERO_Res_quant: item.MERO_Res_quant,
          MUP_Res_quant: item.MUP_Res_quant,
          NAL_Res_quant: item.NAL_Res_quant,
          PEN_Res_quant: item.PEN_Res_quant,
          RIF_Res_quant: item.RIF_Res_quant,
          SMX_Res_quant: item.SMX_Res_quant,
          STR_Res_quant: item.STR_Res_quant,
          SYN_Res_quant: item.SYN_Res_quant,
          TAZ_Res_quant: item.TAZ_Res_quant,
          TEC_Res_quant: item.TEC_Res_quant,
          TET_Res_quant: item.TET_Res_quant,
          TGC_Res_quant: item.TGC_Res_quant,
          TIA_Res_quant: item.TIA_Res_quant,
          TMP_Res_quant: item.TMP_Res_quant,
          VAN_Res_quant: item.VAN_Res_quant,
          AK_Res_qual: item.AK_Res_qual,
          AMP_Res_qual: item.AMP_Res_qual,
          AZI_Res_qual: item.AZI_Res_qual,
          CHL_Res_qual: item.CHL_Res_qual,
          CIP_Res_qual: item.CIP_Res_qual,
          CLI_Res_qual: item.CLI_Res_qual,
          COL_Res_qual: item.COL_Res_qual,
          DAP_Res_qual: item.DAP_Res_qual,
          ERY_Res_qual: item.ERY_Res_qual,
          ETP_Res_qual: item.ETP_Res_qual,
          FFN_Res_qual: item.FFN_Res_qual,
          FOT_Res_qual: item.FOT_Res_qual,
          FOX_Res_qual: item.FOX_Res_qual,
          FUS_Res_qual: item.FUS_Res_qual,
          GEN_Res_qual: item.GEN_Res_qual,
          KAN_Res_qual: item.KAN_Res_qual,
          LZD_Res_qual: item.LZD_Res_qual,
          MERO_Res_qual: item.MERO_Res_qual,
          MUP_Res_qual: item.MUP_Res_qual,
          NAL_Res_qual: item.NAL_Res_qual,
          PEN_Res_qual: item.PEN_Res_qual,
          RIF_Res_qual: item.RIF_Res_qual,
          SMX_Res_qual: item.SMX_Res_qual,
          STR_Res_qual: item.STR_Res_qual,
          SYN_Res_qual: item.SYN_Res_qual,
          TAZ_Res_qual: item.TAZ_Res_qual,
          TEC_Res_qual: item.TEC_Res_qual,
          TET_Res_qual: item.TET_Res_qual,
          TGC_Res_qual: item.TGC_Res_qual,
          TIA_Res_qual: item.TIA_Res_qual,
          TMP_Res_qual: item.TMP_Res_qual,
          VAN_Res_qual: item.VAN_Res_qual,
          matrix: matrixId_de,
          matrixGroup: matrixGroupId_de,
          microorganism: microorganismId_de,
          sampleType: sampleTypeId_de,
          samplingStage: samplingStageId_de,
          sampleOrigin: sampleOriginId_de,
          superCategorySampleOrigin: superCategorySampleOriginId_de,
          locale: 'de'
        });

        // Check if a German localization already exists for this English record
        const englishWithLocalizations = await service.findOne(collection, englishId, {
          populate: ['localizations'],
          locale: 'en'
        });

        const germanLocalization = englishWithLocalizations.localizations?.find(loc => loc.locale === 'de');

        if (germanLocalization) {
          // Update the existing German localization if any data has changed
          const hasChanges = Object.keys(dataDe).some(key => 
            key !== 'locale' && JSON.stringify(germanLocalization[key]) !== JSON.stringify(dataDe[key])
          );
          if (hasChanges) {
            await service.update(collection, germanLocalization.id, {
              data: dataDe,
              locale: 'de'
            });
            importLog.GermanUpdated++;
          }
        } else {
          // Use Strapi's db.query to create the German record with the same documentId
          const germanRecord = await strapi.db.query('api::resistance.resistance').create({
            data: {
              ...dataDe,
              documentId: englishDocumentId // Use the same documentId to link them
            }
          });

          // Log the creation for debugging
          console.log(`Created German record for English documentId ${englishDocumentId}:`, {
            id: germanRecord.id,
            documentId: germanRecord.documentId,
            locale: germanRecord.locale
          });

          // Fetch the English record to confirm linking
          const updatedEnglish = await service.findOne(collection, englishId, {
            populate: ['localizations'],
            locale: 'en'
          });
          console.log(`Linked records for English ID ${englishId} (documentId: ${englishDocumentId}):`, updatedEnglish.localizations);

          // Additional debugging: Fetch the German record to confirm its documentId
          const fetchedGerman = await service.findOne(collection, germanRecord.id, {
            populate: ['localizations'],
            locale: 'de'
          });
          console.log(`German record details for ID ${germanRecord.id}:`, {
            documentId: fetchedGerman.documentId,
            localizations: fetchedGerman.localizations
          });

          importLog.GermanSaved++;
        }
      }
    } catch (error) {
      console.error(`Error importing resistance data for dbId ${item.dbId}:`, error);
      importLog.Failures.push({ rowNumber: item.rowNumber, dbId: item.dbId, error: error.message });
    }
  }

  fs.writeFileSync(outFilePath, JSON.stringify(importLog, null, 2));
}

/**
 * (B) cleanupGermanDuplicates:
 *     - Finds all German records,
 *     - Groups them by dbId,
 *     - Keeps the first (lowest ID), deletes duplicates.
 */
export async function cleanupGermanDuplicates(strapi) {
  const pageSize = 100;
  let page = 1;
  const allGermanEntries = [];

  while (true) {
    const results = await strapi.entityService.findMany('api::resistance.resistance', {
      filters: { locale: 'de' },
      sort: { id: 'asc' },
      publicationState: 'preview',
      pagination: { page, pageSize }
    });
    if (!results.length) break;
    allGermanEntries.push(...results);
    page++;
  }

  const groupedByDbId = {};
  for (const entry of allGermanEntries) {
    const key = entry.dbId || 'NO_DBID';
    if (!groupedByDbId[key]) {
      groupedByDbId[key] = [];
    }
    groupedByDbId[key].push(entry);
  }

  let duplicatesRemoved = 0;
  for (const dbId in groupedByDbId) {
    const group = groupedByDbId[dbId];
    if (group.length > 1) {
      group.sort((a, b) => a.id - b.id);
      const toDelete = group.slice(1);
      for (const dup of toDelete) {
        await strapi.entityService.delete('api::resistance.resistance', dup.id);
        duplicatesRemoved++;
      }
    }
  }
  console.log(`Cleanup complete. Removed ${duplicatesRemoved} duplicate German record(s).`);
}

/**
 * (C) removeAllResistances (Optional):
 *     - Removes ALL records (English + German) from the DB.
 */
export async function removeAllResistances(strapi) {
  const pageSize = 100;
  let page = 1;
  while (true) {
    const entries = await strapi.entityService.findMany('api::resistance.resistance', {
      pagination: { page, pageSize },
      publicationState: 'preview'
    });
    if (!entries.length) break;
    for (const entry of entries) {
      await strapi.entityService.delete('api::resistance.resistance', entry.id);
    }
    page++;
  }
}

/**
 * (D) findEntityIdByName:
 *     - Finds an entity by exact `name` in a given `locale`.
 *       (Used for e.g. "matrix", "sample-type" etc. that have a "name" field.)
 *     - Returns the entity's ID if found, otherwise null.
 */
export async function findEntityIdByName(strapi, apiEndpoint, name, locale) {
  if (!name) return null;
  const results = await strapi.entityService.findMany(apiEndpoint, {
    filters: { name },
    locale
  });
  if (results.length > 0) {
    return results[0].id;
  }
  return null;
}