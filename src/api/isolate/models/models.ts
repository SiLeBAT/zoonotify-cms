export interface IKeys {
    index: number;
    name: string;
    displayName: string;
}

export interface IRelation {
    set: any[]
}

export interface IIsolate {
    samplingYear: number
    createdAt: string
    updatedAt: string
    BfR_Isolat_Nr: string
    DB_ID: string
    NRL: string
    ZoMo_Programm: string
    Bericht_e: string
    MRSA_spa_Typ: any
    MRSA_Klonale_Gruppe: any
    Entero_Spez: any
    Campy_Spez: any
    Listeria_Serotyp: any
    STEC_Serotyp: any
    STEC_stx1_Gen: any
    STEC_stx2_Gen: any
    STEC_eae_Gen: any
    STEC_e_hly_Gen: any
    bfrIsolatNr: string
    dbId: string
    nrl: string
    zomoProgramm: string
    berichte: string
    mrsaSpaTyp: any
    mrsaKlonaleGruppe: any
    enteroSpez: any
    campySpez: any
    listeriaSerotyp: any
    stecSerotyp: any
    stx1Gen: any
    stx2Gen: any
    eaeGen: any
    e_hlyGen: any
    ESBL_AmpC_Carba_Phanotyp: any
    WGS: string
    keine_Gene_oder_Mutationen_gefunden: any
    ESBL_Gene: any
    nicht_ESBL_Beta_Laktamase_Gene: any
    AmpC_Gene: any
    AmpC_Punktmutation: any
    Carbapenemase_Gene: any
    Gene_noch_zu_bestimmen: any
    AK_Res_quant: any
    GEN_Res_quant: string
    KAN_Res_quant: any
    STR_Res_quant: any
    CHL_Res_quant: string
    FFN_Res_quant: any
    PEN_Res_quant: any
    AMP_Res_quant: string
    FOT_Res_quant: string
    FOX_Res_quant: any
    TAZ_Res_quant: string
    MERO_Res_quant: string
    CIP_Res_quant: string
    NAL_Res_quant: string
    COL_Res_quant: string
    TET_Res_quant: string
    TGC_Res_quant: string
    RIF_Res_quant: any
    CLI_Res_quant: any
    AZI_Res_quant: string
    ERY_Res_quant: any
    TEC_Res_quant: any
    VAN_Res_quant: any
    DAP_Res_quant: any
    LZD_Res_quant: any
    TIA_Res_quant: any
    MUP_Res_quant: any
    SYN_Res_quant: any
    FUS_Res_quant: any
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
    microorganism: IRelation
    samplingContext: IRelation
    samplingStage: IRelation
    animalSpeciesFoodCategory: IRelation
    animalSpeciesProductionTypeFood: IRelation
    matrix: IRelation
    matrixDetail: IRelation
    salmonella: IRelation
    sampleType: IRelation

}

export class Isolate {
    bfrIsolatNr: any;
    BfR_Isolat_Nr: any;
    dbId: any;
    DB_ID: any;
    nrl: any;
    NRL: any;
    zomoProgramm: any;
    ZoMo_Programm: any;
    berichte: any;
    Bericht_e: any;
    mrsaSpaTyp: any;
    MRSA_spa_Typ: any;
    mrsaKlonaleGruppe: any;
    MRSA_Klonale_Gruppe: any;
    enteroSpez: any;
    Entero_Spez: any;
    campySpez: any;
    Campy_Spez: any;
    listeriaSerotyp: any;
    Listeria_Serotyp: any;
    stecSerotyp: any;
    STEC_Serotyp: any;
    stx1Gen: any;
    STEC_stx1_Gen: any;
    stx2Gen: any;
    STEC_stx2_Gen: any;
    eaeGen: any;
    STEC_eae_Gen: any;
    e_hlyGen: any;
    STEC_e_hly_Gen: any;
    samplingYear: number;
    microorganism: { set: number[]; };
    samplingContext: { set: number[]; };
    samplingStage: { set: number[]; };
    sampleType: { set: number[]; };
    animalSpeciesFoodCategory: { set: number[]; };
    animalSpeciesProductionTypeFood: { set: number[]; };
    matrix: { set: number[]; };
    matrixDetail: { set: number[]; };
    salmonella: { set: number[]; };
    createdAt: string;
    updatedAt: string;
    constructor(data: Partial<IIsolate>) {
        Object.assign(this, data);
    }
}

export interface ISubNode {
    "@context": {
        name: string
    },
    name: string
}

export interface IResistanceQuant {
    "@type": string
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
    ETP_Res_quant: string;
}

export interface IResistanceQual {
    "@type": string
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
    ETP_Res_qual: string;
}

export interface INode {
    "@context": string
    "@type": string
    "Sampling Year": number
    Microorganism: ISubNode | string
    nrl: string
    "Sampling Context": ISubNode | string
    "Sampling Stage": ISubNode | string
    zomoProgramm: string
    "Animal Species/ Food category": ISubNode | string
    "Animal species Production type/Food": ISubNode | string
    Matrix: ISubNode | string
    berichte: string
    mrsaSpaTyp: string
    mrsaKlonaleGruppe: string
    enteroSpez: string
    campySpez: string
    Salmonella: ISubNode | string
    listeriaSerotyp: string
    stecSerotyp: string
    stx1Gen: string
    stx2Gen: string
    eaeGen: string
    e_hlyGen: string
    keine_Gene_oder_Mutationen_gefunden: string
    ESBL_Gene: string
    Nicht_ESBL_Beta_Laktamase_Gene: string
    AmpC_Gene: string
    AmpC_Punktmutation: string
    Carbapenemase_Gene: string
    Gene_noch_zu_bestimmen: string
    WGS: string
    ESBL_AmpC_Carba_Phanotyp: string
    "Sample Type": ISubNode | string
    "Resistance Quant": IResistanceQuant
    "Resistance Qual": IResistanceQual
    Datum_der_Datenextraktion: string;
}