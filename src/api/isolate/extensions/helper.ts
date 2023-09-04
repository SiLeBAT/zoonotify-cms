import { IIsolateData, IIsolateDataAttributes, IRelation, IRelationDataAttributes } from "../models/response";


const toLinkedData = (data: IIsolateData[]): any => {
    var ldResponse = [];

    data.forEach((labTestData: IIsolateData) => {
        var rec: IIsolateDataAttributes = labTestData.attributes;

        let newRec = {
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            "Year": rec.year,
            "State": getRelationalData("Place", null, rec.state),
            "Microorganism": getRelationalData("MedicalCode", null, rec.microorganism),
            "Originaleinsendenr": rec.Originaleinsendenr,
            "BfR_Isolat_Nr": rec.BfR_Isolat_Nr,
            "DB_ID": rec.DB_ID,
            "NRL": rec.NRL,
            "Sampling Reason": getRelationalData("MedicalCode", null, rec.objective),
            "Sampling Point": getRelationalData("MedicalCode", null, rec.sampling_point),
            "ZoMo_Programm": rec.ZoMo_Programm,
            "Animal species/food upper category": getRelationalData("MedicalCode", null, rec.animal_species_food_upper_category),
            "Animal species production direction/food": getRelationalData("MedicalCode", null, rec.animal_species_production_direction_food),
            "Matrix": getRelationalData("MedicalCode", null, rec.matrix),
            "Bericht_e": rec.Bericht_e,
            "MRSA_spa_Typ": rec.MRSA_spa_Typ,
            "MRSA_Klonale_Gruppe": rec.MRSA_Klonale_Gruppe,
            "Entero_Spez": rec.Entero_Spez,
            "Campy_Spez": rec.Campy_Spez,
            "Salmonella": getRelationalData("MedicalCode", null, rec.salmonella),
            "Listeria_Serotyp": rec.Listeria_Serotyp,
            "STEC_Serotyp": rec.STEC_Serotyp,
            "STEC_stx1_Gen": rec.STEC_stx1_Gen,
            "STEC_stx2_Gen": rec.STEC_stx2_Gen,
            "STEC_eae_Gen": rec.STEC_eae_Gen,
            "STEC_e_hly_Gen": rec.STEC_e_hly_Gen,
            "keine_Gene_oder_Mutationen_gefunden": rec.keine_Gene_oder_Mutationen_gefunden,
            "ESBL_Gene": rec.ESBL_Gene,
            "Nicht_ESBL_Beta_Laktamase_Gene": rec.nicht_ESBL_Beta_Laktamase_Gene,
            "AmpC_Gene": rec.AmpC_Gene,
            "AmpC_Punktmutation": rec.AmpC_Punktmutation,
            "Carbapenemase_Gene": rec.Carbapenemase_Gene,
            "Gene_noch_zu_bestimmen": rec.Gene_noch_zu_bestimmen,
            "WGS": rec.WGS,
            "ESBL_AmpC_Carba_Phanotyp": rec.ESBL_AmpC_Carba_Phanotyp,
            "Sampling Origin": getRelationalData("MedicalCode", null, rec.sampling_origin),
            "Resistance Quant": {
                "@type": "MedicalStudy",
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
                "SMX_Res_quant": rec.SMX_Res_quant
            },
            "Resistance Qual": {
                "@type": "MedicalStudy",
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
                "SMX_Res_qual": rec.SMX_Res_qual
            }
        };

        ldResponse.push(newRec);
    });
    return ldResponse;
};

const getRelationalData = (type: string, id: string, obj: IRelation) => {
    var relationDataAttributes: IRelationDataAttributes = obj?.data?.attributes;
    return {
        "@type": type ? type : relationDataAttributes ? relationDataAttributes.name : "",
        "@id": id ? id : relationDataAttributes ? relationDataAttributes.iri : "",
        "name": relationDataAttributes?.name,
        "iri": relationDataAttributes?.iri
    }
}

export { toLinkedData }
