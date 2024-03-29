import { INode, ISubNode } from "../models/models";
import { IIsolateData, IIsolateDataAttributes, IRelation, IRelationDataAttributes } from "../models/response";

/**
 * Convert json to json-LD
 * @param data List of IIsolateData 
 * @returns List of Linked Data as a INode collection
 */
const toLinkedData = (data: IIsolateData[]): INode[] => {
    let ldResponse: INode[] = [];

    data.forEach((labTestData: IIsolateData) => {
        let rec: IIsolateDataAttributes = labTestData.attributes;

        let newRec: INode = {
            "@context": "https://schema.org",
            "@type": "MedicalStudy",
            "Sampling Year": rec.samplingYear,
            "Microorganism": getRelationalData(rec.microorganism),
            "nrl": rec.nrl,
            "Sampling Context": getRelationalData(rec.context),
            "Sampling Stage": getRelationalData(rec.samplingStage),
            "zomoProgramm": rec.zomoProgramm,
            "Animal Species/ Food category": getRelationalData(rec.animalSpeciesFoodCategory),
            "Animal species Production type/Food": getRelationalData(rec.animalSpeciesProductionTypeFood),
            "Matrix": getRelationalData(rec.matrix),
            "berichte": rec.berichte,
            "mrsaSpaTyp": rec.mrsaSpaTyp,
            "mrsaKlonaleGruppe": rec.mrsaKlonaleGruppe,
            "enteroSpez": rec.enteroSpez,
            "campySpez": rec.campySpez,
            "Salmonella": getRelationalData(rec.salmonella),
            "listeriaSerotyp": rec.listeriaSerotyp,
            "stecSerotyp": rec.stecSerotyp,
            "stx1Gen": rec.stx1Gen,
            "stx2Gen": rec.stx2Gen,
            "eaeGen": rec.eaeGen,
            "e_hlyGen": rec.e_hlyGen,
            "keine_Gene_oder_Mutationen_gefunden": rec.keine_Gene_oder_Mutationen_gefunden,
            "ESBL_Gene": rec.ESBL_Gene,
            "Nicht_ESBL_Beta_Laktamase_Gene": rec.nicht_ESBL_Beta_Laktamase_Gene,
            "AmpC_Gene": rec.AmpC_Gene,
            "AmpC_Punktmutation": rec.AmpC_Punktmutation,
            "Carbapenemase_Gene": rec.Carbapenemase_Gene,
            "Gene_noch_zu_bestimmen": rec.Gene_noch_zu_bestimmen,
            "WGS": rec.WGS,
            "ESBL_AmpC_Carba_Phanotyp": rec.ESBL_AmpC_Carba_Phanotyp,
            "Sample Type": getRelationalData(rec.sampleType),
            "Datum_der_Datenextraktion": rec.Datum_der_Datenextraktion,
            "Resistance Quant": {
                "@type": "DrugStrength",
                "AK_Res_quant": rec.AK_Res_quant,
                "GEN_Res_quant": rec.GEN_Res_quant,
                "KAN_Res_quant": rec.KAN_Res_quant,
                "STR_Res_quant": rec.STR_Res_quant,
                "CHL_Res_quant": rec.CHL_Res_quant,
                "FFN_Res_quant": rec.FFN_Res_quant,
                "PEN_Res_quant": rec.PEN_Res_quant,
                "AMP_Res_quant": rec.AMP_Res_quant,
                "FOT_Res_quant": rec.FOT_Res_quant,
                "FOX_Res_quant": rec.FOX_Res_quant,
                "TAZ_Res_quant": rec.TAZ_Res_quant,
                "MERO_Res_quant": rec.MERO_Res_quant,
                "CIP_Res_quant": rec.CIP_Res_quant,
                "NAL_Res_quant": rec.NAL_Res_quant,
                "COL_Res_quant": rec.COL_Res_quant,
                "TET_Res_quant": rec.TET_Res_quant,
                "TGC_Res_quant": rec.TGC_Res_quant,
                "RIF_Res_quant": rec.RIF_Res_quant,
                "CLI_Res_quant": rec.CLI_Res_quant,
                "AZI_Res_quant": rec.AZI_Res_quant,
                "ERY_Res_quant": rec.ERY_Res_quant,
                "TEC_Res_quant": rec.TEC_Res_quant,
                "VAN_Res_quant": rec.VAN_Res_quant,
                "DAP_Res_quant": rec.DAP_Res_quant,
                "LZD_Res_quant": rec.LZD_Res_quant,
                "TIA_Res_quant": rec.TIA_Res_quant,
                "MUP_Res_quant": rec.MUP_Res_quant,
                "SYN_Res_quant": rec.SYN_Res_quant,
                "FUS_Res_quant": rec.FUS_Res_quant,
                "TMP_Res_quant": rec.TMP_Res_quant,
                "SMX_Res_quant": rec.SMX_Res_quant,
                "ETP_Res_quant": rec.ETP_Res_quant
            },
            "Resistance Qual": {
                "@type": "DrugStrength",
                "AK_Res_qual": rec.AK_Res_qual,
                "GEN_Res_qual": rec.GEN_Res_qual,
                "KAN_Res_qual": rec.KAN_Res_qual,
                "STR_Res_qual": rec.STR_Res_qual,
                "CHL_Res_qual": rec.CHL_Res_qual,
                "FFN_Res_qual": rec.FFN_Res_qual,
                "PEN_Res_qual": rec.PEN_Res_qual,
                "AMP_Res_qual": rec.AMP_Res_qual,
                "FOT_Res_qual": rec.FOT_Res_qual,
                "FOX_Res_qual": rec.FOX_Res_qual,
                "TAZ_Res_qual": rec.TAZ_Res_qual,
                "MERO_Res_qual": rec.MERO_Res_qual,
                "CIP_Res_qual": rec.CIP_Res_qual,
                "NAL_Res_qual": rec.NAL_Res_qual,
                "COL_Res_qual": rec.COL_Res_qual,
                "TET_Res_qual": rec.TET_Res_qual,
                "TGC_Res_qual": rec.TGC_Res_qual,
                "RIF_Res_qual": rec.RIF_Res_qual,
                "CLI_Res_qual": rec.CLI_Res_qual,
                "AZI_Res_qual": rec.AZI_Res_qual,
                "ERY_Res_qual": rec.ERY_Res_qual,
                "TEC_Res_qual": rec.TEC_Res_qual,
                "VAN_Res_qual": rec.VAN_Res_qual,
                "DAP_Res_qual": rec.DAP_Res_qual,
                "LZD_Res_qual": rec.LZD_Res_qual,
                "TIA_Res_qual": rec.TIA_Res_qual,
                "MUP_Res_qual": rec.MUP_Res_qual,
                "SYN_Res_qual": rec.SYN_Res_qual,
                "FUS_Res_qual": rec.FUS_Res_qual,
                "TMP_Res_qual": rec.TMP_Res_qual,
                "SMX_Res_qual": rec.SMX_Res_qual,
                "ETP_Res_qual": rec.ETP_Res_qual
            }
        };

        ldResponse.push(newRec);
    });
    return ldResponse;
};

