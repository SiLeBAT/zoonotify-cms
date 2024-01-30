export interface IIsolateResponse {
    data: IIsolateData[]
}

export interface IIsolateData {
    id: number
    attributes: IIsolateDataAttributes
}

export interface IIsolateDataAttributes {
    year: number
    createdAt: any
    updatedAt: any
    BfR_Isolat_Nr: string
    DB_ID: string
    NRL: string
    ZoMo_Programm: string
    Bericht_e: string
    MRSA_spa_Typ: string
    MRSA_Klonale_Gruppe: string
    Entero_Spez: string
    Campy_Spez: string
    Listeria_Serotyp: string
    STEC_Serotyp: string
    STEC_stx1_Gen: string
    STEC_stx2_Gen: string
    STEC_eae_Gen: string
    STEC_e_hly_Gen: string
    ESBL_AmpC_Carba_Phanotyp: any
    WGS: string
    keine_Gene_oder_Mutationen_gefunden: string
    ESBL_Gene: string
    nicht_ESBL_Beta_Laktamase_Gene: string
    AmpC_Gene: string
    AmpC_Punktmutation: string
    Carbapenemase_Gene: string
    Gene_noch_zu_bestimmen: string
    AK_Res_quant: string
    GEN_Res_quant: string
    KAN_Res_quant: string
    STR_Res_quant: string
    CHL_Res_quant: string
    FFN_Res_quant: string
    PEN_Res_quant: string
    AMP_Res_quant: string
    FOT_Res_quant: string
    FOX_Res_quant: string
    TAZ_Res_quant: string
    MERO_Res_quant: string
    CIP_Res_quant: string
    NAL_Res_quant: string
    COL_Res_quant: string
    TET_Res_quant: string
    TGC_Res_quant: string
    RIF_Res_quant: string
    CLI_Res_quant: string
    AZI_Res_quant: string
    ERY_Res_quant: string
    TEC_Res_quant: string
    VAN_Res_quant: string
    DAP_Res_quant: string
    LZD_Res_quant: string
    TIA_Res_quant: string
    MUP_Res_quant: string
    SYN_Res_quant: string
    FUS_Res_quant: string
    TMP_Res_quant: string
    SMX_Res_quant: string
    AK_Res_qual: string
    GEN_Res_qual: string
    KAN_Res_qual: string
    STR_Res_qual: string
    CHL_Res_qual: string
    FFN_Res_qual: string
    PEN_Res_qual: string
    AMP_Res_qual: string
    FOT_Res_qual: string
    FOX_Res_qual: string
    TAZ_Res_qual: string
    MERO_Res_qual: string
    CIP_Res_qual: string
    NAL_Res_qual: string
    COL_Res_qual: string
    TET_Res_qual: string
    TGC_Res_qual: string
    RIF_Res_qual: string
    CLI_Res_qual: string
    AZI_Res_qual: string
    ERY_Res_qual: string
    TEC_Res_qual: string
    VAN_Res_qual: string
    DAP_Res_qual: string
    LZD_Res_qual: string
    TIA_Res_qual: string
    MUP_Res_qual: string
    SYN_Res_qual: string
    FUS_Res_qual: string
    TMP_Res_qual: string
    SMX_Res_qual: string
    microorganism: IMicroorganism
    context: ISamplingContext
    samplingStage: ISamplingStage
    sampleType: ISampleType
    animal_species_food_top_category: IAnimalSpeciesFoodTopCategory
    matrix: IMatrix
    salmonella: ISalmonella
    matrix_detail: IMatrixDetail
    animal_species_production_direction_food: IAnimalSpeciesProductionDirectionFood
    ETP_Res_qual: string;
    ETP_Res_quant: string;
    Datum_der_Datenextraktion: string;
    DB_Version: string;
}

export interface IRelation {
    data: IRelationData
}

export interface IRelationData {
    id: number
    attributes: IRelationDataAttributes
}

export interface IRelationDataAttributes {
    name: string
    iri: string
    createdAt: any
    updatedAt: any
}

export interface IMicroorganism extends IRelation {
}

export interface ISamplingContext extends IRelation {
}

export interface ISamplingStage extends IRelation {
}

export interface ISampleType extends IRelation {
}

export interface IAnimalSpeciesFoodTopCategory extends IRelation {
}

export interface IMatrix extends IRelation {
}

export interface ISalmonella extends IRelation {
}

export interface IMatrixDetail extends IRelation {
}

export interface IAnimalSpeciesProductionDirectionFood extends IRelation {
}
