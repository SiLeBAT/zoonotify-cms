
import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';

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
  // Replace all commas with dots
  const normalized = String(cell).replace(/,/g, '.');
  const value = parser(normalized);
  if (Number.isNaN(value)) {
    return null; // fallback to null if parse fails
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
  // Optional: wipe everything first
  // await removeAllResistances(strapi);
  // console.log('All existing resistance records removed.\n');

  await importResistances(strapi);
  await cleanupGermanDuplicates(strapi);
}

/**
 * (A) importResistances:
 *    - Reads rows from an Excel file,
 *    - Creates/updates English records,
 *    - Creates/updates German records if data is present.
 */
export async function importResistances(strapi) {
  // Adjust the path to your Excel file if needed
  const filePath = path.join(__dirname, '../../../data/master-data/ZooNotify_amr_DB_DE_EN_2025-02-27.xlsx');
  const outFilePath = path.join(__dirname, '../../../data/resistances-import-result.json');

  const importLog = {
    TotalRecords: 0,
    EnglishSaved: 0,
    GermanSaved: 0,
    Failures: []
  };

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const dataFromExcel = xlsx.parse(buffer);

  // Adjust the sheet name if needed:
  const resistanceData = dataFromExcel.find(sheet => sheet.name === 'Sheet 1');
  if (!resistanceData) {
    console.error('Resistances sheet not found in the file');
    return;
  }

  if (resistanceData.data.length <= 1) {
    console.error('No data found in the Resistances sheet');
    return;
  }

  // (A1) Convert rows (skipping header) into objects
  const dataList = resistanceData.data.slice(1).map((row, index) => {
    const rowNumber = index + 2; // header is row 1

    // You can log row to confirm column indexes:
    // console.log(`Row ${rowNumber} =>`, row);

    return {
      rowNumber,
      dbId: String(row[24]),

      // Basic fields
      zomoProgram: row[0],
      samplingYear: parseNumeric(row[1], parseInt),

      // Relation fields (German/English)
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

      // Quantitative fields
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

      // Qualitative fields
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

  importLog.TotalRecords = dataList.length;

  for (const item of dataList) {
    try {
      // ----------------------------------
      // 1) Create/Update the English record
      // ----------------------------------
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

      const dataEn = removeNulls({
        dbId: item.dbId,
        zomoProgram: item.zomoProgram,
        samplingYear: item.samplingYear,

        // _Res_quant
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

        // _Res_qual
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

      // Find existing English record (by dbId + locale='en')
      const existingEn = await strapi.entityService.findMany('api::resistance.resistance', {
        filters: { dbId: item.dbId },
        locale: 'en'
      });

      if (existingEn && existingEn.length > 0) {
        await strapi.entityService.update('api::resistance.resistance', existingEn[0].id, {
          data: dataEn,
          locale: 'en'
        });
      } else {
        await strapi.entityService.create('api::resistance.resistance', {
          data: dataEn,
          locale: 'en'
        });
      }
      importLog.EnglishSaved++;

      // ----------------------------------
      // 2) Create/Update the German record
      // ----------------------------------
      const hasGermanData =
        item.microorganism_de ||
        item.sampleType_de ||
        item.samplingStage_de ||
        item.sampleOrigin_de ||
        item.superCategorySampleOrigin_de ||
        item.matrixGroup_de ||
        item.matrix_de;

      if (hasGermanData) {
        // Lookup relation IDs (German)
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

        const dataDe = removeNulls({
          dbId: item.dbId,
          zomoProgram: item.zomoProgram,
          samplingYear: item.samplingYear,

          // _Res_quant
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

          // _Res_qual
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

        // Instead of findEntityIdByName (which searches by "name"),
        // we directly find by { dbId: item.dbId } and locale: 'de':
        const existingDe = await strapi.entityService.findMany('api::resistance.resistance', {
          filters: { dbId: item.dbId },
          locale: 'de'
        });

        if (existingDe && existingDe.length > 0) {
          await strapi.entityService.update('api::resistance.resistance', existingDe[0].id, {
            data: dataDe,
            locale: 'de'
          });
        } else {
          await strapi.entityService.create('api::resistance.resistance', {
            data: dataDe,
            locale: 'de'
          });
        }
        importLog.GermanSaved++;
      }
    } catch (error) {
      console.error(`Error importing resistance data for dbId ${item.dbId}:`, error);
      if (error.details) {
        console.error('Validation details:', error.details);
      }
      importLog.Failures.push({ dbId: item.dbId, error: error.message });
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