/**
 * Generate SubNode object using data passed
 * @param obj JSON object with node details
 * @returns Linked data object as a instance of ISubNode
 */
const getRelationalData = (obj: IRelation): string | ISubNode => {
    let relationDataAttributes: IRelationDataAttributes = obj?.data?.attributes;
    if (!relationDataAttributes)
        return "";

    let subNode: ISubNode =
    {
        "@context": {
            "name": relationDataAttributes.iri
        },
        name: relationDataAttributes.name
    };
    return subNode;
}

/**
 * Get id of the record from the collection using the key and value passed
 * @param collection list of the data on which search will be performed
 * @param key key by which search will be performed
 * @param value value for which search will be performed
 * @returns id of the matching record as a number
 */
export const getId = (collection: any, key: string, value: string): number => {
    var item = collection.find(item => item[key] == value);
    if (item) {
        return item.id;
    } else {
        return null;
    }
}

/**
 * Get id of the record from the collection's ontology tuple using the key and value passed
 * @param collection list of the data on which search will be performed
 * @param key key by which search will be performed
 * @param value value for which search will be performed
 * @returns id of the matching record as a number
 */
export const getOntologyTupleId = (collection: any, key: string, value: string): number => {

    var item = collection.find(item => {
        return item["ontology_tuple"] && item["ontology_tuple"][key] == value;
    });
    if (item) {
        return item.id;
    } else {
        return null;
    }
}

/**
 * Get current DateTime in ISO string
 * @returns DateTime in ISO string format
 */
export const getDateTimeISOString = (): string => {
    return new Date().toISOString();
}

export { toLinkedData }
